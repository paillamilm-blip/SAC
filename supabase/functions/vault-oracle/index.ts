// supabase/functions/vault-oracle/index.ts — Oráculo de la Bóveda (Ómicrom).
// El usuario pregunta en lenguaje natural; el frontend ya buscó por significado
// (embeddings) y manda los documentos candidatos. La IA interpreta la pregunta
// y recomienda QUÉ conocimiento consultar y POR QUÉ — impulsando la
// capitalización (cada consulta paga regalías al autor). No expone el contenido
// pagado: solo razona sobre título/etiquetas/afinidad.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { callLLM, hasKey } from '../_shared/llm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

import { corsHeaders, withCors } from '../_shared/cors.ts';
const CORS = corsHeaders();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;
  const c = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}

interface Cand { titulo: string; etiquetas?: string; costo?: number; autor?: string; afinidad?: number }

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ error: 'El Oráculo no está configurado (falta OPENROUTER_KEY).' }, 500);
    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesión para usar el Oráculo.' }, 401);

    const rl = await checkRateLimit(admin, 'vault-oracle', clientIp(req), 12, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const query: string = (body?.query ?? '').toString().trim();
    const candidatos: Cand[] = Array.isArray(body?.candidates) ? body.candidates.slice(0, 6) : [];
    const userSkills: string[] = Array.isArray(body?.skills) ? body.skills : [];
    const cvSummary: string = (body?.cv_summary ?? '').toString().trim();
    if (!query) return json({ error: 'Escribe tu pregunta para el Oráculo.' }, 400);

    if (candidatos.length === 0) {
      return json({ recomendacion: 'La Bóveda aún no tiene conocimiento relacionado con tu pregunta. Cuando haya más soluciones publicadas, el Oráculo podrá recomendarte cuáles consultar.' });
    }

    const lista = candidatos.map((c, i) =>
      `#${i + 1} · "${c.titulo}" (etiquetas: ${c.etiquetas || 'n/d'}; afinidad ${Math.round((c.afinidad ?? 0) * 100)}%; ` +
      `costo ${c.costo ?? 0} tokens; autor @${c.autor || '?'})`,
    ).join('\n');

    const skillInfo = userSkills.length
      ? `\nSKILLS DEL USUARIO: ${userSkills.join(', ')}.`
      : '';
    const cvInfo = cvSummary
      ? `\nRESUMEN CV: ${cvSummary}`
      : '';

    const sys =
      'Eres el Oráculo de la Bóveda de Omicrom, un asesor de conocimiento. Ayudas a quien busca a decidir ' +
      'QUE solucion(es) le conviene consultar para resolver su pregunta, priorizando afinidad y utilidad. ' +
      'Considera las HABILIDADES del usuario para priorizar documentos que complementen las que le faltan. ' +
      'NO tienes el contenido pagado, solo titulos/etiquetas/afinidad: no inventes el contenido. ' +
      'Recomienda 1 a 3 documentos en orden, explica en 1 frase por que cada uno le sirve SEGÚN SU PERFIL, y recuerdale ' +
      'que consultar paga regalias al autor (economia justa). Si nada calza, dilo. Espanol, claro y breve (~130 palabras). Sin markdown.';
    const user = `PREGUNTA: ${query}\n\nCONOCIMIENTO DISPONIBLE (por afinidad):\n${lista}${skillInfo}${cvInfo}\n\nEntrega tu recomendación.`;

    const rec = await callLLM([
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ]);
    return json({ recomendacion: rec || 'No pude generar una recomendación. Reintenta.' });
  } catch (e) {
    return json({ error: 'Error inesperado en el Oráculo.', detail: String(e) }, 500);
  }
}));
