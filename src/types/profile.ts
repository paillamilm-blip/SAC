// types/profile.ts
// Profile, Gemelo Digital, Reputation

// ===== PROFILE & REPUTATION =====
export type NodeLevel = 1 | 2 | 3;
export type NodeStatus = 'ACTIVE' | 'SUSPENDED' | 'DEGRADED';
// ✅ Taxonomía oficial unificada (fuente única en src/config/nodes.ts)
export type NodeType = 'Nodo Operativo' | 'Nodo Core' | 'Nodo Arquitecto' | 'Nodo Fundador';

export interface Profile {
  id: string;
  email?: string;
  username: string;
  full_name: string;
  display_name?: string;   // ✅ nombre para mostrar (opcional; cae a full_name)
  user_color?: string;     // ID del color elegido para el Gemelo: 'ice' | 'pink' | 'gold' | 'lime'
  avatar_url?: string;
  bio?: string;
  location?: string;       // ✅ añadido: ubicación del nodo
  skills?: string[];       // ✅ añadido: habilidades declaradas
  cv_summary?: string;             // resumen de 2 párrafos del último CV analizado (IA o heurística)
  cv_years_experience?: number;    // años de experiencia detectados en el último CV analizado
  skills_detail?: { name: string; pct: number }[]; // skills con % de dominio estimado

  // === ONBOARDING (estimación inicial, sincronizada entre dispositivos) ===
  onboarding_profession?: string;    // profesión estimada en el onboarding (texto de presentación)
  onboarding_senior_label?: string;  // etiqueta de seniority estimada (texto de presentación)
  onboarding_completed_at?: string;  // momento en que se completó el onboarding; marca de "ya hecho"

  // === TOKENS Y WALLET ===
  token_balance: number;
  token_escrow?: number;   // ✅ añadido: tokens bloqueados en escrow

  // === PUNTOS DE EXPERIENCIA ===
  pe_points: number;

  /** Racha canónica server-side (migración 10004). La mantiene
   *  register_daily_activity; el cliente solo la lee. */
  streak_days?: number;

  // === REPUTACIÓN (0-100) ===
  reputation_score: number;
  reputation_updated_at: string;

  // === GEMELO DIGITAL: 4 EJES (0-100) ===
  execution_score: number;         // Rapidez
  quality_score: number;           // Calidad técnica
  transcendence_score: number;     // Compartición conocimiento
  foundation_score: number;        // Fundamento teórico

  // === PONDERACIÓN 80/20 (ver docs/legado/DEFINICION_REPUTACION_OMICROM.md) ===
  traditional_score: number;       // 20% — credenciales verificadas (títulos, portafolio)
  experience_score: number;        // 80% — DERIVADO: promedio de los 4 ejes (servidor)

  // === SISTEMA DE NODOS ===
  node_level: NodeLevel;
  node_status: NodeStatus;
  node_type: NodeType;
  is_pioneer: boolean;
  /** Fecha de alta real (migración 0082). Mide la antigüedad para el piso ganado. */
  member_since?: string | null;
  /** Día en que ganó el 0.5 % permanente. null = todavía no lo ganó. */
  commission_floor_locked_at?: string | null;
  last_audit_date?: string;

  // === FLAGS ===
  is_verified_professional: boolean;
  can_receive_contracts: boolean;
  is_premium?: boolean;             // Ómicrom Premium: desbloquea las funciones de IA

  // === CONTADORES ===
  total_contracts_completed: number;
  total_earnings: number;

  created_at: string;
  updated_at: string;
}

// === GEMELO DIGITAL (Radar Chart Data) ===
export interface GemeloDigital {
  execution: number;
  quality: number;
  transcendence: number;
  foundation: number;
  overallReputation: number;
}

// === REPUTACIÓN HISTORY ===
export interface ReputationHistoryEntry {
  id: string;
  user_id: string;
  old_reputation: number;
  new_reputation: number;
  old_execution_score: number;
  new_execution_score: number;
  old_quality_score: number;
  new_quality_score: number;
  old_transcendence_score: number;
  new_transcendence_score: number;
  old_foundation_score: number;
  new_foundation_score: number;
  reason: string;
  trigger_event_id?: string;
  created_at: string;
}
