// ESPEJO de supabase/functions/_shared/brechas.ts — no editar sin el otro.
// por qué espejo: las Edge Functions congelan `_shared/` al crearse — lección 6F —
// y vitest no puede importar desde `supabase/`.
// _shared/brechas.ts — validación defensiva del output de IA.
// Port literal del validador de la app CV (lib/ai/validar.ts) sin zod:
// sin dependencias, corre igual en Deno (Edge Function) y en vitest
// (espejo en src/). Si cambia este archivo, cambia el espejo en el mismo commit.
// Cada campo sale recortado a un máximo sano: un CV malinterpretado no puede
// meter megabytes en las columnas TEXT ni en el localStorage del puente.

type Categoria = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
type Severidad = 'alta' | 'media' | 'baja';
const CATEGORIAS: readonly string[] = ['dura', 'blanda', 'conocimiento', 'credencial'];
const SEVERIDADES: readonly string[] = ['alta', 'media', 'baja'];
const MAX_BRECHAS = 12;
const MAX_CAMPO = {
  titulo: 120, evidencia: 400, porQueImporta: 400,
  que: 300, como: 400, comoLoDemuestro: 300,
} as const;

export interface BrechaValidada {
  categoria: Categoria; titulo: string; evidencia: string; porQueImporta: string;
  severidad: Severidad; aprender: { que: string; como: string; comoLoDemuestro: string };
}

const str = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');
const campo = (x: unknown, max: number): string => str(x).slice(0, max);

export function normalizarBrecha(x: unknown): BrechaValidada | null {
  if (!x || typeof x !== 'object') return null;
  const b = x as Record<string, unknown>;
  const categoria = str(b.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) return null;
  const titulo = campo(b.titulo, MAX_CAMPO.titulo);
  if (!titulo) return null;
  const ap = (b.aprender && typeof b.aprender === 'object') ? b.aprender as Record<string, unknown> : {};
  const severidadRaw = str(b.severidad).toLowerCase();
  return {
    categoria: categoria as Categoria,
    titulo,
    evidencia: campo(b.evidencia, MAX_CAMPO.evidencia),
    porQueImporta: campo(b.porQueImporta, MAX_CAMPO.porQueImporta),
    severidad: SEVERIDADES.includes(severidadRaw) ? severidadRaw as Severidad : 'media',
    aprender: {
      que: campo(ap.que, MAX_CAMPO.que),
      como: campo(ap.como, MAX_CAMPO.como),
      comoLoDemuestro: campo(ap.comoLoDemuestro, MAX_CAMPO.comoLoDemuestro),
    },
  };
}

// La misma identidad de skill que aplica la RPC de 10012 (titulo normalizado): la IA
// repite habilidades dentro de UN run y el cliente tiene que ver la misma lista que
// la BD, o los ids de `guardado.brechas` quedan mas cortos que las brechas.
// Equivalencia con la SQL: la columna generada usa
// lower(trim(regexp_replace(titulo, '\s+', ' ', 'g'))) — aca `str()` ya recorta por
// los lados, `toLowerCase()` es el lower() y `\s+ -> ' '` es el regexp_replace con 'g'.
// La primera aparicion gana, igual que `order by ord` en el row_number() de la RPC.
const claveSkill = (t: string): string => t.toLowerCase().replace(/\s+/g, ' ').trim();

export function normalizarBrechas(x: unknown): BrechaValidada[] {
  if (!Array.isArray(x)) return [];
  const out: BrechaValidada[] = [];
  const vistas = new Set<string>();
  for (const item of x) {
    const n = normalizarBrecha(item);
    if (!n) continue;
    const clave = claveSkill(n.titulo);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    out.push(n);
    if (out.length >= MAX_BRECHAS) break;
  }
  return out;
}
