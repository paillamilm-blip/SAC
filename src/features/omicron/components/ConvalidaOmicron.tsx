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
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, Upload, ArrowRight, TrendingUp, Zap, RotateCcw } from 'lucide-react';
import { useGemeloActivation } from '@/hooks/useGemeloActivation';
import { GemeloReveal } from './GemeloReveal';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { C, FONT, RADIUS, SIZE } from '@/theme';
import { getUserColor } from '@/shared/components/ColorPicker';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';

// ── Ease-out tuple para el escaneo (mutable, NO `as const`) ──────────────
// Mismo valor que BEAT_EASE en GemeloReveal.tsx para mantener el lenguaje.
const SCAN_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Número de pasos reales del análisis (currentStep va 0 -> 1 -> 2).
// Eran 4 hasta la Fase 6C: el cuarto convalidaba "un aporte a la Bóveda",
// credencial de una función que ya no existe, y el contador nunca terminaba.
const SCAN_STEPS = 3;

export default function ConvalidaOmicron({ onClose }: { onClose: () => void }) {
  const uc = getUserColor();
  const reduceMotion = useReducedMotion();

  const {
    phase, currentStep, dossier,
    cvText, setCvText, cvFileName, msg, pushes, lastError,
    hasExistingCV, profile,
    persisting, persisted,
    onCVFile, activateGemeloCompleto, cancelActivation, persistAnalysis,
  } = useGemeloActivation();

  const [retryCount, setRetryCount] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(false);

  // Note: No auto-close. User closes manually via the reveal's flow or
  // navigating away. The persist happens automatically in the background.

  // Detect error state
  const isError = phase === 'upload' && lastError !== null;

  // Lectura exitosa REAL: el hook fija cvFileName Y msg que empieza con "✓".
  // Un archivo ilegible/corto TAMBIÉN fija cvFileName pero msg NO empieza con
  // "✓" (dice "No pude leer/extraer..."), así que exigimos ambas condiciones
  // para no mostrar un falso "documento leído".
  const cvReadOk = !!cvFileName && msg.startsWith('✓');

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
    const orbNodes = 5 + Math.round((currentStep / (SCAN_STEPS - 1)) * 12);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GeodesicOrb size={40} nodes={orbNodes} color={uc} spinning={18} intensity={0.75} breathing />
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: uc }}>ANALIZANDO TU CV</span>
          </div>
          <button
            onClick={cancelActivation}
            aria-label="Cancelar análisis"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: RADIUS.pill,
              background: `${C.red}14`, border: `1px solid ${C.red}44`,
              color: C.red, fontFamily: FONT.mono, fontSize: SIZE.xxs,
              cursor: 'pointer', minHeight: 36,
            }}
          >
            <X size={14} />
            Cancelar
          </button>
        </div>

        {/* Lectura en curso: mensaje real + riel de progreso por pasos reales */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, padding: '0 20px' }}>
          {/* Contador honesto de pasos (currentStep va 0..3) */}
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mut }}>
            Paso {Math.min(currentStep + 1, SCAN_STEPS)} de {SCAN_STEPS}
          </span>

          {/* Mensaje de progreso real (PROGRESS_MESSAGES), cross-fade al avanzar */}
          <AnimatePresence mode="wait">
            <motion.p
              key={msg}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: SCAN_EASE }}
              style={{ textAlign: 'center', margin: '12px 0 0', minHeight: 44, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.5 }}
            >
              {msg}
            </motion.p>
          </AnimatePresence>

          {/* Riel de escaneo: pasos 0..currentStep leídos (uc), resto pendientes (C.line) */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={SCAN_STEPS}
            aria-valuenow={Math.min(currentStep + 1, SCAN_STEPS)}
            aria-label="Progreso de lectura del CV"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, width: '100%', maxWidth: 260 }}
          >
            {Array.from({ length: SCAN_STEPS }, (_, i) => {
              const read = i <= currentStep;
              return (
                <motion.div
                  key={i}
                  style={{ flex: 1, height: 4, borderRadius: RADIUS.pill, background: C.line, transformOrigin: 'left center', overflow: 'hidden' }}
                >
                  <motion.div
                    initial={false}
                    animate={{ scaleX: read ? 1 : 0, opacity: read ? 1 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.38, ease: SCAN_EASE }}
                    style={{ width: '100%', height: '100%', borderRadius: RADIUS.pill, background: uc, transformOrigin: 'left center' }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Push notifications */}
        <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', top: 80, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {pushes.map((p) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: 40, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: RADIUS.pill, background: `${p.color}18`, border: `1px solid ${p.color}44`, backdropFilter: 'blur(8px)' }}>
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
  const canActivate = !!cvText.trim();

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
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>ACTIVAR GEMELO</span>
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
            <RotateCcw size={16} style={retryCooldown ? { animation: 'cp-spin 0.8s linear infinite' } : undefined} />
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

        {/* Upload area — dropzone con micro-interacciones (transform/opacity) */}
        <motion.label
          {...enter(2)}
          whileHover={reduceMotion ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', borderRadius: RADIUS.xl, border: `1.5px dashed ${cvReadOk ? `${uc}aa` : `${uc}55`}`, background: C.glass, cursor: 'pointer', marginBottom: 16, textAlign: 'center', backdropFilter: 'blur(14px)', boxShadow: cvReadOk ? `0 0 0 1px ${uc}33, 0 8px 28px ${uc}22` : 'none' }}
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
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Lee cualquier PDF o Word</span>
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
          placeholder="Rol actual, años de experiencia, tecnologías, certificaciones, empresas donde trabajaste..."
          style={{ width: '100%', minHeight: 120, borderRadius: RADIUS.md, border: `1px solid ${uc}4d`, background: C.surface, color: C.ink, fontFamily: FONT.body, fontSize: SIZE.sm, padding: 16, outline: 'none', resize: 'vertical' }}
        />
      </div>

      {/* CTA Button */}
      <motion.div {...enter(5)} style={{ padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', zIndex: 2 }}>
        <motion.button
          onClick={() => void activateGemeloCompleto()}
          disabled={!canActivate}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '16px 0', borderRadius: RADIUS.lg, border: 'none', cursor: canActivate ? 'pointer' : 'default', opacity: canActivate ? 1 : 0.5, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canActivate ? `0 8px 32px ${uc}44` : 'none', minHeight: 52 }}
        >
          <Zap size={18} /> Activar Gemelo Completo <ArrowRight size={17} />
        </motion.button>
        <p style={{ textAlign: 'center', margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>
          Analiza tu CV y convalida título y años — todo automático
        </p>
      </motion.div>
    </div>
  );
}
