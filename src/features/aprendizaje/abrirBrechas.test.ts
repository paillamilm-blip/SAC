// features/aprendizaje/abrirBrechas.test.ts
// La tabla de prioridades de la vista, en puro y sin DOM. Es la regla que hace
// "real" al mapa: la base propia manda sobre el puente y sobre la muestra; la
// muestra SOLO existe para el invitado; y un usuario con sesión y cero filas es
// un VACÍO, no un permiso para pintarle el análisis de otro (spec §8).
import { describe, expect, it } from 'vitest';
// @ts-expect-error node:fs no tiene tipos en este repo (misma convención que contratoMapa.test.ts)
import { readFileSync } from 'node:fs';
import { resolverVista, AVISO_VACIO, type BrechaDeTrabajo, type LecturaBase, type MuestraAnalisis } from './abrirBrechas';
import type { BrechaValidada } from '@/features/gemelo/services/brechasValidar';

const APRENDER = { que: 'pandas', como: 'un curso corto', comoLoDemuestro: 'un notebook publicado' };

const brecha = (titulo: string, extra: Partial<BrechaDeTrabajo> = {}): BrechaDeTrabajo => ({
  id: titulo,
  categoria: 'dura',
  titulo,
  evidencia: 'no aparece en el CV',
  porQueImporta: 'lo piden 6 de cada 10 ofertas',
  severidad: 'alta',
  aprender: APRENDER,
  estado: 'detectada',
  veredictoEn: null,
  dominadaEn: null,
  ...extra,
});

const validada = (titulo: string): BrechaValidada => ({
  categoria: 'blanda',
  titulo,
  evidencia: 'sin ejemplos',
  porQueImporta: 'liderazgo',
  severidad: 'media',
  aprender: APRENDER,
});

const MUESTRA: MuestraAnalisis = {
  ocupacion: 'Analista de datos (muestra)',
  brechas: [brecha('Comunicación escrita breve')],
};

const lectura = (extra: Partial<LecturaBase> = {}): LecturaBase => ({
  conSesion: null,
  cargando: false,
  error: null,
  brechas: [],
  ocupacion: null,
  ...extra,
});

describe('resolverVista · quién manda cuando hay más de una fuente', () => {
  it('sesión sin resolver: cargando, y la muestra no se adelanta', () => {
    const v = resolverVista(lectura({ cargando: true }), [], MUESTRA);
    expect(v.tipo).toBe('cargando');
  });

  it('la lectura falla: se entrega el motivo, nunca un mapa disfrazado', () => {
    const v = resolverVista(lectura({ error: 'no existe la tabla brechas_aprendizaje' }), [], MUESTRA);
    expect(v).toEqual({ tipo: 'error', mensaje: 'no existe la tabla brechas_aprendizaje' });
  });

  it('con filas propias, la base le gana al puente y a la muestra', () => {
    const v = resolverVista(
      lectura({ conSesion: true, brechas: [brecha('Python para datos', { id: 'b1' })], ocupacion: 'Analista de datos' }),
      [validada('Hablar en público')],
      MUESTRA,
    );
    expect(v.tipo).toBe('mapa');
    if (v.tipo !== 'mapa') return;
    expect(v.fuente.brechas.map((b) => b.id)).toEqual(['b1']);
    expect(v.fuente.ocupacion).toBe('Analista de datos');
    expect(v.fuente.simulado).toBe(false);
  });

  it('sesión con cero filas y puente lleno: el puente sigue siendo suyo, no una muestra', () => {
    const v = resolverVista(lectura({ conSesion: true }), [validada('Hablar en público')], MUESTRA);
    expect(v.tipo).toBe('mapa');
    if (v.tipo !== 'mapa') return;
    expect(v.fuente.brechas.map((b) => b.titulo)).toEqual(['Hablar en público']);
    expect(v.fuente.simulado).toBe(false);
  });

  it('sesión con cero filas y puente vacío: VACÍO, no la muestra del donante', () => {
    expect(resolverVista(lectura({ conSesion: true }), [], MUESTRA).tipo).toBe('vacio');
  });

  it('invitado con puente: su puente, sin aviso de muestra', () => {
    const v = resolverVista(lectura({ conSesion: false }), [validada('Hablar en público')], MUESTRA);
    expect(v.tipo).toBe('mapa');
    if (v.tipo !== 'mapa') return;
    expect(v.fuente.simulado).toBe(false);
  });

  it('invitado sin nada: la muestra, y etiquetada como muestra', () => {
    const v = resolverVista(lectura({ conSesion: false }), [], MUESTRA);
    expect(v.tipo).toBe('mapa');
    if (v.tipo !== 'mapa') return;
    expect(v.fuente.simulado).toBe(true);
    expect(v.fuente.ocupacion).toBe('Analista de datos (muestra)');
  });
});

// Hallazgo C. El invitado que YA subió su CV sigue viendo el mapa del donante
// mientras el motor no le devuelva brechas (el respaldo Gemini devuelve ejes y
// cero brechas). Ahí la muestra deja de ser una demo y pasa a ser una mentira:
// es el análisis de otra persona rotulada con el oficio de él.
describe('resolverVista · el invitado que ya leyó su CV', () => {
  it('con CV leído y cero brechas propias: VACÍO con su motivo, no la muestra de otro', () => {
    const v = resolverVista(lectura({ conSesion: false }), [], MUESTRA, true);
    expect(v).toEqual({ tipo: 'vacio', motivo: 'cv_sin_brechas' });
  });

  it('sin CV leído, la muestra sigue siendo la demo del invitado', () => {
    const v = resolverVista(lectura({ conSesion: false }), [], MUESTRA);
    expect(v.tipo).toBe('mapa');
    if (v.tipo !== 'mapa') return;
    expect(v.fuente.simulado).toBe(true);
  });

  it('el puente propio manda pase lo que haya pasado con el CV', () => {
    const v = resolverVista(lectura({ conSesion: false }), [validada('Hablar en público')], MUESTRA, true);
    expect(v.tipo).toBe('mapa');
    if (v.tipo !== 'mapa') return;
    expect(v.fuente.simulado).toBe(false);
  });

  it('quien tiene sesión y cero filas también distingue los dos vacíos', () => {
    expect(resolverVista(lectura({ conSesion: true }), [], MUESTRA)).toEqual({ tipo: 'vacio', motivo: 'sin_cv' });
    expect(resolverVista(lectura({ conSesion: true }), [], MUESTRA, true)).toEqual({ tipo: 'vacio', motivo: 'cv_sin_brechas' });
  });

  it('el error y el cargando siguen primero: el CV leído no disfaza un corte', () => {
    expect(resolverVista(lectura({ error: 'caído' }), [], MUESTRA, true)).toEqual({ tipo: 'error', mensaje: 'caído' });
    expect(resolverVista(lectura({ cargando: true }), [], MUESTRA, true).tipo).toBe('cargando');
  });
});

// La voz de los vacíos vive en un solo lado: la portada y la pestaña Aprendizaje
// leen el mismo par de frases. Dos redacciones distintas de lo mismo es lo que
// separó la app en dos la primera vez.
describe('AVISO_VACIO · una sola voz para los dos vacíos', () => {
  it('cada motivo trae título, explicación y acción', () => {
    for (const motivo of ['sin_cv', 'cv_sin_brechas'] as const) {
      const a = AVISO_VACIO[motivo];
      expect(a.titulo.length, motivo).toBeGreaterThan(8);
      expect(a.hint.length, motivo).toBeGreaterThan(30);
      expect(a.cta.length, motivo).toBeGreaterThan(8);
    }
  });

  it('el CV ya leído no vuelve a pedir el CV', () => {
    expect(AVISO_VACIO.cv_sin_brechas.cta).not.toBe(AVISO_VACIO.sin_cv.cta);
    expect(AVISO_VACIO.cv_sin_brechas.hint).toMatch(/ya|leí|no te marqué/i);
  });

  it('ninguno de los dos promete un mapa que no está', () => {
    expect(AVISO_VACIO.sin_cv.hint + AVISO_VACIO.cv_sin_brechas.hint).not.toMatch(/Domin|Expert|certificad/i);
  });
});

// ── El guard de la voz compartida ────────────────────────────────────────────
// La portada y la pestaña no vuelven a redactar el vacío cada una: si alguien
// escribe una frase nueva en un consumidor, este test lo frena. Es el mismo
// criterio con el que se cerró la duplicación del credencial (L2).
describe('los dos lectores del vacío usan AVISO_VACIO', () => {
  const portada = readFileSync('src/features/omicron/components/OrbShell.tsx', 'utf8');
  const pestana = readFileSync('src/features/aprendizaje/AprendizajeTab.tsx', 'utf8');

  it('ambos importan la voz y ninguno conserva su redacción vieja', () => {
    expect(portada).toMatch(/import \{[^}]*AVISO_VACIO[^}]*\} from '@\/features\/aprendizaje\/abrirBrechas'/);
    expect(pestana).toMatch(/import \{[^}]*AVISO_VACIO[^}]*\} from '.\/abrirBrechas'/);
    expect(portada).not.toMatch(/Subir tu CV para empezar el mapa/);
    expect(pestana).not.toMatch(/Todavía no hay brechas tuyas/);
  });

  // Lo que se vio en la app corriendo: el home pintaba los 16 nodos del donante
  // SIN decir que eran de otro. La etiqueta existía sólo en la pestaña, y spec §8
  // pide el aviso "en toda la UI".
  it('la portada también anuncia la muestra, con la misma etiqueta', () => {
    expect(portada).toMatch(/simulado[\s\S]{0,260}AVISO_MUESTRA/);
    expect(pestana).toMatch(/AVISO_MUESTRA/);
    expect(portada + pestana).not.toMatch(/const AVISO_MUESTRA\s*=/);
  });
});
