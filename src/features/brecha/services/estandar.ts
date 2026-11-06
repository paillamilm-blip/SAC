// Cuánto falta para cubrir el estándar de tu ocupación — con la única base que existe de verdad.
//
// El análisis NO tiene una lista completa del conocimiento estándar de una ocupación: solo detecta BRECHAS, lo que
// alguien de tu ocupación y nivel normalmente muestra y tu CV no. Por eso el porcentaje es sobre esas brechas:
//   · total      = brechas del último análisis, sin las que marcaste «no aplica»
//   · conPrueba  = las que cubriste con un examen aprobado (calificado por el servidor)
//   · falta %    = lo que aún no tiene prueba, sobre el total
// Las reconocidas sin examen y las sin revisar NO cuentan como cubiertas. Nada se estima ni se redondea a favor.

import { estaDominada } from '../domain/dominio';
import { listarAnalisis, type Db } from './repositorio';

export interface Estandar {
  total: number;
  conPrueba: number;
  reconocidasSinPrueba: number;
  sinRevisar: number;
  descartadas: number;
  /** 0 a 100. Nunca 0 si algo falta ni 100 si ya cubriste algo (el redondeo no puede mentir). */
  faltaPct: number;
  /** El último análisis es la muestra fija: no sale del CV de la persona. */
  esMuestra: boolean;
}

export function medirEstandar(db: Db): Estandar | null {
  const ultimo = listarAnalisis(db)[0];
  if (!ultimo) return null;

  const descartadas = ultimo.brechas.filter((b) => b.veredicto === 'rechazada').length;
  const aplican = ultimo.brechas.filter((b) => b.veredicto !== 'rechazada');
  const total = aplican.length;
  const conPrueba = aplican.filter(estaDominada).length;
  const reconocidasSinPrueba = aplican.filter((b) => b.veredicto === 'confirmada' && !estaDominada(b)).length;
  const sinRevisar = aplican.filter((b) => b.veredicto === null).length;

  const falta = total - conPrueba;
  let faltaPct = total === 0 ? 0 : Math.round((falta / total) * 100);
  if (falta > 0) faltaPct = Math.min(99 + (conPrueba === 0 ? 1 : 0), Math.max(1, faltaPct));
  if (falta === 0) faltaPct = 0;

  return { total, conPrueba, reconocidasSinPrueba, sinRevisar, descartadas, faltaPct, esMuestra: ultimo.simulado };
}

export interface ResumenCv {
  archivo: string | null;
  analizadoEn: string;
  ocupacion: string;
  nivel: string;
  resumen: string;
  /** Cada una termina con una cita literal del CV. */
  fortalezas: string[];
  esMuestra: boolean;
}

/** Lo que Ómicrom entendió de tu CV (no se guarda el archivo: solo este resultado). */
export function resumenCv(db: Db): ResumenCv | null {
  const a = listarAnalisis(db)[0];
  if (!a) return null;
  return {
    archivo: a.nombreArchivo,
    analizadoEn: a.creadoEn,
    ocupacion: a.ocupacion,
    nivel: a.nivel,
    resumen: a.resumen,
    fortalezas: a.fortalezas,
    esMuestra: a.simulado,
  };
}
