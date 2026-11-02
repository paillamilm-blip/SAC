// components/shared/PushPermissionBanner.tsx
// ═══════════════════════════════════════════════════════════════════════
// PUSH PERMISSION BANNER — Pide permiso de push de forma amigable.
// Solo aparece una vez, después de que el usuario interactuó con la app.
// No aparece en la primera visita (no spam).
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { C, FONT, tint } from '@/theme';
import { useApp } from '@/store/AppContext';
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  isSubscribed,
} from '@/infrastructure/pwa/push';

export function PushPermissionBanner() {
  const { profile } = useApp();
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    void checkShouldShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function checkShouldShow() {
    if (!profile?.id) return;
    if (!isPushSupported()) return;

    const permission = getPushPermission();
    if (permission === 'granted' || permission === 'denied') return;

    // No mostrar en primera sesión
    const visits = parseInt(localStorage.getItem('omicron_visit_count') ?? '0');
    if (visits < 2) return;

    // No mostrar si ya se descartó
    const dismissed = localStorage.getItem('omicron_push_dismissed');
    if (dismissed) return;

    // No mostrar si ya está suscrito
    const sub = await isSubscribed();
    if (sub) return;

    setShow(true);
  }

  async function handleSubscribe() {
    if (!profile?.id) return;
    setSubscribing(true);
    const ok = await subscribeToPush(profile.id);
    setSubscribing(false);
    if (ok) {
      setShow(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem('omicron_push_dismissed', 'true');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={S.banner}>
      <button onClick={handleDismiss} style={S.close}><X size={14} /></button>
      <div style={S.row}>
        <div style={S.icon}><Bell size={16} /></div>
        <div style={S.text}>
          <div style={S.title}>¿Activar notificaciones?</div>
          <div style={S.subtitle}>Te aviso cuando haya empleos nuevos que calzan con tu perfil, o cuando tu racha esté por romperse.</div>
        </div>
      </div>
      <div style={S.actions}>
        <button onClick={handleSubscribe} disabled={subscribing} style={S.btnYes}>
          {subscribing ? 'Activando…' : 'Sí, avísame'}
        </button>
        <button onClick={handleDismiss} style={S.btnNo}>Después</button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  banner: {
    position: 'relative',
    margin: '0 0 14px',
    padding: '16px',
    borderRadius: 14,
    background: `linear-gradient(145deg, ${tint(C.purple, 8)}, ${tint(C.cyan, 5)})`,
    border: `1px solid ${tint(C.purple, 30)}`,
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'none',
    border: 'none',
    color: C.mut,
    cursor: 'pointer',
    display: 'flex',
  },
  row: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: tint(C.purple, 20),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.iris,
    flexShrink: 0,
  },
  text: { flex: 1, paddingRight: 20 },
  title: { fontFamily: FONT.display, fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 3 },
  subtitle: { fontFamily: FONT.display, fontSize: 11, color: C.cyan, lineHeight: 1.4 },
  actions: { display: 'flex', gap: 8 },
  btnYes: {
    flex: 1,
    padding: '10px',
    borderRadius: 8,
    border: 'none',
    background: `linear-gradient(135deg, ${C.purple}, ${C.iris})`,
    color: '#fff',
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnNo: {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${tint(C.mut, 30)}`,
    background: 'transparent',
    color: C.mut,
    fontFamily: FONT.mono,
    fontSize: 11,
    cursor: 'pointer',
  },
};
