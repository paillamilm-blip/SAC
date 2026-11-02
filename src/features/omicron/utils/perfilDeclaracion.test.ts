// src/features/omicron/utils/perfilDeclaracion.test.ts
// El onboarding escucha UNA frase y de ahí sale el Gemelo. Este contrato existe
// porque la versión anterior hacía aritmética sobre esa frase: ejes calculados
// desde los años, años por defecto cuando no se decían, una terna de habilidades
// inventada para el que no nombraba nada, y un "Dominas X" en la celebración.
// Todo eso convertía la declaración del usuario en datos que la app se creía.
//
// La vara: del onboarding sólo salen palabras que el usuario dijo. Los números
// (ejes, porcentaje por habilidad) los trae el análisis del CV, no la conversación.
import { describe, expect, it } from 'vitest';
import { MENSAJE_NACIMIENTO, perfilDesdeDeclaracion } from './perfilDeclaracion';

describe('perfilDesdeDeclaracion — cero invento en los ejes', () => {
  it('no calcula ejes: los cuatro llegan en 0 pase lo que pase', () => {
    for (const texto of ['Soy abogada con 12 años', 'Desarrollador web', 'Ingeniero industrial']) {
      const p = perfilDesdeDeclaracion(texto);
      expect(p.axes, texto).toEqual({ exec: 0, qual: 0, trans: 0, fund: 0 });
    }
  });

  it('sin años dichos, años es 0 (no 3 por defecto) y no hay etiqueta de seniority', () => {
    const p = perfilDesdeDeclaracion('Desarrollador web con React');
    expect(p.years).toBe(0);
    expect(p.seniorLabel).toBe('');
  });

  it('los años declarados sí se leen, incluida la variante con ny', () => {
    expect(perfilDesdeDeclaracion('Soy abogada con 12 años').years).toBe(12);
    expect(perfilDesdeDeclaracion('Enfermero, 4 años').years).toBe(4);
    expect(perfilDesdeDeclaracion('Soy abogada con 12 años').seniorLabel).toContain('Senior');
  });
});

describe('perfilDesdeDeclaracion — habilidades nombradas, no adivinadas', () => {
  it('no rellena con una terna inventada cuando el usuario no nombra nada', () => {
    const p = perfilDesdeDeclaracion('Artista audiovisual independiente');
    expect(p.skills).not.toContain('Profesional');
    expect(p.skills).not.toContain('Adaptabilidad');
    expect(p.skills).not.toContain('Trabajo en equipo');
  });

  it('una tecnología dicha se registra tal cual', () => {
    const p = perfilDesdeDeclaracion('Desarrollo web con React y TypeScript');
    expect(p.skills).toContain('React');
    expect(p.skills).toContain('TypeScript');
  });

  it('el oficio no arrastra una especialidad que no se nombró', () => {
    const p = perfilDesdeDeclaracion('Soy ingeniero civil');
    expect(p.skills).not.toContain('Ing. Industrial');
  });

  it('nunca más de 6 habilidades', () => {
    const p = perfilDesdeDeclaracion('React, TypeScript, Node, Python, Docker, AWS, Figma, datos y machine learning');
    expect(p.skills.length).toBeLessThanOrEqual(6);
  });
});

describe('perfilDesdeDeclaracion — la profesión es lo que él dijo', () => {
  it('corta en palabra completa, nunca a mitad', () => {
    const texto = 'Diseñadora de experiencia de usuario especializada en accesibilidad para productos financieros';
    const p = perfilDesdeDeclaracion(texto);
    expect(p.profession.length).toBeLessThanOrEqual(50);
    // Lo que queda es el principio literal de lo que él dijo...
    expect(texto.startsWith(p.profession)).toBe(true);
    // ... y el corte cae en un espacio, no dentro de una palabra.
    const despues = texto[p.profession.length];
    expect(despues === undefined || despues === ' ').toBe(true);
  });

  it('quita el "soy / trabajo como / me dedico a" (y su artículo) y deja el oficio', () => {
    expect(perfilDesdeDeclaracion('Soy enfermera').profession).toBe('enfermera');
    expect(perfilDesdeDeclaracion('Trabajo como electricista').profession).toBe('electricista');
    expect(perfilDesdeDeclaracion('Me dedico a la nutrición').profession).toBe('nutrición');
  });

  it('suelta la cola de años: el oficio llega solo, porque los años viajan aparte', () => {
    // La raíz del mapa se rotula con la profesión. Dejar "abogada con 12 años de
    // familia" era pintar el mismo dato dos veces, uno de ellos mal: el nombre.
    expect(perfilDesdeDeclaracion('Soy abogada con 12 años de familia').profession).toBe('abogada');
    expect(perfilDesdeDeclaracion('Trabajo como electricista con 3 años').profession).toBe('electricista');
    // Lo que sigue a la coma es otra oración: se conserva, coma de por medio.
    expect(perfilDesdeDeclaracion('Soy abogado con 12 años, con foco en penal').profession)
      .toBe('abogado, con foco en penal');
  });

  it('el resumen no le dice experto ni especialista a quien no lo dijo', () => {
    for (const texto of ['Soy abogada con 12 años', 'Fotógrafo', 'Estudiante de psicología']) {
      const p = perfilDesdeDeclaracion(texto);
      expect(p.summary, texto).not.toMatch(/^Profesional en /);
      expect(p.summary, texto).not.toMatch(/Domin|Expert|Especialista|Sénior en/i);
    }
  });
});

describe('MENSAJE_NACIMIENTO — la celebración no miente', () => {
  it('no afirma que domina nada', () => {
    expect(MENSAJE_NACIMIENTO).not.toMatch(/Dominas/i);
  });

  it('dice de dónde vienen los datos reales: el CV', () => {
    expect(MENSAJE_NACIMIENTO).toMatch(/CV/);
  });

  it('cabe en una línea de la barra (96 caracteres)', () => {
    expect(MENSAJE_NACIMIENTO.length).toBeLessThanOrEqual(96);
  });
});
