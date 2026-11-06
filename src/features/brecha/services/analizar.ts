// Contrato de los proveedores de análisis de CV y el proveedor de DEMOSTRACIÓN (muestra fija).
// El proveedor real (lee el PDF o Word en el navegador y usa la IA de Ómicrom) está en analisisIA.ts;
// proveedor.ts decide cuál se usa.
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
  /** true = el resultado es una muestra fija, no sale del archivo. */
  simulado: boolean;
  analizar(archivo: File, alEvento: (e: EventoAnalisis) => void): Promise<ResultadoAnalisis>;
}

export const TAMANIO_MAXIMO = 15 * 1024 * 1024;

export const TIPO_PDF = 'application/pdf';
export const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type FormatoCv = 'pdf' | 'docx';

/**
 * Qué formato de CV es el archivo, o null si no se puede leer. Se mira la extensión Y el tipo MIME: según el sistema y el
 * navegador, uno de los dos puede venir vacío (p. ej. un .docx sin tipo en Linux).
 */
export function formatoDeCv(archivo: { name: string; type: string }): FormatoCv | null {
  const nombre = archivo.name.toLowerCase();
  if (archivo.type === TIPO_PDF || nombre.endsWith('.pdf')) return 'pdf';
  if (archivo.type === TIPO_DOCX || nombre.endsWith('.docx')) return 'docx';
  return null;
}

/** Devuelve el motivo por el que no se puede analizar el archivo, o null si es válido. */
export function validarArchivo(archivo: { name: string; type: string; size: number }): string | null {
  if (archivo.size === 0) return `«${archivo.name}» está vacío.`;
  if (!formatoDeCv(archivo)) {
    // El Word anterior a 2007 (.doc) es un formato binario distinto: la librería que lee Word solo entiende .docx.
    if (archivo.name.toLowerCase().endsWith('.doc') || archivo.type === 'application/msword') {
      return `«${archivo.name}» es un Word antiguo (.doc) y no se puede leer. Ábrelo en Word, guárdalo como .docx (o expórtalo a PDF) y súbelo de nuevo.`;
    }
    return `«${archivo.name}» no es un PDF ni un Word (.docx). Sube tu CV en uno de esos dos formatos.`;
  }
  if (archivo.size > TAMANIO_MAXIMO) {
    return 'El archivo pesa más de 15 MB. Exporta una versión más liviana.';
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

/** Texto de cada hito. Cuando el proveedor es una demostración, no se afirma que se envió nada. */
export function textoHito(evento: EventoAnalisis, datos: { kb: string; totalBrechas: number | null; simulado: boolean }): string {
  switch (evento) {
    case 'recibido':
      return `Archivo recibido (${datos.kb})`;
    case 'enviado':
      return datos.simulado ? 'Preparado · nada sale de tu equipo' : 'Texto de tu CV enviado al análisis con IA';
    case 'leyendo':
      return datos.simulado
        ? 'Armando el análisis de muestra'
        : 'Comparando tu CV con lo que se espera de tu rol';
    case 'listo':
      return `${datos.totalBrechas ?? '…'} brechas registradas en tu mapa`;
  }
}
