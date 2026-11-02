// shared/motion/PulseRing.tsx
// ═══════════════════════════════════════════════════════════════════════
// Expanding ring that fades out — like Apple Watch activity ring pulse.
// Use for: live data received, realtime events, connection established.
// Taste: ONE ring (not three). color from Ómicrom palette.
// Anti-slop: triggers once per event, not infinite looping.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from './useReducedMotion';
import { HALO, C } from '@/theme';

interface Props {
  /** Increment this to trigger a new pulse */
  trigger: number;
  /** Ring color (default cyan) */
  color?: string;
  /** Size of the ring in px (default 48) */
  size?: number;
  style?: CSSProperties;
}

export function PulseRing({ trigger, color = C.cyan, size = 48, style }: Props) {
  const reduced = useReducedMotion();
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger > 0) setKey(prev => prev + 1);
  }, [trigger]);

  if (reduced) return null;

  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }} aria-hidden="true">
      <AnimatePresence>
        {key > 0 && (
          <motion.div
            key={key}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              boxShadow: `0 0 ${HALO.foco}px ${color}44`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
