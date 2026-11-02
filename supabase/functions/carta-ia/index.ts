// supabase/functions/carta-ia/index.ts — Carta de Habilidades de Ómicrom.
// La IA lee el Gemelo Digital + las Actas de Evidencia del usuario y redacta
// un resumen profesional VERIFICABLE (respaldado por evidencia, no auto-declarado)
// pensado para que una empresa lo lea de un vistazo.
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
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await userClient.auth.getUser();
  return data?.user?.id ?? null;
}

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ error: 'La Carta IA no esta configurada (falta OPENROUTER_KEY).' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesion para generar tu carta.' }, 401);

    const rl = await checkRateLimit(admin, 'carta-ia', clientIp(req), 10, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const { data: prof } = await admin
      .from('profiles')
      .select('full_name, username, node_type, node_level, reputation_score, execution_score, quality_score, transcendence_score, foundation_score, pe_points')
      .eq('id', uid).maybeSingle();
    if (!prof) return json({ error: 'No pude leer tu perfil.' }, 404);

    const { data: actas } = await admin
      .from('actas_evidencia')
      .select('puntaje_global, veredicto, ejecucion, calidad, trascendencia, fundamento, created_at, nodo:skill_tree_nodes(title)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    const validadas = (actas ?? []).filter((a: any) => a.veredicto === 'APROBADO');

    const evidencia = validadas.length === 0
      ? '(El usuario aun no tiene habilidades validadas por examen.)'
      : validadas.map((a: any) =>
          `- ${a.nodo?.title ?? 'Habilidad'}: ${a.puntaje_global}% (ejecucion ${a.ejecucion}, calidad ${a.calidad}, trascendencia ${a.trascendencia}, fundamento ${a.fundamento})`,
        ).join('\n');

    const sys =
      'Eres redactor profesional de Omicrom. Escribes una "Carta de Habilidades" breve y creible ' +
      'para que una EMPRESA evalue a un candidato. Regla de oro: basate SOLO en la evidencia que te paso ' +
      '(Gemelo Digital + actas validadas por IA). NO inventes experiencia ni titulos. Si hay poca evidencia, ' +
      'dilo con honestidad y enfocate en el potencial demostrado. Espanol profesional, calido y directo. ' +
      'Sin markdown, sin vinetas: 2 parrafos cortos (max ~160 palabras en total).';
    const user =
      `NOMBRE: ${prof.full_name || prof.username || 'Nodo'}\n` +
      `NIVEL: ${prof.node_type} ${prof.node_level}\n` +
      `GEMELO DIGITAL (0-100): ejecucion ${Math.round(prof.execution_score ?? 0)}, calidad ${Math.round(prof.quality_score ?? 0)}, ` +
      `trascendencia ${Math.round(prof.transcendence_score ?? 0)}, fundamento ${Math.round(prof.foundation_score ?? 0)}. ` +
      `Reputacion ${Math.round(prof.reputation_score ?? 0)}/100. PE ${prof.pe_points ?? 0}.\n` +
      `HABILIDADES VALIDADAS POR IA (${validadas.length}):\n${evidencia}\n\n` +
      'Redacta la Carta de Habilidades.';

    const carta = await callLLM([
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ]);

    return json({
      carta: carta || 'No pude generar la carta. Reintenta.',
      validadas: validadas.length,
      reputacion: Math.round(prof.reputation_score ?? 0),
    });
  } catch (e) {
    return json({ error: 'Error inesperado en la Carta IA.', detail: String(e) }, 500);
  }
}));
