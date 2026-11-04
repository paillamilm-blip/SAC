// supabase/functions/credential/index.ts — Credencial verificable de Ómicrom.
// Emite una credencial FIRMADA criptográficamente (HMAC-SHA256) y permite VERIFICARLA públicamente.
// Si alguien altera un solo dato, la firma no valida => se detecta al instante.
// Acciones: 'issue' (usuario autenticado firma su credencial) | 'verify' (público).
//
// VERSIÓN 2 (3-nov-2026): la credencial dice solo lo que la persona DEMOSTRÓ: las habilidades en que aprobó un
// examen (omicron_skill_proofs), con su mejor puntaje y fecha. Se leen aquí, en el servidor: nada depende de lo
// que mande el navegador. Ya no firma reputación ni niveles de nodo (eso era del producto anterior). Vence a los
// 12 meses. Los tokens de la versión 1 (emitidos antes) se siguen verificando tal como estaban.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Clave de firma: usa una dedicada si existe, si no la service key (estable y secreta).
const SIGNING_KEY = Deno.env.get('CREDENTIAL_SIGNING_KEY') ?? SERVICE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const enc = new TextEncoder();
const VIGENCIA_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_HABILIDADES = 50;

import { corsHeaders } from '../_shared/cors.ts';
// El CORS se calcula POR PETICIÓN dentro del handler: `corsHeaders()` sin `req` siempre devolvía el dominio de
// producción viejo y el navegador bloqueaba la verificación pública (?verificar=) desde sac-omi.vercel.app.

function b64url(bytes: Uint8Array): string {
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  return atob(s);
}
async function sign(payloadB64: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(SIGNING_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  return b64url(new Uint8Array(sig));
}

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;
  const c = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? 'issue';

    // ── EMITIR (firma la credencial del usuario autenticado) ──
    if (action === 'issue') {
      const uid = await getUserId(req.headers.get('Authorization') ?? '');
      if (!uid) return json({ error: 'Inicia sesión para crear tu credencial.' }, 401);

      // Cada credencial firmada es un documento público: se limita cuántas puede crear una persona.
      const rl = await checkRateLimit(admin, 'credential-issue', uid, 10, 3600);
      if (!rl.allowed) return tooManyRequests(rl.reset_at, CORS);

      const { data: p } = await admin
        .from('profiles')
        .select('username, full_name')
        .eq('id', uid).maybeSingle();
      if (!p) return json({ error: 'No pude leer tu perfil.' }, 404);

      // Solo lo demostrado, y leído del servidor.
      const { data: pruebas, error: pe } = await admin
        .from('omicron_skill_proofs')
        .select('skill_label, best_score, last_proven_at')
        .eq('user_id', uid)
        .order('last_proven_at', { ascending: false })
        .limit(MAX_HABILIDADES);
      if (pe) return json({ error: 'No pude leer tus pruebas.' }, 500);
      if (!pruebas || pruebas.length === 0) {
        return json({ error: 'Todavía no tienes habilidades demostradas. Aprueba un examen primero.' }, 409);
      }

      const iat = Date.now();
      const payload = {
        v: 2,
        u: p.username,
        n: p.full_name ?? p.username,
        // h = habilidad · p = mejor puntaje (null = probada sin puntaje registrado) · f = fecha (AAAA-MM-DD)
        h: pruebas.map((x) => ({
          h: String(x.skill_label),
          p: x.best_score === null || x.best_score === undefined ? null : Math.round(Number(x.best_score)),
          f: String(x.last_proven_at ?? '').slice(0, 10),
        })),
        iat,
        exp: iat + VIGENCIA_MS,
      };
      const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
      const token = `${payloadB64}.${await sign(payloadB64)}`;
      return json({ token, habilidades: payload.h.length, vence: payload.exp });
    }

    // ── VERIFICAR (público: cualquiera valida un token) ──
    if (action === 'verify') {
      const token: string = (body?.token ?? '').toString();
      const [payloadB64, sig] = token.split('.');
      if (!payloadB64 || !sig) return json({ valid: false, error: 'Token inválido.' });
      const expected = await sign(payloadB64);
      if (expected !== sig) return json({ valid: false });
      let cred: unknown = null;
      try { cred = JSON.parse(b64urlDecode(payloadB64)); } catch { return json({ valid: false }); }
      // La versión 2 vence. La 1 (anterior) no traía fecha de vencimiento y se sigue aceptando.
      const exp = (cred as { v?: number; exp?: unknown } | null)?.exp;
      if ((cred as { v?: number } | null)?.v === 2 && (typeof exp !== 'number' || exp < Date.now())) {
        return json({ valid: false, expired: true });
      }
      return json({ valid: true, cred });
    }

    return json({ error: 'Acción no válida.' }, 400);
  } catch (e) {
    return json({ error: 'Error inesperado en el Pasaporte.', detail: String(e) }, 500);
  }
});
