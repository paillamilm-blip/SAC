// supabase/functions/examen-ia/index.ts — Examinador IA de Ómicrom (OpenRouter).
// Genera un examen tecnico ADAPTATIVO, hace defensa y evalua los 4 ejes.
// Acciones (body.action): 'generar' | 'defensa' | 'evaluar'
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

// Extrae el primer objeto JSON de un texto (por si viene con ruido).
function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* sigue */ }
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* nada */ } }
  return null;
}

function nivelTexto(p: { foundation_score?: number; node_level?: string }): string {
  const f = Number(p?.foundation_score ?? 50);
  if (f < 40) return 'principiante (explica con claridad, dificultad baja)';
  if (f < 70) return 'intermedio (dificultad media, exige aplicar)';
  return 'avanzado (dificultad alta, casos exigentes y matices)';
}

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await userClient.auth.getUser();
  return data?.user?.id ?? null;
}

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ error: 'El Examinador IA no esta configurado (falta OPENROUTER_KEY).' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesion para rendir el examen.' }, 401);

    const rl = await checkRateLimit(admin, 'examen-ia', clientIp(req), 30, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? 'generar';

    // ================= GENERAR =================
    if (action === 'generar') {
      const nodeId: string = body?.node_id;
      if (!nodeId) return json({ error: 'Falta node_id.' }, 400);

      const { data: node } = await admin
        .from('skill_tree_nodes')
        .select('id, title, description, category, difficulty_level')
        .eq('id', nodeId).maybeSingle();
      if (!node) return json({ error: 'Nodo no encontrado.' }, 404);

      const { data: prof } = await admin
        .from('profiles')
        .select('foundation_score, node_level, full_name')
        .eq('id', uid).maybeSingle();

      const sys =
        'Eres el Examinador IA de Omicrom, evaluador tecnico para estudiantes y tecnicos de ingenieria. ' +
        'Generas examenes para VALIDAR habilidades reales (no memorizacion). Responde SOLO en JSON valido. ' +
        'El examen debe ser sobre el tema del nodo, en espanol neutro-chileno, y calibrado al nivel del usuario.';
      const user =
        `NODO: "${node.title}" (categoria ${node.category}, dificultad ${node.difficulty_level}/5).\n` +
        `DESCRIPCION: ${node.description ?? '(sin descripcion)'}\n` +
        `NIVEL DEL USUARIO: ${nivelTexto(prof ?? {})}.\n\n` +
        'Genera un examen con este formato JSON EXACTO:\n' +
        '{"multiple_choice":[{"pregunta":"...","opciones":["a","b","c","d"],"correcta":0,"porque":"..."}],' +
        '"caso":{"enunciado":"un caso practico real para resolver con criterio","criterios":["criterio 1","criterio 2","criterio 3"]}}\n' +
        'Reglas: 3 preguntas de opcion multiple (4 opciones, indice "correcta" 0-3), 1 caso aplicado con 3 criterios de evaluacion. Nada fuera del JSON.';

      const raw = await callLLM([
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ], true, 2048);
      const exam = parseJson(raw);
      if (!exam?.multiple_choice || !exam?.caso) return json({ error: 'No pude generar el examen. Reintenta.', detail: (raw ?? '').slice(0, 300) }, 502);

      const { data: sess, error: se } = await admin
        .from('exam_sessions')
        .insert({ user_id: uid, node_id: nodeId, payload: { node, exam } })
        .select('id').single();
      if (se) return json({ error: 'No pude crear la sesion de examen.', detail: se.message }, 500);

      const mcSafe = (exam.multiple_choice as any[]).map((m: any) => ({ pregunta: m.pregunta, opciones: m.opciones }));
      return json({
        session_id: sess.id,
        node: { id: node.id, title: node.title },
        multiple_choice: mcSafe,
        caso: { enunciado: exam.caso.enunciado },
      });
    }

    // ================= DEFENSA =================
    if (action === 'defensa') {
      const sessionId: string = body?.session_id;
      const casoRespuesta: string = (body?.caso_respuesta ?? '').toString();
      if (!sessionId) return json({ error: 'Falta session_id.' }, 400);

      const { data: sess } = await admin
        .from('exam_sessions').select('payload').eq('id', sessionId).eq('user_id', uid).maybeSingle();
      if (!sess) return json({ error: 'Sesion no encontrada.' }, 404);

      const caso = sess.payload?.exam?.caso;
      const sys =
        'Eres el Examinador IA de Omicrom. A partir de un caso y la respuesta del estudiante, ' +
        'haces UNA sola repregunta de defensa, breve y dificil de responder de memoria, ' +
        'para verificar que entiende de verdad. Responde SOLO en JSON.';
      const user =
        `CASO: ${caso?.enunciado}\n` +
        `RESPUESTA DEL ESTUDIANTE: ${casoRespuesta || '(no respondio)'}\n\n` +
        'Devuelve: {"defensa":"tu repregunta aqui"}';

      const raw = await callLLM([
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ], true);
      const out = parseJson(raw);
      return json({ defensa: out?.defensa ?? 'Explica con tus palabras por que tu enfoque es el correcto.' });
    }

    // ================= EVALUAR =================
    if (action === 'evaluar') {
      const sessionId: string = body?.session_id;
      const mcRespuestas: number[] = Array.isArray(body?.mcq_respuestas) ? body.mcq_respuestas : [];
      const casoRespuesta: string = (body?.caso_respuesta ?? '').toString();
      const defensaRespuesta: string = (body?.defensa_respuesta ?? '').toString();
      if (!sessionId) return json({ error: 'Falta session_id.' }, 400);

      const { data: sess } = await admin
        .from('exam_sessions').select('payload, node_id').eq('id', sessionId).eq('user_id', uid).maybeSingle();
      if (!sess) return json({ error: 'Sesion no encontrada.' }, 404);

      const exam = sess.payload?.exam;
      const node = sess.payload?.node;
      const mc = (exam?.multiple_choice ?? []) as any[];

      let aciertos = 0;
      mc.forEach((m: any, i: number) => { if (mcRespuestas[i] === m.correcta) aciertos++; });
      const mcScore = mc.length ? Math.round((aciertos / mc.length) * 100) : 0;

      const sys =
        'Eres el Examinador IA de Omicrom. Evaluas con rigor y justicia, en espanol. ' +
        'Califica los 4 ejes del Gemelo Digital de 0 a 100 segun la evidencia. Responde SOLO en JSON.';
      const user =
        `CASO: ${exam?.caso?.enunciado}\n` +
        `CRITERIOS DE EVALUACION: ${JSON.stringify(exam?.caso?.criterios ?? [])}\n` +
        `RESPUESTA AL CASO: ${casoRespuesta || '(vacia)'}\n` +
        `REPREGUNTA DE DEFENSA RESPONDIDA: ${defensaRespuesta || '(vacia)'}\n` +
        `RESULTADO OPCION MULTIPLE: ${aciertos}/${mc.length} (${mcScore}%)\n\n` +
        'Evalua: EJECUCION (resuelve el problema), CALIDAD (rigor, completitud, buenas practicas), ' +
        'TRASCENDENCIA (vision sistemica, propone mejoras/reutilizacion), FUNDAMENTO (entiende los conceptos; ' +
        'pondera fuerte la opcion multiple y la defensa). ' +
        'Devuelve JSON EXACTO: {"ejecucion":0,"calidad":0,"trascendencia":0,"fundamento":0,' +
        '"resumen":"2-3 frases sobre el desempeno","feedback":"1 consejo para mejorar"}';

      const raw = await callLLM([
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ], true, 2048);
      const ev = parseJson(raw) ?? {};
      const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
      const ejecucion = clamp(ev.ejecucion);
      const calidad = clamp(ev.calidad);
      const trascendencia = clamp(ev.trascendencia);
      const fundamento = clamp(ev.fundamento != null ? (Number(ev.fundamento) * 0.6 + mcScore * 0.4) : mcScore);
      const puntaje = Math.round((ejecucion + calidad + trascendencia + fundamento) / 4);
      const veredicto = puntaje >= 70 ? 'APROBADO' : 'REPROBADO';

      const detalle = {
        multiple_choice: mc.map((m: any, i: number) => ({ pregunta: m.pregunta, elegida: mcRespuestas[i] ?? null, correcta: m.correcta })),
        caso: { enunciado: exam?.caso?.enunciado, respuesta: casoRespuesta },
        defensa: defensaRespuesta,
        mc_score: mcScore,
        feedback: ev.feedback ?? null,
      };

      const { data: actaId, error: re } = await admin.rpc('aplicar_acta', {
        p_user_id: uid,
        p_node_id: sess.node_id,
        p_ejecucion: ejecucion,
        p_calidad: calidad,
        p_trascendencia: trascendencia,
        p_fundamento: fundamento,
        p_puntaje: puntaje,
        p_veredicto: veredicto,
        p_resumen: ev.resumen ?? null,
        p_detalle: detalle,
      });
      if (re) return json({ error: 'No pude registrar el acta.', detail: re.message }, 500);

      await admin.from('exam_sessions').update({ status: 'EVALUATED' }).eq('id', sessionId);

      return json({
        acta_id: actaId,
        node: node ? { id: node.id, title: node.title } : null,
        veredicto,
        puntaje_global: puntaje,
        ejes: { ejecucion, calidad, trascendencia, fundamento },
        resumen: ev.resumen ?? '',
        feedback: ev.feedback ?? '',
      });
    }

    return json({ error: 'Accion no valida.' }, 400);
  } catch (e) {
    return json({ error: 'Error inesperado en el Examinador IA.', detail: String(e) }, 500);
  }
}));
