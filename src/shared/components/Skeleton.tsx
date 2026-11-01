// components/shared/Skeleton.tsx
// ═══════════════════════════════════════════════════════════════════════
// SKELETON — Loading placeholder que shimmer en vez de texto "Cargando..."
// Emil Kowalski: "Un skeleton se siente más rápido que un spinner."
// ═══════════════════════════════════════════════════════════════════════

import { C, ANIM } from '@/theme';

interface Props {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: Props) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: `linear-gradient(90deg, ${C.glass} 25%, ${C.glass2} 50%, ${C.glass} 75%)`,
      backgroundSize: '200% 100%',
      animation: ANIM.shimmer,
      ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${C.line}`, marginBottom: 12 }}>
      <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
      <Skeleton height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="80%" height={12} />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
