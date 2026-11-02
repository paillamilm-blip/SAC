// supabase/functions/crear-checkout/index.ts
// Crea una sesión de Stripe Checkout para comprar Tokens Ómicron (1 Token = 1 CLP).
//
// - Protegida por JWT: el usuario debe estar autenticado.
// - Activada por env: si no hay STRIPE_SECRET_KEY, responde 503 amigable
//   (la app oculta el botón, así que esto es solo defensa en profundidad).
// - Usa la API REST de Stripe vía fetch (sin dependencias npm/SDK) para máxima
//   compatibilidad con el edge runtime.
// - Guarda user_id y tokens en metadata para que el webhook acredite el saldo.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const PUBLIC_SITE_URL = Deno.env.get('PUBLIC_SITE_URL') ?? '';

// Límites de compra (Tokens). Stripe tiene un mínimo por transacción en CLP.
const MIN_TOKENS = 1000;
const MAX_TOKENS = 500000;

import { corsHeaders, withCors } from '../_shared/cors.ts';
const CORS = corsHeaders();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!STRIPE_SECRET_KEY) {
      return json({ ok: false, error: 'La compra de tokens aún no está habilitada.' }, 503);
    }

    // 1) Identificar al usuario a partir del JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ ok: false, error: 'Debes iniciar sesión para comprar tokens.' }, 401);
    }
    const userId = userData.user.id;

    // 2) Validar la cantidad de tokens solicitada.
    const body = await req.json().catch(() => ({}));
    let tokens = Math.floor(Number(body?.tokens ?? 0));
    if (!Number.isFinite(tokens) || tokens < MIN_TOKENS) tokens = MIN_TOKENS;
    if (tokens > MAX_TOKENS) tokens = MAX_TOKENS;

    // 3) URLs de retorno (usa el origen real del navegador; fallback a env).
    const origin = req.headers.get('Origin') || PUBLIC_SITE_URL || '';
    if (!origin) return json({ ok: false, error: 'No pude determinar la URL de retorno.' }, 400);
    // Incluimos el id de la sesión para poder verificar el pago al volver
    // (Stripe reemplaza {CHECKOUT_SESSION_ID} por el id real).
    const successUrl = `${origin}/?compra=exito&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?compra=cancelada`;

    // 4) Crear la sesión de Checkout (CLP es moneda sin decimales: unit_amount en pesos).
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.set('client_reference_id', userId);
    params.set('metadata[user_id]', userId);
    params.set('metadata[tokens]', String(tokens));
    params.set('payment_intent_data[metadata][user_id]', userId);
    params.set('payment_intent_data[metadata][tokens]', String(tokens));
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', 'clp');
    params.set('line_items[0][price_data][unit_amount]', String(tokens));
    params.set('line_items[0][price_data][product_data][name]', `${tokens.toLocaleString('es-CL')} Tokens Ómicron`);
    params.set('line_items[0][price_data][product_data][description]', '1 Token = 1 CLP · Saldo para tu billetera Ómicron');

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const session = await resp.json();
    if (!resp.ok) {
      return json({ ok: false, error: 'No pude iniciar el pago.', detail: session?.error?.message ?? null }, 502);
    }

    return json({ ok: true, url: session.url, id: session.id });
  } catch (e) {
    return json({ ok: false, error: 'Error inesperado creando el pago.', detail: String(e) }, 500);
  }
}));
