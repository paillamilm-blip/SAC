// features/mapa/contratoMapa.test.ts
// B1: el contrato de color del mapa neuronal. Tres afirmaciones de TEXTO CRUDO
// leídas desde el disco (canon del estilo casa: contratoEspejos.test.ts compara
// texto, no comportamiento):
//   1. MAPA_CAT tiene exactamente las 4 categorias del donante y sus hex fijos
//      (nunca el color del usuario).
//   2. El cian de marca viejo (terminado 5cc8ff) no existe en ningun archivo de
//      texto bajo src/. Se nombra por su terminacion porque este archivo cae
//      dentro de su propio barrido: escribir el literal '#' + aqui mismo
//      violaria el contrato.
//   3. Ningun archivo de logica del mapa (src/features/mapa/*.ts*) escribe un
//      hex literal: el pintado viene de tokens y de ROLES. Los JSON de
//      __golden__ y __fixtures__ tampoco llevan hex — llevan roles ("cat:dura",
//      "nodo-hueco", ...), que es lo que el modulo del mapa emite. Hoy solo
//      queda __fixtures__: el golden del donante se jubilo con el port 1:1.
//
// DEROGADO 2026-11-01 (ruling del dueño, plan 2026-10-26 §"La portada es el
// mapa"): la regla D5 —"el mapa no usa el ambar, el mapa es verde"— murió junto
// con el port 1:1 del donante. El mapa entra al tema laboratorio: raiz ambar
// (el oro de la casa, C.gold), blanda ambar, conocimiento verde azulado. Por
// eso el barrido ya no veda el ambar: lo exige, y lo hace contra el token madre
// para que nadie deje el color suelto.
//
// OJO CRLF: en este checkout los archivos vienen con \r\n (core.autocrlf). Todo
// patron con anclas ^/$ o \s de fin de linea se aplica despues de quitar los \r
// (sinCR); ya mordo esta vez en otro test de la casa.
//
// `node:fs` no esta tipado en este repo (no hay @types/node y tsconfig fija
// types=['vite/client']): el expect-error declara esa ausencia. Si alguien
// instala @types/node, tsc dejara de producir el error y el expect-error ruge
// solo — ahi se borra la linea, no se le pone ignore encima.
import { describe, it, expect } from 'vitest';
// @ts-expect-error node:fs existe en runtime (vitest corre en node) pero no tiene tipos en este repo
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { MAPA_CAT } from '../../theme/tokens';

const hex = (terminacion: string): string => `#${terminacion}`;
// El unico proscrito: el cian de marca que la app ya no usa.
const PROHIBIDOS = [hex('5cc8ff')];

const sinCR = (s: string): string => s.replace(/\r/g, '');

// Barrido recursivo "desde src/, saltando node_modules" — en este repo src/ no
// tiene node_modules, pero la consigna del dueno lo pide explicitamente.
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

// El cwd de vitest es la raiz del repo (los 29 archivos base se resuelven igual).
const SRC = 'src';
const TEXTO = /\.(ts|tsx|css|json|md|html)$/;
const archivosSrc = caminar(SRC).filter((r) => TEXTO.test(r));

const archivosMapa = caminar('src/features/mapa').filter(
  (r) => !r.includes('__fixtures__') && /\.tsx?$/.test(r),
);

// La muestra etiquetada con la que se pinta la app sin sesion. El golden del
// donante (__golden__/mapa-8-brechas.json) se jubilo el 2026-11-01 junto con el
// port 1:1: el radial de la Cabina es el dibujo propio y su contrato es
// mapaLayout.test.ts, no un volcado de otra app.
const jsonDeReferencia = ['src/features/mapa/__fixtures__/analisis-donante.json'];

// Un hex literal: '#' + 3/4/6/8 digitos-hex con borde no-hex despues. 'url(#brillo)'
// no pega porque 'r','i','l','o' no son hex; '#a' suelto tampoco (minimo 3).
const HEX_LITERAL = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;

const leer = (ruta: string): string => readFileSync(ruta, 'utf8');

describe('MAPA_CAT: los 4 colores fijos del mapa, nunca el color del usuario', () => {
  it('tiene exactamente las 4 categorias del donante', () => {
    expect(Object.keys(MAPA_CAT).sort()).toEqual(['blanda', 'conocimiento', 'credencial', 'dura']);
  });

  it('fija los hex del tema laboratorio (raiz y blanda en el ambar de la casa)', () => {
    expect(MAPA_CAT.dura).toBe(hex('6aa9ff'));
    expect(MAPA_CAT.blanda).toBe(hex('f2b134'));
    expect(MAPA_CAT.conocimiento).toBe(hex('3ddc97'));
    expect(MAPA_CAT.credencial).toBe(hex('c084fc'));
  });

  it('blanda y conocimiento apuntan al token madre, no a un clon con deriva', () => {
    const tokensRaw = leer('src/theme/tokens.ts');
    expect(sinCR(tokensRaw)).toMatch(/blanda:\s*C\.gold\b/);
    expect(sinCR(tokensRaw)).toMatch(/conocimiento:\s*C\.green\b/);
  });

  it('la raiz dorada se pinta con el token del ambar, no con un hex suelto', () => {
    const cssRaw = sinCR(leer('src/features/mapa/mapa.css'));
    expect(cssRaw).toMatch(/\[data-rol-fill="raiz"\]\s*\{\s*fill:\s*var\(--gold\)/);
  });
});

describe('el cian de marca jubilado no existe bajo src/', () => {
  it('el barrido encontro archivos suficientes para ser creible', () => {
    expect(archivosSrc.length).toBeGreaterThan(50);
    expect(archivosSrc.some((r) => r.endsWith('index.css')), 'el barrido debe cubrir src/index.css').toBe(true);
  });

  for (const veda of PROHIBIDOS) {
    it(`ningun archivo contiene ${veda}`, () => {
      const culpables = archivosSrc
        .filter((ruta) => leer(ruta).includes(veda))
        .map((ruta) => ruta.replace(/\\/g, '/'));
      expect(culpables, `el hex prohibido sigue vivo en: ${culpables.join(', ')}`).toEqual([]);
    });
  }
});

describe('cero hex literales en la logica del mapa (el color viene de roles/tokens)', () => {
  it('cada src/features/mapa/*.ts* esta libre de hex', () => {
    expect(archivosMapa.length).toBeGreaterThanOrEqual(1);
    for (const ruta of archivosMapa) {
      const encontrados = sinCR(leer(ruta)).match(HEX_LITERAL) ?? [];
      expect(encontrados, `${ruta} pinta con hex literales: ${encontrados.join(', ')}`).toEqual([]);
    }
  });

  it('el golden y los fixtures tampoco traen hex: traen ROLES', () => {
    for (const ruta of jsonDeReferencia) {
      expect(archivosSrc.includes(ruta), `${ruta} deberia estar bajo src/`).toBe(true);
      const encontrados = sinCR(leer(ruta)).match(HEX_LITERAL) ?? [];
      expect(
        encontrados,
        `${ruta} deberia llevar roles (cat:*, nodo-hueco...), no hex: ${encontrados.join(', ')}`,
      ).toEqual([]);
    }
  });
});
