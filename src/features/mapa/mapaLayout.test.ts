// features/mapa/mapaLayout.test.ts
// B2: la geometría pura del mapa radial de la Cabina.
//
// EL ORÁCULO DEL DONANTE MURIÓ. Hasta el 2026-11-01 este archivo comparaba la
// salida entera contra `__golden__/mapa-8-brechas.json`, un volcado del algoritmo
// del donante congelado byte a byte. Ese 1:1 fue revocado por el dueño: el mapa
// propio de Ómicrom es el radial de la Cabina, con la raíz dorada pintada en el
// ámbar de la casa y el orbe geodésico encima. Un golden de otro dibujo ya no
// protege nada — ataría el port a un modelo de render que ya no existe
// (`nodosBrechaRender`, `aristasCatBrecha`, `modelo.camino`, curvas «Q»).
//
// Lo que reemplaza la comparación ciega: una afirmación por cada INVARIANTE del
// radial, con los literales que la Cabina efectivamente dibuja (radios, abertura
// de los abanicos, stagger de 45 ms, precedencia de estados, el aria-label
// literal). Si alguien cambia la geometría, esto dice cuál regla se rompió en vez
// de decir «el JSON ya no coincide».
import { describe, it, expect } from 'vitest';
// @ts-expect-error node:fs no tiene tipos en este repo (ver contratoMapa.test.ts)
import { readFileSync } from 'node:fs';
import {
  construirMapa,
  estadoDe,
  CATEGORIAS_MAPA,
  ESTADO_PALABRA,
  ORDEN,
  ROL_LOGRO,
  ROL_RAIZ,
  type BrechaDeMapa,
} from './mapaLayout';

const fixture = JSON.parse(readFileSync('src/features/mapa/__fixtures__/analisis-donante.json', 'utf8')) as {
  ocupacion: string;
  brechas: BrechaDeMapa[];
};

const G = construirMapa({ ocupacion: 'X', brechas: [] }).geometria;

// La muestra real del port: 8 brechas, las 4 categorías, 3 reconocidas (2 dura +
// 1 blanda) y 1 dominada.
const muestra = construirMapa({ ocupacion: fixture.ocupacion, brechas: fixture.brechas });

const brecha = (p: Partial<BrechaDeMapa> & { id: string; categoria: BrechaDeMapa['categoria'] }): BrechaDeMapa => ({
  titulo: 'T',
  severidad: 'media',
  veredicto: null,
  veredictoEn: null,
  dominadaEn: null,
  ...p,
});

// El anillo es distancia al centro, no una etiqueta: se comprueba midiendo.
const radioDe = (p: { x: number; y: number }): number => Math.hypot(p.x - G.CX, p.y - G.CY);

describe('geometría sellada de la Cabina (literales del SVG propio)', () => {
  it('el cuadro, el centro y los tres anillos', () => {
    expect(G.LADO).toBe(640);
    expect(G.VIEWBOX).toBe('-56 0 772 640');
    expect(G.CX).toBe(320);
    expect(G.CY).toBe(320);
    expect([G.R_CAT, G.R_DATO, G.R_BRECHA]).toEqual([105, 195, 272]);
    expect(G.PASO_MS).toBe(45);
    expect(G.ordenCategorias).toEqual(['dura', 'blanda', 'conocimiento', 'credencial']);
  });

  it('la holgura del viewBox alcanza para las etiquetas del anillo de afuera', () => {
    // Con la muestra completa, ninguna etiqueta (que es lo que se sale del cuadro
    // de 640) queda fuera de [-56, 716]. Si un radio o la abertura del abanico
    // crecen, este test es el que avisa antes de que el texto se recorte.
    const xs = muestra.nodos.map((n) => n.etiqueta.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-56);
    expect(Math.max(...xs)).toBeLessThanOrEqual(716);
    expect(muestra.nodos.every((n) => radioDe(n.p) <= G.R_BRECHA + 12)).toBe(true);
  });
});

describe('el anillo lo manda la decisión, no la clasificación', () => {
  it('reconocida vive en R_DATO y pendiente en R_BRECHA', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [
        brecha({ id: 'r', categoria: 'dura', veredicto: 'confirmada' }),
        brecha({ id: 'p', categoria: 'dura' }),
      ],
    });
    expect(radioDe(salida.nodos.find((n) => n.id === 'r')!.p)).toBeCloseTo(G.R_DATO, 1);
    expect(radioDe(salida.nodos.find((n) => n.id === 'p')!.p)).toBeCloseTo(G.R_BRECHA, 1);
  });

  it('decir "es mía" migra el nodo hacia adentro', () => {
    const sinVeredicto = construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'a', categoria: 'dura' })] });
    const reconocida = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'a', categoria: 'dura', veredicto: 'confirmada' })],
    });
    expect(radioDe(sinVeredicto.nodos[0].p)).toBeCloseTo(G.R_BRECHA, 1);
    expect(radioDe(reconocida.nodos[0].p)).toBeCloseTo(G.R_DATO, 1);
  });

  it('un anillo vacío no se dibuja', () => {
    // La raíz y las categorías siempre están; el anillo del medio sólo si alguien
    // ya reconoció algo, y el de afuera sólo si queda algo pendiente.
    const soloDato = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'r', categoria: 'dura', veredicto: 'confirmada' })],
    });
    const soloBrecha = construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'p', categoria: 'dura' })] });
    expect(soloDato.anillos).toEqual([G.R_CAT, G.R_DATO]);
    expect(soloBrecha.anillos).toEqual([G.R_CAT, G.R_BRECHA]);
    expect(muestra.anillos).toEqual([G.R_CAT, G.R_DATO, G.R_BRECHA]);
    // Sin brechas no hay ni anillos de datos: queda la guía de categorías.
    expect(construirMapa({ ocupacion: 'X', brechas: [] }).anillos).toEqual([G.R_CAT]);
  });

  it('la abertura del abanico es ±18° para lo reconocido y ±27° para la brecha', () => {
    // Tres nodos de la misma categoría reparten la abertura: el primero y el
    // último están exactamente a ±abertura del ángulo de la categoría. Se mide en
    // grados polares para no hardcodear cos/sen.
    const angulo = (p: { x: number; y: number }): number =>
      (Math.atan2(p.y - G.CY, p.x - G.CX) * 180) / Math.PI;
    const tres = ['a', 'b', 'c'].map((id) => brecha({ id, categoria: 'dura', veredicto: 'confirmada' }));
    const salida = construirMapa({ ocupacion: 'X', brechas: tres });
    const ng = salida.nodos.map((n) => angulo(n.p));
    // Categoría única → ángulo base -90 (hacia arriba). Tolerancia de 2 decimales
    // en grados: el modelo redondea cada coordenada a 0,01 unidades y eso empuja
    // el ángulo ~0,001° en el anillo de afuera.
    expect(ng[0]).toBeCloseTo(-90 - 18, 2);
    expect(ng[1]).toBeCloseTo(-90, 2);
    expect(ng[2]).toBeCloseTo(-90 + 18, 2);

    const pend = ['d', 'e'].map((id) => brecha({ id, categoria: 'dura' }));
    const p = construirMapa({ ocupacion: 'X', brechas: pend }).nodos.map((n) => angulo(n.p));
    expect(p[0]).toBeCloseTo(-90 - 27, 2);
    expect(p[1]).toBeCloseTo(-90 + 27, 2);
  });
});

describe('precedencia de estado: descartar gana a todo', () => {
  it('rechazada > dominada > confirmada > pendiente', () => {
    expect(estadoDe(brecha({ id: 'x', categoria: 'dura', veredicto: 'rechazada', dominadaEn: '2026-01-01' }))).toBe('rechazada');
    expect(estadoDe(brecha({ id: 'x', categoria: 'dura', veredicto: 'confirmada', dominadaEn: '2026-01-01' }))).toBe('dominada');
    expect(estadoDe(brecha({ id: 'x', categoria: 'dura', veredicto: 'confirmada' }))).toBe('confirmada');
    expect(estadoDe(brecha({ id: 'x', categoria: 'dura' }))).toBe('pendiente');
  });

  it('rechazada manda también en el dibujo: tachado sí, anillo doble y logro no', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'r', categoria: 'dura', veredicto: 'rechazada', dominadaEn: '2026-01-01' })],
    });
    const nodo = salida.nodos[0];
    expect(nodo.estado).toBe('rechazada');
    // El tachado cruza el disco en diagonal, recortado a 0.62·r por lado.
    const { tachado, p, r } = nodo;
    expect(tachado).not.toBeNull();
    expect(tachado!.x1).toBeCloseTo(p.x - r * 0.62, 2);
    expect(tachado!.y1).toBeCloseTo(p.y - r * 0.62, 2);
    expect(tachado!.x2).toBeCloseTo(p.x + r * 0.62, 2);
    expect(tachado!.y2).toBeCloseTo(p.y + r * 0.62, 2);
    expect(nodo.anilloDoble).toBeNull();
    expect(nodo.logro).toBeNull();
    // Rechazar es seguir en el anillo de las brechas: sigue siendo un pendiente
    // visual (la etiqueta lleva más caracteres que en el anillo del medio).
    expect(radioDe(p)).toBeCloseTo(G.R_BRECHA, 1);
    expect(nodo.etiqueta.texto.length).toBeLessThanOrEqual(20);
  });

  it('confirmada sin fecha de dominio no se pinta de dominada', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'c', categoria: 'dura', veredicto: 'confirmada', veredictoEn: '2026-01-01' })],
    });
    expect(salida.nodos[0].estado).toBe('confirmada');
    expect(salida.nodos[0].anilloDoble).toBeNull();
    expect(salida.nodos[0].logro).toBeNull();
    expect(salida.nodos[0].tachado).toBeNull();
  });
});

describe('dominada: el anillo doble y la chispa en órbita', () => {
  it('anillo a r+5 y caja de 84 centrada en el nodo', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'd', categoria: 'dura', severidad: 'alta', dominadaEn: '2026-01-01' })],
    });
    const nodo = salida.nodos[0];
    expect(nodo.estado).toBe('dominada');
    // El radio de la órbita cuelga de la severidad, no del estado.
    expect(nodo.r).toBe(12);
    expect(nodo.anilloDoble).toEqual({ r: 17 });
    expect(nodo.logro).not.toBeNull();
    expect(nodo.logro!.centro.x).toBe(nodo.p.x);
    expect(nodo.logro!.centro.y).toBeCloseTo(nodo.p.y - 38, 2);
    expect(nodo.logro!.caja.x).toBeCloseTo(nodo.p.x - 42, 2);
    expect(nodo.logro!.caja.y).toBeCloseTo(nodo.p.y - 42, 2);
    expect(nodo.logro!.chispa.startsWith('M ')).toBe(true);
    expect(nodo.logro!.chispa.endsWith('Z')).toBe(true);
  });

  it('la chispa es un rol, no un color', () => {
    expect(ROL_LOGRO).toBe('logro');
    expect(ROL_RAIZ).toBe('raiz');
  });
});

describe('el radio lo manda la severidad, nunca el estado', () => {
  it('alta 12 · media 10.5 · baja 9 en los cuatro estados', () => {
    const esperados = { alta: 12, media: 10.5, baja: 9 } as const;
    for (const sev of ['alta', 'media', 'baja'] as const) {
      const colores = [
        construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'n', categoria: 'dura', severidad: sev })] }),
        construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'n', categoria: 'dura', severidad: sev, veredicto: 'confirmada' })] }),
        construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'n', categoria: 'dura', severidad: sev, dominadaEn: '2026-01-01' })] }),
        construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'n', categoria: 'dura', severidad: sev, veredicto: 'rechazada' })] }),
      ];
      for (const s of colores) expect(s.nodos[0].r).toBe(esperados[sev]);
    }
  });
});

describe('sólo se dibuja lo que tiene datos', () => {
  it('ORDEN manda (no el orden del input) y el ángulo usa n = categorías con brechas', () => {
    // dura i=0 → -90 (arriba), blanda i=1 → -90 + 180 = 90 (abajo). Con dos
    // categorías, la de abajo queda en (320, 425). conocimiento/credencial, sin
    // brechas, no aparecen.
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'b', categoria: 'blanda' }), brecha({ id: 'd', categoria: 'dura' })],
    });
    expect(salida.categorias.map((c) => c.cat)).toEqual(['dura', 'blanda']);
    expect(salida.categorias[0].p).toEqual({ x: 320, y: 215 });
    expect(salida.categorias[1].p).toEqual({ x: 320, y: 425 });
    expect(salida.aristasRaizCat.map((a) => a.key)).toEqual(['rc-dura', 'rc-blanda']);
  });

  it('con las 4 categorías los nodos caen en sus cuatro puntos cardinales', () => {
    expect(muestra.categorias.map((c) => c.cat)).toEqual(ORDEN);
    expect(muestra.categorias.map((c) => c.p)).toEqual([
      { x: 320, y: 215 },
      { x: 425, y: 320 },
      { x: 320, y: 425 },
      { x: 215, y: 320 },
    ]);
  });

  it('las etiquetas de categoría van en mayúsculas y con su palabra completa', () => {
    for (const c of muestra.categorias) {
      expect(c.etiqueta).toBe(CATEGORIAS_MAPA[c.cat].toUpperCase());
    }
  });
});

describe('trazado: aristas rectas con el largo ya resuelto', () => {
  it('raíz→categoría sale del centro, lleva rol de raíz y su delay de 45 ms', () => {
    const a = muestra.aristasRaizCat;
    expect(a).toHaveLength(4);
    a.forEach((linea, i) => {
      expect([linea.x1, linea.y1]).toEqual([G.CX, G.CY]);
      expect(linea.rol).toBe(ROL_RAIZ);
      expect(linea.delay).toBe(`${i * 45}ms`);
      expect(linea.largo).toBe(Math.round(radioDe({ x: linea.x2, y: linea.y2 })));
    });
  });

  it('categoría→nodo cuelga del padre de SU categoría y se pinta con su rol', () => {
    for (const linea of muestra.aristasCatNodo) {
      const nodo = muestra.nodos.find((n) => n.id === linea.id)!;
      const padre = muestra.categorias.find((c) => c.cat === nodo.categoria)!;
      expect([linea.x1, linea.y1]).toEqual([padre.p.x, padre.p.y]);
      expect([linea.x2, linea.y2]).toEqual([nodo.p.x, nodo.p.y]);
      expect(linea.key).toBe(`cn-${nodo.id}`);
      expect(linea.rol).toBe(`cat:${nodo.categoria}`);
      expect(linea.delay).toBe(nodo.delay);
    }
  });

  it('el stagger recorre por categoría: primero lo reconocido, después la brecha', () => {
    // Índice global n → (9+n)·45 ms. Con la muestra: 3 reconocidas (dura, dura,
    // blanda) y 5 pendientes a continuación, en ORDEN de categorías.
    expect(muestra.nodos.map((n) => n.delay)).toEqual(
      muestra.nodos.map((_, n) => `${(9 + n) * 45}ms`),
    );
    // dura reconocida, dura reconocida, blanda reconocida, blanda pendiente,
    // conocimiento ×2, credencial ×2. En dura ya no queda nada pendiente: las
    // dos se fueron al anillo del medio.
    expect(muestra.nodos.map((n) => n.rol)).toEqual([
      'cat:dura', 'cat:dura', 'cat:blanda', 'cat:blanda',
      'cat:conocimiento', 'cat:conocimiento', 'cat:credencial', 'cat:credencial',
    ]);
    expect(muestra.categorias.map((c) => c.delay)).toEqual(['180ms', '225ms', '270ms', '315ms']);
    const tiempos = muestra.nodos.map((n) => parseInt(n.delay, 10));
    expect([...tiempos].sort((a, b) => a - b)).toEqual(tiempos);
  });

  it('la etiqueta se va al lado libre del nodo y se trunca según el anillo', () => {
    for (const nodo of muestra.nodos) {
      const derecha = nodo.p.x >= G.CX;
      expect(nodo.etiqueta.anchor).toBe(derecha ? 'start' : 'end');
      expect(nodo.etiqueta.x).toBeCloseTo(nodo.p.x + (derecha ? nodo.r + 7 : -nodo.r - 7), 2);
      expect(nodo.etiqueta.y).toBe(nodo.p.y);
      const limite = nodo.estado === 'confirmada' || nodo.estado === 'dominada' ? 15 : 20;
      expect(nodo.etiqueta.texto.length).toBeLessThanOrEqual(limite);
    }
  });

  it('el tooltip dice las cuatro cosas, en orden, con la palabra del estado', () => {
    const b = fixture.brechas[0];
    const nodo = muestra.nodos.find((n) => n.id === b.id)!;
    expect(nodo.tooltip).toBe(`${b.titulo} · Habilidad dura · impacto ${b.severidad} · Dominada`);
    const pendiente = muestra.nodos.find((n) => n.estado === 'pendiente')!;
    expect(pendiente.tooltip.endsWith('· Pendiente')).toBe(true);
  });
});

describe('la raíz abraza el nombre', () => {
  it('se parte en dos buscando el corte más parejo y sube a mayúsculas', () => {
    const s = construirMapa({ ocupacion: 'Ingeniera de Datos', brechas: [] });
    expect(s.raiz.lineas).toEqual(['INGENIERA', 'DE DATOS']);
    expect(s.raiz.rol).toBe(ROL_RAIZ);
  });

  it('sin nombre queda la raya y el disco no se desploma', () => {
    const vacio = construirMapa({ ocupacion: '   ', brechas: [] });
    expect(vacio.raiz.lineas).toEqual(['—']);
    expect(vacio.raiz.r).toBe(44);
  });

  it('el disco se limita entre 44 y el techo de 12 caracteres por línea', () => {
    // CARACTERES_POR_LINEA=12 → el ancho máximo medible es 12·8.3 y eso da 59;
    // el techo de 60 está para que un cambio de UNIDAD_LETRA no infle el disco.
    const corto = construirMapa({ ocupacion: 'A', brechas: [] });
    const largo = construirMapa({ ocupacion: 'Coordinador Nacional de Programas', brechas: [] });
    expect(corto.raiz.r).toBe(44);
    expect(largo.raiz.lineas.every((l) => l.length <= 12)).toBe(true);
    expect(largo.raiz.r).toBeGreaterThan(44);
    expect(largo.raiz.r).toBeLessThanOrEqual(60);
  });

  it('el aria-label es la resumen del mapa en una frase', () => {
    expect(muestra.ariaLabel).toBe(
      'Mapa radial de Profesional con experiencia media (muestra): en el centro, la persona. ' +
        '4 categorías. 3 habilidades reconocidas en el anillo del medio, 5 en el anillo de las brechas. ' +
        '1 dominadas con un logro en órbita.',
    );
    expect(construirMapa({ ocupacion: 'Sin brechas aquí', brechas: [] }).ariaLabel).toBe(
      'Mapa radial de Sin brechas aquí: en el centro, la persona. 0 categorías. ' +
        '0 habilidades reconocidas en el anillo del medio, 0 en el anillo de las brechas. ' +
        '0 dominadas con un logro en órbita.',
    );
  });
});

describe('leyenda y camino', () => {
  it('la leyenda lista las 4 categorías con ROL y los 4 estados con su palabra', () => {
    expect(muestra.leyenda.map((l) => ('cat' in l ? l.cat : l.estado))).toEqual([
      ...ORDEN,
      'pendiente', 'confirmada', 'dominada', 'rechazada',
    ]);
    const colores = muestra.leyenda.filter((l) => 'cat' in l).map((l) => (l as { color: string }).color);
    expect(colores).toEqual(['cat:dura', 'cat:blanda', 'cat:conocimiento', 'cat:credencial']);
    expect(ESTADO_PALABRA).toEqual({ pendiente: 'Pendiente', confirmada: 'Reconocida', dominada: 'Dominada', rechazada: 'Descartada' });
  });

  it('el camino ordena los hitos por fecha y nombra la acción', () => {
    const c = muestra.caminoLista;
    expect(c.map((x) => x.numero)).toEqual([1, 2, 3, 4]);
    expect(c.map((x) => x.tipo)).toEqual(['reconocida', 'reconocida', 'dominada', 'reconocida']);
    expect(c.map((x) => x.iso)).toEqual([...c.map((x) => x.iso)].sort());
    expect(c[0].texto.startsWith('Reconociste Resultados cuantificados')).toBe(true);
    expect(c[2].texto.startsWith('Dominaste Resultados cuantificados')).toBe(true);
    // key = id de la brecha + el tipo del hito: la misma brecha puede aparecer
    // dos veces (primero reconocida, después dominada) sin chocar.
    const [b1, b2, b3] = fixture.brechas;
    expect(c.map((x) => x.key)).toEqual([
      `${b1.id}-reconocida`,
      `${b2.id}-reconocida`,
      `${b1.id}-dominada`,
      `${b3.id}-reconocida`,
    ]);
  });

  it('confirmada SIN fecha no deja huella en el camino', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [brecha({ id: 'c', categoria: 'dura', veredicto: 'confirmada' })],
    });
    expect(salida.caminoLista).toEqual([]);
    expect(salida.caminoVacio).toBe(
      'Tu camino empieza con la primera brecha que reconozcas como real. Cada paso queda acá, con su fecha.',
    );
  });
});

// La línea blanca del brief («una línea blanca cronológica une los pasos hechos,
// con lista de hitos fechados debajo»). La lista ya está probada arriba; acá se
// prueba la geometría del trazo, que es lo que el mapa dibuja.
describe('el trazo blanco del camino', () => {
  const num = (s: string): number => Number(s.replace('ms', ''));
  // El key del hito es `id-tipo`; los ids son UUID con guiones, así que se busca
  // por igualdad exacta y no por prefijo.
  const nodoDe = (key: string) => muestra.nodos.find((n) => key === `${n.id}-reconocida` || key === `${n.id}-dominada`)!;
  // raíz → cada hito, en el orden de la lista fechada. Un solo shape para los
  // dos (la raíz y los nodos se buscan distinto, pero al trazo le llegan igual).
  const centros = [
    { x: G.CX, y: G.CY, r: muestra.raiz.r },
    ...muestra.caminoLista.map((e) => {
      const n = nodoDe(e.key);
      return { x: n.p.x, y: n.p.y, r: n.r };
    }),
  ];

  it('un segmento por salto, todos con el rol de pintura del camino', () => {
    expect(muestra.caminoTrazos.map((t) => t.key)).toEqual(['camino-0', 'camino-1', 'camino-2', 'camino-3']);
    expect(muestra.caminoTrazos.every((t) => t.rol === 'camino')).toBe(true);
  });

  it('cada tramo entra recortado: nace afuera del disco de origen y muere 24 unidades antes del nodo', () => {
    muestra.caminoTrazos.forEach((t, i) => {
      const a = centros[i];
      const b = centros[i + 1];
      const total = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / total;
      const uy = (b.y - a.y) / total;
      // La raíz mide 44-60 de radio: de ahí se sale por su borde. Un nodo mide
      // 9-12: con los mismos 24 del arrivo alcanza y sobra.
      const margenSalida = i === 0 ? muestra.raiz.r : 24;
      expect(t.x1).toBeCloseTo(a.x + ux * margenSalida, 2);
      expect(t.y1).toBeCloseTo(a.y + uy * margenSalida, 2);
      expect(t.x2).toBeCloseTo(b.x - ux * 24, 2);
      expect(t.y2).toBeCloseTo(b.y - uy * 24, 2);
      // Y por eso la tinta nunca pinta un disco: los dos extremos quedan afuera.
      // El modelo redondea cada coordenada a 2 decimales, así que un extremo que
      // nace justo en el borde de la raíz puede medir 0.005 menos; y aunque midiera
      // más, el trazo se dibuja DEBAJO del grupo de los nodos: la tinta que tocara
      // un disco la tapa el propio disco.
      expect(Math.hypot(a.x - t.x1, a.y - t.y1)).toBeGreaterThanOrEqual(a.r - 0.01);
      expect(Math.hypot(b.x - t.x2, b.y - t.y2)).toBeGreaterThanOrEqual(b.r - 0.01);
    });
  });

  it('los dos pasos consecutivos del mismo nodo no dejan un segmento de largo cero', () => {
    const salida = construirMapa({
      ocupacion: 'X',
      brechas: [
        brecha({
          id: 'a',
          categoria: 'dura',
          veredicto: 'confirmada',
          veredictoEn: '2026-01-01T10:00:00.000Z',
          dominadaEn: '2026-02-01T10:00:00.000Z',
        }),
      ],
    });
    expect(salida.caminoLista).toHaveLength(2);
    expect(salida.caminoTrazos.map((t) => t.key)).toEqual(['camino-0']);
  });

  it('sin hitos fechados no hay línea: el camino todavía no empezó', () => {
    const salida = construirMapa({ ocupacion: 'X', brechas: [brecha({ id: 'p', categoria: 'dura' })] });
    expect(salida.caminoTrazos).toEqual([]);
  });

  it('arranca recién cuando el último nodo terminó de nacer', () => {
    // 9 categorías + los nodos, con stagger de 45 ms y 300 ms de nacimiento.
    const nacimiento = (9 + muestra.nodos.length - 1) * G.PASO_MS + 300;
    expect(num(muestra.caminoTrazos[0].delay)).toBe(nacimiento);
  });

  it('se traza a velocidad constante y la suma de los tramos dura 1,7 s', () => {
    const trazos = muestra.caminoTrazos;
    const totalLargo = trazos.reduce((s, t) => s + t.largo, 0);
    const suma = trazos.reduce((s, t) => s + num(t.dur), 0);
    expect(Math.abs(suma - 1700)).toBeLessThanOrEqual(trazos.length);
    // Continuidad: cada tramo arranca cuando termina el anterior (±1 ms de rounding).
    trazos.slice(1).forEach((t, i) => {
      expect(num(t.delay)).toBeCloseTo(num(trazos[i].delay) + num(trazos[i].dur), 0);
    });
    // Velocidad constante, dicha como la regla del modelo y no como un cociente:
    // cada tramo recibe la parte proporcional de 1,7 s según su largo, redondeada
    // a milisegundos enteros — por eso la tolerancia es medio milisegundo.
    trazos.forEach((t) => {
      expect(Math.abs(num(t.dur) - (1700 * t.largo) / totalLargo)).toBeLessThanOrEqual(0.5);
    });
  });
});
