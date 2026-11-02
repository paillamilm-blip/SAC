// shared/components/OrbTopbar.tsx
// ═══════════════════════════════════════════════════════════════════════
// LA FRANJA DEL ORBE — el orbe arriba de todo.
//
// Ruling del dueño (2026-11-01): el orbe deja de ser una pantalla y pasa a
// ser la marca viva que preside todas. Izquierda: el orbe geodésico, que
// también es el botón para volver al home desde cualquier estado. Derecha: el
// badge de estado (la reputación real del Gemelo), que abre la credencial.
//
// Un solo orbe en la franja: cuando hay sesión no se repite el avatar, porque
// el avatar Y el orbe son la misma identidad y duplicarlos fue lo que hizo
// parecer que la app tenía dos cabezas.
// ═══════════════════════════════════════════════════════════════════════
import type { CSSProperties } from 'react';
import { BLUR, C, FONT, SIZE, RADIUS, tint, LETRA} from '@/theme';
import { GeodesicOrb } from './GeodesicOrb';

interface Props {
  /** El acento del usuario. El orbe lo recibe: es la única marca personal. */
  color: string;
  /** Reputación real del Gemelo, 0-100. `null` en el home: ahí el número lo
   *  lee el propio orbe en el centro de la pantalla y repetirlo en la franja
   *  sería tener dos termómetros del mismo paciente. */
  reputacion: number | null;
  /** Sin sesión: la acción primaria es iniciar sesión, y sólo ahí aparece. */
  guest: boolean;
  /** El orbe está volando al centro del mapa: la franja esconde el suyo para que
   *  nunca haya dos. Se esconde con `visibility`, no con `display`: el cuadro
   *  vacío es lo que usa el vuelo para saber de dónde sale. */
  enVuelo?: boolean;
  onInicio: () => void;
  onCredencial: () => void;
  onIniciarSesion: () => void;
}

const franja: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 56,
  padding: '6px 12px',
  background: C.sticky,
  backdropFilter: `blur(${BLUR.cristal}px)`,
  WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
  borderBottom: `1px solid ${C.lineSoft}`,
  position: 'sticky',
  top: 0,
  zIndex: 30,
  flexShrink: 0,
};

const marca: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 44,
  padding: '0 4px 0 0',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: C.ink,
};

const textoMarca: CSSProperties = {
  fontFamily: FONT.body,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: C.mut,
};

const credencial: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 44,
  padding: '6px 12px',
  borderRadius: RADIUS.sm,
  border: `1px solid ${tint(C.gold, 34)}`,
  background: tint(C.gold, 10),
  cursor: 'pointer',
  color: C.ink,
  fontVariantNumeric: 'tabular-nums',
};

const sesion: CSSProperties = {
  minHeight: 44,
  padding: '10px 16px',
  borderRadius: RADIUS.sm,
  border: 'none',
  background: `linear-gradient(135deg, ${C.gold}, ${C.amberDeep})`,
  color: C.onAccent,
  fontFamily: FONT.body,
  fontSize: SIZE.sm,
  fontWeight: 700,
  letterSpacing: LETRA.apretada,
  cursor: 'pointer',
};

export function OrbTopbar({ color, reputacion, guest, enVuelo = false, onInicio, onCredencial, onIniciarSesion }: Props) {
  return (
    <header style={franja}>
      <button type="button" style={marca} onClick={onInicio} aria-label="Volver al inicio" title="Inicio">
        <span data-orbe="franja" style={{ display: 'flex', visibility: enVuelo ? 'hidden' : 'visible' }}>
          <GeodesicOrb size={30} nodes={12} color={color} spinning={0} intensity={0.7} />
        </span>
        <span style={textoMarca}>Ómicrom</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {reputacion !== null && (
          <button
            type="button"
            style={credencial}
            onClick={onCredencial}
            aria-label={`Ver mi credencial, reputación ${reputacion} sobre 100`}
            title="Mi credencial"
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} aria-hidden />
            <span style={{ fontSize: SIZE.md, fontWeight: 800, letterSpacing: LETRA.titulo }}>{reputacion}</span>
            <span style={{ fontSize: SIZE.xs, color: C.mut }}>/100</span>
          </button>
        )}
        {guest && (
          <button type="button" style={sesion} onClick={onIniciarSesion}>Iniciar sesión</button>
        )}
      </div>
    </header>
  );
}
