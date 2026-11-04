import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: { auth: { signOut: () => signOut() } } }));
// El selector de color arrastra animaciones y audio: aquí solo importa que el perfil lo cargue.
vi.mock('./SelectorColor', () => ({ default: () => <div data-testid="selector-color" /> }));

import PerfilPanel from './PerfilPanel';

afterEach(() => {
  cleanup();
  signOut.mockClear();
});

const METRICAS = { totalAnalisis: 2, brechas: 8, revisadas: 3, confirmadas: 2, rechazadas: 1, dominadas: 1, precision: 67 };

function pintar(extra: Partial<Parameters<typeof PerfilPanel>[0]> = {}) {
  const props = {
    nombre: 'Matías',
    correo: 'matias@example.com',
    esInvitado: false,
    metricas: METRICAS,
    onCerrar: vi.fn(),
    onIniciarSesion: vi.fn(),
    ...extra,
  };
  render(<PerfilPanel {...props} />);
  return props;
}

describe('PerfilPanel', () => {
  it('con cuenta muestra nombre, correo y los conteos reales con su escala', () => {
    pintar();
    const d = screen.getByRole('dialog', { name: 'Matías' });
    expect(d.textContent).toContain('matias@example.com');
    expect(d.textContent).toContain('2 de 8'); // reconocidas
    expect(d.textContent).toContain('1 de 2'); // dominadas con prueba
  });

  it('carga el selector de color', async () => {
    pintar();
    expect(await screen.findByTestId('selector-color')).toBeTruthy();
  });

  it('«Cerrar sesión» cierra la sesión y el perfil', async () => {
    const p = pintar();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(p.onCerrar).toHaveBeenCalled());
  });

  it('un invitado ve que sus datos están solo en el dispositivo y puede iniciar sesión', () => {
    const p = pintar({ esInvitado: true, nombre: null, correo: null });
    const d = screen.getByRole('dialog', { name: 'Invitado' });
    expect(d.textContent).toContain('solo en este dispositivo');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(p.onIniciarSesion).toHaveBeenCalled();
  });

  it('Escape y la X cierran el perfil, y el foco empieza en cerrar', () => {
    const p = pintar();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar mi perfil' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(p.onCerrar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi perfil' }));
    expect(p.onCerrar).toHaveBeenCalledTimes(2);
  });
});
