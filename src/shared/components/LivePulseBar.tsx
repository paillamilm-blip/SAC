// shared/components/LivePulseBar.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Live Pulse Bar
//
// 2px bar at the very top of the app that shows Ómicrom is ALIVE.
// It's the system's heartbeat — always visible, never invasive.
//
// States:
//   calm    → slow breathing glow (default when nothing happens)
//   active  → cyan pulse (network activity, others online)
//   user    → gold flash (YOUR action registered)
//   alert   → red subtle pulse (dispute, warning)
//   success → green flash (achievement, level up)
//
// The bar transitions between states with smooth gradient morphing.
// Respects prefers-reduced-motion (static dim line instead).
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from 'react';
import { ANIM, C } from '@/theme';

export type PulseState = 'calm' | 'active' | 'user' | 'alert' | 'success';

interface Props {
  /** Current state — change this to trigger visual transitions */
  state?: PulseState;
  /** Auto-return to calm after ms (default 3000). Set 0 to stay. */
  returnDelay?: number;
}

const GRADIENTS: Record<PulseState, string> = {
  calm:    `linear-gradient(90deg, transparent, ${C.cyan}33, ${C.purple}22, transparent)`,
  active:  `linear-gradient(90deg, transparent, ${C.cyan}, ${C.purple}, ${C.cyan}, transparent)`,
  user:    `linear-gradient(90deg, transparent, ${C.gold}, ${C.cyan}, ${C.gold}, transparent)`,
  alert:   `linear-gradient(90deg, transparent, ${C.red}cc, ${C.gold}88, ${C.red}cc, transparent)`,
  success: `linear-gradient(90deg, transparent, ${C.green}, ${C.cyan}, ${C.green}, transparent)`,
};

// Los cinco estados son dos gestos de la familia (`omi-pulse` y `omi-shimmer`)
// a tempos distintos. Lo que cambia por estado es la amplitud del latido, y se
// pide como parámetro (`--omi-pulso-*`), no como un keyframe nuevo por escena.
const ANIMATIONS: Record<PulseState, string> = {
  calm:    `${ANIM.pulsoLento}, ${ANIM.flujoLento}`,
  active:  ANIM.flujo,
  user:    ANIM.flash,
  alert:   ANIM.pulsoAlerta,
  success: ANIM.flash,
};

const PULSO: Record<PulseState, Record<string, string>> = {
  calm:    { '--omi-pulso-alto': '0.6', '--omi-pulso-bajo': '0.3' },
  alert:   { '--omi-pulso-alto': '0.9', '--omi-pulso-bajo': '0.4' },
  active:  {},
  user:    {},
  success: {},
};

export function LivePulseBar({ state = 'calm', returnDelay = 3000 }: Props) {
  const [current, setCurrent] = useState<PulseState>(state);
  const timeoutRef = useRef<number>(0);

  useEffect(() => {
    setCurrent(state);

    // Auto-return to calm after a burst state
    if (state !== 'calm' && returnDelay > 0) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCurrent('calm'), returnDelay);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [state, returnDelay]);

  return (
    <div
      className="live-pulse-bar"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        // backgroundImage, no el atajo `background`: mezclar el atajo con
        // `backgroundSize` hace que React avise en cada cambio de estado.
        backgroundImage: GRADIENTS[current],
        backgroundSize: '200% 100%',
        animation: ANIMATIONS[current],
        ...PULSO[current],
        transition: 'background-image 0.6s ease',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Hook para controlar el Pulse Bar desde cualquier parte ────────────
let _setState: ((s: PulseState) => void) | null = null;

/**
 * Self-registering LivePulseBar — manages its own state.
 * Control it from anywhere with firePulse().
 * Does NOT require props from parent (no re-render propagation).
 */
export function SelfManagedPulseBar() {
  const [current, setCurrent] = useState<PulseState>('calm');
  const timeoutRef = useRef<number>(0);

  // Register the setter for firePulse
  useEffect(() => {
    _setState = (s: PulseState) => {
      setCurrent(s);
      if (s !== 'calm') {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setCurrent('calm'), 3000);
      }
    };
    return () => { _setState = null; };
  }, []);

  return <LivePulseBar state={current} returnDelay={0} />;
}

/** Fire-and-forget pulse from anywhere (services, hooks, etc.) */
export function firePulse(s: PulseState): void {
  _setState?.(s);
}
