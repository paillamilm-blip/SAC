// features/aprendizaje/useVistaBrechas.ts
// ═══════════════════════════════════════════════════════════════════════
// La ÚNICA forma de saber qué brechas tiene el usuario ahora mismo.
//
// Prioridad base > puente del invitado > muestra del donante, resuelta por
// resolverVista() en puro. Está acá y no dentro de AprendizajeTab porque el
// home también la necesita: el mapa de capacidades es la pantalla principal,
// y dos lectores de la misma verdad volverían a separar la app en dos.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useSyncExternalStore } from 'react';
import { puenteBrechasInvitado, puenteDesdeHuella } from '@/features/gemelo/services/aprendizaje';
import muestraRaw from '@/features/mapa/__fixtures__/analisis-donante.json?raw';
import type { BrechaDeTrabajo, FuenteBrechas, VistaTrabajo } from './abrirBrechas';
import { resolverVista, type MuestraAnalisis } from './abrirBrechas';
import { useBrechasReales } from './useBrechasReales';

const MUESTRA = JSON.parse(muestraRaw) as MuestraAnalisis;
const NINGUNA: BrechaDeTrabajo[] = [];
const SIN_MAPA: FuenteBrechas = { ocupacion: '', brechas: NINGUNA, simulado: false };

const SUSCRIBIR_PUENTE = (escuchar: () => void) => puenteBrechasInvitado.suscribir(escuchar);

export interface VistaBrechas {
  /** El discriminante que elige la pantalla: cargando · error · vacío · mapa. */
  trabajo: VistaTrabajo;
  ocupacion: string;
  brechas: BrechaDeTrabajo[];
  /** true cuando lo que se pinta es la muestra del donante, no un análisis real. */
  simulado: boolean;
  recargar: () => void;
}

export function useVistaBrechas(): VistaBrechas {
  // El puente se ESCUCHA: se escribe desde el análisis del CV mientras la portada
  // ya está montada, y una lectura al mount dejaba el mapa del donante pintado
  // hasta la próxima recarga. La foto es la cadena cruda (estable); parsear en el
  // snapshot daría un array nuevo en cada render.
  const huella = useSyncExternalStore(SUSCRIBIR_PUENTE, puenteBrechasInvitado.huella, () => null);
  const puente = useMemo(() => puenteDesdeHuella(huella), [huella]);
  // La clave existe = este navegador ya leyó un CV. Con eso el vacío puede decir
  // «lo leí y no vi brechas» en vez de ofrecer el mapa de otra persona.
  const cvLeido = huella !== null;

  const { conSesion, cargando, error, brechas: leidas, ocupacion, recargar } = useBrechasReales();

  // Dependencias: las piezas de la lectura, NO el objeto del hook (es nuevo en
  // cada render y re-armaría la fuente bajo el efecto de quien lo consume).
  const trabajo = useMemo(
    () => resolverVista({ conSesion, cargando, error, brechas: leidas, ocupacion }, puente, MUESTRA, cvLeido),
    [conSesion, cargando, error, leidas, ocupacion, puente, cvLeido],
  );
  const fuente: FuenteBrechas = trabajo.tipo === 'mapa' ? trabajo.fuente : SIN_MAPA;

  return {
    trabajo,
    ocupacion: fuente.ocupacion,
    brechas: fuente.brechas,
    simulado: fuente.simulado,
    recargar,
  };
}
