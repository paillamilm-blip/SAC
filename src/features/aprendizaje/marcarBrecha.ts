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
// (dominada no revierte). PostgREST traduce esa exception a code P0001: ese y solo
// ese mensaje es español escrito para el fundador y se muestra tal cual. Cualquier
// otro error (PGRST202 con el RPC sin desplegar, red caída, JWT vencido) es jerga
// de infraestructura y se enmascara por una línea propia; el detalle crudo queda
// en la consola para quien depure. La UI siempre revierte el estado optimista.
import { supabase } from '@/infrastructure/supabase/client';
import type { EstadoBrecha } from '@/features/gemelo/services/brechas';

const CODE_DEL_SQL = 'P0001';
const FALLBACK = 'No se pudo guardar tu respuesta. Probá de nuevo.';

export async function marcarBrecha(id: string, state: EstadoBrecha): Promise<void> {
  const { error } = await supabase.rpc('marcar_brecha', { p_brecha: id, p_state: state });
  if (!error) return;
  if (error.code === CODE_DEL_SQL && error.message?.trim()) throw new Error(error.message);
  console.warn('[marcarBrecha]', error.code ?? 'sin-code', error.message ?? '');
  throw new Error(FALLBACK);
}
