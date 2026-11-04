// Inicio del producto único: qué hacer ahora, en qué paso del ciclo vas y tu historial.
// Todo número lleva su escala ("3 de 8") y cada afirmación sale de datos guardados.

import { useMemo, useState } from 'react';
import { pasosDelCiclo, recomendar, type Accion } from '@/features/assistant/recomendar';
import { ETIQUETA_ORIGEN } from '@/features/assistant/responder';
import CompartirCredencial from '../components/CompartirCredencial';
import SubirCv, { type ResultadoSubida } from '../components/SubirCv';
import type { ProveedorAnalisis } from '../services/analizar';
import { listarAnalisis, metricas, type Db } from '../services/repositorio';
import { destinoPaso } from './destinoPaso';
import { hrefReporte } from './ruta';

function fecha(iso: string) {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export default function Inicio({
  db,
  nombre,
  proveedor,
  onListo,
  onIr,
  onAccion,
  aperturaEscaneo,
  sesionIniciada = false,
}: {
  db: Db;
  nombre: string | null;
  proveedor: ProveedorAnalisis;
  onListo: (r: ResultadoSubida) => void;
  onIr: (href: string) => void;
  onAccion: (a: Accion) => void;
  /** Cada vez que sube, el asistente pidió abrir el escáner de CV. */
  aperturaEscaneo: number;
  /** La credencial se crea en el servidor y exige sesión. */
  sesionIniciada?: boolean;
}) {
  const [escaneando, setEscaneando] = useState(false);
  const [aperturaVista, setAperturaVista] = useState(aperturaEscaneo);
  if (aperturaVista !== aperturaEscaneo) {
    setAperturaVista(aperturaEscaneo);
    setEscaneando(true);
  }
  const estado = useMemo(() => ({ db, ahora: new Date().toISOString() }), [db]);
  const historial = listarAnalisis(db);
  const m = metricas(db);
  const primera = recomendar(estado)[0];
  const pasos = pasosDelCiclo(estado);
  const sinAnalisis = historial.length === 0;
  const ultimo = historial[0];

  const irAlPaso = (id: (typeof pasos)[number]['id']) => {
    if (!ultimo) return;
    const d = destinoPaso(id, ultimo);
    if (d.tipo === 'accion') {
      onAccion(d.accion);
      return;
    }
    const el = document.getElementById('u-compartir');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus({ preventScroll: true });
  };

  return (
    <div className="wrap u-inicio">
      <header className="hero">
        <h1>{nombre ? `Hola, ${nombre}` : 'Tu camino profesional'}</h1>
        <p>
          {sinAnalisis
            ? 'Sube tu CV y te muestro qué te separa de un profesional fuerte de tu ocupación. Después te acompaño paso a paso.'
            : 'Esto es lo que sigue para avanzar. Tú decides qué hacer y yo te acompaño.'}
        </p>
      </header>

      {sinAnalisis ? (
        <SubirCv proveedor={proveedor} onListo={onListo} />
      ) : (
        <>
          <section className="u-siguiente card" aria-labelledby="u-sig-t" data-origen={primera.origen}>
            <h2 className="card-titulo" id="u-sig-t">
              Siguiente paso
            </h2>
            <p className="u-siguiente-titulo">{primera.titulo}</p>
            <p className="u-siguiente-porque">{primera.porQue}</p>
            <div className="u-siguiente-pie">
              <button
                type="button"
                className="boton boton-primario"
                onClick={() => (primera.accion.tipo === 'escanear' ? setEscaneando(true) : onAccion(primera.accion))}
              >
                {primera.etiquetaAccion}
              </button>
              <span className="u-origen" data-origen={primera.origen}>
                {ETIQUETA_ORIGEN[primera.origen]}
              </span>
            </div>
          </section>

          <section className="card" aria-labelledby="u-ciclo-t">
            <h2 className="card-titulo" id="u-ciclo-t">
              Tu ciclo
            </h2>
            <ol className="u-ciclo">
              {pasos.map((p, i) => (
                <li key={p.id} className="u-paso" data-estado={p.estado}>
                  <button
                    type="button"
                    className="u-paso-boton"
                    aria-current={p.estado === 'ahora' ? 'step' : undefined}
                    onClick={() => irAlPaso(p.id)}
                  >
                    <span className="u-paso-num" aria-hidden="true">
                      {p.estado === 'hecho' ? '✓' : i + 1}
                    </span>
                    <span className="u-paso-texto">
                      <b>{p.nombre}</b>
                      <small>{p.progreso ? `${p.detalle} · ${p.progreso}` : p.detalle}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="card" aria-labelledby="u-prog-t">
            <h2 className="card-titulo" id="u-prog-t">
              Tu avance
            </h2>
            <dl className="u-metricas">
              <div>
                <dt>Brechas reconocidas</dt>
                <dd>
                  {m.confirmadas} <small>de {m.brechas}</small>
                </dd>
              </div>
              <div>
                <dt>Dominadas con prueba</dt>
                <dd>
                  {m.dominadas} <small>de {m.confirmadas}</small>
                </dd>
              </div>
              <div>
                <dt>Análisis hechos</dt>
                <dd>{m.totalAnalisis}</dd>
              </div>
            </dl>
          </section>

          <CompartirCredencial sesionIniciada={sesionIniciada} dominadas={m.dominadas} />

          {escaneando && <SubirCv proveedor={proveedor} onListo={onListo} />}

          <section className="card" aria-labelledby="u-hist-t">
            <h2 className="card-titulo" id="u-hist-t">
              Tus análisis
            </h2>
            <ul className="lista">
              {historial.map((a) => {
                const conf = a.brechas.filter((b) => b.veredicto === 'confirmada').length;
                return (
                  <li key={a.id}>
                    <a
                      className="item-historial"
                      href={hrefReporte(a.id)}
                      onClick={(e) => {
                        e.preventDefault();
                        onIr(hrefReporte(a.id));
                      }}
                    >
                      <span className="item-historial-main">
                        <span className="item-historial-titulo">{a.ocupacion}</span>
                        <span className="item-historial-sub">
                          {fecha(a.creadoEn)} · {a.simulado ? 'análisis de muestra' : `analizado por ${a.proveedor}`}
                        </span>
                      </span>
                      <span className="item-historial-sub">
                        {conf} de {a.brechas.length} confirmadas
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
