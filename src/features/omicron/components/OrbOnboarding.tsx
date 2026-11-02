// src/features/omicron/components/OrbOnboarding.tsx
// ═══════════════════════════════════════════════════════════════════════
// ONBOARDING — Landing Pro: Geodesic orb birth narrative.
//
// Flow:
//   Step 1: Black screen → core glow appears (single point of light)
//   Step 2: "Choose your color" → 5 color dots
//   Step 3: "What do you do?" → profession input
//   Step 4: Orb GROWS with nodes appearing (skills extracted)
//   Step 5: Celebration → fade out → reveal full 3D shell
//
// The orb starts as NOTHING and becomes YOUR digital twin.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { speakOmicron } from '@/features/omicron/services/voice';
import { HALO, C, FONT, RADIUS, tint, SIZE, ELEVATED, ANIM, LETRA} from '@/theme';
import { Icon, type IconRole } from '@/shared/components/icons';
import { OmicronPlaceholder2D } from '@/shared/components/OmicronPlaceholder2D';
import { ColorPicker } from '@/shared/components/ColorPicker';
import { COLOR_OPTIONS, type ColorOption } from '@/shared/services/userColor';
import { TextReveal } from '@/shared/motion/TextReveal';
import { CelebrationBurst } from '@/shared/motion/CelebrationBurst';
import { MagneticButton } from '@/shared/motion/MagneticButton';
import { audioHum, audioTick, audioAscend, audioConfirm } from '@/shared/utils/spatialAudio';
import { firePulse } from '@/shared/components/LivePulseBar';
import { hapticMedium, hapticSuccess, hapticLight } from '@/shared/utils/haptics';
import { MENSAJE_NACIMIENTO, perfilDesdeDeclaracion, type GeneratedProfile } from '@/features/omicron/utils/perfilDeclaracion';

const ONBOARDING_KEY = 'omicron_onboarding_done';

interface OrbOnboardingProps {
  onComplete: (choice: 'examen' | 'cv' | 'ambos' | 'empleo' | 'aprender' | 'vender' | 'validar' | 'explorar') => void;
  onProfileGenerated?: (profile: GeneratedProfile) => void;
  onSkillsPreview?: (skills: string[]) => void;
}

// ── Intent classification ─────────────────────────────────────────────
function classifyIntent(text: string): 'empleo' | 'aprender' | 'validar' | 'vender' | 'explorar' {
  const t = text.toLowerCase();
  if (/trabajo|empleo|busco|oportunidad|vacante|postular/.test(t)) return 'empleo';
  if (/aprender|curso|estudiar|mejorar|crecer|capacitar|react|python|node/.test(t)) return 'aprender';
  if (/validar|demostrar|certificar|skill|competencia|examen/.test(t)) return 'validar';
  if (/vender|servicio|freelance|ofrecer|monetizar|cobrar/.test(t)) return 'vender';
  return 'explorar';
}

const hasMicSupport = () => typeof window !== 'undefined' && !!(
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
);

const SUGGESTIONS: { label: string; icon: IconRole }[] = [
  { label: 'Desarrollador web', icon: 'prof-desarrollo' },
  { label: 'Diseñadora UX', icon: 'prof-diseno' },
  { label: 'Ingeniero industrial', icon: 'prof-industria' },
  { label: 'Estudiante', icon: 'prof-estudiante' },
  { label: 'Freelancer', icon: 'prof-freelance' },
];

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export function OrbOnboarding({ onComplete, onProfileGenerated, onSkillsPreview }: OrbOnboardingProps) {
  const { profile } = useApp();
  const [step, setStep] = useState<'awakening' | 'color' | 'ask' | 'growing' | 'born' | 'done'>('awakening');
  const [chosenColor, setChosenColor] = useState(COLOR_OPTIONS[0].hex);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [orbNodes, setOrbNodes] = useState(0);
  const [resultMsg, setResultMsg] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const hasSpoken = useRef(false);
  const inputRef = useRef('');
  inputRef.current = input;

  // Ocultar el onboarding cuando ya está confirmado: por bandera local, por
  // skills en el perfil, o por onboarding_completed_at (confirmación en la nube).
  // Esto evita que en un dispositivo nuevo el overlay parpadee/se repita en la
  // breve ventana previa a que hydrateOnboardingFromProfile escriba localStorage.
  const shouldHide = (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_KEY))
    || (profile?.skills && profile.skills.length > 0)
    || Boolean(profile?.onboarding_completed_at);

  useEffect(() => {
    if ((profile?.skills && profile.skills.length > 0) || profile?.onboarding_completed_at) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, [profile?.skills, profile?.onboarding_completed_at]);

  // ── Step 1: Awakening — orb appears from nothing ──────────────────
  useEffect(() => {
    if (shouldHide || step !== 'awakening') return;
    // Jarvis wakes up
    const t1 = setTimeout(() => audioHum(), 600);
    const t2 = setTimeout(() => {
      setOrbNodes(1); // First point of light
    }, 800);
    const t3 = setTimeout(() => {
      setStep('color'); // Move to color selection
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [shouldHide, step]);

  // ── Step 2: After color chosen → ask profession ───────────────────
  const handleColorSelect = useCallback((option: ColorOption) => {
    setChosenColor(option.hex);
    hapticLight();
    setOrbNodes(3); // Orb grows slightly with color
  }, []);

  const handleColorConfirm = useCallback(() => {
    setStep('ask');
    setOrbNodes(5);
    // Speak greeting
    if (!hasSpoken.current) {
      hasSpoken.current = true;
      setTimeout(() => {
        speakOmicron('Perfecto. Ahora cuéntame, ¿a qué te dedicas?');
      }, 500);
    }
  }, []);

  // ── Step 3: Submit profession ─────────────────────────────────────
  const handleSubmit = useCallback((overrideText?: string) => {
    const text = overrideText || inputRef.current;
    if (!text.trim() || generating) return;
    setGenerating(true);
    hapticMedium();
    audioConfirm();
    firePulse('user');
    setStep('growing');

    const intent = classifyIntent(text);
    // El perfil sale de la declaración, no de una cuenta sobre ella: sin años
    // dichos no hay años, y los ejes quedan en 0 hasta que el CV los mida.
    const instantProfile = perfilDesdeDeclaracion(text);

    // Grow the orb progressively (simulate nodes appearing). Los nodos son los
    // que él nombró; un perfil sin habilidades prende pequeño, no se rellena.
    const targetNodes = 6 + instantProfile.skills.length * 3;
    let current = 5;
    const growInterval = setInterval(() => {
      current += 2;
      setOrbNodes(Math.min(current, targetNodes));
      if (current >= targetNodes) clearInterval(growInterval);
    }, 120);

    onProfileGenerated?.(instantProfile);
    onSkillsPreview?.(instantProfile.skills);
    import('@/shared/utils/guestMode').then(({ saveGuestProfile }) => {
      saveGuestProfile({ ...instantProfile, createdAt: new Date().toISOString() });
    }).catch(() => {});

    // After growth animation → born
    setTimeout(() => {
      clearInterval(growInterval);
      setOrbNodes(targetNodes);
      setGenerating(false);
      setStep('born');
      setShowCelebration(true);
      audioAscend();
      hapticSuccess();
      firePulse('success');

      setResultMsg(MENSAJE_NACIMIENTO);
      speakOmicron(MENSAJE_NACIMIENTO);
    }, 1800);

    // Navigate after showing result
    // La bandera de "ya hice el onboarding" se escribe ACÁ y no en el nacimiento:
    // `shouldHide` se lee en cada render y, si la escritura caía en el mismo lote
    // que setStep('born'), el paso de la celebración se montaba ya oculto y el
    // aviso nunca llegaba a la pantalla del usuario (sólo se oía por voz).
    setTimeout(() => {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setStep('done');
      onComplete(intent);
    }, 4000);

    import('@/shared/utils/analytics').then(({ track }) => {
      track('onboarding_started');
      track('onboarding_completed', { intent, skills_count: instantProfile.skills.length });
      track('first_profile_generated', { profession: instantProfile.profession });
    }).catch(() => {});
  }, [generating, onComplete, onProfileGenerated, onSkillsPreview]);

  // Mic handler
  const recognitionRef = useRef<{ abort: () => void } | null>(null);
  const handleMic = useCallback(() => {
    import('@/infrastructure/voice/recognition').then(({ startSpeechRecognition, isSpeechAvailable }) => {
      if (!isSpeechAvailable()) return;
      const handle = startSpeechRecognition({
        lang: 'es-US',
        interimResults: true,
        onResult: (transcript: string, isFinal: boolean) => {
          setInput(transcript);
          if (isFinal) handleSubmit(transcript);
        },
        onEnd: () => { recognitionRef.current = null; },
      });
      if (handle) recognitionRef.current = handle;
    });
  }, [handleSubmit]);

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // Keyboard detection
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    if (shouldHide) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [shouldHide]);

  // === RENDER ===
  if (shouldHide || step === 'done') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between',
        background: C.bg,
        padding: '0 20px',
        paddingTop: 'calc(env(safe-area-inset-top, 20px) + 20px)',
        paddingBottom: kbOpen ? '12px' : 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
        overflow: 'hidden',
      }}
    >
      {/* Celebration */}
      <CelebrationBurst trigger={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* ═══ TOP: THE ORB (grows through the journey) ═══ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {/* Placeholder 2D ligero (antes GeodesicOrb): un pulso sobrio en el
            color elegido que CRECE a lo largo del onboarding vía el scale del
            motion.div. Solo transform/opacity; reduced-motion lo neutraliza. */}
        <motion.div
          animate={{
            // El nacimiento del Gemelo: el pulso crece por paso y, en la fase
            // final, un pelín más a medida que "aparecen los nodos" (orbNodes).
            scale: (step === 'awakening' ? 0.4 : step === 'color' ? 0.7 : step === 'ask' ? 0.85 : 1)
              + Math.min(0.12, orbNodes * 0.005),
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          <OmicronPlaceholder2D size={240} color={chosenColor} />
        </motion.div>
      </div>

      {/* ═══ BOTTOM: INTERACTION AREA ═══ */}
      <div style={{ width: '100%', maxWidth: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AnimatePresence mode="wait">

          {/* ── STEP: COLOR PICKER ── */}
          {step === 'color' && (
            <motion.div key="color" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
              <ColorPicker onSelect={handleColorSelect} selected="cyan" />
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                <MagneticButton onClick={handleColorConfirm} style={{
                  padding: '14px 32px', borderRadius: RADIUS.pill,
                  background: `linear-gradient(135deg, ${chosenColor}, ${chosenColor}aa)`,
                  border: 'none', color: '#000', fontFamily: FONT.display,
                  fontSize: SIZE.sm, fontWeight: 700, cursor: 'pointer',
                  boxShadow: ELEVATED.lejana('md', `${chosenColor}55`),
                }}>
                  Continuar
                </MagneticButton>
              </div>
            </motion.div>
          )}

          {/* ── STEP: ASK PROFESSION ── */}
          {step === 'ask' && (
            <motion.div key="ask" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Message */}
              {!kbOpen && (
                <div style={{
                  padding: '16px 20px', borderRadius: RADIUS.xl,
                  background: C.surface,
                  border: `1px solid ${chosenColor}33`,
                  boxShadow: `${ELEVATED.lejana('md', tint(C.black, 40))}, 0 0 ${HALO.ascua}px ${chosenColor}11`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: chosenColor, boxShadow: `0 0 ${HALO.ascua}px ${chosenColor}`, animation: ANIM.breathe }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: LETRA.anunciada, color: chosenColor, textTransform: 'uppercase' }}>ÓMICROM</span>
                  </div>
                  <div style={{ fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.6 }}>
                    <TextReveal text="¿A qué te dedicas? Cuéntame en una frase." speed={22} cursor={true} />
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {hasMicSupport() && (
                  <MagneticButton onClick={handleMic} style={{
                    width: 50, height: 50, borderRadius: '50%',
                    border: `1.5px solid ${chosenColor}55`, background: C.glass,
                    color: chosenColor, display: 'grid', placeItems: 'center', fontSize: 20,
                  }}>
                    <Icon role="microfono" size={16} label="Grabar tu voz" />
                  </MagneticButton>
                )}
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: Ingeniero industrial con 8 años"
                  enterKeyHint="send" autoComplete="off"
                  style={{
                    flex: 1, padding: '14px 18px', borderRadius: RADIUS.pill,
                    background: C.surface, border: `1.5px solid ${chosenColor}44`,
                    fontFamily: FONT.body, fontSize: 15, color: C.ink, outline: 'none',
                    WebkitAppearance: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = chosenColor; e.currentTarget.style.boxShadow = `0 0 ${HALO.foco}px ${chosenColor}22`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = `${chosenColor}44`; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <MagneticButton onClick={() => handleSubmit()} disabled={!input.trim() || generating} style={{
                  width: 50, height: 50, borderRadius: '50%', border: 'none',
                  background: input.trim() ? `linear-gradient(135deg, ${chosenColor}, ${chosenColor}aa)` : C.glass,
                  color: input.trim() ? '#000' : C.mut, display: 'grid', placeItems: 'center', fontSize: SIZE.lg,
                  boxShadow: input.trim() ? ELEVATED.lejana('sm', `${chosenColor}44`) : 'none',
                }}>
                  <Icon role="enviar" size={16} label="Enviarle tu pregunta a Ómicrom" />
                </MagneticButton>
              </form>

              {/* Chips */}
              {!input && !kbOpen && (
                <motion.div initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { delayChildren: 0.6, staggerChildren: 0.07 } } }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
                >
                  {SUGGESTIONS.map(({ label, icon }) => (
                    <motion.button key={label}
                      variants={{ hidden: { opacity: 0, y: 12, scale: 0.92 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } } }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => { audioTick(); hapticMedium(); setInput(label); handleSubmit(label); }}
                      style={{
                        padding: '10px 14px', minHeight: 42, borderRadius: RADIUS.pill,
                        background: C.glass, border: `1px solid ${chosenColor}22`,
                        color: C.ink, fontFamily: FONT.body, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Icon role={icon} size={14} /> {label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STEP: GROWING (orb expanding) ── */}
          {step === 'growing' && (
            <motion.div key="growing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '20px 0' }}
            >
              <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.ancha, color: chosenColor, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: chosenColor, animation: ANIM.pulse }} />
                Construyendo tu Gemelo Digital…
              </span>
            </motion.div>
          )}

          {/* ── STEP: BORN (celebration) ── */}
          {step === 'born' && (
            <motion.div key="born" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ textAlign: 'center', padding: '12px 0' }}
            >
              <div style={{
                padding: '18px 22px', borderRadius: RADIUS.xl,
                background: C.surface,
                border: `1px solid ${chosenColor}44`,
                boxShadow: `${ELEVATED.lejana('md', tint(C.black, 40))}, 0 0 ${HALO.marca}px ${chosenColor}15`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: chosenColor, boxShadow: `0 0 ${HALO.foco}px ${chosenColor}` }} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: LETRA.anunciada, color: chosenColor, textTransform: 'uppercase' }}>GEMELO DIGITAL ACTIVADO</span>
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.6 }}>
                  <TextReveal text={resultMsg} speed={16} cursor={false} />
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
