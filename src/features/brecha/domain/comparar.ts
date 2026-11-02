import type { Brecha, BrechaCerrada, ComparacionAnalisis } from "./types";

// Comparar dos análisis no puede exigirle una coincidencia literal al texto de la IA:
// el mismo concepto sale con palabras distintas. Se normalizan acentos y se compara
// por similitud de tokens dentro de la misma categoría, con apareo uno a uno.
const UMBRAL = 0.4;

function tokens(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3),
  );
}

function similitud(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function compararAnalisis(
  anterior: { id: string; creadoEn: string; brechas: Brecha[] },
  actuales: Brecha[],
  fechaActual: string,
): ComparacionAnalisis {
  const emparejadas = new Set<string>();
  const nuevasIds: string[] = [];
  const persistenIds: string[] = [];

  for (const act of actuales) {
    const tokAct = tokens(act.titulo);
    let mejor: { id: string; sim: number } | null = null;
    for (const prev of anterior.brechas) {
      if (emparejadas.has(prev.id) || prev.categoria !== act.categoria) continue;
      const sim = similitud(tokAct, tokens(prev.titulo));
      if (sim >= UMBRAL && (!mejor || sim > mejor.sim)) mejor = { id: prev.id, sim };
    }
    if (mejor) {
      emparejadas.add(mejor.id);
      persistenIds.push(act.id);
    } else {
      nuevasIds.push(act.id);
    }
  }

  // Solo cuentan como cerradas las que el usuario confirmó como reales en el
  // análisis anterior y ya no aparecen: una brecha jamás reconocida no se "cerró".
  const cerradas: BrechaCerrada[] = anterior.brechas
    .filter((b) => b.veredicto === "confirmada" && !emparejadas.has(b.id))
    .map((b) => ({
      id: b.id,
      titulo: b.titulo,
      categoria: b.categoria,
      severidad: b.severidad,
      fecha: b.dominadaEn ?? fechaActual,
      motivo: b.dominadaEn ? ("dominada" as const) : ("no_aparece" as const),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { anteriorId: anterior.id, anteriorEn: anterior.creadoEn, cerradas, nuevasIds, persistenIds };
}
