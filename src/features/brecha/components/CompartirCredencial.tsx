// Crear y copiar el enlace de la credencial. Solo aparece con sesión iniciada y al menos una habilidad dominada
// con prueba: sin examen aprobado no hay nada que certificar.

import { useRef, useState } from 'react';
import { emitirCredencial } from '../services/credencial';

type Fase = 'inicial' | 'creando' | 'lista' | 'error';

export default function CompartirCredencial({
  sesionIniciada,
  dominadas,
}: {
  sesionIniciada: boolean;
  /** Brechas dominadas con prueba (el servidor vuelve a comprobar las pruebas al firmar). */
  dominadas: number;
}) {
  const [fase, setFase] = useState<Fase>('inicial');
  const [enlace, setEnlace] = useState('');
  const [vence, setVence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  if (!sesionIniciada || dominadas < 1) return null;

  async function crear() {
    if (fase === 'creando') return;
    setFase('creando');
    setError(null);
    setAviso(null);
    const r = await emitirCredencial();
    if (!r.ok) {
      setError(r.error);
      setFase('error');
      return;
    }
    setEnlace(r.datos.enlace);
    setVence(r.datos.vence);
    setFase('lista');
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setAviso('Enlace copiado.');
    } catch {
      campo.current?.select();
      setAviso('No pude copiarlo solo: ya quedó seleccionado, cópialo con Cmd/Ctrl + C.');
    }
  }

  return (
    <section className="card u-compartir" id="u-compartir" tabIndex={-1} aria-labelledby="u-comp-t">
      <h2 className="card-titulo" id="u-comp-t">
        Comparte lo que demostraste
      </h2>
      <p className="u-compartir-texto">
        Crea un enlace que cualquiera puede abrir, sin cuenta, para comprobar que aprobaste esos exámenes. Quien lo abra
        verá tu nombre, las habilidades que aprobaste, tu mejor puntaje en cada una y la fecha. Vence a los 12 meses.
      </p>

      {fase !== 'lista' && (
        <button type="button" className="boton boton-primario" onClick={() => void crear()} disabled={fase === 'creando'}>
          {fase === 'creando' ? 'Creando…' : 'Crear mi enlace'}
        </button>
      )}

      {fase === 'error' && error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}

      {fase === 'lista' && (
        <div className="u-compartir-lista">
          <label htmlFor="u-comp-enlace">Tu enlace</label>
          <input ref={campo} id="u-comp-enlace" className="u-compartir-enlace" readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} />
          <div className="u-examen-botones">
            <button type="button" className="boton boton-primario" onClick={() => void copiar()}>
              Copiar enlace
            </button>
            <button type="button" className="boton" onClick={() => void crear()}>
              Crear uno nuevo
            </button>
          </div>
          <p className="u-examen-nota" role="status">
            {aviso ?? ''}
          </p>
          <p className="u-examen-nota">
            Incluye las habilidades que tienes aprobadas hoy
            {vence ? ` y vence el ${new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(vence))}` : ''}.
            Si apruebas otras, crea un enlace nuevo.
          </p>
        </div>
      )}
    </section>
  );
}
