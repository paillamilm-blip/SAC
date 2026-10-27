// features/mapa/mapaLayout.test.ts
// B2: la geometria pura del mapa neuronal. El oraculo de fidelidad es el golden
// congelado (__golden__/mapa-8-brechas.json), generado por scripts/oracle-donante.mjs
// ejecutando el algoritmo del DONANTE sobre su propio data/db.json. La comparacion
// es JSON.stringify COMPLETO (no un subconjunto de campos elegido a mano): la
// geometria y los tiempos no se negocian, y un campo fuera de contrato es tan
// culpable como uno dentro.
//
// Unica licencia: donde el donante pintaba hex, el golden consigna ROLES
// ("cat:dura", "cat:dura+alfa", "nodo-hueco", "borde-pendiente",
// "borde-rechazada", "tinta-sobre-nodo") y el modulo del port emite esos roles
// literales — el modulo no conoce ningun hex (lo fija contratoMapa.test.ts).
import { describe, it, expect } from 'vitest';
// @ts-expect-error node:fs no tiene tipos en este repo (ver contratoMapa.test.ts)
import { readFileSync } from 'node:fs';
import { construirMapa } from './mapaLayout';

const leerJson = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf8'));

const fixture = leerJson('src/features/mapa/__fixtures__/analisis-donante.json');
const golden = leerJson('src/features/mapa/__golden__/mapa-8-brechas.json');

// _fuente y _nota son metadata del oraculo, no modelo de render. Se borran del
// esperado, no del objeto del port (que nunca los produce).
const metaKeys = ['_fuente', '_nota'];
expect(Object.keys(golden).filter((k: string) => metaKeys.includes(k))).toHaveLength(2);
for (const k of metaKeys) delete golden[k];

describe('construirMapa reproduce el golden entero', () => {
  it('JSON.stringify completo, clave por clave y en orden', () => {
    const salida = construirMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas });
    expect(JSON.stringify(salida)).toBe(JSON.stringify(golden));
  });
});

describe('comportamiento del donante que el golden no puede forzar solo', () => {
  it('rechazada manda sobre todo: estado, borde y arista apagada', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [
        {
          id: 'r1', categoria: 'dura', titulo: 'T', severidad: 'baja',
          veredicto: 'rechazada', veredictoEn: null, dominadaEn: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const nodo = salida.nodosBrechaRender[0];
    // Precedencia literal del donante (L287): `estado` dice rechazada ANTES que
    // dominada. Pero los atributos del circulo no usan el estado: el fill y el
    // grosor del donante cuelgan de los booleanos crudos (dominada = hay
    // dominadaEn), y solo el borde y la arista obedecen el rechazo. Heredado
    // tal cual, hybridos inclusive.
    expect(nodo.clase).toBe('mapa-nodo mapa-brecha mapa-brecha-rechazada');
    expect(nodo.circulo.fill).toBe('cat:dura');
    expect(nodo.circulo.stroke).toBe('borde-rechazada');
    expect(nodo.circulo.strokeWidth).toBe(2.4);
    expect(nodo.circulo.filter).toBe('url(#brillo)');
    expect(nodo.anillo).not.toBeNull();
    expect(nodo.check).not.toBeNull();
    expect(salida.aristasCatBrecha[0]['data-apagado']).toBe(true);
    expect(salida.ariaLabel).toBe(
      'Mapa de capacidades de X: 1 brechas detectadas, 0 reconocidas, 1 dominadas y 1 descartadas.',
    );
  });

  it('las categorias sin brechas no se dibujan y el angulo usa n = cats con brechas', () => {
    const dura = { id: 'a', categoria: 'dura', titulo: 'D', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null } as const;
    const blanda = { id: 'b', categoria: 'blanda', titulo: 'B', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null } as const;
    // ORDEN manda (no el orden del input): dura i=0, blanda i=1. Con dos
    // categorias con brechas, n=2 → angCat de blanda = -90 + 1*(360/2) = 90 →
    // polar(170, 90) = abajo: (490, 530). Las categorias sin brechas
    // (conocimiento, credencial) no se dibujan.
    const salida = construirMapa({ ocupacion: 'X', brechas: [blanda, dura] });
    expect(salida.modelo.nodosCat.map((nc) => nc.cat)).toEqual(['dura', 'blanda']);
    expect(salida.modelo.nodosCat[1].p).toEqual({ x: 490, y: 530 });
    expect(salida.aristasRaizCat.map((a) => a.key)).toEqual(['rc-dura', 'rc-blanda']);
  });

  it('la semilla de la curva cat→brecha es el indice GLOBAL de la brecha', () => {
    // Dos brechas en la MISMA categoria, indices globales 0 y 1 → offsets de
    // signo opuesto. Con semilla intra-categoria ambas usarian 0 y los puntos
    // de control de las dos curvas serian espejeables-iguales de signo.
    const b1 = { id: 'g1', categoria: 'dura', titulo: 'U', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null } as const;
    const b2 = { id: 'g2', categoria: 'dura', titulo: 'V', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null } as const;
    const salida = construirMapa({ ocupacion: 'X', brechas: [b1, b2] });
    const controlQ = (d: string) => d.split(' Q ')[1].split(' ')[0];
    expect(controlQ(salida.aristasCatBrecha[0].d)).not.toBe(controlQ(salida.aristasCatBrecha[1].d));
  });

  it('sin eventos no hay camino y el aria-label canta ceros', () => {
    const salida = construirMapa({ ocupacion: 'Sin brechas aqui', brechas: [] });
    expect(salida.modelo.camino).toBe('');
    expect(salida.modelo.caminoDelay).toBe(195); // (1 paso de raiz) * 45 + 150
    expect(salida.caminoLista).toEqual([]);
    // El envoltorio del donante corta por palabras a >13: 'Sin brechas' (11)
    // sigue juntando y 'Sin brechas aqui' (16) rompe → ['Sin brechas', 'aqui'].
    expect(salida.lineasOcupacion).toEqual(['Sin brechas', 'aqui']);
    expect(salida.ariaLabel).toBe(
      'Mapa de capacidades de Sin brechas aqui: 0 brechas detectadas, 0 reconocidas, 0 dominadas y 0 descartadas.',
    );
  });
});
