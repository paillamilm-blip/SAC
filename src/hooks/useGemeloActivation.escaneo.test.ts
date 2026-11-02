// hooks/useGemeloActivation.escaneo.test.ts
// El escaneo narrado tiene una sola promesa que sostener: cada hito que aparece
// es algo que PASÓ. Era exactamente lo que no ocurría — un `setInterval` de 6 s
// haciendo avanzar cuatro textos y un riel de tres pasos atado a un contador que
// sólo se movía después de persistir. Estos tests fijan el lado negativo (el
// tiempo no avanza la barra) y las medidas verdaderas de cada camino del motor.
// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error node:fs existe en runtime (vitest corre en node) pero no tiene tipos en este repo
import { readFileSync } from 'node:fs';

const { analizarCvConFallback, toast, rpc, refreshProfile, savePending } = vi.hoisted(() => ({
  analizarCvConFallback: vi.fn(),
  toast: vi.fn(),
  rpc: vi.fn(),
  refreshProfile: vi.fn(),
  savePending: vi.fn(),
}));

vi.mock('@/features/gemelo/services/aprendizaje', () => ({ analizarCvConFallback }));
vi.mock('@/store/AppContext', () => ({
  useApp: () => ({ gemelo: null, profile: { id: null }, refreshProfile }),
}));
vi.mock('@/shared/components/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { rpc, auth: { getSession: vi.fn() } },
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'anon-test',
}));
vi.mock('@/infrastructure/voice/engine', () => ({ speak: vi.fn() }));
// El hook exige leer PISO_CV del módulo real: mockear el archivo entero sin esa
// exportación hace que el flujo reviente antes de llegar al motor. Se reemplaza
// sólo la lectura (que necesita red/CDN), los números se quedan verdaderos.
vi.mock('@/features/gemelo/services/cvExtract', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/gemelo/services/cvExtract')>()),
  extractCVText: vi.fn(),
}));
vi.mock('@/shared/utils/analytics', () => ({ track: vi.fn() }));
vi.mock('@/shared/utils/guestMode', () => ({
  savePendingCvAnalysis: savePending,
  getPendingCvAnalysis: () => null,
  clearPendingCvAnalysis: vi.fn(),
  hasPendingCvAnalysis: () => false,
}));

import {
  escaneoInicial, fraccionEscaneo, HITOS_ESCANEO, marcarHito, useGemeloActivation,
  type Hito, type HitoId,
} from './useGemeloActivation';

const CV = [
  'Marina Herrera',
  'Ingeniera en Informática',
  'EXPERIENCIA',
  'Lead Developer en BancoEstado 8 años',
  'React, TypeScript, Node.js, PostgreSQL, Supabase',
  'Lideré un equipo de 6 personas',
  'FORMACIÓN',
  'Pontificia Universidad Católica de Chile',
].join('\n');

const ANALISIS_IA = {
  name: 'Marina Herrera',
  seniorLabel: 'Tech Lead / Arquitecta',
  seniorLevel: 4,
  years: 8,
  skills: ['React', 'TypeScript', 'Node.js'],
  skillsDetail: [{ name: 'React', pct: 88 }],
  arch: 'fullstack',
  axes: { exec: 74, qual: 61, trans: 55, fund: 80 },
  summary: 'Construye y lidera.',
};

const hito = (lista: Hito[], id: HitoId): Hito => {
  const h = lista.find((x) => x.id === id);
  if (!h) throw new Error(`no existe el hito ${id}`);
  return h;
};

type Activacion = ReturnType<typeof useGemeloActivation>;

const esperar = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Un `await` que maneja la prueba: deja el flujo parked hasta que se decide qué
 *  le llegó del motor. */
function diferido(): { promesa: Promise<unknown>; resolver: (v: unknown) => void } {
  let resolver: (v: unknown) => void = () => {};
  const promesa = new Promise<unknown>((r) => { resolver = r; });
  return { promesa, resolver };
}

/**
 * Deja el `cvText` servido antes de disparar: el callback del hook cierra sobre
 * el texto del render anterior y, vacío, devuelve sin hacer nada.
 */
function cargar(result: { current: Activacion }): void {
  act(() => { result.current.setCvText(CV); });
}

/**
 * Dispara y deja el flujo EN VUELO, sin esperarlo. Cualquier `await act(async …)`
 * mientras el flujo sigue parked en la llamada al motor no devuelve (deadlock real
 * de `act` de React 18), así que quien lo deja parked usa sólo act síncronos.
 */
function disparar(result: { current: Activacion }): Promise<unknown> {
  let vuelo: Promise<unknown> = Promise.resolve();
  act(() => { vuelo = result.current.activateGemeloCompleto(); });
  return vuelo;
}

/** Carga, dispara y drena el flujo dentro de un solo act asíncrono: así el
 *  cronómetro de 1 s que el hook deja plantado ticks DENTRO de la scope de act,
 *  que es lo que estaba generando los warnings. Solo se permite cuando el mock
 *  resuelve: un flujo parked dentro de un act asíncrono no devuelve nunca. */
async function hastaElFinal(result: { current: Activacion }): Promise<void> {
  cargar(result);
  const vuelo = disparar(result);
  await act(async () => { await vuelo; });
}

describe('el modelo puro de hitos', () => {
  it('arranca con un solo hito en el aire y cero hechos', () => {
    const lista = escaneoInicial();
    expect(lista.map((h) => h.id)).toEqual(HITOS_ESCANEO.map((h) => h.id));
    expect(lista.filter((h) => h.estado === 'activo')).toHaveLength(1);
    expect(lista.some((h) => h.estado === 'hecho')).toBe(false);
    expect(fraccionEscaneo(lista)).toBe(0);
  });

  it('marcar no reordena, no duplica y no toca los demás', () => {
    const base = marcarHito(marcarHito(escaneoInicial(), 'gemelo', 'hecho', 'listo'), 'documento', 'hecho', '30 palabras');
    expect(base.map((h) => h.id)).toEqual(HITOS_ESCANEO.map((h) => h.id));
    expect(hito(base, 'lectura').estado).toBe('espera');
    expect(hito(base, 'documento').medida).toBe('30 palabras');
  });

  it('la fracción sólo cuenta hechos: un hito fallido no suma', () => {
    const lista: Hito[] = [
      { id: 'documento', etiqueta: '', estado: 'hecho', medida: '' },
      { id: 'lectura', etiqueta: '', estado: 'hecho', medida: '' },
      { id: 'analisis', etiqueta: '', estado: 'fallido', medida: '' },
      { id: 'ejes', etiqueta: '', estado: 'espera', medida: '' },
      { id: 'registro', etiqueta: '', estado: 'espera', medida: '' },
      { id: 'gemelo', etiqueta: '', estado: 'espera', medida: '' },
    ];
    expect(fraccionEscaneo(lista)).toBeCloseTo(2 / 6, 10);
  });
});

describe('el escaneo se marca con hechos, no con el reloj', () => {
  // Dos reglas de este describe, ambas aprendidas a costillas del deadlock:
  //  · `vi.useFakeTimers()` completo traba el `await import(...)` del servicio,
  //    así que sólo se congela `setInterval` cuando hace falta mover el
  //    cronómetro. El timeout de seguridad no se espera 150 s: se intercepta
  //    por su retardo exacto.
  //  · Un flujo parked dentro de `await act(async …)` no devuelve: los tests
  //    que lo dejan parked usan sólo act síncronos.
  beforeEach(() => {
    analizarCvConFallback.mockReset();
    toast.mockReset();
    savePending.mockReset();
  });

  it('nada avanza mientras la IA piensa; cancelar descarta la respuesta tardía', async () => {
    const ia = diferido();
    analizarCvConFallback.mockReturnValue(ia.promesa);
    // Sólo el intervalo del cronómetro es falso: `setTimeout` sigue real para que
    // el `await import` del motor resuelva. Congelar todo deadlockeaba la carga.
    vi.useFakeTimers({ toFake: ['setInterval'] });

    const { result } = renderHook(() => useGemeloActivation());
    cargar(result);
    disparar(result);

    // 3 segundos de reloj, en un act SÍNCRONO. Los dos primeros hitos ya
    // ocurrieron sin la IA; el resto no puede haber avanzado por haber pasado
    // el tiempo — ése era el bug que estos tests fijan.
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(result.current.phase).toBe('syncing');
    expect(result.current.segundos).toBe(3);
    expect(hito(result.current.hitos, 'documento').estado).toBe('hecho');
    expect(hito(result.current.hitos, 'lectura').estado).toBe('hecho');
    expect(hito(result.current.hitos, 'analisis').estado).toBe('activo');
    expect(hito(result.current.hitos, 'ejes').estado).toBe('espera');
    expect(fraccionEscaneo(result.current.hitos)).toBeCloseTo(2 / 6, 10);

    // Cancelar durante la espera es un hecho real de la pantalla (el botón
    // existe) y deja el cronómetro en 3. La respuesta tardía del motor cae en
    // el guard de `cancelledRef`: se tira, no reescribe ningún hito.
    act(() => { result.current.cancelActivation(); });
    expect(result.current.segundos).toBe(3);
    ia.resolver({ fuente: 'motor', analysis: ANALISIS_IA, brechas: [], guardado: null });
    await esperar(20);
    expect(result.current.phase).toBe('upload');
    expect(hito(result.current.hitos, 'analisis').estado).toBe('activo');
    expect(fraccionEscaneo(result.current.hitos)).toBeCloseTo(2 / 6, 10);
    vi.useRealTimers();
  });

  it('el camino del motor deja seis hechos con su medida', async () => {
    analizarCvConFallback.mockResolvedValue({
      fuente: 'motor',
      analysis: ANALISIS_IA,
      brechas: [{ id: 'b1' }, { id: 'b2' }],
      guardado: { analisis_id: 'a1', brechas: ['b1', 'b2'] },
      build: '7a',
    });

    const { result } = renderHook(() => useGemeloActivation());
    await hastaElFinal(result);

    const h = result.current.hitos;
    expect(h.every((x) => x.estado === 'hecho')).toBe(true);
    expect(fraccionEscaneo(h)).toBe(1);
    expect(hito(h, 'documento').medida).toMatch(/^29 palabras · \d+ caracteres$/);
    expect(hito(h, 'analisis').medida).toBe('respondió el motor propio');
    expect(hito(h, 'registro').medida).toBe('2 brechas · huella 7a');
    expect(hito(h, 'gemelo').medida).toBe('Tech Lead / Arquitecta · 8 años');
    expect(result.current.phase).toBe('reveal');
  });

  it('el respaldo declarado se nombra y avisa que no deja run', async () => {
    analizarCvConFallback.mockResolvedValue({
      fuente: 'gemini', analysis: ANALISIS_IA, brechas: [], guardado: null,
    });

    const { result } = renderHook(() => useGemeloActivation());
    await hastaElFinal(result);

    const h = result.current.hitos;
    expect(hito(h, 'analisis').medida).toBe('respondió el respaldo declarado');
    expect(hito(h, 'registro').estado).toBe('fallido');
    expect(hito(h, 'registro').medida).toBe('el respaldo no deja run en el servidor');
  });

  it('un corte del servidor es un hito fallido con el texto del servidor', async () => {
    analizarCvConFallback.mockResolvedValue({
      fuente: 'bloqueado', error: 'Hoy ya usaste los análisis disponibles.', status: 429,
    });

    const { result } = renderHook(() => useGemeloActivation());
    await hastaElFinal(result);

    expect(hito(result.current.hitos, 'analisis').estado).toBe('fallido');
    expect(hito(result.current.hitos, 'analisis').medida).toBe('Hoy ya usaste los análisis disponibles.');
    expect(result.current.lastError).toBe('cuota');
    expect(result.current.phase).toBe('upload');
    // Un corte no es progreso: la barra se queda en los dos hechos reales.
    expect(fraccionEscaneo(result.current.hitos)).toBeCloseTo(2 / 6, 10);
  });

  it('el timeout de seguridad rinde el hito en el aire y la respuesta tardía no lo reescribe', async () => {
    // El retardo de seguridad se intercepta por su valor exacto: vivir 150 s en
    // un test no es una opción, y congelar todos los timers trucha la carga del
    // servicio. Todo lo demás corre con timers reales.
    const originales = globalThis.setTimeout;
    const rendido: { disparar: (() => void) | null } = { disparar: null };
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number, ...args: unknown[]) =>
      (ms === 150_000
        ? (rendido.disparar = fn, 0 as unknown as ReturnType<typeof setTimeout>)
        : originales(fn, ms, ...args))) as typeof setTimeout);

    const ia = diferido();
    analizarCvConFallback.mockReturnValue(ia.promesa);

    const { result } = renderHook(() => useGemeloActivation());
    cargar(result);
    disparar(result);
    expect(rendido.disparar).not.toBeNull();

    // act SÍNCRONO: el flujo sigue parked, y un act asíncrono acá no devuelve.
    act(() => { rendido.disparar?.(); });
    expect(result.current.phase).toBe('upload');
    expect(result.current.lastError).toBe('timeout');
    expect(hito(result.current.hitos, 'analisis').estado).toBe('fallido');
    expect(hito(result.current.hitos, 'analisis').medida).toBe('sin respuesta en 150 s');
    expect(hito(result.current.hitos, 'documento').estado).toBe('hecho');
    expect(fraccionEscaneo(result.current.hitos)).toBeCloseTo(2 / 6, 10);

    // El motor contesta tarde: el flujo ya se rindió (`isProcessing` en false),
    // así que la respuesta cae en el guard de la línea 491 y vuelve sin tocar
    // estado — sin act alrededor, porque no tiene nada que flusher.
    ia.resolver({ fuente: 'motor', analysis: ANALISIS_IA, brechas: [], guardado: null });
    await esperar(50);
    expect(result.current.phase).toBe('upload');
    expect(hito(result.current.hitos, 'analisis').medida).toBe('sin respuesta en 150 s');
    expect(hito(result.current.hitos, 'gemelo').estado).toBe('espera');
    vi.restoreAllMocks();
  });

  it('un análisis sin ejes es un hito fallido, no un gemelo a medias', async () => {
    // El camino que prohibe el dato falso: si ningún motor trae los cuatro ejes,
    // el escaneo se rinde ahí y no se inventa un perfil local para rellenar.
    analizarCvConFallback.mockResolvedValue({
      fuente: 'motor', analysis: { ...ANALISIS_IA, axes: undefined }, brechas: [], guardado: null,
    });

    const { result } = renderHook(() => useGemeloActivation());
    await hastaElFinal(result);

    expect(hito(result.current.hitos, 'analisis').medida).toBe('el análisis llegó sin ejes');
    expect(hito(result.current.hitos, 'ejes').estado).toBe('espera');
    expect(result.current.lastError).toBe('no_analysis');
    expect(result.current.phase).toBe('upload');
  });

  it('el progreso cosmético no puede volver: ni los cuatro mensajes ni el intervalo de 6 s', () => {
    const fuente = readFileSync('src/hooks/useGemeloActivation.ts', 'utf8')
      .replace(/\r/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, (m: string) => m.replace(/[^\n]/g, ' '))
      .replace(/^\s*\/\/.*$/gm, '');
    expect(fuente).not.toMatch(/PROGRESS_MESSAGES/);
    expect(fuente).not.toMatch(/setInterval\([^)]*\},\s*6000\)/s);
  });
});
