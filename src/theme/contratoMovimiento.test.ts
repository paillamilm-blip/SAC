// theme/contratoMovimiento.test.ts
// El paso 4 del estándar asistente: una sola familia de movimiento.
//
// La app llegó a tener 51 @keyframes declarados, cuatro nombres distintos para
// "gira" y nueve para "aparece", y dos definiciones DIFERENTES del mismo nombre
// (la hoja de estilos y el inyector de runtime ganaban por orden de montaje).
// Este contrato cierra la puerta:
//   1. Ningún @keyframes se declara fuera de index.css (un solo sitio).
//   2. Ningún @keyframes se declara dos veces.
//   3. Nadie anima `width`/`height`/`top`/`left` (propiedades de layout) salvo
//      la excepción documentada.
//   4. Toda animación que se pide por nombre existe en algún lado.
//
// El mapa radial (`src/features/mapa/**`) está fuera de contrato, pero no por
// ser un port de nadie: es el único lugar de la app que anima trazado de líneas
// (stroke-dash) y órbita, dos gestos que no pertenecen a la familia de la
// interfaz. La excepción está documentada también en la cabecera de mapa.css.
//
// OJO CRLF: el checkout viene con \r\n (core.autocrlf); se quita antes de barrer.
import { it, expect } from 'vitest';
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

const TODO = caminar('src').filter((r) => TEXTO.test(r) && !/\.test\.tsx?$/.test(r));
const SISTEMA = TODO.filter((r) => !esMapa(r));

/** El comentario de una línea no es código: los glifos del texto no cuentan. */
const sinComentarios = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, '');

// ── 1 · La familia vive en un solo archivo ────────────────────────────────
// Se exige CUALQUIER keyframe, no solo los que empiezan con `omi-`: así no hay
// forma de colar un gesto privado con un nombre de fantasía (fue exactamente lo
// que vivió la barra viva durante un mes: cuatro keyframes propios inyectados en
// runtime, invisibles para un guard que miraba solo el prefijo).
it('ningún keyframe se declara fuera de index.css', () => {
  const fuera = SISTEMA.filter((r) => bajo(r) !== 'index.css');
  const hallazgos: string[] = [];
  for (const ruta of fuera) {
    const texto = sinComentarios(sinCR(readFileSync(ruta, 'utf8')));
    for (const m of texto.matchAll(/@keyframes\s+([\w-]+)/g)) {
      hallazgos.push(`${bajo(ruta)}: ${m[1]}`);
    }
  }
  expect(hallazgos).toEqual([]);
});

// ── 2 · Ningún keyframe duplicado ─────────────────────────────────────────
it('ningún keyframe se declara dos veces fuera del mapa', () => {
  const vistos = new Map<string, string>();
  const duplicados: string[] = [];
  for (const ruta of SISTEMA) {
    const texto = sinComentarios(sinCR(readFileSync(ruta, 'utf8')));
    for (const m of texto.matchAll(/@keyframes\s+([\w-]+)/g)) {
      const nombre = m[1];
      if (vistos.has(nombre)) duplicados.push(`${nombre} (${vistos.get(nombre)} y ${bajo(ruta)})`);
      else vistos.set(nombre, bajo(ruta));
    }
  }
  expect(duplicados).toEqual([]);
});

// ── 3 · Nada anima propiedades de layout ──────────────────────────────────
// Un `transition: width` obliga al navegador a recalcular el layout en cada
// frame; el mismo gesto se hace con `transform: scaleX()` y cuesta cero.
//
// DEUDA_ANCHO es la lista de excepciones justificadas. Solo puede achicarse.
const DEUDA_ANCHO = [
  // El núcleo del orbe cambia de tamaño una vez por sesión (al variar el conteo
  // de nodos); escalarlo con transform deformaría el halo que es su identidad.
  'shared/components/GeodesicOrb.tsx',
];

it('ninguna transición anima width, height, top o left', () => {
  const PROHIBIDO = /transition\s*:\s*[^;]*\b(width|height|top|left|margin|padding)\b[^;,]*/;
  const hallazgos: string[] = [];
  for (const ruta of SISTEMA) {
    if (DEUDA_ANCHO.includes(bajo(ruta))) continue;
    const lineas = sinCR(readFileSync(ruta, 'utf8')).split('\n');
    lineas.forEach((linea, i) => {
      if (PROHIBIDO.test(linea) && !/^\s*(\/\/|\*|\/\*)/.test(linea)) {
        hallazgos.push(`${bajo(ruta)}:${i + 1}`);
      }
    });
  }
  expect(hallazgos).toEqual([]);
});

// ── 4 · Todo nombre pedido existe ─────────────────────────────────────────
it('toda animación pedida por nombre corresponde a un keyframe declarado', () => {
  const declarados = new Set<string>();
  for (const ruta of TODO) {
    const texto = sinComentarios(sinCR(readFileSync(ruta, 'utf8')));
    for (const m of texto.matchAll(/@keyframes\s+([\w-]+)/g)) declarados.add(m[1]);
  }
  const huerfanas: string[] = [];
  // La exigencia de una duración después del nombre separa el CSS del resto:
  // `animation: 'Motion / Animación'` en cvAnalyzer.ts es la etiqueta de una
  // habilidad, no un gesto, y sin esa condición el guard la denunciaba.
  for (const ruta of SISTEMA) {
    const texto = sinComentarios(sinCR(readFileSync(ruta, 'utf8')));
    // En el código se pide con cadena literal: `animation: 'giro 1s linear'`.
    for (const m of texto.matchAll(/animation:\s*['"`]([\w-]+)\s+[\d.$]/g)) {
      const nombre = m[1];
      if (nombre !== 'none' && !declarados.has(nombre)) huerfanas.push(`${bajo(ruta)}: ${nombre}`);
    }
    // En la hoja de estilos se pide sin comillas.
    if (ruta.endsWith('.css')) {
      for (const m of texto.matchAll(/animation:\s*([\w-]+)\s+[\d.$]/g)) {
        const nombre = m[1];
        if (nombre !== 'none' && !declarados.has(nombre)) huerfanas.push(`${bajo(ruta)}: ${nombre}`);
      }
    }
  }
  expect(huerfanas).toEqual([]);
});
