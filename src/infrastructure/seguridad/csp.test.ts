// Guarda de la política de seguridad de contenido (vercel.json). No prueba el navegador: prueba que la política
// no se debilite por descuido y que cubra lo que el código realmente carga. El navegador real lo prueban
// scripts/visual-u.mjs (la aplica en modo bloqueo sobre el build) y scripts/prueba-viva.mjs (contra producción).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../../..');
const leer = (ruta: string) => readFileSync(resolve(RAIZ, ruta), 'utf8');

function politica(): Map<string, string[]> {
  const config = JSON.parse(leer('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
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
    const fuente = leer('src/features/gemelo/services/cvExtract.ts');
    const urls = [...fuente.matchAll(/https:\/\/[^\s'"`)]+/g)].map((m) => origen(m[0]));
    expect(urls.length).toBeGreaterThan(0);
    for (const o of new Set(urls)) expect(csp.get('script-src'), o).toContain(o);
  });

  it('permite el proyecto de Supabase que el cliente usa por defecto (datos y tiempo real)', () => {
    const cliente = leer('src/infrastructure/supabase/client.ts');
    const url = cliente.match(/DEFAULT_SUPABASE_URL = '([^']+)'/)?.[1];
    expect(url).toBeTruthy();
    const host = new URL(url!).host;
    expect(csp.get('connect-src')).toContain(`https://${host}`);
    expect(csp.get('connect-src')).toContain(`wss://${host}`);
  });

  it('permite las fuentes de Google que importa index.css y nada más en estilos', () => {
    const css = leer('src/index.css');
    expect(css).toContain('https://fonts.googleapis.com');
    expect(csp.get('style-src')).toEqual(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    expect(csp.get('font-src')).toContain('https://fonts.gstatic.com');
  });

  it('permite el audio y el worker de PDF.js que se crean desde blob:', () => {
    expect(csp.get('media-src')).toContain('blob:');
    expect(csp.get('worker-src')).toContain('blob:');
  });
});
