// «Tus datos» en Mi perfil: descargar todo lo que Ómicrom guarda de ti, y borrar tu cuenta.
// Diseño (obra-maestra-brutal, modo Operate): una acción destructiva NO compite con las normales. Se esconde detrás de
// un paso explícito que dice qué se borra y qué no se puede borrar, y exige escribir una palabra antes de hacerlo.

import { useEffect, useRef, useState } from 'react';
import {
  AVISO_CUENTA_BORRADA,
  CONFIRMACION_BORRAR,
  borrarDatosDeInvitado,
  borrarMiCuenta,
  exportarMisDatos,
} from '../services/cuenta';

type Fase = 'quieto' | 'exportando' | 'confirmar' | 'borrando';

export default function TusDatos({ usuarioId, esInvitado }: { usuarioId: string | null; esInvitado: boolean }) {
  const [fase, setFase] = useState<Fase>('quieto');
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const botonBorrar = useRef<HTMLButtonElement>(null);
  const conCuenta = !esInvitado && !!usuarioId;
  const confirmado = texto.trim().toUpperCase() === CONFIRMACION_BORRAR;

  // Al abrir la confirmación el foco va al campo; al cancelar, vuelve al botón que la abrió.
  useEffect(() => {
    if (fase === 'confirmar') campo.current?.focus();
  }, [fase]);

  async function descargar() {
    if (fase === 'exportando') return;
    setFase('exportando');
    setAviso(null);
    setError(null);
    const r = await exportarMisDatos(conCuenta ? usuarioId : null);
    if (r.ok) setAviso(`Listo: se descargó «${r.datos.archivo}».`);
    else setError(r.error);
    setFase('quieto');
  }

  function cancelar() {
    setFase('quieto');
    setTexto('');
    setError(null);
    setTimeout(() => botonBorrar.current?.focus(), 0);
  }

  async function borrar() {
    if (!confirmado || fase === 'borrando') return;
    setFase('borrando');
    setError(null);
    if (conCuenta && usuarioId) {
      const r = await borrarMiCuenta(usuarioId, texto);
      if (!r.ok) {
        setError(r.error);
        setFase('confirmar');
        return;
      }
    } else {
      borrarDatosDeInvitado();
      try {
        sessionStorage.setItem(AVISO_CUENTA_BORRADA, 'invitado');
      } catch {
        /* sin sessionStorage solo se pierde el aviso */
      }
    }
    // Recargar deja la app limpia: los análisis también viven en la memoria de la pantalla abierta.
    window.location.replace('/u');
  }

  return (
    <section className="u-perfil-datos" aria-labelledby="u-perfil-datos-t">
      <h3 id="u-perfil-datos-t">Tus datos</h3>
      <p className="u-perfil-nota">
        {conCuenta
          ? 'Descarga todo lo que Ómicrom guarda de ti, en un archivo que puedes abrir y conservar.'
          : 'Sin cuenta, tus datos están solo en este navegador. Puedes descargarlos o borrarlos.'}
      </p>

      <button type="button" className="boton" onClick={() => void descargar()} disabled={fase === 'exportando' || fase === 'borrando'}>
        {fase === 'exportando' ? 'Preparando tu archivo…' : 'Descargar mis datos'}
      </button>

      {fase !== 'confirmar' && fase !== 'borrando' ? (
        <button
          ref={botonBorrar}
          type="button"
          className="boton boton-peligro-suave"
          onClick={() => {
            setAviso(null);
            setError(null);
            setFase('confirmar');
          }}
          disabled={fase === 'exportando'}
        >
          {conCuenta ? 'Borrar mi cuenta' : 'Borrar los datos de este dispositivo'}
        </button>
      ) : (
        <div className="u-perfil-borrar" role="group" aria-labelledby="u-perfil-borrar-t">
          <h4 id="u-perfil-borrar-t">{conCuenta ? 'Borrar tu cuenta' : 'Borrar los datos de este dispositivo'}</h4>

          {conCuenta ? (
            <>
              <p>Se borra al instante y no se puede deshacer:</p>
              <ul>
                <li>tu cuenta y tu perfil;</li>
                <li>tus análisis guardados en la nube;</li>
                <li>tus exámenes, sus constancias y tus habilidades aprobadas;</li>
                <li>lo que este navegador guarda de ti.</li>
              </ul>
              <p>Lo que no podemos borrar:</p>
              <ul>
                <li>
                  los enlaces de credencial que ya compartiste: se siguen verificando hasta que vencen, 12 meses después de
                  crearlos (los creados con la versión anterior de Ómicrom no vencen);
                </li>
                <li>los registros de uso de la app: quedan, pero sin tu identificación;</li>
                <li>la copia que guarde el navegador de tus otros dispositivos.</li>
              </ul>
              <p className="u-perfil-nota">Si quieres conservar algo, descarga tus datos antes.</p>
            </>
          ) : (
            <p>Se borran tus análisis y tu conversación con el asistente guardados en este navegador. No se puede deshacer.</p>
          )}

          <label htmlFor="u-perfil-confirmar">
            Escribe <strong>{CONFIRMACION_BORRAR}</strong> para confirmar
          </label>
          <input
            ref={campo}
            id="u-perfil-confirmar"
            className="u-perfil-confirmar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void borrar();
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={fase === 'borrando'}
          />
          <div className="u-perfil-borrar-botones">
            <button type="button" className="boton boton-peligro" onClick={() => void borrar()} disabled={!confirmado || fase === 'borrando'}>
              {fase === 'borrando'
                ? 'Borrando…'
                : conCuenta
                  ? 'Borrar mi cuenta definitivamente'
                  : 'Borrar los datos'}
            </button>
            <button type="button" className="boton" onClick={cancelar} disabled={fase === 'borrando'}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="u-perfil-estado" role="status">
        {aviso ?? ''}
      </p>
      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
