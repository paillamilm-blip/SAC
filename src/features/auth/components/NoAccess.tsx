import { type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, Shield } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { BLUR, HALO, C, FONT, SIZE, RADIUS, tint, UMBRAL, LETRA} from '@/theme';

// ═══════════════════════════════════════════════════════════════════════
// CSS inyectado: estados interactivos para el boton ghost (signOut).
// ═══════════════════════════════════════════════════════════════════════
function injectNoAccessStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('omicron-noaccess-css')) return;
  const s = document.createElement('style');
  s.id = 'omicron-noaccess-css';
  s.textContent = `
    .noaccess-ghost { transition: border-color .18s ease, color .18s ease, background .18s ease; }
    .noaccess-ghost:hover {
      border-color: var(--omi-accent) !important;
      color: ${C.ink} !important;
      background: var(--omi-accent-faint) !important;
    }
  `;
  document.head.appendChild(s);
}
injectNoAccessStyles();

export function NoAccess() {
  const uc = useUserColor();

  return (
    <div
      style={{
        ...S.root,
        '--omi-accent': uc,
        '--omi-accent-soft': `${uc}33`,
        '--omi-accent-faint': `${uc}1a`,
      } as CSSProperties}
    >
      {/* Halo ambiental */}
      <div style={{ ...S.halo, background: `radial-gradient(circle, ${uc}1f 0%, transparent 70%)` }} />

      <div style={S.stack}>
        {/* Logo: orbe + titulo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={S.logoBlock}
        >
          <div style={{ ...S.orbRing, boxShadow: `0 0 ${HALO.resplandor}px ${uc}33, inset 0 0 ${HALO.resplandor}px ${uc}14` }}>
            <GeodesicOrb size={80} nodes={10} color={uc} spinning={20} intensity={0.6} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={S.brand}>Sistema Ómicrom</h1>
            <p style={S.tagline}>Acceso restringido</p>
          </div>
        </motion.div>

        {/* Tarjeta glass premium */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={S.card}
        >
          {/* Barra de acento superior */}
          <div style={{ ...S.cardAccent, background: `linear-gradient(90deg, transparent, ${uc}, transparent)` }} />

          <div style={S.content}>
            <div style={S.iconWrap}>
              <ShieldOff size={32} color={C.red} />
            </div>

            <h2 style={S.title}>Tu cuenta aún no tiene acceso</h2>
            <p style={S.desc}>
              Contacta al soporte de Sistema Ómicrom para obtener acceso a la red.
            </p>

            {/* Estado de la cuenta */}
            <div style={S.statusCard}>
              <p style={S.statusLabel}>Estado de tu cuenta</p>
              <div style={S.statusRow}>
                <div style={S.dot} />
                <span style={S.statusText}>Sin acceso activo</span>
              </div>
            </div>

            {/* Boton cerrar sesion (ghost, como AuthOverlay) */}
            <button
              onClick={() => supabase.auth.signOut()}
              className="noaccess-ghost"
              style={{ ...S.ghost, border: `1px solid ${uc}33` }}
              aria-label="Cerrar sesión"
            >
              Cerrar sesión
            </button>
          </div>

          <div style={S.secure}>
            <Shield size={12} />
            <span>Tu Gemelo solo muestra lo que pudiste probar</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ESTILOS — tokens de @/theme, acento por `uc` (color del usuario).
// ═══════════════════════════════════════════════════════════════════════
const S: Record<string, CSSProperties> = {
  root: {
    position: 'fixed', inset: 0, zIndex: 95,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', overflow: 'auto',
    background: UMBRAL.apertura,
  },
  halo: {
    position: 'absolute', top: '4%', left: '50%',
    transform: 'translateX(-50%)',
    width: 420, height: 420, pointerEvents: 'none',
  },
  stack: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 384,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    margin: 'auto',
  },
  logoBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, marginBottom: 28,
  },
  orbRing: {
    width: 80, height: 80, borderRadius: RADIUS.pill, overflow: 'hidden',
  },
  brand: {
    margin: 0,
    fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl,
    letterSpacing: LETRA.titulo, color: C.ink,
  },
  tagline: {
    margin: '6px 0 0',
    fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.denso, color: C.mut,
  },
  card: {
    position: 'relative', width: '100%',
    borderRadius: RADIUS.xl, padding: 24, overflow: 'hidden',
    background: `linear-gradient(160deg, ${C.glass2}, ${C.glass})`,
    border: `1px solid ${C.line}`,
    backdropFilter: `blur(${BLUR.cristal}px)`, WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
    boxShadow: `0 16px 48px ${tint(C.black, 50)}`,
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', gap: 16,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: RADIUS.lg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.redFaint, border: `1px solid ${C.red}4d`,
  },
  title: {
    margin: 0,
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xl,
    letterSpacing: LETRA.titulo, color: C.ink,
  },
  desc: {
    margin: 0,
    fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut,
    lineHeight: 1.55, maxWidth: 280,
  },
  statusCard: {
    width: '100%', padding: '14px 16px', borderRadius: RADIUS.md,
    background: C.glass,
    border: `1px solid ${C.line}`, textAlign: 'left',
  },
  statusLabel: {
    margin: '0 0 8px',
    fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.ancha,
    textTransform: 'uppercase', color: C.mut,
  },
  statusRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: RADIUS.pill, background: C.red,
  },
  statusText: {
    fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink,
  },
  ghost: {
    width: '100%', marginTop: 4, padding: '13px 0',
    borderRadius: RADIUS.md, background: 'transparent',
    fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.denso,
    color: tint(C.ink, 70), cursor: 'pointer',
  },
  secure: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 18,
    fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut,
  },
};
