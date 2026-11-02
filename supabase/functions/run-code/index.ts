// supabase/functions/run-code/index.ts
// ─────────────────────────────────────────────────────────────────────────
// Runner de código SEGURO (v2).
//
// El código del usuario YA NO se ejecuta dentro de la Edge Function (donde
// estaban expuestas las variables de entorno, incluido SERVICE_ROLE_KEY, y
// donde un `while(true){}` colgaba la función). Ahora se ejecuta en un
// SANDBOX AISLADO externo (Piston: contenedor efímero, sin red hacia tu BD,
// sin acceso a tus secretos, con timeout de ejecución forzado).
//
// El scoring sigue siendo AUTORITATIVO del servidor: comparamos la salida del
// sandbox contra los `test_cases` de la BD. El cliente no puede falsear la
// nota. La integridad de la salida se protege con un nonce aleatorio que el
// código del usuario no puede conocer (se pasa por stdin, fuera de su sandbox
// `vm`), y la salida del usuario va a una `console` neutralizada.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, tooManyRequests } from "../_shared/rateLimit.ts";
import { corsHeaders, withCors } from '../_shared/cors.ts';

const cors = corsHeaders();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Base del motor de ejecución aislado. Por defecto la API pública de Piston;
// para producción puedes auto-hospedar Piston y setear PISTON_URL.
const PISTON_URL = (Deno.env.get("PISTON_URL") ?? "https://emkc.org/api/v2/piston").replace(/\/+$/, "");

// Cache de la versión de runtime de JavaScript disponible en Piston.
let _jsVersion: string | null = null;
async function getJsVersion(): Promise<string> {
  if (_jsVersion) return _jsVersion;
  try {
    const r = await fetch(`${PISTON_URL}/runtimes`);
    const runtimes = await r.json() as Array<{ language: string; version: string; aliases?: string[] }>;
    const js = runtimes.find((x) =>
      x.language === "javascript" || x.language === "node" || (x.aliases ?? []).includes("javascript"));
    _jsVersion = js?.version ?? "18.15.0";
  } catch {
    _jsVersion = "18.15.0";
  }
  return _jsVersion;
}

// Programa "árbitro" que corre en el sandbox: lee {inputs, nonce} de stdin,
// ejecuta el código del usuario en un contexto `vm` aislado (sin process, sin
// require, sin red, con console neutralizada) y emite la salida firmada con el
// nonce. El usuario no puede leer el nonce (vive fuera de su contexto).
const HARNESS = `
const fs = require('fs');
const vm = require('vm');

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) {
    try { return fs.readFileSync('/dev/stdin', 'utf8'); } catch (_) { return ''; }
  }
}

function toStr(v) {
  if (typeof v === 'string') return v;
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  try { if (typeof v === 'object') return JSON.stringify(v); } catch (_) {}
  try { return String(v); } catch (_) { return ''; }
}

(function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch (_) {}
  const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
  const nonce = String(payload.nonce || 'OMICRON');

  let userCode = '';
  try { userCode = fs.readFileSync('usercode.js', 'utf8'); } catch (_) {}

  const out = [];
  let fatal = null;
  let solution = null;

  try {
    const sandbox = {
      console: { log: function(){}, error: function(){}, warn: function(){}, info: function(){}, debug: function(){} }
    };
    vm.createContext(sandbox);
    vm.runInContext(
      userCode + "\\n;try{globalThis.__sol=(typeof solution!=='undefined')?solution:undefined;}catch(e){globalThis.__sol=undefined;}",
      sandbox,
      { timeout: 2000, filename: 'usercode.js' }
    );
    solution = sandbox.__sol;
    if (typeof solution !== 'function') fatal = 'Define una función llamada "solution".';
  } catch (e) {
    fatal = String((e && e.message) || e);
  }

  if (typeof solution === 'function' && !fatal) {
    for (let i = 0; i < inputs.length; i++) {
      try {
        const r = solution(String(inputs[i]));
        out.push({ ok: true, value: toStr(r) });
      } catch (e) {
        out.push({ ok: false, error: String((e && e.message) || e) });
      }
    }
  }

  process.stdout.write(nonce + JSON.stringify({ fatal: fatal, out: out }));
})();
`;

interface PistonRun { stdout?: string; stderr?: string; code?: number; signal?: string | null; output?: string; }
interface PistonResponse { run?: PistonRun; compile?: PistonRun; message?: string; }

async function runInSandbox(code: string, inputs: string[], nonce: string) {
  const version = await getJsVersion();
  const body = {
    language: "javascript",
    version,
    files: [
      { name: "main.js", content: HARNESS },
      { name: "usercode.js", content: code },
    ],
    stdin: JSON.stringify({ inputs, nonce }),
    compile_timeout: 10000,
    run_timeout: 5000,
  };

  // Reintento simple ante 429 (la API pública limita ~5 req/s).
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 1300));
  }
  if (!res) throw new Error("Sin respuesta del sandbox.");
  if (!res.ok) throw new Error(`Sandbox respondió ${res.status}.`);
  return await res.json() as PistonResponse;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { test_id, node_id, code } = await req.json();
    if (!test_id || typeof code !== "string") return json({ error: "Faltan 'test_id' o 'code'." }, 400);
    if (code.length > 50_000) return json({ error: "Código demasiado largo." }, 413);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Usuario que llama (desde su JWT).
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "No autenticado." }, 401);
    const userId = u.user.id;

    // Test autoritativo desde la BD (con service role, NUNCA expuesto al código).
    const admin = createClient(url, service);

    // Anti-spam: el sandbox es costoso → 20 ejecuciones por minuto por usuario.
    const rl = await checkRateLimit(admin, "run-code", userId, 20, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const { data: test, error: te } = await admin
      .from("skill_tests")
      .select("test_cases, time_limit_seconds, passing_score")
      .eq("id", test_id)
      .single();
    if (te || !test) return json({ error: "Test no encontrado." }, 404);

    const testCases: Array<{ input: string; expected_output: string }> =
      Array.isArray(test.test_cases) ? test.test_cases.slice(0, 50) : [];
    const passingScore = test.passing_score ?? 80;
    const inputs = testCases.map((tc) => String(tc.input));

    // ── Ejecutar en el sandbox aislado ──
    const start = Date.now();
    const nonce = "OMI_" + crypto.randomUUID().replace(/-/g, "");
    let piston: PistonResponse;
    try {
      piston = await runInSandbox(code, inputs, nonce);
    } catch (e) {
      return json({
        result: "ERROR", score: 0, testCaseResults: [], timeTakenSeconds: 0, pe_awarded: 0,
        errorMessage: "Sandbox no disponible: " + String((e as Error)?.message ?? e),
      });
    }

    const run = piston.run ?? {};
    const stdout = run.stdout ?? "";
    const idx = stdout.lastIndexOf(nonce);

    const results: Array<{ input: string; expected: string; actual: string; passed: boolean; error?: string }> = [];
    let result: "PASS" | "FAIL" | "ERROR" | "TIMEOUT";
    let score = 0;
    let fatalMsg: string | undefined;

    if (idx === -1) {
      // No llegó la salida firmada → o bien timeout/kill, o error de compilación.
      const killed = run.signal === "SIGKILL" || run.signal === "SIGTERM";
      const stderr = (piston.compile?.stderr || run.stderr || "").trim();
      if (killed) {
        result = "TIMEOUT";
        fatalMsg = "Ejecución detenida por tiempo límite (posible bucle infinito).";
      } else {
        result = "ERROR";
        fatalMsg = stderr ? stderr.slice(0, 400) : (piston.message || "Error de ejecución en el sandbox.");
      }
    } else {
      let parsed: { fatal: string | null; out: Array<{ ok: boolean; value?: string; error?: string }> } = { fatal: null, out: [] };
      try {
        parsed = JSON.parse(stdout.slice(idx + nonce.length));
      } catch {
        parsed = { fatal: "Salida del sandbox ilegible.", out: [] };
      }

      if (parsed.fatal) {
        result = "ERROR";
        fatalMsg = String(parsed.fatal).slice(0, 400);
      } else {
        for (let i = 0; i < testCases.length; i++) {
          const expected = String(testCases[i].expected_output);
          const o = parsed.out[i];
          if (!o) {
            results.push({ input: inputs[i], expected, actual: "", passed: false, error: "Sin salida." });
          } else if (o.ok) {
            const actual = String(o.value ?? "");
            results.push({ input: inputs[i], expected, actual, passed: actual.trim() === expected.trim() });
          } else {
            results.push({ input: inputs[i], expected, actual: "", passed: false, error: String(o.error ?? "Error") });
          }
        }
        const passed = results.filter((r) => r.passed).length;
        score = testCases.length ? Math.round((passed / testCases.length) * 100) : 0;
        result = score >= passingScore ? "PASS" : results.some((r) => r.error) ? "ERROR" : "FAIL";
      }
    }

    const timeTakenSeconds = Math.round((Date.now() - start) / 1000);

    // Persistir intento + reputación (server-authoritative).
    let pe_awarded = 0;
    try {
      const { data: rpc } = await admin.rpc("handle_skill_attempt", {
        p_user_id: userId,
        p_test_id: test_id,
        p_node_id: node_id ?? null,
        p_score: score,
        p_time_sec: timeTakenSeconds,
        p_code: code,
        p_result: result,
        p_tc_results: results,
      });
      pe_awarded = (rpc as { pe_awarded?: number } | null)?.pe_awarded ?? 0;
    } catch (_e) { /* no bloquear la respuesta */ }

    return json({ result, score, testCaseResults: results, timeTakenSeconds, pe_awarded, errorMessage: fatalMsg });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}));
