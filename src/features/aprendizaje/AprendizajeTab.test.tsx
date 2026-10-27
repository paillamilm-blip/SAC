// features/aprendizaje/AprendizajeTab.test.tsx
// B4 · test de montaje del mapa. NO prueba geometría (eso ya lo fija
// MapaCapacidades.test.tsx contra el golden): prueba EL ANDAMIO — que la pestaña
// pinta el workspace de dos columnas, que la fuente de datos se resuelve
// (puente lleno vs muestra etiquetada), y que la cola obedece la máquina de
// estados DEL HUÉSPED con escritura optimista que revierte si el RPC falla.
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

import AprendizajeTab from './AprendizajeTab';

const PUENTE_KEY = 'omicron.brechas.puente';
const AVISO_MUESTRA = 'Análisis de muestra · sin IA conectada';

// ids literales del fixture __fixtures__/analisis-donante.json (no los invento).
const ID_PENDIENTE_BLANDA = '05d2bb7c-8201-482f-b1e6-e8f33ae064de'; // Comunicación escrita breve
const ID_CONFIRMADA_DURA = '7c9c5b7b-c3c0-4c7f-9b50-db5d345b11b4'; // Análisis de datos (confirmada, sin dominar)

// El radio lo fija la SEVERIDAD (alta 14 / media 11.5 / baja 9.5), no el estado.
const radioDe = (id: string): number => {
  const g = document.querySelector(`g[data-id-brecha="${id}"]`);
  const circ = g?.querySelector('circle[data-rol-fill]');
  return Number(circ?.getAttribute('r'));
};

const claseBrecha = (id: string): string => {
  const g = document.querySelector(`g[data-id-brecha="${id}"]`);
  return g?.getAttribute('class') ?? '';
};

const okRpc = () => rpc.mockResolvedValue({ data: { id: 'x' }, error: null });

beforeEach(() => {
  localStorage.clear();
  rpc.mockReset();
  okRpc();
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
});

describe('fuente de las brechas', () => {
  it('puente vacío: aparece el aviso de muestra y las 8 brechas del fixture, etiquetada como muestra', () => {
    render(<AprendizajeTab />);
    expect(screen.getByText(AVISO_MUESTRA)).toBeTruthy();
    const cola = screen.getByRole('complementary', { name: /cola de revisión/i });
    expect(within(cola).getAllByTestId('cola-item')).toHaveLength(8);
    // Un titulo literal del fixture, presente.
    expect(screen.getByText('Comunicación escrita breve')).toBeTruthy();
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
    expect(screen.getByText('Python para datos')).toBeTruthy();
    expect(screen.getByText('Hablar en público')).toBeTruthy();
    // El denominador del progreso pasa a 2 (las del puente), no 8 (la muestra).
    expect(screen.getByText(/de 2 reconocidas/i)).toBeTruthy();
  });
});

describe('cola de revisión con la máquina del huésped', () => {
  const abrirFila = (titulo: string) => {
    const boton = screen.getByRole('button', { name: new RegExp(titulo, 'i') });
    fireEvent.click(boton);
  };

  it('confirmar una pendiente enciende el nodo y sube el contador del header', () => {
    render(<AprendizajeTab />);
    const antes = Number(screen.getByText(/de 8 reconocidas/i).textContent?.match(/(\d+)/)?.[1]);
    expect(antes).toBe(3); // muestra: 1 dominada + 2 confirmadas
    expect(radioDe(ID_PENDIENTE_BLANDA)).toBe(11.5); // media
    abrirFila('Comunicación escrita breve');
    fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    return waitFor(() => {
      expect(claseBrecha(ID_PENDIENTE_BLANDA)).toContain('mapa-brecha-confirmada');
      expect(screen.getByText(/4 de 8 reconocidas/i)).toBeTruthy();
      expect(rpc).toHaveBeenCalledWith('marcar_brecha', expect.objectContaining({ p_state: 'confirmada' }));
    });
  });

  it('rechazarla la apaga SIN crecerle el radio', () => {
    render(<AprendizajeTab />);
    const radioAntes = radioDe(ID_PENDIENTE_BLANDA);
    abrirFila('Comunicación escrita breve');
    fireEvent.click(screen.getByRole('button', { name: /^No aplica/ }));
    return waitFor(() => {
      expect(claseBrecha(ID_PENDIENTE_BLANDA)).toContain('mapa-brecha-rechazada');
      expect(radioDe(ID_PENDIENTE_BLANDA)).toBe(radioAntes); // la severidad manda, no el estado
    });
  });

  it('dominar pide confirmación y recién después muestra anillo + palomita + micro-logro', () => {
    render(<AprendizajeTab />);
    abrirFila('Análisis de datos con planillas o SQL'); // confirmada → habilita dominar
    fireEvent.click(screen.getByRole('button', { name: /^Ya lo aprendí/ }));
    // AUN NO dominó: pide confirmación en pantalla (es irreversible).
    expect(screen.getByText(/no se puede volver atrás/i)).toBeTruthy();
    expect(claseBrecha(ID_CONFIRMADA_DURA)).not.toContain('mapa-brecha-dominada');
    // Confirmar el paso.
    fireEvent.click(screen.getByRole('button', { name: /marcar como dominado/i }));
    return waitFor(() => {
      expect(claseBrecha(ID_CONFIRMADA_DURA)).toContain('mapa-brecha-dominada');
      const g = document.querySelector(`g[data-id-brecha="${ID_CONFIRMADA_DURA}"]`);
      expect(g?.querySelector('circle.mapa-anillo')).not.toBeNull(); // anillo
      expect(g?.querySelector('path[data-rol-stroke="tinta-sobre-nodo"]')).not.toBeNull(); // palomita
      expect(screen.getByText(/nació un logro/i)).toBeTruthy(); // micro-logro
    });
  });

  it('una escritura que falla muestra el motivo y revierte el estado', () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'No encontramos ese aprendizaje entre los tuyos.' } });
    render(<AprendizajeTab />);
    abrirFila('Comunicación escrita breve');
    fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    return waitFor(() => {
      // Error visible con role=alert y el motivo legible.
      const alerta = screen.getByRole('alert');
      expect(alerta.textContent).toContain('No encontramos ese aprendizaje entre los tuyos.');
      // Reversión: el nodo vuelve a su estado anterior (pendiente, no confirmada).
      expect(claseBrecha(ID_PENDIENTE_BLANDA)).toContain('mapa-brecha-pendiente');
      expect(screen.getByText(/3 de 8 reconocidas/i)).toBeTruthy();
    });
  });
});

describe('invariante de modo (el mapa no se reinventa al interactuar)', () => {
  it('el primer render es naciendo y tras confirmar el nodo pasa a vivo (brilla, no renace)', async () => {
    render(<AprendizajeTab />);
    // naciendo: los delays NO están a 0 (corren los del golden).
    const trazos = Array.from(document.querySelectorAll<HTMLElement>('svg .mapa-trazo'));
    expect(trazos.some((t) => t.style.animationDelay !== '0ms')).toBe(true);
    abrirFilaSinHelper();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Es real/ }));
    });
    // vivo: el nodo cambiado hace brillar (recienId) y los delays pasan a 0.
    const conDelay = Array.from(document.querySelectorAll<HTMLElement>('[style*="animation-delay"]'));
    expect(conDelay.every((el) => el.style.animationDelay === '0ms')).toBe(true);
    expect(document.querySelector('g.mapa-brillar')).not.toBeNull();
  });
});

function abrirFilaSinHelper() {
  fireEvent.click(screen.getByRole('button', { name: /Comunicación escrita breve/i }));
}
