// Hook compartido para estadísticas de Ómicrom (racha diaria, analítica de apertura).
// Usado por AppShell y UApp para mantener consistencia.

import { useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '@/store/AppContext';

export function useOmicronStats() {
  const { authStatus } = useApp();

  // Registrar actividad diaria para racha (solo con sesión)
  useEffect(() => {
    if (authStatus === 'authenticated') {
      supabase.rpc('register_daily_activity', { p_challenge: false, p_pe: 0 })
        .then(({ error }) => {
          if (error) console.warn('[useOmicronStats] register_daily_activity failed:', error.message);
        });
    }
  }, [authStatus]);

  // Analítica de apertura (visit count, daily return)
  useEffect(() => {
    const key = 'omicron_visit_count';
    const count = parseInt(localStorage.getItem(key) ?? '0');
    localStorage.setItem(key, String(count + 1));

    import('@/shared/utils/analytics').then(({ track }) => {
      track('app_opened');
      if (count > 0) track('daily_return');
    }).catch(() => {});
  }, []);
}
