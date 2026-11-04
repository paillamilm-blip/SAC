import { describe, expect, it } from 'vitest';
import { ALTO, ANCHO, dibujarPasaporte, MAX_SELLOS_EN_IMAGEN, partir, type DatosPng } from './pasaportePng';

// jsdom no trae canvas: un contexto falso que anota los textos dibujados basta para comprobar QUÉ se imprime.
function contextoFalso() {
  const textos: string[] = [];
  const base = {
    measureText: (t: string) => ({ width: t.length * 10 }),
    fillText: (t: string) => void textos.push(t),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy(base as Record<string, unknown>, {
    get: (o, k: string) => (k in o ? o[k] : () => {}),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, textos };
}

const sello = (i: number) => ({ titulo: `Habilidad ${i}`, categoria: 'dura' as const, puntaje: 70 + i, fecha: '3 nov 2026' });
const DATOS: DatosPng = {
  nombre: 'Ana Pérez',
  ocupacion: 'Técnico en mantención',
  sellos: [sello(1), sello(2)],
  colorUsuario: '#7dd3fc',
  enlace: 'https://sac-omi.vercel.app/?verificar=abc.def',
  emitido: '4 de noviembre de 2026',
};

describe('partir', () => {
  const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) } as Pick<CanvasRenderingContext2D, 'measureText'>;

  it('no parte lo que cabe', () => {
    expect(partir(ctx, 'hola mundo', 200, 2)).toEqual(['hola mundo']);
  });
  it('parte por palabras en las líneas pedidas', () => {
    expect(partir(ctx, 'uno dos tres cuatro', 90, 3)).toEqual(['uno dos', 'tres', 'cuatro']);
  });
  it('si no cabe en las líneas permitidas termina en «…» y respeta el ancho', () => {
    const l = partir(ctx, 'una frase muy larga que no cabe en dos líneas de este ancho', 120, 2);
    expect(l).toHaveLength(2);
    expect(l[1].endsWith('…')).toBe(true);
    expect(l.every((x) => x.length * 10 <= 120)).toBe(true);
  });
});

describe('dibujarPasaporte', () => {
  it('imprime el nombre, la ocupación, cada sello con su puntaje y el enlace', () => {
    const { ctx, textos } = contextoFalso();
    dibujarPasaporte(ctx, DATOS);
    const todo = textos.join(' | ');
    expect(todo).toContain('Ana Pérez');
    expect(todo).toContain('Técnico en mantención');
    expect(todo).toContain('2 habilidades probadas con examen');
    expect(todo).toContain('71');
    expect(todo).toContain('72');
    expect(todo).toContain('Habilidad 1');
    expect(todo).toContain('Compruébalo: https://sac-omi.vercel.app/?verificar=abc.def');
    expect(todo).toContain('Emitido el 4 de noviembre de 2026');
  });

  it('con una sola habilidad habla en singular', () => {
    const { ctx, textos } = contextoFalso();
    dibujarPasaporte(ctx, { ...DATOS, sellos: [sello(1)] });
    expect(textos).toContain('1 habilidad probada con examen');
  });

  it('dibuja como máximo 6 sellos y avisa que el resto está en el enlace', () => {
    const { ctx, textos } = contextoFalso();
    dibujarPasaporte(ctx, { ...DATOS, sellos: Array.from({ length: 9 }, (_, i) => sello(i + 1)) });
    expect(textos.filter((t) => /^Habilidad \d$/.test(t))).toHaveLength(MAX_SELLOS_EN_IMAGEN);
    expect(textos).toContain('y 3 más en el enlace');
    expect(textos).toContain('9 habilidades probadas con examen');
  });

  it('formato vertical 1080×1350', () => {
    expect([ANCHO, ALTO]).toEqual([1080, 1350]);
  });
});
