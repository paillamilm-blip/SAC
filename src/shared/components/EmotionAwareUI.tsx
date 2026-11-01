// shared/components/EmotionAwareUI.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Emotion-Aware UI
//
// The UI FEELS your state and reflects it ambientally:
//
//   onFire   → streak 3+, recent achievements → golden particles, fast orb
//   engaged  → active session, normal use → default warm state
//   cooling  → 1-2 days inactive → slightly dimmer, slower breathing
//   cold     → 3+ days inactive → muted colors, orb breathes very slow
//   proud    → just leveled up or passed exam → sustained warm halo
//
// Implementation:
//   - Injects CSS custom properties on :root
//   - Any component can read var(--emotion-warmth), var(--emotion-energy), etc.
//   - The OrbShell and background already use CSS vars → automatic propagation
//   - Zero re-renders: uses DOM style manipulation directly
//
// Anti-slop: transitions between states take 2-3 SECONDS (not instant).
// The user should feel the mood shift, not see it flip.
// ═══════════════════════════════════════════════════════════════════════
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type EmotionState = 'onFire' | 'engaged' | 'cooling' | 'cold' | 'proud';

interface EmotionConfig {
  /** 0-1: visual warmth (golden tint) */
  warmth: number;
  /** 0-1: animation speed multiplier */
  energy: number;
  /** 0-1: color saturation */
  saturation: number;
  /** 0-1: glow intensity */
  glow: number;
  /** Orb breathing speed in seconds */
  breathDuration: number;
  /** Background particle density (0=none, 1=full) */
  particles: number;
}

const EMOTION_CONFIGS: Record<EmotionState, EmotionConfig> = {
  onFire: {
    warmth: 0.85,
    energy: 1.0,
    saturation: 1.0,
    glow: 0.9,
    breathDuration: 2.0,
    particles: 0.8,
  },
  proud: {
    warmth: 0.7,
    energy: 0.8,
    saturation: 0.95,
    glow: 0.75,
    breathDuration: 2.5,
    particles: 0.4,
  },
  engaged: {
    warmth: 0.4,
    energy: 0.6,
    saturation: 0.85,
    glow: 0.5,
    breathDuration: 3.0,
    particles: 0.1,
  },
  cooling: {
    warmth: 0.2,
    energy: 0.35,
    saturation: 0.65,
    glow: 0.25,
    breathDuration: 4.5,
    particles: 0.0,
  },
  cold: {
    warmth: 0.05,
    energy: 0.2,
    saturation: 0.45,
    glow: 0.1,
    breathDuration: 6.0,
    particles: 0.0,
  },
};

interface EmotionContextValue {
  emotion: EmotionState;
  config: EmotionConfig;
  setEmotion: (e: EmotionState) => void;
}

const EmotionContext = createContext<EmotionContextValue>({
  emotion: 'engaged',
  config: EMOTION_CONFIGS.engaged,
  setEmotion: () => {},
});

export function useEmotion() {
  return useContext(EmotionContext);
}

// ── Determines emotion from user data ────────────────────────────────
interface UserSignals {
  streakDays?: number;
  daysSinceLastActivity?: number;
  recentAchievement?: boolean;
  recentLevelUp?: boolean;
}

export function computeEmotion(signals: UserSignals): EmotionState {
  const { streakDays = 0, daysSinceLastActivity = 0, recentAchievement, recentLevelUp } = signals;

  if (recentLevelUp) return 'proud';
  if (recentAchievement && streakDays >= 2) return 'onFire';
  if (streakDays >= 3) return 'onFire';
  if (daysSinceLastActivity >= 3) return 'cold';
  if (daysSinceLastActivity >= 1) return 'cooling';
  if (recentAchievement) return 'proud';
  return 'engaged';
}

// ── Provider — wraps the app ─────────────────────────────────────────
interface ProviderProps {
  children: ReactNode;
  /** Initial signals to compute emotion (can update via setEmotion) */
  signals?: UserSignals;
}

export function EmotionProvider({ children, signals }: ProviderProps) {
  const [emotion, setEmotion] = useState<EmotionState>(() =>
    signals ? computeEmotion(signals) : 'engaged'
  );

  const config = useMemo(() => EMOTION_CONFIGS[emotion], [emotion]);

  // Update when signals change (including when signals goes from undefined → defined)
  useEffect(() => {
    if (signals) setEmotion(computeEmotion(signals));
  }, [signals]);

  // Inject CSS custom properties (no re-render needed by consumers)
  const prevRef = useRef<EmotionConfig>(config);
  useEffect(() => {
    const root = document.documentElement;
    // Transition duration for smooth state changes (2.5s = Jarvis mood shift)
    root.style.setProperty('--emotion-transition', '2.5s');
    root.style.setProperty('--emotion-warmth', String(config.warmth));
    root.style.setProperty('--emotion-energy', String(config.energy));
    root.style.setProperty('--emotion-saturation', String(config.saturation));
    root.style.setProperty('--emotion-glow', String(config.glow));
    root.style.setProperty('--emotion-breath', `${config.breathDuration}s`);
    root.style.setProperty('--emotion-particles', String(config.particles));
    prevRef.current = config;
  }, [config]);

  const value = useMemo(() => ({ emotion, config, setEmotion }), [emotion, config]);

  return (
    <EmotionContext.Provider value={value}>
      {children}
    </EmotionContext.Provider>
  );
}

// ── Ambient Particles (for onFire/proud states) ──────────────────────
// Lightweight CSS-only floating particles that appear when emotion is high
export function EmotionParticles() {
  const { config } = useEmotion();

  if (config.particles <= 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: config.particles,
        transition: 'opacity 2.5s ease',
      }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 3 + Math.random() * 3,
            height: 3 + Math.random() * 3,
            borderRadius: '50%',
            background: config.warmth > 0.6
              ? `rgba(255, 176, 46, ${0.3 + Math.random() * 0.3})`
              : `rgba(160,174,192, ${0.2 + Math.random() * 0.2})`,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            animation: `omi-float ${4 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}
