// codemod-dedupe.mjs — pasa los valores fuera de sistema a tokens.
// Escanea el código de verdad: respeta comentarios, y dentro de una plantilla
// `...` solo toca su texto; las expresiones ${...} se procesan por su cuenta,
// así un 'rgba(...)' anidado se vuelve la ficha limpia y no '${...}' con comillas.
//
// Uso: node codemod-dedupe.mjs [--apply] <archivos...>
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));

// ── familias del sistema: color base y sus alfas con nombre propio ──────────
const FAMILIES = [
  { rgb: [160, 174, 192], name: 'C.cyan', named: { 46: 'C.cyanDim', 16: 'C.cyanFaint', 8: 'C.cyanGhost' } },
  { rgb: [94, 92, 230], name: 'C.purple', named: { 44: 'C.purpleDim', 14: 'C.purpleFaint' } },
  { rgb: [63, 208, 201], name: 'C.green', named: { 44: 'C.greenDim', 14: 'C.greenFaint' } },
  { rgb: [255, 176, 46], name: 'C.gold', named: { 46: 'C.goldDim', 14: 'C.goldFaint' } },
  { rgb: [255, 92, 122], name: 'C.red', named: { 44: 'C.redDim', 14: 'C.redFaint' } },
  { rgb: [118, 130, 157], name: 'C.mut', named: {} },
  { rgb: [107, 117, 144], name: 'C.mut', named: {} }, // el mut viejo, ya corregido
  { rgb: [234, 240, 251], name: 'C.ink', named: {} },
  { rgb: [234, 244, 255], name: 'C.ink', named: {} }, // gemelo casi igual: mismo rol
];

// Neutros de vidrio: se colapsan al escalón más cercano, no se inventan.
const WHITE = [
  { max: 0.055, expr: 'C.glass' },
  { max: 0.11, expr: 'C.glass2' },
  { max: 0.13, expr: 'C.locked' },
];
const SCRIM = { min: 0.55, max: 0.65, expr: 'C.scrim' };

// Rellenos oscuros: la app tiene CUATRO paneles con nombre según su rol.
// Con alfa baja es un lavado sobre contenido; con alfa alta, un panel opaco.
const PANELS_SOLID = [
  { rgb: [12, 16, 30], expr: 'C.surface' },
  { rgb: [22, 28, 48], expr: 'C.surfaceLight' },
  { rgb: [2, 3, 10], expr: 'C.overlay' },
];
const PANEL_WASH = { rgb: [6, 10, 22], expr: 'C.wash', maxAlpha: 0.55 };
const PANEL_MAX_DIST = 26; // más lejos que esto, no es este sistema: se revisa a mano

// Hex sueltos con rol conocido.
const HEX = {
  '#eaf4ff': 'C.ink', '#e2f3ff': 'C.ink', '#e6f1fb': 'C.ink', '#cfe2f0': 'C.ink', '#dbeafe': 'C.ink',
  '#b9d4e6': 'C.cyan',
  '#1a1205': 'C.onAccent', '#02030a': 'C.onAccent', '#021018': 'C.onAccent',
  '#fbbf24': 'C.gold', '#10b981': 'C.green', '#64748b': 'C.mut',
  '#ffb02e': 'C.gold', '#3fd0c9': 'C.green', '#5e5ce6': 'C.purple', '#a0aec0': 'C.cyan',
  '#ff5c7a': 'C.red', '#eaf0fb': 'C.ink', '#000206': 'C.bg',
};

const SIZE_RAMP = [9, 11, 13, 15, 17, 20, 24, 32];
const SIZE_NAME = { 9: 'SIZE.xxs', 11: 'SIZE.xs', 13: 'SIZE.sm', 15: 'SIZE.md', 17: 'SIZE.lg', 20: 'SIZE.xl', 24: 'SIZE.xxl', 32: 'SIZE.hero' };
const SIZE_MAX_DRIFT = 2; // no saltamos más de 2 px: eso ya es otro tamaño, no deriva

function norm(hex) {
  let h = hex.toLowerCase();
  if (h.length === 4) h = '#' + [...h.slice(1)].map(c => c + c).join('');
  return h;
}

function colorExpr(raw) {
  const s = raw.trim();
  let m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) {
    const R = +m[1], G = +m[2], B = +m[3], A = m[4] === undefined ? 1 : +m[4];
    if (R === 255 && G === 255 && B === 255 && A < 1) {
      const w = WHITE.find(x => A <= x.max);
      return w ? w.expr : `tint(C.white, ${Math.round(A * 100)})`;
    }
    if (R === 0 && G === 0 && B === 0 && A < 1) {
      return A >= SCRIM.min && A <= SCRIM.max ? SCRIM.expr : `tint(C.black, ${Math.round(A * 100)})`;
    }
    const dist = (p) => Math.hypot(p.rgb[0] - R, p.rgb[1] - G, p.rgb[2] - B);
    const isDarkFill = A < 1 && Math.max(R, G, B) <= 70 && R + G + B >= 12;
    if (isDarkFill) {
      const opts = A <= PANEL_WASH.maxAlpha ? [PANEL_WASH] : PANELS_SOLID;
      const best = opts.reduce((a, b) => (dist(b) < dist(a) ? b : a), opts[0]);
      if (dist(best) <= PANEL_MAX_DIST) return best.expr;
      return null;
    }
    for (const f of FAMILIES) {
      if (Math.abs(f.rgb[0] - R) <= 1 && Math.abs(f.rgb[1] - G) <= 1 && Math.abs(f.rgb[2] - B) <= 1) {
        if (A >= 1) return f.name;
        const pct = Math.round(A * 100);
        return f.named[pct] ?? `tint(${f.name}, ${pct})`;
      }
    }
    return null;
  }
  if (/^#[0-9a-f]{3,8}$/i.test(s)) {
    const h = norm(s);
    if (/^#[0-9a-f]{6}$/.test(h)) return HEX[h] ?? null;
    if (/^#[0-9a-f]{8}$/.test(h)) {
      const base = HEX[h.slice(0, 7)] ?? null;
      if (!base) return null;
      const alpha = parseInt(h.slice(7, 9), 16) / 255;
      return alpha >= 0.99 ? base : `tint(${base}, ${Math.round(alpha * 100)})`;
    }
  }
  return null;
}

/** Sustituye colores dentro de un trozo de texto de plantilla (o de un string). */
function swapColors(text) {
  let hits = 0;
  const out = text
    .replace(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/gi, (mm) => {
      const e = colorExpr(mm);
      if (!e) return mm;
      hits++;
      return '${' + e + '}';
    })
    .replace(/#[0-9a-f]{3,8}\b/gi, (mm) => {
      const e = colorExpr(mm);
      if (!e) return mm;
      hits++;
      return '${' + e + '}';
    });
  return { text: out, hits };
}

/** Un string '...' o "...": ficha limpia si es solo color, si no, plantilla. */
function rewriteQuoted(body) {
  const { text, hits } = swapColors(body);
  if (!hits) return null;
  const parts = [...text.matchAll(/\$\{([^}]*)\}/g)].map(m => m[1]);
  const isPure = text.replace(/\$\{[^}]*\}/g, '').trim() === '';
  if (isPure && parts.length === 1) return { kind: 'bare', text: parts[0] };
  return { kind: 'tpl', text };
}

/** El texto de una plantilla: los colores se interpolan, el resto queda igual. */
function rewriteTemplateText(body) {
  const { text, hits } = swapColors(body);
  return { text, hits };
}

// ── escáner: recorre el fuente respetando comentarios y literales ───────────
const stats = { C: false, tint: false, SIZE: false, changed: 0 };

function mark(text) {
  if (/C\./.test(text)) stats.C = true;
  if (/tint\(/.test(text)) stats.tint = true;
}

function readTo(src, i, close) {
  // devuelve { body, end } — end apunta al carácter cerrado incluido
  let j = i + 1, body = '';
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { body += c + (src[j + 1] ?? ''); j += 2; continue; }
    if (c === close) return { body, end: j + 1 };
    body += c; j++;
  }
  throw new Error('literal sin cerrar en offset ' + i);
}

/** Salta de la '{' de una ${...} hasta su '}' pareado, sin verse engañado
 *  por plantillas anidadas, strings o comentarios. */
function skipToExprEnd(src, j) {
  let depth = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === "'" || c === '"') { j = readTo(src, j, c).end; continue; }
    if (c === '`') { j = readTemplate(src, j).end; continue; }
    if (c === '/' && src[j + 1] === '/') { const e = src.indexOf('\n', j); j = e < 0 ? src.length : e; continue; }
    if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e < 0 ? src.length : e + 2; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; j++; if (depth === 0) return j; continue; }
    j++;
  }
  throw new Error('${ sin cerrar');
}

/** Lee una plantilla `...` y la parte en texto / expresiones, pareando anidamientos. */
function readTemplate(src, i) {
  const segs = [];
  let buf = '', j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { buf += c + (src[j + 1] ?? ''); j += 2; continue; }
    if (c === '`') { if (buf) segs.push({ t: 'text', v: buf }); return { segs, end: j + 1 }; }
    if (c === '$' && src[j + 1] === '{') {
      if (buf) { segs.push({ t: 'text', v: buf }); buf = ''; }
      const after = skipToExprEnd(src, j + 1);
      segs.push({ t: 'expr', v: src.slice(j + 2, after - 1) });
      j = after;
      continue;
    }
    buf += c; j++;
  }
  throw new Error('plantilla sin cerrar en offset ' + i);
}

const FONT_SIZE_RE = /\bfontSize:\s*([0-9]+(?:\.[0-9]+)?)(?![0-9.])/g;

function snapFontSizes(code) {
  return code.replace(FONT_SIZE_RE, (mm, n) => {
    const v = +n;
    if (SIZE_RAMP.includes(v)) return mm;
    const nearest = SIZE_RAMP.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), SIZE_RAMP[0]);
    if (Math.abs(nearest - v) > SIZE_MAX_DRIFT) return mm;
    stats.SIZE = true;
    stats.changed++;
    return `fontSize: ${SIZE_NAME[nearest]}`;
  });
}

function scan(src) {
  let out = '', code = '', i = 0;
  const flush = () => { out += snapFontSizes(code); code = ''; };
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { flush(); const e = src.indexOf('\n', i); const to = e < 0 ? src.length : e; out += src.slice(i, to); i = to; continue; }
    if (c === '/' && n === '*') { flush(); const e = src.indexOf('*/', i + 2); const to = e < 0 ? src.length : e + 2; out += src.slice(i, to); i = to; continue; }
    if (c === "'" || c === '"') {
      flush();
      const { body, end } = readTo(src, i, c);
      const r = rewriteQuoted(body);
      if (!r) out += src.slice(i, end);
      else if (r.kind === 'bare') { mark(r.text); out += r.text; stats.changed++; }
      else { mark(r.text); out += '`' + r.text + '`'; stats.changed++; }
      i = end; continue;
    }
    if (c === '`') {
      flush();
      const { segs, end } = readTemplate(src, i);
      let rebuilt = '', hits = 0;
      for (const s of segs) {
        if (s.t === 'text') {
          const r = rewriteTemplateText(s.v);
          hits += r.hits; mark(r.text); rebuilt += r.text;
        } else {
          const inner = scan(s.v); // las fichas internas ya suman en stats.changed
          rebuilt += '${' + inner.text + '}';
        }
      }
      if (hits) stats.changed += hits;
      out += '`' + rebuilt + '`';
      i = end; continue;
    }
    code += c; i++;
  }
  flush();
  return { text: out };
}

const THEME_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*\/theme['"]/;

/** Nombres ya ligados en el archivo (imports con alias + declaraciones locales). */
function boundNames(src) {
  const bound = new Set(), themeBound = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const esTheme = /\/theme$/.test(m[2]);
    for (const spec of m[1].split(',')) {
      const t = spec.trim();
      if (!t) continue;
      const parts = t.split(/\s+as\s+/);
      const local = (parts[1] ?? parts[0]).trim();
      bound.add(local);
      if (esTheme) themeBound.add(local);
    }
  }
  for (const m of src.matchAll(/(?:^|[\s;{}(])(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) bound.add(m[1]);
  return { bound, themeBound };
}

function processFile(path) {
  const before = readFileSync(path, 'utf8');
  Object.assign(stats, { C: false, tint: false, SIZE: false, changed: 0 });
  let text;
  try {
    text = scan(before).text;
  } catch (err) {
    return { path, changed: 0, error: String(err.message) };
  }
  const changed = stats.changed;
  if (!changed) return { path, changed: 0 };
  const need = ['C', 'tint', 'SIZE'].filter(k => stats[k]);
  const { bound, themeBound } = boundNames(before);
  const conflicto = need.filter(n => bound.has(n) && !themeBound.has(n));
  if (conflicto.length) return { path, changed: 0, skip: `liga ${conflicto.join(', ')} fuera del tema` };
  let out = text;
  if (need.length) {
    const m = THEME_IMPORT_RE.exec(out);
    if (m) {
      const cur = m[1].split(',').map(s => s.trim()).filter(Boolean);
      const add = need.filter(x => !cur.some(c => c === x || c.endsWith(' as ' + x)));
      if (add.length) out = out.replace(m[0], m[0].replace(m[1], `${m[1].trim()}, ${add.join(', ')}`));
    } else {
      const at = out.search(/^import .*$/m);
      out = out.slice(0, at) + `import { ${need.join(', ')} } from '@/theme';\n` + out.slice(at);
    }
  }
  if (APPLY) writeFileSync(path, out, 'utf8');
  return { path, changed };
}

const all = files.map(processFile);
const results = all.filter(r => r.changed);
console.log(APPLY ? 'APLICADO' : 'simulación (sin --apply)');
for (const r of results) console.log(String(r.changed).padStart(3), r.path);
for (const r of all.filter(x => x.error)) console.log('ERR', r.path, r.error);
for (const r of all.filter(x => x.skip)) console.log('SKIP', r.path, '—', r.skip);
console.log('total reemplazos:', results.reduce((s, r) => s + r.changed, 0), 'en', results.length, 'archivos');
