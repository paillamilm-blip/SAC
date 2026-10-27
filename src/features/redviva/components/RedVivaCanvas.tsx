// features/redviva/components/RedVivaCanvas.tsx
// EL MAPA. Dibuja la Red Viva en 2D (SVG), donde cada forma ES un dato.
//
// POR QUÉ 2D Y NO EL ORBE 3D:
// En una esfera la mitad de la información está siempre girando por detrás. El
// orbe anterior además (a) dibujaba vértices de un icosaedro que no eran datos,
// (b) ponía las etiquetas en coordenadas Fibonacci DISTINTAS de los puntos
// dibujados — de ahí la sensación de "no se entiende nada" — y (c) recalculaba
// las posiciones al crecer el perfil, así que el mapa se reordenaba solo.
// Acá: etiqueta y nodo comparten UNA coordenada, y el layout es determinista.
//
// GRAMÁTICA VISUAL (también funciona sin color):
//   • TU COLOR → lo tuyo. Círculo con marca = probado; aro = declarado;
//                doble aro = en prueba.
//   • DISTANCIA al centro = qué tan demostrado está. Núcleo = probado;
//                frontera = declarado sin comprobar.
// Ninguna categoría depende solo del color: la forma y el radio la distinguen.
//
// ACCESIBILIDAD: el mapa es la vista de conjunto, pero NO es el único camino.
// La interacción principal vive en la lista de RedVivaHome (filas de 44px, foco
// de teclado). Acá el SVG se anuncia como imagen con su resumen en aria-label.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, EASE, EASING, FONT, TIMING, SIZE } from '@/theme';
import type { EstadoNodo, NodoRed, RedVivaModel } from '../services/redViva';
import { NodoEstadoFormaSvg, type VarianteNodo } from './NodoEstadoMarca';

/**
 * El micro-momento de logro ("encaje") solo debe dispararse cuando un nodo
 * PASA a estado 'solido' (probado) desde otro estado, no en cada render ni al
 * montar. Además se anula bajo prefers-reduced-motion.
 *
 * Función pura y testeable: dado el estado previo, el nuevo y si el usuario
 * pide movimiento reducido, decide si corresponde reproducir el encaje.
 *
 *  • prev undefined  → primer render / nodo recién montado: NO anima (evita un
 *    "encaje" masivo al abrir la pantalla con habilidades ya probadas).
 *  • prev === 'solido' → ya estaba encajado: NO reanima.
 *  • reduceMotion    → nunca anima.
 */
export function shouldAnimateEncaje(
  prev: EstadoNodo | undefined,
  next: EstadoNodo,
  reduceMotion: boolean,
): boolean {
  if (reduceMotion) return false;
  if (next !== 'solido') return false;
  if (prev === undefined) return false;
  return prev !== 'solido';
}

/**
 * Lee la preferencia de movimiento reducido directamente del media query. Es
 * el mismo valor que consulta el CSS (@media prefers-reduced-motion). Se usa
 * junto a useReducedMotion() de framer-motion porque este último inicializa su
 * valor al montar y en entornos como jsdom no siempre relee un matchMedia
 * cambiado tras el montaje; consultar el media query en cada render garantiza
 * que la preferencia efectiva se respete de forma observable.
 */
function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const CSS_ID = 'omicron-redviva-css';

/** Escala del modelo (círculo unitario) a unidades del viewBox. */
const K = 100;

/** Radios de los dos carriles, en unidades del viewBox. */
const RADIO_NUCLEO = 42;
const RADIO_FRONTERA = 64;

/**
 * Inyecta las animaciones una sola vez. Respeta prefers-reduced-motion: con
 * movimiento reducido, el latido se congela en su estado visible (no desaparece
 * la información, solo deja de moverse).
 */
function useRedVivaCss(): void {
  useEffect(() => {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
@keyframes omi-rv-latido {
  0%, 100% { opacity: 0.42; transform: scale(1); }
  50%      { opacity: 0.95; transform: scale(1.14); }
}
.omi-rv-latido { animation: omi-rv-latido 2.1s ${EASE.default} infinite; transform-origin: center; transform-box: fill-box; }
@media (prefers-reduced-motion: reduce) {
  .omi-rv-latido { animation: none; opacity: 0.8; }
}
`;
    document.head.appendChild(style);
  }, []);
}

/** Convierte un hex (#rrggbb) a rgba con el alfa pedido. */
function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** Recorta una etiqueta larga sin cortar a la mitad de una palabra corta. */
function corto(text: string, max = 16): string {
  const t = String(text ?? '').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/**
 * El mapa solo ofrece selección directa cuando los objetivos de 44 px no se
 * pisan. En redes densas sigue siendo una imagen fiel y la lista inferior —con
 * botones reales de 44 px— es el camino de interacción sin ambigüedad.
 */
export function canvasTargetsAreDistinct(
  nodos: NodoRed[],
  renderedWidth: number,
  viewBoxWidth: number,
): boolean {
  const scale = Math.max(1, renderedWidth) / Math.max(1, viewBoxWidth);
  for (let i = 0; i < nodos.length; i += 1) {
    for (let j = i + 1; j < nodos.length; j += 1) {
      const distanceCss = Math.hypot(
        (nodos[i].x - nodos[j].x) * K * scale,
        (nodos[i].y - nodos[j].y) * K * scale,
      );
      if (distanceCss < 44) return false;
    }
  }
  return true;
}

function nodeVisualRadius(nodo: NodoRed, ownCount: number): number {
  const ringRadius = nodo.anillo === 0 ? RADIO_NUCLEO : RADIO_FRONTERA;
  const availableArc = ((Math.PI * 2) / Math.max(1, ownCount)) * ringRadius * 0.4;
  return Math.min(4.6 + nodo.r * 5.4, Math.max(3.4, availableArc));
}

/**
 * Agrupa formas que se pisan visualmente sin moverlas: el ángulo sigue siendo
 * memoria estable de la identidad. El canvas marca cada grupo con “+N” y la
 * lista accesible conserva los nombres y acciones de todos sus integrantes.
 */
export function canvasOverlapClusters(
  nodos: NodoRed[],
  renderedWidth: number,
  viewBoxWidth: number,
): string[][] {
  const scale = Math.max(1, renderedWidth) / Math.max(1, viewBoxWidth);
  const ownCount = nodos.length;
  const radii = nodos.map((nodo) => nodeVisualRadius(nodo, ownCount));
  const parent = nodos.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < nodos.length; i += 1) {
    for (let j = i + 1; j < nodos.length; j += 1) {
      const distanceCss = Math.hypot(
        (nodos[i].x - nodos[j].x) * K * scale,
        (nodos[i].y - nodos[j].y) * K * scale,
      );
      const minimumClearanceCss = (radii[i] + radii[j]) * scale + 2;
      if (distanceCss < minimumClearanceCss) union(i, j);
    }
  }

  const groups = new Map<number, string[]>();
  nodos.forEach((nodo, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(nodo.id);
    groups.set(root, group);
  });
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.sort())
    .sort((a, b) => a[0].localeCompare(b[0]));
}

export interface RedVivaCanvasProps {
  model: RedVivaModel;
  /** Color elegido por el usuario para su Gemelo Digital. */
  userColor: string;
  /** Reputación 0-100 que se muestra en el centro. */
  reputacion: number;
  /** id del nodo seleccionado (se resalta y muestra su etiqueta). */
  seleccionado?: string | null;
  onSelect?: (nodo: NodoRed) => void;
  /** Lado del cuadrado en px. El SVG es responsivo dentro de eso. */
  size?: number;
  /**
   * Skin del nodo. 'circulo' (default) conserva la gramática original; 'pieza'
   * activa el "sabor A": el estado probado se dibuja como pieza de rompecabezas
   * encajada y su llegada a 'solido' reproduce la micro-animación de encaje.
   */
  varianteNodo?: VarianteNodo;
}

export function RedVivaCanvas({
  model,
  userColor,
  reputacion,
  seleccionado,
  onSelect,
  size = 320,
  varianteNodo = 'circulo',
}: RedVivaCanvasProps) {
  useRedVivaCss();
  const reduceMotion = useReducedMotion();
  // Combina el hook de framer-motion con la lectura directa del media query:
  // basta con que cualquiera indique movimiento reducido para anular el encaje.
  const reduceMotionValue = (reduceMotion ?? false) || prefersReducedMotionNow();
  // Memoria del estado anterior de cada nodo para detectar la transición a
  // 'solido'. No se dibuja: solo alimenta shouldAnimateEncaje. Se actualiza en
  // un efecto tras el render para no leer/escribir durante el mismo.
  const estadoPrevioRef = useRef<Map<string, EstadoNodo>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(size);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setRenderedWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const uc = userColor;

  // ── El viewBox se ajusta al contenido ────────────────────────────────
  // Con un viewBox fijo, un usuario nuevo con 3 habilidades quedaba con tres
  // circulitos perdidos en una caja enorme (se vio en pantalla). Ahora el
  // encuadre se cierra cuando hay poco.
  const radioContenido = Math.max(50, ...model.nodos.map((n) => Math.hypot(n.x, n.y) * K));
  const margen = 12;
  const medio = radioContenido + margen;
  const viewBoxWidth = medio * 2;
  // 44 CSS px mínimos, convertidos a las unidades reales del viewBox.
  const hitRadius = (44 / 2) * (viewBoxWidth / Math.max(1, renderedWidth));
  const canSelect = Boolean(onSelect);
  const mapInteractive = useMemo(
    () => canSelect && canvasTargetsAreDistinct(model.nodos, renderedWidth, viewBoxWidth),
    [canSelect, model.nodos, renderedWidth, viewBoxWidth],
  );
  const overlapClusters = useMemo(
    () => canvasOverlapClusters(model.nodos, renderedWidth, viewBoxWidth),
    [model.nodos, renderedWidth, viewBoxWidth],
  );
  const overlapCountByAnchor = useMemo(
    () => new Map(overlapClusters.map((group) => [group[0], group.length])),
    [overlapClusters],
  );

  // Qué nodos acaban de pasar a 'solido' en este render: son los únicos que
  // reproducen el encaje. Se calcula contra el estado previo memorizado.
  const encajeByNodo = useMemo(() => {
    const previo = estadoPrevioRef.current;
    return new Map(
      model.nodos.map((n) => [
        n.id,
        shouldAnimateEncaje(previo.get(n.id), n.estado, reduceMotionValue),
      ]),
    );
  }, [model.nodos, reduceMotionValue]);

  // Tras pintar, la foto de estados pasa a ser el "previo" del próximo render.
  useEffect(() => {
    estadoPrevioRef.current = new Map(model.nodos.map((n) => [n.id, n.estado]));
  }, [model.nodos]);

  // Tus habilidades (probadas y declaradas) comparten UNA sola secuencia angular,
  // así que el cupo por slot lo marca el total, no cuántas hay en cada anillo.
  const cantidadPropias = Math.max(1, model.nodos.length);

  const resumenAria =
    (model.totales.declaradas === 0
      ? 'Red vacía: todavía no hay habilidades.'
      : `Red de ${model.totales.declaradas} habilidades: ${model.totales.probadas} probadas, ` +
        `${model.totales.declaradas - model.totales.probadas} solo declaradas.`) +
    (overlapClusters.length > 0
      ? ` ${overlapClusters.length} ${overlapClusters.length === 1 ? 'grupo reúne' : 'grupos reúnen'} habilidades cercanas; la lista muestra cada una por separado.`
      : '');

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        maxWidth: size,
        aspectRatio: '1 / 1',
        position: 'relative',
        margin: '0 auto',
      }}
    >
      <svg
        viewBox={`${-medio} ${-medio} ${medio * 2} ${medio * 2}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={resumenAria}
        data-map-interactive={mapInteractive ? 'true' : 'false'}
        style={{ overflow: 'hidden', display: 'block' }}
      >
        <defs>
          <radialGradient id="omi-rv-core">
            <stop offset="0%" stopColor={alpha(uc, 0.55)} />
            <stop offset="70%" stopColor={alpha(uc, 0.14)} />
            <stop offset="100%" stopColor={alpha(uc, 0)} />
          </radialGradient>
        </defs>

        {/* ── Anillos guía: hacen legible que "adentro" es mejor ──────────
            Coinciden con los radios de redViva.ts (0.42 / 0.64 × 100). */}
        {[RADIO_NUCLEO, RADIO_FRONTERA].map((r) => (
          <circle
            key={r}
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke={alpha(uc, 0.08)}
            strokeWidth={0.6}
          />
        ))}

        {/* ── Radios: el centro sos vos; todo lo tuyo cuelga de ahí ──────── */}
        <g>
          {model.nodos.map((n) => (
            <line
              key={`r${n.id}`}
              x1={0}
              y1={0}
              x2={n.x * K}
              y2={n.y * K}
              stroke={alpha(uc, n.estado === 'solido' ? 0.22 : 0.09)}
              strokeWidth={n.estado === 'solido' ? 1 : 0.7}
              strokeDasharray={n.estado === 'hueco' ? '1.5 3' : undefined}
            />
          ))}
        </g>

        {/* ── El centro sos vos ──────────────────────────────────────────── */}
        <circle cx={0} cy={0} r={30} fill="url(#omi-rv-core)" />
        <circle cx={0} cy={0} r={17} fill={alpha(uc, 0.1)} stroke={alpha(uc, 0.5)} strokeWidth={1} />
        <text
          x={0}
          y={1.5}
          textAnchor="middle"
          style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, fill: C.ink }}
        >
          {Math.round(reputacion)}
        </text>
        <text
          x={0}
          y={9.5}
          textAnchor="middle"
          style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, fill: alpha(uc, 0.75), letterSpacing: 0.4 }}
        >
          /100
        </text>

        {/* ── Los nodos ──────────────────────────────────────────────────── */}
        {model.nodos.map((n) => {
          const x = n.x * K;
          const y = n.y * K;
          const r = nodeVisualRadius(n, cantidadPropias);
          const activo = seleccionado === n.id;
          const stackedCount = overlapCountByAnchor.get(n.id) ?? 0;
          // Solo se rotula lo seleccionado: la lista inferior ya ofrece cada
          // nombre en un objetivo táctil de 44 px y rotular todo tapa el mapa.
          const mostrarEtiqueta = activo;
          const base = uc;
          const derecha = x >= 0;
          const haciaDentro = Math.abs(x) > medio * 0.45;
          const labelX = haciaDentro
            ? (derecha ? -r - 5 : r + 5)
            : (derecha ? r + 5 : -r - 5);
          const labelAnchor = haciaDentro
            ? (derecha ? 'end' : 'start')
            : (derecha ? 'start' : 'end');
          const animarEncaje = encajeByNodo.get(n.id) ?? false;

          return (
            <motion.g
              key={n.id}
              initial={false}
              animate={{ transform: `translate(${x}px, ${y}px)`, opacity: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: Number.parseInt(TIMING.normal, 10) / 1000, ease: EASING.standard }
              }
              onClick={mapInteractive ? () => onSelect?.(n) : undefined}
              style={{ cursor: mapInteractive ? 'pointer' : 'default' }}
            >
              <circle
                cx={0}
                cy={0}
                r={Math.max(r + 3, hitRadius)}
                fill="transparent"
                pointerEvents={mapInteractive ? 'auto' : 'none'}
              />

              {activo ? (
                <circle cx={0} cy={0} r={r + 6} fill="none" stroke={alpha(base, 0.55)} strokeWidth={1.2} />
              ) : null}

              {/* La FORMA es un hijo animable aparte: al pasar a 'solido' hace el
                  micro-momento de "encaje" (SOLO transform/opacity, <=300ms, con
                  un leve overshoot). El translate del carril lo maneja la <g>
                  padre; acá solo hay escala+opacidad, sin loops permanentes.
                  Bajo prefers-reduced-motion, animarEncaje ya es false. */}
              <motion.g
                // data-encaje expone el resultado del cableado memo+ref+efecto:
                // 'true' SOLO en los nodos que acaban de transicionar a probado
                // (los únicos que reproducen el micro-momento). Es el gancho que
                // permite testear a nivel de render que solo esos animan.
                data-encaje={animarEncaje ? 'true' : 'false'}
                initial={animarEncaje ? { scale: 0.7, opacity: 0.35 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  animarEncaje
                    ? { duration: Number.parseInt(TIMING.normal, 10) / 1000, ease: EASING.spring }
                    : { duration: 0 }
                }
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <NodoEstadoFormaSvg
                  estado={n.estado}
                  color={base}
                  r={r}
                  variante={varianteNodo}
                  className={n.estado === 'latiendo' ? 'omi-rv-latido' : undefined}
                />
              </motion.g>

              {stackedCount > 1 ? (
                <g aria-hidden="true" transform={`translate(${r + 5} ${-r - 5})`}>
                  <circle r={6.5} fill={C.bg} stroke={base} strokeWidth={1} />
                  <text
                    x={0}
                    y={2.5}
                    textAnchor="middle"
                    style={{ fontFamily: FONT.mono, fontSize: 6.5, fontWeight: 700, fill: C.ink }}
                  >
                    +{stackedCount - 1}
                  </text>
                </g>
              ) : null}

              {mostrarEtiqueta ? (
                <text
                  x={labelX}
                  y={3}
                  textAnchor={labelAnchor}
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 9,
                    fontWeight: 700,
                    fill: C.ink,
                    paintOrder: 'stroke',
                    stroke: C.bg,
                    strokeWidth: 2.8,
                    strokeLinejoin: 'round',
                  }}
                >
                  {corto(n.label, 18)}
                </text>
              ) : null}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
