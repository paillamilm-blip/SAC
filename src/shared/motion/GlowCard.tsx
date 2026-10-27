// shared/motion/GlowCard.tsx
// ═══════════════════════════════════════════════════════════════════════
// Card with dynamic spotlight that follows mouse/touch position.
// Taste: the glow is SUBTLE (10% opacity max, 200px radius). Not flashy.
// Impeccable: transitions smoothly via CSS custom properties (60fps).
// Anti-slop: no JS repaint — pure CSS radial-gradient on mousemove.
// ═══════════════════════════════════════════════════════════════════════
import { useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import { C, RADIUS } from '@/theme';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  children: ReactNode;
  /** Glow color (default: cyan) */
  color?: string;
  /** Glow intensity 0-1 (default 0.08) */
  intensity?: number;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

export function GlowCard({ children, color = C.cyan, intensity = 0.08, onClick, style, className }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let px: number, py: number;
    if ('touches' in e) {
      px = e.touches[0].clientX - rect.left;
      py = e.touches[0].clientY - rect.top;
    } else {
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
    }
    ref.current.style.setProperty('--glow-x', `${px}px`);
    ref.current.style.setProperty('--glow-y', `${py}px`);
    ref.current.style.setProperty('--glow-opacity', '1');
  }, [reduced]);

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty('--glow-opacity', '0');
  }, []);

  const clampedIntensity = Math.min(0.15, Math.max(0.03, intensity));

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchEnd={handleLeave}
      className={className}
      style={{
        position: 'relative',
        borderRadius: RADIUS.xl,
        padding: 16,
        background: `linear-gradient(160deg, ${C.glass2}, ${C.glass})`,
        border: `1px solid ${C.line}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : undefined,
        '--glow-x': '0px',
        '--glow-y': '0px',
        '--glow-opacity': '0',
        ...style,
      } as CSSProperties}
    >
      {/* Dynamic spotlight overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(200px circle at var(--glow-x) var(--glow-y), ${color}${Math.round(clampedIntensity * 255).toString(16).padStart(2, '0')}, transparent 60%)`,
          opacity: 'var(--glow-opacity)' as unknown as number,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
