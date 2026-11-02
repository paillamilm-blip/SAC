// features/aprendizaje/abrirBrechas.ts
// B4 · capa de datos PURO (cero React, cero DOM) del workspace de aprendizaje.
// Traduce las dos fuentes posibles (el puente del invitado y la muestra del
// donante) al mismo modelo de trabajo, y ese modelo al `BrechaDeMapa` que come
// MapaCapacidades. La máquina de estados NO vive acá: se importa de
// features/gemelo/services/brechas (la autoridad, espejo del RPC marcar_brecha).
//
// Por qué este módulo vive en features/aprendizaje y no en features/mapa: el
// mapa (features/mapa/**) no importa features/gemelo en el camino de render
// (brief §1). Acá sí se puede traer el puente y la máquina; el workspace arma los
// datos y le pasa props al mapa.
import type { BrechaDeMapa, CategoriaMapa, SeveridadMapa } from '@/features/mapa/mapaLayout';
import type { EstadoBrecha } from '@/features/gemelo/services/brechas';
import type { BrechaValidada } from '@/features/gemelo/services/brechasValidar';

// El modelo que la cola y el mapa comparten. Trae el detalle que la cola muestra
// (evidencia, por qué importa, qué/como/demuestro) y el estado de la máquina.
export interface BrechaDeTrabajo {
  id: string;
  categoria: CategoriaMapa;
  titulo: string;
  evidencia: string;
  porQueImporta: string;
  severidad: SeveridadMapa;
  aprender: { que: string; como: string; comoLoDemuestro: string };
  estado: EstadoBrecha;
  veredictoEn: string | null;
  dominadaEn: string | null;
}

// Brecha cruda tal como la congela el fixture del donante (analisis-donante.json):
// veredicto + fechas del donante, que acá se traducen a la máquina del huésped.
export interface BrechaMuestra {
  id: string;
  categoria: CategoriaMapa;
  titulo: string;
  evidencia: string;
  porQueImporta: string;
  severidad: SeveridadMapa;
  aprender: { que: string; como: string; comoLoDemuestro: string };
  veredicto?: 'confirmada' | 'rechazada' | null;
  veredictoEn?: string | null;
  dominadaEn?: string | null;
}

export interface MuestraAnalisis {
  ocupacion: string;
  brechas: BrechaMuestra[];
}

export interface FuenteBrechas {
  ocupacion: string;
  brechas: BrechaDeTrabajo[];
  // `simulado` SOLO es legítimo etiquetado (spec §8): la muestra se anuncia como
  // "Análisis de muestra · sin IA conectada" en toda la UI.
  simulado: boolean;
}

/**
 * La etiqueta que hace legítima a la muestra. Vive acá y no en la pestaña porque
 * LA PROMESA ES DE PANTALLA: el home pinta el mismo mapa, y un visitante al que
 * se le muestra el análisis de otra persona sin decírselo está siendo engañado
 * aunque la pestaña Aprendizaje sí lo diga.
 */
export const AVISO_MUESTRA = 'Análisis de muestra · sin IA conectada';

// BrechaDeTrabajo → BrechaDeMapa: el mapa no conoce la máquina del huésped, sólo
// lee veredicto/dominadaEn. 'dominada' implica haber confirmado (precedencia del
// donante: rechazada > dominada > confirmada > pendiente).
export function aBrechaDeMapa(b: BrechaDeTrabajo): BrechaDeMapa {
  const confirmada = b.estado === 'confirmada' || b.estado === 'dominada';
  return {
    id: b.id,
    categoria: b.categoria,
    titulo: b.titulo,
    severidad: b.severidad,
    veredicto: b.estado === 'rechazada' ? 'rechazada' : confirmada ? 'confirmada' : null,
    veredictoEn: confirmada ? b.veredictoEn : null,
    dominadaEn: b.estado === 'dominada' ? b.dominadaEn : null,
  };
}

function estadoDesdeMuestra(f: BrechaMuestra): EstadoBrecha {
  if (f.dominadaEn) return 'dominada';
  if (f.veredicto === 'confirmada') return 'confirmada';
  if (f.veredicto === 'rechazada') return 'rechazada';
  return 'detectada';
}

export function desdeMuestra(f: BrechaMuestra): BrechaDeTrabajo {
  return {
    id: f.id,
    categoria: f.categoria,
    titulo: f.titulo,
    evidencia: f.evidencia,
    porQueImporta: f.porQueImporta,
    severidad: f.severidad,
    aprender: f.aprender,
    estado: estadoDesdeMuestra(f),
    veredictoEn: f.veredictoEn ?? null,
    dominadaEn: f.dominadaEn ?? null,
  };
}

// El puente guarda BrechaValidada[], sin id ni estado: toda llegada es 'detectada'
// y el id se deriva del título normalizado (la misma clave de skill del validador
// y del RPC: lower(trim(collapse spaces))). Es un id local, no uuid: contra el RPC
// sin desplegar el guard no encuentra la fila y la UI revierte — comportamiento
// honesto, no un Análisis inventado.
const slug = (t: string): string => t.toLowerCase().replace(/\s+/g, ' ').trim();

export function desdePuente(b: BrechaValidada, i: number): BrechaDeTrabajo {
  return {
    id: `puente:${slug(b.titulo) || `fila-${i}`}`,
    categoria: b.categoria,
    titulo: b.titulo,
    evidencia: b.evidencia,
    porQueImporta: b.porQueImporta,
    severidad: b.severidad,
    aprender: b.aprender,
    estado: 'detectada',
    veredictoEn: null,
    dominadaEn: null,
  };
}

// Fuente 1 (puente con brechas) manda sobre Fuente 2 (la muestra). Con puente
// vacío se cae a la muestra etiquetada; nunca se pasa la muestra por análisis
// propio (spec §8).
export function resolverFuente(puente: BrechaValidada[], muestra: MuestraAnalisis): FuenteBrechas {  if (puente.length > 0) {
    // El puente no conserva la ocupación: el mapa necesita UNA raíz; se le da una
    // neutra y honesta (conectar el nombre real del perfil es refinamiento B5+).
    return { ocupacion: 'Tu perfil', brechas: puente.map(desdePuente), simulado: false };
  }
  return { ocupacion: muestra.ocupacion, brechas: muestra.brechas.map(desdeMuestra), simulado: true };
}

// Etiqueta legible de la máquina (cero "Verificada", cero "ADN", cero jerga de
// score). Son las mismas palabras de la leyenda del mapa: detectada/reconocida/
// dominada/descartada.
export const ETIQUETA_ESTADO: Record<EstadoBrecha, string> = {
  detectada: 'Pendiente',
  confirmada: 'Reconocida',
  dominada: 'Dominada',
  rechazada: 'Descartada',
};

// ══════════════════════════════════════════════════════════════════════
// La vista que pinta la pestaña, con las TRES fuentes ya ordenadas.
//   base (filas propias de `brechas_aprendizaje`) > puente > muestra.
// El orden no es cosmético: la muestra es el análisis de otra persona, y
// mostrarla a un usuario con sesión es mentirle sobre qué está viendo (spec §8).
// ══════════════════════════════════════════════════════════════════════

/** Lo que devolvió la lectura; `conSesion` null = todavía no se sabe. */
export interface LecturaBase {
  conSesion: boolean | null;
  cargando: boolean;
  error: string | null;
  brechas: BrechaDeTrabajo[];
  ocupacion: string | null;
}

/**
 * Los dos vacíos no se parecen: al que no ha subido nada se le pide el CV; al
 * que ya lo subió se le dice qué produjo ese CV. `cvLeido` llega desde el puente
 * (existe la clave = este navegador ya leyó un CV), no de un invento.
 */
export type MotivoVacio = 'sin_cv' | 'cv_sin_brechas';

/**
 * La voz del vacío, UNA sola vez en el repo. La portada y la pestaña Aprendizaje
 * leen de acá; dos redacciones de lo mismo fue lo que separó la app en dos.
 */
export const AVISO_VACIO: Record<MotivoVacio, { titulo: string; hint: string; cta: string }> = {
  sin_cv: {
    titulo: 'Todavía no hay brechas tuyas',
    hint: 'Sube tu CV y Ómicrom te dirá qué habilidades le faltan. Cuando las reconozca, aparecerán aquí una por una.',
    cta: 'Subir tu CV para empezar el mapa',
  },
  cv_sin_brechas: {
    titulo: 'Leí tu CV y no te marqué brechas',
    hint: 'Lo que cuenta ese CV no alcanza para comparar contra un perfil de referencia, o ya está por encima de él. Suma detalles —años, herramientas, logros con número— y lo vuelvo a leer.',
    cta: 'Subir un CV más detallado',
  },
};

export type VistaTrabajo =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'vacio'; motivo: MotivoVacio }
  | { tipo: 'mapa'; fuente: FuenteBrechas };

export function resolverVista(
  lectura: LecturaBase,
  puente: BrechaValidada[],
  muestra: MuestraAnalisis,
  cvLeido = false,
): VistaTrabajo {
  // El error va primero: si la lectura cayó, adelantar la muestra sería justo el
  // disfraz que el spec prohíbe.
  if (lectura.error) return { tipo: 'error', mensaje: lectura.error };
  if (lectura.conSesion === null || lectura.cargando) return { tipo: 'cargando' };

  if (lectura.brechas.length > 0) {
    return {
      tipo: 'mapa',
      fuente: { ocupacion: lectura.ocupacion ?? 'Tu perfil', brechas: lectura.brechas, simulado: false },
    };
  }

  // El puente es trabajo propio (lo generó este CV en este navegador), así que
  // sigue valiendo para un usuario logueado al que todavía no se le guardaron
  // filas: mostrarlo no miente, mostrar la muestra sí.
  if (puente.length > 0) return { tipo: 'mapa', fuente: resolverFuente(puente, muestra) };
  // Y acá se corta el disfraz: la muestra ES el análisis de otra persona. Vale
  // como demo del que todavía no ha subido nada; para quien ya subió su CV y no
  // produjo brechas, pintar al donante sería mentirle con el mapa de un tercero.
  if (lectura.conSesion === false && !cvLeido) return { tipo: 'mapa', fuente: resolverFuente([], muestra) };

  return { tipo: 'vacio', motivo: cvLeido ? 'cv_sin_brechas' : 'sin_cv' };
}
