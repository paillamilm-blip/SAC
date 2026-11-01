// hooks/useGemeloActivation.ts
// ═══════════════════════════════════════════════════════════════════════
// Custom hook: encapsula toda la lógica de negocio del flujo de
// activación del Gemelo Digital.
//
// FLUJO (Experience-First):
//   1. Upload CV (cualquier usuario, guest o autenticado)
//   2. Análisis (IA o local — NO requiere auth)
//   3. GemeloReveal (muestra resultados impactantes — NO requiere auth)
//   4. Persistir (SOLO cuando el usuario toca "Activar" — requiere auth)
//   5. Auto-convalidar (SOLO tras persist exitoso)
//
// FIX: Eliminada la persistencia inline dentro de activateGemeloCompleto
// que causaba un loop y duplicación. Ahora `persistAnalysis` es el ÚNICO
// camino para guardar → coherente, sin stale closures, sin loop.
//
// Si el usuario no está autenticado al persistir, se abre el modal de
// login. Al volver autenticado, se persiste automáticamente.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/shared/components/Toast';
import { speak } from '@/infrastructure/voice/engine';
import { analyzeCV, type AnalyzedProfile } from '@/features/gemelo/services/cvAnalyzer';
import { extractCVText } from '@/features/gemelo/services/cvExtract';
import type { AnalysisCrudoIA } from '@/features/gemelo/services/aprendizaje';
import { savePendingCvAnalysis, getPendingCvAnalysis, clearPendingCvAnalysis, hasPendingCvAnalysis } from '@/shared/utils/guestMode';
import { C } from '@/theme';

type Kind = 'cv' | 'title' | 'year';
export type Phase = 'upload' | 'syncing' | 'reveal';
export interface Push { id: number; label: string; delta: number; color: string }

/**
 * Safety timeout (ms) — if AI doesn't respond within this, forcibly reset.
 * Cubre el PEOR CAMINO REAL, no la suerte del primer motor: el motor propio
 * (Edge Function `analizar-cv`) se corta solo a los 60 s (PRESUPUESTO_IA_MS en
 * supabase/functions/analizar-cv/index.ts) y despues de ese corte el fallback
 * Gemini pide 75 s (gemini.ts:67, sobre el default de 30 s de client.ts:45).
 * 60 + 75 = 135 s encadenados, y encima queda el guardado + la cadena de
 * convalidacion. Con el viejo 90 s la UI se reiniciaba en el minuto 1,5 mientras
 * el analisis todavia podia terminar: el resultado tardio se descartaba.
 */
const SAFETY_TIMEOUT_MS = 150_000;

/** Progress messages shown during AI wait to keep the user informed. */
const PROGRESS_MESSAGES = [
  'Conectando con la IA…',
  'Analizando habilidades y experiencia…',
  'Calculando ejes del Gemelo Digital…',
  'Puede tardar: primero el motor propio y, si no responde, el respaldo.',
];

/**
 * Mezcla el análisis crudo de la IA con la base heurística de `analyzeCV()`:
 * la IA manda donde trajo dato, el heurístico cubre el resto. Está afuera del
 * callback porque los DOS caminos del motor (Edge Function `analizar-cv` y el
 * fallback Gemini) comparten este único mapeo.
 */
function mezclarAnalisis(
  base: AnalyzedProfile,
  ia: AnalysisCrudoIA,
): AnalyzedProfile {
  const clamp = (n?: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const skills = (ia.skills ?? []).filter(Boolean).slice(0, 12);
  const skillsDetail = (ia.skillsDetail ?? [])
    .filter((s: { name?: string }) => s?.name).slice(0, 12)
    .map((s: { name?: string; pct?: number }) => ({ name: s.name!, pct: clamp(s.pct) }));
  // `ia.axes` existe: el llamador ya verificó que el análisis trae ejes antes
  // de llegar acá (misma guarda que tenía el bloque inline de Gemini).
  return {
    ...base,
    name: ia.name || base.name,
    seniorLabel: ia.seniorLabel || base.seniorLabel,
    seniorLevel: (ia.seniorLevel as AnalyzedProfile['seniorLevel']) || base.seniorLevel,
    years: typeof ia.years === 'number' ? ia.years : base.years,
    skills: skills.length ? skills : base.skills,
    labels: skills.length ? skills : base.labels,
    skillsDetail: skillsDetail.length ? skillsDetail : base.skillsDetail,
    summary: ia.summary || base.summary,
    arch: (ia.arch as AnalyzedProfile['arch']) || base.arch,
    axes: { exec: clamp(ia.axes!.exec), qual: clamp(ia.axes!.qual), trans: clamp(ia.axes!.trans), fund: clamp(ia.axes!.fund) },
  };
}

export function useGemeloActivation() {
  const { gemelo, refreshProfile, profile } = useApp();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>('upload');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Kind[]>([]);
  const [dossier, setDossier] = useState<AnalyzedProfile | null>(null);
  const [ai, setAi] = useState<{ loading: boolean; text: string }>({ loading: false, text: '' });
  const [cvText, setCvText] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  // Estado, no texto: si el documento se logró leer o no lo decide esta
  // bandera. Antes la pantalla lo averiguaba con msg.startsWith('✓'), o sea
  // un carácter unicode era el portador de verdad del flujo.
  const [cvReadOk, setCvReadOk] = useState(false);
  const [msg, setMsg] = useState('Sube tu CV y Ómicrom activa todo automáticamente.');
  const [pushes, setPushes] = useState<Push[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingPersist, setPendingPersist] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const dossierRef = useRef<AnalyzedProfile | null>(null);
  const rescueAttemptedRef = useRef(false);
  const pushIdRef = useRef(0);
  const isProcessingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const rep = gemelo ? Math.round(gemelo.overallReputation) : 0;
  const hasExistingCV = (profile?.skills?.length ?? 0) > 0;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Keep dossierRef in sync (avoids stale closure in pendingPersist effect)
  useEffect(() => { dossierRef.current = dossier; }, [dossier]);

  // ── Push notification helper ─────────────────────────────────────
  const emitPush = useCallback((label: string, delta: number, color: string) => {
    const id = ++pushIdRef.current;
    setPushes((prev) => [...prev, { id, label, delta, color }]);
    setTimeout(() => setPushes((prev) => prev.filter((p) => p.id !== id)), 2400);
  }, []);

  // ── Auto-convalidation chain (requires auth) ─────────────────────
  // ONLY runs after a SUCCESSFUL persist — never independently.
  const runAutoChain = useCallback(async () => {
    setCurrentStep(1);
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'title' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'title']);
        emitPush('Calidad', 5, C.purple);
      }
    } catch (err) { console.warn('[Omicron] convalidar title failed:', err); }
    await new Promise((r) => setTimeout(r, 400));

    setCurrentStep(2);
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'year' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'year']);
        emitPush('Ejecución', 8, C.cyan);
        emitPush('Fundamento', 4, C.green);
      }
    } catch (err) { console.warn('[Omicron] convalidar year failed:', err); }

    await refreshProfile();
  }, [emitPush, refreshProfile]);

  // ══════════════════════════════════════════════════════════════════
  // PERSIST — ÚNICO camino para guardar el CV analizado en la DB.
  // Called from: GemeloReveal CTA, or auto-persist effect after auth.
  // If not authenticated, opens login and auto-persists on return.
  // After successful persist → runs runAutoChain.
  // ══════════════════════════════════════════════════════════════════
  const persistAnalysis = useCallback(async (analyzed?: AnalyzedProfile | null) => {
    const data = analyzed || dossierRef.current;
    if (!data) {
      toast('No hay análisis para guardar. Sube tu CV primero.', 'error');
      return;
    }

    // If not authenticated → open auth modal, mark pending
    if (!profile?.id) {
      setPendingPersist(true);
      window.dispatchEvent(new Event('omicron:request-auth'));
      toast('Regístrate para guardar tu Gemelo Digital', 'info');
      return;
    }

    // Clear previous error — a partir de aquí sí vamos a golpear el RPC
    // (usuario autenticado), así que marcamos el estado "guardando" para
    // que la UI muestre progreso y no parezca congelada.
    setPersisting(true);
    setPersistError(null);
    setMsg('Guardando tu Gemelo Digital…');

    try {
      const cleanSkills = (data.labels ?? []).filter((s: string) => typeof s === 'string' && s.trim());
      const cleanDetail = (data.skillsDetail ?? [])
        .filter((s: { name: string; pct: number }) => s?.name)
        .map((s: { name: string; pct: number }) => ({ name: String(s.name), pct: Number(s.pct) || 0 }));

      const { data: rpcData, error } = await supabase.rpc('aplicar_analisis_cv', {
        p_name: String(data.name || ''),
        p_skills: cleanSkills.length > 0 ? cleanSkills : ['general'],
        p_exec: Math.round(Number(data.axes.exec) || 0),
        p_qual: Math.round(Number(data.axes.qual) || 0),
        p_trans: Math.round(Number(data.axes.trans) || 0),
        p_fund: Math.round(Number(data.axes.fund) || 0),
        p_years: data.years ? Math.round(Number(data.years)) : 0,
        p_summary: data.summary ? String(data.summary) : '',
        p_skills_detail: cleanDetail.length > 0 ? cleanDetail : [],
      });

      const res = rpcData as { ok?: boolean; error?: string } | null;
      if (error || !res?.ok) {
        const errMsg = error?.message || res?.error || 'Error desconocido';
        // Provide actionable messages based on common errors
        let userMsg: string;
        if (errMsg.includes('Could not find') || errMsg.includes('function') || errMsg.includes('does not exist')) {
          userMsg = 'La base de datos necesita actualizarse. Contacta soporte.';
          console.error('[Omicron] RPC not found — migrations 0062+0063 not applied?', errMsg);
        } else if (errMsg.includes('sin sesión') || errMsg.includes('JWT') || errMsg.includes('expired')) {
          userMsg = 'Tu sesión expiró. Refresca la página e intenta de nuevo.';
        } else {
          userMsg = `No se pudo guardar: ${errMsg}`;
        }
        setPersistError(userMsg);
        toast(userMsg, 'error');
        console.error('[Omicron] persistAnalysis RPC failed:', { error, rpcData });
        return;
      }

      // ═══════ SUCCESS — profile saved! ═══════
      setPersisted(true);
      setPersistError(null);
      setCompletedSteps(['cv']);
      emitPush('Ejecución', data.axes.exec > 50 ? 12 : 8, C.cyan);
      emitPush('Calidad', data.axes.qual > 50 ? 10 : 6, C.purple);
      toast('¡Gemelo Digital activado!', 'success');
      speak(`Gemelo Digital activado. Perfil: ${data.seniorLabel}.`);
      // Señal "recién guardado": la insignia efímera CloudSavedBadge escucha
      // este evento DOM para aparecer y auto-ocultarse (~3s). Mismo patrón
      // que userColorSync con 'omicron:color-changed'.
      window.dispatchEvent(new Event('omicron:profile-saved'));

      // Force profile refresh IMMEDIATELY
      await refreshProfile();

      // Broadcast to network (best-effort)
      try {
        supabase.channel('omicron-live').send({ type: 'broadcast', event: 'activity', payload: { text: `${profile?.username ?? 'Un nodo'} activó su Gemelo Digital`, kind: 'action' } });
        import('@/shared/utils/analytics').then(({ track }) => track('cv_uploaded')).catch(() => {});
      } catch { /* silent */ }

      // Run auto-convalidation chain ONLY after successful persist
      await runAutoChain();

      // Clear phantom timer (they saved — no more countdown)
      localStorage.removeItem('omicron_gemelo_phantom_expire');

      // Limpiar el puente localStorage: ya está guardado en la DB (idempotencia)
      clearPendingCvAnalysis();

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setPersistError(`Error al guardar: ${errMsg}`);
      console.error('[Omicron] persistAnalysis failed:', err);
      toast('Error al guardar. Intenta de nuevo.', 'error');
    } finally {
      // Limpia el estado "guardando" en TODOS los caminos de salida del
      // RPC: éxito, retornos tempranos por error y catch.
      setPersisting(false);
    }
  }, [profile?.id, profile?.username, emitPush, runAutoChain, toast, refreshProfile]);

  // ── Auto-persist when user authenticates after reveal ────────────
  // Camino SIN remount: la instancia del hook sobrevive al login, así que
  // marcamos rescueAttemptedRef para que el efecto de rescate no dispare
  // un segundo persistAnalysis cuando pendingPersist vuelva a false (la
  // clave aún no se limpió porque el RPC está en vuelo). Garantiza UN solo
  // guardado tanto en el camino con remount como sin remount.
  useEffect(() => {
    if (pendingPersist && profile?.id && dossierRef.current) {
      rescueAttemptedRef.current = true;
      void persistAnalysis(dossierRef.current);
      setPendingPersist(false);
    }
  }, [profile?.id, pendingPersist, persistAnalysis]);

  // ── Cancel activation (user-triggered) ───────────────────────────
  const cancelActivation = useCallback(() => {
    cancelledRef.current = true;
    isProcessingRef.current = false;
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
    setLastError(null);
    setPersistError(null);
    setPhase('upload');
    setMsg('Cancelado. Podés reintentar cuando quieras.');
    toast('Análisis cancelado', 'info');
  }, [toast]);

  // ── Rescate del puente localStorage tras el remount guest→auth ───
  // Cubre el caso donde App.tsx remonta el árbol al autenticarse: el
  // dossier en memoria se pierde, pero quedó en localStorage al analizar
  // como guest. Al montar ya autenticado, lo rescatamos, sembramos la UI
  // (para que el usuario vea su reveal correcto) y lo persistimos vía RPC.
  // Corre una sola vez por mount; persistAnalysis limpia la clave al éxito.
  //
  // Guarda `!pendingPersist`: si NO hubo remount (la instancia del hook
  // sobrevive), `pendingPersist` ya está en true y el efecto de auto-persist
  // de arriba se encarga del guardado. El rescate cede para evitar que
  // ambos efectos disparen persistAnalysis en el mismo commit (doble RPC,
  // doble runAutoChain, doble toast). En el camino con remount la instancia
  // nueva nace con pendingPersist=false, así que el rescate sí dispara.
  useEffect(() => {
    if (profile?.id && !pendingPersist && !rescueAttemptedRef.current && hasPendingCvAnalysis()) {
      const rescued = getPendingCvAnalysis();
      if (rescued) {
        rescueAttemptedRef.current = true;
        setDossier(rescued);
        dossierRef.current = rescued;
        setAi({ loading: false, text: rescued.summary });
        setPhase('reveal');
        void persistAnalysis(rescued);
      }
    }
  }, [profile?.id, pendingPersist, persistAnalysis]);

  // ── Read CV file ─────────────────────────────────────────────────
  const onCVFile = useCallback(async (file: File) => {
    setCvFileName(file.name);
    setMsg('Leyendo tu documento…');
    try {
      const text = await extractCVText(file);
      console.info(`[Omicron] CV extracted: ${text.length} chars. Preview: "${text.slice(0, 200)}…"`);
      if (text.length >= 30) {
        setCvText(text);
        setCvReadOk(true);
        const preview = text.slice(0, 60).replace(/\s+/g, ' ').trim();
        setMsg(`"${file.name}" leído (${text.length} caracteres). Toca "Activar Gemelo Completo".`);
        toast(`CV leído: "${preview}…"`, 'success');
      } else {
        setCvReadOk(false);
        setMsg(`No pude extraer texto del archivo (solo ${text.length} caracteres). Pega tu experiencia abajo.`);
        toast('El archivo no tiene texto legible. Prueba pegando tu experiencia.', 'error');
      }
    } catch (err) {
      console.warn('[Omicron] CV file read failed:', err);
      setCvReadOk(false);
      setMsg('No pude leer el archivo. Pega tu experiencia abajo.');
      toast('Error leyendo el archivo. Intenta con otro formato.', 'error');
    }
  }, [toast]);

  // ══════════════════════════════════════════════════════════════════
  // ANALYZE CV — NO requiere auth. Cualquier usuario puede analizar.
  // Al terminar, muestra GemeloReveal (phase = 'reveal').
  //
  // IMPORTANTE: Esta función NO persiste el perfil. La persistencia
  // ocurre SOLO cuando el usuario toca "Activar" en GemeloReveal, que
  // llama a `persistAnalysis`. Esto rompe el loop anterior donde el
  // análisis intentaba guardar inline y fallaba silenciosamente.
  //
  // Qué cambió con el motor unificado: el análisis pasa por la Edge Function
  // `analizar-cv`, y ESA función guarda el run (CV + brechas) en
  // `analisis_cv`/`brechas_aprendizaje` cuando hay sesión verificada. No es
  // persistencia del perfil del Gemelo — es el registro que mide la precisión
  // de la Fase 1; el perfil sigue teniendo un solo camino: `persistAnalysis`.
  // ══════════════════════════════════════════════════════════════════
  const activateGemeloCompleto = useCallback(async () => {
    const text = cvText.trim();
    if (!text) return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    cancelledRef.current = false;

    setPhase('syncing');
    setCurrentStep(0);
    setMsg('Ómicrom está analizando TODO tu CV con IA…');
    setLastError(null);
    setPersistError(null);

    // ── Safety timeout ───────────────────────────────────────────────
    safetyTimerRef.current = setTimeout(() => {
      if (!isProcessingRef.current || cancelledRef.current) return;
      console.warn(`[Omicron] Safety timeout reached (${SAFETY_TIMEOUT_MS / 1000}s). Resetting UI.`);
      isProcessingRef.current = false;
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      // Timeout — show error instead of wrong local data
      isProcessingRef.current = false;
      setMsg('La IA tardó demasiado. Intenta de nuevo.');
      setLastError('timeout');
      toast('Timeout: la IA no respondió. Reintenta.', 'error');
      setPhase('upload');
    }, SAFETY_TIMEOUT_MS);

    // ── Progress messages ────────────────────────────────────────────
    let msgIndex = 0;
    setMsg(PROGRESS_MESSAGES[0]);
    progressTimerRef.current = setInterval(() => {
      if (cancelledRef.current) return;
      msgIndex = Math.min(msgIndex + 1, PROGRESS_MESSAGES.length - 1);
      setMsg(PROGRESS_MESSAGES[msgIndex]);
      if (msgIndex >= PROGRESS_MESSAGES.length - 1 && progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }, 6000);

    try {
      // ── 1) Analiza el CV: motor → fallback → error (nunca datos falsos) ──
      let analyzed: AnalyzedProfile | null = null;
      // El texto LITERAL con el que el servidor cortó a este usuario (401/429/503).
      // Viaja aparte del "no hay análisis" genérico: mezclarlos es el tope
      // silencioso que el spec §8 prohibe.
      let bloqueo: string | null = null;

      try {
        // El motor de aprendizaje (Edge Function `analizar-cv`) es el camino que
        // emite brechas y guarda el run con la identidad del JWT — la unica
        // fuente de la metrica de la Fase 1. `analyzeCVWithGemini` queda como
        // FALLBACK DECLARADO ante una falla del motor (5xx, red, JSON roto,
        // analisis sin ejes), asi que el flujo que el usuario ya conoce no se
        // rompe si la funcion no esta desplegada. Los cortes del servidor sobre
        // ESTE usuario (401/429/503) no caen al fallback: vuelven como
        // `fuente: 'bloqueado'` y se muestran.
        // La eleccion motor->fallback vive en el servicio (analizarCvConFallback)
        // para poder probarse sin montar el hook; el mapeo del resultado es el
        // mismo de siempre, ahora compartido por los dos caminos.
        const { analizarCvConFallback } = await import('@/features/gemelo/services/aprendizaje');
        const r = await analizarCvConFallback(text, cvFileName || 'cv');

        if (cancelledRef.current || !isProcessingRef.current) return;

        if (r?.fuente === 'bloqueado') {
          bloqueo = r.error;            // el texto del servidor, literal
          analyzed = null;
        } else if (r && r.analysis && r.analysis.axes) {
          analyzed = mezclarAnalisis(analyzeCV(text), r.analysis);
          console.info(`[Omicron] análisis servido por ${r.fuente === 'motor' ? 'el motor analizar-cv' : 'el fallback Gemini'} · guardado: ${r.guardado ? 'sí' : 'no'} · huella: ${r.build ?? 'sin'}`);
        } else {
          // Ningun motor trajo un analisis completo — show error, NO local
          // fallback con datos falsos
          console.error('[Omicron] AI result incomplete. No local fallback.');
          analyzed = null;
        }
      } catch (err) {
        // Any error from IA → NO fallback local (prefer error over wrong data)
        console.error('[Omicron] AI threw:', err);
        analyzed = null;
      }

      // Clear timers
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }

      if (cancelledRef.current) return;

      if (!analyzed) {
        if (bloqueo) {
          // El motivo ya lo redacta el servidor para una persona: la UI lo muestra tal
          // cual. Enmascararlo con "verifica tu conexion" es exactamente el tope
          // silencioso que el spec §8 prohibe.
          setMsg(bloqueo);
          setLastError('cuota');
          toast(bloqueo, 'error');
        } else {
          setMsg('La IA no pudo analizar tu CV. Verifica tu conexión e intenta de nuevo.');
          setLastError('no_analysis');
          toast('Error: la IA no respondió. Reintenta en unos segundos.', 'error');
        }
        setPhase('upload');
        isProcessingRef.current = false;
        return;
      }

      // ── 2) Minimum syncing time (so user always sees the orb animation) ─
      await new Promise(r => setTimeout(r, 2000));

      if (cancelledRef.current) return;

      // ── 3) Show GemeloReveal — user decides when to persist ────────
      console.info('[Omicron] Analysis complete:', {
        name: analyzed.name,
        seniorLabel: analyzed.seniorLabel,
        years: analyzed.years,
        skills: analyzed.labels,
        axes: analyzed.axes,
        summaryPreview: analyzed.summary?.slice(0, 100),
      });
      setDossier(analyzed);
      // Puente localStorage: si es guest, guardar el análisis para que
      // sobreviva el remount guest→auth (App.tsx) y las recargas. Se
      // rescata y persiste vía RPC al autenticarse (ver rescue effect).
      if (!profile?.id) {
        savePendingCvAnalysis(analyzed);
      }
      setAi({ loading: false, text: analyzed.summary });
      setPhase('reveal');
      isProcessingRef.current = false;

      // ── 4) AUTO-PERSIST for authenticated users ────────────────────
      // If the user is already authenticated, persist immediately in background.
      // This is NOT a duplicate — it uses the canonical persistAnalysis function
      // via dossierRef (which is now set). If it fails, the user still sees the
      // reveal and can retry via the CTA button.
      if (profile?.id) {
        // Small delay to let React commit the dossier state
        setTimeout(() => {
          void persistAnalysis(analyzed);
        }, 100);
      }

      // Analytics (best-effort)
      try {
        import('@/shared/utils/analytics').then(({ track }) => track('cv_analyzed')).catch(() => {});
      } catch { /* silent */ }

    } catch (err) {
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      if (cancelledRef.current) return;
      console.error('[Omicron] activateGemeloCompleto failed:', err);
      // Even on catastrophic failure, show clear error
      setLastError('catastrophic');
      setMsg('Error al procesar. Intenta de nuevo.');
      toast('Error inesperado. Reintenta.', 'error');
      setPhase('upload');
      isProcessingRef.current = false;
    }
  }, [cvText, cvFileName, toast, profile?.id, persistAnalysis]);

  return {
    // State
    phase, currentStep, completedSteps, dossier, ai,
    cvText, setCvText, cvFileName, cvReadOk, msg, pushes,
    rep, hasExistingCV, gemelo, profile, lastError,
    isProcessing: isProcessingRef.current,
    pendingPersist, persisted, persisting, persistError,
    // Actions
    onCVFile, activateGemeloCompleto, cancelActivation, persistAnalysis,
  };
}
