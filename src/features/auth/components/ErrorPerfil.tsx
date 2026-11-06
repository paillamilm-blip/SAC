// Pantalla para cuando la sesión es válida pero NO se pudo leer el perfil (red caída o servidor con problemas).
//
// No es «sin acceso»: aquel es un veto del servidor; éste se arregla reintentando. Por eso:
//   · dice qué pasó sin culpar a la persona ni sugerir que perdió su cuenta,
//   · tiene «Reintentar» y un contador visible (no hay bucle automático: una base caída no se golpea),
//   · NO ofrece «Cerrar sesión», para que no parezca una expulsión,
//   · reintenta UNA vez cuando el navegador avisa que volvió la conexión (un intento por evento, no un bucle).

import { useEffect, useRef, useState } from 'react';

export default function ErrorPerfil({
  reintentando,
  onReintentar,
}: {
  /** Hay una lectura del perfil en curso. */
  reintentando: boolean;
  onReintentar: () => void | Promise<void>;
}) {
  const [intentos, setIntentos] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Quien navega con teclado o lector de pantalla aterriza en el mensaje, no en el vacío.
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  const reintentar = () => {
    if (reintentando) return;
    setIntentos((n) => n + 1);
    void onReintentar();
  };

  // Siempre la versión más reciente, para que el oyente de «online» no use un estado viejo.
  const ultimo = useRef(reintentar);
  useEffect(() => {
    ultimo.current = reintentar;
  });
  useEffect(() => {
    const alVolver = () => ultimo.current();
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, []);

  return (
    <div className="wrap u-error-perfil">
      <div className="vacio" role="alert">
        <h1 ref={titulo} tabIndex={-1}>
          No pudimos cargar tu perfil
        </h1>
        <p>Tu sesión sigue abierta. Lo que falló fue la conexión con el servidor al leer tu perfil.</p>
        <p className="u-error-perfil-ayuda">
          Revisa tu conexión e inténtalo de nuevo. Si ya lo intentaste varias veces, espera unos minutos.
        </p>
      </div>

      <button type="button" className="boton boton-primario" onClick={reintentar} disabled={reintentando}>
        {reintentando ? 'Reintentando…' : 'Reintentar'}
      </button>

      <p className="u-error-perfil-cuenta" role="status">
        {reintentando
          ? 'Conectando con el servidor…'
          : intentos > 0
            ? `Reintento ${intentos}: seguimos sin conexión con el servidor.`
            : ''}
      </p>
    </div>
  );
}
