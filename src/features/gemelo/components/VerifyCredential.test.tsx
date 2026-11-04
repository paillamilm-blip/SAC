import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import { VerifyCredentialView } from './VerifyCredential';

beforeEach(() => invoke.mockReset());
afterEach(cleanup);

const v2 = {
  v: 2,
  u: 'ana',
  n: 'Ana Pérez',
  h: [
    { h: 'Gestión de presupuestos', p: 82, f: '2026-11-03' },
    { h: 'Excel', p: null, f: '2026-10-01' },
  ],
  iat: Date.UTC(2026, 10, 3),
  exp: Date.UTC(2027, 10, 3),
};

describe('VerifyCredentialView', () => {
  it('manda el token a verificar, sin sesión', async () => {
    invoke.mockResolvedValue({ data: { valid: true, cred: v2 }, error: null });
    render(<VerifyCredentialView token="abc.def" />);
    await screen.findByText('Ana Pérez');
    expect(invoke).toHaveBeenCalledWith('credential', { body: { action: 'verify', token: 'abc.def' } });
  });

  it('versión 2: lista las habilidades con su escala y sin inventar puntajes', async () => {
    invoke.mockResolvedValue({ data: { valid: true, cred: v2 }, error: null });
    render(<VerifyCredentialView token="t" />);
    await screen.findByText('Ana Pérez');
    expect(screen.getByRole('heading', { name: /Habilidades que aprobó con examen \(2\)/ })).toBeTruthy();
    expect(screen.getByText('Gestión de presupuestos')).toBeTruthy();
    expect(screen.getByText('82/100')).toBeTruthy();
    expect(screen.getByText('sin puntaje registrado')).toBeTruthy();
    expect(screen.getByText(/se aprueba con 70/)).toBeTruthy();
    expect(screen.queryByText(/Reputación/)).toBeNull();
  });

  it('versión 1: las credenciales anteriores se siguen mostrando', async () => {
    invoke.mockResolvedValue({
      data: { valid: true, cred: { v: 1, u: 'ana', n: 'Ana Pérez', nt: 'Nodo Operativo', nl: 'N2', rep: 61, ej: [10, 20, 30, 40], cv: 3, pe: 120, iat: 1000 } },
      error: null,
    });
    render(<VerifyCredentialView token="t" />);
    await screen.findByText('Reputación');
    expect(screen.getByText('61')).toBeTruthy();
    expect(screen.getByText(/versión anterior de Ómicrom/)).toBeTruthy();
  });

  it('firma no válida', async () => {
    invoke.mockResolvedValue({ data: { valid: false }, error: null });
    render(<VerifyCredentialView token="t" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Credencial no válida');
  });

  it('firma válida pero con un contenido que no se entiende: NO se muestra como válida', async () => {
    invoke.mockResolvedValue({ data: { valid: true, cred: { v: 2, u: 'ana' } }, error: null });
    render(<VerifyCredentialView token="t" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Credencial no válida');
  });

  it('vencida: lo dice, distinto de «no válida»', async () => {
    invoke.mockResolvedValue({ data: { valid: false, expired: true }, error: null });
    render(<VerifyCredentialView token="t" />);
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Credencial vencida');
    expect(alerta.textContent).not.toContain('no válida');
  });

  it('si no se puede contactar al servidor, dice que no se pudo verificar (no que es falsa)', async () => {
    invoke.mockRejectedValue(new Error('network'));
    render(<VerifyCredentialView token="t" />);
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('No se pudo verificar');
    expect(alerta.textContent).not.toContain('no válida');
  });
});
