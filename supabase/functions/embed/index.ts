// supabase/functions/embed/index.ts
// Genera embeddings (384 dims) con el modelo gte-small integrado de Supabase.
// Sin API externa, sin costo de tokens. Se usa para:
//  - publicar documentos en la Bóveda (guardar su embedding)
//  - búsqueda semántica (embedding de la consulta)
//
// Desplegar desde el Dashboard de Supabase > Edge Functions > New function "embed".

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';

// Modelo local de Supabase (gte-small -> vector de 384 dimensiones)
const session = new Supabase.ai.Session('gte-small');

const _admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

import { corsHeaders, withCors } from '../_shared/cors.ts';
const CORS = corsHeaders();

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // Anti-spam por IP: 40 embeddings por minuto.
    const rl = await checkRateLimit(_admin, 'embed', clientIp(req), 40, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el campo "text"' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // mean_pool + normalize -> embedding listo para similitud por coseno
    const embedding = await session.run(text, { mean_pool: true, normalize: true });

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}));
