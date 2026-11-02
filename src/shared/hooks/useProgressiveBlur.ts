// shared/hooks/useProgressiveBlur.ts
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Progressive Blur
//
// Sections the user hasn't explored yet appear slightly blurred (1.5px).
// On first visit, the blur animates away (0.6s ease).
// Creates a sense of DISCOVERY — you "clear the fog" by exploring.
//
// Usage: const { blurStyle, markVisited } = useProgressiveBlur('empleos');
// Then: style={{ ...blurStyle }} on the section wrapper.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react';
import { VELO } from '@/theme';

const STORAGE_KEY = 'omicron_visited_sections';

function getVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveVisited(set: Set<string>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* noop */ }
}

export function useProgressiveBlur(sectionId: string) {
  const [visited, setVisited] = useState(() => getVisited().has(sectionId));
  const [clearing, setClearing] = useState(false);
  const timersRef = useRef<number[]>([]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

  // On mount, if not visited, auto-clear after entrance delay
  useEffect(() => {
    if (visited) return;

    const t1 = window.setTimeout(() => {
      setClearing(true);
      const vs = getVisited();
      vs.add(sectionId);
      saveVisited(vs);

      const t2 = window.setTimeout(() => setVisited(true), 600);
      timersRef.current.push(t2);
    }, 300);

    timersRef.current.push(t1);
    return () => { clearTimeout(t1); };
  }, [sectionId, visited]);

  const markVisited = useCallback(() => {
    if (visited) return;
    setClearing(true);
    const vs = getVisited();
    vs.add(sectionId);
    saveVisited(vs);
    const t = window.setTimeout(() => setVisited(true), 600);
    timersRef.current.push(t);
  }, [sectionId, visited]);

  // CSS filter value
  const blur = visited
    ? 'none'
    : clearing
      ? `blur(${VELO.nitido}px)`
      : `blur(${VELO.apenas}px)`;

  // Style object ready to spread
  const blurStyle = visited
    ? {}
    : { filter: blur, transition: 'filter 0.6s ease' } as const;

  return { visited, clearing, blur, blurStyle, markVisited };
}
