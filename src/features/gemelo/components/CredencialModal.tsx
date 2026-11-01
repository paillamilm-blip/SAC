// features/gemelo/components/CredencialModal.tsx
// ═══════════════════════════════════════════════════════════════════════
// CREDENCIAL ÓMICROM — Tu Gemelo Digital como credencial verificable.
//
// A diferencia de GemeloTab (el "taller" interno donde trabajás tu perfil),
// este modal presenta tu Gemelo Digital como una CREDENCIAL: el equivalente
// visual a una tarjeta de presentación / documento oficial, pensada para
// mostrar y compartir con otros profesionales.
//
// El orbe actúa como RETRATO (no como asistente vivo): contenido, quieto,
// enmarcado. Es el héroe visual pero no domina la tarjeta.
//
// CERO JERGA: cada número se muestra con su escala (NN/100) y con el
// significado claro (Reputación, Ejecución, etc.).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { X, Share2, Download, RefreshCw, Zap, Shield, Globe, TrendingUp, CheckCircle2, Circle, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp, useGemeloDigital } from '@/store/AppContext';
import { C, FONT, SIZE, RADIUS, tint } from '@/theme';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { ShareCredentialModal } from '@/features/gemelo/components/RedSocial';
import { credentialPng } from '@/features/gemelo/services/credencialCanvas';

// Fondo radial de la marca Ómicrom (mismo lenguaje que BASE.root del tema).
const OMICRON_BG = 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)';

// ── Pestañas de la credencial (orden fijo): el cuerpo se pagina en 3 vistas. ──
const TABS = ['Perfil', 'Competencias', 'Trayectoria'] as const;
type TabIndex = 0 | 1 | 2;

// Ease del brillo holográfico (sheen). Tupla cubic-bezier MUTABLE tipada
// [number, number, number, number] (NO `as const`) para cumplir el lint de CI.
const SHEEN_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Título de bloque reutilizable: punto de acento del color personal + label mono.
function BlockTitle({ uc, children }: { uc: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: uc, boxShadow: `0 0 6px ${uc}88`, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4, color: C.mut, textTransform: 'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

export function CredencialModal({ onClose, onUpdateCV }: { onClose: () => void; onUpdateCV?: () => void }) {
  const { profile } = useApp();
  const gemelo = useGemeloDigital();
  const uc = useUserColor();
  const [showShare, setShowShare] = useState(false);
  // Cerrar sesión con TAP-TO-CONFIRM: primer tap arma la confirmación, segundo
  // tap ejecuta signOut. Evita salidas accidentales sin usar confirm() nativo.
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  // Pestaña activa del cuerpo paginado (0=Perfil, 1=Competencias, 2=Trayectoria).
  // `dir` guarda la dirección del último cambio para orientar el slide horizontal.
  const [tab, setTab] = useState<TabIndex>(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const reduceMotion = useReducedMotion();

  // Cambia de pestaña recordando la dirección (para el slide del seam).
  const goTab = (next: TabIndex) => {
    setDir(next >= tab ? 1 : -1);
    setTab(next);
  };

  // ── Swipe/arrastre horizontal para paginar entre pestañas ──────────────
  // Se lee el desplazamiento y la velocidad al soltar. Umbrales: +/-60px de
  // arrastre o +/-300 de velocidad. Se acota a 0..2 (no pasa de la primera ni
  // de la última). El handler lee `tab` fresco directamente (sin timers ni
  // callbacks inestables). Bajo reduce-motion el gesto SIGUE cambiando de
  // pestaña; solo se suprime el slide (ya gestionado con slide=0).
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const goNext = info.offset.x < -60 || info.velocity.x < -300;
    const goPrev = info.offset.x > 60 || info.velocity.x > 300;
    if (goNext && tab < 2) goTab((tab + 1) as TabIndex);
    else if (goPrev && tab > 0) goTab((tab - 1) as TabIndex);
  };

  // ── Datos derivados (mismo patrón exacto que GemeloTab) ────────────────
  const name = profile?.display_name || profile?.full_name || profile?.username || '';
  const username = profile?.username;
  const years = profile?.cv_years_experience ?? 0;
  const seniorLabel = years >= 10 ? 'Profesional Senior'
    : years >= 5 ? 'Profesional Mid-Senior'
    : years >= 2 ? 'Profesional Mid'
    : 'Profesional';

  const skillsDetail = useMemo(() => {
    const details = profile?.skills_detail ?? [];
    if (details.length > 0) return details;
    return (profile?.skills ?? []).map((s: string, i: number) => ({ name: s, pct: Math.max(30, 85 - i * 8) }));
  }, [profile?.skills_detail, profile?.skills]);

  // Ejes del Gemelo. Ejecución adopta el color del usuario (convención GemeloTab).
  const axes: { key: string; label: string; value: number; color: string; Icon: LucideIcon }[] = [
    { key: 'exec', label: 'Ejecución', value: gemelo?.execution ?? profile?.execution_score ?? 0, color: uc, Icon: Zap },
    { key: 'qual', label: 'Calidad', value: gemelo?.quality ?? profile?.quality_score ?? 0, color: C.purple, Icon: Shield },
    { key: 'trans', label: 'Trascendencia', value: gemelo?.transcendence ?? profile?.transcendence_score ?? 0, color: C.gold, Icon: Globe },
    { key: 'fund', label: 'Fundamento', value: gemelo?.foundation ?? profile?.foundation_score ?? 0, color: C.green, Icon: TrendingUp },
  ];
  // Clamp 0-100: la reputación es server-side, pero acotamos por si llega
  // un valor fuera de rango (mantiene el "/100" honesto en pantalla y PNG).
  const reputation = Math.max(0, Math.min(100, Math.round(gemelo?.overallReputation ?? profile?.reputation_score ?? 0)));

  // Nodos del orbe: entre 6 y 42, proporcional a la cantidad de skills.
  const orbNodes = Math.min(42, Math.max(6, skillsDetail.length));

  // ── Bloque PERFIL PROFESIONAL: resumen del CV ─────────────────────────
  // La pestaña Perfil puede contener más texto (con scroll interno acotado),
  // así que relajamos el corte a ~600 chars pero lo mantenemos acotado.
  const cvSummary = (profile?.cv_summary ?? '').trim();
  const cvSummaryText = cvSummary.length > 600 ? `${cvSummary.slice(0, 600).trimEnd()}…` : cvSummary;

  // ── Bloque COMPETENCIAS VERIFICADAS: top ~6 competencias ───────────────
  const topSkills = useMemo(() => skillsDetail.slice(0, 6), [skillsDetail]);

  // ── Bloque TRAYECTORIA VERIFICADA: evidencia de tono profesional ───────
  const contractsDone = profile?.total_contracts_completed ?? 0;
  const isVerifiedPro = profile?.is_verified_professional ?? false;
  const evidence: string[] = [];
  if (contractsDone > 0) evidence.push(`${contractsDone} proyectos completados`);
  if (isVerifiedPro) evidence.push('Profesional verificado');

  // ── Descargar credencial como PNG ──────────────────────────────────────
  // Genera una tarjeta compartible (WhatsApp/email) usando canvas 2D. Los
  // acentos usan el color personal del usuario (uc); cada número lleva /100.
  const handleDownload = () => {
    // La tarjeta la dibuja el único dibujante (services/credencialCanvas): acá
    // solo se eligen los datos y se dispara el PNG. El acento es el color del
    // usuario; los ejes salen de los tokens del tema (el canvas lee hex, no var()).
    const href = credentialPng({
      name,
      seniorLabel,
      years,
      reputation,
      accent: uc,
      axes: [
        { label: 'Ejecución', value: axes[0].value, color: uc },
        { label: 'Calidad', value: axes[1].value, color: C.purple },
        { label: 'Trascendencia', value: axes[2].value, color: C.gold },
        { label: 'Fundamento', value: axes[3].value, color: C.green },
      ],
    });
    const a = document.createElement('a');
    a.href = href;
    a.download = 'credencial-omicron.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ═══ SEAM DE ANIMACIÓN (un solo lugar) ════════════════════════════════
  // Transición slide horizontal + fade entre pestañas. La distancia se anula
  // con "reduce motion". FEAT-003 podrá enganchar `drag` en este mismo motion.div
  // sin reestructurar (las variantes reciben `dir` como custom).
  const slide = reduceMotion ? 0 : 44;
  const bodyVariants = {
    enter: (d: 1 | -1) => ({ x: d * slide, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: 1 | -1) => ({ x: -d * slide, opacity: 0 }),
  };
  const bodyTransition = { duration: 0.28, ease: 'easeOut' as const };

  // Marco visual compartido por los tres cuerpos de pestaña.
  const tabPanelStyle: CSSProperties = {
    width: '100%', padding: 16,
    borderRadius: RADIUS.lg, background: C.glass,
    border: `1px solid ${C.line}`,
  };

  // Cuerpo de la pestaña activa (se renderiza uno a la vez).
  const renderTabBody = () => {
    if (tab === 0) {
      // ── Perfil Profesional (cvSummary con scroll interno acotado) ──
      return (
        <section style={{ ...tabPanelStyle, position: 'relative', overflow: 'hidden' }}>
          {/* Barra de acento vertical con la gradiente de la marca personal. */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${uc}, ${C.purple}, ${C.gold})` }} />
          <BlockTitle uc={uc}>Perfil Profesional</BlockTitle>
          {cvSummaryText ? (
            <p style={{ margin: '10px 0 0', maxHeight: 260, overflowY: 'auto', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {cvSummaryText}
            </p>
          ) : (
            <p style={{ margin: '10px 0 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, lineHeight: 1.55 }}>
              Todavía no hay un resumen profesional.
            </p>
          )}
        </section>
      );
    }

    if (tab === 1) {
      // ── Nivel de Competencias (topSkills) ──
      return (
        <section style={{ ...tabPanelStyle, background: C.glass }}>
          <BlockTitle uc={uc}>Nivel de Competencias</BlockTitle>
          {topSkills.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
              {topSkills.map((skill, i) => {
                const pct = Math.round(skill.pct);
                // Estado de DOMINIO (no verificación real): sin flag por-competencia
                // en el tipo, usamos el pct. pct >= 70 → "Dominio alto". Cuando exista
                // verificación real por competencia, cambiar a "Verificada" con su flag.
                const highMastery = pct >= 70;
                return (
                  <div key={`${skill.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>{skill.name}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: highMastery ? uc : C.mut }}>
                      {pct}<span style={{ fontSize: SIZE.xxs, color: C.mut }}>/100</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 96, justifyContent: 'flex-end' }}>
                      {highMastery
                        ? <CheckCircle2 size={13} color={uc} />
                        : <Circle size={13} color={C.mut} />}
                      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.4, color: highMastery ? C.ink : C.mut }}>
                        {highMastery ? 'Dominio alto' : 'En desarrollo'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: '10px 0 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, lineHeight: 1.55 }}>
              Todavía no hay competencias para mostrar.
            </p>
          )}
        </section>
      );
    }

    // ── Trayectoria Verificada (evidencia + 4 ejes) ──
    return (
      <section style={{ ...tabPanelStyle, background: C.glass }}>
        <BlockTitle uc={uc}>Trayectoria Verificada</BlockTitle>

        {/* Evidencia de tono profesional (solo filas con dato > 0). */}
        {evidence.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {evidence.map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color={C.green} />
                <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Los 4 ejes del Gemelo como pieza central de la evidencia medible. */}
        <p style={{ margin: '16px 0 10px', fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.5, color: C.mut, textTransform: 'uppercase' }}>
          Nivel de conocimiento medido
        </p>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {axes.map(({ key, label, value, color, Icon }, i) => {
            const val = Math.round(value);
            return (
              <div
                key={key}
                style={{
                  padding: '12px 12px', borderRadius: RADIUS.md,
                  background: `${color}0d`, border: `1px solid ${color}33`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.5, color: C.mut, textTransform: 'uppercase' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${color}22`, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ delay: 0.25 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 3, background: color, boxShadow: `0 0 5px ${color}66` }}
                    />
                  </div>
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.sm, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>
                    {val}<span style={{ fontSize: SIZE.xxs, fontWeight: 600, color: C.mut }}>/100</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: OMICRON_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 420, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: RADIUS.xl,
          background: `linear-gradient(160deg, ${C.glass2}, ${tint(C.white, 2)})`,
          border: `1px solid ${C.line}`,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: `0 20px 60px ${C.scrim}`,
        }}
      >
        {/* ═══ BRILLO HOLOGRÁFICO (sheen) ═══════════════════════════════
            Banda diagonal de luz que recorre la superficie de la credencial
            para que se lea como un documento holográfico imposible de
            falsificar. Overlay NO interactivo (pointerEvents:'none'),
            recortado por el overflow:'hidden' de la tarjeta y pintado DEBAJO
            de todo el contenido (que fluye por encima). Bajo reduce-motion es
            un único destello estático (sin loop). Solo usa uc + blanco-alfa. */}
        <motion.div
          aria-hidden
          initial={false}
          animate={reduceMotion ? { backgroundPosition: '50% 50%' } : { backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 7.5, ease: SHEEN_EASE, repeat: Infinity, repeatType: 'mirror' }
          }
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            borderRadius: RADIUS.xl,
            pointerEvents: 'none',
            opacity: 0.7,
            backgroundImage: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.10) 45%, ${uc}22 50%, rgba(255,255,255,0.10) 55%, transparent 70%)`,
            backgroundSize: '250% 250%',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* ═══ PATRÓN DE SEGURIDAD (guilloché estático) ═════════════════
            Micro-trama fina de líneas repetidas (estilo guilloché) detrás del
            encabezado, para reforzar la lectura de "documento oficial imposible
            de falsificar". Es 100% ESTÁTICO (sin animación ni loop): un simple
            div decorativo, aria-hidden, no interactivo (pointerEvents:'none'),
            en la misma banda que el sheen (zIndex:0) para que el contenido del
            encabezado (zIndex:1) quede por encima. Recortado por el
            overflow:'hidden' de la tarjeta. Construido SOLO con uc + blanco-alfa
            a muy baja opacidad (nunca C.cyan ni el cian saturado de marca — el
            spec lo proscribe y contratoMapa.test.ts lo vigila). No desplaza ni
            empuja contenido: está posicionado en absoluto sobre la franja superior. */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 260, zIndex: 0,
            pointerEvents: 'none',
            borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`,
            backgroundImage: [
              `repeating-linear-gradient(45deg, ${uc}0a 0px, ${uc}0a 1px, transparent 1px, transparent 7px)`,
              `repeating-linear-gradient(-45deg, ${C.glass} 0px, ${C.glass} 1px, transparent 1px, transparent 7px)`,
              `repeating-radial-gradient(circle at 50% 0%, ${uc}09 0px, ${uc}09 1px, transparent 1px, transparent 11px)`,
            ].join(', '),
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)',
          }}
        />

        {/* ── Barra de acento superior (color del usuario) ── */}
        <div style={{ position: 'relative', zIndex: 1, height: 3, borderRadius: '3px 3px 0 0', background: `linear-gradient(90deg, transparent, ${uc}, transparent)` }} />

        {/* ── Botón cerrar ── */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 32, height: 32, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: C.glass2, border: `1px solid ${C.line}`, color: C.ink,
          }}
        >
          <X size={16} />
        </button>

        {/* ═══ ENCABEZADO FIJO (orbe + identidad + reputación) ═══════════ */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, padding: '24px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* ── Encabezado compacto: orbe pequeño (esquina superior) + identidad ── */}
          {/* El orbe se muestra achicado como "retrato" en la esquina superior
              izquierda (mismo tratamiento que la orbe de carga de OrbShell), de
              modo que no invade ni empuja el nombre. La X de cerrar queda a la
              derecha, así que el orbe va a la izquierda para evitar colisión. */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* ── Orbe como RETRATO contenido (pequeño, esquina) ── */}
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <GeodesicOrb
                size={64}
                spinning={0}
                breathing
                intensity={0.6}
                color={uc}
                nodes={orbNodes}
              />
            </div>

            {/* ── Identidad: eyebrow + nombre + seniority ── */}
            {/* paddingRight deja espacio para la X (top:14 right:14) sin solapar. */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 36 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2.5, color: uc, textTransform: 'uppercase' }}>
                Credencial Ómicrom
              </div>
              <h2 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xl, color: C.ink, letterSpacing: -0.3 }}>
                {name || 'Tu Gemelo Digital'}
              </h2>
              <p style={{ margin: '3px 0 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut }}>
                {seniorLabel}{years > 0 ? ` · ${years} años` : ''}
              </p>
            </div>
          </div>

          {/* ── Reputación ── */}
          <div style={{ width: '100%', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 6 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1, color: C.mut, textTransform: 'uppercase', marginRight: 4 }}>
                Reputación
              </span>
              <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color: uc, letterSpacing: -0.5 }}>
                {reputation}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.sm, color: C.mut }}>/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, marginTop: 8, background: C.glass2, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${reputation}%` }}
                transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3, background: uc, boxShadow: `0 0 6px ${uc}66` }}
              />
            </div>
            {/* Modelo 20/80: la reputación combina credenciales + desempeño demostrado. */}
            <p style={{ margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textAlign: 'left' }}>
              20% credenciales · 80% desempeño demostrado
            </p>
          </div>
        </div>

        {/* ═══ BARRA DE PESTAÑAS (entre encabezado fijo y cuerpo) ════════ */}
        <div
          role="tablist"
          aria-label="Secciones de la credencial"
          style={{
            position: 'relative', zIndex: 1,
            flexShrink: 0, display: 'flex', gap: 4,
            padding: '14px 24px 0', margin: '4px 0 0',
          }}
        >
          {TABS.map((label, i) => {
            const active = tab === i;
            return (
              <button
                key={label}
                role="tab"
                aria-selected={active}
                aria-label={label}
                onClick={() => goTab(i as TabIndex)}
                style={{
                  flex: 1, position: 'relative', cursor: 'pointer',
                  padding: '8px 4px 10px', minHeight: 44,
                  background: 'transparent', border: 'none',
                  fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.6,
                  color: active ? C.ink : C.mut,
                }}
              >
                {label}
                {/* Indicador de pestaña activa (subrayado en el color del usuario). */}
                {active && (
                  <motion.div
                    layoutId="cred-tab-indicator"
                    style={{
                      position: 'absolute', left: 8, right: 8, bottom: 0, height: 2,
                      borderRadius: 2, background: uc, boxShadow: `0 0 6px ${uc}88`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* Separador bajo la barra de pestañas. */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, height: 1, background: C.line, margin: '0 24px' }} />

        {/* ═══ CUERPO PAGINADO (región flexible con scroll acotado) ══════ */}
        {/* SEAM DE ANIMACIÓN: un único motion.div keyed por pestaña. */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px' }}>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={tab}
              custom={dir}
              variants={bodyVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={bodyTransition}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              style={{ width: '100%' }}
            >
              {renderTabBody()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══ INDICADOR DE PAGINADO (3 puntos) ═════════════════════════ */}
        {/* Afordancia sutil de que la credencial se pagina y se puede deslizar.
            El punto activo se tiñe con el color personal (uc); los inactivos
            quedan atenuados. El subrayado de pestaña activa se mantiene igual. */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '10px 0 2px' }}>
          {TABS.map((label, i) => {
            const active = tab === i;
            return (
              <span
                key={label}
                aria-hidden
                style={{
                  width: active ? 7 : 6,
                  height: active ? 7 : 6,
                  borderRadius: '50%',
                  background: active ? uc : C.line,
                  boxShadow: active ? `0 0 6px ${uc}88` : 'none',
                  transition: 'background 0.2s ease',
                }}
              />
            );
          })}
        </div>

        {/* ═══ PIE FIJO (acciones + sello, sin scroll de página) ═════════ */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, padding: '14px 24px 20px', borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* ── Compartir credencial (primario) ── */}
          <button
            onClick={() => username && setShowShare(true)}
            disabled={!username}
            style={{
              width: '100%', minHeight: 44, padding: '13px', borderRadius: RADIUS.lg,
              cursor: username ? 'pointer' : 'not-allowed',
              background: username ? uc : C.glass,
              border: username ? 'none' : `1px solid ${C.line}`,
              color: username ? '#021018' : C.mut,
              fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: username ? 1 : 0.6,
            }}
          >
            <Share2 size={16} /> Compartir
          </button>

          {/* ── Descargar credencial como PNG (secundario) ── */}
          <button
            onClick={handleDownload}
            style={{
              width: '100%', marginTop: 10, padding: '13px', borderRadius: RADIUS.lg,
              cursor: 'pointer',
              background: C.glass,
              border: `1px solid ${C.line}`,
              color: C.ink,
              fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Download size={16} /> Descargar
          </button>

          {/* ── Actualizar CV (terciario, pequeño) ── */}
          {/* Reabre el flujo de carga/actualización de CV (ConvalidaOmicron).
              Estilo deliberadamente más chico y liviano que Compartir/Descargar
              (padding compacto, tipografía menor, color C.mut) para no competir.
              No se condiciona a username: actualizar el CV siempre está disponible
              mientras la credencial esté abierta. onUpdateCV es opcional (?.). */}
          <button
            onClick={() => onUpdateCV?.()}
            style={{
              marginTop: 12, minHeight: 44, padding: '7px 12px', borderRadius: RADIUS.md,
              cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${C.line}`,
              color: C.mut,
              fontFamily: FONT.mono, fontWeight: 600, fontSize: SIZE.xxs, letterSpacing: 0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <RefreshCw size={12} /> Actualizar CV
          </button>

          {!username && (
            <p style={{ margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textAlign: 'center' }}>
              Crea tu usuario público para poder compartir tu credencial.
            </p>
          )}

          {/* ── Cerrar sesión (acción menos prominente, tinte destructivo) ── */}
          {/* Discreta y teñida con C.red. TAP-TO-CONFIRM: primer tap arma la
              confirmación; el segundo ejecuta signOut(). El listener de auth de
              la app baja al usuario a invitado (no navegamos manualmente). La
              transición entre estados usa AnimatePresence con fade/scale sutil,
              y se vuelve instantánea bajo reduce-motion. */}
          <div style={{ marginTop: 12, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <AnimatePresence mode="wait" initial={false}>
              {!confirmingLogout ? (
                <motion.button
                  key="logout-idle"
                  onClick={() => setConfirmingLogout(true)}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                  aria-label="Cerrar sesión"
                  style={{
                    minHeight: 44, padding: '7px 12px', borderRadius: RADIUS.md,
                    cursor: 'pointer',
                    background: `${C.red}14`,
                    border: `1px solid ${C.red}44`,
                    color: C.red,
                    fontFamily: FONT.mono, fontWeight: 600, fontSize: SIZE.xxs, letterSpacing: 0.4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <LogOut size={13} /> Cerrar sesión
                </motion.button>
              ) : (
                <motion.div
                  key="logout-confirm"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <button
                    onClick={() => { void supabase.auth.signOut(); }}
                    aria-label="Confirmar cerrar sesión"
                    style={{
                      minHeight: 44, padding: '7px 12px', borderRadius: RADIUS.md,
                      cursor: 'pointer',
                      background: `${C.red}26`,
                      border: `1px solid ${C.red}`,
                      color: C.red,
                      fontFamily: FONT.mono, fontWeight: 700, fontSize: SIZE.xxs, letterSpacing: 0.4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <LogOut size={13} /> ¿Confirmar salida?
                  </button>
                  <button
                    onClick={() => setConfirmingLogout(false)}
                    aria-label="Cancelar cierre de sesión"
                    style={{
                      minHeight: 44, padding: '7px 8px', borderRadius: RADIUS.md,
                      cursor: 'pointer',
                      background: 'transparent', border: 'none',
                      color: C.mut,
                      fontFamily: FONT.mono, fontWeight: 600, fontSize: SIZE.xxs, letterSpacing: 0.4,
                    }}
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Sello de verificación ── */}
          {/* Beat de autenticidad de UNA SOLA VEZ: al montar, el ícono se
              asienta (scale/opacity) y una única onda anular en C.green se
              expande y se desvanece EXACTAMENTE una vez (sin repeat:Infinity),
              como el "sellado" de la credencial. Bajo reduce-motion el ícono
              queda en su estado final (initial=false) y la onda NO se renderiza.
              El texto permanece IDÉNTICO. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {!reduceMotion && (
                <motion.span
                  aria-hidden
                  initial={{ scale: 0.6, opacity: 0.5 }}
                  animate={{ scale: 2.4, opacity: 0 }}
                  transition={{ delay: 0.35, duration: 0.9, ease: SHEEN_EASE }}
                  style={{
                    position: 'absolute', width: 13, height: 13, borderRadius: '50%',
                    border: `1px solid ${C.green}`, pointerEvents: 'none',
                  }}
                />
              )}
              <motion.span
                initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4, ease: SHEEN_EASE }}
                style={{ display: 'inline-flex' }}
              >
                <CheckCircle2 size={13} color={C.green} />
              </motion.span>
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.5, color: C.mut }}>
              Conocimiento verificable, no declarado
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Modal de compartir (reutiliza QR/link existente) ── */}
      {showShare && username && (
        <ShareCredentialModal username={username} fullName={name} onClose={() => setShowShare(false)} />
      )}
    </motion.div>
  );
}
