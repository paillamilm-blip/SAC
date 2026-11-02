// src/features/omicron/services/coach.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM · Motor de mejora en tiempo real (FASE 3)
//
// Lee los datos REALES del usuario (skills del CV, 4 ejes del Gemelo, PE,
// reputación, credenciales) y produce una RUTA priorizada de pasos
// concretos y accionables, con sinergia entre nodos:
//   Gemelo/CV → Academia → Habilidades → Bóveda → Empleos/Mercado.
//
// Es 100% determinista (sin depender de la IA/backend), así que SIEMPRE
// entrega un próximo paso útil. La IA (coach) se usa aparte como bonus.
// ═══════════════════════════════════════════════════════════════════════
import { C } from '@/theme';
import type { TabId, Profile, GemeloDigital } from '@/types';

// Re-export desde shared para que consumidores existentes no rompan.
export { levelInfo, nodeGuidance } from '@/shared/utils/guidance';

export interface NextStep {
  id: string;
  title: string;        // Imperativo corto: qué hacer
  why: string;          // El porqué, con tus números reales
  tab: TabId;           // A dónde te lleva
  actionLabel: string;  // Texto del botón
  accent: string;       // Color de acento
  metric?: string;      // Ej. "Ejecución 42"
  cv?: boolean;         // Si abre la convalidación de CV/credenciales
}

const r = (n: number) => Math.round(n);

/**
 * Calcula la ruta de mejora priorizada según los datos reales del usuario.
 * Devuelve los pasos ordenados por impacto (el primero es el más importante).
 *
 * `userColor` pinta el acento de los pasos que representan al PROPIO usuario
 * (subir CV, ejecución, postular, explorar). El componente consumidor pasa
 * el color elegido por el usuario (`getUserColor()` / `useUserColor()`); por
 * defecto usa el acento neutro de marca para no romper contextos sin color.
 * Los ejes con color semántico propio (Calidad, Trascendencia, Fundamento)
 * conservan su color de categoría.
 */
export function computeSteps(profile: Profile | null, gemelo: GemeloDigital | null, userColor: string = C.cyan): NextStep[] {
  const steps: (NextStep & { score: number })[] = [];
  const skills = profile?.skills ?? [];

  // 1) Sin CV / sin skills → base de todo. Máxima prioridad.
  if (skills.length === 0) {
    steps.push({
      id: 'cv', score: 100, tab: 'perfil', accent: userColor, cv: true, metric: 'Fundamento',
      title: 'Convalida tu CV real',
      actionLabel: 'Subir mi CV',
      why: 'Ómicrom todavía no conoce tu experiencia. Sube tu CV (PDF o Word) y calculo tu nivel, tus habilidades y tus 4 ejes al instante.',
    });
  }

  // 2) Eje más débil del Gemelo → paso concreto en el nodo correcto.
  if (gemelo) {
    const axes: { key: string; val: number; tab: TabId; accent: string; label: string; title: string; actionLabel: string; why: string; cv?: boolean }[] = [
      {
        key: 'execution', val: gemelo.execution, tab: 'maxskill', accent: userColor, label: 'Ejecución',
        title: 'Valida tu próximo nodo de habilidad',
        actionLabel: 'Ir a Habilidades',
        why: `Tu Ejecución está en ${r(gemelo.execution)}. Supera un reto en Habilidades para demostrar tu velocidad — cada nodo que validas abre el siguiente.`,
      },
      {
        key: 'quality', val: gemelo.quality, tab: 'academia', accent: C.purple, label: 'Calidad',
        title: 'Rinde un examen en Academia',
        actionLabel: 'Ir a Academia',
        why: `Tu Calidad está en ${r(gemelo.quality)}. Aprueba un curso y su examen para validar un nodo con evidencia real y subir tu calidad técnica.`,
      },
      {
        key: 'transcendence', val: gemelo.transcendence, tab: 'academia', accent: C.gold, label: 'Trascendencia',
        title: 'Cierra un ciclo de aprendizaje',
        actionLabel: 'Ir a Academia',
        why: `Tu Trascendencia está en ${r(gemelo.transcendence)}. Termina un curso y aprueba su examen: es el movimiento que deja evidencia en la red, no solo horas de lectura.`,
      },
      {
        key: 'foundation', val: gemelo.foundation, tab: 'perfil', accent: C.green, label: 'Fundamento', cv: true,
        title: 'Refuerza tu Fundamento',
        actionLabel: 'Convalidar credenciales',
        why: `Tu Fundamento está en ${r(gemelo.foundation)}. Convalida tu título y tus años de experiencia para reforzar tu base teórica.`,
      },
    ];
    axes.forEach((a) => steps.push({
      id: a.key, score: 90 - a.val * 0.7, tab: a.tab, accent: a.accent, cv: a.cv,
      metric: `${a.label} ${r(a.val)}`, title: a.title, actionLabel: a.actionLabel, why: a.why,
    }));
  }

  // 3) Credenciales verificadas bajas (el 20% que pondera la confianza).
  if (profile && profile.traditional_score < 40 && skills.length > 0) {
    steps.push({
      id: 'trad', score: 58, tab: 'perfil', accent: C.green, cv: true, metric: `Credenciales ${r(profile.traditional_score)}`,
      title: 'Convalida tus credenciales',
      actionLabel: 'Convalidar',
      why: `Tus credenciales verificadas están en ${r(profile.traditional_score)}/100. Convalida CV, título y años para subir el 20% que pondera tu confianza.`,
    });
  }

  // 4) Reputación ya alta: el siguiente salto es consolidar, no dispersionar.
  if (gemelo && gemelo.overallReputation >= 45 && skills.length > 0) {
    steps.push({
      id: 'mastery', score: 42, tab: 'maxskill', accent: userColor, metric: `Reputación ${r(gemelo.overallReputation)}`,
      title: 'Pon a prueba tu habilidad más fuerte',
      actionLabel: 'Ir a Habilidades',
      why: `Con reputación ${r(gemelo.overallReputation)} ya tienes nodos que sostienen tu perfil. Rinde el examen del nodo que mejor domines: un nodo probado pesa más que cinco declarados.`,
    });
  }

  steps.sort((a, b) => b.score - a.score);

  // Garantía: SIEMPRE al menos un paso de mejora
  if (steps.length === 0) {
    steps.push({
      id: 'explore', score: 10, tab: 'maxskill', accent: userColor,
      title: 'Explora tu siguiente nodo',
      actionLabel: 'Ir a Habilidades',
      why: 'Tu Gemelo Digital siempre puede mejorar. Valida una habilidad para subir tu Ejecución y desbloquear oportunidades.',
    });
  }

  return steps.map(({ score: _score, ...s }) => s);
}

/** El paso de mayor impacto (o null si no hay datos). */
export function topStep(profile: Profile | null, gemelo: GemeloDigital | null, userColor: string = C.cyan): NextStep | null {
  return computeSteps(profile, gemelo, userColor)[0] ?? null;
}
