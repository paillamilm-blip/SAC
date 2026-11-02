// theme/tokens.ts
// Sistema Ómicrom — Design Tokens: Colores y estados
//
// Identidad: LABORATORIO PROFESIONAL (brief del dueño, 2026-11-01). Negro
// azulado plano + ámbar como MARCA y acción primaria + tres semánticos fríos.
//   cyan  → INFO        #6aa9ff  (estado en curso, datos azules)
//   gold  → ÁMBAR       #f2b134  (marca, acción primaria, raíz del mapa)
//   green → ÉXITO       #3ddc97  (validado / dominado / economía)
//   red   → ERROR       #f87171  (rechazado, fallo)
//   purple→ CREDENCIAL  #c084fc  (tiers altos)
//
// Este ruling deroga el de 2026-10-26 ("el ámbar del donante muere, el mapa
// nunca usa ámbar"): el dueño pidió explícitamente ámbar #f2b134 como acento de
// marca y categoría de dato. El guard que lo prohibía se actualizó en la misma
// jugada (features/mapa/contratoMapa.test.ts).

export const C = {
  cyan:         '#6aa9ff',
  cyanDim:      'rgba(106,169,255,0.46)',
  cyanFaint:    'rgba(106,169,255,0.16)',
  cyanGhost:    'rgba(106,169,255,0.08)',
  gold:         '#f2b134',
  goldDim:      'rgba(242,177,52,0.46)',
  goldFaint:    'rgba(242,177,52,0.14)',
  purple:       '#c084fc',
  purpleDim:    'rgba(192,132,252,0.44)',
  purpleFaint:  'rgba(192,132,252,0.14)',
  green:        '#3ddc97',
  greenDim:     'rgba(61,220,151,0.44)',
  greenFaint:   'rgba(61,220,151,0.14)',
  red:          '#f87171',
  redDim:       'rgba(248,113,113,0.44)',
  redFaint:     'rgba(248,113,113,0.14)',
  bg:           '#0b0d10',
  surface:      '#14171c',
  surfaceLight: '#1a1e25',
  overlay:      'rgba(11,13,16,0.94)',
  locked:       'rgba(233,236,239,0.12)',
  lockedBg:     '#14171c',
  grid:         'rgba(38,44,53,0.60)',
  ink:          '#e9ecef',
  // Tenue de cuerpo secundario y labels: 7,5:1 sobre el fondo del sistema.
  mut:          '#98a2b0',
  // El terciario del brief (12px decorativos, dashes, guías). Mide 4,29:1 sobre
  // #0b0d10, por debajo del AA de texto: NUNCA se usa para texto legible, solo
  // para apoyos visuales. Está acá para que nadie invente un gris distinto.
  mutSoft:      '#6d7885',
  // Superficies de card: el brief pide material sólido, no vidrio translúcido.
  glass:        '#14171c',
  glass2:       '#1a1e25',
  // Velo debajo de modales y cinematicos: el fondo del sistema con alfa.
  scrim:        'rgba(11,13,16,0.72)',
  // Vidrio de barra sticky: casi opaco porque tiene contenido pasando debajo.
  sticky:       'rgba(20,23,28,0.86)',
  // Lavado oscuro translúcido (fila sobre contenido, celda del radar, overlay
  // de banner). Existían 6 variantes casi iguales entre 0.25 y 0.72 de alfa.
  wash:         'rgba(20,23,28,0.72)',
  white:        '#ffffff',
  black:        '#000000',
  // Los dos bordes del brief: el de card y el suave (separadores, filas).
  line:         '#262c35',
  lineSoft:     '#1f242c',
  // Tinta sobre un fondo VIVO: el ámbar de marca y el orbe. #1a1408 es la tinta
  // que el brief asigna al ámbar; el blanco puro sobre ámbar se lee lechoso.
  onAccent:     '#1a1408',
  // Los dos tonos claros que la credencial compartible y el radar usan para
  // datos. Son primos claros de info y credencial, no colores sueltos.
  ice:          '#8ec4ff',
  iris:         '#d4b6ff',
  // El extremo oscuro del degradado ámbar de los botones grandes (reto del día,
  // reintento del ErrorBoundary) y el brillo de la raíz del mapa.
  amberDeep:    '#c98a12',
  // Naranja de la racha: el único cálido entre el ámbar y el rojo. StreakBanner
  // lo escribía tres veces (un hex y dos rgba casi iguales).
  flame:        '#ff6432',
  // El azul-noche de la credencial: la tarjeta compartible y su página de
  // verificación se pintan sobre noche, no sobre el fondo neutro del sistema.
  // Existía en cuatro ortografías (dos rgba de un degradado, un #0a1120 de avatar
  // y un #061024 de radial) para decir una sola cosa. `nocheClara` es el paso de
  // arriba de ese degradado; `noche` es el resto.
  noche:        '#0a1120',
  nocheClara:   '#16223a',
} as const;

// ── El fondo de las pantallas de umbral ────────────────────────────────────
// Lo que se ve antes de que haya contenido: negro frío arriba, tinta cálida al
// centro, casi negro abajo. La rampa estaba copiada palabra por palabra en las
// tres hojas de auth y en el takeover del orbe (cuatro dueños, cero diferencias).
// `credencial` es la misma rampa con el centro frío porque la tarjeta imprimida
// vive sobre el navy del lienzo, no sobre la tinta del ámbar.
export const UMBRAL = {
  apertura:   `radial-gradient(130% 95% at 50% 18%, #050813 0%, ${C.onAccent} 52%, #000003 100%)`,
  credencial: 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)',
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

// Mapa radial. Fijos SIEMPRE: el mapa no pinta con el color del usuario, pinta
// con la paleta de categorías de dato del brief (azul / ámbar / verde / violeta).
// La raíz dorada es C.gold por definición de marca. La geometría y los tiempos
// viven en features/mapa/mapaLayout.ts y se prueban en contratoMapa.test.ts.
export const MAPA_CAT = {
  dura: C.cyan,
  blanda: C.gold,
  conocimiento: C.green,
  credencial: C.purple,
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

/** Alfa de un color vivo. Acepta hex ('#f2b134') y referencia ('var(--omi-accent)'). */
export function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
