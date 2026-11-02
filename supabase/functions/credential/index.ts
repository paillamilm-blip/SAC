// supabase/functions/credential/index.ts — Pasaporte Verificable de Ómicrom.
// Emite una credencial FIRMADA criptográficamente (HMAC-SHA256) del Gemelo +
// competencias validadas del usuario, y permite VERIFICARLA públicamente.
// Si alguien altera un solo dato, la firma no valida => se detecta al instante.
// Acciones: 'issue' (usuario autenticado firma su credencial) | 'verify' (público).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Clave de firma: usa una dedicada si existe, si no la service key (estable y secreta).
const SIGNING_KEY = Deno.env.get('CREDENTIAL_SIGNING_KEY') ?? SERVICE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const enc = new TextEncoder();

import { corsHeaders, withCors } from '../_shared/cors.ts';
const CORS = corsHeaders();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? 'issue';

    // ── EMITIR (firma la credencial del usuario autenticado) ──
    if (action === 'issue') {
      const uid = await getUserId(req.headers.get('Authorization') ?? '');
      if (!uid) return json({ error: 'Inicia sesión para emitir tu Pasaporte.' }, 401);

      const { data: p } = await admin
        .from('profiles')
        .select('username, full_name, node_type, node_level, reputation_score, execution_score, quality_score, transcendence_score, foundation_score, competencias_validadas, pe_points')
        .eq('id', uid).maybeSingle();
      if (!p) return json({ error: 'No pude leer tu perfil.' }, 404);

      const payload = {
        v: 1,
        u: p.username,
        n: p.full_name ?? p.username,
        nt: p.node_type ?? 'Nodo Operativo',
        nl: String(p.node_level ?? 'N1'),
        rep: Math.round(Number(p.reputation_score ?? 0)),
        ej: [
          Math.round(Number(p.execution_score ?? 0)),
          Math.round(Number(p.quality_score ?? 0)),
          Math.round(Number(p.transcendence_score ?? 0)),
          Math.round(Number(p.foundation_score ?? 0)),
        ],
        cv: Number(p.competencias_validadas ?? 0),
        pe: Number(p.pe_points ?? 0),
        iat: Date.now(),
      };
      const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
      const token = `${payloadB64}.${await sign(payloadB64)}`;
      return json({ token });
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
      return json({ valid: true, cred });
    }

    return json({ error: 'Acción no válida.' }, 400);
  } catch (e) {
    return json({ error: 'Error inesperado en el Pasaporte.', detail: String(e) }, 500);
  }
}));
