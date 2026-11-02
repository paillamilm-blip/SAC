// features/omicron/components/OrbOnboarding.test.tsx
// ═══════════════════════════════════════════════════════════════════════
// Hallazgo A · el nacimiento del Gemelo no puede inventar nada.
//
// Este andamio es el único lugar de la app donde un perfil se escribe antes de
// medir algo. La vara: de una declaración de una frase sale SOLO lo declarado.
// Nada de ejes rellenos, nada de "8 años" imaginados, nada del trío de
// habilidades blandas que el generador anterior repartía cuando no entendía.
//
// Se prueba montando el flujo real (color → declaración → nacimiento), no la
// función suelta: perfilDeclaracion.test.tsx ya fija la aritmética; acá se fija
// el CABLE — qué le llega al huésped y qué queda guardado para el mapa.
//
// El navegador embebido de la herramienta está oculto y congela request-
// Animation-Frame (0 frames/s medidos), así que AnimatePresence mode="wait"
// nunca avanza de paso y el recorrido vivo es imposible. En jsdom el loop sí
// corre: acá, no en pantalla.
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error node:fs no tiene tipos en este repo (misma convención que contratoMapa.test.ts)
import { readFileSync } from 'node:fs';

const { speak, useAppProfile } = vi.hoisted(() => ({
  speak: vi.fn(),
  useAppProfile: { current: null as unknown },
}));

// El color y el audio viven fuera de esta prueba. spatialAudio construye un
// AudioContext y escucha matchMedia en el constructor: ruído que no pertenece
// al contrato del perfil.
vi.mock('@/shared/utils/spatialAudio', () => ({
  audioHum: vi.fn(), audioTick: vi.fn(), audioAscend: vi.fn(), audioConfirm: vi.fn(),
}));
vi.mock('@/shared/utils/haptics', () => ({
  hapticLight: vi.fn(), hapticMedium: vi.fn(), hapticSuccess: vi.fn(),
}));
vi.mock('@/shared/components/LivePulseBar', () => ({ firePulse: vi.fn() }));
vi.mock('@/features/omicron/services/voice', () => ({ speakOmicron: (...a: unknown[]) => speak(...a) }));
vi.mock('@/store/AppContext', () => ({ useApp: () => ({ profile: useAppProfile.current }) }));
// El aviso se escribe carácter a carácter y el overlay se va a los 4 s del envío:
// en un jsdom lento la carrera es del reveal, no del contrato. Se monta el texto
// completo, que es exactamente lo que hace el componente bajo reduced-motion.
vi.mock('@/shared/motion/TextReveal', () => ({
  TextReveal: ({ text }: { text: string }) => createElement('span', null, text),
}));

import { OrbOnboarding } from './OrbOnboarding';
import { MENSAJE_NACIMIENTO } from '../utils/perfilDeclaracion';

// jsdom no trae matchMedia y CelebrationBurst/TextReveal lo consultan para
// saber si hay que mover menos. Se miente "sí se mueve": la prueba del contrato
// del perfil no va por ahí, y reduced-motion ya tiene su propio test.
if (!window.matchMedia) {
  window.matchMedia = (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);
}

const GUEST_KEY = 'omicron_guest_profile';
const ONBOARDING_KEY = 'omicron_onboarding_done';

// El recorrido real del nacimiento se mira en pantalla y tarda unos 4 s: 2 s de
// despertar del orbe + 1,8 s de crecimiento + el aviso que se escribe carácter a
// carácter. El timeout por defecto (5 s) corta la mitad.
const FLUJO_COMPLETO = 20000;

const color = (nombre: string) =>
  document.querySelector<HTMLElement>(`button[aria-label="Color ${nombre}"]`);
const boton = (texto: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find((b) => (b.textContent || '').trim().includes(texto));

/** Color → Continuar → declarar una profesión. Deja el componente en 'growing'. */
async function declarar(texto: string) {
  await waitFor(() => expect(color('Ámbar')).toBeTruthy(), { timeout: 6000 });
  await act(async () => { color('Ámbar')?.click(); });
  await waitFor(() => expect(boton('Continuar')?.disabled).toBe(false));
  await act(async () => { boton('Continuar')?.click(); });

  const campo = await waitFor(() => {
    const i = document.querySelector<HTMLInputElement>('input[placeholder]');
    if (!i) throw new Error('el paso de la declaración no montó');
    return i;
  }, { timeout: 6000 });

  await act(async () => { fireEvent.change(campo, { target: { value: texto } }); });
  await act(async () => { fireEvent.submit(campo.closest('form')!); });
}

/**
 * Espera a que el recorrido termine SOLO. El componente programa sus fases con
 * setTimeout y React no los cancela al desmontar: un test que se corta en el
 * nacimiento deja una alarma suelta que escribe `omicron_onboarding_done` dos
 * segundos dentro del test siguiente, y ese test nace con el overlay apagado.
 * Acá el árbol montado es sólo el onboarding, así que cuerpo vacío = 'done'.
 */
async function drenar() {
  await waitFor(() => expect((document.body.textContent || '').trim()).toBe(''), { timeout: FLUJO_COMPLETO });
}

beforeEach(() => {
  localStorage.clear();
  speak.mockClear();
  useAppProfile.current = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('el Gemelo que nace de una declaración', () => {
  it('lleva exactamente lo declarado y los cuatro ejes en cero', async () => {
    const generado = vi.fn();
    render(<OrbOnboarding onComplete={vi.fn()} onProfileGenerated={generado} />);

    await declarar('Soy abogada con 12 años de familia');

    await waitFor(() => expect(generado).toHaveBeenCalledTimes(1));
    const perfil = generado.mock.calls[0][0];
    expect(perfil.profession).toBe('abogada');
    expect(perfil.years).toBe(12);
    // El punto del Hallazgo A: antes los ejes salían rellenados (mínimo 20) y
    // el CV nunca los había tocado. Cero es "todavía no se midió".
    expect(perfil.axes).toEqual({ exec: 0, qual: 0, trans: 0, fund: 0 });
    // 'Derecho' porque él dijo 'abogada': la etiqueta sale de la palabra, no de
    // una terna de relleno.
    expect(perfil.skills).toEqual(['Derecho']);
    await drenar();
  }, FLUJO_COMPLETO);

  it('guarda para el mapa el mismo perfil honesto, no una versión inflada', async () => {
    render(<OrbOnboarding onComplete={vi.fn()} />);
    await declarar('Trabajo como electricista con 3 años');

    // El guardado es un import dinámico: se espera a que la llave exista.
    const guardado = await waitFor(() => {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) throw new Error('todavía no hay perfil guest guardado');
      return JSON.parse(raw);
    }, { timeout: 6000 });

    expect(guardado).toMatchObject({
      profession: 'electricista',
      years: 3,
      skills: ['Técnico'],
      axes: { exec: 0, qual: 0, trans: 0, fund: 0 },
      seniorLabel: 'Profesional Mid',
    });
    expect(guardado.summary).toBe('Electricista, 3 años de experiencia.');
    await drenar();
  }, FLUJO_COMPLETO);

  it('sin años dichos no inventa ni años ni categoría senior', async () => {
    const generado = vi.fn();
    render(<OrbOnboarding onComplete={vi.fn()} onProfileGenerated={generado} />);
    await declarar('Soy diseñadora de videojuegos');

    await waitFor(() => expect(generado).toHaveBeenCalled());
    expect(generado.mock.calls[0][0].years).toBe(0);
    expect(generado.mock.calls[0][0].seniorLabel).toBe('');
    await drenar();
  }, FLUJO_COMPLETO);

  it('avisa el nacimiento con la frase pactada y no promete dominio', async () => {
    render(<OrbOnboarding onComplete={vi.fn()} />);
    await declarar('Soy nutricionista');

    // El nacimiento se programa con setTimeout dentro del componente: React sólo
    // aplica los updates que caen dentro de act(), así que se deja correr el
    // reloj ahí adentro (1,8 s de crecimiento + margen).
    await act(async () => { await new Promise((r) => setTimeout(r, 2200)); });

    expect(speak).toHaveBeenCalledWith(MENSAJE_NACIMIENTO);
    const enPantalla = (document.body.textContent || '').trim();
    // El texto que se dice por voz y el que se lee en pantalla son el mismo,
    // carácter por carácter (el reveal está montado completo, ver arriba).
    expect(enPantalla).toContain('GEMELO DIGITAL ACTIVADO');
    expect(enPantalla).toContain(MENSAJE_NACIMIENTO);
    expect(enPantalla).not.toMatch(/domin/i);

    await drenar();
    // La bandera de "ya hice el onboarding" se enciende al cierre, no al
    // nacimiento: escrita en el mismo lote que setStep('born'), el aviso se
    // montaba oculto y nadie lo leía (shouldHide se evalúa en cada render).
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true');
  }, FLUJO_COMPLETO);

  it('la cuenta sigue el flujo: a los 4 s entrega el intento y el overlay se va', async () => {
    const completo = vi.fn();
    render(<OrbOnboarding onComplete={completo} />);
    await declarar('Busco trabajo y sé React');

    await waitFor(() => expect(completo).toHaveBeenCalledWith('empleo'), { timeout: 8000 });
    await waitFor(() => expect(document.querySelector('input[placeholder]')).toBeNull());
    await drenar();
  }, FLUJO_COMPLETO);
});

describe('la invención no vuelve por el costado', () => {
  it('el onboarding ya no le pide a la IA que rellene el perfil', () => {
    const fuente = readFileSync('src/features/omicron/components/OrbOnboarding.tsx', 'utf8');
    expect(fuente).not.toMatch(/PROFILE_PROMPT/);
    expect(fuente).not.toMatch(/callAI\s*\(/);
    expect(fuente).not.toMatch(/quickSkillsFromText/);
  });

  it('el huésped guarda sin porcentajes por habilidad: el CV los mide o no hay', () => {
    const fuente = readFileSync('src/features/omicron/components/OrbShell.tsx', 'utf8');
    const llamada = fuente.match(/aplicar_analisis_cv',\s*\{[\s\S]{0,700}?\}\s*\)/);
    expect(llamada, 'la escritura del perfil al nacimiento sigue siendo aplicar_analisis_cv').toBeTruthy();
    expect(llamada![0]).toMatch(/p_skills_detail:\s*\[\]/);
    expect(llamada![0]).not.toMatch(/p_skills_detail:\s*\[[^\]]/);
  });
});
