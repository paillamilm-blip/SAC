// theme/contratoAsistente.test.ts
// El estándar asistente (DESIGN.md) es una promesa, así que se vela como el
// contrato del mapa: texto crudo leído desde el disco. Veintiuna pruebas sobre
// diecisiete afirmaciones:
//   1. Los cianes muertos del prototipo donante (5cc8ff y el saturado 00f5ff,
//      escritos también en forma rgb) no reaparecen fuera del mapa neuronal,
//      que es la única excepción documentada y se pinta con su paleta fija.
//   2. Un solo diccionario de color: ningún archivo fuera de theme/ vuelve a
//      abrir su propio `const C = {` (el espejo privado del simulador se fue
//      el 2026-10-27; si alguien lo reescribe, este test lo echa).
//   3. El vidrio se pide, no se copia: un alfa de blanco crudo solo vive en
//      theme/ y en la hoja de variables. Lo demás pasa por C.glass / C.glass2
//      / tint().
//   4. La credencial tiene UN dibujante (L2): el pasaporte gemelo duplicado
//      se fue y el lienzo 2D de la tarjeta vive en un solo módulo.
//   5. La paleta concreta del PNG descargable pertenece al tema, no a un
//      componente: el canvas no lee var(), pero tampoco se reinventa por hoja.
//   6. Ningún carácter hace de icono: emoji, flechas y figuras unicode dependen
//      de la fuente del sistema visitante y entran con su propia paleta. El
//      dibujo vive en shared/components/icons.tsx.
//   7. Una sola persona gramatical: el voseo (Subí, tenés, Volvé) no convive
//      con el tú neutro, ni en el cliente, ni en la Edge Function, ni en los
//      raise exception de las RPC que el navegador muestra tal cual.
//   8. La deuda del voseo es historia: sólo puede estar en migraciones ya
//      aplicadas, y cada una tiene que seguir teniendo voseo para merecer el
//      listado.
//   9. Control positivo: las redes del voseo pescan de verdad, para que un
//      regex roto no pueda aprobar este archivo por accidente.
//  10. Un concepto, una palabra: la unidad de capacidad se llama HABILIDAD y la
//      prueba se llama EXAMEN en todo lo que se lee. 'skill', 'competencia',
//      'quiz', 'expertise' y 'XP' quedan sólo donde nombran un campo de la
//      máquina (columna, clave JSON) y eso está listado con coordenada.
//  11. La deuda del léxico y el contrato de máquina se autovalidan: cada archivo
//      listado tiene que seguir mereciendo el listado, línea a línea.
//  12. Control positivo de la vara del léxico: pesca las etiquetas y prosa reales
//      y deja tranquilos identificadores, rutas y canales de realtime.
//  13. El elipsis de un estado de carga es un carácter ("…"), no tres puntos:
//      el mismo aviso escrito de dos formas es la misma fuga por tipografía.
//  14. La rampa de umbral (el fondo antes del contenido) vive en el tema: cuatro
//      componentes la copiaban palabra por palabra y uno, con el centro frío.
//  15. El tracking se pide a LETRA: dieciocho números sueltos en 151 sitios pasaron a siete
//      pasos, y un número otra vez es hallazgo en los dos idiomas —el style en
//      línea y la hoja CSS—, que además tienen que decir los mismos siete números.
//  16. La luz tiene escala, en los dos idiomas: un halo (`0 0 Npx`) y un desenfoque
//      (`blur(Npx)`) se piden a HALO y BLUR. Dos precisiones hacen la vara —un anillo
//      `0 0 0 1px` no es un halo, y `0 0 0px` es la ausencia de luz, no un paso— y el
//      espejo `--halo-*` / `--vidrio-*` tiene que decir los mismos números que el dueño.
//  17. La altura también: una capa `0 <y>px <radio>px` fuera de theme/ es geometría
//      de caída reescrita a mano, y se pide a la pareja CERCANA/LEJANA. Quedan fuera
//      por nombre el halo (vara 16), la arista `inset` (un filo no eleva un cuerpo) y
//      la línea `--altura-*:` del espejo, que se vela texto a texto contra el dueño.
//
// OJO CRLF: el checkout viene con \r\n (core.autocrlf); se quita antes de barrer.
import { describe, it, expect } from 'vitest';
import { UMBRAL } from './tokens';
import { LETRA } from './typography';
import { CERCANA, ELEVATED, HALO, LEJANA, SHADOW } from './shadows';
import { BLUR } from './layout';
// @ts-expect-error node:fs existe en runtime (vitest corre en node) pero no tiene tipos en este repo
import { readFileSync, readdirSync, statSync } from 'node:fs';

const sinCR = (s: string): string => s.replace(/\r/g, '');

function caminar(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules') continue;
    const ruta = `${dir}/${entrada}`;
    if (statSync(ruta).isDirectory()) salida.push(...caminar(ruta));
    else salida.push(ruta);
  }
  return salida;
}

const TEXTO = /\.(ts|tsx|css)$/;
const esMapa = (r: string): boolean => r.replace(/\\/g, '/').includes('features/mapa/');
const bajo = (r: string): string => r.replace(/\\/g, '/').replace(/^src\//, '');

const ARCHIVOS = caminar('src').filter((r) => TEXTO.test(r) && !esMapa(r) && !/\.test\.tsx?$/.test(r));

// La lista que reservaba el vidrio crudo de los canvas de credencial se cerró
// en L2 (2026-10-27): ahora hay UN solo dibujante y su paleta vive en el tema,
// así que no queda ninguna excepción que vigilar. Se quedó vacía a propósito —
// si alguien reabre el permiso, la prueba 3 vuelve a fallar en el acto.
const DEUDA_VIDRIO: string[] = [];
// Alba de blanco crudo, en cualquier grado. La red original pedía `0.0[0-9]` y
// con eso un `rgba(255,255,255,0.10)` — el brillo de la credencial, escrito a mano
// en un componente— pasaba de largo: el mismo vidrio, un décimo más abierto, y la
// vara no lo veía. El alfa no decide si es deuda; decide si alguien pidió vidrio.
const CRUDA = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/;

// El lienzo 2D y la paleta del PNG descargable tienen un solo dueño.
const UN_DIBUJANTE = 'features/gemelo/services/credencialCanvas.ts';
const NAVY_PNG = new RegExp(`#04${'122a'}`, 'i');

// ── Afirmación 6: ningún carácter hace de icono ───────────────────────────
// Un emoji o una flecha unicode depende de la fuente del sistema operativo del
// visitante, no hereda el acento del usuario y trae la paleta de la plataforma:
// es color y trazo fuera del sistema a la vez. El dibujo vive en
// shared/components/icons.tsx y el grosor en la regla `svg.lucide` de index.css.
//
// El patrón se construye con code points y no se escribe literal: este archivo
// también se barre, y un glifo acá sería el hallazgo número uno.
const GLIFOS = new RegExp(
  `[${[
    '\\u{1F000}-\\u{1FAFF}', // bloques de emoji
    '\\u{2190}-\\u{21FF}',   // flechas
    '\\u{2600}-\\u{27BF}',   // misceláneas y dingbats
    '\\u{2B00}-\\u{2BFF}',   // flechas y estrellas grandes
    '\\u{25A0}-\\u{25FF}',   // figuras geométricas
  ].join('')}]`,
  'u',
);

// Un glifo dentro de un comentario no llega a la pantalla. Los de bloque se
// quitan primero y se rellenan con espacios: así las líneas siguen numerando
// donde estaban y el reporte sirve para ir directo al sitio.
const COMENTARIO = /^\s*(?:\/\/|\*|\/\*)/;
const sinBloques = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// Excepción documentada: este módulo RECIBE estos caracteres como entrada del
// usuario (la emoción medida por la Edge Function). La app nunca los emite.
const ENTRADA_DE_USUARIO = ['features/omicron/services/emotion.ts'];

// Ratchet: archivos que todavía deben migrar. Se vacía, no se rellena.
const DEUDA_GLIFOS: string[] = [];

// ── Afirmación 7: una sola persona gramatical ──────────────────────────────
// El voseo rioplatense (Subí, Probá, tenés, Volvé) y el tú neutro (Sube tu CV,
// Prueba de nuevo) convivieron en las tres capas: componentes, Edge Function y
// los `raise exception` de las RPC, que PostgREST devuelve como P0001 y el
// cliente muestra tal cual. El guard es morfológico, no una lista de palabras
// ya vistas: una forma nueva que nadie escribió todavía ("cargá", "sentís")
// entra sola. Lo que NO puede detectar es un imperativo raro que no esté en la
// red de terminaciones; ahí manda la lectura del diff.
const TERMINAL = /\b[A-Za-záéíóúüñ]{3,}(ás|és|ís)\b/g;
// Nombres propios y palabras neutras que terminan igual que una forma voseante:
// "Andrés" no es un verbo y "después" no es "ponés". Se agregan acá sólo cuando
// el barrido las muestra, porque el costo de un falso positivo es un guard que
// alguien termina apagando.
const NEUTRA_CON_TERMINAL = /^(?:estás|jamás|demás|quizás|atrás|despu[ée]s|inter[ée]s|(?:franc|ingl|portugu|andr|nicol|tom)[aáeé]s)$/i;
// Todo futuro de tú termina en -rás (amarás, comerás, vivirás, podrás, harás,
// tendrás): la terminación coincide con el voseo y por eso se descarta antes de
// reportar. Un voseo real no puede terminar en "rás" — la tilde cae en la raíz.
const FUTURO = /rás$/i;
// Los imperativos del voseo terminan en vocal acentuada suelta (Tocá, Decí,
// Respondé). No se acepta la variante sin tilde, y ahí está el equilibrio:
// "mira", "busca", "deja", "usa" son imperativos legítimos de tú, mientras que
// "mirá", "buscá", "dejá", "usá" son de vos. La tilde es la única señal.
// acústico. Cierre con lookahead, no con \b: en JS el límite de palabra es de
// clase ASCII y una vocal acentuada final ("probá") no la considera palabra, así
// que \b después de la tilde simplemente no existe.
const IMPERATIVO = /\b(?:decí|tocá|pegá|arrastrá|subí|probá|mirá|buscá|usá|guardá|mandá|dejá|cargá|andá|activá|empezá|seguí|respondé|reconocé|escribí|elegí|corregí|revisá|borrá|quitá|rendí|[jl]ugá|tené|vení|poné|salí|preferí|contame|escribime|haceme|damelo|mandame|volvé|volve)(?![A-Za-záéíóúüñ])/i;
const PRONOMBRE = /\b(?:vos|sos)\b/i;
// Tercera red, y la que faltaba: el imperativo voseante de un verbo en -ar
// ("aprobá", "validá", "dominá") no lleva ese, y la terminación plural no lo
// alcanza. No hace falta enumerarlos: la acentuación en la última sílaba es la
// firma, y casi no hay palabra neutra que termine igual. Las dos familias que
// sí: los futuros ("comprará", "será", "podrá" — todo futuro termina en -rá,
// que es lo que excluye el [^r]) y estas pocas:
const IMPERATIVO_AR = /\b[A-Za-záéíóúüñ]{2,}[^r]á(?![A-Za-záéíóúüñ])/g;
const NEUTRA_TERMINADA_EN_A = /^(?:está|acá|allá|sofá|mamá|papá|bogotá)$/i;

// La palabra voseante de una línea, o null si está limpia. Se reporta el
// término exacto: "hay voseo en esta línea" obliga a releer el archivo entero.
function hollin(linea: string): string | null {
  for (const m of linea.matchAll(TERMINAL)) {
    const palabra = m[0];
    if (NEUTRA_CON_TERMINAL.test(palabra) || FUTURO.test(palabra)) continue;
    return palabra;
  }
  for (const m of linea.matchAll(IMPERATIVO_AR)) {
    if (!NEUTRA_TERMINADA_EN_A.test(m[0])) return m[0];
  }
  return linea.match(IMPERATIVO)?.[0] ?? linea.match(PRONOMBRE)?.[0] ?? null;
}

// El barrido de texto llega hasta donde el usuario puede leer algo: el cliente,
// las Edge Functions y las migraciones. Sirve para las dos varas (voz y léxico);
// las tres migraciones que ya correron viven en DEUDA_VOSEO.
const EXTENSIONES_TEXTO = /\.(ts|tsx|sql)$/;
const esSql = (r: string): boolean => r.endsWith('.sql');

// Un comentario puede citar el texto viejo para explicarlo: no llega a la
// pantalla, así que se quita antes de barrer (mismo criterio que los glifos).
// Se conserva el número de línea ORIGINAL: un reporte sin coordenada cierta
// obliga a reabrir el archivo entero para encontrar una palabra.
function lineasVisibles(texto: string, sql: boolean): { n: number; texto: string }[] {
  const marca = sql ? /--.*$/ : /\/\/.*$/;
  return sinCR(sinBloques(texto))
    .split('\n')
    .map((linea, i) => ({ n: i + 1, linea }))
    .filter(({ linea }) => !/^\s*(?:\/\/|--|\*|\/\*)/.test(linea))
    .map(({ n, linea }) => ({ n, texto: linea.replace(marca, '') }));
}

const ARCHIVOS_TEXTO = [
  ...ARCHIVOS.map((r) => `src/${bajo(r)}`),
  ...caminar('supabase').filter((r) => EXTENSIONES_TEXTO.test(r)),
].map((ruta) => ({ ruta, lineas: lineasVisibles(readFileSync(ruta, 'utf8'), esSql(ruta)) }));

// Historia aplicada: estas migraciones ya corrieron en la base y editarlas sería
// mentirle al historial. Su texto voseante sigue vivo en el archivo y muerto en
// la base: 10014 reemplaza los cuerpos de las tres funciones que hablaban con el
// usuario. 10011 es el caso distinto: su "Pasá" está dentro de un `raise
// warning`, o sea que sólo se lee en la consola del SQL Editor mientras el dueño
// aplica el script — nunca llega a una pantalla. Se lista, no se copia a 10014.
const DEUDA_VOSEO = [
  'supabase/migrations/10002_examen_de_cualquier_habilidad.sql',
  'supabase/migrations/10012_aprendizaje_continuo.sql',
  'supabase/migrations/10011_desprogramar_latidos_huerfanos.sql',
];

// ── Afirmación 10: un concepto, una palabra ────────────────────────────────
// La misma unidad de capacidad se llamaba skill, habilidad y competencia según
// la pantalla, y la prueba para validarla se llamaba quiz o examen según la
// pestaña. Tres nombres para una cosa es tres oportunidades de que el usuario
// crea que son tres cosas. El registro reductor es el que ya manda en la barra
// de navegación: HABILIDADES para la unidad, EXAMEN para la prueba.
//
// La vara no barre la línea entera: barre lo que puede llegar a una pantalla,
// o sea los literales y el texto JSX. Identificadores, rutas, claves de
// Supabase, canales de realtime y el contrato JSON de la IA siguen diciendo
// skill o quiz y NO deben cambiar — son el nombre de una columna o de un campo,
// no una frase. Por eso un token suelto en minúscula se ignora ('quiz',
// 'maxskill', 'level_up') y uno suelto escrito como etiqueta sí cuenta
// ('Competencias', 'Quiz final'): el texto que ve el usuario empieza con
// mayúscula, el que ve el compilador no.
const SINONIMOS = /\b(?:skill|skills|competencia|competencias|expertise|quiz|quizzes)\b/i;
const JERGAMONAS = /\bXP\b/; // "años XP": el puntaje de un videojuego, no una medida
const CANONICA = /\b(?:habilidad|habilidades|examen|exámenes)\b/i;

const INTERPOLACION = /\$\{[^{}]*\}/g;
const LLAVES = /\{[^{}]*\}/g;

// Código disfrazado de frase: el JSON que le pide campos a la IA, una ruta de
// import, una columna snake_case o un valor de CSS no son texto para leer.
function esCodigo(t: string): boolean {
  return /^\s*[[{]/.test(t)
    || /^["'`]?(?:@|\.?\/|https?:)/.test(t)
    || /\w_\w/.test(t)
    || /- ?\w*\.(?:ts|tsx|js|sql|css|png|svg|json)\b/.test(t)
    || /(?:\bpx\b|solid|gradient|rgba?\(|var\()/.test(t);
}

function trozosVisibles(linea: string): { texto: string; jsx: boolean }[] {
  const sinInterpolacion = (t: string): string =>
    t.replace(INTERPOLACION, '').replace(LLAVES, '').replace(/\s+/g, ' ').trim();
  const salida: { texto: string; jsx: boolean }[] = [];
  for (const m of linea.matchAll(/(['"`])((?:(?!\1)[^\\]|\\[\s\S])*?)\1/g)) {
    const t = sinInterpolacion(m[2]);
    if (t) salida.push({ texto: t, jsx: false });
  }
  // El texto entre etiquetas se barre sin la regla de la mayúscula: un hijo de
  // JSX se imprime tal cual, no puede ser un identificador.
  for (const m of linea.matchAll(/>([^<>\n]+)</g)) {
    const t = sinInterpolacion(m[1]);
    if (t) salida.push({ texto: t, jsx: true });
  }
  return salida;
}

function sinonimo(linea: string): string | null {
  for (const { texto, jsx } of trozosVisibles(linea)) {
    if (!jsx && (esCodigo(texto) || (!/\s/.test(texto) && /^[a-z]/.test(texto)))) continue;
    const m = texto.match(SINONIMOS) ?? texto.match(JERGAMONAS);
    if (m) return m[0];
  }
  return null;
}

// Ratchet del léxico: se vacía, no se rellena. Son migraciones APLICADAS cuyo
// texto no se edita (10014 es la que las corrige) y que, además, hoy no llegan a
// una pantalla: 0062 es un `comment on column` que sólo lee el SQL Editor; 0072
// construye la razón legible de un ranking que el cliente ya no consulta; 0077
// escribe en `reputation_history.reason` y `getReputationHistory` no tiene
// llamador. Si alguna pantalla empieza a leer esas filas, la deuda deja de ser
// inocua y el fix es una migración nueva, no editar la vieja.
const DEUDA_LEXICO = [
  'supabase/migrations/0062_aplicar_analisis_cv.sql',
  'supabase/migrations/0072_job_matching_pipeline.sql',
  'supabase/migrations/0077_cv_aditivo_suma_total.sql',
  'supabase/migrations/10002_examen_de_cualquier_habilidad.sql',
];

// Exención con coordenada, no con carpeta: tres literales nombran campos de la
// máquina — dos prompts que le piden a la IA las claves del JSON que lee el
// parser (`skills`, `skillsDetail`) y una lista de columnas de Supabase. Cambiar
// la palabra ahí no es unificar el idioma del producto: es romper el contrato.
// Se lista línea por línea para que nadie esconda copy de pantalla dentro de un
// prompt; la prueba de abajo exige que cada coordenada siga nombrando un campo.
const CONTRATO_MAQUINA = [
  'src/infrastructure/ai/gemini.ts:36',
  'supabase/functions/analizar-cv/index.ts:382',
  'supabase/functions/notify-matches/index.ts:49',
];

// ── Afirmación 13: el aviso de carga se escribe con un carácter ─────────────
// "Preparando tu gemelo…" y "Guardando..." son el mismo estado con dos
// tipografías: 52 avisos ya usaban elipsis y 16 seguían tecleando tres puntos.
// El tres-puntos es lo que se escribe en un teclado, pero en la pantalla es
// tres glifos con ancho propio: en las etiquetas monoespaciadas del Gemelo
// (VERIFICANDO FIRMA, CARGANDO CREDENCIAL) el remate se veía suelto.
// Se barre sólo el cliente: un `console.log` de una Edge Function nunca llega a
// una pantalla, y la prosa de borde y base ya la velan las varas de voz y léxico.
const SUSPENSIVO = /\p{L}\.{2,}/u;

function suspensivo(linea: string): string | null {
  for (const { texto, jsx } of trozosVisibles(linea)) {
    if (!jsx && esCodigo(texto)) continue;
    const m = texto.match(SUSPENSIVO);
    if (m) return m[0];
  }
  return null;
}

const ARCHIVOS_CLIENTE = ARCHIVOS_TEXTO.filter((a) => a.ruta.startsWith('src/'));

// ── Afirmación 14: la rampa de umbral tiene un solo dueño ───────────────────
// El fondo que se ve antes del contenido (negro frío arriba, tinta del ámbar al
// centro) estaba escrito palabra por palabra en las tres hojas de auth y en el
// takeover del orbe, y en otra variante en la credencial: cuatro copias y una
// derivada, todas fuera del tema. La firma geométrica (`130% 95% at 50% 18%`) no
// se escribe literal acá porque este archivo también se barre.
const RAMPA_UMBRAL = /130%\s*95%\s*at\s*50%\s*18%/;

// ── Afirmación 15: el tracking tiene escala, en los dos idiomas ─────────────
// Un número suelto de tracking se escribe de dos formas distintas según dónde
// viva: `letterSpacing: 1.4` en un style en línea, `letter-spacing: 1.4px` en una
// hoja. La misma fuga, dos ortografías, así que la vara barre las dos con una
// sola red. No pesa sobre `em` suelto sin unidad (`letter-spacing: .08`) porque
// ahí el número es una fracción del tamaño y no una constante del sistema.
const TRACKING_SUELTO =
  /letterSpacing:\s*(-?\d+(?:\.\d+)?)|letter-spacing:\s*(-?\d+(?:\.\d+)?(?:px|em))/g;

function trackingsSueltos(texto: string): string[] {
  return [...sinCR(texto).matchAll(TRACKING_SUELTO)].map((m) => m[1] ?? m[2]);
}

// ── Afirmación 16: la luz tiene escala, en los dos idiomas ─────────────────
// Dos fenómenos ópticos distintos se estaban escribiendo a mano, cada uno con su
// pila de números sin dueño: el halo (la luz que EMITE una superficie) aparecía
// 126 veces en 21 radios, y el desenfoque (la luz que ATRAVIESA un vidrio) 50
// veces en siete. HALO y BLUR los ordenaron en siete y cuatro pasos sobre la
// grilla de 4 px; la vara pesca el número que vuelve a aparecer suelto, en el
// idioma que sea: `0 0 18px` en un style en línea o `box-shadow: 0 0 18px` en
// una hoja. Un `blur(Npx)` no necesita contexto: sólo existe como función.
//
// Dos precisiones son la vara, no un detalle de regex, y las dos las aprendió
// el codemod barriendo:
//   · El anillo se escribe `0 0 0 1px` (offset, offset, ANCHO, radio). Sin el
//     lookbehind la red empieza a casar en el segundo cero y convierte un anillo
//     de 1 px en un halo de 4: el mismo error que el barrido cometió dos veces,
//     y que en pantalla es un borde que deja de ser borde.
//   · `0 0 0px` no es un radio: es la ausencia de luz, el `initial` de un beat
//     que crece hasta su halo. El cero se perdona; un número de la grilla no.
const HALO_SUELTO = /(?<![\d.]\s)0 0 (\d+(?:\.\d+)?)px/g;
const VIDRIO_SUELTO = /blur\((\d+(?:\.\d+)?)px\)/g;
// El radio sólo es hallazgo dentro de una declaración de luz, y el contexto se
// busca hacia atrás en el archivo, no en la línea: una sombra larga se parte en
// varias y la continuación no repite la propiedad. Gana la propiedad más
// cercana, así `margin: '0 0 14px'` queda descartado porque su `margin` está más
// cerca que cualquier `boxShadow`.
const PROPIEDAD_LUZ = /boxShadow|textShadow|box-shadow|text-shadow|drop-shadow/g;
const PROPIEDAD_OTRA =
  /(?:margin|padding|border(?:-\w+)?|gap|translate|offset|top|left|right|bottom|width|height)\s*[:=]/g;

/** Última ocurrencia de `re` antes de `hasta`; -1 si no hay ninguna. */
function ultima(limpio: string, re: RegExp, hasta: number): number {
  let fondo = -1;
  for (const m of limpio.slice(0, hasta).matchAll(re)) fondo = m.index;
  return fondo;
}

/** El contexto se busca hacia atrás en el archivo, no en la línea: una sombra
 *  larga se parte en varias y la continuación no repite la propiedad. */
function dentroDeLuz(limpio: string, hasta: number): boolean {
  return ultima(limpio, PROPIEDAD_LUZ, hasta) > ultima(limpio, PROPIEDAD_OTRA, hasta);
}

function lucesSueltas(texto: string): string[] {
  const limpio = sinCR(texto);
  const salida: string[] = [];
  for (const m of limpio.matchAll(HALO_SUELTO)) {
    if (Number(m[1]) === 0) continue;
    if (dentroDeLuz(limpio, m.index!)) salida.push(`0 0 ${m[1]}px`);
  }
  for (const m of limpio.matchAll(VIDRIO_SUELTO)) salida.push(`blur(${m[1]}px)`);
  return salida;
}

// Afirmación 17 · la ALTURA. El mismo argumento que la luz, escrito con otras dos
// cifras: `0 12px 34px rgba(0,0,0,.38)` es la geometría de caída de un cuerpo, y
// once capas en siete archivos la tenían escrita a mano. El dueño es la pareja
// `CERCANA`/`LEJANA` de theme/shadows.ts; en CSS, el espejo `--altura-*`.
// Tres precisiones son el permiso, y las tres se explican solas:
//   · `0 0 Npx` no cae acá: dos offsets ceros es luz, y esa ya la cobra la vara
//     anterior. La red de altura exige desplazamiento vertical.
//   · Una capa `inset` no es altura, es una arista — el filo de luz que golpea el
//     borde superior del vidrio. No describe un cuerpo elevado y no se mide.
//   · `--altura-md-lejana: 0 8px 24px …;` es el espejo, no un componente: se vela
//     número por número abajo, igual que `--halo-*` y `--vidrio-*`.
const ALTURA_SUELTA = /(?<![\d.]\s)0\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/g;
const DEFINICION = /--[\w-]+\s*:[^;]+;/g;
const ARISTA = /\binset\b/g;
const CAPA = /[;,]/g;

function esArista(limpio: string, hasta: number): boolean {
  return ultima(limpio, ARISTA, hasta) > ultima(limpio, CAPA, hasta);
}

/** Las definiciones de custom property se vacían conservando los saltos. */
function sinDefiniciones(s: string): string {
  return s.replace(DEFINICION, (m) => m.replace(/[^\n]/g, ' '));
}

function alturasSueltas(texto: string): string[] {
  const limpio = sinDefiniciones(sinCR(texto));
  const salida: string[] = [];
  for (const m of limpio.matchAll(ALTURA_SUELTA)) {
    if (Number(m[1]) === 0) continue;
    if (esArista(limpio, m.index!)) continue;
    if (!dentroDeLuz(limpio, m.index!)) continue;
    salida.push(`0 ${m[1]}px ${m[2]}px`);
  }
  return salida;
}

describe('contrato asistente — una sola forma de hacer cada cosa', () => {
  it('los cianes del prototipo no existen fuera del mapa', () => {
    // Los patrones se construyen, no se escriben: este archivo también se barre.
    const PROHIBIDOS = [
      { nombre: 'cian de marca donante', re: new RegExp(`#5cc${'8ff'}`, 'i') },
      { nombre: 'cian saturado', re: new RegExp(`#00f${'5ff'}`, 'i') },
      { nombre: 'cian donante en rgb', re: /rgba?\(\s*92\s*,\s*200\s*,\s*255/i },
      { nombre: 'cian saturado en rgb', re: /rgba?\(\s*0\s*,\s*245\s*,\s*255/i },
    ];
    const sucios: string[] = [];
    for (const ruta of ARCHIVOS.map(bajo)) {
      const texto = sinCR(readFileSync(`src/${ruta}`, 'utf8'));
      const toca = PROHIBIDOS.find((p) => p.re.test(texto));
      if (toca) sucios.push(`${ruta} → ${toca.nombre}`);
    }
    expect(sucios).toEqual([]);
  });

  it('un solo diccionario de color en todo el sistema', () => {
    const espejos = ARCHIVOS
      .map(bajo)
      .filter((ruta) => !ruta.startsWith('theme/'))
      .filter((ruta) => /^\s*(?:export\s+)?const C = \{/m.test(sinCR(readFileSync(`src/${ruta}`, 'utf8'))));
    expect(espejos).toEqual([]);
  });

  it('el vidrio se pide al tema, no se reescribe a mano', () => {
    const AUTORIZADO = /^(theme\/|index\.css$|features\/mapa\/)/;
    const sucios = ARCHIVOS
      .map(bajo)
      .filter((ruta) => !AUTORIZADO.test(ruta) && !DEUDA_VIDRIO.includes(ruta))
      .filter((ruta) => CRUDA.test(sinCR(readFileSync(`src/${ruta}`, 'utf8'))));
    expect(sucios).toEqual([]);
  });

  it('la credencial la dibuja UN solo módulo', () => {
    // Dos dibujantes eran dos copias de la misma tarjeta con la misma
    // tipografía y alfas levemente distintos (0.35 vs 0.45, 0.8 vs 0.85). El
    // lienzo 2D de la credencial vive en un archivo; ningún componente pinta.
    const dibujantes = ARCHIVOS
      .map(bajo)
      .filter((ruta) => /getContext\(\s*['"]2d['"]\s*\)/.test(sinCR(readFileSync(`src/${ruta}`, 'utf8'))));
    expect(dibujantes).toEqual([UN_DIBUJANTE]);
  });

  it('la paleta del PNG descargable no se reescribe en un componente', () => {
    // El canvas no lee var() ni color-mix(), así que su paleta es concreta.
    // Concreta quiere decir UN lugar (theme/), no un hex suelto por componente.
    const sucios = ARCHIVOS
      .map(bajo)
      .filter((ruta) => !ruta.startsWith('theme/'))
      .filter((ruta) => NAVY_PNG.test(sinCR(readFileSync(`src/${ruta}`, 'utf8'))));
    expect(sucios).toEqual([]);
  });

  it('ningún carácter hace de icono en la pantalla', () => {
    // Se reporta archivo y línea: "0 glifos" sin coordenadas no es un criterio
    // que alguien pueda cerrar.
    const sucios: string[] = [];
    for (const ruta of ARCHIVOS.map(bajo)) {
      if (ENTRADA_DE_USUARIO.includes(ruta) || DEUDA_GLIFOS.includes(ruta)) continue;
      const lineas = sinBloques(sinCR(readFileSync(`src/${ruta}`, 'utf8'))).split('\n');
      lineas.forEach((linea, i) => {
        if (COMENTARIO.test(linea)) return;
        const visible = linea.replace(/\/\/.*$/, '');
        if (GLIFOS.test(visible)) sucios.push(`${ruta}:${i + 1}`);
      });
    }
    expect(sucios).toEqual([]);
  });

  it('el asistente habla de tú en los tres lados: cliente, borde y base', () => {
    // El registro rector es el tú neutro ("Sube tu CV", "Prueba de nuevo"), el
    // mismo del cromo de estados. El voseo convivió con él en las tres capas:
    // componentes, la Edge Function y los `raise exception` de las RPC (que
    // PostgREST manda al navegador como P0001). Dos voces en la misma pantalla
    // es lo que separa una app escrita por una persona de una pegada por veinte.
    //
    // Se barren los comentarios aparte: un autor puede citar el texto viejo para
    // explicarlo sin que ese citamiento le llegue a nadie.
    const sucios: string[] = [];
    for (const { ruta, lineas } of ARCHIVOS_TEXTO) {
      if (DEUDA_VOSEO.includes(ruta)) continue;
      for (const { n, texto } of lineas) {
        const palabra = hollin(texto);
        if (palabra) sucios.push(`${ruta}:${n} → ${palabra}`);
      }
    }
    expect(sucios).toEqual([]);
  });

  it('la deuda del voseo es historia, no presente', () => {
    // El ratchet se vacía, no se rellena: las dos migraciones listadas ya
    // correron, así que su texto no se edita (editar lo aplicado es mentirle al
    // historial). Lo que las reemplaza en la base viva es 10014, y esa sí entra
    // en el barrido. Si 10014 desaparece, la lista queda coja y esta prueba lo avisa.
    const reemplazo = ARCHIVOS_TEXTO.find((a) => a.ruta.endsWith('10014_voz_neutra_mensajes_rpc.sql'));
    expect(reemplazo, 'falta la migración que neutraliza los mensajes de las RPC').toBeTruthy();
    for (const archivo of DEUDA_VOSEO) {
      const marcada = lineasVisibles(readFileSync(archivo, 'utf8'), esSql(archivo))
        .map((l) => hollin(l.texto))
        .find((p): p is string => Boolean(p));
      expect(marcada, `${archivo} ya no tiene voseo: sácalo de DEUDA_VOSEO`).toBeTruthy();
    }
    expect(DEUDA_VOSEO.every((r) => /migrations\//.test(r)), 'la deuda sólo puede vivir en migraciones aplicadas').toBe(true);
    // 10014 no puede deber nada: es la corrección, no la historia.
    expect(DEUDA_VOSEO.some((r) => r.includes('10014'))).toBe(false);
  });

  it('las redes del voseo pescan de verdad', () => {
    // Un guard que siempre devuelve limpio es peor que no tenerlo: da permiso
    // tácito. El control positivo prueba la máquina con las formas exactas que
    // salieron del barrido, y el negativo con las que se parecen pero no son.
    expect(hollin('Acá tenés tres nodos sin probar')).toBe('tenés');
    expect(hollin('Probá una y empezá a valer')).toBe('Probá');
    expect(hollin('Subí el archivo y Volvé mañana')).toBe('Subí');
    expect(hollin('Termina las lecciones del curso y aprobá su examen')).toBe('aprobá');
    expect(hollin('El centro sos vos')).toBe('sos');
    expect(hollin('Mañana podrás abrir más, son tus marcas y Andrés está')).toBeNull();
    expect(hollin('Cuando termines, acá estará Andrés')).toBeNull();
  });

  it('un concepto tiene una palabra: habilidad y examen', () => {
    // Se barren los mismos 292 archivos que la vara de voz, pero sólo lo que
    // puede leerse: el barrido reporta `archivo:línea → palabra` y deja afuera
    // identificadores y contratos de máquina a propósito.
    const sucios: string[] = [];
    for (const { ruta, lineas } of ARCHIVOS_TEXTO) {
      if (DEUDA_LEXICO.includes(ruta)) continue;
      for (const { n, texto } of lineas) {
        if (CONTRATO_MAQUINA.includes(`${ruta}:${n}`)) continue;
        const palabra = sinonimo(texto);
        if (palabra) sucios.push(`${ruta}:${n} → ${palabra}`);
      }
    }
    expect(sucios).toEqual([]);
  });

  it('la deuda del léxico y el contrato de máquina están donde dicen estar', () => {
    // El ratchet se autovalida: un archivo listado tiene que seguir teniendo el
    // sinónimo que justifica listarlo (si alguien lo limpia, sobra en la lista y
    // esta prueba lo echa), la deuda sólo puede vivir en migraciones aplicadas,
    // y la exención tiene que caer en una línea que de verdad nombra un campo de
    // la máquina — una coordenada que envejece mal es una trampa.
    for (const archivo of DEUDA_LEXICO) {
      const marcada = lineasVisibles(readFileSync(archivo, 'utf8'), esSql(archivo))
        .map((l) => sinonimo(l.texto))
        .find((p): p is string => Boolean(p));
      expect(marcada, `${archivo} ya no tiene sinónimos: sácalo de DEUDA_LEXICO`).toBeTruthy();
    }
    expect(DEUDA_LEXICO.every((r) => /migrations\//.test(r)), 'la deuda del léxico sólo puede vivir en migraciones aplicadas').toBe(true);
    expect(DEUDA_LEXICO.some((r) => r.includes('10014'))).toBe(false);
    for (const coord of CONTRATO_MAQUINA) {
      const [ruta, n] = coord.split(':');
      const linea = lineasVisibles(readFileSync(ruta, 'utf8'), false).find((l) => l.n === Number(n));
      expect(linea, `${coord} ya no existe: el contrato de la máquina se movió`).toBeTruthy();
      expect(linea!.texto, `${coord} dejó de nombrar un campo: es prosa y entra al barrido`).toMatch(/\w+_\w+|skills|seniorLabel|"skills"/);
    }
  });

  it('la vara del léxico pesca sinónimos y respeta el código', () => {
    // Control positivo con las formas exactas que salieron del inventario, y
    // control negativo sobre lo que se parece pero es nombre de campo o de ruta:
    // si la máquina empezara a prohibir identificadores, el día que alguien
    // renombra una columna este test se vuelve en contra del cambio correcto.
    expect(sinonimo("title='Skill Genome'")).toBe('Skill');
    expect(sinonimo("subtitle={`${totalSkills} competencias · ${y} años XP`}")).toBe('competencias');
    expect(sinonimo("<span>Competencias</span>")).toBe('Competencias');
    expect(sinonimo("toast('No se pudo enviar el quiz')")).toBe('quiz');
    expect(sinonimo("action: 'Valida expertise'")).toBe('expertise');
    expect(sinonimo("import { x } from '@/features/redviva/services/examenSkill'")).toBeNull();
    expect(sinonimo(".from('skill_tree_nodes').select('id,title')")).toBeNull();
    expect(sinonimo("useState<'list' | 'course' | 'quiz'>('list')")).toBeNull();
    expect(sinonimo("const CHANNEL = 'omicron-live'; window.addEventListener('omicron:probar-skill', f)")).toBeNull();
    expect(sinonimo('`linear-gradient(90deg, ${SKILL_COLORS[i]}cc, #fff)`')).toBeNull();
    expect(sinonimo('{"name":"","skills":[],"axes":{"exec":0}}')).toBeNull();
    expect(sinonimo('- skillsDetail: array de {name, pct} con nivel de dominio 0-100')).toBeNull();
    // El prefijo de un id construido con interpolación tampoco es prosa: las
    // llaves se excisan (no se remplazan por espacio) y el resto es un token.
    expect(sinonimo('id: `skill-${i}-${s.toLowerCase()}`')).toBeNull();
    // Una etiqueta suelta en mayúscula sí cuenta: es lo que se imprime.
    expect(sinonimo("const TABS = ['Perfil', 'Competencias'] as const;")).toBe('Competencias');
    // Y la palabra canónica nunca es hallazgo.
    expect(sinonimo("label: 'Habilidades' // rinde un examen")).toBeNull();
    expect(CANONICA.test('habilidades y examen')).toBe(true);
  });

  it('el elipsis de un estado de carga es un carácter, no tres puntos', () => {
    const sucios: string[] = [];
    for (const { ruta, lineas } of ARCHIVOS_CLIENTE) {
      for (const { n, texto } of lineas) {
        const hallazgo = suspensivo(texto);
        if (hallazgo) sucios.push(`${ruta}:${n} → ${hallazgo}`);
      }
    }
    expect(sucios).toEqual([]);
  });

  it('la vara del elipsis pesca remates y respeta el código', () => {
    // Control positivo con las formas que salieron del inventario (JSX suelto,
    // literal de botón, placeholder) y negativo con los tres puntos que son
    // sintaxis: un spread de objeto o un array vacío jamás es un aviso.
    expect(suspensivo('<p>VERIFICANDO FIRMA...</p>')).toBe('A...');
    expect(suspensivo("{issuing ? 'Firmando...' : 'Generar Pasaporte'}")).toBe('o...');
    expect(suspensivo('placeholder="Escribe tu duda..."')).toBe('a...');
    expect(suspensivo('const modelo = { ...a, color: uc };')).toBeNull();
    expect(suspensivo('setForm({ ...form, title: e.target.value })')).toBeNull();
    expect(suspensivo('return [...t].filter(Boolean)')).toBeNull();
    // Dos puntos también cuentan: "Cargando.." es la misma fuga en chico.
    expect(suspensivo("'Cargando..'")).toBe('o..');
    // Un espacio antes del remate tampoco lo disculpa: la red exige la letra,
    // así que un remate suelto dentro de una frase larga no se pesa — es el caso
    // del placeholder de la contraseña (`"..."`), tres puntos sin palabra que los
    // preceda. Se deja constancia porque es el límite conocido de la vara, no un
    // descuido: la red caza el aviso de carga, que es donde el doble estilo se
    // veía.
    expect(suspensivo('text: "Haz esto ahora: ..."')).toBeNull();
    expect(suspensivo('placeholder="..."')).toBeNull();
  });

  it('la rampa de umbral vive en el tema, no en cuatro componentes', () => {
    const fuera = ARCHIVOS
      .map(bajo)
      .filter((ruta) => !ruta.startsWith('theme/'))
      .filter((ruta) => RAMPA_UMBRAL.test(sinCR(readFileSync(`src/${ruta}`, 'utf8'))));
    expect(fuera).toEqual([]);
    // Y el dueño existe: si alguien borra la hoja del tema, la vara no puede
    // aprobar el repo por vacío.
    const dueno = sinCR(readFileSync('src/theme/tokens.ts', 'utf8'));
    expect(dueno).toMatch(/UMBRAL\s*=\s*\{/);
    expect(dueno).toMatch(/apertura:/);
    expect(dueno).toMatch(/credencial:/);
    // Fijación exacta: la subida al tema no tenía que mover un píxel. Si alguien
    // cambia un stop, esta prueba se queja antes de que alguien lo note en auth.
    expect(UMBRAL.apertura).toBe('radial-gradient(130% 95% at 50% 18%, #050813 0%, #1a1408 52%, #000003 100%)');
    expect(UMBRAL.credencial).toBe('radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)');
  });

  it('el tracking se pide a la escala LETRA, no se inventa por componente', () => {
    // DIECIOCHO valores a mano en 151 sitios: 0.5 acá, 1.4 allá, 2.5 en el aviso de
    // arranque. La escala los absorbió por cercanía; 139 de 151 quedaron a 0.1 px o
    // menos y los dos remates más largos (2.5→2 y un 0.1 positivo→0.4) están
    // justificados en el dueño. El mapa tiene su propia escala en `em`, es port 1:1
    // y no se le pide cuenta acá.
    const sueltos: string[] = [];
    for (const ruta of ARCHIVOS.map(bajo).filter((r) => !r.startsWith('theme/'))) {
      for (const valor of trackingsSueltos(readFileSync(`src/${ruta}`, 'utf8'))) {
        sueltos.push(`${ruta} → ${valor}`);
      }
    }
    expect(sueltos).toEqual([]);
    // La escala existe y tiene los siete pasos con los que se barrieron los sitios.
    expect(Object.keys(LETRA).sort()).toEqual(
      ['ancha', 'anunciada', 'apretada', 'denso', 'etiqueta', 'medido', 'titulo'].sort(),
    );
    // Y el espejo CSS no puede desviarse del dueño TS: mismos siete nombres,
    // mismos siete números. Sin esto, la hoja y el tema son dos escalas que algún
    // día alguien mueve por separado.
    const espejo = [...sinCR(readFileSync('src/index.css', 'utf8')).matchAll(/--letra-([a-z]+):\s*(-?\d+(?:\.\d+)?)px;/g)]
      .map((m) => [m[1], parseFloat(m[2])] as const);
    expect(espejo.map(([paso]) => paso).sort()).toEqual(Object.keys(LETRA).sort());
    for (const [paso, valor] of espejo) expect(LETRA[paso as keyof typeof LETRA]).toBe(valor);
  });

  it('la vara del tracking pesca las dos ortografías y respeta la escala', () => {
    // Positivos: el número suelto, escrito en el idioma que sea.
    expect(trackingsSueltos('  letter-spacing: 1.4px;')).toEqual(['1.4px']);
    expect(trackingsSueltos('  letter-spacing: 0.08em;')).toEqual(['0.08em']);
    expect(trackingsSueltos('letterSpacing: 1.2')).toEqual(['1.2']);
    expect(trackingsSueltos('letterSpacing: -0.5,')).toEqual(['-0.5']);
    // Negativos: lo que ya pide la escala no es hallazgo en ningún idioma, y una
    // palabra clave CSS sin número tampoco.
    expect(trackingsSueltos('  letter-spacing: var(--letra-ancha);')).toEqual([]);
    expect(trackingsSueltos('letterSpacing: LETRA.ancha')).toEqual([]);
    expect(trackingsSueltos('  letter-spacing: inherit;')).toEqual([]);
    // La red sí pesa sobre el mapa (`0.14em` la pesca): quien lo deja afuera es la
    // lista de archivos, no la expresión. Conviene tenerlo escrito, porque la
    // próxima persona que lea el barrido va a creer que el `em` estaba perdonado.
    expect(trackingsSueltos('  letter-spacing: 0.14em;')).toEqual(['0.14em']);
  });

  it('la luz se pide a la escala HALO y BLUR, no se inventa por componente', () => {
    // Ciento setenta números de luz (126 halos en 21 radios, 44 desenfoques en
    // 7 vidrios) pasaron a once pasos. El mapa queda afuera del barrido porque
    // es port 1:1 y su luz es geometría de escena, no control.
    const sueltas: string[] = [];
    for (const ruta of ARCHIVOS.map(bajo).filter((r) => !r.startsWith('theme/'))) {
      for (const valor of lucesSueltas(sinBloques(readFileSync(`src/${ruta}`, 'utf8')))) {
        sueltas.push(`${ruta} → ${valor}`);
      }
    }
    expect(sueltas).toEqual([]);
    // Las escalas existen, con los pasos que se barrieron.
    expect(Object.keys(HALO).sort()).toEqual(
      ['ascua', 'chispa', 'difusion', 'escena', 'foco', 'marca', 'resplandor'].sort(),
    );
    expect(Object.keys(BLUR).sort()).toEqual(['cristal', 'escarcha', 'esmeril', 'vaho']);
    // Y el espejo CSS no puede desviarse del dueño: mismos once nombres, mismos
    // once números. Sin esto, la hoja y el tema son dos escalas que algún día
    // alguien mueve por separado — y el vidrio de la barra vuelve a no verse.
    const css = sinCR(readFileSync('src/index.css', 'utf8'));
    const espejo = new Map(
      [...css.matchAll(/--(?:halo|vidrio)-([a-z]+):\s*(\d+(?:\.\d+)?)px;/g)].map((m) => [m[1], Number(m[2])] as const),
    );
    expect(espejo.size).toBe(Object.keys(HALO).length + Object.keys(BLUR).length);
    for (const [paso, valor] of Object.entries(HALO)) expect(espejo.get(paso), `--halo-${paso}`).toBe(valor);
    for (const [paso, valor] of Object.entries(BLUR)) expect(espejo.get(paso), `--vidrio-${paso}`).toBe(valor);
  });

  it('la vara de la luz pesca halos y respeta anillos, ceros y márgenes', () => {
    // Positivos: la luz suelta, escrita en el idioma que sea.
    expect(lucesSueltas("boxShadow: '0 0 18px red'")).toEqual(['0 0 18px']);
    expect(lucesSueltas('  box-shadow: 0 0 22px gold;')).toEqual(['0 0 22px']);
    expect(lucesSueltas("backdropFilter: 'blur(14px)'")).toEqual(['blur(14px)']);
    // Negativos que hacen la vara. El anillo es offset, offset, ANCHO, radio: no
    // emite luz y confundirlo fue el error del primer barrido.
    expect(lucesSueltas('boxShadow: `0 0 0 1px ${uc}55`')).toEqual([]);
    expect(lucesSueltas("boxShadow: '0 8px 24px rgba(0,0,0,.3), 0 0 0 3px #fff'")).toEqual([]);
    // Cero: la ausencia de luz con la que arranca un beat, no un paso de la escala.
    expect(lucesSueltas('initial={{ boxShadow: `0 0 0px ${c}00` }}')).toEqual([]);
    // Un margen escrito con los mismos tres números tampoco es luz: manda la
    // propiedad más cercana, y acá es margin.
    expect(lucesSueltas("margin: '0 0 14px'")).toEqual([]);
    expect(lucesSueltas('  margin: 0 0 16px;\n  box-shadow: 0 0 22px gold;')).toEqual(['0 0 22px']);
    // Y lo que ya pide la escala no es hallazgo en ningún idioma.
    expect(lucesSueltas('boxShadow: `0 0 ${HALO.marca}px ${uc}55`')).toEqual([]);
    expect(lucesSueltas('  box-shadow: 0 0 var(--halo-marca) rgba(0,0,0,.3);')).toEqual([]);
    expect(lucesSueltas('  backdrop-filter: blur(var(--vidrio-cristal));')).toEqual([]);
    expect(lucesSueltas('backdropFilter: `blur(${BLUR.cristal}px)`')).toEqual([]);
  });

  it('la altura se pide a la pareja CERCANA y LEJANA, no se inventa por componente', () => {
    // Once capas en siete archivos describían a mano la caída de un cuerpo. El
    // mapa queda afuera porque es port 1:1 y su profundidad es geometría de escena.
    const sueltas: string[] = [];
    for (const ruta of ARCHIVOS.map(bajo).filter((r) => !r.startsWith('theme/'))) {
      for (const valor of alturasSueltas(sinBloques(readFileSync(`src/${ruta}`, 'utf8')))) {
        sueltas.push(`${ruta} → ${valor}`);
      }
    }
    expect(sueltas).toEqual([]);
    // El dueño son DOS capas: la cercana define el borde, la lejana da la altura.
    const PASOS = ['sm', 'md', 'lg', 'xl'] as const;
    expect(Object.keys(CERCANA)).toEqual([...PASOS]);
    expect(Object.keys(LEJANA)).toEqual([...PASOS]);
    for (const paso of PASOS) {
      expect(SHADOW[paso], `SHADOW.${paso}`).toBe(`${CERCANA[paso]}, ${LEJANA[paso]}`);
    }
    // La capa teñida (la sombra de un elemento cuyo color es la marca) comparte la
    // geometría de la negra: cambia el pigmento, no la caída.
    expect(ELEVATED.tinte('lg', '#f2b134')).toBe(
      '0 16px 48px #f2b134, 0 16px 48px rgba(0,0,0,0.45)',
    );
    // Y el espejo de la hoja no puede desviarse: mismo texto, paso por paso.
    const css = sinCR(readFileSync('src/index.css', 'utf8'));
    const espejo = new Map(
      [...css.matchAll(/--altura-(sm|md|lg|xl)-(cercana|lejana):\s*([^;]+);/g)].map(
        (m) => [`${m[1]}-${m[2]}`, m[3].trim()] as const,
      ),
    );
    expect(espejo.size).toBe(8);
    for (const paso of PASOS) {
      expect(espejo.get(`${paso}-cercana`), `--altura-${paso}-cercana`).toBe(CERCANA[paso]);
      expect(espejo.get(`${paso}-lejana`), `--altura-${paso}-lejana`).toBe(LEJANA[paso]);
    }
    // El espejo también lleva la caída sola, sin pigmento: es lo único que puede
    // pedir un CSS inyectado (el banner de la PWA), que no importa el tema y pone
    // sólo su color. Misma geometría que la capa lejana, verificada texto a texto.
    const caida = new Map(
      [...css.matchAll(/--caida-(sm|md|lg|xl):\s*([^;]+);/g)].map(
        (m) => [m[1], m[2].trim()] as const,
      ),
    );
    expect([...caida.keys()].sort()).toEqual([...PASOS].sort());
    for (const paso of PASOS) {
      const geometria = caida.get(paso) ?? '';
      expect(LEJANA[paso].startsWith(`${geometria} `), `--caida-${paso} ≠ ${LEJANA[paso]}`).toBe(true);
    }
  });

  it('la vara de la altura pesca capas y respeta halos, aristas y espejos', () => {
    // Positivos: la caída suelta, en los dos idiomas.
    expect(alturasSueltas("boxShadow: '0 12px 34px rgba(0,0,0,.38)'")).toEqual(['0 12px 34px']);
    expect(alturasSueltas('  box-shadow: 0 8px 28px rgba(0,0,0,0.4);')).toEqual(['0 8px 28px']);
    // Negativos que hacen la vara. El halo con offsets ceros es luz, y lo cobra la
    // vara anterior — si las dos redes lo pescaran, un paso cambiaría de lado solo.
    expect(alturasSueltas("boxShadow: '0 0 16px gold'")).toEqual([]);
    // Una arista no eleva un cuerpo: es el filo de luz del vidrio.
    expect(alturasSueltas('  box-shadow: 0 12px 34px rgba(0,0,0,.38), inset 0 1px 0 #fff;')).toEqual([
      '0 12px 34px',
    ]);
    expect(alturasSueltas('  box-shadow: inset 0 1px 1px rgba(0,0,0,.2);')).toEqual([]);
    // El espejo CSS es del dueño, no del componente que lo copia.
    expect(alturasSueltas('  --altura-md-lejana:  0 8px 24px rgba(0,0,0,0.35);')).toEqual([]);
    // Un margen con la misma forma tampoco cae: manda la propiedad más cercana.
    expect(alturasSueltas("margin: '0 -16px 12px'")).toEqual([]);
    expect(alturasSueltas('  padding: 0 24px 32px;\n  box-shadow: 0 8px 28px #000;')).toEqual([
      '0 8px 28px',
    ]);
    // Y lo que ya pide la escala no es hallazgo en ningún idioma. Ojo con el
    // negativo de abajo: una capa suelta DENTRO de una plantilla sigue siendo una
    // capa suelta; que el final pida `${LEJANA.md}` no perdona el `0 4px 24px`
    // del principio.
    expect(alturasSueltas('boxShadow: SHADOW.md')).toEqual([]);
    expect(alturasSueltas('boxShadow: `0 4px 24px ${c}, ${LEJANA.md}`')).toEqual(['0 4px 24px']);
    expect(alturasSueltas('boxShadow: `${SHADOW.md}, 0 0 ${HALO.ascua}px ${c}22`')).toEqual([]);
    expect(alturasSueltas('  box-shadow: var(--altura-md);')).toEqual([]);
  });
});
