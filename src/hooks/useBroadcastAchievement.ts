// hooks/useBroadcastAchievement.ts
// ═══════════════════════════════════════════════════════════════════════
// BROADCAST ACHIEVEMENTS — Cuando haces algo, la red lo ve.
// "Dopamina social: alguien vio mi logro es más motivante que el logro."
// Cada acción significativa se anuncia automáticamente al canal broadcast.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { useRealtime } from '../store/RealtimeContext';
import { useApp } from '../store/AppContext';

export type AchievementType =
  | 'cv_uploaded'
  | 'skill_validated'
  | 'lesson_completed'
  | 'course_completed'
  | 'level_up'
  | 'service_published'
  | 'contract_completed'
  | 'streak'
  | 'connection'
  | 'challenge_completed';

const ACHIEVEMENT_TEMPLATES: Record<AchievementType, (name: string, detail?: string) => string> = {
  cv_uploaded: (name) => `${name} activó su Gemelo Digital`,
  skill_validated: (name, detail) => `${name} certificó ${detail ?? 'una habilidad'}`,
  lesson_completed: (name, detail) => `${name} completó una lección de ${detail ?? 'la Academia'}`,
  course_completed: (name, detail) => `${name} completó ${detail ?? 'un curso'}`,
  level_up: (name, detail) => `${name} ascendió a ${detail ?? 'un nuevo nivel'}`,
  service_published: (name, detail) => `${name} publicó: ${detail ?? 'un nuevo servicio'}`,
  contract_completed: (name) => `${name} completó un contrato exitosamente`,
  streak: (name, detail) => `${name} lleva ${detail ?? '?'} días seguidos`,
  connection: (name, detail) => `${name} se conectó con ${detail ?? 'alguien'}`,
  challenge_completed: (name) => `${name} completó su reto diario`,
};

/**
 * Hook para broadcast de logros públicos.
 * Llama a broadcastAchievement() cuando el usuario realiza una acción notable.
 */
export function useBroadcastAchievement() {
  const { broadcast } = useRealtime();
  const { profile } = useApp();

  const broadcastAchievement = useCallback((type: AchievementType, detail?: string) => {
    if (!profile) return;
    const name = profile.display_name || profile.username || 'Un nodo';
    const template = ACHIEVEMENT_TEMPLATES[type];
    if (!template) return;

    const text = template(name, detail);
    const kind = type === 'level_up' ? 'level' : 'action';
    broadcast(text, kind);
  }, [profile, broadcast]);

  return { broadcastAchievement };
}
