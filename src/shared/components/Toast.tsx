// components/shared/Toast.tsx
// Sistema de notificaciones (toasts) global, holográfico.
// Uso:  const { toast } = useToast();  toast('Guardado', 'success');
import { C, SIZE, ANIM } from '@/theme';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

interface ToastCtx { toast: (message: string, type?: ToastType) => void; }
const Ctx = createContext<ToastCtx | null>(null);

const COLOR: Record<ToastType, string> = { success: C.green, error: '#ff5066', info: C.cyan };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={S.viewport} role="status" aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div key={t.id} style={{ ...S.toast, borderColor: `${COLOR[t.type]}66`, boxShadow: `0 0 18px ${COLOR[t.type]}33` }}>
            <span style={{ color: COLOR[t.type], display: 'flex', flexShrink: 0 }}>
              {t.type === 'success' ? <CheckCircle2 size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
            </span>
            <span style={S.msg}>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  // Fallback seguro: si por alguna razón no hay provider, no rompas la app.
  if (!ctx) return { toast: (m: string) => console.warn('[toast]', m) };
  return ctx;
}

const S: Record<string, React.CSSProperties> = {
  viewport: {
    position: 'fixed', bottom: 92, left: '50%', transform: 'translateX(-50%)',
    zIndex: 80, display: 'flex', flexDirection: 'column', gap: 8,
    width: 'min(92vw, 380px)', pointerEvents: 'none',
  },
  toast: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px',
    borderRadius: 12, border: '1px solid',
    background: C.surface, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    animation: ANIM.rise,
  },
  msg: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: SIZE.sm,
    color: C.ink, lineHeight: 1.35,
  },
};
