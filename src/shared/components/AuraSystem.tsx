// shared/components/AuraSystem.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Aura System
//
// Every user has a unique visual identity generated from their 4 axes:
//   Execution(cyan) + Quality(purple) + Transcendence(gold) + Foundation(green)
//
// The aura is a radial gradient + glow combination that appears:
//   - Around avatars (AuraRing)
//   - As ambient background in profile
//   - In chat messages (subtle glow behind your name)
//
// No two users have the same aura — it's generative identity.
// Updates in real-time as axes change (SmoothNumber-like transition).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { HALO, BLUR, C, ANIM } from '@/theme';

export interface AuraAxes {
  execution: number;      // 0-100
  quality: number;        // 0-100
  transcendence: number;  // 0-100
  foundation: number;     // 0-100
}

export interface AuraColors {
  /** Primary dominant color (highest axis) */
  primary: string;
  /** Secondary color (second highest) */
  secondary: string;
  /** Radial gradient for backgrounds */
  gradient: string;
  /** Box-shadow glow */
  glow: string;
  /** Ring border gradient (for AuraRing) */
  ringGradient: string;
  /** Intensity 0-1 (average of all axes / 100) */
  intensity: number;
}

const AXIS_COLORS = [
  { key: 'execution', color: C.cyan, angle: 0 },
  { key: 'quality', color: C.purple, angle: 90 },
  { key: 'transcendence', color: C.gold, angle: 180 },
  { key: 'foundation', color: C.green, angle: 270 },
] as const;

/**
 * Computes the aura colors from the user's 4 axes.
 * Higher axes contribute more color intensity to the aura.
 */
export function computeAura(axes: AuraAxes): AuraColors {
  const scores = [
    { ...AXIS_COLORS[0], score: axes.execution },
    { ...AXIS_COLORS[1], score: axes.quality },
    { ...AXIS_COLORS[2], score: axes.transcendence },
    { ...AXIS_COLORS[3], score: axes.foundation },
  ].sort((a, b) => b.score - a.score);

  const primary = scores[0];
  const secondary = scores[1];
  const intensity = (axes.execution + axes.quality + axes.transcendence + axes.foundation) / 400;

  // Opacity of each color stop is proportional to its axis score
  const stops = scores.map((s, i) => {
    const opacity = Math.round((s.score / 100) * 0.6 * 255).toString(16).padStart(2, '0');
    const pct = i * 25 + 12;
    return `${s.color}${opacity} ${pct}%`;
  }).join(', ');

  const gradient = `radial-gradient(ellipse at 50% 50%, ${stops}, transparent 85%)`;

  const glowOpacity = Math.round(intensity * 0.45 * 255).toString(16).padStart(2, '0');
  const glow = `0 0 ${HALO.resplandor}px ${primary.color}${glowOpacity}, 0 0 ${HALO.difusion}px ${secondary.color}${Math.round(intensity * 0.2 * 255).toString(16).padStart(2, '0')}`;

  const ringGradient = `conic-gradient(from ${primary.angle}deg, ${primary.color}, ${secondary.color}, ${scores[2].color}44, ${primary.color})`;

  return {
    primary: primary.color,
    secondary: secondary.color,
    gradient,
    glow,
    ringGradient,
    intensity,
  };
}

/**
 * Hook that computes aura from axes (memoized).
 */
export function useAura(axes: AuraAxes | null | undefined): AuraColors {
  return useMemo(() => {
    if (!axes) return computeAura({ execution: 30, quality: 30, transcendence: 20, foundation: 25 });
    return computeAura(axes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axes?.execution, axes?.quality, axes?.transcendence, axes?.foundation]);
}

// ═══════════════════════════════════════════════════════════════════════
// AuraRing — Wrap around an avatar to show the user's unique aura
// ═══════════════════════════════════════════════════════════════════════

interface AuraRingProps {
  axes: AuraAxes | null | undefined;
  /** Ring size (default 52) — the avatar goes inside */
  size?: number;
  /** Ring thickness (default 2.5) */
  thickness?: number;
  /** Animate the ring rotation (default true) */
  animate?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

export function AuraRing({ axes, size = 52, thickness = 2.5, animate = true, children, style }: AuraRingProps) {
  const aura = useAura(axes);

  return (
    <div
      style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...style,
      }}
    >
      {/* Aura ring */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          padding: thickness,
          background: aura.ringGradient,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: animate ? ANIM.spin : undefined,
          opacity: 0.6 + aura.intensity * 0.4,
        }}
      />
      {/* Soft glow behind */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          background: aura.gradient,
          opacity: aura.intensity * 0.3,
          filter: `blur(${BLUR.vaho}px)`,
        }}
      />
      {/* Content (avatar) */}
      <div style={{ position: 'relative', zIndex: 1, borderRadius: '50%', overflow: 'hidden', width: size - thickness * 2 - 4, height: size - thickness * 2 - 4 }}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AuraBackground — Ambient background glow for profile/gemelo sections
// ═══════════════════════════════════════════════════════════════════════

interface AuraBackgroundProps {
  axes: AuraAxes | null | undefined;
  style?: CSSProperties;
}

export function AuraBackground({ axes, style }: AuraBackgroundProps) {
  const aura = useAura(axes);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        borderRadius: 'inherit',
        background: aura.gradient,
        opacity: aura.intensity * 0.15,
        transition: 'opacity 1s ease, background 2s ease',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
