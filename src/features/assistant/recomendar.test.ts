import { describe, expect, it } from 'vitest';
import { MUESTRA } from '../brecha/services/muestra';
import {
  agregarAnalisis,
  dbVacia,
  marcarBrecha,
  registrarPrueba,
  type Db,
} from '../brecha/services/repositorio';
import { DIAS_PARA_REESCANEAR, pasosDelCiclo, recomendar, resumenProgreso } from './recomendar';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'demostracion', simulado: true };
const T0 = '2026-11-02T10:00:00.000Z';
const PRUEBA = { actaId: 'acta-1', puntaje: 82, en: T0 };

function ids() {
  let n = 0;
  return () => `b${++n}`;
}

function base(): { db: Db; analisisId: string; brechas: { id: string; titulo: string; severidad: string }[] } {
  const r = agregarAnalisis(dbVacia(), MUESTRA, META, T0, ids());
  return { db: r.db, analisisId: r.analisis.id, brechas: r.analisis.brechas };
}

describe('recomendar', () => {
  it('sin análisis, lo único que recomienda es escanear', () => {
    const r = recomendar({ db: dbVacia(), ahora: T0 });
    expect(r).toHaveLength(1);
    expect(r[0].accion).toEqual({ tipo: 'escanear' });
    expect(r[0].origen).toBe('estimacion');
  });

  it('con brechas sin revisar, propone primero la de mayor impacto', () => {
    const { db, brechas } = base();
    const r = recomendar({ db, ahora: T0 });
    expect(r[0].id.startsWith('revisar:')).toBe(true);
    const elegida = brechas.find((b) => r[0].id === `revisar:${b.id}`);
    expect(elegida?.severidad).toBe('alta'); // la muestra tiene brechas de impacto alto
  });

  it('prioriza revisar por sobre trabajar una brecha ya reconocida', () => {
    const { db, analisisId, brechas } = base();
    const d = marcarBrecha(db, analisisId, brechas[0].id, 'confirmada', T0);
    const r = recomendar({ db: d, ahora: T0 });
    expect(r[0].id.startsWith('revisar:')).toBe(true);
    expect(r.some((x) => x.id.startsWith('aprender:'))).toBe(true);
  });

  it('cuando todo está revisado, propone trabajar lo reconocido', () => {
    const { db, analisisId, brechas } = base();
    let d = db;
    brechas.forEach((b, i) => {
      d = marcarBrecha(d, analisisId, b.id, i === 0 ? 'confirmada' : 'rechazada', T0);
    });
    const r = recomendar({ db: d, ahora: T0 });
    expect(r[0].id).toBe(`aprender:${brechas[0].id}`);
    // `base()` usa la muestra fija: el origen debe decirlo, no pasar por «De tu análisis».
    expect(r[0].origen).toBe('muestra');
  });

  it('todo revisado y todo lo real dominado: cierra el ciclo con un nuevo escaneo', () => {
    const { db, analisisId, brechas } = base();
    let d = db;
    brechas.forEach((b, i) => {
      d = marcarBrecha(d, analisisId, b.id, i === 0 ? 'confirmada' : 'rechazada', T0);
    });
    d = registrarPrueba(d, analisisId, brechas[0].id, PRUEBA);
    const r = recomendar({ db: d, ahora: T0 });
    expect(r[0].id).toBe('ciclo-completo');
    expect(r[0].accion).toEqual({ tipo: 'escanear' });
  });

  it('sugiere volver a escanear cuando el análisis es viejo, sin ponerlo primero si hay trabajo pendiente', () => {
    const { db } = base();
    const pasados = new Date(Date.parse(T0) + DIAS_PARA_REESCANEAR * 86_400_000).toISOString();
    const r = recomendar({ db, ahora: pasados });
    expect(r[0].id.startsWith('revisar:')).toBe(true);
    expect(r.some((x) => x.id === 'reescanear')).toBe(true);
  });

  it('no sugiere re-escanear antes de tiempo', () => {
    const { db } = base();
    const r = recomendar({ db, ahora: new Date(Date.parse(T0) + 5 * 86_400_000).toISOString() });
    expect(r.some((x) => x.id === 'reescanear')).toBe(false);
  });

  it('siempre devuelve al menos una recomendación y ninguna acción cambia datos por sí sola', () => {
    const { db, analisisId, brechas } = base();
    const estados: Db[] = [
      dbVacia(),
      db,
      marcarBrecha(db, analisisId, brechas[0].id, 'confirmada', T0),
    ];
    for (const e of estados) {
      const r = recomendar({ db: e, ahora: T0 });
      expect(r.length).toBeGreaterThan(0);
      // Solo se proponen acciones de navegación: ninguna modifica datos por sí sola.
      expect(r.every((x) => x.accion.tipo === 'escanear' || x.accion.tipo === 'abrir_reporte')).toBe(true);
    }
  });

  it('todavía no rotula nada como "probado" (el asistente no lee la prueba del examen)', () => {
    const { db, analisisId, brechas } = base();
    const d = registrarPrueba(marcarBrecha(db, analisisId, brechas[0].id, 'confirmada', T0), analisisId, brechas[0].id, PRUEBA);
    for (const e of [dbVacia(), db, d]) {
      expect(recomendar({ db: e, ahora: T0 }).every((x) => x.origen !== 'probado')).toBe(true);
    }
  });
});

describe('pasosDelCiclo', () => {
  it('sin análisis, el paso activo es escanear y el resto está pendiente', () => {
    const p = pasosDelCiclo({ db: dbVacia(), ahora: T0 });
    expect(p.map((x) => x.estado)).toEqual(['ahora', 'pendiente', 'pendiente', 'pendiente', 'pendiente']);
  });

  it('con 3 de 8 revisadas, "revisar" es parcial y lo dice con su escala', () => {
    const { db, analisisId, brechas } = base();
    let d = db;
    d = marcarBrecha(d, analisisId, brechas[0].id, 'confirmada', T0);
    d = marcarBrecha(d, analisisId, brechas[1].id, 'confirmada', T0);
    d = marcarBrecha(d, analisisId, brechas[2].id, 'rechazada', T0);
    const revisar = pasosDelCiclo({ db: d, ahora: T0 }).find((x) => x.id === 'revisar');
    expect(revisar?.estado).toBe('parcial');
    expect(revisar?.progreso).toBe('3 de 8');
  });

  it('el pasaporte nunca figura como hecho (no hay pruebas todavía)', () => {
    const { db } = base();
    expect(pasosDelCiclo({ db, ahora: T0 }).find((x) => x.id === 'compartir')?.estado).toBe('pendiente');
  });
});

describe('resumenProgreso', () => {
  it('cada número lleva su escala', () => {
    expect(resumenProgreso(dbVacia())).toBe('Aún no has escaneado tu CV.');
    const { db, analisisId, brechas } = base();
    expect(resumenProgreso(db)).toBe('8 brechas por revisar.');
    const d = marcarBrecha(db, analisisId, brechas[0].id, 'confirmada', T0);
    expect(resumenProgreso(d)).toBe('1/8 reales · 0 dominadas · 100 % de precisión.');
  });
});
