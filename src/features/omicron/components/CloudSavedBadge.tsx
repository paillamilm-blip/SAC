// features/omicron/components/CloudSavedBadge.tsx
// ═══════════════════════════════════════════════════════════════════════
// <CloudSavedBadge /> — Confirmación EFÍMERA "Guardado en tu cuenta".
//
// Tranquiliza al usuario: su perfil vive en su cuenta, no solo en este
// dispositivo. Aparece SOLO justo después de un guardado exitoso (escucha
// el evento DOM 'omicron:profile-saved' que dispara useGemeloActivation) y
// se auto-oculta con un fade suave ~3s después. No es permanente ni ocupa
// espacio mientras no haya un guardado reciente (renderiza null).
//
// Usa el mismo lenguaje visual de acento suave (borde + glow con el color
// del usuario) que AuthOverlay y el resto de la app. Copy neutro
// latinoamericano, sin jerga técnica.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { BLUR, HALO, C, FONT, SIZE, RADIUS, LETRA} from '@/theme';

/** Tiempo visible tras un guardado antes de desvanecerse. */
const VISIBLE_MS = 3000;

/**
 * Pill/chip sutil con un check + el texto "Guardado en tu cuenta".
 * No recibe props: se auto-estiliza con el color de acento del usuario y
 * gestiona su propia visibilidad efímera escuchando 'omicron:profile-saved'.
 */
export function CloudSavedBadge() {
  const uc = useUserColor();
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      // Reinicia el temporizador si llega otro guardado mientras es visible.
      if (timerRef.current) clearTimeout(timerRef.current);
      setShow(true);
      timerRef.current = setTimeout(() => setShow(false), VISIBLE_MS);
    };

    window.addEventListener('omicron:profile-saved', handler);
    return () => {
      window.removeEventListener('omicron:profile-saved', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-label="Tu perfil está guardado en tu cuenta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: RADIUS.pill,
            border: `1px solid ${uc}33`,
            background: `${uc}14`,
            boxShadow: `0 0 ${HALO.marca}px ${uc}22, inset 0 0 ${HALO.foco}px ${uc}0d`,
            backdropFilter: `blur(${BLUR.vaho}px)`,
            WebkitBackdropFilter: `blur(${BLUR.vaho}px)`,
            fontFamily: FONT.mono,
            fontSize: SIZE.xs,
            letterSpacing: LETRA.denso,
            color: C.ink,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: `${uc}26`,
              color: uc,
              flexShrink: 0,
            }}
          >
            <Check size={11} strokeWidth={3} />
          </span>
          Guardado en tu cuenta
        </motion.div>
      )}
    </AnimatePresence>
  );
}
