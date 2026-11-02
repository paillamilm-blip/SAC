// features/aprendizaje/AprendizajeTab.test.tsx
// B4 · test de montaje del mapa. NO prueba geometría (eso ya lo fija
// MapaCapacidades.test.tsx contra el modelo de mapaLayout): prueba EL ANDAMIO —
// que la pestaña pinta el workspace de dos columnas, que la fuente de datos se
// resuelve (puente lleno vs muestra etiquetada), y que la cola obedece la máquina
// de estados DEL HUÉSPED con escritura optimista que revierte si el RPC falla.
//
// Cero red real: se mockea el cliente de Supabase (marcarBrecha → rpc) y se
// controla localStorage (el puente del invitado). Con el motor sin desplegar el
// rpc responde error/vacío: la UI muestra el motivo y la muestra sigue navegable.
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'anon-test-key',
}));

// useUserColor tira de ColorPicker → spatialAudio, que necesita matchMedia. La
// pestaña no es dueña del color: sólo lo baja al andamio como variable CSS.
vi.mock('@/shared/hooks/useUserColor', () => ({ useUserColor: () => '#7dd3fc' }));

// La lectura de `brechas_aprendizaje` es un hook con react-query; el montaje de
// la pestaña NO prueba la consulta (eso lo hace useBrechasReales.test.tsx) ni la
// geometría del mapa. Se controla la respuesta para poder pintar los cuatro
// estados de la fuente: cargando, error, filas propias y vacío real.
const { lectura } = vi.hoisted(() => ({
  lectura: {
    conSesion: false as boolean | null,
    cargando: false,
    error: null as string | null,
    brechas: [] as unknown[],
    ocupacion: null as string | null,
    recargar: () => void 0,
  },
}));
const recargar = vi.fn();
lectura.recargar = recargar;
vi.mock('./useBrechasReales', () => ({ useBrechasReales: () => lectura }));

import AprendizajeTab from './AprendizajeTab';
import { AVISO_MUESTRA, AVISO_VACIO } from './abrirBrechas';
import { puenteBrechasInvitado } from '@/features/gemelo/services/aprendizaje';
import type { BrechaValidada } from '@/features/gemelo/services/brechasValidar';

const PUENTE_KEY = 'omicron.brechas.puente';

// Una brecha como las que congela el motor en el puente del invitado (sin id: el
// id de trabajo lo deriva `desdePuente` del título).
const BRECHA_TAB: BrechaValidada = {
  categoria: 'dura', titulo: 'Excel avanzado', evidencia: 'no aparece en tu CV',
  porQueImporta: 'lo pide el puesto', severidad: 'alta',
  aprender: { que: 'tablas dinámicas', como: 'curso corto + práctica', comoLoDemuestro: 'un archivo propio' },
};

// ids literales del fixture __fixtures__/analisis-donante.json (no los invento).
const ID_PENDIENTE_BLANDA = '05d2bb7c-8201-482f-b1e6-e8f33ae064de'; // Comunicación escrita breve
const ID_CONFIRMADA_DURA = '7c9c5b7b-c3c0-4c7f-9b50-db5d345b11b4'; // Análisis de datos (confirmada, sin dominar)

// El radio lo fija la SEVERIDAD (alta 12 / media 10.5 / baja 9), no el estado.
const nodo = (id: string): Element | null => document.querySelector(`g[data-id-brecha="${id}"]`);
const radioDe = (id: string): number => Number(nodo(id)?.querySelector('circle.mapa-nodo-carne')?.getAttribute('r'));

// El estado viaja como dato, no como clase: `data-estado` es lo que mapa.css usa
// para pintar y lo que este andamio cambia cuando la cola escribe.
const estadoDelNodo = (id: string): string => nodo(id)?.getAttribute('data-estado') ?? '';

// El atajo "Siguiente" también nombra a la primera pendiente, así que un título
// buscado en toda la pantalla devuelve DOS controles: el atajo y la fila. La fila
// vive en la cola, y es ahí dentro donde el título tiene que ser único.
const colaEl = () => screen.getByRole('complementary', { name: /cola de revisión/i });
const enCola = () => within(colaEl());
const abrirFilaEnCola = (titulo: string) => {
  fireEvent.click(enCola().getByRole('button', { name: new RegExp(titulo, 'i') }));
};
// Una vez abierta, la fila nombra TRES botones (el toggle, "Es real: X", "No
// aplica: X"), así que el cabezal se busca por su clase y no por el texto.
const toggleDe = (titulo: string): HTMLElement => {
  const b = Array.from(colaEl().querySelectorAll<HTMLElement>('.cola-toggle'))
    .find((el) => (el.textContent ?? '').includes(titulo));
  if (!b) throw new Error(`no está el cabezal de ${titulo}`);
  return b;
};

const okRpc = () => rpc.mockResolvedValue({ data: { id: 'x' }, error: null });

beforeEach(() => {
  localStorage.clear();
  rpc.mockReset();
  okRpc();
  // Por defecto: invitado sin sesión y sin lectura en vuelo (el camino histórico
  // de estos casos). Los casos de abajo cambian la respuesta y vuelven acá.
  Object.assign(lectura, { conSesion: false, cargando: false, error: null, brechas: [], ocupacion: null });
  recargar.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('la pestaña existe y pinta el workspace', () => {
  it('monta el mapa (svg), la cola y el header con progreso', () => {
    render(<AprendizajeTab />);
    expect(document.querySelector('svg.mapa-svg')).not.toBeNull();
    expect(screen.getByRole('complementary', { name: /cola de revisión/i })).toBeTruthy();
    // Con puente vacío cae a la muestra de 8: el header dice "N de 8 reconocidas".
    expect(screen.getByText(/de 8 reconocidas/i)).toBeTruthy();
  });

  it('el andamio pinta con el color del usuario y el progreso se ve, no sólo se lee', () => {
    render(<AprendizajeTab />);
    const ws = document.querySelector('.aprendizaje-workspace') as HTMLElement;
    // Foco, riel y estado activo salen de esta variable; el mapa NO la usa.
    expect(ws.style.getPropertyValue('--omi-accent')).toBe('#7dd3fc');
    expect(ws.style.getPropertyValue('--omi-accent-soft')).toBe('#7dd3fc33');
    // 3 de 8 reconocidas → el riel ocupa 0,375 (se anima transform, no width).
    const rail = ws.querySelector('.aprendizaje-rail i') as HTMLElement;
    expect(rail.style.getPropertyValue('--p')).toBe('0.375');
    expect(ws.querySelector('.aprendizaje-rail')?.getAttribute('aria-hidden')).toBe('true');
    // La severidad manda el color, y siempre está escrita con letras.
    abrirFilaEnCola('Comunicación escrita breve');
    const sev = ws.querySelector('.cola-severidad') as HTMLElement;
    expect(sev.dataset.severidad).toMatch(/alta|media|baja/);
    expect(sev.textContent).toMatch(/Impacto/);
  });

  it('la barra es UNA fila: el progreso es su línea inferior y la muestra no la parte', () => {
    render(<AprendizajeTab />);
    const header = document.querySelector('.aprendizaje-header') as HTMLElement;
    // El riel es la línea inferior de la barra, no un bloque más en la pila.
    expect(header.querySelector('.aprendizaje-rail')).not.toBeNull();
    // El chip mide ~26px y obligaba a la barra a dos líneas (139px sobre 353 visibles):
    // vive en el flujo, debajo del header, y la honestidad sigue estando a la vista.
    const chip = document.querySelector('.aprendizaje-chip') as HTMLElement;
    expect(chip.textContent).toBe(AVISO_MUESTRA);
    expect(header.contains(chip)).toBe(false);
  });
});

describe('fuente de las brechas', () => {
  it('puente vacío: aparece el aviso de muestra y las 8 brechas del fixture, etiquetada como muestra', () => {
    render(<AprendizajeTab />);
    expect(screen.getByText(AVISO_MUESTRA)).toBeTruthy();
    const cola = screen.getByRole('complementary', { name: /cola de revisión/i });
    expect(within(cola).getAllByTestId('cola-item')).toHaveLength(8);
    // Un titulo literal del fixture, presente dentro de la cola (el atajo de
    // "Siguiente" también puede nombrar a esa misma fila).
    expect(within(cola).getByText('Comunicación escrita breve')).toBeTruthy();
  });

  it('puente lleno: aparecen las del puente y NO el aviso de muestra', () => {
    localStorage.setItem(
      PUENTE_KEY,
      JSON.stringify([
        {
          categoria: 'dura', titulo: 'Python para datos', evidencia: 'no aparece', porQueImporta: 'lo piden',
          severidad: 'alta', aprender: { que: 'pandas', como: 'curso', comoLoDemuestro: 'notebook' },
        },
        {
          categoria: 'blanda', titulo: 'Hablar en público', evidencia: 'sin ejemplos', porQueImporta: 'liderazgo',
          severidad: 'media', aprender: { que: 'oratoria', como: 'práctica', comoLoDemuestro: 'una charla' },
        },
      ]),
    );
    render(<AprendizajeTab />);
    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
    // El titulo también vive en el mapa (la etiqueta del nodo), así que la fila se
    // comprueba dentro de la cola y el mapa se comprueba por cantidad de nodos.
    const cola = screen.getByRole('complementary', { name: /cola de revisión/i });
    expect(within(cola).getByText('Python para datos')).toBeTruthy();
    expect(within(cola).getByText('Hablar en público')).toBeTruthy();
    expect(document.querySelectorAll('svg g.mapa-nodo')).toHaveLength(2);
    // El denominador del progreso pasa a 2 (las del puente), no 8 (la muestra).
    expect(screen.getByText(/de 2 reconocidas/i)).toBeTruthy();
  });
});

// ── El mapa deja de ser muestra ─────────────────────────────────────────────
// Cuatro estados de la fuente, porque la pestaña ya no decide sola qué pintar:
// la base propia manda, y si no hay base hay que decir qué falta.
describe('la lectura de brechas_aprendizaje manda sobre la muestra', () => {
  const fila = (overrides = {}) => ({
    id: 'b-1',
    categoria: 'dura',
    titulo: 'Python para datos',
    evidencia: 'no aparece en tu CV',
    porQueImporta: 'lo piden 6 de cada 10 ofertas',
    severidad: 'alta',
    aprender: { que: 'pandas', como: 'un curso corto', comoLoDemuestro: 'un notebook publicado' },
    estado: 'confirmada',
    veredictoEn: '2026-10-30T12:00:00Z',
    dominadaEn: null,
    ...overrides,
  });

  it('sesión con filas propias: el mapa dibuja las filas y el cartel de muestra desaparece', () => {
    Object.assign(lectura, {
      conSesion: true,
      ocupacion: 'Analista de datos',
      brechas: [fila(), fila({ id: 'b-2', titulo: 'Hablar en público', categoria: 'blanda', estado: 'detectada', veredictoEn: null })],
    });
    render(<AprendizajeTab />);
    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
    // El mapa dibujó MIS filas: el nodo existe con el id que devolvió la base.
    expect(document.querySelector('svg.mapa-svg')).not.toBeNull();
    expect(document.querySelector('g[data-id-brecha="b-1"]')).not.toBeNull();
    const cola = screen.getByRole('complementary', { name: /cola de revisión/i });
    expect(within(cola).getAllByTestId('cola-item')).toHaveLength(2);
    expect(within(cola).getByText('Python para datos')).toBeTruthy();
    // 1 de 2 reconocidas: el denominador son MIS filas, no las 8 del donante.
    expect(screen.getByText(/1 de 2 reconocidas/i)).toBeTruthy();
  });

  it('sesión sin filas y sin puente: vacío real, nunca la muestra del donante', () => {
    Object.assign(lectura, { conSesion: true });
    render(<AprendizajeTab />);
    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
    expect(screen.queryByText('Comunicación escrita breve')).toBeNull();
    expect(document.querySelector('svg.mapa-svg')).toBeNull();
    expect(screen.getByText(/todavía no hay brechas tuyas/i)).toBeTruthy();
  });

  it('la sesión todavía no se resolvió: cargando, y la muestra no se adelanta', () => {
    Object.assign(lectura, { conSesion: null, cargando: true });
    render(<AprendizajeTab />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(document.querySelector('svg.mapa-svg')).toBeNull();
    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
  });

  it('la lectura falla: dice por qué y ofrece una salida', () => {
    Object.assign(lectura, { conSesion: null, error: 'Todavía no podemos leer tus brechas guardadas.' });
    render(<AprendizajeTab />);
    expect(screen.getByRole('alert').textContent).toContain('Todavía no podemos leer tus brechas guardadas.');
    expect(document.querySelector('svg.mapa-svg')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /intentarlo de nuevo/i }));
    expect(recargar).toHaveBeenCalled();
  });

  it('confirmar una brecha propia avisa a la lectura para que la recargue', () => {
    Object.assign(lectura, { conSesion: true, brechas: [fila({ estado: 'detectada', veredictoEn: null })] });
    render(<AprendizajeTab />);
    abrirFilaEnCola('Python para datos');
    fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    return waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('marcar_brecha', expect.objectContaining({ p_state: 'confirmada' }));
      // La base es la autoridad: después de escribir se vuelve a leer.
      expect(recargar).toHaveBeenCalled();
    });
  });
});

describe('cola de revisión con la máquina del huésped', () => {
  it('confirmar una pendiente enciende el nodo y sube el contador del header', () => {
    render(<AprendizajeTab />);
    const antes = Number(screen.getByText(/de 8 reconocidas/i).textContent?.match(/(\d+)/)?.[1]);
    expect(antes).toBe(3); // muestra: 1 dominada + 2 confirmadas
    expect(radioDe(ID_PENDIENTE_BLANDA)).toBe(10.5); // media
    abrirFilaEnCola('Comunicación escrita breve');
    fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    return waitFor(() => {
      expect(estadoDelNodo(ID_PENDIENTE_BLANDA)).toBe('confirmada');
      expect(screen.getByText(/4 de 8 reconocidas/i)).toBeTruthy();
      expect(rpc).toHaveBeenCalledWith('marcar_brecha', expect.objectContaining({ p_state: 'confirmada' }));
    });
  });

  it('rechazarla la apaga SIN crecerle el radio', () => {
    render(<AprendizajeTab />);
    const radioAntes = radioDe(ID_PENDIENTE_BLANDA);
    abrirFilaEnCola('Comunicación escrita breve');
    fireEvent.click(screen.getByRole('button', { name: /^No aplica/ }));
    return waitFor(() => {
      expect(estadoDelNodo(ID_PENDIENTE_BLANDA)).toBe('rechazada');
      expect(radioDe(ID_PENDIENTE_BLANDA)).toBe(radioAntes); // la severidad manda, no el estado
    });
  });

  it('dominar pide confirmación y recién después muestra anillo doble + chispa en órbita', () => {
    render(<AprendizajeTab />);
    abrirFilaEnCola('Análisis de datos con planillas o SQL'); // confirmada → habilita dominar
    fireEvent.click(screen.getByRole('button', { name: /^Ya lo aprendí/ }));
    // AUN NO dominó: pide confirmación en pantalla (es irreversible).
    expect(screen.getByText(/no se puede volver atrás/i)).toBeTruthy();
    expect(estadoDelNodo(ID_CONFIRMADA_DURA)).not.toBe('dominada');
    // Confirmar el paso.
    fireEvent.click(screen.getByRole('button', { name: /marcar como dominado/i }));
    return waitFor(() => {
      expect(estadoDelNodo(ID_CONFIRMADA_DURA)).toBe('dominada');
      const g = nodo(ID_CONFIRMADA_DURA);
      expect(g?.querySelector('circle.mapa-anillo-doble')).not.toBeNull(); // el anillo del dominado
      expect(g?.querySelector('path.mapa-chispa')).not.toBeNull(); // la chispa que orbita
      expect(g?.querySelector('g.mapa-orbita rect')).not.toBeNull(); // su caja de 84
      expect(screen.getByText(/nació un logro/i)).toBeTruthy(); // y la cola lo dice con letras
    });
  });

  it('una escritura que falla muestra el motivo y revierte el estado', () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'No encontramos ese aprendizaje entre los tuyos.' } }); // P0001: raise exception del SQL, lo unico que se muestra crudo
    render(<AprendizajeTab />);
    abrirFilaEnCola('Comunicación escrita breve');
    fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    return waitFor(() => {
      // Error visible con role=alert y el motivo legible.
      const alerta = screen.getByRole('alert');
      expect(alerta.textContent).toContain('No encontramos ese aprendizaje entre los tuyos.');
      // Reversión: el nodo vuelve a su estado anterior (pendiente, no confirmada).
      expect(estadoDelNodo(ID_PENDIENTE_BLANDA)).toBe('pendiente');
      expect(screen.getByText(/3 de 8 reconocidas/i)).toBeTruthy();
    });
  });
});

describe('la fila del siguiente paso', () => {
  // El workspace ya tiene la cronología fechada del donante (dentro del mapa) y el
  // contador de pendientes (en el título de la cola). Lo que faltaba es el
  // puntero: una sola fila que diga CUÁL sigue y cuántas quedan, y que al
  // tocarla abra ESA fila en vez de dejar al usuario buscándola.
  it('nombre el siguiente, cuente la cola y abra ESA fila al tocarlo', () => {
    render(<AprendizajeTab />);
    const puntero = screen.getByRole('button', { name: /siguiente/i });
    const titulo = (puntero.querySelector('.siguiente-titulo') as HTMLElement).textContent ?? '';
    expect(titulo.trim().length).toBeGreaterThan(3);
    // La muestra tiene 5 pendientes de 8 (3 ya reconocidas).
    expect(puntero.textContent).toMatch(/Quedan 5 en la cola/);
    // El destino está declarado, no deducido: aria-controls nombra a la fila.
    const destino = puntero.getAttribute('aria-controls');
    expect(destino).toBeTruthy();
    fireEvent.click(puntero);
    const toggle = document.querySelector(`#${destino} .cola-toggle`) as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('sin pendientes no hay botón: la cola se declara libre con letras', () => {
    Object.assign(lectura, {
      conSesion: true,
      brechas: [
        { id: 'l-1', categoria: 'dura', titulo: 'Python para datos', evidencia: 'no aparece',
          porQueImporta: 'lo piden', severidad: 'alta',
          aprender: { que: 'pandas', como: 'curso', comoLoDemuestro: 'notebook' },
          estado: 'confirmada', veredictoEn: '2026-10-30T12:00:00Z', dominadaEn: null },
        { id: 'l-2', categoria: 'blanda', titulo: 'Hablar en público', evidencia: 'sin ejemplos',
          porQueImporta: 'liderazgo', severidad: 'media',
          aprender: { que: 'oratoria', como: 'práctica', comoLoDemuestro: 'una charla' },
          estado: 'rechazada', veredictoEn: null, dominadaEn: null },
      ],
    });
    render(<AprendizajeTab />);
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/cola libre/i);
  });
  it('Escape con foco en la fila la colapsa; fuera de la cola no hace nada', () => {
    render(<AprendizajeTab />);
    abrirFilaEnCola('Comunicación escrita breve');
    const toggle = toggleDe('Comunicación escrita breve');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    // El Escape de la cola NO es un listener de documento: el modal de activación
    // también usa Escape y dos dueños para la misma tecla cierran las dos cosas.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(toggle, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('invariante de modo (el mapa no se reinventa al interactuar)', () => {
  it('el primer render es naciendo y tras confirmar el nodo pasa a vivo (brilla, no renace)', async () => {
    render(<AprendizajeTab />);
    // naciendo: los delays NO están todos a 0 (corren los del stagger del modelo).
    const trazos = Array.from(document.querySelectorAll<HTMLElement>('svg line.mapa-arista'));
    expect(trazos.length).toBeGreaterThan(8);
    expect(trazos.some((t) => t.style.animationDelay !== '0ms')).toBe(true);
    abrirFilaEnCola('Comunicación escrita breve');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    });
    // vivo: el nodo cambiado hace brillar (recienId) y los delays pasan a 0.
    const conDelay = Array.from(document.querySelectorAll<HTMLElement>('[style*="animation-delay"]'));
    expect(conDelay.every((el) => el.style.animationDelay === '0ms')).toBe(true);
    expect(document.querySelector('g.mapa-brillar')).not.toBeNull();
  });
});

// ── Hallazgo C · el invitado que ya subió su CV ──────────────────────────────
// Lo que el usuario veía: sube su CV, el análisis termina, y el home sigue
// pintando el mapa de OTRA persona (la muestra del donante) hasta la próxima
// recarga. Dos causas, dos pruebas: la muestra ya no se adelanta cuando este
// navegador leyó un CV, y el puente se ESCUCHA en vez de leerse una sola vez.
describe('el invitado que ya leyó su CV', () => {
  it('con el CV leído y sin brechas: la muestra del donante desaparece y lo dice', () => {
    localStorage.setItem(PUENTE_KEY, '[]');
    render(<AprendizajeTab />);
    expect(screen.getByText(AVISO_VACIO.cv_sin_brechas.titulo)).toBeTruthy();
    expect(screen.getByText(AVISO_VACIO.cv_sin_brechas.hint)).toBeTruthy();
    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
    // Sin mapa no hay svg: pintar 8 nodos ajenos debajo del aviso sería el disfraz.
    expect(document.querySelector('svg.mapa-svg')).toBeNull();
  });

  it('el puente que llega después del montaje repinta: nada de esperar una recarga', () => {
    render(<AprendizajeTab />);
    // Sin CV todavía: la demo del donante vale como muestra etiquetada.
    expect(screen.getByText(AVISO_MUESTRA)).toBeTruthy();

    act(() => { puenteBrechasInvitado.escribir([BRECHA_TAB]); });

    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
    const cola = screen.getByRole('complementary', { name: /cola de revisión/i });
    expect(within(cola).getByText(/Excel avanzado/i)).toBeTruthy();
    expect(within(cola).getAllByTestId('cola-item')).toHaveLength(1);
  });

  it('sesión real sin filas y sin CV en este navegador: se le pide el CV', () => {
    Object.assign(lectura, { conSesion: true, brechas: [] });
    render(<AprendizajeTab />);
    // `sin_cv` y `cv_sin_brechas` no se parecen: al que no ha subido nada no se le
    // dice que su CV no alcanzó.
    expect(screen.getByText(AVISO_VACIO.sin_cv.titulo)).toBeTruthy();
    expect(screen.queryByText(AVISO_VACIO.cv_sin_brechas.titulo)).toBeNull();
    expect(screen.queryByText(AVISO_MUESTRA)).toBeNull();
  });
});
