// Ajustes e historial del chat del asistente. Solo se ofrece lo que de verdad funciona hoy:
// respuestas habladas y guardar/borrar el historial. (Tono, largo de respuesta y manos libres
// quedan pendientes: ver docs/tasks.md TAREA-36.)
//
// El historial es privado y por persona: vive solo en este dispositivo y, por defecto, NO se guarda.

import type { Accion, Origen } from './recomendar';
import type { Fuente } from './responder';
import type { Almacen } from '../brecha/services/repositorio';

export interface Ajustes {
  /** Lee las respuestas en voz alta (síntesis del navegador). */
  hablar: boolean;
  /** Conserva la conversación en este dispositivo entre visitas. */
  guardarHistorial: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = { hablar: false, guardarHistorial: false };

export const CLAVE_AJUSTES = 'omicron:asistente:ajustes:v1';
export const CLAVE_HISTORIAL = 'omicron:asistente:historial:v1:';
export const MAX_MENSAJES = 60;

export type EstadoAccion = 'propuesta' | 'hecha' | 'cancelada';

export interface Mensaje {
  id: string;
  rol: 'yo' | 'asistente';
  texto: string;
  origen?: Origen;
  fuentes?: Fuente[];
  /** true = redactada por el modelo de IA, no por reglas sobre tus datos. */
  ia?: boolean;
  accion?: { accion: Accion; etiqueta: string; porQue: string; estado: EstadoAccion };
}

export function claveHistorial(usuario: string | null): string {
  return CLAVE_HISTORIAL + (usuario ?? 'invitado');
}

export function cargarAjustes(almacen: Almacen): Ajustes {
  try {
    const crudo = almacen.getItem(CLAVE_AJUSTES);
    if (!crudo) return AJUSTES_POR_DEFECTO;
    const o = JSON.parse(crudo) as Partial<Ajustes>;
    return {
      hablar: o.hablar === true,
      guardarHistorial: o.guardarHistorial === true,
    };
  } catch {
    return AJUSTES_POR_DEFECTO;
  }
}

export function guardarAjustes(almacen: Almacen, ajustes: Ajustes): boolean {
  try {
    almacen.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
    return true;
  } catch {
    return false;
  }
}

function esMensaje(m: unknown): m is Mensaje {
  if (!m || typeof m !== 'object') return false;
  const x = m as Partial<Mensaje>;
  return typeof x.id === 'string' && typeof x.texto === 'string' && (x.rol === 'yo' || x.rol === 'asistente');
}

export function cargarHistorial(almacen: Almacen, usuario: string | null): Mensaje[] {
  try {
    const crudo = almacen.getItem(claveHistorial(usuario));
    if (!crudo) return [];
    const lista = JSON.parse(crudo) as unknown;
    return Array.isArray(lista) ? lista.filter(esMensaje).slice(-MAX_MENSAJES) : [];
  } catch {
    return [];
  }
}

export function guardarHistorial(almacen: Almacen, usuario: string | null, mensajes: Mensaje[]): boolean {
  try {
    almacen.setItem(claveHistorial(usuario), JSON.stringify(mensajes.slice(-MAX_MENSAJES)));
    return true;
  } catch {
    return false;
  }
}

export function borrarHistorial(almacen: Almacen, usuario: string | null): void {
  try {
    almacen.removeItem(claveHistorial(usuario));
  } catch {
    /* sin acceso al almacenamiento: no hay nada que borrar */
  }
}

/** Quita marcas internas de herramientas ([EXAMEN], [CV: ...]) que la IA pudiera dejar en el texto. */
export function limpiarTextoIA(texto: string): string {
  return texto
    .replace(/\[(?:EXAMEN|CV|RETO|ACADEMIA)[^\]]*\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
