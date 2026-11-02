// features/omicron/components/EscaneoDocumento.test.tsx
// Dos cosas se prueban acá, y ninguna es cosmética:
//   · La silueta se DIBUJA desde el texto real. Si mañana alguien la cambia por
//     renglones de adorno, estos tests se rompen.
//   · La luz sigue a los hitos: la fracción iluminada es la fracción de hechos.
// framer-motion se reemplaza por un shim que monta el elemento de SVG plano y
// aplana `animate` sobre sus atributos: así el color del trazo se lee en el DOM
// sin depender del reloj de la animación, y `useReducedMotion` se controla.
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const reduce = { actual: false };

vi.mock('framer-motion', async () => {
  const { createElement, Fragment } = await import('react');
  const envoltura = (etiqueta: string) => {
    const Componente = (props: Record<string, unknown>) => {
      const pintura = typeof props.animate === 'object' && props.animate !== null ? props.animate as object : {};
      const fijos = new Set(['initial', 'transition', 'animate']);
      const resto = Object.fromEntries(Object.entries(props).filter(([clave]) => !fijos.has(clave)));
      return createElement(etiqueta, { ...resto, ...pintura });
    };
    return Componente;
  };
  return {
    useReducedMotion: () => reduce.actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
    motion: new Proxy({}, { get: (_t, etiqueta) => envoltura(String(etiqueta)) }),
  };
});

import { C } from '@/theme';
import {
  EscaneoDocumento, renglonesDe, trazosDeDocumento, trazosEncendidos,
} from './EscaneoDocumento';
import { escaneoInicial, fraccionEscaneo, marcarHito, type Hito } from '@/hooks/useGemeloActivation';

// Cinco renglones con renglón en el medio, un título largo que no lo parece y
// tres cortos que sí. Los números del test salen de acá, no del componente.
const CV = [
  'Marina Herrera',                                            // 14 → piso 34
  'Ingeniera en Informática',                                  // 24 → 53
  'EXPERIENCIA',                                               // título
  'Lead Developer en BancoEstado, ocho años de experiencia con equipos de producto',
  '',
  'FORMACIÓN',                                                 // título
].join('\n');

const conHechosLista = (n: number): Hito[] =>
  escaneoInicial().reduce<Hito[]>(
    (acc, h, i) => (i < n ? marcarHito(acc, h.id, 'hecho', `m${i}`) : acc),
    escaneoInicial(),
  );

afterEach(() => { reduce.actual = false; });

describe('la silueta sale del documento, no de un adorno', () => {
  it('un renglón en blanco no es renglón', () => {
    expect(renglonesDe('a\n\n  \nb \n')).toBe(2);
  });

  it('cada trazo tiene el alto y el ancho de SU línea, escalonado desde y=32', () => {
    const trazos = trazosDeDocumento(CV);
    expect(trazos).toHaveLength(5);                     // el vacío no se dibuja
    expect(trazos[0].y).toBe(32);
    expect(trazos[1].y).toBeCloseTo(39.6, 5);
    expect(trazos[4].y).toBeCloseTo(62.4, 5);
    expect(trazos[0].w).toBe(34);                       // 'Marina Herrera' no baja del piso
    expect(trazos[1].w).toBe(53);                       // 24 caracteres × 2,2
    expect(trazos[3].w).toBe(172);                      // el techo del viewBox
    expect(trazos[2].titulo).toBe(true);                // 'EXPERIENCIA'
    expect(trazos[2].h).toBe(4);
    expect(trazos[3].titulo).toBe(false);               // largo y termina en 'producto'
    expect(trazos[3].h).toBe(3);
  });

  it('la proporción se topa con el techo y con 32 renglones, no se desborda', () => {
    expect(trazosDeDocumento('x'.repeat(400))).toEqual([{ y: 32, w: 172, h: 3, titulo: false }]);
    const largo = Array.from({ length: 50 }, (_, i) => `renglón ${i + 10}`).join('\n');
    expect(trazosDeDocumento(largo)).toHaveLength(32);
    expect(renglonesDe(largo)).toBe(50);                // el resumen cuenta TODOS
  });
});

describe('la luz sigue a los hitos', () => {
  it('cero hechos, cero trazos encendidos; seis hechos, todos', () => {
    const trazos = trazosDeDocumento(CV);
    expect(trazosEncendidos(trazos, 0)).toBe(0);
    expect(trazosEncendidos(trazos, 1)).toBe(trazos.length);
    expect(trazosEncendidos(trazos, 2 / 6)).toBe(2);
    expect(trazosEncendidos(trazos, 4 / 6)).toBe(3);
  });

  it('el SVG cuenta el documento real y el estado del escaneo', () => {
    render(<EscaneoDocumento texto={CV} hitos={conHechosLista(2)} />);
    const resumen = screen.getByRole('img').textContent ?? '';
    expect(resumen).toContain('5 renglones');
    expect(resumen).toContain('2 trazos encendidos');
    expect(resumen).toContain('2 de 6 hitos');
  });

  it('el porcentaje pedido es el de los hechos, no un avance a ojo', () => {
    render(<EscaneoDocumento texto={CV} hitos={conHechosLista(2)} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('33');
  });

  it('los trazos encendidos son los primeros, en ámbar; el resto, en su color', () => {
    reduce.actual = true;                    // sin animación: el reposo es el estado
    const { container } = render(<EscaneoDocumento texto={CV} hitos={conHechosLista(4)} />);
    const rellenos = [...container.querySelectorAll('svg rect')].map((r) => r.getAttribute('fill'));
    expect(rellenos.filter((f) => f === C.gold)).toHaveLength(3);    // los 3 primeros de 5
    expect(rellenos.filter((f) => f === C.mut)).toHaveLength(1);     // 'FORMACIÓN', título apagado
    expect(rellenos.filter((f) => f === C.line)).toHaveLength(1);    // el renglón largo, apagado
    expect(rellenos.filter((f) => f === C.surface)).toHaveLength(1); // el marco del documento
  });

  it('cada hito muestra su medida escrita: el estado no va sólo por color', () => {
    render(<EscaneoDocumento texto={CV} hitos={conHechosLista(1)} />);
    expect(screen.getByText('Tu documento').textContent).toBeTruthy();
    expect(screen.getByText('m0').textContent).toBe('m0');
    expect(screen.getByText('Gemelo listo').textContent).toBeTruthy();
  });
});

describe('el haz y el movimiento reducido', () => {
  it('con movimiento normal hay un haz que barre con el gesto de la familia', () => {
    const { container } = render(<EscaneoDocumento texto={CV} hitos={escaneoInicial()} />);
    const haz = container.querySelector('rect[fill^="url("]');
    expect(haz).not.toBeNull();
    expect(haz?.getAttribute('style') ?? '').toContain('omi-barrido');
  });

  it('con movimiento reducido el haz no se dibuja: la barra y los hitos ya lo dicen', () => {
    reduce.actual = true;
    const { container } = render(<EscaneoDocumento texto={CV} hitos={escaneoInicial()} />);
    expect(container.querySelector('rect[fill^="url("]')).toBeNull();
  });

  it('un documento sin renglones no pone un haz a barrer el vacío', () => {
    const { container } = render(<EscaneoDocumento texto="   " hitos={escaneoInicial()} />);
    expect(container.querySelector('rect[fill^="url("]')).toBeNull();
    expect(fraccionEscaneo(escaneoInicial())).toBe(0);
  });
});
