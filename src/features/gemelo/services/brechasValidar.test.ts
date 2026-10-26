import { describe, it, expect } from 'vitest';
import { normalizarBrecha, normalizarBrechas } from './brechasValidar';

const OK = {
  categoria: 'conocimiento', titulo: 'Excel avanzado',
  evidencia: 'no aparece en el CV', porQueImporta: 'lo pide el puesto',
  severidad: 'alta',
  aprender: { que: 'tablas dinámicas', como: 'curso 4h + práctica', comoLoDemuestro: 'archivo de ejemplo' },
};

const conTitulo = (t: string) => ({ ...OK, titulo: t });

describe('normalizarBrecha (port del validador de la app CV)', () => {
  it('brecha válida pasa con defaults', () => {
    const r = normalizarBrecha(OK);
    expect(r).not.toBeNull();
    expect(r!.titulo).toBe('Excel avanzado');
    expect(r!.severidad).toBe('alta');
  });
  it('categoria inventada mata la brecha, no la inventa', () => {
    expect(normalizarBrecha({ ...OK, categoria: 'superpoder' })).toBeNull();
  });
  it('severidad inválida cae a media en vez de matar', () => {
    expect(normalizarBrecha({ ...OK, severidad: 'critical' })!.severidad).toBe('media');
  });
  it('aprender incompleto se tolera con vacíos, titulo faltante mata', () => {
    expect(normalizarBrecha({ ...OK, titulo: '' })).toBeNull();
    expect(normalizarBrecha({ ...OK, aprender: {} })!.aprender.que).toBe('');
  });
  it('normalizarBrechas filtra, limita a 12 y no lanza con basura', () => {
    expect(normalizarBrechas(null)).toEqual([]);
    expect(normalizarBrechas('no soy array')).toEqual([]);
    // Titulos distintos: con el dedupe por identidad de skill, un array de `OK`
    // repetidos ya no sirve para medir el corte de 12 (ver describe de abajo).
    expect(normalizarBrechas([conTitulo('A'), { basura: true }, conTitulo('B')])).toHaveLength(2);
    expect(normalizarBrechas(Array.from({ length: 30 }, (_, i) => conTitulo(`skill ${i}`)))).toHaveLength(12);
  });
});

// Dedupe por titulo normalizado: la RPC de 10012 ya dedupa (row_number() ... rn = 1)
// y su `returning id` cubre las dos ramas del upsert, o sea que devuelve UN id por
// cada skill unica. Si el validador conserva los repetidos, `guardado.brechas` trae
// menos ids que brechas tiene el cliente y la lista de suscripciones de Plan B
// queda corta sin que nadie lo vea. El espejo del navegador es la misma identidad
// de skill del spec §4, asi que el Gemelo y la BD ven la misma lista.
describe('normalizarBrechas dedupe por titulo normalizado', () => {
  it('la misma skill escrita dos formas distintas queda una sola vez (y gana la primera)', () => {
    const r = normalizarBrechas([conTitulo('Excel avanzado'), conTitulo('  excel   AVANZADO ')]);
    expect(r).toHaveLength(1);
    // `order by ord` del SQL: se conserva la primera aparicion, con su titulo tal
    // como lo trajo ese run (normalizarBrecha ya recorto por los lados).
    expect(r[0].titulo).toBe('Excel avanzado');
  });

  it('13 titulos unicos cortan en 12 (el dedupe no mueve el MAX_BRECHAS)', () => {
    expect(normalizarBrechas(Array.from({ length: 13 }, (_, i) => conTitulo(`skill ${i}`)))).toHaveLength(12);
  });

  it('un repetido no consume cupo: 13 entradas con 12 titulos unicos dan las 12', () => {
    const unicos = Array.from({ length: 12 }, (_, i) => conTitulo(`skill ${i}`));
    // El duplicado va en el MEDIO y repite una skill ya vista: sin dedupe ocupa un
    // lugar y el corte de 12 se come la ultima skill; con dedupe pasa por arriba y
    // las 12 unicas sobreviven con el titulo de la primera aparicion.
    const con_repetido = [...unicos.slice(0, 5), conTitulo('  SKILL   2 '), ...unicos.slice(5)];
    expect(con_repetido).toHaveLength(13);
    const r = normalizarBrechas(con_repetido);
    expect(r).toHaveLength(12);
    expect(r.map((b) => b.titulo)).toEqual(unicos.map((b) => b.titulo));
    expect(r.map((b) => b.titulo)).toContain('skill 11');
  });
});

// I2: ningun campo puede traer megabytes de un CV malinterpretado. Los topes
// viven en MAX_CAMPO (las tres copias del validador) y el SQL los documenta.
describe('normalizarBrecha recorta cada campo a su maximo', () => {
  const lleno = (n: number) => 'x'.repeat(n);
  const desborda = {
    categoria: 'dura', titulo: lleno(500), evidencia: lleno(5000), porQueImporta: lleno(5000),
    severidad: 'alta',
    aprender: { que: lleno(5000), como: lleno(5000), comoLoDemuestro: lleno(5000) },
  };

  it('recorta a 120 / 400 / 400 / 300 / 400 / 300', () => {
    const r = normalizarBrecha(desborda)!;
    expect(r.titulo).toHaveLength(120);
    expect(r.evidencia).toHaveLength(400);
    expect(r.porQueImporta).toHaveLength(400);
    expect(r.aprender.que).toHaveLength(300);
    expect(r.aprender.como).toHaveLength(400);
    expect(r.aprender.comoLoDemuestro).toHaveLength(300);
  });

  it('un campo justo en el maximo pasa entero (el tope no muerde el borde)', () => {
    const r = normalizarBrecha({
      ...desborda,
      titulo: lleno(120), evidencia: lleno(400), porQueImporta: lleno(400),
      aprender: { que: lleno(300), como: lleno(400), comoLoDemuestro: lleno(300) },
    })!;
    expect(r.titulo).toHaveLength(120);
    expect(r.evidencia).toHaveLength(400);
    expect(r.porQueImporta).toHaveLength(400);
    expect(r.aprender.que).toHaveLength(300);
    expect(r.aprender.como).toHaveLength(400);
    expect(r.aprender.comoLoDemuestro).toHaveLength(300);
  });

  it('el recorte no inventa: solo corta, el texto que queda es el principio', () => {
    const r = normalizarBrecha({ ...desborda, titulo: 'React ' + lleno(300) })!;
    expect(r.titulo.startsWith('React ')).toBe(true);
    expect(r.titulo).toHaveLength(120);
  });

  it('un numero en lugar de texto sigue cayendo a vacio (el corte no lo rescata)', () => {
    const r = normalizarBrecha({ ...desborda, titulo: 'React', evidencia: 42 })!;
    expect(r.evidencia).toBe('');
  });
});
