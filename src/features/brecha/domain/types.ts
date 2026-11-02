// Tipos del dominio de brechas. Portados de brecha/lib/types.ts, sin lo que era
// exclusivo del servidor Node (Buffer, Db en disco): aquí todo es puro y serializable.

export type CategoriaBrecha = 'dura' | 'blanda' | 'conocimiento' | 'credencial';

export type Severidad = 'alta' | 'media' | 'baja';

/** Opinión de la persona sobre una brecha: "es real", "no aplica" o sin revisar. */
export type Veredicto = 'confirmada' | 'rechazada' | null;

export type Aprender = {
  que: string;
  como: string;
  comoLoDemuestro: string;
};

export type Brecha = {
  id: string;
  categoria: CategoriaBrecha;
  titulo: string;
  evidencia: string;
  porQueImporta: string;
  severidad: Severidad;
  aprender: Aprender;
  veredicto: Veredicto;
  veredictoEn: string | null;
  /** Autodeclarada hasta que exista la prueba por examen (ver docs/tasks.md, TAREA-37). */
  dominadaEn: string | null;
};

export type BrechaNueva = Omit<Brecha, 'id' | 'veredicto' | 'veredictoEn' | 'dominadaEn'>;

export type MotivoCerrada = 'dominada' | 'no_aparece';

export type BrechaCerrada = {
  id: string;
  titulo: string;
  categoria: CategoriaBrecha;
  severidad: Severidad;
  fecha: string;
  motivo: MotivoCerrada;
};

export type ComparacionAnalisis = {
  anteriorId: string;
  anteriorEn: string;
  cerradas: BrechaCerrada[];
  nuevasIds: string[];
  persistenIds: string[];
};

/** Lo que devuelve cualquier proveedor de análisis (demostración o IA real). */
export type ResultadoAnalisis = {
  ocupacion: string;
  nivel: string;
  resumen: string;
  fortalezas: string[];
  brechas: BrechaNueva[];
};

export type Analisis = {
  id: string;
  creadoEn: string;
  /** Nombre del proveedor que lo generó: 'demostracion' o 'gemini'. */
  proveedor: string;
  /** true = muestra fija, no surge del PDF de la persona. */
  simulado: boolean;
  nombreArchivo: string | null;
  tamanio: number | null;
  ocupacion: string;
  nivel: string;
  resumen: string;
  fortalezas: string[];
  brechas: Brecha[];
};

export const CATEGORIAS: Record<CategoriaBrecha, string> = {
  dura: 'Habilidad dura',
  blanda: 'Habilidad blanda',
  conocimiento: 'Conocimiento',
  credencial: 'Credencial',
};

export function brechasConfirmadas(brechas: Brecha[]) {
  const confirmadas = brechas.filter((b) => b.veredicto === 'confirmada').length;
  const rechazadas = brechas.filter((b) => b.veredicto === 'rechazada').length;
  return { confirmadas, rechazadas, revisadas: confirmadas + rechazadas, total: brechas.length };
}
