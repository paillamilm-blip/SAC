// theme/animations.ts
// La familia de movimiento de Ómicrom. Cinco gestos, declarados una sola vez
// en index.css; nadie más escribe un @keyframes para decir lo mismo.
//
// El gesto firma es la RESPIRACIÓN: todo lo que está vivo en la app (la barra,
// el orbe, el punto de presencia) respira al mismo tempo, 3 s. Cuando el
// asistente trabaja, el tempo sube a 1,2 s: es el mismo gesto, más rápido.
//
// Filosofía Emil Kowalski (animations.dev): ease-out para entradas, exit más
// rápido que enter, nunca >1 s para UI.

/** Curvas de easing — nunca usar 'ease' ni 'ease-in' para UI */
export const EASE = {
  default: 'cubic-bezier(0.32, 0.72, 0, 1)',
  enter: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  exit: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
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

/** Los cinco gestos. `rise` es la entrada de toda la app; `breathe` es la firma. */
export const ANIM = {
  rise: `omi-rise ${TIMING.enter} ${EASE.default} both`,
  /** Para lo que se centra con translateX(-50%): avisos y toasts al pie. */
  riseFixed: `omi-rise-fixed ${TIMING.enter} ${EASE.default} both`,
  /** El banner de conexión cae desde arriba; es `rise` invertido, misma curva. */
  drop: `omi-drop ${TIMING.enter} ${EASE.default} both`,
  /** Solo opacidad, para lo que ocupa toda la pantalla. */
  fade: `omi-fade ${TIMING.exit} ${EASE.default} both`,
  /** La lámina que llega al centro de la pantalla. */
  pop: `omi-pop ${TIMING.normal} ${EASE.default} both`,
  breathe: 'omi-breathe 3s ease-in-out infinite',
  pulse: 'omi-pulse 1.2s ease-in-out infinite',
  /** El gesto de éxito: una respiración que ocurre una sola vez. */
  flash: 'omi-pulse 0.6s ease both',
  spin: 'omi-spin 0.8s linear infinite',
  float: 'omi-float 6s ease-in-out infinite',
  shimmer: 'omi-shimmer 1.4s linear infinite',
  /** El conector de Academia: las rayas avanzan, nadie redibuja el trazo. */
  dash: 'omi-dash 0.7s linear infinite',
  /** La barra viva: un solo latido declinado en los tempos del asistente. */
  pulsoLento: 'omi-pulse 4s ease-in-out infinite',
  pulsoAlerta: 'omi-pulse 1.5s ease-in-out infinite',
  flujo: 'omi-shimmer 2s linear infinite',
  flujoLento: 'omi-shimmer 4s linear infinite',
  /** Los dos anillos del Gemelo: mismo giro, tempos distintos a propósito. */
  orbita: 'omi-spin 25s linear infinite',
  orbitaContraria: 'omi-spin 18s linear infinite reverse',
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
