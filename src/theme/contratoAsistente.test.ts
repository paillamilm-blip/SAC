// theme/contratoAsistente.test.ts
// El estándar asistente (DESIGN.md) es una promesa, así que se vela como el
// contrato del mapa: texto crudo leído desde el disco. Cinco afirmaciones:
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
//
// OJO CRLF: el checkout viene con \r\n (core.autocrlf); se quita antes de barrer.
import { describe, it, expect } from 'vitest';
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
const CRUDA = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[0-9]/;

// El lienzo 2D y la paleta del PNG descargable tienen un solo dueño.
const UN_DIBUJANTE = 'features/gemelo/services/credencialCanvas.ts';
const NAVY_PNG = new RegExp(`#04${'122a'}`, 'i');

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
});
