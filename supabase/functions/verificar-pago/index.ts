// supabase/functions/verificar-pago/index.ts
// Verifica un pago de Stripe DIRECTAMENTE al volver del checkout y acredita los
// tokens. Esto hace que la recarga funcione aunque el webhook no entregue el
// evento (más confiable). La acreditación usa la RPC idempotente, así que si el
// webhook también llega, no se duplica.
//
// Seguridad:
// - Protegida por JWT: identifica al usuario autenticado.
// - Solo acredita si la sesión de Stripe pertenece a ESE usuario
//   (session.metadata.user_id === usuario autenticado) y está pagada.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

import { corsHeaders, withCors } from '../_shared/cors.ts';
const CORS = corsHeaders();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!STRIPE_SECRET_KEY || !_admin) {
      return json({ ok: false, error: 'La verificación de pagos no está habilitada.' }, 503);
    }

    // 1) Usuario autenticado.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ ok: false, error: 'Debes iniciar sesión.' }, 401);
    const userId = userData.user.id;

    // 2) Session id a verificar.
    const body = await req.json().catch(() => ({}));
    const sessionId = (body?.session_id ?? '').toString().trim();
    if (!sessionId.startsWith('cs_')) return json({ ok: false, error: 'Sesión de pago inválida.' }, 400);

    // 3) Consultar la sesión en Stripe.
    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const session = await resp.json();
    if (!resp.ok) return json({ ok: false, error: 'No pude verificar el pago.', detail: session?.error?.message ?? null }, 502);

    const paid = session?.payment_status === 'paid' || session?.status === 'complete';
    const metaUser = session?.metadata?.user_id ?? session?.client_reference_id ?? '';
    const tokens = parseInt(session?.metadata?.tokens ?? '0', 10);
    const reference =
      (typeof session?.payment_intent === 'string' && session.payment_intent) || session?.id || '';

    // 4) Seguridad: la sesión debe ser de ESTE usuario.
    if (metaUser !== userId) return json({ ok: false, error: 'Esta compra no corresponde a tu cuenta.' }, 403);

    if (!paid) return json({ ok: true, paid: false, pending: true });
    if (!(tokens > 0) || !reference) return json({ ok: false, error: 'Datos de la compra incompletos.' }, 422);

    // 5) Acreditar (idempotente).
    const { error } = await _admin.rpc('credit_tokens_from_payment', {
      p_user_id: userId,
      p_tokens: tokens,
      p_payment_intent_id: reference,
    });
    if (error) return json({ ok: false, error: 'No pude acreditar los tokens.', detail: error.message }, 500);

    // 6) Devolver el saldo actualizado.
    const { data: prof } = await _admin.from('profiles').select('token_balance').eq('id', userId).maybeSingle();
    return json({ ok: true, paid: true, credited: tokens, balance: prof?.token_balance ?? null });
  } catch (e) {
    return json({ ok: false, error: 'Error inesperado verificando el pago.', detail: String(e) }, 500);
  }
}));
