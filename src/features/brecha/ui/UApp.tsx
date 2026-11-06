// Producto único (Ómicrom + diagnóstico de brechas), montado bajo /u.
// Reutiliza de Ómicrom: sesión, color del usuario, voz y asistente.
// Reutiliza de brecha: subida y escaneo del CV, mapa de capacidades y reporte.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { NoAccess } from '@/features/auth/components/NoAccess';
import { AuthOverlay } from '@/features/auth/components/AuthOverlay';
import ErrorPerfil from '@/features/auth/components/ErrorPerfil';
import { ResetPasswordOverlay } from '@/features/auth/components/ResetPasswordOverlay';
import { InstallPWA } from '@/shared/components/InstallPWA';
import ChatPanel, { type EventoApp } from '@/features/assistant/ChatPanel';
import type { Accion } from '@/features/assistant/recomendar';
import { useApp } from '@/store/AppContext';
import { useUserColor } from '@/shared/hooks/useUserColor';
import type { ResultadoSubida } from '../components/SubirCv';
import { useBrecha } from '../hooks/useBrecha';
import { useOmicronStats } from '../hooks/useOmicronStats';
import { useRecuperarClave } from '../hooks/useRecuperarClave';
import { obtenerAnalisis } from '../services/repositorio';
import PerfilPanel from '../components/PerfilPanel';
import { analizarPerfil } from '../services/analisisPerfil';
import { medirEstandar, resumenCv } from '../services/estandar';
import { metricas as calcularMetricas } from '../services/repositorio';
import { proveedorActivo } from '../services/proveedor';
import Inicio from './Inicio';
import PasaportePage from './PasaportePage';
import ReportePage from './ReportePage';
import { BASE, HREF_PASAPORTE, hrefReporte, useRuta } from './ruta';
import '../styles/brecha.css';
import '../styles/u-app.css';

function primerNombre(perfil: { display_name?: string; full_name?: string; username?: string } | null | undefined) {
  const bruto = perfil?.display_name || perfil?.full_name || perfil?.username || '';
  return bruto.trim().split(/\s+/)[0] || null;
}

export default function UApp() {
  const { authStatus, profile, isLoadingProfile, reintentarPerfil } = useApp();
  const color = useUserColor();
  const { ruta, ir } = useRuta();
  const usuarioId = authStatus === 'authenticated' ? (profile?.id ?? null) : null;
  const { db, persistente, estadoNube, agregar, marcar, probar, invitadoPendiente, traerInvitado, descartarInvitado } = useBrecha(usuarioId);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [evento, setEvento] = useState<EventoApp | null>(null);
  const contadorEventos = useRef(0);
  const guiaMapaDada = useRef(false);
  const [pedirAuth, setPedirAuth] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const botonPerfilRef = useRef<HTMLButtonElement>(null);
  const perfilSeAbrio = useRef(false);
  const [aperturaEscaneo, setAperturaEscaneo] = useState(0);
  const botonAsistenteRef = useRef<HTMLButtonElement>(null);
  const chatSeAbrio = useRef(false);
  const [cargaTiempoExcedido, setCargaTiempoExcedido] = useState(false);
  const nombre = authStatus === 'authenticated' ? primerNombre(profile) : null;

  // Estadísticas de Ómicrom (racha diaria, analítica de apertura)
  useOmicronStats();
  // Regreso desde el correo de «olvidé mi contraseña»
  const { recuperando, terminar: terminarRecuperacion } = useRecuperarClave();

  // Timeout para mostrar invitado si la carga tarda más de 5s (misma regla que forceGuest)
  useEffect(() => {
    if (authStatus === 'loading') {
      const timer = setTimeout(() => setCargaTiempoExcedido(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setCargaTiempoExcedido(false);
    }
  }, [authStatus]);

  useEffect(() => {
    const abrir = () => setPedirAuth(true);
    window.addEventListener('omicron:request-auth', abrir);
    return () => window.removeEventListener('omicron:request-auth', abrir);
  }, []);

  useEffect(() => {
    document.title = 'Ómicrom';
  }, []);

  // Al cerrar el asistente, el foco vuelve al botón que lo abrió (quien navega con teclado no se pierde).
  useEffect(() => {
    if (chatAbierto) chatSeAbrio.current = true;
    else if (chatSeAbrio.current) botonAsistenteRef.current?.focus();
  }, [chatAbierto]);

  // Al cerrar el perfil, el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (perfilAbierto) perfilSeAbrio.current = true;
    else if (perfilSeAbrio.current) botonPerfilRef.current?.focus();
  }, [perfilAbierto]);

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
      } else if (accion.tipo === 'abrir_pasaporte') {
        setChatAbierto(false);
        ir(HREF_PASAPORTE);
      } else if (accion.tipo === 'abrir_reporte') {
        setChatAbierto(false);
        ir(hrefReporte(accion.analisisId, accion.pestana, accion.brechaId));
      }
      return true;
    },
    [ir],
  );

  // Al llegar al mapa el asistente se despliega solo, una vez, y enseña qué hacer: tocar un nodo.
  useEffect(() => {
    if (ruta.nombre !== 'reporte' || ruta.pestana !== 'mapa' || guiaMapaDada.current) return;
    if (!obtenerAnalisis(db, ruta.analisisId)) return;
    guiaMapaDada.current = true;
    setEvento({ n: ++contadorEventos.current, tipo: 'mapa', analisisId: ruta.analisisId });
    setChatAbierto(true);
  }, [ruta, db]);

  // Tocar un nodo del mapa: el asistente se abre (si estaba cerrado) y cuenta ese nodo.
  const alNodo = useCallback((analisisId: string, brechaId: string) => {
    setEvento({ n: ++contadorEventos.current, tipo: 'nodo', analisisId, brechaId });
    setChatAbierto(true);
  }, []);

  const estiloColor = {
    '--accent': color,
    '--accent-soft': `color-mix(in srgb, ${color} 14%, transparent)`,
  } as React.CSSProperties;

  // Mismo orden de prioridad que tenía la app de siempre: recuperar la clave va primero.
  if (recuperando) return <ResetPasswordOverlay onDone={terminarRecuperacion} />;

  // Mostrar NoAccess si el usuario no tiene acceso
  if (authStatus === 'no_access') {
    return (
      <div className="u-app" style={estiloColor}>
        <NoAccess />
      </div>
    );
  }

  // Sesión válida pero el perfil no se pudo leer (red o servidor): aviso recuperable, no «sin acceso» ni «invitado».
  if (authStatus === 'error_transitorio') {
    return (
      <div className="u-app" style={estiloColor}>
        <a className="u-saltar" href="#u-contenido">
          Saltar al contenido
        </a>
        <header className="topbar">
          <div className="topbar-in">
            <a className="brand" href={BASE}>
              <span className="brand-dot" aria-hidden="true" />
              Ómicrom
            </a>
          </div>
        </header>
        <main id="u-contenido" tabIndex={-1}>
          <ErrorPerfil reintentando={isLoadingProfile} onReintentar={reintentarPerfil} />
        </main>
      </div>
    );
  }

  // Mostrar carga mientras se carga el perfil (hasta 5s, luego invitado)
  if (authStatus === 'loading' && !cargaTiempoExcedido) {
    return (
      <div className="u-app" style={estiloColor}>
        <a className="u-saltar" href="#u-contenido">
          Saltar al contenido
        </a>
        <header className="topbar">
          <div className="topbar-in">
            <a className="brand" href={BASE}>
              <span className="brand-dot" aria-hidden="true" />
              Ómicrom
            </a>
            <div className="topbar-right">
              <div className="u-persona" title="Cargando...">
                <span className="brand-dot" aria-hidden="true" />
              </div>
            </div>
          </div>
        </header>
        <main id="u-contenido" tabIndex={-1}>
          <div className="u-banda aviso aviso-sim" role="note">
            Cargando tu perfil...
          </div>
        </main>
      </div>
    );
  }

  // Invitado: sin sesión, o con la carga atascada más de 5s (la carga normal ya salió arriba).
  const esInvitado = authStatus !== 'authenticated';

  const guiaVisible = chatAbierto && ruta.nombre === 'reporte';

  return (
    <div className="u-app" style={estiloColor} data-guia={guiaVisible ? 'true' : undefined}>
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
            {esInvitado && (
              <button type="button" className="boton boton-topbar" onClick={() => setPedirAuth(true)}>
                Iniciar sesión
              </button>
            )}
            <button
              ref={botonPerfilRef}
              type="button"
              className="u-persona u-persona-boton"
              onClick={() => setPerfilAbierto(true)}
              aria-haspopup="dialog"
              aria-label={esInvitado ? 'Abrir mi perfil (invitado)' : `Abrir mi perfil, ${nombre ?? 'tu cuenta'}`}
            >
              {esInvitado ? 'T' : (nombre ?? 'Tú').slice(0, 1).toUpperCase()}
            </button>
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
        {usuarioId && invitadoPendiente > 0 && (
          <div className="u-banda aviso u-aviso-invitado" role="region" aria-label="Análisis hechos como invitado">
            <p>
              Hiciste {invitadoPendiente === 1 ? '1 análisis' : `${invitadoPendiente} análisis`} como invitado en este
              dispositivo. ¿Quieres traer{invitadoPendiente === 1 ? 'lo' : 'los'} a tu cuenta?
            </p>
            <div className="u-banda-acciones">
              <button type="button" className="boton boton-primario" onClick={traerInvitado}>
                Traer a mi cuenta
              </button>
              <button type="button" className="boton" onClick={descartarInvitado}>
                Descartar{invitadoPendiente === 1 ? 'lo' : 'los'} (se borran de este dispositivo)
              </button>
            </div>
          </div>
        )}
        {!persistente && (
          <div className="u-banda aviso aviso-error" role="alert">
            Tu navegador no deja guardar datos: lo que hagas se perderá al cerrar esta pestaña.
          </div>
        )}
        {usuarioId && estadoNube === 'sin_conexion' && (
          <div className="u-banda aviso aviso-error" role="alert">
            No pude guardar tus análisis en tu cuenta. Siguen en este dispositivo y lo intentaré de nuevo en tu próximo
            cambio.
          </div>
        )}
        {usuarioId && estadoNube === 'no_disponible' && (
          <div className="u-banda aviso" role="note">
            Por ahora tus análisis se guardan solo en este dispositivo: si cambias de navegador o borras sus datos, se
            pierden.
          </div>
        )}
        {usuarioId && (estadoNube === 'sincronizando' || estadoNube === 'guardado') && (
          <p className="u-nube" role="status">
            {estadoNube === 'guardado' ? 'Guardado en tu cuenta' : 'Guardando en tu cuenta…'}
          </p>
        )}

        <ErrorBoundary section="Área de contenido">
          {ruta.nombre === 'inicio' ? (
            <Inicio
              db={db}
              nombre={nombre}
              proveedor={proveedorActivo}
              onListo={alListo}
              onIr={ir}
              onAccion={ejecutar}
              aperturaEscaneo={aperturaEscaneo}
              sesionIniciada={authStatus === 'authenticated'}
            />
          ) : ruta.nombre === 'pasaporte' ? (
            <PasaportePage
              db={db}
              nombre={nombre}
              sesionIniciada={authStatus === 'authenticated'}
              colorUsuario={color}
              onIr={ir}
              onAccion={ejecutar}
              onPedirSesion={() => setPedirAuth(true)}
            />
          ) : (
            <ReportePage
              db={db}
              analisisId={ruta.analisisId}
              pestana={ruta.pestana}
              brechaId={ruta.brechaId}
              onIr={ir}
              onMarcar={marcar}
              onProbar={probar}
              sesionIniciada={authStatus === 'authenticated'}
              onPedirSesion={() => setPedirAuth(true)}
              onNodo={alNodo}
            />
          )}
        </ErrorBoundary>
      </main>

      {!chatAbierto && (
        <button
          ref={botonAsistenteRef}
          type="button"
          className="u-fab"
          onClick={() => setChatAbierto(true)}
          aria-label="Abrir el asistente"
        >
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
        evento={evento}
        compacto={ruta.nombre === 'reporte'}
      />

      {perfilAbierto && (
        <PerfilPanel
          nombre={nombre}
          correo={profile?.email ?? null}
          esInvitado={esInvitado}
          metricas={calcularMetricas(db)}
          estandar={medirEstandar(db)}
          perfil={analizarPerfil(db)}
          cv={resumenCv(db)}
          onCerrar={() => setPerfilAbierto(false)}
          onVerPasaporte={() => {
            setPerfilAbierto(false);
            ir(HREF_PASAPORTE);
          }}
          onIniciarSesion={() => {
            setPerfilAbierto(false);
            setPedirAuth(true);
          }}
        />
      )}

      {pedirAuth && authStatus !== 'authenticated' && <AuthOverlay onClose={() => setPedirAuth(false)} />}

      <ErrorBoundary section="InstalarApp">
        <InstallPWA />
      </ErrorBoundary>
    </div>
  );
}
