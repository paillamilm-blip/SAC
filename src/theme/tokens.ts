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
  // Nota tenue para labels y body secundario. Subió de #6b7590 a #76829d: la
  // versión anterior quedaba en ~4.0:1 sobre el vidrio de la app y el estándar
  // asistente pide AA (4.5:1) en TODO el texto, no solo en el héroe.
  mut:          '#76829d',
  glass:        'rgba(255,255,255,0.045)',
  glass2:       'rgba(255,255,255,0.08)',
  // Velo debajo de modales y cinematicos: el negro del sistema, no un gris
  // inventado. Vivía como rgba(0,0,0,0.5/0.6/0.7) en 5 archivos distintos.
  scrim:        'rgba(0,0,0,0.6)',
  // Vidrio de barra sticky: la fija (BASE.header) puede ser translúcida porque
  // no tiene contenido pasando por debajo; una sticky a 0.55 deja leer la cola
  // a través del título y se vuelve ilegible.
  sticky:       'rgba(6,8,16,0.96)',
  // Lavado oscuro translúcido (fila sobre contenido, celda del radar, overlay
  // de banner). Existían 6 variantes casi iguales entre 0.25 y 0.72 de alfa.
  wash:         'rgba(6,10,22,0.6)',
  white:        '#ffffff',
  black:        '#000000',
  line:         'rgba(150,180,255,0.14)',
  // Tinta sobre un fondo VIVO (botón plateado, orbe, badge de color). El blanco
  // puro sobre silver no existe en este sistema: se lee lechoso. #021018 estaba
  // suelto en 3 archivos con el mismo rol; acá queda su nombre.
  onAccent:     '#021018',
  // Los dos tonos claros que la credencial compartible y el radar usan para
  // datos. Viven en la misma familia que silver-ice/índigo, no en la paleta
  // genérica de Tailwind. Se promueven a token porque se repetían en 3 archivos.
  ice:          '#8bd4ff',
  iris:         '#8a88f0',
  // El extremo oscuro del degradado silver→teal de los botones grandes (reto del
  // día, reintento del ErrorBoundary). Vivía como hex suelto en dos archivos.
  tealDeep:     '#008b9e',
  // Naranja de la racha: el único cálido entre el ámbar y el rojo. StreakBanner
  // lo escribía tres veces (un hex y dos rgba casi iguales).
  flame:        '#ff6432',
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

// ─── El acento heredado ─────────────────────────────────────────────────────
// El color del usuario se pone UNA vez en el root de la app (App.tsx) y todo el
// andamio lo hereda por CSS. Nadie vuelve a leer localStorage en el render ni a
// concatenar alfa sobre un hex (`${uc}33`), que era como cada componente
// reinventaba el mismo degradado. Vale `var()`, así que también funciona dentro
// de color-mix y de un gradiente.
export const ACCENT = 'var(--omi-accent)';

/** Alfa de un color vivo. Acepta hex ('#a0aec0') y referencia ('var(--omi-accent)'). */
export function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
