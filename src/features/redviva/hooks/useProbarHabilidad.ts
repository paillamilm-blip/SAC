// features/redviva/hooks/useProbarHabilidad.ts
// "Probarla ahora": de un nombre de habilidad a un examen que corre de verdad.
//
// Encapsula los 3 pasos y, sobre todo, los 3 modos de falla, para que ningún
// componente tenga que acordarse de ellos:
//   1. Validar el nombre (respuesta instantánea, sin ir a la red).
//   2. Conseguir el uuid REAL del nodo, creándolo si no existe (migración 10002).
//   3. Pedir que se abra el examen y navegar al lugar donde vive el simulador.
//
// DEGRADACIÓN ELEGANTE: si la migración 10002 no está aplicada, el RPC no existe.
// En ese caso se usa el nodo del catálogo si la habilidad está ahí (el camino
// viejo, que sí funcionaba), y si tampoco está, se dice la verdad en vez de
// mandar al usuario a una pared de 404.

import { useCallback, useState } from 'react';
import { asegurarNodoDeExamen, pedirExamen } from '../services/examenSkill';

export interface ProbarHabilidadState {
  /** Lanza el examen de una habilidad por su nombre. */
  probar: (titulo: string, nodeIdDelCatalogo?: string | null) => Promise<void>;
  /** true mientras se prepara (la creación del nodo es un viaje a la base). */
  preparando: boolean;
  /** Mensaje listo para mostrar. null = sin problemas. */
  error: string | null;
}

export function useProbarHabilidad(alAbrir?: () => void): ProbarHabilidadState {
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const probar = useCallback(
    async (titulo: string, nodeIdDelCatalogo?: string | null) => {
      if (preparando) return;
      setPreparando(true);
      setError(null);

      try {
        const r = await asegurarNodoDeExamen(titulo);

        if (r.ok) {
          pedirExamen(r.nodeId, r.titulo);
          alAbrir?.();
          return;
        }

        // El RPC no está: se intenta con el catálogo, que es el camino viejo.
        if (r.rpcAusente && nodeIdDelCatalogo) {
          pedirExamen(nodeIdDelCatalogo, titulo);
          alAbrir?.();
          return;
        }

        setError(
          r.rpcAusente
            ? `Todavía no podemos abrir un examen de ${titulo} en esta cuenta.`
            : r.error,
        );
      } catch (e) {
        console.error('[Omicron] Falló al preparar el examen:', e);
        setError('No pudimos preparar el examen. Prueba de nuevo en un momento.');
      } finally {
        setPreparando(false);
      }
    },
    [preparando, alAbrir],
  );

  return { probar, preparando, error };
}
