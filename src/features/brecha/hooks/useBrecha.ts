import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analisis, PruebaExamen, ResultadoAnalisis, Veredicto } from '../domain/types';
import {
  CLAVE_INVITADO,
  agregarAnalisis,
  cargar,
  claveDe,
  fusionarDb,
  guardar,
  marcarBrecha,
  mismaBase,
  registrarPrueba,
  pendientesDelInvitado,
  traerDelInvitado,
  type Almacen,
  type Db,
  type MetaAnalisis,
} from '../services/repositorio';
import { guardarNube, leerNube, type EstadoNube } from '../services/nube';

/** Espera tras el último cambio antes de subirlo a la cuenta: varios clics seguidos son un solo envío. */
export const ESPERA_ENVIO_MS = 1000;

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
  /** Estado de la copia en la cuenta (solo con sesión iniciada). */
  estadoNube: EstadoNube;
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
  const [estadoNube, setEstadoNube] = useState<EstadoNube>('no_aplica');
  const dbRef = useRef(db);
  const claveRef = useRef(clave);
  const usuarioRef = useRef(usuarioId);
  // Sincronización con la cuenta. `generacion` cambia con cada persona: una respuesta tardía de otra sesión se descarta.
  const generacion = useRef(0);
  const nubeLeida = useRef(false);
  const enVuelo = useRef(false);
  const hayMasCambios = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /** Deja `siguiente` como la base actual: memoria, navegador y pantalla. */
  const adoptar = useCallback((siguiente: Db) => {
    dbRef.current = siguiente;
    const a = almacenLocal();
    setPersistente(a ? guardar(a, claveRef.current, siguiente) : false);
    setDb(siguiente);
  }, []);

  /**
   * Lleva la base a la cuenta. La PRIMERA vez lee la cuenta y la fusiona con lo de este dispositivo (nunca se pierde
   * un análisis); solo después de leerla con éxito se escribe. Si no pudo leerla, no escribe: pisaría lo hecho desde
   * otro dispositivo. Un solo envío a la vez; si llegan cambios mientras tanto, se repite al terminar.
   */
  const sincronizar = useCallback(async () => {
    const uid = usuarioRef.current;
    if (!uid) return;
    if (enVuelo.current) {
      hayMasCambios.current = true;
      return;
    }
    const miGeneracion = generacion.current;
    const vigente = () => generacion.current === miGeneracion;
    enVuelo.current = true;
    setEstadoNube('sincronizando');
    try {
      do {
        hayMasCambios.current = false;
        if (!nubeLeida.current) {
          const lectura = await leerNube(uid);
          if (!vigente()) return;
          if (!lectura.ok) {
            setEstadoNube(lectura.estado);
            return;
          }
          nubeLeida.current = true;
          const local = dbRef.current;
          const fusion = lectura.datos ? fusionarDb(local, lectura.datos) : local;
          if (!mismaBase(fusion, local)) adoptar(fusion);
          // Nada que subir si la cuenta ya tiene exactamente esto, o si no hay nada que guardar todavía.
          const yaEsta = lectura.datos ? mismaBase(fusion, lectura.datos) : fusion.analisis.length === 0;
          if (yaEsta) {
            setEstadoNube('guardado');
            continue;
          }
        }
        const escritura = await guardarNube(uid, dbRef.current);
        if (!vigente()) return;
        if (!escritura.ok) {
          setEstadoNube(escritura.estado);
          return;
        }
        setEstadoNube('guardado');
      } while (hayMasCambios.current);
    } finally {
      if (vigente()) enVuelo.current = false;
    }
  }, [adoptar]);

  /** Programa un envío tras un cambio (solo con sesión iniciada). */
  const programarEnvio = useCallback(() => {
    if (!usuarioRef.current) return;
    setEstadoNube('sincronizando');
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      void sincronizar();
    }, ESPERA_ENVIO_MS);
  }, [sincronizar]);

  // Persona nueva (o ninguna): se reinicia la sincronización y, si hay sesión, se lee la cuenta.
  useEffect(() => {
    generacion.current += 1;
    usuarioRef.current = usuarioId;
    nubeLeida.current = false;
    enVuelo.current = false;
    hayMasCambios.current = false;
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    if (!usuarioId) {
      setEstadoNube('no_aplica');
      return;
    }
    void sincronizar();
  }, [usuarioId, sincronizar]);

  // Al salir o esconder la pestaña no se espera al temporizador: se envía lo pendiente ya.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden' && temporizador.current) {
        clearTimeout(temporizador.current);
        temporizador.current = null;
        void sincronizar();
      }
    };
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [sincronizar]);

  const aplicar = useCallback(
    (fn: (d: Db) => Db) => {
      const previo = dbRef.current;
      const resultado = fn(previo);
      if (resultado === previo) return;
      adoptar({ ...resultado, actualizadoEn: new Date().toISOString() });
      programarEnvio();
    },
    [adoptar, programarEnvio],
  );

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
      aplicar(() => siguiente);
      return true;
    },
    [aplicar],
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

  return { db, persistente, estadoNube, agregar, marcar, probar, invitadoPendiente, traerInvitado, descartarInvitado };
}
