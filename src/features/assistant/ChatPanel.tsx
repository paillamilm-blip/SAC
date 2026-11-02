// Chat del asistente. Un solo asistente para toda la app: te dice qué hacer ahora, responde con
// tus propios datos (cada respuesta declara su origen) y puede hablar y escucharte.
// Las acciones que propone NUNCA se ejecutan solas: aparecen como tarjeta y tú confirmas.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { askOmicron } from '@/features/omicron/services/brain';
import { isSpeechSupported, speak, stopSpeaking } from '@/infrastructure/voice/engine';
import { isSpeechAvailable, startSpeechRecognition, type SpeechHandle } from '@/infrastructure/voice/recognition';
import type { Db } from '../brecha/services/repositorio';
import { listarAnalisis } from '../brecha/services/repositorio';
import type { Accion } from './recomendar';
import { ETIQUETA_ORIGEN, responder, respuestaNoEntendida, saludoInicial, sugerencias, type Respuesta } from './responder';
import {
  AJUSTES_POR_DEFECTO,
  borrarHistorial,
  cargarAjustes,
  cargarHistorial,
  guardarAjustes,
  guardarHistorial,
  limpiarTextoIA,
  type Ajustes,
  type Mensaje,
} from './almacenChat';

function almacen(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export interface ChatPanelProps {
  db: Db;
  /** Id de la persona con sesión; null = invitado. */
  usuarioId: string | null;
  nombre: string | null;
  /** La IA (proxy-ai) solo está disponible con sesión iniciada. */
  iaDisponible: boolean;
  abierto: boolean;
  onCerrar: () => void;
  /** La pantalla ejecuta la acción ya confirmada por la persona. */
  onEjecutar: (accion: Accion) => void;
}

export default function ChatPanel({ db, usuarioId, nombre, iaDisponible, abierto, onCerrar, onEjecutar }: ChatPanelProps) {
  const [ajustes, setAjustes] = useState<Ajustes>(() => {
    const a = almacen();
    return a ? cargarAjustes(a) : AJUSTES_POR_DEFECTO;
  });
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [verAjustes, setVerAjustes] = useState(false);
  const contador = useRef(0);
  const reconocimiento = useRef<SpeechHandle | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const hayVoz = isSpeechAvailable();
  const puedeHablar = isSpeechSupported();
  const estado = useMemo(() => ({ db, ahora: new Date().toISOString() }), [db]);

  const nuevoId = () => `m${Date.now().toString(36)}${(contador.current++).toString(36)}`;

  const decir = useCallback(
    (r: Respuesta, extra: Partial<Mensaje> = {}) => {
      const m: Mensaje = {
        id: nuevoId(),
        rol: 'asistente',
        texto: r.texto,
        origen: r.origen,
        fuentes: r.fuentes,
        accion: r.accion ? { ...r.accion, estado: 'propuesta' } : undefined,
        ...extra,
      };
      setMensajes((prev) => [...prev, m]);
      if (ajustes.hablar && puedeHablar) {
        speak(
          r.texto,
          () => setHablando(true),
          () => setHablando(false),
        );
      }
    },
    [ajustes.hablar, puedeHablar],
  );

  // Al abrir por primera vez: recuperar historial (si la persona lo pidió) o saludar.
  const iniciado = useRef(false);
  useEffect(() => {
    if (!abierto || iniciado.current) return;
    iniciado.current = true;
    const a = almacen();
    const previo = ajustes.guardarHistorial && a ? cargarHistorial(a, usuarioId) : [];
    if (previo.length > 0) {
      setMensajes(previo);
    } else {
      const s = saludoInicial(estado, nombre);
      setMensajes([
        {
          id: nuevoId(),
          rol: 'asistente',
          texto: s.texto,
          origen: s.origen,
          accion: s.accion ? { ...s.accion, estado: 'propuesta' } : undefined,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Guardar el historial solo si la persona lo activó.
  useEffect(() => {
    const a = almacen();
    if (!a || !iniciado.current || !ajustes.guardarHistorial || mensajes.length === 0) return;
    guardarHistorial(a, usuarioId, mensajes);
  }, [mensajes, ajustes.guardarHistorial, usuarioId]);

  useEffect(() => {
    finRef.current?.scrollIntoView?.({ block: 'end' });
  }, [mensajes, pensando]);

  useEffect(() => {
    if (abierto) entradaRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  // Al desmontar o cerrar: callar la voz y soltar el micrófono.
  useEffect(() => {
    if (abierto) return;
    reconocimiento.current?.abort();
    reconocimiento.current = null;
    setEscuchando(false);
    stopSpeaking();
    setHablando(false);
  }, [abierto]);

  useEffect(
    () => () => {
      reconocimiento.current?.abort();
      stopSpeaking();
    },
    [],
  );

  const enviar = useCallback(
    async (crudo: string) => {
      const t = crudo.trim();
      if (!t || pensando) return;
      // Si la persona habla encima del asistente, el asistente calla (interrupción honesta).
      stopSpeaking();
      setHablando(false);
      setTexto('');
      setMensajes((prev) => [...prev, { id: nuevoId(), rol: 'yo', texto: t }]);

      const ahora = new Date().toISOString();
      const local = responder(t, { db: dbRef.current, ahora });
      if (local) {
        decir(local);
        return;
      }
      if (!iaDisponible) {
        decir(respuestaNoEntendida());
        return;
      }
      setPensando(true);
      try {
        const ultimo = listarAnalisis(dbRef.current)[0];
        const r = await askOmicron(t, {
          displayName: nombre ?? undefined,
          cv_summary: ultimo?.resumen,
          skills: ultimo?.fortalezas,
        });
        const limpio = limpiarTextoIA(r.text ?? '');
        if (r.error || !limpio) decir(respuestaNoEntendida());
        else decir({ texto: limpio, origen: 'estimacion' }, { ia: true });
      } catch {
        decir(respuestaNoEntendida());
      } finally {
        setPensando(false);
      }
    },
    [pensando, iaDisponible, nombre, decir],
  );

  function alternarMicro() {
    if (escuchando) {
      reconocimiento.current?.abort();
      reconocimiento.current = null;
      setEscuchando(false);
      return;
    }
    stopSpeaking(); // interrumpir al asistente antes de escuchar
    setHablando(false);
    const h = startSpeechRecognition({
      lang: 'es-CL',
      interimResults: true,
      onResult: (transcript, esFinal) => {
        setTexto(transcript);
        if (esFinal) {
          setEscuchando(false);
          reconocimiento.current = null;
          void enviar(transcript);
        }
      },
      onEnd: () => setEscuchando(false),
      onError: () => setEscuchando(false),
    });
    if (h) {
      reconocimiento.current = h;
      setEscuchando(true);
    }
  }

  function resolverAccion(id: string, confirmar: boolean) {
    const m = mensajes.find((x) => x.id === id);
    if (!m?.accion || m.accion.estado !== 'propuesta') return;
    setMensajes((prev) =>
      prev.map((x) => (x.id === id && x.accion ? { ...x, accion: { ...x.accion, estado: confirmar ? 'hecha' : 'cancelada' } } : x)),
    );
    if (confirmar) onEjecutar(m.accion.accion);
  }

  function cambiarAjuste(parcial: Partial<Ajustes>) {
    const siguiente = { ...ajustes, ...parcial };
    setAjustes(siguiente);
    const a = almacen();
    if (a) guardarAjustes(a, siguiente);
    if (parcial.hablar === false) {
      stopSpeaking();
      setHablando(false);
    }
    if (parcial.guardarHistorial === false && a) borrarHistorial(a, usuarioId);
  }

  function borrarConversacion() {
    const a = almacen();
    if (a) borrarHistorial(a, usuarioId);
    const s = saludoInicial(estado, nombre);
    setMensajes([
      {
        id: nuevoId(),
        rol: 'asistente',
        texto: s.texto,
        origen: s.origen,
        accion: s.accion ? { ...s.accion, estado: 'propuesta' } : undefined,
      },
    ]);
    setVerAjustes(false);
  }

  if (!abierto) return null;

  const sugeridas = sugerencias(estado);

  return (
    <section className="u-chat" role="dialog" aria-label="Asistente de Ómicrom" aria-modal="false">
      <header className="u-chat-cab">
        <div className="u-chat-id">
          <span className="u-chat-orbe" data-hablando={hablando || escuchando} aria-hidden="true" />
          <div>
            <h2>Asistente</h2>
            <p>{escuchando ? 'Te escucho…' : hablando ? 'Hablando…' : pensando ? 'Pensando…' : 'Te guío paso a paso'}</p>
          </div>
        </div>
        <div className="u-chat-cab-acciones">
          {hablando && (
            <button
              type="button"
              className="u-icono"
              onClick={() => {
                stopSpeaking();
                setHablando(false);
              }}
              aria-label="Callar al asistente"
            >
              ■
            </button>
          )}
          <button
            type="button"
            className="u-icono"
            onClick={() => setVerAjustes((v) => !v)}
            aria-expanded={verAjustes}
            aria-controls="u-chat-ajustes"
            aria-label="Ajustes del asistente"
          >
            ⚙
          </button>
          <button type="button" className="u-icono" onClick={onCerrar} aria-label="Cerrar el asistente">
            ✕
          </button>
        </div>
      </header>

      {verAjustes && (
        <div className="u-chat-ajustes" id="u-chat-ajustes">
          <label className="u-interruptor">
            <input
              type="checkbox"
              checked={ajustes.hablar}
              disabled={!puedeHablar}
              onChange={(e) => cambiarAjuste({ hablar: e.target.checked })}
            />
            <span>
              Leer las respuestas en voz alta
              {!puedeHablar && <small> · tu navegador no lo permite</small>}
            </span>
          </label>
          <label className="u-interruptor">
            <input
              type="checkbox"
              checked={ajustes.guardarHistorial}
              onChange={(e) => cambiarAjuste({ guardarHistorial: e.target.checked })}
            />
            <span>
              Guardar esta conversación en este dispositivo
              <small> · desactivado, se olvida al cerrar</small>
            </span>
          </label>
          <button type="button" className="boton" onClick={borrarConversacion}>
            Borrar conversación
          </button>
        </div>
      )}

      <div className="u-chat-lista" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación">
        {mensajes.map((m) => (
          <article key={m.id} className="u-msg" data-rol={m.rol}>
            <p className="u-msg-texto">{m.texto}</p>

            {m.rol === 'asistente' && (m.ia || m.origen) && (
              <p className="u-origen" data-origen={m.ia ? 'ia' : m.origen}>
                {m.ia ? 'Respuesta de IA · no verificada con tus datos' : ETIQUETA_ORIGEN[m.origen!]}
              </p>
            )}

            {m.fuentes && m.fuentes.length > 0 && (
              <ul className="u-fuentes" aria-label="De dónde sale cada dato">
                {m.fuentes.map((f) => (
                  <li key={f.cita}>
                    <q>{f.cita}</q>
                    <span data-origen={f.origen}>{f.etiqueta}</span>
                  </li>
                ))}
              </ul>
            )}

            {m.accion && (
              <div className="u-accion" data-estado={m.accion.estado}>
                <p className="u-accion-porque">{m.accion.porQue}</p>
                {m.accion.accion.tipo === 'dominar' && m.accion.estado === 'propuesta' && (
                  <p className="u-accion-aviso">Lo declaras tú: todavía no hay un examen que lo compruebe.</p>
                )}
                {m.accion.estado === 'propuesta' ? (
                  <div className="u-accion-botones">
                    <button type="button" className="boton boton-primario" onClick={() => resolverAccion(m.id, true)}>
                      {m.accion.etiqueta}
                    </button>
                    <button type="button" className="boton" onClick={() => resolverAccion(m.id, false)}>
                      Ahora no
                    </button>
                  </div>
                ) : (
                  <p className="u-accion-estado">{m.accion.estado === 'hecha' ? 'Listo.' : 'Lo dejamos para después.'}</p>
                )}
              </div>
            )}
          </article>
        ))}
        {pensando && (
          <p className="u-pensando" role="status">
            Pensando…
          </p>
        )}
        <div ref={finRef} />
      </div>

      <div className="u-chat-sugeridas">
        {sugeridas.map((s) => (
          <button key={s} type="button" className="u-sugerida" onClick={() => void enviar(s)} disabled={pensando}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="u-chat-entrada"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(texto);
        }}
      >
        <input
          ref={entradaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={escuchando ? 'Habla ahora…' : 'Escribe o usa el micrófono'}
          aria-label="Mensaje para el asistente"
          autoComplete="off"
          enterKeyHint="send"
        />
        {hayVoz && (
          <button
            type="button"
            className="u-icono u-micro"
            data-activo={escuchando}
            onClick={alternarMicro}
            aria-pressed={escuchando}
            aria-label={escuchando ? 'Dejar de escuchar' : 'Hablar con el asistente'}
          >
            🎤
          </button>
        )}
        <button type="submit" className="boton boton-primario" disabled={!texto.trim() || pensando}>
          Enviar
        </button>
      </form>
    </section>
  );
}
