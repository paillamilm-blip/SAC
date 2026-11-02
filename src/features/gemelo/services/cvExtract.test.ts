// features/gemelo/services/cvExtract.test.ts
// El tope de 15 000 caracteres existía y NO se decía: un CV de 40 000 volvía como
// "leído (15000 caracteres)" y el usuario creía que Ómicrom había visto todo el
// documento. Estos tests fijan las dos cosas que faltaban: que la lectura devuelva
// el total REAL además del texto recortado, y que el piso de texto exista como
// constante compartida (la pestaña y el CTA tienen que exigir lo mismo).
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PISO_CV, TOPE_CV, extractCVText } from './cvExtract';

// jsdom no implementa Blob.text(): sin esto, leer un .txt fallaría por el entorno
// y no por el producto. FileReader sí existe en jsdom, así que el shim lee el
// contenido de verdad en lugar de devolver un texto inventado.
if (typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function texto(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(lector.error);
      lector.readAsText(this);
    });
  };
}

const archivo = (contenido: string, nombre = 'cv.txt') => new File([contenido], nombre, { type: 'text/plain' });

describe('la lectura de un CV dice cuánto había, no sólo cuánto usó', () => {
  it('texto corto: entra entero y el total coincide con lo leído', async () => {
    const cv = 'Analista de datos. SQL, Python, dos años en un equipo de reporting.';
    const lectura = await extractCVText(archivo(cv));
    expect(lectura.texto).toBe(cv);
    expect(lectura.totales).toBe(cv.length);
  });

  it('texto largo: devuelve el recorte PERO informa el total verdadero', async () => {
    // 3 × el tope: lo que un CV de una hoja con detalle realmente pesa.
    const cv = 'x'.repeat(TOPE_CV * 3);
    const lectura = await extractCVText(archivo(cv));
    expect(lectura.texto.length).toBe(TOPE_CV);
    expect(lectura.totales).toBe(cv.length);
    expect(lectura.totales).toBeGreaterThan(lectura.texto.length);
  });

  it('un archivo sin texto legible llega vacío y con total 0 (el huésped decide el mensaje)', async () => {
    const lectura = await extractCVText(archivo(''));
    expect(lectura.texto).toBe('');
    expect(lectura.totales).toBe(0);
  });

  it('corto pero legible: devuelve SUS caracteres, no un cero que miente', async () => {
    // Con el umbral absoluto de 30 en la lectura, un .txt de 9 volvía como texto
    // vacío y la pantalla decía "solo 0 caracteres" de un archivo que sí tenía.
    const lectura = await extractCVText(archivo('solo esto'));
    expect(lectura.texto).toBe('solo esto');
    expect(lectura.totales).toBe(9);
    expect(lectura.texto.length).toBeLessThan(PISO_CV);
  });

  it('binario de verdad se descarta por basura, no por corto', async () => {
    const basura = String.fromCharCode(0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x01, 0x02, 0x03, 0x04);
    const lectura = await extractCVText(new File([basura], 'cv.dat', { type: 'application/octet-stream' }));
    expect(lectura.texto).toBe('');
    expect(lectura.totales).toBe(0);
  });
});

describe('el piso y el tope son UNA sola regla para toda la app', () => {
  it('el piso está por debajo del tope y ambos son números redondos del brief', () => {
    expect(PISO_CV).toBeGreaterThan(0);
    expect(PISO_CV).toBeLessThan(TOPE_CV);
    expect(TOPE_CV).toBe(15000);
  });
});
