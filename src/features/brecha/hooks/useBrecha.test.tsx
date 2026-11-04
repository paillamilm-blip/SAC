import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../services/repositorio';

vi.mock('@/infrastructure/supabase/client', () => ({ supabase: {} }));
vi.mock('../services/nube', () => ({ leerNube: vi.fn(), guardarNube: vi.fn() }));

import { MUESTRA } from '../services/muestra';
import { agregarAnalisis, claveDe, dbVacia, mismaBase } from '../services/repositorio';
import * as nube from '../services/nube';
import { ESPERA_ENVIO_MS, useBrecha } from './useBrecha';

const leer = vi.mocked(nube.leerNube);
const escribir = vi.mocked(nube.guardarNube);
const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'demostracion', simulado: true };

function unAnalisis(id: string, creado = '2026-11-03T08:00:00.000Z'): Db {
  let n = 0;
  const { db } = agregarAnalisis(dbVacia(), MUESTRA, META, creado, () => `${id}-${++n}`);
  return { ...db, analisis: db.analisis.map((a) => ({ ...a, id })), actualizadoEn: creado };
}

const sembrarLocal = (usuario: string, db: Db) => localStorage.setItem(claveDe(usuario), JSON.stringify(db));
const leerLocal = (usuario: string) => JSON.parse(localStorage.getItem(claveDe(usuario)) ?? 'null') as Db | null;

/** Deja correr las promesas pendientes (la lectura/escritura simulada) sin avanzar el reloj. */
const vaciar = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  leer.mockReset().mockResolvedValue({ ok: true, datos: null });
  escribir.mockReset().mockResolvedValue({ ok: true, datos: undefined });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useBrecha: invitado', () => {
  it('no toca la cuenta nunca y guarda solo en el navegador', async () => {
    const { result } = renderHook(() => useBrecha(null));
    await vaciar();
    expect(result.current.estadoNube).toBe('no_aplica');

    act(() => {
      result.current.agregar(
        { ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] },
        META,
      );
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENVIO_MS * 3); });
    expect(leer).not.toHaveBeenCalled();
    expect(escribir).not.toHaveBeenCalled();
    expect(leerLocal('invitado')?.analisis).toHaveLength(1);
  });
});

describe('useBrecha: con sesión', () => {
  it('cuenta vacía y nada local: lee, no escribe nada y queda «guardado»', async () => {
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(leer).toHaveBeenCalledWith('u1');
    expect(escribir).not.toHaveBeenCalled();
    expect(result.current.estadoNube).toBe('guardado');
  });

  it('hay análisis en este dispositivo y la cuenta está vacía: los sube (una vez)', async () => {
    sembrarLocal('u1', unAnalisis('a'));
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(escribir).toHaveBeenCalledTimes(1);
    expect(escribir.mock.calls[0][0]).toBe('u1');
    expect(escribir.mock.calls[0][1].analisis.map((a) => a.id)).toEqual(['a']);
    expect(result.current.estadoNube).toBe('guardado');
  });

  it('la cuenta ya tiene análisis hechos en otro dispositivo: se suman a lo local y se reescribe la unión', async () => {
    sembrarLocal('u1', unAnalisis('a', '2026-11-03T08:00:00.000Z'));
    leer.mockResolvedValue({ ok: true, datos: unAnalisis('b', '2026-11-03T09:00:00.000Z') });
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(result.current.db.analisis.map((a) => a.id).sort()).toEqual(['a', 'b']);
    expect(leerLocal('u1')?.analisis.map((a) => a.id).sort()).toEqual(['a', 'b']); // también quedó en el navegador
    expect(escribir).toHaveBeenCalledTimes(1);
    expect(escribir.mock.calls[0][1].analisis).toHaveLength(2);
  });

  it('si la cuenta ya tiene exactamente lo mismo (aunque Postgres reordene las claves), NO reescribe', async () => {
    const igual = unAnalisis('a');
    sembrarLocal('u1', igual);
    const reordenado = JSON.parse(JSON.stringify(igual), (_k, v) => v) as Db;
    const invertir = (x: unknown): unknown =>
      Array.isArray(x) ? x.map(invertir) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).reverse().map(([k, v]) => [k, invertir(v)])) : x;
    leer.mockResolvedValue({ ok: true, datos: invertir(reordenado) as Db });
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(escribir).not.toHaveBeenCalled();
    expect(result.current.estadoNube).toBe('guardado');
    expect(mismaBase(result.current.db, igual)).toBe(true);
  });

  it('un cambio se envía tras una pausa, y varios seguidos son UN solo envío', async () => {
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    escribir.mockClear();

    const resumen = { ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] };
    act(() => { result.current.agregar(resumen, META); });
    expect(result.current.estadoNube).toBe('sincronizando');
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENVIO_MS - 100); });
    act(() => { result.current.agregar(resumen, META); });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENVIO_MS - 100); });
    expect(escribir).not.toHaveBeenCalled(); // la pausa se reinició

    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(escribir).toHaveBeenCalledTimes(1);
    expect(escribir.mock.calls[0][1].analisis).toHaveLength(2);
    expect(result.current.estadoNube).toBe('guardado');
  });

  it('REGLA CLAVE: si no pudo leer la cuenta, NO escribe (pisaría lo hecho en otro dispositivo)', async () => {
    leer.mockResolvedValue({ ok: false, estado: 'sin_conexion' });
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(result.current.estadoNube).toBe('sin_conexion');

    act(() => {
      result.current.agregar({ ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] }, META);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENVIO_MS + 50); });
    expect(leer).toHaveBeenCalledTimes(2); // reintentó LEER primero
    expect(escribir).not.toHaveBeenCalled(); // y como siguió fallando, no escribió
    expect(leerLocal('u1')?.analisis).toHaveLength(1); // lo hecho sigue a salvo en el navegador
  });

  it('al recuperarse la conexión: lee, fusiona y recién entonces escribe', async () => {
    leer.mockResolvedValueOnce({ ok: false, estado: 'sin_conexion' });
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(result.current.estadoNube).toBe('sin_conexion');

    leer.mockResolvedValue({ ok: true, datos: unAnalisis('b') });
    act(() => {
      result.current.agregar({ ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] }, META);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENVIO_MS + 50); });
    expect(escribir).toHaveBeenCalledTimes(1);
    expect(escribir.mock.calls[0][1].analisis.length).toBe(2); // el de la cuenta (b) + el nuevo
    expect(result.current.estadoNube).toBe('guardado');
  });

  it('tabla inexistente → no_disponible; la app sigue guardando en el navegador', async () => {
    leer.mockResolvedValue({ ok: false, estado: 'no_disponible' });
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    expect(result.current.estadoNube).toBe('no_disponible');
    act(() => {
      result.current.agregar({ ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] }, META);
    });
    expect(leerLocal('u1')?.analisis).toHaveLength(1);
  });

  it('un fallo al escribir se informa y no pierde nada', async () => {
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    escribir.mockResolvedValue({ ok: false, estado: 'sin_conexion' });
    act(() => {
      result.current.agregar({ ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] }, META);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENVIO_MS + 50); });
    expect(result.current.estadoNube).toBe('sin_conexion');
    expect(result.current.db.analisis).toHaveLength(1);
  });

  it('sellan los cambios con actualizadoEn (es lo que decide la fusión entre dispositivos)', async () => {
    const { result } = renderHook(() => useBrecha('u1'));
    await vaciar();
    act(() => {
      result.current.agregar({ ocupacion: 'x', nivel: 'y', resumen: 'z', fortalezas: [], brechas: [] }, META);
    });
    expect(typeof result.current.db.actualizadoEn).toBe('string');
    expect(leerLocal('u1')?.actualizadoEn).toBe(result.current.db.actualizadoEn);
  });

  it('cambia de persona a mitad de una lectura: la respuesta tardía de la anterior se descarta', async () => {
    let soltarU1: (v: Awaited<ReturnType<typeof nube.leerNube>>) => void = () => {};
    leer.mockImplementation((uid: string) =>
      uid === 'u1' ? new Promise((res) => (soltarU1 = res)) : Promise.resolve({ ok: true, datos: unAnalisis('de-u2') }),
    );
    const { result, rerender } = renderHook(({ uid }) => useBrecha(uid), { initialProps: { uid: 'u1' as string | null } });
    await vaciar();

    rerender({ uid: 'u2' });
    await vaciar();
    expect(result.current.db.analisis.map((a) => a.id)).toEqual(['de-u2']);

    await act(async () => { soltarU1({ ok: true, datos: unAnalisis('de-u1') }); });
    await vaciar();
    expect(result.current.db.analisis.map((a) => a.id)).toEqual(['de-u2']); // lo de u1 NO se mezcló
    expect(escribir.mock.calls.every(([uid]) => uid !== 'u1')).toBe(true);
  });
});
