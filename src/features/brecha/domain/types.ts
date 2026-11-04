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
  /**
   * Cuándo se dio por dominada. Solo cuenta como dominada si además hay `prueba` (ver `estaDominada`).
   * Un valor sin prueba viene de cuando se podía autodeclarar: se conserva, pero no cuenta.
   */
  dominadaEn: string | null;
  /** Examen aprobado, calificado por el servidor. null = sin prueba. */
  prueba: PruebaExamen | null;
};

/** Lo que devuelve el servidor al aprobar un examen: el acta queda guardada allí. */
export type PruebaExamen = {
  actaId: string;
  /** 0 a 100, calculado por el servidor. */
  puntaje: number;
  /** Cuándo se aprobó (ISO). */
  en: string;
};

export type BrechaNueva = Omit<Brecha, 'id' | 'veredicto' | 'veredictoEn' | 'dominadaEn' | 'prueba'>;

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

/**
 * Qué tan respaldado quedó un análisis. Son conteos reales de la validación, no un puntaje inventado:
 * cada cifra se muestra con su escala («7 de 9 brechas con cita verificada»).
 */
export type CalidadAnalisis = {
  /** Brechas que entregó el modelo, antes de validar. */
  brechasPropuestas: number;
  /** Brechas que superaron la validación y se muestran. */
  brechasAceptadas: number;
  /** De las aceptadas: las que citan el CV y la cita se encontró en el texto. */
  conCita: number;
  /** De las aceptadas: las que dicen «Ausente en el CV:» (no hay texto que verificar). */
  ausentes: number;
  fortalezasPropuestas: number;
  fortalezasAceptadas: number;
  /** Llamadas a la IA que hicieron falta (1 = salió a la primera). */
  intentos: number;
};

/** Lo que devuelve cualquier proveedor de análisis (demostración o IA real). */
export type ResultadoAnalisis = {
  ocupacion: string;
  nivel: string;
  resumen: string;
  fortalezas: string[];
  brechas: BrechaNueva[];
  /** Solo el análisis con IA la trae; la muestra fija no se valida contra un CV. */
  calidad?: CalidadAnalisis;
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
  /** Ausente en análisis guardados antes de que se midiera la calidad. */
  calidad?: CalidadAnalisis;
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
