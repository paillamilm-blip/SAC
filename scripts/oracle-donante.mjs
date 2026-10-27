// oracle-donante.mjs — ejecuta el algoritmo del DONANTE tal cual y vuelca su modelo de render.
// Codigo copiado literal de bb1434fb/components/MapaCapacidades.tsx (L7-L124, L194-L332, L336-L377).
// No se "arregla" nada: si este script y el componente divergen, el divergente es el port.
// Uso: node oracle-donante.mjs <db.json del donante> <salida.json>
import { readFileSync, writeFileSync } from "node:fs";

const [, , dbPath, outPath] = process.argv;
const db = JSON.parse(readFileSync(dbPath, "utf8"));
const analisis = db.analisis[0];
const brechas = analisis.brechas;
const ocupacion = analisis.ocupacion;

// ---- literales del donante ----
const ORDEN = ["dura", "blanda", "conocimiento", "credencial"];
const COLOR_CAT = { dura: "#6aa9ff", blanda: "#f2b134", conocimiento: "#3ddc97", credencial: "#c084fc" };
const RADIO_CAT = 170;
const RADIO_BRECHA = 296;
const RADIO_LOGRO = 352;
const W = 980;
const H = 720;
const CX = W / 2;
const CY = H / 2;
const PASO_MS = 45;

// ---- helpers literales (L29-L51) ----
function r2(n) {
  return Math.round(n * 100) / 100;
}
function polar(radio, angulo) {
  const a = (angulo * Math.PI) / 180;
  return { x: r2(CX + radio * Math.cos(a)), y: r2(CY + radio * Math.sin(a)) };
}
function curva(p, q, semilla) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dist = r2(Math.hypot(dx, dy)) || 1;
  const off = dist * 0.11 * (semilla % 2 === 0 ? 1 : -1);
  return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} Q ${((p.x + q.x) / 2 - (dy / dist) * off).toFixed(1)} ${(
    (p.y + q.y) / 2 +
    (dx / dist) * off
  ).toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
}
function corta(texto, n) {
  return texto.length > n ? `${texto.slice(0, n - 1).trimEnd()}…` : texto;
}

// ---- el useMemo del donante (L68-L125), literal ----
let paso = 0;
const siguiente = () => paso++ * PASO_MS;

const raizDelay = siguiente();
const cats = ORDEN.filter((c) => brechas.some((b) => b.categoria === c));
const n = Math.max(cats.length, 1);

const nodosCat = [];
const nodosBrecha = [];

cats.forEach((cat, i) => {
  const angCat = -90 + i * (360 / n);
  const p = polar(RADIO_CAT, angCat);
  const delay = siguiente();
  const labelDelay = siguiente();
  nodosCat.push({ cat, p, delay, labelDelay });

  const items = brechas.filter((b) => b.categoria === cat);
  const separacion = Math.min(23, 150 / Math.max(items.length, 1));
  items.forEach((b, j) => {
    const ang = angCat + (j - (items.length - 1) / 2) * separacion;
    nodosBrecha.push({ b, p: polar(RADIO_BRECHA, ang), pCat: p, ang, delay: siguiente() });
  });
});

const logros = nodosBrecha
  .filter((nb) => nb.b.dominadaEn)
  .map((nb) => ({ nb, p: polar(RADIO_LOGRO, nb.ang + 8), delay: siguiente() }));

const eventos = brechas
  .flatMap((b) => {
    const lista = [];
    if (b.veredicto === "confirmada" && b.veredictoEn) lista.push({ t: b.veredictoEn, tipo: "reconocida", b });
    if (b.dominadaEn) lista.push({ t: b.dominadaEn, tipo: "dominada", b });
    return lista;
  })
  .sort((a, b) => a.t.localeCompare(b.t));

const posDe = new Map(brechas.map((b) => [b.id, nodosBrecha.find((nb) => nb.b.id === b.id)?.p]));
let camino = "";
if (eventos.length > 0) {
  camino = `M ${CX} ${CY}`;
  let previo = { x: CX, y: CY };
  for (const e of eventos) {
    const p = posDe.get(e.b.id);
    if (!p) continue;
    const d = r2(Math.hypot(p.x - previo.x, p.y - previo.y)) || 1;
    const ux = r2(((p.x - previo.x) / d) * 10) / 10;
    const uy = r2(((p.y - previo.y) / d) * 10) / 10;
    camino += ` L ${(p.x - ux * 24).toFixed(1)} ${(p.y - uy * 24).toFixed(1)}`;
    previo = p;
  }
}
const caminoDelay = paso * PASO_MS + 150;

// ---- el arbol de texto de la raiz (L131-L146) ----
const lineasOcupacion = (() => {
  const palabras = ocupacion.split(" ");
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    if ((actual + " " + p).trim().length > 13 && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = (actual + " " + p).trim();
    }
    if (lineas.length === 2) break;
  }
  if (lineas.length < 2 && actual) lineas.push(actual);
  return lineas.slice(0, 2);
})();

// ---- lo que el render del donante le pasa al DOM ----
const reconocidas = brechas.filter((b) => b.veredicto === "confirmada").length;
const dominadas = brechas.filter((b) => b.dominadaEn).length;
const rechazadas = brechas.filter((b) => b.veredicto === "rechazada").length;

const aristasRaizCat = nodosCat.map((nc, i) => ({
  key: `rc-${nc.cat}`,
  d: curva({ x: CX, y: CY }, nc.p, i),
  stroke: COLOR_CAT[nc.cat],
  animationDelay: `${nc.delay}ms`,
  pathLength: 1,
}));

const aristasCatBrecha = nodosBrecha.map((nb, i) => ({
  key: `cb-${nb.b.id}`,
  // atencion: la semilla es el indice GLOBAL de la brecha, no el de su categoria
  d: curva(nb.pCat, nb.p, i),
  stroke: COLOR_CAT[nb.b.categoria],
  animationDelay: `${nb.delay}ms`,
  pathLength: 1,
  "data-apagado": nb.b.veredicto === "rechazada",
}));

const labelsCat = nodosCat.map((nc) => {
  const angRad = Math.atan2(nc.p.y - CY, nc.p.x - CX);
  const cos = Math.cos(angRad);
  const sin = Math.sin(angRad);
  let lx = r2(nc.p.x);
  let ly = r2(nc.p.y);
  let anchor = "middle";
  if (cos > 0.35) {
    anchor = "start";
    lx = r2(nc.p.x + 31);
    ly = r2(nc.p.y + 4);
  } else if (cos < -0.35) {
    anchor = "end";
    lx = r2(nc.p.x - 31);
    ly = r2(nc.p.y + 4);
  } else {
    ly = sin < 0 ? r2(nc.p.y - 34) : r2(nc.p.y + 40);
  }
  return { cat: nc.cat, x: lx, y: ly, anchor, animationDelay: `${nc.labelDelay}ms` };
});

const nodosBrechaRender = nodosBrecha.map((nb) => {
  const { b, p } = nb;
  const color = COLOR_CAT[b.categoria];
  const r = b.severidad === "alta" ? 14 : b.severidad === "media" ? 11.5 : 9.5;
  const dominada = Boolean(b.dominadaEn);
  const confirmada = b.veredicto === "confirmada";
  const rechazada = b.veredicto === "rechazada";
  const estado = rechazada ? "rechazada" : dominada ? "dominada" : confirmada ? "confirmada" : "pendiente";
  return {
    id: b.id,
    clase: `mapa-nodo mapa-brecha mapa-brecha-${estado}`,
    animationDelay: `${nb.delay}ms`,
    tooltip: `${b.titulo} · ${b.categoria} · impacto ${b.severidad} · ${estado}`,
    anillo: dominada ? { cx: p.x, cy: p.y, r: r + 7, stroke: color } : null,
    circulo: {
      cx: p.x,
      cy: p.y,
      r,
      fill: dominada ? color : confirmada ? `${color}2e` : "#171b21",
      stroke: rechazada ? "#454d57" : confirmada || dominada ? color : "#4b545f",
      strokeWidth: confirmada || dominada ? 2.4 : 1.6,
      filter: confirmada || dominada ? "url(#brillo)" : null,
    },
    check: dominada
      ? { d: `M ${r2(p.x - 4.5)} ${r2(p.y)} l 3.2 3.6 l 6 -7`, stroke: "#0b0d10", strokeWidth: 2.2 }
      : null,
  };
});

const logrosRender = logros.map(({ nb, p, delay }) => ({
  key: `logro-${nb.b.id}`,
  animationDelay: `${delay}ms`,
  tooltip: `Logro: ${nb.b.titulo}`,
  trazo: { d: curva(nb.p, p, 1), stroke: COLOR_CAT[nb.b.categoria], animationDelay: `${delay}ms`, pathLength: 1 },
  circulo: { cx: p.x, cy: p.y, r: 6, fill: COLOR_CAT[nb.b.categoria], filter: "url(#brillo)" },
}));

const caminoLista = eventos.map((e, i) => ({
  key: `${e.b.id}-${e.tipo}`,
  tipo: e.tipo,
  texto: `${e.tipo === "reconocida" ? "Reconociste" : "Dominaste"} ${corta(e.b.titulo, 60)}`,
  numero: i + 1,
  iso: e.t,
}));

const salida = {
  _fuente: "bb1434fb/components/MapaCapacidades.tsx ejecutado con node sobre su propio data/db.json",
  _nota: "las fechas formateadas con Intl(es-CL) quedan FUERA: dependen de la zona horaria del ejecutor",
  geometria: { W, H, CX, CY, RADIO_CAT, RADIO_BRECHA, RADIO_LOGRO, PASO_MS, ordenCategorias: ORDEN },
  colorCat: COLOR_CAT,
  modelo: { raizDelay, nodosCat, nodosBrecha: nodosBrecha.map(({ b, ...rest }) => ({ ...rest, id: b.id })), logros: logros.map(({ nb, ...r }) => ({ ...r, id: nb.b.id })), camino, caminoDelay, totalPasos: paso },
  lineasOcupacion,
  ariaLabel: `Mapa de capacidades de ${ocupacion}: ${brechas.length} brechas detectadas, ${reconocidas} reconocidas, ${dominadas} dominadas y ${rechazadas} descartadas.`,
  aristasRaizCat,
  aristasCatBrecha,
  labelsCat,
  nodosBrechaRender,
  logrosRender,
  caminoLista,
  leyenda: ORDEN.map((c) => ({ cat: c, color: COLOR_CAT[c] })).concat([
    { estado: "pendiente", texto: "detectada" },
    { estado: "confirmada", texto: "reconocida" },
    { estado: "dominada", texto: "dominada" },
    { estado: "rechazada", texto: "descartada" },
  ]),
  caminoVacio:
    "Tu camino empieza con la primera brecha que reconozcas como real. Cada paso queda fechado aquí y dibujado sobre el mapa.",
};

writeFileSync(outPath, JSON.stringify(salida, null, 2) + "\n", "utf8");
console.log("nodos brecha:", nodosBrecha.length, "| logros:", logros.length, "| eventos:", eventos.length, "| ultimo delay:", caminoDelay, "ms");
