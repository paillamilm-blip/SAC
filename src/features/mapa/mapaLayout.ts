// features/mapa/mapaLayout.ts
// Geometría pura del mapa radial (Cabina). CERO React, cero DOM, cero hex:
// misma entrada, misma salida, determinista. `construirMapa` es la función que
// el componente llama dentro de su useMemo.
//
// El dibujo viene de cabina-lab/app.js (pintarMapa, L395-L536). La traducción a
// los datos reales de Ómicrom es esta:
//
//   Anillo 1 (R_CAT):    las categorías que tienen datos.
//   Anillo 2 (R_DATO):   las brechas que la persona RECONOCIÓ suyas (estado
//                        confirmada / dominada). Decir "es mía" trae un nodo del
//                        anillo de afuera hacia adentro: eso es lo que el mapa
//                        celebra.
//   Anillo 3 (R_BRECHA): las que siguen pendientes o fueron descartadas.
//
// El anillo que ocupa un nodo no es una clasificación previa: es el resultado de
// la decisión que la cola le pide al usuario, y por eso el mapa se reordena solo
// cuando realtime trae un veredicto. Ningún nodo se inventa: si no hay
// reconocidas, el anillo del medio tampoco se dibuja.
//
// El color sigue gobernado por ROLES (Invariante 3): el modelo emite "cat:dura",
// "raiz", "logro" y mapa.css los traduce a tokens. Ningún hex vive en este
// directorio; lo vigila contratoMapa.test.ts.

export type CategoriaMapa = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
export type SeveridadMapa = 'alta' | 'media' | 'baja';
export type VeredictoMapa = 'confirmada' | 'rechazada';
export type EstadoBrechaMapa = 'pendiente' | 'confirmada' | 'dominada' | 'rechazada';

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

export const ORDEN: CategoriaMapa[] = ['dura', 'blanda', 'conocimiento', 'credencial'];

// Literales de la Cabina, en unidades de usuario de su propio SVG.
const LADO = 640;
const CX = 320;
const CY = 320;
const R_CAT = 105;
const R_DATO = 195;
const R_BRECHA = 272;
const PASO_MS = 45;
// La línea blanca del camino (brief, "NARRATIVA VISUAL"): se traza en 1,7 s una
// sola vez, repartido entre los segmentos en proporción a su largo.
const DUR_CAMINO_MS = 1700;
// El trazo se detiene antes de llegar a un nodo: la tinta nunca pinta encima del
// disco. En unidades de usuario del propio viewBox.
const MARGEN_CAMINO = 24;
// Los @keyframes de mapa.css fijan `nacer` en 300ms; el camino arranca cuando el
// último nodo ya terminó de nacer, así que esa cifra también vive acá.
const NACER_MS = 300;
// Las etiquetas del anillo exterior llegan a x≈716 sobre un cuadro de 640: sin
// esta holgura el texto se recorta. El centro sigue en 320, por eso la caja es
// simétrica (empieza en -56 y mide 772).
const VIEWBOX = '-56 0 772 640';

// El disco de la raíz crece hasta abrazar el nombre. La Cabina medía el texto con
// getComputedTextLength(); acá se calcula, porque el modelo tiene que seguir
// siendo puro. La constante no es un capricho: medida en el navegador con la
// clase .raiz-nombre (11px, 700, letter-spacing .14em, MAYÚSCULAS) sobre palabras
// reales — PROFESIONAL 8,25 · CONEXPERIENCIA 8,18 · INGENIERA 8,07 · DEVOPS 8,64
// unidades por letra.
const UNIDAD_LETRA = 8.3;
const RAIZ_MIN = 44;
const RAIZ_MAX = 60;
const CARACTERES_POR_LINEA = 12;

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function polar(radio: number, angulo: number): Punto {
  const a = (angulo * Math.PI) / 180;
  return { x: r2(CX + radio * Math.cos(a)), y: r2(CY + radio * Math.sin(a)) };
}

function corta(texto: string, n: number): string {
  return texto.length > n ? `${texto.slice(0, n - 1).trimEnd()}…` : texto;
}

// El nombre vive adentro del disco: se parte en dos buscando el corte que mejor
// reparta el largo, y cada línea se trunca al ancho del disco (Cabina,
// lineasPerfil L76-L87).
function lineasNombre(texto: string, max: number): string[] {
  const palabras = String(texto).trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return ['—'];
  let mejor = [palabras[0], palabras.slice(1).join(' ')];
  let score = Math.max(mejor[0].length, mejor[1].length);
  for (let i = 2; i < palabras.length; i++) {
    const par = [palabras.slice(0, i).join(' '), palabras.slice(i).join(' ')];
    const s = Math.max(par[0].length, par[1].length);
    if (s < score) {
      score = s;
      mejor = par;
    }
  }
  return mejor.filter(Boolean).map((x) => corta(x.toUpperCase(), max));
}

// ── vocabulario de roles ─────────────────────────────────────────────────────
const rolCat = (cat: CategoriaMapa): string => `cat:${cat}`;
export const ROL_RAIZ = 'raiz';
export const ROL_BORDE = 'borde-pendiente';
export const ROL_TACHADO = 'borde-rechazada';
export const ROL_LOGRO = 'logro';
export const ROL_CAMINO = 'camino';

export const ESTADO_PALABRA: Record<EstadoBrechaMapa, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Reconocida',
  dominada: 'Dominada',
  rechazada: 'Descartada',
};

// Precedencia: con fecha de dominio el nodo está dominado aunque el veredicto diga
// otra cosa; descartar gana a todo.
export function estadoDe(b: BrechaDeMapa): EstadoBrechaMapa {
  if (b.veredicto === 'rechazada') return 'rechazada';
  if (b.dominadaEn) return 'dominada';
  if (b.veredicto === 'confirmada') return 'confirmada';
  return 'pendiente';
}

// La persona ya la hizo suya: por eso vive en el anillo del medio.
const esDato = (estado: EstadoBrechaMapa): boolean => estado === 'confirmada' || estado === 'dominada';

// El radio lo manda la severidad, nunca el estado: un nodo grande no significa
// "dominada", significa "importa".
const radioPorSeveridad: Record<SeveridadMapa, number> = { alta: 12, media: 10.5, baja: 9 };

export const CATEGORIAS_MAPA: Record<CategoriaMapa, string> = {
  dura: 'Habilidad dura',
  blanda: 'Habilidad blanda',
  conocimiento: 'Conocimiento',
  credencial: 'Credencial',
};

export interface Linea {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Longitud en unidades de usuario: el stroke-dash del trazado la necesita. */
  largo: number;
  rol: string;
  delay: string;
  id?: string;
}

export interface NodoDibujo {
  id: string;
  estado: EstadoBrechaMapa;
  categoria: CategoriaMapa;
  p: Punto;
  r: number;
  rol: string;
  delay: string;
  tooltip: string;
  etiqueta: { x: number; y: number; anchor: 'start' | 'end'; texto: string };
  tachado: { x1: number; y1: number; x2: number; y2: number } | null;
  anilloDoble: { r: number } | null;
  logro: { chispa: string; centro: Punto; caja: Punto } | null;
}

/** Un segmento de la línea blanca del camino: entra recortada por los dos lados
 *  para no pintar sobre ningún disco, y trae su parte proporcional del trazo. */
export interface TrazoCamino {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Longitud visible, en unidades de usuario (el stroke-dash la necesita). */
  largo: number;
  rol: string;
  delay: string;
  dur: string;
}

export interface SalidaMapa {
  geometria: {
    LADO: number;
    VIEWBOX: string;
    CX: number;
    CY: number;
    R_CAT: number;
    R_DATO: number;
    R_BRECHA: number;
    PASO_MS: number;
    ordenCategorias: CategoriaMapa[];
  };
  anillos: number[];
  raiz: { r: number; lineas: string[]; rol: string };
  categorias: { cat: CategoriaMapa; p: Punto; etiqueta: string; delay: string }[];
  aristasRaizCat: Linea[];
  aristasCatNodo: Linea[];
  nodos: NodoDibujo[];
  ariaLabel: string;
  leyenda: ({ cat: CategoriaMapa; texto: string; color: string } | { estado: EstadoBrechaMapa; texto: string })[];
  caminoLista: { key: string; tipo: 'reconocida' | 'dominada'; texto: string; numero: number; iso: string }[];
  /** Los segmentos de la línea blanca que une los pasos ya hechos, en orden. */
  caminoTrazos: TrazoCamino[];
  caminoVacio: string;
}

export function construirMapa({ ocupacion, brechas }: EntradaMapa): SalidaMapa {
  const cats = ORDEN.filter((c) => brechas.some((b) => b.categoria === c));
  const nCat = Math.max(cats.length, 1);
  const anguloCat: Partial<Record<CategoriaMapa, number>> = {};
  cats.forEach((c, i) => {
    anguloCat[c] = -90 + i * (360 / nCat);
  });

  const estadoPorId = new Map(brechas.map((b) => [b.id, estadoDe(b)]));
  const reconocidas = brechas.filter((b) => esDato(estadoPorId.get(b.id)!));
  const pendientes = brechas.filter((b) => !esDato(estadoPorId.get(b.id)!));

  // Cada categoría abre su abanico dentro del anillo que le toca: ±18° para las
  // reconocidas y ±27° para las que siguen siendo brecha. Son las dos aberturas
  // de la Cabina; mantenerlas evita que un nodo migrado pise a su vecino.
  const puntos = new Map<string, Punto>();
  const fan = (lista: BrechaDeMapa[], radio: number, abertura: number): void => {
    cats.forEach((cat) => {
      const del = lista.filter((b) => b.categoria === cat);
      const base = anguloCat[cat]!;
      del.forEach((b, j) => {
        const pasoAng = del.length > 1 ? (abertura * 2) / (del.length - 1) : 0;
        puntos.set(b.id, polar(radio, base - abertura + pasoAng * j));
      });
    });
  };
  fan(reconocidas, R_DATO, 18);
  fan(pendientes, R_BRECHA, 27);

  const categorias = cats.map((cat, i) => ({
    cat,
    p: polar(R_CAT, anguloCat[cat]!),
    etiqueta: CATEGORIAS_MAPA[cat].toUpperCase(),
    delay: `${(4 + i) * PASO_MS}ms`,
  }));

  const aristasRaizCat: Linea[] = cats.map((cat, i) => {
    const p = polar(R_CAT, anguloCat[cat]!);
    return {
      key: `rc-${cat}`,
      x1: CX,
      y1: CY,
      x2: p.x,
      y2: p.y,
      largo: Math.round(Math.hypot(p.x - CX, p.y - CY)),
      rol: ROL_RAIZ,
      delay: `${i * PASO_MS}ms`,
    };
  });

  // El stagger recorre por categoría: primero lo reconocido, después lo pendiente.
  const ordenItems: BrechaDeMapa[] = [];
  cats.forEach((cat) => {
    reconocidas.filter((b) => b.categoria === cat).forEach((b) => ordenItems.push(b));
    pendientes.filter((b) => b.categoria === cat).forEach((b) => ordenItems.push(b));
  });

  const aristasCatNodo: Linea[] = [];
  const nodos: NodoDibujo[] = ordenItems.map((b, n) => {
    const p = puntos.get(b.id)!;
    const estado = estadoPorId.get(b.id)!;
    const padre = polar(R_CAT, anguloCat[b.categoria]!);
    const r = radioPorSeveridad[b.severidad];
    const delay = `${(9 + n) * PASO_MS}ms`;
    aristasCatNodo.push({
      key: `cn-${b.id}`,
      id: b.id,
      x1: padre.x,
      y1: padre.y,
      x2: p.x,
      y2: p.y,
      largo: Math.round(Math.hypot(p.x - padre.x, p.y - padre.y)),
      rol: rolCat(b.categoria),
      delay,
    });
    const derecha = p.x >= CX;
    const ky = r2(p.y - 38);
    return {
      id: b.id,
      estado,
      categoria: b.categoria,
      p,
      r,
      rol: rolCat(b.categoria),
      delay,
      tooltip: `${b.titulo} · ${CATEGORIAS_MAPA[b.categoria]} · impacto ${b.severidad} · ${ESTADO_PALABRA[estado]}`,
      etiqueta: {
        x: r2(p.x + (derecha ? r + 7 : -r - 7)),
        y: p.y,
        anchor: derecha ? 'start' : 'end',
        texto: corta(b.titulo, esDato(estado) ? 15 : 20),
      },
      tachado:
        estado === 'rechazada'
          ? { x1: r2(p.x - r * 0.62), y1: r2(p.y - r * 0.62), x2: r2(p.x + r * 0.62), y2: r2(p.y + r * 0.62) }
          : null,
      anilloDoble: estado === 'dominada' ? { r: r + 5 } : null,
      // La chispa gira sobre un rect invisible de 84 centrado en el nodo: sin esa
      // caja el grupo orbitaría sobre la propia chispa (Cabina, orbita L529-L536).
      logro:
        estado === 'dominada'
          ? {
              chispa:
                `M ${p.x} ${r2(ky - 6)} Q ${r2(p.x + 1.5)} ${r2(ky - 1.5)} ${r2(p.x + 6)} ${ky} ` +
                `Q ${r2(p.x + 1.5)} ${r2(ky + 1.5)} ${p.x} ${r2(ky + 6)} ` +
                `Q ${r2(p.x - 1.5)} ${r2(ky + 1.5)} ${r2(p.x - 6)} ${ky} ` +
                `Q ${r2(p.x - 1.5)} ${r2(ky - 1.5)} ${p.x} ${r2(ky - 6)} Z`,
              centro: { x: p.x, y: ky },
              caja: { x: r2(p.x - 42), y: r2(p.y - 42) },
            }
          : null,
    };
  });

  const lineas = lineasNombre(ocupacion, CARACTERES_POR_LINEA);
  const masAncho = lineas.reduce((m, l) => Math.max(m, l.length), 0) * UNIDAD_LETRA;
  const raiz = {
    r: Math.max(RAIZ_MIN, Math.min(RAIZ_MAX, Math.round(masAncho / 2 + 9))),
    lineas,
    rol: ROL_RAIZ,
  };

  // Un anillo guía solo se dibuja si hay algo apoyado sobre él.
  const anillos = [R_CAT];
  if (reconocidas.length > 0) anillos.push(R_DATO);
  if (pendientes.length > 0) anillos.push(R_BRECHA);

  const eventos = brechas
    .flatMap((b) => {
      const lista: { t: string; tipo: 'reconocida' | 'dominada'; b: BrechaDeMapa }[] = [];
      if (b.veredicto === 'confirmada' && b.veredictoEn) lista.push({ t: b.veredictoEn, tipo: 'reconocida', b });
      if (b.dominadaEn) lista.push({ t: b.dominadaEn, tipo: 'dominada', b });
      return lista;
    })
    .sort((a, b) => a.t.localeCompare(b.t));

  const caminoLista = eventos.map((e, i) => ({
    key: `${e.b.id}-${e.tipo}`,
    tipo: e.tipo,
    texto: `${e.tipo === 'reconocida' ? 'Reconociste' : 'Dominaste'} ${corta(e.b.titulo, 60)}`,
    numero: i + 1,
    iso: e.t,
  }));

  // La línea blanca del camino (brief, "NARRATIVA VISUAL": «una línea blanca
  // cronológica une los pasos hechos»). Se arma con los MISMOS eventos de la
  // lista de abajo, en el mismo orden: raíz → primer paso → segundo → … Dos
  // eventos del mismo nodo (primero reconocida, después dominada) producen un
  // segmento de largo cero que no se dibuja: la línea ya estaba ahí.
  //
  // Cada segmento entra recortado: sale desde el borde del disco de origen (la
  // raíz mide lo que mide) y se detiene MARGEN_CAMINO antes del nodo de destino.
  // La tinta nunca pinta sobre un nodo.
  const hitos: Punto[] = [
    { x: CX, y: CY },
    ...eventos.flatMap((e) => {
      const p = puntos.get(e.b.id);
      return p ? [p] : [];
    }),
  ];

  const segmentosCamino = hitos
    .slice(1)
    .map((b, i) => {
      const a = hitos[i];
      const total = Math.hypot(b.x - a.x, b.y - a.y);
      const salida = i === 0 ? raiz.r : MARGEN_CAMINO;
      const largo = total - salida - MARGEN_CAMINO;
      if (largo <= 0) return null;
      const ux = (b.x - a.x) / total;
      const uy = (b.y - a.y) / total;
      return {
        x1: r2(a.x + ux * salida),
        y1: r2(a.y + uy * salida),
        x2: r2(b.x - ux * MARGEN_CAMINO),
        y2: r2(b.y - uy * MARGEN_CAMINO),
        largo: Math.round(largo),
      };
    })
    .filter((s): s is { x1: number; y1: number; x2: number; y2: number; largo: number } => s !== null);

  // Reparto a velocidad constante: la suma de las duraciones ES el trazo completo
  // (1,7 s) y el último segmento aterriza exactamente a los 1,7 s. El camino
  // arranca cuando el último nodo ya terminó de nacer — el mismo (9+n)·PASO_MS del
  // anillo más los 300 ms del gesto `nacer`.
  const largoCamino = segmentosCamino.reduce((s, t) => s + t.largo, 0);
  const nacimientoMs = (9 + Math.max(ordenItems.length - 1, 0)) * PASO_MS + NACER_MS;
  let recorrido = 0;
  const caminoTrazos: TrazoCamino[] = segmentosCamino.map((s, i) => {
    const delay = nacimientoMs + Math.round((DUR_CAMINO_MS * recorrido) / largoCamino);
    const dur = Math.round((DUR_CAMINO_MS * s.largo) / largoCamino);
    recorrido += s.largo;
    return { key: `camino-${i}`, ...s, rol: ROL_CAMINO, delay: `${delay}ms`, dur: `${dur}ms` };
  });

  const ariaLabel =
    `Mapa radial de ${ocupacion}: en el centro, la persona. ${cats.length} categorías. ` +
    `${reconocidas.length} habilidades reconocidas en el anillo del medio, ` +
    `${pendientes.length} en el anillo de las brechas. ` +
    `${nodos.filter((x) => x.estado === 'dominada').length} dominadas con un logro en órbita.`;

  const leyenda: SalidaMapa['leyenda'] = [
    ...ORDEN.map((c) => ({ cat: c, texto: CATEGORIAS_MAPA[c], color: rolCat(c) })),
    { estado: 'pendiente', texto: ESTADO_PALABRA.pendiente },
    { estado: 'confirmada', texto: ESTADO_PALABRA.confirmada },
    { estado: 'dominada', texto: ESTADO_PALABRA.dominada },
    { estado: 'rechazada', texto: ESTADO_PALABRA.rechazada },
  ];

  return {
    geometria: { LADO, VIEWBOX, CX, CY, R_CAT, R_DATO, R_BRECHA, PASO_MS, ordenCategorias: ORDEN },
    anillos,
    raiz,
    categorias,
    aristasRaizCat,
    aristasCatNodo,
    nodos,
    ariaLabel,
    leyenda,
    caminoLista,
    caminoTrazos,
    caminoVacio:
      'Tu camino empieza con la primera brecha que reconozcas como real. Cada paso queda acá, con su fecha.',
  };
}
