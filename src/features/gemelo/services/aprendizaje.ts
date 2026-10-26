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

export type FuenteAnalisis = 'motor' | 'gemini' | 'bloqueado';

// El status importa: 401/429/503 son decisiones del servidor sobre ESTE usuario
// (sesion, cupo del dia, origen no identificable), no una falla del motor. Sin el
// numero, el llamador no puede distinguir "el motor esta caido" (cae a Gemini) de
// "acá te cortaste" (hay que decirtelo).
export class ErrorAnalisisMotor extends Error {
  constructor(
    message: string,
    readonly status: number,
    // `delServidor`: el cuerpo trajo el `error` del motor, o sea que la funcion
    // CORRIO y redacto un motivo para esta persona. Un 401/503 del borde de
    // Supabase (verify_jwt, cold start, gateway) llega con {code, message} y sin
    // handler: es el motor afuera, no un corte, y el fallback declarado le toca.
    readonly delServidor: boolean,
  ) {
    super(message);
    this.name = 'ErrorAnalisisMotor';
  }
}

// Union discriminada por `fuente`: con `analysis: null` el consumidor podria leer
// `.analysis.axes` de un caso bloqueado y el compilador no lo frenaria. La tercera
// cara no lleva analisis a proposito — quien lo quiera tiene que preguntar primero.
export type ResultadoAnalisisCv =
  | {
      fuente: 'motor' | 'gemini';
      analysis: AnalysisCrudoIA;
      brechas: BrechaValidada[];
      guardado: { analisis_id: string; brechas: string[] } | null;
      // Huella x-omicron-build leida del cuerpo: que codigo esta vivo del lado del
      // servidor se ve sin abrir curl (M7 tiene su par en el navegador aqui).
      build?: string;
    }
  | { fuente: 'bloqueado'; error: string; status: number };

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
      // El Bearer siempre va, con la anon key de respaldo — la misma resolucion
      // que hace supabase-js (session?.access_token ?? supabaseKey) en
      // functions.invoke(). Sin header el borde de Supabase (verify_jwt ON)
      // responde 401 y la funcion nunca corre: el modo invitado no existe.
      // La anon key es publica por diseño y ya viaja como apikey en este request.
      Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texto, nombre_archivo: nombreArchivo }),
  });
  if (!res.ok) {
    // Un error HTTP no es un resultado: se lee legible, no se parsea como analysis.
    let msg: string | undefined;
    try { msg = (await res.json() as { error?: string })?.error; } catch { /* cuerpo no JSON: sin mensaje */ }
    // Sin `error` en el cuerpo hablo la plataforma, no el motor: no hay decision
    // sobre esta persona que mostrar, y la jerga con el numero de status tampoco.
    throw new ErrorAnalisisMotor(
      msg ?? 'El análisis no respondió. Intentando con el respaldo.',
      res.status,
      msg !== undefined,
    );
  }
  const json = await res.json();
  // El motor actual responde el rechazo CON su HTTP propio (401/429/502/503/504),
  // asi que 200 con ok:false no ocurre hoy; si ocurriera, el status real del
  // response es lo unico que el llamador puede usar para decidir — no se inventa.
  if (!json.ok) throw new ErrorAnalisisMotor(json.error ?? 'El analisis fallo.', res.status, true);
  const analysis = json.analysis as AnalyzedProfileConBrechas;
  // El puente es SOLO para quien no tiene usuario. Si hay sesion y el guardado
  // fallo (guardado_error), las brechas no caen al puente: nunca alcanzarian la
  // BD ni el mapa entre dispositivos. El analisis igual se devuelve, la UI no se rompe.
  // Un corte 401/429/503 nunca llega hasta aqui: el throw es anterior, asi que el
  // bloqueo NO escribe ni borra el puente del invitado — lo que ya estaba sigue estando.
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
// con la identidad del JWT, la unica fuente de la metrica de la Fase 1 — y una
// falla del motor (5xx, red, JSON roto, analisis sin ejes) cae al camino que ya
// estaba, analyzeCVWithGemini, para que el golden path del usuario no dependa de
// que la funcion este desplegada. Null = los dos motores fallaron: el hook muestra
// el error, nunca inventa datos (spec §8).
// El fallback NO cubre los cortes que el propio motor redacto para este usuario
// (401/429/503 con su `error` en el cuerpo): ahi el resultado es la informacion,
// no un analisis (ver BLOQUEO en el catch). Un 401/503 de la plataforma, que no
// trae ese texto porque la funcion no corrio, SI cae al respaldo.
// Deuda declarada, no resuelta aca: quedan DOS prompts de CV en el repo
// (gemini.ts y analizar-cv). Se cierra en Plan B, cuando el mapa se porte.
export async function analizarCvConFallback(
  texto: string,
  nombreArchivo: string,
): Promise<ResultadoAnalisisCv | null> {
  // Los statuses que el server usa para decirle algo a ESTA persona, no al motor.
  // Si Gemini cubre un 429, el tope diario deja de existir: el usuario obtiene su
  // analisis igual y el control de gasto del servidor se vuelve decoracion.
  const BLOQUEO = new Set([401, 429, 503]);
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
    const motorHablo = e instanceof ErrorAnalisisMotor && e.delServidor;
    const status = e instanceof ErrorAnalisisMotor ? e.status : 0;
    // El numero de status solo no decide: un 401/503 del BORDE (cuerpo {code,
    // message}, handler nunca corrio) trae el mismo numero que un corte real del
    // motor y se mostraba como bloqueo, saltandose el fallback declarado.
    if (BLOQUEO.has(status) && motorHablo) {
      // Spec §8, "nunca tope silencioso": caerse a Gemini ante un 429 anula el tope
      // (el usuario igual obtiene su analisis y el control de gasto del servidor
      // deja de ser control). Ante un 401, el analisis que ve ni siquiera es suyo
      // guardado. Cuando los redacta el motor, estos tres statuses son informacion,
      // no fallo: se rebotan tal cual.
      console.warn(`[Omicron] el motor corto la request con ${status}: se muestra el motivo, no se busca una puerta alternativa.`);
      return { fuente: 'bloqueado', error: (e as Error).message, status };
    }
    // El servicio lanza con el mensaje en espanol del servidor (5xx) o con status 0
    // (red cortada, JSON roto, TypeError del fetch): eso SI es el motor caido, y el
    // respaldo esta declarado para que el golden path no dependa del despliegue.
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
