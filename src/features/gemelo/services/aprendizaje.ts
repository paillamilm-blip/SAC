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
  if (!res.ok) {
    // Un error HTTP no es un resultado: se lee legible, no se parsea como analysis.
    let msg: string | undefined;
    try { msg = (await res.json() as { error?: string })?.error; } catch { /* cuerpo no JSON: sin mensaje */ }
    throw new Error(msg ?? `El analisis fallo (HTTP ${res.status}).`);
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'El analisis fallo.');
  const analysis = json.analysis as AnalyzedProfileConBrechas;
  // El puente es SOLO para quien no tiene usuario. Si hay sesion y el guardado
  // fallo (guardado_error), las brechas no caen al puente: nunca alcanzarian la
  // BD ni el mapa entre dispositivos. El analisis igual se devuelve, la UI no se rompe.
  if (json.guardado == null && json.guardado_error !== true) {
    puenteBrechasInvitado.escribir(analysis.brechas ?? []);
  }
  return { analysis, guardado: (json.guardado ?? null) as { analisis_id: string; brechas: string[] } | null };
}
