// features/gemelo/components/GemeloTab.tsx
// ═══════════════════════════════════════════════════════════════════════
// MI GEMELO DIGITAL — 3 Tarjetas Deslizables (Full-Width)
//
// Card 1: "Mi Identidad" — Orbital solar + Top 3 Skills + Reputación
// Card 2: "Mis Competencias" — Skills con barras de progreso + CV Summary
// Card 3: "Mi Impacto" — 4 Ejes del Gemelo + Accesos directos
//
// El Gemelo es TODO lo que eres y todo lo que podrías ser.
// Cada card ocupa el 100% del ancho visible. Swipe con AnimatePresence.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles, TrendingUp, Zap, Shield, Globe, FileText, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp, useGemeloDigital } from '@/store/AppContext';
import { BLUR, HALO, C, FONT, tint, SIZE, ANIM, LETRA} from '@/theme';
import { audioSweep } from '@/shared/utils/spatialAudio';
import { AuraBackground } from '@/shared/components/AuraSystem';
import { GlowCard, SmoothNumber, MagneticButton } from '@/shared/motion';
import { useGemeloAging } from '@/shared/hooks/useGemeloAging';
import { StreakBanner } from '@/features/academia/components/StreakBanner';
import { DailyChallengeCard } from '@/features/academia/components/DailyChallengeCard';
import { JourneyProgress } from '@/features/gemelo/components/JourneyProgress';
import { DashboardVivo } from '@/features/gemelo/components/DashboardVivo';
import { PushPermissionBanner } from '@/shared/components/PushPermissionBanner';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { bandDisplayFor } from '@/features/omicron/utils/nodeUnlock';
import { RedVivaHome } from '@/features/redviva/components/RedVivaHome';
import { OmicronEmpty } from '@/shared/components/OmicronChrome';
import { Icon } from '@/shared/components/icons';

// ── Ejes del Gemelo. El color del eje "Ejecución" se sustituye por el color del usuario en runtime. ──
const AXIS_META = [
  { key: 'exec', label: 'Ejecución', color: C.cyan, Icon: Zap },
  { key: 'qual', label: 'Calidad', color: C.purple, Icon: Shield },
  { key: 'trans', label: 'Trascendencia', color: C.gold, Icon: Globe },
  { key: 'fund', label: 'Fundamento', color: C.green, Icon: TrendingUp },
] as const;

const CARD_LABELS = ['Identidad', 'Habilidades', 'Impacto'];
const SWIPE_THRESHOLD = 40;
const SWIPE_VELOCITY = 200;

// Variantes de animación para el slide (direction-aware)
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

export function GemeloTab() {
  const { profile, setActiveTab } = useApp();
  const gemelo = useGemeloDigital();
  const uc = useUserColor();
  const [[currentSlide, direction], setSlide] = useState([0, 0]);
  const visitedSlides = useRef(new Set([0]));

  // El color primario de skills y del eje "Ejecución" usa el color elegido por el usuario.
  const skillColors = [uc, C.purple, C.gold, C.green, C.red];
  const axisMeta = AXIS_META.map((a) => (a.key === 'exec' ? { ...a, color: uc } : a));

  const skillsDetail = useMemo(() => {
    const details = profile?.skills_detail ?? [];
    if (details.length > 0) return details;
    return (profile?.skills ?? []).map((s: string, i: number) => ({ name: s, pct: Math.max(30, 85 - i * 8) }));
  }, [profile?.skills_detail, profile?.skills]);

  const top3 = useMemo(() => {
    const sorted = [...skillsDetail].sort((a: { pct: number }, b: { pct: number }) => b.pct - a.pct);
    return sorted.slice(0, 3);
  }, [skillsDetail]);

  const nucleus = top3[0];
  const hasTwo = top3.length >= 2;
  const hasThree = top3.length >= 3;

  const name = profile?.display_name || profile?.full_name || profile?.username || '';
  const years = profile?.cv_years_experience ?? 0;
  const seniorLabel = years >= 10 ? 'Profesional Senior'
    : years >= 5 ? 'Profesional Mid-Senior'
    : years >= 2 ? 'Profesional Mid'
    : 'Profesional';
  const axes = {
    exec: gemelo?.execution ?? profile?.execution_score ?? 0,
    qual: gemelo?.quality ?? profile?.quality_score ?? 0,
    trans: gemelo?.transcendence ?? profile?.transcendence_score ?? 0,
    fund: gemelo?.foundation ?? profile?.foundation_score ?? 0,
  };
  const reputation = gemelo?.overallReputation ?? profile?.reputation_score ?? 0;
  const cvSummary = profile?.cv_summary || '';

  // Gemelo Aging — visual freshness based on activity
  const lastActiveAt = (profile as unknown as Record<string, unknown>).last_active_at as string | undefined;
  const streakDays = (profile as unknown as Record<string, unknown>).streak_days as number | undefined;
  const aging = useGemeloAging({ lastActiveAt, streakDays });

  // ── Slide navigation ──────────────────────────────────────────────────
  const goToSlide = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(2, idx));
    visitedSlides.current.add(clamped);
    setSlide(([prev]) => [clamped, clamped > prev ? 1 : -1]);
    audioSweep();
  }, []);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
      goToSlide(currentSlide + 1);
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
      goToSlide(currentSlide - 1);
    }
  }, [currentSlide, goToSlide]);

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <OmicronEmpty
          icon={<Icon role="gemelo" size={28} />}
          title="Tu Gemelo Digital"
          hint="Crea tu cuenta o inicia sesión para activar tu Gemelo Digital y subir tu CV."
          ctaLabel="Crear cuenta / Iniciar sesión"
          onCta={() => window.dispatchEvent(new CustomEvent('omicron:request-auth'))}
          accent={uc}
        />
      </div>
    );
  }

  // ── Card content renderer ─────────────────────────────────────────────
  const renderCard = (idx: number) => {
    const isRevisit = visitedSlides.current.has(idx) && idx !== 0; // slide 0 se marca en init
    switch (idx) {
      case 0: return <CardIdentidad nucleus={nucleus} top3={top3} hasTwo={hasTwo} hasThree={hasThree} reputation={reputation} skillColors={skillColors} uc={uc} />;
      case 1: return <CardCompetencias skillsDetail={skillsDetail} cvSummary={cvSummary} skipAnimation={isRevisit} skillColors={skillColors} uc={uc} />;
      case 2: return <CardImpacto axes={axes} setActiveTab={setActiveTab} skipAnimation={isRevisit} axisMeta={axisMeta} uc={uc} />;
      default: return null;
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflowY: 'auto', overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
      scrollbarWidth: 'none', // Firefox
      msOverflowStyle: 'none', // IE/Edge
    }} className="scrollbar-hidden">
      {/* ═══ HEADER ═══ */}
      <div style={{ textAlign: 'center', padding: '16px 20px 8px', flexShrink: 0, position: 'relative', ...aging.style }}>
        <AuraBackground axes={{ execution: axes.exec, quality: axes.qual, transcendence: axes.trans, foundation: axes.fund }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: LETRA.anunciada, color: uc, textTransform: 'uppercase', marginBottom: 4 }}>
          Gemelo Digital · Perfil Ómicrom
        </div>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: LETRA.titulo }}>
          {name || 'Tu Gemelo Digital'}
        </h1>
        <p style={{ margin: '2px 0 0', fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut }}>
          {seniorLabel}{years > 0 ? ` · ${years} años` : ''}
        </p>
      </div>

      {/* ═══ TABS / DOTS + ARROWS ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '6px 16px 10px', flexShrink: 0 }}>
        <button onClick={() => goToSlide(currentSlide - 1)} disabled={currentSlide === 0}
          style={{ background: 'none', border: 'none', color: currentSlide === 0 ? C.mut : uc, cursor: 'pointer', padding: 4, opacity: currentSlide === 0 ? 0.3 : 1 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {CARD_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => goToSlide(i)}
              style={{
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                border: i === currentSlide ? `1px solid ${uc}` : `1px solid ${C.line}`,
                background: i === currentSlide ? `${uc}18` : 'transparent',
                color: i === currentSlide ? uc : C.mut,
                fontFamily: FONT.mono, fontSize: 9, fontWeight: 600, letterSpacing: LETRA.denso,
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => goToSlide(currentSlide + 1)} disabled={currentSlide === 2}
          style={{ background: 'none', border: 'none', color: currentSlide === 2 ? C.mut : uc, cursor: 'pointer', padding: 4, opacity: currentSlide === 2 ? 0.3 : 1 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ═══ SWIPEABLE CARD (full width, one at a time) ═══ */}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
          padding: '0 16px',
          boxSizing: 'border-box',
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            style={{
              width: '100%',
              touchAction: 'pan-y',
              cursor: 'grab',
            }}
          >
            {renderCard(currentSlide)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══ SEPARADOR ═══ */}
      <div style={{ width: '100%', padding: '16px 24px 8px', flexShrink: 0 }}>
        <div style={{ height: 1, background: C.line, borderRadius: 1 }} />
      </div>

      {/* ═══ RED VIVA: lo declarado vs. lo probado ═══
          Cada nodo es un dato con nombre: hueco = lo dijo tu CV, sólido = está
          probado, ámbar = el mercado lo pide y no lo tienes. Ver
          .tasks/red-viva-plan.md. */}
      <div style={{ width: '100%', padding: '0 16px 8px', flexShrink: 0 }}>
        <RedVivaHome
          onAbrirTab={(tab) => setActiveTab(tab as Parameters<typeof setActiveTab>[0])}
          onSubirCv={() => window.dispatchEvent(new CustomEvent('omicron:request-cv'))}
        />
      </div>

      <div style={{ width: '100%', padding: '8px 24px', flexShrink: 0 }}>
        <div style={{ height: 1, background: C.line, borderRadius: 1 }} />
      </div>

      {/* ═══ RETENCIÓN (claro y separado) ═══ */}
      <div style={{ width: '100%', padding: '0 16px', flexShrink: 0 }}>
        <JourneyProgress profile={profile} onNavigate={(tab) => setActiveTab(tab as Parameters<typeof setActiveTab>[0])} />
        <StreakBanner />
        <DashboardVivo />
        <DailyChallengeCard onNavigate={(tab) => setActiveTab(tab as Parameters<typeof setActiveTab>[0])} />
        <PushPermissionBanner />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTES DE CADA CARD
// ═══════════════════════════════════════════════════════════════════════

function CardIdentidad({ nucleus, top3, hasTwo, hasThree, reputation, skillColors, uc }: {
  nucleus: { name: string; pct: number } | undefined;
  top3: { name: string; pct: number }[];
  hasTwo: boolean; hasThree: boolean;
  reputation: number;
  skillColors: string[];
  uc: string;
}) {
  const SKILL_COLORS = skillColors;
  // Nivel humano único derivado de la reputación real (solo lectura).
  const level = bandDisplayFor(reputation);
  return (
    <div style={{
      borderRadius: 999, padding: '20px 16px',
      background: `linear-gradient(145deg, ${C.surface}, ${C.glass})`,
      border: `1px solid ${C.line}`,
      backdropFilter: `blur(${BLUR.escarcha}px)`,
      boxShadow: `0 4px 20px ${tint(C.black, 30)}`,
    }}>
      {/* Orbital */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 220, height: 220, margin: '0 auto 16px' }}>
        {hasThree && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${SKILL_COLORS[2]}33`,
            animation: ANIM.orbita,
          }}>
            <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: SKILL_COLORS[2], boxShadow: `0 0 ${HALO.ascua}px ${SKILL_COLORS[2]}` }} />
          </div>
        )}
        {hasTwo && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 30, borderRadius: '50%',
            border: `1.5px solid ${SKILL_COLORS[1]}44`,
            animation: ANIM.orbitaContraria,
          }}>
            <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: SKILL_COLORS[1], boxShadow: `0 0 ${HALO.foco}px ${SKILL_COLORS[1]}` }} />
          </div>
        )}
        {nucleus && (
          <div style={{
            position: 'absolute', inset: 60, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${SKILL_COLORS[0]}44, ${C.bg} 70%)`,
            border: `2px solid ${SKILL_COLORS[0]}88`,
            boxShadow: `0 0 ${HALO.resplandor}px ${SKILL_COLORS[0]}55`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <span style={{ fontFamily: FONT.display, fontSize: SIZE.xxl, fontWeight: 800, color: SKILL_COLORS[0] }}>{nucleus.pct}%</span>
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.etiqueta, color: C.ink, textTransform: 'uppercase', textAlign: 'center', padding: '0 8px', lineHeight: 1.2 }}>{nucleus.name}</span>
          </div>
        )}
      </div>

      {/* Skill labels */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        {top3.map((skill, i) => (
          <div key={skill.name} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 999,
            background: `${SKILL_COLORS[i]}14`, border: `1px solid ${SKILL_COLORS[i]}44`,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: SKILL_COLORS[i], boxShadow: `0 0 ${HALO.chispa}px ${SKILL_COLORS[i]}` }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.ink }}>{skill.name}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: SKILL_COLORS[i], fontWeight: 700 }}>{skill.pct}%</span>
          </div>
        ))}
      </div>

      {/* Nivel (banda humana única) + Reputación */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {/* Nivel: el nombre HUMANO único (Estudiante / Técnico / Arquitecto),
            derivado de la reputación real. Acento en el color del usuario. */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999,
          background: `${uc}14`, border: `1px solid ${uc}33`,
        }}>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.denso, color: C.mut, textTransform: 'uppercase' }}>Nivel</span>
          <span style={{ fontFamily: FONT.display, fontSize: SIZE.xs, fontWeight: 700, color: uc }}>{level.band}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>({level.range}/100)</span>
        </div>
        {/* Reputación */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 999,
          background: `linear-gradient(135deg, ${uc}14, ${C.purpleFaint})`,
          border: `1px solid ${C.line}`,
        }}>
          <Sparkles size={14} color={C.gold} />
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.ink }}>Reputación</span>
          <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: uc }}><SmoothNumber value={Math.round(reputation)} /></span>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.mut }}>/100</span>
        </div>
      </div>
    </div>
  );
}

function CardCompetencias({ skillsDetail, cvSummary, skipAnimation, skillColors, uc }: {
  skillsDetail: { name: string; pct: number }[];
  cvSummary: string;
  skipAnimation?: boolean;
  skillColors: string[];
  uc: string;
}) {
  const SKILL_COLORS = skillColors;
  return (
    <div style={{
      borderRadius: 999, padding: '20px 16px',
      background: `linear-gradient(145deg, ${C.surface}, ${C.glass})`,
      border: `1px solid ${C.line}`,
      backdropFilter: `blur(${BLUR.escarcha}px)`,
      boxShadow: `0 4px 20px ${tint(C.black, 30)}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <FileText size={14} color={uc} />
        <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.ancha, color: uc, textTransform: 'uppercase' }}>CV Verificado</span>
        <CheckCircle2 size={12} color={C.green} />
      </div>

      {/* Skills */}
      <div style={{
        borderRadius: 14, padding: '14px 14px 10px',
        background: `linear-gradient(135deg, ${C.glass}, ${uc}14)`,
        border: `1px solid ${C.line}`, marginBottom: cvSummary ? 12 : 0,
      }}>
        {skillsDetail.slice(0, 7).map((skill, i) => (
          <div key={skill.name} style={{ marginBottom: i < Math.min(skillsDetail.length, 7) - 1 ? 8 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: SIZE.xs, color: C.ink }}>{skill.name}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: SKILL_COLORS[i % SKILL_COLORS.length], fontWeight: 700 }}>{skill.pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: C.glass2, overflow: 'hidden' }}>
              <motion.div
                initial={skipAnimation ? false : { width: 0 }}
                animate={{ width: `${skill.pct}%` }}
                transition={skipAnimation ? { duration: 0 } : { delay: 0.2 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: 3,
                  background: `linear-gradient(90deg, ${SKILL_COLORS[i % SKILL_COLORS.length]}cc, ${SKILL_COLORS[(i + 1) % SKILL_COLORS.length]}88)`,
                  boxShadow: `0 0 ${HALO.chispa}px ${SKILL_COLORS[i % SKILL_COLORS.length]}44`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* CV Summary */}
      {cvSummary && (
        <div style={{
          borderRadius: 12, padding: '12px 14px',
          background: C.glass, border: `1px solid ${C.line}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, borderRadius: 1, background: `linear-gradient(to bottom, ${uc}, ${C.purple}, ${C.gold})`, opacity: 0.6 }} />
          <div style={{ paddingLeft: 12 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: LETRA.ancha, color: C.mut, textTransform: 'uppercase', marginBottom: 6 }}>Resumen IA</div>
            <p style={{ margin: 0, fontFamily: FONT.body, fontSize: SIZE.xs, lineHeight: 1.55, color: C.ink, whiteSpace: 'pre-wrap' }}>
              {cvSummary.slice(0, 300)}{cvSummary.length > 300 ? '…' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CardImpacto({ axes, setActiveTab, skipAnimation, axisMeta, uc }: {
  axes: { exec: number; qual: number; trans: number; fund: number };
  setActiveTab: (tab: 'maxskill' | 'academia') => void;
  skipAnimation?: boolean;
  axisMeta: { key: string; label: string; color: string; Icon: LucideIcon }[];
  uc: string;
}) {
  return (
    <div style={{
      borderRadius: 999, padding: '20px 16px',
      background: `linear-gradient(145deg, ${C.surface}, ${C.glass})`,
      border: `1px solid ${C.line}`,
      backdropFilter: `blur(${BLUR.escarcha}px)`,
      boxShadow: `0 4px 20px ${tint(C.black, 30)}`,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Globe size={14} color={C.gold} />
        <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.ancha, color: C.gold, textTransform: 'uppercase' }}>4 Ejes del Gemelo Digital</span>
      </div>

      {/* 4 Axes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {axisMeta.map(({ key, label, color, Icon }) => {
          const val = axes[key as keyof typeof axes] ?? 0;
          return (
            <GlowCard key={key} color={color} intensity={0.1} style={{ padding: '12px 12px', borderRadius: 14, background: `${color}08`, border: `1px solid ${color}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={13} color={color} />
                <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: LETRA.denso, color: C.mut, textTransform: 'uppercase' }}>{label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${color}22` }}>
                  <motion.div
                    initial={skipAnimation ? false : { width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={skipAnimation ? { duration: 0 } : { delay: 0.3, duration: 0.7, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 3, background: color, boxShadow: `0 0 ${HALO.chispa}px ${color}66` }}
                  />
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color, minWidth: 26, textAlign: 'right' }}>{val}<span style={{ fontSize: 9, fontWeight: 600, color: C.mut }}>/100</span></span>
              </div>
            </GlowCard>
          );
        })}
      </div>

      {/* Accesos directos */}
      <div style={{ display: 'flex', gap: 10 }}>
        <MagneticButton onClick={() => setActiveTab('maxskill')} style={{
          flex: 1, padding: '12px 0', borderRadius: 12,
          background: C.glass, border: `1px solid ${uc}29`, color: uc,
          fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, letterSpacing: LETRA.denso,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Zap size={13} /> Habilidades
        </MagneticButton>
        <MagneticButton onClick={() => setActiveTab('academia')} style={{
          flex: 1, padding: '12px 0', borderRadius: 12,
          background: C.glass, border: `1px solid ${C.purpleFaint}`, color: C.purple,
          fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, letterSpacing: LETRA.denso,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <TrendingUp size={13} /> Academia
        </MagneticButton>
      </div>
    </div>
  );
}
