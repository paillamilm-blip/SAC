// features/redviva/services/examenSkill.test.ts
// Las validaciones tienen que ser ESPEJO de omicron_ensure_skill_node. Si acá se
// acepta algo que la base rechaza, el usuario ve un error después de esperar;
// si acá se rechaza algo que la base acepta, se pierde un examen válido.

import { describe, it, expect } from 'vitest';
import { normalizarTitulo, validarTitulo, TITULO_MAX } from './examenSkill';

describe('normalizarTitulo', () => {
  it('colapsa espacios y recorta, igual que el SQL', () => {
    expect(normalizarTitulo('  Derecho   Laboral  ')).toBe('Derecho Laboral');
    expect(normalizarTitulo('Lean\tManufacturing')).toBe('Lean Manufacturing');
  });

  it('no explota con vacíos', () => {
    expect(normalizarTitulo(null)).toBe('');
    expect(normalizarTitulo(undefined)).toBe('');
  });

  it('NO cambia mayúsculas: el nombre se muestra como lo escribió la persona', () => {
    expect(normalizarTitulo('SAP')).toBe('SAP');
  });
});

describe('validarTitulo', () => {
  it('acepta habilidades reales de cualquier profesión', () => {
    for (const t of [
      'Derecho Laboral',
      'SAP',
      'Lean Manufacturing',
      'Anestesiología',
      'Soldadura TIG',
      'Diseño de Interiores',
    ]) {
      const r = validarTitulo(t);
      expect(r.ok).toBe(true);
    }
  });

  it('rechaza lo que es demasiado corto', () => {
    const r = validarTitulo('a');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('demasiado corto');
  });

  it('rechaza lo que es demasiado largo', () => {
    const r = validarTitulo('x'.repeat(TITULO_MAX + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('demasiado largo');
  });

  it('rechaza símbolos y números sueltos (espejo de [[:alpha:]]{2})', () => {
    for (const basura of ['123', '---', '$$$', '1 2 3', '?!']) {
      const r = validarTitulo(basura);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('no parece una habilidad');
    }
  });

  it('acepta acentos y ñ (el sistema es en español, no puede tropezar con esto)', () => {
    expect(validarTitulo('Automatización').ok).toBe(true);
    expect(validarTitulo('Diseño').ok).toBe(true);
  });

  it('devuelve el título ya normalizado para mandarlo a la base', () => {
    const r = validarTitulo('  Gestión   de   Proyectos ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.titulo).toBe('Gestión de Proyectos');
  });

  it('un título de exactamente el largo máximo entra', () => {
    expect(validarTitulo('ab' + 'c'.repeat(TITULO_MAX - 2)).ok).toBe(true);
  });
});
