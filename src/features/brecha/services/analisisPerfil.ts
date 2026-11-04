// Análisis de perfil: un corte del mapa mental con TODAS sus variables, en números con su escala.
// No añade datos nuevos — reordena lo que el mapa ya dibuja (categoría, severidad, estado, evidencia, cerradas)
// para que la persona lea su perfil de un vistazo. Regla de producto: nada se afirma más allá del dato.

import { estaDominada } from '../domain/dominio';
import { CATEGORIAS, type Brecha, type CategoriaBrecha, type Severidad } from '../domain/types';
import { evidenciaAusente } from '../domain/validar';
import { compararConAnterior, listarAnalisis, type Db } from './repositorio';

export type EstadoNodo = 'detectada' | 'reconocida' | 'dominada' | 'descartada';

/** El mismo estado por nodo que colorea el mapa. */
export function estadoNodo(b: Brecha): EstadoNodo {
  if (b.veredicto === 'rechazada') return 'descartada';
  if (estaDominada(b)) return 'dominada';
  if (b.veredicto === 'confirmada') return 'reconocida';
  return 'detectada';
}

export interface PorCategoria {
  categoria: CategoriaBrecha;
  etiqueta: string;
  total: number;
  detectadas: number;
  reconocidas: number;
  dominadas: number;
  descartadas: number;
}

export interface AnalisisPerfil {
  ocupacion: string;
  nivel: string;
  analizadoEn: string;
  esMuestra: boolean;
  total: number;
  /** Conteos por estado del mapa (suman `total`). */
  detectadas: number;
  reconocidas: number;
  dominadas: number;
  descartadas: number;
  /** Evidencia de cada nodo, como la marca el mapa (grosor de la arista). */
  conCita: number;
  ausentes: number;
  /** Severidad de las brechas que aún aplican (no descartadas): tamaño del nodo en el mapa. */
  severidad: Record<Severidad, number>;
  porCategoria: PorCategoria[];
  /** Nodos que se cerraron desde el análisis anterior (dominados o ya no aparecen en el CV). */
  cerradas: number;
}

const SEVERIDADES: Severidad[] = ['alta', 'media', 'baja'];
const ORDEN: CategoriaBrecha[] = ['dura', 'blanda', 'conocimiento', 'credencial'];

export function analizarPerfil(db: Db): AnalisisPerfil | null {
  const a = listarAnalisis(db)[0];
  if (!a) return null;

  const estados = a.brechas.map(estadoNodo);
  const cuenta = (e: EstadoNodo) => estados.filter((x) => x === e).length;
  const aplican = a.brechas.filter((b) => b.veredicto !== 'rechazada');

  const severidad: Record<Severidad, number> = { alta: 0, media: 0, baja: 0 };
  for (const b of aplican) severidad[b.severidad]++;

  const porCategoria: PorCategoria[] = ORDEN.filter((c) => a.brechas.some((b) => b.categoria === c)).map((c) => {
    const dec = a.brechas.filter((b) => b.categoria === c);
    const est = dec.map(estadoNodo);
    const n = (e: EstadoNodo) => est.filter((x) => x === e).length;
    return {
      categoria: c,
      etiqueta: CATEGORIAS[c],
      total: dec.length,
      detectadas: n('detectada'),
      reconocidas: n('reconocida'),
      dominadas: n('dominada'),
      descartadas: n('descartada'),
    };
  });

  return {
    ocupacion: a.ocupacion,
    nivel: a.nivel,
    analizadoEn: a.creadoEn,
    esMuestra: a.simulado,
    total: a.brechas.length,
    detectadas: cuenta('detectada'),
    reconocidas: cuenta('reconocida'),
    dominadas: cuenta('dominada'),
    descartadas: cuenta('descartada'),
    conCita: a.brechas.filter((b) => !evidenciaAusente(b.evidencia)).length,
    ausentes: a.brechas.filter((b) => evidenciaAusente(b.evidencia)).length,
    severidad,
    porCategoria,
    cerradas: compararConAnterior(db, a)?.cerradas.length ?? 0,
  };
}

export { SEVERIDADES };
