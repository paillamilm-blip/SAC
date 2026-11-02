// Proveedores de análisis de CV. Hoy solo existe el de DEMOSTRACIÓN.
// El proveedor real (Edge Function `brecha-analizar` + Gemini) es la TAREA-32 y
// necesita desplegarse en Supabase con una clave de IA: no se puede activar desde aquí.
//
// El avance se informa con EVENTOS que el proveedor emite cuando ocurren, nunca con
// pausas fijas de la interfaz (PRODUCT.md, principio 4: la interfaz no afirma más que el dato).

import type { ResultadoAnalisis } from '../domain/types';
import { MUESTRA } from './muestra';

/** Momentos reales del trabajo, en orden. */
export type EventoAnalisis = 'recibido' | 'enviado' | 'leyendo' | 'listo';

export const ORDEN_EVENTOS: readonly EventoAnalisis[] = ['recibido', 'enviado', 'leyendo', 'listo'];

export interface ProveedorAnalisis {
  nombre: string;
  /** true = el resultado es una muestra fija, no sale del PDF. */
  simulado: boolean;
  analizar(archivo: File, alEvento: (e: EventoAnalisis) => void): Promise<ResultadoAnalisis>;
}

export const TAMANIO_MAXIMO = 15 * 1024 * 1024;

/** Devuelve el motivo por el que no se puede analizar el archivo, o null si es válido. */
export function validarArchivo(archivo: { name: string; type: string; size: number }): string | null {
  if (archivo.size === 0) return `«${archivo.name}» está vacío.`;
  if (archivo.type !== 'application/pdf') {
    return `«${archivo.name}» no es un PDF. Si tu CV está en Word, expórtalo a PDF y súbelo de nuevo.`;
  }
  if (archivo.size > TAMANIO_MAXIMO) {
    return 'El PDF pesa más de 15 MB. Exporta una versión más liviana.';
  }
  return null;
}

export type Esperar = (ms: number) => Promise<void>;
const esperarReal: Esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Proveedor de demostración. Devuelve siempre la misma muestra y NO envía el archivo a
 * ningún lado. Los eventos se emiten al ir terminando cada etapa de ESTE trabajo;
 * `pausaMs` solo da tiempo a ver el avance en una demostración.
 */
export function crearProveedorDemostracion(opciones: { esperar?: Esperar; pausaMs?: number } = {}): ProveedorAnalisis {
  const esperar = opciones.esperar ?? esperarReal;
  const pausa = opciones.pausaMs ?? 450;
  return {
    nombre: 'demostracion',
    simulado: true,
    async analizar(archivo, alEvento) {
      const problema = validarArchivo(archivo);
      if (problema) throw new Error(problema);
      alEvento('recibido');
      await esperar(pausa);
      alEvento('enviado');
      await esperar(pausa);
      alEvento('leyendo');
      await esperar(pausa * 2);
      const resultado = structuredClone(MUESTRA);
      alEvento('listo');
      return resultado;
    },
  };
}

export const proveedorActivo: ProveedorAnalisis = crearProveedorDemostracion();

/** Texto de cada hito. Cuando el proveedor es una demostración, no se afirma que se envió nada. */
export function textoHito(evento: EventoAnalisis, datos: { kb: string; totalBrechas: number | null; simulado: boolean }): string {
  switch (evento) {
    case 'recibido':
      return `PDF recibido (${datos.kb})`;
    case 'enviado':
      return datos.simulado ? 'Preparado · nada sale de tu equipo' : 'Enviado al análisis';
    case 'leyendo':
      return datos.simulado
        ? 'Armando el análisis de muestra'
        : 'Leyendo el documento, armando tu perfil de referencia y comparando';
    case 'listo':
      return `${datos.totalBrechas ?? '…'} brechas registradas en tu mapa`;
  }
}
