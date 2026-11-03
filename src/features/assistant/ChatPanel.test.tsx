import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MUESTRA } from '../brecha/services/muestra';
import { agregarAnalisis, dbVacia, type Db } from '../brecha/services/repositorio';

const askOmicron = vi.fn();
vi.mock('@/features/omicron/services/brain', () => ({
  askOmicron: (...a: unknown[]) => askOmicron(...a),
  checkOmicronLimit: () => true,
}));
vi.mock('@/features/omicron/services/voice', () => ({
  speakOmicron: vi.fn(() => Promise.resolve()),
  stopOmicron: vi.fn(),
  isOmicronSpeaking: () => false,
}));
vi.mock('@/infrastructure/voice/recognition', () => ({
  isSpeechAvailable: () => false,
  startSpeechRecognition: vi.fn(() => null),
}));

import ChatPanel from './ChatPanel';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'demostracion', simulado: true };

function conAnalisis(): Db {
  return agregarAnalisis(dbVacia(), MUESTRA, META, '2026-11-02T10:00:00.000Z').db;
}

function montar(db: Db, extra: Partial<React.ComponentProps<typeof ChatPanel>> = {}) {
  const onEjecutar = vi.fn();
  render(
    <ChatPanel
      db={db}
      usuarioId={null}
      nombre="Ana"
      iaDisponible={false}
      abierto
      onCerrar={() => {}}
      onEjecutar={onEjecutar}
      {...extra}
    />,
  );
  return { onEjecutar };
}

beforeEach(() => {
  localStorage.clear();
  askOmicron.mockReset();
});
afterEach(cleanup);

describe('ChatPanel', () => {
  it('saluda y propone escanear cuando aún no hay análisis', () => {
    montar(dbVacia());
    expect(screen.getByRole('log').textContent).toContain('Hola, Ana');
    expect(screen.getByRole('button', { name: 'Escanear mi CV' })).toBeTruthy();
  });

  it('una acción propuesta solo se ejecuta tras confirmarla', () => {
    const { onEjecutar } = montar(dbVacia());
    expect(onEjecutar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear mi CV' }));
    expect(onEjecutar).toHaveBeenCalledWith({ tipo: 'escanear' });
  });

  it('"Ahora no" no ejecuta nada', () => {
    const { onEjecutar } = montar(dbVacia());
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(onEjecutar).not.toHaveBeenCalled();
    expect(screen.getByText('Lo dejamos para después.')).toBeTruthy();
  });

  it('responde con los datos guardados y declara su origen', () => {
    montar(conAnalisis());
    fireEvent.change(screen.getByLabelText('Mensaje para el asistente'), { target: { value: '¿qué me falta?' } });
    fireEvent.submit(screen.getByLabelText('Mensaje para el asistente').closest('form')!);
    // La muestra fija se declara como muestra, nunca como «De tu análisis».
    expect(screen.getAllByText('Muestra de ejemplo').length).toBeGreaterThan(0);
    expect(screen.queryByText('De tu análisis')).toBeNull();
    expect(askOmicron).not.toHaveBeenCalled();
  });

  it('sin sesión no usa IA: admite que no entendió', () => {
    montar(dbVacia());
    fireEvent.change(screen.getByLabelText('Mensaje para el asistente'), { target: { value: 'blablabla xyz' } });
    fireEvent.submit(screen.getByLabelText('Mensaje para el asistente').closest('form')!);
    expect(screen.getByRole('log').textContent).toContain('No estoy seguro de haber entendido');
    expect(askOmicron).not.toHaveBeenCalled();
  });

  it('con sesión, lo que las reglas no entienden va a la IA y se rotula como no verificado', async () => {
    askOmicron.mockResolvedValue({ text: 'Practica SQL 20 minutos al día. [EXAMEN]' });
    montar(dbVacia(), { iaDisponible: true });
    fireEvent.change(screen.getByLabelText('Mensaje para el asistente'), { target: { value: 'blablabla xyz' } });
    fireEvent.submit(screen.getByLabelText('Mensaje para el asistente').closest('form')!);
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('Practica SQL 20 minutos al día.'));
    expect(screen.getByRole('log').textContent).not.toContain('[EXAMEN]');
    expect(screen.getByText('Respuesta de IA · no verificada con tus datos')).toBeTruthy();
  });

  it('si la IA falla, cae a la respuesta honesta', async () => {
    askOmicron.mockRejectedValue(new Error('sin red'));
    montar(dbVacia(), { iaDisponible: true });
    fireEvent.change(screen.getByLabelText('Mensaje para el asistente'), { target: { value: 'blablabla xyz' } });
    fireEvent.submit(screen.getByLabelText('Mensaje para el asistente').closest('form')!);
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('No estoy seguro de haber entendido'));
  });

  it('por defecto no guarda la conversación; si se activa, sí', () => {
    montar(dbVacia());
    fireEvent.change(screen.getByLabelText('Mensaje para el asistente'), { target: { value: 'hola' } });
    fireEvent.submit(screen.getByLabelText('Mensaje para el asistente').closest('form')!);
    expect(localStorage.getItem('omicron:asistente:historial:v1:invitado')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ajustes del asistente' }));
    fireEvent.click(screen.getByLabelText(/Guardar esta conversación/));
    expect(localStorage.getItem('omicron:asistente:historial:v1:invitado')).not.toBeNull();
  });

  it('el micrófono no aparece si el navegador no lo permite', () => {
    montar(dbVacia());
    expect(screen.queryByRole('button', { name: 'Hablar con el asistente' })).toBeNull();
  });

  it('cerrado no pinta nada', () => {
    montar(dbVacia(), { abierto: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
