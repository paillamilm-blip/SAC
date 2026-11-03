// Pruebas del proveedor REAL de análisis: el reintento cuando el modelo
// devuelve un resultado que no supera la validación (evidencia no respaldada
// por el CV). La carrera de modelos gratis del proxy es lotería: a veces gana
// uno débil. Un resultado inválido NO debe llegarle a la persona si la segunda
// carrera produce uno bueno; un error de conexión/con créditos SÍ (no es
// lotería del modelo y reintentarlo solo duplica la espera).

import { describe, it, expect, vi } from 'vitest';
import { crearProveedorIA, mensajesParaCv } from './analisisIA';
import type { AIMessage, AIOptions } from '@/infrastructure/ai/client';
import type { EventoAnalisis } from './analizar';

const TEXTO_CV =
  'Juan Perez — Tecnico en Mantencion Industrial. ' +
  'Experiencia: mantencion preventiva y correctiva de maquinaria industrial, Empresa ABC (2020-2024). ' +
  'Educacion: Tecnico de Nivel Superior, Inacap (2018). Habilidades: soldadura al arco, interpretacion de planos. ' +
  'Relleno para superar el minimo de caracteres que exige el proveedor antes de llamar a la IA.';

function brechaValida(titulo: string) {
  return {
    categoria: 'credencial',
    titulo,
    evidencia: 'Ausente en el CV: certificaciones vigentes de seguridad',
    porQueImporta: 'Sin certificaciones no pasa los filtros de las mineras.',
    severidad: 'alta',
    aprender: { que: 'Curso de seguridad minera', como: 'Curso gratuito en línea', comoLoDemuestro: 'Certificado descargable' },
  };
}

const RESPUESTA_VALIDA = JSON.stringify({
  ocupacion: 'Tecnico en Mantencion Industrial',
  nivel: 'Semi-senior · 5 a 8 años',
  resumen: 'Perfil operativo sólido, le faltan certificaciones.',
  fortalezas: [],
  brechas: [brechaValida('Sin certificaciones'), brechaValida('Sin automatización'), brechaValida('Sin métricas')],
});

// Una sola brecha: menos del mínimo (3) → AnalisisInvalido.
const RESPUESTA_INVALIDA = JSON.stringify({
  ocupacion: 'Tecnico',
  nivel: 'No determinable',
  resumen: 'Resumen.',
  fortalezas: [],
  brechas: [brechaValida('Única')],
});

const archivoFake = { name: 'cv.pdf', type: 'application/pdf', size: 2048 } as File;

function crearDeps(respuestas: Array<string | Error>) {
  let i = 0;
  const llamar = vi.fn(async (_mensajes: AIMessage[], _opciones: AIOptions): Promise<string | null> => {
    const r = respuestas[Math.min(i, respuestas.length - 1)];
    i++;
    if (r instanceof Error) throw r;
    return r;
  });
  const extraer = vi.fn(async (_archivo: File) => TEXTO_CV);
  return { deps: { llamar, extraer }, llamar, extraer };
}

describe('crearProveedorIA — reintento ante resultado inválido', () => {
  it('primera respuesta válida → una sola llamada', async () => {
    const { deps, llamar } = crearDeps([RESPUESTA_VALIDA]);
    const eventos: EventoAnalisis[] = [];
    const r = await crearProveedorIA(deps).analizar(archivoFake, (e) => eventos.push(e));
    expect(llamar).toHaveBeenCalledTimes(1);
    expect(r.brechas).toHaveLength(3);
    expect(eventos).toEqual(['recibido', 'enviado', 'leyendo', 'listo']);
  });

  it('inválida y luego válida → reintenta y devuelve el segundo resultado', async () => {
    const { deps, llamar } = crearDeps([RESPUESTA_INVALIDA, RESPUESTA_VALIDA]);
    const eventos: EventoAnalisis[] = [];
    const r = await crearProveedorIA(deps).analizar(archivoFake, (e) => eventos.push(e));
    expect(llamar).toHaveBeenCalledTimes(2);
    expect(r.brechas).toHaveLength(3);
    // El segundo intento vuelve a marcar 'enviado' para que la interfaz
    // refleje el trabajo real, no un estado inventado.
    expect(eventos).toEqual(['recibido', 'enviado', 'leyendo', 'enviado', 'leyendo', 'listo']);
  });

  it('dos inválidas → informa el error de validación tras exactamente 2 intentos', async () => {
    const { deps, llamar } = crearDeps([RESPUESTA_INVALIDA, RESPUESTA_INVALIDA]);
    await expect(crearProveedorIA(deps).analizar(archivoFake, () => {})).rejects.toThrow(
      /respaldar el análisis/i,
    );
    expect(llamar).toHaveBeenCalledTimes(2);
  });

  it('error de conexión → NO reintenta (no es lotería del modelo)', async () => {
    const { deps, llamar } = crearDeps([new Error('La IA tardó demasiado en responder.')]);
    await expect(crearProveedorIA(deps).analizar(archivoFake, () => {})).rejects.toThrow(/tardó demasiado/i);
    expect(llamar).toHaveBeenCalledTimes(1);
  });

  it('respuesta sin JSON → es salida del modelo, reintenta', async () => {
    // extraerJson lanza AnalisisInvalido cuando no hay JSON: es salida del
    // modelo, misma lotería → corresponde reintento.
    const { deps, llamar } = crearDeps(['no hay json aquí', RESPUESTA_VALIDA]);
    const r = await crearProveedorIA(deps).analizar(archivoFake, () => {});
    expect(llamar).toHaveBeenCalledTimes(2);
    expect(r.brechas).toHaveLength(3);
  });

  it('los mensajes del segundo intento son los mismos del primero', async () => {
    const { deps, llamar } = crearDeps([RESPUESTA_INVALIDA, RESPUESTA_VALIDA]);
    await crearProveedorIA(deps).analizar(archivoFake, () => {});
    const [primera, segunda] = llamar.mock.calls;
    expect(primera[0]).toEqual(mensajesParaCv(TEXTO_CV));
    expect(segunda[0]).toEqual(primera[0]);
  });
});
