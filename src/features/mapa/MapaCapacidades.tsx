// features/mapa/MapaCapacidades.tsx
// B3: port 1:1 del donante (bb1434fb/components/MapaCapacidades.tsx) a Omicrom.
// El componente NO calcula geometría: consume construirMapa() de mapaLayout.ts
// (congelado contra el DOM real del donante por scripts/oracle-donante.mjs) y
// pinta exactamente lo que ese modelo dice — cada `d`, cada cx/cy/r, cada delay
// y cada ROL de color. La coreografía es CSS puro (mapa.css): animation-delay
// inline por elemento, nunca framer-motion initial/animate (Invariante 1).
//
// Invariante 3 (color por rol, cero hex acá): el modelo emite roles ("cat:dura",
// "cat:dura+alfa", "nodo-hueco", "borde-pendiente", "borde-rechazada",
// "tinta-sobre-nodo"). El componente los pasa CRUDOS al DOM como
// data-rol-stroke / data-rol-fill y mapa.css traduce cada rol a su CSS var.
// Así el único lugar que conoce colores es el CSS de tokens, y contratoMapa
// puede seguir prohibiendo hex en este directorio.
//
// Invariante 2 (naciendo vs vivo): en 'naciendo' corren los delays del golden y
// el botón "Reproducir el nacimiento" remonta el SVG (key={semilla}, literal del
// donante). En 'vivo' todo animation-delay pasa a 0ms y el nodo que llega por
// realtime (recienId) solo hace brillar(); el remontaje jamás lo dispara un
// evento, solo el clic del usuario.
import { useMemo, useState } from 'react';
import { construirMapa, type BrechaDeMapa } from './mapaLayout';
import './mapa.css';

export type ModoMapa = 'naciendo' | 'vivo';

export interface MapaCapacidadesProps {
  ocupacion: string;
  brechas: BrechaDeMapa[];
  modo: ModoMapa;
  recienId?: string | null;
}

// El corta() del donante (L49-L51) es capa de PINTADO (no geometría): por eso
// vive acá y no en mapaLayout. La raíz lo usa a 15; el camino ya viene cortado
// a 60 por el modelo (caminoLista.texto).
function corta(texto: string, n: number): string {
  return texto.length > n ? `${texto.slice(0, n - 1).trimEnd()}…` : texto;
}

// fecha() literal del donante (L148-L151): Intl es-CL con día/mes/hora/minuto.
const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

export default function MapaCapacidades({ ocupacion, brechas, modo, recienId }: MapaCapacidadesProps) {
  const [semilla, setSemilla] = useState(0);
  const salida = useMemo(() => construirMapa({ ocupacion, brechas }), [ocupacion, brechas]);
  const g = salida.geometria;
  const vivo = modo === 'vivo';
  // Invariante 2: en 'vivo' no hay coreografía, todo nace en 0ms.
  const retr = (d: string): string => (vivo ? '0ms' : d);

  return (
    <section className="card mapa-caja">
      <div className="mapa-cabecera">
        <div>
          <h2 className="card-titulo" style={{ marginBottom: 6 }}>
            Tu mapa de capacidades
          </h2>
          <p className="mapa-sub">
            Cada nodo que reconoces se enciende; cada uno que dominas hace nacer un logro y agranda la red.
          </p>
        </div>
        <button type="button" className="boton" onClick={() => setSemilla((s) => s + 1)}>
          Reproducir el nacimiento
        </button>
      </div>

      <svg
        key={semilla}
        className="mapa-svg"
        viewBox={`0 0 ${g.W} ${g.H}`}
        role="img"
        aria-label={salida.ariaLabel}
      >
        <defs>
          {/* El degradado dorado de la raíz del donante vivía en hex acá; en el
              port son dos clases y el color cae en mapa.css (Invariante 3). */}
          <radialGradient id="gradRaiz">
            <stop offset="0%" className="mapa-raiz-stop-inicio" />
            <stop offset="100%" className="mapa-raiz-stop-fin" />
          </radialGradient>
          <filter id="brillo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={g.CX} cy={g.CY} r={g.RADIO_CAT} className="mapa-orbita" />
        <circle cx={g.CX} cy={g.CY} r={g.RADIO_BRECHA} className="mapa-orbita" />

        <g key={`aristas-${semilla}`}>
          {salida.aristasRaizCat.map((a) => (
            <path
              key={a.key}
              d={a.d}
              className="mapa-trazo"
              data-rol-stroke={a.stroke}
              style={{ animationDelay: retr(a.animationDelay) }}
              pathLength={a.pathLength}
            />
          ))}
          {salida.aristasCatBrecha.map((a) => (
            <path
              key={a.key}
              d={a.d}
              className="mapa-trazo mapa-trazo-suave"
              data-rol-stroke={a.stroke}
              style={{ animationDelay: retr(a.animationDelay) }}
              pathLength={a.pathLength}
              data-apagado={a['data-apagado']}
            />
          ))}
        </g>

        {salida.modelo.camino && (
          <path
            d={salida.modelo.camino}
            className="mapa-camino"
            style={{ animationDelay: retr(`${salida.modelo.caminoDelay}ms`) }}
            pathLength={1}
          />
        )}

        <g className="mapa-nodo" style={{ animationDelay: retr(`${salida.modelo.raizDelay}ms`) }}>
          <circle cx={g.CX} cy={g.CY} r={46} fill="url(#gradRaiz)" className="mapa-raiz" />
          {salida.lineasOcupacion.map((l, i) => (
            <text
              key={i}
              x={g.CX}
              y={g.CY + (i - (salida.lineasOcupacion.length - 1) / 2) * 15}
              className="mapa-raiz-texto"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {corta(l, 15)}
            </text>
          ))}
        </g>

        {salida.modelo.nodosCat.map((nc) => {
          const etiqueta = salida.labelsCat.find((lb) => lb.cat === nc.cat)!;
          return (
            <g key={nc.cat}>
              <g className="mapa-nodo" style={{ animationDelay: retr(`${nc.delay}ms`) }}>
                <circle
                  cx={nc.p.x}
                  cy={nc.p.y}
                  r={21}
                  data-rol-fill="nodo-hueco"
                  data-rol-stroke={`cat:${nc.cat}`}
                  strokeWidth={2}
                />
              </g>
              <text
                x={etiqueta.x}
                y={etiqueta.y}
                className="mapa-cat-texto"
                data-rol-fill={`cat:${nc.cat}`}
                textAnchor={etiqueta.anchor}
                dominantBaseline="middle"
                style={{ animationDelay: retr(etiqueta.animationDelay) }}
              >
                {etiqueta.texto}
              </text>
            </g>
          );
        })}

        {salida.nodosBrechaRender.map((n) => {
          const esRecien = Boolean(recienId) && recienId === n.id;
          const clase = `${n.clase}${esRecien && !vivo ? ' pulso' : ''}${esRecien && vivo ? ' mapa-brillar' : ''}`;
          return (
            <g key={n.id} data-id-brecha={n.id} className={clase} style={{ animationDelay: retr(n.animationDelay) }}>
              <title>{n.tooltip}</title>
              {n.anillo && (
                <circle cx={n.anillo.cx} cy={n.anillo.cy} r={n.anillo.r} className="mapa-anillo" data-rol-stroke={n.anillo.stroke} />
              )}
              <circle
                cx={n.circulo.cx}
                cy={n.circulo.cy}
                r={n.circulo.r}
                data-rol-fill={n.circulo.fill}
                data-rol-stroke={n.circulo.stroke}
                strokeWidth={n.circulo.strokeWidth}
                filter={n.circulo.filter ?? undefined}
              />
              {n.check && (
                <path
                  d={n.check.d}
                  fill="none"
                  data-rol-stroke={n.check.stroke}
                  strokeWidth={n.check.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        })}

        {salida.logrosRender.map((lr) => (
          <g key={lr.key} data-id-logro={lr.key} className="mapa-nodo" style={{ animationDelay: retr(lr.animationDelay) }}>
            <title>{lr.tooltip}</title>
            <path
              d={lr.trazo.d}
              className="mapa-trazo mapa-trazo-logro"
              data-rol-stroke={lr.trazo.stroke}
              style={{ animationDelay: retr(lr.trazo.animationDelay) }}
              pathLength={lr.trazo.pathLength}
            />
            <circle cx={lr.circulo.cx} cy={lr.circulo.cy} r={lr.circulo.r} data-rol-fill={lr.circulo.fill} filter={lr.circulo.filter} />
          </g>
        ))}
      </svg>

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
              // El modelo entrega `texto` ya armado ("Reconociste <titulo>");
              // se separa por el prefijo fijo para conservar el <strong> del
              // donante sin recalcular nada.
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
    </section>
  );
}
