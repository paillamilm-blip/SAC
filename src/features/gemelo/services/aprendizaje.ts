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
  // Vacia la clave del puente. Lo va a necesitar la promocion
  // invitado->autenticado (Plan B): despues de subir las brechas a la BD hay que
  // borrarlas de aqui, o el proximo arranque las vuelve a ver como de invitado.
  limpiar(): void {
    try { localStorage.removeItem(PUENTE_KEY); } catch { /* sin permisos: no hay puente que limpiar */ }
  },
};

export type AnalyzedProfileConBrechas = import('./cvAnalyzer').AnalyzedProfile & {
  brechas: BrechaValidada[];
};

// Forma cruda del analisis que hablan LOS DOS motores (la Edge Function
// analizar-cv y el prompt viejo de infrastructure/ai/gemini.ts): campos sueltos
// y `axes` opcional — nadie confía en la IA hasta que el llamador lo valida.
export interface AnalysisCrudoIA {
  name?: string;
  seniorLabel?: string;
  seniorLevel?: number;
  years?: number;
  skills?: string[];
  skillsDetail?: { name: string; pct: number }[];
  arch?: string;
  axes?: { exec: number; qual: number; trans: number; fund: number };
  summary?: string;
}

export type FuenteAnalisis = 'motor' | 'gemini';

export interface ResultadoAnalisisCv {
  fuente: FuenteAnalisis;
  analysis: AnalysisCrudoIA;
  brechas: BrechaValidada[];
  guardado: { analisis_id: string; brechas: string[] } | null;
  // Huella x-omicron-build leida del cuerpo: que codigo esta vivo del lado del
  // servidor se ve sin abrir curl (M7 tiene su par en el navegador aqui).
  build?: string;
}

export async function analizarCvConIA(
  texto: string,
  nombreArchivo: string,
): Promise<{
  analysis: AnalyzedProfileConBrechas;
  guardado: { analisis_id: string; brechas: string[] } | null;
  build?: string;
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
    // M6: contra una funcion desplegada VIEJA `brechas` llega undefined. Escribir
    // `[]` en ese caso BORRABA el puente del invitado; sin array se conserva lo
    // que ya estaba guardado.
    if (Array.isArray(analysis.brechas)) puenteBrechasInvitado.escribir(analysis.brechas);
  }
  return {
    analysis,
    guardado: (json.guardado ?? null) as { analisis_id: string; brechas: string[] } | null,
    build: typeof json.build === 'string' ? json.build : undefined,
  };
}

// El motor de aprendizaje con su fallback DECLARADO (ruling C1 del controlador,
// 2026-10-26): la app pasa por analizar-cv — que emite brechas y persiste el run
// con la identidad del JWT, la unica fuente de la metrica de la Fase 1 — y
// cualquier falla del motor (401, 429, 5xx, red, JSON roto, analisis sin ejes)
// cae al camino que ya estaba, analyzeCVWithGemini, para que el golden path del
// usuario no dependa de que la funcion este desplegada. Null = los dos motores
// fallaron: el hook muestra el error, nunca inventa datos (spec §8).
// Deuda declarada, no resuelta aca: quedan DOS prompts de CV en el repo
// (gemini.ts y analizar-cv). Se cierra en Plan B, cuando el mapa se porte.
export async function analizarCvConFallback(
  texto: string,
  nombreArchivo: string,
): Promise<ResultadoAnalisisCv | null> {
  try {
    const r = await analizarCvConIA(texto, nombreArchivo);
    if (r.analysis && r.analysis.axes) {
      return {
        fuente: 'motor',
        analysis: r.analysis,
        brechas: Array.isArray(r.analysis.brechas) ? r.analysis.brechas : [],
        guardado: r.guardado,
        build: r.build,
      };
    }
    console.warn('[Omicron] el motor devolvio un analisis sin ejes; cae al fallback Gemini.');
  } catch (e) {
    // El servicio lanza con el mensaje en espanol del servidor (401/429/5xx).
    // Cualquier error del motor es motivo de fallback, no de pantalla rota.
    console.warn('[Omicron] motor analizar-cv no disponible; cae al fallback Gemini:', e);
  }
  try {
    const { analyzeCVWithGemini } = await import('@/infrastructure/ai/gemini');
    const g = await analyzeCVWithGemini(texto);
    if (g.ok && g.analysis?.axes) {
      return { fuente: 'gemini', analysis: g.analysis, brechas: [], guardado: null };
    }
    console.error('[Omicron] el fallback Gemini tampoco trajo un analisis:', g.error ?? 'sin motivo');
  } catch (e) {
    console.error('[Omicron] el fallback Gemini exploto:', e);
  }
  return null;
}
