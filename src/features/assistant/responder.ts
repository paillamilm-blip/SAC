// Respuestas del asistente a lo que la persona escribe o dice. PURO y determinista:
// responde con datos de su propio estado, así siempre funciona (sin red, sin IA).
// Si no entiende, devuelve null y el chat decide si preguntar a la IA o admitirlo.
//
// Regla de producto: cada respuesta lleva su ORIGEN y NUNCA propone ejecutar algo por
// sí sola; las acciones salen como propuesta y la persona las confirma.

import type { Analisis, Brecha } from '../brecha/domain/types';
import { CATEGORIAS } from '../brecha/domain/types';
import { listarAnalisis, metricas } from '../brecha/services/repositorio';
import { recomendar, resumenProgreso, type Accion, type Estado, type Origen } from './recomendar';

export interface Fuente {
  /** Frase tomada tal cual del análisis. */
  cita: string;
  origen: Origen;
  etiqueta: string;
}

export interface Respuesta {
  texto: string;
  origen: Origen;
  fuentes?: Fuente[];
  accion?: { accion: Accion; etiqueta: string; porQue: string };
}

export const ETIQUETA_ORIGEN: Record<Origen, string> = {
  analisis: 'De tu análisis',
  probado: 'Probado',
  muestra: 'Muestra de ejemplo',
  estimacion: 'Estimación',
  sistema: 'Aviso del asistente',
};

export type Intencion =
  | 'saludo'
  | 'ayuda'
  | 'siguiente_paso'
  | 'que_me_falta'
  | 'progreso'
  | 'leer_primera'
  | 'escanear'
  | 'mapa'
  | 'dominar'
  | 'desconocida';

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const REGLAS: { intencion: Intencion; patron: RegExp }[] = [
  { intencion: 'dominar', patron: /\b(ya (lo )?(aprendi|domino|logre|termine)|marcala como dominada|la domine|ya la domine)\b/ },
  { intencion: 'escanear', patron: /\b(escane|escanear|subir (mi )?cv|analiza(r)? (mi )?cv|nuevo analisis|actualice (mi )?cv)\b/ },
  { intencion: 'leer_primera', patron: /\b(leeme|lee la primera|primera brecha|cual es la primera|la de mayor impacto)\b/ },
  { intencion: 'que_me_falta', patron: /\b(que me falta|que brechas|mis brechas|que debo mejorar|en que estoy flojo|debilidades)\b/ },
  { intencion: 'progreso', patron: /\b(como voy|mi progreso|avance|cuanto llevo|resumen|estado)\b/ },
  { intencion: 'mapa', patron: /\b(mapa|ver mi mapa|abre el mapa|abrir mapa)\b/ },
  { intencion: 'siguiente_paso', patron: /\b(siguiente paso|que sigue|que hago|por donde (empiezo|sigo)|recomienda|recomiendame|consejo|que hago ahora|ahora que)\b/ },
  { intencion: 'ayuda', patron: /\b(ayuda|que puedes hacer|para que sirves|como funciona)\b/ },
  { intencion: 'saludo', patron: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|wena|que tal)\b/ },
];

export function detectarIntencion(texto: string): Intencion {
  const t = normalizar(texto);
  if (!t) return 'desconocida';
  for (const r of REGLAS) if (r.patron.test(t)) return r.intencion;
  return 'desconocida';
}

const PESO: Record<Brecha['severidad'], number> = { alta: 0, media: 1, baja: 2 };

/** Origen de lo que se dice sobre un análisis: una muestra fija nunca se presenta como «tu análisis». */
function origenDelAnalisis(a: Analisis | undefined): Origen {
  if (!a) return 'estimacion';
  return a.simulado ? 'muestra' : 'analisis';
}

export function saludoInicial(estado: Estado, nombre: string | null): Respuesta {
  const hola = nombre ? `Hola, ${nombre}.` : 'Hola.';
  const [primera] = recomendar(estado);
  return {
    texto: `${hola} Soy tu asistente. Te acompaño a avanzar paso a paso. ${resumenProgreso(estado.db)}`,
    origen: 'estimacion',
    accion: { accion: primera.accion, etiqueta: primera.etiquetaAccion, porQue: primera.titulo },
  };
}

export function responder(texto: string, estado: Estado): Respuesta | null {
  const intencion = detectarIntencion(texto);
  const ultimo = listarAnalisis(estado.db)[0];
  const [primera] = recomendar(estado);

  switch (intencion) {
    case 'saludo':
      return saludoInicial(estado, null);

    case 'ayuda':
      return {
        texto:
          'Puedo decirte cuál es tu siguiente paso, qué brechas tienes, cómo vas y abrirte tu mapa o el escáner del CV. Nunca hago nada sin que tú lo confirmes. Prueba: «¿qué me falta?» o «¿qué hago ahora?».',
        origen: 'estimacion',
      };

    case 'siguiente_paso':
      return {
        texto: `${primera.titulo}. ${primera.porQue}`,
        origen: primera.origen,
        accion: { accion: primera.accion, etiqueta: primera.etiquetaAccion, porQue: primera.titulo },
      };

    case 'progreso':
      return { texto: resumenProgreso(estado.db), origen: origenDelAnalisis(ultimo) };

    case 'escanear':
      return {
        texto: 'Claro. Sube tu CV en PDF y lo comparo con un profesional fuerte de tu misma ocupación.',
        origen: 'estimacion',
        accion: { accion: { tipo: 'escanear' }, etiqueta: 'Escanear mi CV', porQue: 'Escanear tu CV' },
      };

    case 'mapa':
      if (!ultimo) {
        return { texto: 'Todavía no tienes mapa: aparece cuando escaneas tu CV.', origen: 'estimacion', accion: { accion: { tipo: 'escanear' }, etiqueta: 'Escanear mi CV', porQue: 'Escanear tu CV' } };
      }
      return {
        texto: 'Aquí tienes tu mapa de capacidades.',
        origen: origenDelAnalisis(ultimo),
        accion: { accion: { tipo: 'abrir_reporte', analisisId: ultimo.id, pestana: 'mapa' }, etiqueta: 'Abrir mi mapa', porQue: 'Abrir tu mapa' },
      };

    case 'que_me_falta':
    case 'leer_primera': {
      if (!ultimo) {
        return {
          texto: 'Para decirte qué te falta necesito tu CV. Escanéalo y te muestro tus brechas.',
          origen: 'estimacion',
          accion: { accion: { tipo: 'escanear' }, etiqueta: 'Escanear mi CV', porQue: 'Escanear tu CV' },
        };
      }
      const orden = [...ultimo.brechas].sort((a, b) => PESO[a.severidad] - PESO[b.severidad]);
      const cuantas = intencion === 'leer_primera' ? 1 : Math.min(3, orden.length);
      const elegidas = orden.slice(0, cuantas);
      const lista = elegidas
        .map((b, i) => `${i + 1}. ${b.titulo} (${CATEGORIAS[b.categoria].toLowerCase()}, impacto ${b.severidad})`)
        .join('\n');
      const total = ultimo.brechas.length;
      const origen = origenDelAnalisis(ultimo);
      return {
        texto:
          intencion === 'leer_primera'
            ? `La brecha de mayor impacto es:\n${lista}`
            : `De tus ${total} brechas, las de mayor impacto son:\n${lista}`,
        origen,
        fuentes: elegidas.map((b) => ({ cita: b.evidencia, origen, etiqueta: ETIQUETA_ORIGEN[origen] })),
        accion: {
          accion: { tipo: 'abrir_reporte', analisisId: ultimo.id, pestana: 'brechas', brechaId: elegidas[0].id },
          etiqueta: 'Ver esta brecha',
          porQue: `Abrir «${elegidas[0].titulo}»`,
        },
      };
    }

    case 'dominar': {
      if (!ultimo) return { texto: 'Aún no tienes brechas. Escanea tu CV primero.', origen: 'estimacion' };
      const candidata = ultimo.brechas
        .filter((b) => b.veredicto === 'confirmada' && !b.dominadaEn)
        .sort((a, b) => PESO[a.severidad] - PESO[b.severidad])[0];
      if (!candidata) {
        return {
          texto: 'No tienes ninguna brecha reconocida como real que esté pendiente. Primero dime cuáles son reales en tu lista de brechas.',
          origen: origenDelAnalisis(ultimo),
          accion: { accion: { tipo: 'abrir_reporte', analisisId: ultimo.id, pestana: 'brechas' }, etiqueta: 'Ver mis brechas', porQue: 'Revisar tus brechas' },
        };
      }
      return {
        texto: `¿Quieres marcar «${candidata.titulo}» como dominada? Ojo: por ahora lo declaras tú, todavía no hay un examen que lo compruebe. Por eso no cuenta como «Probado».`,
        origen: 'estimacion',
        accion: {
          accion: { tipo: 'dominar', analisisId: ultimo.id, brechaId: candidata.id },
          etiqueta: 'Sí, ya la aprendí',
          porQue: `Marcar «${candidata.titulo}» como dominada`,
        },
      };
    }

    default:
      return null;
  }
}

export function respuestaNoEntendida(): Respuesta {
  return {
    texto: 'No estoy seguro de haber entendido. Puedes preguntarme «¿qué hago ahora?», «¿qué me falta?» o «¿cómo voy?».',
    origen: 'estimacion',
  };
}

/** Frases sugeridas según el estado (siempre cosas que el asistente sabe responder). */
export function sugerencias(estado: Estado): string[] {
  const m = metricas(estado.db);
  if (m.totalAnalisis === 0) return ['Escanear mi CV', '¿Qué puedes hacer?'];
  return ['¿Qué hago ahora?', '¿Qué me falta?', '¿Cómo voy?'];
}
