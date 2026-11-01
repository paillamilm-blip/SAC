// components/shared/ConnectionBanner.tsx
// Aviso global de estado de conexión. Útil en móvil con señal inestable
// (complementa la PWA): muestra una barra cuando se pierde internet y un
// "reconectado" breve al recuperarlo.
import { C, tint, SIZE, ANIM } from '@/theme';
import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function ConnectionBanner() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const goOnline = () => {
      setOnline(true);
      setReconnected(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => setReconnected(false), 2800);
    };
    const goOffline = () => { setOnline(false); setReconnected(false); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (t) clearTimeout(t);
    };
  }, []);

  if (online && !reconnected) return null;

  const off = !online;
  return (
    <div
      style={{
        ...S.bar,
        background: off
          ? `linear-gradient(90deg, ${tint(C.gold, 95)}, ${tint(C.red, 95)})`
          : `linear-gradient(90deg, ${tint(C.green, 95)}, ${tint(C.cyan, 92)})`,
        color: C.bg,
      }}
    >
      {off ? <WifiOff size={14} /> : <Wifi size={14} />}
      <span style={S.txt}>
        {off ? 'Sin conexión · reintentando…' : 'Conexión restablecida'}
      </span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: 'min(100%, 430px)', zIndex: 90,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '6px 12px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: SIZE.sm, letterSpacing: 0.5,
    boxShadow: `0 4px 16px ${tint(C.black, 40)}`,
    animation: ANIM.drop,
  },
  txt: { whiteSpace: 'nowrap' },
};
