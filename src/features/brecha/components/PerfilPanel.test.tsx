import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: { auth: { signOut: () => signOut() } } }));
// El selector de color arrastra animaciones y audio: aquí solo importa que el perfil lo cargue.
vi.mock('./SelectorColor', () => ({ default: () => <div data-testid="selector-color" /> }));

import PerfilPanel from './PerfilPanel';

afterEach(() => {
  cleanup();
  signOut.mockClear();
});

const ESTANDAR = { total: 8, conPrueba: 2, reconocidasSinPrueba: 1, sinRevisar: 5, descartadas: 1, faltaPct: 75, esMuestra: false };
const CV = {
  archivo: 'mi-cv.pdf',
  analizadoEn: '2026-11-03T10:00:00.000Z',
  ocupacion: 'Técnico en mantención',
  nivel: 'Semi-senior · 5 a 8 años',
  resumen: 'Perfil operativo sólido.',
  fortalezas: ['Domina «soldadura al arco»'],
  esMuestra: false,
};
const PERFIL = {
  ocupacion: 'Técnico en mantención',
  nivel: 'Semi-senior · 5 a 8 años',
  analizadoEn: '2026-11-03T10:00:00.000Z',
  esMuestra: false,
  total: 8,
  detectadas: 4,
  reconocidas: 1,
  dominadas: 2,
  descartadas: 1,
  conCita: 6,
  ausentes: 2,
  severidad: { alta: 3, media: 3, baja: 1 },
  porCategoria: [
    { categoria: 'dura', etiqueta: 'Habilidad dura', total: 5, detectadas: 2, reconocidas: 1, dominadas: 2, descartadas: 0 },
    { categoria: 'credencial', etiqueta: 'Credencial', total: 3, detectadas: 2, reconocidas: 0, dominadas: 0, descartadas: 1 },
  ],
  cerradas: 1,
};
const METRICAS = { totalAnalisis: 2, brechas: 8, revisadas: 3, confirmadas: 2, rechazadas: 1, dominadas: 1, precision: 67 };

function pintar(extra: Partial<Parameters<typeof PerfilPanel>[0]> = {}) {
  const props = {
    nombre: 'Matías',
    correo: 'matias@example.com',
    esInvitado: false,
    metricas: METRICAS,
    estandar: ESTANDAR as Parameters<typeof PerfilPanel>[0]['estandar'],
    cv: CV as Parameters<typeof PerfilPanel>[0]['cv'],
    perfil: PERFIL as Parameters<typeof PerfilPanel>[0]['perfil'],
    onCerrar: vi.fn(),
    onVerPasaporte: vi.fn(),
    onIniciarSesion: vi.fn(),
    ...extra,
  };
  render(<PerfilPanel {...props} />);
  return props;
}

describe('PerfilPanel', () => {
  it('con cuenta muestra nombre, correo y los conteos reales con su escala', () => {
    pintar();
    const d = screen.getByRole('dialog', { name: 'Matías' });
    expect(d.textContent).toContain('matias@example.com');
    expect(d.textContent).toContain('2 de 8'); // reconocidas
    expect(d.textContent).toContain('1 de 2'); // dominadas con prueba
  });

  it('«Ver mi pasaporte» abre el pasaporte', () => {
    const p = pintar();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mi pasaporte' }));
    expect(p.onVerPasaporte).toHaveBeenCalledTimes(1);
  });

  it('carga el selector de color', async () => {
    pintar();
    expect(await screen.findByTestId('selector-color')).toBeTruthy();
  });

  it('«Cerrar sesión» cierra la sesión y el perfil', async () => {
    const p = pintar();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(p.onCerrar).toHaveBeenCalled());
  });

  it('un invitado ve que sus datos están solo en el dispositivo y puede iniciar sesión', () => {
    const p = pintar({ esInvitado: true, nombre: null, correo: null });
    const d = screen.getByRole('dialog', { name: 'Invitado' });
    expect(d.textContent).toContain('solo en este dispositivo');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(p.onIniciarSesion).toHaveBeenCalled();
  });

  it('Escape y la X cierran el perfil, y el foco empieza en cerrar', () => {
    const p = pintar();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar mi perfil' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(p.onCerrar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi perfil' }));
    expect(p.onCerrar).toHaveBeenCalledTimes(2);
  });

  it('muestra cuánto falta con su escala, desglosado y sin color como único canal', () => {
    pintar();
    const d = screen.getByRole('dialog', { name: 'Matías' });
    expect(d.textContent).toContain('75 %');
    expect(d.textContent).toContain('2 de 8 brechas cubiertas con examen');
    expect(d.textContent).toContain('Con examen aprobado: 2');
    expect(d.textContent).toContain('Reconocidas, sin examen: 1');
    expect(d.textContent).toContain('Por revisar: 5');
    expect(d.textContent).toContain('No es una certificación');
    expect(d.textContent).toContain('1 brecha descartada como «no aplica» no cuenta');
    expect(screen.getByRole('img', { name: /De 8 brechas: 2 con examen aprobado, 1 reconocidas sin examen, 5 por revisar/ })).toBeTruthy();
  });

  it('«Tu CV en Ómicrom» muestra lo que se leyó y aclara que no se guarda el PDF', () => {
    pintar();
    const cv = screen.getByText('Tu CV en Ómicrom').closest('details') as HTMLElement;
    expect(cv.textContent).toContain('mi-cv.pdf');
    expect(cv.textContent).toContain('Técnico en mantención');
    expect(cv.textContent).toContain('Semi-senior · 5 a 8 años');
    expect(cv.textContent).toContain('Perfil operativo sólido.');
    expect(cv.textContent).toContain('Domina «soldadura al arco»');
    expect(cv.textContent).toContain('No guardo el archivo');
  });

  it('una muestra de ejemplo se declara como tal en vez de pasar por tu CV', () => {
    pintar({ estandar: { ...ESTANDAR, esMuestra: true } as Parameters<typeof PerfilPanel>[0]['estandar'] });
    expect(screen.getByRole('dialog', { name: 'Matías' }).textContent).toContain('muestra de ejemplo');
  });

  it('sin análisis explica qué aparecerá, sin inventar un porcentaje', () => {
    pintar({ estandar: null, cv: null });
    const d = screen.getByRole('dialog', { name: 'Matías' });
    expect(d.textContent).toContain('Cuando escanees tu CV');
    expect(d.textContent).not.toContain('%');
    expect(screen.queryByText('Tu CV en Ómicrom')).toBeNull();
  });

  it('si descartaste todas las brechas no muestra un porcentaje', () => {
    pintar({ estandar: { ...ESTANDAR, total: 0, conPrueba: 0, reconocidasSinPrueba: 0, sinRevisar: 0, faltaPct: 0, descartadas: 3 } as Parameters<typeof PerfilPanel>[0]['estandar'] });
    const d = screen.getByRole('dialog', { name: 'Matías' });
    expect(d.textContent).toContain('no queda nada por cubrir');
    expect(d.textContent).not.toContain('0 %');
  });

  it('entrega el análisis de perfil con todas las variables del mapa', () => {
    pintar();
    const d = screen.getByRole('dialog', { name: 'Matías' });
    expect(d.textContent).toContain('Tu mapa mental, en números');
    // por estado
    expect(d.textContent).toContain('Dominadas con examen: 2');
    expect(d.textContent).toContain('Reconocidas, sin examen: 1');
    expect(d.textContent).toContain('Detectadas, por revisar: 4');
    expect(d.textContent).toContain('Descartadas («no aplica»): 1');
    // por categoría
    expect(d.textContent).toContain('Habilidad dura');
    expect(d.textContent).toContain('2/5');
    // por impacto
    expect(d.textContent).toContain('Impacto alto: 3');
    expect(d.textContent).toContain('Impacto bajo: 1');
    // por evidencia
    expect(d.textContent).toContain('Con cita de tu CV: 6');
    expect(d.textContent).toContain('Que señalan lo ausente: 2');
    // cerradas
    expect(d.textContent).toContain('Cerradas desde el análisis anterior: 1');
  });

  it('sin análisis no muestra el análisis de perfil', () => {
    pintar({ estandar: null, cv: null, perfil: null });
    expect(screen.queryByText('Tu mapa mental, en números')).toBeNull();
  });
});
