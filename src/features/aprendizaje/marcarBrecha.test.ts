// features/aprendizaje/marcarBrecha.test.ts
// El fundador no lee inglés técnico ni jerga de base de datos. Los únicos
// mensajes que pueden llegar a su pantalla son los que el SQL de 10012 escribe
// a mano en español (raise exception → código P0001). Todo lo demás es ruido de
// PostgREST (función no desplegada, red caída, JWT vencido) y se enmascara.
// El disparador real: la verificación en navegador del 27/10 mostró
// "Could not find the function public.marcar_brecha(...) in the schema cache"
// escrito en la pestaña, con el RPC 10012 todavía sin desplegar.

import { describe, it, expect, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'anon-test-key',
}));

import { marcarBrecha } from './marcarBrecha';

const ID = '05d2bb7c-8201-482f-b1e6-e8f33ae064de';
const JERGA = /schema cache|function public\.|PostgREST|Could not find/i;

const errorDe = async (): Promise<string> => {
  try {
    await marcarBrecha(ID, 'confirmada');
    return '';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};

describe('marcarBrecha — el fundador nunca ve jerga de infraestructura', () => {
  it('sin error no lanza nada', async () => {
    rpc.mockResolvedValue({ error: null });
    await expect(marcarBrecha(ID, 'confirmada')).resolves.toBeUndefined();
  });

  it('llama el RPC con el contrato exacto de 10012', async () => {
    rpc.mockResolvedValue({ error: null });
    await marcarBrecha(ID, 'dominada');
    expect(rpc).toHaveBeenCalledWith('marcar_brecha', { p_brecha: ID, p_state: 'dominada' });
  });

  it('el raise exception del SQL pasa tal cual: ya está escrito en español', async () => {
    rpc.mockResolvedValue({
      error: { code: 'P0001', message: 'Ya marcaste esto como dominado — no se puede volver atrás' },
    });
    expect(await errorDe()).toBe('Ya marcaste esto como dominado — no se puede volver atrás');
  });

  it('función no desplegada (PGRST202) no muestra el texto de PostgREST', async () => {
    rpc.mockResolvedValue({
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.marcar_brecha(p_brecha, p_state) in the schema cache',
      },
    });
    const msg = await errorDe();
    expect(msg).not.toMatch(JERGA);
    expect(msg.trim()).not.toBe('');
  });

  it('error sin código (red caída) tampoco se filtra crudo', async () => {
    rpc.mockResolvedValue({ error: { message: 'Failed to fetch' } });
    const msg = await errorDe();
    expect(msg).not.toMatch(JERGA);
    expect(msg.toLowerCase()).not.toContain('failed to fetch');
  });

  it('una falla sin mensaje no deja al fundador con una pantalla vacía', async () => {
    rpc.mockResolvedValue({ error: { code: 'PGRST116' } });
    expect((await errorDe()).length).toBeGreaterThan(0);
  });
});
