import { describe, it, expect } from 'vitest';
import { transicionValida, TRANSICIONES_VALIDAS } from './brechas';

describe('máquina de estados de brechas (espejo del RPC marcar_brecha)', () => {
  it('detectada solo avanza a confirmada o rechazada', () => {
    expect(transicionValida('detectada', 'confirmada')).toBe(true);
    expect(transicionValida('detectada', 'rechazada')).toBe(true);
    expect(transicionValida('detectada', 'dominada')).toBe(false);
  });
  it('dominada es terminal', () => {
    expect(TRANSICIONES_VALIDAS.dominada).toEqual([]);
    expect(transicionValida('dominada', 'confirmada')).toBe(false);
  });
  it('rechazada puede reactivarse a confirmada, nunca directo a dominada', () => {
    expect(transicionValida('rechazada', 'confirmada')).toBe(true);
    expect(transicionValida('rechazada', 'dominada')).toBe(false);
  });
  it('confirmada domina o se rechaza', () => {
    expect(transicionValida('confirmada', 'dominada')).toBe(true);
    expect(transicionValida('confirmada', 'rechazada')).toBe(true);
  });
});
