// shared/components/GeodesicOrb.tsx
// ═══════════════════════════════════════════════════════════════════════
// GEODESIC ORB — Pure SVG animated wireframe sphere.
//
// Inspired by: geodesic network globes (reference: dreamstime sphere).
// NO Three.js — loads instantly, works everywhere, 60fps CSS animations.
//
// Props:
//   nodes     — number of visible vertices (0-42). More = denser sphere.
//   color     — primary glow color (user's chosen color)
//   size      — diameter in px (default 200)
//   breathing — whether the core pulses (default true)
//   spinning  — rotation speed in seconds (default 20)
//   intensity — glow brightness 0-1 (default 0.8)
//
// Growth: Start with nodes=0 (just core glow), increase to show
// more vertices on the geodesic surface. Each node = a bright dot
// connected to its neighbors by thin lines.
//
// La geometría (42 vértices de icosaedro subdividido y sus aristas) vive en
// ./orbGeometry, compartida con la raíz del mapa de capacidades: un orbe que
// se escribe dos veces es un orbe que se desincroniza.
// ═══════════════════════════════════════════════════════════════════════
import { HALO, C, ANIM } from '@/theme';
import { useMemo, type CSSProperties } from 'react';
import { tramaOrbe } from './orbGeometry';

interface Props {
  /** Number of visible nodes 0-42 (more = denser sphere) */
  nodes?: number;
  /** Primary color (hex) */
  color?: string;
  /** Diameter in px */
  size?: number;
  /** Core breathing animation */
  breathing?: boolean;
  /** Rotation speed in seconds (0 = no spin) */
  spinning?: number;
  /** Glow intensity 0-1 */
  intensity?: number;
  style?: CSSProperties;
  className?: string;
}

export function GeodesicOrb({
  nodes = 12,
  color = C.cyan,
  size = 200,
  breathing = true,
  spinning = 20,
  intensity = 0.8,
  style,
  className,
}: Props) {
  const clampedNodes = Math.max(0, Math.min(42, nodes));

  const trama = useMemo(() => tramaOrbe(size, clampedNodes), [clampedNodes, size]);

  const glowOpacity = Math.round(intensity * 255).toString(16).padStart(2, '0');
  const coreSize = Math.max(size * 0.15, 20 + clampedNodes * 1.5);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        ...style,
      }}
    >
      {/* Rotation wrapper */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          animation: spinning > 0 ? `omi-spin ${spinning}s linear infinite` : undefined,
        }}
      >
        {/* SVG wireframe — la trama viene centrada en el origen, así que se traslada al centro del cuadro */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
          <g transform={`translate(${size / 2} ${size / 2})`}>
            {/* Edges (lines) */}
            {trama.aristas.map((edge, i) => (
              <line
                key={`e${i}`}
                x1={edge.x1} y1={edge.y1}
                x2={edge.x2} y2={edge.y2}
                stroke={color}
                strokeWidth={trama.grosor}
                strokeOpacity={edge.opacity * 0.5 * intensity}
              />
            ))}
            {/* Vertices (dots) */}
            {trama.puntos.map((v, i) => (
              <circle
                key={`v${i}`}
                cx={v.x} cy={v.y}
                r={v.r}
                fill={color}
                opacity={v.opacity * intensity}
                style={{ filter: `drop-shadow(0 0 ${HALO.chispa}px ${color})` }}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Core glow (center) */}
      <div
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: coreSize,
          height: coreSize,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}${glowOpacity}, ${color}44, transparent 70%)`,
          boxShadow: `0 0 ${HALO.resplandor}px ${color}${glowOpacity}, 0 0 ${HALO.difusion}px ${color}44`,
          animation: breathing ? ANIM.breathe : undefined,
          // Excepción documentada: el núcleo cambia de tamaño solo cuando varía
          // el conteo de nodos (una vez por sesión), no en cada frame. Escalarlo
          // con transform deformaría el halo y su sombra, que es la identidad del orbe.
          transition: 'width 0.8s ease, height 0.8s ease, box-shadow 0.8s ease',
        }}
      />
    </div>
  );
}
