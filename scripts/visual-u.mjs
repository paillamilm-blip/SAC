// Recorrido real del producto único (/u) en un navegador, sobre el build de producción.
// Toma capturas y comprueba lo medible: sin errores de JS, sin desborde horizontal, flujo completo
// (subir CV -> reporte -> revisar brecha -> asistente). Falla (exit 1) si algo de eso no se cumple.
//
// Uso (lo ejecuta .github/workflows/visual-u.yml):  BASE_URL=http://localhost:4173 node scripts/visual-u.mjs

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const SALIDA = process.env.SALIDA ?? 'visual-u';
mkdirSync(SALIDA, { recursive: true });

const fallos = [];
const falla = (msg) => {
  fallos.push(msg);
  console.log('✗', msg);
};
const ok = (msg) => console.log('✓', msg);

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

async function recorrido(browser, nombre, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'es-CL' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  const foto = (n) => page.screenshot({ path: `${SALIDA}/${nombre}-${n}.png`, fullPage: false });
  const desborde = async (etapa) => {
    const sobra = await page.evaluate(() => {
      const el = document.querySelector('.u-app');
      return el ? el.scrollWidth - el.clientWidth : -1;
    });
    if (sobra > 0) falla(`${nombre}/${etapa}: desborde horizontal de ${sobra}px`);
    else ok(`${nombre}/${etapa}: sin desborde horizontal`);
  };

  // 1. Inicio vacío
  await page.goto(`${BASE}/u`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.u-app .dropzone', { timeout: 20_000 });
  await page.waitForTimeout(600);
  await foto('01-inicio');
  await desborde('inicio');

  // 2. Subir un PDF y analizar
  await page.setInputFiles('input[type=file]', { name: 'cv.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.getByRole('button', { name: 'Analizar mi CV' }).click();
  await page.waitForSelector('.escaneo', { timeout: 5_000 });
  await page.waitForTimeout(500);
  await foto('02-escaneando');
  await page.waitForURL(/\/u\/reporte\//, { timeout: 30_000 });
  await page.waitForSelector('.panel-reporte, [role=tabpanel]', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await foto('03-reporte-mapa');
  await desborde('reporte-mapa');
  ok(`${nombre}: el análisis terminó y abrió el reporte`);

  // 3. Revisar una brecha
  await page.getByRole('tab', { name: /Brechas/i }).click();
  await page.waitForTimeout(400);
  await foto('04-reporte-brechas');
  await desborde('reporte-brechas');
  const esReal = page.getByRole('button', { name: 'Es real' }).first();
  if (await esReal.count()) {
    await esReal.click();
    await page.waitForTimeout(500);
    await foto('05-brecha-confirmada');
    ok(`${nombre}: se pudo confirmar una brecha`);
  } else {
    falla(`${nombre}: no apareció el botón «Es real»`);
  }

  // 4. Asistente
  await page.getByRole('button', { name: 'Abrir el asistente' }).click();
  await page.waitForSelector('[role=dialog][aria-label^="Asistente"]', { timeout: 5_000 });
  await page.waitForTimeout(400);
  await foto('06-asistente');
  await page.getByLabel('Mensaje para el asistente').fill('¿qué me falta?');
  await page.getByLabel('Mensaje para el asistente').press('Enter');
  await page.waitForTimeout(500);
  const texto = await page.locator('[role=log]').innerText();
  // El recorrido usa la muestra fija: el asistente debe decirlo, no presentarla como «tu análisis».
  if (/Muestra de ejemplo/.test(texto) && !/De tu análisis/.test(texto)) ok(`${nombre}: el asistente declara el origen «Muestra de ejemplo»`);
  else falla(`${nombre}: el asistente no declara bien el origen de una muestra fija`);
  await foto('07-asistente-respuesta');
  await desborde('asistente');

  // Objetivos táctiles del chat >= 44px
  const chicos = await page.evaluate(() =>
    [...document.querySelectorAll('.u-chat button, .u-chat input')]
      .map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), r: e.getBoundingClientRect() }))
      .filter((x) => x.r.height > 0 && (x.r.height < 43.5 || (x.r.width < 43.5 && x.t.length === 0))),
  );
  if (chicos.length) falla(`${nombre}: objetivos táctiles < 44px en el chat: ${JSON.stringify(chicos.map((c) => c.t))}`);
  else ok(`${nombre}: objetivos táctiles del chat >= 44px`);

  // 5. Persistencia: recargar conserva el análisis
  await page.keyboard.press('Escape');
  await page.goto(`${BASE}/u`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.u-siguiente', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await foto('08-inicio-con-avance');
  if (await page.locator('.u-siguiente').count()) ok(`${nombre}: tras recargar se conserva el avance y aparece «Siguiente paso»`);
  else falla(`${nombre}: tras recargar no aparece «Siguiente paso»`);
  await desborde('inicio-con-avance');

  if (errores.length) falla(`${nombre}: errores de JavaScript: ${errores.slice(0, 3).join(' | ')}`);
  else ok(`${nombre}: sin errores de JavaScript`);
  await ctx.close();
}

async function appAnterior(browser) {
  // La raíz abre el producto único; la app de siempre vive en /anterior y no debe romperse.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const raiz = await ctx.newPage();
  await raiz.goto(`${BASE}/`, { waitUntil: 'load' });
  await raiz.waitForSelector('.u-app', { timeout: 15_000 }).catch(() => {});
  if ((await raiz.locator('.u-app').count()) && new URL(raiz.url()).pathname === '/u') ok('la raíz / abre el producto único (/u)');
  else falla('la raíz / no abrió el producto único');
  await raiz.close();

  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto(`${BASE}/anterior`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SALIDA}/anterior-raiz.png` });
  const hayUApp = await page.locator('.u-app').count();
  if (hayUApp) falla('/anterior muestra el producto único: debería mostrar la app de siempre');
  else ok('/anterior sigue mostrando la app de siempre (sin .u-app)');
  if (errores.length) console.log('(aviso) errores en /anterior:', errores.slice(0, 2).join(' | '));
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await recorrido(browser, 'movil', { width: 390, height: 844 });
  await recorrido(browser, 'escritorio', { width: 1280, height: 800 });
  await appAnterior(browser);
} catch (e) {
  falla(`el recorrido se interrumpió: ${e instanceof Error ? e.message : e}`);
  const p = browser.contexts()[0]?.pages()[0];
  if (p) await p.screenshot({ path: `${SALIDA}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

if (fallos.length) {
  console.log(`\n${fallos.length} fallo(s)`);
  process.exit(1);
}
console.log('\nTodo en orden');
