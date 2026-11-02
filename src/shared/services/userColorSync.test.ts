// src/shared/services/userColorSync.test.ts
// Pruebas del helper puro de validación de color (resolveColorId).
// Ejercitan la lógica real: fallarían si el mapeo id/hex fuera revertido.

import { describe, it, expect } from 'vitest';
// Se importa desde el módulo PURO (./userColor) para que la prueba no arrastre
// el cliente de Supabase (que lee variables de entorno al inicializarse).
import { resolveColorId } from './userColor';

describe('resolveColorId (validación de color)', () => {
  it('mapea un id conocido a su id canónico', () => {
    expect(resolveColorId('ambar')).toBe('ambar');
    expect(resolveColorId('azul')).toBe('azul');
  });

  it('mapea un hex conocido al id canónico', () => {
    expect(resolveColorId('#f2b134')).toBe('ambar');
    expect(resolveColorId('#6aa9ff')).toBe('azul');
  });

  it('retira un color que ya no está en la paleta', () => {
    // El celeste del selector anterior: si sigue guardado en el dispositivo,
    // getUserColor cae al ámbar de la marca en vez de pintar la app de azul.
    expect(resolveColorId('#7dd3fc')).toBeNull();
  });

  it('devuelve null para una entrada desconocida', () => {
    expect(resolveColorId('morado')).toBeNull();
    expect(resolveColorId('#000000')).toBeNull();
    expect(resolveColorId('')).toBeNull();
  });

  it('devuelve null para null o undefined', () => {
    expect(resolveColorId(null)).toBeNull();
    expect(resolveColorId(undefined)).toBeNull();
  });
});
