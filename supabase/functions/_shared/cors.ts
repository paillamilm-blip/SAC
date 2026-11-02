// supabase/functions/_shared/cors.ts
// ═══════════════════════════════════════════════════════════════════════
// CORS centralizado — una sola fuente de verdad para los headers CORS.
//
// En desarrollo local (Supabase CLI), permite localhost.
// En producción, solo permite el dominio real de la app.
// ═══════════════════════════════════════════════════════════════════════

const PRODUCTION_ORIGIN = 'https://sistema-omicrom.vercel.app';

// En local, Supabase CLI no setea PUBLIC_SITE_URL.
// Si está seteado y es un dominio conocido, usarlo.
const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || '';

// Un origen de desarrollo local es CUALQUIER puerto de loopback. Fijar 5173 y
// 3000 alcanzaba mientras Vite arrancaba libre; si el puerto estaba ocupado sube
// solo a 5174 y el navegador cortaba el motor con CORS — el usuario veía
// "verifica tu conexión" cuando la conexión estaba perfecta.
const ES_LOOPBACK = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

function getAllowedOrigin(requestOrigin?: string | null): string {
  // Lista de orígenes permitidos exactos
  const allowed = [
    PRODUCTION_ORIGIN,
    SITE_URL,
  ].filter(Boolean);

  if (!requestOrigin) return PRODUCTION_ORIGIN;

  // Si el request viene de un origen permitido exacto, reflejarlo
  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (ES_LOOPBACK.test(requestOrigin)) return requestOrigin;

  // Permitir preview deployments de Vercel del proyecto (con o sin 'm' final)
  if (requestOrigin.endsWith('.vercel.app') && /sistema-omicro[nm]/.test(requestOrigin)) {
    return requestOrigin;
  }

  // Default: producción
  return PRODUCTION_ORIGIN;
}

/**
 * Retorna headers CORS para un request dado.
 * Usa el origin del request para decidir qué reflejar.
 */
export function corsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get('origin') ?? null;
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/** Respuesta preflight estándar */
export function handlePreflight(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) });
}

/**
 * Envuelve un handler de `Deno.serve` para que CADA respuesta lleve el CORS del
 * origen que la pidió.
 *
 * Existe por un defecto concreto del repo: casi todas las funciones declaran
 * `const CORS = corsHeaders()` a nivel de módulo — sin request, así que el origen
 * de la respuesta queda congelado en el de producción para siempre. Desde
 * cualquier otro origen (local en cualquier puerto, un preview de Vercel) el
 * navegador corta el request y el usuario lee "verifica tu conexión" con la
 * conexión perfecta. El envoltorio reescribe las cabeceras al salir, así que las
 * respuestas ya escritas —incluidas las de los helpers que llaman a `json()`—
 * quedan correctas sin tocar su lógica.
 */
export function withCors(
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
