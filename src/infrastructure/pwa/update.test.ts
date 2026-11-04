import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// registerPWA guarda estado en el módulo (`registered`, `actualizacionPedida`): cada prueba lo carga limpio.
async function cargar() {
  vi.resetModules();
  return (await import('./update')).registerPWA;
}

class FalsoServiceWorker extends EventTarget {
  controller: unknown = null;
  register = vi.fn();
}

let sw: FalsoServiceWorker;
let reload: ReturnType<typeof vi.fn>;
const original = Object.getOwnPropertyDescriptor(window, 'location');
// Cada registerPWA deja un listener de `load` en window: se quitan al terminar para que una prueba no reaccione
// a los de las anteriores.
let listenersLoad: EventListener[] = [];

beforeEach(() => {
  listenersLoad = [];
  const agregar = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation(((tipo: string, fn: EventListener, opciones?: unknown) => {
    if (tipo === 'load') listenersLoad.push(fn);
    agregar(tipo, fn, opciones as AddEventListenerOptions);
  }) as typeof window.addEventListener);
  sw = new FalsoServiceWorker();
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
  reload = vi.fn();
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true });
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const fn of listenersLoad) window.removeEventListener('load', fn);
  Reflect.deleteProperty(navigator, 'serviceWorker');
  if (original) Object.defineProperty(window, 'location', original);
  vi.useRealTimers();
});

/** Un registro de service worker con lo mínimo que usa update.ts. */
function registro(waiting: { postMessage: (m: unknown) => void } | null = null) {
  const reg = new EventTarget() as EventTarget & { update: () => Promise<void>; waiting: unknown; installing: unknown };
  reg.update = vi.fn().mockResolvedValue(undefined);
  reg.waiting = waiting;
  reg.installing = null;
  return reg;
}

async function iniciar(reg: ReturnType<typeof registro>) {
  sw.register.mockResolvedValue(reg);
  const registerPWA = await cargar();
  registerPWA();
  window.dispatchEvent(new Event('load'));
  await Promise.resolve();
  await Promise.resolve();
}

describe('registerPWA: recarga del service worker', () => {
  it('primera visita: el service worker toma el control y la página NO se recarga sola', async () => {
    await iniciar(registro());
    sw.dispatchEvent(new Event('controllerchange')); // clients.claim() de la primera instalación
    sw.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
    expect(document.getElementById('omi-update')).toBeNull();
  });

  it('hay una versión nueva esperando: avisa, y no recarga hasta que la persona toca «Actualizar»', async () => {
    sw.controller = {}; // ya había uno activo
    const postMessage = vi.fn();
    await iniciar(registro({ postMessage }));
    const aviso = document.getElementById('omi-update');
    expect(aviso).not.toBeNull();

    sw.dispatchEvent(new Event('controllerchange')); // un cambio de control que la persona no pidió
    expect(reload).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('al tocar «Actualizar» pide activar la nueva versión y recarga exactamente una vez', async () => {
    sw.controller = {};
    const postMessage = vi.fn();
    await iniciar(registro({ postMessage }));

    (document.querySelector('#omi-update button') as HTMLButtonElement).click();
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled(); // espera a que la nueva versión tome el control

    sw.dispatchEvent(new Event('controllerchange'));
    sw.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('se registra una sola vez aunque se llame varias veces', async () => {
    sw.register.mockResolvedValue(registro());
    const registerPWA = await cargar();
    registerPWA();
    registerPWA();
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(sw.register).toHaveBeenCalledTimes(1);
  });

  it('sin soporte de service worker no hace nada ni lanza', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    const registerPWA = await cargar();
    expect(() => registerPWA()).not.toThrow();
  });
});
