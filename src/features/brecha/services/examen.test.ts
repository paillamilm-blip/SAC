import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const rpc = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, rpc: (...a: unknown[]) => rpc(...a) },
}));

import { evaluarExamen, iniciarExamen, nombreDeHabilidad, pedirDefensa, pruebaDe, type Resultado } from './examen';

const RETO_OK = {
  session_id: 's1',
  difficulty: { label: 'intermedio' },
  reto: {
    titulo: 'Caso',
    contexto: 'Una obra en marcha.',
    preguntas: [
      { pregunta: 'P1', opciones: ['a', 'b', 'c', 'd'] },
      { pregunta: 'P2', opciones: ['a', 'b', 'c', 'd'] },
      { pregunta: 'P3', opciones: ['a', 'b', 'c', 'd'] },
    ],
    caso_practico: { enunciado: 'Resuelve esto.' },
    pista_adaptativa: 'Piensa en el costo.',
  },
};

const EVAL_OK = {
  acta_id: 'acta-9',
  veredicto: 'APROBADO',
  puntaje_global: 82,
  ejes: { ejecucion: 80, calidad: 85, trascendencia: 78, fundamento: 90 },
  resumen: 'Bien.',
  feedback: 'Profundiza en costos.',
  siguiente_paso: 'Practica una estimación.',
};

beforeEach(() => {
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: { ok: true, node_id: 'nodo-1', title: 'Gestión', created: false }, error: null });
});

describe('nombreDeHabilidad', () => {
  it('deja intacto un título corto y colapsa espacios', () => {
    expect(nombreDeHabilidad('  Gestión   de   presupuestos ')).toBe('Gestión de presupuestos');
  });

  it('recorta a 60 caracteres en un límite de palabra, sin partirla', () => {
    const largo = 'Experiencia demostrable en la elaboración y control de presupuestos de obra civil mayor';
    const n = nombreDeHabilidad(largo);
    expect(n.length).toBeLessThanOrEqual(60);
    expect(largo.startsWith(n)).toBe(true);
    expect(largo[n.length]).toBe(' ');
  });

  it('un texto sin espacios se corta a 60 igualmente', () => {
    expect(nombreDeHabilidad('x'.repeat(100))).toHaveLength(60);
  });
});

describe('pruebaDe', () => {
  const base: Resultado = {
    actaId: 'acta-9',
    aprobado: true,
    puntaje: 82,
    ejes: { ejecucion: 1, calidad: 1, trascendencia: 1, fundamento: 1 },
    resumen: '',
    feedback: '',
    siguientePaso: '',
  };

  it('solo hay prueba si el servidor aprobó Y dejó un acta', () => {
    expect(pruebaDe(base, 't')).toEqual({ actaId: 'acta-9', puntaje: 82, en: 't' });
    expect(pruebaDe({ ...base, aprobado: false }, 't')).toBeNull();
    expect(pruebaDe({ ...base, actaId: null }, 't')).toBeNull();
  });
});

describe('iniciarExamen', () => {
  it('prepara el nodo con el nombre recortado y devuelve el reto sin respuestas correctas', async () => {
    invoke.mockResolvedValue({ data: RETO_OK, error: null });
    const r = await iniciarExamen('Gestión de presupuestos');
    expect(rpc).toHaveBeenCalledWith('omicron_ensure_skill_node', { p_title: 'Gestión de presupuestos' });
    expect(invoke).toHaveBeenCalledWith('simulador-universal', { body: { action: 'iniciar', node_id: 'nodo-1' } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.sessionId).toBe('s1');
      expect(r.datos.preguntas).toHaveLength(3);
      expect(r.datos.casoEnunciado).toBe('Resuelve esto.');
      expect(r.datos.pista).toBe('Piensa en el costo.');
      expect(JSON.stringify(r.datos)).not.toContain('correcta');
    }
  });

  it('si no se puede preparar el nodo, no llama al simulador', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'no existe' } });
    const r = await iniciarExamen('Gestión');
    expect(r.ok).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('una respuesta incompleta es un error claro, no un examen roto', async () => {
    invoke.mockResolvedValue({ data: { session_id: 's1', reto: { preguntas: [] } }, error: null });
    const r = await iniciarExamen('Gestión');
    expect(r).toEqual({ ok: false, error: expect.stringContaining('incompleta') });
  });

  it('un 401 pide iniciar sesión', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: { status: 401, json: async () => ({ error: 'x' }), clone() { return this; } } },
    });
    const r = await iniciarExamen('Gestión');
    expect(r).toEqual({ ok: false, error: 'Inicia sesión para dar el examen.', necesitaSesion: true });
  });

  it('el mensaje que manda el servidor llega a la persona', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: { status: 502, json: async () => ({ error: 'No pude generar el reto. Reintenta.' }), clone() { return this; } } },
    });
    const r = await iniciarExamen('Gestión');
    expect(r).toEqual({ ok: false, error: 'No pude generar el reto. Reintenta.', necesitaSesion: false });
  });

  it('un fallo de red no lanza: devuelve un error', async () => {
    invoke.mockRejectedValue(new Error('network'));
    const r = await iniciarExamen('Gestión');
    expect(r.ok).toBe(false);
  });
});

describe('pedirDefensa y evaluarExamen', () => {
  it('la defensa devuelve la repregunta', async () => {
    invoke.mockResolvedValue({ data: { defensa: '¿Por qué?', pista: 'Mira el costo.' }, error: null });
    const r = await pedirDefensa('s1', 'mi caso');
    expect(invoke).toHaveBeenCalledWith('simulador-universal', {
      body: { action: 'defensa', session_id: 's1', caso_respuesta: 'mi caso' },
    });
    expect(r).toEqual({ ok: true, datos: { defensa: '¿Por qué?', pista: 'Mira el costo.' } });
  });

  it('evaluar manda todo y devuelve el veredicto del servidor', async () => {
    invoke.mockResolvedValue({ data: EVAL_OK, error: null });
    const r = await evaluarExamen('s1', [0, 1, 2], 'caso', 'defensa');
    expect(invoke).toHaveBeenCalledWith('simulador-universal', {
      body: { action: 'evaluar', session_id: 's1', respuestas: [0, 1, 2], caso_respuesta: 'caso', defensa_respuesta: 'defensa' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.aprobado).toBe(true);
      expect(r.datos.puntaje).toBe(82);
      expect(r.datos.actaId).toBe('acta-9');
    }
  });

  it('un veredicto desconocido no se interpreta como aprobado', async () => {
    invoke.mockResolvedValue({ data: { ...EVAL_OK, veredicto: 'TAL VEZ' }, error: null });
    const r = await evaluarExamen('s1', [0], 'c', 'd');
    expect(r.ok).toBe(false);
  });

  it('un puntaje fuera de rango o no numérico se acota a 0-100', async () => {
    invoke.mockResolvedValue({ data: { ...EVAL_OK, veredicto: 'REPROBADO', puntaje_global: 999, ejes: { ejecucion: 'x', calidad: -5, trascendencia: 50, fundamento: 50 } }, error: null });
    const r = await evaluarExamen('s1', [0], 'c', 'd');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.puntaje).toBe(100);
      expect(r.datos.ejes.ejecucion).toBe(0);
      expect(r.datos.ejes.calidad).toBe(0);
    }
  });

  it('el error de "examen ya evaluado" del servidor se muestra tal cual', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: { status: 409, json: async () => ({ error: 'Este examen ya fue evaluado o no existe. Inicia uno nuevo.' }), clone() { return this; } } },
    });
    const r = await evaluarExamen('s1', [0], 'c', 'd');
    expect(r).toEqual({ ok: false, error: 'Este examen ya fue evaluado o no existe. Inicia uno nuevo.', necesitaSesion: false });
  });
});
