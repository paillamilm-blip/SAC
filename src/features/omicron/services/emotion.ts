// src/lib/emotionDetector.ts
// ═══════════════════════════════════════════════════════════════════════
// DETECTOR DE ESTADO EMOCIONAL — Analiza el input del usuario para
// adaptar el tono de Ómicrom en tiempo real.
//
// NO usa IA — es heurístico puro (0 latencia, 0 tokens, funciona offline).
// Señales: longitud, puntuación, mayúsculas, errores, velocidad, emojis.
// ═══════════════════════════════════════════════════════════════════════

export type Emotion = 'neutral' | 'frustrated' | 'motivated' | 'confused' | 'rushed' | 'excited';

export interface EmotionSignal {
  emotion: Emotion;
  confidence: number; // 0-1
  hint: string;       // Instrucción para el system prompt
}

// Tracking de velocidad de escritura (entre mensajes)
let lastMessageTime = 0;
let messageCount = 0;

/**
 * Detecta el estado emocional del usuario basado en su input.
 * Retorna la emoción dominante + hint para el prompt de Ómicrom.
 */
export function detectEmotion(text: string): EmotionSignal {
  const t = text.trim();
  if (!t) return { emotion: 'neutral', confidence: 0, hint: '' };

  const now = Date.now();
  const timeSinceLast = lastMessageTime ? now - lastMessageTime : 5000;
  lastMessageTime = now;
  messageCount++;

  const scores: Record<Emotion, number> = {
    neutral: 0.3,
    frustrated: 0,
    motivated: 0,
    confused: 0,
    rushed: 0,
    excited: 0,
  };

  // ── Señal: longitud del mensaje ────────────────────────────────────
  if (t.length < 10) scores.rushed += 0.4;      // Mensaje ultra corto = apurado
  if (t.length > 200) scores.confused += 0.2;   // Mensaje largo = necesita explicarse

  // ── Señal: signos de puntuación ────────────────────────────────────
  const exclamations = (t.match(/!/g) || []).length;
  const questions = (t.match(/\?/g) || []).length;
  if (exclamations >= 2) scores.excited += 0.4;
  if (exclamations >= 3) scores.frustrated += 0.3;
  if (questions >= 2) scores.confused += 0.4;

  // ── Señal: mayúsculas excesivas ────────────────────────────────────
  const upperRatio = (t.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length / Math.max(t.length, 1);
  if (upperRatio > 0.5 && t.length > 5) scores.frustrated += 0.5;

  // ── Señal: palabras emocionales ────────────────────────────────────
  const lower = t.toLowerCase();
  // Frustración
  if (/no funciona|no puedo|no entiendo|no sirve|ayuda|help|error|bug|roto|mierda|puta|ctm/.test(lower)) scores.frustrated += 0.5;
  if (/odio|horrible|imposible|cansado|harto|frustrad/.test(lower)) scores.frustrated += 0.4;
  // Motivación/Emoción
  if (/genial|increíble|increible|excelente|perfecto|vamos|dale|si!|lo logré|logre/.test(lower)) scores.motivated += 0.5;
  if (/gracias|crack|capo|eres el mejor|te amo|wow/.test(lower)) scores.excited += 0.4;
  // Confusión
  if (/no entiendo|cómo|como se|qué es|que es|por qué|por que|explica|no sé|no se/.test(lower)) scores.confused += 0.4;
  // Prisa
  if (/rápido|rapido|urgente|ya|ahora|apúrate|apurate|pronto/.test(lower)) scores.rushed += 0.4;

  // ── Señal: velocidad entre mensajes ────────────────────────────────
  if (timeSinceLast < 2000 && messageCount > 2) scores.rushed += 0.3;  // Mensajes rápidos seguidos
  if (timeSinceLast < 1000) scores.frustrated += 0.2;                   // Muy rápido = frustrado

  // ── Señal: emojis ─────────────────────────────────────────────────
  // Excepción L3 documentada: estos emojis son ENTRADA del usuario (lo que
  // tipeó), nunca SALIDA de la app. Acá leerlos es el objetivo — no los borres.
  if (/😊|🎉|🚀|💪|✨|🔥|❤️/.test(t)) scores.motivated += 0.3;
  if (/😢|😤|😡|💀|😭|🤬/.test(t)) scores.frustrated += 0.4;
  if (/🤔|❓|🫤/.test(t)) scores.confused += 0.3;

  // ── Determinar emoción dominante ───────────────────────────────────
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [emotion, confidence] = sorted[0] as [Emotion, number];

  // ── Generar hint para el prompt ────────────────────────────────────
  const hints: Record<Emotion, string> = {
    neutral: '',
    frustrated: 'El usuario parece frustrado. Sé empático, directo y práctico. No des vueltas — ve al grano con la solución.',
    motivated: 'El usuario está motivado. Desafíale, sube la vara, proponle algo ambicioso. Aprovecha este momentum.',
    confused: 'El usuario parece confundido. Explica paso a paso, usa un ejemplo concreto. No asumas que sabe — guíale.',
    rushed: 'El usuario tiene prisa. Responde ULTRA conciso (2-3 oraciones máximo). Solo lo esencial, acción directa.',
    excited: 'El usuario está emocionado. Comparte su energía, celebra con él, y canalízala hacia la siguiente meta.',
  };

  return {
    emotion,
    confidence: Math.min(1, confidence),
    hint: hints[emotion],
  };
}

/** Reset del tracker (nueva sesión) */
export function resetEmotionTracker(): void {
  lastMessageTime = 0;
  messageCount = 0;
}
