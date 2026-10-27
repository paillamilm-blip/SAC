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
export function resolverFuente(puente: BrechaValidada[], muestra: MuestraAnalisis): FuenteBrechas {
  if (puente.length > 0) {
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
