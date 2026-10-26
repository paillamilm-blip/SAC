import { describe, it, expect } from 'vitest';
import { normalizarBrecha, normalizarBrechas, ejesUsables } from './brechasValidar';

const OK = {
  categoria: 'conocimiento', titulo: 'Excel avanzado',
  evidencia: 'no aparece en el CV', porQueImporta: 'lo pide el puesto',
  severidad: 'alta',
  aprender: { que: 'tablas dinámicas', como: 'curso 4h + práctica', comoLoDemuestro: 'archivo de ejemplo' },
};

const conTitulo = (t: string) => ({ ...OK, titulo: t });

describe('normalizarBrecha (port del validador de la app CV)', () => {
  it('brecha válida pasa con defaults', () => {
    const r = normalizarBrecha(OK);
    expect(r).not.toBeNull();
    expect(r!.titulo).toBe('Excel avanzado');
    expect(r!.severidad).toBe('alta');
  });
  it('categoria inventada mata la brecha, no la inventa', () => {
    expect(normalizarBrecha({ ...OK, categoria: 'superpoder' })).toBeNull();
  });
  it('severidad inválida cae a media en vez de matar', () => {
    expect(normalizarBrecha({ ...OK, severidad: 'critical' })!.severidad).toBe('media');
  });
  it('aprender incompleto se tolera con vacíos, titulo faltante mata', () => {
    expect(normalizarBrecha({ ...OK, titulo: '' })).toBeNull();
    expect(normalizarBrecha({ ...OK, aprender: {} })!.aprender.que).toBe('');
  });
  it('normalizarBrechas filtra, limita a 12 y no lanza con basura', () => {
    expect(normalizarBrechas(null)).toEqual([]);
    expect(normalizarBrechas('no soy array')).toEqual([]);
    // Titulos distintos: con el dedupe por identidad de skill, un array de `OK`
    // repetidos ya no sirve para medir el corte de 12 (ver describe de abajo).
    expect(normalizarBrechas([conTitulo('A'), { basura: true }, conTitulo('B')])).toHaveLength(2);
    expect(normalizarBrechas(Array.from({ length: 30 }, (_, i) => conTitulo(`skill ${i}`)))).toHaveLength(12);
  });
});

// Dedupe por titulo normalizado: la RPC de 10012 ya dedupa (row_number() ... rn = 1)
// y su `returning id` cubre las dos ramas del upsert, o sea que devuelve UN id por
// cada skill unica. Si el validador conserva los repetidos, `guardado.brechas` trae
// menos ids que brechas tiene el cliente y la lista de suscripciones de Plan B
// queda corta sin que nadie lo vea. El espejo del navegador es la misma identidad
// de skill del spec §4, asi que el Gemelo y la BD ven la misma lista.
describe('normalizarBrechas dedupe por titulo normalizado', () => {
  it('la misma skill escrita dos formas distintas queda una sola vez (y gana la primera)', () => {
    const r = normalizarBrechas([conTitulo('Excel avanzado'), conTitulo('  excel   AVANZADO ')]);
    expect(r).toHaveLength(1);
    // `order by ord` del SQL: se conserva la primera aparicion, con su titulo tal
    // como lo trajo ese run (normalizarBrecha ya recorto por los lados).
    expect(r[0].titulo).toBe('Excel avanzado');
  });

  it('13 titulos unicos cortan en 12 (el dedupe no mueve el MAX_BRECHAS)', () => {
    expect(normalizarBrechas(Array.from({ length: 13 }, (_, i) => conTitulo(`skill ${i}`)))).toHaveLength(12);
  });

  it('un repetido no consume cupo: 13 entradas con 12 titulos unicos dan las 12', () => {
    const unicos = Array.from({ length: 12 }, (_, i) => conTitulo(`skill ${i}`));
    // El duplicado va en el MEDIO y repite una skill ya vista: sin dedupe ocupa un
    // lugar y el corte de 12 se come la ultima skill; con dedupe pasa por arriba y
    // las 12 unicas sobreviven con el titulo de la primera aparicion.
    const con_repetido = [...unicos.slice(0, 5), conTitulo('  SKILL   2 '), ...unicos.slice(5)];
    expect(con_repetido).toHaveLength(13);
    const r = normalizarBrechas(con_repetido);
    expect(r).toHaveLength(12);
    expect(r.map((b) => b.titulo)).toEqual(unicos.map((b) => b.titulo));
    expect(r.map((b) => b.titulo)).toContain('skill 11');
  });
});

// I2: ningun campo puede traer megabytes de un CV malinterpretado. Los topes
// viven en MAX_CAMPO (las tres copias del validador) y el SQL los documenta.
describe('normalizarBrecha recorta cada campo a su maximo', () => {
  const lleno = (n: number) => 'x'.repeat(n);
  const desborda = {
    categoria: 'dura', titulo: lleno(500), evidencia: lleno(5000), porQueImporta: lleno(5000),
    severidad: 'alta',
    aprender: { que: lleno(5000), como: lleno(5000), comoLoDemuestro: lleno(5000) },
  };

  it('recorta a 120 / 400 / 400 / 300 / 400 / 300', () => {
    const r = normalizarBrecha(desborda)!;
    expect(r.titulo).toHaveLength(120);
    expect(r.evidencia).toHaveLength(400);
    expect(r.porQueImporta).toHaveLength(400);
    expect(r.aprender.que).toHaveLength(300);
    expect(r.aprender.como).toHaveLength(400);
    expect(r.aprender.comoLoDemuestro).toHaveLength(300);
  });

  it('un campo justo en el maximo pasa entero (el tope no muerde el borde)', () => {
    const r = normalizarBrecha({
      ...desborda,
      titulo: lleno(120), evidencia: lleno(400), porQueImporta: lleno(400),
      aprender: { que: lleno(300), como: lleno(400), comoLoDemuestro: lleno(300) },
    })!;
    expect(r.titulo).toHaveLength(120);
    expect(r.evidencia).toHaveLength(400);
    expect(r.porQueImporta).toHaveLength(400);
    expect(r.aprender.que).toHaveLength(300);
    expect(r.aprender.como).toHaveLength(400);
    expect(r.aprender.comoLoDemuestro).toHaveLength(300);
  });

  it('el recorte no inventa: solo corta, el texto que queda es el principio', () => {
    const r = normalizarBrecha({ ...desborda, titulo: 'React ' + lleno(300) })!;
    expect(r.titulo.startsWith('React ')).toBe(true);
    expect(r.titulo).toHaveLength(120);
  });

  it('un numero en lugar de texto sigue cayendo a vacio (el corte no lo rescata)', () => {
    const r = normalizarBrecha({ ...desborda, titulo: 'React', evidencia: 42 })!;
    expect(r.evidencia).toBe('');
  });
});

// ── ejesUsables: el guard de los 4 ejes ─────────────────────────────────────
// Un analisis sin los 4 ejes no es un analisis: es lo que dibuja el Gemelo y lo
// que cuenta en la metrica de la Fase 1. El guard se cobra ANTES de guardar y
// ANTES de devolver ok en el entry de Deno, y vive aca (espejo del canonico)
// para que esta tabla de verdad corra en vitest — Deno no se puede importar.
// La trampa que caza estos tests: Number(null), Number(''), Number('   '),
// Number(false) y Number([]) devuelven 0, asi que "los 4 ejes estan" mentia y
// un run todo-cero se guardaba como perfil real. El 0 legitimo NO se rechaza
// (un eje puede valer 0); lo que se rechaza es lo que no se puede leer numero.
describe('ejesUsables: ni un eje presente-pero-no-numerico ni un cero falso pasan', () => {
  // Los cuatro ejes al mismo valor: el guard exige los 4, y asi cada fila de la
  // tabla se prueba sola sin ruido de los otros tres.
  const conEjes = (v: unknown) => ({ axes: { exec: v, qual: v, trans: v, fund: v } });
  const nombre = (v: unknown): string => JSON.stringify(v);

  it('null, "", "   ", false y [] no son ejes (Number() los convierte en 0)', () => {
    // Se prueban los cinco juntos y se listan los que pasaron: un `expect` por
    // fila paraba el recorrido en la primera y dejaba las otras cuatro sin medir.
    const pasaron = [null, '', '  ', false, []].filter((noNumero) => ejesUsables(conEjes(noNumero)));
    expect(pasaron, `el guard trago ejes no-numericos: ${pasaron.map(nombre).join(', ')}`).toEqual([]);
  });

  it('[1] tampoco: un array de un elemento se coerctea a 1 pero no es un numero', () => {
    expect(ejesUsables(conEjes([1]))).toBe(false);
  });

  it('{} no es eje (Number({}) es NaN)', () => {
    expect(ejesUsables(conEjes({}))).toBe(false);
  });

  it('NaN e Infinity no son ejes (Number.isFinite los corta)', () => {
    expect(ejesUsables(conEjes(NaN))).toBe(false);
    expect(ejesUsables(conEjes(Infinity))).toBe(false);
    expect(ejesUsables(conEjes(-Infinity))).toBe(false);
  });

  it('fuera del rango 0-100 no es eje (el prompt exige enteros de esa escala)', () => {
    expect(ejesUsables(conEjes(-5))).toBe(false);
    expect(ejesUsables(conEjes(120))).toBe(false);
    expect(ejesUsables({ axes: { exec: 80, qual: 100, trans: 50, fund: 100.5 } })).toBe(false);
  });

  it('un eje que falta no es analisis: los cuatro o nada', () => {
    expect(ejesUsables({ axes: { exec: 80, qual: 70, trans: 60 } })).toBe(false);
    expect(ejesUsables({ axes: {} })).toBe(false);
    expect(ejesUsables({ axes: { exec: undefined, qual: undefined, trans: undefined, fund: undefined } })).toBe(false);
    expect(ejesUsables({})).toBe(false);
    expect(ejesUsables({ axes: null })).toBe(false);
  });

  it('el perfil completo pasa, y el 0 legitimo NO se rechaza', () => {
    expect(ejesUsables({ axes: { exec: 80, qual: 70, trans: 60, fund: 50 } })).toBe(true);
    expect(ejesUsables({ axes: { exec: 0, qual: 100, trans: 50, fund: 0 } })).toBe(true);
  });

  it('los numeros como string se leen como numeros (el modelo los devuelve asi)', () => {
    expect(ejesUsables({ axes: { exec: '80', qual: '70', trans: '60', fund: '50' } })).toBe(true);
    expect(ejesUsables({ axes: { exec: '0', qual: '100', trans: '50', fund: '0' } })).toBe(true);
  });

  it('axes siendo un array no es analisis (los ejes son claves, no posiciones)', () => {
    expect(ejesUsables({ axes: [80, 70, 60, 50] })).toBe(false);
  });

  it('ejesUsables no lanza con basura: undefined, null y no-objeto devuelven false', () => {
    expect(ejesUsables(undefined)).toBe(false);
    expect(ejesUsables(null)).toBe(false);
    expect(ejesUsables('no soy un perfil')).toBe(false);
    expect(ejesUsables(42)).toBe(false);
  });
});
