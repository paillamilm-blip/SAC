// features/aprendizaje/useBrechasReales.test.tsx
// El mapa neuronal deja de ser muestra: esta consulta es el camino de lectura
// de `brechas_aprendizaje`. Tres promesas, ninguna de diseño (el mapa es port
// 1:1 y se prueba en MapaCapacidades.test.tsx):
//   1. Con sesión, las filas de la base llegan convertidas al modelo de trabajo
//      del huésped (snake_case del SQL → camelCase de la UI, `state` → `estado`).
//   2. Sin sesión NO se golpea la tabla: el invitado sigue con su puente, y la
//      pestaña puede distinguirlo porque `conSesion` es explícito.
//   3. Una sesión con cero brechas es un vacío real, no la muestra del donante
//      (spec §8: la muestra solo se muestra cuando no hay análisis propio).
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted: la fábrica de vi.mock se ejecuta al importar el módulo, antes de
// los const del cuerpo. Sin esto, "Cannot access 'getSession' before initialization".
const { getSession, select, from } = vi.hoisted(() => ({
  getSession: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getSession }, from },
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'anon-test-key',
}));

import { useBrechasReales } from './useBrechasReales';

const FILA = {
  id: 'b1',
  categoria: 'dura',
  titulo: 'Python para datos',
  evidencia: 'no aparece en el CV',
  por_que_importa: 'lo piden 6 de cada 10 ofertas',
  severidad: 'alta',
  aprender_que: 'pandas',
  aprender_como: 'un curso corto',
  aprender_demuestro: 'un notebook publicado',
  state: 'confirmada',
  confirmed_at: '2026-10-30T12:00:00Z',
  mastered_at: null,
  created_at: '2026-10-29T09:00:00Z',
  analisis: { ocupacion: 'Analista de datos' },
};

const conCliente = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  getSession.mockReset();
  select.mockReset();
  from.mockReset();
  from.mockImplementation(() => ({ select }));
});

describe('la lectura del mapa propio', () => {
  it('con sesión, traduce la fila SQL al modelo del huésped', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    select.mockResolvedValue({ data: [FILA], error: null });

    const { result } = renderHook(() => useBrechasReales(), { wrapper: conCliente });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.conSesion).toBe(true);
    expect(result.current.brechas).toEqual([
      {
        id: 'b1',
        categoria: 'dura',
        titulo: 'Python para datos',
        evidencia: 'no aparece en el CV',
        porQueImporta: 'lo piden 6 de cada 10 ofertas',
        severidad: 'alta',
        aprender: { que: 'pandas', como: 'un curso corto', comoLoDemuestro: 'un notebook publicado' },
        estado: 'confirmada',
        veredictoEn: '2026-10-30T12:00:00Z',
        dominadaEn: null,
      },
    ]);
    // La ocupación viene del análisis padre, no de la muestra.
    expect(result.current.ocupacion).toBe('Analista de datos');
  });

  it('sin sesión no toca la tabla y lo dice explícitamente', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useBrechasReales(), { wrapper: conCliente });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.conSesion).toBe(false);
    expect(result.current.brechas).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('cero brechas es un vacío, no una lista con la muestra adentro', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    select.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBrechasReales(), { wrapper: conCliente });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.conSesion).toBe(true);
    expect(result.current.brechas).toEqual([]);
  });
});
