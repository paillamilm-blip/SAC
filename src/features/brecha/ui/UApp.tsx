// Producto único (Ómicrom + diagnóstico de brechas), montado bajo /u.
// Reutiliza de Ómicrom: sesión, color del usuario, voz y asistente.
// Reutiliza de brecha: subida y escaneo del CV, mapa de capacidades y reporte.

import { useCallback, useEffect, useState } from 'react';
import { AuthOverlay } from '@/features/auth/components/AuthOverlay';
import ChatPanel from '@/features/assistant/ChatPanel';
import type { Accion } from '@/features/assistant/recomendar';
import { useApp } from '@/store/AppContext';
import { useUserColor } from '@/shared/hooks/useUserColor';
import type { ResultadoSubida } from '../components/SubirCv';
import { useBrecha } from '../hooks/useBrecha';
import { proveedorActivo } from '../services/analizar';
import Inicio from './Inicio';
import ReportePage from './ReportePage';
import { BASE, hrefReporte, useRuta } from './ruta';
import '../styles/brecha.css';
import '../styles/u-app.css';

function primerNombre(perfil: { display_name?: string; full_name?: string; username?: string } | null | undefined) {
  const bruto = perfil?.display_name || perfil?.full_name || perfil?.username || '';
  return bruto.trim().split(/\s+/)[0] || null;
}

export default function UApp() {
  const { authStatus, profile } = useApp();
  const color = useUserColor();
  const { ruta, ir } = useRuta();
  const usuarioId = authStatus === 'authenticated' ? (profile?.id ?? null) : null;
  const { db, persistente, agregar, marcar, dominar } = useBrecha(usuarioId);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [pedirAuth, setPedirAuth] = useState(false);
  const [aperturaEscaneo, setAperturaEscaneo] = useState(0);
  const nombre = authStatus === 'authenticated' ? primerNombre(profile) : null;

  useEffect(() => {
    const abrir = () => setPedirAuth(true);
    window.addEventListener('omicron:request-auth', abrir);
    return () => window.removeEventListener('omicron:request-auth', abrir);
  }, []);

  useEffect(() => {
    document.title = 'Ómicrom';
  }, []);

  // Una vez iniciada la sesión, el formulario ya no hace falta.
  useEffect(() => {
    if (authStatus === 'authenticated') setPedirAuth(false);
  }, [authStatus]);

  const alListo = useCallback(
    ({ resultado, archivo }: ResultadoSubida) => {
      const a = agregar(resultado, {
        nombreArchivo: archivo.name,
        tamanio: archivo.size,
        proveedor: proveedorActivo.nombre,
        simulado: proveedorActivo.simulado,
      });
      ir(hrefReporte(a.id));
    },
    [agregar, ir],
  );

  const ejecutar = useCallback(
    (accion: Accion) => {
      if (accion.tipo === 'escanear') {
        setChatAbierto(false);
        ir(BASE);
        setAperturaEscaneo((n) => n + 1);
        window.setTimeout(() => document.querySelector<HTMLElement>('.u-app .dropzone')?.focus(), 80);
      } else if (accion.tipo === 'abrir_reporte') {
        setChatAbierto(false);
        ir(hrefReporte(accion.analisisId, accion.pestana, accion.brechaId));
      } else {
        dominar(accion.analisisId, accion.brechaId);
      }
    },
    [dominar, ir],
  );

  const estiloColor = {
    '--accent': color,
    '--accent-soft': `color-mix(in srgb, ${color} 14%, transparent)`,
  } as React.CSSProperties;

  return (
    <div className="u-app" style={estiloColor}>
      <a className="u-saltar" href="#u-contenido">
        Saltar al contenido
      </a>

      <header className="topbar">
        <div className="topbar-in">
          <a
            className="brand"
            href={BASE}
            onClick={(e) => {
              e.preventDefault();
              ir(BASE);
            }}
          >
            <span className="brand-dot" aria-hidden="true" />
            Ómicrom
          </a>
          <div className="topbar-right">
            <a className="u-enlace-suave" href="/">
              Versión anterior
            </a>
            {authStatus === 'authenticated' ? (
              <span className="u-persona" title={nombre ?? undefined}>
                {(nombre ?? 'Tú').slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <button type="button" className="boton boton-topbar" onClick={() => setPedirAuth(true)}>
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="u-contenido" tabIndex={-1}>
        {proveedorActivo.simulado && (
          <div className="u-banda aviso aviso-sim" role="note">
            Modo demostración: el análisis es una muestra fija. Tu archivo no sale de tu equipo y el resultado no
            proviene de tu CV.
          </div>
        )}
        {!persistente && (
          <div className="u-banda aviso aviso-error" role="alert">
            Tu navegador no deja guardar datos: lo que hagas se perderá al cerrar esta pestaña.
          </div>
        )}

        {ruta.nombre === 'inicio' ? (
          <Inicio
            db={db}
            nombre={nombre}
            proveedor={proveedorActivo}
            onListo={alListo}
            onIr={ir}
            onAccion={ejecutar}
            aperturaEscaneo={aperturaEscaneo}
          />
        ) : (
          <ReportePage
            db={db}
            analisisId={ruta.analisisId}
            pestana={ruta.pestana}
            brechaId={ruta.brechaId}
            onIr={ir}
            onMarcar={marcar}
            onDominar={dominar}
          />
        )}
      </main>

      {!chatAbierto && (
        <button type="button" className="u-fab" onClick={() => setChatAbierto(true)} aria-label="Abrir el asistente">
          <span className="u-fab-punto" aria-hidden="true" />
          Asistente
        </button>
      )}

      <ChatPanel
        db={db}
        usuarioId={usuarioId}
        nombre={nombre}
        iaDisponible={authStatus === 'authenticated'}
        abierto={chatAbierto}
        onCerrar={() => setChatAbierto(false)}
        onEjecutar={ejecutar}
      />

      {pedirAuth && authStatus !== 'authenticated' && <AuthOverlay onClose={() => setPedirAuth(false)} />}
    </div>
  );
}
