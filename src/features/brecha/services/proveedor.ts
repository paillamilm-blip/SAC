// Elige qué proveedor analiza los CV. Por defecto, el real (IA).
// VITE_BRECHA_ANALISIS=demostracion fuerza la muestra fija: sirve para pruebas y para el
// recorrido visual de CI, donde no hay IA ni un CV de verdad.

import { crearProveedorDemostracion, type ProveedorAnalisis } from './analizar';
import { crearProveedorIA } from './analisisIA';

export function elegirProveedor(modo: string | undefined): ProveedorAnalisis {
  return modo === 'demostracion' ? crearProveedorDemostracion() : crearProveedorIA();
}

export const proveedorActivo: ProveedorAnalisis = elegirProveedor(
  import.meta.env.VITE_BRECHA_ANALISIS as string | undefined,
);
