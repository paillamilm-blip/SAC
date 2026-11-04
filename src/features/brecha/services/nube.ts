// La copia de los análisis en la cuenta de la persona (tabla `brecha_db`, una fila por persona, protegida por RLS:
// cada quien lee y escribe solo la suya). El navegador sigue guardando su copia local; esto agrega la de la cuenta.
//
// Regla de oro: NUNCA se escribe en la cuenta sin haberla leído antes con éxito (lo decide el hook). Si no se pudo
// leer, una escritura podría pisar análisis hechos desde otro dispositivo.

import { supabase } from '@/infrastructure/supabase/client';
import { leerDb, type Db } from './repositorio';

/**
 * - `no_aplica`     invitado: solo se guarda en el navegador.
 * - `sincronizando` hay cambios en camino a la cuenta.
 * - `guardado`      la cuenta tiene lo último.
 * - `sin_conexion`  falló (red, sesión, permisos): los datos siguen en este dispositivo y se reintenta al próximo cambio.
 * - `no_disponible` la tabla aún no existe en este proyecto de Supabase: solo se guarda en el navegador.
 */
export type EstadoNube = 'no_aplica' | 'sincronizando' | 'guardado' | 'sin_conexion' | 'no_disponible';

export type RespuestaNube<T> = { ok: true; datos: T } | { ok: false; estado: 'sin_conexion' | 'no_disponible' };

/** Códigos con los que PostgREST/Postgres avisan que la tabla no existe todavía (no es un fallo de red). */
const TABLA_AUSENTE = new Set(['PGRST205', 'PGRST204', '42P01']);

function clasificar(error: { code?: string; message?: string } | null | undefined): 'sin_conexion' | 'no_disponible' {
  if (error?.code && TABLA_AUSENTE.has(error.code)) return 'no_disponible';
  if (/schema cache|does not exist|Could not find the table/i.test(error?.message ?? '')) return 'no_disponible';
  return 'sin_conexion';
}

/** La copia de la cuenta. `datos: null` = la persona todavía no tiene ninguna (no es un error). */
export async function leerNube(usuarioId: string): Promise<RespuestaNube<Db | null>> {
  try {
    const { data, error } = await supabase.from('brecha_db').select('data').eq('user_id', usuarioId).maybeSingle();
    if (error) return { ok: false, estado: clasificar(error) };
    if (!data) return { ok: true, datos: null };
    const db = leerDb((data as { data?: unknown }).data);
    // Una copia ilegible NO se trata como «vacía» (se pisaría): es un fallo y se deja intacta.
    return db ? { ok: true, datos: db } : { ok: false, estado: 'sin_conexion' };
  } catch {
    return { ok: false, estado: 'sin_conexion' };
  }
}

/** Reemplaza la copia de la cuenta por `db`. Solo debe llamarse después de una lectura exitosa. */
export async function guardarNube(usuarioId: string, db: Db): Promise<RespuestaNube<void>> {
  try {
    const { error } = await supabase.from('brecha_db').upsert({ user_id: usuarioId, data: db }, { onConflict: 'user_id' });
    return error ? { ok: false, estado: clasificar(error) } : { ok: true, datos: undefined };
  } catch {
    return { ok: false, estado: 'sin_conexion' };
  }
}

