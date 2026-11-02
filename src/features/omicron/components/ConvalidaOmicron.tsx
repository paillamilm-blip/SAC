// components/omicron/ConvalidaOmicron.tsx
// ═══════════════════════════════════════════════════════════════════════
// OMICRON - Activación del Gemelo Digital — Experience-First.
//
// FLUJO NUEVO:
//   1. Upload (cualquier usuario) → sube CV o pega texto
//   2. Syncing (análisis IA o local, sin auth)
//   3. GemeloReveal (experiencia WOW de 4 actos — sin auth)
//      → Al final el usuario elige "Activar" → persiste (pide auth si falta)
//
// Ya no existe la fase "dossier" vieja. GemeloReveal la reemplaza completamente.
// ═══════════════════════════════════════════════════════════════════════
import { useState, type DragEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, Upload, ArrowRight, TrendingUp, Zap, RotateCcw } from 'lucide-react';
import { useGemeloActivation, fraccionEscaneo, HITOS_ESCANEO } from '@/hooks/useGemeloActivation';
import { PISO_CV } from '@/features/gemelo/services/cvExtract';
import { GemeloReveal } from './GemeloReveal';
import { EscaneoDocumento } from './EscaneoDocumento';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { BLUR, C, FONT, RADIUS, SIZE, ELEVATED, ANIM, LETRA} from '@/theme';
import { getUserColor } from '@/shared/services/userColor';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';

// ── Ease-out tuple para el escaneo (mutable, NO `as const`) ──────────────
// Mismo valor que BEAT_EASE en GemeloReveal.tsx para mantener el lenguaje.
const SCAN_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function ConvalidaOmicron({ onClose }: { onClose: () => void }) {
  const uc = getUserColor();
  const reduceMotion = useReducedMotion();

  const {
    phase, dossier,
    cvText, setCvText, cvFileName, cvReadOk, msg, pushes, lastError,
    hitos, segundos,
    hasExistingCV, profile,
    persisting, persisted,
    onCVFile, activateGemeloCompleto, cancelActivation, persistAnalysis,
  } = useGemeloActivation();

  const [retryCount, setRetryCount] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(false);
  // La zona punteada se ve como dropzone desde que existe, pero NO lo era: no
  // había un solo onDrop en toda la app y soltar el archivo no hacía nada. `sobre`
  // es el estado que faltaba para que el señuelo se vuelva un gesto real.
  const [sobre, setSobre] = useState(false);

  // Note: No auto-close. User closes manually via the reveal's flow or
  // navigating away. The persist happens automatically in the background.

  // Detect error state
  const isError = phase === 'upload' && lastError !== null;

  // Retry with cooldown
  const handleRetry = () => {
    if (retryCooldown) return;
    setRetryCount((c) => c + 1);
    const delay = Math.min(8000, 2000 * Math.pow(2, retryCount));
    setRetryCooldown(true);
    setTimeout(() => setRetryCooldown(false), delay);
    void activateGemeloCompleto();
  };

  // ══════════════════════════════════════════════════════════════════════
  // PHASE: REVEAL — GemeloReveal (4 actos WOW)
  // ══════════════════════════════════════════════════════════════════════
  if (phase === 'reveal' && dossier) {
    return (
      <ErrorBoundary section="GemeloReveal">
        <GemeloReveal
          analyzed={dossier}
          isAuthenticated={!!profile?.id}
          onActivate={() => void persistAnalysis()}
          persisting={persisting}
          persisted={persisted}
          onClose={onClose}
        />
      </ErrorBoundary>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE: SYNCING — La orbe crece mientras analiza
  // ══════════════════════════════════════════════════════════════════════
  if (phase === 'syncing') {
    // El orbe crece con los hitos REALMENTE hechos: es la misma fracción que
    // ilumina los renglones, así que no hay dos verdades en la pantalla.
    const avance = fraccionEscaneo(hitos);
    const hechos = hitos.filter((h) => h.estado === 'hecho').length;
    const orbNodes = 5 + Math.round(avance * 12);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GeodesicOrb size={40} nodes={orbNodes} color={uc} spinning={18} intensity={0.75} breathing />
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.anunciada, textTransform: 'uppercase', color: uc }}>ANALIZANDO TU CV</span>
          </div>
          <button
            onClick={cancelActivation}
            aria-label="Cancelar análisis"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: RADIUS.pill,
              background: `${C.red}14`, border: `1px solid ${C.red}44`,
              color: C.red, fontFamily: FONT.mono, fontSize: SIZE.xxs,
              cursor: 'pointer', minHeight: 44,
            }}
          >
            <X size={14} />
            Cancelar
          </button>
        </div>

        {/* Lectura en curso: la silueta del documento bajo el haz y los hitos que
            ya ocurrieron. El contador de segundos es lo único que se mueve durante
            la espera larga, y es medición, no consuelo. */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative', zIndex: 2, padding: '0 20px', overflowY: 'auto' }}>
          <h2 id="escaneo-titulo" tabIndex={-1} style={{ margin: 0, fontFamily: FONT.body, fontSize: SIZE.xl, fontWeight: 700, letterSpacing: LETRA.titulo, color: C.ink, textAlign: 'center' }}>
            Leyendo {cvFileName || 'tu documento'}
          </h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={msg}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: SCAN_EASE }}
              style={{ textAlign: 'center', margin: 0, minHeight: 22, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, lineHeight: 1.5 }}
            >
              {msg}
            </motion.p>
          </AnimatePresence>

          <EscaneoDocumento texto={cvText} hitos={hitos} />

          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.ancha, textTransform: 'uppercase', color: C.mut }}>
            {hechos} de {HITOS_ESCANEO.length} hitos · {segundos} s
          </span>
        </div>

        {/* Push notifications */}
        <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', top: 80, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {pushes.map((p) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: 40, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: RADIUS.pill, background: `${p.color}18`, border: `1px solid ${p.color}44`, backdropFilter: `blur(${BLUR.vaho}px)` }}>
                <TrendingUp size={12} color={p.color} />
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: p.color, fontWeight: 700 }}>+{p.delta}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>{p.label}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE: UPLOAD — Subir CV o pegar texto
  // ══════════════════════════════════════════════════════════════════════
  // El MISMO piso que exige el hook: el botón no se enciende con 8 caracteres. Y
  // si está apagado por eso, lo dice — un CTA muerto sin motivo es la otra cara
  // del mismo silencio que había en el recorte del archivo.
  const caracteres = cvText.trim().length;
  const canActivate = caracteres >= PISO_CV;

  // Coreografía de entrada escalonada (transform/opacity). Con reduceMotion
  // cada elemento renderiza su estado final al instante (initial === animate).
  const enter = (order: number) =>
    reduceMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.28, ease: SCAN_EASE, delay: order * 0.06 },
        };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <motion.div {...enter(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GeodesicOrb size={40} nodes={5} color={uc} spinning={25} intensity={0.6} breathing />
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.anunciada, textTransform: 'uppercase', color: C.ink }}>ACTIVAR GEMELO</span>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 44, height: 44, borderRadius: RADIUS.md, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </motion.div>

      {/* Message */}
      <motion.p {...enter(1)} style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '4px 20px 12px', fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.5, color: isError ? C.red : C.ink, minHeight: 40 }}>{msg}</motion.p>

      {/* Error retry button */}
      {isError && lastError !== 'credits' && (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <motion.button
            onClick={handleRetry}
            disabled={retryCooldown}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: RADIUS.lg, border: `1px solid ${retryCooldown ? C.mut : C.red}44`, background: `${retryCooldown ? C.mut : C.red}14`, color: retryCooldown ? C.mut : C.red, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, cursor: retryCooldown ? 'default' : 'pointer', minHeight: 44, opacity: retryCooldown ? 0.6 : 1 }}>
            <RotateCcw size={16} style={retryCooldown ? { animation: ANIM.spin } : undefined} />
            {retryCooldown ? 'Esperando…' : retryCount > 0 ? `Reintentar (${retryCount + 1}º intento)` : 'Reintentar'}
          </motion.button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 20px' }}>
        {hasExistingCV && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: RADIUS.md, background: C.greenFaint, border: `1px solid ${C.greenDim}`, marginBottom: 12 }}>
            <Check size={14} color={C.green} />
            <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.green }}>CV anterior detectado — sube uno nuevo para actualizar</span>
          </div>
        )}

        {/* Upload area — dropzone REAL: se arrastra y se suelta (onDrop), además
            del clic. `preventDefault` en dragover es obligatorio: sin él el
            navegador NAVEGA al archivo y la app se cierra en blanco. */}
        <motion.label
          {...enter(2)}
          whileHover={reduceMotion ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          onDragOver={(e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); if (!sobre) setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e: DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setSobre(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void onCVFile(f);
          }}
          data-sobre={sobre ? 'si' : 'no'}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', borderRadius: RADIUS.xl, border: `${sobre ? 2 : 1.5}px ${sobre ? 'solid' : 'dashed'} ${cvReadOk ? `${uc}aa` : `${uc}55`}`, background: sobre ? `${uc}14` : C.glass, cursor: 'pointer', marginBottom: 16, textAlign: 'center', backdropFilter: `blur(${BLUR.cristal}px)`, boxShadow: cvReadOk ? `0 0 0 1px ${uc}33, ${ELEVATED.cta(`${uc}22`)}` : 'none' }}
        >
          <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCVFile(f); e.currentTarget.value = ''; }} />
          {/* Beat de confirmación one-shot: sólo con lectura REAL exitosa (msg ✓).
              key={cvFileName} → se reproduce una vez por documento y descansa. */}
          {cvReadOk ? (
            <motion.span
              key={cvFileName}
              initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: SCAN_EASE }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: RADIUS.pill, background: `${uc}22`, border: `1px solid ${uc}66` }}
            >
              <Check size={16} color={uc} />
            </motion.span>
          ) : (
            <Upload size={24} color={uc} />
          )}
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, color: C.ink }}>{cvFileName || 'Subir CV (PDF · Word · TXT)'}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Arrastra el archivo aquí, o toca para elegirlo</span>
        </motion.label>

        {/* Divider */}
        <motion.div {...enter(3)} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>o pega tu experiencia</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </motion.div>

        {/* Textarea */}
        <motion.textarea
          {...enter(4)}
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Rol actual, años de experiencia, tecnologías, certificaciones, empresas donde trabajaste…"
          style={{ width: '100%', minHeight: 120, borderRadius: RADIUS.md, border: `1px solid ${uc}4d`, background: C.surface, color: C.ink, fontFamily: FONT.body, fontSize: SIZE.sm, padding: 16, outline: 'none', resize: 'vertical' }}
        />
      </div>

      {/* CTA Button */}
      <motion.div {...enter(5)} style={{ padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', zIndex: 2 }}>
        <motion.button
          onClick={() => void activateGemeloCompleto()}
          disabled={!canActivate}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '16px 0', borderRadius: RADIUS.lg, border: 'none', cursor: canActivate ? 'pointer' : 'default', opacity: canActivate ? 1 : 0.5, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canActivate ? ELEVATED.lejana('md', `${uc}44`) : 'none', minHeight: 52 }}
        >
          <Zap size={18} /> Activar Gemelo Completo <ArrowRight size={17} />
        </motion.button>
        <p style={{ textAlign: 'center', margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: canActivate || caracteres === 0 ? C.mut : C.gold }}>
          {canActivate || caracteres === 0
            ? 'Analiza tu CV y convalida título y años — todo automático'
            : `Con ${caracteres} caracteres no alcanzo a ver un rol: escribe al menos ${PISO_CV}, o sube el CV.`}
        </p>
      </motion.div>
    </div>
  );
}
