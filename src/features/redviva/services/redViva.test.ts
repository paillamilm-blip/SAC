// features/redviva/services/redViva.test.ts
// La regla que este test protege: SÓLIDO significa PROBADO. Nunca se deduce de un
// porcentaje. Si esto se rompe, la Red Viva miente y el sello "conocimiento
// verificable, no declarado" queda traicionado.

import { describe, it, expect } from 'vitest';
import {
  buildRedViva,
  hash01,
  normalizeSkill,
  resumenRed,
  textoEstado,
  type SkillProof,
} from './redViva';

const skillsDetail = [
  { name: 'Excel', pct: 95 },        // afirmación altísima, sin prueba
  { name: 'SAP', pct: 40 },
  { name: 'Lean Manufacturing', pct: 70 },
];

describe('REGLA DE INTEGRIDAD — sólido = probado, jamás deducido', () => {
  it('un pct de 95 SIN prueba se dibuja HUECO, no sólido', () => {
    const model = buildRedViva({ skillsDetail, proofs: [] });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(excel.estado).toBe('hueco');
    expect(excel.provenScore).toBeNull();
    expect(excel.declaredPct).toBe(95);
    expect(excel.anillo).toBe(1); // frontera
  });

  it('una habilidad con prueba registrada va al núcleo y es sólida', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'excel', skill_label: 'Excel', best_score: 88 },
    ];
    const model = buildRedViva({ skillsDetail, proofs });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(excel.estado).toBe('solido');
    expect(excel.provenScore).toBe(88);
    expect(excel.anillo).toBe(0); // núcleo
  });

  it('best_score null significa "probada sin puntaje", NO se rellena con un número', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'excel', skill_label: 'Excel', best_score: null },
    ];
    const model = buildRedViva({ skillsDetail, proofs });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(excel.estado).toBe('solido');
    expect(excel.provenScore).toBeNull();
    expect(textoEstado(excel)).toContain('No quedó registrado');
  });

  it('marca latiendo solo cuando hay una prueba en curso', () => {
    const model = buildRedViva({ skillsDetail, proofs: [], enCurso: ['sap'] });
    expect(model.nodos.find((n) => n.id === 'sap')!.estado).toBe('latiendo');
    expect(model.nodos.find((n) => n.id === 'excel')!.estado).toBe('hueco');
  });
});

describe('normalizeSkill — la identidad que sostiene el layout', () => {
  it('quita acentos, espacios sobrantes y mayúsculas', () => {
    expect(normalizeSkill('  Automatización  ')).toBe('automatizacion');
    expect(normalizeSkill('Diseño   Industrial')).toBe('diseno industrial');
  });

  it('con texto vacío o nulo devuelve cadena vacía, no null', () => {
    expect(normalizeSkill('')).toBe('');
    expect(normalizeSkill(undefined as unknown as string)).toBe('');
  });

  it('la clave del nodo es normalizada y la etiqueta respeta al usuario', () => {
    const model = buildRedViva({ skillsDetail: [{ name: 'Automatización', pct: 60 }] });
    expect(model.nodos[0].id).toBe('automatizacion');
    expect(model.nodos[0].label).toBe('Automatización');
  });
});

describe('totales — el 20/80 hecho número', () => {
  it('cuenta probadas sobre declaradas', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'excel', skill_label: 'Excel', best_score: 90 },
    ];
    const model = buildRedViva({ skillsDetail, proofs });
    expect(model.totales.declaradas).toBe(3);
    expect(model.totales.probadas).toBe(1);
  });

  it('una habilidad probada que no estaba en el CV también cuenta', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'autocad', skill_label: 'AutoCAD', best_score: 75 },
    ];
    const model = buildRedViva({ skillsDetail, proofs });
    expect(model.totales.declaradas).toBe(4); // 3 del CV + 1 probada aparte
    const autocad = model.nodos.find((n) => n.id === 'autocad')!;
    expect(autocad.declaredPct).toBeNull(); // no la afirmó el CV
    expect(autocad.estado).toBe('solido');
  });
});

describe('vacío y respaldos', () => {
  it('sin habilidades, la red se declara vacía e invita a subir el CV', () => {
    const model = buildRedViva({});
    expect(model.vacia).toBe(true);
    expect(model.nodos).toEqual([]);
    expect(resumenRed(model)).toContain('Sube tu CV');
  });

  it('sin skills_detail usa skills[] y NO inventa un pct', () => {
    const model = buildRedViva({ skills: ['Excel', 'SAP'] });
    expect(model.nodos).toHaveLength(2);
    expect(model.nodos.every((n) => n.declaredPct === 0)).toBe(true);
  });
});

describe('layout — estable y sin reordenar al crecer', () => {
  it('la misma habilidad cae siempre en la misma posición', () => {
    const a = buildRedViva({ skillsDetail, proofs: [] });
    const b = buildRedViva({ skillsDetail, proofs: [] });
    const excelA = a.nodos.find((n) => n.id === 'excel')!;
    const excelB = b.nodos.find((n) => n.id === 'excel')!;
    expect(excelA.x).toBeCloseTo(excelB.x, 10);
    expect(excelA.y).toBeCloseTo(excelB.y, 10);
  });

  it('hash01 es determinista y acotado a 0..1', () => {
    expect(hash01('Excel')).toBe(hash01('excel'));
    const v = hash01('Lean Manufacturing');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('dispersa identidades comunes sin perder estabilidad', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Python', pct: 70 }, { name: 'TypeScript', pct: 70 }],
    });
    const python = model.nodos.find((n) => n.id === 'python')!;
    const typescript = model.nodos.find((n) => n.id === 'typescript')!;
    expect(Math.abs(python.angulo - typescript.angulo)).toBeGreaterThan(0.1);
  });

  it('agregar habilidades no cambia el ángulo de una habilidad existente', () => {
    const antes = buildRedViva({ skillsDetail: [{ name: 'Excel', pct: 95 }] });
    const despues = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 95 }, { name: 'SAP', pct: 60 }, { name: 'Python', pct: 70 }],
    });
    expect(despues.nodos.find((n) => n.id === 'excel')!.angulo)
      .toBeCloseTo(antes.nodos.find((n) => n.id === 'excel')!.angulo, 12);
  });

  it('pasar de hueco a sólido conserva el ángulo y solo reduce el radio', () => {
    const antes = buildRedViva({ skillsDetail, proofs: [] });
    const despues = buildRedViva({
      skillsDetail,
      proofs: [{ skill_key: 'excel', skill_label: 'Excel', best_score: 90 }],
    });
    const excelAntes = antes.nodos.find((n) => n.id === 'excel')!;
    const excelDespues = despues.nodos.find((n) => n.id === 'excel')!;
    expect(excelDespues.angulo).toBeCloseTo(excelAntes.angulo, 12);
    expect(Math.hypot(excelDespues.x, excelDespues.y))
      .toBeLessThan(Math.hypot(excelAntes.x, excelAntes.y));
  });

  it('probar una habilidad la MUEVE de la frontera al núcleo', () => {
    const antes = buildRedViva({ skillsDetail, proofs: [] });
    const despues = buildRedViva({
      skillsDetail,
      proofs: [{ skill_key: 'excel', skill_label: 'Excel', best_score: 90 }],
    });
    const radioAntes = Math.hypot(
      antes.nodos.find((n) => n.id === 'excel')!.x,
      antes.nodos.find((n) => n.id === 'excel')!.y,
    );
    const radioDespues = Math.hypot(
      despues.nodos.find((n) => n.id === 'excel')!.x,
      despues.nodos.find((n) => n.id === 'excel')!.y,
    );
    expect(radioDespues).toBeLessThan(radioAntes);
  });

  it('todos los nodos caen dentro del círculo unitario', () => {
    const model = buildRedViva({ skillsDetail, proofs: [] });
    for (const n of model.nodos) {
      expect(Math.hypot(n.x, n.y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('textos — cero jerga, cada número con contexto', () => {
  it('el resumen dice la verdad incómoda cuando no hay nada probado', () => {
    const model = buildRedViva({ skillsDetail, proofs: [] });
    expect(resumenRed(model)).toBe(
      'Declaraste 3 habilidades y todavía no probaste ninguna. Prueba una y empieza a valer.',
    );
  });

  it('el resumen parcial evita jerga visual como “hueca”', () => {
    const model = buildRedViva({
      skillsDetail,
      proofs: [{ skill_key: 'excel', skill_label: 'Excel', best_score: 88 }],
    });
    expect(resumenRed(model)).toBe(
      'Probaste 1 de 3 habilidades. Las 2 restantes todavía no tienen una prueba.',
    );
  });

  it('el resumen completo habla de habilidades registradas, aunque una prueba no venga del CV', () => {
    const model = buildRedViva({
      proofs: [{ skill_key: 'autocad', skill_label: 'AutoCAD', best_score: 90 }],
    });
    expect(resumenRed(model)).toBe(
      'Probaste la habilidad registrada. Tiene una prueba registrada.',
    );
  });

  it('un nodo hueco muestra la escala completa, no un número pelado', () => {
    const model = buildRedViva({ skillsDetail, proofs: [] });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(textoEstado(excel)).toBe('Tu CV dice 95/100. Nadie lo comprobó todavía.');
  });

  it('un nodo probado muestra su puntaje real sobre 100', () => {
    const model = buildRedViva({
      skillsDetail,
      proofs: [{ skill_key: 'sap', skill_label: 'SAP', best_score: 82 }],
    });
    const sap = model.nodos.find((n) => n.id === 'sap')!;
    expect(textoEstado(sap)).toBe('Probada con 82/100.');
  });
});
