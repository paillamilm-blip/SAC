// shared/components/OrbeEnVuelo.tsx
// ═══════════════════════════════════════════════════════════════════════
// EL DESCENSO DEL ORBE — continuidad de escena, no corte de pantalla.
//
// El orbe que preside la franja de arriba y la raíz dorada del mapa son la
// MISMA identidad (comparten orbGeometry). Cuando un análisis termina y el mapa
// aparece con contenido, el orbe de la franja vuela al centro y se planta ahí:
// esto es lo que el dueño pidió ver — «la orbe arriba de todo… y cuando ya se
// cargó todo el CV me aparece el mapa de capacidades y ahí todo se conecta».
//
// Es una copia que vuela, no el nodo de la franja viajando: sacarlo del
// `<header sticky>` desarmaría la franja, y el dueño de ese DOM no es el del
// mapa. Mientras dura el vuelo la franja esconde su orbe y el mapa deja su
// trama fuera (`orbe={false}`), así que hay UN solo orbe visible en cada
// instante. Al aterrizar, la trama del mapa aparece en el mismo punto exacto.
//
// Solo `transform` y `opacity`, con las duraciones y curvas de la familia
// (contrato de movimiento: ni layout animado, ni keyframes nuevos).
// prefers-reduced-motion: no hay vuelo, el orbe simplemente ya está.
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EASE, TIMING } from '@/theme';
import { GeodesicOrb } from './GeodesicOrb';

/** Un círculo en coordenadas de pantalla: centro + diámetro en px. */
export interface Circulo {
  x: number;
  y: number;
  d: number;
}

export interface Vuelo {
  izquierda: number;
  superior: number;
  lado: number;
  dx: number;
  dy: number;
  escala: number;
}

/**
 * De dos círculos sale el cuadro de partida (fijo, en px de pantalla) y el delta
 * hasta el destino. `escala` es el factor que hay que aplicar AL CUADRO de
 * partida para que termine midiendo lo que mide el destino: por eso el destino
 * entra con diámetro, no con radio.
 */
export function trayectoriaOrbe(origen: Circulo, destino: Circulo): Vuelo {
  const lado = origen.d;
  return {
    izquierda: origen.x - lado / 2,
    superior: origen.y - lado / 2,
    lado,
    dx: destino.x - origen.x,
    dy: destino.y - origen.y,
    escala: origen.d > 0 ? destino.d / origen.d : 1,
  };
}

const ms = (t: string): number => Number.parseInt(t, 10);

// El orbe de la franja, marcado en el propio OrbTopbar.
const mideFranja = (): Circulo | null => {
  const el = document.querySelector('[data-orbe="franja"]');
  if (!el) return null;
  const caja = el.getBoundingClientRect();
  if (caja.width <= 0) return null;
  return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2, d: caja.width };
};

// El destino NO se mide con getBoundingClientRect del disco: el disco está
// naciendo (escala 0.18 → 1) y medirlo ahora daría el centro de algo que todavía
// no llegó. Se traduce la coordenada del viewBox con la matriz del SVG, que es
// independiente de cualquier animación del dibujo.
const mideRaiz = (): Circulo | null => {
  const svg = document.querySelector('svg.mapa-svg');
  if (!(svg instanceof SVGSVGElement) || typeof svg.getScreenCTM !== 'function' || typeof DOMPoint === 'undefined') {
    return null;
  }
  const ctm = svg.getScreenCTM();
  const [x, y, d] = [svg.dataset.orbeX, svg.dataset.orbeY, svg.dataset.orbeD].map(Number);
  if (!ctm || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(d) || !(d > 0)) return null;
  const centro = new DOMPoint(x, y).matrixTransform(ctm);
  return { x: centro.x, y: centro.y, d: d * ctm.a };
};

interface Props {
  /** El acento del usuario: el orbe que vuela es el de la franja, no el del mapa. */
  color: string;
  /** Suena con el orbe ya plantado, o inmediatamente si no hay vuelo. */
  onPlantado: () => void;
}

export function OrbeEnVuelo({ color, onPlantado }: Props) {
  const [vuelo, setVuelo] = useState<Vuelo | null>(null);
  const [soltado, setSoltado] = useState(false);
  const fantasma = useRef<HTMLDivElement>(null);
  const plantado = useRef(false);

  // El callback vive en un ref para que `aterrizar` sea estable: si entrara en
  // las dependencias del efecto de montaje, cada render del padre reiniciaría el
  // vuelo desde cero. Declarado antes del efecto de abajo, este efecto es el
  // primero en correr y ya tiene la última versión cuando el vuelo arranca.
  const alPlantar = useRef(onPlantado);
  useEffect(() => {
    alPlantar.current = onPlantado;
  });

  const aterrizar = useCallback((): void => {
    if (plantado.current) return;
    plantado.current = true;
    alPlantar.current();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const origen = mideFranja();
    const destino = mideRaiz();
    if (reduce || !origen || !destino) {
      aterrizar();
      return;
    }
    setVuelo(trayectoriaOrbe(origen, destino));
  }, [aterrizar]);

  // FLIP: el estilo inicial tiene que pintar un frame antes de pedir el destino,
  // si no el navegador no ve cambio y no hay transición.
  useEffect(() => {
    if (!vuelo || !fantasma.current) return;
    fantasma.current.getBoundingClientRect();
    const id = requestAnimationFrame(() => setSoltado(true));
    return () => cancelAnimationFrame(id);
  }, [vuelo]);

  if (!vuelo) return null;

  const ida = ms(TIMING.slow) - ms(TIMING.fast);
  return createPortal(
    <div
      ref={fantasma}
      data-orbe="vuelo"
      aria-hidden="true"
      onTransitionEnd={(e) => {
        if (e.propertyName === 'transform') aterrizar();
      }}
      style={{
        position: 'fixed',
        left: vuelo.izquierda,
        top: vuelo.superior,
        width: vuelo.lado,
        height: vuelo.lado,
        zIndex: 60,
        pointerEvents: 'none',
        transformOrigin: 'center',
        transform: soltado ? `translate(${vuelo.dx}px, ${vuelo.dy}px) scale(${vuelo.escala})` : 'none',
        // Se apaga justo cuando llega: la trama del mapa aparece en su lugar.
        opacity: soltado ? 0 : 1,
        transition:
          `transform ${TIMING.slow} ${EASE.default}, ` +
          `opacity ${TIMING.fast} linear ${ida}ms`,
      }}
    >
      <GeodesicOrb size={vuelo.lado} nodes={12} color={color} spinning={0} breathing={false} intensity={0.7} />
    </div>,
    document.body,
  );
}
