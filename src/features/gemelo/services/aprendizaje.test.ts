// features/gemelo/services/aprendizaje.test.ts
// Cubre los dos caminos del cliente del motor: invitado (puente localStorage)
// y autenticado (guardado server-side, sin escribir el puente), la huella que
// sube del servidor, y el orden motor -> fallback Gemini de analizarCvConFallback.
// Y la frontera que el fallback NUNCA puede cruzar: un corte del servidor sobre
// este usuario (401/429/503) se muestra, no se tapa buscando otra puerta. Con el
// matiz de T10-D: solo cuando lo redacto el motor (cuerpo con `error`). Un 401/503
// del borde de Supabase —cuerpo {code, message}, funcion nunca ejecutada— es el
// motor afuera y si cae al respaldo.
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
  ErrorAnalisisMotor,
} from './aprendizaje';
import type { ResultadoAnalisisCv } from './aprendizaje';
import { supabaseAnonKey } from '@/infrastructure/supabase/client';
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

// `analizarCvConFallback` devolvio una union discriminada: los casos que esperan
// analisis necesitan el estrecho, y `if (!r)` dentro del test diria menos que este
// error cuando llega null o bloqueado (justo las dos fallas que este helper vigila).
function conAnalisis(r: ResultadoAnalisisCv | null, esperaba: string): Exclude<ResultadoAnalisisCv, { fuente: 'bloqueado' }> {
  if (!r || r.fuente === 'bloqueado') throw new Error(`esperaba ${esperaba}, llego ${JSON.stringify(r)}`);
  return r;
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

    // headers: apikey publica siempre; SIN sesion el Bearer va igual, con la
    // anon key del cliente (la resolucion de supabase-js: access_token ?? key).
    // Omitir Authorization no es "modo invitado": el borde de Supabase lo corta
    // con 401 antes de que la funcion corra, y el diseño de invitado es inalcanzable.
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.apikey).toBe('anon-test-key');
    expect(headers.Authorization).toBe(`Bearer ${supabaseAnonKey}`);
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
    // el respaldo de invitado jamas pisa a un token de usuario: un Bearer con la
    // anon key haria que el motor lea la llamada como anonima y se pierda el guardado.
    expect(headers.Authorization).not.toContain(supabaseAnonKey);
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

  it('HTTP != ok y cuerpo no JSON: el motor no habló, mensaje humano sin HTTP ni números', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 502,
      json: async () => { throw new Error('cuerpo no JSON'); },
    } as unknown as Response));

    const e = await analizarCvConIA('texto', 'cv.pdf').catch((err: unknown) => err);

    // Un cuerpo que el motor no escribió no puede mostrarse como si lo fuera: la
    // jerga `El analisis fallo (HTTP 502).` era exactamente el hallazgo I-#1.
    expect(e).toBeInstanceOf(ErrorAnalisisMotor);
    expect((e as ErrorAnalisisMotor).status).toBe(502);
    expect((e as ErrorAnalisisMotor).delServidor).toBe(false);
    expect((e as ErrorAnalisisMotor).message).not.toMatch(/HTTP/);
    expect((e as ErrorAnalisisMotor).message).not.toMatch(/\d/);
  });

  it('401 del borde (cuerpo {code, message}): no es un mensaje del motor y se dice humano', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    // Lo que emite Supabase con verify_jwt ON cuando el header falta: el handler
    // nunca corrio, o sea que NO hay un motivo para ESTA persona.
    mockFetch({ code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' }, false, 401);

    const e = await analizarCvConIA('texto', 'cv.pdf').catch((err: unknown) => err);

    expect(e).toBeInstanceOf(ErrorAnalisisMotor);
    expect((e as ErrorAnalisisMotor).status).toBe(401);
    expect((e as ErrorAnalisisMotor).delServidor).toBe(false);
    expect((e as ErrorAnalisisMotor).message).not.toMatch(/HTTP/);
    expect((e as ErrorAnalisisMotor).message).not.toMatch(/\d/);
  });

  it('401 del servidor: el mensaje en español llega tal cual y el puente no se escribe', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const MENSAJE_401 = 'Para guardar tu análisis necesitás iniciar sesión. Volvé a intentarlo.';
    mockFetch({ error: MENSAJE_401 }, false, 401);

    await expect(analizarCvConIA('texto', 'cv.pdf')).rejects.toThrow(MENSAJE_401);

    // ni el 401 ni el throw dejan migas: el invitado conserva su puente anterior
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('el status HTTP viaja en el error: sin el numero el llamador no decide', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    mockFetch({ error: 'Llegaste a los 10 análisis de hoy.' }, false, 429);

    const e = await analizarCvConIA('texto', 'cv.pdf').catch((err: unknown) => err);

    // Un Error pelado borra el 429: el fallback tendria que adivinar por el texto
    // (fragil, y el server puede reescribirlo). La clase es el contrato.
    expect(e).toBeInstanceOf(ErrorAnalisisMotor);
    expect((e as ErrorAnalisisMotor).status).toBe(429);
    expect((e as ErrorAnalisisMotor).message).toBe('Llegaste a los 10 análisis de hoy.');
    // El cuerpo trajo el `error` del motor: hablo de ESTE usuario, es un corte.
    expect((e as ErrorAnalisisMotor).delServidor).toBe(true);
  });

  it('cuerpo ok:false con status del response: el status no se inventa, sale de res.status', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    // El motor actual nunca responde 200 con ok:false (los rechazos salen con su
    // HTTP propio); se prueba igual que `!res.ok` porque la guarda es la misma
    // lectura: status real del response, no un numero de reserva.
    mockFetch({ ok: false, error: 'La IA devolvió un análisis incompleto.' }, true, 200);

    const e = await analizarCvConIA('texto', 'cv.pdf').catch((err: unknown) => err);

    expect(e).toBeInstanceOf(ErrorAnalisisMotor);
    expect((e as ErrorAnalisisMotor).status).toBe(200);
    // ok:false sale del cuerpo del motor: el texto es del servidor por definicion.
    expect((e as ErrorAnalisisMotor).delServidor).toBe(true);
  });

  it('M7: la huella build viaja en la respuesta parseada', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: { analisis_id: 'an-1', brechas: [] }, build: '10c-ejes-estrictos' });

    const r = await analizarCvConIA('texto', 'cv.pdf');

    expect(r.build).toBe('10c-ejes-estrictos');
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
    mockFetch({ ok: true, analysis: ANALYSIS, guardado, build: '10c-ejes-estrictos' });

    const r = conAnalisis(await analizarCvConFallback('texto', 'cv.pdf'), 'analisis del motor');

    expect(r.fuente).toBe('motor');
    expect(r.analysis.axes).toEqual({ exec: 1, qual: 1, trans: 1, fund: 1 });
    expect(r.brechas).toEqual([BRECHA]);
    expect(r.guardado).toEqual(guardado);
    expect(r.build).toBe('10c-ejes-estrictos');
    expect(gemini.analyzeCVWithGemini).not.toHaveBeenCalled();
    // autenticado: el puente sigue vacio
    expect(localStorage.getItem(PUENTE_KEY)).toBeNull();
  });

  it('motor OK e invitado: el puente se escribe igual, con guardado null', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    mockFetch({ ok: true, analysis: ANALYSIS, guardado: null });

    const r = conAnalisis(await analizarCvConFallback('texto', 'cv.pdf'), 'analisis del motor (invitado)');

    expect(r.fuente).toBe('motor');
    expect(r.guardado).toBeNull();
    expect(puenteBrechasInvitado.leer()).toEqual([BRECHA]);
    expect(gemini.analyzeCVWithGemini).not.toHaveBeenCalled();
  });

  // El motor caido (5xx, red, analisis sin ejes) es un problema DE LA IA: ahi el
  // respaldo esta bien. Los tres statuses de abajo son lo contrario: un mensaje
  // para ESTE usuario, y taparlo con Gemini lo convierte en un tope silencioso.
  const CAIDAS_MOTOR: { nombre: string; causa: { status?: number; error?: unknown } }[] = [
    { nombre: '500', causa: { status: 500, error: 'Boom interno del servidor.' } },
    { nombre: '502 con cuerpo no JSON', causa: { status: 502, error: undefined } },
    { nombre: '502 sin los 4 ejes', causa: { status: 502, error: 'La IA devolvió un análisis incompleto (faltan los 4 ejes del Gemelo). Volvé a intentar.' } },
    { nombre: '504 saturado', causa: { status: 504, error: 'El modelo gratuito está saturado: ningún modelo respondió a tiempo. Reintentá en unos minutos.' } },
  ];
  for (const { nombre, causa } of CAIDAS_MOTOR) {
    it(`motor cae con ${nombre}: el fallback Gemini devuelve analisis valido`, async () => {
      getSession.mockResolvedValue({ data: { session: null } });
      motorFallando(causa);
      gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

      const r = conAnalisis(await analizarCvConFallback('texto', 'cv.pdf'), `fallback por ${nombre}`);

      expect(r.fuente).toBe('gemini');
      expect(r.analysis.axes).toBeDefined();
      expect(r.brechas).toEqual([]);   // el prompt viejo no emite brechas: no se inventan
      expect(r.guardado).toBeNull();   // ni una ni la otra: nada persistido
      expect(gemini.analyzeCVWithGemini).toHaveBeenCalledWith('texto');
    });
  }

  // I-B: 401/429/503 son el server cortando a este usuario, no el motor roto.
  // El spy de Gemini se afirma NO llamado: el resultado 'bloqueado' podria salir
  // por accidente y el test seguiria verde sin probar el tope.
  const BLOQUEOS_SERVIDOR: { nombre: string; status: number; error: string }[] = [
    { nombre: '429 (cupo del dia)', status: 429, error: 'Llegaste a los 10 análisis de hoy. El contador se renueva en ~6 h.' },
    { nombre: '401 (sesion expirada)', status: 401, error: 'Tu sesión expiró. Volvé a iniciar sesión para analizar tu CV.' },
    { nombre: '503 (sin origen)', status: 503, error: 'No pudimos identificar tu conexión para asignarte los análisis gratis del día. Iniciá sesión y te devolvemos el análisis.' },
  ];
  for (const { nombre, status, error } of BLOQUEOS_SERVIDOR) {
    it(`el servidor corta con ${nombre}: se devuelve el motivo y NO se gasta el fallback`, async () => {
      getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
      mockFetch({ ok: false, error }, false, status);
      // Gemini esta sano y daria un analisis perfecto: justamente, no tiene que
      // ser llamado. Se deja resuelto a proposito — con el mock vacio el test
      // tambien daria null, y null no demuestra que el tope se respeto.
      gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

      const r = await analizarCvConFallback('texto', 'cv.pdf');

      expect(r).toEqual({ fuente: 'bloqueado', status, error });
      // el texto del server llega LITERAL (ni reescrito ni traducido): la UI lo
      // muestra tal cual, que es lo que el spec §8 pide.
      expect(gemini.analyzeCVWithGemini).not.toHaveBeenCalled();
    });
  }

  // I-#1 de la revision de 10-B, MEDIDO en produccion: un 401/503 del BORDE de
  // Supabase (verify_jwt, cold start, gateway) trae cuerpo {code, message} y el
  // handler nunca corrio. No hay mensaje para ESTA persona: es el motor afuera, y
  // ahi el fallback declarado si corre. El status solo no alcanza para decidir.
  const CORTES_DE_PLATAFORMA: { nombre: string; status: number; body: Record<string, string> }[] = [
    { nombre: '401 sin Authorization', status: 401, body: { code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' } },
    { nombre: '503 en cold start', status: 503, body: { code: 'SERVICE_UNAVAILABLE', message: 'The function was not available' } },
  ];
  for (const { nombre, status, body } of CORTES_DE_PLATAFORMA) {
    it(`corte de plataforma (${nombre}): cae al fallback Gemini y jamas muestra la jerga`, async () => {
      getSession.mockResolvedValue({ data: { session: null } });
      mockFetch(body, false, status);
      gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

      const r = conAnalisis(await analizarCvConFallback('texto', 'cv.pdf'), `fallback por ${nombre}`);

      expect(r.fuente).toBe('gemini');
      expect(gemini.analyzeCVWithGemini).toHaveBeenCalledWith('texto');
      // Lo que la UI llegaria a mostrar: ni "HTTP" ni el numero de status.
      expect(JSON.stringify(r)).not.toMatch(/HTTP/);
    });
  }

  it('429 de invitado: el puente queda intacto (no escribe ni borra)', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    puenteBrechasInvitado.escribir([BRECHA]);
    const CUPO_INVITADO = 'Terminaste los 3 análisis gratis de hoy para este dispositivo.';
    mockFetch({ ok: false, error: CUPO_INVITADO }, false, 429);
    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

    const r = await analizarCvConFallback('texto', 'cv.pdf');

    expect(r?.fuente).toBe('bloqueado');
    // el texto del cupo de invitados llega LITERAL y con su status: es un corte
    // del motor sobre ESTA persona (trajo su `error`), no una plataforma muda.
    expect(r).toEqual({ fuente: 'bloqueado', status: 429, error: CUPO_INVITADO });
    // el throw del 429 ocurre antes del bloque del puente: las brechas previas del
    // invitado siguen ahi. Si alguien mueve el puente arriba del catch, esto se cae.
    expect(puenteBrechasInvitado.leer()).toEqual([BRECHA]);
    expect(gemini.analyzeCVWithGemini).not.toHaveBeenCalled();
  });

  it('motor lanza sin status (red cortada): igual cae al fallback', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    motorFallando({ error: new TypeError('Failed to fetch') });
    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

    const r = conAnalisis(await analizarCvConFallback('texto', 'cv.pdf'), 'fallback por red cortada');

    expect(r.fuente).toBe('gemini');
    expect(warn).toHaveBeenCalled();
  });

  it('motor trae analisis sin ejes: se considera falla y cae al fallback', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sinEjes: any = { ...ANALYSIS };
    delete sinEjes.axes;
    mockFetch({ ok: true, analysis: sinEjes, guardado: null });
    gemini.analyzeCVWithGemini.mockResolvedValue({ ok: true, analysis: ANALISIS_GEMINI });

    const r = conAnalisis(await analizarCvConFallback('texto', 'cv.pdf'), 'fallback por analisis sin ejes');

    expect(r.fuente).toBe('gemini');
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
