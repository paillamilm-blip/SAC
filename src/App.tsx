import { OrbShell } from '@/features/omicron/components/OrbShell';
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/infrastructure/query/client';
import { AppProvider, useApp } from './store/AppContext';
import { AuthOverlay, GUEST_CTA_LABEL } from '@/features/auth/components/AuthOverlay';
import { Icon } from '@/shared/components/icons';
import { ResetPasswordOverlay } from '@/features/auth/components/ResetPasswordOverlay';
import { supabase } from '@/infrastructure/supabase/client';
import { NoAccess } from '@/features/auth/components/NoAccess';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { InstallPWA } from '@/shared/components/InstallPWA';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { ToastProvider } from '@/shared/components/Toast';
import { ConnectionBanner } from '@/shared/components/ConnectionBanner';
import { RealtimeProvider } from './store/RealtimeContext';
import { LiveNetworkFeed } from '@/features/gemelo/components/LivePresence';
import { PublicProfileGate } from '@/features/gemelo/components/RedSocial';
import { VerifyCredentialView } from '@/features/gemelo/components/VerifyCredential';
import { C, FONT, SIZE } from './theme';
import { SelfManagedPulseBar } from '@/shared/components/LivePulseBar';
import { EmotionBridge } from '@/shared/components/EmotionBridge';
import { omicronAudio } from '@/shared/utils/spatialAudio';


function AppShell() {
  const { authStatus, isLoadingProfile } = useApp();
  const uc = useUserColor();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Force Service Worker update on app load (fixes stale cache serving old builds)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.update().catch(() => {});
          // If a new SW is waiting, tell it to activate immediately
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (newSW) {
              newSW.addEventListener('statechange', () => {
                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                  newSW.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        }
      });
    }
  }, []);

  // Unlock audio on first user gesture (browser policy)
  useEffect(() => {
    const unlock = () => { omicronAudio.unlock(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Track visit count for push permission timing
  useEffect(() => {
    const key = 'omicron_visit_count';
    const count = parseInt(localStorage.getItem(key) ?? '0');
    localStorage.setItem(key, String(count + 1));

    // Analytics: track open + daily return
    import('@/shared/utils/analytics').then(({ track }) => {
      track('app_opened');
      if (count > 0) track('daily_return');
    }).catch(() => {});

    // Register daily activity for streak (server-side)
    if (authStatus === 'authenticated') {
      supabase.rpc('register_daily_activity', { p_challenge: false, p_pe: 0 })
        .then(({ error }) => {
          if (error) console.warn('[App] register_daily_activity failed (RPC may not exist):', error.message);
        });
    }
  }, [authStatus]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Escuchar evento 'omicron:request-auth' para abrir modal de auth
  useEffect(() => {
    const handler = () => setShowAuthModal(true);
    window.addEventListener('omicron:request-auth', handler);
    return () => window.removeEventListener('omicron:request-auth', handler);
  }, []);

  // Timeout: si auth tarda más de 5s, forzar modo guest
  const [forceGuest, setForceGuest] = useState(false);
  useEffect(() => {
    if (authStatus !== 'loading' && !isLoadingProfile) return;
    const timer = setTimeout(() => {
      setForceGuest(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [authStatus, isLoadingProfile]);

  // Precedencia intacta: recuperación de contraseña y sin-acceso cortocircuitan
  // ANTES del árbol de la app, igual que antes del loader animado.
  if (showResetPassword) return <ResetPasswordOverlay onDone={() => setShowResetPassword(false)} />;
  if (authStatus === 'no_access') return <NoAccess />;

  // Condición de carga (idéntica a la original). Con ella derivamos showLoader.
  const showLoader = (authStatus === 'loading' || isLoadingProfile) && !forceGuest;

  // Respetar preferencia de menor movimiento: si el usuario la pide, el orbe
  // solo se desvanece (sin encogerse ni viajar a la esquina).
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Salida del orbe: encoge (110 -> ~44px, scale 0.4) y se desplaza hacia la
  // esquina superior derecha (donde vive el avatar en OrbShell). Con menor
  // movimiento, solo se desvanece.
  const orbExit = prefersReducedMotion
    ? { opacity: 0 }
    : { scale: 0.4, x: '38vw', y: '-40vh', opacity: 0 };

  const isGuest = authStatus === 'unauthenticated' || forceGuest;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        overflow: 'hidden', position: 'relative',
        // El color del usuario se inyecta UNA vez acá y todo el andamio lo
        // hereda por var(--omi-accent). Los componentes dejan de leer localStorage.
        ['--omi-accent' as string]: uc,
      } as CSSProperties}
    >
      <SelfManagedPulseBar />
      <OrbShell />
      {isGuest && showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
      <LiveNetworkFeed />
      <PublicProfileGate />
      <ErrorBoundary section="InstalarApp">
        <InstallPWA />
      </ErrorBoundary>

      {/* Loader de carga superpuesto: mientras showLoader es true cubre la app.
          Al resolverse el gate, AnimatePresence reproduce la salida (~0.6s):
          el orbe encoge y viaja a la esquina superior derecha y luego se
          desmonta, revelando la app ya montada debajo. */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="omicron-loader"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: C.bg, overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 42%, ${C.purpleFaint}, transparent 60%)`, pointerEvents: 'none' }} />
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={orbExit}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{ position: 'relative', width: 110, height: 110 }}
            >
              <GeodesicOrb size={110} nodes={12} color={uc} spinning={25} intensity={0.7} />
            </motion.div>
            {/* El texto y el botón se desvanecen más rápido que el orbe (~0.25s). */}
            <motion.div
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}
            >
              <p style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2.5, color: uc, textTransform: 'uppercase', margin: 0 }}>Conectando a la Red Ómicrom...</p>
              <button onClick={() => setForceGuest(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 16px', borderRadius: 999, background: 'transparent', border: `1px solid ${uc}44`, color: uc, fontFamily: FONT.mono, fontSize: SIZE.xxs, cursor: 'pointer' }}>
                {GUEST_CTA_LABEL} <Icon role="siguiente" size={12} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  // Verificación pública del Pasaporte (no requiere cuenta): ?verificar=<token>
  const verifyToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('verificar')
    : null;
  if (verifyToken) return <VerifyCredentialView token={verifyToken} />;

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ToastProvider>
          <RealtimeProvider>
            <EmotionBridge>
              <ConnectionBanner />
              <AppShell />
            </EmotionBridge>
          </RealtimeProvider>
        </ToastProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
