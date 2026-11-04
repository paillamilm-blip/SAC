// Crear el enlace de la credencial. La firma y el contenido los pone el servidor, que lee las pruebas de la
// persona en su propia base: aquí no se manda ninguna habilidad ni puntaje.

import { supabase } from '@/infrastructure/supabase/client';
import { mensajeDe, type Salida } from './errores';

export interface CredencialEmitida {
  /** Dirección pública que cualquiera puede abrir sin cuenta. */
  enlace: string;
  habilidades: number;
  /** Cuándo vence (ms desde 1970). */
  vence: number | null;
}

export async function emitirCredencial(origen: string = window.location.origin): Promise<Salida<CredencialEmitida>> {
  try {
    const { data, error } = await supabase.functions.invoke('credential', { body: { action: 'issue' } });
    if (error || !data || (data as { error?: unknown }).error) {
      const m = await mensajeDe(error, data, 'Inicia sesión para crear tu credencial.');
      return { ok: false, error: m.texto, necesitaSesion: m.sinSesion };
    }
    const d = data as { token?: unknown; habilidades?: unknown; vence?: unknown };
    if (typeof d.token !== 'string' || d.token.split('.').length !== 2) {
      return { ok: false, error: 'La respuesta llegó incompleta. Inténtalo de nuevo.' };
    }
    return {
      ok: true,
      datos: {
        enlace: `${origen.replace(/\/+$/, '')}/?verificar=${encodeURIComponent(d.token)}`,
        habilidades: typeof d.habilidades === 'number' ? d.habilidades : 0,
        vence: typeof d.vence === 'number' ? d.vence : null,
      },
    };
  } catch {
    return { ok: false, error: 'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.' };
  }
}
