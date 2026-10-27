// features/mapa/MapaCapacidades.test.tsx
// B3: el componente pinta EXACTAMENTE lo que construirMapa() (y por tanto el
// golden) dice. Este test no prueba geometría (eso ya lo hace mapaLayout.test.ts
// contra el golden byte a byte): prueba la capa de pintado — que cada `d`, cada
// cx/cy/r, cada etiqueta, cada <title>, cada delay y cada ROL de color del golden
// termina en el DOM en el orden del donante.
//
// Convención de roles (Invariante 3): el componente no conoce hex. Pega el rol
// del golden en `data-rol-stroke` / `data-rol-fill` y mapa.css traduce el rol a
// la CSS var. Acá se verifica que el rol del golden llegue literal al elemento.
//
// Las fechas del camino se formatean con Intl(es-CL) igual que el donante; el
// golden congeló el ISO, no la fecha (depende de la zona horaria del ejecutor),
// así que el test recomputa el mismo formato sobre el mismo ISO.
// @ts-expect-error node:fs no tiene tipos en este repo (ver contratoMapa.test.ts)
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BrechaDeMapa } from './mapaLayout';
import MapaCapacidades from './MapaCapacidades';

const leerJson = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf8'));

const fixture = leerJson('src/features/mapa/__fixtures__/analisis-donante.json');
const golden = leerJson('src/features/mapa/__golden__/mapa-8-brechas.json');
for (const k of ['_fuente', '_nota']) delete golden[k];

afterEach(cleanup);

type Props = { ocupacion: string; brechas: BrechaDeMapa[]; modo: 'naciendo' | 'vivo'; recienId?: string | null };

const renderMapa = (props: Props) => render(<MapaCapacidades {...props} />).container;
const renderNaciendo = (recienId?: string | null) =>
  renderMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas, modo: 'naciendo', recienId });

const del = (el: Element | null): string => (el as HTMLElement).style.animationDelay;
const textoNormalizado = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

describe('MapaCapacidades (naciendo): el SVG es el golden pintado', () => {
  it('el svg lleva viewBox, role=img y el aria-label literal del golden', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe(`0 0 ${golden.geometria.W} ${golden.geometria.H}`);
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe(golden.ariaLabel);
  });

  it('los 14 trazos: cada d, su delay y su rol de stroke, en orden del donante', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    // Orden DOM del donante: 4 raiz→cat, 8 cat→brecha (grupo aristas) y el
    // trazo del logro (grupo logros, último). El camino vive aparte (clase
    // mapa-camino) y el check no es trazo.
    const trazos = Array.from(svg.querySelectorAll('path.mapa-trazo'));
    const esperados = [
      ...golden.aristasRaizCat,
      ...golden.aristasCatBrecha,
      ...golden.logrosRender.map((l: { trazo: { d: string; stroke: string; animationDelay: string } }) => l.trazo),
    ];
    expect(trazos).toHaveLength(13); // 4 raiz→cat + 8 cat→brecha + 1 logro
    expect(trazos.map((p) => p.getAttribute('d'))).toEqual(esperados.map((t) => t.d));
    expect(trazos.map(del)).toEqual(esperados.map((t) => t.animationDelay));
    expect(trazos.map((p) => p.getAttribute('data-rol-stroke'))).toEqual(esperados.map((t) => t.stroke));
    expect(trazos.map((p) => p.getAttribute('pathLength'))).toEqual(esperados.map(() => '1'));
  });

  it('el camino: su d entero, el delay medido (960 ms) y su rol', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const camino = svg.querySelector('path.mapa-camino');
    expect(camino).not.toBeNull();
    expect(camino!.getAttribute('d')).toBe(golden.modelo.camino);
    expect(del(camino)).toBe(`${golden.modelo.caminoDelay}ms`);
    expect(golden.modelo.caminoDelay).toBe(960);
  });

  it('los 8 trazos cat→brecha traen data-apagado como el golden', () => {
    const cb = Array.from(renderNaciendo().querySelectorAll('svg path.mapa-trazo')).slice(4, 12);
    expect(cb.map((p) => p.getAttribute('data-apagado'))).toEqual(
      golden.aristasCatBrecha.map((a: { 'data-apagado': boolean }) => String(a['data-apagado'])),
    );
  });

  it('los 13 círculos del golden (4 cat + 8 brecha + 1 logro) con sus cx/cy/r exactos', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const circulos = Array.from(svg.querySelectorAll('circle'));
    // Orden DOM: 2 órbitas, raíz, 4 cat, por brecha [anillo?, círculo], logro.
    const esperados: [number, number, number][] = [
      [golden.geometria.CX, golden.geometria.CY, golden.geometria.RADIO_CAT],
      [golden.geometria.CX, golden.geometria.CY, golden.geometria.RADIO_BRECHA],
      [golden.geometria.CX, golden.geometria.CY, 46],
      ...golden.modelo.nodosCat.map((nc: { p: { x: number; y: number } }) => [nc.p.x, nc.p.y, 21] as [number, number, number]),
      ...golden.nodosBrechaRender.flatMap((n: { anillo: { cx: number; cy: number; r: number } | null; circulo: { cx: number; cy: number; r: number } }) => {
        const filas: [number, number, number][] = [];
        if (n.anillo) filas.push([n.anillo.cx, n.anillo.cy, n.anillo.r]);
        filas.push([n.circulo.cx, n.circulo.cy, n.circulo.r]);
        return filas;
      }),
      ...golden.logrosRender.map((l: { circulo: { cx: number; cy: number; r: number } }) => [l.circulo.cx, l.circulo.cy, l.circulo.r] as [number, number, number]),
    ];
    const leidos = circulos.map((c) => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy')), Number(c.getAttribute('r'))]);
    expect(circulos).toHaveLength(esperados.length); // 2 órbitas + 1 raíz + 13 del brief
    expect(leidos).toEqual(esperados);

    // Los 13 "de verdad" (sin órbitas ni raíz) son los del brief: 4+8+1.
    const nodos = circulos.slice(3).filter((c) => !c.classList.contains('mapa-anillo'));
    expect(nodos).toHaveLength(13);
  });

  it('los rellenos y bordes de los nodos llegan con el ROL del golden, no con hex', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    // 4 nodos de categoría: hueco por dentro, color de categoría por borde.
    const catCirculos = Array.from(svg.querySelectorAll('circle')).slice(3, 7);
    expect(catCirculos.map((c) => c.getAttribute('data-rol-fill'))).toEqual(golden.modelo.nodosCat.map(() => 'nodo-hueco'));
    expect(catCirculos.map((c) => c.getAttribute('data-rol-stroke'))).toEqual(golden.modelo.nodosCat.map((nc: { cat: string }) => `cat:${nc.cat}`));

    // Brechas: fill/stroke/strokeWidth/filter por nodo, tal como los emitió el golden.
    const grupos = Array.from(svg.querySelectorAll('g[class*="mapa-brecha-"]'));
    expect(grupos).toHaveLength(8);
    expect(grupos.map((g) => g.getAttribute('data-id-brecha'))).toEqual(golden.nodosBrechaRender.map((n: { id: string }) => n.id));
    expect(grupos.map((g) => textoNormalizado(g.querySelector(':scope > title')))).toEqual(
      golden.nodosBrechaRender.map((n: { tooltip: string }) => n.tooltip),
    );
    const circulosBrecha = grupos.map((g) => g.querySelector(':scope > circle[data-rol-fill]')!);
    expect(circulosBrecha.map((c) => c.getAttribute('data-rol-fill'))).toEqual(golden.nodosBrechaRender.map((n: { circulo: { fill: string } }) => n.circulo.fill));
    expect(circulosBrecha.map((c) => c.getAttribute('data-rol-stroke'))).toEqual(golden.nodosBrechaRender.map((n: { circulo: { stroke: string } }) => n.circulo.stroke));
    expect(circulosBrecha.map((c) => c.getAttribute('stroke-width'))).toEqual(golden.nodosBrechaRender.map((n: { circulo: { strokeWidth: number } }) => String(n.circulo.strokeWidth)));
    expect(circulosBrecha.map((c) => c.getAttribute('filter'))).toEqual(golden.nodosBrechaRender.map((n: { circulo: { filter: string | null } }) => n.circulo.filter));
    // El anillo del dominado y su rol.
    const anillos = svg.querySelectorAll('circle.mapa-anillo');
    expect(anillos).toHaveLength(golden.nodosBrechaRender.filter((n: { anillo: unknown }) => n.anillo).length);
    expect(Array.from(anillos).map((a) => a.getAttribute('data-rol-stroke'))).toEqual(
      golden.nodosBrechaRender.filter((n: { anillo: unknown }) => n.anillo).map((n: { anillo: { stroke: string } }) => n.anillo.stroke),
    );
    // El check sobre el nodo dominado: d del golden y rol tinta.
    const checks = Array.from(svg.querySelectorAll('g[class*="mapa-brecha-"] > path'));
    expect(checks).toHaveLength(golden.nodosBrechaRender.filter((n: { check: unknown }) => n.check).length);
    expect(checks.map((p) => p.getAttribute('d'))).toEqual(golden.nodosBrechaRender.filter((n: { check: unknown }) => n.check).map((n: { check: { d: string } }) => n.check.d));
    expect(checks.map((p) => p.getAttribute('data-rol-stroke'))).toEqual(
      golden.nodosBrechaRender.filter((n: { check: unknown }) => n.check).map(() => 'tinta-sobre-nodo'),
    );
  });

  it('las 4 etiquetas de categoría: texto literal en mayúsculas, posición, anchor y delay del golden', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const etiquetas = Array.from(svg.querySelectorAll('text.mapa-cat-texto'));
    expect(etiquetas).toHaveLength(4);
    expect(etiquetas.map((t) => t.textContent)).toEqual(golden.labelsCat.map((l: { texto: string }) => l.texto));
    expect(etiquetas.map((t) => [Number(t.getAttribute('x')), Number(t.getAttribute('y'))])).toEqual(
      golden.labelsCat.map((l: { x: number; y: number }) => [l.x, l.y]),
    );
    expect(etiquetas.map((t) => t.getAttribute('text-anchor'))).toEqual(golden.labelsCat.map((l: { anchor: string }) => l.anchor));
    expect(etiquetas.map(del)).toEqual(golden.labelsCat.map((l: { animationDelay: string }) => l.animationDelay));
    // El fill de la etiqueta es el ROL de su categoría (Invariante 3).
    expect(etiquetas.map((t) => t.getAttribute('data-rol-fill'))).toEqual(golden.labelsCat.map((l: { cat: string }) => `cat:${l.cat}`));
  });

  it('los 9 <title>: 8 brechas + 1 logro, literales del golden', () => {
    const titulos = Array.from(renderNaciendo().querySelectorAll('svg title')).map((t) => t.textContent);
    const esperados = [
      ...golden.nodosBrechaRender.map((n: { tooltip: string }) => n.tooltip),
      ...golden.logrosRender.map((l: { tooltip: string }) => l.tooltip),
    ];
    expect(titulos).toHaveLength(9);
    expect(titulos).toEqual(esperados);
  });

  it('los nodos y grupos traen la clase y el animationDelay del golden (stagger 45 ms resuelto por mapaLayout)', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const gruposBrecha = Array.from(svg.querySelectorAll('g[class*="mapa-brecha-"]'));
    expect(gruposBrecha.map((g) => g.getAttribute('class'))).toEqual(golden.nodosBrechaRender.map((n: { clase: string }) => n.clase));
    expect(gruposBrecha.map(del)).toEqual(golden.nodosBrechaRender.map((n: { animationDelay: string }) => n.animationDelay));
    // Raíz (delay 0 del golden) y nodos de categoría.
    expect(del(svg.querySelector('g.mapa-nodo'))).toBe(`${golden.modelo.raizDelay}ms`);
    const catGrupos = gruposBrecha.length === 8 ? Array.from(svg.querySelectorAll('circle')).slice(3, 7) : [];
    expect(catGrupos.map((c) => del(c.parentElement))).toEqual(golden.modelo.nodosCat.map((nc: { delay: number }) => `${nc.delay}ms`));
    // Logro: grupo y trazo con el mismo delay del golden.
    const logro = svg.querySelector('g[data-id-logro]');
    expect(logro).not.toBeNull();
    expect(del(logro)).toBe(golden.logrosRender[0].animationDelay);
    expect(logro!.querySelector('path.mapa-trazo-logro') && del(logro!.querySelector('path')!)).toBe(golden.logrosRender[0].trazo.animationDelay);
    expect(logro!.querySelector('circle')!.getAttribute('data-rol-fill')).toBe(golden.logrosRender[0].circulo.fill);
  });

  it('la raíz parte la ocupación en 2 líneas de 13 chars y TRUNCA como el golden (deuda portada, no "mejorada")', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const lineas = Array.from(svg.querySelectorAll('text.mapa-raiz-texto')).map((t) => t.textContent);
    expect(lineas).toEqual(golden.lineasOcupacion); // ["Profesional", "con"]
    // Se porta el defecto: "experiencia media (muestra)" NO llega al mapa.
    expect(lineas.join(' ')).not.toContain('experiencia');
  });

  it('el botón "Reproducir el nacimiento" sigue (remontaje permitido en naciendo)', () => {
    const cont = renderNaciendo();
    const boton = cont.querySelector('.mapa-cabecera button');
    expect(boton).not.toBeNull();
    expect(textoNormalizado(boton)).toBe('Reproducir el nacimiento');
  });

  it('recienId en naciendo agrega el pulso del donante al nodo exacto', () => {
    const svg = renderNaciendo(golden.nodosBrechaRender[1].id).querySelector('svg')!;
    const conPulso = Array.from(svg.querySelectorAll('g.pulso'));
    expect(conPulso).toHaveLength(1);
    expect(conPulso[0].getAttribute('class')).toBe(`${golden.nodosBrechaRender[1].clase} pulso`);
  });
});

describe('MapaCapacidades: leyenda y camino literales del golden', () => {
  it('los 8 chips de la leyenda (4 categorías + 4 estados) con color por rol', () => {
    const cont = renderNaciendo();
    const chips = Array.from(cont.querySelectorAll('.mapa-leyenda .mapa-chip'));
    expect(chips).toHaveLength(8);
    expect(chips.map(textoNormalizado)).toEqual(golden.leyenda.map((c: { texto: string }) => c.texto));
    // Los 4 chips de categoría pintan con el rol del golden; los 4 de estado,
    // con data-estado (color NUNCA único portador: el texto está).
    expect(chips.slice(0, 4).map((c) => c.querySelector('i')?.getAttribute('data-rol-stroke'))).toEqual(
      golden.leyenda.slice(0, 4).map((c: { color: string }) => c.color),
    );
    expect(chips.slice(4).map((c) => c.querySelector('i')?.getAttribute('data-estado'))).toEqual([
      'pendiente', 'confirmada', 'dominada', 'rechazada',
    ]);
    expect(cont.querySelector('.mapa-leyenda')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('los 4 pasos del camino: texto, número, tipo y fecha Intl(es-CL) sobre el ISO del golden', () => {
    const cont = renderNaciendo();
    const pasos = Array.from(cont.querySelectorAll('ol.camino-lista li.camino-paso'));
    expect(pasos).toHaveLength(4);
    expect(pasos.map(textoNormalizado2)).toEqual(golden.caminoLista.map((p: { texto: string }) => p.texto));
    expect(pasos.map((li) => textoNormalizado(li.querySelector('.camino-num')))).toEqual(golden.caminoLista.map((p: { numero: number }) => String(p.numero)));
    expect(pasos.map((li) => li.querySelector('.camino-punto')?.getAttribute('data-tipo'))).toEqual(
      golden.caminoLista.map((p: { tipo: string }) => p.tipo),
    );
    expect(pasos.map((li) => textoNormalizado(li.querySelector('.camino-fecha')))).toEqual(
      golden.caminoLista.map((p: { iso: string }) => fecha(p.iso)),
    );
  });

  it('sin eventos no hay camino dibujado y aparece el texto literal caminoVacio del golden', () => {
    const brechas: BrechaDeMapa[] = [
      { id: 'p1', categoria: 'dura', titulo: 'Pendiente eterno', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null },
    ];
    const cont = renderMapa({ ocupacion: 'Ocupacion de prueba', brechas, modo: 'naciendo' });
    expect(cont.querySelector('path.mapa-camino')).toBeNull();
    expect(cont.querySelector('ol.camino-lista')).toBeNull();
    expect(cont.querySelector('.camino-vacio')!.textContent).toBe(golden.caminoVacio);
  });
});

describe('MapaCapacidades (vivo): nada de remontaje por realtime', () => {
  it('todos los delays pasan a 0 ms y el recienId hace brillar (no nacer con pulso)', () => {
    const recien = golden.nodosBrechaRender[2].id;
    const cont = renderMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas, modo: 'vivo', recienId: recien });
    const conDelay = Array.from(cont.querySelectorAll<HTMLElement>('[style*="animation-delay"]'));
    expect(conDelay.length).toBeGreaterThan(20); // trazos + nodos + labels + camino
    expect(conDelay.map((el) => el.style.animationDelay)).toEqual(conDelay.map(() => '0ms'));
    const pulso = cont.querySelector('g.pulso');
    expect(pulso).toBeNull();
    const brillar = cont.querySelector('g.mapa-brillar');
    expect(brillar).not.toBeNull();
    expect(brillar!.getAttribute('data-id-brecha')).toBe(recien);
    expect(brillar!.getAttribute('class')).toContain(golden.nodosBrechaRender[2].clase);
  });
});

// texto de un li completo sin los puntos/fechas: toma solo .camino-texto
function textoNormalizado2(li: Element): string {
  return (li.querySelector('.camino-texto')?.textContent ?? '').replace(/\s+/g, ' ').trim();
}
