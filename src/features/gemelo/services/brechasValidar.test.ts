import { describe, it, expect } from 'vitest';
import { normalizarBrecha, normalizarBrechas } from './brechasValidar';

const OK = {
  categoria: 'conocimiento', titulo: 'Excel avanzado',
  evidencia: 'no aparece en el CV', porQueImporta: 'lo pide el puesto',
  severidad: 'alta',
  aprender: { que: 'tablas dinámicas', como: 'curso 4h + práctica', comoLoDemuestro: 'archivo de ejemplo' },
};

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
    expect(normalizarBrechas([OK, { basura: true }, OK])).toHaveLength(2);
    expect(normalizarBrechas(Array(30).fill(OK))).toHaveLength(12);
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
