// Examen de una brecha, dentro de /u. El servidor genera el reto, califica y da el veredicto; esta pantalla
// solo recoge las respuestas. Aprobar (70 o más) es lo único que deja una brecha «dominada con prueba».

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PruebaExamen } from '../domain/types';
import {
  evaluarExamen,
  iniciarExamen,
  pedirDefensa,
  pruebaDe,
  type Resultado,
  type Reto,
} from '../services/examen';

type Fase = 'preparando' | 'reto' | 'defensa' | 'evaluando' | 'resultado' | 'error';

/** Mínimos para no mandar respuestas vacías al servidor. No miden calidad: eso lo hace el servidor. */
export const MIN_CASO = 30;
export const MIN_DEFENSA = 10;
export const NOTA_APROBADO = 70;

const EJES: { clave: keyof Resultado['ejes']; nombre: string }[] = [
  { clave: 'ejecucion', nombre: 'Resolver el problema' },
  { clave: 'calidad', nombre: 'Rigor' },
  { clave: 'trascendencia', nombre: 'Visión de conjunto' },
  { clave: 'fundamento', nombre: 'Comprensión de fondo' },
];

export default function Examen({
  tituloBrecha,
  onAprobado,
  onCerrar,
}: {
  /** Título de la brecha que se quiere demostrar. */
  tituloBrecha: string;
  /** Se llama una sola vez, apenas el servidor aprueba y deja constancia. */
  onAprobado: (prueba: PruebaExamen) => void;
  onCerrar: () => void;
}) {
  const [fase, setFase] = useState<Fase>('preparando');
  const [error, setError] = useState<string | null>(null);
  const [reto, setReto] = useState<Reto | null>(null);
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [caso, setCaso] = useState('');
  const [defensa, setDefensa] = useState<{ pregunta: string; pista: string | null } | null>(null);
  const [respuestaDefensa, setRespuestaDefensa] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const vivo = useRef(true);
  const avisado = useRef(false);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const aprobadoRef = useRef(onAprobado);
  aprobadoRef.current = onAprobado;

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const empezar = useCallback(async () => {
    setFase('preparando');
    setError(null);
    setReto(null);
    setCaso('');
    setDefensa(null);
    setRespuestaDefensa('');
    setResultado(null);
    avisado.current = false;
    const r = await iniciarExamen(tituloBrecha);
    if (!vivo.current) return;
    if (!r.ok) {
      setError(r.error);
      setFase('error');
      return;
    }
    setReto(r.datos);
    setRespuestas(new Array(r.datos.preguntas.length).fill(-1));
    setFase('reto');
  }, [tituloBrecha]);

  useEffect(() => {
    void empezar();
  }, [empezar]);

  // El foco entra a la ventana al abrirla y vuelve a su inicio al cambiar de fase (quien usa lector de pantalla se orienta).
  useEffect(() => {
    dialogoRef.current?.focus();
  }, [fase]);

  // Mientras el servidor califica no se puede cerrar: el resultado se guardaría allá y aquí se perdería.
  const puedeCerrar = fase !== 'evaluando' && !trabajando;
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && puedeCerrar) onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [puedeCerrar, onCerrar]);

  // Apenas el servidor aprueba y deja constancia, la prueba se guarda (una sola vez), sin esperar a que se cierre la ventana.
  useEffect(() => {
    if (fase !== 'resultado' || !resultado || avisado.current) return;
    const prueba = pruebaDe(resultado, new Date().toISOString());
    if (!prueba) return;
    avisado.current = true;
    aprobadoRef.current(prueba);
  }, [fase, resultado]);

  const todasContestadas = respuestas.length > 0 && respuestas.every((r) => r >= 0);
  const casoListo = caso.trim().length >= MIN_CASO;

  async function irADefensa() {
    if (!reto || trabajando) return;
    setTrabajando(true);
    const r = await pedirDefensa(reto.sessionId, caso);
    if (!vivo.current) return;
    setTrabajando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setDefensa({ pregunta: r.datos.defensa, pista: r.datos.pista });
    setFase('defensa');
  }

  async function entregar() {
    if (!reto || trabajando) return;
    setTrabajando(true);
    setError(null);
    setFase('evaluando');
    const r = await evaluarExamen(reto.sessionId, respuestas, caso, respuestaDefensa);
    if (!vivo.current) return;
    setTrabajando(false);
    if (!r.ok) {
      setError(r.error);
      setFase('error');
      return;
    }
    setResultado(r.datos);
    setFase('resultado');
  }

  const aprobadoSinConstancia = fase === 'resultado' && resultado?.aprobado && !resultado.actaId;

  return (
    <div className="u-examen-fondo" onMouseDown={(e) => e.target === e.currentTarget && puedeCerrar && onCerrar()}>
      <div
        ref={dialogoRef}
        className="u-examen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="u-examen-titulo"
        tabIndex={-1}
      >
        <header className="u-examen-cab">
          <div>
            <p className="u-examen-sobre">Demuéstralo</p>
            <h2 id="u-examen-titulo">{tituloBrecha}</h2>
          </div>
          <button type="button" className="boton" onClick={onCerrar} disabled={!puedeCerrar} aria-label="Cerrar el examen">
            Cerrar
          </button>
        </header>

        <div className="u-examen-cuerpo" aria-live="polite">
          {fase === 'preparando' && <p className="u-examen-estado">Preparando tu examen… puede tardar unos segundos.</p>}

          {fase === 'evaluando' && (
            <p className="u-examen-estado">Calificando tus respuestas… no cierres esta ventana.</p>
          )}

          {fase === 'error' && (
            <div className="aviso aviso-error" role="alert">
              <p>{error}</p>
              <div className="u-examen-botones">
                <button type="button" className="boton boton-primario" onClick={() => void empezar()}>
                  Empezar de nuevo
                </button>
              </div>
            </div>
          )}

          {fase === 'reto' && reto && (
            <>
              {reto.contexto && <p className="u-examen-contexto">{reto.contexto}</p>}
              <p className="u-examen-nota">
                Tres preguntas y un caso práctico. Se aprueba con {NOTA_APROBADO} de 100 o más, y lo califica el servidor.
              </p>

              {reto.preguntas.map((q, qi) => (
                <fieldset key={qi} className="u-examen-pregunta">
                  <legend>
                    {qi + 1}. {q.pregunta}
                  </legend>
                  {q.opciones.map((op, oi) => (
                    <label key={oi} className="u-examen-opcion">
                      <input
                        type="radio"
                        name={`pregunta-${qi}`}
                        checked={respuestas[qi] === oi}
                        onChange={() => setRespuestas((prev) => prev.map((v, i) => (i === qi ? oi : v)))}
                      />
                      <span>{op}</span>
                    </label>
                  ))}
                </fieldset>
              ))}

              <div className="u-examen-caso">
                <label htmlFor="u-examen-caso">
                  <strong>Caso práctico.</strong> {reto.casoEnunciado}
                </label>
                <textarea
                  id="u-examen-caso"
                  rows={6}
                  value={caso}
                  onChange={(e) => setCaso(e.target.value)}
                  placeholder="Explica cómo lo resolverías, paso a paso."
                />
                <p className="u-examen-nota" aria-live="off">
                  {casoListo ? 'Listo para continuar.' : `Escribe al menos ${MIN_CASO} caracteres (llevas ${caso.trim().length}).`}
                </p>
                {reto.pista && (
                  <details>
                    <summary>Ver una pista</summary>
                    <p>{reto.pista}</p>
                  </details>
                )}
              </div>

              {error && (
                <p className="aviso aviso-error" role="alert">
                  {error}
                </p>
              )}
              <div className="u-examen-botones">
                <button
                  type="button"
                  className="boton boton-primario"
                  disabled={!todasContestadas || !casoListo || trabajando}
                  onClick={() => void irADefensa()}
                >
                  {trabajando ? 'Un momento…' : 'Continuar'}
                </button>
                {!todasContestadas && <span className="u-examen-nota">Contesta las tres preguntas.</span>}
              </div>
            </>
          )}

          {fase === 'defensa' && defensa && (
            <>
              <div className="u-examen-caso">
                <label htmlFor="u-examen-defensa">
                  <strong>Una última pregunta.</strong> {defensa.pregunta}
                </label>
                <textarea
                  id="u-examen-defensa"
                  rows={5}
                  value={respuestaDefensa}
                  onChange={(e) => setRespuestaDefensa(e.target.value)}
                  placeholder="Responde con tus palabras."
                />
                {defensa.pista && (
                  <details>
                    <summary>Ver una pista</summary>
                    <p>{defensa.pista}</p>
                  </details>
                )}
              </div>
              <div className="u-examen-botones">
                <button
                  type="button"
                  className="boton boton-primario"
                  disabled={respuestaDefensa.trim().length < MIN_DEFENSA || trabajando}
                  onClick={() => void entregar()}
                >
                  Entregar examen
                </button>
              </div>
            </>
          )}

          {fase === 'resultado' && resultado && (
            <div className="u-examen-resultado" data-aprobado={resultado.aprobado}>
              <p className="u-examen-veredicto">
                {resultado.aprobado ? 'Aprobaste' : 'Todavía no'} · <strong>{resultado.puntaje}</strong>/100
              </p>
              {aprobadoSinConstancia ? (
                <p className="aviso aviso-error" role="alert">
                  El servidor aprobó el examen pero no dejó constancia, así que no lo guardamos como prueba. Inténtalo de nuevo.
                </p>
              ) : resultado.aprobado ? (
                <p className="u-examen-nota">Esta brecha quedó como dominada, con prueba.</p>
              ) : (
                <p className="u-examen-nota">Se aprueba con {NOTA_APROBADO}. Puedes intentarlo otra vez con un examen nuevo.</p>
              )}

              <dl className="u-examen-ejes">
                {EJES.map((e) => (
                  <div key={e.clave}>
                    <dt>{e.nombre}</dt>
                    <dd>{resultado.ejes[e.clave]}</dd>
                  </div>
                ))}
              </dl>

              {resultado.resumen && <p>{resultado.resumen}</p>}
              {resultado.feedback && (
                <p>
                  <strong>Para mejorar:</strong> {resultado.feedback}
                </p>
              )}
              {resultado.siguientePaso && (
                <p>
                  <strong>Siguiente paso:</strong> {resultado.siguientePaso}
                </p>
              )}

              <div className="u-examen-botones">
                {resultado.aprobado && !aprobadoSinConstancia ? (
                  <button type="button" className="boton boton-primario" onClick={onCerrar}>
                    Listo
                  </button>
                ) : (
                  <>
                    <button type="button" className="boton boton-primario" onClick={() => void empezar()}>
                      Intentar con un examen nuevo
                    </button>
                    <button type="button" className="boton" onClick={onCerrar}>
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
