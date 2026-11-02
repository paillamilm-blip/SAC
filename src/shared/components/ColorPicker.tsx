// shared/components/ColorPicker.tsx
// ═══════════════════════════════════════════════════════════════════════
// COLOR PICKER — User chooses their Gemelo's primary color.
//
// Solo el dibujo. La paleta y la persistencia viven en
// shared/services/userColor.ts, que es el módulo puro que pueden importar los
// tests sin arrastrar spatialAudio (su constructor usa window.matchMedia).
// ═══════════════════════════════════════════════════════════════════════
import { useState, useCallback, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { hapticLight } from '@/shared/utils/haptics';
import { audioTick } from '@/shared/utils/spatialAudio';
import { HALO, C, FONT, LETRA} from '@/theme';
import { COLOR_OPTIONS, setUserColor, type ColorOption } from '@/shared/services/userColor';

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
  const [active, setActive] = useState(selected || 'ambar');

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
                  ? `0 0 ${HALO.resplandor}px ${option.hex}88, 0 0 ${HALO.difusion}px ${option.hex}44, inset 0 0 ${HALO.foco}px ${option.hex}44`
                  : `0 0 ${HALO.ascua}px ${option.hex}33`,
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
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: LETRA.ancha,
          color: COLOR_OPTIONS.find(c => c.id === active)?.hex ?? C.cyan,
          textTransform: 'uppercase',
        }}
      >
        {COLOR_OPTIONS.find(c => c.id === active)?.label}
      </motion.span>
    </div>
  );
}
