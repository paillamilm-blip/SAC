// features/omicron/components/GemeloReveal.tsx
// ═══════════════════════════════════════════════════════════════════════
// GEMELO REVEAL — La experiencia "Tu Primer Minuto en Ómicrom".
//
// 4 Actos:
//   1. "La Orbe Te Lee"        — datos aparecen tipo terminal, orbe crece
//   2. "El Veredicto"          — Ómicrom habla tu eje débil (TTS)
//   3. "Mapa de Posibilidades" — dónde estás vs dónde podrías
//   4. "Momento de Verdad"     — CTA con countdown de desvanecimiento
//
// Reemplaza el Dossier viejo. Se muestra después del análisis (IA o local).
// NO requiere auth — si es guest, al final pide registro para guardar.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Zap, TrendingUp, Shield, Target, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { C, FONT, SIZE, RADIUS } from '@/theme';
import { getUserColor } from '@/shared/components/ColorPicker';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import type { AnalyzedProfile } from '@/features/gemelo/services/cvAnalyzer';
import { useCountUp } from './CountUp';
import { deriveArchetype } from '../utils/archetype';

// ── Types ──────────────────────────────────────────────────────────────
interface Props {
  analyzed: AnalyzedProfile;
  onActivate: () => void; // Called when user wants to register/save
  isAuthenticated: boolean;
  persisting?: boolean; // true mientras el RPC de guardado está en vuelo
  persisted?: boolean; // true tras un guardado exitoso
  onClose?: () => void; // cierra el overlay ConvalidaOmicron
}

// ── Constants ──────────────────────────────────────────────────────────
const ACTS = ['reading', 'verdict', 'map', 'cta'] as const;
type Act = typeof ACTS[number];

const AXIS_LABELS: Record<string, { name: string; icon: typeof Zap; color: string }> = {
  exec: { name: 'Ejecución', icon: Zap, color: C.cyan },
  qual: { name: 'Calidad', icon: Shield, color: C.purple },
  trans: { name: 'Trascendencia', icon: TrendingUp, color: C.gold },
  fund: { name: 'Fundamento', icon: Target, color: C.green },
};

// ── Terminal line component ──────────────────────────────────────────────
// Línea tipo terminal con auto-timer propio (aparece a los `delay`ms) y
// entrada framer transform/opacity. Respeta prefers-reduced-motion: con
// reduceMotion aparece en estado final (sin slide ni tween). El timer se
// limpia solo al desmontar; todo el bloque 'reading' se desmonta en el
// cambio de acto vía AnimatePresence, así que no quedan timers colgando.
function TerminalLine({ text, delay, color = C.cyan, reduceMotion = false }: { text: string; delay: number; color?: string; reduceMotion?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!visible) return null;
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span style={{ color: C.mut }}>{'>'}</span> {text}
    </motion.div>
  );
}

// ── Ease-out tuple for the birth-beat pulse (mutable, NOT `as const`) ────
const BEAT_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Axis value with count-up + one-shot "birth beat" pulse ───────────────
// El número sube de 0 al valor real (escalonado por `delayMs`) y, al
// aterrizar, dispara un latido único (scale + opacity, no-loop, <300ms).
// Reduced motion: valor final instantáneo, sin tween ni latido.
function AxisValue({ to, color, delayMs }: { to: number; color: string; delayMs: number }) {
  const reduceMotion = useReducedMotion();
  const [beat, setBeat] = useState(false);
  const value = useCountUp(to, {
    durationMs: 900,
    delayMs,
    onLanded: () => setBeat(true),
  });
  return (
    <motion.div
      animate={beat && !reduceMotion ? { scale: [1, 1.05, 1], opacity: [1, 0.85, 1] } : { scale: 1, opacity: 1 }}
      transition={{ duration: 0.28, ease: BEAT_EASE }}
      style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color, transformOrigin: 'left center' }}
    >
      {value}<span style={{ fontSize: SIZE.xs, color: C.mut }}>/100</span>
    </motion.div>
  );
}

// ── Reputation value with count-up (map act) ─────────────────────────────
// Sube de 0 al valor computado real. Solo animación de display; la fórmula
// no cambia. Reduced motion: valor final instantáneo.
function RepValue({ to, color, delayMs }: { to: number; color: string; delayMs: number }) {
  const value = useCountUp(to, { durationMs: 900, delayMs });
  return (
    <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color }}>
      {value}<span style={{ fontSize: SIZE.sm, color: C.mut }}>/100</span>
    </div>
  );
}

// ── Living seal / "sello" for the verdict act (INC 4, Idea 5) ────────────
// Un sello que se "estampa" una sola vez cuando aterriza el veredicto: escala
// (0.9 → 1.0) + opacidad + un breve resplandor en el color del usuario (`uc`),
// leyéndose como una credencial oficial recién emitida. One-shot, no-loop,
// <400ms, ease-out (BEAT_EASE), solo transform/opacity + boxShadow.
// Reduced motion: aparece en su estado final al instante (sin tween).
// No usa timers propios: framer-motion anima al montar; el bloque 'verdict'
// se monta al entrar al acto vía AnimatePresence.
function VerdictSeal({ uc, reduceMotion = false }: { uc: string; reduceMotion?: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
      animate={
        reduceMotion
          ? { scale: 1, opacity: 1, boxShadow: `0 0 0 1px ${uc}55` }
          : { scale: 1, opacity: 1, boxShadow: [`0 0 0 1px ${uc}55`, `0 0 18px 2px ${uc}66`, `0 0 0 1px ${uc}55`] }
      }
      transition={reduceMotion ? { duration: 0 } : { duration: 0.38, ease: BEAT_EASE }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: RADIUS.pill,
        background: `${uc}14`,
        border: `1px solid ${uc}55`,
        transformOrigin: 'center',
      }}
    >
      <Shield size={12} color={uc} />
      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.2, color: uc, textTransform: 'uppercase' }}>
        Credencial emitida por Ómicrom
      </span>
    </motion.div>
  );
}

// ── Traveling light bar for the map act (INC 4, Idea 4) ──────────────────
// Barra que conecta la reputación de HOY con la FUTURA. Una luz viaja una
// sola vez de izquierda (hoy) a derecha (futuro) para que el usuario VEA el
// salto. Solo transform (translateX) + opacity; one-shot, no-loop.
// El ancho relativo de la luz mapea el delta real (repFuture - repToday)
// sobre la escala 0-100; no altera ninguna cifra ni fórmula.
// Reduced motion: barra estática que muestra el delta, sin luz viajera.
function RepTravelBar({ repToday, repFuture, uc, reduceMotion = false }: { repToday: number; repFuture: number; uc: string; reduceMotion?: boolean }) {
  const delta = Math.max(0, repFuture - repToday);
  // Posiciones relativas (0-100) sobre la escala 0-100 para anclar el tramo.
  const startPct = Math.max(0, Math.min(100, repToday));
  const endPct = Math.max(0, Math.min(100, repFuture));
  const spanPct = Math.max(0, endPct - startPct);
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Riel base */}
      <div style={{ position: 'relative', height: 6, borderRadius: RADIUS.pill, background: `${C.line}`, overflow: 'hidden' }}>
        {/* Tramo hoy→futuro coloreado con el color del usuario */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${startPct}%`, width: `${spanPct}%`, background: `${uc}55`, borderRadius: RADIUS.pill }} />
        {/* Contenedor del tramo hoy→futuro (con overflow oculto): dentro, una
            capa translada su translateX RELATIVO a su propio ancho (= ancho del
            tramo), así la luz cruza el tramo completo. Solo transform + opacity;
            one-shot. Reduced motion: sin luz viajera (el tramo estático ya
            muestra el delta). */}
        {!reduceMotion && delta > 0 && (
          <div style={{ position: 'absolute', top: -3, left: `${startPct}%`, width: `${spanPct}%`, height: 12, overflow: 'hidden' }}>
            {/* La luz viaja translateX de -100% a 0% relativo a su propio ancho
                (= ancho del tramo), cruzando el tramo completo. El punto brillante
                va anclado al borde derecho de esta capa. Solo transform+opacity. */}
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: ['-100%', '0%'], opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, ease: BEAT_EASE }}
              style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: 12 }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: uc, boxShadow: `0 0 12px 3px ${uc}` }} />
            </motion.div>
          </div>
        )}
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, marginTop: 6, textAlign: 'center' }}>
        {delta > 0 ? `+${delta} puntos de reputación al completar los 3 pasos` : 'Tu reputación ya está en su mejor nivel'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export function GemeloReveal({ analyzed, onActivate, isAuthenticated, persisting, persisted, onClose }: Props) {
  const uc = getUserColor();
  // Ref al último onClose para que el timer de auto-cierre siempre llame a la
  // versión actual sin depender de su identidad (el padre lo pasa como arrow
  // inline, que cambia en cada render).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const reduceMotion = useReducedMotion();
  const [currentAct, setCurrentAct] = useState<Act>('reading');
  const [orbNodes, setOrbNodes] = useState(3);
  const [orbIntensity, setOrbIntensity] = useState(0.2);
  const [countdown, setCountdown] = useState('23:59:59');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weakAxis = Object.entries(analyzed.axes).reduce((min, [k, v]) => v < min.val ? { key: k, val: v } : min, { key: 'trans', val: 100 });
  const strongAxis = Object.entries(analyzed.axes).reduce((max, [k, v]) => v > max.val ? { key: k, val: v } : max, { key: 'exec', val: 0 });
  // Arquetipo determinista derivado de los ejes reales (helper puro, sin IA).
  // Es estable para un `analyzed` dado, así que se computa una vez por render.
  const archetype = deriveArchetype(analyzed.axes);

  // ── Countdown timer (desvanecimiento) ────────────────────────────────
  useEffect(() => {
    // Don't create/restart countdown if user already persisted
    if (isAuthenticated) { setCountdown(''); return; }

    const EXPIRE_KEY = 'omicron_gemelo_phantom_expire';
    let expire = localStorage.getItem(EXPIRE_KEY);
    if (!expire) {
      const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expire = expireDate.toISOString();
      localStorage.setItem(EXPIRE_KEY, expire);
    }
    timerRef.current = setInterval(() => {
      const remaining = new Date(expire!).getTime() - Date.now();
      if (remaining <= 0) { setCountdown('00:00:00'); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAuthenticated]);

  // ── Auto-progress through acts ───────────────────────────────────────
  useEffect(() => {
    if (currentAct === 'reading') {
      // Grow orb during reading
      const growInterval = setInterval(() => {
        setOrbNodes(n => Math.min(n + 1, 5 + analyzed.skills.length));
        setOrbIntensity(i => Math.min(i + 0.05, 0.9));
      }, 400);
      // Move to verdict after reading completes
      actTimerRef.current = setTimeout(() => {
        clearInterval(growInterval);
        setCurrentAct('verdict');
      }, 4500);
      return () => { clearInterval(growInterval); if (actTimerRef.current) clearTimeout(actTimerRef.current); };
    }
  }, [currentAct, analyzed.skills.length]);

  const advanceAct = useCallback(() => {
    const idx = ACTS.indexOf(currentAct);
    if (idx < ACTS.length - 1) setCurrentAct(ACTS[idx + 1]);
  }, [currentAct]);

  // ── TTS for verdict ──────────────────────────────────────────────────
  useEffect(() => {
    if (currentAct === 'verdict') {
      import('@/infrastructure/voice/engine').then(({ speak }) => {
        const weakName = AXIS_LABELS[weakAxis.key]?.name || 'Trascendencia';
        speak(`${analyzed.name || 'Tu perfil'}. ${analyzed.seniorLabel}. Tu ${AXIS_LABELS[strongAxis.key]?.name || 'Ejecución'} es fuerte. Pero tu ${weakName} está en ${weakAxis.val}. Ómicrom puede ayudarte a subirla.`);
      }).catch(() => {});
    }
    // Cleanup: stop speaking when act changes or component unmounts
    return () => {
      import('@/infrastructure/voice/engine').then(({ stopSpeaking }) => { if (stopSpeaking) stopSpeaking(); }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAct]);

  // ── Auto-advance tras guardado exitoso (usuario autenticado) ─────────
  // Cerramos el overlay solo cuando el usuario llegó al acto final (CTA) y
  // el guardado ya terminó bien, dándole un breve "beat" de confirmación.
  // Así el usuario autenticado ve la secuencia completa de 4 actos: el
  // auto-persist en background (setTimeout 100ms del hook) marca
  // persisted=true muy temprano, pero NO cierra el reveal hasta el CTA.
  // Cubre ambos casos: si al llegar al CTA el guardado ya estaba hecho,
  // cierra a ~900ms; si aún no, el tap del CTA dispara el persist y el
  // posterior persisted=true cierra el overlay.
  // Nota: `persisted` solo se pone en true (nunca se resetea en el hook),
  // por lo que este efecto asume una única secuencia de reveal por montaje.
  // IMPORTANTE: llamamos a `onCloseRef.current` (no a `onClose` directo) y
  // excluimos `onClose` de las deps. Así los re-renders del padre durante los
  // 900ms (toasts, refreshProfile, canal realtime) NO recrean el efecto ni
  // reinician el timer; de lo contrario el overlay se quedaba pegado en
  // "✓ Guardado" porque el timeout nunca llegaba a dispararse.
  useEffect(() => {
    if (isAuthenticated && persisted && currentAct === 'cta') {
      const t = setTimeout(() => { onCloseRef.current?.(); }, 900);
      return () => clearTimeout(t);
    }
  // Sin eslint-disable: las dependencias YA están completas. `onCloseRef` es
  // una ref (no necesita ser dependencia), así que la directiva quedaba sin
  // usar y ESLint la reportaba como el único warning del proyecto.
  }, [isAuthenticated, persisted, currentAct]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  const orbDocked = currentAct !== 'reading';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {/* Orb — grande y centrado arriba mientras lee (acto 'reading');
          al avanzar se achica, rota (sensación de carga) y vuela a la
          esquina superior derecha, donde queda pequeño el resto de actos. */}
      <motion.div
        style={{ position: 'absolute', zIndex: 1 }}
        animate={
          orbDocked
            ? { top: 'calc(env(safe-area-inset-top, 12px) + 8px)', left: 'auto', right: 16, x: '0%', scale: 0.62, rotate: reduceMotion ? 0 : 360, opacity: currentAct === 'cta' ? 0.4 : 1 }
            : { top: '8%', left: '50%', right: 'auto', x: '-50%', scale: 1, rotate: 0, opacity: 1 }
        }
        transition={
          reduceMotion
            ? { duration: 0.2 }
            : { duration: 0.8, ease: [0.32, 0.72, 0, 1] }
        }
      >
        <GeodesicOrb size={currentAct === 'reading' ? 104 : 76} nodes={orbNodes} color={uc} spinning={15} intensity={orbIntensity} breathing />
      </motion.div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: currentAct === 'reading' ? 'flex-end' : 'flex-start', paddingTop: currentAct === 'reading' ? '32%' : '16px', overflow: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* ── ACT 1: LA ORBE TE LEE ────────────────────────────────── */}
          {currentAct === 'reading' && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1 }}>
              <TerminalLine text="Detectando identidad..." delay={200} color={C.mut} reduceMotion={!!reduceMotion} />
              <TerminalLine text={analyzed.name || analyzed.seniorLabel || 'Profesional detectado'} delay={800} color={C.ink} reduceMotion={!!reduceMotion} />
              <TerminalLine text={analyzed.seniorLabel} delay={1400} color={uc} reduceMotion={!!reduceMotion} />
              <TerminalLine text={`${analyzed.years > 0 ? analyzed.years + ' años' : 'Experiencia'} en entornos productivos`} delay={2000} color={C.ink} reduceMotion={!!reduceMotion} />
              {/* El Gemelo nace de tu CV: cada competencia REAL (analyzed.labels)
                  aparece una a una, en ritmo, como "Detectado: {competencia}".
                  Se apoya en el auto-timer propio de TerminalLine (sin timers
                  nuevos en el padre) y aterriza toda antes de la línea
                  'calibrado' (3600ms) y muy antes del auto-avance (4500ms):
                  base 2200 + i*280 → última en 3320ms para N=5. Si no hay
                  labels reales, cae con gracia a 'Analizando competencias…'
                  (nunca se inventan competencias). */}
              {analyzed.labels.length > 0
                ? analyzed.labels.slice(0, 5).map((label, i) => (
                    <TerminalLine key={i} text={`Detectado: ${label}`} delay={2200 + i * 280} color={C.gold} reduceMotion={!!reduceMotion} />
                  ))
                : <TerminalLine text="Analizando competencias…" delay={2600} color={C.gold} reduceMotion={!!reduceMotion} />}
              <TerminalLine text={`Gemelo Digital calibrado. ${analyzed.labels.length} competencias detectadas.`} delay={3600} color={C.green} reduceMotion={!!reduceMotion} />
            </motion.div>
          )}

          {/* ── ACT 2: EL VEREDICTO ──────────────────────────────────── */}
          {currentAct === 'verdict' && (
            <motion.div key="verdict" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
              {/* Profile summary — nombre, carrera, experiencia */}
              <div style={{ padding: 16, borderRadius: RADIUS.xl, background: C.glass, border: `1px solid ${uc}33`, marginBottom: 16 }}>
                {analyzed.name && (
                  <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.lg, color: C.ink, marginBottom: 4 }}>
                    {analyzed.name}
                  </div>
                )}
                <div style={{ fontFamily: FONT.body, fontSize: SIZE.md, color: uc, fontWeight: 700, marginBottom: 8 }}>
                  {analyzed.seniorLabel}
                </div>
                {analyzed.years > 0 && (
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut, marginBottom: 8 }}>
                    {analyzed.years} {analyzed.years === 1 ? 'año' : 'años'} de experiencia profesional
                  </div>
                )}
                {analyzed.labels.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {analyzed.labels.slice(0, 6).map((skill, i) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: RADIUS.pill, background: `${uc}14`, border: `1px solid ${uc}33`, fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {analyzed.summary && (
                  <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>
                    {analyzed.summary.split('\n')[0]}
                  </p>
                )}
              </div>

              {/* Arquetipo — identidad-titular derivada de los ejes reales.
                  Entrada suave y respetuosa de prefers-reduced-motion: con
                  reduceMotion no hay desplazamiento ni tween (aparece al
                  instante), igual que AxisValue. */}
              <motion.div
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: BEAT_EASE }}
                style={{ textAlign: 'center', marginBottom: 18 }}
              >
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4, color: C.mut, textTransform: 'uppercase', marginBottom: 4 }}>Tu arquetipo</div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color: uc, marginBottom: 4 }}>{archetype.name}</div>
                <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, lineHeight: 1.5, margin: 0 }}>{archetype.line}</p>
              </motion.div>

              {/* 4 Axes visual — con descripción */}
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.5, color: C.mut, textTransform: 'uppercase', marginBottom: 8 }}>Tus 4 ejes del Gemelo Digital</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {Object.entries(analyzed.axes).map(([key, val], i) => {
                  const info = AXIS_LABELS[key];
                  const isWeak = key === weakAxis.key;
                  const Icon = info?.icon || Zap;
                  const descriptions: Record<string, string> = {
                    exec: 'Capacidad de entregar resultados',
                    qual: 'Rigor y estándares profesionales',
                    trans: 'Impacto, liderazgo y mentoría',
                    fund: 'Base formal y certificaciones',
                  };
                  return (
                    <div key={key} style={{ padding: 12, borderRadius: RADIUS.lg, background: isWeak ? `${C.red}12` : C.glass, border: `1px solid ${isWeak ? C.red + '44' : C.line}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Icon size={12} color={info?.color || C.cyan} />
                        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textTransform: 'uppercase', letterSpacing: 1 }}>{info?.name || key}</span>
                      </div>
                      <AxisValue to={val} color={isWeak ? C.red : info?.color || C.cyan} delayMs={i * 70} />
                      <span style={{ fontFamily: FONT.body, fontSize: SIZE.xxs, color: C.mut, lineHeight: 1.3 }}>{descriptions[key] || ''}</span>
                      {isWeak && <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.red, marginTop: 4 }}>← tu punto ciego</div>}
                    </div>
                  );
                })}
              </div>

              {/* Verdict message */}
              <div style={{ padding: 16, borderRadius: RADIUS.xl, background: C.glass, border: `1px solid ${C.line}`, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={14} color={uc} />
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4, color: uc, textTransform: 'uppercase' }}>Ómicrom dice</span>
                  </div>
                  {/* Sello vivo: se estampa una sola vez al aterrizar el veredicto */}
                  <VerdictSeal uc={uc} reduceMotion={!!reduceMotion} />
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.6, margin: 0 }}>
                  Tu <strong style={{ color: AXIS_LABELS[strongAxis.key]?.color }}>{AXIS_LABELS[strongAxis.key]?.name}</strong> es sólida — {strongAxis.val}/100.
                  Pero tu <strong style={{ color: C.red }}>{AXIS_LABELS[weakAxis.key]?.name}</strong> está en {weakAxis.val}.
                  Si la subes a 60, tu reputación sube de nivel.
                </p>
              </div>

              <button onClick={advanceAct} style={{ width: '100%', padding: '14px 20px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Ver mi mapa de posibilidades <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── ACT 3: MAPA DE POSIBILIDADES ─────────────────────────── */}
          {currentAct === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
              {(() => {
                const repToday = Math.round(0.2 * 20 + 0.8 * ((analyzed.axes.exec + analyzed.axes.qual + analyzed.axes.trans + analyzed.axes.fund) / 4));
                const repFuture = Math.min(95, Math.round(0.2 * 40 + 0.8 * ((analyzed.axes.exec + analyzed.axes.qual + Math.min(analyzed.axes.trans + 15, 80) + analyzed.axes.fund) / 4)));
                const levelToday = analyzed.arch === 'senior' || analyzed.arch === 'lead' ? 'Senior' : 'Intermedio';
                const levelFuture = analyzed.arch === 'senior' || analyzed.arch === 'lead' ? 'Líder de equipo' : 'Senior';
                const weakName = AXIS_LABELS[weakAxis.key]?.name || 'tu eje débil';
                return (
                  <>
                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.lg, color: C.ink, marginBottom: 4 }}>Dónde estás y dónde puedes llegar</div>
                      <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut }}>Tu reputación se mide de 0 a 100. Mide qué tan verificable es tu experiencia.</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {/* HOY */}
                      <div style={{ padding: 14, borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${C.line}` }}>
                        <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Ahora mismo</div>
                        <RepValue to={repToday} color={C.gold} delayMs={0} />
                        <div style={{ fontFamily: FONT.body, fontSize: SIZE.xxs, color: C.mut, marginBottom: 10 }}>Tu reputación actual</div>
                        <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.ink, lineHeight: 1.4 }}>
                          Nivel: <strong>{levelToday}</strong> — según lo que tu CV afirma
                        </div>
                      </div>

                      {/* EN 2 SEMANAS */}
                      <div style={{ padding: 14, borderRadius: RADIUS.lg, background: `${C.green}0a`, border: `1px solid ${C.green}33` }}>
                        <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.green, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>En 2 semanas</div>
                        <RepValue to={repFuture} color={C.green} delayMs={120} />
                        <div style={{ fontFamily: FONT.body, fontSize: SIZE.xxs, color: C.mut, marginBottom: 10 }}>Si completas los 3 pasos</div>
                        <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.green, lineHeight: 1.4 }}>
                          Nivel: <strong>{levelFuture}</strong> — con pruebas que lo respaldan
                        </div>
                      </div>
                    </div>

                    {/* Luz viajera: anima el salto de reputación hoy → futuro
                        una sola vez, sin tocar cifras ni fórmulas. */}
                    <RepTravelBar repToday={repToday} repFuture={repFuture} uc={uc} reduceMotion={!!reduceMotion} />

                    {/* 3 PASOS CONCRETOS */}
                    <div style={{ padding: 16, borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${uc}33`, marginBottom: 16 }}>
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, color: C.ink, marginBottom: 4 }}>Los 3 pasos para llegar ahí</div>
                      <div style={{ fontFamily: FONT.body, fontSize: SIZE.xxs, color: C.mut, marginBottom: 14 }}>Cada paso suma puntos a tu reputación. Puedes hacerlos en cualquier orden.</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Paso 1 */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${uc}22`, border: `1px solid ${uc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xs, color: uc }}>1</div>
                          <div>
                            <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, marginBottom: 2 }}>
                              Toma un curso corto de {weakName.toLowerCase()}
                            </div>
                            <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut, lineHeight: 1.5 }}>
                              Tu {weakName} está en {weakAxis.val}/100 — es tu punto más bajo. En la Academia hay cursos de 2-3 horas que te suman 15 puntos.
                            </div>
                          </div>
                        </div>

                        {/* Paso 2 */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${uc}22`, border: `1px solid ${uc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xs, color: uc }}>2</div>
                          <div>
                            <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, marginBottom: 2 }}>
                              Pide que un colega confirme tu experiencia
                            </div>
                            <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut, lineHeight: 1.5 }}>
                              Invita a alguien que trabajó contigo. Cuando confirma que es cierto lo que declaras, tu perfil pasa de "declarado" a "verificado".
                            </div>
                          </div>
                        </div>

                        {/* Paso 3 */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${uc}22`, border: `1px solid ${uc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xs, color: uc }}>3</div>
                          <div>
                            <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, marginBottom: 2 }}>
                              Resuelve un caso práctico de tu área
                            </div>
                            <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut, lineHeight: 1.5 }}>
                              Un ejercicio real de 15 minutos. Demuestra que sabes hacer lo que dice tu CV, no solo que lo escribiste.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button onClick={advanceAct} style={{ width: '100%', padding: '14px 20px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      Siguiente: guardar mi Gemelo <ChevronRight size={16} />
                    </button>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ── ACT 4: MOMENTO DE VERDAD ─────────────────────────────── */}
          {currentAct === 'cta' && (
            <motion.div key="cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2, color: C.mut, textTransform: 'uppercase', marginBottom: 8 }}>Tu Gemelo Digital está vivo</div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.hero, color: C.ink, marginBottom: 4 }}>{analyzed.seniorLabel}</div>
                {isAuthenticated ? (
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Tu Gemelo Digital queda guardado en tu perfil.</div>
                ) : (
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Pero si cierras esta ventana, se pierde. No queda guardado en ningún lado.</div>
                )}
              </div>

              {/* Without vs With account — solo para guests */}
              {!isAuthenticated && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <div style={{ padding: 12, borderRadius: RADIUS.lg, background: `${C.red}08`, border: `1px solid ${C.red}22` }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.red, textTransform: 'uppercase', marginBottom: 8 }}>Sin cuenta</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut }}>
                      <span>× Desaparece al cerrar</span>
                      <span>× Tus pruebas no quedan registradas</span>
                      <span>× No recibes sugerencias de mejora</span>
                      <span>× Tu reputación no empieza a construirse</span>
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: RADIUS.lg, background: `${C.green}08`, border: `1px solid ${C.green}33` }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.green, textTransform: 'uppercase', marginBottom: 8 }}>Con cuenta</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT.body, fontSize: SIZE.xs, color: C.ink }}>
                      <span>✓ Tu perfil queda guardado para siempre</span>
                      <span>✓ Cada prueba que aprobás sube tu reputación (0-100)</span>
                      <span>✓ Tu Red Viva muestra qué tenés probado y qué no</span>
                      <span>✓ Recibes pasos concretos para mejorar cada semana</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <motion.button
                onClick={onActivate}
                whileTap={isAuthenticated && (persisting || persisted) ? undefined : { scale: 0.97 }}
                disabled={isAuthenticated && (persisting || persisted)}
                style={{ width: '100%', padding: '16px 24px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.lg, cursor: isAuthenticated && (persisting || persisted) ? 'default' : 'pointer', opacity: isAuthenticated && (persisting || persisted) ? 0.7 : 1, boxShadow: `0 4px 24px ${uc}44`, marginBottom: 12 }}
              >
                {isAuthenticated
                  ? (persisted ? '✓ Guardado' : persisting ? 'Guardando…' : '🧬 Guardar mi Gemelo Digital')
                  : '🧬 Activar mi Gemelo Digital'}
              </motion.button>
              <p style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, margin: '0 0 16px' }}>
                {isAuthenticated ? 'Se guarda en tu perfil permanentemente' : '30 segundos — sin tarjeta de crédito'}
              </p>

              {/* Countdown — solo para guests */}
              {!isAuthenticated && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: RADIUS.pill, background: `${C.red}0a`, border: `1px solid ${C.red}22` }}>
                  <Clock size={12} color={C.red} />
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.red }}>Si cierras sin registrarte, estos datos se pierden en {countdown} — no los podemos recuperar</span>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
