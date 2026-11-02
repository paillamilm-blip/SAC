import { describe, expect, it } from 'vitest';
import { MUESTRA } from './muestra';
import {
  agregarAnalisis,
  cargar,
  claveDe,
  compararConAnterior,
  dbVacia,
  fusionarInvitado,
  guardar,
  listarAnalisis,
  marcarBrecha,
  marcarDominada,
  metricas,
  type Almacen,
} from './repositorio';
import type { ResultadoAnalisis } from '../domain/types';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1000, proveedor: 'demostracion', simulado: true };

function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

function conUnAnalisis(ahora = '2026-11-02T10:00:00.000Z') {
  return agregarAnalisis(dbVacia(), MUESTRA, META, ahora, ids());
}

function almacenEnMemoria(inicial: Record<string, string> = {}): Almacen & { datos: Record<string, string> } {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => {
      datos[k] = v;
    },
    removeItem: (k) => {
      delete datos[k];
    },
  };
}

describe('agregarAnalisis', () => {
  it('crea las 8 brechas de la muestra sin revisar y con ids distintos', () => {
    const { analisis } = conUnAnalisis();
    expect(analisis.brechas).toHaveLength(8);
    expect(new Set(analisis.brechas.map((b) => b.id)).size).toBe(8);
    expect(analisis.brechas.every((b) => b.veredicto === null && b.dominadaEn === null)).toBe(true);
    expect(analisis.simulado).toBe(true);
  });

  it('no muta la muestra original ni la base anterior', () => {
    const antes = dbVacia();
    const copiaMuestra = JSON.stringify(MUESTRA);
    const { db } = agregarAnalisis(antes, MUESTRA, META, '2026-11-02T10:00:00.000Z', ids());
    expect(antes.analisis).toHaveLength(0);
    expect(db.analisis).toHaveLength(1);
    expect(JSON.stringify(MUESTRA)).toBe(copiaMuestra);
  });
});

describe('marcarBrecha / marcarDominada', () => {
  it('"Es real" registra el veredicto y la fecha', () => {
    const { db, analisis } = conUnAnalisis();
    const b = analisis.brechas[0];
    const nuevo = marcarBrecha(db, analisis.id, b.id, 'confirmada', '2026-11-02T11:00:00.000Z');
    const r = nuevo.analisis[0].brechas[0];
    expect(r.veredicto).toBe('confirmada');
    expect(r.veredictoEn).toBe('2026-11-02T11:00:00.000Z');
  });

  it('solo se puede dominar lo que antes se reconoció como real', () => {
    const { db, analisis } = conUnAnalisis();
    const b = analisis.brechas[0];
    const intento = marcarDominada(db, analisis.id, b.id, '2026-11-02T12:00:00.000Z');
    expect(intento).toBe(db); // sin cambios: misma referencia
    const real = marcarBrecha(db, analisis.id, b.id, 'confirmada', '2026-11-02T11:00:00.000Z');
    const dominada = marcarDominada(real, analisis.id, b.id, '2026-11-02T12:00:00.000Z');
    expect(dominada.analisis[0].brechas[0].dominadaEn).toBe('2026-11-02T12:00:00.000Z');
  });

  it('quitar "Es real" o pasar a "No aplica" borra el estado dominada', () => {
    const { db, analisis } = conUnAnalisis();
    const b = analisis.brechas[0];
    let d = marcarBrecha(db, analisis.id, b.id, 'confirmada', 't1');
    d = marcarDominada(d, analisis.id, b.id, 't2');
    expect(d.analisis[0].brechas[0].dominadaEn).toBe('t2');
    const rechazada = marcarBrecha(d, analisis.id, b.id, 'rechazada', 't3');
    expect(rechazada.analisis[0].brechas[0].dominadaEn).toBeNull();
    const sinVeredicto = marcarBrecha(d, analisis.id, b.id, null, 't3');
    expect(sinVeredicto.analisis[0].brechas[0].veredictoEn).toBeNull();
    expect(sinVeredicto.analisis[0].brechas[0].dominadaEn).toBeNull();
  });

  it('un id inexistente no cambia nada', () => {
    const { db, analisis } = conUnAnalisis();
    expect(marcarBrecha(db, analisis.id, 'no-existe', 'confirmada', 't')).toBe(db);
    expect(marcarBrecha(db, 'no-existe', analisis.brechas[0].id, 'confirmada', 't')).toBe(db);
  });
});

describe('metricas', () => {
  it('cuenta con escala y calcula la precisión sobre lo revisado', () => {
    const { db, analisis } = conUnAnalisis();
    let d = db;
    d = marcarBrecha(d, analisis.id, analisis.brechas[0].id, 'confirmada', 't');
    d = marcarBrecha(d, analisis.id, analisis.brechas[1].id, 'confirmada', 't');
    d = marcarBrecha(d, analisis.id, analisis.brechas[2].id, 'rechazada', 't');
    d = marcarDominada(d, analisis.id, analisis.brechas[0].id, 't');
    expect(metricas(d)).toEqual({
      totalAnalisis: 1,
      brechas: 8,
      revisadas: 3,
      confirmadas: 2,
      rechazadas: 1,
      dominadas: 1,
      precision: 67,
    });
  });

  it('sin revisar, la precisión es null (no 0 %)', () => {
    expect(metricas(conUnAnalisis().db).precision).toBeNull();
    expect(metricas(dbVacia()).precision).toBeNull();
  });
});

describe('compararConAnterior', () => {
  it('es null cuando no hay un análisis previo de la misma ocupación', () => {
    const { db, analisis } = conUnAnalisis();
    expect(compararConAnterior(db, analisis)).toBeNull();
  });

  it('marca como cerrada una brecha reconocida que ya no aparece', () => {
    const g = ids();
    const a = agregarAnalisis(dbVacia(), MUESTRA, META, '2026-10-01T10:00:00.000Z', g);
    const reconocida = marcarBrecha(a.db, a.analisis.id, a.analisis.brechas[0].id, 'confirmada', '2026-10-02T10:00:00.000Z');
    const sinPrimera: ResultadoAnalisis = { ...MUESTRA, brechas: MUESTRA.brechas.slice(1) };
    const b = agregarAnalisis(reconocida, sinPrimera, META, '2026-11-02T10:00:00.000Z', g);
    const cmp = compararConAnterior(b.db, b.analisis);
    expect(cmp).not.toBeNull();
    expect(cmp?.cerradas.map((c) => c.id)).toEqual([a.analisis.brechas[0].id]);
    expect(cmp?.cerradas[0].motivo).toBe('no_aparece');
  });

  it('no cuenta como cerrada una brecha que la persona nunca reconoció', () => {
    const g = ids();
    const a = agregarAnalisis(dbVacia(), MUESTRA, META, '2026-10-01T10:00:00.000Z', g);
    const sinPrimera: ResultadoAnalisis = { ...MUESTRA, brechas: MUESTRA.brechas.slice(1) };
    const b = agregarAnalisis(a.db, sinPrimera, META, '2026-11-02T10:00:00.000Z', g);
    expect(compararConAnterior(b.db, b.analisis)?.cerradas).toEqual([]);
  });

  it('no compara perfiles de ocupaciones distintas', () => {
    const g = ids();
    const a = agregarAnalisis(dbVacia(), MUESTRA, META, '2026-10-01T10:00:00.000Z', g);
    const otra: ResultadoAnalisis = { ...MUESTRA, ocupacion: 'Otra ocupación' };
    const b = agregarAnalisis(a.db, otra, META, '2026-11-02T10:00:00.000Z', g);
    expect(compararConAnterior(b.db, b.analisis)).toBeNull();
  });
});

describe('listarAnalisis', () => {
  it('ordena del más reciente al más antiguo', () => {
    const g = ids();
    const a = agregarAnalisis(dbVacia(), MUESTRA, META, '2026-10-01T10:00:00.000Z', g);
    const b = agregarAnalisis(a.db, MUESTRA, META, '2026-11-01T10:00:00.000Z', g);
    expect(listarAnalisis(b.db).map((x) => x.id)).toEqual([b.analisis.id, a.analisis.id]);
  });
});

describe('fusionarInvitado', () => {
  it('pasa los datos del invitado a una cuenta vacía', () => {
    const invitado = conUnAnalisis().db;
    const r = fusionarInvitado(dbVacia(), invitado);
    expect(r.migrado).toBe(true);
    expect(r.db.analisis).toHaveLength(1);
  });

  it('NUNCA pisa los análisis que la cuenta ya tiene', () => {
    const cuenta = conUnAnalisis('2026-10-01T10:00:00.000Z').db;
    const invitado = conUnAnalisis('2026-11-02T10:00:00.000Z').db;
    const r = fusionarInvitado(cuenta, invitado);
    expect(r.migrado).toBe(false);
    expect(r.db).toBe(cuenta);
  });

  it('no migra si el invitado no tiene nada', () => {
    expect(fusionarInvitado(dbVacia(), dbVacia()).migrado).toBe(false);
  });
});

describe('cargar / guardar', () => {
  it('guarda y recupera la base', () => {
    const al = almacenEnMemoria();
    const { db } = conUnAnalisis();
    expect(guardar(al, claveDe('u1'), db)).toBe(true);
    expect(cargar(al, claveDe('u1'))).toEqual(db);
  });

  it('una base corrupta o de otra versión se trata como vacía, sin lanzar', () => {
    expect(cargar(almacenEnMemoria({ [claveDe('u')]: '{no es json' }), claveDe('u'))).toEqual(dbVacia());
    expect(cargar(almacenEnMemoria({ [claveDe('u')]: JSON.stringify({ version: 2, analisis: [] }) }), claveDe('u'))).toEqual(dbVacia());
    expect(cargar(almacenEnMemoria(), claveDe('u'))).toEqual(dbVacia());
  });

  it('si el almacenamiento falla (cuota llena), guardar devuelve false en vez de lanzar', () => {
    const lleno: Almacen = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(guardar(lleno, claveDe('u'), dbVacia())).toBe(false);
  });

  it('las claves nuevas siguen el prefijo omicron:<modulo>:', () => {
    expect(claveDe('abc')).toBe('omicron:brecha:db:v1:abc');
  });
});
