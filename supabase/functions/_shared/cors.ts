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

// Dominios extra permitidos, separados por coma (secreto ALLOWED_ORIGINS). Sirve para sumar un proyecto
// de Vercel nuevo sin editar el código: basta cambiar el secreto. Ej.: https://sac.vercel.app,https://app.midominio.cl
const EXTRA_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter((o) => o.startsWith('https://'));

function getAllowedOrigin(requestOrigin?: string | null): string {
  // Lista de orígenes permitidos exactos
  const allowed = [
    PRODUCTION_ORIGIN,
    SITE_URL,
    ...EXTRA_ORIGINS,
    'http://localhost:5173',   // Vite dev
    'http://localhost:3000',   // Fallback dev
  ].filter(Boolean);

  if (!requestOrigin) return PRODUCTION_ORIGIN;

  // Si el request viene de un origen permitido exacto, reflejarlo
  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Permitir preview deployments de Vercel del proyecto (con o sin 'm' final)
  if (requestOrigin.endsWith('.vercel.app') && /sistema-omicro[nm]/.test(requestOrigin)) {
    return requestOrigin;
  }

  // Previews y producción del proyecto «sac» en el equipo de Vercel (el equipo va en la URL).
  if (/^https:\/\/sac(-[a-z0-9]+)*-tuprofendustrial-s-projects\.vercel\.app$/.test(requestOrigin)) {
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
