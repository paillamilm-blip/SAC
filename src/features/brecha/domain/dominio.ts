// Qué significa «dominada». Una sola definición para que ninguna pantalla afirme más de lo que hay.
import type { Brecha } from './types';

type ConDominio = Pick<Brecha, 'dominadaEn' | 'prueba'>;

/** Dominada de verdad: aprobó el examen (calificado por el servidor). */
export function estaDominada(b: ConDominio): boolean {
  return Boolean(b.dominadaEn && b.prueba);
}

/** Marcada como dominada cuando se podía autodeclarar: se conserva, pero no cuenta como dominada. */
export function esDeclaradaSinPrueba(b: ConDominio): boolean {
  return Boolean(b.dominadaEn && !b.prueba);
}
