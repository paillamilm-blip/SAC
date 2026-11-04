import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/supabase/client', () => ({ supabase: {} }));
vi.mock('../services/credencial', () => ({ emitirCredencial: vi.fn() }));

import { emitirCredencial } from '../services/credencial';
import CompartirCredencial from './CompartirCredencial';

const emitir = vi.mocked(emitirCredencial);
const ENLACE = 'https://sac-omi.vercel.app/?verificar=abc.def';

beforeEach(() => {
  emitir.mockReset().mockResolvedValue({ ok: true, datos: { enlace: ENLACE, habilidades: 2, vence: Date.UTC(2027, 10, 3, 12) } });
});
function simularPortapapeles(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('CompartirCredencial', () => {
  it('no aparece sin sesión ni sin habilidades dominadas con prueba', () => {
    const a = render(<CompartirCredencial sesionIniciada={false} dominadas={3} />);
    expect(a.container.textContent).toBe('');
    a.unmount();
    const b = render(<CompartirCredencial sesionIniciada dominadas={0} />);
    expect(b.container.textContent).toBe('');
  });

  it('explica qué se comparte antes de crear nada', () => {
    render(<CompartirCredencial sesionIniciada dominadas={1} />);
    expect(screen.getByRole('heading', { name: 'Comparte lo que demostraste' })).toBeTruthy();
    expect(screen.getByText(/verá tu nombre, las habilidades que aprobaste/)).toBeTruthy();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('crea el enlace y lo muestra', async () => {
    render(<CompartirCredencial sesionIniciada dominadas={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi enlace' }));
    const campo = (await screen.findByLabelText('Tu enlace')) as HTMLInputElement;
    expect(campo.value).toBe(ENLACE);
    expect(campo.readOnly).toBe(true);
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/y vence el 3 de noviembre de 2027/)).toBeTruthy();
  });

  it('copia el enlace', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    simularPortapapeles(writeText);
    render(<CompartirCredencial sesionIniciada dominadas={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi enlace' }));
    await screen.findByLabelText('Tu enlace');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));
    expect(writeText).toHaveBeenCalledWith(ENLACE);
    expect(await screen.findByText(/Enlace copiado/)).toBeTruthy();
  });

  it('si el navegador no deja copiar, lo dice y deja el enlace seleccionado', async () => {
    simularPortapapeles(vi.fn().mockRejectedValue(new Error('denegado')));
    render(<CompartirCredencial sesionIniciada dominadas={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi enlace' }));
    await screen.findByLabelText('Tu enlace');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));
    expect(await screen.findByText(/No pude copiarlo solo/)).toBeTruthy();
  });

  it('muestra el error del servidor y deja reintentar', async () => {
    emitir.mockResolvedValueOnce({ ok: false, error: 'Todavía no tienes habilidades demostradas. Aprueba un examen primero.' });
    render(<CompartirCredencial sesionIniciada dominadas={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi enlace' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Todavía no tienes habilidades demostradas');

    fireEvent.click(screen.getByRole('button', { name: 'Crear mi enlace' }));
    expect(await screen.findByLabelText('Tu enlace')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
