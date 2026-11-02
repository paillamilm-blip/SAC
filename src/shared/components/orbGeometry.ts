// shared/components/orbGeometry.ts
// ═══════════════════════════════════════════════════════════════════════
// LA TRAMA DEL ORBE — un solo dibujante, dos superficies.
//
// El orbe geodésico se dibujaba adentro de GeodesicOrb y nadie más podía
// usarlo. Ahora el mapa de capacidades lo planta en su raíz — la misma esfera
// que preside la franja de arriba — y lo hace con ESTOS números, no con una
// copia. Un vértice que se escribe dos veces es un orbe que se desincroniza.
//
// Vértices de un icosaedro subdividido 1x (42), proyectados a 2D sobre el
// hemisferio visible. Coordenadas centradas en (0,0): quien las consume decide
// dónde lo pone.
// ═══════════════════════════════════════════════════════════════════════

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
];

// Pares de índices que se conectan.
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1],
  [1, 6], [2, 7], [3, 8], [4, 9], [5, 10], [6, 7], [7, 8], [8, 9], [9, 10], [10, 6],
  [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
  [1, 12], [2, 12], [0, 12], [2, 13], [3, 13], [0, 13], [3, 14], [4, 14], [0, 14],
  [4, 15], [5, 15], [0, 15], [5, 16], [1, 16], [0, 16],
  [1, 17], [6, 17], [10, 24], [1, 24], [6, 18], [2, 18], [7, 18],
];

export interface AristaOrbe {
  x1: number; y1: number; x2: number; y2: number;
  /** 0-1: los vértices de atrás se apagan. */
  opacity: number;
}

export interface PuntoOrbe {
  x: number; y: number; r: number; opacity: number;
}

export interface TramaOrbe {
  aristas: AristaOrbe[];
  puntos: PuntoOrbe[];
  /** Grosor de trazo en unidades del propio diámetro, con piso visible. */
  grosor: number;
}

/** Proyecta un vértice unitario al plano, con perspectiva por profundidad. */
function proyectar(v: [number, number, number], radio: number, escalaProfundidad = 0.3) {
  const escala = 0.85 + v[2] * escalaProfundidad;
  return {
    x: v[0] * radio * escala * 0.85,
    y: v[1] * radio * escala * 0.85,
    opacity: 0.3 + (v[2] + 1) * 0.35,
  };
}

/**
 * La trama de un orbe de `diametro` px con `nodos` vértices visibles (0-42),
 * centrada en el origen. El grosor y el radio de los puntos siguen la escala
 * del orbe grande (los 200px de la pantalla) pero tienen un piso: un orbe de
 * 30px en la franja superior necesita puntos que se vean, no subpíxeles.
 */
export function tramaOrbe(diametro: number, nodos: number): TramaOrbe {
  const visibles = Math.max(0, Math.min(42, nodos));
  const radio = diametro / 2;
  const proj = VERTICES.slice(0, visibles).map((v) => proyectar(v, radio));
  const dentro = new Set(Array.from({ length: visibles }, (_, i) => i));

  return {
    puntos: proj.map((p) => ({
      x: p.x, y: p.y, r: Math.max(0.9, radio * (0.025 + p.opacity * 0.015)), opacity: p.opacity,
    })),
    aristas: EDGES.filter(([a, b]) => dentro.has(a) && dentro.has(b)).map(([a, b]) => ({
      x1: proj[a].x, y1: proj[a].y, x2: proj[b].x, y2: proj[b].y,
      opacity: Math.min(proj[a].opacity, proj[b].opacity),
    })),
    grosor: Math.max(0.6, radio * 0.008),
  };
}
