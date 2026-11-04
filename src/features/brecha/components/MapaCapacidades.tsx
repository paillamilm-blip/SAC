import { useEffect, useMemo, useState } from "react";
import { estaDominada } from "../domain/dominio";
import { evidenciaAusente } from "../domain/validar";
import type { Brecha, BrechaCerrada, CategoriaBrecha } from "../domain/types";
import { CATEGORIAS } from "../domain/types";

const ORDEN: CategoriaBrecha[] = ["dura", "blanda", "conocimiento", "credencial"];

const COLOR_CAT: Record<CategoriaBrecha, string> = {
  dura: "#6aa9ff",
  blanda: "#f2b134",
  conocimiento: "#3ddc97",
  credencial: "#c084fc",
};

const COLOR_CERRADA = "#3ddc97";

const RADIO_CAT = 170;
const RADIO_BRECHA = 296;
const RADIO_LOGRO = 352;
const RADIO_CERRADA = 330;
const W = 980;
const H = 720;
const CX = W / 2;
const CY = H / 2;
const PASO_MS = 45;

type Punto = { x: number; y: number };

// Node y el navegador no devuelven el mismo double para Math.cos/sin (1 ULP de
// diferencia), lo que rompe la hidratación: se redondea antes de pintar.
function r2(n: number) {
  return Math.round(n * 100) / 100;
}

function polar(radio: number, angulo: number): Punto {
  const a = (angulo * Math.PI) / 180;
  return { x: r2(CX + radio * Math.cos(a)), y: r2(CY + radio * Math.sin(a)) };
}

function curva(p: Punto, q: Punto, semilla: number) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dist = r2(Math.hypot(dx, dy)) || 1;
  const off = dist * 0.11 * (semilla % 2 === 0 ? 1 : -1);
  return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} Q ${((p.x + q.x) / 2 - (dy / dist) * off).toFixed(1)} ${(
    (p.y + q.y) / 2 +
    (dx / dist) * off
  ).toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
}

function corta(texto: string, n: number) {
  return texto.length > n ? `${texto.slice(0, n - 1).trimEnd()}…` : texto;
}

function RadioCirculo({ r }: { r: number }) {
  return <circle cx={CX} cy={CY} r={r} className="mapa-orbita" />;
}

export default function MapaCapacidades({
  ocupacion,
  brechas,
  recienId,
  cerradas,
}: {
  ocupacion: string;
  brechas: Brecha[];
  recienId: string | null;
  cerradas: BrechaCerrada[];
}) {
  const [semilla, setSemilla] = useState(0);
  const [movil, setMovil] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 560px)");
    setMovil(mq.matches);
    const cambiar = () => setMovil(mq.matches);
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, []);

  const modelo = useMemo(() => {
    let paso = 0;
    const siguiente = () => paso++ * PASO_MS;

    const raizDelay = siguiente();
    const cats = ORDEN.filter((c) => brechas.some((b) => b.categoria === c));
    const n = Math.max(cats.length, 1);

    const nodosCat: { cat: CategoriaBrecha; p: Punto; delay: number; labelDelay: number }[] = [];
    const nodosBrecha: { b: Brecha; p: Punto; pCat: Punto; ang: number; delay: number }[] = [];

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
      .filter((nb) => estaDominada(nb.b))
      .map((nb) => ({ nb, p: polar(RADIO_LOGRO, nb.ang + 8), delay: siguiente() }));

    const nodosCerrada = cerradas.map((c, i) => {
      const ang = -90 + (i * 360) / Math.max(cerradas.length, 1) + 18;
      return { c, p: polar(RADIO_CERRADA, ang), delay: siguiente() };
    });

    type Evento = {
      t: string;
      tipo: "reconocida" | "dominada" | "cerrada";
      id: string;
      titulo: string;
      p: Punto | undefined;
    };
    const eventos: Evento[] = [
      ...brechas.flatMap((b) => {
        const p = nodosBrecha.find((nb) => nb.b.id === b.id)?.p;
        const lista: Evento[] = [];
        if (b.veredicto === "confirmada" && b.veredictoEn)
          lista.push({ t: b.veredictoEn, tipo: "reconocida", id: b.id, titulo: b.titulo, p });
        if (estaDominada(b) && b.dominadaEn) lista.push({ t: b.dominadaEn, tipo: "dominada", id: b.id, titulo: b.titulo, p });
        return lista;
      }),
      ...nodosCerrada.map(({ c, p }) => ({ t: c.fecha, tipo: "cerrada" as const, id: c.id, titulo: c.titulo, p })),
    ].sort((a, b) => a.t.localeCompare(b.t));

    let camino = "";
    if (eventos.length > 0) {
      camino = `M ${CX} ${CY}`;
      let previo: Punto = { x: CX, y: CY };
      for (const e of eventos) {
        if (!e.p) continue;
        const p = e.p;
        const d = r2(Math.hypot(p.x - previo.x, p.y - previo.y)) || 1;
        const ux = r2(((p.x - previo.x) / d) * 10) / 10;
        const uy = r2(((p.y - previo.y) / d) * 10) / 10;
        camino += ` L ${(p.x - ux * 24).toFixed(1)} ${(p.y - uy * 24).toFixed(1)}`;
        previo = p;
      }
    }
    const caminoDelay = paso * PASO_MS + 150;

    return { raizDelay, nodosCat, nodosBrecha, logros, nodosCerrada, eventos, camino, caminoDelay };
  }, [brechas, cerradas]);

  const reconocidas = brechas.filter((b) => b.veredicto === "confirmada").length;
  const dominadas = brechas.filter(estaDominada).length;
  const rechazadas = brechas.filter((b) => b.veredicto === "rechazada").length;

  const lineasOcupacion = useMemo(() => {
    const palabras = ocupacion.split(" ");
    const lineas: string[] = [];
    let actual = "";
    for (const p of palabras) {
      if ((actual + " " + p).trim().length > 13 && actual) {
        lineas.push(actual);
        actual = p;
      } else {
        actual = (actual + " " + p).trim();
      }
      if (lineas.length === 2) break;
    }
    if (lineas.length < 2 && actual) lineas.push(actual);
    return lineas.slice(0, 2);
  }, [ocupacion]);

  const fecha = (iso: string) =>
    new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );

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
        <button className="boton" onClick={() => setSemilla((s) => s + 1)}>
          Reproducir el nacimiento
        </button>
      </div>

      <svg
        key={semilla}
        className="mapa-svg"
        viewBox={movil ? "105 -10 770 780" : `0 0 ${W} ${H}`}
        role="img"
        aria-label={`Mapa de capacidades de ${ocupacion}: ${brechas.length} brechas detectadas, ${reconocidas} reconocidas, ${dominadas} dominadas y ${rechazadas} descartadas.${
          cerradas.length > 0 ? ` ${cerradas.length} brechas cerradas desde el análisis anterior.` : ""
        }`}
      >
        <defs>
          <radialGradient id="u-gradRaiz">
            <stop offset="0%" stopColor="#f7c45c" />
            <stop offset="100%" stopColor="#c98a12" />
          </radialGradient>
          <filter id="u-brillo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <RadioCirculo r={RADIO_CAT} />
        <RadioCirculo r={RADIO_BRECHA} />
        {modelo.nodosCerrada.length > 0 && <RadioCirculo r={RADIO_CERRADA} />}

        <g key={`aristas-${semilla}`}>
          {modelo.nodosCat.map((nc, i) => (
            <path
              key={`rc-${nc.cat}`}
              d={curva({ x: CX, y: CY }, nc.p, i)}
              className="mapa-trazo"
              stroke={COLOR_CAT[nc.cat]}
              style={{ animationDelay: `${nc.delay}ms` }}
              pathLength={1}
            />
          ))}
          {modelo.nodosBrecha.map((nb, i) => (
            <path
              key={`cb-${nb.b.id}`}
              d={curva(nb.pCat, nb.p, i)}
              className="mapa-trazo mapa-trazo-suave"
              stroke={COLOR_CAT[nb.b.categoria]}
              style={{ animationDelay: `${nb.delay}ms` }}
              pathLength={1}
              data-apagado={nb.b.veredicto === "rechazada"}
              data-evidencia={evidenciaAusente(nb.b.evidencia) ? "ausente" : "cita"}
            />
          ))}
        </g>

        {modelo.camino && (
          <path
            d={modelo.camino}
            className="mapa-camino"
            style={{ animationDelay: `${modelo.caminoDelay}ms` }}
            pathLength={1}
          />
        )}

        <g className="mapa-nodo" style={{ animationDelay: `${modelo.raizDelay}ms` }}>
          <circle cx={CX} cy={CY} r={46} fill="url(#u-gradRaiz)" className="mapa-raiz" />
          {lineasOcupacion.map((l, i) => (
            <text
              key={i}
              x={CX}
              y={CY + (i - (lineasOcupacion.length - 1) / 2) * 15}
              className="mapa-raiz-texto"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {corta(l, 15)}
            </text>
          ))}
        </g>

        {modelo.nodosCat.map((nc) => {
          const angRad = Math.atan2(nc.p.y - CY, nc.p.x - CX);
          const cos = Math.cos(angRad);
          const sin = Math.sin(angRad);
          let lx = r2(nc.p.x);
          let ly = r2(nc.p.y);
          let anchor: "start" | "middle" | "end" = "middle";
          if (cos > 0.35) {
            anchor = "start";
            lx = r2(nc.p.x + 31);
            ly = r2(nc.p.y + 4);
          } else if (cos < -0.35) {
            anchor = "end";
            lx = r2(nc.p.x - 31);
            ly = r2(nc.p.y + 4);
          } else {
            ly = sin < 0 ? r2(nc.p.y - 34) : r2(nc.p.y + 40);
          }
          return (
            <g key={nc.cat}>
              <g className="mapa-nodo" style={{ animationDelay: `${nc.delay}ms` }}>
                <circle cx={nc.p.x} cy={nc.p.y} r={21} fill="#171b21" stroke={COLOR_CAT[nc.cat]} strokeWidth={2} />
              </g>
              <text
                x={lx}
                y={ly}
                className="mapa-cat-texto"
                fill={COLOR_CAT[nc.cat]}
                textAnchor={anchor}
                dominantBaseline="middle"
                style={{ animationDelay: `${nc.labelDelay}ms` }}
              >
                {CATEGORIAS[nc.cat].toUpperCase()}
              </text>
            </g>
          );
        })}

        {modelo.nodosBrecha.map((nb) => {
          const { b, p } = nb;
          const color = COLOR_CAT[b.categoria];
          const r = b.severidad === "alta" ? 14 : b.severidad === "media" ? 11.5 : 9.5;
          const dominada = estaDominada(b);
          const confirmada = b.veredicto === "confirmada";
          const rechazada = b.veredicto === "rechazada";
          const estado = rechazada ? "rechazada" : dominada ? "dominada" : confirmada ? "confirmada" : "pendiente";

          return (
            <g
              key={b.id}
              className={`mapa-nodo mapa-brecha mapa-brecha-${estado}${recienId === b.id ? " pulso" : ""}`}
              style={{ animationDelay: `${nb.delay}ms` }}
            >
              <title>{`${b.titulo} · ${CATEGORIAS[b.categoria]} · impacto ${b.severidad} · ${
                evidenciaAusente(b.evidencia) ? "falta en el CV" : "con cita del CV"
              } · ${estado}`}</title>
              {dominada && <circle cx={p.x} cy={p.y} r={r + 7} className="mapa-anillo" stroke={color} />}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={dominada ? color : confirmada ? `${color}2e` : "#171b21"}
                stroke={rechazada ? "#454d57" : confirmada || dominada ? color : "#4b545f"}
                strokeWidth={confirmada || dominada ? 2.4 : 1.6}
                filter={dominada ? "url(#u-brillo)" : undefined}
              />
              {dominada && (
                <path
                  d={`M ${r2(p.x - 4.5)} ${r2(p.y)} l 3.2 3.6 l 6 -7`}
                  fill="none"
                  stroke="#0b0d10"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        })}

        {modelo.nodosCerrada.map(({ c, p, delay }) => (
          <g key={`ce-${c.id}`} className="mapa-nodo" style={{ animationDelay: `${delay}ms` }}>
            <title>{`Cerrada desde el análisis anterior · ${c.titulo} · ${CATEGORIAS[c.categoria]} · ${
              c.motivo === "dominada" ? "la dominaste" : "ya no aparece en este CV"
            }`}</title>
            <circle cx={p.x} cy={p.y} r={8.5} fill="#0e211a" stroke={COLOR_CERRADA} strokeWidth={2} />
            <path
              d={`M ${r2(p.x - 3.4)} ${r2(p.y)} l 2.4 2.8 l 4.6 -5.4`}
              fill="none"
              stroke={COLOR_CERRADA}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {modelo.logros.map(({ nb, p, delay }) => (
          <g key={`logro-${nb.b.id}`} className="mapa-nodo" style={{ animationDelay: `${delay}ms` }}>
            <title>{`Logro: ${nb.b.titulo}`}</title>
            <path
              d={curva(nb.p, p, 1)}
              className="mapa-trazo mapa-trazo-logro"
              stroke={COLOR_CAT[nb.b.categoria]}
              style={{ animationDelay: `${delay}ms` }}
              pathLength={1}
            />
            <circle cx={p.x} cy={p.y} r={6} fill={COLOR_CAT[nb.b.categoria]} filter="url(#u-brillo)" />
          </g>
        ))}
      </svg>

      <div className="mapa-leyenda" aria-hidden="true">
        {ORDEN.map((c) => (
          <span className="mapa-chip" key={c}>
            <i style={{ background: COLOR_CAT[c] }} />
            {CATEGORIAS[c]}
          </span>
        ))}
        <span className="mapa-chip mapa-chip-estado">
          <i className="mapa-punto-estado" data-estado="pendiente" />
          detectada
        </span>
        <span className="mapa-chip mapa-chip-estado">
          <i className="mapa-punto-estado" data-estado="confirmada" />
          reconocida
        </span>
        <span className="mapa-chip mapa-chip-estado">
          <i className="mapa-punto-estado" data-estado="dominada" />
          dominada
        </span>
        <span className="mapa-chip mapa-chip-estado">
          <i className="mapa-punto-estado" data-estado="rechazada" />
          descartada
        </span>
        <span className="mapa-chip">
          <i className="mapa-linea" data-evidencia="cita" />
          línea gruesa: el CV lo cita
        </span>
        <span className="mapa-chip">
          <i className="mapa-linea" data-evidencia="ausente" />
          línea fina: falta en el CV
        </span>
        {cerradas.length > 0 && (
          <span className="mapa-chip mapa-chip-estado">
            <i className="mapa-punto-estado" data-estado="cerrada" />
            cerrada del CV anterior
          </span>
        )}
      </div>

      <div className="camino-caja">
        <h3 className="card-titulo">El camino que llevas recorrido</h3>
        {modelo.eventos.length === 0 ? (
          <p className="camino-vacio">
            Tu camino empieza con la primera brecha que reconozcas como real. Cada paso queda fechado aquí y dibujado
            sobre el mapa.
          </p>
        ) : (
          <ol className="camino-lista">
            {modelo.eventos.map((e, i) => (
              <li className="camino-paso" key={`${e.id}-${e.tipo}`}>
                <span className="camino-punto" data-tipo={e.tipo} aria-hidden="true" />
                <span className="camino-fecha">{fecha(e.t)}</span>
                <span className="camino-texto">
                  {e.tipo === "reconocida" ? "Reconociste" : e.tipo === "dominada" ? "Dominaste" : "Cerraste"}{" "}
                  <strong>{corta(e.titulo, 60)}</strong>
                </span>
                <span className="camino-num">{i + 1}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
