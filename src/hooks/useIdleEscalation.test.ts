// hooks/useIdleEscalation.test.ts
// La oferta de ayuda se dibujaba como una franja de 53 px sobre un hueco real de
// 36 px: a 485 px de ancho tapaba los dos chips de la segunda fila de la leyenda,
// o sea tapaba justo lo que la propia frase mandaba a tocar. Estos tests
// fijan las dos mitades del contrato: la escalada ocurre, y el texto cabe.
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AYUDA_MS, useIdleEscalation } from './useIdleEscalation';

// 60 caracteres es lo que entra en una línea de la franja (mono 11 px dentro de
// 396 px útiles). Medido, no supuesto: ver §3 del ledger 2026-11-02 (#55).
const TOPE_LINEA = 60;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const avanzar = (s: number) => act(() => { vi.advanceTimersByTime(s * 1000); });

describe('la escalada por inactividad', () => {
  it('a los 30 s ofrece ayuda, y antes no', () => {
    const { result } = renderHook(() => useIdleEscalation(true));
    avanzar(12);
    expect(result.current.stage).toBe('chips_bounce');
    expect(result.current.helpMessage).toBeNull();
    avanzar(10);
    expect(result.current.stage).toBe('highlight_node');
    expect(result.current.helpMessage).toBeNull();
    avanzar(10);
    expect(result.current.stage).toBe('help_offer');
    expect(result.current.helpMessage).toBe(AYUDA_MS);
  });

  it('cualquier gesto del usuario apaga la oferta', () => {
    const { result } = renderHook(() => useIdleEscalation(true));
    avanzar(32);
    expect(result.current.helpMessage).toBe(AYUDA_MS);
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    expect(result.current.stage).toBe('active');
    expect(result.current.helpMessage).toBeNull();
  });

  it('a los 60 s se calla y no vuelve', () => {
    const { result } = renderHook(() => useIdleEscalation(true));
    avanzar(62);
    expect(result.current.stage).toBe('quiet');
    expect(result.current.helpMessage).toBeNull();
    avanzar(60);
    expect(result.current.stage).toBe('quiet');
  });

  it('desactivado no escala nunca', () => {
    const { result } = renderHook(() => useIdleEscalation(false));
    avanzar(90);
    expect(result.current.stage).toBe('active');
    expect(result.current.helpMessage).toBeNull();
  });
});

describe('la frase cabe en su franja', () => {
  it('una sola línea a 485 px: entra en el hueco de 36 px', () => {
    // El número viejo medía 78 y se partía en dos renglones → 53 px de franja.
    expect(AYUDA_MS.length).toBeLessThanOrEqual(TOPE_LINEA);
    expect(AYUDA_MS).toMatch(/^¿Te ayudo\?/);
  });

  it('dice las dos salidas reales: el comando de voz y el chip', () => {
    // La ayuda que no nombra qué hacer es ruido: la frase tiene que traer el
    // comando que el oráculo entiende Y el gesto táctil equivalente.
    expect(AYUDA_MS).toMatch(/aprender una lección/);
    expect(AYUDA_MS).toMatch(/chip/);
  });

  it('habla en la misma voz que el resto de la app', () => {
    // El registro rector es el tú neutro del cromo de estados ("Sube tu CV",
    // "Prueba de nuevo"). La escalada voseaba ("Decí", "tocá") y por eso se fue.
    expect(AYUDA_MS).toMatch(/^¿Te ayudo\? Di /);
    expect(AYUDA_MS).toMatch(/toca un chip/);
  });
});
