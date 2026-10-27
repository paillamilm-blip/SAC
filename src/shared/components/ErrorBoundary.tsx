// components/shared/ErrorBoundary.tsx
// Captura errores de render de cualquier pestaña/módulo y muestra un panel
// holográfico en vez de dejar la app en pantalla blanca.
import { C, tint, SIZE } from '@/theme';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Etiqueta opcional para identificar qué sección falló (ej. "Bóveda"). */
  section?: string;
}
interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Error desconocido' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log para diagnóstico (visible en consola del navegador).
    console.error('[Ómicrom · ErrorBoundary]', this.props.section ?? '', error, info);
  }

  private handleReset = () => this.setState({ hasError: false, message: '' });
  private handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.iconRing}>
            <span style={styles.icon}>⚠</span>
          </div>
          <div style={styles.title}>FALLO EN EL MÓDULO</div>
          {this.props.section && <div style={styles.section}>{this.props.section}</div>}
          <p style={styles.msg}>{this.state.message}</p>
          <div style={styles.btnRow}>
            <button style={styles.btnGhost} onClick={this.handleReset}>Reintentar</button>
            <button style={styles.btnPrimary} onClick={this.handleReload}>Recargar sistema</button>
          </div>
          <div style={styles.hint}>Si el problema persiste, cierra sesión y vuelve a entrar.</div>
        </div>
      </div>
    );
  }
}

const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";
const RAJ = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', width: '100%', padding: 24, background: C.bg,
  },
  card: {
    width: '100%', maxWidth: 340, textAlign: 'center', padding: '28px 22px',
    borderRadius: 16, border: `1px solid ${tint(C.gold, 35)}`,
    background: `linear-gradient(145deg, ${C.surface}, ${C.overlay})`,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    boxShadow: `0 0 30px ${tint(C.gold, 18)}, inset 0 1px 1px ${C.glass}`,
  },
  iconRing: {
    width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${tint(C.gold, 50)}`, background: tint(C.gold, 8),
    boxShadow: `0 0 18px ${tint(C.gold, 35)}`,
    animation: 'amberBreathe 2.8s ease-in-out infinite',
  },
  icon: { fontSize: SIZE.xxl, color: C.gold },
  title: { fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: C.gold, fontWeight: 700 },
  section: { fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: tint(C.gold, 60), marginTop: 4, textTransform: 'uppercase' },
  msg: {
    fontFamily: MONO, fontSize: 11, color: '#9fb3cc', margin: '14px 0 20px',
    lineHeight: 1.5, wordBreak: 'break-word',
  },
  btnRow: { display: 'flex', gap: 10 },
  btnGhost: {
    flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
    background: C.cyanGhost, border: `1px solid ${tint(C.cyan, 35)}`,
    color: C.cyan, fontFamily: RAJ, fontWeight: 700, fontSize: 13,
  },
  btnPrimary: {
    flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
    background: `linear-gradient(90deg, ${C.cyan}, #008b9e)`, border: 'none',
    color: C.bg, fontFamily: RAJ, fontWeight: 700, fontSize: 13,
    boxShadow: `0 0 15px ${tint(C.cyan, 35)}`,
  },
  hint: { fontFamily: MONO, fontSize: 9, color: 'rgba(159,179,204,0.5)', marginTop: 16, letterSpacing: 0.5 },
};
