import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Brecha } from '../domain/types';
import MapaCapacidades from './MapaCapacidades';

afterEach(cleanup);

function brecha(id: string, evidencia: string, extra: Partial<Brecha> = {}): Brecha {
  return {
    id,
    categoria: 'dura',
    titulo: `Brecha ${id}`,
    evidencia,
    porQueImporta: `Importa ${id}`,
    severidad: 'media',
    aprender: { que: 'q', como: 'c', comoLoDemuestro: 'd' },
    veredicto: null,
    veredictoEn: null,
    dominadaEn: null,
    prueba: null,
    ...extra,
  };
}

const BRECHAS = [
  brecha('a', 'Ausente en el CV: certificaciones'),
  brecha('b', 'Solo aparece «mantencion preventiva»', { veredicto: 'confirmada', veredictoEn: '2026-11-03T10:00:00.000Z' }),
  brecha('c', 'Ausente en el CV: métricas'),
];

function pintar(calidad?: Parameters<typeof MapaCapacidades>[0]['calidad']) {
  return render(<MapaCapacidades ocupacion="Técnico" brechas={BRECHAS} recienId={null} cerradas={[]} calidad={calidad} />);
}

describe('MapaCapacidades', () => {
  it('cada brecha es un botón; al activarla muestra su evidencia y por qué importa', () => {
    pintar();
    expect(screen.queryByRole('region', { name: /Detalle de/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Brecha b\./ }));
    const detalle = screen.getByRole('region', { name: 'Detalle de Brecha b' });
    expect(detalle.textContent).toContain('Lo que dice tu CV');
    expect(detalle.textContent).toContain('«mantencion preventiva»');
    expect(detalle.textContent).toContain('Importa b');
  });

  it('una brecha ausente dice lo que falta, sin repetir el prefijo', () => {
    pintar();
    fireEvent.keyDown(screen.getByRole('button', { name: /Brecha a\./ }), { key: 'Enter' });
    const detalle = screen.getByRole('region', { name: 'Detalle de Brecha a' });
    expect(detalle.textContent).toContain('Lo que falta en tu CV');
    expect(detalle.textContent).not.toMatch(/ausente en el cv:/i);
  });

  it('el botón Cerrar oculta el detalle', () => {
    pintar();
    fireEvent.click(screen.getByRole('button', { name: /Brecha a\./ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('region', { name: /Detalle de/ })).toBeNull();
  });

  it('la línea de calidad cuenta citas y ausentes desde las brechas, sin la calidad guardada', () => {
    const { container } = pintar();
    expect(container.querySelector('.mapa-calidad')?.textContent).toContain('1 de 3 brechas citan tu CV');
    expect(container.querySelector('.mapa-calidad')?.textContent).toContain('2 señalan lo que falta');
  });

  it('con calidad guardada, dice cuántas propuestas no pasaron la comprobación', () => {
    const { container } = pintar({
      brechasPropuestas: 5,
      brechasAceptadas: 3,
      conCita: 1,
      ausentes: 2,
      fortalezasPropuestas: 2,
      fortalezasAceptadas: 2,
      intentos: 2,
    });
    const texto = container.querySelector('.mapa-calidad')?.textContent ?? '';
    expect(texto).toContain('la IA propuso 5 y 3 superaron la comprobación');
    expect(texto).toContain('2 intentos');
  });

  it('solo las brechas reconocidas llevan impulso de luz', () => {
    const { container } = pintar();
    expect(container.querySelectorAll('.mapa-impulso')).toHaveLength(1);
  });

  it('con asistente conectado, tocar un nodo se lo avisa y no abre el detalle bajo el mapa', () => {
    const onNodo = vi.fn();
    const { container } = render(
      <MapaCapacidades ocupacion="Técnico" brechas={BRECHAS} recienId={null} cerradas={[]} onNodo={onNodo} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Brecha b\./ }));
    expect(onNodo).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('region', { name: /Detalle de/ })).toBeNull();
    expect(container.querySelector('.mapa-ayuda')?.textContent).toContain('asistente');
  });
});
