// shared/components/EmotionBridge.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Emotion Signal Bridge
//
// Reads real user data from ProfileContext and computes emotion signals
// for the EmotionProvider. This is the "nervous system" that connects
// your actual state to the ambient UI.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { EmotionProvider, useEmotion } from '@/shared/components/EmotionAwareUI';
import { ambientDrone } from '@/shared/utils/ambientDrone';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** Syncs ambient drone to emotion state — via useEffect (NOT render phase) */
function DroneSync() {
  const { emotion } = useEmotion();
  useEffect(() => {
    ambientDrone.setEmotion(emotion);
  }, [emotion]);
  return null;
}

/**
 * Wraps EmotionProvider with real signals derived from the user's profile.
 * Place this INSIDE AppProvider (needs access to useApp).
 */
export function EmotionBridge({ children }: Props) {
  const { profile } = useApp();

  // Refs for session tracking (moved OUT of useMemo to avoid side effects in pure computation)
  const sessionPERef = useRef<number>(0);
  const sessionNodeRef = useRef<string>('');

  // Initialize refs from sessionStorage on mount
  useEffect(() => {
    sessionPERef.current = Number(sessionStorage.getItem('omicron_session_pe') ?? '0');
    sessionNodeRef.current = sessionStorage.getItem('omicron_session_node') ?? '';
  }, []);

  // Persist to sessionStorage via effect (NOT in useMemo)
  useEffect(() => {
    if (!profile) return;
    const pe = profile.pe_points ?? 0;
    const nodeType = (profile as unknown as Record<string, unknown>).node_type as string | undefined ?? '';
    if (pe > 0) {
      sessionStorage.setItem('omicron_session_pe', String(pe));
      sessionPERef.current = pe;
    }
    if (nodeType) {
      sessionStorage.setItem('omicron_session_node', nodeType);
      sessionNodeRef.current = nodeType;
    }
  }, [profile?.pe_points, profile]);

  // Pure computation — no side effects
  const signals = useMemo(() => {
    if (!profile) return undefined;

    const streakDays = (profile as unknown as Record<string, unknown>).streak_days as number | undefined ?? 0;

    const lastActive = (profile as unknown as Record<string, unknown>).last_active_at as string | undefined;
    let daysSinceLastActivity = 0;
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const now = new Date();
      daysSinceLastActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const pe = profile.pe_points ?? 0;
    const recentAchievement = pe > sessionPERef.current && sessionPERef.current > 0;

    const nodeType = (profile as unknown as Record<string, unknown>).node_type as string | undefined ?? '';
    const recentLevelUp = nodeType !== sessionNodeRef.current && sessionNodeRef.current !== '';

    return { streakDays, daysSinceLastActivity, recentAchievement, recentLevelUp };
  }, [profile]);

  return (
    <EmotionProvider signals={signals}>
      <DroneSync />
      {children}
    </EmotionProvider>
  );
}
