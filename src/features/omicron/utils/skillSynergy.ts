// src/features/omicron/utils/skillSynergy.ts
// ═══════════════════════════════════════════════════════════════════════
// Helper PURO de SINERGIAS entre habilidades ("Sinergia Visible" Inc 1).
//
// La app ya DETECTA sinergias entre habilidades relacionadas y les da un
// pequeño bono al dominio de cada nodo (+0.08 cuando 2+ habilidades de un
// mismo grupo están presentes). Esa lógica vivía embebida dentro de
// OrbShell.buildSkillNodes(); acá la extraemos a un helper PURO para que
// exista UNA sola fuente de verdad y se pueda probar con Vitest sin mocks
// (mismo criterio que nodeUnlock.ts / homeStatus.ts).
//
// Este módulo NO importa React, framer-motion, three, Supabase ni nada que
// toque window / matchMedia: opera solo sobre strings y números. NO cambia
// la matemática del bono (+0.08) ni escribe nada en el servidor: solo LEE
// las habilidades reales de la persona y describe, en CERO JERGA y tuteo
// neutro LatAm, qué grupos están activos y por qué.
// ═══════════════════════════════════════════════════════════════════════

// ── Grupos de sinergia (fuente única de verdad) ──────────────────────
// Habilidades relacionadas que se potencian entre sí. VERBATIM de la
// definición que vivía inline en OrbShell.buildSkillNodes(): mover una
// palabra acá cambia la detección real, así que se conserva idéntico.
export const SYNERGY_GROUPS: string[][] = [
  ['react', 'typescript', 'javascript', 'frontend', 'node', 'next.js'],
  ['python', 'machine learning', 'data', 'ia', 'deep learning', 'analytics'],
  ['docker', 'kubernetes', 'aws', 'devops', 'cloud', 'ci/cd'],
  ['diseño', 'ux', 'ui', 'figma', 'design', 'branding'],
  ['gestión', 'liderazgo', 'scrum', 'agile', 'project management'],
  ['ventas', 'marketing', 'negociación', 'comercial', 'growth'],
];

// ── Descriptor humano por grupo (CERO JERGA) ─────────────────────────
// Nombre humano + un "por qué" corto y concreto (tuteo, sin jerga, sin
// voseo). Describe los grupos REALES de arriba; no inventa habilidades.
export interface SynergyGroupMeta {
  /** Índice del grupo en SYNERGY_GROUPS. */
  id: number;
  /** Nombre humano del grupo, self-explicativo. */
  nombre: string;
  /** Por qué estas habilidades se potencian, en una frase concreta. */
  porque: string;
}

export const SYNERGY_GROUP_META: SynergyGroupMeta[] = [
  {
    id: 0,
    nombre: 'Desarrollo web',
    porque: 'Estas habilidades se potencian: juntas cubren todo el ciclo de una app web.',
  },
  {
    id: 1,
    nombre: 'Datos e inteligencia artificial',
    porque: 'Se potencian entre sí: con datos entrenas modelos y sacas conclusiones que se apoyan una en la otra.',
  },
  {
    id: 2,
    nombre: 'Infraestructura en la nube',
    porque: 'Juntas te dejan publicar y sostener un producto en la nube de punta a punta.',
  },
  {
    id: 3,
    nombre: 'Diseño de producto',
    porque: 'Se potencian: piensas la experiencia y la dejas lista para construir.',
  },
  {
    id: 4,
    nombre: 'Liderazgo de equipos',
    porque: 'Juntas te dejan organizar al equipo y llevar el trabajo hasta el final.',
  },
  {
    id: 5,
    nombre: 'Ventas y crecimiento',
    porque: 'Se potencian: atraes interesados y cierras acuerdos que hacen crecer el proyecto.',
  },
];

// ── Detección de sinergias activas ───────────────────────────────────
/**
 * Coincidencia por LÍMITE DE PALABRA de una keyword de grupo dentro de una
 * habilidad, insensible a mayúsculas. Es la misma regex que vivía inline en
 * buildSkillNodes. Combinada con la regla de "2+ coincidencias por grupo",
 * evita activaciones espurias: por ejemplo, una sola habilidad "Google
 * Analytics" aporta a lo sumo UNA coincidencia al grupo de datos, así que
 * por sí sola NO lo activa (hacen falta 2+ habilidades del grupo).
 */
function keywordMatchesSkill(keyword: string, skillLower: string): boolean {
  const re = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return re.test(skillLower);
}

/**
 * Detecta qué grupos de sinergia están ACTIVOS para un set de habilidades.
 * Un grupo está activo cuando 2 o más habilidades de la persona coinciden
 * (por límite de palabra) con alguna keyword de ese grupo.
 *
 * Determinista y sin efectos secundarios. Idéntico a la lógica que vivía
 * inline en buildSkillNodes(), por lo que el bono +0.08 no cambia.
 *
 * @param skills  habilidades reales de la persona (strings).
 * @returns  Set de índices de grupo activos (0..SYNERGY_GROUPS.length-1).
 */
export function detectActiveSynergies(skills: string[]): Set<number> {
  const active = new Set<number>();
  if (!skills || skills.length === 0) return active;
  SYNERGY_GROUPS.forEach((group, gi) => {
    const matches = skills.filter((s) => {
      const lower = s.toLowerCase();
      return group.some((g) => keywordMatchesSkill(g, lower));
    });
    if (matches.length >= 2) active.add(gi);
  });
  return active;
}

/**
 * Dado UNA habilidad y el set de grupos activos, devuelve el índice del
 * primer grupo ACTIVO al que pertenece la habilidad, o null si la habilidad
 * no participa de ninguna sinergia activa.
 *
 * Determinista y sin efectos secundarios.
 *
 * @param skill   la habilidad a ubicar.
 * @param active  set de grupos activos (típicamente de detectActiveSynergies).
 */
export function synergyGroupForSkill(skill: string, active: Set<number>): number | null {
  const lower = skill.toLowerCase();
  for (const gi of active) {
    if (SYNERGY_GROUPS[gi].some((g) => keywordMatchesSkill(g, lower))) return gi;
  }
  return null;
}
