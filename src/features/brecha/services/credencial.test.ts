import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import { emitirCredencial } from './credencial';

const conContexto = (status: number, cuerpo: unknown) => ({
  context: { status, json: async () => cuerpo, clone() { return this; } },
});

beforeEach(() => invoke.mockReset());

describe('emitirCredencial', () => {
  it('pide emitir SIN mandar habilidades ni puntajes (las lee el servidor) y arma el enlace público', async () => {
    invoke.mockResolvedValue({ data: { token: 'abc_-123.firma_-xyz', habilidades: 2, vence: 1_900_000_000_000 }, error: null });
    const r = await emitirCredencial('https://sac-omi.vercel.app/');
    expect(invoke).toHaveBeenCalledWith('credential', { body: { action: 'issue' } });
    expect(r).toEqual({
      ok: true,
      datos: { enlace: 'https://sac-omi.vercel.app/?verificar=abc_-123.firma_-xyz', habilidades: 2, vence: 1_900_000_000_000 },
    });
  });

  it('el token se codifica para viajar en la dirección', async () => {
    invoke.mockResolvedValue({ data: { token: 'a b.c+d' }, error: null });
    const r = await emitirCredencial('https://x.test');
    expect(r.ok && r.datos.enlace).toBe('https://x.test/?verificar=a%20b.c%2Bd');
  });

  it('sin sesión pide iniciar sesión', async () => {
    invoke.mockResolvedValue({ data: null, error: conContexto(401, { error: 'x' }) });
    expect(await emitirCredencial('https://x.test')).toEqual({
      ok: false,
      error: 'Inicia sesión para crear tu credencial.',
      necesitaSesion: true,
    });
  });

  it('sin habilidades probadas muestra el motivo que dio el servidor', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: conContexto(409, { error: 'Todavía no tienes habilidades demostradas. Aprueba un examen primero.' }),
    });
    const r = await emitirCredencial('https://x.test');
    expect(r).toEqual({
      ok: false,
      error: 'Todavía no tienes habilidades demostradas. Aprueba un examen primero.',
      necesitaSesion: false,
    });
  });

  it('una respuesta sin token válido es un error, no un enlace roto', async () => {
    for (const data of [{}, { token: 5 }, { token: 'sin-punto' }, { token: 'a.b.c' }]) {
      invoke.mockResolvedValue({ data, error: null });
      const r = await emitirCredencial('https://x.test');
      expect(r.ok).toBe(false);
    }
  });

  it('un fallo de red no lanza', async () => {
    invoke.mockRejectedValue(new Error('network'));
    expect((await emitirCredencial('https://x.test')).ok).toBe(false);
  });
});
