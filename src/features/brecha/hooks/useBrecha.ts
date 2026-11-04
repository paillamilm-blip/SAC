import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analisis, PruebaExamen, ResultadoAnalisis, Veredicto } from '../domain/types';
import {
  CLAVE_INVITADO,
  agregarAnalisis,
  cargar,
  claveDe,
  guardar,
  marcarBrecha,
  registrarPrueba,
  pendientesDelInvitado,
  traerDelInvitado,
  type Almacen,
  type Db,
  type MetaAnalisis,
} from '../services/repositorio';

function almacenLocal(): Almacen | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // acceso denegado (modo privado estricto)
  }
}

export interface UsoBrecha {
  db: Db;
  /** false si el navegador no dejó guardar: los datos viven solo mientras esta pestaña esté abierta. */
  persistente: boolean;
  agregar(resultado: ResultadoAnalisis, meta: MetaAnalisis): Analisis;
  marcar(analisisId: string, brechaId: string, veredicto: Veredicto): void;
  /** Guarda el examen aprobado de una brecha. false si la brecha ya no estaba reconocida como real o ya estaba dominada. */
  probar(analisisId: string, brechaId: string, prueba: PruebaExamen): boolean;
  /** Cuántos análisis hechos como invitado esperan que la persona decida qué hacer con ellos. */
  invitadoPendiente: number;
  traerInvitado(): void;
  descartarInvitado(): void;
}

/**
 * Estado de los análisis de UNA persona (o del invitado). Cuando el invitado inicia sesión, sus
 * análisis NO se mueven solos: `invitadoPendiente` avisa y la persona elige traerlos o descartarlos.
 */
export function useBrecha(usuarioId: string | null): UsoBrecha {
  const clave = claveDe(usuarioId ?? CLAVE_INVITADO);
  const almacen = almacenLocal();
  const [db, setDb] = useState<Db>(() => (almacen ? cargar(almacen, clave) : { version: 1, analisis: [] }));
  const [persistente, setPersistente] = useState(true);
  const [invitadoPendiente, setInvitadoPendiente] = useState(0);
  const dbRef = useRef(db);
  const claveRef = useRef(clave);

  // Cambio de persona (inicio/cierre de sesión): recargar y, si corresponde, traer lo del invitado.
  useEffect(() => {
    const a = almacenLocal();
    if (!a) return;
    claveRef.current = clave;
    const actual = cargar(a, clave);
    setInvitadoPendiente(usuarioId ? pendientesDelInvitado(actual, cargar(a, claveDe(CLAVE_INVITADO))).length : 0);
    dbRef.current = actual;
    setDb(actual);
  }, [clave, usuarioId]);

  const aplicar = useCallback((fn: (d: Db) => Db) => {
    const previo = dbRef.current;
    const siguiente = fn(previo);
    if (siguiente === previo) return;
    dbRef.current = siguiente;
    const a = almacenLocal();
    setPersistente(a ? guardar(a, claveRef.current, siguiente) : false);
    setDb(siguiente);
  }, []);

  const agregar = useCallback(
    (resultado: ResultadoAnalisis, meta: MetaAnalisis): Analisis => {
      const r = agregarAnalisis(dbRef.current, resultado, meta, new Date().toISOString());
      aplicar(() => r.db);
      return r.analisis;
    },
    [aplicar],
  );

  const marcar = useCallback(
    (analisisId: string, brechaId: string, veredicto: Veredicto) =>
      aplicar((d) => marcarBrecha(d, analisisId, brechaId, veredicto, new Date().toISOString())),
    [aplicar],
  );

  const probar = useCallback(
    (analisisId: string, brechaId: string, prueba: PruebaExamen): boolean => {
      const previo = dbRef.current;
      const siguiente = registrarPrueba(previo, analisisId, brechaId, prueba);
      if (siguiente === previo) return false; // la brecha ya no estaba reconocida como real, o ya estaba dominada
      dbRef.current = siguiente;
      const a = almacenLocal();
      setPersistente(a ? guardar(a, claveRef.current, siguiente) : false);
      setDb(siguiente);
      return true;
    },
    [],
  );

  const traerInvitado = useCallback(() => {
    const a = almacenLocal();
    if (!a) return;
    const invitado = cargar(a, claveDe(CLAVE_INVITADO));
    aplicar((d) => traerDelInvitado(d, invitado));
    a.removeItem(claveDe(CLAVE_INVITADO));
    setInvitadoPendiente(0);
  }, [aplicar]);

  const descartarInvitado = useCallback(() => {
    almacenLocal()?.removeItem(claveDe(CLAVE_INVITADO));
    setInvitadoPendiente(0);
  }, []);

  return { db, persistente, agregar, marcar, probar, invitadoPendiente, traerInvitado, descartarInvitado };
}
