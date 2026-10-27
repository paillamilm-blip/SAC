// features/aprendizaje/marcarBrecha.ts
// B4 · cliente flaco del RPC marcar_brecha (10012). El brief daba por hecho que
// este cliente ya vivía en features/gemelo/services/brechas.ts; NO estaba: ese
// archivo es el espejo PURO de la máquina de estados (lo vigila
// contratoEspejos.test.ts y lo compara con el SQL). Para no contaminar ese espejo
// con un import de runtime (Supabase), el cliente vive acá y reusa la máquina de
// brechas.ts como única autoridad.
//
// Contrato con el SQL: marcar_brecha(p_brecha uuid, p_state text) → jsonb. Levanta
// exception con un texto legible si la fila no es tuya o si la transición no va
// (dominada no revierte). PostgREST traduce esa exception a error en el cliente:
// lo relanzamos como Error con el mensaje del servidor para que la UI lo muestre
// y revierta el estado optimista. Con el motor sin desplegar el RPC no existe y
// el guard no encuentra la fila: siempre falla y la UI lo dice (nada de inventar
// que se guardó).
import { supabase } from '@/infrastructure/supabase/client';
import type { EstadoBrecha } from '@/features/gemelo/services/brechas';

export async function marcarBrecha(id: string, state: EstadoBrecha): Promise<void> {
  const { error } = await supabase.rpc('marcar_brecha', { p_brecha: id, p_state: state });
  if (error) {
    throw new Error(error.message || 'No se pudo guardar tu respuesta. Probá de nuevo.');
  }
}
