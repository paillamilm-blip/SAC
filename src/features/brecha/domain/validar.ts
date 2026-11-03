// Validación del resultado que devuelve la IA. La salida de un modelo es un dato NO confiable:
// aquí se le da forma, se recortan excesos y, sobre todo, se comprueba que cada evidencia exista
// de verdad en el CV (PRODUCT.md, principio 4: la interfaz no afirma más que el dato).
//
// Regla de evidencia: una brecha o fortaleza solo pasa si
//   · (brecha) empieza con «Ausente en el CV:», o
//   · contiene una cita literal entre « » que aparece en el texto del CV.
// Lo que el modelo "recuerda" pero no está en el texto se descarta.

import { z } from 'zod';
import type { BrechaNueva, ResultadoAnalisis } from './types';

export const MIN_BRECHAS = 3;
const MAX_BRECHAS = 10;
const MAX_FORTALEZAS = 5;
const LARGO_MIN_CITA = 6;
const PREFIJO_AUSENTE = /^ausente en el cv:/i;

/** Recorta en vez de rechazar: un modelo que se pasa 20 caracteres no debe costarle el análisis a la persona. */
function texto(max: number) {
  return z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .pipe(z.string().min(1));
}

const BrechaSchema = z.object({
  categoria: z.enum(['dura', 'blanda', 'conocimiento', 'credencial']),
  titulo: texto(140),
  evidencia: texto(400),
  porQueImporta: texto(500),
  severidad: z.enum(['alta', 'media', 'baja']),
  aprender: z.object({
    que: texto(400),
    como: texto(400),
    comoLoDemuestro: texto(400),
  }),
});

const CabeceraSchema = z.object({
  ocupacion: texto(120),
  nivel: texto(120),
  resumen: texto(900),
});

function normalizar(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Fragmentos citados entre « », partidos por puntos suspensivos y sin los demasiado cortos para comprobar. */
export function citasDe(frase: string): string[] {
  const citas: string[] = [];
  for (const m of frase.matchAll(/«([^»]+)»/g)) {
    for (const parte of m[1].split(/…|\.\.\./)) {
      const p = normalizar(parte);
      if (p.length >= LARGO_MIN_CITA) citas.push(p);
    }
  }
  return citas;
}

/** ¿Todas las citas de la frase aparecen en el CV, y hay al menos una? */
export function citaVerificada(frase: string, textoCv: string): boolean {
  const citas = citasDe(frase);
  if (citas.length === 0) return false;
  const base = normalizar(textoCv);
  return citas.every((c) => base.includes(c));
}

function evidenciaValida(evidencia: string, textoCv: string): boolean {
  return PREFIJO_AUSENTE.test(evidencia.trim()) || citaVerificada(evidencia, textoCv);
}

export class AnalisisInvalido extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'AnalisisInvalido';
  }
}

/**
 * Convierte la respuesta cruda del modelo en un ResultadoAnalisis confiable, o lanza AnalisisInvalido.
 * `textoCv` es el texto del que salió el análisis y sirve para comprobar las citas.
 */
export function validarResultado(crudo: unknown, textoCv: string): ResultadoAnalisis {
  if (!crudo || typeof crudo !== 'object') throw new AnalisisInvalido('La IA no devolvió un análisis legible.');
  const o = crudo as Record<string, unknown>;

  const cabecera = CabeceraSchema.safeParse(o);
  if (!cabecera.success) throw new AnalisisInvalido('La IA devolvió un análisis incompleto.');

  const brechas: BrechaNueva[] = [];
  for (const candidata of Array.isArray(o.brechas) ? o.brechas : []) {
    const r = BrechaSchema.safeParse(candidata);
    if (r.success && evidenciaValida(r.data.evidencia, textoCv)) brechas.push(r.data);
    if (brechas.length === MAX_BRECHAS) break;
  }
  if (brechas.length < MIN_BRECHAS) {
    throw new AnalisisInvalido('No pude respaldar el análisis con lo que dice tu CV. Inténtalo de nuevo.');
  }

  const fortalezas: string[] = [];
  for (const f of Array.isArray(o.fortalezas) ? o.fortalezas : []) {
    if (typeof f !== 'string') continue;
    const limpia = f.trim().slice(0, 300);
    if (limpia && citaVerificada(limpia, textoCv)) fortalezas.push(limpia);
    if (fortalezas.length === MAX_FORTALEZAS) break;
  }

  return { ...cabecera.data, fortalezas, brechas };
}
