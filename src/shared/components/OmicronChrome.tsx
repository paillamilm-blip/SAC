// shared/components/OmicronChrome.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM · Única biblioteca de primitivas de andamio de la app.
//
// Desde el estándar asistente (DESIGN.md): si una pantalla necesita barra,
// tarjeta, chip, métrica, progreso, carga o estado vacío, usa ACÁ y no vuelve
// a inventar el estilo. CyberComponents.tsx (la biblioteca cyberpunk vieja) y
// EmptyState.tsx vivían duplicando esto y fueron retirados.
//
// Dos reglas sostienen todo el archivo:
//   1. El acento NO se lee: se hereda. App.tsx pone var(--omi-accent) una vez y
//      cada primitiva lo usa por ACCENT/tint(). Nadie lee localStorage en render.
//   2. Todo valor sale de theme/ (C, SIZE, RADIUS, SP, BLUR, SHADOW, EASE).
// ═══════════════════════════════════════════════════════════════════════
import { ReactNode, CSSProperties } from 'react';
import { Icon } from './icons';
import { HALO, C, FONT, SIZE, RADIUS, SP, BLUR, SHADOW, EASE, TIMING, ANIM, ACCENT, tint, ELEVATED, LETRA} from '@/theme';

export const oc: Record<string, CSSProperties> = {
  // Pantalla transparente: deja ver el fondo Ómicrom de la shell.
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    position: 'relative', overflow: 'hidden', background: 'transparent',
  },
  scroll: {
    flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
    WebkitOverflowScrolling: 'touch',
  },
  // La tarjeta glass, en dos tamaños de respiración nada más.
  card: {
    borderRadius: RADIUS.xl, padding: SP[4],
    background: C.glass, border: `1px solid ${C.line}`,
    backdropFilter: `blur(${BLUR.cristal}px)`, WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
  },
};

interface OmicronHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
  action?: ReactNode;
  accent?: string;
}

// Barra de asistente: UNA fila (volver + ícono + título + acción). El título va
// a SIZE.lg porque la altura del primer viewport es la moneda de la app.
export function OmicronHeader({ title, subtitle, icon, onBack, action, accent = ACCENT }: OmicronHeaderProps) {
  return (
    <div style={S.header}>
      {onBack && (
        <button onClick={onBack} aria-label="Volver" style={S.back}>
          <Icon role="volver" size={18} />
        </button>
      )}
      {icon && (
        <div style={{
          ...S.iconBadge,
          background: `linear-gradient(135deg, ${accent}, ${C.purple})`,
          boxShadow: `0 0 ${HALO.marca}px ${tint(accent, 34)}`,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.ancha, textTransform: 'uppercase', color: C.cyan }}>
            {subtitle}
          </div>
        )}
        <div style={S.title}>{title}</div>
      </div>
      {action && <div style={S.action}>{action}</div>}
    </div>
  );
}

// Acción del slot derecho. Mantiene los 44 px de blanco táctil.
export function OmicronAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={S.actionBtn}>
      {children}
    </button>
  );
}

// Etiqueta de sección (eyebrow) mono.
export function OmicronEyebrow({ children, color = C.cyan, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.ancha, textTransform: 'uppercase', color, padding: `${SP[1]}px ${SP[0]}px ${SP[2]}px`, ...style }}>
      {children}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: {
    display: 'flex', alignItems: 'center', gap: SP[3], flexShrink: 0,
    padding: `${SP[2]}px ${SP[3]}px`, marginBottom: SP[1],
    borderRadius: RADIUS.lg,
    background: C.glass, border: `1px solid ${C.line}`,
    backdropFilter: `blur(${BLUR.cristal}px)`, WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
  },
  back: {
    flexShrink: 0, width: 44, height: 44, borderRadius: RADIUS.md,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.cyanFaint, border: `1px solid ${C.cyanDim}`,
    color: C.cyan, cursor: 'pointer',
  },
  iconBadge: {
    flexShrink: 0, width: 44, height: 44, borderRadius: RADIUS.md,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.onAccent,
  },
  title: {
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.lg, color: C.ink,
    letterSpacing: LETRA.titulo, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  action: { display: 'flex', alignItems: 'center', gap: SP[2], flexShrink: 0 },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: SP[2], minHeight: 44, padding: `0 ${SP[3]}px`,
    borderRadius: RADIUS.md,
    background: `linear-gradient(135deg, ${ACCENT}, ${C.purple})`,
    border: 'none', color: C.onAccent, cursor: 'pointer',
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
    boxShadow: ELEVATED.lejana('md', tint(ACCENT, 34)),
  },
};


// ═══════════════════════════════════════════════════════════════════════
// CONTENIDO · tarjeta, chip, métrica, progreso, secciones
// ═══════════════════════════════════════════════════════════════════════

// Estados interactivos que no se pueden expresar inline (hover/active/entrada).
function injectOcStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('omicron-chrome-css')) return;
  const s = document.createElement('style');
  s.id = 'omicron-chrome-css';
  s.textContent = `
    .oc-card { transition: transform ${TIMING.fast} ${EASE.default}, box-shadow ${TIMING.fast} ${EASE.default}, border-color ${TIMING.fast} ${EASE.default}; }
    .oc-pressable { cursor: pointer; }
    .oc-pressable:hover { transform: translateY(-2px); border-color: ${C.line} !important; }
    .oc-pressable:active { transform: scale(0.985); }
    .oc-rise { animation: ${ANIM.rise}; }
    @media (prefers-reduced-motion: reduce) {
      .oc-card, .oc-pressable { transition: none; }
      .oc-pressable:hover, .oc-pressable:active { transform: none; }
      .oc-rise { animation: none; }
    }
  `;
  document.head.appendChild(s);
}
injectOcStyles();

interface OmicronCardProps {
  children: ReactNode;
  onClick?: () => void;
  accent?: string;
  glow?: boolean;
  style?: CSSProperties;
  className?: string;
}

// Tarjeta glass con lomo de acento de 2 px (la misma firma que la cola de
// Aprendizaje), glow opcional y estado táctil.
export function OmicronCard({ children, onClick, accent, glow, style, className }: OmicronCardProps) {
  const clickable = !!onClick;
  return (
    <div
      className={`oc-card${clickable ? ' oc-pressable' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: RADIUS.xl,
        padding: SP[4],
        background: `linear-gradient(160deg, ${C.glass2}, ${C.glass})`,
        border: `1px solid ${C.line}`,
        backdropFilter: `blur(${BLUR.cristal}px)`, WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
        boxShadow: glow && accent ? `${SHADOW.lg}, 0 0 ${HALO.resplandor}px ${tint(accent, 14)}` : SHADOW.md,
        overflow: 'hidden',
        ...style,
      }}
    >
      {accent && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          background: `linear-gradient(180deg, ${accent}, transparent)`,
        }} />
      )}
      {children}
    </div>
  );
}

// Chip / etiqueta pill (relleno o contorno).
export function Chip({ children, color = ACCENT, filled, icon }: { children: ReactNode; color?: string; filled?: boolean; icon?: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: SP[1], padding: `${SP[1]}px ${SP[3]}px`,
      borderRadius: RADIUS.pill, fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.denso,
      color: filled ? C.onAccent : color, background: filled ? color : tint(color, 11),
      border: `1px solid ${filled ? color : tint(color, 33)}`, whiteSpace: 'nowrap', fontWeight: 600,
    }}>
      {icon}{children}
    </span>
  );
}

// Métrica (label + valor).
export function Stat({ label, value, color = C.ink, icon }: { label: string; value: ReactNode; color?: string; icon?: ReactNode }) {
  return (
    <div style={{ padding: SP[3], borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP[2], color: C.mut, fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.etiqueta, textTransform: 'uppercase' }}>{icon}{label}</div>
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color, marginTop: SP[1], letterSpacing: LETRA.titulo }}>{value}</div>
    </div>
  );
}

// Barra de progreso. Crece con transform (nunca con width) y se anuncia como
// barra de progreso real.
export function ProgressBar({ pct, color = ACCENT, height = 7, label }: { pct: number; color?: string; height?: number; label?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ height, borderRadius: RADIUS.pill, background: C.glass2, overflow: 'hidden' }}
    >
      <div style={{
        height: '100%', width: '100%', transform: `scaleX(${p / 100})`, transformOrigin: 'left',
        borderRadius: RADIUS.pill, background: `linear-gradient(90deg, ${color}, ${C.purple})`,
        boxShadow: `0 0 ${HALO.foco}px ${tint(color, 40)}`,
        transition: `transform ${TIMING.slow} ${EASE.default}`,
      }} />
    </div>
  );
}

// Anillo de progreso (SVG) con contenido central.
export function ProgressRing({ pct, size = 46, stroke = 4, color = ACCENT, label, children }: { pct: number; size?: number; stroke?: number; color?: string; label?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.glass2} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (circ * p) / 100}
          style={{ transition: `stroke-dashoffset ${TIMING.slow} ${EASE.default}`, filter: `drop-shadow(0 0 ${HALO.chispa}px ${tint(color, 53)})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: SIZE.xs, fontWeight: 700, color }}>{children}</div>
    </div>
  );
}

// Título de sección con ícono y slot derecho.
export function SectionTitle({ children, icon, right, color = ACCENT }: { children: ReactNode; icon?: ReactNode; right?: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP[2], padding: `${SP[4]}px ${SP[0]}px ${SP[2]}px` }}>
      {icon && <span style={{ color, display: 'flex' }}>{icon}</span>}
      <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, letterSpacing: LETRA.apretada }}>{children}</span>
      {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// ESTADOS · los cuatro (vacío, cargando, error, listo). Son primitivas del
// andamio, no un segundo lenguaje visual: hablan en segunda persona y el CTA
// mide 44 px. Error y listo vivían redactadas a mano en cada pantalla, con
// cuatro frases distintas para decir lo mismo; acá se dicen una vez.
// ═══════════════════════════════════════════════════════════════════════

interface OmicronLoadingProps {
  message?: string;
  style?: CSSProperties;
}

// Pantalla de carga de tab. `role="status"` para que un lector de pantalla lo
// anuncie una sola vez.
export function OmicronLoading({ message = 'Un momento, lo estoy preparando…', style }: OmicronLoadingProps) {
  return (
    <div role="status" aria-live="polite" style={{ ...oc.root, alignItems: 'center', justifyContent: 'center', gap: SP[3], ...style }}>
      <div style={{
        width: 44, height: 44, borderRadius: RADIUS.md,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tint(ACCENT, 6), border: `1px solid ${tint(ACCENT, 25)}`,
      }}>
        <div style={{
          width: SP[5], height: SP[5], borderRadius: '50%',
          border: `2px solid ${ACCENT}`, borderTopColor: 'transparent',
          animation: ANIM.spin,
        }} />
      </div>
      <p style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.cyan, letterSpacing: LETRA.etiqueta, textTransform: 'uppercase', margin: 0 }}>
        {message}
      </p>
    </div>
  );
}

interface OmicronErrorProps {
  /** Qué falló, en palabras del asistente. Nunca un código ni un stack. */
  cause: string;
  title?: string;
  /** La salida: lo único que el usuario puede hacer ahora. */
  ctaLabel?: string;
  onCta?: () => void;
}

// El error nombra la causa y ofrece una salida. Si no hay salida posible no se
// muestra el botón: un "OK" que no mueve nada es ruido, no recuperación.
export function OmicronError({ cause, title = 'No pude hacerlo ahora', ctaLabel, onCta }: OmicronErrorProps) {
  return (
    <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${SP[10]}px ${SP[6]}px`, gap: SP[1] }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', marginBottom: SP[3],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${tint(C.red, 40)}`, color: C.red, background: tint(C.red, 6),
      }}>
        <Icon role="error" size={24} />
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.lg, color: C.ink, letterSpacing: LETRA.apretada }}>{title}</div>
      <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.6, color: C.mut, margin: `${SP[1]}px 0 0`, maxWidth: 280 }}>{cause}</p>
      {ctaLabel && onCta && (
        <button onClick={onCta} style={{
          marginTop: SP[4], minHeight: 44, padding: `0 ${SP[5]}px`, borderRadius: RADIUS.md,
          border: `1px solid ${tint(C.red, 34)}`, cursor: 'pointer',
          background: tint(C.red, 12), color: C.red,
          fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
        }}>{ctaLabel}</button>
      )}
    </div>
  );
}

interface OmicronDoneProps {
  title: string;
  /** Qué sigue después del éxito: la confirmación nunca deja la pantalla en el aire. */
  detail?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

// La confirmación va en teal (el OK del sistema), no en el acento del usuario:
// el acento dice "esto es tuyo", el teal dice "esto pasó".
export function OmicronDone({ title, detail, ctaLabel, onCta }: OmicronDoneProps) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${SP[10]}px ${SP[6]}px`, gap: SP[1] }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', marginBottom: SP[3],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${C.greenDim}`, color: C.green, background: C.greenFaint,
        animation: ANIM.float,
      }}>
        <Icon role="exito" size={24} />
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.lg, color: C.ink, letterSpacing: LETRA.apretada }}>{title}</div>
      {detail && <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.6, color: C.mut, margin: `${SP[1]}px 0 0`, maxWidth: 280 }}>{detail}</p>}
      {ctaLabel && onCta && (
        <button onClick={onCta} style={{
          marginTop: SP[4], minHeight: 44, padding: `0 ${SP[5]}px`, borderRadius: RADIUS.md,
          border: 'none', cursor: 'pointer', color: C.onAccent,
          background: `linear-gradient(135deg, ${C.green}, ${tint(C.green, 67)})`,
          boxShadow: `0 0 ${HALO.marca}px ${tint(C.green, 33)}`,
          fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
        }}>{ctaLabel}</button>
      )}
    </div>
  );
}

interface OmicronEmptyProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  ctaLabel?: string;
  onCta?: () => void;
  accent?: string;
}

// Estado vacío con salida: nunca "no hay nada", siempre "esto es lo que sigue".
export function OmicronEmpty({ icon, title, hint, ctaLabel, onCta, accent = ACCENT }: OmicronEmptyProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: `${SP[12]}px ${SP[6]}px`, gap: SP[1] }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', marginBottom: SP[3],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${tint(accent, 40)}`, color: accent,
        background: tint(accent, 4), boxShadow: `0 0 ${HALO.resplandor}px ${tint(accent, 20)}`,
        animation: ANIM.float,
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xl, color: C.ink, letterSpacing: LETRA.titulo }}>{title}</div>
      {hint && <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.6, color: C.mut, margin: `${SP[1]}px 0 0`, maxWidth: 260 }}>{hint}</p>}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          style={{
            marginTop: SP[4], minHeight: 44, padding: `0 ${SP[5]}px`, borderRadius: RADIUS.md,
            border: 'none', cursor: 'pointer', color: C.onAccent,
            background: `linear-gradient(135deg, ${accent}, ${tint(accent, 67)})`,
            boxShadow: `0 0 ${HALO.marca}px ${tint(accent, 33)}`,
            fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
