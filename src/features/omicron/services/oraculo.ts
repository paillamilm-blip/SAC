// src/lib/oraculo.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM · Oráculo — motor de intención (voz/texto → acción)
// Interpreta lo que el usuario dice y lo traduce a: navegar a un hub,
// responder un dato simple, o consultar al Coach IA (Edge Function `coach`,
// respaldada por Gemini). Puro TypeScript, sin dependencias nuevas.
// ═══════════════════════════════════════════════════════════════════════
import type { TabId } from '@/types';

export type OraculoIntent =
  | { kind: 'navigate'; tab: TabId; label: string }
  | { kind: 'coach' }
  | { kind: 'convalidate'; item: 'cv' | 'title' | 'year' }
  | { kind: 'fact'; topic: 'reputacion' | 'tokens' | 'pe' | 'ayuda' }
  | { kind: 'unknown' };

// Intenciones NATURALES: órdenes en lenguaje del fundador que deben aterrizar
// en el módulo REAL correcto (verificado contra el código, sin inventar
// pantallas). Se evalúan ANTES de NAV para que ganen sobre palabras genéricas.
//   · jugar/reto/partida → maxskill (MaxSkillTab hospeda el reto diario y el
//     simulador de examen).
const NAV_NATURAL: { keys: string[]; tab: TabId; label: string }[] = [
  { keys: ['jugar', 'juego', 'juega', 'reto', 'desaf', 'partida', 'simulad'], tab: 'maxskill', label: 'Habilidades' },
];

// El recorte de la Fase 5 dejó tres destinos reales: Mi Gemelo (donde vive la
// Red Viva), Academia y Habilidades. Empleos, Mercado, Bóveda, Red Social,
// Billetera y Gobernanza salieron de la navegación porque las tablas que los
// alimentan tienen 0 filas de usuarios reales: llevar el "quiero trabajo" a
// una pantalla con 0 ofertas era peor que no entender el pedido.
//   · jugar/reto/partida   → 'maxskill' (hospeda el reto diario y el simulador).
//   · empleo/trabajo/oferta → 'perfil' (la Red Viva es la evidencia de lo que
//     sabes hacer; la bolsa de empleos se fue con la Fase 6B).
const NAV: { keys: string[]; tab: TabId; label: string }[] = [
  { keys: ['inicio', 'gemelo', 'perfil', 'principal', 'home', 'ranking', 'posici', 'posición', 'reputaci', 'fama'], tab: 'perfil', label: 'Inicio' },
  { keys: ['habilidad', 'skill', 'competenc', 'maxskill', 'destreza', 'examen', 'valida', 'nodo'], tab: 'maxskill', label: 'Habilidades' },
  { keys: ['empleo', 'trabajo', 'oferta', 'vacante', 'mercado', 'demanda', 'viva'], tab: 'perfil', label: 'La Red Viva' },
  // Va antes de Academia: 'aprend' (academia) es prefijo de 'aprendizaje' y se
  // lo quedaba. Sus claves son palabras compuestas, ninguna colisiona con
  // 'curso'/'lección'. El coach revisa 'mi brecha' antes que esta fila, así que
  // la diagnosis hablada sigue respondiéndola Ómicrom y no abre una pantalla.
  { keys: ['aprendizaje', 'cola de revisi', 'mapa de capacidades', 'brechas'], tab: 'aprendizaje', label: 'Aprendizaje' },
  { keys: ['academia', 'aprend', 'curso', 'estudi', 'arbol', 'árbol', 'lecci', 'conocimiento', 'boveda', 'bóveda'], tab: 'academia', label: 'Academia' },
];

const COACH_TRIGGERS = [
  'consejo', 'coach', 'recomienda', 'recomiénda', 'qué estudio', 'que estudio',
  'cómo mejoro', 'como mejoro', 'mi brecha', 'diagnóstico', 'diagnostico',
  'qué hago', 'que hago', 'oriénta', 'orienta', 'aconseja', 'guíame', 'guiame',
];

/** Interpreta una frase en lenguaje natural (español). */
export function interpret(raw: string): OraculoIntent {
  const q = (raw || '').toLowerCase().trim();
  if (!q) return { kind: 'unknown' };

  // Convalidar datos por voz (requiere un verbo de aporte + un objeto).
  // Solo hay tres cosas convalidables: CV, título y años. La Bóveda salió del
  // producto con la Fase 6, así que "aporta a la bóveda" ya no es una
  // convalidación: cae al NAV de abajo y aterriza en Academia.
  if (/(convalida|valida|sube|aporta|suma|agrega|añade|anade|carga|registra)/.test(q)) {
    if (/(cv|curr[íi]culum)/.test(q)) return { kind: 'convalidate', item: 'cv' };
    if (/(t[íi]tulo|certificaci|grado|diploma)/.test(q)) return { kind: 'convalidate', item: 'title' };
    if (/(a[ñn]o|experiencia|trayectoria)/.test(q)) return { kind: 'convalidate', item: 'year' };
  }

  if (COACH_TRIGGERS.some((k) => q.includes(k))) return { kind: 'coach' };

  if (/(reputaci|confianz|qué tan bueno|que tan bueno)/.test(q)) return { kind: 'fact', topic: 'reputacion' };
  if (/(cuánt|cuant).*(token|saldo|plata|dinero)/.test(q)) return { kind: 'fact', topic: 'tokens' };
  if (/(punto|pe\b|experiencia)/.test(q)) return { kind: 'fact', topic: 'pe' };
  if (/(ayuda|qué puedo|que puedo|comando|quién eres|quien eres)/.test(q)) return { kind: 'fact', topic: 'ayuda' };

  // Órdenes naturales primero (específicas): "quiero jugar", "vender una idea",
  // "buscar freelance", "ver mi ranking". Ganan sobre las palabras genéricas.
  const natural = NAV_NATURAL.find((n) => n.keys.some((k) => q.includes(k)));
  if (natural) return { kind: 'navigate', tab: natural.tab, label: natural.label };

  const nav = NAV.find((n) => n.keys.some((k) => q.includes(k)));
  if (nav) return { kind: 'navigate', tab: nav.tab, label: nav.label };

  return { kind: 'unknown' };
}

export interface CoachResult {
  advice?: string;
  error?: string;
}

export interface TutorResult {
  answer?: string;
  error?: string;
}

export interface CoachContext {
  skills?: string[];
  cv_summary?: string;
  execution?: number;
  quality?: number;
  transcendence?: number;
  foundation?: number;
  reputation?: number;
  pe?: number;
}

