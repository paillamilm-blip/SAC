// theme/index.ts
// ═══════════════════════════════════════════════════════════════════════
// BARREL RE-EXPORT — All design tokens from a single entry point.
//
// Existing imports like `import { C, FONT, ANIM } from '@/theme'`
// continue working. For granular imports:
//   import { C } from '@/theme/tokens';
//   import { FONT } from '@/theme/typography';
//   import { ANIM, SPRING } from '@/theme/animations';
// ═══════════════════════════════════════════════════════════════════════

export * from './tokens';
export * from './canvasInk';
export * from './typography';
export * from './animations';
export * from './shadows';
export * from './layout';
