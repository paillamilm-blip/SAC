// features/gemelo/services/aprendizaje.test.ts
// Cubre los dos caminos del cliente del motor: invitado (puente localStorage)
// y autenticado (guardado server-side, sin escribir el puente), la huella que
// sube del servidor, y el orden motor -> fallback Gemini de analizarCvConFallback.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';

const getSession = vi.fn();

// El fallback declarado (ruling C1) entra por import dinámico; lo reemplazamos
// entero para poder afirmar CUANDO lo llama y con qué resultado.
const gemini = vi.hoisted(() => ({ analyzeCVWithGemini: vi.fn() }));

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getSession: () => getSession() } },
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'anon-test-key',
}));

vi.mock('@/infrastructure/ai/gemini', () => gemini);

import {
  analizarCvConFallback,
  analizarCvConIA,
  puenteBrechasInvitado,
} from './aprendizaje';
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

// Lo que devuelve el prompt viejo (gemini.ts): ejes SI, brechas NUNCA.
const ANALISIS_GEMINI = {
  name: 'Ana', seniorLabel: 'Mid', seniorLevel: 2, years: 4,
  skills: ['react'], labels: ['React'], skillsDetail: [], summary: 'resumen',
  creativity: 0.5, arch: 'mid', axes: { exec: 1, qual: 1, trans: 1, fund: 1 },
};

// El motor puede estar caido de muchas formas; todas se prueban igual: el
// fallback tiene que devolver un analisis valido (ruling C1, item 6).
function motorFallando(causa: { status?: number; error?: unknown }) {
  if (causa.status) {
    mockFetch({ ok: false, error: causa.error }, false, causa.status);
  } else {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(causa.error));
  }
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

  it('401 del servidor: el mensaje en español llega tal cual y el puente no se escribe', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const MENSAJE_401 = 'Para guardar tu análisis necesitás iniciar sesión. Volvé a intentarlo.';
    mockFetch({ error: MENSAJE_401 }, false, 401);

    await expect(analizarCvConIA('texto', 'cv.pdf')).rejects.toThrow(MENSAJE_401);

    // ni el 401 ni el throw dejan migas: el invitado conserva su puente anterior
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('M7: la huella build viaja en la respuesta parseada', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: { analisis_id: 'an-1', brechas: [] }, build: '10a-motor-guards' });

    const r = await analizarCvConIA('texto', 'cv.pdf');

    expect(r.build).toBe('10a-motor-guards');
    expect(r.guardado).toEqual({ analisis_id: 'an-1', brechas: [] });
  });

  it('M7: un despliegue viejo sin build devuelve undefined, no un string raro', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: null, build: 42 });

    const r = await analizarCvConIA('texto', 'cv.pdf');

    expect(r.build).toBeUndefined();
  });

  it('M6: funcion vieja sin brechas (brechas undefined) NO borra el puente previo', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    puenteBrechasInvitado.escribir([BRECHA]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisSinBrechas: any = { ...ANALYSIS };
    delete analysisSinBrechas.brechas;
    mockFetch({ ok: true, analysis: analysisSinBrechas, guardado: null });

    const r = await analizarCvConIA('texto', 'cv.pdf');

    expect(r.analysis.brechas).toBeUndefined();
    expect(puenteBrechasInvitado.leer()).toEqual([BRECHA]);
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

  it('limpiar() borra la clave del puente (la promoción de Plan B la necesita)', () => {
    puenteBrechasInvitado.escribir([BRECHA]);
    puenteBrechasInvitado.limpiar();
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
    expect(puenteBrechasInvitado.leer()).toEqual([]);
  });

  it('limpiar() sin puente previo no lanza', () => {
    expect(() => puenteBrechasInvitado.limpiar()).not.toThrow();
  });
});

describe('analizarCvConFallback (motor primero, Gemini de respaldo)', () => {
  let warn: MockInstance;
  let error: MockInstance;

  beforeEach(() => {
    localStorage.clear();
    getSession.mockReset();
    gemini.analyzeCVWithGemini.mockReset();
    // el camino de fallback avisa por consola; los spies mantienen la salida verde
    // del run sin ocultar un console.log inesperado
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('motor OK: usa analizarCvConIA y jamas toca el fallback', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
    const guardado = { analisis_id: 'an-1', brechas: ['uuid-brecha-1'] };
    mockFetch({ ok: true, analysis: ANALYSIS, guardado, build: '10a-motor-guards' });

    const r = await analizarCvConFallback('texto', 'cv.pdf');

    expect(r).not.toBeNull();
    expect(r!.fuente).toBe('motor');
    expect(r!.analysis.axes).toEqual({ exec: 1, qual: 1, trans: 1, fund: 1 });
    expect(r!.brechas).toEqual([BRECHA]);
    expect(r!.guardado).toEqual(guardado);
    expect(r!.build).toBe('10a-motor-guards');
    expect(gemini.analyzeCVWithGemini).not.toHaveBeenCalled();
    // autenticado: el puente sigue vacio
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('motor OK e invitado: el puente se escribe igual, con guardado null', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: null });

    const r = await analizarCvConFallback('texto', 'cv.pdf');

    expect(r!.fuente).toBe('motor');
    expect(r!.guardado).toBeNull();
    expect(puenteBrechasInvitado.leer()).toEqual([BRECHA]);
    expect(gemini.analyzeCVWithGemini).not.toHaveBeenCalled();
  });

  // (i) del item 5.c: el 401 no revienta la UI — el flujo sigue con un analisis valido
  const CAIDAS_MOTOR: { nombre: string; causa: { status?: number; error?: unknown } }[] = [
    { nombre: '401', causa: { status: 401, error: 'Para guardar tu análisis necesitás iniciar sesión. Volvé a intentarlo.' } },
    { nombre: '429', causa: { status: 429, error: 'Terminaste los 3 análisis gratis de hoy para este dispositivo.' } },
    { nombre: '500', causa: { status: 500, error: 'Boom interno del servidor.' } },
    { nombre: '502 con cuerpo no JSON', causa: { status: 502, error: undefined } },
  ];
  for (const { nombre, causa } of CAIDAS_MOTOR) {
    it(`motor cae con ${nombre}: el fallback Gemini devuelve analisis valido`, async () => {
      getSession.mockResolvedValue({ data: { session: null } });
      motorFallando(causa);
      gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

      const r = await analizarCvConFallback('texto', 'cv.pdf');

      expect(r).not.toBeNull();
      expect(r!.fuente).toBe('gemini');
      expect(r!.analysis.axes).toBeDefined();
      expect(r!.brechas).toEqual([]);   // el prompt viejo no emite brechas: no se inventan
      expect(r!.guardado).toBeNull();   // ni una ni la otra: nada persistido
      expect(gemini.analyzeCVWithGemini).toHaveBeenCalledWith('texto');
    });
  }

  it('motor lanza sin status (red cortada): igual cae al fallback', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    motorFallando({ error: new TypeError('Failed to fetch') });
    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

    const r = await analizarCvConFallback('texto', 'cv.pdf');

    expect(r!.fuente).toBe('gemini');
    expect(warn).toHaveBeenCalled();
  });

  it('motor trae analisis sin ejes: se considera falla y cae al fallback', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sinEjes: any = { ...ANALYSIS };
    delete sinEjes.axes;
    mockFetch({ ok: true, analysis: sinEjes, guardado: null });
    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

    const r = await analizarCvConFallback('texto', 'cv.pdf');

    expect(r!.fuente).toBe('gemini');
  });

  it('fallback sin ejes o roto: devuelve null, nunca un analisis inventado', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    motorFallando({ status: 500, error: 'Boom interno del servidor.' });

    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: false, error: 'Gemini dijo no.' });
    expect(await analizarCvConFallback('texto', 'cv.pdf')).toBeNull();

    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: { name: 'Ana' } });
    expect(await analizarCvConFallback('texto', 'cv.pdf')).toBeNull();

    gemini.analyzeCVWithGemini.mockRejectedValue(new Error('key de Gemini ausente'));
    expect(await analizarCvConFallback('texto', 'cv.pdf')).toBeNull();
    expect(error).toHaveBeenCalled();
  });
});
