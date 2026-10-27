// theme/canvasInk.ts
// ═══════════════════════════════════════════════════════════════════════
// La hoja del tema para el medio que no lee CSS.
//
// Canvas 2D no entiende `var()` ni `color-mix()`: necesita cadenas concretas.
// Eso no autoriza un segundo sistema de color; autoriza una segunda HOJA del
// mismo. Cada valor de acá deriva de `C` o de `FONT`. La única excepción es el
// navy del PNG descargable: sobre negro puro el vidrio del tema no existe, así
// que la tarjeta imprimida tiene su propio fondo, nombrado y copiado una vez.
//
// Regla (vela contratoAsistente.test.ts): ningún componente escribe un hex para
// dibujar. Se importa de acá.
//
// Los tokens de FONT sí son legibles en canvas —son strings de familia, no
// variables—, así que las tipografías NO se duplican: `bold 34px ${FONT.display}`
// es exactamente la pila del sistema.
// ═══════════════════════════════════════════════════════════════════════

import { C } from './tokens';

/**
 *alfa sobre un hex del tema, en el único lenguaje que canvas entiende: rgba().
 * Es lo que `tint()` hace con color-mix() para el DOM. Acepta #rgb y #rrggbb.
 */
export function inkAt(hex: string, alpha: number): string {
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = m[1];
  const full = n.length === 3 ? [...n].map((c) => c + c).join('') : n;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Glifo Ω de la credencial: la serif del donante, no una pila inventada. */
export const CANVAS_SERIF = 'Georgia, serif';

/** Navy de la tarjeta imprimida. Vivían duplicados en dos dibujantes distintos. */
export const CARD_NAVY = {
  top: '#04122a',
  mid: '#02081a',
  bottom: '#06122e',
} as const;

/** Tinta de la credencial, por rol. El alfa unificado es el de la tarjeta madre. */
export const CARD_INK = {
  // Título y nombre. Antes '#eaf4ff', que era C.ink (#eaf0fb) con otro nombre:
  // a 4 puntos de azul de diferencia en un PNG descargable, nadie lo ve; dos
  // blancos para un solo rol, eso sí se copia.
  title: C.ink,
  label: inkAt(C.ink, 0.85),
  value: inkAt(C.white, 0.5),
  track: inkAt(C.white, 0.1),
  meta: inkAt(C.cyan, 0.75),
  stat: inkAt(C.ink, 0.55),
  frame: inkAt(C.cyan, 0.4),
  footer: inkAt(C.cyan, 0.6),
} as const;

/** Geometría fija de la tarjeta compartible (600×860 = la proporción del PNG). */
export const CARD = { w: 600, h: 860, radius: 18 } as const;
