import { describe, expect, it } from 'vitest';
import { MUESTRA } from './muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, registrarPrueba, type Db } from './repositorio';
import { medirEstandar, resumenCv } from './estandar';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'gemini', simulado: false };
const T0 = '2026-11-03T10:00:00.000Z';

function nuevo() {
  let n = 0;
  const r = agregarAnalisis(dbVacia(), MUESTRA, META, T0, () => `id${++n}`);
  return { db: r.db, a: r.analisis, total: r.analisis.brechas.length };
}
function aprobar(db: Db, aId: string, bId: string): Db {
  return registrarPrueba(marcarBrecha(db, aId, bId, 'confirmada', T0), aId, bId, { actaId: bId, puntaje: 80, en: T0 });
}

describe('medirEstandar', () => {
  it('sin análisis no hay nada que medir', () => {
    expect(medirEstandar(dbVacia())).toBeNull();
  });

  it('recién analizado: falta el 100 %, todo por revisar', () => {
    const { db, total } = nuevo();
    expect(medirEstandar(db)).toMatchObject({ total, conPrueba: 0, reconocidasSinPrueba: 0, sinRevisar: total, faltaPct: 100 });
  });

  it('reconocer una brecha NO la cubre: el porcentaje no se mueve hasta que hay examen', () => {
    const { db, a } = nuevo();
    const e = medirEstandar(marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0));
    expect(e).toMatchObject({ conPrueba: 0, reconocidasSinPrueba: 1, faltaPct: 100 });
  });

  it('un examen aprobado baja lo que falta, con la escala real', () => {
    const { db, a, total } = nuevo();
    const e = medirEstandar(aprobar(db, a.id, a.brechas[0].id));
    expect(e?.conPrueba).toBe(1);
    expect(e?.faltaPct).toBe(Math.round(((total - 1) / total) * 100));
  });

  it('lo descartado («no aplica») sale del total en vez de contar como cubierto', () => {
    const { db, a, total } = nuevo();
    const e = medirEstandar(marcarBrecha(db, a.id, a.brechas[0].id, 'rechazada', T0));
    expect(e).toMatchObject({ total: total - 1, descartadas: 1, conPrueba: 0, faltaPct: 100 });
  });

  it('el redondeo no miente: con algo por cubrir nunca marca 0 %, y con algo cubierto nunca 100 %', () => {
    // 1 de 200 sin cubrir sería 0,5 %: se muestra 1 %, no 0 %.
    const { db, a } = nuevo();
    let d = db;
    const muchas = { ...d, analisis: d.analisis.map((x) => ({ ...x, brechas: Array.from({ length: 200 }, (_, i) => ({ ...x.brechas[0], id: `m${i}` })) })) };
    d = muchas;
    for (let i = 0; i < 199; i++) d = aprobar(d, a.id, `m${i}`);
    expect(medirEstandar(d)?.faltaPct).toBe(1);
    // 1 de 200 cubierta sería 99,5 % → 100 %: debe mostrar 99 %.
    const uno = aprobar(muchas, a.id, 'm0');
    expect(medirEstandar(uno)?.faltaPct).toBe(99);
  });

  it('con todo cubierto falta 0 %', () => {
    const { db, a } = nuevo();
    let d = db;
    for (const b of a.brechas) d = aprobar(d, a.id, b.id);
    expect(medirEstandar(d)).toMatchObject({ faltaPct: 0, conPrueba: a.brechas.length });
  });

  it('si el último análisis es la muestra fija, lo declara', () => {
    let n = 0;
    const r = agregarAnalisis(dbVacia(), MUESTRA, { ...META, simulado: true }, T0, () => `s${++n}`);
    expect(medirEstandar(r.db)?.esMuestra).toBe(true);
  });
});

describe('resumenCv', () => {
  it('sin análisis no hay CV', () => {
    expect(resumenCv(dbVacia())).toBeNull();
  });

  it('devuelve lo que se leyó del CV: archivo, fecha, ocupación, nivel, resumen y fortalezas', () => {
    const { db, a } = nuevo();
    expect(resumenCv(db)).toEqual({
      archivo: 'cv.pdf',
      analizadoEn: T0,
      ocupacion: a.ocupacion,
      nivel: a.nivel,
      resumen: a.resumen,
      fortalezas: a.fortalezas,
      esMuestra: false,
    });
  });
});
