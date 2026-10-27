// theme/tokens.ts
// Sistema Ómicrom — Design Tokens: Colores y estados
//
// Identidad: negro-azulado premium (tipo Apple) + paleta silver-ice/indigo/teal + ámbar.
//   cyan  → SILVER ICE #a0aec0 (héroe plateado)
//   purple→ INDIGO #5e5ce6  (tiers / destacados)
//   green → TEAL  #3fd0c9   (estado OK / economía)
//   gold  → ÁMBAR #ffb02e   (acento cálido)

export const C = {
  cyan:         '#a0aec0',
  cyanDim:      'rgba(160,174,192,0.46)',
  cyanFaint:    'rgba(160,174,192,0.16)',
  cyanGhost:    'rgba(160,174,192,0.08)',
  gold:         '#ffb02e',
  goldDim:      'rgba(255,176,46,0.46)',
  goldFaint:    'rgba(255,176,46,0.14)',
  purple:       '#5e5ce6',
  purpleDim:    'rgba(94,92,230,0.44)',
  purpleFaint:  'rgba(94,92,230,0.14)',
  green:        '#3fd0c9',
  greenDim:     'rgba(63,208,201,0.44)',
  greenFaint:   'rgba(63,208,201,0.14)',
  red:          '#ff5c7a',
  redDim:       'rgba(255,92,122,0.44)',
  redFaint:     'rgba(255,92,122,0.14)',
  bg:           '#000206',
  surface:      'rgba(12,16,30,0.86)',
  surfaceLight: 'rgba(22,28,48,0.9)',
  overlay:      'rgba(2,3,10,0.98)',
  locked:       'rgba(255,255,255,0.12)',
  lockedBg:     'rgba(255,255,255,0.04)',
  grid:         'rgba(92,140,255,0.05)',
  ink:          '#eaf0fb',
  mut:          '#6b7590',
  glass:        'rgba(255,255,255,0.045)',
  glass2:       'rgba(255,255,255,0.08)',
  line:         'rgba(150,180,255,0.14)',
} as const;

export function statusColor(status: string, options?: { master?: boolean; depth?: number }): string {
  if (status === 'VALIDATED' || status === 'MASTERED') return C.green;
  if (status === 'IN_PROGRESS') return C.cyan;
  if (status === 'ACTIVE') return C.cyan;
  if (options?.master) return C.gold;
  const depth = options?.depth ?? 0;
  if (depth === 0) return C.cyan;
  if (depth === 1) return C.cyanDim;
  if (depth === 2) return C.gold;
  return C.purple;
}

export const CATEGORY_COLOR: Record<string, string> = {
  FOUNDATION: C.cyan, SPECIALIZATION: C.gold, MAESTRÍA: C.purple,
  ADVANCED: C.purple, GOVERNANCE: C.red, ECONOMY: C.green, DEFAULT: C.cyan,
};

// Mapa neuronal (port del donante bb1434fb/components/MapaCapacidades.tsx).
// Fijos SIEMPRE: el mapa nunca pinta con el color del usuario. Regla D5 del
// dueño: el ámbar histórico del donante desaparece — 'blanda' toma el
// verde-lima que ya es opción del ColorPicker; 'conocimiento' reutiliza
// C.green. La geometría y los tiempos del mapa viven en
// features/mapa/mapaLayout.ts y se prueban en features/mapa/contratoMapa.test.ts.
export const MAPA_CAT = {
  dura: '#6aa9ff',
  blanda: '#84cc16',
  conocimiento: C.green,
  credencial: '#c084fc',
} as const;

export function categoryColor(cat: string): string {
  return CATEGORY_COLOR[cat?.toUpperCase()] ?? CATEGORY_COLOR.DEFAULT;
}
