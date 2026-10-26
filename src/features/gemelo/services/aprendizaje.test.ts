// features/gemelo/services/aprendizaje.test.ts
// Cubre los dos caminos del cliente del motor: invitado (puente localStorage)
// y autenticado (guardado server-side, sin escribir el puente).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSession = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getSession: () => getSession() } },
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'anon-test-key',
}));

import { analizarCvConIA, puenteBrechasInvitado } from './aprendizaje';
import type { BrechaValidada } from './brechasValidar';

const PUENTE_KEY = 'omicron.brechas.puente';

const BRECHA: BrechaValidada = {
  categoria: 'conocimiento', titulo: 'Excel avanzado',
  evidencia: 'no aparece en el CV', porQueImporta: 'lo pide el puesto',
  severidad: 'alta',
  aprender: { que: 'tablas dinámicas', como: 'curso 4h + práctica', comoLoDemuestro: 'archivo de ejemplo' },
};

const ANALYSIS = {
  name: 'Ana', seniorLabel: 'Mid', seniorLevel: 2, years: 4,
  skills: ['react'], labels: ['React'], skillsDetail: [], summary: 'resumen',
  creativity: 0.5, arch: 'mid', axes: { exec: 1, qual: 1, trans: 1, fund: 1 },
  brechas: [BRECHA],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockFetch(json: any, resOk = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: resOk, status, json: async () => json } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('analizarCvConIA', () => {
  beforeEach(() => {
    localStorage.clear();
    getSession.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('invitado (guardado null): escribe el puente localStorage y devuelve guardado null', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = mockFetch({ ok: true, analysis: ANALYSIS, guardado: null });

    const r = await analizarCvConIA('texto del cv', 'cv.pdf');

    expect(r.guardado).toBeNull();
    expect(r.analysis.brechas).toEqual([BRECHA]);
    expect(JSON.parse(localStorage.getItem(PUENTE_KEY) ?? '[]')).toEqual([BRECHA]);

    // headers: apikey publica siempre; sin sesion no va Authorization
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.apikey).toBe('anon-test-key');
    expect(headers.Authorization).toBeUndefined();
  });

  it('autenticado: devuelve guardado, reenvía el token y NO toca el puente', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
    const guardado = { analisis_id: 'an-1', brechas: ['uuid-brecha-1'] };
    const fetchMock = mockFetch({ ok: true, analysis: ANALYSIS, guardado });

    const r = await analizarCvConIA('texto del cv', 'cv.pdf');

    expect(r.guardado).toEqual(guardado);
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-123');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ text: 'texto del cv', nombre_archivo: 'cv.pdf' });
  });

  it('respuesta !ok: lanza con el error del servidor, sin tocar el puente', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    mockFetch({ ok: false, error: 'El modelo esta caido.' });

    await expect(analizarCvConIA('texto', 'cv.pdf')).rejects.toThrow('El modelo esta caido.');
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('guardado null SIN guardado_error (invitado real): SI escribe el puente', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: null });

    const r = await analizarCvConIA('texto', 'cv.pdf');

    expect(r.guardado).toBeNull();
    expect(JSON.parse(localStorage.getItem(PUENTE_KEY) ?? '[]')).toEqual([BRECHA]);
  });

  it('guardado null CON guardado_error (sesion y guardado fallo): NO escribe el puente', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-err' } } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: null, guardado_error: true });

    const r = await analizarCvConIA('texto', 'cv.pdf');

    // el analisis sigue llegando (la UI no se rompe) pero sus brechas no caen al puente
    expect(r.guardado).toBeNull();
    expect(r.analysis.brechas).toEqual([BRECHA]);
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('HTTP != ok con cuerpo de error: lanza legible, no parsea como analysis, sin puente', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-500' } } });
    mockFetch({ error: 'Boom interno del servidor.' }, false, 500);

    await expect(analizarCvConIA('texto', 'cv.pdf')).rejects.toThrow('Boom interno del servidor.');
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('HTTP != ok y cuerpo no JSON: usa el mensaje con el status', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 502,
      json: async () => { throw new Error('cuerpo no JSON'); },
    } as unknown as Response));

    await expect(analizarCvConIA('texto', 'cv.pdf')).rejects.toThrow('El analisis fallo (HTTP 502).');
  });
});

describe('puenteBrechasInvitado', () => {
  beforeEach(() => localStorage.clear());

  it('leer sin entrada o con JSON roto devuelve [] en vez de lanzar', () => {
    expect(puenteBrechasInvitado.leer()).toEqual([]);
    localStorage.setItem(PUENTE_KEY, '{no es json');
    expect(puenteBrechasInvitado.leer()).toEqual([]);
  });

  it('escribir/leer round-trip', () => {
    puenteBrechasInvitado.escribir([BRECHA]);
    expect(puenteBrechasInvitado.leer()).toEqual([BRECHA]);
  });
});
