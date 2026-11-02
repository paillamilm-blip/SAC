// supabase/functions/market-match/index.ts — Asesor IA de Contratación de Ómicrom.
// El comprador describe qué necesita; la IA recomienda el mejor talento del
// Mercado, CITANDO su evidencia (reputación del Gemelo + habilidades validadas
// por examen). Es el match empresa↔talento basado en confianza cero.
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

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ error: 'El Asesor IA no esta configurado (falta OPENROUTER_KEY).' }, 500);
    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesion para usar el Asesor IA.' }, 401);

    const rl = await checkRateLimit(admin, 'market-match', clientIp(req), 12, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const query: string = (body?.query ?? '').toString().trim();
    if (!query) return json({ error: 'Describe qué necesitas contratar.' }, 400);

    // 1) Servicios activos con vendedor real
    const { data: svcs } = await admin
      .from('market_services')
      .select('id, title, description, category, price, seller_id')
      .eq('is_active', true)
      .not('seller_id', 'is', null)
      .limit(25);

    const services = svcs ?? [];
    if (services.length === 0) {
      return json({ recomendacion: 'Todavía no hay talento suficiente en el Mercado para recomendar. Vuelve cuando haya más servicios publicados por nodos con evidencia validada.' });
    }

    // 2) Perfil + evidencia de cada vendedor (server-side, con service role)
    const sellerIds = [...new Set(services.map((s: any) => s.seller_id))];
    const { data: profs } = await admin
      .from('profiles')
      .select('id, username, full_name, node_type, node_level, reputation_score, competencias_validadas')
      .in('id', sellerIds);
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const { data: actas } = await admin
      .from('actas_evidencia')
      .select('user_id, nodo:skill_tree_nodes(title)')
      .in('user_id', sellerIds)
      .eq('veredicto', 'APROBADO');
    const compMap = new Map<string, string[]>();
    (actas ?? []).forEach((a: any) => {
      const t = a.nodo?.title; if (!t) return;
      const arr = compMap.get(a.user_id) ?? []; if (!arr.includes(t)) arr.push(t);
      compMap.set(a.user_id, arr);
    });

    // 3) Catálogo compacto para la IA
    const catalogo = services.map((s: any, i: number) => {
      const p = profMap.get(s.seller_id) as any;
      const comps = compMap.get(s.seller_id) ?? [];
      return `#${i + 1} · "${s.title}" (${s.category}, ${s.price} tokens) — vendedor @${p?.username ?? '?'} ` +
        `(${p?.node_type ?? 'Nodo'} N${p?.node_level ?? 1}, reputación ${Math.round(p?.reputation_score ?? 0)}/100, ` +
        `${p?.competencias_validadas ?? 0} habilidades validadas` +
        (comps.length ? `: ${comps.slice(0, 6).join(', ')}` : '') + ')';
    }).join('\n');

    const sys =
      'Eres el Asesor de Contratacion IA de Omicrom. Ayudas a quien contrata a elegir el mejor talento ' +
      'del catalogo, priorizando la EVIDENCIA (reputacion del Gemelo + habilidades validadas por examen), ' +
      'no solo el precio. Recomienda 1 a 3 opciones, en orden, y explica en 1 frase POR QUE cada una calza, ' +
      'citando su evidencia concreta. Si ninguna calza bien, dilo con honestidad. Espanol, claro y breve. Sin markdown.';
    const user =
      `NECESIDAD DEL CLIENTE: ${query}\n\nCATALOGO DISPONIBLE:\n${catalogo}\n\n` +
      'Entrega tu recomendacion (maximo ~150 palabras).';

    const rec = await callLLM([
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ]);
    return json({ recomendacion: rec || 'No pude generar una recomendación. Reintenta.', total: services.length });
  } catch (e) {
    return json({ error: 'Error inesperado en el Asesor IA.', detail: String(e) }, 500);
  }
}));
