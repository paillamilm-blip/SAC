// Mi perfil: quién soy, cómo voy y cómo salgo. Solo muestra datos que existen de verdad:
// lo que la persona hizo (conteos de sus análisis) y lo que su cuenta ya tiene (nombre, correo).

import { lazy, Suspense, useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import type { Metricas } from '../services/repositorio';

const SelectorColor = lazy(() => import('./SelectorColor'));

export default function PerfilPanel({
  nombre,
  correo,
  esInvitado,
  metricas,
  onCerrar,
  onVerPasaporte,
  onIniciarSesion,
}: {
  nombre: string | null;
  correo: string | null;
  esInvitado: boolean;
  metricas: Metricas;
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
          <button type="button" className="boton boton-primario" onClick={onVerPasaporte}>
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
