import { describe, expect, it } from 'vitest';
import { MUESTRA } from './muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, registrarPrueba, type Db } from './repositorio';
import { armarPasaporte } from './pasaporte';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'gemini', simulado: false };
const T0 = '2026-11-02T10:00:00.000Z';
const T1 = '2026-11-03T10:00:00.000Z';

function conAnalisis(ahora = T0, prefijo = 'a', meta = META) {
  let n = 0;
  const r = agregarAnalisis(dbVacia(), MUESTRA, meta, ahora, () => `${prefijo}${++n}`);
  return { db: r.db, a: r.analisis };
}
function aprobar(db: Db, aId: string, bId: string, puntaje: number, en: string): Db {
  const d = marcarBrecha(db, aId, bId, 'confirmada', en);
  return registrarPrueba(d, aId, bId, { actaId: `acta-${bId}`, puntaje, en });
}

describe('armarPasaporte', () => {
  it('sin análisis: vacío y sin inventar nada', () => {
    expect(armarPasaporte(dbVacia())).toEqual({ ocupacion: null, esMuestra: false, sellos: [], porGanar: [], porReconocer: 0 });
  });

  it('sin pruebas: ningún sello; todas las brechas están por reconocer', () => {
    const { db, a } = conAnalisis();
    const p = armarPasaporte(db);
    expect(p.sellos).toHaveLength(0);
    expect(p.porGanar).toHaveLength(0);
    expect(p.porReconocer).toBe(a.brechas.length);
    expect(p.ocupacion).toBe(a.ocupacion);
  });

  it('una brecha reconocida sin examen es un sello POR GANAR, no un sello', () => {
    const { db, a } = conAnalisis();
    const d = marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0);
    const p = armarPasaporte(d);
    expect(p.sellos).toHaveLength(0);
    expect(p.porGanar.map((x) => x.brechaId)).toEqual([a.brechas[0].id]);
    expect(p.porReconocer).toBe(a.brechas.length - 1);
  });

  it('un examen aprobado es un sello con su puntaje y su fecha, y deja de estar por ganar', () => {
    const { db, a } = conAnalisis();
    const b = a.brechas[0];
    const p = armarPasaporte(aprobar(db, a.id, b.id, 82, T1));
    expect(p.sellos).toEqual([{ analisisId: a.id, brechaId: b.id, titulo: b.titulo, categoria: b.categoria, puntaje: 82, en: T1 }]);
    expect(p.porGanar).toHaveLength(0);
  });

  it('lo marcado como dominada a mano (sin prueba) NO es un sello', () => {
    const { db, a } = conAnalisis();
    const b = a.brechas[0];
    const manual = { ...db, analisis: db.analisis.map((x) => ({ ...x, brechas: x.brechas.map((y) => (y.id === b.id ? { ...y, veredicto: 'confirmada' as const, dominadaEn: T1, prueba: null } : y)) })) };
    expect(armarPasaporte(manual).sellos).toHaveLength(0);
  });

  it('la misma habilidad en dos análisis es un solo sello: el de la prueba más reciente', () => {
    const uno = conAnalisis(T0, 'a');
    const dos = agregarAnalisis(uno.db, MUESTRA, META, T1, (() => { let n = 0; return () => `b${++n}`; })());
    let db = aprobar(dos.db, uno.a.id, uno.a.brechas[0].id, 71, T0);
    db = aprobar(db, dos.analisis.id, dos.analisis.brechas[0].id, 90, T1);
    const p = armarPasaporte(db);
    expect(p.sellos).toHaveLength(1);
    expect(p.sellos[0].puntaje).toBe(90);
  });

  it('por ganar va de mayor a menor impacto', () => {
    const { db, a } = conAnalisis();
    let d = db;
    for (const b of a.brechas) d = marcarBrecha(d, a.id, b.id, 'confirmada', T0);
    const orden = armarPasaporte(d).porGanar.map((x) => x.severidad);
    expect(orden).toEqual([...orden].sort((x, y) => 'alta media baja'.indexOf(x) - 'alta media baja'.indexOf(y)));
  });

  it('si el último análisis es la muestra fija, el pasaporte lo declara', () => {
    const { db } = conAnalisis(T0, 'a', { ...META, simulado: true });
    expect(armarPasaporte(db).esMuestra).toBe(true);
  });
});
