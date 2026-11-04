// Pruebas de la pieza que impide que la IA invente evidencia (docs/plan-de-accion.md, fase 1.2).
// Regla: toda brecha o fortaleza necesita una cita «…» presente de verdad en el CV,
// o declararse «Ausente en el CV:». Si estas pruebas fallan, una cita inventada
// puede llegar a la pantalla (PRODUCT.md, principio 4).

import { describe, it, expect } from 'vitest';
import { AnalisisInvalido, citaVerificada, citasDe, MIN_BRECHAS, validarResultado } from './validar';

const TEXTO_CV =
  'Juan Perez — Tecnico en Mantencion Industrial. ' +
  'Experiencia: mantencion preventiva y correctiva de maquinaria industrial, Empresa ABC (2020-2024). ' +
  'Habilidades: soldadura al arco, interpretacion de planos.';

function brecha(evidencia: string, titulo = 'Brecha') {
  return {
    categoria: 'dura',
    titulo,
    evidencia,
    porQueImporta: 'Importa para el rubro.',
    severidad: 'media',
    aprender: { que: 'Un curso', como: 'En línea', comoLoDemuestro: 'Con un certificado' },
  };
}

function analisis(brechas: unknown, fortalezas: unknown = []) {
  return {
    ocupacion: 'Tecnico en Mantencion Industrial',
    nivel: 'Semi-senior',
    resumen: 'Perfil operativo.',
    fortalezas,
    brechas,
  };
}

const TRES_RESPALDADAS = [
  brecha('Ausente en el CV: certificaciones vigentes de seguridad'),
  brecha('El CV menciona «soldadura al arco» pero nada de automatización'),
  brecha('Solo aparece «mantencion preventiva», sin métricas de resultado'),
];

describe('citasDe', () => {
  it('extrae las citas entre « » normalizadas', () => {
    expect(citasDe('Dice «Soldadura   al Arco» en el CV')).toEqual(['soldadura al arco']);
  });

  it('parte por puntos suspensivos y conserva cada fragmento largo', () => {
    expect(citasDe('«mantencion preventiva…soldadura al arco»')).toEqual(['mantencion preventiva', 'soldadura al arco']);
    expect(citasDe('«mantencion preventiva...interpretacion de planos»')).toEqual([
      'mantencion preventiva',
      'interpretacion de planos',
    ]);
  });

  it('descarta fragmentos demasiado cortos para comprobar', () => {
    expect(citasDe('«abc…soldadura al arco»')).toEqual(['soldadura al arco']);
  });

  it('devuelve vacío si no hay citas', () => {
    expect(citasDe('El modelo recuerda soldadura al arco')).toEqual([]);
  });
});

describe('citaVerificada', () => {
  it('aprueba cuando todas las citas están en el CV', () => {
    expect(citaVerificada('Menciona «soldadura al arco» y también «interpretacion de planos»', TEXTO_CV)).toBe(true);
  });

  it('ignora mayúsculas y espacios de más', () => {
    expect(citaVerificada('Menciona «  SOLDADURA AL   ARCO »', TEXTO_CV)).toBe(true);
  });

  it('rechaza si alguna cita no está en el CV', () => {
    expect(citaVerificada('Menciona «soldadura al arco» y «operacion de gruas»', TEXTO_CV)).toBe(false);
  });

  it('rechaza si no hay ninguna cita', () => {
    expect(citaVerificada('El CV muestra soldadura al arco', TEXTO_CV)).toBe(false);
  });

  it('los acentos importan: la cita debe coincidir letra por letra', () => {
    expect(citaVerificada('Menciona «mantencion hidraulica»', 'mantencion hidráulica de prensas')).toBe(false);
  });
});

describe('validarResultado', () => {
  it('acepta un análisis con brechas respaldadas por el CV', () => {
    const r = validarResultado(analisis(TRES_RESPALDADAS), TEXTO_CV);
    expect(r.brechas).toHaveLength(MIN_BRECHAS);
    expect(r.ocupacion).toBe('Tecnico en Mantencion Industrial');
  });

  it('la evidencia «Ausente en el CV:» pasa sin necesidad de cita, sin importar mayúsculas', () => {
    const r = validarResultado(analisis([brecha('AUSENTE EN EL CV: certificaciones'), ...TRES_RESPALDADAS.slice(1)]), TEXTO_CV);
    expect(r.brechas).toHaveLength(3);
  });

  it('descarta la brecha con cita inventada y conserva las respaldadas', () => {
    const r = validarResultado(
      analisis([
        brecha('Ausente en el CV: certificaciones'),
        brecha('El CV dice «operacion de gruas horquilla»'),
        brecha('Menciona «soldadura al arco»'),
        brecha('Solo aparece «mantencion preventiva»'),
      ]),
      TEXTO_CV,
    );
    expect(r.brechas).toHaveLength(3);
    expect(r.brechas.some((b) => b.evidencia.includes('gruas horquilla'))).toBe(false);
  });

  it('si quedan menos del mínimo de brechas respaldadas, lanza AnalisisInvalido', () => {
    expect(() =>
      validarResultado(analisis([brecha('Ausente en el CV: una sola'), brecha('Dice «cita inventada aqui»')]), TEXTO_CV),
    ).toThrow(AnalisisInvalido);
  });

  it('nunca deja pasar más de 10 brechas', () => {
    const muchas = Array.from({ length: 14 }, (_, i) => brecha(`Ausente en el CV: item ${i}`, `Brecha ${i}`));
    const r = validarResultado(analisis(muchas), TEXTO_CV);
    expect(r.brechas).toHaveLength(10);
  });

  it('rechaza una respuesta que no es un objeto', () => {
    expect(() => validarResultado('texto suelto', TEXTO_CV)).toThrow(AnalisisInvalido);
    expect(() => validarResultado(null, TEXTO_CV)).toThrow(AnalisisInvalido);
    expect(() => validarResultado(undefined, TEXTO_CV)).toThrow(AnalisisInvalido);
  });

  it('rechaza un análisis sin la cabecera completa', () => {
    expect(() => validarResultado({ brechas: TRES_RESPALDADAS }, TEXTO_CV)).toThrow(AnalisisInvalido);
  });

  it('rechaza un análisis cuya lista de brechas no llega', () => {
    expect(() => validarResultado(analisis('no es una lista'), TEXTO_CV)).toThrow(AnalisisInvalido);
  });

  it('recorta en vez de rechazar los textos que vienen demasiado largos', () => {
    const r = validarResultado(analisis([brecha('Ausente en el CV: ok', 'x'.repeat(500)), ...TRES_RESPALDADAS.slice(1)]), TEXTO_CV);
    expect(r.brechas[0].titulo).toHaveLength(140);
  });

  it('las fortalezas solo pasan con cita verificada', () => {
    const r = validarResultado(
      analisis(TRES_RESPALDADAS, [
        'Experto en «soldadura al arco»',
        'Liderazgo de equipos',
        'Maneja «gruas horquilla»',
        'Conoce «interpretacion de planos»',
      ]),
      TEXTO_CV,
    );
    expect(r.fortalezas).toEqual(['Experto en «soldadura al arco»', 'Conoce «interpretacion de planos»']);
  });

  it('nunca deja pasar más de 5 fortalezas', () => {
    const seis = Array.from({ length: 6 }, () => 'Menciona «soldadura al arco»');
    const r = validarResultado(analisis(TRES_RESPALDADAS, seis), TEXTO_CV);
    expect(r.fortalezas).toHaveLength(5);
  });

  it('la fortaleza se recorta a 300 caracteres antes de comprobar: una cita más allá se pierde', () => {
    const larga = `${'y'.repeat(400)} con «soldadura al arco»`;
    const r = validarResultado(analisis(TRES_RESPALDADAS, [larga]), TEXTO_CV);
    expect(r.fortalezas).toHaveLength(0);
  });
  describe('calidad', () => {
    it('cuenta lo propuesto, lo aceptado y cuántas brechas citan el CV o declaran su ausencia', () => {
      const r = validarResultado(
        analisis(
          [
            brecha('Ausente en el CV: certificaciones'),
            brecha('Menciona «soldadura al arco» sin más'),
            brecha('Solo aparece «mantencion preventiva»'),
            brecha('El CV dice «operacion de gruas horquilla»'), // cita inventada: se descarta
          ],
          ['Experto en «soldadura al arco»', 'Liderazgo de equipos'],
        ),
        TEXTO_CV,
      );
      expect(r.calidad).toEqual({
        brechasPropuestas: 4,
        brechasAceptadas: 3,
        conCita: 2,
        ausentes: 1,
        fortalezasPropuestas: 2,
        fortalezasAceptadas: 1,
        intentos: 1,
      });
    });

    it('conCita + ausentes siempre suma las aceptadas', () => {
      const { calidad } = validarResultado(analisis(TRES_RESPALDADAS), TEXTO_CV);
      expect((calidad?.conCita ?? -1) + (calidad?.ausentes ?? -1)).toBe(calidad?.brechasAceptadas);
    });
  });
});
