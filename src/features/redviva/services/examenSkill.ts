// features/redviva/services/examenSkill.ts
// Conseguir el examen de UNA habilidad, exista o no en el catálogo.
//
// EL CORTE QUE ROMPE (ver .tasks/red-viva-plan.md, Inc 5): MaxSkillTab fabricaba
// nodos con id 'virtual-<slug>' y la Edge Function simulador-universal los busca
// en skill_tree_nodes (columna uuid) → 404 'Nodo no encontrado'. Así que examinar
// una habilidad del CV que no estuviera precargada era imposible, y la frase
// central del producto ("aprendizaje en tiempo real") era falsa para casi todas
// las profesiones.
//
// La solución no cambia la Edge Function: se pide a la base el uuid REAL del nodo
// (creándolo si hace falta) y después se invoca al simulador como siempre.
//
// Las validaciones de acá son ESPEJO de las de omicron_ensure_skill_node: sirven
// para dar una respuesta instantánea sin ir a la red, no para reemplazar al
// servidor. La base valida igual, siempre; esto solo evita un viaje inútil.

import { supabase } from '@/infrastructure/supabase/client';

export const TITULO_MIN = 2;
export const TITULO_MAX = 60;

/** Colapsa espacios y recorta. Espejo de regexp_replace(...,'\s+',' ') + btrim. */
export function normalizarTitulo(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

export type TituloValido =
  | { ok: true; titulo: string }
  | { ok: false; error: string };

/**
 * ¿Se puede pedir examen de esto? Mismas reglas que el RPC, y los mismos textos,
 * para que el usuario no lea dos explicaciones distintas del mismo problema.
 */
export function validarTitulo(raw: string | null | undefined): TituloValido {
  const titulo = normalizarTitulo(raw);

  if (titulo.length < TITULO_MIN) {
    return { ok: false, error: 'El nombre de la habilidad es demasiado corto.' };
  }
  if (titulo.length > TITULO_MAX) {
    return {
      ok: false,
      error: `El nombre de la habilidad es demasiado largo (máximo ${TITULO_MAX} caracteres).`,
    };
  }
  // Tiene que ser una habilidad, no un símbolo o un número suelto.
  // Espejo de: v_label !~ '[[:alpha:]]{2}'
  if (!/\p{L}{2}/u.test(titulo)) {
    return { ok: false, error: 'Ese nombre no parece una habilidad.' };
  }
  return { ok: true, titulo };
}

/** Respuesta de omicron_ensure_skill_node (migración 10002). */
interface RespuestaRpc {
  ok?: boolean;
  node_id?: string;
  title?: string;
  created?: boolean;
  motivo?: string;
  error?: string;
}

export type ResultadoExamen =
  | { ok: true; nodeId: string; titulo: string; creado: boolean }
  | { ok: false; error: string; rpcAusente?: boolean };

/**
 * Devuelve el uuid real del nodo de examen de una habilidad, creándolo si no
 * existe todavía.
 *
 * DEGRADACIÓN ELEGANTE: si la migración 10002 no está aplicada, el RPC no existe
 * y se devuelve `rpcAusente: true` para que quien llama pueda caer al camino
 * viejo (buscar la habilidad en el catálogo) en vez de romperse.
 */
export async function asegurarNodoDeExamen(
  titulo: string | null | undefined,
): Promise<ResultadoExamen> {
  const valido = validarTitulo(titulo);
  if (!valido.ok) return { ok: false, error: valido.error };

  const { data, error } = await supabase.rpc('omicron_ensure_skill_node', {
    p_title: valido.titulo,
  });

  if (error) {
    console.info(
      '[Omicron] No se pudo preparar el examen (¿migración 10002 sin aplicar?):',
      error.message,
    );
    return {
      ok: false,
      rpcAusente: true,
      error: 'No pudimos preparar el examen en este momento.',
    };
  }

  const r = (data ?? {}) as RespuestaRpc;

  if (!r.ok || !r.node_id) {
    return { ok: false, error: r.error ?? 'No pudimos preparar el examen de esta habilidad.' };
  }

  return {
    ok: true,
    nodeId: String(r.node_id),
    titulo: String(r.title ?? valido.titulo),
    creado: r.created === true,
  };
}
