// features/gemelo/services/brechas.ts
// Contrato del aprendizaje continuo. La autoridad en runtime es el RPC
// marcar_brecha (10012); este espejo alimenta la UI, los tests y el guard
// optimista del cliente. Cambiar uno sin el otro es un bug.

export type EstadoBrecha = 'detectada' | 'confirmada' | 'rechazada' | 'dominada';
export type CategoriaBrecha = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
export type SeveridadBrecha = 'alta' | 'media' | 'baja';

export const TRANSICIONES_VALIDAS: Record<EstadoBrecha, EstadoBrecha[]> = {
  detectada:  ['confirmada', 'rechazada'],
  confirmada: ['dominada', 'rechazada'],
  rechazada:  ['confirmada'],
  dominada:   [],
};

export function transicionValida(de: EstadoBrecha, a: EstadoBrecha): boolean {
  return TRANSICIONES_VALIDAS[de].includes(a);
}

export interface BrechaFila {
  id: string;
  analisis_id: string;
  categoria: CategoriaBrecha;
  titulo: string;
  evidencia: string;
  por_que_importa: string;
  severidad: SeveridadBrecha;
  aprender_que: string;
  aprender_como: string;
  aprender_demuestro: string;
  state: EstadoBrecha;
  confirmed_at: string | null;
  mastered_at: string | null;
  created_at: string;
}
