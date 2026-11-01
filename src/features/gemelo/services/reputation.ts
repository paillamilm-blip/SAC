// features/gemelo/services/reputation.ts
// Lógica centralizada para cálculos de reputación y Gemelo Digital

import { supabase } from '@/infrastructure/supabase/client';
import type { Profile, GemeloDigital } from '@/types';
import type { IconRole } from '@/shared/components/icons';

/**
 * Calcula el Gemelo Digital a partir del perfil.
 * Retorna un objeto con los 4 ejes y la reputación general.
 */
export function calculateGemeloDigital(profile: Profile): GemeloDigital {
  return {
    execution:        clamp(profile.execution_score),
    quality:          clamp(profile.quality_score),
    transcendence:    clamp(profile.transcendence_score),
    foundation:       clamp(profile.foundation_score),
    overallReputation: clamp(profile.reputation_score),
  };
}

/**
 * Calcula la reputación total basado en la regla 80/20 (modelo canónico).
 * Ver DEFINICION_REPUTACION_OMICROM.md.
 * 20% = historial tradicional (títulos, portafolio → traditional_score)
 * 80% = experiencia demostrada (experience_score = PROMEDIO de los 4 ejes)
 *
 * IMPORTANTE: `experience` debe ser el promedio de los 4 ejes
 * (ejecución, calidad, trascendencia, fundamento), no un acumulador de PE.
 */
export function calculateFinalReputation(
  traditional: number,
  experience: number
): number {
  return clamp(traditional * 0.2 + experience * 0.8);
}

/**
 * Promedia los 4 ejes del Gemelo Digital.
 */
export function calculateGemeloAverage(gemelo: GemeloDigital): number {
  return (gemelo.execution + gemelo.quality + gemelo.transcendence + gemelo.foundation) / 4;
}

/**
 * MOMENTUM POR PE — "lo que puedes conseguir".
 * Bono de reputación por Puntos de Experiencia acumulados: acotado a +15,
 * con rendimientos decrecientes (sqrt). Premia el aprendizaje y el potencial
 * sin permitir inflar la reputación sin límite. Ver DEFINICION_REPUTACION_OMICROM.md.
 */
export function calculatePEMomentum(pePoints: number): number {
  const pe = Math.max(pePoints ?? 0, 0);
  return Math.min(15, Math.sqrt(pe) / 4);
}

/**
 * REPUTACIÓN TOTAL UNIFICADA (modelo canónico, igual que el trigger SQL).
 *   base     = 0.20·tradicional + 0.80·experiencia (promedio de 4 ejes)
 *   momentum = bono acotado por PE
 *   total    = clamp(base + momentum)
 */
export function calculateTotalReputation(
  traditional: number,
  experience: number,
  pePoints: number
): number {
  return clamp(traditional * 0.2 + experience * 0.8 + calculatePEMomentum(pePoints));
}


/**
 * Determina el Node Level basado en reputación.
 * N1: 0-49, N2: 50-79, N3: 80-100
 */
export function determineNodeLevel(reputationScore: number): 1 | 2 | 3 {
  if (reputationScore >= 80) return 3;
  if (reputationScore >= 50) return 2;
  return 1;
}

/**
 * Obtiene el color según reputación.
 */
export function getReputationColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Calcula PE requeridos para siguiente nivel.
 * N1→N2: 1000 PE, N2→N3: 2500 PE adicionales
 */
export function calculatePEThreshold(currentLevel: number): number {
  if (currentLevel === 1) return 1000;
  if (currentLevel === 2) return 2500;
  return 9999;
}


// NOTA: La reputación es SOLO-LECTURA en el cliente. Los 4 ejes y la
// reputación se calculan SERVER-SIDE (triggers 0015–0018 + 0050); el trigger
// `protect_profile_columns` REVIERTE cualquier escritura del cliente a esas
// columnas. Por eso NO existe aquí ninguna función que escriba *_score /
// reputation_score en `profiles`. Para mover ejes reales, dispara el evento
// correspondiente (contrato, examen, calificación, nodo) que ejecuta el
// trigger server-side. El cliente solo LEE la reputación ya calculada.

/**
 * OBTENER HISTORIAL DE REPUTACIÓN.
 */
export async function getReputationHistory(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('reputation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reputation history:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Error in getReputationHistory:', err);
    return [];
  }
}

/**
 * Determina si la caída de reputación amerita una auditoría automática.
 */
export function shouldTriggerAudit(
  previousReputation: number,
  currentReputation: number,
  threshold = 15
): boolean {
  return previousReputation - currentReputation >= threshold;
}

/**
 * CALCULAR MATCH SCORE para empleos ("el trabajo te busca").
 *
 * Modelo canónico unificado: base (20/80) + momentum por PE + skill overlap.
 * experience_score = promedio de los 4 ejes. Si se pasan jobSkills, se bonifica
 * hasta +15 puntos por coincidencia de habilidades (skill overlap).
 * Ver DEFINICION_REPUTACION_OMICROM.md §7.
 */
export function calculateMatchScore(profile: Profile, jobSkills?: string[]): number {
  const base = calculateTotalReputation(
    profile.traditional_score,
    profile.experience_score,
    profile.pe_points,
  );

  // Skill overlap: bonifica hasta +15 puntos según % de coincidencia
  if (!jobSkills || jobSkills.length === 0 || !profile.skills || profile.skills.length === 0) {
    return base;
  }
  const profileSkillsLower = profile.skills.map(s => s.toLowerCase());
  const matched = jobSkills.filter(js => profileSkillsLower.includes(js.toLowerCase()));
  const overlapRatio = matched.length / jobSkills.length; // 0..1
  const skillBonus = overlapRatio * 15; // max +15

  return clamp(base + skillBonus);
}


/**
 * BADGE según reputación.
 *
 * `color` es un nombre de banda (no un hex) porque el único consumidor que
 * pinta el borde lo traduce con su propia tabla; `icon` es un rol dibujado por
 * shared/components/icons.tsx. Antes venía un emoji, que se pinta con la
 * paleta del sistema operativo del visitante.
 */
export function getReputationBadge(score: number): {
  label: string;
  color: string;
  icon: IconRole;
} {
  if (score >= 90) return { label: 'Elite',       color: 'gold',    icon: 'elite' };
  if (score >= 80) return { label: 'Senior',      color: 'emerald', icon: 'senior' };
  if (score >= 70) return { label: 'Avanzado',    color: 'blue',    icon: 'avanzado' };
  if (score >= 50) return { label: 'Intermedio',  color: 'amber',   icon: 'intermedio' };
  return               { label: 'Novato',       color: 'slate',   icon: 'novato' };
}

/**
 * Formatea un score para display (1 decimal).
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}


/**
 * PROGRESO HACIA SIGUIENTE NIVEL.
 */
export function calculateProgressToNextLevel(
  currentLevel: number,
  currentPE: number
): {
  currentLevelPE: number;
  nextLevelPE: number;
  progressPercentage: number;
} {
  const thresholds: Record<number, number> = { 1: 0, 2: 1000, 3: 3500 };

  const currentThreshold = thresholds[currentLevel] ?? 0;
  const nextThreshold    = thresholds[currentLevel + 1] ?? 9999;

  const progress            = currentPE - currentThreshold;
  const needed              = nextThreshold - currentThreshold;
  const progressPercentage  = Math.min(100, (progress / needed) * 100);

  return { currentLevelPE: progress, nextLevelPE: needed, progressPercentage };
}


// ===== SIMULACIONES (para testing/preview sin tocar la BD) =====

/**
 * Simula el recálculo de reputación tras cambios en los ejes (modelo canónico):
 *   experience_score = promedio de los 4 ejes
 *   reputation_score = clamp( 0.20·tradicional + 0.80·experiencia + momentum(PE) )
 * Espeja exactamente al trigger SQL.
 */
export function simulateReputationUpdate(
  profile: Profile,
  deltas: {
    execution?: number;
    quality?: number;
    transcendence?: number;
    foundation?: number;
  }
): Profile {
  const newExecution     = clamp(profile.execution_score     + (deltas.execution     ?? 0));
  const newQuality       = clamp(profile.quality_score       + (deltas.quality       ?? 0));
  const newTranscendence = clamp(profile.transcendence_score + (deltas.transcendence ?? 0));
  const newFoundation    = clamp(profile.foundation_score    + (deltas.foundation    ?? 0));

  const newExperience = (newExecution + newQuality + newTranscendence + newFoundation) / 4;

  return {
    ...profile,
    execution_score:     newExecution,
    quality_score:       newQuality,
    transcendence_score: newTranscendence,
    foundation_score:    newFoundation,
    experience_score:    newExperience,
    reputation_score: calculateTotalReputation(
      profile.traditional_score,
      newExperience,
      profile.pe_points,
    ),
  };
}

// ===== UTILIDADES INTERNAS =====

/** Asegura que un número esté en el rango [0, 100]. */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
