import { describe, expect, it } from 'vitest';
import { jsonCompleto } from './jsonCompleto';

describe('jsonCompleto', () => {
  it('acepta un objeto JSON completo', () => {
    expect(jsonCompleto('{"a":1,"b":[1,2,{"c":3}]}')).toBe(true);
  });

  it('acepta un arreglo JSON completo', () => {
    expect(jsonCompleto('[{"a":1},{"a":2}]')).toBe(true);
  });

  it('acepta JSON entre cercas de código', () => {
    expect(jsonCompleto('```json\n{"a":1}\n```')).toBe(true);
    expect(jsonCompleto('```\n{"a":1}\n```')).toBe(true);
  });

  it('acepta JSON con texto antes o después', () => {
    expect(jsonCompleto('Aquí está el análisis:\n{"a":1}\nEspero que sirva.')).toBe(true);
  });

  it('RECHAZA el caso real de gemini-3.6-flash: cortado antes de la primera llave de cierre', () => {
    const cortado = '{\n  "ocupacion": "Profesora de enseñanza básica",\n  "nivel": "Semi-senior",\n  "resumen": "Perfil docente.",\n  "fortalezas": [\n    "Planificación de clases «Planificacion de clases de lenguaje, matematica e historia.»",\n    "Involucramiento activo en el clima escolar «Participacion en el comite de convivencia escolar.»",';
    expect(jsonCompleto(cortado)).toBe(false);
  });

  it('RECHAZA un JSON cortado aunque ya tenga llaves de cierre internas', () => {
    expect(jsonCompleto('{"ocupacion":"X","brechas":[{"titulo":"A"},{"titulo":"B"')).toBe(false);
  });

  it('rechaza texto sin JSON y texto vacío', () => {
    expect(jsonCompleto('Lo siento, no puedo ayudar con eso.')).toBe(false);
    expect(jsonCompleto('')).toBe(false);
    expect(jsonCompleto('   ')).toBe(false);
  });
});
