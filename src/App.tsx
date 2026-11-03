import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/infrastructure/query/client';
import { AppProvider } from './store/AppContext';
import { ToastProvider } from '@/shared/components/Toast';
import { ConnectionBanner } from '@/shared/components/ConnectionBanner';
import { RealtimeProvider } from './store/RealtimeContext';
import { EmotionBridge } from '@/shared/components/EmotionBridge';
import { VerifyCredentialView } from '@/features/gemelo/components/VerifyCredential';
import { BASE, esRutaUnificada } from '@/features/brecha/ui/ruta';

const UApp = lazy(() => import('@/features/brecha/ui/UApp'));

export default function App() {
  // Verificación pública del Pasaporte (no requiere cuenta): ?verificar=<token>
  const verifyToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('verificar')
    : null;
  if (verifyToken) return <VerifyCredentialView token={verifyToken} />;

  // Es un solo producto: cualquier dirección que no sea /u (la raíz, /anterior, enlaces viejos) abre /u.
  // Se conservan ?query y #hash: el regreso del correo de «olvidé mi contraseña» llega en el hash.
  if (!esRutaUnificada(window.location.pathname)) {
    window.history.replaceState(null, '', `${BASE}${window.location.search}${window.location.hash}`);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ToastProvider>
          <RealtimeProvider>
            <EmotionBridge>
              <ConnectionBanner />
              <Suspense fallback={null}>
                <UApp />
              </Suspense>
            </EmotionBridge>
          </RealtimeProvider>
        </ToastProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
