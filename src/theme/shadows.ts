// theme/shadows.ts
// Layered shadows y glows para profundidad real

/**
 * La escala de LUZ EMITIDA: el radio del halo que envuelve a algo encendido.
 *
 * Estaba escrito 126 veces en 21 radios distintos — 0, 1, 3, 4, 5, 6, 7, 8, 10,
 * 12, 14, 15, 16, 18, 20, 22, 24, 26, 30, 40, 72 px. Ninguno de esos números era
 * una decisión: eran el 16 de al lado recalculado a ojo, y el 18 y el 14 que
 * competían con él sin decir nada. `--glow-omi` ya era dueño del COLOR del halo
 * de marca; de su apertura no era dueño nadie.
 *
 * Siete pasos sobre la grilla de 4 px, del borde iluminado a la escena. Cada
 * valor huérfano cae al paso más cercano (empate hacia arriba: una luz que se
 * achica deja de contar estado, y el brief prohíbe que un estado sea sólo color).
 * Sólo 16 de los 126 sitios se mueven más de 2 px en el radio de un desenfoque,
 * que es el cambio menos visible que existe en esta app.
 */
export const HALO = {
  chispa: 4,      // luz de borde: glifos, chips, badges
  ascua: 8,       // un control encendido
  foco: 12,       // tarjeta o píldora flotando sobre contenido
  marca: 16,      // el halo canónico de la marca (--glow-omi)
  resplandor: 24, // superficie grande iluminada: CTA, banda
  difusion: 40,   // baño de luz de un panel
  escena: 72,     // el orbe como escena, no como control
} as const;

/**
 * La escala de ALTURA: cuán lejos flota algo de la mesa.
 *
 * Cada altura se dibuja con DOS capas y cada capa tiene un trabajo: la
 * `cercana` define el borde (1 px de caída, alfa bajo) y la `lejana` da la
 * profundidad (caída y desenfoque grandes, alfa alto). Existían como `SHADOW`,
 * pero escritas sólo en pareja: los sitios que necesitaban una capa sola —la
 * barra que flota bajo un halo, el botón asentado sobre la superficie— no
 * tenían nada que pedir, y las once capas sueltas del cliente estaban escritas a
 * mano en siete archivos con ocho geometrías de capa lejana distintas
 * (`0 4px 12`, `0 4px 18`, `0 4px 20`, `0 8px 24`, `0 8px 32`, `0 12px 34`,
 * `0 12px 40`, y las dos parejas copiadas palabra por palabra en
 * `aprendizaje.css`). Ocho formas de la misma decisión tomada ocho veces.
 *
 * Criterio de caída, declarado porque hace falta más de una vez:
 *   · Un estado es un paso. Donde hay dos estados (reposo/foco, calma/alarma)
 *     las capas caen a pasos CONSECUTIVOS, no al mismo: si el reposo y el foco
 *     caen al mismo paso, la altura deja de contar el estado y el brief prohíbe
 *     que un estado sea sólo color.
 *   · Un solo paso se va al más cercano en geometría, y ante un empate se va
 *     HACIA ABAJO: este mundo construye la profundidad con superficies escalonadas
 *     y vidrio, no con sombras pesadas. (Es el criterio inverso al de HALO, y por
 *     eso está escrito: una luz que se achica deja de contar estado; una sombra
 *     que se agranda sí puede tapar la superficie que está debajo.)
 */
const GEOMETRIA = {
  cercana: { sm: '0 1px 2px', md: '0 1px 3px', lg: '0 2px 6px', xl: '0 4px 12px' },
  lejana: { sm: '0 4px 12px', md: '0 8px 24px', lg: '0 16px 48px', xl: '0 24px 64px' },
} as const;
const ALFA = { cercana: { sm: 0.25, md: 0.3, lg: 0.35, xl: 0.4 }, lejana: { sm: 0.2, md: 0.35, lg: 0.45, xl: 0.55 } } as const;

const negra = (capa: keyof typeof GEOMETRIA, paso: 'sm' | 'md' | 'lg' | 'xl'): string =>
  `${GEOMETRIA[capa][paso]} rgba(0,0,0,${ALFA[capa][paso]})`;

export type Altura = keyof typeof GEOMETRIA.lejana;

/** La capa de borde, sola: una superficie asentada, sin profundidad todavía. */
export const CERCANA = {
  sm: negra('cercana', 'sm'), md: negra('cercana', 'md'),
  lg: negra('cercana', 'lg'), xl: negra('cercana', 'xl'),
} as const;

/** La capa de profundidad, sola: viaja bajo un halo, sobre una escena, en el vidrio. */
export const LEJANA = {
  sm: negra('lejana', 'sm'), md: negra('lejana', 'md'),
  lg: negra('lejana', 'lg'), xl: negra('lejana', 'xl'),
} as const;

/**
 * Layered shadows — la pareja completa de cada altura.
 * Capa 1 (cercana): definición del borde
 * Capa 2 (lejana): profundidad ambiental
 */
export const SHADOW = {
  sm: `${CERCANA.sm}, ${LEJANA.sm}`,
  md: `${CERCANA.md}, ${LEJANA.md}`,
  lg: `${CERCANA.lg}, ${LEJANA.lg}`,
  xl: `${CERCANA.xl}, ${LEJANA.xl}`,
  glow: `0 0 ${HALO.marca}px rgba(106,169,255,0.25), ${LEJANA.md}`,
  glowGold: `0 0 ${HALO.marca}px rgba(242,177,52,0.25), ${LEJANA.md}`,
} as const;

/**
 * Elevación teñida: la sombra de un elemento cuyo color ES la marca (el color
 * personal del usuario, un tinte del tema). SHADOW es negro y no sirve acá.
 * La forma vivía escrita a mano en cuatro archivos, con dos geometrías casi
 * iguales (0 8px 28px y 0 10px 28px).
 */
export const ELEVATED = {
  /** La altura de un paso, en el color de la superficie: sombra propia teñida. */
  lejana: (paso: Altura, color: string): string => `${GEOMETRIA.lejana[paso]} ${color}`,
  /** Superficie teñida que flota: su color hace la profundidad y el negro la asienta. */
  tinte: (paso: Altura, color: string): string => `${ELEVATED.lejana(paso, color)}, ${LEJANA[paso]}`,
  cta: (color: string): string => ELEVATED.lejana('md', color),
} as const;

/**
 * Los halos de categoría. Existían cinco y se usaba uno: los otros cuatro eran
 * el mismo 18px disfrazado por color, y el 18 no era una decisión — era el 16
 * mal medido. Queda lo que la app usa, con el radio de la escala.
 */
export const GLOW = {
  cyan: `0 0 ${HALO.marca}px rgba(106,169,255,0.42)`,
} as const;
