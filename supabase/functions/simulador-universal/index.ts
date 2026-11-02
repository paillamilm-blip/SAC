// supabase/functions/simulador-universal/index.ts
// ═══════════════════════════════════════════════════════════════════════
// SIMULADOR UNIVERSAL ADAPTATIVO — Motor único de validación de competencias.
// Usa OpenRouter (gratis) para IA.
// Acciones: 'iniciar' | 'defensa' | 'evaluar'
// ═══════════════════════════════════════════════════════════════════════
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



// ═══ UTILIDADES ═══════════════════════════════════════════════════════

function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* */ }
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* */ } }
  return null;
}

const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;
  const c = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}



// ═══ DETECCIÓN DE MODO Y DIFICULTAD ══════════════════════════════════

// El simulador es SIEMPRE modo ANÁLISIS — evaluación por IA adaptativa
// para TODAS las disciplinas sin excepción (incluyendo software).
// No hay sandbox de código ni ejecución de programas del usuario.

interface DifficultyContext {
  foundationScore: number;
  recentAttempts: Array<{ result: string; score: number }>;
  nodeDifficulty: number;
}

function calculateAdaptiveDifficulty(ctx: DifficultyContext): { level: number; label: string } {
  const { foundationScore, recentAttempts, nodeDifficulty } = ctx;

  // Base: nivel del usuario por su foundation_score
  let base = foundationScore < 30 ? 1 : foundationScore < 50 ? 2 : foundationScore < 70 ? 3 : foundationScore < 85 ? 4 : 5;

  // Ajuste por tasa de éxito reciente (Zone of Proximal Development)
  if (recentAttempts.length >= 3) {
    const passRate = recentAttempts.filter(a => a.result === 'PASS' || a.result === 'APROBADO' || a.score >= 70).length / recentAttempts.length;
    if (passRate >= 0.8) base = Math.min(5, base + 1); // Demasiado fácil → subir
    else if (passRate <= 0.3) base = Math.max(1, base - 1); // Demasiado difícil → bajar
    // Entre 0.3 y 0.8 → zona óptima, mantener
  }

  // Considerar dificultad intrínseca del nodo
  const final = Math.max(1, Math.min(5, Math.round((base + nodeDifficulty) / 2)));

  const labels: Record<number, string> = {
    1: 'principiante — problemas simples, explicaciones claras, guía paso a paso',
    2: 'intermedio — requiere aplicar conceptos en situaciones reales',
    3: 'avanzado — análisis profundo, trade-offs, optimización',
    4: 'experto — problemas abiertos, diseño de sistema, decisiones de arquitectura',
    5: 'maestro — contribución original, liderazgo técnico, evaluación crítica',
  };

  return { level: final, label: labels[final] ?? labels[3] };
}



// (Sección de sandbox/Piston eliminada — el simulador es 100% IA)



// ═══ HANDLER PRINCIPAL ════════════════════════════════════════════════

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ error: 'Simulador no configurado (falta OPENROUTER_KEY).' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesion para usar el Simulador.' }, 401);

    const rl = await checkRateLimit(admin, 'simulador', clientIp(req), 30, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? 'iniciar';

    // ═══════════ ACCIÓN: INICIAR ═══════════
    if (action === 'iniciar') {
      const nodeId: string = body?.node_id;
      if (!nodeId) return json({ error: 'Falta node_id.' }, 400);

      // Obtener datos del nodo
      const { data: node } = await admin
        .from('skill_tree_nodes')
        .select('id, title, description, category, difficulty_level')
        .eq('id', nodeId).maybeSingle();
      if (!node) return json({ error: 'Nodo no encontrado.' }, 404);

      // Obtener perfil del usuario
      const { data: prof } = await admin
        .from('profiles')
        .select('foundation_score, execution_score, quality_score, transcendence_score, node_level, full_name')
        .eq('id', uid).maybeSingle();

      // Historial de intentos recientes para dificultad adaptativa
      const { data: attempts } = await admin
        .from('skill_test_attempts')
        .select('result, score')
        .eq('user_id', uid)
        .order('attempted_at', { ascending: false })
        .limit(5);

      // Calcular dificultad adaptativa
      const difficulty = calculateAdaptiveDifficulty({
        foundationScore: Number(prof?.foundation_score ?? 50),
        recentAttempts: (attempts ?? []).map(a => ({ result: a.result, score: a.score ?? 0 })),
        nodeDifficulty: node.difficulty_level ?? 3,
      });

      // Generar reto con IA adaptativa (siempre modo ANÁLISIS)
      const sys =
        'Eres el Simulador Universal de Omicrom: un evaluador experto que valida habilidades en CUALQUIER disciplina. ' +
        'Tu rol es generar un RETO ADAPTATIVO que empuje al usuario justo por encima de su nivel actual. ' +
        'El reto debe ser práctico, realista y evaluable objetivamente. Responde SOLO en JSON válido. ' +
        'El idioma es español neutro-chileno.';

      const user =
        `NODO/HABILIDAD: "${node.title}" (categoría: ${node.category}, dificultad intrínseca: ${node.difficulty_level}/5)\n` +
        `DESCRIPCION: ${node.description ?? '(sin descripción)'}\n` +
        `NIVEL ADAPTATIVO DEL USUARIO: ${difficulty.label}\n` +
        `EJES ACTUALES: Ejecución=${prof?.execution_score ?? 50}, Calidad=${prof?.quality_score ?? 50}, ` +
        `Trascendencia=${prof?.transcendence_score ?? 50}, Fundamento=${prof?.foundation_score ?? 50}\n\n` +
        'Genera un reto con este formato JSON EXACTO:\n' +
        '{\n' +
        '  "titulo": "nombre corto del reto",\n' +
        '  "contexto": "situación real donde se aplica esta habilidad (2-3 frases)",\n' +
        '  "preguntas": [{"pregunta":"...","opciones":["a","b","c","d"],"correcta":0,"razon":"..."}],\n' +
        '  "caso_practico": {"enunciado":"descripción del problema a resolver","criterios":["criterio 1","criterio 2","criterio 3"]},\n' +
        '  "pista_adaptativa": "una pista calibrada al nivel del usuario que NO da la respuesta pero guía"\n' +
        '}\n' +
        'Reglas:\n' +
        '- 3 preguntas de opción múltiple (4 opciones, índice "correcta" 0-3)\n' +
        '- 1 caso práctico con 3 criterios de evaluación\n' +
        '- La dificultad debe corresponder EXACTAMENTE al nivel indicado\n' +
        '- Si la categoría es ingeniería/procesos, usa escenarios industriales reales\n' +
        '- Si es diseño, pide decisiones de diseño con trade-offs\n' +
        '- Si es gestión, plantea dilemas de liderazgo con datos';

      const raw = await callLLM([
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ], true, 3000);
      const reto = parseJson(raw);
      if (!reto?.preguntas || !reto?.caso_practico) {
        return json({ error: 'No pude generar el reto. Reintenta.', detail: (raw ?? '').slice(0, 300) }, 502);
      }

      // Guardar sesión con la clave (no viaja al cliente)
      const { data: sess, error: se } = await admin
        .from('exam_sessions')
        .insert({ user_id: uid, node_id: nodeId, payload: { node, reto, difficulty }, status: 'OPEN' })
        .select('id').single();
      if (se) return json({ error: 'No pude crear la sesión.', detail: se.message }, 500);

      // Devolver SIN respuestas correctas
      const preguntasSafe = reto.preguntas.map((p: any) => ({ pregunta: p.pregunta, opciones: p.opciones }));
      return json({
        session_id: sess.id,
        session_mode: 'ANALISIS',
        node: { id: node.id, title: node.title, category: node.category },
        difficulty,
        reto: {
          titulo: reto.titulo,
          contexto: reto.contexto,
          preguntas: preguntasSafe,
          caso_practico: { enunciado: reto.caso_practico.enunciado },
          pista_adaptativa: reto.pista_adaptativa,
        },
      });
    }



    // ═══════════ ACCIÓN: EVALUAR (modo ANÁLISIS/MIXTO) ═══════════
    if (action === 'evaluar') {
      const sessionId: string = body?.session_id;
      const respuestas: number[] = Array.isArray(body?.respuestas) ? body.respuestas : [];
      const casoRespuesta: string = (body?.caso_respuesta ?? '').toString();
      const defensaRespuesta: string = (body?.defensa_respuesta ?? '').toString();
      if (!sessionId) return json({ error: 'Falta session_id.' }, 400);

      const { data: sess } = await admin
        .from('exam_sessions').select('payload, node_id').eq('id', sessionId).eq('user_id', uid).maybeSingle();
      if (!sess) return json({ error: 'Sesión no encontrada.' }, 404);

      const reto = sess.payload?.reto;
      const node = sess.payload?.node;
      const difficulty = sess.payload?.difficulty;
      const preguntas = (reto?.preguntas ?? []) as any[];

      // 1) Calificar opción múltiple (determinístico)
      let aciertos = 0;
      preguntas.forEach((p: any, i: number) => { if (respuestas[i] === p.correcta) aciertos++; });
      const mcScore = preguntas.length ? Math.round((aciertos / preguntas.length) * 100) : 0;

      // 2) Evaluar caso + defensa con IA (4 ejes)
      const sys =
        'Eres el Simulador Universal de Omicrom. Evalúas con rigor, justicia y empatía. ' +
        'Tu objetivo es AYUDAR AL USUARIO A MEJORAR, no solo calificarlo. ' +
        'Evalúa los 4 ejes del Gemelo Digital de 0 a 100. Responde SOLO en JSON válido.';

      const user =
        `HABILIDAD: ${node?.title ?? 'Desconocida'} (categoría: ${node?.category ?? '?'})\n` +
        `NIVEL ADAPTATIVO: ${difficulty?.label ?? 'intermedio'}\n` +
        `CASO: ${reto?.caso_practico?.enunciado ?? '(sin caso)'}\n` +
        `CRITERIOS: ${JSON.stringify(reto?.caso_practico?.criterios ?? [])}\n` +
        `RESPUESTA AL CASO: ${casoRespuesta || '(vacía)'}\n` +
        `DEFENSA (si hubo): ${defensaRespuesta || '(no hubo defensa)'}\n` +
        `OPCIÓN MÚLTIPLE: ${aciertos}/${preguntas.length} (${mcScore}%)\n\n` +
        'Evalúa:\n' +
        '- EJECUCION: ¿resuelve el problema? ¿llega a una solución funcional?\n' +
        '- CALIDAD: ¿es riguroso? ¿considera edge cases? ¿buenas prácticas?\n' +
        '- TRASCENDENCIA: ¿propone mejoras? ¿visión sistémica? ¿reutilizable?\n' +
        '- FUNDAMENTO: ¿demuestra comprensión profunda de los conceptos? (ponderar opción múltiple)\n\n' +
        'Devuelve JSON EXACTO:\n' +
        '{"ejecucion":0,"calidad":0,"trascendencia":0,"fundamento":0,' +
        '"resumen":"2-3 frases sobre el desempeño",' +
        '"feedback":"QUÉ hacer específicamente para mejorar al siguiente nivel",' +
        '"siguiente_paso":"una acción concreta que el usuario debería practicar"}';

      const raw = await callLLM([{ role: 'system', content: sys }, { role: 'user', content: user }], true, 2048);
      const ev = parseJson(raw) ?? {};
      const ejecucion = clamp(ev.ejecucion);
      const calidad = clamp(ev.calidad);
      const trascendencia = clamp(ev.trascendencia);
      const fundamento = clamp(ev.fundamento != null ? (Number(ev.fundamento) * 0.6 + mcScore * 0.4) : mcScore);
      const puntaje = Math.round((ejecucion + calidad + trascendencia + fundamento) / 4);
      const veredicto = puntaje >= 70 ? 'APROBADO' : 'REPROBADO';

      // 3) Aplicar acta (service role)
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
        p_detalle: { respuestas, caso: casoRespuesta, defensa: defensaRespuesta, mc_score: mcScore, feedback: ev.feedback },
      });
      if (re) return json({ error: 'No pude registrar el acta.', detail: re.message }, 500);

      // Obtener PE reward del nodo
      let peAwarded = 0;
      if (veredicto === 'APROBADO') {
        const { data: nodeData } = await admin.from('skill_tree_nodes').select('pe_reward').eq('id', sess.node_id).maybeSingle();
        peAwarded = nodeData?.pe_reward ?? 15;
      }

      await admin.from('exam_sessions').update({ status: 'EVALUATED' }).eq('id', sessionId);

      return json({
        acta_id: actaId,
        veredicto,
        puntaje_global: puntaje,
        ejes: { ejecucion, calidad, trascendencia, fundamento },
        resumen: ev.resumen ?? '',
        feedback: ev.feedback ?? '',
        siguiente_paso: ev.siguiente_paso ?? '',
        pe_awarded: peAwarded,
        difficulty_applied: difficulty,
      });
    }



    // ═══════════ ACCIÓN: DEFENSA ═══════════
    if (action === 'defensa') {
      const sessionId: string = body?.session_id;
      const casoRespuesta: string = (body?.caso_respuesta ?? '').toString();
      if (!sessionId) return json({ error: 'Falta session_id.' }, 400);

      const { data: sess } = await admin
        .from('exam_sessions').select('payload').eq('id', sessionId).eq('user_id', uid).maybeSingle();
      if (!sess) return json({ error: 'Sesión no encontrada.' }, 404);

      const reto = sess.payload?.reto;
      const difficulty = sess.payload?.difficulty;
      const sys =
        'Eres el Simulador Universal. Haces UNA repregunta de defensa, calibrada al nivel del usuario. ' +
        'La pregunta debe verificar comprensión REAL (no memorización). Responde SOLO en JSON.';
      const user =
        `NIVEL: ${difficulty?.label ?? 'intermedio'}\n` +
        `CASO: ${reto?.caso_practico?.enunciado ?? ''}\n` +
        `RESPUESTA: ${casoRespuesta || '(no respondió)'}\n\n` +
        'Devuelve: {"defensa":"tu repregunta aquí","pista":"una orientación sutil sin dar la respuesta"}';
      const raw = await callLLM([{ role: 'system', content: sys }, { role: 'user', content: user }], true, 2048);
      const out = parseJson(raw);
      return json({
        defensa: out?.defensa ?? 'Explica con tus palabras por qué tu enfoque es el correcto.',
        pista: out?.pista ?? undefined,
      });
    }

    return json({ error: 'Acción no válida. Usa: iniciar, defensa, evaluar.' }, 400);
  } catch (e) {
    return json({ error: 'Error inesperado en el Simulador Universal.', detail: String(e) }, 500);
  }
}));
