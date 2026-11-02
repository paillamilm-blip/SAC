// components/omicron/ProactiveMessage.tsx
// ═══════════════════════════════════════════════════════════════════════
// PROACTIVE MESSAGE — Burbuja del Oráculo CON botones de acción.
// Reemplaza el texto plano anterior. Cada mensaje tiene CTA.
// "Un mensaje sin botón es publicidad que se ignora."
//
// RESPUESTA VIVA (Inc 1):
//  • Los acentos usan el COLOR DEL USUARIO (userColor), no el gris/dorado
//    de marca. Las variantes translúcidas se derivan del color en runtime
//    (se le añade alfa, p.ej. `${userColor}22`) — sin nuevos hex fijos.
//  • Cuando `thinking` es true, la burbuja "respira" con una elipsis
//    animada ("Ómicrom está pensando…"). Bajo prefers-reduced-motion se
//    queda estática (estado final, sin animación ni loop).
//
// RESPUESTA VIVA (Inc 2):
//  • Cuando `stream` es true, el mensaje se revela PALABRA POR PALABRA con un
//    intervalo (typewriter del lado del cliente, ya que proxy-ai no hace SSE).
//    El troceo vive en el helper puro wordPrefixes() (unit-testeado). El
//    intervalo se limpia al desmontar o al cambiar el mensaje.
//  • Bajo prefers-reduced-motion la revelación se "asienta" al texto completo
//    al instante (sin loop, sin animación).
//  • El auto-cierre de 10s arranca SOLO cuando la revelación termina, para que
//    el usuario alcance a leer (decisión aprobada por el fundador).
//
// EL ORBE LATE AL RITMO DE LA RESPUESTA:
//  • Este componente ya es dueño de la fase "pensando…" y de la revelación
//    palabra por palabra, así que es el emisor natural del "latido" del orbe.
//  • Emitimos un nivel 0..1 (calculado por el helper PURO orbPulse.ts) al canal
//    EXISTENTE 'oracle:voice' que OrbShell ya escucha (→ setVoiceLevel →
//    OrbNeuronal lee voiceLevel). Así el orbe pulsa SIN tocar el archivo 3D.
//  • Todo aditivo y gateado por reduced-motion EN EL EMISOR: bajo
//    prefers-reduced-motion NO se emite nada nuevo. Los timers se limpian al
//    desmontar y al cambiar el mensaje; al terminar la fase se emite un 0 calmo
//    para devolver el control al pipeline de voz/idle (sin loops perpetuos).
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BLUR, HALO, ANIM, C, FONT, SHADOW, LETRA} from '@/theme';
import { Icon, type IconRole } from '@/shared/components/icons';
import { wordPrefixes } from '../utils/typewriter';
import { thinkingPulseLevel, revealPulseLevel } from '../utils/orbPulse';

// Ritmo del typewriter: ~45ms por palabra da una sensación viva sin marear.
const REVEAL_STEP_MS = 45;
// Cadencia del pulso calmo de "pensando…": ligero, ~120ms basta para un latido
// sereno sin sobrecargar el canal de eventos.
const THINKING_PULSE_MS = 120;

// Emite un nivel de "latido" al canal EXISTENTE 'oracle:voice' (el mismo que
// alimenta voiceLevel en OrbShell/OrbNeuronal). No renombra el evento ni añade
// track()/EventName. Seguro en SSR: no hace nada si no hay window.
function emitOrbPulse(level: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('oracle:voice', { detail: { level } }));
}

export interface ProactiveAction {
  label: string;
  /** Rol dibujado por shared/components/icons.tsx; nunca un carácter. */
  icon?: IconRole;
  primary?: boolean;
  onClick: () => void;
}

interface Props {
  message: string;
  actions?: ProactiveAction[];
  /** Color del usuario para los acentos (tag, botón primario, borde, glow). */
  userColor: string;
  /** Mientras Ómicrom consulta la IA: muestra la elipsis viva. */
  thinking?: boolean;
  /** Revela el mensaje palabra por palabra (respuestas de IA). */
  stream?: boolean;
  onDismiss?: () => void;
}

export function ProactiveMessage({ message, actions, userColor, thinking, stream, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reduceMotion = useReducedMotion();

  // ── Typewriter (Inc 2) ──────────────────────────────────────────────
  // `shown` es el texto revelado hasta ahora. Sin stream (o con
  // reduced-motion) es el mensaje completo desde el primer render.
  const revealActive = !!stream && !reduceMotion && !!message;
  const [shown, setShown] = useState<string>(revealActive ? '' : message);
  const revealDone = shown === message;

  // Aparición + auto-cierre. El auto-cierre de 10s arranca SOLO cuando la
  // revelación terminó (revealDone), para que el usuario alcance a leer.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setVisible(true), 200);
    let autoDismiss: ReturnType<typeof setTimeout> | undefined;
    if (revealDone) {
      autoDismiss = setTimeout(() => {
        setDismissed(true);
        onDismiss?.();
      }, 10000);
    }
    return () => { clearTimeout(t); if (autoDismiss) clearTimeout(autoDismiss); };
  }, [message, revealDone, onDismiss]);

  // Revelación palabra por palabra. Se reinicia al cambiar el mensaje y limpia
  // su intervalo al desmontar. Bajo reduced-motion o sin stream se asienta al
  // texto completo al instante (sin loop).
  useEffect(() => {
    if (!revealActive) {
      setShown(message);
      return;
    }
    const prefixes = wordPrefixes(message);
    if (prefixes.length === 0) {
      setShown(message);
      return;
    }
    let i = 0;
    setShown(prefixes[0]);
    // Latido: cada palabra revelada emite un tick que decae (revealPulseLevel)
    // por el canal 'oracle:voice'. revealActive ya exige !reduceMotion, así que
    // bajo reduced-motion este bloque no corre y no se emite nada.
    emitOrbPulse(revealPulseLevel(0, prefixes.length));
    const id = setInterval(() => {
      i += 1;
      if (i >= prefixes.length) {
        setShown(message);
        clearInterval(id);
        // Fin de la revelación: 0 calmo para devolver el control al pipeline.
        emitOrbPulse(0);
        return;
      }
      setShown(prefixes[i]);
      emitOrbPulse(revealPulseLevel(i, prefixes.length));
    }, REVEAL_STEP_MS);
    return () => {
      clearInterval(id);
      // Al desmontar o cambiar el mensaje, no dejamos el orbe "colgado".
      emitOrbPulse(0);
    };
  }, [message, revealActive]);

  // ── Latido de "pensando…" ───────────────────────────────────────────
  // Mientras `thinking` es true (y sin reduced-motion), un emisor ligero
  // alimenta un pulso calmo de búsqueda (thinkingPulseLevel) al canal
  // 'oracle:voice'. Se limpia al desmontar, al cambiar el mensaje y cuando
  // thinking pasa a false, emitiendo un 0 calmo para que el pulso de voz/idle
  // (o la revelación) tome el relevo sin pelea.
  useEffect(() => {
    if (!thinking || reduceMotion) return;
    const start = Date.now();
    emitOrbPulse(thinkingPulseLevel(0));
    const id = setInterval(() => {
      emitOrbPulse(thinkingPulseLevel(Date.now() - start));
    }, THINKING_PULSE_MS);
    return () => {
      clearInterval(id);
      emitOrbPulse(0);
    };
  }, [thinking, reduceMotion, message]);

  if (!message || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  // Acentos derivados del color del usuario en runtime (alfa en hex).
  const accent = {
    tag: userColor,
    border: `${userColor}44`,
    glow: `${userColor}14`,
    btnBg: `linear-gradient(135deg, ${userColor}, ${userColor}cc)`,
    btnShadow: `0 0 ${HALO.foco}px ${userColor}40`,
  };

  return (
    <div style={{
      ...S.container,
      border: `1px solid ${accent.border}`,
      boxShadow: `${SHADOW.lg}, 0 0 ${HALO.resplandor}px ${accent.glow}`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
    }}>
      {/* Header */}
      <div style={S.header}>
        <span style={{ ...S.tag, color: accent.tag }}>ÓMICROM</span>
        <button onClick={handleDismiss} aria-label="Cerrar el mensaje" style={S.closeBtn}>
          <Icon role="cerrar" size={15} />
        </button>
      </div>

      {/* Message */}
      <p style={S.message}>
        {shown}
        {/* La elipsis "pensando" late con el pulso de la familia. Bajo
            prefers-reduced-motion queda estática: no hay loop que la apague. */}
        {thinking && (
          <span
            aria-hidden="true"
            style={{
              marginLeft: 2,
              display: 'inline-block',
              animation: reduceMotion ? undefined : ANIM.pulse,
            }}
          >
            …
          </span>
        )}
      </p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div style={S.actions}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); handleDismiss(); }}
              style={action.primary
                ? { ...S.btnPrimary, background: accent.btnBg, boxShadow: accent.btnShadow }
                : S.btnGhost}
            >
              {action.icon && <Icon role={action.icon} size={14} color={action.primary ? C.onAccent : undefined} />}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Animación de la elipsis "pensando": ANIM.pulse, pedido al tema. */}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 110,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(88%, 340px)',
    padding: '16px',
    borderRadius: 16,
    background: C.surface,
    backdropFilter: `blur(${BLUR.cristal}px)`,
    WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
    transition: 'opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    // Por encima de la vista fullscreen (zIndex 20) y de las superficies de
    // preview (4/5), pero por debajo de la barra de input (zIndex 50), para
    // que la respuesta acompañe al usuario sin quedar tapada ni tapar la barra.
    zIndex: 30,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tag: {
    fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: LETRA.ancha,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: C.mut,
    cursor: 'pointer',
    fontSize: 13,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
  },
  message: {
    margin: 0,
    fontFamily: FONT.body,
    fontSize: 15,
    color: C.ink,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    minHeight: 44,
    borderRadius: 12,
    border: 'none',
    color: '#000',
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    minHeight: 44,
    borderRadius: 12,
    border: `1px solid ${C.line}`,
    background: 'transparent',
    color: C.ink,
    fontFamily: FONT.mono,
    fontSize: 11,
    cursor: 'pointer',
  },
};
