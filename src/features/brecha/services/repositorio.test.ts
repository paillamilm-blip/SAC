import { describe, expect, it } from 'vitest';
import { MUESTRA } from './muestra';
import {
  agregarAnalisis,
  cargar,
  claveDe,
  compararConAnterior,
  dbVacia,
  fusionarDb,
  leerDb,
  mismaBase,
  pendientesDelInvitado,
  traerDelInvitado,
  guardar,
  listarAnalisis,
  marcarBrecha,
  registrarPrueba,
  metricas,
  type Almacen,
  type Db,
} from './repositorio';
import type { PruebaExamen, ResultadoAnalisis } from '../domain/types';

const prueba = (en: string, puntaje = 82): PruebaExamen => ({ actaId: 'acta-1', puntaje, en });

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

describe('marcarBrecha / registrarPrueba', () => {
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
    const intento = registrarPrueba(db, analisis.id, b.id, prueba('2026-11-02T12:00:00.000Z'));
    expect(intento).toBe(db); // sin cambios: misma referencia
    const real = marcarBrecha(db, analisis.id, b.id, 'confirmada', '2026-11-02T11:00:00.000Z');
    const dominada = registrarPrueba(real, analisis.id, b.id, prueba('2026-11-02T12:00:00.000Z', 91));
    const r = dominada.analisis[0].brechas[0];
    expect(r.dominadaEn).toBe('2026-11-02T12:00:00.000Z');
    expect(r.prueba).toEqual({ actaId: 'acta-1', puntaje: 91, en: '2026-11-02T12:00:00.000Z' });
  });

  it('una brecha ya dominada no se vuelve a probar (la primera prueba manda)', () => {
    const { db, analisis } = conUnAnalisis();
    const b = analisis.brechas[0];
    let d = marcarBrecha(db, analisis.id, b.id, 'confirmada', 't1');
    d = registrarPrueba(d, analisis.id, b.id, prueba('t2', 75));
    expect(registrarPrueba(d, analisis.id, b.id, prueba('t3', 99))).toBe(d);
  });

  it('no hay forma de dominar sin prueba: no existe ninguna función de autodeclaración', async () => {
    const modulo = await import('./repositorio');
    expect(Object.keys(modulo)).not.toContain('marcarDominada');
  });

  it('quitar "Es real" o pasar a "No aplica" borra el estado dominada', () => {
    const { db, analisis } = conUnAnalisis();
    const b = analisis.brechas[0];
    let d = marcarBrecha(db, analisis.id, b.id, 'confirmada', 't1');
    d = registrarPrueba(d, analisis.id, b.id, prueba('t2'));
    expect(d.analisis[0].brechas[0].dominadaEn).toBe('t2');
    const rechazada = marcarBrecha(d, analisis.id, b.id, 'rechazada', 't3');
    expect(rechazada.analisis[0].brechas[0].dominadaEn).toBeNull();
    expect(rechazada.analisis[0].brechas[0].prueba).toBeNull();
    const sinVeredicto = marcarBrecha(d, analisis.id, b.id, null, 't3');
    expect(sinVeredicto.analisis[0].brechas[0].veredictoEn).toBeNull();
    expect(sinVeredicto.analisis[0].brechas[0].dominadaEn).toBeNull();
    expect(sinVeredicto.analisis[0].brechas[0].prueba).toBeNull();
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
    d = registrarPrueba(d, analisis.id, analisis.brechas[0].id, prueba('t'));
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

describe('historial del invitado', () => {
  it('lista lo del invitado que la cuenta aún no tiene', () => {
    const invitado = conUnAnalisis().db;
    expect(pendientesDelInvitado(dbVacia(), invitado)).toHaveLength(1);
  });

  it('trae los análisis sin pisar ni repetir los de la cuenta', () => {
    const cuenta = conUnAnalisis('2026-10-01T10:00:00.000Z').db;
    // El fixture genera siempre el mismo id: el del invitado debe ser otro análisis.
    const delInvitado = conUnAnalisis('2026-11-02T10:00:00.000Z').db;
    const invitado = { ...delInvitado, analisis: delInvitado.analisis.map((a) => ({ ...a, id: 'del-invitado' })) };
    const r = traerDelInvitado(cuenta, invitado);
    expect(r.analisis).toHaveLength(2);
    expect(r.analisis[0]).toBe(cuenta.analisis[0]);
    // traerlo otra vez no duplica nada
    expect(traerDelInvitado(r, invitado)).toBe(r);
  });

  it('si el invitado no tiene nada, la cuenta queda igual', () => {
    const cuenta = conUnAnalisis().db;
    expect(pendientesDelInvitado(cuenta, dbVacia())).toHaveLength(0);
    expect(traerDelInvitado(cuenta, dbVacia())).toBe(cuenta);
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

describe('datos guardados antes del examen', () => {
  /** Una base como la dejaba la versión anterior: sin el campo `prueba`, con una brecha «dominada» a mano. */
  function baseAntigua() {
    const { db, analisis } = conUnAnalisis();
    const crudo = JSON.parse(JSON.stringify(db)) as {
      analisis: { brechas: Record<string, unknown>[] }[];
    };
    crudo.analisis[0].brechas.forEach((b) => delete b.prueba);
    crudo.analisis[0].brechas[0].veredicto = 'confirmada';
    crudo.analisis[0].brechas[0].veredictoEn = 't1';
    crudo.analisis[0].brechas[0].dominadaEn = 't2';
    return { crudo, analisis };
  }

  it('se cargan completando prueba con null, sin perder nada', () => {
    const { crudo } = baseAntigua();
    const al = almacenEnMemoria({ [claveDe('u')]: JSON.stringify(crudo) });
    const db = cargar(al, claveDe('u'));
    expect(db.analisis).toHaveLength(1);
    expect(db.analisis[0].brechas.every((b) => b.prueba === null)).toBe(true);
    expect(db.analisis[0].brechas[0].dominadaEn).toBe('t2'); // se conserva
  });

  it('lo marcado a mano se conserva pero NO cuenta como dominada', () => {
    const { crudo } = baseAntigua();
    const db = cargar(almacenEnMemoria({ [claveDe('u')]: JSON.stringify(crudo) }), claveDe('u'));
    expect(metricas(db).dominadas).toBe(0);
    expect(metricas(db).confirmadas).toBe(1);
  });

  it('una prueba mal formada descarta la base entera (no se acepta a medias)', () => {
    const { crudo } = baseAntigua();
    const malas: unknown[] = [
      { actaId: 5, puntaje: 80, en: 't' },
      { actaId: 'a', puntaje: 180, en: 't' },
      { actaId: 'a', puntaje: -1, en: 't' },
      { actaId: 'a', puntaje: Number.NaN, en: 't' },
      { actaId: 'a', puntaje: 80 },
      'aprobado',
    ];
    for (const prueba of malas) {
      const copia = JSON.parse(JSON.stringify(crudo));
      copia.analisis[0].brechas[0].prueba = prueba;
      const db = cargar(almacenEnMemoria({ [claveDe('u')]: JSON.stringify(copia) }), claveDe('u'));
      expect(db).toEqual(dbVacia());
    }
  });

  it('una prueba bien formada sobrevive a guardar y cargar', () => {
    const { db, analisis } = conUnAnalisis();
    let d = marcarBrecha(db, analisis.id, analisis.brechas[0].id, 'confirmada', 't1');
    d = registrarPrueba(d, analisis.id, analisis.brechas[0].id, prueba('t2', 88));
    const al = almacenEnMemoria();
    guardar(al, claveDe('u'), d);
    const vuelta = cargar(al, claveDe('u'));
    expect(vuelta).toEqual(d);
    expect(metricas(vuelta).dominadas).toBe(1);
  });
});

describe('leerDb', () => {
  it('acepta una base válida y completa la prueba con null', () => {
    const { crudo } = (() => {
      const { db } = conUnAnalisis();
      const copia = JSON.parse(JSON.stringify(db)) as { analisis: { brechas: Record<string, unknown>[] }[] };
      copia.analisis[0].brechas.forEach((b) => delete b.prueba);
      return { crudo: copia };
    })();
    const leida = leerDb(crudo);
    expect(leida?.analisis).toHaveLength(1);
    expect(leida?.analisis[0].brechas.every((b) => b.prueba === null)).toBe(true);
  });

  it('rechaza lo que no tiene la forma (nunca se muestra ni se mezcla algo sin validar)', () => {
    for (const malo of [null, undefined, 'x', 5, [], {}, { version: 2, analisis: [] }, { version: 1 }, { version: 1, analisis: [{}] }, { version: 1, analisis: [], actualizadoEn: 5 }]) {
      expect(leerDb(malo)).toBeNull();
    }
  });

  it('conserva actualizadoEn', () => {
    expect(leerDb({ version: 1, analisis: [], actualizadoEn: '2026-11-03T10:00:00.000Z' })?.actualizadoEn).toBe('2026-11-03T10:00:00.000Z');
  });
});

describe('fusionarDb: dos dispositivos, una cuenta', () => {
  /** Una base con un análisis de id fijo, ya con «Es real» marcado en su primera brecha o no. */
  function base(idAnalisis: string, actualizadoEn: string | undefined, realEnPrimera: boolean): Db {
    const n = { v: 0 };
    const { db, analisis } = agregarAnalisis(dbVacia(), MUESTRA, META, '2026-11-03T08:00:00.000Z', () => `${idAnalisis}-${++n.v}`);
    const conId: Db = { ...db, analisis: db.analisis.map((a) => ({ ...a, id: idAnalisis })) };
    const final = realEnPrimera ? marcarBrecha(conId, idAnalisis, analisis.brechas[0].id, 'confirmada', '2026-11-03T09:00:00.000Z') : conId;
    return actualizadoEn ? { ...final, actualizadoEn } : final;
  }

  it('suma los análisis de ambos lados: nunca se pierde uno', () => {
    const local = base('a', '2026-11-03T10:00:00.000Z', false);
    const nube = base('b', '2026-11-03T09:00:00.000Z', false);
    const f = fusionarDb(local, nube);
    expect(f.analisis.map((a) => a.id).sort()).toEqual(['a', 'b']);
    expect(f.actualizadoEn).toBe('2026-11-03T10:00:00.000Z');
  });

  it('en un análisis que está en los dos, manda la copia modificada más recientemente (la local)', () => {
    const local = base('a', '2026-11-03T12:00:00.000Z', true);
    const nube = base('a', '2026-11-03T10:00:00.000Z', false);
    const f = fusionarDb(local, nube);
    expect(f.analisis).toHaveLength(1);
    expect(f.analisis[0].brechas[0].veredicto).toBe('confirmada');
  });

  it('…y si la más reciente es la de la cuenta, manda esa', () => {
    const local = base('a', '2026-11-03T10:00:00.000Z', true);
    const nube = base('a', '2026-11-03T12:00:00.000Z', false);
    expect(fusionarDb(local, nube).analisis[0].brechas[0].veredicto).toBeNull();
  });

  it('quitar «Es real» en un dispositivo no se «resucita» desde la copia vieja del otro', () => {
    const viejaConReal = base('a', '2026-11-03T09:00:00.000Z', true);
    const nuevaSinReal = base('a', '2026-11-03T11:00:00.000Z', false);
    expect(fusionarDb(nuevaSinReal, viejaConReal).analisis[0].brechas[0].veredicto).toBeNull();
    expect(fusionarDb(viejaConReal, nuevaSinReal).analisis[0].brechas[0].veredicto).toBeNull();
  });

  it('en empate gana la cuenta', () => {
    const local = base('a', '2026-11-03T10:00:00.000Z', true);
    const nube = base('a', '2026-11-03T10:00:00.000Z', false);
    expect(fusionarDb(local, nube).analisis[0].brechas[0].veredicto).toBeNull();
  });

  it('datos de antes de existir la nube (sin fecha) pierden contra uno con fecha, y no rompen', () => {
    const sinFecha = base('a', undefined, true);
    const conFecha = base('a', '2026-11-03T10:00:00.000Z', false);
    expect(fusionarDb(sinFecha, conFecha).analisis[0].brechas[0].veredicto).toBeNull();
    const f = fusionarDb(sinFecha, base('b', undefined, false));
    expect(f.analisis).toHaveLength(2);
    expect(f.actualizadoEn).toBeUndefined();
  });

  it('no repite un análisis y es idempotente', () => {
    const a = base('a', '2026-11-03T10:00:00.000Z', true);
    expect(fusionarDb(a, a).analisis).toHaveLength(1);
    expect(fusionarDb(fusionarDb(a, a), a)).toEqual(fusionarDb(a, a));
  });

  it('no muta ninguna de las dos bases', () => {
    const local = base('a', '2026-11-03T12:00:00.000Z', true);
    const nube = base('b', '2026-11-03T10:00:00.000Z', false);
    const antes = JSON.stringify([local, nube]);
    fusionarDb(local, nube);
    expect(JSON.stringify([local, nube])).toBe(antes);
  });
});

describe('mismaBase: igualdad por contenido, no por orden de claves', () => {
  /** Lo que devuelve Postgres tras guardar un jsonb: mismas claves, otro orden. */
  const reordenar = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(reordenar)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.entries(x as object).reverse().map(([k, v]) => [k, reordenar(v)]))
        : x;

  it('una copia que volvió de Postgres con las claves en otro orden es la misma', () => {
    const { db } = conUnAnalisis();
    const conFecha = { ...db, actualizadoEn: '2026-11-03T10:00:00.000Z' };
    const devuelta = reordenar(conFecha) as Db;
    expect(JSON.stringify(devuelta)).not.toBe(JSON.stringify(conFecha)); // el orden sí cambió
    expect(mismaBase(conFecha, devuelta)).toBe(true);
  });

  it('detecta cualquier diferencia real, también dentro de una brecha', () => {
    const { db, analisis } = conUnAnalisis();
    expect(mismaBase(db, db)).toBe(true);
    const otra = marcarBrecha(db, analisis.id, analisis.brechas[0].id, 'confirmada', 't');
    expect(mismaBase(db, otra)).toBe(false);
    expect(mismaBase(db, dbVacia())).toBe(false);
    expect(mismaBase({ ...db, actualizadoEn: 'a' }, { ...db, actualizadoEn: 'b' })).toBe(false);
  });

  it('el orden de los análisis SÍ importa (es una lista) y una clave de más o de menos cuenta', () => {
    const { db } = conUnAnalisis();
    expect(mismaBase(db, { ...db, actualizadoEn: 'x' })).toBe(false);
    expect(mismaBase({ ...db, actualizadoEn: 'x' }, db)).toBe(false);
  });
});
