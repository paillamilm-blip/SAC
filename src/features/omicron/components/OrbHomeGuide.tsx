// src/features/omicron/components/OrbHomeGuide.tsx
// ═══════════════════════════════════════════════════════════════════════
// <OrbHomeGuide /> — Superficie de bienvenida CALMA del orbe.
//
// Aparece SOLO la primera vez de cada sesión de navegador (la gestión del
// flag de sesión vive en OrbShell). Muestra un saludo personalizado y
// 2-3 chips de acción tocables para que la persona nunca se sienta
// perdida al aterrizar. Es descartable (tocar un chip o el cierre) y no
// vuelve a aparecer esa sesión.
//
// Composición (acceptance criterion #5): el SALUDO se ancla ARRIBA del
// orbe y los CHIPS de acción ABAJO (encima de la barra de input). Para
// no duplicar la lógica, el mismo componente se renderiza en dos ranuras
// (`slot`): 'greeting' arriba y 'actions' abajo. Cada ranura tiene su
// propio <AnimatePresence> gobernado por `visible`, de modo que el
// descarte reproduce la variante `exit` (fade-out) en vez de un corte seco.
//
// Reutiliza la navegación existente vía onNavigate(tab); coexiste con
// ProactiveCards y OrbContextLabel (que quedan tal cual).
//
// Estética: glass card al estilo ProactiveCards, acento userColor.
// Animación con framer-motion, respetando prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { hapticLight } from '@/shared/utils/haptics';
import { C, FONT, RADIUS, SIZE, SP, tint } from '@/theme';
import { buildHomeActions, splitGreeting } from '../utils/orbHomeGuide';

// Unión discriminada por `slot`: cada ranura declara solo lo que usa, así el
// saludo no arrastra props muertas (onNavigate/onDismiss) que nunca invoca.
interface GreetingSlotProps {
  /** Ranura SALUDO: línea sobria anclada arriba del orbe (no interactiva). */
  slot: 'greeting';
  userName: string;
  visible: boolean;
}

interface ActionsSlotProps {
  /** Ranura ACCIONES: tarjeta glass con chips + cierre, abajo del orbe. */
  slot: 'actions';
  userName: string;
  hasCv: boolean;
  visible: boolean;
  onNavigate: (tab: string) => void;
  onDismiss: () => void;
}

export type OrbHomeGuideProps = GreetingSlotProps | ActionsSlotProps;

export function OrbHomeGuide(props: OrbHomeGuideProps) {
  const userColor = useUserColor();
  const reduce = useReducedMotion();

  // Variantes con animación; en reduced-motion se anulan transform/opacity
  // (incluida la `exit`, que queda {} → descarte instantáneo por diseño).
  const containerVariants: Variants = reduce
    ? { hidden: {}, show: {}, exit: {} }
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
        exit: { opacity: 0, transition: { duration: 0.18 } },
      };

  const itemVariants: Variants = reduce
    ? { hidden: {}, show: {}, exit: {} }
    : {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
        exit: { opacity: 0, y: 6 },
      };

  // ── Ranura SALUDO: dos niveles anclados arriba del orbe ─────────────
  // Jerarquía premium: el nombre (lead) es el HÉROE (FONT.display, SIZE.lg,
  // 600, C.ink) y el estado '· tu Gemelo está activo' queda DISCRETO
  // (SIZE.sm, C.mut). El contenedor escalona las dos líneas (stagger del
  // itemVariants) sin superficies nuevas. En reduced-motion todo se anula.
  if (props.slot === 'greeting') {
    const { lead, status } = splitGreeting(props.userName);
    return (
      <AnimatePresence>
        {props.visible && (
          <motion.div
            key="orb-home-greeting"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              margin: 0,
              maxWidth: 340,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: SP[1],
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <motion.span
              variants={itemVariants}
              style={{
                fontFamily: FONT.display,
                fontSize: SIZE.lg,
                lineHeight: 1.3,
                fontWeight: 600,
                letterSpacing: -0.2,
                color: C.ink,
                textShadow: `0 0 10px ${userColor}33`,
              }}
            >
              {lead}
            </motion.span>
            {status && (
              <motion.span
                variants={itemVariants}
                style={{
                  fontFamily: FONT.body,
                  fontSize: SIZE.sm,
                  lineHeight: 1.4,
                  fontWeight: 500,
                  color: C.mut,
                }}
              >
                {status}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Ranura ACCIONES: tarjeta glass con chips + cierre, abajo del orbe ─
  const { visible, hasCv, onNavigate, onDismiss } = props;
  const actions = buildHomeActions(hasCv);

  const handleChip = (tab: string) => {
    hapticLight();
    onNavigate(tab);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="orb-home-actions"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{
            maxWidth: 340,
            width: '100%',
            margin: '0 auto',
            pointerEvents: 'auto',
            background: C.surface,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${userColor}4D`,
            borderRadius: RADIUS.lg,
            padding: '14px 16px',
            boxShadow: `0 4px 24px ${userColor}1A, 0 8px 32px ${tint(C.black, 40)}`,
          }}
        >
          {/* Cabecera: microcopy + cierre */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <motion.p
              variants={itemVariants}
              style={{
                margin: 0,
                fontFamily: FONT.body,
                fontSize: 13,
                lineHeight: 1.4,
                color: C.mut,
                fontWeight: 500,
              }}
            >
              ¿Por dónde empezamos?
            </motion.p>
            <button
              onClick={onDismiss}
              aria-label="Cerrar"
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: C.glass2,
                color: C.mut,
                fontSize: 11,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Chips de acción tocables */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {actions.map((action) => (
              <motion.button
                key={action.tab + action.label}
                variants={itemVariants}
                onClick={() => handleChip(action.tab)}
                style={{
                  pointerEvents: 'auto',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${userColor}66`,
                  background: `${userColor}1A`,
                  color: C.ink,
                  fontFamily: FONT.body,
                  fontWeight: 600,
                  fontSize: SIZE.xs,
                  letterSpacing: 0.2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
