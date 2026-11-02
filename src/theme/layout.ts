// theme/layout.ts
// Spacing, radii, z-index, blur, borders y base component styles

import React from 'react';
import { SANS, LETRA } from './typography';
import { C } from './tokens';

/** Spacing — grid de 4px */
export const SP = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

/** Escala de espaciado (múltiplos de 4px). */
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  40,
  xxl: 64,
} as const;

/** Radios redondeados. El brief del dueño fija dos medidas y nada más:
    14 px en tarjetas (md) y 9 px en controles (sm). lg/xl quedan para las
    superficies grandes — modal, hero — que no son ni tarjeta ni control. */
export const RADIUS = { sm: 9, md: 14, lg: 16, xl: 22, pill: 999 } as const;

/** Anchos de superficie. El del workspace (1200) vive en `--ancho-max` de la
    hoja; `bolsillo` es el de las superficies que flotan solas sobre la pantalla
    —la barra de conexión y la hoja del modal—, escrito dos veces a mano hasta
    que pidió un dueño. */
export const ANCHO = { bolsillo: 430 } as const;

/** Capas (z-index) para profundidad espacial. */
export const Z = {
  base:    0,
  card:    10,
  orb:     20,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

/**
 * Desenfoque de vidrio: la luz que ATRAVIESA una superficie, no la que emite
 * (esa es HALO, en theme/shadows.ts).
 *
 * Estaba escrito 44 veces en siete radios — 6, 8, 12, 14, 16, 18, 20 px — y el
 * token que había, `BLUR = { sm: '8px', md: '16px', lg: '24px' }`, era dos
 * errores juntos. Uno: sus valores eran números sueltos sin la función, así que
 * los tres sitios que lo usaban emitían `backdrop-filter: 16px`, una declaración
 * inválida que el navegador descarta en silencio —el vidrio de la barra y de las
 * tarjetas nunca se desenfocó—. Dos: `sm` y `lg` no los usaba nadie, y el 24px
 * no aparecía en ninguna hoja.
 *
 * Cuatro pasos de la grilla de 4 px, y el número pierde la unidad: un desenfoque
 * es `blur(16px)`, nunca `16px`. Empate hacia arriba: más escarcha sigue siendo
 * vidrio, menos escarcha ya es otra superficie. Se mueven 14 de los 44 sitios,
 * todos 2 px.
 */
export const BLUR = {
  vaho: 8,       // velo ligero: píldoras y badges flotando sobre color
  escarcha: 12,  // superficie de vidrio corta
  cristal: 16,   // el vidrio canónico: topbar, cabecera, tarjeta
  esmeril: 20,   // vidrio espeso: modal, overlay, escena
} as const;

/**
 * El velo de lectura NO es vidrio. `useProgressiveBlur` desenfoca una sección que
 * todavía no se leyó y la vuelve nítida cuando pasa por delante: 1,5 px apenas lo
 * suficiente para que se vea como pendiente, nunca tanto como para que no se pueda
 * leer. Subirlo a `BLUR.vaho` (8 px) rompería la función —el texto ocultado deja
 * de ser texto—. Vale un nombre propio porque vale una decisión distinta: cuánto
 * le esconde el asistente a quien todavía no llegó.
 */
export const VELO = { apenas: 1.5, nitido: 0 } as const;

export const BORDER = {
  default: '1px solid #262c35',
  faint:   '1px solid #1f242c',
  gold:    '1px solid rgba(242,177,52,0.30)',
  purple:  '1px solid rgba(192,132,252,0.30)',
  green:   '1px solid rgba(61,220,151,0.30)',
  red:     '1px solid rgba(248,113,113,0.30)',
  locked:  '1px solid rgba(233,236,239,0.10)',
} as const;

export const BASE: Record<string, React.CSSProperties> = {
  // El fondo del laboratorio es plano: #0b0d10 sin degradados. La profundidad
  // ya no la da el cielo detrás del vidrio — la dan las superficies escalonadas
  // (#14171c sobre #0b0d10) y los bordes #262c35.
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden', position: 'relative' },
  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, borderBottom: `1px solid ${C.lineSoft}`, background: C.sticky, backdropFilter: `blur(${BLUR.cristal}px)`, WebkitBackdropFilter: `blur(${BLUR.cristal}px)`, position: 'sticky', top: 0, zIndex: 2 },
  card: { padding: '14px 16px', borderRadius: RADIUS.md, background: C.surface, border: `1px solid ${C.line}` },
  detailPanel: { flexShrink: 0, borderTop: `1px solid ${C.lineSoft}`, padding: '15px 16px', background: C.surface, maxHeight: '38vh', overflowY: 'auto', position: 'relative', zIndex: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statCard: { padding: '10px 12px', borderRadius: RADIUS.md, background: C.surfaceLight, border: `1px solid ${C.line}` },
  // Acción primaria = ámbar de la marca con tinta oscura encima (nunca blanco:
  // #f2b134 sobre blanco puro baja el contraste y se ve lechoso).
  btnPrimary: { width: '100%', padding: '12px 0', background: `linear-gradient(135deg,${C.gold},${C.amberDeep})`, border: 'none', borderRadius: RADIUS.sm, fontFamily: SANS, fontWeight: 700, fontSize: 15, color: C.onAccent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: LETRA.apretada, boxShadow: '0 8px 24px rgba(242,177,52,0.28)' },
  btnSecondary: { width: '100%', padding: '12px 0', background: C.surfaceLight, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, fontFamily: SANS, fontWeight: 700, fontSize: 15, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: LETRA.apretada },
  btnDanger: { width: '100%', padding: '12px 0', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: RADIUS.sm, fontFamily: SANS, fontWeight: 700, fontSize: 15, color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: LETRA.apretada },
};

/** Utility: merge multiple style objects (falsy-safe). */
export function cx(...styles: Array<React.CSSProperties | false | null | undefined>): React.CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}
