import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ANCHO } from '@/theme';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
}

let modalSeq = 0;

export function Modal({ title, onClose, children, maxHeight = 'max-h-[90vh]' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${++modalSeq}`).current;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Focus trap: mantiene el tabulado dentro del modal.
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(nodes).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (list.length === 0) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);

    // Bloquea el scroll del fondo mientras el modal está abierto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Mueve el foco al modal al abrir (accesibilidad de teclado/lector).
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full bg-omicron-card border border-omicron-border rounded-t-3xl ${maxHeight} flex flex-col shadow-2xl outline-none`}
        style={{ maxWidth: ANCHO.bolsillo }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1 rounded-full bg-omicron-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-omicron-border">
          <h2 id={titleId} className="text-omicron-text font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-xl bg-omicron-surface flex items-center justify-center text-omicron-subtle hover:text-omicron-text transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
