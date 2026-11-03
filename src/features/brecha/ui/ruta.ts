// Enrutado mínimo del producto único, montado bajo /u. Usa la History API directamente:
// son dos pantallas y no justifica sumar una librería de rutas al resto de la app.

import { useCallback, useEffect, useState } from 'react';
import type { Pestana } from '../components/PanelReporte';

export const BASE = '/u';

export type Ruta =
  | { nombre: 'inicio' }
  | { nombre: 'reporte'; analisisId: string; pestana: Pestana; brechaId: string | null };

const PESTANAS: readonly Pestana[] = ['mapa', 'brechas', 'diagnostico'];

/** ¿Esta URL pertenece al producto único? */
export function esRutaUnificada(pathname: string): boolean {
  return pathname === BASE || pathname.startsWith(`${BASE}/`);
}

export function parsearRuta(pathname: string, search: string): Ruta {
  const partes = pathname.replace(/\/+$/, '').split('/').filter(Boolean); // ['u', 'reporte', id]
  if (partes[0] === 'u' && partes[1] === 'reporte' && partes[2]) {
    const q = new URLSearchParams(search);
    const tab = q.get('tab');
    return {
      nombre: 'reporte',
      analisisId: decodeURIComponent(partes[2]),
      pestana: PESTANAS.find((p) => p === tab) ?? 'mapa',
      brechaId: q.get('brecha'),
    };
  }
  return { nombre: 'inicio' };
}

export function hrefReporte(analisisId: string, pestana?: Pestana, brechaId?: string): string {
  const q = new URLSearchParams();
  if (pestana && pestana !== 'mapa') q.set('tab', pestana);
  if (brechaId) q.set('brecha', brechaId);
  const s = q.toString();
  return `${BASE}/reporte/${encodeURIComponent(analisisId)}${s ? `?${s}` : ''}`;
}

export function useRuta(): { ruta: Ruta; ir: (href: string) => void } {
  const [ruta, setRuta] = useState<Ruta>(() => parsearRuta(window.location.pathname, window.location.search));

  useEffect(() => {
    const alCambiar = () => setRuta(parsearRuta(window.location.pathname, window.location.search));
    window.addEventListener('popstate', alCambiar);
    return () => window.removeEventListener('popstate', alCambiar);
  }, []);

  const ir = useCallback((href: string) => {
    window.history.pushState(null, '', href);
    const url = new URL(href, window.location.origin);
    setRuta(parsearRuta(url.pathname, url.search));
    window.scrollTo?.(0, 0);
  }, []);

  return { ruta, ir };
}
