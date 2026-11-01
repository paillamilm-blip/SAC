// shared/motion/TextReveal.tsx
// ═══════════════════════════════════════════════════════════════════════
// Text that reveals character by character with variable speed.
// Use for: AI responses, coach guidance, greetings, quotes.
// Taste: speed adapts to punctuation (pause on '.', ',' — feels human).
// Anti-slop: no cursor blink after complete (that's a 2005 pattern).
// Impeccable: shows full text instantly in reduced motion.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { ANIM } from '@/theme';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  /** Text to reveal */
  text: string;
  /** Base speed in ms per character (default 28) */
  speed?: number;
  /** Delay before starting (ms) */
  delay?: number;
  /** Show cursor during typing */
  cursor?: boolean;
  /** Callback when reveal is complete */
  onComplete?: () => void;
  style?: CSSProperties;
  className?: string;
}

function charDelay(char: string, baseSpeed: number): number {
  if (char === '.' || char === '!' || char === '?') return baseSpeed * 6;
  if (char === ',') return baseSpeed * 3;
  if (char === ':' || char === ';') return baseSpeed * 4;
  if (char === ' ') return baseSpeed * 0.5;
  return baseSpeed;
}

export function TextReveal({
  text, speed = 28, delay = 0, cursor = true, onComplete, style, className,
}: Props) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(reduced ? text.length : 0);
  const [typing, setTyping] = useState(!reduced);
  // Use ref for onComplete to avoid it in the dep array (prevents restart)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (reduced) {
      setRevealed(text.length);
      setTyping(false);
      onCompleteRef.current?.();
      return;
    }

    let cancelled = false;
    let idx = 0;
    setRevealed(0);
    setTyping(true);

    function next() {
      if (cancelled) return;
      if (idx >= text.length) {
        setTyping(false);
        onCompleteRef.current?.();
        return;
      }
      const char = text[idx];
      const ms = idx === 0 ? delay : charDelay(char, speed);
      setTimeout(() => {
        if (cancelled) return;
        idx++;
        setRevealed(idx);
        next();
      }, ms);
    }

    next();
    return () => { cancelled = true; };
  }, [text, speed, delay, reduced]); // onComplete NOT in deps (uses ref)

  const displayText = text.slice(0, revealed);

  return (
    <span style={style} className={className}>
      {displayText}
      {cursor && typing && (
        <span
          style={{
            display: 'inline-block',
            width: 2, height: '1em',
            background: 'currentColor',
            marginLeft: 1,
            opacity: 0.7,
            animation: ANIM.pulse,
            verticalAlign: 'text-bottom',
          }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
