// components/shared/DailyChallengeCard.tsx
// ═══════════════════════════════════════════════════════════════════════
// DAILY CHALLENGE CARD — Reto del día con timer y recompensa.
// Aparece en el perfil / shell principal.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { C, FONT, tint, SIZE } from '@/theme';
import { useUserColor } from '@/shared/hooks/useUserColor';
import {
  getDailyChallenge,
  isChallengeCompleted,
  markChallengeCompleted,
} from '@/features/academia/services/dailyChallenge';
import { applyStreakMultiplier } from './StreakBanner';
import { supabase } from '@/infrastructure/supabase/client';
import { useRealtime } from '@/store/RealtimeContext';
import { useApp } from '@/store/AppContext';

interface Props {
  onNavigate?: (tab: string) => void;
}

export function DailyChallengeCard({ onNavigate }: Props) {
  const { gemelo, profile } = useApp();
  const uc = useUserColor();
  const challenge = getDailyChallenge(gemelo);
  // Fuente canónica: daily_activity de hoy (solo la fila propia, por RLS).
  // null = aún sin confirmar con el servidor; el flag local solo degrada
  // a invitados/sin sesión.
  const [completedToday, setCompletedToday] = useState<boolean | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const cStreak = profile?.streak_days ?? 0;
  const { broadcast } = useRealtime();

  useEffect(() => {
    if (!profile?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_activity')
      .select('challenge_completed')
      .eq('user_id', profile.id)
      .eq('activity_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCompletedToday(data.challenge_completed === true);
      });
  }, [profile?.id]);

  if (!challenge) return null;

  const completed = completedToday ?? isChallengeCompleted(challenge.id);

  function handleComplete() {
    if (!challenge) return;
    markChallengeCompleted(challenge.id);
    setCompletedToday(true);
    const basePe = challenge.reward.pe;
    const finalPe = applyStreakMultiplier(basePe, cStreak);
    setJustCompleted(true);

    // Navegar según el tipo de challenge
    if (onNavigate) {
      const tab = challenge.targetTab;
      if (tab) setTimeout(() => onNavigate(tab), 800);
    }

    // Guardar PE ganados (para mostrar en toast)
    localStorage.setItem('omicron_last_challenge_pe', String(finalPe));

    // CABLE 5: Challenge → PE server-side + Broadcast a la red
    supabase.rpc('register_daily_activity', { p_challenge: true, p_pe: finalPe }).then(() => {});
    broadcast(`completó su reto diario (+${finalPe} PE)`, 'action');
  }

  if (completed && !justCompleted) {
    return (
      <div style={S.cardDone}>
        <span style={S.checkEmoji}>✅</span>
        <div>
          <div style={S.doneTitle}>Reto completado</div>
          <div style={S.doneSubtitle}>Vuelve mañana para el siguiente</div>
        </div>
        {cStreak > 1 && (
          <span style={S.cStreak}>🎯 {cStreak} retos seguidos</span>
        )}
      </div>
    );
  }

  if (justCompleted) {
    const pe = parseInt(localStorage.getItem('omicron_last_challenge_pe') ?? '0');
    return (
      <div style={S.cardCelebrate}>
        <div style={S.celebrateEmoji}>🎉</div>
        <div style={S.celebrateTitle}>¡Reto completado!</div>
        <div style={S.celebratePe}>+{pe} PE ganados</div>
        {cStreak > 1 && <div style={S.celebrateStreak}>🎯 {cStreak} retos seguidos</div>}
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.emoji}>{challenge.icon}</span>
        <div style={S.headerText}>
          <span style={{ ...S.label, color: uc }}>RETO DEL DÍA</span>
          <span style={S.time}>{challenge.duration}</span>
        </div>
        <span style={S.reward}>+{challenge.reward.pe} PE</span>
      </div>

      <div style={S.title}>{challenge.title}</div>
      <div style={S.desc}>{challenge.description}</div>

      <button onClick={handleComplete} style={S.cta}>
        {challenge.action}
      </button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    margin: '0 0 14px',
    padding: '16px',
    borderRadius: 14,
    background: `linear-gradient(145deg, ${tint(C.cyan, 6)}, ${tint(C.purple, 4)})`,
    border: `1px solid ${tint(C.cyan, 20)}`,
    boxShadow: `0 4px 16px ${tint(C.black, 30)}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  emoji: { fontSize: SIZE.xl },
  headerText: { flex: 1, display: 'flex', flexDirection: 'column' as const },
  label: { fontFamily: FONT.mono, fontSize: 9, color: C.cyan, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  time: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  reward: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.green,
    fontWeight: 700,
    background: tint(C.green, 10),
    padding: '4px 8px',
    borderRadius: 6,
  },
  title: { fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 },
  desc: { fontFamily: FONT.display, fontSize: SIZE.xs, color: C.cyan, lineHeight: 1.4, marginBottom: 12 },
  cta: {
    width: '100%',
    padding: '11px',
    borderRadius: 8,
    border: 'none',
    background: `linear-gradient(135deg, ${C.cyan}, ${C.tealDeep})`,
    color: C.onAccent,
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    cursor: 'pointer',
    boxShadow: `0 0 14px ${tint(C.cyan, 30)}`,
  },
  cardDone: {
    margin: '0 0 14px',
    padding: '12px 14px',
    borderRadius: 14,
    background: tint(C.green, 5),
    border: `1px solid ${tint(C.green, 20)}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkEmoji: { fontSize: SIZE.lg },
  doneTitle: { fontFamily: FONT.mono, fontSize: 11, color: C.green },
  doneSubtitle: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  cStreak: {
    marginLeft: 'auto',
    fontFamily: FONT.mono,
    fontSize: 9,
    color: C.gold,
    background: tint(C.gold, 10),
    padding: '4px 8px',
    borderRadius: 4,
  },
  cardCelebrate: {
    margin: '0 0 14px',
    padding: '20px 16px',
    borderRadius: 14,
    background: `linear-gradient(145deg, ${tint(C.gold, 8)}, ${tint(C.green, 6)})`,
    border: `1px solid ${tint(C.gold, 30)}`,
    textAlign: 'center' as const,
  },
  celebrateEmoji: { fontSize: 32, marginBottom: 6 },
  celebrateTitle: { fontFamily: FONT.display, fontSize: SIZE.md, fontWeight: 700, color: C.ink },
  celebratePe: { fontFamily: FONT.mono, fontSize: 13, color: C.green, marginTop: 4 },
  celebrateStreak: { fontFamily: FONT.mono, fontSize: 11, color: C.gold, marginTop: 6 },
};
