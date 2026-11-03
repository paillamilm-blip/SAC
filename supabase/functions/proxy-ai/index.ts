// supabase/functions/proxy-ai/index.ts
// ═══════════════════════════════════════════════════════════════════════
// PROXY-AI — Gateway centralizado para TODAS las llamadas a OpenRouter.
//
// El frontend NUNCA llama a OpenRouter directamente. En cambio invoca:
//   supabase.functions.invoke('proxy-ai', { body: { messages, options } })
//
// Beneficios:
//   1. La OPENROUTER_KEY vive solo server-side (nunca en el bundle)
//   2. Rate limiting real (no localStorage burlable)
//   3. Un solo punto de control para modelos, fallback, y logging
//   4. Créditos IA con conteo atómico server-side
//
// Acepta el mismo formato que aiClient.ts del frontend:
//   { messages: [{role, content}], options?: {maxTokens, temperature, jsonMode} }
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { checkAndConsumeCredit } from '../_shared/iaCredits.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
// gemini-2.0-flash se apagó el 2026-06-01. Gemini va PRIMERO y en escalera: si un modelo
// responde 503/429 (alta demanda, pasó el 2026-11-03) se salta al siguiente, sin esperar.
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Allowed origin for CORS (production domain)
const ALLOWED_ORIGIN = Deno.env.get('PUBLIC_SITE_URL') || 'https://sistema-omicrom.vercel.app';

import { corsHeaders } from '../_shared/cors.ts';

// Estado real del campo gratis de OpenRouter, medido 2026-11-03 con el prompt
// del CV en vivo:
//   · Murieron en las últimas 24 h (404 "unavailable for free"): nemotron-3-
//     super-120b, minimax-m3, glm-5.2. gemma x2 dio 429 "temporarily
//     rate-limited upstream" (transitorio, fallan en <500 ms).
//   · nemotron-3-ultra: trivial en 1,8 s, pero 3/3 sobre la ventana de 35 s
//     con el prompt del CV.
//   · nemotron-3.5-lightning (nuevo): devolvió el JSON completo del CV en
//     17,1 s y 23,1 s — dos de dos.
//   → La carrera (respaldo de Gemini) lanza TODOS los vivos en paralelo: las
//     colas son independientes (medido 2026-10-24) y Promise.any necesita uno
//     solo; los muertos/limitados caen al instante sin consumir ventana.
const RACE_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',       // 2/2 con el CV real (17-23 s)
  'nvidia/nemotron-3-ultra-550b-a55b:free',   // El único que devolvió el CV completo
  'xingchen-agi/xing4.0-29b-a4b:free',
  'recursive/flint-v1.0:free',
  'thinkingmachines/inkling:free',
  'google/gemma-4-31b-it:free',               // 429 upstream transitorio
  'google/gemma-4-26b-a4b-it:free',           // 429 upstream transitorio
  'openrouter/free',                          // enrutador automático del pool gratis
];
const TAIL_MODELS: string[] = [];
// FREE_MODELS alimenta la ladder F2 (sin `reasoning`): sigue siendo el seguro
// probado por si OpenRouter rechazara el campo con 400.
const FREE_MODELS = [...RACE_MODELS, ...TAIL_MODELS];

const RACE_ABORT_MS = 35000;      // techo de la carrera (los frees vivos en paralelo)
const MODEL_ABORT_MS = 10000;     // cada intento del tail
const GEMINI_ABORT_MS = 20000;    // cada modelo de Gemini (los 503 llegan en <1 s)
const RACE_FAST_FAIL_MS = 12000;  // si la carrera cayó antes de esto, el tail todavía sirve
// Presupuesto total del server. Debe quedar DEBAJO del presupuesto del
// cliente (75 s en gemini.ts) para que el error estructurado llegue al
// usuario antes de que el cliente corte con su TIMEOUT genérico.
const SERVER_BUDGET_MS = 70000;
const MIN_USEFUL_ATTEMPT_MS = 4000;
// Huella de la versión desplegada. Un GET responde estos números en <1s y sin
// gastar créditos: es la única forma de comprobar que el pegado del dashboard
// realmente reemplazó la función (los timeouts viejos se cuelan igual).
const BUILD = '6g-gemini-first-frees-vivos';

// Cache de modelos muertos (por instancia de la Edge Function — ~5min lifetime)
const DEAD_MODELS: Map<string, number> = new Map();
const DEAD_TTL = 10 * 60 * 1000; // 10 min

function isModelAlive(model: string): boolean {
  const deadSince = DEAD_MODELS.get(model);
  if (!deadSince) return true;
  if (Date.now() - deadSince > DEAD_TTL) {
    DEAD_MODELS.delete(model);
    return true;
  }
  return false;
}

const _admin = createClient(SUPABASE_URL, SERVICE_KEY);



interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: AIMessage[];
  options?: {
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
  };
}

// Un intento contra OpenRouter. Tira un Error cuyo message es la línea de
// debug que el cliente necesita ver (`.dead` marca 404/402 para el cache de
// modelos muertos). El timer cubre cabeceras Y cuerpo: soltarlo al recibir
// las cabeceras dejaba el cuerpo sin timeout — medido en 49,9 s y 89,6 s con
// un abort que decía 20 s.
class OrAttemptError extends Error {
  dead = false;
  constructor(public model: string, detail: string) {
    super(`${model} → ${detail}`);
  }
}

async function orChat(
  model: string,
  messages: AIMessage[],
  opts: { maxTokens: number; temperature: number; jsonMode: boolean },
  abortMs: number,
  noThink: boolean,
  external?: AbortSignal,
): Promise<{ text: string; model: string; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortMs);
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const t0 = Date.now();
  try {
    const resp = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': ALLOWED_ORIGIN,
        'X-Title': 'Sistema Omicron',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: Math.min(opts.maxTokens, 4096),
        temperature: Math.min(Math.max(opts.temperature, 0), 1.5),
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(noThink ? { reasoning: { enabled: false } } : {}),
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      const e = new OrAttemptError(model, `${resp.status} en ${Date.now() - t0}ms: ${errBody.slice(0, 150)}`);
      e.dead = resp.status === 404 || resp.status === 402;
      throw e;
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new OrAttemptError(model, `200 sin contenido en ${Date.now() - t0}ms`);
    return { text: text.trim(), model, ms: Date.now() - t0 };
  } catch (e) {
    if (e instanceof OrAttemptError) throw e;
    const err = e as Error;
    if (err.name === 'AbortError') {
      throw new OrAttemptError(model, `abort a los ${Math.round(abortMs / 1000)}s (real ${Date.now() - t0}ms)`);
    }
    throw new OrAttemptError(model, `threw: ${String(err).slice(0, 100)} (${Date.now() - t0}ms)`);
  } finally {
    clearTimeout(timer);
  }
}

// Un intento contra Gemini. Devuelve el texto o tira un Error con la línea de debug.
async function geminiChat(
  model: string,
  messages: AIMessage[],
  opts: { maxTokens: number; temperature: number; jsonMode: boolean },
  abortMs: number,
): Promise<{ text: string; model: string; ms: number }> {
  const controller = new AbortController();
  // El timer cubre cabeceras Y cuerpo (igual que en orChat).
  const timer = setTimeout(() => controller.abort(), abortMs);
  const t0 = Date.now();
  try {
    const contents = messages.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = msg.role === 'system' ? `System: ${msg.content}` : msg.content;
      return { role, parts: [{ text }] };
    });
    const resp = await fetch(geminiUrl(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: Math.min(opts.maxTokens, 4096),
          temperature: Math.min(Math.max(opts.temperature, 0), 1.5),
          responseMimeType: opts.jsonMode ? 'application/json' : 'text/plain',
        },
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      // Sin saltos de línea: el debug se lee mejor en una sola línea.
      throw new Error(`${model} → ${resp.status} en ${Date.now() - t0}ms: ${errBody.replace(/\s+/g, ' ').slice(0, 150)}`);
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error(`${model} → 200 sin contenido en ${Date.now() - t0}ms`);
    return { text: text.trim(), model, ms: Date.now() - t0 };
  } catch (e) {
    const err = e as Error;
    if (err.message?.startsWith(`${model} →`)) throw err;
    if (err.name === 'AbortError') {
      throw new Error(`${model} → abort a los ${Math.round(abortMs / 1000)}s (real ${Date.now() - t0}ms)`);
    }
    throw new Error(`${model} → threw: ${String(err).slice(0, 100)} (${Date.now() - t0}ms)`);
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  // Compute CORS from the actual request origin as a local const to avoid
  // race conditions under concurrent requests in the same Deno isolate.
  const cors = corsHeaders(req);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json', 'x-omicron-build': BUILD },
    });

  // Health/huella de versión: sin tocar OpenRouter ni los créditos.
  if (req.method === 'GET') {
    return json({ build: BUILD, budgetMs: SERVER_BUDGET_MS, raceMs: RACE_ABORT_MS, tailMs: MODEL_ABORT_MS, race: RACE_MODELS, models: FREE_MODELS.length });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // ── Validate key ──────────────────────────────────────────────────
    if (!OPENROUTER_KEY && !GEMINI_KEY) {
      return json({ error: 'IA no configurada (falta OPENROUTER_KEY en secrets).' }, 503);
    }

    // ── Rate limit (15 req/min por IP — más generoso que endpoints específicos) ──
    const ip = clientIp(req);
    const rl = await checkRateLimit(_admin, 'proxy-ai', ip, 15, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at, cors);

    // ── Auth check + credits ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    // Only check credits for authenticated users with a real JWT.
    // If authHeader is empty or blank (guest user), skip credit check entirely.
    if (authHeader.trim() && authHeader.trim() !== 'Bearer') {
      const creditBlock = await checkAndConsumeCredit(_admin, authHeader, 'proxy-ai', cors);
      if (creditBlock) return creditBlock;
    }

    // ── Parse body ────────────────────────────────────────────────────
    const body: RequestBody = await req.json().catch(() => ({ messages: [] }));

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'Se requiere un array "messages" con al menos 1 mensaje.' }, 400);
    }

    // Sanitize: limitar tamaño del input (prevenir abuse)
    const totalChars = body.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
    if (totalChars > 30000) {
      return json({ error: 'Input demasiado largo. Máximo 30,000 caracteres totales.' }, 400);
    }

    // Validar que los roles sean válidos
    const validRoles = new Set(['system', 'user', 'assistant']);
    for (const msg of body.messages) {
      if (!validRoles.has(msg.role) || typeof msg.content !== 'string') {
        return json({ error: 'Cada mensaje debe tener role (system|user|assistant) y content (string).' }, 400);
      }
    }

    const { maxTokens = 1024, temperature = 0.7, jsonMode = false } = body.options ?? {};

    // ══════════════════════════════════════════════════════════════════
    // ESTRATEGIA (desde 2026-11-03):
    //   F0 Gemini en escalera (3.6 → 3.8 → 3.5-lite). Un 503/429 salta al
    //      siguiente modelo en el acto. Es rápido y es lo que sí responde.
    //   F1 carrera en paralelo de los 2 nemotron, razonamiento apagado.
    //   F2 ladder secuencial del resto — SOLO si la carrera cayó rápido
    //      (si tardó 40 s el problema es la cola, y otro modelo en cola no
    //      ayuda).
    // ══════════════════════════════════════════════════════════════════

    const debugLog: string[] = [];
    const serverDeadline = Date.now() + SERVER_BUDGET_MS;
    // NUNCA incluir caracteres de las keys: debugLog viaja al cliente en el 503.
    debugLog.push(`OPENROUTER_KEY: ${OPENROUTER_KEY ? 'present' : 'MISSING'}`);
    debugLog.push(`GEMINI_KEY: ${GEMINI_KEY ? 'present' : 'MISSING'}`);

    const opts = { maxTokens, temperature, jsonMode };

    // ── F0: Gemini (PRIMARY) ──────────────────────────────────────────
    if (GEMINI_KEY) {
      for (const model of GEMINI_MODELS) {
        const budgetLeft = serverDeadline - Date.now();
        if (budgetLeft < MIN_USEFUL_ATTEMPT_MS) {
          debugLog.push(`presupuesto agotado antes de ${model}`);
          break;
        }
        try {
          const r = await geminiChat(model, body.messages, opts, Math.min(GEMINI_ABORT_MS, budgetLeft));
          debugLog.push(`gemini OK ${model} en ${r.ms}ms`);
          console.log(`[proxy-ai] gemini winner ${model} en ${r.ms}ms (${r.text.length} chars)`);
          return json({ text: r.text, model: r.model });
        } catch (err) {
          const msg = (err as Error).message;
          debugLog.push(msg);
          console.error(`[proxy-ai] gemini failed: ${msg}`);
        }
      }
    }

    // ── OpenRouter (respaldo) ─────────────────────────────────────────
    if (OPENROUTER_KEY) {
      const alive = RACE_MODELS.filter(isModelAlive);
      const raceModels = alive.length > 0 ? alive : RACE_MODELS;

      // ── F1: carrera ─────────────────────────────────────────────────
      const raceStart = Date.now();
      const group = new AbortController();
      const raceMs = Math.min(RACE_ABORT_MS, serverDeadline - Date.now());
      try {
        const win = await Promise.any(
          raceModels.map((m) => orChat(m, body.messages, opts, raceMs, true, group.signal)),
        );
        group.abort();
        debugLog.push(`race OK ${win.model} en ${win.ms}ms`);
        console.log(`[proxy-ai] race winner ${win.model} en ${win.ms}ms (${win.text.length} chars)`);
        return json({ text: win.text, model: win.model });
      } catch (e) {
        group.abort();
        const raceElapsed = Date.now() - raceStart;
        const errs = (e as AggregateError).errors ?? [];
        errs.forEach((x) => {
          const oe = x as OrAttemptError;
          debugLog.push(oe.message ?? String(x));
          if (oe.dead && oe.model) DEAD_MODELS.set(oe.model, Date.now());
        });
        debugLog.push(`race caído en ${raceElapsed}ms`);
        console.error(`[proxy-ai] race failed en ${raceElapsed}ms`);

        // ── F2: la ladder secuencial PROBADA, solo si la carrera cayó
        //    rápido. Si tardó la ventana entera el problema es la cola:
        //    repetir contra la misma cola no sirve. Corre los mismos modelos
        //    SIN `reasoning`: si OpenRouter rechazara el campo (400), este es
        //    el camino que devolvió el CV histórico.
        if (raceElapsed < RACE_FAST_FAIL_MS) {
          const aliveTail = FREE_MODELS.filter(isModelAlive);
          const seqModels = aliveTail.length > 0 ? aliveTail : FREE_MODELS;
          for (let mi = 0; mi < seqModels.length; mi++) {
            const model = seqModels[mi];
            const budgetLeft = serverDeadline - Date.now();
            if (budgetLeft < MIN_USEFUL_ATTEMPT_MS) {
              debugLog.push(`presupuesto agotado antes de ${model} → corte del tail`);
              break;
            }
            const sliceMs = Math.min(mi === 0 ? RACE_ABORT_MS : MODEL_ABORT_MS, budgetLeft);
            try {
              const r = await orChat(model, body.messages, opts, sliceMs, false);
              debugLog.push(`seq OK ${model} en ${r.ms}ms`);
              console.log(`[proxy-ai] seq winner ${model} en ${r.ms}ms`);
              return json({ text: r.text, model: r.model });
            } catch (err) {
              const msg = (err as OrAttemptError).message;
              debugLog.push(msg);
              console.error(`[proxy-ai] seq ${model} failed: ${msg}`);
              if ((err as OrAttemptError).dead) DEAD_MODELS.set(model, Date.now());
            }
          }
        }
      }
    }

    // All failed — return debug info so we can see WHAT failed
    debugLog.push(`total intentado en ${Date.now() - (serverDeadline - SERVER_BUDGET_MS)}ms`);
    console.error('[proxy-ai] ALL FAILED. Debug:', debugLog.join(' | '));
    return json({
      error: 'IA no disponible. Todos los modelos fallaron.',
      debug: debugLog,
    }, 503);
  } catch (e) {
    return json({ error: 'Error interno en proxy-ai.', detail: String(e).slice(0, 200) }, 500);
  }
});
