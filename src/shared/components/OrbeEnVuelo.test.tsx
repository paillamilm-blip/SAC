// shared/components/OrbeEnVuelo.test.tsx
// El descenso del orbe: la continuidad de escena entre el orbe de la franja y la
// raíz dorada del mapa.
//
// QUÉ SE PUEDE PROBAR ACÁ Y QUÉ NO. jsdom 25 no implementa `getScreenCTM` en
// SVGSVGElement y no trae `DOMPoint`: son las dos piezas con las que el componente
// traduce el viewBox a píxeles de pantalla. Por eso el fixture se las da en la
// instancia — una matriz afín y un punto que la aplica — y prueba EL CABLE: que
// los números del DOM terminan en el estilo del fantasma, en el orden correcto, y
// que el vuelo se planta una sola vez. La traducción contra un mapa real se midió
// en el navegador: franja de 30px en (28,28) → raíz de 60px en (238,157),
// aterrizando con scale 2 sobre su centro.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { OrbeEnVuelo, trayectoriaOrbe, type Circulo } from './OrbeEnVuelo';

// La franja mide 30px y su centro cae en (115, 27).
const FRANJA = { left: 100, top: 12, width: 30, height: 30 };
const CENTRO_FRANJA = { x: FRANJA.left + FRANJA.width / 2, y: FRANJA.top + FRANJA.height / 2 };
// El viewBox dice centro (320,320) y diámetro 141,6; con a=d=0,5, e=-40, f=20 eso
// es (120,180) de pantalla midiendo 70,8px. Estos dos números son literales del
// fixture, NO una recomposición de la fórmula que se quiere probar.
const ATERRIZAJE = { x: 120, y: 180, d: 70.8 };
const CTM = { a: 0.5, d: 0.5, e: -40, f: 20 };

const rect = (el: Element): void => {
  el.getBoundingClientRect = () =>
    ({
      ...FRANJA,
      right: FRANJA.left + FRANJA.width,
      bottom: FRANJA.top + FRANJA.height,
      x: FRANJA.left,
      y: FRANJA.top,
      toJSON: () => ({}),
    }) as DOMRect;
};

interface Escena {
  franja: HTMLElement;
  svg: SVGSVGElement;
}

const monta = (): Escena => {
  const franja = document.createElement('span');
  franja.setAttribute('data-orbe', 'franja');
  rect(franja);
  document.body.appendChild(franja);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'mapa-svg');
  svg.setAttribute('data-orbe-x', '320');
  svg.setAttribute('data-orbe-y', '320');
  svg.setAttribute('data-orbe-d', '141.6');
  (svg as unknown as { getScreenCTM: () => typeof CTM }).getScreenCTM = () => CTM;
  document.body.appendChild(svg);

  class Punto {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    matrixTransform(m: typeof CTM): { x: number; y: number } {
      return { x: this.x * m.a + m.e, y: this.y * m.d + m.f };
    }
  }
  vi.stubGlobal('DOMPoint', Punto);
  return { franja, svg };
};

const sinATERRIZAJE = (fantasma: HTMLElement | null): boolean => fantasma === null;

// jsdom 25 no trae TransitionEvent, así que `fireEvent.transitionEnd` fabricaba
// un evento sin `propertyName` — y esa propiedad es justo lo que el componente
// filtra. El evento se arma a mano con su contenido.
const finDeTransicion = (el: HTMLElement, propertyName: string): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName }));
  });
};

const vuela = (): { lee: () => HTMLElement | null; onPlantado: ReturnType<typeof vi.fn> } => {
  const onPlantado = vi.fn();
  render(<OrbeEnVuelo color="teal" onPlantado={onPlantado} />);
  return { lee: () => document.querySelector<HTMLElement>('[data-orbe="vuelo"]'), onPlantado };
};

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('trayectoriaOrbe: de dos círculos a un cuadro que vuela', () => {
  it('el cuadro de partida es el origen y el delta va de centro a centro', () => {
    const origen: Circulo = { x: 100, y: 50, d: 30 };
    const destino: Circulo = { x: 400, y: 300, d: 120 };
    expect(trayectoriaOrbe(origen, destino)).toEqual({
      izquierda: 85,
      superior: 35,
      lado: 30,
      dx: 300,
      dy: 250,
      escala: 4,
    });
  });

  it('un origen de diámetro cero escala 1: nadie divide por cero', () => {
    expect(trayectoriaOrbe({ x: 0, y: 0, d: 0 }, { x: 10, y: 10, d: 40 }).escala).toBe(1);
  });
});

describe('cuando no hay escena completa, no hay vuelo', () => {
  it('sin franja ni mapa el orbe se planta enseguida y no pinta fantasma', () => {
    const { lee, onPlantado } = vuela();
    expect(onPlantado).toHaveBeenCalledTimes(1);
    expect(sinATERRIZAJE(lee())).toBe(true);
  });

  it('con prefers-reduced-motion tampoco: la escena llega ya armada', () => {
    monta();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q }));
    const { lee, onPlantado } = vuela();
    expect(onPlantado).toHaveBeenCalledTimes(1);
    expect(sinATERRIZAJE(lee())).toBe(true);
  });

  it('sin el atributo de aterrizaje no vuela: ese data-* es el contrato', () => {
    const { svg } = monta();
    svg.removeAttribute('data-orbe-d');
    const { lee, onPlantado } = vuela();
    expect(onPlantado).toHaveBeenCalledTimes(1);
    expect(sinATERRIZAJE(lee())).toBe(true);
  });

  it('una franja de ancho cero es un blanco que no existe', () => {
    const { franja } = monta();
    (franja as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
      () => ({ width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const { lee, onPlantado } = vuela();
    expect(onPlantado).toHaveBeenCalledTimes(1);
    expect(sinATERRIZAJE(lee())).toBe(true);
  });
});

describe('el vuelo', () => {
  it('despega en el sitio exacto del orbe de la franja, con su tamaño', () => {
    monta();
    const { lee } = vuela();
    const el = lee();
    expect(el).not.toBeNull();
    // izquierda = centro − lado/2 = 115 − 15; superior = 27 − 15.
    expect(el?.style.left).toBe('100px');
    expect(el?.style.top).toBe('12px');
    expect(el?.style.width).toBe('30px');
    expect(el?.style.transform).toBe('none');
    expect(el?.style.opacity).toBe('1');
  });

  it('se suelta hacia la raíz: traduce hasta su centro y escala hasta su diámetro', async () => {
    monta();
    const { lee } = vuela();
    const el = lee() as HTMLElement;
    await waitFor(() => expect(el.style.transform).not.toBe('none'));
    expect(el.style.transform).toBe(
      `translate(${ATERRIZAJE.x - CENTRO_FRANJA.x}px, ${ATERRIZAJE.y - CENTRO_FRANJA.y}px) scale(${ATERRIZAJE.d / FRANJA.width})`,
    );
    expect(el.style.opacity).toBe('0');
    // Solo propiedades compuestas: nada de layout animado (contrato de movimiento).
    expect(el.style.transition).toContain('transform');
    expect(el.style.transition).not.toMatch(/width|height|top|left|margin|padding/);
  });

  it('se planta una sola vez, y sólo cuando termina el transform', async () => {
    monta();
    const { lee, onPlantado } = vuela();
    const el = lee() as HTMLElement;
    await waitFor(() => expect(el.style.transform).not.toBe('none'));
    finDeTransicion(el, 'opacity');
    expect(onPlantado).not.toHaveBeenCalled();
    finDeTransicion(el, 'transform');
    expect(onPlantado).toHaveBeenCalledTimes(1);
    finDeTransicion(el, 'transform');
    expect(onPlantado).toHaveBeenCalledTimes(1);
  });
});
