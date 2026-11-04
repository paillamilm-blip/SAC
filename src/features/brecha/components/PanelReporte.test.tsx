import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MUESTRA } from '../services/muestra';
import { agregarAnalisis, dbVacia, marcarBrecha, registrarPrueba } from '../services/repositorio';
import type { Brecha, PruebaExamen } from '../domain/types';

// El examen real habla con el servidor: aquí solo importa que PanelReporte lo abra, con qué brecha y cuándo.
vi.mock('./Examen', () => ({
  default: ({ tituloBrecha, onAprobado, onCerrar }: { tituloBrecha: string; onAprobado: (p: PruebaExamen) => void; onCerrar: () => void }) => (
    <div role="dialog" aria-label="Examen simulado">
      <span>{tituloBrecha}</span>
      <button type="button" onClick={() => onAprobado({ actaId: 'a1', puntaje: 77, en: '2026-11-03T12:00:00.000Z' })}>
        aprobar
      </button>
      <button type="button" onClick={onCerrar}>
        cerrar
      </button>
    </div>
  ),
}));
vi.mock('./MapaCapacidades', () => ({ default: () => null }));

import PanelReporte from './PanelReporte';

const META = { nombreArchivo: 'cv.pdf', tamanio: 1, proveedor: 'demostracion', simulado: true };
const T = '2026-11-03T10:00:00.000Z';

function brechas(): Brecha[] {
  let n = 0;
  const { db, analisis } = agregarAnalisis(dbVacia(), MUESTRA, META, T, () => `id-${++n}`);
  const real = marcarBrecha(db, analisis.id, analisis.brechas[0].id, 'confirmada', T);
  return real.analisis[0].brechas;
}

function montar(lista: Brecha[], extra: { sesionIniciada?: boolean } = {}) {
  const onProbar = vi.fn();
  const onPedirSesion = vi.fn();
  render(
    <PanelReporte
      ocupacion="Ingeniera"
      nivel="Semi-senior"
      creadoEn={T}
      nombreArchivo="cv.pdf"
      simulado
      proveedor="demostracion"
      resumen="Resumen"
      fortalezas={[]}
      brechas={lista}
      comparacion={null}
      onMarcar={vi.fn()}
      onProbar={onProbar}
      sesionIniciada={extra.sesionIniciada ?? true}
      onPedirSesion={onPedirSesion}
      pestanaInicial="brechas"
      brechaInicialId={lista[0].id}
    />,
  );
  return { onProbar, onPedirSesion };
}

afterEach(cleanup);

describe('PanelReporte: demostrar una brecha', () => {
  it('ya no existe «Ya lo aprendí»: dominar exige el examen', () => {
    montar(brechas());
    expect(screen.queryByRole('button', { name: 'Ya lo aprendí' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Demostrarlo' })).toBeTruthy();
  });

  it('«Demostrarlo» solo aparece en brechas reconocidas como reales', () => {
    const sinRevisar = agregarAnalisis(dbVacia(), MUESTRA, META, T, () => 'x' + Math.random()).analisis.brechas;
    montar(sinRevisar);
    expect(screen.queryByRole('button', { name: 'Demostrarlo' })).toBeNull();
  });

  it('con sesión abre el examen de ESA brecha', () => {
    const lista = brechas();
    montar(lista);
    expect(screen.queryByRole('dialog', { name: 'Examen simulado' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Demostrarlo' }));
    const dialogo = screen.getByRole('dialog', { name: 'Examen simulado' });
    expect(dialogo.textContent).toContain(lista[0].titulo);
  });

  it('sin sesión pide iniciar sesión y NO abre el examen', () => {
    const { onPedirSesion } = montar(brechas(), { sesionIniciada: false });
    fireEvent.click(screen.getByRole('button', { name: 'Demostrarlo' }));
    expect(onPedirSesion).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Examen simulado' })).toBeNull();
  });

  it('al aprobar entrega la prueba de la brecha correcta; cerrar quita la ventana', () => {
    const lista = brechas();
    const { onProbar } = montar(lista);
    fireEvent.click(screen.getByRole('button', { name: 'Demostrarlo' }));
    fireEvent.click(screen.getByRole('button', { name: 'aprobar' }));
    expect(onProbar).toHaveBeenCalledWith(lista[0].id, { actaId: 'a1', puntaje: 77, en: '2026-11-03T12:00:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: 'cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Examen simulado' })).toBeNull();
  });
});

describe('PanelReporte: qué se afirma de cada brecha', () => {
  it('con prueba: «Dominada con prueba» y el puntaje; ya no ofrece demostrarla', () => {
    let n = 0;
    const { db, analisis } = agregarAnalisis(dbVacia(), MUESTRA, META, T, () => `id-${++n}`);
    let d = marcarBrecha(db, analisis.id, analisis.brechas[0].id, 'confirmada', T);
    d = registrarPrueba(d, analisis.id, analisis.brechas[0].id, { actaId: 'a1', puntaje: 91, en: T });
    montar(d.analisis[0].brechas);
    expect(screen.getByText(/Dominada con prueba · 91\/100/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Demostrarlo' })).toBeNull();
  });

  it('marcada a mano antes del examen: se conserva el dato pero se dice «sin prueba» y se puede demostrar', () => {
    const lista = brechas().map((b, i) => (i === 0 ? { ...b, dominadaEn: T, prueba: null } : b));
    montar(lista);
    expect(screen.getByText(/Marcada a mano el .* · sin prueba/)).toBeTruthy();
    expect(screen.queryByText(/Dominada con prueba/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Demostrarlo' })).toBeTruthy();
    // No cuenta como dominada en el resumen ni en la etiqueta de la fila.
    expect(screen.queryByText('Dominada')).toBeNull();
  });
});
