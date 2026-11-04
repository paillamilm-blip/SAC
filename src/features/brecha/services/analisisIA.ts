// Proveedor de análisis REAL. Reutiliza lo que Ómicrom ya tenía para analizar CVs:
//   · cvExtract: lee el PDF EN EL NAVEGADOR. El archivo no sale del equipo; solo viaja su texto.
//   · callAI → Edge Function proxy-ai (ya desplegada): rate limit, créditos y claves en el servidor.
// El resultado se valida contra el texto del CV (domain/validar.ts) antes de mostrarse.
//
// Si algo falla se informa el error y la persona reintenta. NUNCA se cae a la muestra fija:
// un análisis inventado destruye lo único que vende el producto (PRODUCT.md).

import { extractCVText } from '@/features/gemelo/services/cvExtract';
import { callAI, type AIMessage, type AIOptions } from '@/infrastructure/ai/client';
import { AnalisisInvalido, validarResultado } from '../domain/validar';
import type { ResultadoAnalisis } from '../domain/types';
import { INSTRUCCIONES } from './promptAnalisis';
import { validarArchivo, type EventoAnalisis, type ProveedorAnalisis } from './analizar';

/** Texto mínimo para que un análisis tenga sentido. Un PDF escaneado (imagen) no llega. */
export const MIN_CARACTERES_CV = 200;
const MAX_CARACTERES_CV = 15_000;

// Se reexporta para no cambiar a quien ya lo importa desde aquí.
export { INSTRUCCIONES };

export function mensajesParaCv(textoCv: string): AIMessage[] {
  return [
    { role: 'system', content: INSTRUCCIONES },
    { role: 'user', content: `TEXTO DEL CV:\n\n${textoCv}` },
  ];
}

/** Saca el objeto JSON de la respuesta aunque el modelo añada texto alrededor. */
export function extraerJson(respuesta: string): unknown {
  const m = respuesta.match(/\{[\s\S]*\}/);
  if (!m) throw new AnalisisInvalido('La IA respondió, pero no pude interpretar el resultado.');
  try {
    return JSON.parse(m[0]);
  } catch {
    throw new AnalisisInvalido('La IA respondió, pero no pude interpretar el resultado.');
  }
}

export interface DependenciasIA {
  extraer: (archivo: File) => Promise<string>;
  llamar: (mensajes: AIMessage[], opciones: AIOptions) => Promise<string | null>;
}

const OPCIONES_IA: AIOptions = { maxTokens: 3000, temperature: 0.3, jsonMode: true, timeout: 75_000 };

// El proxy corre una carrera de modelos gratis: a veces gana uno débil cuya
// evidencia no supera la validación (medido 2026-11-03). Reintentar una vez
// dispara una carrera nueva; el costo real es bajo porque los resultados
// inválidos llegan de modelos rápidos (~20 s), no de timeouts.
const INTENTOS_ANALISIS = 2;

export function crearProveedorIA(deps: Partial<DependenciasIA> = {}): ProveedorAnalisis {
  const extraer = deps.extraer ?? extractCVText;
  const llamar = deps.llamar ?? callAI;

  return {
    nombre: 'ia',
    simulado: false,
    async analizar(archivo: File, alEvento: (e: EventoAnalisis) => void): Promise<ResultadoAnalisis> {
      const problema = validarArchivo(archivo);
      if (problema) throw new Error(problema);
      alEvento('recibido');

      const textoCv = (await extraer(archivo)).slice(0, MAX_CARACTERES_CV).trim();
      if (textoCv.length < MIN_CARACTERES_CV) {
        throw new Error(
          'No pude leer texto en ese PDF. Si es un escaneo o una foto, expórtalo desde Word o Google Docs como PDF con texto seleccionable.',
        );
      }

      alEvento('enviado');
      let ultimoError: unknown = null;
      for (let intento = 1; intento <= INTENTOS_ANALISIS; intento++) {
        let respuesta: string | null;
        try {
          respuesta = await llamar(mensajesParaCv(textoCv), OPCIONES_IA);
        } catch (e) {
          // AIError ya trae un mensaje pensado para la persona (créditos, tiempo, conexión).
          throw new Error(e instanceof Error && e.message ? e.message : 'No se pudo conectar con la IA. Inténtalo de nuevo.');
        }
        if (!respuesta) throw new Error('La IA no respondió. Inténtalo de nuevo en unos minutos.');

        alEvento('leyendo');
        try {
          const resultado = validarResultado(extraerJson(respuesta), textoCv);
          alEvento('listo');
          return resultado.calidad ? { ...resultado, calidad: { ...resultado.calidad, intentos: intento } } : resultado;
        } catch (e) {
          ultimoError = e;
          // Solo el resultado inválido se reintenta: es lotería del modelo, no
          // un problema de la persona. Cualquier otro error se informa de una.
          if (!(e instanceof AnalisisInvalido) || intento === INTENTOS_ANALISIS) throw e;
          alEvento('enviado');
        }
      }
      throw ultimoError instanceof Error ? ultimoError : new Error('El análisis falló. Inténtalo de nuevo.');
    },
  };
}
