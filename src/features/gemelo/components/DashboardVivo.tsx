// components/shared/DashboardVivo.tsx
// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD VIVO — 2 números que CAMBIAN cada día.
// "Si nada cambia, no hay motivo para volver."
// Muestra deltas: rep +/- y posición de ranking.
// Estaba el "Nuevas hoy" de ofertas de trabajo: con 0 ofertas publicadas
// nunca en la historia del proyecto, mostraba un 0 permanente que se leía
// como "no hay demanda" cuando en realidad no hay producto de ofertas.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { C, FONT, tint, SIZE, LETRA} from '@/theme';
import { Icon } from '@/shared/components/icons';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/infrastructure/supabase/client';

interface DashboardData {
  reputation: number;
  repDelta: number;
  ranking: number;
  rankDelta: number;
}

export function DashboardVivo() {
  const { profile } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!profile) return;
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function loadDashboard() {
    if (!profile) return;

    const rep = profile.reputation_score ?? 0;

    // Delta de reputación (vs última vez que abrió)
    const lastRepKey = 'omicron_last_rep';
    const lastRep = parseFloat(localStorage.getItem(lastRepKey) ?? String(rep));
    const repDelta = Math.round((rep - lastRep) * 10) / 10;
    localStorage.setItem(lastRepKey, String(rep));

    // Ranking (cuántos están arriba)
    let ranking = 0;
    let rankDelta = 0;
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('reputation_score', rep);
      ranking = (count ?? 0) + 1;

      const lastRankKey = 'omicron_last_rank';
      const lastRank = parseInt(localStorage.getItem(lastRankKey) ?? String(ranking));
      rankDelta = lastRank - ranking; // positivo = subió
      localStorage.setItem(lastRankKey, String(ranking));
    } catch { /* ignore */ }

    setData({ reputation: rep, repDelta, ranking, rankDelta });
  }

  if (!data) return null;

  return (
    <div style={S.container}>
      {/* Reputación */}
      <div style={S.stat}>
        <div style={S.statValue}>{data.reputation.toFixed(1)}</div>
        <div style={S.statLabel}>Reputación</div>
        {data.repDelta !== 0 && (
          <div style={{ ...S.delta, display: 'flex', alignItems: 'center', gap: 2, color: data.repDelta > 0 ? C.green : C.red }}>
            <Icon role={data.repDelta > 0 ? 'subio' : 'bajó'} size={12} />
            {Math.abs(data.repDelta).toFixed(1)}
          </div>
        )}
      </div>

      {/* Ranking */}
      <div style={S.stat}>
        <div style={S.statValue}>#{data.ranking}</div>
        <div style={S.statLabel}>Ranking</div>
        {data.rankDelta !== 0 && (
          <div style={{ ...S.delta, display: 'flex', alignItems: 'center', gap: 2, color: data.rankDelta > 0 ? C.green : C.red }}>
            <Icon role={data.rankDelta > 0 ? 'subio' : 'bajó'} size={12} />{Math.abs(data.rankDelta)}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 8,
    margin: '0 0 14px',
    padding: '12px',
    borderRadius: 12,
    background: C.wash,
    border: `1px solid ${tint(C.cyan, 10)}`,
  },
  stat: {
    flex: 1,
    textAlign: 'center' as const,
    position: 'relative' as const,
  },
  statValue: {
    fontFamily: FONT.mono,
    fontSize: SIZE.md,
    fontWeight: 700,
    color: C.ink,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontFamily: FONT.mono,
    fontSize: SIZE.xxs,
    color: C.mut,
    letterSpacing: LETRA.etiqueta,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  delta: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    marginTop: 2,
  },
};
