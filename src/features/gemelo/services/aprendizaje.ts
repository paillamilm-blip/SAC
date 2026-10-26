// features/gemelo/services/aprendizaje.ts
// Cliente del motor de aprendizaje. Guardado server-side para usuarios con
// sesion; para invitados, puente localStorage (regla de App.tsx: el estado
// que sobrevive el traspaso invitado->autenticado no puede vivir solo en React).
//
// URL/anon key: se derivan del cliente existente (client.ts ya lee
// VITE_SUPABASE_URL/ANON_KEY con fallback al proyecto Ómicrom), asi el servicio
// apunta a la misma base sin duplicar la lectura de env. La anon key es publica
// por diseño; las keys reales nunca viajan al cliente.
import { supabase, supabaseUrl, supabaseAnonKey } from '@/infrastructure/supabase/client';
import type { BrechaValidada } from './brechasValidar';

const PUENTE_KEY = 'omicron.brechas.puente';

export const puenteBrechasInvitado = {
  leer(): BrechaValidada[] {
    try {
      const raw = localStorage.getItem(PUENTE_KEY);
      return raw ? (JSON.parse(raw) as BrechaValidada[]) : [];
    } catch { return []; }
  },
  escribir(brechas: BrechaValidada[]) {
    try { localStorage.setItem(PUENTE_KEY, JSON.stringify(brechas)); } catch { /* llena o privada: el mapa pierde el puente, no la app */ }
  },
};

export type AnalyzedProfileConBrechas = import('./cvAnalyzer').AnalyzedProfile & {
  brechas: BrechaValidada[];
};

export async function analizarCvConIA(
  texto: string,
  nombreArchivo: string,
): Promise<{
  analysis: AnalyzedProfileConBrechas;
  guardado: { analisis_id: string; brechas: string[] } | null;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${supabaseUrl}/functions/v1/analizar-cv`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texto, nombre_archivo: nombreArchivo }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'El analisis fallo.');
  const analysis = json.analysis as AnalyzedProfileConBrechas;
  if (json.guardado == null) puenteBrechasInvitado.escribir(analysis.brechas ?? []);
  return { analysis, guardado: (json.guardado ?? null) as { analisis_id: string; brechas: string[] } | null };
}
