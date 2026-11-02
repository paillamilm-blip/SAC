// src/features/omicron/components/OrbEstadoDelDia.tsx
// ═══════════════════════════════════════════════════════════════════════
// <OrbEstadoDelDia /> — Ribbon CALMO de "estado del día" / próximo paso.
//
// Renderiza UNA sola línea (compuesta por el helper puro pickHomeStatus)
// como una píldora sobria anclada con ritmo bajo el orbe: el toque de
// "cockpit de tu carrera" sin recargar la pantalla.
//
// Es NO interactivo (pointerEvents:'none' en el wrapper) para nunca bloquear
// los taps de los nodos ni la barra de input. Renderiza null cuando su línea
// es null.
//
// Estética/movimiento siguiendo el patrón de OrbHomeGuide: entrada con
// framer-motion, acento en el color del usuario (useUserColor), tokens de
// @/theme, y guarda de prefers-reduced-motion (useReducedMotion → sin
// transform, instantáneo). Transform/opacity únicamente, duración <=300ms,
// ease-out, con un pequeño delay para que entre DESPUÉS del saludo.
// ═══════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { BLUR, HALO, C, ELEVATED, FONT, RADIUS, SIZE, SP, LETRA} from '@/theme';

export interface OrbEstadoDelDiaProps {
  /** La línea a mostrar; si es null el ribbon no se renderiza. */
  label: string | null;
  /** Controla la presencia del ribbon (entrada/salida). */
  visible: boolean;
}

export function OrbEstadoDelDia({ label, visible }: OrbEstadoDelDiaProps) {
  const userColor = useUserColor();
  const reduce = useReducedMotion();

  // Variante con entrada suave; en reduced-motion se anulan transform/opacity
  // (entrada instantánea por diseño). Transform/opacity solamente, <=300ms,
  // ease-out; delay corto para que el ribbon entre CON RITMO tras el saludo.
  const variants: Variants = reduce
    ? { hidden: {}, show: {}, exit: {} }
    : {
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1], delay: 0.18 },
        },
        exit: { opacity: 0, y: 6, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } },
      };

  const show = visible && !!label;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="orb-estado-del-dia"
          variants={variants}
          initial="hidden"
          animate="show"
          exit="exit"
          // No interactivo: nunca intercepta taps de nodos ni de la barra.
          style={{ pointerEvents: 'none', maxWidth: 340, width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: SP[2],
              maxWidth: '100%',
              padding: '8px 14px',
              borderRadius: RADIUS.pill,
              background: C.surface,
              backdropFilter: `blur(${BLUR.escarcha}px)`,
              WebkitBackdropFilter: `blur(${BLUR.escarcha}px)`,
              border: `1px solid ${userColor}33`,
              boxShadow: ELEVATED.tinte('sm', `${userColor}14`),
              fontFamily: FONT.body,
              fontSize: SIZE.xs,
              lineHeight: 1.4,
              fontWeight: 500,
              letterSpacing: LETRA.denso,
              color: C.mut,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {/* Punto de acento sutil en el color del usuario. */}
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: RADIUS.pill,
                background: userColor,
                boxShadow: `0 0 ${HALO.ascua}px ${userColor}80`,
              }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
