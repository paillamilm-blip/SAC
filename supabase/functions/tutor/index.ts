// supabase/functions/tutor/index.ts — Tutor IA de Ómicrom (OpenRouter).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { callLLM, hasKey } from '../_shared/llm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = createClient(SUPABASE_URL, SERVICE_KEY);

import { corsHeaders, withCors } from '../_shared/cors.ts';
const CORS = corsHeaders();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface Turn { role: 'user' | 'model'; text: string }

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) {
      return json({ error: 'El Tutor IA no está configurado (falta OPENROUTER_KEY).' }, 500);
    }
    const rl = await checkRateLimit(_admin, 'tutor', clientIp(req), 20, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const question: string = (body?.question ?? '').toString().trim();
    const lessonTitle: string = (body?.lessonTitle ?? '').toString();
    const lessonContent: string = (body?.lessonContent ?? '').toString();
    const history: Turn[] = Array.isArray(body?.history) ? body.history : [];
    const userSkills: string[] = Array.isArray(body?.skills) ? body.skills : [];
    const cvSummary: string = (body?.cv_summary ?? '').toString().trim();

    if (!question) {
      return json({ error: 'Escribe una pregunta para el Tutor.' }, 400);
    }

    const skillCtx = userSkills.length ? `\nSKILLS DEL ESTUDIANTE: ${userSkills.join(', ')}.` : '';
    const cvCtx = cvSummary ? `\nRESUMEN CV: ${cvSummary}` : '';

    const sys =
      'Eres el "Tutor IA" de Ómicrom, un tutor cercano y paciente para estudiantes y técnicos de ingeniería. ' +
      'El estudiante está leyendo una lección y te hará dudas sobre ella. ' +
      'Apóyate SIEMPRE en el contenido de la lección que te paso abajo; si la pregunta se sale del tema, ' +
      'respóndela igual de forma breve pero invita a volver a la lección. ' +
      'Adapta tus ejemplos al nivel y experiencia del estudiante según sus habilidades y CV. ' +
      'Explica simple, en español neutro-chileno, con ejemplos concretos y, cuando ayude, pasos numerados. ' +
      'Sé breve (máx ~160 palabras). No inventes datos; si no sabes, dilo con honestidad.\n\n' +
      `LECCIÓN: "${lessonTitle}"\n` +
      `CONTENIDO DE LA LECCIÓN:\n${lessonContent}` +
      skillCtx + cvCtx;

    // Build messages from history + new question
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: sys },
      ...history
        .filter(t => t && (t.role === 'user' || t.role === 'model') && typeof t.text === 'string')
        .slice(-10)
        .map(t => ({ role: (t.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant', content: t.text })),
      { role: 'user', content: question },
    ];

    const answer = await callLLM(messages);
    return json({ answer: answer || 'No pude generar una respuesta. Intenta reformular tu duda.' });
  } catch (e) {
    return json({ error: 'Error inesperado en el Tutor IA.', detail: String(e) }, 500);
  }
}));
