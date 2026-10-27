import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/infrastructure/supabase/client';
import { Eye, EyeOff, CheckCircle, Shield } from 'lucide-react';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { C, FONT, SIZE, RADIUS, tint } from '@/theme';

// ═══════════════════════════════════════════════════════════════════════
// CSS inyectado una sola vez para estados interactivos (:focus, :hover).
// El color de acento llega por variable CSS (--omi-accent).
// ═══════════════════════════════════════════════════════════════════════
function injectResetStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('omicron-reset-css')) return;
  const s = document.createElement('style');
  s.id = 'omicron-reset-css';
  s.textContent = `
    .reset-input {
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .reset-input::placeholder { color: ${tint(C.mut, 85)}; }
    .reset-input:focus {
      outline: none;
      border-color: var(--omi-accent) !important;
      background: ${C.glass2} !important;
      box-shadow: 0 0 0 3px var(--omi-accent-soft);
    }
    .reset-submit { transition: filter .18s ease, transform .12s ease, box-shadow .18s ease; }
    .reset-submit:hover:not(:disabled) { filter: brightness(1.08); }
    .reset-submit:active:not(:disabled) { transform: scale(0.985); }
    .reset-eye { transition: background .18s ease, color .18s ease; }
    .reset-eye:hover { background: var(--omi-accent-faint) !important; color: ${C.ink} !important; }
  `;
  document.head.appendChild(s);
}
injectResetStyles();

export function ResetPasswordOverlay({ onDone }: { onDone: () => void }) {
  const uc = useUserColor();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => {
        onDone();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

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
          <div style={{ ...S.orbRing, boxShadow: `0 0 30px ${uc}33, inset 0 0 20px ${uc}14` }}>
            <GeodesicOrb size={80} nodes={10} color={uc} spinning={20} intensity={0.6} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={S.brand}>Sistema Ómicrom</h1>
            <p style={S.tagline}>Nueva contraseña</p>
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

          {success ? (
            <div style={S.successBlock}>
              <CheckCircle size={48} color={C.green} />
              <p style={S.successTitle}>Contraseña actualizada</p>
              <p style={S.successDesc}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={S.form}>
              <div>
                <label style={S.label} htmlFor="reset-pw">
                  Nueva contraseña <span style={{ color: C.red }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="reset-pw"
                    type={showPass ? 'text' : 'password'}
                    className="reset-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={{ ...S.input, paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    className="reset-eye"
                    onClick={() => setShowPass(s => !s)}
                    style={S.eye}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={S.label} htmlFor="reset-pw-confirm">
                  Confirmar contraseña <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  id="reset-pw-confirm"
                  type={showPass ? 'text' : 'password'}
                  className="reset-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  style={S.input}
                />
              </div>

              {error && (
                <div role="alert" style={{ ...S.alert, background: C.redFaint, border: `1px solid ${C.red}4d`, color: C.red }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="reset-submit"
                disabled={loading}
                style={{
                  ...S.submit,
                  background: `linear-gradient(135deg, ${uc}, ${C.purple})`,
                  boxShadow: `0 8px 28px ${uc}4d`,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

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
    background: `radial-gradient(130% 95% at 50% 18%, #050813 0%, ${C.onAccent} 52%, #000003 100%)`,
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
    letterSpacing: -0.5, color: C.ink,
  },
  tagline: {
    margin: '6px 0 0',
    fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.4, color: C.mut,
  },
  card: {
    position: 'relative', width: '100%',
    borderRadius: RADIUS.xl, padding: 24, overflow: 'hidden',
    background: `linear-gradient(160deg, ${C.glass2}, ${C.glass})`,
    border: `1px solid ${C.line}`,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    boxShadow: `0 16px 48px ${tint(C.black, 50)}`,
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: {
    display: 'block', marginBottom: 6,
    fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4,
    textTransform: 'uppercase', color: C.mut,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px', borderRadius: RADIUS.md,
    background: C.glass,
    border: `1px solid ${C.line}`,
    fontFamily: FONT.body, fontSize: SIZE.md, color: C.ink,
  },
  eye: {
    position: 'absolute', right: 6,
    width: 36, height: 36, borderRadius: RADIUS.sm,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', color: C.mut, cursor: 'pointer',
  },
  alert: {
    padding: '12px 16px', borderRadius: RADIUS.md,
    fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.45,
  },
  submit: {
    width: '100%', padding: '15px 0', borderRadius: RADIUS.md, border: 'none',
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md,
    letterSpacing: 0.2, color: '#fff', marginTop: 4,
  },
  successBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, padding: '24px 0', textAlign: 'center',
  },
  successTitle: {
    margin: 0,
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.lg, color: C.ink,
  },
  successDesc: {
    margin: 0,
    fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, lineHeight: 1.5,
  },
  secure: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 18,
    fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut,
  },
};
