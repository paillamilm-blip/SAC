// Errores de las Edge Functions, en lenguaje de persona.
// Supabase entrega el cuerpo de un error HTTP en `error.context` (un Response); aquí se saca el mensaje que mandó el servidor.

export type Salida<T> = { ok: true; datos: T } | { ok: false; error: string; necesitaSesion?: boolean };

export interface MensajeError {
  texto: string;
  sinSesion: boolean;
  status?: number;
}

export async function mensajeDe(
  error: unknown,
  datos: unknown,
  textoSinSesion = 'Inicia sesión para continuar.',
): Promise<MensajeError> {
  const delCuerpo = (datos as { error?: string; detail?: string } | null | undefined) ?? null;
  let texto = delCuerpo?.error ?? '';
  let status: number | undefined;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    status = ctx.status;
    try {
      const cuerpo = (await ctx.clone().json()) as { error?: string };
      if (cuerpo?.error) texto = cuerpo.error;
    } catch {
      /* el cuerpo no era JSON */
    }
  }
  const sinSesion = status === 401;
  if (sinSesion) texto = textoSinSesion;
  if (!texto) texto = 'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  return { texto, sinSesion, status };
}
