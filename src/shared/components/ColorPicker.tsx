// shared/components/ColorPicker.tsx
// ═══════════════════════════════════════════════════════════════════════
// COLOR PICKER — User chooses their Gemelo's primary color.
//
// 4 colors from the Ómicrom palette. Each renders as a glowing circle.
// Selected color gets a scale + ring animation.
// Persists choice to localStorage for use across the app.
//
// Landing-pro: minimal, centered, beautiful. No labels needed.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useCallback, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { hapticLight } from '@/shared/utils/haptics';
import { audioTick } from '@/shared/utils/spatialAudio';
import { C, FONT } from '@/theme';

const STORAGE_KEY = 'omicron_user_color';

export interface ColorOption {
  id: string;
  hex: string;
  label: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { id: 'ice', hex: '#7dd3fc', label: 'Hielo' },
  { id: 'pink', hex: '#ff6b9d', label: 'Rosa' },
  { id: 'gold', hex: '#ffb02e', label: 'Oro' },
  { id: 'lime', hex: '#84cc16', label: 'Lima' },
];

/** Get the user's saved color (or default cyan) */
export function getUserColor(): string {
  if (typeof localStorage === 'undefined') return COLOR_OPTIONS[0].hex;
  const saved = localStorage.getItem(STORAGE_KEY);
  const found = COLOR_OPTIONS.find(c => c.id === saved || c.hex === saved);
  return found?.hex ?? COLOR_OPTIONS[0].hex;
}

/** Save user's color choice */
export function setUserColor(colorId: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, colorId);
  }
}

interface Props {
  /** Called when user selects a color */
  onSelect: (color: ColorOption) => void;
  /** Currently selected color id */
  selected?: string;
  /** Size of each circle in px (default 38) */
  dotSize?: number;
  style?: CSSProperties;
}

export function ColorPicker({ onSelect, selected, dotSize = 38, style }: Props) {
  const [active, setActive] = useState(selected || 'ice');

  const handleSelect = useCallback((option: ColorOption) => {
    setActive(option.id);
    setUserColor(option.id);
    // Escritura diferida a Supabase (write-through) para sincronizar el
    // color entre dispositivos si hay sesión. localStorage ya quedó
    // guardado arriba de forma síncrona; esto no bloquea la selección y,
    // si falla o es invitado, no rompe nada (no-op silencioso).
    import('@/shared/services/userColorSync')
      .then(m => m.persistUserColor(option.id))
      .catch(() => {});
    hapticLight();
    audioTick();
    onSelect(option);
  }, [onSelect]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, ...style }}>
      <p style={{
        margin: 0, fontFamily: FONT.body, fontSize: 14, color: C.ink,
        textAlign: 'center', lineHeight: 1.5, opacity: 0.9,
      }}>
        Elige el color de tu Gemelo
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {COLOR_OPTIONS.map((option) => {
          const isActive = active === option.id;
          return (
            <motion.button
              key={option.id}
              onClick={() => handleSelect(option)}
              whileTap={{ scale: 0.9 }}
              animate={isActive ? { scale: 1.15 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              aria-label={`Color ${option.label}`}
              style={{
                width: dotSize, height: dotSize,
                borderRadius: '50%',
                border: isActive ? `2.5px solid ${option.hex}` : `2px solid ${C.locked}`,
                background: isActive
                  ? `radial-gradient(circle at 35% 35%, ${option.hex}, ${option.hex}88)`
                  : `radial-gradient(circle at 35% 35%, ${option.hex}88, ${option.hex}44)`,
                boxShadow: isActive
                  ? `0 0 20px ${option.hex}88, 0 0 40px ${option.hex}44, inset 0 0 10px ${option.hex}44`
                  : `0 0 8px ${option.hex}33`,
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            />
          );
        })}
      </div>

      {/* Color name label */}
      <motion.span
        key={active}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.5,
          color: COLOR_OPTIONS.find(c => c.id === active)?.hex ?? C.cyan,
          textTransform: 'uppercase',
        }}
      >
        {COLOR_OPTIONS.find(c => c.id === active)?.label}
      </motion.span>
    </div>
  );
}
