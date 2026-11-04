// Recorrido real del producto único (/u) en un navegador, sobre el build de producción.
// Toma capturas y comprueba lo medible: sin errores de JS, sin desborde horizontal, flujo completo
// (subir CV -> reporte -> revisar brecha -> asistente). Falla (exit 1) si algo de eso no se cumple.
//
// Uso (lo ejecuta .github/workflows/visual-u.yml):  BASE_URL=http://localhost:4173 node scripts/visual-u.mjs

import { mkdirSync, readFileSync } from 'node:fs';
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

// ── Política de seguridad de contenido ───────────────────────────────────────────────────────
// La política que declara vercel.json se aplica aquí en MODO BLOQUEO sobre el build real: si la app carga o hace
// algo que la política no permite, el recorrido falla. Así se prueba la CSP antes de desplegarla.
function cargarCsp() {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const global = cfg.headers.find((h) => h.source === '/(.*)');
  const cab = global?.headers.find((h) => /^content-security-policy/i.test(h.key));
  if (!cab) throw new Error('vercel.json no define Content-Security-Policy');
  let valor = cab.value;
  // En CI el proyecto de Supabase es un valor ficticio: se sustituye el host de la política para no dar falsos positivos.
  if (process.env.VITE_SUPABASE_URL) {
    valor = valor.replaceAll('cuwuyqpxaibbqjrvamjb.supabase.co', new URL(process.env.VITE_SUPABASE_URL).host);
  }
  return valor;
}
const CSP = cargarCsp();
const violacionesCsp = new Set();

async function aplicarCsp(ctx) {
  await ctx.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSPVIOLATION|${e.effectiveDirective}|${e.blockedURI}|${e.sourceFile || ''}`);
    });
  });
  ctx.on('page', (p) =>
    p.on('console', (m) => {
      const t = m.text();
      if (t.startsWith('CSPVIOLATION|')) {
        const [, directiva, bloqueado, origen] = t.split('|');
        violacionesCsp.add(`${directiva} bloqueó ${bloqueado}${origen ? ` (desde ${origen})` : ''}`);
      } else if (/Content Security Policy/i.test(t)) {
        violacionesCsp.add(t.slice(0, 220));
      }
    }),
  );
  // Solo el documento HTML lleva la cabecera (en vite preview no existen las de vercel.json).
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    if (req.resourceType() !== 'document' || !req.url().startsWith(BASE)) return route.continue();
    const resp = await route.fetch();
    const headers = { ...resp.headers() };
    delete headers['content-security-policy-report-only'];
    headers['content-security-policy'] = CSP;
    return route.fulfill({ response: resp, headers });
  });
}

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

async function recorrido(browser, nombre, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'es-CL' });
  await aplicarCsp(ctx);
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
  // El asistente se despliega solo al llegar al mapa: si ya está abierto, no hay botón que pulsar.
  if ((await page.locator('[role=dialog][aria-label^="Asistente"]').count()) === 0) {
    await page.getByRole('button', { name: 'Abrir el asistente' }).click();
  }
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

async function todoAbreElProducto(browser) {
  // Es un solo producto: la raíz, /anterior y los enlaces viejos con parámetros terminan en /u.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await aplicarCsp(ctx);
  for (const entrada of ['/', '/anterior', '/?tab=wallet', '/?source=pwa']) {
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await page.goto(`${BASE}${entrada}`, { waitUntil: 'load' });
    await page.waitForSelector('.u-app', { timeout: 15_000 }).catch(() => {});
    const destino = new URL(page.url()).pathname;
    if ((await page.locator('.u-app').count()) && destino === '/u') ok(`${entrada} abre el producto único (/u)`);
    else falla(`${entrada} no abrió el producto único (terminó en ${destino})`);
    if (await page.getByText('Versión anterior').count()) falla(`${entrada}: aparece un enlace a la «versión anterior»`);
    if (errores.length) falla(`${entrada}: errores de JavaScript: ${errores.slice(0, 2).join(' | ')}`);
    await page.close();
  }
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await recorrido(browser, 'movil', { width: 390, height: 844 });
  await recorrido(browser, 'escritorio', { width: 1280, height: 800 });
  await todoAbreElProducto(browser);
  if (violacionesCsp.size) {
    for (const v of violacionesCsp) falla(`CSP: ${v}`);
  } else {
    ok('la política de seguridad (CSP) se cumplió en todo el recorrido, sin violaciones');
  }
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
