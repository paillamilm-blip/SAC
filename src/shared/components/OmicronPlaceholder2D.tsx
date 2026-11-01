// shared/components/OmicronPlaceholder2D.tsx
// Placeholder de carga LIGERO en 2D — reemplaza a GeodesicOrb como fallback de
// Suspense / TabLoader (no como componente global; GeodesicOrb sigue vivo en
// sus 8+ pantallas). Un pulso sobrio en el color del usuario, con tokens de
// '@/theme'. Solo transform/opacity, <=300ms por ciclo del keyframe, y bajo
// prefers-reduced-motion se congela (sin loop) mostrando el estado visible.
//
// No usa framer-motion para no arrastrar dependencias en un fallback de carga:
// los keyframes viven en index.css, el único sitio del sistema que declara
// gestos, y se respetan reduced-motion por media query allí mismo.

export interface OmicronPlaceholder2DProps {
  /** Lado del cuadrado en px. */
  size?: number;
  /** Color del usuario (hex). Quien lo llama pasa getUserColor()/useUserColor. */
  color: string;
}

/**
 * Pulso de carga 2D en el color del usuario. Un núcleo relleno tenue y un
 * anillo que respira alrededor: legible por FORMA (círculo + aro) incluso en
 * escala de grises, sin depender del color.
 */
export function OmicronPlaceholder2D({ size = 80, color }: OmicronPlaceholder2DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Cargando"
      style={{ display: 'block' }}
    >
      <circle
        className="omi-ph-ring"
        cx={50}
        cy={50}
        r={38}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <circle
        className="omi-ph-core"
        cx={50}
        cy={50}
        r={16}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1.5}
      />
      <circle cx={50} cy={50} r={3.2} fill={color} />
    </svg>
  );
}
