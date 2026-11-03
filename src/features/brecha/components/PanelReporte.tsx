import { useState } from "react";
import MapaCapacidades from "./MapaCapacidades";
import type { Brecha, CategoriaBrecha, ComparacionAnalisis, Veredicto } from "../domain/types";
import { CATEGORIAS } from "../domain/types";

const ORDEN: CategoriaBrecha[] = ["dura", "blanda", "conocimiento", "credencial"];
const PESO_SEVERIDAD = { alta: 0, media: 1, baja: 2 } as const;
const SIN_CERRADAS: ComparacionAnalisis["cerradas"] = [];

export type Pestana = "mapa" | "brechas" | "diagnostico";

function Icono({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONOS: Record<Pestana, string> = {
  mapa: "M10 17 V10 M10 10 L4.5 5 M10 10 L15.5 5 M10 10 V3.5 M10 17 A7 7 0 0 1 10 3 M10 17 A7 7 0 0 0 10 3",
  brechas: "M4 5.5 L5.6 7 L8.5 4 M4 11.5 L5.6 13 L8.5 10 M4 17 L5.6 15.5 M11.5 5.5 H16 M11.5 11.5 H16 M11.5 16.5 H16",
  diagnostico: "M9 15 A6 6 0 1 0 9 3 A6 6 0 0 0 9 15 Z M13.4 13.4 L17 17 M9 6 V12 M6 9 H12",
};

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: "mapa", label: "Mapa" },
  { id: "brechas", label: "Brechas" },
  { id: "diagnostico", label: "Diagnóstico" },
];

function fechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

function fechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));
}

function mesAnio(iso: string) {
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date(iso));
}

export default function PanelReporte({
  analisisId,
  ocupacion,
  nivel,
  creadoEn,
  nombreArchivo,
  simulado,
  proveedor,
  resumen,
  fortalezas,
  brechas,
  comparacion,
  onMarcar,
  onDominar,
  pestanaInicial,
  brechaInicialId,
  onPestana,
}: {
  analisisId: string;
  ocupacion: string;
  nivel: string;
  creadoEn: string;
  nombreArchivo: string | null;
  simulado: boolean;
  proveedor: string;
  resumen: string;
  fortalezas: string[];
  brechas: Brecha[];
  comparacion: ComparacionAnalisis | null;
  onMarcar: (brechaId: string, veredicto: Veredicto) => void;
  onDominar: (brechaId: string) => void;
  pestanaInicial?: Pestana;
  brechaInicialId?: string | null;
  onPestana?: (pestana: Pestana) => void;
}) {
  const [recienId, setRecienId] = useState<string | null>(null);
  const [abiertaId, setAbiertaId] = useState<string | null>(
    () => brechaInicialId ?? brechas.find((b) => !b.veredicto)?.id ?? null,
  );
  const [tab, setTab] = useState<Pestana>(pestanaInicial ?? "mapa");

  const confirmadas = brechas.filter((b) => b.veredicto === "confirmada").length;
  const rechazadas = brechas.filter((b) => b.veredicto === "rechazada").length;
  const dominadas = brechas.filter((b) => b.dominadaEn).length;
  const revisadas = confirmadas + rechazadas;
  const pendientes = brechas.length - revisadas;
  const precision = revisadas ? Math.round((confirmadas / revisadas) * 100) : null;
  const nuevas = new Set(comparacion?.nuevasIds ?? []);
  const cerradasCount = comparacion?.cerradas.length ?? 0;

  function brillar(id: string) {
    setRecienId(id);
    setTimeout(() => setRecienId((actual) => (actual === id ? null : actual)), 1100);
  }

  /** Tras decidir una brecha, abre la siguiente sin revisar (si había abierta esa). */
  function avanzar(id: string) {
    setAbiertaId((prev) => (prev !== id ? prev : brechas.find((b) => b.id !== id && !b.veredicto)?.id ?? null));
  }

  const marcar = (id: string, veredicto: Veredicto) => {
    onMarcar(id, veredicto);
    brillar(id);
    if (veredicto) avanzar(id);
  };

  const dominar = (id: string) => {
    onDominar(id);
    brillar(id);
  };

  const filas = ORDEN.flatMap((categoria) =>
    brechas
      .filter((b) => b.categoria === categoria)
      .sort((a, b) => PESO_SEVERIDAD[a.severidad] - PESO_SEVERIDAD[b.severidad]),
  );

  function moversePorTeclas(e: React.KeyboardEvent, id: Pestana) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = PESTANAS.findIndex((p) => p.id === id);
    const paso = e.key === "ArrowRight" ? 1 : PESTANAS.length - 1;
    const siguiente = PESTANAS[(i + paso) % PESTANAS.length];
    setTab(siguiente.id);
    document.getElementById(`tab-${siguiente.id}`)?.focus();
    // Actualizar URL con replaceState
    if (onPestana) {
      onPestana(siguiente.id);
    }
  }

  return (
    <>
      <div className="reporte-franja">
        <div className="franja-id">
          <h1>{ocupacion}</h1>
          <div className="franja-meta">
            <span>{simulado ? "Análisis de muestra" : `Analizado por ${proveedor}`}</span>
            <span>{nivel}</span>
            <span>{fechaLarga(creadoEn)}</span>
            {nombreArchivo && <span>{nombreArchivo}</span>}
          </div>
          {comparacion && (
            <div className="franja-cambio" data-cerradas={cerradasCount > 0}>
              {cerradasCount > 0 ? (
                <span>
                  <b>
                    Cerraste {cerradasCount} {cerradasCount === 1 ? "brecha" : "brechas"}
                  </b>{" "}
                  desde tu análisis de {mesAnio(comparacion.anteriorEn)}
                </span>
              ) : (
                <span>Comparado con tu análisis de {mesAnio(comparacion.anteriorEn)}</span>
              )}
              {comparacion.nuevasIds.length > 0 && (
                <span className="badge badge-nueva">+{comparacion.nuevasIds.length} nuevas</span>
              )}
            </div>
          )}
        </div>
        <div className="franja-progreso">
          <div className="franja-progreso-num">
            <span>
              <b>{confirmadas}</b> de {brechas.length} confirmadas
            </span>
            <span>
              {revisadas === 0
                ? `${pendientes} por revisar`
                : `${precision}% precisión · ${dominadas} ${dominadas === 1 ? "dominada" : "dominadas"}`}
            </span>
          </div>
          <div className="barra">
            <div className="barra-ok" style={{ width: `${(confirmadas / Math.max(brechas.length, 1)) * 100}%` }} />
            <div className="barra-bad" style={{ width: `${(rechazadas / Math.max(brechas.length, 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      <nav className="pestana-bar" role="tablist" aria-label="Secciones del reporte">
        {PESTANAS.map((p) => {
          const seleccionada = tab === p.id;
          return (
            <button
              key={p.id}
              id={`tab-${p.id}`}
              role="tab"
              type="button"
              className="pestana"
              aria-selected={seleccionada}
              aria-controls={`panel-${p.id}`}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => setTab(p.id)}
              onKeyDown={(e) => moversePorTeclas(e, p.id)}
            >
              <Icono d={ICONOS[p.id]} />
              <span>
                {p.label}
                {p.id === "brechas" && pendientes > 0 && <span className="pestana-num"> {pendientes}</span>}
                {p.id === "mapa" && cerradasCount > 0 && <span className="pestana-num pestana-num-ok"> {cerradasCount}</span>}
              </span>
            </button>
          );
        })}
      </nav>

      {tab === "brechas" && (
        <section className="panel-reporte panel-brechas" role="tabpanel" id="panel-brechas" aria-labelledby="tab-brechas">
          <h2 className="card-titulo" style={{ margin: 0 }}>
            Cola de revisión · {pendientes} pendientes
          </h2>

          <div className="cola">
            {filas.map((b) => {
              const estado = b.dominadaEn ? "dominada" : (b.veredicto ?? "pendiente");
              const abierta = abiertaId === b.id;
              return (
                <div className="cola-item" key={b.id} data-abierta={abierta} data-estado={estado}>
                  <button
                    className="cola-fila"
                    aria-expanded={abierta}
                    onClick={() => setAbiertaId(abierta ? null : b.id)}
                  >
                    <span className="cola-punto" data-cat={b.categoria} aria-hidden="true" />
                    <span className="cola-texto">{b.titulo}</span>
                    {nuevas.has(b.id) && <span className="badge badge-nueva">Nueva</span>}
                    <span
                      className={`badge ${
                        estado === "dominada"
                          ? "badge-logro"
                          : estado === "confirmada"
                            ? "badge-ia"
                            : estado === "rechazada"
                              ? "sev-alta"
                              : ""
                      }`}
                    >
                      {estado === "dominada"
                        ? "Dominada"
                        : estado === "confirmada"
                          ? "Real"
                          : estado === "rechazada"
                            ? "No aplica"
                            : "Pendiente"}
                    </span>
                    <svg className="cola-chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="M6 3l5 5-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {abierta && (
                    <div className="cola-cuerpo">
                      <article className="brecha" data-veredicto={b.veredicto ?? "pendiente"}>
                        <div className="brecha-top">
                          <span className={`badge sev-${b.severidad}`}>Impacto {b.severidad}</span>
                          <span className="badge">{CATEGORIAS[b.categoria]}</span>
                        </div>

                        <h3>{b.titulo}</h3>

                        <div className="evidencia">
                          <span className="evidencia-label">Evidencia en el CV</span>
                          {b.evidencia}
                        </div>

                        <p className="por-que">{b.porQueImporta}</p>

                        <dl className="aprender">
                          <div className="aprender-fila">
                            <dt>Qué aprender</dt>
                            <dd>{b.aprender.que}</dd>
                          </div>
                          <div className="aprender-fila">
                            <dt>Cómo</dt>
                            <dd>{b.aprender.como}</dd>
                          </div>
                          <div className="aprender-fila">
                            <dt>Cómo lo demuestro</dt>
                            <dd>{b.aprender.comoLoDemuestro}</dd>
                          </div>
                        </dl>

                        <div className="brecha-acciones">
                          <button
                            className="boton boton-ok"
                            data-activo={b.veredicto === "confirmada"}
                            onClick={() => marcar(b.id, b.veredicto === "confirmada" ? null : "confirmada")}
                          >
                            Es real
                          </button>
                          <button
                            className="boton boton-bad"
                            data-activo={b.veredicto === "rechazada"}
                            onClick={() => marcar(b.id, b.veredicto === "rechazada" ? null : "rechazada")}
                          >
                            No aplica
                          </button>
                          {b.veredicto === "confirmada" &&
                            (b.dominadaEn ? (
                              <span className="nota nota-logro">Dominada el {fechaCorta(b.dominadaEn)}</span>
                            ) : (
                              <button
                                className="boton boton-logro"
                                onClick={() => dominar(b.id)}
                              >
                                Ya lo aprendí
                              </button>
                            ))}
                        </div>
                      </article>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "mapa" && (
        <section className="panel-reporte panel-mapa" role="tabpanel" id="panel-mapa" aria-labelledby="tab-mapa">
          <MapaCapacidades
            ocupacion={ocupacion}
            brechas={brechas}
            recienId={recienId}
            cerradas={comparacion?.cerradas ?? SIN_CERRADAS}
          />
        </section>
      )}

      {tab === "diagnostico" && (
        <section className="panel-reporte panel-diag" role="tabpanel" id="panel-diagnostico" aria-labelledby="tab-diagnostico">
          {simulado && (
            <div className="aviso aviso-sim" style={{ marginTop: 0 }}>
              Este reporte es una <strong>muestra fija</strong>: no surge de tu PDF. El orden, las categorías y los
              botones son los reales. Cuando el análisis con IA esté activo, este mismo lugar mostrará el tuyo.
            </div>
          )}

          <div className="card">
            <h2 className="card-titulo">Diagnóstico</h2>
            <p className="resumen">{resumen}</p>
            {fortalezas.length > 0 && (
              <div className="fortalezas" style={{ marginTop: 12 }}>
                {fortalezas.map((f, i) => (
                  <div className="fortaleza" key={i}>
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
