import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resultado, Reto } from '../services/examen';

vi.mock('@/infrastructure/supabase/client', () => ({ supabase: {} }));
vi.mock('../services/examen', async (importOriginal) => {
  const real = await importOriginal<typeof import('../services/examen')>();
  return { ...real, iniciarExamen: vi.fn(), pedirDefensa: vi.fn(), evaluarExamen: vi.fn() };
});

import * as servicio from '../services/examen';
import Examen from './Examen';

const iniciar = vi.mocked(servicio.iniciarExamen);
const defensa = vi.mocked(servicio.pedirDefensa);
const evaluar = vi.mocked(servicio.evaluarExamen);

const RETO: Reto = {
  sessionId: 's1',
  titulo: 'Caso',
  contexto: 'Una obra en marcha.',
  preguntas: [
    { pregunta: 'Primera', opciones: ['a1', 'b1', 'c1', 'd1'] },
    { pregunta: 'Segunda', opciones: ['a2', 'b2', 'c2', 'd2'] },
    { pregunta: 'Tercera', opciones: ['a3', 'b3', 'c3', 'd3'] },
  ],
  casoEnunciado: 'Resuelve esto.',
  pista: 'Piensa en el costo.',
  nivel: 'intermedio',
};

const resultado = (parcial: Partial<Resultado> = {}): Resultado => ({
  actaId: 'acta-9',
  aprobado: true,
  puntaje: 82,
  ejes: { ejecucion: 80, calidad: 85, trascendencia: 78, fundamento: 90 },
  resumen: 'Buen trabajo.',
  feedback: 'Profundiza en costos.',
  siguientePaso: 'Practica una estimación.',
  ...parcial,
});

const CASO = 'Primero reviso el alcance, luego estimo costos y plazos.';

beforeEach(() => {
  iniciar.mockReset().mockResolvedValue({ ok: true, datos: RETO });
  defensa.mockReset().mockResolvedValue({ ok: true, datos: { defensa: '¿Por qué ese orden?', pista: null } });
  evaluar.mockReset().mockResolvedValue({ ok: true, datos: resultado() });
});
afterEach(cleanup);

function montar() {
  const onAprobado = vi.fn();
  const onCerrar = vi.fn();
  render(<Examen tituloBrecha="Gestión de presupuestos" onAprobado={onAprobado} onCerrar={onCerrar} />);
  return { onAprobado, onCerrar };
}

async function contestarReto() {
  await screen.findByText(/Tres preguntas y un caso práctico/);
  const radios = screen.getAllByRole('radio');
  fireEvent.click(radios[0]); // 1.ª pregunta, opción a
  fireEvent.click(radios[5]); // 2.ª pregunta, opción b
  fireEvent.click(radios[10]); // 3.ª pregunta, opción c
  fireEvent.change(screen.getByLabelText(/Caso práctico/), { target: { value: CASO } });
}

async function hastaLaDefensa() {
  await contestarReto();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText(/Una última pregunta/);
}

describe('Examen', () => {
  it('muestra que se prepara y luego el reto, con un diálogo accesible', async () => {
    montar();
    expect(screen.getByText(/Preparando tu examen/)).toBeTruthy();
    await screen.findByText(/Tres preguntas y un caso práctico/);
    const dialogo = screen.getByRole('dialog');
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Gestión de presupuestos' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(12);
    expect(screen.getByText(/Se aprueba con 70 de 100 o más/)).toBeTruthy();
  });

  it('"Continuar" espera a las tres respuestas y a un caso con sustancia', async () => {
    montar();
    await screen.findByText(/Tres preguntas y un caso práctico/);
    const continuar = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement;
    expect(continuar.disabled).toBe(true);

    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(screen.getAllByRole('radio')[4]);
    fireEvent.click(screen.getAllByRole('radio')[8]);
    expect(continuar.disabled).toBe(true); // falta el caso

    fireEvent.change(screen.getByLabelText(/Caso práctico/), { target: { value: 'muy corto' } });
    expect(continuar.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Caso práctico/), { target: { value: CASO } });
    expect(continuar.disabled).toBe(false);
  });

  it('flujo aprobado: manda lo contestado y guarda la prueba una sola vez', async () => {
    const { onAprobado, onCerrar } = montar();
    await hastaLaDefensa();
    expect(defensa).toHaveBeenCalledWith('s1', CASO);

    fireEvent.change(screen.getByLabelText(/Una última pregunta/), { target: { value: 'Porque el alcance manda.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entregar examen' }));

    await screen.findByText(/Aprobaste/);
    expect(evaluar).toHaveBeenCalledWith('s1', [0, 1, 2], CASO, 'Porque el alcance manda.');
    expect(screen.getByText('82')).toBeTruthy();
    expect(screen.getByText(/dominada, con prueba/)).toBeTruthy();

    await waitFor(() => expect(onAprobado).toHaveBeenCalledTimes(1));
    expect(onAprobado).toHaveBeenCalledWith({ actaId: 'acta-9', puntaje: 82, en: expect.any(String) });

    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(onAprobado).toHaveBeenCalledTimes(1);
  });

  it('flujo reprobado: no guarda ninguna prueba y permite un examen nuevo', async () => {
    evaluar.mockResolvedValue({ ok: true, datos: resultado({ aprobado: false, puntaje: 48 }) });
    const { onAprobado } = montar();
    await hastaLaDefensa();
    fireEvent.change(screen.getByLabelText(/Una última pregunta/), { target: { value: 'No estoy seguro.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entregar examen' }));

    await screen.findByText(/Todavía no/);
    expect(onAprobado).not.toHaveBeenCalled();
    expect(screen.getByText(/Se aprueba con 70/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Intentar con un examen nuevo' }));
    await waitFor(() => expect(iniciar).toHaveBeenCalledTimes(2));
    await screen.findByText(/Tres preguntas y un caso práctico/);
    expect(onAprobado).not.toHaveBeenCalled();
  });

  it('si el servidor aprueba pero no deja constancia, NO se guarda como prueba y se dice', async () => {
    evaluar.mockResolvedValue({ ok: true, datos: resultado({ actaId: null }) });
    const { onAprobado } = montar();
    await hastaLaDefensa();
    fireEvent.change(screen.getByLabelText(/Una última pregunta/), { target: { value: 'Porque el alcance manda.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entregar examen' }));

    await screen.findByText(/no dejó constancia/);
    expect(onAprobado).not.toHaveBeenCalled();
    expect(screen.queryByText(/dominada, con prueba/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Listo' })).toBeNull();
  });

  it('un error al preparar se muestra y permite empezar de nuevo', async () => {
    iniciar.mockResolvedValueOnce({ ok: false, error: 'No pude generar el reto. Reintenta.' });
    montar();
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('No pude generar el reto. Reintenta.');

    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));
    await screen.findByText(/Tres preguntas y un caso práctico/);
    expect(iniciar).toHaveBeenCalledTimes(2);
  });

  it('un error al pedir la defensa se muestra sin perder lo escrito', async () => {
    defensa.mockResolvedValueOnce({ ok: false, error: 'Servicio ocupado.' });
    montar();
    await contestarReto();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Servicio ocupado.');
    expect((screen.getByLabelText(/Caso práctico/) as HTMLTextAreaElement).value).toBe(CASO);
    expect((screen.getAllByRole('radio')[0] as HTMLInputElement).checked).toBe(true);
  });

  it('Escape cierra el examen mientras se contesta', async () => {
    const { onCerrar } = montar();
    await screen.findByText(/Tres preguntas y un caso práctico/);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('mientras el servidor califica no se puede cerrar: el resultado se perdería', async () => {
    type Respuesta = Awaited<ReturnType<typeof servicio.evaluarExamen>>;
    let terminar: (r: Respuesta) => void = () => {};
    evaluar.mockReturnValue(new Promise<Respuesta>((res) => (terminar = res)));
    const { onCerrar, onAprobado } = montar();
    await hastaLaDefensa();
    fireEvent.change(screen.getByLabelText(/Una última pregunta/), { target: { value: 'Porque el alcance manda.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entregar examen' }));

    await screen.findByText(/Calificando tus respuestas/);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(document.querySelector('.u-examen-fondo') as Element);
    expect((screen.getByRole('button', { name: 'Cerrar el examen' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onCerrar).not.toHaveBeenCalled();

    await act(async () => terminar({ ok: true, datos: resultado() }));
    await screen.findByText(/Aprobaste/);
    expect(onAprobado).toHaveBeenCalledTimes(1);
  });
});
