// Escáner de deuda de diseño para Sistema Ómicrom.
// Reporta los VALORES CRUDOS distintos fuera del sistema de tokens, agrupados por
// frecuencia, excluyendo las rutas donde un valor crudo es legítimo.
// Uso: node audit-debt.mjs --config design.qa.yaml   (TOP=60 DETAIL=rgba para más salida)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

// ── La métrica y el permiso tienen que tener UN dueño ────────────────────────
// Este script siempre recibió `--config design.qa.yaml` y nunca lo abrió: las
// rutas perdonadas vivían duplicadas —una lista de regex acá, la lista del yaml
// allá— y agregar una excepción al yaml no cambiaba nada. Ahora el yaml es la
// fuente y el script sólo traduce glob a red. Si el bloque falta, el script se
// prende: una métrica que no encontró su permiso no tiene derecho a decir "cero
// deuda", que es exactamente el modo en que un barrido se vuelve decoración.
const argConfig = () => {
  const i = process.argv.indexOf('--config');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : 'design.qa.yaml';
};
const CONFIG = argConfig();
const cfg = fs.readFileSync(path.join(ROOT, CONFIG), 'utf8');

// Lista YAML de un solo nivel ( `- valor`, con comentario al final opcional).
function yamlList(text, header) {
  const m = text.match(new RegExp(`^([ \\t]*)${header}:[ \\t]*$`, 'm'));
  if (!m) return null;
  const sangria = m[1].length;
  const items = [];
  for (const linea of text.slice(m.index + m[0].length).split(/\r?\n/).slice(1)) {
    if (!linea.trim()) continue;
    const ind = linea.match(/^ */)[0].length;
    if (ind <= sangria) break;
    const it = linea.match(/^\s*-\s+(.+)$/);
    if (!it) break;
    items.push(it[1].replace(/\s+#\s.*$/, '').trim().replace(/^['"]|['"]$/g, ''));
  }
  return items;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const globARegex = (g) => {
  let p = g.replace(/^\.\//, '').replace(/^src\//, '');
  if (p.endsWith('/**')) return new RegExp('^' + escapeRe(p.slice(0, -3)) + '/');
  const desdeCualquierLado = p.startsWith('**/');
  p = p.replace(/^\*\*\//, '');
  const re = escapeRe(p).replace(/\\\*/g, '[^/]*');
  return new RegExp((desdeCualquierLado ? '' : '^') + re + '$');
};

const excludeYaml = yamlList(cfg, 'exclude');
if (!excludeYaml?.length) {
  console.error(`${CONFIG}: no se encontró el bloque code.exclude — la métrica se niega a barrer sin permiso.`);
  process.exit(2);
}
const EXCLUDE = excludeYaml.map(globARegex);

// --- allowlist: todo valor que ya es token documentado -----------------------
const tokens = new Set();
// Canónico: #AABBCC → #aabbcc, rgba( 255,176,46,0.30 ) → rgba(255,176,46,.3)
// Sin esto, 0.30 vs 0.3 parece deuda y no lo es.
const norm = (v) => {
  const s = String(v).toLowerCase().replace(/\s+/g, '');
  const hex = s.match(/^#([0-9a-f]{3,4})$/);
  if (hex) return '#' + [...hex[1]].map((c) => c + c).join('');
  const fn = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (fn) {
    const parts = fn[2].split(',').map((p) => {
      const n = Number(p);
      return Number.isFinite(n) ? String(+n.toFixed(4)).replace(/^0\./, '.') : p;
    });
    const name = fn[1] === 'rgb' && parts.length === 4 ? 'rgba' : fn[1];
    return `${name}(${parts.join(',')})`;
  }
  return s;
};
const add = (v) => v && tokens.add(norm(v));

// Lo que el permiso declara como aceptado deja de ser hallazgo. Dos listas del
// yaml: `allowedColorValues` (blanco, negro, transparentes que no son marca) y
// `acceptedValues` (geometría de lienzo y máscara: un número fijo que ES el
// dibujo). Cada línea del yaml lleva su por qué; si alguien la borra, el valor
// vuelve a aparecer en el reporte, que es la única forma de que un permiso se
// revise en vez de acumularse.
for (const v of yamlList(cfg, 'allowedColorValues') ?? []) add(v);
for (const v of yamlList(cfg, 'acceptedValues') ?? []) add(v);

// DESIGN.md lo dice con una frase: «las sombras negras no son un tono de marca,
// son profundidad». La métrica le creía a medias —contaba cada `rgba(0,0,0,α)`
// como deuda—, así que el reporte se llenaba de algo que el contrato perdona.
const PROFUNDIDAD = /^rgba?\(0,0,0(,0?\.?\d+)?\)$/;

const dm = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/);
for (const m of (dm?.[1] ?? '').matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)\n"']*\)|\b\d+(?:\.\d+)?px\b/g)) add(m[0]);

for (const f of fs.readdirSync(path.join(SRC, 'theme'))) {
  const txt = fs.readFileSync(path.join(SRC, 'theme', f), 'utf8');
  for (const m of txt.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)\n]*\)|\b\d+(?:\.\d+)?px\b/g)) add(m[0]);
  // SIZE / SP / RADIUS son números sueltos: { xxs: 9 } → 9px
  for (const m of txt.matchAll(/:\s*(\d+(?:\.\d+)?)(?=\s*[,}])/g)) add(`${m[1]}px`);
}
const idx = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
for (const m of idx.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)\n;]*\)|\b\d+(?:\.\d+)?px\b/g)) add(m[0]);
for (const m of idx.matchAll(/--[\w-]+\s*:\s*([^;]+);/g)) add(m[1].trim());

const isToken = (v) => tokens.has(norm(v));

// Números que ya aparecen en theme/ (SIZE, RADIUS, SP, BASE...): un fontSize: 15
// que es SIZE.md no es deuda; un fontSize: 12.5 sí.
//
// La versión anterior reunía aquí CADA dígito de los archivos de theme/ y perdonaba
// por ese conjunto. `SP = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32… }`
// aportaba sus CLAVES, así que 1, 2, 3, 5, 6, 8, 10, 12, 16 quedaban absueltos sin
// que ningún token valga eso; un halo de `0 0 6px` pasaba como «tokenizado» porque
// el 6 es una clave de la grilla, no porque exista un token de 6. Se retira el
// atajo: el conjunto de valores ya lo reúne `tokens` arriba, que sólo mira los
// literales `#hex`, `rgba()`, `Npx` y los `: N,` de las escalas. Lo que no esté ahí
// es deuda, y la deuda se decide con nombre, no con un dígito suelto.

// --- walk -------------------------------------------------------------------
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e.name) && !EXCLUDE.some((r) => r.test(path.relative(SRC, p).replace(/\\/g, '/')))) files.push(p);
  }
})(SRC);

const PATTERNS = [
  ['color-hex', /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g],
  ['color-func', /\b(?:rgba?|hsla?)\([^)]*\)/g],
  ['px', /\b\d+(?:\.\d+)?px\b/g],
  ['typography-drift', /\bfontSize\s*[:=]\s*['"]?(\d+(?:\.\d+)?)/g],
  ['non-token-radius', /\bborderRadius\s*[:=]\s*['"]?(\d+(?:\.\d+)?)/g],
];

// Un comentario puede citar un valor para explicarlo —el invariante de dos
// columnas de `aprendizaje.css` dice «desde 900px» y la métrica lo contaba como
// deuda—. La versión anterior sólo saltaba la línea que EMPEZABA con `*` o `//`,
// así que el interior de un bloque de varias líneas se leía como código. Se
// vacían los comentarios conservando los saltos: el conteo de archivos no cambia.
const sinComentarios = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, '')).replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const byValue = new Map();
const byFile = new Map();

for (const f of files) {
  const rel = path.relative(SRC, f).replace(/\\/g, '/');
  const lines = sinComentarios(fs.readFileSync(f, 'utf8')).split(/\r?\n/);
  let hits = 0;
  lines.forEach((line) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comentario de diseño, no deuda
    for (const [type, re] of PATTERNS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        const numeric = type === 'typography-drift' || type === 'non-token-radius';
        const value = numeric ? `${m[1]}px` : m[0].trim();
        // `rgba(${r},${g},${b},${a})` es una plantilla, no un valor: no hay color
        // escrito ahí, hay código que arma el color a partir del usuario.
        if (value.includes('${')) continue;
        if (numeric ? isToken(value) : (isToken(value) || PROFUNDIDAD.test(norm(value)))) continue;
        hits++;
        const key = `${type}|${norm(value)}`;
        if (!byValue.has(key)) byValue.set(key, { type, value, count: 0, files: new Map() });
        const e = byValue.get(key);
        e.count++;
        e.files.set(rel, (e.files.get(rel) ?? 0) + 1);
      }
    }
  });
  if (hits) byFile.set(rel, hits);
}

const vals = [...byValue.values()].sort((a, b) => b.count - a.count || b.files.size - a.files.size);
const fls = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
const total = vals.reduce((s, v) => s + v.count, 0);

console.log(`permiso: ${CONFIG} · ${EXCLUDE.length} rutas excluding · valores aceptados: ${tokens.size}`);
console.log(`archivos: ${files.length} · valores fuera de token: ${total} en ${vals.length} distintos · archivos afectados: ${fls.length}`);
console.log('\n## Valores (veces · archivos · tipo · valor)');
for (const v of vals.slice(0, Number(process.env.TOP ?? 45)))
  console.log(`${String(v.count).padStart(4)}  ${String(v.files.size).padStart(3)}f  ${v.type.padEnd(10)} ${v.value}`);
console.log('\n## Archivos');
for (const [f, n] of fls.slice(0, Number(process.env.FILES ?? 25))) console.log(`${String(n).padStart(4)}  ${f}`);
if (process.env.DETAIL) {
  const want = process.env.DETAIL.toLowerCase();
  console.log(`\n## Detalle filtrando "${want}"`);
  for (const v of vals.filter((x) => x.value.toLowerCase().includes(want) || x.type === want))
    console.log(`${v.type} ${v.value} ×${v.count}\n   ${[...v.files.entries()].map(([f, n]) => `${f} (${n})`).join('\n   ')}`);
}
