import { describe, expect, it } from 'vitest';
import { MUESTRA } from '../brecha/services/muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, registrarPrueba, type Db } from '../brecha/services/repositorio';
import { describirNodo, detectarIntencion, guiaMapa, responder, saludoInicial, sugerencias } from './responder';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'demostracion', simulado: true };
const T0 = '2026-11-02T10:00:00.000Z';

function ids() {
  let n = 0;
  return () => `b${++n}`;
}
function conAnalisis() {
  const r = agregarAnalisis(dbVacia(), MUESTRA, META, T0, ids());
  return { db: r.db, a: r.analisis };
}
const estado = (db: Db) => ({ db, ahora: T0 });

describe('detectarIntencion', () => {
  it.each([
    ['¿Qué me falta?', 'que_me_falta'],
    ['que brechas tengo', 'que_me_falta'],
    ['¿Qué hago ahora?', 'siguiente_paso'],
    ['recomiéndame algo', 'siguiente_paso'],
    ['¿Cómo voy?', 'progreso'],
    ['Léeme la primera', 'leer_primera'],
    ['quiero escanear mi cv', 'escanear'],
    ['abre el mapa', 'mapa'],
    ['ya lo aprendí', 'dominar'],
    ['¿Qué he demostrado?', 'demostrado'],
    ['mis pruebas', 'demostrado'],
    ['qué aprobé', 'demostrado'],
    ['quiero compartir mi credencial', 'demostrado'],
    ['¿Qué puedes hacer?', 'ayuda'],
    ['Hola', 'saludo'],
    ['', 'desconocida'],
    ['blablabla', 'desconocida'],
  ])('«%s» → %s', (texto, esperada) => {
    expect(detectarIntencion(texto)).toBe(esperada);
  });

  it('ignora mayúsculas, tildes y signos', () => {
    expect(detectarIntencion('¡¿QUÉ ME FALTA?!')).toBe('que_me_falta');
  });
});

describe('responder', () => {
  it('sin análisis, "qué me falta" lleva a escanear en vez de inventar brechas', () => {
    const r = responder('¿qué me falta?', estado(dbVacia()));
    expect(r?.accion?.accion).toEqual({ tipo: 'escanear' });
    expect(r?.fuentes).toBeUndefined();
  });

  it('"qué me falta" lista las de mayor impacto y cita la frase real del análisis', () => {
    const { db, a } = conAnalisis();
    const r = responder('¿qué me falta?', estado(db));
    // `conAnalisis` usa la muestra fija: se declara como tal, no como «tu análisis».
    expect(r?.origen).toBe('muestra');
    expect(r?.fuentes?.length).toBe(3);
    // cada cita existe literalmente en el análisis (no se inventa nada)
    const evidencias = new Set(a.brechas.map((b) => b.evidencia));
    expect(r?.fuentes?.every((f) => evidencias.has(f.cita))).toBe(true);
    expect(r?.fuentes?.every((f) => f.etiqueta === 'Muestra de ejemplo')).toBe(true);
  });

  it('con un análisis real, "qué me falta" sí dice «De tu análisis»', () => {
    const real = agregarAnalisis(dbVacia(), MUESTRA, { ...META, proveedor: 'ia', simulado: false }, T0, ids()).db;
    const r = responder('¿qué me falta?', estado(real));
    expect(r?.origen).toBe('analisis');
    expect(r?.fuentes?.every((f) => f.etiqueta === 'De tu análisis')).toBe(true);
  });

  it('"léeme la primera" devuelve una sola brecha, la de mayor impacto', () => {
    const { db, a } = conAnalisis();
    const r = responder('léeme la primera', estado(db));
    expect(r?.fuentes).toHaveLength(1);
    const alta = a.brechas.find((b) => b.severidad === 'alta');
    expect(r?.texto).toContain(alta?.titulo ?? '???');
  });

  it('"cómo voy" usa números con su escala', () => {
    const { db, a } = conAnalisis();
    const d = marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0);
    expect(responder('cómo voy', estado(d))?.texto).toBe('1/8 reales · 0 dominadas con prueba · 100 % de precisión.');
  });

  it('"ya lo aprendí" NO marca nada: manda a demostrarlo con el examen de esa brecha', () => {
    const { db, a } = conAnalisis();
    const d = marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0);
    const r = responder('ya lo aprendí', estado(d));
    expect(r?.accion?.accion).toEqual({
      tipo: 'abrir_reporte',
      analisisId: a.id,
      pestana: 'brechas',
      brechaId: a.brechas[0].id,
    });
    expect(r?.texto).toContain('examen');
    expect(r?.texto).toContain('No se puede marcar a mano');
    expect(r?.origen).toBe('estimacion');
  });

  it('"ya lo aprendí" sin ninguna brecha reconocida solo lleva a la lista de brechas', () => {
    const { db } = conAnalisis();
    const r = responder('ya lo aprendí', estado(db));
    expect(r?.accion?.accion.tipo).toBe('abrir_reporte');
  });

  it('una pregunta que no entiende devuelve null (el chat decide qué hacer)', () => {
    expect(responder('cuál es la capital de Francia', estado(dbVacia()))).toBeNull();
  });

  it('ninguna respuesta se rotula "Probado" (el asistente todavía no lee la prueba del examen)', () => {
    const { db, a } = conAnalisis();
    const d = marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0);
    for (const txt of ['hola', 'qué hago ahora', 'qué me falta', 'cómo voy', 'abre el mapa', 'ya lo aprendí', 'ayuda', 'qué he demostrado']) {
      const r = responder(txt, estado(d));
      expect(r?.origen).not.toBe('probado');
      expect(r?.fuentes?.every((f) => f.origen !== 'probado') ?? true).toBe(true);
    }
  });
});

describe('saludoInicial y sugerencias', () => {
  it('saluda por nombre y propone un único siguiente paso', () => {
    const r = saludoInicial(estado(dbVacia()), 'Carolina');
    expect(r.texto.startsWith('Hola, Carolina.')).toBe(true);
    expect(r.accion?.accion).toEqual({ tipo: 'escanear' });
  });

  it('las sugerencias son siempre frases que el asistente entiende', () => {
    const { db } = conAnalisis();
    for (const s of [...sugerencias(estado(dbVacia())), ...sugerencias(estado(db))]) {
      expect(detectarIntencion(s)).not.toBe('desconocida');
    }
  });
});

describe('«¿qué he demostrado?» y la etiqueta «Probado»', () => {
  const PRUEBA = (puntaje: number, en = '2026-11-03T12:00:00.000Z') => ({ actaId: 'acta-1', puntaje, en });

  function conUnaProbada(puntaje = 82) {
    const { db, a } = conAnalisis();
    const b = a.brechas[0];
    const d = registrarPrueba(marcarBrecha(db, a.id, b.id, 'confirmada', T0), a.id, b.id, PRUEBA(puntaje));
    return { d, a, b };
  }

  it('sin ningún examen aprobado NO usa «Probado»: lo dice y lleva a las brechas', () => {
    const { db, a } = conAnalisis();
    const r = responder('¿qué he demostrado?', estado(db));
    expect(r?.origen).toBe('estimacion');
    expect(r?.fuentes).toBeUndefined();
    expect(r?.texto).toContain('Todavía no has aprobado ningún examen');
    expect(r?.accion?.accion).toEqual({ tipo: 'abrir_reporte', analisisId: a.id, pestana: 'brechas' });
  });

  it('una brecha solo reconocida o «marcada a mano» no cuenta como probada', () => {
    const { db, a } = conAnalisis();
    const real = marcarBrecha(db, a.id, a.brechas[0].id, 'confirmada', T0);
    expect(responder('qué he demostrado', estado(real))?.origen).toBe('estimacion');
    const amano = {
      ...real,
      analisis: real.analisis.map((x) => ({
        ...x,
        brechas: x.brechas.map((b, i) => (i === 0 ? { ...b, dominadaEn: T0, prueba: null } : b)),
      })),
    };
    expect(responder('qué he demostrado', estado(amano))?.origen).toBe('estimacion');
  });

  it('sin análisis lleva a escanear', () => {
    const r = responder('qué he demostrado', estado(dbVacia()));
    expect(r?.accion?.accion).toEqual({ tipo: 'escanear' });
  });

  it('con un examen aprobado: origen «Probado», con el puntaje y escala de cada habilidad', () => {
    const { d, a, b } = conUnaProbada(82);
    const r = responder('¿qué he demostrado?', estado(d));
    expect(r?.origen).toBe('probado');
    expect(r?.texto).toContain('Has demostrado 1 brecha con un examen aprobado');
    expect(r?.texto).toContain(`${b.titulo} · 82/100`);
    expect(r?.fuentes).toEqual([
      { cita: `«${b.titulo}»: examen aprobado con 82/100`, origen: 'probado', etiqueta: 'Probado' },
    ]);
    expect(r?.accion?.accion).toEqual({ tipo: 'abrir_reporte', analisisId: a.id, pestana: 'mapa' });
  });

  it('«Probado» aparece SOLO aquí: las demás respuestas siguen diciendo de dónde sale el dato', () => {
    const { d } = conUnaProbada();
    for (const txt of ['qué me falta', 'cómo voy', 'léeme la primera', 'abre el mapa', 'ya lo aprendí']) {
      const r = responder(txt, estado(d));
      expect(r?.origen).not.toBe('probado');
      expect(r?.fuentes?.every((f) => f.origen !== 'probado') ?? true).toBe(true);
    }
  });

  it('la misma habilidad en dos análisis cuenta una sola vez', () => {
    const { d, a, b } = conUnaProbada(80);
    const segundo = agregarAnalisis(d, MUESTRA, META, '2026-11-04T10:00:00.000Z', (() => { let n = 100; return () => `z${++n}`; })());
    const b2 = segundo.analisis.brechas[0];
    const conDos = registrarPrueba(
      marcarBrecha(segundo.db, segundo.analisis.id, b2.id, 'confirmada', T0),
      segundo.analisis.id,
      b2.id,
      PRUEBA(90, '2026-11-04T12:00:00.000Z'),
    );
    expect(b2.titulo).toBe(b.titulo);
    const r = responder('qué he demostrado', estado(conDos));
    expect(r?.texto).toContain('Has demostrado 1 brecha');
    expect(r?.texto).toContain('90/100'); // la más reciente
    expect(r?.fuentes).toHaveLength(1);
    expect(a.id).not.toBe(segundo.analisis.id);
  });

  it('con más de 5 se muestran 5 y se dice cuántas faltan', () => {
    const { db, a } = conAnalisis();
    let d = db;
    a.brechas.slice(0, 7).forEach((b, i) => {
      d = registrarPrueba(marcarBrecha(d, a.id, b.id, 'confirmada', T0), a.id, b.id, PRUEBA(70 + i, `2026-11-03T1${i}:00:00.000Z`));
    });
    const r = responder('qué he demostrado', estado(d));
    expect(r?.texto).toContain('Has demostrado 7 brechas');
    expect(r?.texto).toContain('y 2 más.');
    expect(r?.fuentes).toHaveLength(5);
  });

  it('la sugerencia «¿Qué he demostrado?» solo aparece cuando hay algo probado', () => {
    const { db } = conAnalisis();
    expect(sugerencias(estado(db))).not.toContain('¿Qué he demostrado?');
    const { d } = conUnaProbada();
    expect(sugerencias(estado(d))).toContain('¿Qué he demostrado?');
    for (const s of sugerencias(estado(d))) expect(detectarIntencion(s)).not.toBe('desconocida');
  });
});

describe('guiaMapa y describirNodo (el asistente comenta el mapa)', () => {
  it('la guía explica qué es un nodo y cuenta cuántas brechas hay', () => {
    const { db, a } = conAnalisis();
    const r = guiaMapa(estado(db), a.id);
    expect(r?.texto).toContain('nodo');
    expect(r?.texto).toContain(`${a.brechas.length} brechas`);
    expect(r?.origen).toBe('muestra'); // la muestra fija nunca se presenta como «tu análisis»
  });

  it('sin análisis no hay guía ni descripción: no inventa', () => {
    expect(guiaMapa(estado(dbVacia()), 'x')).toBeNull();
    expect(describirNodo(estado(dbVacia()), 'x', 'y')).toBeNull();
  });

  it('describir un nodo usa solo los datos de esa brecha y propone abrirla', () => {
    const { db, a } = conAnalisis();
    const b = a.brechas[0];
    const r = describirNodo(estado(db), a.id, b.id);
    expect(r?.texto).toContain(b.titulo);
    expect(r?.texto).toContain(b.porQueImporta);
    expect(r?.texto).toContain('Aún no me dices si es real.');
    expect(r?.accion?.accion).toEqual({ tipo: 'abrir_reporte', analisisId: a.id, pestana: 'brechas', brechaId: b.id });
    expect(r?.accion?.etiqueta).toBe('Decir si es real');
  });

  it('una brecha «Ausente en el CV» dice lo que falta, sin repetir el prefijo ni citarla como fuente', () => {
    const { db, a } = conAnalisis();
    const b = a.brechas.find((x) => /^ausente en el cv:/i.test(x.evidencia))!;
    const r = describirNodo(estado(db), a.id, b.id);
    expect(r?.texto).toContain('Lo que falta en tu CV');
    expect(r?.texto).not.toMatch(/ausente en el cv:/i);
    expect(r?.fuentes).toBeUndefined();
  });

  it('una brecha reconocida propone demostrarla', () => {
    const { db, a } = conAnalisis();
    const b = a.brechas[0];
    const db2 = marcarBrecha(db, a.id, b.id, 'confirmada', T0);
    const r = describirNodo(estado(db2), a.id, b.id);
    expect(r?.texto).toContain('La reconociste como real.');
    expect(r?.accion?.etiqueta).toBe('Demostrarlo');
  });
});
