// features/redviva/services/redViva.ts
// EL MODELO DE LA RED VIVA — el CV convertido en mapa de evidencia.
//
// LA TESIS: cada cosa que tu CV afirma sin probar es un nodo HUECO. Probándola
// pasa al núcleo. Esta pantalla es el mapa de ese viaje.
//
// LA GEOMETRÍA TIENE SIGNIFICADO (no es decoración). Dos anillos:
//   • CENTRO   → vos (tu reputación).
//   • NÚCLEO   → lo que PROBASTE. Sólido, cerca del centro.
//   • FRONTERA → lo que DECLARASTE y nadie comprobó. Nodos huecos.
// Crecer = ver un nodo viajar hacia adentro: hueco → sólido. Eso es "la red que
// crece" con un significado verificable detrás de cada píxel.
//
// POR QUÉ EL ORBE ANTERIOR NO SE ENTENDÍA (y qué se corrige acá):
//   1. Sus puntos brillantes eran vértices de un icosaedro de Three.js: ninguno
//      era una habilidad. Acá cada nodo ES un dato con nombre.
//   2. Sus etiquetas flotaban en posiciones Fibonacci DISTINTAS de los puntos
//      dibujados. Acá etiqueta y nodo comparten una sola coordenada.
//   3. Su ángulo se deriva SOLO de su identidad normalizada, así que sumar una
//      habilidad o cambiar su estado no mueve a las demás.
//
// 100 % puro: sin React, sin Supabase, sin acceso a red.

// ══════════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════════

/**
 * Los estados de un nodo.
 *   'solido'   → probado (existe prueba registrada). Es TUYO y está demostrado.
 *   'latiendo' → lo estás probando ahora mismo.
 *   'hueco'    → lo declaraste en el CV y nadie lo comprobó. Es TUYO sin respaldo.
 */
export type EstadoNodo = 'hueco' | 'latiendo' | 'solido';

/**
 * Normaliza un nombre de habilidad para comparar: minúsculas, sin acentos, sin
 * espacios de sobra. "Automatización" y "automatizacion" son la misma cosa.
 * No se toca el texto original: eso se conserva para mostrar.
 */
export function normalizeSkill(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fila de public.omicron_skill_proofs (migración 10001). */
export interface SkillProof {
  skill_key: string;
  skill_label: string;
  /** null = probada sin score registrado (prueba histórica). NO se inventa. */
  best_score: number | null;
  proofs_count?: number;
  last_proven_at?: string | null;
}

/** Habilidad declarada, tal como vive en profiles.skills_detail. */
export interface SkillDeclarada {
  name: string;
  pct: number;
}

export interface NodoRed {
  /** Clave normalizada, estable. Sirve de key de React y de identidad. */
  id: string;
  /** Cómo se muestra (respeta cómo lo escribió el usuario). */
  label: string;
  estado: EstadoNodo;
  /** Lo que AFIRMA el CV (0-100). null si la habilidad no vino del CV. */
  declaredPct: number | null;
  /** Score real de la prueba (0-100). null = probada sin score registrado. */
  provenScore: number | null;
  /** Posición en el círculo unitario (-1..1). Determinista. */
  x: number;
  y: number;
  /**
   * Ángulo en radianes de su carril radial. La etiqueta se dibuja rotada sobre
   * este ángulo: es lo que permite que 12 nombres quepan alrededor sin pisarse.
   */
  angulo: number;
  /** Radio relativo (0..1) — proporcional a la afirmación o a la prueba. */
  r: number;
  /** 0 = núcleo (probado), 1 = frontera (declarado, sin comprobar). */
  anillo: 0 | 1;
}

export interface RedVivaModel {
  nodos: NodoRed[];
  totales: {
    /** Habilidades TUYAS (declaradas ∪ probadas). */
    declaradas: number;
    probadas: number;
  };
  /** true = no hay ni una habilidad: la pantalla debe invitar a subir el CV. */
  vacia: boolean;
}

export interface BuildRedVivaInput {
  /** profiles.skills_detail */
  skillsDetail?: SkillDeclarada[] | null;
  /** profiles.skills — respaldo cuando no hay skills_detail */
  skills?: string[] | null;
  /** Filas de omicron_skill_proofs. [] si el RPC no está aplicado todavía. */
  proofs?: SkillProof[] | null;
  /** Habilidades con una prueba EN CURSO ahora mismo (estado latiendo). */
  enCurso?: string[] | null;
}

// ══════════════════════════════════════════════════════════════════════
// LAYOUT DETERMINISTA
// ══════════════════════════════════════════════════════════════════════
/**
 * Hash estable de un string → 0..1. Se usa para desordenar el ángulo de forma
 * REPRODUCIBLE: la misma habilidad cae siempre en el mismo lugar, en cualquier
 * dispositivo y después de cualquier recarga.
 *
 * Es un FNV-1a de 32 bits: barato, sin dependencias y con buena dispersión.
 */
export function hash01(text: string): number {
  let h = 0x811c9dc5;
  const s = normalizeSkill(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Usa todo el espacio de 32 bits. Truncarlo con un módulo pequeño acercaba
  // identidades comunes que en FNV-1a completo están bien dispersas.
  return (h >>> 0) / 0x100000000;
}

/**
 * Posición polar estable por identidad. El ángulo depende únicamente de la
 * clave normalizada; nunca del índice, del total de nodos ni del estado. Cambiar
 * de estado solo cambia el radio y por eso el nodo viaja por el mismo carril.
 */
function ringPosition(radius: number, seed: string): { x: number; y: number; angulo: number } {
  const angulo = -Math.PI / 2 + hash01(seed) * Math.PI * 2;
  return {
    x: Math.cos(angulo) * radius,
    y: Math.sin(angulo) * radius,
    angulo,
  };
}

// ══════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL MODELO
// ══════════════════════════════════════════════════════════════════════

// Radios de cada anillo. La distancia al centro ES el significado: cuanto más
// adentro, más demostrado. Medidos en pantalla (390px de ancho) para que las
// etiquetas rotadas tengan carril suficiente y no se pisen.
const RADIO_NUCLEO = 0.42;   // probado
const RADIO_FRONTERA = 0.64; // declarado, sin comprobar

/**
 * Construye la red completa desde datos reales.
 *
 * REGLA DE INTEGRIDAD (no negociable, heredada de la Credencial): un nodo se
 * pinta SÓLIDO únicamente si existe una prueba registrada. Un pct alto del CV
 * sin prueba se dibuja como un HUECO GRANDE — que es exactamente la verdad:
 * "afirmás mucho y todavía no lo demostraste". Nunca se deduce "probado" de un
 * porcentaje.
 */
export function buildRedViva(input: BuildRedVivaInput): RedVivaModel {
  // ── 1. Universo de habilidades: declaradas (CV) ∪ probadas ────────────
  const declaradas = new Map<string, SkillDeclarada>();

  for (const s of input.skillsDetail ?? []) {
    const key = normalizeSkill(s?.name ?? '');
    if (!key) continue;
    const pct = Number(s?.pct);
    declaradas.set(key, {
      name: String(s.name).trim(),
      pct: Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0,
    });
  }

  // Respaldo: si no hay skills_detail, se usa skills[] SIN inventar un pct.
  if (declaradas.size === 0) {
    for (const raw of input.skills ?? []) {
      const key = normalizeSkill(raw ?? '');
      if (!key) continue;
      declaradas.set(key, { name: String(raw).trim(), pct: 0 });
    }
  }

  const pruebas = new Map<string, SkillProof>();
  for (const p of input.proofs ?? []) {
    const key = normalizeSkill(p?.skill_key || p?.skill_label || '');
    if (!key) continue;
    pruebas.set(key, p);
  }

  const enCurso = new Set(
    (input.enCurso ?? []).map((s) => normalizeSkill(s)).filter(Boolean),
  );

  // ── 2. Nodos, ordenados de forma ESTABLE (alfabético normalizado) ─────
  const todasLasClaves = [...new Set([...declaradas.keys(), ...pruebas.keys()])].sort();
  const nodos: NodoRed[] = [];

  for (const key of todasLasClaves) {
    const decl = declaradas.get(key);
    const proof = pruebas.get(key);
    const anillo: 0 | 1 = proof ? 0 : 1;
    const estado: EstadoNodo = proof ? 'solido' : enCurso.has(key) ? 'latiendo' : 'hueco';

    // El tamaño dice algo verdadero:
    //  • sólido → qué tan bien lo probaste (o base si no hay score registrado)
    //  • hueco  → qué tan fuerte es la AFIRMACIÓN sin respaldo
    const base = anillo === 0 ? (proof?.best_score ?? 70) : (decl?.pct ?? 0);

    // Identidad angular absoluta: el estado únicamente decide el radio.
    const { x, y, angulo } = ringPosition(anillo === 0 ? RADIO_NUCLEO : RADIO_FRONTERA, key);

    nodos.push({
      id: key,
      label: proof?.skill_label?.trim() || decl?.name || key,
      estado,
      declaredPct: decl ? decl.pct : null,
      provenScore: proof ? proof.best_score : null,
      x,
      y,
      angulo,
      // Rango ancho a propósito: con 0.36–1.0 la diferencia entre 45/100 y 95/100
      // quedaba en 1.7px, o sea invisible. El tamaño tiene que decir algo o no
      // vale la pena calcularlo.
      r: 0.22 + (Math.max(0, Math.min(100, base)) / 100) * 0.78,
      anillo,
    });
  }

  // ── 3. Totales ────────────────────────────────────────────────────────
  const probadas = nodos.filter((n) => n.estado === 'solido').length;

  return {
    nodos,
    totales: { declaradas: todasLasClaves.length, probadas },
    vacia: todasLasClaves.length === 0,
  };
}

// ══════════════════════════════════════════════════════════════════════
// TEXTOS — cero jerga, cada número con su unidad y su contexto
// ══════════════════════════════════════════════════════════════════════
/**
 * La frase que resume el estado de la red. Es la traducción del modelo 20/80 a
 * lenguaje que entiende cualquiera, sin nombrar "ejes", "nodos" ni "20/80".
 */
export function resumenRed(model: RedVivaModel): string {
  const { declaradas, probadas } = model.totales;

  if (declaradas === 0) {
    return 'Todavía no hay nada aquí. Sube tu CV y aparecen tus habilidades.';
  }
  if (probadas === 0) {
    return `Declaraste ${declaradas} ${declaradas === 1 ? 'habilidad' : 'habilidades'} y todavía no probaste ninguna. Prueba una y empieza a valer.`;
  }
  if (probadas === declaradas) {
    return `Probaste ${probadas === 1 ? 'la habilidad registrada' : `las ${probadas} habilidades registradas`}. ${probadas === 1 ? 'Tiene' : 'Todas tienen'} una prueba registrada.`;
  }
  const restantes = declaradas - probadas;
  return `Probaste ${probadas} de ${declaradas} habilidades. ${restantes === 1 ? 'La restante todavía no tiene' : `Las ${restantes} restantes todavía no tienen`} una prueba.`;
}

/**
 * Qué decir de un nodo, en una línea. Nunca dice "verificada" por heurística.
 */
export function textoEstado(nodo: NodoRed): string {
  if (nodo.estado === 'solido') {
    if (nodo.provenScore === null) {
      return 'Probada. No quedó registrado el puntaje de esa prueba.';
    }
    return `Probada con ${nodo.provenScore}/100.`;
  }
  if (nodo.estado === 'latiendo') {
    return 'La estás probando ahora.';
  }
  if (nodo.declaredPct !== null && nodo.declaredPct > 0) {
    return `Tu CV dice ${nodo.declaredPct}/100. Nadie lo comprobó todavía.`;
  }
  return 'La declaraste. Nadie lo comprobó todavía.';
}
