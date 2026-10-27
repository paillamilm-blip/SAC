// Escáner de deuda de diseño para Sistema Ómicrom.
// Reporta los VALORES CRUDOS distintos fuera del sistema de tokens, agrupados por
// frecuencia, excluyendo las rutas donde un valor crudo es legítimo.
// Uso: node audit-debt.mjs   (TOP=60 DETAIL=rgba para más salida)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const EXCLUDE = [
  /^theme[\\/]/, // C / SIZE / RADIUS / SHADOW / BASE: definición de tokens
  /^index\.css$/, // variables CSS globales
  /^features[\\/]mapa[\\/]/, // port 1:1 del donante: su escala ES el contrato
  /^shared[\\/]components[\\/]ColorPicker\.tsx$/, // las 4 opciones del usuario
  /^infrastructure[\\/]/,
  /\.test\.(ts|tsx)$/,
  /[\\/]__fixtures__[\\/]/,
];

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
const nums = new Set();
for (const f of fs.readdirSync(path.join(SRC, 'theme'))) {
  const txt = fs.readFileSync(path.join(SRC, 'theme', f), 'utf8');
  for (const m of txt.matchAll(/\b\d+(?:\.\d+)?\b/g)) nums.add(m[0]);
  for (const m of txt.matchAll(/(\d+(?:\.\d+)?)px/g)) nums.add(m[1]);
}

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

const byValue = new Map();
const byFile = new Map();

for (const f of files) {
  const rel = path.relative(SRC, f).replace(/\\/g, '/');
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let hits = 0;
  lines.forEach((line) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comentario de diseño, no deuda
    for (const [type, re] of PATTERNS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        const numeric = type === 'typography-drift' || type === 'non-token-radius';
        const value = numeric ? `${m[1]}px` : m[0].trim();
        if (numeric ? nums.has(m[1]) : isToken(value)) continue;
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
