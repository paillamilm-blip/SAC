// Colores por categoría de brecha. Una sola fuente: mapa, pasaporte e imagen descargable usan los mismos,
// así un sello ganado se reconoce como el nodo que era en el mapa.
import type { CategoriaBrecha } from './types';

export const COLOR_CAT: Record<CategoriaBrecha, string> = {
  dura: '#6aa9ff',
  blanda: '#f2b134',
  conocimiento: '#3ddc97',
  credencial: '#c084fc',
};
