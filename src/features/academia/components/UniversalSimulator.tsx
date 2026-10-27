// components/shared/UniversalSimulator.tsx
// ═══════════════════════════════════════════════════════════════════════
// SIMULADOR UNIVERSAL ADAPTATIVO — UI unificada para TODAS las disciplinas.
// Reemplaza SimulatorChallenge (código) y ExamenChallenge (preguntas IA)
// con un motor único que detecta el modo, adapta dificultad y empuja a mejorar.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Sparkles, ShieldCheck, CheckCircle, XCircle, Loader2,
  ArrowRight, Send, RotateCcw, Clock, Trophy, Target,
} from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import {C, FONT, tint, SIZE} from '@/theme';
import { useApp } from '@/store/AppContext';
import type { SkillTreeNode } from '@/types';

// El espejo privado de tokens (un `const C` con 14 entradas reexportadas y sus
// propios MONO/DISP) se fue el 2026-10-27: el tema se importa, no se copia.
const MONO = FONT.mono;
const DISP = FONT.display;

interface Props {
  node: SkillTreeNode;
  onClose: () => void;
  /**
   * @param peAwarded PE otorgados por el reto.
   * @param puntajeGlobal Puntaje real 0-100 del examen. Se agrega para que quien
   *   registre el examen pueda guardar el score de verdad en vez de un valor fijo.
   */
  onSuccess: (peAwarded: number, puntajeGlobal?: number) => void;
}

type Phase = 'loading' | 'reto' | 'defensa' | 'evaluando' | 'resultado' | 'error';


interface Difficulty { level: number; label: string; }
interface RetoData {
  titulo: string;
  contexto: string;
  preguntas: Array<{ pregunta: string; opciones: string[] }>;
  caso_practico: { enunciado: string };
  pista_adaptativa?: string;
}
interface ResultadoData {
  veredicto: string;
  puntaje_global: number;
  ejes: { ejecucion: number; calidad: number; trascendencia: number; fundamento: number };
  resumen: string;
  feedback: string;
  siguiente_paso?: string;
  pe_awarded?: number;
  code_quality_feedback?: string;
}

export function UniversalSimulator({ node, onClose, onSuccess }: Props) {
  useApp(); // mantiene reactividad del contexto sin destructurar
  const [phase, setPhase] = useState<Phase>('loading');
  const [difficulty, setDifficulty] = useState<Difficulty>({ level: 2, label: 'intermedio' });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState('');

  // Reto (preguntas + caso práctico + defensa)
  const [reto, setReto] = useState<RetoData | null>(null);
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [casoRespuesta, setCasoRespuesta] = useState('');

  // Defensa
  const [defensaPregunta, setDefensaPregunta] = useState('');
  const [defensaRespuesta, setDefensaRespuesta] = useState('');
  const [pista, setPista] = useState<string | undefined>();

  // Resultado
  const [resultado, setResultado] = useState<ResultadoData | null>(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const stopTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }, []);
  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
  }, []);
  useEffect(() => () => stopTimer(), [stopTimer]);


  // ── INICIAR: llama a la Edge Function para generar el reto ──────────
  const iniciar = useCallback(async () => {
    setPhase('loading'); setErrMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('simulador-universal', {
        body: { action: 'iniciar', node_id: node.id },
      });
      if (error || !data || data.error) {
        setErrMsg(data?.error || data?.detail || 'No se pudo iniciar el simulador.');
        setPhase('error'); return;
      }

      setDifficulty(data.difficulty ?? { level: 2, label: 'intermedio' });
      setSessionId(data.session_id);
      setReto(data.reto);
      setRespuestas(new Array((data.reto?.preguntas ?? []).length).fill(-1));
      setPhase('reto');
      startTimer();
    } catch {
      setErrMsg('Error de conexión con el Simulador Universal.');
      setPhase('error');
    }
  }, [node.id, startTimer]);

  useEffect(() => { iniciar(); }, [iniciar]);

  // ── IR A DEFENSA ────────────────────────────────────────────────────
  const irADefensa = useCallback(async () => {
    if (!sessionId) return;
    setPhase('loading');
    try {
      const { data, error } = await supabase.functions.invoke('simulador-universal', {
        body: { action: 'defensa', session_id: sessionId, caso_respuesta: casoRespuesta },
      });
      if (error || data?.error) { setErrMsg(data?.error || 'Error en defensa.'); setPhase('error'); return; }
      setDefensaPregunta(data?.defensa || 'Explica por qué tu enfoque es el correcto.');
      setPista(data?.pista);
      setPhase('defensa');
    } catch { setErrMsg('Error de conexión.'); setPhase('error'); }
  }, [sessionId, casoRespuesta]);

  // ── EVALUAR RETO (ANÁLISIS/MIXTO) ──────────────────────────────────
  const evaluarReto = useCallback(async () => {
    if (!sessionId) return;
    setPhase('evaluando');
    try {
      const { data, error } = await supabase.functions.invoke('simulador-universal', {
        body: { action: 'evaluar', session_id: sessionId, respuestas, caso_respuesta: casoRespuesta, defensa_respuesta: defensaRespuesta },
      });
      stopTimer();
      if (error || data?.error || !data?.ejes) { setErrMsg(data?.error || 'Error al evaluar.'); setPhase('error'); return; }
      setResultado({ ...data, pe_awarded: data.pe_awarded ?? 0 });
      setPhase('resultado');
      if (data.veredicto === 'APROBADO') onSuccess(data.pe_awarded ?? 0, data.puntaje_global);
    } catch { setErrMsg('Error de conexión.'); setPhase('error'); }
  }, [sessionId, respuestas, casoRespuesta, defensaRespuesta, stopTimer, onSuccess]);

  const todasContestadas = respuestas.length > 0 && respuestas.every(r => r >= 0) && casoRespuesta.trim().length > 10;

  // ── Escape para cerrar ──────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase !== 'loading' && phase !== 'evaluando') onClose(); };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [phase, onClose]);


  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div role="dialog" aria-modal="true" aria-label={`Simulador: ${node.title}`}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: C.overlay, backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.surface, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, boxShadow: `0 0 14px ${C.cyan}44` }}>
            <Brain size={18} style={{ color: C.cyan }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: DISP, fontWeight: 700, fontSize: 15, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</p>
            <p style={{ margin: '2px 0 0', fontFamily: MONO, fontSize: 9, color: C.mut, letterSpacing: 0.5 }}>
              SIMULADOR UNIVERSAL · NIVEL {difficulty.level}/5
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {elapsed > 0 && <span style={{ fontFamily: MONO, fontSize: 13, color: C.gold, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}</span>}
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, borderRadius: 9, background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.mut, cursor: 'pointer', fontSize: SIZE.md }}>×</button>
        </div>
      </header>

      {/* Barra de dificultad adaptativa */}
      <div style={{ flex: '0 0 auto', padding: '8px 16px', background: C.surface, borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={12} style={{ color: C.purple }} />
        <span style={{ fontFamily: MONO, fontSize: 9, color: C.purple, letterSpacing: 0.5 }}>ADAPTADO A TU NIVEL:</span>
        <span style={{ fontFamily: DISP, fontSize: 11, color: C.ink, fontWeight: 600 }}>{difficulty.label}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {[1, 2, 3, 4, 5].map(l => (
            <div key={l} style={{ width: 14, height: 5, borderRadius: 2, background: l <= difficulty.level ? C.cyan : C.glass2 }} />
          ))}
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: C.bg, padding: 16 }}>

        {/* LOADING */}
        {(phase === 'loading' || phase === 'evaluando') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, minHeight: 280 }}>
            <Loader2 size={30} style={{ color: C.cyan, animation: 'cp-spin 1s linear infinite' }} />
            <p style={{ fontFamily: MONO, fontSize: SIZE.xs, color: C.mut, letterSpacing: 1, textAlign: 'center' }}>
              {phase === 'evaluando' ? 'Evaluando tu desempeño con IA...' : 'Generando reto adaptativo...'}
            </p>
          </div>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, minHeight: 280, textAlign: 'center' }}>
            <XCircle size={30} style={{ color: C.red }} />
            <p style={{ fontFamily: DISP, fontSize: 15, color: C.ink, maxWidth: 420 }}>{errMsg}</p>
            <button onClick={iniciar} style={btnStyle(C.cyan)}><RotateCcw size={15} /> Reintentar</button>
          </div>
        )}

        {phase === 'reto' && reto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Contexto del reto */}
            <div style={{ ...cardS, borderColor: `${C.purple}44`, background: tint(C.iris, 6) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Sparkles size={14} style={{ color: C.purple }} />
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.purple }}>{reto.titulo?.toUpperCase()}</span>
              </div>
              <p style={{ margin: 0, fontFamily: DISP, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.6 }}>{reto.contexto}</p>
              {reto.pista_adaptativa && (
                <p style={{ margin: '10px 0 0', fontFamily: MONO, fontSize: 11, color: C.gold, lineHeight: 1.5 }}>💡 {reto.pista_adaptativa}</p>
              )}
            </div>

            {/* Preguntas de opción múltiple */}
            {reto.preguntas.map((q, qi) => (
              <div key={qi} style={cardS}>
                <p style={{ margin: '0 0 10px', fontFamily: DISP, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>{qi + 1}. {q.pregunta}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {q.opciones.map((op, oi) => {
                    const sel = respuestas[qi] === oi;
                    return (
                      <button key={oi} onClick={() => setRespuestas(p => p.map((v, i) => i === qi ? oi : v))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                          background: sel ? C.cyanFaint : 'transparent', border: `1px solid ${sel ? C.cyan : C.line}`, color: sel ? C.ink : tint(C.ink, 80), fontFamily: DISP, fontSize: 13 }}>
                        <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', border: `2px solid ${sel ? C.cyan : C.mut}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.cyan }} />}
                        </span>
                        {op}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Caso práctico */}
            <div style={{ ...cardS, borderColor: C.goldFaint }}>
              <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.gold }}>⬡ CASO PRÁCTICO</p>
              <p style={{ margin: '0 0 10px', fontFamily: DISP, fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reto.caso_practico.enunciado}</p>
              <textarea value={casoRespuesta} onChange={e => setCasoRespuesta(e.target.value)}
                placeholder="Desarrolla tu solución con criterio técnico..."
                style={textareaS} />
            </div>
          </div>
        )}

        {/* DEFENSA */}
        {phase === 'defensa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...cardS, borderColor: C.cyanDim }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={15} style={{ color: C.cyan }} />
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan }}>DEFENSA · LA IA TE REPREGUNTA</span>
              </div>
              <p style={{ margin: '0 0 12px', fontFamily: DISP, fontSize: 15, color: C.ink, lineHeight: 1.6 }}>{defensaPregunta}</p>
              {pista && <p style={{ margin: '0 0 12px', fontFamily: MONO, fontSize: 11, color: C.gold }}>💡 Pista: {pista}</p>}
              <textarea value={defensaRespuesta} onChange={e => setDefensaRespuesta(e.target.value)}
                placeholder="Responde con tus palabras — la IA evalúa comprensión real, no memorización..."
                style={textareaS} autoFocus />
            </div>
          </div>
        )}

        {/* RESULTADO */}
        {phase === 'resultado' && resultado && (
          <ResultPanel resultado={resultado} difficulty={difficulty} elapsed={elapsed} />
        )}
      </div>

      {/* Footer con acciones */}
      <footer style={{ flex: '0 0 auto', padding: 14, borderTop: `1px solid ${C.line}`, background: C.surface, display: 'flex', gap: 12 }}>
        {phase === 'reto' && (
          <>
            <button onClick={onClose} style={btnGhostS}>Cancelar</button>
            <button onClick={irADefensa} disabled={!todasContestadas} style={{ ...btnStyle(C.cyan), flex: 1, opacity: todasContestadas ? 1 : 0.45 }}>
              Continuar a defensa <ArrowRight size={14} />
            </button>
          </>
        )}
        {phase === 'defensa' && (
          <>
            <button onClick={onClose} style={btnGhostS}>Cancelar</button>
            <button onClick={evaluarReto} disabled={defensaRespuesta.trim().length < 10} style={{ ...btnStyle(C.green), flex: 1, opacity: defensaRespuesta.trim().length >= 10 ? 1 : 0.45 }}>
              <Send size={14} /> Enviar evaluación
            </button>
          </>
        )}
        {phase === 'resultado' && (
          <>
            <button onClick={iniciar} style={btnGhostS}><RotateCcw size={14} /> Reintentar</button>
            <button onClick={onClose} style={{ ...btnStyle(C.cyan), flex: 1 }}><ShieldCheck size={14} /> Cerrar</button>
          </>
        )}
        {phase === 'error' && <button onClick={onClose} style={{ ...btnGhostS, flex: 1 }}>Cerrar</button>}
      </footer>
    </div>
  );
}


// ── Panel de resultado ────────────────────────────────────────────────
function ResultPanel({ resultado, difficulty, elapsed }: { resultado: ResultadoData; difficulty: Difficulty; elapsed: number }) {
  const aprob = resultado.veredicto === 'APROBADO';
  const accent = aprob ? C.green : C.red;
  const EJE_LABELS: Record<string, string> = { ejecucion: 'Ejecución', calidad: 'Calidad', trascendencia: 'Trascendencia', fundamento: 'Fundamento' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Veredicto */}
      <div style={{ borderRadius: 12, border: `1px solid ${accent}66`, background: aprob ? C.greenFaint : C.redFaint, padding: 16, textAlign: 'center' }}>
        {aprob ? <CheckCircle size={30} style={{ color: C.green }} /> : <XCircle size={30} style={{ color: C.red }} />}
        <p style={{ margin: '8px 0 2px', fontFamily: DISP, fontWeight: 700, fontSize: 20, color: accent }}>
          {aprob ? 'Competencia validada' : 'Aún no validada'}
        </p>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: C.mut }}>
          Puntaje: {resultado.puntaje_global}% · Nivel: {difficulty.level}/5 · Tiempo: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
        </p>
        {(resultado.pe_awarded ?? 0) > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, padding: '6px 12px', borderRadius: 9, background: tint(C.gold, 20), border: `1px solid ${C.gold}55` }}>
            <Trophy size={14} style={{ color: C.gold }} />
            <span style={{ fontFamily: MONO, fontSize: SIZE.xs, fontWeight: 700, color: C.gold }}>+{resultado.pe_awarded} PE</span>
          </div>
        )}
      </div>

      {/* 4 ejes del Gemelo */}
      <div style={cardS}>
        <p style={{ margin: '0 0 12px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan }}>🧬 TUS 4 EJES EN ESTE RETO</p>
        {(['ejecucion', 'calidad', 'trascendencia', 'fundamento'] as const).map(k => {
          const v = resultado.ejes[k];
          return (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, color: C.ink, marginBottom: 4 }}>
                <span>{EJE_LABELS[k]}</span><span style={{ color: C.cyan }}>{v}/100</span>
              </div>
              <div style={{ height: 6, background: C.glass2, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.cyan})`, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {resultado.resumen && (
        <div style={cardS}>
          <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan }}>📜 RESUMEN</p>
          <p style={{ margin: 0, fontFamily: DISP, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{resultado.resumen}</p>
        </div>
      )}
      {resultado.feedback && (
        <div style={{ ...cardS, borderColor: `${C.gold}55`, background: C.goldFaint }}>
          <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.gold }}>💡 PARA MEJORAR</p>
          <p style={{ margin: 0, fontFamily: DISP, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{resultado.feedback}</p>
        </div>
      )}
      {resultado.siguiente_paso && (
        <div style={{ ...cardS, borderColor: `${C.green}44`, background: C.greenFaint }}>
          <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.green }}>🎯 TU SIGUIENTE PASO</p>
          <p style={{ margin: 0, fontFamily: DISP, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{resultado.siguiente_paso}</p>
        </div>
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────
const cardS: React.CSSProperties = { padding: 16, borderRadius: 12, background: C.surfaceLight, border: `1px solid ${C.line}` };
const textareaS: React.CSSProperties = {
  width: '100%', minHeight: 110, padding: 12, boxSizing: 'border-box', background: C.bg, color: C.ice,
  fontFamily: DISP, fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none', borderRadius: 9, border: `1px solid ${C.line}`,
};
function btnStyle(color: string): React.CSSProperties {
  return { padding: '13px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 13, color: C.bg, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 16px ${color}55` };
}
const btnGhostS: React.CSSProperties = { padding: '13px 18px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.line}`, color: C.mut, cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 };
