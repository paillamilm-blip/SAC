// theme/typography.ts
// ═══════════════════════════════════════════════════════════════════════
// Fuentes, escala tipográfica y estilos premium.
//
// ESCALA: harmónica con ratio ~1.25 (Major Third), inspirada en Apple HIG.
// Cada tamaño tiene un propósito claro → no hay "magic numbers" sueltos.
// ═══════════════════════════════════════════════════════════════════════

const SANS = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace";

export const FONT = {
  mono:    MONO,
  display: SANS,
  body:    SANS,
} as const;

/**
 * Escala de font-size (px). Usar SIEMPRE estos valores.
 * Si necesitas un tamaño que no está aquí → NO lo inventes, usa el más cercano.
 *
 *   xxs → labels de sistema, badges, contadores tiny
 *   xs  → eyebrows, tags, chips, hints
 *   sm  → body secundario, captions, metadata
 *   md  → body principal (16px = base de legibilidad móvil)
 *   lg  → subtítulos, card titles
 *   xl  → títulos de sección
 *   xxl → hero numbers, stat values
 *   hero → display headlines
 */
export const SIZE = {
  xxs: 9,
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  xxl: 24,
  hero: 32,
} as const;

export const FONT_STYLE = {
  /** Etiquetas de sección, eyebrows, tags. El brief del dueño las fija:
      12 px, mayúsculas, gris tenue y letter-spacing 0.08em. Antes eran mono de
      9 px con tracking de 1.4 px — demasiado chico para leerse y con tipografía
      de terminal, que no es la voz del laboratorio. */
  label:    { fontFamily: SANS, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  /** Code, counters */
  mono:     { fontFamily: MONO, fontSize: SIZE.sm },
  /** Card titles, section headers */
  title:    { fontFamily: SANS, fontWeight: 700 as const, fontSize: SIZE.xl, letterSpacing: -0.3 },
  /** Subtítulos, metadata  */
  subtitle: { fontFamily: MONO, fontSize: SIZE.xs, letterSpacing: 0.5 },
  /** Body text — interlineado 1.6: el brief lo pide y el anterior (1.5) venía
      apretando las tarjetas de la cabina. */
  body:     { fontFamily: SANS, fontSize: SIZE.md, lineHeight: 1.6 },
  /** Chips, small interactive text */
  chip:     { fontFamily: MONO, fontSize: SIZE.xs, letterSpacing: 0.4 },
  /** Input text */
  input:    { fontFamily: SANS, fontSize: SIZE.md },
  /** Stat values (big numbers) — tabulares: en una columna de métricas los
      dígitos deben alinearse en vertical, no bailar según su forma. */
  stat:     { fontFamily: SANS, fontWeight: 800 as const, fontSize: SIZE.xl, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' },
} as const;

// Re-export raw values for use in BASE styles
export { SANS, MONO };

/**
 * La escala de tracking. Existían DIECIOCHO valores escritos a mano en 151 sitios
 * (letterSpacing: 0.5 acá, 1.4 allá, 2.5 en el aviso de arranque…), que es la
 * misma enfermedad de los 28 rgba que se convirtieron en cinco paneles: un
 * inventario donde tenía que haber una familia. Siete pasos. 91 sitios caen
 * exactos y 139 a 0.1 px o menos — la escala ordena, no rediseña. Los doce
 * restantes son dos remates que se pueden justificar: el aviso del arranque baja
 * de 2.5 a 2 (ese cuarto de px era aire de más, no una decisión) y un 0.1
 * escrito positivo sube a 0.4, porque un número positivo nunca pidió que las
 * letras se pegaran.
 *
 *   apretada  -0.15 px  títulos chicos (topbar, métrica de tarjeta)
 *   titulo    -0.4  px  display, stat y hero: el brief pide tracking negativo
 *   denso      0.4  px  chips y metadata monoespaciada
 *   medido     0.6  px  cuerpo de datos y subtítulos mono
 *   etiqueta   1.0  px  la etiqueta de sección en mayúsculas (0.08em a 12 px)
 *   ancha      1.5  px  eyebrows y rótulos que se leen de lejos
 *   anunciada  2.0  px  el aviso del arranque y el takeover del orbe
 */
export const LETRA = {
  apretada:  -0.15,
  titulo:    -0.4,
  denso:      0.4,
  medido:     0.6,
  etiqueta:   1,
  ancha:      1.5,
  anunciada:  2,
} as const;
