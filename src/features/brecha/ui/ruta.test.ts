import { describe, expect, it } from 'vitest';
import { esRutaUnificada, HREF_PASAPORTE, HREF_PRIVACIDAD, HREF_TERMINOS, hrefReporte, parsearRuta } from './ruta';

describe('ruta del producto único', () => {
  it('reconoce solo /u y sus subrutas', () => {
    expect(esRutaUnificada('/u')).toBe(true);
    expect(esRutaUnificada('/u/reporte/abc')).toBe(true);
    expect(esRutaUnificada('/usuario')).toBe(false);
    expect(esRutaUnificada('/')).toBe(false);
  });

  it('/u es el inicio', () => {
    expect(parsearRuta('/u', '')).toEqual({ nombre: 'inicio' });
    expect(parsearRuta('/u/', '')).toEqual({ nombre: 'inicio' });
  });

  it('/u/pasaporte es el pasaporte', () => {
    expect(parsearRuta('/u/pasaporte', '')).toEqual({ nombre: 'pasaporte' });
    expect(parsearRuta('/u/pasaporte/', '')).toEqual({ nombre: 'pasaporte' });
    expect(parsearRuta(HREF_PASAPORTE, '')).toEqual({ nombre: 'pasaporte' });
    expect(esRutaUnificada(HREF_PASAPORTE)).toBe(true);
  });

  it('/u/terminos y /u/privacidad son los documentos legales', () => {
    expect(parsearRuta(HREF_TERMINOS, '')).toEqual({ nombre: 'legal', doc: 'terminos' });
    expect(parsearRuta(HREF_PRIVACIDAD, '')).toEqual({ nombre: 'legal', doc: 'privacidad' });
  });

  it('lee reporte, pestaña y brecha', () => {
    expect(parsearRuta('/u/reporte/a1', '?tab=brechas&brecha=b2')).toEqual({
      nombre: 'reporte',
      analisisId: 'a1',
      pestana: 'brechas',
      brechaId: 'b2',
    });
  });

  it('una pestaña desconocida cae en el mapa', () => {
    expect(parsearRuta('/u/reporte/a1', '?tab=otra')).toMatchObject({ pestana: 'mapa', brechaId: null });
  });

  it('hrefReporte y parsearRuta son inversas', () => {
    const href = hrefReporte('x y', 'diagnostico', 'b 1');
    const url = new URL(href, 'https://x.test');
    expect(parsearRuta(url.pathname, url.search)).toEqual({
      nombre: 'reporte',
      analisisId: 'x y',
      pestana: 'diagnostico',
      brechaId: 'b 1',
    });
  });

  it('el mapa es la pestaña por defecto y no ensucia la URL', () => {
    expect(hrefReporte('a1')).toBe('/u/reporte/a1');
    expect(hrefReporte('a1', 'mapa')).toBe('/u/reporte/a1');
  });
});
