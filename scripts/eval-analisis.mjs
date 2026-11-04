// Banco de evaluación del análisis de CV (calidad del análisis, PR «calidad-analisis»).
// Pasa cada CV sintético de scripts/fixtures/cvs/*.txt por la MISMA cadena que la app: el mismo prompt
// (services/promptAnalisis.ts), el proxy-ai real y la MISMA validación (domain/validar.ts, con hasta 2
// intentos como la app). Informa conteos reales, sin puntajes inventados:
//   · análisis válidos / CVs
//   · brechas aceptadas de las propuestas (cuánto del modelo sobrevive a «cita literal del CV»)
//   · brechas con cita verificada vs «Ausente en el CV:»
//   · intentos y modelo por CV
// No mide si una brecha es CORRECTA para la persona: eso solo lo dice ella con «Es real» / «No aplica».
//
// Uso (lo corre .github/workflows/eval-analisis.yml; necesita Node >= 22.6 y `npm ci`):
//   BASE_URL=https://sac-omi.vercel.app node --experimental-strip-types scripts/eval-analisis.mjs
// Opcionales: SUPABASE_URL, SUPABASE_ANON_KEY (si no están, se leen del sitio publicado: son públicas),
//   SOLO=desarrollo (filtra CVs por nombre), SALIDA=eval-analisis (carpeta), INTENTOS=2.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { INSTRUCCIONES } from '../src/features/brecha/services/promptAnalisis.ts';
import { validarResultado, AnalisisInvalido } from '../src/features/brecha/domain/validar.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL ?? 'https://sac-omi.vercel.app').replace(/\/$/, '');
const SALIDA = process.env.SALIDA ?? 'eval-analisis';
const INTENTOS = Number(process.env.INTENTOS ?? 2);
const SOLO = process.env.SOLO ?? '';
const OPCIONES = { maxTokens: 3000, temperature: 0.3, jsonMode: true };

/** La URL y la clave anon de Supabase son públicas (van en el JS del sitio); se leen de ahí si no se dieron. */
async function credenciales() {
  let url = process.env.SUPABASE_URL;
  let clave = process.env.SUPABASE_ANON_KEY;
  if (url && clave) return { url, clave };
  const html = await (await fetch(BASE + '/u')).text();
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => new URL(m[1], BASE + '/').href);
  for (const src of scripts) {
    const js = await (await fetch(src)).text();
    url ??= js.match(/https:\/\/[a-z0-9]{15,25}\.supabase\.co/)?.[0];
    clave ??= js.match(/eyJ[\w-]{10,}\.[\w-]{20,}\.[\w-]{20,}/)?.[0];
    if (url && clave) break;
  }
  if (!url || !clave) throw new Error('No encontré la URL/clave de Supabase. Define SUPABASE_URL y SUPABASE_ANON_KEY.');
  return { url, clave };
}

function extraerJson(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new AnalisisInvalido('sin JSON en la respuesta');
  try {
    return JSON.parse(m[0]);
  } catch {
    throw new AnalisisInvalido('JSON ilegible');
  }
}

async function llamar(cred, textoCv) {
  const res = await fetch(`${cred.url}/functions/v1/proxy-ai`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: cred.clave, authorization: `Bearer ${cred.clave}` },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: INSTRUCCIONES },
        { role: 'user', content: `TEXTO DEL CV:\n\n${textoCv}` },
      ],
      options: OPCIONES,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok || !cuerpo.text) throw new Error(`proxy-ai ${res.status}: ${cuerpo.error ?? 'sin texto'}`);
  return cuerpo;
}

async function evaluar(cred, nombre, textoCv) {
  const inicio = Date.now();
  let ultimo = '';
  const modelos = [];
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const r = await llamar(cred, textoCv);
      modelos.push(r.model ?? '?');
      const res = validarResultado(extraerJson(r.text), textoCv);
      return { cv: nombre, ok: true, intentos: intento, modelos, segundos: Math.round((Date.now() - inicio) / 1000), calidad: { ...res.calidad, intentos: intento } };
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
      if (!(e instanceof AnalisisInvalido)) break; // error de red/servidor: no es culpa del modelo, no se reintenta
    }
  }
  return { cv: nombre, ok: false, intentos: INTENTOS, modelos, segundos: Math.round((Date.now() - inicio) / 1000), error: ultimo };
}

const suma = (xs) => xs.reduce((a, b) => a + b, 0);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

async function main() {
  const dir = join(AQUI, 'fixtures', 'cvs');
  const archivos = readdirSync(dir).filter((f) => f.endsWith('.txt') && f.includes(SOLO)).sort();
  if (archivos.length === 0) throw new Error('No hay CVs que evaluar.');
  const cred = await credenciales();
  const filas = [];
  for (const f of archivos) {
    const fila = await evaluar(cred, f.replace(/\.txt$/, ''), readFileSync(join(dir, f), 'utf8').trim());
    filas.push(fila);
    console.log(fila.ok ? '✓' : '✗', fila.cv, fila.ok ? `${fila.calidad.brechasAceptadas}/${fila.calidad.brechasPropuestas} brechas, ${fila.intentos} intento(s)` : fila.error);
  }

  const validos = filas.filter((f) => f.ok);
  const q = validos.map((f) => f.calidad);
  const resumen = {
    cvs: filas.length,
    validos: validos.length,
    brechasPropuestas: suma(q.map((x) => x.brechasPropuestas)),
    brechasAceptadas: suma(q.map((x) => x.brechasAceptadas)),
    conCita: suma(q.map((x) => x.conCita)),
    ausentes: suma(q.map((x) => x.ausentes)),
    primerIntento: validos.filter((f) => f.intentos === 1).length,
  };
  mkdirSync(SALIDA, { recursive: true });
  writeFileSync(join(SALIDA, 'eval-analisis.json'), JSON.stringify({ base: BASE, resumen, filas }, null, 2));

  const md = [
    '## Evaluación del análisis de CV',
    '',
    `- Análisis válidos: **${resumen.validos} de ${resumen.cvs}** CVs (${resumen.primerIntento} a la primera)`,
    `- Brechas que sobreviven a la validación: **${resumen.brechasAceptadas} de ${resumen.brechasPropuestas}** propuestas (${pct(resumen.brechasAceptadas, resumen.brechasPropuestas)})`,
    `- De las aceptadas: ${resumen.conCita} con cita verificada, ${resumen.ausentes} «Ausente en el CV»`,
    '',
    '| CV | Resultado | Brechas | Con cita | Ausentes | Fortalezas | Intentos | Modelo | s |',
    '|---|---|---|---|---|---|---|---|---|',
    ...filas.map((f) =>
      f.ok
        ? `| ${f.cv} | ✓ | ${f.calidad.brechasAceptadas}/${f.calidad.brechasPropuestas} | ${f.calidad.conCita} | ${f.calidad.ausentes} | ${f.calidad.fortalezasAceptadas}/${f.calidad.fortalezasPropuestas} | ${f.intentos} | ${f.modelos.at(-1)} | ${f.segundos} |`
        : `| ${f.cv} | ✗ ${f.error} | | | | | ${f.intentos} | ${f.modelos.join(', ')} | ${f.segundos} |`,
    ),
    '',
    'No mide si una brecha es correcta para la persona: eso lo dice ella con «Es real» / «No aplica».',
  ].join('\n');
  console.log('\n' + md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (validos.length === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
