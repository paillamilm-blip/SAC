// src/store/RealtimeContext.tsx
// Provee la red en tiempo real a toda la app con UNA sola conexión de canal
// (evita presencia duplicada / doble conteo). Además, detecta la progresión
// REAL del propio nodo (subida de nivel o de reputación) y la emite al resto
// de la red: así el "todo está conectado" se vuelve multiusuario de verdad.
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useApp } from './AppContext';
import { injectKeyframes } from '../theme';
import { useRealtimeNetwork, type RealtimeNetwork } from '../hooks/useRealtimeNetwork';

const RealtimeContext = createContext<RealtimeNetwork | null>(null);

const FALLBACK: RealtimeNetwork = {
  onlineCount: 0,
  nodes: [],
  events: [],
  broadcast: () => {},
  connected: false,
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { profile } = useApp();

  const net = useRealtimeNetwork(profile?.id, {
    username: profile?.username ?? 'Nodo',
    node_type: profile?.node_type ?? 'Nodo Operativo',
    node_level: profile?.node_level ?? 1,
  });

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Progresión real → evento en vivo para toda la red.
  const prevRef = useRef<{ rep: number; level: number; streak: number } | null>(null);
  useEffect(() => {
    if (!profile) {
      prevRef.current = null;
      return;
    }
    const cur = {
      rep: profile.reputation_score ?? 0,
      level: profile.node_level ?? 1,
      streak: profile.streak_days ?? 0,
    };
    const prev = prevRef.current;
    if (prev) {
      // Hitos de racha (3/7/14/30): solo se anuncia el cruce, no cada día.
      const tierCrossed = [3, 7, 14, 30].find(t => prev.streak < t && cur.streak >= t);
      if (tierCrossed) {
        net.broadcast(`${profile.username} lleva ${tierCrossed} días seguidos`, 'action');
      }
      if (cur.level > prev.level) {
        net.broadcast(`${profile.username} evolucionó a ${profile.node_type}`, 'level');
      } else if (cur.rep > prev.rep) {
        net.broadcast(`${profile.username} subió su reputación a ${cur.rep}`, 'action');
      }
    }
    prevRef.current = cur;
    // net.broadcast es estable (useCallback); dependemos solo del cambio de perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.reputation_score, profile?.node_level, profile?.node_type, profile?.username, profile?.streak_days]);

  return <RealtimeContext.Provider value={net}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeNetwork {
  const ctx = useContext(RealtimeContext);
  return ctx ?? FALLBACK;
}
