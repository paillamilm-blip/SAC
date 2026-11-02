// shared/services/userColor.ts
// ═══════════════════════════════════════════════════════════════════════
// Lógica PURA del color del Gemelo, aislada de Supabase.
//
// Este módulo NO importa el cliente de Supabase ni ColorPicker: mantiene
// dependencias mínimas para que ColorPicker → spatialAudio (cuyo constructor
// usa window.matchMedia, inexistente en jsdom) no arrastre la carga del suite
// de Vitest de CI. Al separarlo del servicio de sincronización, las pruebas
// unitarias del helper puro pueden importarlo sin romper nada.
// ═══════════════════════════════════════════════════════════════════════

// Paleta oficial: ACÁ vive y en ningún otro lado. ColorPicker la importa, así
// que el color que se ofrece y el que se valida no pueden desincronizarse.
// (Antes estaba copiada en dos archivos y la lista del selector se les fue
// adelante con un default celeste que ninguna de las dos reconocía.)
export interface ColorOption {
  id: string;
  hex: string;
  label: string;
}

export const COLOR_OPTIONS: readonly ColorOption[] = [
  { id: 'ambar',   hex: '#f2b134', label: 'Ámbar' },
  { id: 'azul',    hex: '#6aa9ff', label: 'Azul' },
  { id: 'verde',   hex: '#3ddc97', label: 'Verde' },
  { id: 'violeta', hex: '#c084fc', label: 'Violeta' },
];

/** El acento con el que arranca todo el mundo: el ámbar de la marca. */
export const DEFAULT_COLOR: ColorOption = COLOR_OPTIONS[0];

// Misma clave que usa ColorPicker (caché síncrona en el dispositivo).
const STORAGE_KEY = 'omicron_user_color';

/**
 * Helper PURO de validación. Devuelve el ID canónico del color si `value`
 * coincide con un id ('ambar') o con un hex ('#f2b134') de COLOR_OPTIONS.
 * Si no coincide (o es null/undefined) devuelve null. No toca localStorage
 * ni la red: es determinista y fácil de probar.
 */
export function resolveColorId(value: string | null | undefined): string | null {
  if (!value) return null;
  const found = COLOR_OPTIONS.find(c => c.id === value || c.hex === value);
  return found ? found.id : null;
}

/** Lee el valor crudo guardado en localStorage (o null si no existe). */
export function readLocalColor(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/** El hex del acento del usuario. Si no eligió nunca (o su elección ya no
 *  está en la paleta), el ámbar de la marca — nunca un color fuera del sistema. */
export function getUserColor(): string {
  const saved = resolveColorId(readLocalColor());
  return COLOR_OPTIONS.find(c => c.id === saved)?.hex ?? DEFAULT_COLOR.hex;
}

/** Guarda la elección en el dispositivo. */
export function setUserColor(colorId: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, colorId);
}
