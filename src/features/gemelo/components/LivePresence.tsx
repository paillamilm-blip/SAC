// src/components/shared/LivePresence.tsx
// El push efímero del header: la actividad más reciente de la red, leída del
// mismo canal Realtime que alimenta el orbe (una sola conexión).
//
// Ya no existe el panel "Red Ómicrom en vivo" ni la tira de nodos conectados:
// mostraban una red de contactos y un chat que nunca usó nadie.
import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '@/store/RealtimeContext';
import { firePulse } from '@/shared/components/LivePulseBar';
import { audioPing } from '@/shared/utils/spatialAudio';
import type { LiveEvent, LiveEventKind } from '@/hooks/useRealtimeNetwork';
import { BLUR, HALO, C, FONT, SIZE, ELEVATED, ANIM, LETRA} from '@/theme';

const KIND_STYLE: Record<LiveEventKind, { color: string; tag: string }> = {
  join:   { color: C.cyan,  tag: 'RED EN VIVO' },
  action: { color: C.cyan,  tag: 'RED EN VIVO' },
  level:  { color: C.gold,  tag: 'ASCENSO' },
  system: { color: C.green, tag: 'SISTEMA' },
};

export function LiveNetworkFeed() {
  const { events, onlineCount } = useRealtime();
  const [current, setCurrent] = useState<LiveEvent | null>(null);
  const lastId = useRef<string | null>(null);
  const lastPingTime = useRef(0);

  useEffect(() => {
    const e = events[0];
    if (e && e.id !== lastId.current) {
      lastId.current = e.id;
      setCurrent(e);
      firePulse('active');
      // Throttle audio: max 1 ping every 3 seconds
      const now = Date.now();
      if (now - lastPingTime.current > 3000) {
        audioPing();
        lastPingTime.current = now;
      }
      const t = setTimeout(() => setCurrent(null), 4600);
      return () => clearTimeout(t);
    }
  }, [events]);

  if (!current) return null;
  const ks = KIND_STYLE[current.kind] ?? KIND_STYLE.action;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(60px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        width: 'min(92%, 420px)',
        padding: '9px 13px',
        borderRadius: 12,
        background: `linear-gradient(180deg, ${C.surface}, ${C.overlay})`,
        border: `1px solid ${ks.color}55`,
        boxShadow: `${ELEVATED.lejana('md', C.scrim)}, 0 0 ${HALO.resplandor}px ${ks.color}22`,
        backdropFilter: `blur(${BLUR.esmeril}px)`,
        WebkitBackdropFilter: `blur(${BLUR.esmeril}px)`,
        animation: ANIM.riseFixed,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: FONT.mono,
          fontSize: SIZE.xxs,
          letterSpacing: LETRA.etiqueta,
          color: ks.color,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ks.color,
            boxShadow: `0 0 ${HALO.ascua}px ${ks.color}`,
            animation: ANIM.breathe,
          }}
        />
        {ks.tag} · {onlineCount.toLocaleString()} NODOS
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, marginTop: 3 }}>
        {current.text}
      </div>
    </div>
  );
}
