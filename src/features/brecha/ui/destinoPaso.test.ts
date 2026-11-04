import { describe, expect, it } from 'vitest';
import { MUESTRA } from '../services/muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, registrarPrueba } from '../services/repositorio';
import { destinoPaso } from './destinoPaso';

const T0 = '2026-11-03T10:00:00.000Z';
const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'demostracion', simulado: true };
function nuevo() {
  let n = 0;
  const r = agregarAnalisis(dbVacia(), MUESTRA, META, T0, () => `id${++n}`);
  return { db: r.db, a: r.analisis };
}
const masImpacto = (a: ReturnType<typeof nuevo>['a']) => [...a.brechas].sort((x, y) => 'alta media baja'.indexOf(x.severidad) - 'alta media baja'.indexOf(y.severidad))[0];

describe('destinoPaso: cada paso de «Tu ciclo» lleva a algún lado', () => {
  it('escanear abre el escáner', () => {
    expect(destinoPaso('escanear', nuevo().a)).toEqual({ tipo: 'accion', accion: { tipo: 'escanear' } });
  });

  it('mapa abre la pestaña Mapa de ese análisis', () => {
    const { a } = nuevo();
    expect(destinoPaso('mapa', a)).toEqual({ tipo: 'accion', accion: { tipo: 'abrir_reporte', analisisId: a.id, pestana: 'mapa', brechaId: undefined } });
  });

  it('revisar abre la primera brecha sin revisar, la de mayor impacto', () => {
    const { a } = nuevo();
    const d = destinoPaso('revisar', a);
    expect(d).toMatchObject({ accion: { pestana: 'brechas', brechaId: masImpacto(a).id } });
  });

  it('demostrar abre una brecha reconocida que aún no tiene prueba', () => {
    const { db, a } = nuevo();
    const b = a.brechas[0];
    const a2 = marcarBrecha(db, a.id, b.id, 'confirmada', T0).analisis[0];
    expect(destinoPaso('demostrar', a2)).toMatchObject({ accion: { pestana: 'brechas', brechaId: b.id } });
  });

  it('demostrar sin nada reconocido igual lleva a las brechas (no hay botón muerto)', () => {
    const { a } = nuevo();
    expect(destinoPaso('demostrar', a)).toMatchObject({ tipo: 'accion', accion: { tipo: 'abrir_reporte', pestana: 'brechas' } });
  });

  it('demostrar salta las brechas que ya tienen prueba', () => {
    const { db, a } = nuevo();
    const [b1, b2] = a.brechas;
    let d = marcarBrecha(db, a.id, b1.id, 'confirmada', T0);
    d = marcarBrecha(d, a.id, b2.id, 'confirmada', T0);
    d = registrarPrueba(d, a.id, b1.id, { actaId: 'x', puntaje: 80, en: T0 });
    const actual = d.analisis[0];
    const id = (destinoPaso('demostrar', actual) as { accion: { brechaId?: string } }).accion.brechaId;
    expect(id).not.toBe(b1.id);
  });

  it('compartir abre el pasaporte, con o sin pruebas (nunca es un botón muerto)', () => {
    expect(destinoPaso('compartir', nuevo().a)).toEqual({ tipo: 'accion', accion: { tipo: 'abrir_pasaporte' } });
  });
});
