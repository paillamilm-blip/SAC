// Mi perfil: quién soy, cómo voy y cómo salgo. Solo muestra datos que existen de verdad:
// lo que la persona hizo (conteos de sus análisis) y lo que su cuenta ya tiene (nombre, correo).

import { lazy, Suspense, useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import type { Estandar, ResumenCv } from '../services/estandar';
import type { Metricas } from '../services/repositorio';

const SelectorColor = lazy(() => import('./SelectorColor'));

const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export default function PerfilPanel({
  nombre,
  correo,
  esInvitado,
  metricas,
  estandar,
  cv,
  onCerrar,
  onVerPasaporte,
  onIniciarSesion,
}: {
  nombre: string | null;
  correo: string | null;
  esInvitado: boolean;
  metricas: Metricas;
  /** Cuánto falta para cubrir las brechas detectadas; null si aún no hay análisis. */
  estandar: Estandar | null;
  /** Lo que se leyó del CV; null si aún no hay análisis. */
  cv: ResumenCv | null;
  onCerrar: () => void;
  onVerPasaporte: () => void;
  onIniciarSesion: () => void;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cerrarRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  async function salir() {
    try {
      await supabase.auth.signOut();
    } finally {
      onCerrar();
    }
  }

  return (
    <div className="u-perfil-fondo" onClick={onCerrar}>
      <section
        className="u-perfil"
        role="dialog"
        aria-modal="true"
        aria-labelledby="u-perfil-t"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="u-perfil-cab">
          <span className="u-persona u-persona-grande" aria-hidden="true">
            {(nombre ?? 'T').slice(0, 1).toUpperCase()}
          </span>
          <div className="u-perfil-id">
            <h2 id="u-perfil-t">{esInvitado ? 'Invitado' : (nombre ?? 'Mi perfil')}</h2>
            <p>{esInvitado ? 'Sin cuenta' : (correo ?? 'Cuenta de Ómicrom')}</p>
          </div>
          <button ref={cerrarRef} type="button" className="u-icono" onClick={onCerrar} aria-label="Cerrar mi perfil">
            ✕
          </button>
        </header>

        {esInvitado && (
          <p className="u-perfil-nota">
            Tus análisis están solo en este dispositivo. Con una cuenta se guardan también en ella y puedes dar el
            examen y compartir tu credencial.
          </p>
        )}

        {estandar && cv ? (
          <>
            <section className="u-perfil-estandar" aria-labelledby="u-perfil-est-t">
              <h3 id="u-perfil-est-t">Cuánto te falta</h3>
              {estandar.esMuestra && (
                <p className="u-perfil-nota">Es una muestra de ejemplo: no sale de tu CV. Escanea tu CV para medir el tuyo.</p>
              )}
              {estandar.total === 0 ? (
                <p className="u-perfil-nota">Descartaste todas las brechas de este análisis: no queda nada por cubrir.</p>
              ) : (
                <>
                  <p className="u-perfil-pct">
                    <b>{estandar.faltaPct} %</b>
                    <span>
                      por cubrir de lo que detecté frente al estándar de tu ocupación ({estandar.conPrueba} de {estandar.total}{' '}
                      {estandar.total === 1 ? 'brecha cubierta' : 'brechas cubiertas'} con examen)
                    </span>
                  </p>
                  <div
                    className="u-perfil-barra"
                    role="img"
                    aria-label={`De ${estandar.total} brechas: ${estandar.conPrueba} con examen aprobado, ${estandar.reconocidasSinPrueba} reconocidas sin examen, ${estandar.sinRevisar} por revisar`}
                  >
                    <span data-parte="prueba" style={{ flexGrow: estandar.conPrueba }} />
                    <span data-parte="reconocida" style={{ flexGrow: estandar.reconocidasSinPrueba }} />
                    <span data-parte="sin-revisar" style={{ flexGrow: estandar.sinRevisar }} />
                  </div>
                  <ul className="u-perfil-leyenda">
                    <li data-parte="prueba">Con examen aprobado: {estandar.conPrueba}</li>
                    <li data-parte="reconocida">Reconocidas, sin examen: {estandar.reconocidasSinPrueba}</li>
                    <li data-parte="sin-revisar">Por revisar: {estandar.sinRevisar}</li>
                  </ul>
                </>
              )}
              <p className="u-perfil-nota">
                El estándar es la comparación que hizo la IA entre tu CV y lo que suele mostrar alguien de tu ocupación y
                nivel. No es una certificación
                {estandar.descartadas > 0
                  ? `; ${estandar.descartadas} ${estandar.descartadas === 1 ? 'brecha descartada' : 'brechas descartadas'} como «no aplica» no ${estandar.descartadas === 1 ? 'cuenta' : 'cuentan'}`
                  : ''}
                .
              </p>
            </section>

            <details className="u-perfil-cv">
              <summary>
                <span>Tu CV en Ómicrom</span>
                <small>{cv.ocupacion}</small>
              </summary>
              <div className="u-perfil-cv-cuerpo">
                <p className="u-perfil-nota">
                  Esto es lo que leí de tu CV{cv.archivo ? ` («${cv.archivo}»)` : ''} el {fecha(cv.analizadoEn)}. No guardo el PDF,
                  solo este resultado.
                </p>
                <p>
                  <strong>{cv.ocupacion}</strong>
                  <br />
                  <span className="u-perfil-nota">{cv.nivel}</span>
                </p>
                <p>{cv.resumen}</p>
                {cv.fortalezas.length > 0 && (
                  <>
                    <h4>Lo que ya muestras</h4>
                    <ul className="u-perfil-fortalezas">
                      {cv.fortalezas.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </details>
          </>
        ) : (
          <p className="u-perfil-nota">Cuando escanees tu CV, aquí verás lo que leí de él y cuánto te falta para cubrir el estándar de tu ocupación.</p>
        )}

        <dl className="u-perfil-metricas">
          <div>
            <dt>Análisis hechos</dt>
            <dd>{metricas.totalAnalisis}</dd>
          </div>
          <div>
            <dt>Brechas reconocidas</dt>
            <dd>
              {metricas.confirmadas} <small>de {metricas.brechas}</small>
            </dd>
          </div>
          <div>
            <dt>Dominadas con prueba</dt>
            <dd>
              {metricas.dominadas} <small>de {metricas.confirmadas}</small>
            </dd>
          </div>
        </dl>

        <div className="u-perfil-color">
          <Suspense fallback={<p className="u-perfil-nota">Cargando colores…</p>}>
            <SelectorColor />
          </Suspense>
        </div>

        <div className="u-perfil-acciones">
          {/* Una sola acción principal: invitado → iniciar sesión; con cuenta → ver el pasaporte. */}
          <button type="button" className={esInvitado ? 'boton' : 'boton boton-primario'} onClick={onVerPasaporte}>
            Ver mi pasaporte
          </button>
          {esInvitado ? (
            <button type="button" className="boton boton-primario" onClick={onIniciarSesion}>
              Iniciar sesión
            </button>
          ) : (
            <button type="button" className="boton" onClick={() => void salir()}>
              Cerrar sesión
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
