// src/components/shared/InstallPWA.tsx
// Botón/banner "Instalar app": captura el evento beforeinstallprompt para
// ofrecer la instalación nativa con un toque. En iOS (que no dispara ese
// evento) muestra la guía "Compartir → Añadir a inicio". Se oculta solo si
// la app ya está instalada (display-mode: standalone).
import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { C, FONT, RADIUS, tint, SIZE } from '@/theme';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'omicron_pwa_dismissed';

export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (standalone) return; // ya está instalada
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari no emite beforeinstallprompt → mostramos la guía manual.
    const isIOS = /iphone|ipad|ipod/i.test(nav.userAgent);
    const isSafari = /safari/i.test(nav.userAgent) && !/crios|fxios|android/i.test(nav.userAgent);
    if (isIOS && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch { /* noop */ }
    setDeferred(null);
    setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
  };

  return (
    <div
      style={{
        position: 'fixed', left: '50%', bottom: 84, transform: 'translateX(-50%)', zIndex: 140,
        display: 'flex', alignItems: 'center', gap: 12, maxWidth: '92vw',
        padding: '10px 12px 10px 16px', borderRadius: RADIUS.pill,
        background: C.surface, border: `1px solid ${C.cyanDim}`,
        boxShadow: `0 12px 40px ${C.scrim}, 0 0 22px ${tint(C.cyan, 18)}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>Ω</span>
      {iosHint ? (
        <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.4 }}>
          Instala Ómicrom: toca <Share size={13} style={{ verticalAlign: 'middle', color: C.cyan }} /> Compartir y
          {' '}<b style={{ color: C.cyan }}>Añadir a inicio</b>
        </span>
      ) : (
        <>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: C.ink }}>
            Instala Ómicrom como app
          </span>
          <button
            onClick={install}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: RADIUS.pill,
              cursor: 'pointer', background: `linear-gradient(135deg, #8bd4ff, ${C.cyan})`, border: 'none',
              color: C.bg, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700,
            }}
          >
            <Download size={14} /> Instalar
          </button>
        </>
      )}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        style={{ display: 'flex', background: 'none', border: 'none', color: 'rgba(234,242,255,0.5)', cursor: 'pointer', padding: 4 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
