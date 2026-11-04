// A dónde lleva cada paso de «Tu ciclo». Puro: mismo análisis, mismo destino. Todo paso lleva a
// algún lado útil, incluso los que aún no se cumplieron (así la persona nunca se topa con un botón muerto).

import type { Accion } from '@/features/assistant/recomendar';
import type { PasoCiclo } from '@/features/assistant/recomendar';
import { estaDominada } from '../domain/dominio';
import type { Analisis, Brecha } from '../domain/types';

export type Destino =
  | { tipo: 'accion'; accion: Accion }
  /** Baja a la tarjeta de la credencial (solo existe con sesión y al menos una prueba). */
  | { tipo: 'credencial' }
  /** La credencial se crea en el servidor: un invitado necesita iniciar sesión primero. */
  | { tipo: 'pedir_sesion' };

export interface ContextoPaso {
  sesionIniciada: boolean;
  /** Brechas dominadas con prueba (todas las de la persona). */
  dominadas: number;
}

const PESO: Record<Brecha['severidad'], number> = { alta: 0, media: 1, baja: 2 };
const porImpacto = (a: Brecha, b: Brecha) => PESO[a.severidad] - PESO[b.severidad];

export function destinoPaso(paso: PasoCiclo['id'], analisis: Analisis, ctx: ContextoPaso = { sesionIniciada: true, dominadas: 0 }): Destino {
  const reporte = (pestana: 'mapa' | 'brechas', brechaId?: string): Destino => ({
    tipo: 'accion',
    accion: { tipo: 'abrir_reporte', analisisId: analisis.id, pestana, brechaId },
  });

  switch (paso) {
    case 'escanear':
      return { tipo: 'accion', accion: { tipo: 'escanear' } };
    case 'mapa':
      return reporte('mapa');
    case 'revisar':
      return reporte('brechas', analisis.brechas.filter((b) => !b.veredicto).sort(porImpacto)[0]?.id);
    case 'demostrar': {
      const porDemostrar = analisis.brechas.filter((b) => b.veredicto === 'confirmada' && !estaDominada(b)).sort(porImpacto)[0];
      if (porDemostrar) return reporte('brechas', porDemostrar.id);
      return reporte('brechas', analisis.brechas.filter((b) => !b.veredicto).sort(porImpacto)[0]?.id);
    }
    case 'compartir':
      // Sin pruebas no hay nada que compartir: lo útil es ir a conseguir una.
      if (ctx.dominadas < 1) return destinoPaso('demostrar', analisis, ctx);
      return ctx.sesionIniciada ? { tipo: 'credencial' } : { tipo: 'pedir_sesion' };
  }
}
