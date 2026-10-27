import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, BookOpen, CheckCircle2, Lock, Award, Loader2,
  ChevronDown, Sparkles, Target,
  Bot, Send, X,
} from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useBroadcastAchievement } from '@/hooks/useBroadcastAchievement';
import { useApp } from '@/store/AppContext';
import { C, FONT, BASE, RADIUS, GLOW, cx, tint, SIZE } from '@/theme';
import { audioAscend } from '@/shared/utils/spatialAudio';
import { firePulse } from '@/shared/components/LivePulseBar';
import { CelebrationBurst } from '@/shared/motion';
import { oc, OmicronHeader, OmicronLoading, OmicronEmpty } from '@/shared/components/OmicronChrome';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { useToast } from '@/shared/components/Toast';

interface Course {
  id: string; node_id: string | null; title: string; description: string;
  cover_emoji: string; difficulty: number; passing_score: number; order_index: number;
}
interface Lesson { id: string; title: string; content: string; video_url: string | null; order_index: number; }
interface QuizQ { id: string; question: string; options: string[]; order_index: number; }
interface Prog { course_id: string; status: string; quiz_passed: boolean; }

const DIFF_LABEL = ['', 'Inicial', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 4, background: C.glass2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${C.cyan})`, boxShadow: GLOW.cyan, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// Tutor IA: gratis para siempre, sin candado Premium.
function TutorModal({ lesson, onClose }: { lesson: { title: string; content: string }; onClose: () => void }) {
  const { profile } = useApp();
  const uc = useUserColor();
  const [msgs, setMsgs] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(q?: string) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput('');
    const base = [...msgs, { role: 'user' as const, text: question }];
    setMsgs(base);
    setLoading(true);
    try {
      const { askOmicron } = await import('@/features/omicron/services/brain');
      const result = await askOmicron(
        `[Lección: ${lesson.title}] ${question}`,
        { skills: profile?.skills ?? [], cv_summary: profile?.cv_summary ?? '', activeTab: 'academia', displayName: profile?.display_name || profile?.username },
      );
      const answer = result.text;
      setMsgs([...base, { role: 'model', text: answer }]);
    } catch {
      setMsgs([...base, { role: 'model', text: 'Error de conexión con el Tutor.' }]);
    } finally {
      setLoading(false);
    }
  }

  const chips = ['Explícamelo más simple', 'Dame un ejemplo', 'Hazme un ejercicio'];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: C.overlay, backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        borderRadius: RADIUS.xl, background: `linear-gradient(165deg, ${C.surfaceLight}, ${C.surface})`,
        border: `1px solid ${C.gold}55`, boxShadow: `0 20px 60px ${C.scrim}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.gold}18`, border: `1px solid ${C.gold}55` }}>
            <Bot size={18} style={{ color: C.gold }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink }}>Tutor IA</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.title}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.glass2, border: `1px solid ${C.cyanDim}`, color: C.cyan }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 200, maxHeight: '54vh', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, lineHeight: 1.5 }}>
              👋 Soy tu tutor. Pregúntame lo que no entiendas de <strong style={{ color: C.ink }}>{lesson.title}</strong>.
            </div>
          )}
          {msgs.map((m, i) => {
            const own = m.role === 'user';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 13px', borderRadius: 12,
                  background: own ? `${uc}1f` : `${C.gold}12`,
                  border: `1px solid ${own ? `${uc}66` : C.gold + '40'}`,
                  borderTopRightRadius: own ? 3 : 12, borderTopLeftRadius: own ? 12 : 3,
                }}>
                  <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</p>
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.gold, fontFamily: FONT.mono, fontSize: 11 }}>
              <Loader2 size={14} className="animate-spin" /> El tutor está pensando...
            </div>
          )}
        </div>

        {msgs.length === 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px 8px' }}>
            {chips.map(ch => (
              <button key={ch} onClick={() => ask(ch)} style={{
                fontFamily: FONT.mono, fontSize: 11, color: C.cyan, cursor: 'pointer',
                background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, borderRadius: 16, padding: '6px 11px',
              }}>{ch}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.cyanFaint}` }}>
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) ask(); }}
            placeholder="Escribe tu duda..."
            style={{ flex: 1, padding: '11px 14px', borderRadius: 11, background: C.glass, border: `1px solid ${C.cyanFaint}`, color: C.ink, fontFamily: FONT.body, fontSize: 13, outline: 'none' }}
          />
          <button onClick={() => ask()} disabled={!input.trim() || loading}
            style={{ width: 44, height: 44, borderRadius: 11, background: C.gold, border: 'none', color: C.onAccent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || loading ? 0.4 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Coach IA: gratis para siempre, sin candado Premium.
function CoachModal({ onClose }: { onClose: () => void }) {
  const { profile } = useApp();
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true); setAdvice(null);
    try {
      const { askOmicron } = await import('@/features/omicron/services/brain');
      const result = await askOmicron('Dame un consejo de qué estudiar para mejorar', {
        skills: profile?.skills ?? [],
        cv_summary: profile?.cv_summary ?? '',
        activeTab: 'academia',
        displayName: profile?.display_name || profile?.username,
      });
      setAdvice(result.text);
    } catch {
      setAdvice('Error de conexión con el Coach IA.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { run(); }, [run]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: C.overlay, backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        borderRadius: RADIUS.xl, background: `linear-gradient(165deg, ${C.surfaceLight}, ${C.surface})`,
        border: `1px solid ${C.cyan}55`, boxShadow: `0 20px 60px ${C.scrim}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.cyan}18`, border: `1px solid ${C.cyan}55` }}>
            <GraduationCap size={18} style={{ color: C.cyan }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink }}>Coach IA</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>Tu diagnostico y proximo paso</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.glass2, border: `1px solid ${C.cyanDim}`, color: C.cyan, fontSize: 20, lineHeight: 1 }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 180, maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 0' }}>
              <Loader2 size={24} style={{ color: C.cyan }} className="animate-spin" />
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: 1 }}>ANALIZANDO TU PERFIL...</span>
            </div>
          ) : (
            <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{advice}</p>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.cyanFaint}` }}>
          <button onClick={run} disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: loading ? 'wait' : 'pointer',
            background: C.cyan, border: 'none', color: C.onAccent, fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.5 : 1,
          }}><Sparkles size={15} /> VOLVER A ANALIZAR</button>
        </div>
      </div>
    </div>
  );
}

export function AcademiaTab() {
  const { profile, refreshProfile, setActiveTab } = useApp();
  const { toast } = useToast();
  const { broadcastAchievement } = useBroadcastAchievement();
  const uc = useUserColor();
  const [courses, setCourses] = useState<Course[]>([]);
  const [prog, setProg] = useState<Map<string, Prog>>(new Map());
  const [counts, setCounts] = useState<Map<string, { total: number; done: number }>>(new Map());
  const [nodes, setNodes] = useState<Map<string, { title: string; color: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [doneLessons, setDoneLessons] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  // Tutor IA / Coach IA: gratis para siempre, sin candado Premium.
  const [tutor, setTutor] = useState<Lesson | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [view, setView] = useState<'list' | 'course' | 'quiz'>('list');

  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  // El catálogo es público: un invitado también lo ve. Lo único que se saltea
  // es el progreso, que necesita un user_id. Antes el early-return por falta de
  // perfil dejaba `loading` en true para siempre y el invitado nunca llegaba a
  // la primera lección.
  const loadCourses = useCallback(async () => {
    const { data: cs } = await supabase
      .from('academy_courses').select('*').eq('is_published', true).order('order_index');
    const courseList = (cs as Course[]) ?? [];
    setCourses(courseList);

    const { data: ps } = profile
      ? await supabase
        .from('user_course_progress').select('course_id,status,quiz_passed').eq('user_id', profile.id)
      : { data: null };
    setProg(new Map(((ps as Prog[]) ?? []).map(p => [p.course_id, p])));

    const { data: allLessons } = await supabase.from('course_lessons').select('id,course_id');
    const { data: doneRows } = profile
      ? await supabase.from('user_lesson_progress').select('lesson_id')
      : { data: null };
    const doneSet = new Set(((doneRows as { lesson_id: string }[]) ?? []).map(d => d.lesson_id));
    const m = new Map<string, { total: number; done: number }>();
    ((allLessons as { id: string; course_id: string }[]) ?? []).forEach(l => {
      const c = m.get(l.course_id) ?? { total: 0, done: 0 };
      c.total += 1;
      if (doneSet.has(l.id)) c.done += 1;
      m.set(l.course_id, c);
    });
    setCounts(m);

    const nodeIds = [...new Set(courseList.map(c => c.node_id).filter(Boolean))] as string[];
    if (nodeIds.length) {
      const { data: nd } = await supabase.from('skill_tree_nodes').select('id,title,color').in('id', nodeIds);
      setNodes(new Map(((nd as { id: string; title: string; color: string }[]) ?? []).map(n => [n.id, { title: n.title, color: n.color }])));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  async function openCourse(c: Course) {
    setCourse(c); setView('course'); setResult(null); setAnswers({}); setExpanded(null);
    const { data: ls } = await supabase
      .from('course_lessons').select('*').eq('course_id', c.id).order('order_index');
    const lessonList = (ls as Lesson[]) ?? [];
    setLessons(lessonList);
    if (profile && lessonList.length) {
      const { data: done } = await supabase
        .from('user_lesson_progress').select('lesson_id')
        .in('lesson_id', lessonList.map(l => l.id));
      setDoneLessons(new Set(((done as { lesson_id: string }[]) ?? []).map(d => d.lesson_id)));
      const firstPending = lessonList.find(l => !((done as { lesson_id: string }[]) ?? []).some(d => d.lesson_id === l.id));
      setExpanded(firstPending?.id ?? lessonList[0]?.id ?? null);
    } else {
      setDoneLessons(new Set());
      setExpanded(lessonList[0]?.id ?? null);
    }
  }

  async function completeLesson(lessonId: string) {
    if (!profile) { window.dispatchEvent(new Event('omicron:request-auth')); return; }
    const { error } = await supabase.rpc('mark_lesson_complete', { p_lesson_id: lessonId });
    if (error) {
      toast('No se pudo completar la lección: ' + error.message, 'error');
      return;
    }
    broadcastAchievement('lesson_completed', course?.title);
    setDoneLessons(prev => new Set(prev).add(lessonId));
    const idx = lessons.findIndex(l => l.id === lessonId);
    const next = lessons[idx + 1];
    setExpanded(next ? next.id : null);
  }

  async function startQuiz() {
    if (!course) return;
    if (!profile) { window.dispatchEvent(new Event('omicron:request-auth')); return; }
    const { data } = await supabase.rpc('get_course_quiz', { p_course_id: course.id });
    setQuestions((data as QuizQ[]) ?? []);
    setAnswers({});
    setResult(null);
    setView('quiz');
  }

  async function submit() {
    if (!course || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_quiz', { p_course_id: course.id, p_answers: answers });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      setResult({ score: r.score, passed: r.passed });
      await loadCourses();
      if (r.passed) {
        broadcastAchievement('course_completed', course.title);
        audioAscend(); firePulse('success'); await refreshProfile();
      }
    } catch (e) {
      toast('No se pudo enviar el quiz: ' + ((e as Error).message ?? e), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function backToList() {
    setView('list'); setCourse(null); setLessons([]); setQuestions([]); setResult(null); setAnswers({}); setExpanded(null);
  }

  if (loading) return <OmicronLoading message="Cargando tus cursos…" />;

  if (view === 'list') {
    const totalDone = [...counts.values()].reduce((s, c) => s + c.done, 0);
    const totalAll = [...counts.values()].reduce((s, c) => s + c.total, 0);
    const completed = courses.filter(c => prog.get(c.id)?.status === 'COMPLETED').length;

    return (
      <div style={oc.root}>
        <OmicronHeader
          onBack={() => setActiveTab('perfil')}
          icon={<GraduationCap size={17} />}
          title="Academia"
          subtitle="Aprende y valida tus nodos"
        />
        <div style={cx(BASE.scrollArea, { padding: '12px 2px 20px' })}>
          {!profile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              borderRadius: RADIUS.lg, padding: 12, marginBottom: 14,
              background: C.glass, border: `1px solid ${C.cyan}44`,
            }}>
              <span style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.cyanDim, flex: 1, minWidth: 160, lineHeight: 1.4 }}>
                Estás como invitado: podés leer los cursos, pero crear tu cuenta es lo que guarda tu progreso en el Gemelo.
              </span>
              <button onClick={() => window.dispatchEvent(new Event('omicron:request-auth'))} style={{
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer', flexShrink: 0,
                background: uc, border: 'none', color: C.onAccent,
                fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xs,
              }}>Crear cuenta</button>
            </div>
          )}

          <button onClick={() => setCoachOpen(true)} style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            borderRadius: RADIUS.xl, padding: 16, marginBottom: 16, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${uc}1a, ${C.gold}12)`,
            border: `1px solid ${uc}55`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${uc}18`, border: `1px solid ${uc}55` }}>
                <GraduationCap size={22} style={{ color: uc }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink }}>Coach IA · ¿Qué estudio ahora?</div>
                <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.cyanDim, marginTop: 2, lineHeight: 1.35 }}>
                  Analiza tu Gemelo, tu CV y tus habilidades, y te dice tu brecha y el curso ideal. 🧭
                </div>
              </div>
              <Sparkles size={18} style={{ color: C.gold, flexShrink: 0 }} />
            </div>
          </button>

          {courses.length === 0 ? (
            <OmicronEmpty
              icon={<BookOpen size={30} />}
              title="Aún no hay cursos"
              hint="Pronto los docentes publicarán cursos aquí. Mientras tanto, gana Fundamento validando nodos en el Árbol de Habilidades."
              ctaLabel="Ir al Árbol de Habilidades"
              onCta={() => setActiveTab('maxskill')}
            />
          ) : (
            <div style={{ position: 'relative' }}>
              {/* ── Recomendación según skills débiles ── */}
              {(() => {
                const weakSkills = (profile?.skills_detail ?? [])
                  .filter(s => s.pct < 50)
                  .sort((a, b) => a.pct - b.pct)
                  .slice(0, 3);
                if (weakSkills.length === 0) return null;
                const weakNames = weakSkills.map(s => s.name.toLowerCase());
                const recommended = courses.filter(c => {
                  const node = c.node_id ? nodes.get(c.node_id) : null;
                  const tags = [c.title, c.description, node?.title ?? ''].join(' ').toLowerCase();
                  return weakNames.some(w => tags.includes(w)) && prog.get(c.id)?.status !== 'COMPLETED';
                }).slice(0, 2);
                if (recommended.length === 0) return null;
                return (
                  <div style={{
                    borderRadius: 14, padding: 14, marginBottom: 14,
                    background: `linear-gradient(135deg, ${C.gold}14, ${C.gold}08)`,
                    border: `1px solid ${C.gold}44`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Target size={15} style={{ color: C.gold }} />
                      <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xs, color: C.gold }}>RECOMENDADO PARA TI</span>
                    </div>
                    <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.cyanDim, lineHeight: 1.4, marginBottom: 8 }}>
                      Según tus skills débiles ({weakSkills.map(s => s.name).join(', ')}):
                    </div>
                    {recommended.map(c => (
                      <button key={c.id} onClick={() => openCourse(c)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                        padding: '8px 10px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                        background: C.glass, border: `1px solid ${C.gold}33`,
                      }}>
                        <span style={{ fontSize: SIZE.lg }}>{c.cover_emoji}</span>
                        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xs, color: C.ink }}>{c.title}</span>
                        <Sparkles size={12} style={{ color: C.gold, marginLeft: 'auto' }} />
                      </button>
                    ))}
                  </div>
                );
              })()}
              <div style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: uc, marginBottom: 12 }}>◆ NÚCLEO DE APRENDIZAJE</div>

              {/* Sistema Solar del Aprendizaje · mismo Núcleo de partículas de toda la app (Ómicrom unificado) */}
              <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 6px' }}
                role="img" aria-label={`Progreso de aprendizaje ${totalAll ? Math.round((totalDone / totalAll) * 100) : 0} por ciento`}>
                <GeodesicOrb size={110} nodes={totalAll && totalDone >= totalAll ? 42 : 12} color={uc} spinning={20} intensity={totalAll && totalDone >= totalAll ? 0.9 : 0.5} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center', lineHeight: 1 }}>
                    <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc, letterSpacing: 2 }}>NÚCLEO</span>
                    <span style={{ display: 'block', fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: '#ffffff', margin: '3px 0', textShadow: `0 0 18px ${uc}` }}>{totalAll ? Math.round((totalDone / totalAll) * 100) : 0}%</span>
                    <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: tint(C.white, 75), letterSpacing: 1 }}>{completed}/{courses.length} CURSOS</span>
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative', paddingTop: 4 }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 18, width: 2, transform: 'translateX(-50%)', backgroundImage: `repeating-linear-gradient(to bottom, ${C.cyan} 0, ${C.cyan} 5px, transparent 5px, transparent 12px)`, backgroundSize: '2px 12px', animation: 'busFlow 0.7s linear infinite', opacity: 0.55 }} />

                {courses.map((c, i) => {
                  const p = prog.get(c.id);
                  const lc = counts.get(c.id) ?? { total: 0, done: 0 };
                  const pct = lc.total ? Math.round((lc.done / lc.total) * 100) : 0;
                  const done = p?.status === 'COMPLETED';
                  const inProgress = !done && lc.done > 0;
                  const accent = done ? C.green : inProgress ? C.cyan : C.gold;
                  const statusLabel = done ? 'COMPLETADO' : inProgress ? 'EN CURSO' : 'NUEVO';
                  const left = i % 2 === 0;
                  return (
                    <div key={c.id} style={{ position: 'relative', minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: left ? 'flex-start' : 'flex-end' }}>
                      <span style={{ position: 'absolute', top: '50%', height: 2, background: accent, boxShadow: `0 0 6px ${accent}`, left: left ? '44%' : '50%', width: '6%' }} />
                      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: accent, border: `2px solid ${C.bg}`, boxShadow: `0 0 10px ${accent}`, zIndex: 3, animation: inProgress ? 'corePulse 1.8s ease-in-out infinite' : undefined }} />
                      <button onClick={() => openCourse(c)} className="oc-card oc-pressable oc-rise" style={{
                        width: '44%', textAlign: 'left', cursor: 'pointer', position: 'relative', zIndex: 2,
                        borderRadius: 14, padding: 11,
                        background: `linear-gradient(165deg, ${C.surfaceLight}, ${C.surface})`,
                        border: `1px solid ${accent}66`, boxShadow: `0 0 16px ${accent}26`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: SIZE.xl, flexShrink: 0 }}>{c.cover_emoji}</span>
                          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.15 }}>{c.title}</span>
                        </div>
                        <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: accent, letterSpacing: 0.5, marginTop: 6 }}>{statusLabel} · {DIFF_LABEL[c.difficulty] ?? 'Curso'} · {lc.done}/{lc.total}</div>
                        <div style={{ marginTop: 5 }}><Bar pct={pct} color={accent} /></div>
                      </button>
                    </div>
                  );
                })}
              </div>

              <style>{`
                @keyframes busFlow { 0% { background-position: 0 0; } 100% { background-position: 0 12px; } }
                @keyframes corePulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
              `}</style>
            </div>
          )}
        </div>
        {coachOpen && <CoachModal onClose={() => setCoachOpen(false)} />}
      </div>
    );
  }

  if (view === 'course' && course) {
    const allDone = lessons.length > 0 && lessons.every(l => doneLessons.has(l.id));
    const pct = lessons.length ? Math.round((doneLessons.size / lessons.length) * 100) : 0;
    return (
      <div style={oc.root}>
        <OmicronHeader
          onBack={backToList}
          title={`${course.cover_emoji} ${course.title}`}
          subtitle={`${doneLessons.size}/${lessons.length} lecciones · ${pct}%`}
        />

        <div style={{ padding: '10px 2px 0', flexShrink: 0 }}>
          <Bar pct={pct} color={allDone ? C.green : C.cyan} />
        </div>

        <div style={cx(BASE.scrollArea, { padding: '14px 2px' })}>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginBottom: 16, lineHeight: 1.5 }}>{course.description}</p>

          {lessons.map((l, i) => {
            const done = doneLessons.has(l.id);
            const isOpen = expanded === l.id;
            const accent = done ? C.green : C.cyan;
            return (
              <div key={l.id} style={{
                borderRadius: RADIUS.lg, marginBottom: 10, overflow: 'hidden',
                background: C.surfaceLight, border: `1px solid ${done ? C.green + '44' : C.glass2}`,
              }}>
                <button onClick={() => setExpanded(isOpen ? null : l.id)} style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none',
                  padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${accent}14`, border: `1px solid ${accent}55`,
                  }}>
                    {done ? <CheckCircle2 size={15} style={{ color: C.green }} /> : <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: accent }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.ink }}>{l.title}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.cyanDim, marginTop: 1 }}>
                      LECCIÓN {i + 1}{done ? ' · LEÍDA' : ''}
                    </div>
                  </div>
                  <ChevronDown size={17} style={{ color: C.cyanDim, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
                </button>

                {isOpen && (
                  <div style={{ padding: '0 14px 14px', animation: 'acaIn 0.3s ease' }}>
                    <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.ink, lineHeight: 1.6, margin: '0 0 12px' }}>{l.content}</p>
                    {!done ? (
                      <button onClick={() => completeLesson(l.id)} style={{
                        fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: C.onAccent,
                        background: C.cyan, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                      }}><CheckCircle2 size={14} /> MARCAR LEÍDA</button>
                    ) : (
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.green, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} /> Completada
                      </span>
                    )}
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => setTutor(l)} style={{
                        fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: C.gold,
                        background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '8px 14px',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                      }}><Sparkles size={14} /> PREGÚNTALE AL TUTOR IA</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{
            marginTop: 14, borderRadius: RADIUS.xl, padding: 16,
            background: allDone ? `${C.gold}10` : C.glass,
            border: `1px solid ${allDone ? C.gold + '55' : C.glass2}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} style={{ color: allDone ? C.gold : C.cyanDim }} />
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: allDone ? C.gold : C.cyanDim }}>Quiz final</span>
            </div>
            <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: SIZE.xs, color: C.cyanDim, lineHeight: 1.4 }}>
              Aprueba con {course.passing_score}% para validar {course.node_id && nodes.get(course.node_id)
                ? <strong style={{ color: C.gold }}>la habilidad "{nodes.get(course.node_id)!.title}"</strong>
                : <strong style={{ color: C.cyan }}>el nodo</strong>} en tu Árbol y subir tu <strong style={{ color: C.cyan }}>Fundamento</strong> del Gemelo Digital. 🧬
            </p>
            <button onClick={startQuiz} disabled={!allDone} style={{
              width: '100%', padding: '13px', borderRadius: RADIUS.lg, cursor: allDone ? 'pointer' : 'not-allowed',
              background: allDone ? C.gold : 'transparent', border: `1px solid ${allDone ? C.gold : C.cyanFaint}`,
              color: allDone ? C.onAccent : C.cyanDim, fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {allDone ? <><Award size={15} /> RENDIR QUIZ FINAL</> : <><Lock size={14} /> COMPLETA LAS LECCIONES</>}
            </button>
          </div>
        </div>

        <style>{`@keyframes acaIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {tutor && <TutorModal lesson={{ title: tutor.title, content: tutor.content }} onClose={() => setTutor(null)} />}
      </div>
    );
  }

  return (
    <div style={oc.root}>
      <OmicronHeader
        onBack={() => setView('course')}
        icon={<Sparkles size={17} />}
        accent={C.gold}
        title="Quiz final"
        subtitle={course?.title}
      />

      <div style={cx(BASE.scrollArea, { padding: '14px 2px' })}>
        {result ? (
          <div style={{ textAlign: 'center', padding: '30px 16px', position: 'relative' }}>
            <CelebrationBurst trigger={result.passed} />
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: result.passed ? `${C.green}1a` : `${C.red}1a`,
              border: `2px solid ${result.passed ? C.green : C.red}`,
            }}>
              {result.passed ? <CheckCircle2 size={40} style={{ color: C.green }} /> : <Lock size={36} style={{ color: C.red }} />}
            </div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: result.passed ? C.green : C.red }}>{result.score}%</div>
            <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: result.passed ? C.green : C.red, letterSpacing: 1, marginTop: 4 }}>
              {result.passed ? '¡APROBADO!' : 'NO APROBADO'}
            </div>
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginTop: 12, maxWidth: 280, marginInline: 'auto', lineHeight: 1.5 }}>
              {result.passed
                ? '🔓 Nodo validado en tu árbol. Tu Fundamento (Gemelo Digital) subió. ¡Bien hecho!'
                : `Necesitas ${course?.passing_score}% para aprobar. Repasa las lecciones e inténtalo de nuevo.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 20 }}>
              {result.passed && (
                <button onClick={() => setActiveTab('maxskill')} style={{
                  padding: '11px 22px', borderRadius: 12, cursor: 'pointer',
                  background: C.gold, border: 'none', color: C.onAccent,
                  fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}><Target size={14} /> VER EN EL ÁRBOL</button>
              )}
              <button onClick={result.passed ? backToList : () => setView('course')} style={{
                padding: '11px 22px', borderRadius: 12, cursor: 'pointer',
                background: `${C.cyan}18`, border: `1px solid ${C.cyan}`, color: C.cyan,
                fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, fontWeight: 700,
              }}>{result.passed ? 'VOLVER A CURSOS' : 'REINTENTAR'}</button>
            </div>
          </div>
        ) : (
          <>
            {questions.map((q, qi) => (
              <div key={q.id} style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 10 }}>
                  {qi + 1}. {q.question}
                </div>
                {q.options.map((opt, oi) => {
                  const sel = answers[q.id] === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: oi })} style={{
                      width: '100%', textAlign: 'left', marginBottom: 7, padding: '11px 13px', borderRadius: 12, cursor: 'pointer',
                      background: sel ? `${uc}18` : C.surfaceLight,
                      border: `1px solid ${sel ? uc : C.glass2}`,
                      color: sel ? C.ink : C.cyan, fontFamily: FONT.body, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${sel ? uc : C.cyanDim}`, background: sel ? uc : 'transparent',
                      }} />
                      {opt}
                    </button>
                  );
                })}
              </div>
            ))}

            <button onClick={submit} disabled={submitting || Object.keys(answers).length < questions.length} style={{
              width: '100%', marginTop: 8, padding: '13px', borderRadius: 12,
              cursor: (submitting || Object.keys(answers).length < questions.length) ? 'not-allowed' : 'pointer',
              background: C.gold, border: 'none', color: C.onAccent, fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1, fontWeight: 700,
              opacity: (submitting || Object.keys(answers).length < questions.length) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting ? <><Loader2 size={15} className="animate-spin" /> CALIFICANDO…</> : 'ENVIAR RESPUESTAS'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
