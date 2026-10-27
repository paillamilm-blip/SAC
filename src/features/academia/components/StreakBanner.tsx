// components/shared/StreakBanner.tsx
// ═══════════════════════════════════════════════════════════════════════
// STREAK BANNER — Muestra la racha prominente con multiplicador PE.
// "La racha que duele perder" — FOMO + gamificación intrínseca.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { C, FONT, tint, SIZE } from '@/theme';
import { useApp } from '@/store/AppContext';
import { streakDays } from '@/features/gemelo/services/profile';

/** Multiplicador PE basado en la racha */
function getMultiplier(streak: number): { mult: number; label: string; nextAt: number } {
  if (streak >= 30) return { mult: 2.0, label: 'x2.0', nextAt: 0 };
  if (streak >= 14) return { mult: 1.75, label: 'x1.75', nextAt: 30 };
  if (streak >= 7) return { mult: 1.5, label: 'x1.5', nextAt: 14 };
  if (streak >= 3) return { mult: 1.25, label: 'x1.25', nextAt: 7 };
  return { mult: 1.0, label: 'x1.0', nextAt: 3 };
}

/** Badge de racha */
function getStreakBadge(streak: number): string | null {
  if (streak >= 30) return 'Imparable';
  if (streak >= 14) return 'Constante';
  if (streak >= 7) return 'En racha';
  return null;
}

export function StreakBanner() {
  const { profile } = useApp();
  const [showDetail, setShowDetail] = useState(false);

  // Fuente canónica: la racha server-side del perfil (llega por Realtime).
  // El conteo local es solo degradación para invitados / sin sesión.
  const streak = profile?.streak_days ?? streakDays();

  // Registrar actividad del día actual + server-side streak
  useEffect(() => {
    try {
      const key = 'omicron_streak_today';
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(key) !== today) {
        localStorage.setItem(key, today);
        // CABLE 3: Registrar actividad server-side para streak persistente
        import('@/infrastructure/supabase/client').then(({ supabase }) => {
          supabase.rpc('register_daily_activity', { p_challenge: false, p_pe: 0 }).then(() => {});
        });
      }
    } catch { /* Safari private mode / localStorage full */ }
  }, []);

  if (streak === 0) {
    return (
      <div style={S.banner0}>
        <span style={S.fireOff}>💤</span>
        <span style={S.text0}>Sin racha — haz algo hoy para empezar</span>
      </div>
    );
  }

  const { mult, label, nextAt } = getMultiplier(streak);
  const badge = getStreakBadge(streak);
  const daysToNext = nextAt > 0 ? nextAt - streak : 0;

  return (
    <div style={S.banner} onClick={() => setShowDetail(!showDetail)}>
      <div style={S.row}>
        <span style={S.fire}>🔥</span>
        <span style={S.streakNum}>{streak}</span>
        <span style={S.days}>día{streak > 1 ? 's' : ''}</span>
        <span style={S.mult}>{label} PE</span>
        {badge && <span style={S.badge}>{badge}</span>}
      </div>

      {showDetail && (
        <div style={S.detail}>
          <div style={S.detailRow}>
            <span style={S.detailLabel}>Multiplicador actual:</span>
            <span style={S.detailValue}>{label} en todo lo que ganes</span>
          </div>
          {daysToNext > 0 && (
            <div style={S.detailRow}>
              <span style={S.detailLabel}>Próximo nivel:</span>
              <span style={S.detailValue}>{daysToNext} día{daysToNext > 1 ? 's' : ''} más → x{mult + 0.25}</span>
            </div>
          )}
          <div style={S.progress}>
            <div style={{ ...S.progressFill, width: `${Math.min(100, (streak / 30) * 100)}%` }} />
          </div>
          <div style={S.tiers}>
            <span style={{ color: streak >= 3 ? C.green : C.mut }}>3d x1.25</span>
            <span style={{ color: streak >= 7 ? C.cyan : C.mut }}>7d x1.5</span>
            <span style={{ color: streak >= 14 ? C.gold : C.mut }}>14d x1.75</span>
            <span style={{ color: streak >= 30 ? C.red : C.mut }}>30d x2.0</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Aplica multiplicador de racha a PE ganados (racha canónica server-side) */
export function applyStreakMultiplier(basePe: number, streak: number): number {
  const { mult } = getMultiplier(streak);
  return Math.round(basePe * mult);
}

const S: Record<string, React.CSSProperties> = {
  banner: {
    margin: '0 0 12px',
    padding: '10px 14px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${tint(C.flame, 8)}, ${tint(C.gold, 6)})`,
    border: `1px solid ${tint(C.gold, 25)}`,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  banner0: {
    margin: '0 0 12px',
    padding: '8px 14px',
    borderRadius: 12,
    background: tint(C.mut, 6),
    border: `1px solid ${tint(C.mut, 15)}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  fire: { fontSize: 20, filter: 'drop-shadow(0 0 6px ${tint(C.flame, 60)})' },
  fireOff: { fontSize: 13, opacity: 0.5 },
  streakNum: {
    fontFamily: FONT.mono,
    fontSize: 20,
    fontWeight: 700,
    color: C.gold,
    textShadow: `0 0 10px ${tint(C.gold, 40)}`,
    fontVariantNumeric: 'tabular-nums',
  },
  days: { fontFamily: FONT.mono, fontSize: 11, color: C.mut, letterSpacing: 1 },
  mult: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.green,
    background: tint(C.green, 10),
    border: `1px solid ${tint(C.green, 30)}`,
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 6,
  },
  badge: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: C.gold,
    background: tint(C.gold, 10),
    border: `1px solid ${tint(C.gold, 30)}`,
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 'auto',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  text0: { fontFamily: FONT.mono, fontSize: 11, color: C.mut },
  detail: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${tint(C.gold, 15)}`,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  detailValue: { fontFamily: FONT.mono, fontSize: 9, color: C.ink },
  progress: {
    height: 4,
    borderRadius: 2,
    background: C.glass2,
    margin: '8px 0 6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    background: `linear-gradient(90deg, ${C.flame}, ${C.gold}, ${C.green})`,
    transition: 'width 0.5s',
  },
  tiers: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: FONT.mono,
    fontSize: SIZE.xxs,
    letterSpacing: 0.5,
  },
};
