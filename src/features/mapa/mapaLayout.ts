// features/mapa/mapaLayout.ts
// B2: geometría pura del mapa neuronal, CERO React. Port literal del donante
// bb1434fb/components/MapaCapacidades.tsx (L7-L51, L68-L125, L131-L146, L194-L332,
// L336-L377), congelado por scripts/oracle-donante.mjs en
// __golden__/mapa-8-brechas.json. La fidelidad es 1:1: la geometría y los tiempos
// NO se negocian. Nada de aquí "mejora" al donante; donde el port difiere, el
// divergente es el port (ver cada diferencia documentada abajo).
//
// Única diferencia de vocabulario con el donante: aquí no hay hex. Cada color del
// donante se emite como el ROL que el golden le asignó ("cat:dura",
// "cat:dura+alfa" para el relleno al 2e de confirmada, "nodo-hueco",
// "borde-pendiente", "borde-rechazada", "tinta-sobre-nodo"). El pintado con
// tokens ocurre en la capa de render (tareas siguientes); contratoMapa.test.ts
// prohíbe hex literales en este directorio.
//
// Cero imports de React, cero estado, cero DOM: misma entrada, misma salida,
// determinista. `construirMapa` es la función pura que el componente llamará
// dentro de su useMemo.

export type CategoriaMapa = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
export type SeveridadMapa = 'alta' | 'media' | 'baja';
export type VeredictoMapa = 'confirmada' | 'rechazada';
export type EstadoBrechaMapa = 'pendiente' | 'confirmada' | 'dominada' | 'rechazada';

// Forma de entrada: el análisis tal como lo congela el fixture del donante
// (__fixtures__/analisis-donante.json). Los campos extra de un análisis real
// (evidencia, aprender, ...) se ignoran: el mapa solo lee estos.
export interface BrechaDeMapa {
  id: string;
  categoria: CategoriaMapa;
  titulo: string;
  severidad: SeveridadMapa;
  veredicto?: VeredictoMapa | null;
  veredictoEn?: string | null;
  dominadaEn?: string | null;
}

export interface EntradaMapa {
  ocupacion: string;
  brechas: BrechaDeMapa[];
}

type Punto = { x: number; y: number };

// ── literales del donante (L7-L23), 1:1 ────────────────────────────────────
export const ORDEN: CategoriaMapa[] = ['dura', 'blanda', 'conocimiento', 'credencial'];
const RADIO_CAT = 170;
const RADIO_BRECHA = 296;
const RADIO_LOGRO = 352;
const W = 980;
const H = 720;
const CX = W / 2;
const CY = H / 2;
const PASO_MS = 45;

// r2 se queda aunque el motivo original (divergencia de 1 ULP entre el SSR de
// Next y el navegador) no exista en Vite: las coordenadas REDONDEADAS son el
// mapa canónico. Quitarlo mueve cada nodo sub-píxeles y cambia cada curva Q,
// y el golden lo congeló con r2 dentro.
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function polar(radio: number, angulo: number): Punto {
  const a = (angulo * Math.PI) / 180;
  return { x: r2(CX + radio * Math.cos(a)), y: r2(CY + radio * Math.sin(a)) };
}

// La curva del donante L38-L47, literal:offset = 11% de la distancia, con signo
// según la paridad de la semilla; los tres puntos impressos con .toFixed(1).
function curva(p: Punto, q: Punto, semilla: number): string {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dist = r2(Math.hypot(dx, dy)) || 1;
  const off = dist * 0.11 * (semilla % 2 === 0 ? 1 : -1);
  return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} Q ${((p.x + q.x) / 2 - (dy / dist) * off).toFixed(1)} ${(
    (p.y + q.y) / 2 +
    (dx / dist) * off
  ).toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
}

function corta(texto: string, n: number): string {
  return texto.length > n ? `${texto.slice(0, n - 1).trimEnd()}…` : texto;
}

// ── vocabulario de roles (la única licencia sobre el donante) ──────────────
const rolCat = (cat: CategoriaMapa): string => `cat:${cat}`;
// El fill de una brecha confirmada era `${color}2e` en el donante (L301):
// color de categoría + alfa. En roles: `cat:X+alfa`.
const rolCatAlfa = (cat: CategoriaMapa): string => `${rolCat(cat)}+alfa`;
const ROL_HUECO = 'nodo-hueco'; // el hueco del pendiente en el donante
const ROL_BORDE_PENDIENTE = 'borde-pendiente'; // el borde gris del pendiente
const ROL_BORDE_RECHAZADA = 'borde-rechazada'; // el borde del nodo descartado
const ROL_TINTA = 'tinta-sobre-nodo'; // el trazo del check sobre nodo lleno

export interface Trazo {
  d: string;
  stroke: string;
  animationDelay: string;
  pathLength: number;
}

export interface Arista extends Trazo {
  key: string;
}

// Literal del donante (bb1434fb/lib/types.ts L78-83). El mapa pinta ESTAS palabras,
// no la clave de categoria: etiqueta, tooltip y leyenda salen todas de aqui.
export const CATEGORIAS_MAPA: Record<CategoriaMapa, string> = {
  dura: 'Habilidad dura',
  blanda: 'Habilidad blanda',
  conocimiento: 'Conocimiento',
  credencial: 'Credencial',
};

export interface SalidaMapa {
  geometria: {
    W: number; H: number; CX: number; CY: number;
    RADIO_CAT: number; RADIO_BRECHA: number; RADIO_LOGRO: number;
    PASO_MS: number; ordenCategorias: CategoriaMapa[];
  };
  modelo: {
    raizDelay: number;
    nodosCat: { cat: CategoriaMapa; p: Punto; delay: number; labelDelay: number }[];
    nodosBrecha: { p: Punto; pCat: Punto; ang: number; delay: number; id: string }[];
    logros: { p: Punto; delay: number; id: string }[];
    camino: string;
    caminoDelay: number;
    totalPasos: number;
  };
  lineasOcupacion: string[];
  ariaLabel: string;
  aristasRaizCat: Arista[];
  aristasCatBrecha: (Arista & { 'data-apagado': boolean })[];
  labelsCat: { cat: CategoriaMapa; texto: string; x: number; y: number; anchor: 'start' | 'middle' | 'end'; animationDelay: string }[];
  nodosBrechaRender: {
    id: string;
    clase: string;
    animationDelay: string;
    tooltip: string;
    anillo: { cx: number; cy: number; r: number; stroke: string } | null;
    circulo: { cx: number; cy: number; r: number; fill: string; stroke: string; strokeWidth: number; filter: string | null };
    check: { d: string; stroke: string; strokeWidth: number } | null;
  }[];
  logrosRender: {
    key: string;
    animationDelay: string;
    tooltip: string;
    trazo: Trazo;
    circulo: { cx: number; cy: number; r: number; fill: string; filter: string };
  }[];
  caminoLista: { key: string; tipo: 'reconocida' | 'dominada'; texto: string; numero: number; iso: string }[];
  leyenda: ({ cat: CategoriaMapa; texto: string; color: string } | { estado: EstadoBrechaMapa; texto: string })[];
  caminoVacio: string;
}

export function construirMapa({ ocupacion, brechas }: EntradaMapa): SalidaMapa {
  // ── el useMemo del donante (L68-L125), literal en orden y en tiempos ──────
  // Un solo contador `paso` que avanza en ESTE orden de recorrido: raíz → por
  // categoría (delay del nodo y DESPUÉS delay del label — el labelDelay es un
  // segundo siguiente() por categoría, no un espejo del delay) → por brecha de
  // esa categoría → por logro. El camino lee el contador pero no lo avanza.
  let paso = 0;
  const siguiente = (): number => paso++ * PASO_MS;

  const raizDelay = siguiente();
  // Las categorías sin brechas NO se dibujan; n es el divisor del ángulo.
  const cats = ORDEN.filter((c) => brechas.some((b) => b.categoria === c));
  const n = Math.max(cats.length, 1);

  const nodosCat: { cat: CategoriaMapa; p: Punto; delay: number; labelDelay: number }[] = [];
  const nodosBrecha: { b: BrechaDeMapa; p: Punto; pCat: Punto; ang: number; delay: number }[] = [];

  cats.forEach((cat, i) => {
    const angCat = -90 + i * (360 / n);
    const p = polar(RADIO_CAT, angCat);
    const delay = siguiente();
    const labelDelay = siguiente();
    nodosCat.push({ cat, p, delay, labelDelay });

    const items = brechas.filter((b) => b.categoria === cat);
    const separacion = Math.min(23, 150 / Math.max(items.length, 1));
    items.forEach((b, j) => {
      const ang = angCat + (j - (items.length - 1) / 2) * separacion;
      nodosBrecha.push({ b, p: polar(RADIO_BRECHA, ang), pCat: p, ang, delay: siguiente() });
    });
  });

  const logros = nodosBrecha
    .filter((nb) => nb.b.dominadaEn)
    .map((nb) => ({ nb, p: polar(RADIO_LOGRO, nb.ang + 8), delay: siguiente() }));

  const eventos = brechas
    .flatMap((b) => {
      const lista: { t: string; tipo: 'reconocida' | 'dominada'; b: BrechaDeMapa }[] = [];
      if (b.veredicto === 'confirmada' && b.veredictoEn) lista.push({ t: b.veredictoEn, tipo: 'reconocida', b });
      if (b.dominadaEn) lista.push({ t: b.dominadaEn, tipo: 'dominada', b });
      return lista;
    })
    .sort((a, b) => a.t.localeCompare(b.t));

  const posDe = new Map(brechas.map((b) => [b.id, nodosBrecha.find((nb) => nb.b.id === b.id)?.p]));
  let camino = '';
  if (eventos.length > 0) {
    camino = `M ${CX} ${CY}`;
    let previo: Punto = { x: CX, y: CY };
    for (const e of eventos) {
      const p = posDe.get(e.b.id);
      if (!p) continue;
      const d = r2(Math.hypot(p.x - previo.x, p.y - previo.y)) || 1;
      // Vector unitario con UNA decenal (r2 al 100 /10): el camino no llega al
      // nodo, se detiene 24 px antes. Literal del donante L115-L118.
      const ux = r2(((p.x - previo.x) / d) * 10) / 10;
      const uy = r2(((p.y - previo.y) / d) * 10) / 10;
      camino += ` L ${(p.x - ux * 24).toFixed(1)} ${(p.y - uy * 24).toFixed(1)}`;
      previo = p;
    }
  }
  const caminoDelay = paso * PASO_MS + 150;
  const totalPasos = paso;

  // ── conteos del aria-label (donante L127-L129) ────────────────────────────
  const reconocidas = brechas.filter((b) => b.veredicto === 'confirmada').length;
  const dominadas = brechas.filter((b) => b.dominadaEn).length;
  const rechazadas = brechas.filter((b) => b.veredicto === 'rechazada').length;

  // ── envoltorio de la ocupación (donante L131-L146), verbatim ──────────────
  // Se hereda SU defecto: corta por palabras cuando la línea supera 13 chars,
  // máximo 2 líneas, y el resto del texto SE PIERDE. Para la ocupación de la
  // muestra produce ["Profesional","con"] y descarta "experiencia media
  // (muestra)". Eso congeló el golden; no es para arreglar aquí.
  const lineasOcupacion = (() => {
    const palabras = ocupacion.split(' ');
    const lineas: string[] = [];
    let actual = '';
    for (const p of palabras) {
      if ((actual + ' ' + p).trim().length > 13 && actual) {
        lineas.push(actual);
        actual = p;
      } else {
        actual = (actual + ' ' + p).trim();
      }
      if (lineas.length === 2) break;
    }
    if (lineas.length < 2 && actual) lineas.push(actual);
    return lineas.slice(0, 2);
  })();

  const ariaLabel = `Mapa de capacidades de ${ocupacion}: ${brechas.length} brechas detectadas, ${reconocidas} reconocidas, ${dominadas} dominadas y ${rechazadas} descartadas.`;

  // ── lo que el render del donante le pasa al DOM (L194-L332), en roles ─────
  // Semilla de raíz→categoría: el índice de la categoría (donante L197).
  const aristasRaizCat = nodosCat.map((nc, i) => ({
    key: `rc-${nc.cat}`,
    d: curva({ x: CX, y: CY }, nc.p, i),
    stroke: rolCat(nc.cat),
    animationDelay: `${nc.delay}ms`,
    pathLength: 1,
  }));

  // ATENCIÓN: la semilla de categoría→brecha es el índice GLOBAL de la brecha
  // dentro de nodosBrecha, no su índice intra-categoría (donante L207). Es el
  // error que un port descuidado comete: con índice local, dos brechas de la
  // misma categoría comparten signo de offset y el golden se cae.
  const aristasCatBrecha = nodosBrecha.map((nb, i) => ({
    key: `cb-${nb.b.id}`,
    d: curva(nb.pCat, nb.p, i),
    stroke: rolCat(nb.b.categoria),
    animationDelay: `${nb.delay}ms`,
    pathLength: 1,
    'data-apagado': nb.b.veredicto === 'rechazada',
  }));

  const labelsCat = nodosCat.map((nc) => {
    const angRad = Math.atan2(nc.p.y - CY, nc.p.x - CX);
    const cos = Math.cos(angRad);
    const sin = Math.sin(angRad);
    let lx = r2(nc.p.x);
    let ly = r2(nc.p.y);
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (cos > 0.35) {
      anchor = 'start';
      lx = r2(nc.p.x + 31);
      ly = r2(nc.p.y + 4);
    } else if (cos < -0.35) {
      anchor = 'end';
      lx = r2(nc.p.x - 31);
      ly = r2(nc.p.y + 4);
    } else {
      ly = sin < 0 ? r2(nc.p.y - 34) : r2(nc.p.y + 40);
    }
    // El donante pinta CATEGORIAS[cat].toUpperCase() (L274): "HABILIDAD DURA",
    // no "DURA". Texto despues de `cat`, como lo congeló el golden.
    return { cat: nc.cat, texto: CATEGORIAS_MAPA[nc.cat].toUpperCase(), x: lx, y: ly, anchor, animationDelay: `${nc.labelDelay}ms` };
  });

  const nodosBrechaRender = nodosBrecha.map((nb) => {
    const { b, p } = nb;
    // El radio viene de la SEVERIDAD, no del color (donante L283): un port que
    // confunda "nodo grande = dominada" rompe la geometría.
    const r = b.severidad === 'alta' ? 14 : b.severidad === 'media' ? 11.5 : 9.5;
    const dominada = Boolean(b.dominadaEn);
    const confirmada = b.veredicto === 'confirmada';
    const rechazada = b.veredicto === 'rechazada';
    // Precedencia literal del donante (L287): rechazada → dominada → confirmada → pendiente.
    const estado: EstadoBrechaMapa = rechazada ? 'rechazada' : dominada ? 'dominada' : confirmada ? 'confirmada' : 'pendiente';
    return {
      id: b.id,
      // El sufijo " pulso" del donante (recienId) es estado de UI transitorio:
      // no pertenece al modelo puro; la capa de render lo añade.
      clase: `mapa-nodo mapa-brecha mapa-brecha-${estado}`,
      animationDelay: `${nb.delay}ms`,
      tooltip: `${b.titulo} · ${CATEGORIAS_MAPA[b.categoria]} · impacto ${b.severidad} · ${estado}`,
      anillo: dominada ? { cx: p.x, cy: p.y, r: r + 7, stroke: rolCat(b.categoria) } : null,
      circulo: {
        cx: p.x,
        cy: p.y,
        r,
        fill: dominada ? rolCat(b.categoria) : confirmada ? rolCatAlfa(b.categoria) : ROL_HUECO,
        stroke: rechazada ? ROL_BORDE_RECHAZADA : confirmada || dominada ? rolCat(b.categoria) : ROL_BORDE_PENDIENTE,
        strokeWidth: confirmada || dominada ? 2.4 : 1.6,
        filter: confirmada || dominada ? 'url(#brillo)' : null,
      },
      check: dominada
        ? { d: `M ${r2(p.x - 4.5)} ${r2(p.y)} l 3.2 3.6 l 6 -7`, stroke: ROL_TINTA, strokeWidth: 2.2 }
        : null,
    };
  });

  const logrosRender = logros.map(({ nb, p, delay }) => ({
    key: `logro-${nb.b.id}`,
    animationDelay: `${delay}ms`,
    tooltip: `Logro: ${nb.b.titulo}`,
    // Semilla FIJA 1 para la curva del logro (donante L324), no el índice.
    trazo: {
      d: curva(nb.p, p, 1),
      stroke: rolCat(nb.b.categoria),
      animationDelay: `${delay}ms`,
      pathLength: 1,
    },
    circulo: { cx: p.x, cy: p.y, r: 6, fill: rolCat(nb.b.categoria), filter: 'url(#brillo)' },
  }));

  const caminoLista = eventos.map((e, i) => ({
    key: `${e.b.id}-${e.tipo}`,
    tipo: e.tipo,
    texto: `${e.tipo === 'reconocida' ? 'Reconociste' : 'Dominaste'} ${corta(e.b.titulo, 60)}`,
    numero: i + 1,
    iso: e.t,
  }));

  // Los 8 chips del donante (L336-L357): 4 categorias + 4 estados, en ese orden.
  const leyenda: SalidaMapa['leyenda'] = [
    ...ORDEN.map((c) => ({ cat: c, texto: CATEGORIAS_MAPA[c], color: rolCat(c) })),
    { estado: 'pendiente', texto: 'detectada' },
    { estado: 'confirmada', texto: 'reconocida' },
    { estado: 'dominada', texto: 'dominada' },
    { estado: 'rechazada', texto: 'descartada' },
  ];

  return {
    geometria: { W, H, CX, CY, RADIO_CAT, RADIO_BRECHA, RADIO_LOGRO, PASO_MS, ordenCategorias: ORDEN },
    // Orden de claves del golden: los campos `b`/`nb` del donante se reducen a `id`.
    modelo: {
      raizDelay,
      nodosCat,
      nodosBrecha: nodosBrecha.map(({ b, ...rest }) => ({ ...rest, id: b.id })),
      logros: logros.map(({ nb, ...rest }) => ({ ...rest, id: nb.b.id })),
      camino,
      caminoDelay,
      totalPasos,
    },
    lineasOcupacion,
    ariaLabel,
    aristasRaizCat,
    aristasCatBrecha,
    labelsCat,
    nodosBrechaRender,
    logrosRender,
    caminoLista,
    leyenda,
    caminoVacio:
      'Tu camino empieza con la primera brecha que reconozcas como real. Cada paso queda fechado aquí y dibujado sobre el mapa.',
  };
}
