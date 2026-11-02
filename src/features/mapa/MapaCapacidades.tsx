// features/mapa/MapaCapacidades.tsx
// El mapa radial de la Cabina pintado con los datos reales de Ómicrom.
//
// El componente NO calcula geometría: consume construirMapa() de mapaLayout.ts y
// pinta exactamente lo que ese modelo dice — cada cx/cy/r, cada delay y cada ROL
// de color. La coreografía es CSS puro (mapa.css): animation-delay inline por
// elemento, nunca framer-motion initial/animate (Invariante 1).
//
// Invariante 3 (color por rol, cero hex acá): el modelo emite roles ("cat:dura",
// "raiz", "logro"). El componente los pasa CRUDOS al DOM como data-rol-* y
// mapa.css traduce cada rol a su token. El único lugar que conoce colores es el
// CSS; contratoMapa.test.ts sigue prohibiendo hex en este directorio.
//
// Invariante 2 (naciendo vs vivo): en 'naciendo' corren los delays del modelo y
// el botón "Reproducir el nacimiento" remonta el SVG (key={semilla}). En 'vivo'
// todo animation-delay pasa a 0ms y el nodo que llega por realtime (recienId)
// solo hace brillar; el remontaje jamás lo dispara un evento, solo el clic.
//
// Decisión deliberada sobre la Cabina: los nodos NO son botones. En el teléfono
// el disco mide entre 18 y 24 px y el estándar de la app pide 44 px por objetivo;
// el mapa es role="img" con su resumen hablado y la decisión se toma en la cola,
// que sí cumple. En el laboratorio el tap era un atajo de ratón.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { construirMapa, type BrechaDeMapa, type TrazoCamino } from './mapaLayout';
import { tramaOrbe } from '@/shared/components/orbGeometry';
import './mapa.css';

export type ModoMapa = 'naciendo' | 'vivo';

export interface MapaCapacidadesProps {
  ocupacion: string;
  brechas: BrechaDeMapa[];
  modo: ModoMapa;
  recienId?: string | null;
  /** Pinta la trama del orbe sobre la raíz dorada. Es la escena de la portada. */
  orbe?: boolean;
  /** Sin cabecera, sin leyenda y sin camino: sólo el lienzo, para presidir el home. */
  escena?: boolean;
}

// El largo del trazo lo calcula el modelo, pero viaja al CSS como variable: la
// animación stroke-dash la ejecuta mapa.css y necesita saber cuánto ocultar.
const trazo = (largo: number, delay: string): CSSProperties =>
  ({ '--largo': largo, animationDelay: delay }) as CSSProperties;

// El camino trae además SU duración: el modelo reparte los 1,7 s del trazo entre
// los segmentos en proporción al largo, y mapa.css solo obedece.
const trazoCamino = (t: TrazoCamino, delay: string): CSSProperties =>
  ({ '--largo': t.largo, '--d-camino': t.dur, animationDelay: delay }) as CSSProperties;

// El SVG se dibuja en unidades de su viewBox y después se encoge entero para
// caber en la caja. Un `11px` de mapa vale 11 unidades, no 11 pixels: en el
// teléfono (mapa de ~360px sobre 772 unidades) serían 5 px reales de letra, y
// eso no se lee. El componente mide cuántos px vale una unidad y se lo pasa al
// CSS en --mapa-escala para que cada fuente se escriba en pantalla.
const ESCALA_MIN = 0.2;
const ESCALA_MAX = 1.5;
// Por debajo de esta escala la letra compensada empieza a pisar a su vecina:
// 8 etiquetas de nodo ya no caben alrededor del anillo. Ahí el mapa se queda
// con sus formas (anillos, discos, orbe, logros) y los nombres salen abajo, en
// HTML, donde sí se leen.
const ESCALA_LECTURA = 0.62;

// fecha() de la cronología: Intl es-CL con día/mes/hora/minuto.
const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

export default function MapaCapacidades({ ocupacion, brechas, modo, recienId, orbe, escena }: MapaCapacidadesProps) {
  const [semilla, setSemilla] = useState(0);
  const salida = useMemo(() => construirMapa({ ocupacion, brechas }), [ocupacion, brechas]);
  const g = salida.geometria;
  const vivo = modo === 'vivo';
  // La trama del orbe mide sobre el diámetro de la raíz: el disco es su caja,
  // no un dibujo al lado.
  const trama = useMemo(() => tramaOrbe(salida.raiz.r * 2.4, 12), [salida.raiz.r]);
  // Invariante 2: en 'vivo' no hay coreografía, todo nace en 0ms.
  const retr = (d: string): string => (vivo ? '0ms' : d);

  const lienzo = useRef<SVGSVGElement>(null);
  const caja = useRef<HTMLElement>(null);
  const [escala, setEscala] = useState(1);
  // Cuánto vale una unidad del viewBox en pantalla. Se mide, no se adivina: el
  // SVG se dibuja en unidades y después cabe en la caja, así que un `11px` de
  // mapa puede ser 5 px reales en el teléfono.
  //
  // DOS cosas que se midieron en el navegador y mandan el diseño:
  //   · Un <svg> NO es objetivo útil de ResizeObserver acá (ni siquiera dispara
  //     la observación inicial). El observador se engancha a la caja HTML y el
  //     número se lee del lienzo.
  //   · Con `height: auto` + `max-height: 100%`, el alto también recorta: la
  //     escala real es el mínimo de las dos, no el ancho.
  // El botón de remontaje monta un SVG nuevo (key={semilla}): todo se re-engancha
  // con la misma semilla, si no se mediría un nodo ya descolgado.
  useEffect(() => {
    const svg = lienzo.current;
    const contenedor = caja.current;
    if (!svg || !contenedor) return;
    const [, , vbAncho, vbAlto] = g.VIEWBOX.split(' ').map(Number);
    const mide = (): void => {
      const cajaSvg = svg.getBoundingClientRect();
      if (cajaSvg.width <= 0 || cajaSvg.height <= 0) return;
      const real = Math.min(cajaSvg.width / vbAncho, cajaSvg.height / vbAlto);
      setEscala(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, real)));
    };
    mide();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mide);
    ro?.observe(contenedor);
    window.addEventListener('resize', mide);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', mide);
    };
  }, [semilla, g.VIEWBOX]);
  const estrecho = escala < ESCALA_LECTURA;

  // La escena del home no lleva caja ni cola: arriba ya preside la franja del
  // orbe y abajo habla la barra. El mapa se muestra desnudo, como portada.
  return (
    <section ref={caja} className={escena ? 'mapa-escena' : 'card mapa-caja'}>
      {!escena && (
        <div className="mapa-cabecera">
          <div>
            <h2 className="card-titulo" style={{ marginBottom: 6 }}>
              Tu mapa de capacidades
            </h2>
            <p className="mapa-sub">
              Cada nodo que reconoces se muda al anillo de adentro; cada uno que dominas hace nacer un logro en órbita.
            </p>
          </div>
          <button type="button" className="boton" onClick={() => setSemilla((s) => s + 1)}>
            Reproducir el nacimiento
          </button>
        </div>
      )}

      <svg
        key={semilla}
        ref={lienzo}
        className="mapa-svg"
        viewBox={g.VIEWBOX}
        role="img"
        aria-label={salida.ariaLabel}
        data-estrecho={estrecho ? 'si' : 'no'}
        // El orbe de la franja necesita saber DÓNDE va a aterrizar. Se dice acá,
        // en unidades del viewBox, y quien lo consume traduce con getScreenCTM:
        // el disco está naciendo (escala 0.18 → 1) y medir su caja en pleno
        // nacimiento daría el centro de algo que todavía no llegó. Es el diámetro
        // de la trama: el mismo `raiz.r * 2.4` del `tramaOrbe` de abajo, para que
        // el orbe que vuela llegue a cubrir justo el que queda plantado.
        data-orbe-x={g.CX}
        data-orbe-y={g.CY}
        data-orbe-d={salida.raiz.r * 2.4}
        style={{ '--mapa-escala': escala } as CSSProperties}
      >
        {/* Los anillos guía se quedan en el workspace, donde la distancia al
            centro explica en qué anillo vive cada nodo. En la portada son tres
            órbitas decorativas alrededor de un mapa que todavía no tiene
            decisión tomada: la medida él la pidió fuera. */}
        {!escena && (
          <g className="mapa-anillos">
            {salida.anillos.map((r) => (
              <circle key={`anillo-${r}`} data-r={r} cx={g.CX} cy={g.CY} r={r} className="mapa-guia" />
            ))}
          </g>
        )}

        <g key={`aristas-${semilla}`}>
          {salida.aristasRaizCat.map((a) => (
            <line
              key={a.key}
              className="mapa-arista"
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              data-rol-stroke={a.rol}
              style={trazo(a.largo, retr(a.delay))}
            />
          ))}
          {salida.aristasCatNodo.map((a) => (
            <line
              key={a.key}
              className="mapa-arista"
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              data-id-brecha={a.id}
              data-rol-stroke={a.rol}
              style={trazo(a.largo, retr(a.delay))}
            />
          ))}
        </g>

        {/* La línea blanca del camino: lo que ya pasó, unido en orden. Va antes
            del nacimiento para que los discos queden encima de la tinta, y habla
            la lista fechada de abajo — acá es forma, no texto (aria-hidden). */}
        <g className="mapa-camino-caja" aria-hidden="true">
          {salida.caminoTrazos.map((t) => (
            <line
              key={t.key}
              className="mapa-camino"
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              data-rol-stroke={t.rol}
              style={trazoCamino(t, retr(t.delay))}
            />
          ))}
        </g>

        <g className="mapa-nace" style={{ animationDelay: retr('0ms') }}>
          <circle cx={g.CX} cy={g.CY} r={salida.raiz.r} className="mapa-raiz" data-rol-fill={salida.raiz.rol} />
          {orbe && (
            <g transform={`translate(${g.CX} ${g.CY})`}>
              <g className="mapa-orbe" aria-hidden="true">
                {trama.aristas.map((a, i) => (
                  <line key={`o${i}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} strokeOpacity={a.opacity * 0.75} />
                ))}
                {trama.puntos.map((p, i) => (
                  <circle key={`p${i}`} cx={p.x} cy={p.y} r={p.r} fillOpacity={p.opacity * 0.9} />
                ))}
              </g>
            </g>
          )}
          {salida.raiz.lineas.map((l, i) => (
            <text
              key={i}
              x={g.CX}
              y={g.CY - (salida.raiz.lineas.length - 1) * 6 + 4 + i * 12}
              className="mapa-raiz-nombre"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {l}
            </text>
          ))}
        </g>

        {salida.categorias.map((c) => (
          <g key={c.cat}>
            <g className="mapa-nace" style={{ animationDelay: retr(c.delay) }}>
              <circle cx={c.p.x} cy={c.p.y} r={16} className="mapa-nodo-cat" data-rol-stroke={`cat:${c.cat}`}>
                <title>{c.etiqueta}</title>
              </circle>
            </g>
            <text
              x={c.p.x}
              y={c.p.y - 24}
              className="mapa-cat-texto"
              data-rol-fill={`cat:${c.cat}`}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ animationDelay: retr(c.delay) }}
            >
              {c.etiqueta}
            </text>
          </g>
        ))}

        {salida.nodos.map((n) => {
          const esRecien = Boolean(recienId) && recienId === n.id;
          return (
            <g
              key={n.id}
              data-id-brecha={n.id}
              data-estado={n.estado}
              data-rol-stroke={n.rol}
              className={`mapa-nodo mapa-nace${esRecien && !vivo ? ' pulso' : ''}${esRecien && vivo ? ' mapa-brillar' : ''}`}
              style={{ animationDelay: retr(n.delay) }}
            >
              <title>{n.tooltip}</title>
              {/* El logro en órbita es la recompensa de DOMINAR una brecha, y esa
                  decisión se toma en el workspace. En la portada no hay decisión
                  tomada: sería un punto dando vueltas sobre datos de muestra. */}
              {n.logro && !escena && (
                <g className="mapa-orbita">
                  <rect x={n.logro.caja.x} y={n.logro.caja.y} width={84} height={84} fill="none" stroke="none" />
                  <circle cx={n.p.x} cy={n.p.y} r={32} className="mapa-guia" />
                  <path d={n.logro.chispa} className="mapa-chispa" data-rol-fill="logro" />
                </g>
              )}
              {n.anilloDoble && <circle cx={n.p.x} cy={n.p.y} r={n.anilloDoble.r} className="mapa-anillo-doble" />}
              <circle cx={n.p.x} cy={n.p.y} r={n.r} className="mapa-nodo-carne" />
              {n.tachado && (
                <line
                  className="mapa-tachado"
                  x1={n.tachado.x1}
                  y1={n.tachado.y1}
                  x2={n.tachado.x2}
                  y2={n.tachado.y2}
                />
              )}
            </g>
          );
        })}

        <g className="mapa-textos">
          {salida.nodos.map((n) => (
            <text
              key={`txt-${n.id}`}
              className="mapa-nodo-texto"
              x={n.etiqueta.x}
              y={n.etiqueta.y}
              textAnchor={n.etiqueta.anchor}
              dominantBaseline="middle"
              style={{ animationDelay: retr(n.delay) }}
            >
              {n.etiqueta.texto}
            </text>
          ))}
        </g>
      </svg>

      {escena && estrecho && (
        // El mapa de bolsillo no cabe con sus palabras adentro: la leyenda de
        // categorías baja a HTML, donde 12,5px sí son 12,5px. El resumen hablado
        // del SVG ya lo dice todo, así que esto es tinta para el ojo.
        <div className="mapa-escena-chips" aria-hidden="true">
          {salida.leyenda.flatMap((l) =>
            'cat' in l ? (
              [
                <span className="mapa-chip" key={`escena-${l.cat}`}>
                  <i data-rol-stroke={l.color} />
                  {l.texto}
                </span>,
              ]
            ) : [],
          )}
        </div>
      )}

      {!escena && (
        <>
      <div className="mapa-leyenda" aria-hidden="true">
        {salida.leyenda.map((c) =>
          'cat' in c ? (
            <span className="mapa-chip" key={`chip-${c.cat}`}>
              <i data-rol-stroke={c.color} />
              {c.texto}
            </span>
          ) : (
            <span className="mapa-chip mapa-chip-estado" key={`chip-${c.estado}`}>
              <i className="mapa-punto-estado" data-estado={c.estado} />
              {c.texto}
            </span>
          ),
        )}
      </div>

      <div className="camino-caja">
        <h3 className="card-titulo">El camino que llevas recorrido</h3>
        {salida.caminoLista.length === 0 ? (
          <p className="camino-vacio">{salida.caminoVacio}</p>
        ) : (
          <ol className="camino-lista">
            {salida.caminoLista.map((p) => {
              const prefijo = p.tipo === 'reconocida' ? 'Reconociste' : 'Dominaste';
              // El modelo entrega `texto` ya armado ("Reconociste <titulo>"); se
              // separa por el prefijo fijo para conservar el <strong> del donante
              // sin recalcular nada.
              const titulo = p.texto.slice(prefijo.length + 1);
              return (
                <li className="camino-paso" key={p.key}>
                  <span className="camino-punto" data-tipo={p.tipo} aria-hidden="true" />
                  <span className="camino-fecha">{fecha(p.iso)}</span>
                  <span className="camino-texto">
                    {prefijo} <strong>{titulo}</strong>
                  </span>
                  <span className="camino-num">{p.numero}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
        </>
      )}
    </section>
  );
}
