// shared/motion/CelebrationBurst.tsx
// ═══════════════════════════════════════════════════════════════════════
// Lightweight confetti burst for achievements, streaks, level-ups.
// Pure CSS/JS — no canvas, no library. 30 particles, auto-cleanup.
// Anti-slop: particles have physics (gravity + random velocity).
// Taste: uses the Ómicrom color palette, not random colors.
// Respects prefers-reduced-motion (shows a gentle scale pulse instead).
// ═══════════════════════════════════════════════════════════════════════
import { C, tint } from '@/theme';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

const COLORS = [C.cyan, C.purple, C.green, C.gold, C.red];
const PARTICLE_COUNT = 28;
const DURATION = 1400; // ms

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square';
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    return {
      x: 0, y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3, // upward bias
      size: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    };
  });
}

interface Props {
  /** Set to true to trigger the burst */
  trigger: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  style?: CSSProperties;
}

export function CelebrationBurst({ trigger, onComplete, style }: Props) {
  const reduced = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!trigger) return;

    if (reduced) {
      // Reduced motion: just show a gentle scale pulse via CSS
      setActive(true);
      const t = setTimeout(() => { setActive(false); onCompleteRef.current?.(); }, 600);
      return () => clearTimeout(t);
    }

    const ps = createParticles();
    setParticles(ps);
    setActive(true);
    startRef.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startRef.current;
      const progress = elapsed / DURATION;

      if (progress >= 1) {
        setActive(false);
        setParticles([]);
        onCompleteRef.current?.();
        return;
      }

      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.15, // gravity
        rotation: p.rotation + p.rotationSpeed,
        opacity: 1 - progress,
      })));

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger, reduced]); // onComplete uses ref (not in deps)

  if (!active) return null;

  if (reduced) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', pointerEvents: 'none', zIndex: 50, ...style,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: `radial-gradient(circle, ${tint(C.cyan, 30)}, transparent 70%)`,
          animation: 'cp-pulse 0.6s ease both',
        }} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
        overflow: 'hidden', ...style,
      }}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: p.size, height: p.size,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            background: p.color,
            opacity: p.opacity,
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`,
            boxShadow: `0 0 6px ${p.color}88`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
