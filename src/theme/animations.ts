// theme/animations.ts
// Keyframes, timing, easing, and spring presets
// Filosofía Emil Kowalski (animations.dev):
// ease-out para entradas, exit más rápido que enter, nunca >1s para UI.

export const KEYFRAMES = `
@keyframes cp-pulse { 0%,100% { opacity:1; box-shadow:0 0 8px #a0aec0; } 50% { opacity:0.3; box-shadow:none; } }
@keyframes cp-spin { to { transform: rotate(360deg); } }
@keyframes cp-scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
@keyframes cp-node-pop { 0% { opacity:0; transform:scale(0.9); } 100% { opacity:1; transform:scale(1); } }
@keyframes cp-trail { 0% { stroke-dashoffset:30; } 100% { stroke-dashoffset:0; } }
@keyframes cp-breathe { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
@keyframes cp-toast-in { 0% { opacity:0; transform:translateX(-50%) translateY(12px); } 100% { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
`;

export const ANIM = {
  pulse: 'cp-pulse 1.5s ease-in-out infinite',
  spin: 'cp-spin 0.8s linear infinite',
  scanline: 'cp-scanline 4s linear infinite',
  nodePop: 'cp-node-pop 0.25s ease both',
  trail: 'cp-trail 1.5s linear infinite',
  breathe: 'cp-breathe 2s ease-in-out infinite',
  toastIn: 'cp-toast-in 0.2s ease both',
  float: 'floatY 6s ease-in-out infinite',
} as const;

/** Curvas de easing — nunca usar 'ease' ni 'ease-in' para UI */
export const EASE = {
  default: 'cubic-bezier(0.32, 0.72, 0, 1)',
  enter: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  exit: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const;

/** Duraciones — enter siempre más lento que exit */
export const TIMING = {
  instant: '60ms',
  fast: '150ms',
  normal: '250ms',
  enter: '300ms',
  exit: '200ms',
  slow: '500ms',
} as const;

/** Framer Motion spring presets */
export const SPRING = {
  default: { type: 'spring' as const, stiffness: 400, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
  stiff: { type: 'spring' as const, stiffness: 500, damping: 35 },
  gentle: { type: 'spring' as const, stiffness: 200, damping: 25 },
} as const;

/** Curvas de easing como arrays (para framer-motion / CSS). */
export const EASING = {
  standard: [0.4, 0, 0.2, 1] as const,
  gentle:   [0.25, 0.1, 0.25, 1] as const,
  spring:   [0.34, 1.56, 0.64, 1] as const,
} as const;

export function injectKeyframes(): void {
  if (typeof document === 'undefined') return;
  const id = 'omicron-keyframes';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}
