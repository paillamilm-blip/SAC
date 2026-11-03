import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let authStatus: 'unauthenticated' | 'authenticated' = 'unauthenticated';
vi.mock('@/store/AppContext', () => ({
  useApp: () => ({
    authStatus,
    profile: authStatus === 'authenticated' ? { id: 'u1', full_name: 'Ana Pérez', username: 'ana' } : null,
  }),
}));
vi.mock('@/features/auth/components/AuthOverlay', () => ({
  AuthOverlay: () => <div role="dialog" aria-label="Acceso" />,
}));
// useUserColor arrastra ColorPicker -> spatialAudio, que usa matchMedia (no existe en jsdom).
vi.mock('@/shared/hooks/useUserColor', () => ({ useUserColor: () => '#7dd3fc' }));
vi.mock('@/features/omicron/services/brain', () => ({ askOmicron: vi.fn(), checkOmicronLimit: () => true }));
vi.mock('@/features/omicron/services/voice', () => ({
  speakOmicron: vi.fn(() => Promise.resolve()),
  stopOmicron: vi.fn(),
  isOmicronSpeaking: () => false,
}));
// Estas pruebas recorren la pantalla con la muestra fija: no hay IA ni un CV real.
vi.mock('../services/proveedor', async () => {
  const { crearProveedorDemostracion } = await import('../services/analizar');
  return { proveedorActivo: crearProveedorDemostracion({ pausaMs: 0 }) };
});
// La racha diaria llama a Supabase: en pruebas no hay red.
vi.mock('../hooks/useOmicronStats', () => ({ useOmicronStats: () => {} }));
vi.mock('@/infrastructure/voice/recognition', () => ({
  isSpeechAvailable: () => false,
  startSpeechRecognition: vi.fn(() => null),
}));

import UApp from './UApp';

beforeEach(() => {
  localStorage.clear();
  authStatus = 'unauthenticated';
  window.history.replaceState(null, '', '/u');
});
afterEach(cleanup);

describe('UApp', () => {
  it('invitado sin análisis: ve la subida del CV y el aviso de modo demostración', () => {
    render(<UApp />);
    expect(screen.getByRole('heading', { name: 'Tu camino profesional' })).toBeTruthy();
    expect(screen.getByLabelText('Archivo PDF de tu CV')).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain('Modo demostración');
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  it('"Iniciar sesión" abre el acceso de Ómicrom', () => {
    render(<UApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByRole('dialog', { name: 'Acceso' })).toBeTruthy();
  });

  it('con sesión saluda por el primer nombre y no pide iniciar sesión', () => {
    authStatus = 'authenticated';
    render(<UApp />);
    expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).toBeNull();
  });

  it('el botón flotante abre y cierra el asistente', () => {
    render(<UApp />);
    expect(screen.queryByRole('dialog', { name: 'Asistente de Ómicrom' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el asistente' }));
    expect(screen.getByRole('dialog', { name: 'Asistente de Ómicrom' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el asistente' }));
    expect(screen.queryByRole('dialog', { name: 'Asistente de Ómicrom' })).toBeNull();
  });

  it('un reporte inexistente avisa en vez de romperse', () => {
    window.history.replaceState(null, '', '/u/reporte/no-existe');
    render(<UApp />);
    expect(screen.getByRole('alert').textContent).toContain('No encontré ese análisis');
  });
});
