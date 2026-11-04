import { describe, expect, it } from 'vitest';
import { leerCredencial } from './credencial';

const v2 = (extra: Record<string, unknown> = {}) => ({
  v: 2,
  u: 'ana',
  n: 'Ana Pérez',
  h: [{ h: 'Gestión de presupuestos', p: 82, f: '2026-11-03' }],
  iat: 1_000,
  exp: 2_000,
  ...extra,
});

const v1 = (extra: Record<string, unknown> = {}) => ({
  v: 1,
  u: 'ana',
  n: 'Ana Pérez',
  nt: 'Nodo Operativo',
  nl: 'N2',
  rep: 61,
  ej: [10, 20, 30, 40],
  cv: 3,
  pe: 120,
  iat: 1_000,
  ...extra,
});

describe('leerCredencial v2 (habilidades probadas)', () => {
  it('lee una credencial válida', () => {
    expect(leerCredencial(v2())).toEqual({
      version: 2,
      usuario: 'ana',
      nombre: 'Ana Pérez',
      habilidades: [{ habilidad: 'Gestión de presupuestos', puntaje: 82, fecha: '2026-11-03' }],
      emitidaEn: 1_000,
      venceEn: 2_000,
    });
  });

  it('un puntaje null significa «probada sin puntaje registrado» y no se inventa un número', () => {
    const c = leerCredencial(v2({ h: [{ h: 'Excel', p: null, f: '2026-11-03' }] }));
    expect(c?.version === 2 && c.habilidades[0].puntaje).toBeNull();
  });

  it('una fecha rara no rompe: queda vacía', () => {
    const c = leerCredencial(v2({ h: [{ h: 'Excel', p: 70, f: 'ayer' }] }));
    expect(c?.version === 2 && c.habilidades[0].fecha).toBe('');
  });

  it('sin habilidades no es una credencial (no hay nada que certificar)', () => {
    expect(leerCredencial(v2({ h: [] }))).toBeNull();
  });

  it('rechaza puntajes fuera de 0-100 o no numéricos', () => {
    for (const p of [101, -1, Number.NaN, '80', {}]) {
      expect(leerCredencial(v2({ h: [{ h: 'Excel', p, f: '2026-11-03' }] }))).toBeNull();
    }
  });

  it('rechaza habilidades sin nombre, o que no son objetos', () => {
    expect(leerCredencial(v2({ h: [{ h: '  ', p: 80, f: '' }] }))).toBeNull();
    expect(leerCredencial(v2({ h: [{ p: 80, f: '' }] }))).toBeNull();
    expect(leerCredencial(v2({ h: ['Excel'] }))).toBeNull();
  });

  it('exige quién, cuándo se emitió y cuándo vence', () => {
    expect(leerCredencial(v2({ u: undefined }))).toBeNull();
    expect(leerCredencial(v2({ n: '   ' }))).toBeNull();
    expect(leerCredencial(v2({ iat: 'hoy' }))).toBeNull();
    expect(leerCredencial(v2({ exp: undefined }))).toBeNull();
  });

  it('acota textos y cantidad: una credencial enorme no desborda la pantalla', () => {
    const muchas = Array.from({ length: 80 }, (_, i) => ({ h: `Habilidad ${i} ${'x'.repeat(200)}`, p: 70, f: '2026-11-03' }));
    const c = leerCredencial(v2({ h: muchas, n: 'N'.repeat(500) }));
    expect(c?.version === 2 && c.habilidades).toHaveLength(50);
    expect(c?.version === 2 && c.habilidades[0].habilidad.length).toBeLessThanOrEqual(80);
    expect(c && c.nombre.length).toBeLessThanOrEqual(120);
  });
});

describe('leerCredencial v1 (anterior)', () => {
  it('sigue leyendo las credenciales ya emitidas', () => {
    expect(leerCredencial(v1())).toEqual({
      version: 1,
      usuario: 'ana',
      nombre: 'Ana Pérez',
      tipoNodo: 'Nodo Operativo',
      nivel: 'N2',
      reputacion: 61,
      ejes: [10, 20, 30, 40],
      competencias: 3,
      pe: 120,
      emitidaEn: 1_000,
    });
  });

  it('rechaza ejes incompletos o campos que faltan', () => {
    expect(leerCredencial(v1({ ej: [1, 2] }))).toBeNull();
    expect(leerCredencial(v1({ rep: undefined }))).toBeNull();
    expect(leerCredencial(v1({ nt: undefined }))).toBeNull();
  });
});

describe('leerCredencial: entradas inválidas', () => {
  it('versiones desconocidas, nulos y tipos que no son objeto', () => {
    expect(leerCredencial(v2({ v: 3 }))).toBeNull();
    expect(leerCredencial(null)).toBeNull();
    expect(leerCredencial(undefined)).toBeNull();
    expect(leerCredencial('credencial')).toBeNull();
    expect(leerCredencial(42)).toBeNull();
  });
});
