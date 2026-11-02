// src/lib/dailyChallenge.ts
// ═══════════════════════════════════════════════════════════════════════
// MICRO-RETOS DIARIOS — "Tu desafío de hoy"
//
// Cada día, Ómicrom propone UN reto de 5 minutos basado en la brecha más
// débil del usuario. No es un curso largo — es una acción mínima con
// impacto medible que mueve los ejes realmente.
//
// 100% determinístico (sin IA) — funciona offline, 0 latencia.
// El reto se genera desde el perfil + fecha (mismo reto todo el día).
// ═══════════════════════════════════════════════════════════════════════

import type { GemeloDigital } from '@/types';
import type { IconRole } from '@/shared/components/icons';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  action: string;       // Lo que debe hacer
  duration: string;     // "5 min", "3 min"
  reward: {
    pe: number;
    axis: 'execution' | 'quality' | 'transcendence' | 'foundation';
    delta: number;      // cuánto sube el eje
  };
  icon: IconRole;
  targetTab?: string;   // A dónde llevarlo
}

// ── Catálogo de retos por eje ────────────────────────────────────────

// Cada reto tiene que aterrizar en una pantalla que EXISTE y que suma al
// aprendizaje. Antes, 7 de los 13 retos mandaban a Empleos, Bóveda, Red
// Social, Mercado o Gobernanza — superficies con 0 filas en la base.
const EXECUTION_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Cierra un ciclo de aprendizaje', description: 'Termina una lección de la Academia y aprueba su examen. Es el único movimiento que sube tu Gemelo y avisa a la red.', action: 'Ir a la Academia', duration: '5 min', reward: { pe: 8, axis: 'execution', delta: 3 }, icon: 'curso', targetTab: 'academia' },
  { title: 'Valida un nodo de habilidad', description: 'Elige una habilidad declarada de tu Gemelo y rinde su examen. Declarar no vale: solo la evidencia sube tu Ejecución.', action: 'Validar en Habilidades', duration: '5 min', reward: { pe: 10, axis: 'execution', delta: 3 }, icon: 'habilidades', targetTab: 'maxskill' },
  { title: 'Sube tu CV', description: 'Ómicrom lo analiza, detecta habilidades y actualiza tus ejes. Es el paso que activa tu Gemelo Digital.', action: 'Subir CV', duration: '3 min', reward: { pe: 5, axis: 'execution', delta: 2 }, icon: 'cv', targetTab: 'perfil' },
  { title: 'Sostén la racha', description: 'Un ciclo corto hoy alcanza: una lección leída y tu racha de días seguidos sigue creciendo.', action: 'Empezar hoy', duration: '3 min', reward: { pe: 3, axis: 'execution', delta: 1 }, icon: 'racha', targetTab: 'academia' },
];

const QUALITY_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Valida una habilidad', description: 'Rinde un examen rápido de tu habilidad principal. 3 preguntas + caso práctico.', action: 'Examen en Habilidades', duration: '5 min', reward: { pe: 10, axis: 'quality', delta: 3 }, icon: 'meta', targetTab: 'maxskill' },
  { title: 'Completa una lección', description: 'Toma una lección de la Academia y responde el examen.', action: 'Lección en Academia', duration: '5 min', reward: { pe: 5, axis: 'quality', delta: 2 }, icon: 'curso', targetTab: 'academia' },
  { title: 'Revisa tu CV', description: 'Si tu CV está desactualizado, vuelve a subirlo. Ómicrom re-analiza y actualiza tus ejes.', action: 'Re-subir CV', duration: '3 min', reward: { pe: 5, axis: 'quality', delta: 2 }, icon: 'cv', targetTab: 'perfil' },
];

const TRANSCENDENCE_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Aprueba el examen de un curso', description: 'Termina las lecciones del curso y aprueba su examen: el nodo queda validado con evidencia, no con palabras.', action: 'Aprobar el examen', duration: '5 min', reward: { pe: 12, axis: 'transcendence', delta: 4 }, icon: 'validar', targetTab: 'academia' },
  { title: 'Consolida tu habilidad más fuerte', description: 'Rinde el examen del nodo que mejor domines. Un nodo probado pesa más que cinco declarados.', action: 'Examen de nodo', duration: '5 min', reward: { pe: 5, axis: 'transcendence', delta: 2 }, icon: 'pionero', targetTab: 'maxskill' },
  { title: 'Comparte tu perfil', description: 'Envía tu Pasaporte Gemelo a alguien que pueda validarte.', action: 'Compartir Pasaporte', duration: '2 min', reward: { pe: 3, axis: 'transcendence', delta: 1 }, icon: 'compartir', targetTab: 'perfil' },
];

const FOUNDATION_CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Ataca tu eje más flojo', description: 'Entra a la Academia y elige la lección que mueva el eje que tienes abajo. Aprender con intención suma más que leer de paso.', action: 'Lección con propósito', duration: '5 min', reward: { pe: 8, axis: 'foundation', delta: 3 }, icon: 'cerebro', targetTab: 'academia' },
  { title: 'Actualiza tu perfil', description: 'Agrega un dato nuevo: ubicación, bio, o una credencial verificable.', action: 'Editar Perfil', duration: '2 min', reward: { pe: 3, axis: 'foundation', delta: 1 }, icon: 'editar', targetTab: 'perfil' },
  { title: 'Lee tu Gemelo y pregunta', description: 'Mira tus cuatro ejes y escríbele al Oráculo qué quieres subir primero. La respuesta te deja el siguiente paso listo.', action: 'Preguntar al Oráculo', duration: '3 min', reward: { pe: 3, axis: 'foundation', delta: 1 }, icon: 'gemelo', targetTab: 'perfil' },
];

const ALL_CHALLENGES: Record<string, Omit<DailyChallenge, 'id'>[]> = {
  execution: EXECUTION_CHALLENGES,
  quality: QUALITY_CHALLENGES,
  transcendence: TRANSCENDENCE_CHALLENGES,
  foundation: FOUNDATION_CHALLENGES,
};

// ── API pública ──────────────────────────────────────────────────────

/**
 * Genera el reto del día basado en el eje más débil del usuario.
 * Determinístico: misma fecha + mismo perfil = mismo reto (estable).
 */
export function getDailyChallenge(gemelo: GemeloDigital | null): DailyChallenge | null {
  if (!gemelo) return null;

  // Encontrar eje más débil
  const axes = {
    execution: gemelo.execution,
    quality: gemelo.quality,
    transcendence: gemelo.transcendence,
    foundation: gemelo.foundation,
  };
  const weakest = Object.entries(axes).sort((a, b) => a[1] - b[1])[0][0];

  // Seleccionar reto estable para hoy (basado en fecha)
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashCode(today + weakest);
  const pool = ALL_CHALLENGES[weakest] || EXECUTION_CHALLENGES;
  const index = Math.abs(seed) % pool.length;
  const challenge = pool[index];

  return {
    ...challenge,
    id: `${today}-${weakest}-${index}`,
  };
}

/**
 * ¿El usuario ya completó el reto de hoy?
 */
export function isChallengeCompleted(challengeId: string): boolean {
  return localStorage.getItem(`challenge_done_${challengeId}`) === '1';
}

/**
 * Marca el reto como completado.
 */
export function markChallengeCompleted(challengeId: string): void {
  localStorage.setItem(`challenge_done_${challengeId}`, '1');
}

// ── Helpers ──────────────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
