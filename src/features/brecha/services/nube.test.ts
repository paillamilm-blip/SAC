import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const eq = vi.fn((_columna: string, _valor: string) => ({ maybeSingle }));
const select = vi.fn((_columnas: string) => ({ eq }));
const upsert = vi.fn();
const from = vi.fn((_tabla: string) => ({ select, upsert }));
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: { from: (tabla: string) => from(tabla) } }));

import { guardarNube, leerNube } from './nube';

const BASE = { version: 1, analisis: [], actualizadoEn: '2026-11-03T10:00:00.000Z' };

beforeEach(() => {
  maybeSingle.mockReset();
  upsert.mockReset();
  eq.mockClear();
  select.mockClear();
  from.mockClear();
});

describe('leerNube', () => {
  it('lee SOLO la fila de esa persona de la tabla brecha_db', async () => {
    maybeSingle.mockResolvedValue({ data: { data: BASE }, error: null });
    const r = await leerNube('u1');
    expect(from).toHaveBeenCalledWith('brecha_db');
    expect(select).toHaveBeenCalledWith('data');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(r).toEqual({ ok: true, datos: BASE });
  });

  it('sin fila todavía no es un error: la persona aún no tiene copia en la cuenta', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await leerNube('u1')).toEqual({ ok: true, datos: null });
  });

  it('una copia ilegible NO se toma por vacía (se pisaría): es un fallo', async () => {
    for (const data of [{ version: 9 }, 'x', { version: 1, analisis: 'no' }, {}]) {
      maybeSingle.mockResolvedValue({ data: { data }, error: null });
      expect(await leerNube('u1')).toEqual({ ok: false, estado: 'sin_conexion' });
    }
  });

  it.each([
    [{ code: 'PGRST205', message: 'x' }],
    [{ code: '42P01', message: 'relation "brecha_db" does not exist' }],
    [{ message: "Could not find the table 'public.brecha_db' in the schema cache" }],
    [{ code: 'PGRST204', message: 'x' }],
  ])('la tabla aún no existe → no_disponible (%o)', async (error) => {
    maybeSingle.mockResolvedValue({ data: null, error });
    expect(await leerNube('u1')).toEqual({ ok: false, estado: 'no_disponible' });
  });

  it.each([[{ code: '401', message: 'JWT expired' }], [{ code: 'PGRST301', message: 'x' }], [{ message: 'Failed to fetch' }]])(
    'cualquier otro error es sin_conexion (%o)',
    async (error) => {
      maybeSingle.mockResolvedValue({ data: null, error });
      expect(await leerNube('u1')).toEqual({ ok: false, estado: 'sin_conexion' });
    },
  );

  it('un fallo de red no lanza', async () => {
    maybeSingle.mockRejectedValue(new Error('network'));
    expect(await leerNube('u1')).toEqual({ ok: false, estado: 'sin_conexion' });
  });
});

describe('guardarNube', () => {
  it('reemplaza la fila de esa persona (upsert por user_id)', async () => {
    upsert.mockResolvedValue({ error: null });
    const r = await guardarNube('u1', BASE as never);
    expect(from).toHaveBeenCalledWith('brecha_db');
    expect(upsert).toHaveBeenCalledWith({ user_id: 'u1', data: BASE }, { onConflict: 'user_id' });
    expect(r).toEqual({ ok: true, datos: undefined });
  });

  it('clasifica los errores igual que la lectura', async () => {
    upsert.mockResolvedValue({ error: { code: 'PGRST205', message: 'x' } });
    expect(await guardarNube('u1', BASE as never)).toEqual({ ok: false, estado: 'no_disponible' });
    upsert.mockResolvedValue({ error: { code: '42501', message: 'new row violates row-level security policy' } });
    expect(await guardarNube('u1', BASE as never)).toEqual({ ok: false, estado: 'sin_conexion' });
  });

  it('un fallo de red no lanza', async () => {
    upsert.mockRejectedValue(new Error('network'));
    expect(await guardarNube('u1', BASE as never)).toEqual({ ok: false, estado: 'sin_conexion' });
  });
});
