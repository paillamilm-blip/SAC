// Motor de recomendaciones del asistente. PURO y determinista: dado el estado de la
// persona decide cuál es el siguiente mejor paso y por qué. No usa IA: por eso
// siempre responde, aunque no haya red o se agote la cuota.
//
// Regla de producto (PRODUCT.md, principio 4): la interfaz no afirma más que el dato.
// Cada recomendación declara su ORIGEN:
//   · 'analisis'   → sale de datos del análisis de la persona (se muestra la frase)
//   · 'muestra'    → es una muestra fija (no sale del PDF, TAREA-01)
//   · 'probado'    → lo respalda un examen aprobado, calificado por el servidor (brecha.prueba)
//   · 'estimacion' → consejo del asistente sin respaldo en un dato propio
//   · 'sistema'    → aviso del propio asistente (límite, micrófono); no afirma nada sobre la persona

import type { Analisis, Brecha } from '../brecha/domain/types';
import { estaDominada } from '../brecha/domain/dominio';
import type { Db } from '../brecha/services/repositorio';
import { listarAnalisis, metricas } from '../brecha/services/repositorio';

export type Origen = 'analisis' | 'muestra' | 'probado' | 'estimacion' | 'sistema';

export type Accion =
  | { tipo: 'escanear' }
  | { tipo: 'abrir_reporte'; analisisId: string; pestana: 'mapa' | 'brechas' | 'diagnostico'; brechaId?: string };

export interface Recomendacion {
  id: string;
  titulo: string;
  porQue: string;
  origen: Origen;
  /** Acción propuesta. NUNCA se ejecuta sin que la persona la confirme. */
  accion: Accion;
  /** Texto del botón que ejecuta la acción. */
  etiquetaAccion: string;
}

export interface Estado {
  db: Db;
  /** Momento actual (ISO). Se inyecta para que la función siga siendo pura. */
  ahora: string;
}

const PESO: Record<Brecha['severidad'], number> = { alta: 0, media: 1, baja: 2 };
export const DIAS_PARA_REESCANEAR = 30;

function porImpacto(a: Brecha, b: Brecha): number {
  return PESO[a.severidad] - PESO[b.severidad];
}

function diasEntre(desdeIso: string, hastaIso: string): number {
  return Math.floor((Date.parse(hastaIso) - Date.parse(desdeIso)) / 86_400_000);
}

/** Estado del ciclo (los 5 pasos del producto) para mostrarlo en el inicio. */
export type EstadoPaso = 'hecho' | 'parcial' | 'ahora' | 'pendiente';

export interface PasoCiclo {
  id: 'escanear' | 'mapa' | 'revisar' | 'demostrar' | 'compartir';
  nombre: string;
  detalle: string;
  estado: EstadoPaso;
  /** Para pasos parciales: "3 de 8". */
  progreso?: string;
}

export function pasosDelCiclo(estado: Estado): PasoCiclo[] {
  const ultimo = listarAnalisis(estado.db)[0];
  if (!ultimo) {
    return [
      { id: 'escanear', nombre: 'Escanear tu CV', detalle: 'Sube un PDF', estado: 'ahora' },
      { id: 'mapa', nombre: 'Ver tu mapa', detalle: 'Aparece al escanear', estado: 'pendiente' },
      { id: 'revisar', nombre: 'Revisar tus brechas', detalle: 'Dices cuáles son reales', estado: 'pendiente' },
      { id: 'demostrar', nombre: 'Aprender y demostrar', detalle: 'Cierras una brecha', estado: 'pendiente' },
      { id: 'compartir', nombre: 'Compartir tu pasaporte', detalle: 'Muestras lo que lograste', estado: 'pendiente' },
    ];
  }

  const total = ultimo.brechas.length;
  const revisadas = ultimo.brechas.filter((b) => b.veredicto !== null).length;
  const reales = ultimo.brechas.filter((b) => b.veredicto === 'confirmada');
  const dominadas = reales.filter(estaDominada).length;
  const sinRevisar = total - revisadas;

  const revisarEstado: EstadoPaso = sinRevisar === 0 ? 'hecho' : revisadas > 0 ? 'parcial' : 'ahora';
  const demostrarEstado: EstadoPaso =
    reales.length > 0 && dominadas === reales.length
      ? 'hecho'
      : dominadas > 0
        ? 'parcial'
        : sinRevisar === 0 || reales.length > 0
          ? 'ahora'
          : 'pendiente';

  return [
    {
      id: 'escanear',
      nombre: 'Escanear tu CV',
      detalle: ultimo.nombreArchivo ?? 'Análisis hecho',
      estado: 'hecho',
    },
    { id: 'mapa', nombre: 'Ver tu mapa', detalle: `${total} brechas ubicadas`, estado: 'hecho' },
    {
      id: 'revisar',
      nombre: 'Revisar tus brechas',
      detalle: sinRevisar === 0 ? `${total}/${total} revisadas` : `${revisadas}/${total} revisadas · quedan ${sinRevisar}`,
      estado: revisarEstado,
      progreso: revisarEstado === 'parcial' ? `${revisadas} de ${total}` : undefined,
    },
    {
      id: 'demostrar',
      nombre: 'Aprender y demostrar',
      detalle: reales.length === 0 ? 'Cuando reconozcas una brecha' : `${dominadas}/${reales.length} con prueba`,
      estado: demostrarEstado,
      progreso: demostrarEstado === 'parcial' ? `${dominadas} de ${reales.length}` : undefined,
    },
    {
      id: 'compartir',
      nombre: 'Compartir tu pasaporte',
      detalle: 'Disponible cuando haya pruebas',
      estado: 'pendiente',
    },
  ];
}

/**
 * Devuelve las recomendaciones ordenadas por prioridad (la primera es "el siguiente paso").
 * Siempre devuelve al menos una.
 */
export function recomendar(estado: Estado): Recomendacion[] {
  const { db, ahora } = estado;
  const ultimo: Analisis | undefined = listarAnalisis(db)[0];

  // 1. Sin análisis: lo único útil es escanear.
  if (!ultimo) {
    return [
      {
        id: 'escanear',
        titulo: 'Escanea tu CV',
        porQue: 'Con tu CV puedo mostrarte qué te falta frente a un profesional fuerte de tu misma ocupación y nivel.',
        origen: 'estimacion',
        accion: { tipo: 'escanear' },
        etiquetaAccion: 'Escanear mi CV',
      },
    ];
  }

  const recs: Recomendacion[] = [];
  const sinRevisar = ultimo.brechas.filter((b) => b.veredicto === null).sort(porImpacto);
  const reales = ultimo.brechas.filter((b) => b.veredicto === 'confirmada');
  const realesPendientes = reales.filter((b) => !estaDominada(b)).sort(porImpacto);

  // 2. Hay brechas sin revisar: empezar por la de mayor impacto.
  if (sinRevisar.length > 0) {
    const b = sinRevisar[0];
    recs.push({
      id: `revisar:${b.id}`,
      titulo: `Revisa «${b.titulo}»`,
      porQue: `Es la brecha sin revisar de mayor impacto (${b.severidad}). Dime si es real o si no aplica a tu caso; así tu mapa deja de ser una suposición. ${b.evidencia}`,
      origen: ultimo.simulado ? 'muestra' : 'analisis',
      accion: { tipo: 'abrir_reporte', analisisId: ultimo.id, pestana: 'brechas', brechaId: b.id },
      etiquetaAccion: 'Revisar esta brecha',
    });
  }

  // 3. Hay brechas reales sin dominar: trabajar la de mayor impacto.
  if (realesPendientes.length > 0) {
    const b = realesPendientes[0];
    recs.push({
      id: `aprender:${b.id}`,
      titulo: `Trabaja «${b.titulo}»`,
      porQue: `La reconociste como real. Para cerrarla: ${b.aprender.como} Cuando lo tengas, ${b.aprender.comoLoDemuestro.charAt(0).toLowerCase()}${b.aprender.comoLoDemuestro.slice(1)}`,
      origen: ultimo.simulado ? 'muestra' : 'analisis',
      accion: { tipo: 'abrir_reporte', analisisId: ultimo.id, pestana: 'brechas', brechaId: b.id },
      etiquetaAccion: 'Ver el plan',
    });
  }

  // 4. Hay un análisis viejo: sugerir volver a escanear (sin presionar).
  const dias = diasEntre(ultimo.creadoEn, ahora);
  if (dias >= DIAS_PARA_REESCANEAR) {
    recs.push({
      id: 'reescanear',
      titulo: 'Vuelve a escanear tu CV',
      porQue: `Tu último análisis tiene ${dias} días. Si actualizaste tu CV, un nuevo escaneo muestra qué brechas cerraste.`,
      origen: 'estimacion',
      accion: { tipo: 'escanear' },
      etiquetaAccion: 'Escanear de nuevo',
    });
  }

  // 5. Todo revisado y todo lo real ya dominado: cerrar el ciclo con un nuevo escaneo.
  if (recs.length === 0) {
    recs.push({
      id: 'ciclo-completo',
      titulo: 'Escanea tu CV actualizado',
      porQue:
        reales.length > 0
          ? 'Revisaste todo y dominaste lo que reconociste. Sube tu CV actualizado para ver qué brechas se cerraron.'
          : 'Revisaste todo y ninguna brecha aplica a tu caso. Si cambias de rol o actualizas tu CV, vuelve a escanear.',
      origen: 'estimacion',
      accion: { tipo: 'escanear' },
      etiquetaAccion: 'Escanear de nuevo',
    });
  }

  // Siempre ofrecer ver el mapa (acción de lectura, no de cambio).
  recs.push({
    id: 'ver-mapa',
    titulo: 'Mira tu mapa',
    porQue: 'Ahí ves de un vistazo qué reconociste, qué dominaste y qué falta.',
    origen: ultimo.simulado ? 'muestra' : 'analisis',
    accion: { tipo: 'abrir_reporte', analisisId: ultimo.id, pestana: 'mapa' },
    etiquetaAccion: 'Abrir mi mapa',
  });

  return recs;
}

/** Resumen de una línea del progreso, con la escala de cada número. */
export function resumenProgreso(db: Db): string {
  const m = metricas(db);
  if (m.totalAnalisis === 0) return 'Aún no has escaneado tu CV.';
  if (m.revisadas === 0) return `${m.brechas} brechas por revisar.`;
  return `${m.confirmadas}/${m.brechas} reales · ${m.dominadas} dominadas con prueba · ${m.precision} % de precisión.`;
}