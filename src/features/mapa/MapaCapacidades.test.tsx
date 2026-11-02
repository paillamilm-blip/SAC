// features/mapa/MapaCapacidades.test.tsx
// B3: el componente pinta EXACTAMENTE lo que construirMapa() dice. La geometría
// la vigila mapaLayout.test.ts; acá se prueba la capa de pintado: que cada
// cx/cy/r, cada etiqueta, cada <title>, cada delay y cada ROL de color del modelo
// termine en el DOM — y que el componente sea incapaz de inventarse un color.
//
// Convención de roles (Invariante 3): el componente no conoce hex. Pega el rol
// del modelo en `data-rol-stroke` / `data-rol-fill` y mapa.css lo traduce a
// token. Acá se verifica que el rol llegue literal y que ningún atributo traiga
// un color.
//
// Las fechas del camino se formatean con Intl(es-CL); el modelo entrega el ISO,
// así que el test recomputa el mismo formato sobre ese mismo ISO.
// @ts-expect-error node:fs no tiene tipos en este repo (ver contratoMapa.test.ts)
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { construirMapa, type BrechaDeMapa } from './mapaLayout';
import MapaCapacidades from './MapaCapacidades';

const fixture = JSON.parse(readFileSync('src/features/mapa/__fixtures__/analisis-donante.json', 'utf8')) as {
  ocupacion: string;
  brechas: BrechaDeMapa[];
};

const modelo = construirMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas });

afterEach(cleanup);

type Props = {
  ocupacion: string;
  brechas: BrechaDeMapa[];
  modo: 'naciendo' | 'vivo';
  recienId?: string | null;
  orbe?: boolean;
  escena?: boolean;
};

const renderMapa = (props: Props) => render(<MapaCapacidades {...props} />).container;
const renderNaciendo = (recienId?: string | null) =>
  renderMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas, modo: 'naciendo', recienId });

const del = (el: Element | null): string => (el as HTMLElement).style.animationDelay;
const norm = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

describe('el lienzo: role=img y el resumen hablado del modelo', () => {
  it('viewBox propio de la Cabina, role=img y aria-label literal', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    expect(svg.getAttribute('viewBox')).toBe('-56 0 772 640');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(modelo.ariaLabel);
  });

  it('un anillo guía por cada radio que el modelo decidió dibujar', () => {
    const anillos = Array.from(renderNaciendo().querySelectorAll('g.mapa-anillos circle.mapa-guia')).map((c) => c.getAttribute('data-r'));
    expect(anillos).toEqual(['105', '195', '272']);
    // Sin nodos reconocidos, el anillo del medio no existe en el DOM.
    const soloBrechas = renderMapa({
      ocupacion: 'X',
      brechas: [{ id: 'p', categoria: 'dura', titulo: 'P', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null }],
      modo: 'naciendo',
    });
    expect(Array.from(soloBrechas.querySelectorAll('g.mapa-anillos circle.mapa-guia')).map((c) => c.getAttribute('data-r'))).toEqual(['105', '272']);
  });

  it('los anillos del nodo dominado (órbita) son círculos extra sin data-r', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const orbitas = svg.querySelectorAll('g.mapa-orbita circle.mapa-guia');
    expect(orbitas).toHaveLength(1);
    expect(orbitas[0].getAttribute('r')).toBe('32');
  });
});

describe('las aristas se dibujan con el largo del modelo en una CSS var', () => {
  it('12 líneas: 4 raíz→categoría y 8 categoría→nodo, en ese orden', () => {
    const trazos = Array.from(renderNaciendo().querySelectorAll<HTMLElement>('line.mapa-arista'));
    expect(trazos).toHaveLength(12);
    expect(trazos.map((l) => l.getAttribute('data-rol-stroke'))).toEqual([
      ...modelo.aristasRaizCat.map(() => 'raiz'),
      ...modelo.aristasCatNodo.map((a) => a.rol),
    ]);
    expect(trazos.map((l) => l.style.getPropertyValue('--largo'))).toEqual(
      trazos.map((_, i) => String(i < 4 ? modelo.aristasRaizCat[i].largo : modelo.aristasCatNodo[i - 4].largo)),
    );
    expect(trazos.map((l) => l.getAttribute('x1'))).toEqual(
      trazos.map((_, i) => String(i < 4 ? 320 : modelo.aristasCatNodo[i - 4].x1)),
    );
  });

  it('cada arista a un nodo lleva el id de su brecha y su delay del stagger', () => {
    const trazos = Array.from(renderNaciendo().querySelectorAll<HTMLElement>('line.mapa-arista'));
    expect(trazos.slice(4).map((l) => l.getAttribute('data-id-brecha'))).toEqual(modelo.aristasCatNodo.map((a) => a.id));
    expect(trazos.map(del)).toEqual([
      ...modelo.aristasRaizCat.map((a) => a.delay),
      ...modelo.aristasCatNodo.map((a) => a.delay),
    ]);
  });
});

// La línea blanca cronológica del brief. La geometría y el reparto de tiempo los
// vigila mapaLayout.test.ts; acá se prueba que el componente los pega literales y
// que la tinta del rol está en el CSS.
describe('el camino blanco: un <line> por tramo y nada calculado acá', () => {
  it('rol, largo, duración, delay y coordenadas viajan exactos desde el modelo', () => {
    const trazos = Array.from(renderNaciendo().querySelectorAll<HTMLElement>('g.mapa-camino-caja > line'));
    expect(trazos).toHaveLength(modelo.caminoTrazos.length);
    expect(trazos.map((l) => l.getAttribute('data-rol-stroke'))).toEqual(modelo.caminoTrazos.map((t) => t.rol));
    expect(trazos.map((l) => l.style.getPropertyValue('--largo'))).toEqual(
      modelo.caminoTrazos.map((t) => String(t.largo)),
    );
    expect(trazos.map((l) => l.style.getPropertyValue('--d-camino'))).toEqual(modelo.caminoTrazos.map((t) => t.dur));
    expect(trazos.map(del)).toEqual(modelo.caminoTrazos.map((t) => t.delay));
    expect(trazos.map((l) => `${l.getAttribute('x1')},${l.getAttribute('y1')}`)).toEqual(
      modelo.caminoTrazos.map((t) => `${t.x1},${t.y1}`),
    );
  });

  it('el trazo está fuera de la lectura: la lista fechada de abajo ya lo cuenta', () => {
    expect(renderNaciendo().querySelector('g.mapa-camino-caja')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('mapa.css traduce el rol a la tiza de la casa y lo apaga con movimiento reducido', () => {
    const css = readFileSync('src/features/mapa/mapa.css', 'utf8').replace(/\r/g, '');
    expect(css).toMatch(/\[data-rol-stroke="camino"\]\s*\{\s*color:\s*var\(--tiza\)/);
    expect(css).toMatch(/\.mapa-camino\s*\{[^}]*stroke-dashoffset:\s*var\(--largo\)/);
    expect(css).toMatch(/\.mapa-camino\s*\{[^}]*animation:\s*trazar\s+var\(--d-camino/);
    // En movimiento reducido el camino no se anima: llega ya trazado.
    const reduce = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduce).toMatch(/\.mapa-camino\s*\{[^}]*animation:\s*none;[^}]*stroke-dashoffset:\s*0/);
  });
});

describe('la raíz: el disco dorado, su nombre y (opcional) el orbe', () => {
  it('un círculo de radio del modelo, rol "raiz" y el nombre partido en líneas', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const raiz = svg.querySelector('circle.mapa-raiz')!;
    expect(raiz.getAttribute('data-rol-fill')).toBe('raiz');
    expect(raiz.getAttribute('r')).toBe(String(modelo.raiz.r));
    expect(raiz.getAttribute('cx')).toBe('320');
    const lineas = Array.from(svg.querySelectorAll('text.mapa-raiz-nombre')).map((t) => t.textContent);
    expect(lineas).toEqual(modelo.raiz.lineas);
    expect(lineas.every((l) => l !== null && l.length > 0)).toBe(true);
    // Las dos líneas se apilan alrededor del centro: la de arriba antes de 320.
    const ys = Array.from(svg.querySelectorAll('text.mapa-raiz-nombre')).map((t) => Number(t.getAttribute('y')));
    expect(ys).toHaveLength(2);
    expect(ys[0]).toBeLessThan(320);
    expect(ys[1]).toBeGreaterThan(320);
  });

  it('sin `orbe` no hay trama; con `orbe` la trama vive encima de la raíz y es aria-hidden', () => {
    const sin = renderNaciendo().querySelector('g.mapa-orbe');
    expect(sin).toBeNull();

    const cont = renderMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas, modo: 'naciendo', orbe: true });
    const envoltura = cont.querySelector('g.mapa-nace > g[transform]')!;
    expect(envoltura.getAttribute('transform')).toBe('translate(320 320)');
    const orbe = envoltura.querySelector('g.mapa-orbe')!;
    expect(orbe.getAttribute('aria-hidden')).toBe('true');
    // 12 vértices visibles y sus 25 aristas: la malla la dibuja orbGeometry con
    // tramaOrbe(r, 12); acá sólo se comprueba que llega al DOM sin color escrito.
    expect(orbe.querySelectorAll('circle')).toHaveLength(12);
    expect(orbe.querySelectorAll('line')).toHaveLength(25);
    expect(orbe.querySelector('[fill]')).toBeNull();
    expect(orbe.querySelector('[stroke]')).toBeNull();
  });

  it('el botón de remontaje sigue en la cabecera (sólo el clic vuelve a nacer)', () => {
    const boton = renderNaciendo().querySelector('.mapa-cabecera button')!;
    expect(norm(boton)).toBe('Reproducir el nacimiento');
  });
});

describe('los nodos: geometría del modelo, color por rol, cero invento', () => {
  it('8 grupos con su id, su estado y el delay del stagger', () => {
    const grupos = Array.from(renderNaciendo().querySelectorAll('g.mapa-nodo'));
    expect(grupos).toHaveLength(8);
    expect(grupos.map((g) => g.getAttribute('data-id-brecha'))).toEqual(modelo.nodos.map((n) => n.id));
    expect(grupos.map((g) => g.getAttribute('data-estado'))).toEqual(modelo.nodos.map((n) => n.estado));
    expect(grupos.map((g) => g.getAttribute('data-rol-stroke'))).toEqual(modelo.nodos.map((n) => n.rol));
    expect(grupos.map(del)).toEqual(modelo.nodos.map((n) => n.delay));
  });

  it('el disco de cada nodo con su cx/cy/r del modelo', () => {
    const carne = Array.from(renderNaciendo().querySelectorAll('circle.mapa-nodo-carne'));
    expect(carne.map((c) => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')])).toEqual(
      modelo.nodos.map((n) => [String(n.p.x), String(n.p.y), String(n.r)]),
    );
  });

  it('sólo la dominada trae anillo doble y chispa en órbita', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    expect(svg.querySelectorAll('circle.mapa-anillo-doble')).toHaveLength(1);
    expect(svg.querySelectorAll('g.mapa-orbita')).toHaveLength(1);
    const dominada = svg.querySelector('g[data-estado="dominada"]')!;
    const nodo = modelo.nodos.find((n) => n.estado === 'dominada')!;
    expect(dominada.querySelector('circle.mapa-anillo-doble')!.getAttribute('r')).toBe(String(nodo.anilloDoble!.r));
    const chispa = dominada.querySelector('path.mapa-chispa')!;
    expect(chispa.getAttribute('d')).toBe(nodo.logro!.chispa);
    expect(chispa.getAttribute('data-rol-fill')).toBe('logro');
    // La caja invisible de 84 es la que sostiene la órbita.
    const caja = dominada.querySelector('g.mapa-orbita rect')!;
    expect(caja.getAttribute('width')).toBe('84');
    expect(caja.getAttribute('x')).toBe(String(nodo.logro!.caja.x));
  });

  it('sólo la descartada trae tachado', () => {
    const cont = renderMapa({
      ocupacion: 'X',
      brechas: [{ id: 'r', categoria: 'dura', titulo: 'Descartada', severidad: 'media', veredicto: 'rechazada', veredictoEn: null, dominadaEn: null }],
      modo: 'naciendo',
    });
    const t = cont.querySelector('line.mapa-tachado')!;
    const s = construirMapa({
      ocupacion: 'X',
      brechas: [{ id: 'r', categoria: 'dura', titulo: 'Descartada', severidad: 'media', veredicto: 'rechazada', veredictoEn: null, dominadaEn: null }],
    }).nodos[0];
    expect([t.getAttribute('x1'), t.getAttribute('y1'), t.getAttribute('x2'), t.getAttribute('y2')]).toEqual([
      String(s.tachado!.x1), String(s.tachado!.y1), String(s.tachado!.x2), String(s.tachado!.y2),
    ]);
    expect(cont.querySelector('circle.mapa-anillo-doble')).toBeNull();
  });

  it('el título hablado de cada nodo es el tooltip del modelo (estado nunca sólo por color)', () => {
    const titulos = Array.from(renderNaciendo().querySelectorAll('svg g.mapa-nodo > title')).map((t) => t.textContent);
    expect(titulos).toEqual(modelo.nodos.map((n) => n.tooltip));
    // Los 4 títulos de categoría también están, como `<title>` dentro de su disco.
    const cat = Array.from(renderNaciendo().querySelectorAll('circle.mapa-nodo-cat > title')).map((t) => t.textContent);
    expect(cat).toEqual(modelo.categorias.map((c) => c.etiqueta));
  });

  it('las etiquetas de nodo: texto, lado libre del disco y ancla del modelo', () => {
    const textos = Array.from(renderNaciendo().querySelectorAll('text.mapa-nodo-texto'));
    expect(textos.map((t) => t.textContent)).toEqual(modelo.nodos.map((n) => n.etiqueta.texto));
    expect(textos.map((t) => Number(t.getAttribute('x')))).toEqual(modelo.nodos.map((n) => n.etiqueta.x));
    expect(textos.map((t) => t.getAttribute('text-anchor'))).toEqual(modelo.nodos.map((n) => n.etiqueta.anchor));
    expect(textos.map(del)).toEqual(modelo.nodos.map((n) => n.delay));
  });

  it('las 4 categorías: disco de radio 16, rol de su categoría y etiqueta en mayúsculas arriba', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    const discos = Array.from(svg.querySelectorAll('circle.mapa-nodo-cat'));
    expect(discos.map((c) => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')])).toEqual(
      modelo.categorias.map((c) => [String(c.p.x), String(c.p.y), '16']),
    );
    expect(discos.map((c) => c.getAttribute('data-rol-stroke'))).toEqual(modelo.categorias.map((c) => `cat:${c.cat}`));
    const etiquetas = Array.from(svg.querySelectorAll('text.mapa-cat-texto'));
    expect(etiquetas.map((t) => t.textContent)).toEqual(modelo.categorias.map((c) => c.etiqueta));
    expect(etiquetas.map((t) => Number(t.getAttribute('y')))).toEqual(modelo.categorias.map((c) => c.p.y - 24));
    expect(etiquetas.map((t) => t.getAttribute('data-rol-fill'))).toEqual(modelo.categorias.map((c) => `cat:${c.cat}`));
    expect(etiquetas.map(del)).toEqual(modelo.categorias.map((c) => c.delay));
  });

  it('los nodos NO son botones: cero targets de 18 px bajo el estándar de 44', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    expect(svg.querySelectorAll('button').length).toBe(0);
    expect(svg.querySelectorAll('[role="button"]').length).toBe(0);
    expect(svg.querySelectorAll('[tabindex]').length).toBe(0);
  });
});

describe('recienId: naciendo pulsa, vivo sólo brilla', () => {
  it('en naciendo el nodo exacto sale con la clase pulso', () => {
    const id = modelo.nodos[1].id;
    const svg = renderNaciendo(id).querySelector('svg')!;
    const conPulso = Array.from(svg.querySelectorAll('g.pulso'));
    expect(conPulso).toHaveLength(1);
    expect(conPulso[0].getAttribute('data-id-brecha')).toBe(id);
    expect(conPulso[0].getAttribute('class')).toBe('mapa-nodo mapa-nace pulso');
  });

  it('en vivo todo delay pasa a 0 ms y el recién llega con brillo, no con nacimiento', () => {
    const recien = modelo.nodos[2].id;
    const cont = renderMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas, modo: 'vivo', recienId: recien });
    const conDelay = Array.from(cont.querySelectorAll<HTMLElement>('[style*="animation-delay"]'));
    expect(conDelay.length).toBeGreaterThan(20); // aristas + nodos + labels + raíz
    expect(conDelay.map((el) => el.style.animationDelay)).toEqual(conDelay.map(() => '0ms'));
    expect(cont.querySelector('g.pulso')).toBeNull();
    const brillar = cont.querySelector('g.mapa-brillar')!;
    expect(brillar.getAttribute('data-id-brecha')).toBe(recien);
    expect(brillar.getAttribute('class')).toContain('mapa-nodo mapa-nace mapa-brillar');
  });
});

describe('leyenda y camino', () => {
  it('los 8 chips: 4 categorías por rol y 4 estados por data-estado', () => {
    const cont = renderNaciendo();
    const chips = Array.from(cont.querySelectorAll('.mapa-leyenda .mapa-chip'));
    expect(chips).toHaveLength(8);
    expect(chips.map(norm)).toEqual(modelo.leyenda.map((c) => c.texto));
    expect(chips.slice(0, 4).map((c) => c.querySelector('i')?.getAttribute('data-rol-stroke'))).toEqual([
      'cat:dura', 'cat:blanda', 'cat:conocimiento', 'cat:credencial',
    ]);
    expect(chips.slice(4).map((c) => c.querySelector('i')?.getAttribute('data-estado'))).toEqual([
      'pendiente', 'confirmada', 'dominada', 'rechazada',
    ]);
    expect(cont.querySelector('.mapa-leyenda')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('los 4 pasos: número, tipo, fecha Intl(es-CL) sobre el ISO y el título en negrita', () => {
    const cont = renderNaciendo();
    const pasos = Array.from(cont.querySelectorAll('ol.camino-lista li.camino-paso'));
    expect(pasos).toHaveLength(4);
    expect(pasos.map((li) => norm(li.querySelector('.camino-num')))).toEqual(modelo.caminoLista.map((p) => String(p.numero)));
    expect(pasos.map((li) => li.querySelector('.camino-punto')?.getAttribute('data-tipo'))).toEqual(
      modelo.caminoLista.map((p) => p.tipo),
    );
    expect(pasos.map((li) => norm(li.querySelector('.camino-fecha')))).toEqual(modelo.caminoLista.map((p) => fecha(p.iso)));
    expect(pasos.map((li) => norm(li.querySelector('.camino-texto strong')))).toEqual(
      modelo.caminoLista.map((p) => p.texto.replace(/^(Reconociste|Dominaste) /, '')),
    );
  });

  it('sin eventos no hay lista y aparece el caminoVacio literal', () => {
    const brechas: BrechaDeMapa[] = [
      { id: 'p1', categoria: 'dura', titulo: 'Pendiente eterno', severidad: 'media', veredicto: null, veredictoEn: null, dominadaEn: null },
    ];
    const cont = renderMapa({ ocupacion: 'Ocupacion de prueba', brechas, modo: 'naciendo' });
    expect(cont.querySelector('ol.camino-lista')).toBeNull();
    expect(cont.querySelector('.camino-vacio')!.textContent).toBe(
      'Tu camino empieza con la primera brecha que reconozcas como real. Cada paso queda acá, con su fecha.',
    );
  });
});

describe('escena: el mapa desnudo que preside la portada', () => {
  it('sin cabecera, sin leyenda y sin camino; el lienzo sigue completo', () => {
    const cont = renderMapa({
      ocupacion: fixture.ocupacion,
      brechas: fixture.brechas,
      modo: 'naciendo',
      orbe: true,
      escena: true,
    });
    expect(cont.querySelector('section')!.getAttribute('class')).toBe('mapa-escena');
    expect(cont.querySelector('.mapa-cabecera')).toBeNull();
    expect(cont.querySelector('.mapa-leyenda')).toBeNull();
    expect(cont.querySelector('.camino-caja')).toBeNull();
    expect(cont.querySelectorAll('g.mapa-nodo')).toHaveLength(8);
    expect(cont.querySelector('circle.mapa-raiz')).not.toBeNull();
    expect(cont.querySelector('g.mapa-orbe')).not.toBeNull();
  });

  it('en la portada no gira nada: ni anillos, ni chispa en órbita, ni la trama', () => {
    const cont = renderMapa({
      ocupacion: fixture.ocupacion,
      brechas: fixture.brechas,
      modo: 'naciendo',
      orbe: true,
      escena: true,
    });
    // Los anillos guía y el micro-logro miden decisiones que se toman en el
    // workspace; en la portada serían órbitas decorativas alrededor de datos.
    expect(cont.querySelector('g.mapa-anillos')).toBeNull();
    expect(cont.querySelectorAll('g.mapa-orbita')).toHaveLength(0);
    // Y el orbe que aterriza en la raíz no se queda dando vueltas: la casa lo
    // pinta quieto, igual que llega en vuelo.
    const css = readFileSync('src/features/mapa/mapa.css', 'utf8').replace(/\r/g, '');
    expect(css).toMatch(/\.mapa-orbe\s*\{[^}]*\}/);
    expect(css.match(/\.mapa-orbe\s*\{[^}]*\}/)![0]).not.toMatch(/animation:/);
  });

  it('fuera de escena el workspace conserva anillos y chispa', () => {
    const svg = renderNaciendo().querySelector('svg.mapa-svg')!;
    expect(svg.querySelectorAll('g.mapa-anillos circle.mapa-guia').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('g.mapa-orbita')).toHaveLength(1);
  });

  it('fuera de escena la caja es la tarjeta de siempre', () => {
    const cont = renderNaciendo();
    expect(cont.querySelector('section')!.getAttribute('class')).toBe('card mapa-caja');
    expect(cont.querySelector('.camino-caja')).not.toBeNull();
  });
});

describe('la letra se escribe en pantalla, no en unidades del viewBox', () => {
  it('el lienzo entrega la escala que midió y si es ancho de bolsillo', () => {
    // En jsdom no hay layout ni resize: la escala queda en su valor inicial (1)
    // y el atributo viaja con ella. Lo que se prueba acá es el cable, no el
    // número; el número lo mide el navegador.
    const svg = renderNaciendo().querySelector('svg.mapa-svg') as unknown as HTMLElement;
    expect(svg.style.getPropertyValue('--mapa-escala')).toBe('1');
    expect(svg.getAttribute('data-estrecho')).toBe('no');
  });

  it('mapa.css divide cada fuente por la escala y apaga las letras chicas', () => {
    const css = readFileSync('src/features/mapa/mapa.css', 'utf8').replace(/\r/g, '');
    for (const clase of ['mapa-raiz-nombre', 'mapa-cat-texto', 'mapa-nodo-texto']) {
      expect(css, `.${clase} volvió a una fuente fija en unidades`).toMatch(
        new RegExp(`\\.${clase}\\s*\\{[^}]*font-size:\\s*calc\\(\\s*[\\d.]+px / var\\(--mapa-escala`),
      );
    }
    // Y abajo de la escala de lectura, las etiquetas del SVG se apagan (viven en
    // HTML, donde un px sí es un px).
    expect(css).toMatch(/\.mapa-svg\[data-estrecho="si"\][\s\S]{0,160}?\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.mapa-escena-chips\s*\{/);
  });
});

describe('Invariante 3: el color nunca sale del CSS', () => {
  it('ningún elemento del SVG trae un color escrito a mano', () => {
    const cont = renderMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas, modo: 'naciendo', orbe: true });
    const culpables = Array.from(cont.querySelectorAll('svg *')).filter((el) => {
      const nombre = el.tagName.toLowerCase();
      if (nombre === 'rect') return el.getAttribute('fill') !== 'none' || el.getAttribute('stroke') !== 'none';
      return el.hasAttribute('fill') || el.hasAttribute('stroke');
    });
    expect(culpables.map((el) => el.tagName)).toEqual([]);
  });
});
