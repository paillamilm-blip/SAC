// Derechos de la persona sobre sus datos (política de privacidad §8): descargarlos y borrar la cuenta.
// Lo del servidor lo hace la Edge Function `mi-cuenta` (con sesión). Lo que vive solo en este navegador se suma o se
// borra aquí, porque el servidor no lo ve.

import { supabase } from '@/infrastructure/supabase/client';
import { CLAVE_AJUSTES, claveHistorial } from '@/features/assistant/almacenChat';
import { CLAVE_INVITADO, claveDe } from './repositorio';
import { mensajeDe, type Salida } from './errores';

/** Lo que la persona escribe para confirmar el borrado. El servidor exige lo mismo. */
export const CONFIRMACION_BORRAR = 'BORRAR';

/** Marca que sobrevive al remonte de la app tras cerrar la sesión, para avisar que la cuenta se borró. */
export const AVISO_CUENTA_BORRADA = 'omicron:cuenta-borrada';

/**
 * Datos personales que la app anterior dejaba en el navegador (perfil estimado, memoria del asistente, análisis
 * pendiente). Al borrar la cuenta se borran también: no son ajustes, son datos de la persona.
 */
const CACHES_PERSONALES = ['omicron_ai_profile', 'omicron_gemelo_memory_v1', 'omicron_guest_profile', 'omicron_pending_cv_analysis'];

function almacen(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function leerJson(clave: string): unknown {
  const crudo = almacen()?.getItem(clave);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo);
  } catch {
    return crudo;
  }
}

/** Lo que este navegador guarda de la persona (o del invitado). */
function datosDeEsteDispositivo(usuarioId: string | null) {
  const quien = usuarioId ?? CLAVE_INVITADO;
  return {
    nota: 'Datos guardados solo en este navegador. Otros dispositivos pueden tener su propia copia.',
    analisis: leerJson(claveDe(quien)),
    conversacion_con_el_asistente: leerJson(claveHistorial(usuarioId)),
    ajustes_del_asistente: leerJson(CLAVE_AJUSTES),
    color_elegido: almacen()?.getItem('omicron_user_color') ?? null,
  };
}

function descargarJson(datos: unknown, nombre: string): boolean {
  try {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Descarga un JSON con todos los datos de la persona: lo del servidor (si tiene sesión) y lo de este navegador.
 * Un invitado solo tiene lo de este navegador.
 */
export async function exportarMisDatos(usuarioId: string | null): Promise<Salida<{ archivo: string }>> {
  const fecha = new Date().toISOString().slice(0, 10);
  const archivo = `omicrom-mis-datos-${fecha}.json`;
  let servidor: unknown = null;

  if (usuarioId) {
    try {
      const { data, error } = await supabase.functions.invoke('mi-cuenta', { body: { action: 'exportar' } });
      if (error || !data || (data as { error?: unknown }).error) {
        const m = await mensajeDe(error, data, 'Tu sesión expiró. Vuelve a iniciar sesión para descargar tus datos.');
        return { ok: false, error: m.texto, necesitaSesion: m.sinSesion };
      }
      servidor = data;
    } catch {
      return { ok: false, error: 'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.' };
    }
  }

  const paquete = {
    descripcion: 'Tus datos en Ómicrom. Formato JSON, legible por personas y programas.',
    generado: new Date().toISOString(),
    ...(usuarioId ? { en_el_servidor: servidor } : { en_el_servidor: 'Sin cuenta: Ómicrom no guarda datos tuyos en el servidor.' }),
    en_este_dispositivo: datosDeEsteDispositivo(usuarioId),
  };
  if (!descargarJson(paquete, archivo)) {
    return { ok: false, error: 'Tu navegador no permitió descargar el archivo.' };
  }
  return { ok: true, datos: { archivo } };
}

/** Borra de este navegador lo que pertenece a la persona (no los ajustes de la app ni los datos del invitado). */
function borrarDeEsteDispositivo(usuarioId: string) {
  const a = almacen();
  if (!a) return;
  a.removeItem(claveDe(usuarioId));
  a.removeItem(claveHistorial(usuarioId));
  for (const clave of CACHES_PERSONALES) a.removeItem(clave);
}

/**
 * Borra la cuenta: primero en el servidor (todo lo de la persona, en cascada), después en este navegador, y cierra la
 * sesión. Si el servidor falla, NO se toca nada local: la cuenta sigue existiendo y debe seguir viéndose igual.
 */
export async function borrarMiCuenta(usuarioId: string, confirmacion: string): Promise<Salida<null>> {
  if (confirmacion.trim().toUpperCase() !== CONFIRMACION_BORRAR) {
    return { ok: false, error: `Escribe ${CONFIRMACION_BORRAR} para confirmar.` };
  }
  try {
    const { data, error } = await supabase.functions.invoke('mi-cuenta', {
      body: { action: 'borrar', confirmar: CONFIRMACION_BORRAR },
    });
    if (error || !(data as { borrada?: unknown } | null)?.borrada) {
      const m = await mensajeDe(error, data, 'Tu sesión expiró. Vuelve a iniciar sesión para borrar tu cuenta.');
      return { ok: false, error: m.texto, necesitaSesion: m.sinSesion };
    }
  } catch {
    return { ok: false, error: 'No pudimos comunicarnos con el servidor. No se borró nada. Inténtalo de nuevo.' };
  }

  borrarDeEsteDispositivo(usuarioId);
  try {
    sessionStorage.setItem(AVISO_CUENTA_BORRADA, '1');
  } catch {
    /* sin sessionStorage solo se pierde el aviso */
  }
  // La cuenta ya no existe: el servidor rechazaría cerrar sesión. Se cierra solo aquí.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return { ok: true, datos: null };
}

/** Para un invitado: borra lo que guardó en este navegador (análisis y conversación). */
export function borrarDatosDeInvitado(): void {
  const a = almacen();
  if (!a) return;
  a.removeItem(claveDe(CLAVE_INVITADO));
  a.removeItem(claveHistorial(null));
}
