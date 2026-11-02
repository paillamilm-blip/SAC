// features/omicron/components/EscaneoDocumento.tsx
// El sello narrativo del brief: la silueta de un documento bajo un haz de luz
// que la recorre, con renglones que se encienden.
//
// Dos cosas acá no son decorativas:
//   · Los renglones son LOS RENGLONES REALES del CV que se está analizando. El
//     ancho de cada trazo sale del largo de la línea y los títulos se dibujan
//     más gruesos. Un adorno genérico diría lo mismo con cualquier CV.
//   · La proporción iluminada es la proporción de HITOS que ya ocurrieron
//     (`fraccionEscaneo`), así que la barra se queda quieta mientras la IA
//     piensa. Es exactamente lo que significa esperar una respuesta; el haz que
//     barre es lo que dice "sigo acá" sin prometer un porcentaje inventado.
import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Clock, Search, X } from 'lucide-react';
import { C, FONT, RADIUS, SIZE, SP, EASE, TIMING, ANIM } from '@/theme';
import { fraccionEscaneo, HITOS_ESCANEO, type Hito, type HitoEstado } from '@/hooks/useGemeloActivation';

// Geometría heredada del donante (cabina-lab): viewBox 220×290, renglones de
// y=32 con paso 7,6 y ancho proporcional al texto real.
const VB_ANCHO = 220;
const VB_ALTO = 290;
const Y_INICIAL = 32;
const PASO_RENGLON = 7.6;
const ANCHO_MIN = 34;
const ANCHO_MAX = 172;
const MAX_TRAZOS = 32;

export interface Trazo {
  y: number;
  w: number;
  h: number;
  titulo: boolean;
}

/** Cuántos renglones no vacíos tiene el documento (todos, no sólo los dibujados). */
export function renglonesDe(texto: string): number {
  return texto.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}

/**
 * Los primeros 32 renglones reales como trazos. Un renglón se considera título
 * si es corto, arranca en mayúscula y no termina en coma o punto: la forma de
 * encabezar un CV, no un diccionario de secciones.
 */
export function trazosDeDocumento(texto: string): Trazo[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_TRAZOS)
    .map((l, i) => {
      const titulo = l.length <= 28 && /^[A-ZÁÉÍÓÚÑ]/.test(l) && !/[,.;]$/.test(l);
      return {
        y: Y_INICIAL + i * PASO_RENGLON,
        w: Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, Math.round(l.length * 2.2))),
        h: titulo ? 4 : 3,
        titulo,
      };
    });
}

/** Cuántos trazos están encendidos ya: los primeros, siguiendo el haz hacia abajo. */
export function trazosEncendidos(trazos: readonly Trazo[], fraccion: number): number {
  return Math.round(trazos.length * fraccion);
}

const COLOR_ESTADO: Record<HitoEstado, string> = {
  espera: C.mut,
  activo: C.gold,
  hecho: C.green,
  fallido: C.red,
};

function Glifo({ estado }: { estado: HitoEstado }) {
  if (estado === 'hecho') return <Check size={13} aria-hidden="true" />;
  if (estado === 'fallido') return <X size={13} aria-hidden="true" />;
  if (estado === 'activo') return <Search size={13} aria-hidden="true" />;
  return <Clock size={13} aria-hidden="true" />;
}

interface Props {
  /** El texto que se está analizando: de acá salen los renglones dibujados. */
  texto: string;
  hitos: Hito[];
}

export function EscaneoDocumento({ texto, hitos }: Props) {
  const reduce = useReducedMotion() === true;
  const degradado = `omi-haz-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const trazos = trazosDeDocumento(texto);
  const fraccion = fraccionEscaneo(hitos);
  const encendidos = trazosEncendidos(trazos, fraccion);
  const hechos = hitos.filter((h) => h.estado === 'hecho').length;
  const total = HITOS_ESCANEO.length;

  return (
    <div
      style={{
        display: 'grid',
        gap: SP[6],
        alignItems: 'center',
        // auto-fit sobre el CONTENEDOR: colapsa a una columna en el bolsillo sin
        // enterarse del ancho del viewport, que es la trampa en la que esta app
        // ya se cayó una vez (el mapa salía a 0 px).
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        width: '100%',
        maxWidth: 820,
      }}
    >
      <svg
        viewBox={`0 0 ${VB_ANCHO} ${VB_ALTO}`}
        role="img"
        aria-labelledby={`${degradado}-resumen`}
        // El alto manda y el ancho sale de la proporción del papel. Con
        // `width:100%` + `maxHeight`, el `viewBox` 220x290 quedaba encajonado y
        // el documento se dibujaba con dos franjas vacías a los lados (medido en
        // el navegador a 418 px de alto: 300x159, escala 0,55).
        style={{ height: 'min(340px, 38vh)', width: 'auto', maxWidth: '100%', margin: '0 auto', display: 'block' }}
      >
        <title id={`${degradado}-resumen`}>
          {`Documento de ${renglonesDe(texto)} renglones bajo el haz de lectura: ${encendidos} trazos encendidos, ${hechos} de ${total} hitos completados.`}
        </title>
        <defs>
          <linearGradient id={degradado} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0" />
            <stop offset="45%" stopColor={C.gold} stopOpacity="0.85" />
            <stop offset="55%" stopColor={C.gold} stopOpacity="0.85" />
            <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="10" y="10" width="200" height="270" rx="14" fill={C.surface} stroke={C.line} strokeWidth="1.5" />
        <path d="M170 10h-36l36 36z" fill={C.surfaceLight} stroke={C.line} strokeWidth="1.5" />

        {trazos.map((t, i) => {
          const lit = i < encendidos;
          return (
            <motion.rect
              key={i}
              x="24"
              y={t.y}
              width={t.w}
              height={t.h}
              rx="1.5"
              initial={false}
              animate={{ fill: lit ? C.gold : t.titulo ? C.mut : C.line, opacity: lit ? 1 : 0.85 }}
              transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE.default }}
            />
          );
        })}

        {/* El haz: lo único en movimiento continuo. Con movimiento reducido no se
            dibuja — la barra y los hitos ya dicen lo mismo con palabras. */}
        {!reduce && trazos.length > 0 && (
          <rect
            x="10"
            y="0"
            width="200"
            height="42"
            rx="8"
            fill={`url(#${degradado})`}
            opacity="0.9"
            style={{ transformBox: 'fill-box', animation: ANIM.barrido }}
          />
        )}
      </svg>

      <div>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.mut }}>
          Procesando
        </span>

        <div
          role="progressbar"
          aria-label="Avance del análisis por hitos reales"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraccion * 100)}
          style={{ height: 6, marginTop: SP[4], background: C.surfaceLight, borderRadius: RADIUS.pill, overflow: 'hidden' }}
        >
          <motion.i
            initial={false}
            animate={{ scaleX: fraccion }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE.default }}
            style={{ display: 'block', width: '100%', height: '100%', background: C.gold, borderRadius: 'inherit', transformOrigin: 'left center' }}
          />
        </div>

        <ol aria-live="polite" aria-atomic="false" style={{ display: 'grid', gap: SP[1], margin: `${SP[4]}px 0 0`, padding: 0, listStyle: 'none' }}>
          {hitos.map((h) => (
            <li
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SP[3],
                minHeight: 44,
                padding: `${SP[1]}px ${SP[2]}px`,
                borderRadius: RADIUS.sm,
                color: h.estado === 'espera' ? C.mut : C.ink,
                opacity: h.estado === 'espera' ? 0.45 : 1,
                transition: `opacity ${TIMING.fast} ${EASE.default}, color ${TIMING.fast} ${EASE.default}`,
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 22,
                  height: 22,
                  flex: 'none',
                  borderRadius: RADIUS.pill,
                  border: `1px solid ${COLOR_ESTADO[h.estado]}`,
                  color: COLOR_ESTADO[h.estado],
                  background: h.estado === 'hecho' ? C.greenFaint : 'transparent',
                }}
              >
                <Glifo estado={h.estado} />
              </span>
              <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm }}>{h.etiqueta}</span>
              <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                {h.medida}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
