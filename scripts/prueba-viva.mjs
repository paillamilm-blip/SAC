// Prueba EN VIVO del producto único contra producción (plan-de-accion.md, fase 1.6).
// Abre el sitio real, sube un CV de ejemplo (sintético, público) y recorre el flujo con IA de
// verdad: subir CV -> análisis real (proxy-ai) -> reporte (mapa, brechas, diagnóstico) -> asistente.
// Guarda capturas y la respuesta de proxy-ai como artefactos. Falla (exit 1) si el producto no
// llega al reporte o si proxy-ai no responde 200.
//
// A diferencia de visual-u.mjs (build local en modo demostración, muestra fija), esto pega contra
// el dominio vivo y la cadena de IA real, así que puede tardar (el cliente espera hasta 75 s por
// intento y reintenta una vez). Por eso es de despacho manual y no bloquea el CI de cada push.
//
// Uso (lo ejecuta .github/workflows/prueba-viva.yml):
//   BASE_URL=https://sac-omi.vercel.app node scripts/prueba-viva.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL ?? 'https://sac-omi.vercel.app').replace(/\/$/, '');
const SALIDA = process.env.SALIDA ?? 'prueba-viva';
const PDF = join(AQUI, 'fixtures', 'cv-ejemplo.pdf');
// El análisis real tarda: pdf.js desde cdnjs + hasta 2 intentos de ~75 s cada uno.
const ESPERA_ANALISIS = Number(process.env.ESPERA_ANALISIS ?? 200_000);

mkdirSync(SALIDA, { recursive: true });

const fallos = [];
const falla = (msg) => {
  fallos.push(msg);
  console.log('✗', msg);
};
const ok = (msg) => console.log('✓', msg);

// Todas las respuestas de proxy-ai (puede haber 2 si el primer resultado no supera la validación).
const llamadasProxy = [];

// Violaciones de la política de seguridad (CSP) vistas en producción. Mientras la política esté en modo
// «solo reporte» NO hacen fallar la prueba: sirven para descubrir qué bloquearía antes de activarla.
const violacionesCsp = new Set();
let cabeceraCsp = null;

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: 'es-CL',
  });
  await ctx.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSPVIOLATION|${e.disposition}|${e.effectiveDirective}|${e.blockedURI}|${e.sourceFile || ''}`);
    });
  });
  const page = await ctx.newPage();

  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => {
    const t = m.text();
    if (t.startsWith('CSPVIOLATION|')) {
      const [, modo, directiva, bloqueado, origen] = t.split('|');
      violacionesCsp.add(`[${modo}] ${directiva} → ${bloqueado}${origen ? ` (desde ${origen})` : ''}`);
    } else if (/Content Security Policy/i.test(t)) {
      violacionesCsp.add(t.slice(0, 220));
    }
  });
  // La cabecera de la política que realmente sirve producción (documento principal).
  page.on('response', (res) => {
    if (res.request().resourceType() !== 'document' || !res.url().startsWith(BASE) || cabeceraCsp) return;
    const h = res.headers();
    cabeceraCsp = h['content-security-policy'] ?? h['content-security-policy-report-only'] ?? null;
  });

  // Capturar la respuesta de la Edge Function proxy-ai (estado, modelo, tiempo y cuerpo).
  page.on('response', async (res) => {
    const url = res.url();
    if (!/\/functions\/v1\/proxy-ai/.test(url)) return;
    let cuerpo = null;
    try {
      cuerpo = await res.json();
    } catch {
      try {
        cuerpo = { texto: (await res.text()).slice(0, 2000) };
      } catch {
        cuerpo = null;
      }
    }
    llamadasProxy.push({
      estado: res.status(),
      modelo: cuerpo?.model ?? null,
      tieneTexto: Boolean(cuerpo?.text),
      largoTexto: cuerpo?.text ? String(cuerpo.text).length : 0,
      error: cuerpo?.error ?? null,
      debug: cuerpo?.debug ?? null,
      cuerpo,
    });
    const m = cuerpo?.model ? ` modelo=${cuerpo.model}` : '';
    console.log(`  · proxy-ai respondió ${res.status()}${m}`);
  });

  const foto = (n) => page.screenshot({ path: join(SALIDA, `${n}.png`), fullPage: false });

  try {
    // 1. Inicio
    await page.goto(`${BASE}/u`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.u-app .dropzone', { timeout: 30_000 });
    await page.waitForTimeout(500);
    await foto('01-inicio');
    ok('cargó /u en vivo y aparece la zona para subir el CV');

    // 2. Subir el CV de ejemplo y analizar con IA real
    await page.setInputFiles('input[type=file]', PDF);
    await page.getByRole('button', { name: 'Analizar mi CV' }).click();
    await page.waitForSelector('.escaneo', { timeout: 10_000 });
    await foto('02-escaneando');
    ok('el CV de ejemplo se subió y empezó el escaneo');

    // 3. Esperar el reporte (análisis real). Puede tardar por la cadena de IA.
    await page.waitForURL(/\/u\/reporte\//, { timeout: ESPERA_ANALISIS });
    await page.waitForSelector('.panel-reporte, [role=tabpanel]', { timeout: 15_000 });
    await page.waitForTimeout(1500);
    await foto('03-reporte-mapa');
    ok('el análisis real terminó y abrió el reporte');

    // 4. Recorrer las pestañas hasta la última escena (diagnóstico)
    for (const [nombre, patron] of [
      ['brechas', /Brechas/i],
      ['diagnostico', /Diagn[oó]stico/i],
    ]) {
      const tab = page.getByRole('tab', { name: patron });
      if (await tab.count()) {
        await tab.first().click();
        await page.waitForTimeout(600);
        await foto(`04-reporte-${nombre}`);
        ok(`pestaña «${nombre}» renderiza en vivo`);
      } else {
        falla(`no apareció la pestaña «${nombre}»`);
      }
    }

    // 5. Confirmar una brecha (la interacción central del reporte)
    await page.getByRole('tab', { name: /Brechas/i }).first().click();
    await page.waitForTimeout(400);
    const esReal = page.getByRole('button', { name: 'Es real' }).first();
    if (await esReal.count()) {
      await esReal.click();
      await page.waitForTimeout(500);
      await foto('05-brecha-confirmada');
      ok('se pudo confirmar una brecha en vivo («Es real»)');
    } else {
      falla('no apareció el botón «Es real» en el reporte vivo');
    }

    // 6. Asistente disponible en el reporte
    const abrirAsistente = page.getByRole('button', { name: 'Abrir el asistente' });
    if (await abrirAsistente.count()) {
      await abrirAsistente.click();
      await page.waitForSelector('[role=dialog][aria-label^="Asistente"]', { timeout: 8_000 });
      await page.waitForTimeout(400);
      await foto('06-asistente');
      ok('el asistente abre en vivo desde el reporte');
      await page.keyboard.press('Escape');
    } else {
      falla('no apareció el botón «Abrir el asistente»');
    }

    if (errores.length) falla(`errores de JavaScript en vivo: ${errores.slice(0, 3).join(' | ')}`);
    else ok('sin errores de JavaScript en vivo');
  } catch (e) {
    falla(`la prueba en vivo se interrumpió: ${e instanceof Error ? e.message : e}`);
    await page.screenshot({ path: join(SALIDA, 'error.png') }).catch(() => {});
  } finally {
    // Guardar la respuesta de proxy-ai como artefacto (diagnóstico si la IA falló).
    writeFileSync(join(SALIDA, 'proxy-ai.json'), JSON.stringify(llamadasProxy, null, 2));
    writeFileSync(join(SALIDA, 'csp.json'), JSON.stringify({ cabecera: cabeceraCsp, violaciones: [...violacionesCsp] }, null, 2));
    await browser.close();
  }

  // Veredicto sobre la cadena de IA (independiente de si el DOM llegó al reporte).
  if (llamadasProxy.length === 0) {
    falla('proxy-ai nunca respondió: la IA no está cableada en producción (revisar CORS/ALLOWED_ORIGINS o el despliegue)');
  } else {
    const exitosas = llamadasProxy.filter((c) => c.estado === 200 && c.tieneTexto);
    if (exitosas.length) {
      ok(`proxy-ai devolvió texto usable en ${exitosas.length}/${llamadasProxy.length} llamada(s); modelo=${exitosas[0].modelo ?? '?'}`);
    } else {
      const estados = llamadasProxy.map((c) => c.estado).join(', ');
      const erroresIA = llamadasProxy.map((c) => c.error).filter(Boolean);
      falla(`proxy-ai no devolvió texto usable (estados: ${estados}). Errores: ${erroresIA.slice(0, 2).join(' | ') || 'sin detalle'}. Puede ser inestabilidad del campo gratis de IA, no un bug del producto.`);
    }
  }

  // CSP: informativo mientras esté en modo «solo reporte».
  if (!cabeceraCsp) {
    console.log('⚠ producción no sirve ninguna política de seguridad (CSP): ¿se desplegó vercel.json?');
  } else if (violacionesCsp.size === 0) {
    ok('la política de seguridad (CSP) no tuvo ninguna violación en este recorrido (PDF.js desde cdnjs, estilos, fuentes y datos). No se ejerce: voz, sesión iniciada ni examen');
  } else {
    console.log(`⚠ CSP: ${violacionesCsp.size} violación(es) (aún no bloquean, pero bloquearían al activar la política):`);
    for (const v of violacionesCsp) console.log(`   - ${v}`);
  }

  // Leer el cuerpo de la última llamada para el reporte humano.
  const ultima = llamadasProxy[llamadasProxy.length - 1];
  if (ultima?.cuerpo?.text) {
    console.log('\n--- trecho de la respuesta de proxy-ai ---');
    console.log(String(ultima.cuerpo.text).slice(0, 600));
  }
}

await main();

if (fallos.length) {
  console.log(`\n${fallos.length} fallo(s) en la prueba en vivo`);
  process.exit(1);
}
console.log('\nPrueba en vivo en orden: el producto llega a la última escena con IA real');
