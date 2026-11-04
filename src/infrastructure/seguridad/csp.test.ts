// Guarda de la política de seguridad de contenido (vercel.json). No prueba el navegador: prueba que la política
// no se debilite por descuido y que cubra lo que el código realmente carga. El navegador real lo prueban
// scripts/visual-u.mjs (la aplica en modo bloqueo sobre el build) y scripts/prueba-viva.mjs (contra producción).

import { describe, expect, it } from 'vitest';
import vercelCrudo from '../../../vercel.json?raw';
import cvExtractCrudo from '../../features/gemelo/services/cvExtract.ts?raw';
import clienteCrudo from '../supabase/client.ts?raw';
// Vitest entrega los .css vacíos (aunque sea con ?raw), así que se lee el index.html, que declara las mismas fuentes.
import htmlCrudo from '../../../index.html?raw';

function politica(): Map<string, string[]> {
  const config = JSON.parse(vercelCrudo) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const global = config.headers.find((h) => h.source === '/(.*)');
  const cab = global?.headers.find((h) => /^content-security-policy(-report-only)?$/i.test(h.key));
  if (!cab) throw new Error('vercel.json no define Content-Security-Policy');
  const mapa = new Map<string, string[]>();
  for (const parte of cab.value.split(';')) {
    const [nombre, ...valores] = parte.trim().split(/\s+/);
    if (nombre) mapa.set(nombre, valores);
  }
  return mapa;
}

const origen = (url: string) => new URL(url).origin;

describe('política de seguridad de contenido (vercel.json)', () => {
  const csp = politica();

  it('empieza cerrando todo y cierra lo peligroso', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('form-action')).toEqual(["'self'"]);
  });

  it('no permite eval, scripts en línea ni comodines en ninguna directiva', () => {
    for (const [directiva, valores] of csp) {
      expect(valores, directiva).not.toContain("'unsafe-eval'");
      expect(valores, directiva).not.toContain('*');
      expect(valores.some((v) => v.startsWith('http:') || v.startsWith('ws:')), `${directiva} permite http/ws sin cifrar`).toBe(false);
    }
    // 'unsafe-inline' solo en estilos (React pone `style=` en los elementos); nunca en scripts.
    expect(csp.get('script-src')).not.toContain("'unsafe-inline'");
    for (const [directiva, valores] of csp) {
      if (valores.includes("'unsafe-inline'")) expect(directiva).toBe('style-src');
    }
  });

  it('los scripts solo vienen del propio sitio y de cdnjs', () => {
    expect(csp.get('script-src')).toEqual(["'self'", 'https://cdnjs.cloudflare.com']);
  });

  it('cubre todo script externo que el código carga (si se agrega un CDN, la política lo exige)', () => {
    const urls = [...cvExtractCrudo.matchAll(/https:\/\/[^\s'"`)]+/g)].map((m) => origen(m[0]));
    expect(urls.length).toBeGreaterThan(0);
    for (const o of new Set(urls)) expect(csp.get('script-src'), o).toContain(o);
  });

  it('permite el proyecto de Supabase que el cliente usa por defecto (datos y tiempo real)', () => {
    const url = clienteCrudo.match(/DEFAULT_SUPABASE_URL = '([^']+)'/)?.[1];
    expect(url).toBeTruthy();
    const host = new URL(url!).host;
    expect(csp.get('connect-src')).toContain(`https://${host}`);
    expect(csp.get('connect-src')).toContain(`wss://${host}`);
  });

  it('cubre cada origen externo que declara index.html (Google Fonts) y no abre más estilos de los necesarios', () => {
    const origenes = [...htmlCrudo.matchAll(/<link[^>]+href="(https:\/\/[^"]+)"/g)].map((m) => origen(m[1]));
    expect(origenes.length).toBeGreaterThan(0);
    for (const o of new Set(origenes)) {
      const cubierto = (csp.get('style-src') ?? []).includes(o) || (csp.get('font-src') ?? []).includes(o);
      expect(cubierto, `${o} no está cubierto por style-src ni font-src`).toBe(true);
    }
    expect(csp.get('style-src')).toEqual(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    expect(csp.get('font-src')).toContain('https://fonts.gstatic.com');
  });

  it('permite el audio y el worker de PDF.js que se crean desde blob:', () => {
    expect(csp.get('media-src')).toContain('blob:');
    expect(csp.get('worker-src')).toContain('blob:');
  });
});
