// Examen de una brecha: habla con la Edge Function `simulador-universal`.
//
// Regla de oro: el navegador NO decide nada. El servidor genera el reto (con la clave de respuestas que nunca
// viaja aquí), califica y da el veredicto APROBADO/REPROBADO (70 puntos o más). Este módulo solo transporta
// respuestas y devuelve lo que el servidor dijo; la «prueba» de una brecha sale únicamente de un APROBADO.

import { supabase } from '@/infrastructure/supabase/client';
import { asegurarNodoDeExamen, TITULO_MAX, normalizarTitulo } from '@/features/redviva/services/examenSkill';
import type { PruebaExamen } from '../domain/types';

export interface Reto {
  sessionId: string;
  titulo: string;
  contexto: string;
  preguntas: { pregunta: string; opciones: string[] }[];
  casoEnunciado: string;
  pista: string | null;
  nivel: string;
}

export interface Ejes {
  ejecucion: number;
  calidad: number;
  trascendencia: number;
  fundamento: number;
}

export interface Resultado {
  actaId: string | null;
  aprobado: boolean;
  puntaje: number;
  ejes: Ejes;
  resumen: string;
  feedback: string;
  siguientePaso: string;
}

export type Salida<T> = { ok: true; datos: T } | { ok: false; error: string; necesitaSesion?: boolean };

/**
 * Nombre de la habilidad que se examina, a partir del título de la brecha. La base acepta de 2 a 60 caracteres:
 * si el título es más largo se recorta en el último espacio, sin partir una palabra.
 */
export function nombreDeHabilidad(tituloBrecha: string): string {
  const t = normalizarTitulo(tituloBrecha);
  if (t.length <= TITULO_MAX) return t;
  const corte = t.slice(0, TITULO_MAX);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > 20 ? corte.slice(0, espacio) : corte).replace(/[\s.,;:–-]+$/u, '');
}

/** Saca el mensaje legible de un error de la función (el cuerpo viaja en `error.context`). */
async function mensajeDe(error: unknown, datos: unknown): Promise<{ texto: string; sinSesion: boolean; status?: number }> {
  const delCuerpo = (datos as { error?: string; detail?: string } | null | undefined) ?? null;
  let texto = delCuerpo?.error ?? '';
  let status: number | undefined;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    status = ctx.status;
    try {
      const cuerpo = (await ctx.clone().json()) as { error?: string };
      if (cuerpo?.error) texto = cuerpo.error;
    } catch {
      /* el cuerpo no era JSON */
    }
  }
  const sinSesion = status === 401;
  if (sinSesion) texto = 'Inicia sesión para dar el examen.';
  if (!texto) texto = 'No pudimos comunicarnos con el examen. Revisa tu conexión e inténtalo de nuevo.';
  return { texto, sinSesion, status };
}

async function invocar<T>(cuerpo: Record<string, unknown>, leer: (d: Record<string, unknown>) => T | null): Promise<Salida<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('simulador-universal', { body: cuerpo });
    if (error || !data || (data as { error?: unknown }).error) {
      const m = await mensajeDe(error, data);
      return { ok: false, error: m.texto, necesitaSesion: m.sinSesion };
    }
    const leido = leer(data as Record<string, unknown>);
    if (leido === null) return { ok: false, error: 'La respuesta del examen llegó incompleta. Inténtalo de nuevo.' };
    return { ok: true, datos: leido };
  } catch {
    return { ok: false, error: 'No pudimos comunicarnos con el examen. Revisa tu conexión e inténtalo de nuevo.' };
  }
}

const texto = (x: unknown): string => (typeof x === 'string' ? x : '');
const numero = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 0);

/** Prepara el examen de una habilidad y pide el reto. Dos viajes: crear/buscar el nodo y generar el reto. */
export async function iniciarExamen(tituloBrecha: string): Promise<Salida<Reto>> {
  const nodo = await asegurarNodoDeExamen(nombreDeHabilidad(tituloBrecha));
  if (!nodo.ok) return { ok: false, error: nodo.error };

  return invocar({ action: 'iniciar', node_id: nodo.nodeId }, (d) => {
    const reto = d.reto as Record<string, unknown> | undefined;
    const preguntas = Array.isArray(reto?.preguntas) ? (reto!.preguntas as Record<string, unknown>[]) : [];
    const caso = reto?.caso_practico as Record<string, unknown> | undefined;
    if (!d.session_id || !reto || preguntas.length === 0 || !caso?.enunciado) return null;
    for (const p of preguntas) if (!Array.isArray(p.opciones) || p.opciones.length < 2) return null;
    return {
      sessionId: String(d.session_id),
      titulo: texto(reto.titulo),
      contexto: texto(reto.contexto),
      preguntas: preguntas.map((p) => ({ pregunta: texto(p.pregunta), opciones: (p.opciones as unknown[]).map(texto) })),
      casoEnunciado: texto(caso.enunciado),
      pista: texto(reto.pista_adaptativa) || null,
      nivel: texto((d.difficulty as { label?: string } | undefined)?.label),
    };
  });
}

/** La repregunta de defensa sobre la respuesta al caso. */
export async function pedirDefensa(sessionId: string, casoRespuesta: string): Promise<Salida<{ defensa: string; pista: string | null }>> {
  return invocar({ action: 'defensa', session_id: sessionId, caso_respuesta: casoRespuesta }, (d) => ({
    defensa: texto(d.defensa) || 'Explica con tus palabras por qué tu enfoque es el correcto.',
    pista: texto(d.pista) || null,
  }));
}

/** Entrega todo. El veredicto lo da el servidor; aquí no se calcula nada. */
export async function evaluarExamen(
  sessionId: string,
  respuestas: number[],
  casoRespuesta: string,
  defensaRespuesta: string,
): Promise<Salida<Resultado>> {
  return invocar(
    { action: 'evaluar', session_id: sessionId, respuestas, caso_respuesta: casoRespuesta, defensa_respuesta: defensaRespuesta },
    (d) => {
      const ejes = d.ejes as Record<string, unknown> | undefined;
      if (!ejes || (d.veredicto !== 'APROBADO' && d.veredicto !== 'REPROBADO')) return null;
      return {
        actaId: typeof d.acta_id === 'string' ? d.acta_id : null,
        aprobado: d.veredicto === 'APROBADO',
        puntaje: numero(d.puntaje_global),
        ejes: {
          ejecucion: numero(ejes.ejecucion),
          calidad: numero(ejes.calidad),
          trascendencia: numero(ejes.trascendencia),
          fundamento: numero(ejes.fundamento),
        },
        resumen: texto(d.resumen),
        feedback: texto(d.feedback),
        siguientePaso: texto(d.siguiente_paso),
      };
    },
  );
}

/**
 * La prueba que se guarda en la brecha. Solo existe si el servidor aprobó Y dejó un acta: sin acta no hay nada
 * auditable que mostrar como «con prueba».
 */
export function pruebaDe(r: Resultado, ahora: string): PruebaExamen | null {
  if (!r.aprobado || !r.actaId) return null;
  return { actaId: r.actaId, puntaje: r.puntaje, en: ahora };
}
