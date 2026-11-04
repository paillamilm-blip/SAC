// Qué entra en el pasaporte. PURO: sale solo de lo que la persona hizo y guardó.
//   · sello      = habilidad con examen aprobado (calificado por el servidor): `estaDominada`
//   · por ganar  = brecha que reconoció como real y aún no demostró (el sello que le falta)
//   · por reconocer = brechas del último análisis sin revisar (aún no sabe si le faltan)
// Nada se estima ni se completa: si no hay prueba, no hay sello.

import { estaDominada } from '../domain/dominio';
import type { Brecha, CategoriaBrecha, Severidad } from '../domain/types';
import { listarAnalisis, type Db } from './repositorio';

export interface Sello {
  analisisId: string;
  brechaId: string;
  titulo: string;
  categoria: CategoriaBrecha;
  /** 0 a 100, calculado por el servidor. */
  puntaje: number;
  /** Cuándo se aprobó (ISO). */
  en: string;
}

export interface PorGanar {
  analisisId: string;
  brechaId: string;
  titulo: string;
  categoria: CategoriaBrecha;
  severidad: Severidad;
}

export interface Pasaporte {
  ocupacion: string | null;
  /** El último análisis es la muestra fija: el pasaporte no puede presentarse como del CV de la persona. */
  esMuestra: boolean;
  sellos: Sello[];
  porGanar: PorGanar[];
  porReconocer: number;
}

const PESO: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };
const clave = (titulo: string) => titulo.trim().toLowerCase();

export function armarPasaporte(db: Db): Pasaporte {
  const analisis = listarAnalisis(db); // más reciente primero
  const ultimo = analisis[0];
  if (!ultimo) return { ocupacion: null, esMuestra: false, sellos: [], porGanar: [], porReconocer: 0 };

  // La misma habilidad en dos análisis es un solo sello: el de la prueba más reciente.
  const todos: Sello[] = analisis.flatMap((a) =>
    a.brechas.filter(estaDominada).map((b: Brecha) => ({
      analisisId: a.id,
      brechaId: b.id,
      titulo: b.titulo,
      categoria: b.categoria,
      puntaje: b.prueba?.puntaje ?? 0,
      en: b.prueba?.en ?? '',
    })),
  );
  todos.sort((x, y) => y.en.localeCompare(x.en));
  const vistos = new Set<string>();
  const sellos = todos.filter((s) => {
    const k = clave(s.titulo);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  const porGanar: PorGanar[] = ultimo.brechas
    .filter((b) => b.veredicto === 'confirmada' && !estaDominada(b) && !vistos.has(clave(b.titulo)))
    .sort((a, b) => PESO[a.severidad] - PESO[b.severidad])
    .map((b) => ({ analisisId: ultimo.id, brechaId: b.id, titulo: b.titulo, categoria: b.categoria, severidad: b.severidad }));

  return {
    ocupacion: ultimo.ocupacion,
    esMuestra: ultimo.simulado,
    sellos,
    porGanar,
    porReconocer: ultimo.brechas.filter((b) => !b.veredicto).length,
  };
}
