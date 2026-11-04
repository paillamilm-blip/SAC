import { describe, expect, it } from 'vitest';
import { MUESTRA } from './muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, registrarPrueba, type Db } from './repositorio';
import { analizarPerfil, estadoNodo } from './analisisPerfil';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'gemini', simulado: false };
const T0 = '2026-11-03T10:00:00.000Z';

function nuevo() {
  let n = 0;
  const r = agregarAnalisis(dbVacia(), MUESTRA, META, T0, () => `id${++n}`);
  return { db: r.db, a: r.analisis };
}
function aprobar(db: Db, aId: string, bId: string): Db {
  return registrarPrueba(marcarBrecha(db, aId, bId, 'confirmada', T0), aId, bId, { actaId: bId, puntaje: 80, en: T0 });
}

describe('estadoNodo (el mismo estado que colorea el mapa)', () => {
  it('sin veredicto = detectada; confirmada = reconocida; rechazada = descartada; con prueba = dominada', () => {
    const { db, a } = nuevo();
    const b = a.brechas[0];
    expect(estadoNodo(b)).toBe('detectada');
    expect(estadoNodo({ ...b, veredicto: 'confirmada', veredictoEn: T0 })).toBe('reconocida');
    expect(estadoNodo({ ...b, veredicto: 'rechazada', veredictoEn: T0 })).toBe('descartada');
    expect(estadoNodo({ ...b, veredicto: 'confirmada', veredictoEn: T0, dominadaEn: T0, prueba: { actaId: 'x', puntaje: 80, en: T0 } })).toBe('dominada');
  });
});

describe('analizarPerfil', () => {
  it('sin análisis es null (no inventa un perfil)', () => {
    expect(analizarPerfil(dbVacia())).toBeNull();
  });

  it('trae las variables del mapa: ocupación, nivel, total y los conteos por estado que suman el total', () => {
    const { db, a } = nuevo();
    const p = analizarPerfil(db)!;
    expect(p.ocupacion).toBe(a.ocupacion);
    expect(p.nivel).toBe(a.nivel);
    expect(p.total).toBe(a.brechas.length);
    expect(p.detectadas + p.reconocidas + p.dominadas + p.descartadas).toBe(p.total);
    expect(p.detectadas).toBe(a.brechas.length); // recién analizado: todo detectado
  });

  it('refleja los cambios de estado igual que el mapa', () => {
    const { db, a } = nuevo();
    let d = marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0);
    d = marcarBrecha(d, a.id, a.brechas[1].id, 'rechazada', T0);
    d = aprobar(d, a.id, a.brechas[2].id);
    const p = analizarPerfil(d)!;
    expect(p.reconocidas).toBe(1);
    expect(p.descartadas).toBe(1);
    expect(p.dominadas).toBe(1);
    expect(p.detectadas).toBe(a.brechas.length - 3);
  });

  it('cuenta la evidencia como el mapa: con cita + ausentes = total', () => {
    const { db } = nuevo();
    const p = analizarPerfil(db)!;
    expect(p.conCita + p.ausentes).toBe(p.total);
  });

  it('la severidad solo cuenta las brechas que aún aplican (no las descartadas)', () => {
    const { db, a } = nuevo();
    const total = a.brechas.length;
    const d = marcarBrecha(db, a.id, a.brechas[0].id, 'rechazada', T0);
    const p = analizarPerfil(d)!;
    expect(p.severidad.alta + p.severidad.media + p.severidad.baja).toBe(total - 1);
  });

  it('desglosa por categoría, y cada categoría cuadra su total', () => {
    const { db } = nuevo();
    const p = analizarPerfil(db)!;
    expect(p.porCategoria.length).toBeGreaterThan(0);
    for (const c of p.porCategoria) {
      expect(c.detectadas + c.reconocidas + c.dominadas + c.descartadas).toBe(c.total);
    }
    expect(p.porCategoria.reduce((s, c) => s + c.total, 0)).toBe(p.total);
  });

  it('declara cuando el análisis es la muestra fija', () => {
    let n = 0;
    const r = agregarAnalisis(dbVacia(), MUESTRA, { ...META, simulado: true }, T0, () => `s${++n}`);
    expect(analizarPerfil(r.db)!.esMuestra).toBe(true);
  });
});
