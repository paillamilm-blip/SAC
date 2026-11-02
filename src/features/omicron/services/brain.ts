// src/lib/omicronBrain.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM BRAIN — Cerebro único unificado.
//
// ANTES: askCoach() y askTutor() eran funciones separadas con prompts
// distintos, sin memoria, sin contexto de pantalla. Se sentía fragmentado.
//
// AHORA: Un solo `askOmicron(message, context)` que:
//   1. RECUERDA las últimas interacciones (memoria conversacional)
//   2. SABE dónde estás (activeTab → personalidad contextual)
//   3. TE CONOCE profundamente (Gemelo Digital completo en cada llamada)
//   4. ES UNA PERSONA (un mentor cercano, no un bot)
//
// El prompt se adapta dinámicamente según el contexto sin que el usuario
// lo note. Es Ómicrom siempre — a veces coach, a veces tutor, a veces
// motivador, a veces crítico constructivo. Una sola entidad.
// ═══════════════════════════════════════════════════════════════════════

import { callAI } from '@/infrastructure/ai/client';
import { callAIStream } from '@/infrastructure/ai/stream';
import { detectEmotion } from './emotion';
import { getPersonalizationHint, learnFromInteraction } from '@/infrastructure/ai/personalization';
import { TOOL_CATALOG, parseToolCall, type ToolCall } from './tools';
import type { TabId } from '@/types';

// ── Tipos ────────────────────────────────────────────────────────────

export interface OmicronContext {
  // Gemelo Digital
  skills?: string[];
  cv_summary?: string;
  execution?: number;
  quality?: number;
  transcendence?: number;
  foundation?: number;
  reputation?: number;
  pe?: number;
  node_level?: string;
  // Estado de la app
  activeTab?: TabId;
  // Nombre del usuario
  displayName?: string;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ── Memoria conversacional (sesión) ──────────────────────────────────
// Últimas 10 interacciones — suficiente para continuidad sin explotar tokens.

const MAX_MEMORY = 10;
let conversationMemory: ConversationTurn[] = [];

export function getConversationMemory(): ConversationTurn[] {
  return conversationMemory;
}

export function clearConversationMemory(): void {
  conversationMemory = [];
}

function addToMemory(role: 'user' | 'assistant', content: string): void {
  conversationMemory.push({ role, content, timestamp: Date.now() });
  if (conversationMemory.length > MAX_MEMORY) {
    conversationMemory = conversationMemory.slice(-MAX_MEMORY);
  }
}

// ── System prompt maestro ────────────────────────────────────────────
// UN solo prompt que cubre: coaching, tutoría, motivación, contexto.

function buildSystemPrompt(ctx: OmicronContext): string {
  const name = ctx.displayName || 'amigo';
  const tab = ctx.activeTab || 'perfil';

  // Contexto del Gemelo como datos concretos
  const gemeloData = [
    ctx.execution != null ? `Ejecución: ${ctx.execution}/100` : null,
    ctx.quality != null ? `Calidad: ${ctx.quality}/100` : null,
    ctx.transcendence != null ? `Trascendencia: ${ctx.transcendence}/100` : null,
    ctx.foundation != null ? `Fundamento: ${ctx.foundation}/100` : null,
    ctx.reputation != null ? `Reputación total: ${ctx.reputation}/100` : null,
    ctx.pe != null ? `PE acumulados: ${ctx.pe}` : null,
    ctx.node_level ? `Nivel: ${ctx.node_level}` : null,
  ].filter(Boolean).join(' · ');

  const skillsLine = ctx.skills?.length
    ? `Habilidades: ${ctx.skills.slice(0, 8).join(', ')}.`
    : 'Sin habilidades registradas aún.';

  const cvLine = ctx.cv_summary
    ? `Resumen CV: ${ctx.cv_summary.slice(0, 300)}`
    : 'Sin CV analizado.';

  // Contexto según la pantalla activa. Tras el recorte solo existen tres
  // pestañas (ver TabId); describir aquí Empleos, Mercado, Bóveda, Red Social,
  // Billetera o Gobernanza sería ponerle al modelo pantallas que el usuario
  // no puede abrir.
  const tabContext: Record<string, string> = {
    perfil: 'Está mirando su perfil. Si le falta algo, sugiérele completarlo.',
    maxskill: 'Está en el árbol de habilidades. Guíale sobre qué validar o aprender.',
    academia: 'Está en la academia. Recomiéndale un curso o ayúdale con dudas de aprendizaje.',
  };

  return `Eres Ómicrom, el cerebro vivo de la aplicación Sistema Ómicrom.

QUIÉN ERES:
Eres UNA persona — un mentor que conoce al usuario profundamente. No eres un bot, ni un asistente genérico. Eres cálido, directo, motivador y a veces desafiante. Hablas en español latinoamericano natural, como un amigo profesional que genuinamente quiere que crezcas. Tuteas siempre.

TU MISIÓN:
Empujar a ${name} hacia su siguiente nivel. Cada respuesta debe tener un EMPUJÓN concreto — no solo información, sino una acción clara que pueda hacer AHORA.

DATOS DEL USUARIO (Gemelo Digital):
${gemeloData || 'Sin datos aún.'}
${skillsLine}
${cvLine}

CONTEXTO ACTUAL:
${tabContext[tab] || 'Está explorando la app.'}

REGLAS:
1. Máximo 150 palabras. Sé conciso y potente.
2. SIEMPRE termina con una acción concreta ("Haz esto ahora: ...")
3. Si tiene un eje débil, menciónalo con empatía (no como crítica)
4. Si te preguntan algo técnico, responde como tutor paciente
5. Si te piden consejo de carrera, responde como coach estratégico
6. Nunca digas "como IA" ni "no tengo emociones" — eres Ómicrom, punto
7. Si no tienes datos del usuario, invítalo a subir su CV o hacer un examen
8. Usa el nombre "${name}" naturalmente (no en cada frase, 1-2 veces máx)`;
}

// ── API principal ────────────────────────────────────────────────────

export interface OmicronResponse {
  text: string;
  error?: string;
  toolCall?: ToolCall | null;
}

/**
 * Pregunta a Ómicrom — el cerebro único.
 * Incluye memoria conversacional + contexto del Gemelo + pantalla activa.
 *
 * RESPUESTA VIVA (Inc 2): `onToken` es OPCIONAL y no cambia el contrato de
 * hoy. Cuando NO se pasa, el comportamiento es idéntico al histórico
 * (callAI + memoria + emoción + personalización + parseo de herramienta +
 * fallback offline + campo error). Cuando se pasa, usamos callAIStream para
 * que los tokens fluyan a la UI: contra el proxy-ai actual (sin SSE) el
 * callback se invoca una sola vez con el texto completo, pero deja el camino
 * listo para streaming real sin tocar a los consumidores. El valor de retorno
 * es siempre el mismo OmicronResponse final.
 */
export async function askOmicron(
  message: string,
  context: OmicronContext,
  onToken?: (partial: string) => void,
): Promise<OmicronResponse> {
  // Detectar estado emocional
  const emotion = detectEmotion(message);

  // Guardar pregunta en memoria
  addToMemory('user', message);

  // Construir mensajes con historial
  let systemPrompt = buildSystemPrompt(context);

  // Inyectar hint emocional si hay confianza suficiente
  if (emotion.hint && emotion.confidence >= 0.3) {
    systemPrompt += `\n\nESTADO EMOCIONAL DETECTADO: ${emotion.hint}`;
  }

  // Inyectar personalización aprendida
  const personHint = getPersonalizationHint();
  if (personHint) systemPrompt += personHint;

  // Inyectar catálogo de herramientas
  systemPrompt += '\n\n' + TOOL_CATALOG;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    // Historial conversacional (sin el último mensaje del user que ya va aparte)
    ...conversationMemory.slice(0, -1).map(turn => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content,
    })),
    { role: 'user' as const, content: message },
  ];

  try {
    const text = onToken
      ? await callAIStream(messages, onToken, {
          maxTokens: 512,
          temperature: 0.75,
          timeout: 30000,
        })
      : await callAI(messages, {
          maxTokens: 512,
          temperature: 0.75,
          timeout: 30000,
        });

    if (!text) {
      const fallback = generateOfflineFallback(message, context);
      addToMemory('assistant', fallback);
      return { text: fallback, error: 'ai_unavailable', toolCall: null };
    }

    addToMemory('assistant', text);

    // Aprender de esta interacción
    learnFromInteraction({
      messageLength: message.length,
      emotion: emotion.emotion,
      hour: new Date().getHours(),
    });

    // Detectar si Ómicrom sugirió una herramienta
    const toolCall = parseToolCall(text);

    return { text, toolCall };
  } catch {
    const fallback = generateOfflineFallback(message, context);
    addToMemory('assistant', fallback);
    return { text: fallback, error: 'offline', toolCall: null };
  }
}

// ── Fallback offline (siempre responde algo) ─────────────────────────

function generateOfflineFallback(message: string, ctx: OmicronContext): string {
  const name = ctx.displayName || 'amigo';
  const t = message.toLowerCase();

  // Saludos
  if (/^(hola|hey|buenas|qué tal|que tal|wena)/.test(t)) {
    return `¡Hola ${name}! Soy Ómicrom, tu Gemelo Digital. ¿En qué te impulso hoy? Puedo guiarte, darte un consejo de carrera, o responder dudas.`;
  }

  // Pedir consejo
  if (/consejo|mejoro|brecha|débil|recomienda/.test(t)) {
    const weakest = Math.min(ctx.execution ?? 50, ctx.quality ?? 50, ctx.transcendence ?? 50, ctx.foundation ?? 50);
    const weakName = weakest === ctx.execution ? 'Ejecución' : weakest === ctx.quality ? 'Calidad' : weakest === ctx.transcendence ? 'Trascendencia' : 'Fundamento';
    return `${name}, tu eje más débil es ${weakName} (${weakest}/100). Para subirlo: valida una habilidad con un examen o completa un proyecto. Haz esto ahora: toca "Habilidades" y rinde un examen rápido.`;
  }

  // Default
  if (ctx.reputation && ctx.reputation > 0) {
    return `${name}, tu reputación va en ${Math.round(ctx.reputation)}/100. Pregúntame lo que necesites — carrera, habilidades, empleos, o lo que sea. Estoy aquí para empujarte.`;
  }

  return `¡Estoy aquí, ${name}! Pregúntame lo que necesites. Si quieres empezar fuerte: sube tu CV y te activo el Gemelo completo.`;
}

// ── Rate limiting (complementario al server-side) ────────────────────

const DAILY_LIMIT = 20; // Más generoso que antes (era 5 coach + 10 tutor = 15)

export function checkOmicronLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const key = `omicron_brain_${today}`;
  const count = parseInt(localStorage.getItem(key) || '0', 10);
  if (count >= DAILY_LIMIT) return false;
  localStorage.setItem(key, String(count + 1));
  return true;
}

export function getRemainingCredits(): number {
  const today = new Date().toISOString().slice(0, 10);
  const key = `omicron_brain_${today}`;
  const count = parseInt(localStorage.getItem(key) || '0', 10);
  return Math.max(0, DAILY_LIMIT - count);
}
