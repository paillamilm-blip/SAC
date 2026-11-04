import { describe, expect, it } from 'vitest';
import { MUESTRA } from '../brecha/services/muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, type Db } from '../brecha/services/repositorio';
import { detectarIntencion, responder, saludoInicial, sugerencias } from './responder';

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
    expect(responder('cómo voy', estado(d))?.texto).toBe('1/8 reales · 0 dominadas · 100 % de precisión.');
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
    for (const txt of ['hola', 'qué hago ahora', 'qué me falta', 'cómo voy', 'abre el mapa', 'ya lo aprendí', 'ayuda']) {
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
