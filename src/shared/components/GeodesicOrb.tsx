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
// The vertex positions are pre-computed from a subdivided icosahedron
// projected onto a 2D circle (front-hemisphere visible).
// ═══════════════════════════════════════════════════════════════════════
import { C, ANIM } from '@/theme';
import { useMemo, type CSSProperties } from 'react';

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

// ── Pre-computed vertices of a geodesic sphere (icosahedron subdivided 1x)
// projected to 2D (x, y in range -1 to 1). 42 vertices.
const VERTICES: [number, number, number][] = [
  [0, 0, 1], [0.894, 0, 0.447], [0.276, 0.851, 0.447],
  [-0.724, 0.526, 0.447], [-0.724, -0.526, 0.447], [0.276, -0.851, 0.447],
  [0.724, 0.526, -0.447], [-0.276, 0.851, -0.447], [-0.894, 0, -0.447],
  [-0.276, -0.851, -0.447], [0.724, -0.526, -0.447], [0, 0, -1],
  // Midpoints (subdivision)
  [0.5, 0.426, 0.75], [-0.19, 0.69, 0.7], [-0.61, 0, 0.79],
  [-0.19, -0.69, 0.7], [0.5, -0.426, 0.75], [0.95, 0.26, 0],
  [0.59, 0.81, 0], [-0.59, 0.81, 0], [-0.95, 0.26, 0],
  [-0.95, -0.26, 0], [-0.59, -0.81, 0], [0.59, -0.81, 0],
  [0.95, -0.26, 0], [0.5, 0.426, -0.75], [-0.19, 0.69, -0.7],
  [-0.61, 0, -0.79], [-0.19, -0.69, -0.7], [0.5, -0.426, -0.75],
  [0.31, 0.14, 0.94], [0.09, 0.3, 0.95], [-0.2, 0.17, 0.96],
  [-0.2, -0.17, 0.96], [0.09, -0.3, 0.95], [0.31, -0.14, 0.94],
  [0.81, 0.59, 0.22], [0, 0.99, 0.1], [-0.81, 0.59, 0.22],
  [-0.81, -0.59, 0.22], [0, -0.99, 0.1], [0.81, -0.59, 0.22],
].map(([x, y, z]) => [x, y, z] as [number, number, number]);

// ── Edges: pairs of vertex indices that should be connected
const EDGES: [number, number][] = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[1,2],[2,3],[3,4],[4,5],[5,1],
  [1,6],[2,7],[3,8],[4,9],[5,10],[6,7],[7,8],[8,9],[9,10],[10,6],
  [6,11],[7,11],[8,11],[9,11],[10,11],
  [1,12],[2,12],[0,12],[2,13],[3,13],[0,13],[3,14],[4,14],[0,14],
  [4,15],[5,15],[0,15],[5,16],[1,16],[0,16],
  [1,17],[6,17],[10,24],[1,24],[6,18],[2,18],[7,18],
];

function project(v: [number, number, number], size: number, depthScale = 0.3): { x: number; y: number; z: number; opacity: number } {
  const half = size / 2;
  const scale = 0.85 + v[2] * depthScale; // perspective
  return {
    x: half + v[0] * half * scale * 0.85,
    y: half + v[1] * half * scale * 0.85,
    z: v[2],
    opacity: 0.3 + (v[2] + 1) * 0.35, // back vertices dimmer
  };
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

  // Compute visible vertices and edges
  const { visibleVerts, visibleEdges } = useMemo(() => {
    const verts = VERTICES.slice(0, clampedNodes).map((v, i) => ({
      ...project(v, size),
      index: i,
    }));
    const vertSet = new Set(Array.from({ length: clampedNodes }, (_, i) => i));
    const edges = EDGES.filter(([a, b]) => vertSet.has(a) && vertSet.has(b)).map(([a, b]) => ({
      from: project(VERTICES[a], size),
      to: project(VERTICES[b], size),
      opacity: Math.min(project(VERTICES[a], size).opacity, project(VERTICES[b], size).opacity),
    }));
    return { visibleVerts: verts, visibleEdges: edges };
  }, [clampedNodes, size]);

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
        {/* SVG wireframe */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
          {/* Edges (lines) */}
          {visibleEdges.map((edge, i) => (
            <line
              key={`e${i}`}
              x1={edge.from.x} y1={edge.from.y}
              x2={edge.to.x} y2={edge.to.y}
              stroke={color}
              strokeWidth={0.8}
              strokeOpacity={edge.opacity * 0.5 * intensity}
            />
          ))}
          {/* Vertices (dots) */}
          {visibleVerts.map((v, i) => (
            <circle
              key={`v${i}`}
              cx={v.x} cy={v.y}
              r={2.5 + v.opacity * 1.5}
              fill={color}
              opacity={v.opacity * intensity}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
          ))}
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
          boxShadow: `0 0 ${30 * intensity}px ${color}${glowOpacity}, 0 0 ${60 * intensity}px ${color}44`,
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
