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
import { extractCVText, PISO_CV } from '@/features/gemelo/services/cvExtract';
import type { AnalysisCrudoIA } from '@/features/gemelo/services/aprendizaje';
import { savePendingCvAnalysis, getPendingCvAnalysis, clearPendingCvAnalysis, hasPendingCvAnalysis } from '@/shared/utils/guestMode';
import { C } from '@/theme';

type Kind = 'cv' | 'title' | 'year';
export type Phase = 'upload' | 'syncing' | 'reveal';
export interface Push { id: number; label: string; delta: number; color: string }

export type HitoId = 'documento' | 'lectura' | 'analisis' | 'ejes' | 'registro' | 'gemelo';
export type HitoEstado = 'espera' | 'activo' | 'hecho' | 'fallido';
/**
 * Un paso del escaneo. `medida` es el número REAL que lo justifica (palabras,
 * etiquetas locales, fuente que respondió, brechas del run): sin medida el hito
 * es decoración, y de eso ya estuvo lleno esta pantalla.
 */
export interface Hito { id: HitoId; etiqueta: string; estado: HitoEstado; medida: string }

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

/**
 * El orden del escaneo, y la única verdad de la barra.
 *
 * Los seis identificadores corresponden a seis HECHOS del flujo de abajo: el
 * texto en la mano, la heurística local corriendo, la respuesta del motor, el
 * análisis con ejes, el run en el servidor y el reveal montado. No hay un
 * séptimo ni un relleno. Había cuatro mensajes cosméticos avanzando cada 6 s
 * (`PROGRESS_MESSAGES` sobre un `setInterval`) y un riel de tres pasos atado a
 * `currentStep`, que sólo se mueve en la cadena de convalidación posterior:
 * durante la espera real la barra estaba congelada y el texto mentía.
 */
export const HITOS_ESCANEO: readonly { id: HitoId; etiqueta: string }[] = [
  { id: 'documento', etiqueta: 'Tu documento' },
  { id: 'lectura', etiqueta: 'Primera lectura' },
  { id: 'analisis', etiqueta: 'Análisis con IA' },
  { id: 'ejes', etiqueta: 'Ejes y habilidades' },
  { id: 'registro', etiqueta: 'Run en el servidor' },
  { id: 'gemelo', etiqueta: 'Gemelo listo' },
] as const;

/** Recién iniciado: el primer hito es el que está ocurriendo, nadie avanzó. */
export function escaneoInicial(): Hito[] {
  return HITOS_ESCANEO.map((h, i) => ({ ...h, estado: i === 0 ? 'activo' : 'espera', medida: '' }));
}

/** Avanza un hito sin tocar los demás. El orden lo decide quien llama. */
export function marcarHito(lista: readonly Hito[], id: HitoId, estado: HitoEstado, medida = ''): Hito[] {
  return lista.map((h) => (h.id === id ? { ...h, estado, medida } : h));
}

/**
 * Fracción del documento que se ilumina. Es la proporción de hitos HECHOS, así
 * que la barra se queda quieta mientras la IA piensa: es exactamente lo que
 * significa esperar una respuesta, y el haz que barre dice "sigo acá".
 */
export function fraccionEscaneo(lista: readonly Hito[]): number {
  return lista.length === 0 ? 0 : lista.filter((h) => h.estado === 'hecho').length / lista.length;
}

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
  const [hitos, setHitos] = useState<Hito[]>(escaneoInicial);
  // Cuántos segundos lleva el análisis en el aire: lo único honesto que se
  // puede mostrar durante la espera larga, porque es medición y no promesa.
  const [segundos, setSegundos] = useState(0);
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
  const cuentaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const rep = gemelo ? Math.round(gemelo.overallReputation) : 0;
  const hasExistingCV = (profile?.skills?.length ?? 0) > 0;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (cuentaRef.current) clearInterval(cuentaRef.current);
    };
  }, []);

  // Keep dossierRef in sync (avoids stale closure in pendingPersist effect)
  useEffect(() => { dossierRef.current = dossier; }, [dossier]);

  // ── El escaneo se marca con hechos, no con un reloj ───────────────
  const registrar = useCallback((id: HitoId, estado: HitoEstado, medida = '') => {
    setHitos((prev) => marcarHito(prev, id, estado, medida));
  }, []);

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
    if (cuentaRef.current) { clearInterval(cuentaRef.current); cuentaRef.current = null; }
    setLastError(null);
    setPersistError(null);
    setPhase('upload');
    setMsg('Cancelado. Puedes reintentar cuando quieras.');
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
    setMsg('Leyendo tu documento…');
    try {
      const lectura = await extractCVText(file);
      const text = lectura.texto;
      console.info(`[Omicron] CV extracted: ${text.length}/${lectura.totales} chars. Preview: "${text.slice(0, 200)}…"`);
      // El piso es UN número para toda la app (PISO_CV): si la lectura aceptara 30
      // y el CTA exigiera 40, haber "leído" el archivo no habilitaría nada.
      if (text.length >= PISO_CV) {
        // El nombre viaja con el texto que se va a analizar: ponerlo antes de la
        // lectura dejaba la pantalla nombrando a un archivo que no se usó.
        setCvFileName(file.name);
        setCvText(text);
        setCvReadOk(true);
        const preview = text.slice(0, 60).replace(/\s+/g, ' ').trim();
        // El recorte se dice con el número verdadero: "leído" a secas hacía creer
        // que el análisis vio todo el documento cuando sólo vio la primera parte.
        setMsg(
          lectura.totales > text.length
            ? `"${file.name}" tiene ${lectura.totales} caracteres y el análisis llega a ${text.length}: uso los primeros. Si algo clave quedó afuera, pegalo abajo.`
            : `"${file.name}" leído (${text.length} caracteres). Toca "Activar Gemelo Completo".`,
        );
        toast(
          lectura.totales > text.length
            ? `CV leído en parte: uso ${text.length} de ${lectura.totales} caracteres.`
            : `CV leído: "${preview}…"`,
          'success',
        );
      } else {
        setCvReadOk(false);
        setMsg(`No pude extraer texto de "${file.name}" (solo ${text.length} caracteres). Pega tu experiencia abajo: con menos de ${PISO_CV} no alcanzo a ver un rol.`);
        toast(`"${file.name}" no tiene texto legible. Prueba pegando tu experiencia.`, 'error');
      }
    } catch (err) {
      console.warn('[Omicron] CV file read failed:', err);
      setCvReadOk(false);
      setMsg(`No pude leer "${file.name}". Pega tu experiencia abajo.`);
      toast('Error leyendo el archivo. Prueba con otro formato.', 'error');
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
    // El piso ahora tiene voz. Antes: `if (!text) return;` — con 12 caracteres el
    // botón arrancaba un run que gastaba cota y devolvía un gemelo vacío, y con
    // 0 no pasaba NADA visible. Menos de PISO_CV caracteres no alcanza para ver un
    // rol, una tecnología ni un dónde: se dice y no se parte.
    if (text.length < PISO_CV) {
      setMsg(
        text.length === 0
          ? 'Sube tu CV o pega tu experiencia: sin texto no hay análisis.'
          : `Con ${text.length} caracteres no alcanzo a ver un rol, ni tecnologías, ni dónde las usaste. Pega al menos ${PISO_CV}.`,
      );
      return;
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    cancelledRef.current = false;

    setPhase('syncing');
    setCurrentStep(0);
    setHitos(escaneoInicial());
    setSegundos(0);
    setMsg('Tu documento está bajo el haz de lectura…');
    setLastError(null);
    setPersistError(null);

    // Cronómetro de espera: muestra cuánto va durando el análisis, que es dato
    // verdadero. El riel decorativo que avanzaba solo ya no existe.
    cuentaRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);

    // ── Safety timeout ───────────────────────────────────────────────
    safetyTimerRef.current = setTimeout(() => {
      if (!isProcessingRef.current || cancelledRef.current) return;
      console.warn(`[Omicron] Safety timeout reached (${SAFETY_TIMEOUT_MS / 1000}s). Resetting UI.`);
      isProcessingRef.current = false;
      if (cuentaRef.current) { clearInterval(cuentaRef.current); cuentaRef.current = null; }
      // Timeout — show error instead of wrong local data
      // El hito que estaba en el aire es el que se rindió: se marca con los
      // segundos que realmente corrieron, no con un "intenta de nuevo" vacío.
      setHitos((prev) => prev.map((h) => (h.estado === 'activo'
        ? { ...h, estado: 'fallido', medida: `sin respuesta en ${SAFETY_TIMEOUT_MS / 1000} s` }
        : h)));
      setMsg('La IA tardó demasiado. Intenta de nuevo.');
      setLastError('timeout');
      toast('Timeout: la IA no respondió. Reintenta.', 'error');
      setPhase('upload');
    }, SAFETY_TIMEOUT_MS);

    try {
      // ── 0) El texto ya está en la mano. Eso es el primer hito, no una promesa. ──
      const palabras = (text.match(/\S+/g) ?? []).length;
      registrar('documento', 'hecho', `${palabras} palabras · ${text.length} caracteres`);

      // La heurística local corría adentro de `mezclarAnalisis`, recién terminada
      // la espera. Acá corre antes de pedir nada: es el segundo hecho verdadero
      // del escaneo y su medida (`labels` reconocidos) es la primera lectura que
      // ve el usuario mientras el motor piensa.
      const base = analyzeCV(text);
      registrar('lectura', 'hecho', `${base.labels.length} etiquetas del documento`);

      // ── 1) Analiza el CV: motor → fallback → error (nunca datos falsos) ──
      let analyzed: AnalyzedProfile | null = null;
      // El texto LITERAL con el que el servidor cortó a este usuario (401/429/503).
      // Viaja aparte del "no hay análisis" genérico: mezclarlos es el tope
      // silencioso que el spec §8 prohibe.
      let bloqueo: string | null = null;
      registrar('analisis', 'activo');
      setMsg('El motor de aprendizaje está leyendo tu CV…');

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
          // El motivo del corte es la medida del hito: llega crudo del servidor
          // y acá se reporta, no se disfraza de "algo está tardando".
          registrar('analisis', 'fallido', r.error);
        } else if (r && r.analysis && r.analysis.axes) {
          analyzed = mezclarAnalisis(base, r.analysis);
          registrar('analisis', 'hecho', r.fuente === 'motor' ? 'respondió el motor propio' : 'respondió el respaldo declarado');
          registrar('ejes', 'hecho', `${analyzed.labels.length} habilidades · 4 ejes calculados`);
          // El run guardado es un hecho con número adentro (brechas + huella de
          // la build viva). `guardado: null` NO es un detalle menor: es el caso
          // en que la Fase 1 no tiene métrica, así que se muestra como fallido.
          registrar('registro', r.guardado ? 'hecho' : 'fallido',
            r.guardado ? `${r.guardado.brechas.length} brechas · huella ${r.build ?? 'sin'}` : 'el respaldo no deja run en el servidor');
          console.info(`[Omicron] análisis servido por ${r.fuente === 'motor' ? 'el motor analizar-cv' : 'el fallback Gemini'} · guardado: ${r.guardado ? 'sí' : 'no'} · huella: ${r.build ?? 'sin'}`);
        } else {
          // Ningun motor trajo un analisis completo — show error, NO local
          // fallback con datos falsos
          console.error('[Omicron] AI result incomplete. No local fallback.');
          analyzed = null;
          registrar('analisis', 'fallido', 'el análisis llegó sin ejes');
        }
      } catch (err) {
        // Any error from IA → NO fallback local (prefer error over wrong data)
        console.error('[Omicron] AI threw:', err);
        analyzed = null;
        registrar('analisis', 'fallido', 'la IA no respondió');
      }

      // Clear timers
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (cuentaRef.current) { clearInterval(cuentaRef.current); cuentaRef.current = null; }

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
      registrar('gemelo', 'hecho', `${analyzed.seniorLabel} · ${analyzed.years} años`);

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
      if (cuentaRef.current) { clearInterval(cuentaRef.current); cuentaRef.current = null; }
      if (cancelledRef.current) return;
      console.error('[Omicron] activateGemeloCompleto failed:', err);
      // Even on catastrophic failure, show clear error
      setLastError('catastrophic');
      setMsg('Error al procesar. Intenta de nuevo.');
      toast('Error inesperado. Reintenta.', 'error');
      setPhase('upload');
      isProcessingRef.current = false;
    }
  }, [cvText, cvFileName, toast, profile?.id, persistAnalysis, registrar]);

  return {
    // State
    phase, currentStep, completedSteps, dossier, ai,
    hitos, segundos,
    cvText, setCvText, cvFileName, cvReadOk, msg, pushes,
    rep, hasExistingCV, gemelo, profile, lastError,
    isProcessing: isProcessingRef.current,
    pendingPersist, persisted, persisting, persistError,
    // Actions
    onCVFile, activateGemeloCompleto, cancelActivation, persistAnalysis,
  };
}
