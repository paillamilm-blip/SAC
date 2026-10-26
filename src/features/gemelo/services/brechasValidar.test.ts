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
