// theme/shadows.ts
// Layered shadows y glows para profundidad real

/**
 * Layered shadows — 2 capas para profundidad real.
 * Capa 1 (cercana): definición del borde
 * Capa 2 (lejana): profundidad ambiental
 */
export const SHADOW = {
  sm: '0 1px 2px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.2)',
  md: '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35)',
  lg: '0 2px 6px rgba(0,0,0,0.35), 0 16px 48px rgba(0,0,0,0.45)',
  xl: '0 4px 12px rgba(0,0,0,0.4), 0 24px 64px rgba(0,0,0,0.55)',
  glow: '0 0 16px rgba(160,174,192,0.25), 0 8px 24px rgba(0,0,0,0.3)',
  glowGold: '0 0 16px rgba(255,176,46,0.25), 0 8px 24px rgba(0,0,0,0.3)',
} as const;

/**
 * Elevación teñida: la sombra de un elemento cuyo color ES la marca (el color
 * personal del usuario, un tinte del tema). SHADOW es negro y no sirve acá.
 * La forma vivía escrita a mano en cuatro archivos, con dos geometrías casi
 * iguales (0 8px 28px y 0 10px 28px).
 */
export const ELEVATED = {
  cta: (color: string): string => `0 8px 24px ${color}`,
} as const;

export const GLOW = {
  cyan: '0 0 18px rgba(160,174,192,0.45)',
  gold: '0 0 18px rgba(255,176,46,0.42)',
  purple: '0 0 18px rgba(94,92,230,0.45)',
  green: '0 0 18px rgba(63,208,201,0.42)',
  red: '0 0 18px rgba(255,92,122,0.42)',
  toast: '0 10px 40px rgba(94,92,230,0.4)',
} as const;
