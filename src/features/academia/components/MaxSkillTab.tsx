// components/tabs/MaxSkillTab.tsx
// ═══════════════════════════════════════════════════════════════════════
// SKILL GENOME v2 — Pantalla unificada de habilidades.
// NO depende de skill_tree_nodes (tabla vacía). Usa datos REALES del perfil:
// profile.skills, profile.skills_detail, gemelo (4 ejes), cv_summary.
// Incluye: Radar del Gemelo, Skills Duras con %, Skills Blandas inferidas,
// Ruta de Mejora (Coach IA), y Examen integrado por skill.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/infrastructure/supabase/client';
import { useToast } from '@/shared/components/Toast';
import { useBroadcastAchievement } from '@/hooks/useBroadcastAchievement';
import {
  Brain, Zap, Shield, TrendingUp, Sparkles, Target,
  ChevronRight, BookOpen, Award, Star,
  Loader2, MessageCircle,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { asegurarNodoDeExamen, tomarExamenPendiente } from '@/features/redviva/services/examenSkill';
import { C, FONT, RADIUS, tint, SIZE, ELEVATED } from '@/theme';
import {
  oc, OmicronHeader, OmicronCard, ProgressBar,
  ProgressRing, SectionTitle, Chip, OmicronEyebrow,
} from '@/shared/components/OmicronChrome';
import { askOmicron, type OmicronContext } from '@/features/omicron/services/brain';
import { UniversalSimulator } from '@/features/academia/components/UniversalSimulator';
import type { SkillTreeNode } from '@/types';


// ── Constantes ───────────────────────────────────────────────────────
const SYNERGY_GROUPS: Record<string, RegExp> = {
  Frontend: /\b(react|vue|angular|svelte|next|nuxt|html|css|tailwind|framer)\b/i,
  Backend: /\b(node|express|fastify|nest|django|flask|spring|rails|go|rust|java|python|php)\b/i,
  Data: /\b(sql|postgres|mongo|redis|elastic|bigquery|spark|pandas|numpy|tensorflow|pytorch)\b/i,
  Cloud: /\b(aws|azure|gcp|docker|kubernetes|terraform|ci.?cd|devops|jenkins|github.?actions)\b/i,
  Mobile: /\b(react.?native|flutter|swift|kotlin|ios|android|expo)\b/i,
  Design: /\b(figma|sketch|ux|ui|design|adobe|photoshop|illustrator)\b/i,
};

const SOFT_SKILL_KEYWORDS: Record<string, string[]> = {
  Liderazgo: ['liderar', 'liderazgo', 'dirigir', 'equipo', 'gestión de equipo', 'manager', 'lead', 'jefatura', 'coordinar'],
  Comunicación: ['comunicación', 'presentar', 'negociar', 'cliente', 'stakeholder', 'reporting'],
  'Resolución de problemas': ['resolver', 'solución', 'analítico', 'debugging', 'troubleshoot', 'problema'],
  Adaptabilidad: ['adaptab', 'aprender', 'autodidacta', 'versátil', 'multidisciplin'],
  'Trabajo en equipo': ['colaborar', 'equipo', 'agile', 'scrum', 'pair', 'mob programming'],
  Creatividad: ['creativ', 'innovar', 'diseñ', 'prototip', 'ideación'],
  'Gestión de proyectos': ['proyecto', 'deadline', 'planific', 'roadmap', 'sprint', 'kanban', 'jira'],
  Mentoría: ['mentor', 'enseñar', 'capacitar', 'onboarding', 'formación'],
};

function getSynergyGroup(skillName: string): string | null {
  const lower = skillName.toLowerCase();
  for (const [group, regex] of Object.entries(SYNERGY_GROUPS)) {
    if (regex.test(lower)) return group;
  }
  return null;
}

function getSkillLevel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'Experto', color: C.gold };
  if (pct >= 75) return { label: 'Avanzado', color: C.green };
  if (pct >= 55) return { label: 'Intermedio', color: C.cyan };
  if (pct >= 30) return { label: 'Junior', color: C.purple };
  return { label: 'Aprendiz', color: C.mut };
}


function detectSoftSkills(cvSummary: string, skills: string[]): { name: string; confidence: number }[] {
  const text = `${cvSummary} ${skills.join(' ')}`.toLowerCase();
  const detected: { name: string; confidence: number }[] = [];
  for (const [skill, keywords] of Object.entries(SOFT_SKILL_KEYWORDS)) {
    const matches = keywords.filter(k => text.includes(k.toLowerCase()));
    if (matches.length > 0) {
      const confidence = Math.min(95, 40 + matches.length * 18);
      detected.push({ name: skill, confidence });
    }
  }
  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Crea un SkillTreeNode virtual para que UniversalSimulator funcione.
 *
 * ⚠️ LIMITACIÓN CONOCIDA: el id 'virtual-*' NO existe en la tabla
 * skill_tree_nodes, y la Edge Function simulador-universal lo busca ahí
 * (`.eq('id', nodeId)` sobre una columna uuid) → responde 404 'Nodo no
 * encontrado'. O sea: examinar una habilidad arbitraria del CV todavía no
 * funciona de punta a punta. Ver Inc 5 en .tasks/red-viva-plan.md.
 * Por eso la Red Viva solo ofrece "Probarla ahora" cuando la habilidad SÍ existe
 * en el catálogo (ver useExamenDisponible) y entra por makeCatalogNode.
 */
function makeVirtualNode(skillName: string): SkillTreeNode {
  return {
    id: `virtual-${skillName.toLowerCase().replace(/\s+/g, '-')}`,
    title: skillName,
    description: `Validación IA de ${skillName}`,
    category: 'SPECIALIZATION',
    difficulty_level: 3,
    pe_reward: 15,
    estimated_hours: 1,
    icon: 'brain',
    color: C.cyan,
    order_index: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Nodo de examen que SÍ existe en el catálogo: mismo molde que el virtual pero
 * con el uuid real, así la Edge Function lo encuentra y el examen corre de
 * verdad. Lo usa la Red Viva al pedir "Probarla ahora".
 */
function makeCatalogNode(nodeId: string, titulo: string): SkillTreeNode {
  return { ...makeVirtualNode(titulo), id: nodeId, title: titulo };
}

// ── Animaciones Framer Motion ────────────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};
const expand = {
  hidden: { height: 0, opacity: 0 },
  show: { height: 'auto', opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
};


// ── Componente Principal ─────────────────────────────────────────────
export function MaxSkillTab() {
  const { profile, gemelo, setActiveTab, refreshProfile } = useApp();
  const { toast } = useToast();
  const { broadcastAchievement } = useBroadcastAchievement();
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [examNode, setExamNode] = useState<SkillTreeNode | null>(null);
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  // ── Datos derivados ──────────────────────────────────────────────
  const skillsDetail = useMemo(() => {
    const details = profile?.skills_detail ?? [];
    if (details.length > 0) return details.map(d => ({ ...d, estimated: false }));
    // Fallback: si no hay skills_detail, crear desde skills[] con % estimado
    return (profile?.skills ?? []).map((s, i) => ({
      name: s,
      pct: Math.max(30, 85 - i * 8),
      estimated: true,
    }));
  }, [profile?.skills_detail, profile?.skills]);

  const softSkills = useMemo(
    () => detectSoftSkills(profile?.cv_summary ?? '', profile?.skills ?? []),
    [profile?.cv_summary, profile?.skills],
  );

  const totalSkills = skillsDetail.length + softSkills.length;
  const avgDominio = skillsDetail.length > 0
    ? Math.round(skillsDetail.reduce((s, sk) => s + sk.pct, 0) / skillsDetail.length)
    : 0;

  // ── Handlers ─────────────────────────────────────────────────────
  // Validar una habilidad del CV: se consigue el uuid REAL del nodo (creándolo
  // si no existe) para que la Edge Function del simulador lo encuentre. Antes acá
  // se armaba un nodo 'virtual-*' que el backend rechazaba con 404, así que este
  // botón no funcionaba para ninguna habilidad fuera del catálogo.
  const handleValidateSkill = useCallback(async (skillName: string) => {
    const r = await asegurarNodoDeExamen(skillName);
    if (r.ok) {
      setExamNode(makeCatalogNode(r.nodeId, r.titulo));
      return;
    }
    if (r.rpcAusente) {
      // Migración 10002 sin aplicar: se mantiene el comportamiento anterior.
      setExamNode(makeVirtualNode(skillName));
      return;
    }
    toast(r.error, 'info');
  }, [toast]);

  // La Red Viva pide probar una habilidad concreta, con el uuid REAL del nodo.
  //
  // Se atiende por DOS vías a propósito:
  //   • Al MONTAR: el pedido llega desde otra pantalla (el Gemelo), así que el
  //     evento ya se disparó antes de que esta pestaña existiera. El puente en
  //     sessionStorage es el que hace que no se pierda — mismo aprendizaje que el
  //     bug del CV del PR #320.
  //   • Por EVENTO: si esta pestaña ya estaba montada, el examen abre al instante.
  useEffect(() => {
    const pendiente = tomarExamenPendiente();
    if (pendiente) {
      setExamNode(makeCatalogNode(pendiente.nodeId, pendiente.titulo || 'Habilidad'));
    }

    const abrirExamen = (e: Event) => {
      const detail = (e as CustomEvent<{ nodeId?: string; titulo?: string }>).detail;
      if (!detail?.nodeId) return;
      // Consume el puente para que el examen no se reabra en el próximo montaje.
      tomarExamenPendiente();
      setExamNode(makeCatalogNode(detail.nodeId, detail.titulo || 'Habilidad'));
    };
    window.addEventListener('omicron:probar-skill', abrirExamen);
    return () => window.removeEventListener('omicron:probar-skill', abrirExamen);
  }, []);

  const handleAskCoach = useCallback(async () => {
    if (coachLoading) return;
    setCoachLoading(true);
    setCoachAdvice(null);
    try {
      const ctx: OmicronContext = {
        skills: profile?.skills ?? [],
        cv_summary: profile?.cv_summary ?? '',
        execution: gemelo?.execution,
        quality: gemelo?.quality,
        transcendence: gemelo?.transcendence,
        foundation: gemelo?.foundation,
        reputation: gemelo?.overallReputation,
        pe: profile?.pe_points,
        activeTab: 'maxskill',
        displayName: profile?.display_name || profile?.username,
      };
      const result = await askOmicron('Dame un consejo para mejorar mis skills', ctx);
      setCoachAdvice(result.text);
    } catch {
      setCoachAdvice('Error al consultar a Ómicrom. Intenta de nuevo.');
    } finally {
      setCoachLoading(false);
    }
  }, [profile, gemelo, coachLoading]);

  const toggleSkill = useCallback((name: string) => {
    setExpandedSkill(prev => prev === name ? null : name);
  }, []);


  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={oc.root}>
      {/* HEADER */}
      <OmicronHeader
        onBack={() => setActiveTab('perfil')}
        icon={<Brain size={17} />}
        title="Skill Genome"
        subtitle={`${totalSkills} competencias · ${profile?.cv_years_experience ?? 0} años XP`}
      />

      <div style={oc.scroll}>
        <div style={{ padding: '0 14px 100px' }}>

          {/* ════════════ SECCIÓN 1: RADAR DEL GEMELO ════════════ */}
          <SectionTitle icon={<Target size={15} />} color={C.cyan}>
            Tu Gemelo Digital
          </SectionTitle>

          <OmicronCard accent={C.cyan} glow style={{ marginBottom: 16 }}>
            <div style={S.radarGrid}>
              {([
                { key: 'execution', label: 'Ejecución', icon: <Zap size={13} />, color: C.cyan },
                { key: 'quality', label: 'Calidad', icon: <Shield size={13} />, color: C.green },
                { key: 'transcendence', label: 'Trascendencia', icon: <TrendingUp size={13} />, color: C.purple },
                { key: 'foundation', label: 'Fundamento', icon: <BookOpen size={13} />, color: C.gold },
              ] as const).map(axis => (
                <div key={axis.key} style={S.radarItem}>
                  <ProgressRing
                    pct={gemelo?.[axis.key] ?? 0}
                    size={52}
                    stroke={5}
                    color={axis.color}
                  >
                    {gemelo?.[axis.key] ?? 0}
                  </ProgressRing>
                  <div style={S.radarLabel}>
                    <span style={{ color: axis.color, display: 'flex' }}>{axis.icon}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.ink, letterSpacing: 0.4 }}>
                      {axis.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Resumen */}
            <div style={S.radarSummary}>
              <div style={S.radarStat}>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.mut, letterSpacing: 1 }}>REPUTACIÓN</span>
                <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color: C.ink }}>
                  {gemelo?.overallReputation ?? 0}
                </span>
              </div>
              <div style={S.radarStat}>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.mut, letterSpacing: 1 }}>DOMINIO PROM.</span>
                <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color: C.cyan }}>
                  {avgDominio}%
                </span>
              </div>
              <div style={S.radarStat}>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.mut, letterSpacing: 1 }}>PE TOTALES</span>
                <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color: C.gold }}>
                  {profile?.pe_points ?? 0}
                </span>
              </div>
            </div>
          </OmicronCard>


          {/* ════════════ SECCIÓN 2: SKILLS DURAS ════════════ */}
          <SectionTitle icon={<Zap size={15} />} color={C.cyan}
            right={<Chip color={C.cyan}>{skillsDetail.length} skills</Chip>}
          >
            Competencias Técnicas
          </SectionTitle>

          {skillsDetail.length === 0 ? (
            <OmicronCard style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Sparkles size={28} style={{ color: C.mut, marginBottom: 8 }} />
                <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.mut, margin: 0 }}>
                  Sube tu CV para desbloquear tu mapa de habilidades
                </p>
                <button
                  onClick={() => setActiveTab('perfil')}
                  style={S.btnCta}
                >
                  Ir a Perfil
                </button>
              </div>
            </OmicronCard>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}
            >
              {skillsDetail.map(skill => {
                const level = getSkillLevel(skill.pct);
                const synergy = getSynergyGroup(skill.name);
                const isExpanded = expandedSkill === skill.name;

                return (
                  <motion.div key={skill.name} variants={fadeUp}>
                    <OmicronCard
                      onClick={() => toggleSkill(skill.name)}
                      accent={level.color}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Fila principal */}
                      <div style={S.skillRow}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={S.skillName}>{skill.name}</div>
                          <div style={S.skillMeta}>
                            <Chip color={level.color} filled>{level.label}</Chip>
                            {synergy && <Chip color={C.purple} icon={<Star size={9} />}>{synergy}</Chip>}
                            {skill.estimated && <Chip color={C.mut}>Estimado</Chip>}
                          </div>
                        </div>
                        <ProgressRing pct={skill.pct} size={44} stroke={4} color={level.color}>
                          {skill.pct}
                        </ProgressRing>
                      </div>

                      {/* Barra de progreso */}
                      <div style={{ marginTop: 10 }}>
                        <ProgressBar pct={skill.pct} color={level.color} height={6} />
                      </div>

                      {/* Panel expandido */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            variants={expand}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={S.expandedContent}>
                              <div style={S.expandedInfo}>
                                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.mut }}>
                                  Dominio: {skill.pct}% · Nivel: {level.label}
                                  {synergy && ` · Sinergia: ${synergy}`}
                                </span>
                              </div>
                              <button
                                style={S.btnValidar}
                                onClick={(e) => { e.stopPropagation(); void handleValidateSkill(skill.name); }}
                              >
                                <Brain size={14} />
                                Validar con Examen IA
                              </button>
                              <button
                                style={S.btnAcademia}
                                onClick={(e) => { e.stopPropagation(); setActiveTab('academia'); }}
                              >
                                <BookOpen size={14} />
                                Buscar cursos de {skill.name}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Chevron */}
                      <div style={{ ...S.chevron, transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                        <ChevronRight size={14} />
                      </div>
                    </OmicronCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}


          {/* ════════════ SECCIÓN 3: SKILLS BLANDAS ════════════ */}
          {softSkills.length > 0 && (
            <>
              <SectionTitle icon={<MessageCircle size={15} />} color={C.green}
                right={<Chip color={C.green}>{softSkills.length} detectadas</Chip>}
              >
                Habilidades Blandas
              </SectionTitle>

              <OmicronCard accent={C.green} style={{ marginBottom: 16 }}>
                <OmicronEyebrow color={C.mut} style={{ padding: '0 0 10px' }}>
                  Inferidas de tu CV y experiencia
                </OmicronEyebrow>
                <motion.div variants={stagger} initial="hidden" animate="show"
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                >
                  {softSkills.map(ss => (
                    <motion.div key={ss.name} variants={fadeUp}>
                      <div style={S.softPill}>
                        <span style={S.softPillName}>{ss.name}</span>
                        <span style={S.softPillPct}>{ss.confidence}%</span>
                        <div style={{ ...S.softPillBar, width: `${ss.confidence}%` }} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </OmicronCard>
            </>
          )}

          {/* ════════════ SECCIÓN 4: RUTA DE MEJORA (COACH IA) ════════════ */}
          <SectionTitle icon={<Sparkles size={15} />} color={C.gold}>
            Ruta de Mejora
          </SectionTitle>

          <OmicronCard accent={C.gold} glow style={{ marginBottom: 16 }}>
            <div style={S.coachHeader}>
              <div style={S.coachIcon}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.ink }}>
                  Coach IA Personal
                </div>
                <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.mut, marginTop: 2 }}>
                  Recibe un consejo personalizado basado en tu perfil
                </div>
              </div>
            </div>

            {coachAdvice && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={S.coachResult}
              >
                <p style={S.coachText}>{coachAdvice}</p>
              </motion.div>
            )}

            <button
              style={S.btnCoach}
              onClick={handleAskCoach}
              disabled={coachLoading}
            >
              {coachLoading ? (
                <><Loader2 size={15} style={{ animation: 'cp-spin 0.8s linear infinite' }} /> Analizando...</>
              ) : (
                <><Sparkles size={15} /> {coachAdvice ? 'Pedir otro consejo' : 'Pedir consejo de mejora'}</>
              )}
            </button>

            {/* Accesos directos */}
            <div style={S.shortcuts}>
              <button style={S.shortcutBtn} onClick={() => setActiveTab('academia')}>
                <BookOpen size={13} /> Academia
              </button>
            </div>
          </OmicronCard>


          {/* ════════════ SECCIÓN 5: EXAMEN DE RANGO GENERAL ════════════ */}
          <SectionTitle icon={<Award size={15} />} color={C.purple}>
            Examen de Rango
          </SectionTitle>

          <OmicronCard accent={C.purple} style={{ marginBottom: 24 }}>
            <div style={S.rangeInfo}>
              <div style={S.rangeIconWrap}>
                <Award size={22} style={{ color: C.purple }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.ink }}>
                  Defiende tu Gemelo Digital
                </div>
                <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.mut, marginTop: 4, lineHeight: 1.5 }}>
                  La IA evalúa tus competencias principales con un examen exigente.
                  Valida tu reputación y sube tu Ejecución.
                </div>
              </div>
            </div>
            <button
              style={S.btnRange}
              onClick={() => {
                const topSkill = skillsDetail[0]?.name ?? 'General';
                void handleValidateSkill(topSkill);
              }}
            >
              <Brain size={15} /> Iniciar Examen de Rango
            </button>
          </OmicronCard>

        </div>
      </div>

      {/* ════════════ MODAL: EXAMEN IA ════════════ */}
      {examNode && (
        <UniversalSimulator
          node={examNode}
          onClose={() => setExamNode(null)}
          onSuccess={async (_pe, puntajeGlobal) => {
            // Sprint B: Exámenes alimentan el Gemelo Digital
            // Registrar éxito del examen → sube ejes de reputación
            //
            // EL SCORE ES REAL. Antes acá iba `p_score: 80` fijo, así que la
            // escala del Fondo (300 tokens con 70 → 500 con 100) NUNCA se
            // recorría: todos cobraban 366 y dominar pagaba igual que aprobar
            // raspando. Ahora viaja el puntaje que devolvió el simulador.
            // Si por algún motivo no llega, se usa 70: es lo único que el
            // veredicto APROBADO garantiza, y es mejor quedarse corto que
            // inventar un puntaje alto.
            const puntajeReal = Number(puntajeGlobal);
            const score = Number.isFinite(puntajeReal)
              ? Math.max(0, Math.min(100, Math.round(puntajeReal)))
              : 70;
            try {
              // El RPC devuelve también el pago del Fondo de Conocimiento; se
              // ignora a propósito: el Fondo nunca tuvo tokens y la recompensa
              // real de aprobar es la prueba registrada + el PE.
              await supabase.rpc('register_exam_success', {
                p_skill: examNode.title || examNode.id,
                p_score: score,
                p_kind: 'mixed',
              });
            } catch { /* non-blocking: si falla, al menos el PE ya se otorgó */ }
            broadcastAchievement('skill_validated', examNode.title || examNode.id);
            void refreshProfile();
            setExamNode(null);
          }}
        />
      )}
    </div>
  );
}


// ── Estilos inline (design system: C, FONT, RADIUS) ──────────────────
const S: Record<string, React.CSSProperties> = {
  // Radar
  radarGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
    padding: '4px 0 14px',
  },
  radarItem: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  radarLabel: {
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  radarSummary: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
    borderTop: `1px solid ${C.line}`, paddingTop: 12,
  },
  radarStat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  },

  // Skills duras
  skillRow: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  skillName: {
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md,
    color: C.ink, letterSpacing: -0.2,
  },
  skillMeta: {
    display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap',
  },
  chevron: {
    position: 'absolute', top: 16, right: 14, color: C.mut,
    transition: 'transform 0.2s ease',
  },
  expandedContent: {
    paddingTop: 14, marginTop: 12,
    borderTop: `1px solid ${C.line}`,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  expandedInfo: {
    padding: '6px 10px', borderRadius: RADIUS.sm,
    background: C.glass,
  },
  btnValidar: {
    width: '100%', padding: '11px 0', borderRadius: RADIUS.md,
    background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
    border: 'none', color: '#fff',
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    boxShadow: `0 8px 24px ${tint(C.cyan, 30)}`,
  },
  btnAcademia: {
    width: '100%', padding: '10px 0', borderRadius: RADIUS.md,
    background: C.glass, border: `1px solid ${C.line}`,
    color: C.cyan,
    fontFamily: FONT.display, fontWeight: 600, fontSize: SIZE.sm,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  btnCta: {
    marginTop: 14, padding: '10px 24px', borderRadius: RADIUS.md,
    background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
    border: 'none', color: '#fff',
    fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
    cursor: 'pointer',
  },


  // Skills blandas
  softPill: {
    position: 'relative', overflow: 'hidden',
    padding: '8px 12px', borderRadius: RADIUS.pill,
    background: C.glass, border: `1px solid ${C.greenDim}`,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  softPillName: {
    fontFamily: FONT.display, fontWeight: 600, fontSize: SIZE.xs,
    color: C.ink, position: 'relative', zIndex: 1,
  },
  softPillPct: {
    fontFamily: FONT.mono, fontSize: 11, fontWeight: 700,
    color: C.green, position: 'relative', zIndex: 1,
  },
  softPillBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    background: `linear-gradient(90deg, ${C.greenFaint}, transparent)`,
    borderRadius: RADIUS.pill,
  },

  // Coach IA
  coachHeader: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  coachIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    background: `linear-gradient(135deg, ${C.gold}, ${C.purple})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', flexShrink: 0,
    boxShadow: `0 6px 20px ${tint(C.gold, 30)}`,
  },
  coachResult: {
    padding: '12px 14px', borderRadius: RADIUS.md,
    background: C.glass2, border: `1px solid ${C.line}`,
    marginBottom: 12,
  },
  coachText: {
    fontFamily: FONT.body, fontSize: 13, color: C.ink,
    lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap',
  },
  btnCoach: {
    width: '100%', padding: '12px 0', borderRadius: RADIUS.md,
    background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`,
    border: `1px solid ${C.goldDim}`, color: C.gold,
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  shortcuts: {
    display: 'flex', gap: 8, marginTop: 10,
  },
  shortcutBtn: {
    flex: 1, padding: '9px 0', borderRadius: RADIUS.sm,
    background: C.glass, border: `1px solid ${C.line}`,
    color: C.cyan, fontFamily: FONT.mono, fontSize: 11,
    fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },


  // Examen de Rango
  rangeInfo: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14,
  },
  rangeIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    background: C.purpleFaint, border: `1px solid ${C.purpleDim}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  btnRange: {
    width: '100%', padding: '13px 0', borderRadius: RADIUS.md,
    background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`,
    border: 'none', color: '#fff',
    fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    boxShadow: ELEVATED.cta(tint(C.purple, 35)),
  },
};
