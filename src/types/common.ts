// types/common.ts
// Tipos compartidos fundamentales (auth, navegación, utilidades)

import type { Profile } from './profile';

// ===== AUTHENTICATION =====
// 'error_transitorio' = la sesión es válida pero NO se pudo leer el perfil (red caída o servidor con problemas).
// No es lo mismo que 'no_access' (el servidor respondió y la persona no tiene perfil o acceso): aquel es un veto,
// éste es recuperable con «Reintentar».
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'no_access' | 'error_transitorio';

// ===== TAB NAVIGATION =====
// El recorte (Fase 5) deja UN solo camino: Gemelo → Academia → Habilidades.
// Empleos, Mercado, Bóveda, Red Social, Billetera, Contratos y Gobernanza
// salieron de la navegación: tienen 0 filas de usuarios reales.
export type TabId = 'perfil' | 'academia' | 'maxskill';

// ===== APP STATE (Context) =====
export interface AppState {
  // === AUTH ===
  authStatus: AuthStatus;
  isLoadingProfile: boolean;

  // === PROFILE ===
  profile: Profile | null;

  // === NAVIGATION ===
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // === ACTIONS ===
  refreshProfile: () => Promise<void>;
  /** Vuelve a leer el perfil tras un 'error_transitorio'. */
  reintentarPerfil: () => Promise<void>;
}

// ===== UTILIDADES =====
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ReputationUpdateInput {
  user_id: string;
  execution_delta?: number;
  quality_delta?: number;
  transcendence_delta?: number;
  foundation_delta?: number;
  reason: string;
  trigger_event_id?: string;
}
