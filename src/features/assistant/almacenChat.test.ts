import { describe, expect, it } from 'vitest';
import {
  AJUSTES_POR_DEFECTO,
  borrarHistorial,
  cargarAjustes,
  cargarHistorial,
  guardarAjustes,
  guardarHistorial,
  limpiarTextoIA,
  MAX_MENSAJES,
  type Mensaje,
} from './almacenChat';

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const msg = (n: number): Mensaje => ({ id: `m${n}`, rol: 'yo', texto: `hola ${n}` });

describe('ajustes del chat', () => {
  it('por defecto no habla ni guarda historial', () => {
    expect(cargarAjustes(memoria())).toEqual(AJUSTES_POR_DEFECTO);
    expect(AJUSTES_POR_DEFECTO).toEqual({ hablar: false, guardarHistorial: false });
  });

  it('guarda y recupera', () => {
    const a = memoria();
    guardarAjustes(a, { hablar: true, guardarHistorial: true });
    expect(cargarAjustes(a)).toEqual({ hablar: true, guardarHistorial: true });
  });

  it('un valor corrupto vuelve a los valores por defecto', () => {
    const a = memoria();
    a.setItem('omicron:asistente:ajustes:v1', '{no es json');
    expect(cargarAjustes(a)).toEqual(AJUSTES_POR_DEFECTO);
  });
});

describe('historial del chat', () => {
  it('es independiente por persona', () => {
    const a = memoria();
    guardarHistorial(a, 'ana', [msg(1)]);
    expect(cargarHistorial(a, 'ana')).toHaveLength(1);
    expect(cargarHistorial(a, 'beto')).toHaveLength(0);
    expect(cargarHistorial(a, null)).toHaveLength(0);
  });

  it('conserva solo los últimos mensajes', () => {
    const a = memoria();
    guardarHistorial(a, null, Array.from({ length: MAX_MENSAJES + 10 }, (_, i) => msg(i)));
    const h = cargarHistorial(a, null);
    expect(h).toHaveLength(MAX_MENSAJES);
    expect(h[h.length - 1].id).toBe(`m${MAX_MENSAJES + 9}`);
  });

  it('descarta entradas con forma inválida', () => {
    const a = memoria();
    a.setItem('omicron:asistente:historial:v1:invitado', JSON.stringify([msg(1), { x: 1 }, 'texto']));
    expect(cargarHistorial(a, null)).toEqual([msg(1)]);
  });

  it('borrar elimina la conversación', () => {
    const a = memoria();
    guardarHistorial(a, 'ana', [msg(1)]);
    borrarHistorial(a, 'ana');
    expect(cargarHistorial(a, 'ana')).toEqual([]);
  });
});

describe('limpiarTextoIA', () => {
  it('quita marcas de herramientas', () => {
    expect(limpiarTextoIA('Te conviene practicar. [EXAMEN] Luego repasa. [CV: ver]')).toBe(
      'Te conviene practicar. Luego repasa.',
    );
  });
});
