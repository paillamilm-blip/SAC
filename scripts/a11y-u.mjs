// Auditoría de accesibilidad (WCAG 2.2 AA) del producto único con axe-core, sobre el build de producción.
// Recorre las pantallas que una persona ve (inicio, reporte en sus tres pestañas, asistente) en móvil y
// escritorio y lista cada violación con su impacto y los elementos afectados.
//
// Uso (lo ejecuta .github/workflows/visual-u.yml):  BASE_URL=http://localhost:4173 node scripts/a11y-u.mjs
//   A11Y_ESTRICTO=1  → sale con error si hay violaciones graves (serious/critical). Sin esa variable solo informa.
//
// Qué NO cubre: axe detecta ~30–40 % de los problemas de accesibilidad. No juzga el orden de lectura, si un texto
// alternativo es útil ni el uso con lector de pantalla. Es un piso automático, no una certificación.

import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const SALIDA = process.env.SALIDA ?? 'a11y-u';
const ESTRICTO = process.env.A11Y_ESTRICTO === '1';
mkdirSync(SALIDA, { recursive: true });

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const GRAVES = new Set(['serious', 'critical']);

/** Todas las violaciones encontradas: { pantalla, id, impacto, ayuda, url, nodos: [selector...] } */
const hallazgos = [];

async function auditar(page, pantalla) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS).analyze();
  for (const v of r.violations) {
    hallazgos.push({
      pantalla,
      id: v.id,
      impacto: v.impact,
      ayuda: v.help,
      url: v.helpUrl,
      cantidad: v.nodes.length,
      nodos: v.nodes.slice(0, 4).map((n) => ({
        selector: n.target.join(' '),
        html: n.html.slice(0, 160),
        detalle: (n.any[0]?.message ?? n.all[0]?.message ?? n.none[0]?.message ?? '').slice(0, 200),
      })),
    });
  }
  console.log(`${r.violations.length === 0 ? '✓' : '✗'} ${pantalla}: ${r.violations.length} violación(es), ${r.passes.length} reglas cumplidas`);
}

async function recorrido(browser, nombre, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'es-CL' });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/u`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.u-app .dropzone', { timeout: 20_000 });
  await page.waitForTimeout(600);
  await auditar(page, `${nombre} · inicio`);

  await page.setInputFiles('input[type=file]', { name: 'cv.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.getByRole('button', { name: 'Analizar mi CV' }).click();
  await page.waitForURL(/\/u\/reporte\//, { timeout: 30_000 });
  await page.waitForSelector('.panel-reporte, [role=tabpanel]', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await auditar(page, `${nombre} · reporte · mapa`);

  await page.getByRole('tab', { name: /Brechas/i }).click();
  await page.waitForTimeout(500);
  await auditar(page, `${nombre} · reporte · brechas`);

  const esReal = page.getByRole('button', { name: 'Es real' }).first();
  if (await esReal.count()) {
    await esReal.click();
    await page.waitForTimeout(500);
    await auditar(page, `${nombre} · reporte · brecha reconocida`);
  }

  await page.getByRole('tab', { name: /Diagn[oó]stico/i }).click();
  await page.waitForTimeout(500);
  await auditar(page, `${nombre} · reporte · diagnóstico`);

  await page.getByRole('button', { name: 'Abrir el asistente' }).click();
  await page.waitForSelector('[role=dialog][aria-label^="Asistente"]', { timeout: 5_000 });
  await page.getByLabel('Mensaje para el asistente').fill('¿qué me falta?');
  await page.getByLabel('Mensaje para el asistente').press('Enter');
  await page.waitForTimeout(600);
  await auditar(page, `${nombre} · asistente`);

  await ctx.close();
}

const browser = await chromium.launch();
try {
  await recorrido(browser, 'móvil', { width: 390, height: 844 });
  await recorrido(browser, 'escritorio', { width: 1280, height: 800 });
} catch (e) {
  console.log(`✗ la auditoría se interrumpió: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

// ── Resumen agrupado por regla ─────────────────────────────────────────────────────────────
writeFileSync(`${SALIDA}/axe.json`, JSON.stringify(hallazgos, null, 2));
const porRegla = new Map();
for (const h of hallazgos) {
  const g = porRegla.get(h.id) ?? { id: h.id, impacto: h.impacto, ayuda: h.ayuda, url: h.url, pantallas: new Set(), ejemplos: [] };
  g.pantallas.add(h.pantalla);
  for (const n of h.nodos) if (g.ejemplos.length < 3 && !g.ejemplos.some((e) => e.selector === n.selector)) g.ejemplos.push(n);
  porRegla.set(h.id, g);
}

console.log(`\n=== ${porRegla.size} regla(s) con violaciones ===`);
for (const g of porRegla.values()) {
  console.log(`\n[${g.impacto}] ${g.id}: ${g.ayuda}`);
  console.log(`  en: ${[...g.pantallas].join(' | ')}`);
  for (const e of g.ejemplos) {
    console.log(`  · ${e.selector}`);
    console.log(`      ${e.html.replace(/\s+/g, ' ')}`);
    if (e.detalle) console.log(`      → ${e.detalle.replace(/\s+/g, ' ')}`);
  }
}

const graves = [...porRegla.values()].filter((g) => GRAVES.has(g.impacto));
console.log(`\n${graves.length} regla(s) grave(s) (serious/critical), ${porRegla.size - graves.length} menor(es)`);
if (ESTRICTO && graves.length) {
  console.log('Modo estricto: falla por violaciones graves.');
  process.exit(1);
}
if (!hallazgos.length) console.log('Sin violaciones de WCAG 2.2 AA detectables por axe.');
