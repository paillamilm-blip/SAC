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

  // Ningún botón del reporte puede quedar tapado por otro elemento (p. ej. el asistente desplegado).
  const tapados = async (etapa) => {
    const lista = await page.evaluate(() => {
      const tapadosAqui = [];
      const candidatos = [...document.querySelectorAll('.u-app main button, .u-app main [role=button], .u-app .pestana-bar [role=tab]')];
      for (const el of candidatos) {
        if (el.closest('[aria-hidden=true]') || el.hasAttribute('disabled')) continue;
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const arriba = document.elementFromPoint(x, y);
        if (arriba && !el.contains(arriba) && !arriba.contains(el)) {
          tapadosAqui.push((el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 40));
        }
      }
      return tapadosAqui;
    });
    if (lista.length) falla(`${nombre}/${etapa}: botones tapados por otro elemento: ${JSON.stringify(lista)}`);
    else ok(`${nombre}/${etapa}: todos los botones se pueden tocar`);
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
  await tapados('reporte-mapa');
  ok(`${nombre}: el análisis terminó y abrió el reporte`);

  // 3. Revisar una brecha
  await page.getByRole('tab', { name: /Brechas/i }).click();
  await page.waitForTimeout(400);
  await foto('04-reporte-brechas');
  await desborde('reporte-brechas');
  await tapados('reporte-brechas');
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
  await tapados('inicio-con-avance');

  // Mi perfil: el avatar abre un diálogo y se cierra con Escape.
  await page.getByRole('button', { name: /Abrir mi perfil/ }).click();
  await page.waitForSelector('[role=dialog][aria-label], [role=dialog][aria-labelledby="u-perfil-t"]', { timeout: 5_000 });
  await foto('09-perfil');
  // El panel scrollea en vertical: un par de px de diferencia es la barra de scroll, no un desborde real.
  const sobraPerfil = await page.evaluate(() => {
    const d = document.querySelector('.u-perfil');
    return d ? d.scrollWidth - d.clientWidth : -1;
  });
  if (sobraPerfil > 2) falla(`${nombre}: el diálogo «Mi perfil» se desborda ${sobraPerfil}px hacia los lados`);
  else ok(`${nombre}: «Mi perfil» cabe sin desbordarse`);
  const textoPerfil = (await page.locator('.u-perfil').textContent()) ?? '';
  const okPerfil = /\d+ %/.test(textoPerfil) && /Tu CV en Ómicrom/.test(textoPerfil) && /Tu mapa mental, en números/.test(textoPerfil);
  if (okPerfil) ok(`${nombre}: «Mi perfil» muestra cuánto falta, el análisis del mapa y «Tu CV en Ómicrom»`);
  else falla(`${nombre}: «Mi perfil» no muestra el porcentaje, el análisis del mapa o el CV`);
  await desborde('perfil');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if ((await page.locator('#u-perfil-t').count()) === 0) ok(`${nombre}: «Mi perfil» abre y cierra con Escape`);
  else falla(`${nombre}: «Mi perfil» no se cerró con Escape`);

  // Cada paso de «Tu ciclo» es un botón que lleva a algún lado.
  const pasos = await page.locator('.u-ciclo .u-paso-boton').count();
  if (pasos === 5) ok(`${nombre}: los 5 pasos de «Tu ciclo» son botones`);
  else falla(`${nombre}: «Tu ciclo» tiene ${pasos} botones (se esperaban 5)`);
  // El paso 5 abre el pasaporte: sin pruebas muestra los sellos por ganar (nunca un botón muerto).
  await page.locator('.u-ciclo .u-paso-boton').nth(4).click();
  await page.waitForURL(/\/u\/pasaporte/, { timeout: 5_000 }).catch(() => {});
  if (/\/u\/pasaporte/.test(page.url())) {
    await page.waitForSelector('.u-pasaporte', { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);
    await foto('10-pasaporte');
    await desborde('pasaporte');
    await tapados('pasaporte');
    const sellos = await page.locator('.u-sello').count();
    if (sellos > 0) ok(`${nombre}: el pasaporte muestra ${sellos} sello(s) por ganar y se pueden tocar`);
    else falla(`${nombre}: el pasaporte no muestra ningún sello por ganar tras reconocer una brecha`);
    await page.goBack();
    await page.waitForSelector('.u-ciclo', { timeout: 5_000 });
  } else {
    falla(`${nombre}: «Compartir tu pasaporte» no abrió el pasaporte (quedó en ${page.url()})`);
  }

  await page.locator('.u-ciclo .u-paso-boton').nth(1).click();
  await page.waitForURL(/\/u\/reporte\//, { timeout: 5_000 }).catch(() => {});
  if (/\/u\/reporte\//.test(page.url())) ok(`${nombre}: «Ver tu mapa» abre el mapa`);
  else falla(`${nombre}: «Ver tu mapa» no abrió el mapa (quedó en ${page.url()})`);

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


/**
 * Sesión válida + servidor inalcanzable: la pantalla NO debe decir «sin acceso» ni mostrar al usuario como invitado;
 * debe ofrecer «Reintentar» (con contador) y no ofrecer «Cerrar sesión».
 *
 * La sesión se siembra en localStorage con la clave que usa supabase-js (`sb-<proyecto>-auth-token`) y todo el tráfico a
 * *.supabase.co se aborta: así el fallo es de red, determinista y sin depender de DNS.
 */
async function errorDePerfil(browser, nombre, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'es-CL' });
  const proyecto = new URL(process.env.VITE_SUPABASE_URL ?? 'https://ci-placeholder.supabase.co').hostname.split('.')[0];
  const sesion = {
    access_token: 'ci.fake.token',
    refresh_token: 'ci-fake-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: '00000000-0000-4000-8000-0000000000aa',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'prueba@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };
  await ctx.addInitScript(
    ([clave, valor]) => localStorage.setItem(clave, valor),
    [`sb-${proyecto}-auth-token`, JSON.stringify(sesion)],
  );
  // Por nombre de host (no por patrón de ruta): cualquier petición a un *.supabase.co falla al instante.
  const abortadas = [];
  await ctx.route(
    (url) => url.hostname.endsWith('.supabase.co'),
    (r) => {
      abortadas.push(`${r.request().method()} ${new URL(r.request().url()).pathname}`);
      return r.abort('failed');
    },
  );

  const page = await ctx.newPage();
  const errores = [];
  const consola = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) consola.push(`${m.type()}: ${m.text().slice(0, 160)}`);
  });
  await page.goto(`${BASE}/u`, { waitUntil: 'load' });

  const titulo = page.getByRole('heading', { name: 'No pudimos cargar tu perfil' });
  try {
    await titulo.waitFor({ timeout: 30_000 });
  } catch {
    falla(`${nombre}/error-perfil: no apareció «No pudimos cargar tu perfil» (¿se tragó la sesión o quedó como invitado?)`);
    // Diagnóstico: qué había en el almacenamiento, qué se veía y qué peticiones se abortaron.
    const diag = await page
      .evaluate(() => ({ claves: Object.keys(localStorage), texto: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) }))
      .catch(() => ({ claves: ['?'], texto: '?' }));
    console.log(`  · diag ${nombre}: clave sembrada=sb-${proyecto}-auth-token | localStorage=${JSON.stringify(diag.claves)}`);
    console.log(`  · diag ${nombre}: texto visible="${diag.texto}"`);
    console.log(`  · diag ${nombre}: peticiones a supabase abortadas (${abortadas.length}): ${abortadas.slice(0, 6).join(' ; ') || 'ninguna'}`);
    console.log(`  · diag ${nombre}: consola: ${consola.slice(0, 5).join(' || ') || 'vacía'}`);
    await page.screenshot({ path: `${SALIDA}/${nombre}-11-error-perfil-FALLO.png` }).catch(() => {});
    await ctx.close();
    return;
  }
  ok(`${nombre}/error-perfil: la red caída muestra un aviso recuperable`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SALIDA}/${nombre}-11-error-perfil.png` });

  const cuerpo = (await page.locator('body').textContent()) ?? '';
  if (/sin acceso|no tienes acceso/i.test(cuerpo)) falla(`${nombre}/error-perfil: dice «sin acceso» aunque fue la red`);
  else ok(`${nombre}/error-perfil: no dice «sin acceso»`);
  if (/Iniciar sesión|Invitado/.test(cuerpo)) falla(`${nombre}/error-perfil: trata a una persona con sesión como invitada`);
  else ok(`${nombre}/error-perfil: no la trata como invitada`);
  if (await page.getByRole('button', { name: /cerrar sesión/i }).count()) falla(`${nombre}/error-perfil: ofrece «Cerrar sesión» (parece una expulsión)`);
  else ok(`${nombre}/error-perfil: no ofrece «Cerrar sesión»`);

  const boton = page.getByRole('button', { name: 'Reintentar' });
  const alto = await boton.evaluate((el) => el.getBoundingClientRect().height);
  if (alto < 43.5) falla(`${nombre}/error-perfil: «Reintentar» mide ${alto}px (< 44px)`);
  else ok(`${nombre}/error-perfil: «Reintentar» mide ${Math.round(alto)}px`);

  const sobra = await page.evaluate(() => {
    const el = document.querySelector('.u-app');
    return el ? el.scrollWidth - el.clientWidth : -1;
  });
  if (sobra > 0) falla(`${nombre}/error-perfil: desborde horizontal de ${sobra}px`);
  else ok(`${nombre}/error-perfil: sin desborde horizontal`);

  await boton.click();
  try {
    // supabase-js reintenta la lectura 3 veces (≈7 s) antes de rendirse: se espera con holgura.
    await page.getByText('Reintento 1: seguimos sin conexión con el servidor.').waitFor({ timeout: 30_000 });
    ok(`${nombre}/error-perfil: «Reintentar» vuelve a intentar y cuenta el reintento`);
  } catch {
    falla(`${nombre}/error-perfil: tras «Reintentar» no apareció el contador de reintentos`);
    const texto = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 260)).catch(() => '?');
    console.log(`  · diag ${nombre}: tras reintentar se ve="${texto}"`);
    console.log(`  · diag ${nombre}: peticiones abortadas (${abortadas.length}): ${abortadas.slice(0, 8).join(' ; ')}`);
    console.log(`  · diag ${nombre}: consola: ${consola.slice(0, 5).join(' || ') || 'vacía'}`);
    await page.screenshot({ path: `${SALIDA}/${nombre}-11-error-perfil-tras-reintentar-FALLO.png` }).catch(() => {});
  }
  if (errores.length) falla(`${nombre}/error-perfil: errores de JavaScript: ${errores.slice(0, 2).join(' | ')}`);
  await ctx.close();
}


/**
 * Formatos de CV: PDF y Word (.docx).
 *   A) La pantalla de subida acepta .docx, y rechaza con un mensaje útil el Word antiguo (.doc) y otros formatos.
 *   B) La LECTURA real: se empaqueta el mismo `extractCVText` de la app (esbuild) y se le da un .docx y un PDF reales. Las
 *      librerías (Mammoth y PDF.js) se descargan de su CDN BAJO LA POLÍTICA DE SEGURIDAD REAL del sitio, así que también se
 *      comprueba que esa política las deja cargar. No incluye la llamada a la IA: eso necesita el servidor.
 */
async function formatosDeCv(browser) {
  const nombre = 'escritorio';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'es-CL' });
  await aplicarCsp(ctx);

  // El lector de la app, empaquetado para el navegador y expuesto como window.__cvExtract (sin pasar por la CSP: es un init script).
  let lector = null;
  try {
    const { buildSync } = await import('esbuild');
    lector = buildSync({
      entryPoints: ['src/features/gemelo/services/cvExtract.ts'],
      bundle: true,
      format: 'iife',
      globalName: '__cvExtract',
      platform: 'browser',
      target: 'es2020',
      write: false,
    }).outputFiles[0].text;
  } catch (e) {
    falla(`${nombre}/formatos: no se pudo empaquetar cvExtract con esbuild (${e instanceof Error ? e.message : e})`);
  }
  if (lector) await ctx.addInitScript({ content: lector });

  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto(`${BASE}/u`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.u-app .dropzone', { timeout: 20_000 });

  const docx = readFileSync(new URL('./fixtures/cv-ejemplo.docx', import.meta.url));
  const pdf = readFileSync(new URL('./fixtures/cv-ejemplo.pdf', import.meta.url));
  const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  // A) La pantalla de subida
  await page.setInputFiles('input[type=file]', { name: 'mi-cv.docx', mimeType: TIPO_DOCX, buffer: docx });
  if (await page.getByText('listo para analizar').count()) ok(`${nombre}/formatos: acepta un Word (.docx)`);
  else falla(`${nombre}/formatos: no aceptó un .docx`);
  // Sin tipo MIME (pasa en algunos sistemas): debe bastar la extensión.
  await page.setInputFiles('input[type=file]', { name: 'sin-tipo.docx', mimeType: '', buffer: docx });
  if (await page.getByText('listo para analizar').count()) ok(`${nombre}/formatos: acepta un .docx aunque el sistema no informe su tipo`);
  else falla(`${nombre}/formatos: rechazó un .docx sin tipo MIME`);

  await page.setInputFiles('input[type=file]', { name: 'antiguo.doc', mimeType: 'application/msword', buffer: Buffer.from('doc') });
  const errDoc = (await page.getByRole('alert').first().textContent().catch(() => '')) ?? '';
  if (/Word antiguo \(\.doc\)/.test(errDoc) && /\.docx/.test(errDoc)) ok(`${nombre}/formatos: explica qué hacer con un .doc antiguo`);
  else falla(`${nombre}/formatos: mensaje para .doc inesperado: «${errDoc.slice(0, 120)}»`);

  await page.setInputFiles('input[type=file]', { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  const errPng = (await page.getByRole('alert').first().textContent().catch(() => '')) ?? '';
  if (/no es un PDF ni un Word/.test(errPng)) ok(`${nombre}/formatos: rechaza otros formatos diciendo cuáles sirven`);
  else falla(`${nombre}/formatos: mensaje para otro formato inesperado: «${errPng.slice(0, 120)}»`);
  await foto2(page, nombre, '12-formatos-cv');

  // B) La lectura real, con el lector de la app y las librerías desde su CDN bajo la CSP real
  if (!lector) {
    await ctx.close();
    return;
  }
  const leer = (b64, nombreArchivo, tipo) =>
    page.evaluate(
      async ([datos, n, t]) => {
        const bytes = Uint8Array.from(atob(datos), (c) => c.charCodeAt(0));
        return await window.__cvExtract.extractCVText(new File([bytes], n, { type: t }));
      },
      [b64, nombreArchivo, tipo],
    );

  try {
    const t = await leer(docx.toString('base64'), 'cv.docx', TIPO_DOCX);
    if (/Planificacion de clases de lenguaje/.test(t) && /EDUCACIÓN/.test(t) && /enseñanza básica/.test(t)) {
      ok(`${nombre}/formatos: lee un .docx real (${t.length} caracteres, con tildes y eñes intactas)`);
    } else {
      falla(`${nombre}/formatos: el .docx se leyó mal: «${t.slice(0, 160)}»`);
    }
  } catch (e) {
    falla(`${nombre}/formatos: no se pudo leer el .docx: ${e instanceof Error ? e.message : e}`);
  }

  try {
    const t = await leer(pdf.toString('base64'), 'cv.pdf', 'application/pdf');
    if (/Mantencion/.test(t)) ok(`${nombre}/formatos: lee un PDF real (${t.length} caracteres) con PDF.js bajo la CSP`);
    else falla(`${nombre}/formatos: el PDF se leyó mal: «${t.slice(0, 160)}»`);
  } catch (e) {
    falla(`${nombre}/formatos: no se pudo leer el PDF: ${e instanceof Error ? e.message : e}`);
  }

  // Un .docx dañado no debe colgar ni dar basura: devuelve vacío (la pantalla lo explica).
  try {
    const t = await leer(Buffer.from('esto no es un zip de Word').toString('base64'), 'roto.docx', TIPO_DOCX);
    if (t.trim().length < 30) ok(`${nombre}/formatos: un .docx dañado no produce texto basura`);
    else falla(`${nombre}/formatos: un .docx dañado devolvió texto: «${t.slice(0, 80)}»`);
  } catch (e) {
    falla(`${nombre}/formatos: un .docx dañado lanzó un error en vez de quedar vacío: ${e instanceof Error ? e.message : e}`);
  }

  if (errores.length) falla(`${nombre}/formatos: errores de JavaScript: ${errores.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
async function foto2(page, nombre, etiqueta) {
  await page.screenshot({ path: `${SALIDA}/${nombre}-${etiqueta}.png` }).catch(() => {});
}

const browser = await chromium.launch();
try {
  await recorrido(browser, 'movil', { width: 390, height: 844 });
  await recorrido(browser, 'escritorio', { width: 1280, height: 800 });
  await todoAbreElProducto(browser);
  await formatosDeCv(browser);
  await errorDePerfil(browser, 'movil', { width: 390, height: 844 });
  await errorDePerfil(browser, 'escritorio', { width: 1280, height: 800 });
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
