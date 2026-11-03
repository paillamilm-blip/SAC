// Repositorio de análisis. Funciones PURAS sobre un objeto `Db` (fáciles de probar)
// más una capa mínima de lectura/escritura en un `Almacen` (localStorage en la app).
//
// Persistencia v0: en el dispositivo, una clave por persona. La persistencia en
// Supabase (tablas brecha_*) es la TAREA-31 y no se activa hasta que se aplique
// la migración; este módulo es la costura donde se enchufará.

import { compararAnalisis } from '../domain/comparar';
import type {
  Analisis,
  Brecha,
  ComparacionAnalisis,
  ResultadoAnalisis,
  Veredicto,
} from '../domain/types';

export interface Db {
  version: 1;
  analisis: Analisis[];
}

export const CLAVE_PREFIJO = 'omicron:brecha:db:v1:';
export const CLAVE_INVITADO = 'invitado';

export function dbVacia(): Db {
  return { version: 1, analisis: [] };
}

export function claveDe(usuario: string): string {
  return `${CLAVE_PREFIJO}${usuario}`;
}

/** Subconjunto de Storage que necesitamos (permite probar sin navegador). */
export interface Almacen {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export type GeneradorId = () => string;

export const idPorDefecto: GeneradorId = () => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export interface MetaAnalisis {
  nombreArchivo: string | null;
  tamanio: number | null;
  proveedor: string;
  simulado: boolean;
}

export function agregarAnalisis(
  db: Db,
  resultado: ResultadoAnalisis,
  meta: MetaAnalisis,
  ahora: string,
  nuevoId: GeneradorId = idPorDefecto,
): { db: Db; analisis: Analisis } {
  const analisis: Analisis = {
    id: nuevoId(),
    creadoEn: ahora,
    proveedor: meta.proveedor,
    simulado: meta.simulado,
    nombreArchivo: meta.nombreArchivo,
    tamanio: meta.tamanio,
    ocupacion: resultado.ocupacion,
    nivel: resultado.nivel,
    resumen: resultado.resumen,
    fortalezas: [...resultado.fortalezas],
    brechas: resultado.brechas.map((b) => ({
      ...b,
      aprender: { ...b.aprender },
      id: nuevoId(),
      veredicto: null,
      veredictoEn: null,
      dominadaEn: null,
    })),
  };
  return { db: { ...db, analisis: [...db.analisis, analisis] }, analisis };
}

function actualizarBrecha(
  db: Db,
  analisisId: string,
  brechaId: string,
  cambio: (b: Brecha) => Brecha | null,
): Db {
  let tocado = false;
  const analisis = db.analisis.map((a) => {
    if (a.id !== analisisId) return a;
    return {
      ...a,
      brechas: a.brechas.map((b) => {
        if (b.id !== brechaId) return b;
        const nueva = cambio(b);
        if (!nueva) return b;
        tocado = true;
        return nueva;
      }),
    };
  });
  return tocado ? { ...db, analisis } : db;
}

/** Marca "Es real" / "No aplica" o la quita (null). Quitar "Es real" también quita "dominada". */
export function marcarBrecha(
  db: Db,
  analisisId: string,
  brechaId: string,
  veredicto: Veredicto,
  ahora: string,
): Db {
  return actualizarBrecha(db, analisisId, brechaId, (b) => ({
    ...b,
    veredicto,
    veredictoEn: veredicto ? ahora : null,
    dominadaEn: veredicto === 'confirmada' ? b.dominadaEn : null,
  }));
}

/**
 * Autodeclara una brecha como dominada. Solo se puede dominar lo que antes se
 * reconoció como real (misma regla que brecha). Cuando exista el examen
 * (TAREA-37) esto pasará a exigir una prueba registrada.
 */
export function marcarDominada(db: Db, analisisId: string, brechaId: string, ahora: string): Db {
  return actualizarBrecha(db, analisisId, brechaId, (b) =>
    b.veredicto === 'confirmada' && !b.dominadaEn ? { ...b, dominadaEn: ahora } : null,
  );
}

export function listarAnalisis(db: Db): Analisis[] {
  return [...db.analisis].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export function obtenerAnalisis(db: Db, id: string): Analisis | null {
  return db.analisis.find((a) => a.id === id) ?? null;
}

export function ultimoAnalisis(db: Db): Analisis | null {
  return listarAnalisis(db)[0] ?? null;
}

/**
 * Compara contra el análisis anterior DE LA MISMA OCUPACIÓN: comparar perfiles
 * distintos produciría "brechas cerradas" que en realidad son un cambio de objetivo.
 */
export function compararConAnterior(db: Db, analisis: Analisis): ComparacionAnalisis | null {
  const previo = listarAnalisis(db).find(
    (a) => a.id !== analisis.id && a.ocupacion === analisis.ocupacion && a.creadoEn < analisis.creadoEn,
  );
  if (!previo) return null;
  return compararAnalisis(
    { id: previo.id, creadoEn: previo.creadoEn, brechas: previo.brechas },
    analisis.brechas,
    analisis.creadoEn,
  );
}

export interface Metricas {
  totalAnalisis: number;
  brechas: number;
  revisadas: number;
  confirmadas: number;
  rechazadas: number;
  dominadas: number;
  /** % de brechas revisadas que la persona reconoció como reales; null si no revisó ninguna. */
  precision: number | null;
}

export function metricas(db: Db): Metricas {
  const brechas = db.analisis.flatMap((a) => a.brechas);
  const confirmadas = brechas.filter((b) => b.veredicto === 'confirmada').length;
  const rechazadas = brechas.filter((b) => b.veredicto === 'rechazada').length;
  const revisadas = confirmadas + rechazadas;
  return {
    totalAnalisis: db.analisis.length,
    brechas: brechas.length,
    revisadas,
    confirmadas,
    rechazadas,
    dominadas: brechas.filter((b) => b.dominadaEn).length,
    precision: revisadas ? Math.round((confirmadas / revisadas) * 100) : null,
  };
}

/**
 * Análisis hechos como invitado que la cuenta todavía no tiene. No se mueven solos: la persona decide
 * si traerlos (ver `traerDelInvitado`) o descartarlos. Nunca se pisa ni se repite un análisis de la cuenta.
 */
export function pendientesDelInvitado(cuenta: Db, invitado: Db): Analisis[] {
  const ids = new Set(cuenta.analisis.map((a) => a.id));
  return invitado.analisis.filter((a) => !ids.has(a.id));
}

/** La cuenta con los análisis pendientes del invitado sumados. Si no hay nada que traer, devuelve la misma base. */
export function traerDelInvitado(cuenta: Db, invitado: Db): Db {
  const nuevos = pendientesDelInvitado(cuenta, invitado);
  return nuevos.length === 0 ? cuenta : { ...cuenta, analisis: [...cuenta.analisis, ...nuevos] };
}

// ── Lectura / escritura ────────────────────────────────────────────────

function esDb(x: unknown): x is Db {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as { version?: unknown; analisis?: unknown };
  if (o.version !== 1) return false;
  if (!Array.isArray(o.analisis)) return false;
  // Validar cada análisis
  for (const a of o.analisis) {
    if (!esAnalisis(a)) return false;
  }
  return true;
}

function esAnalisis(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const a = x as Partial<Analisis>;
  if (typeof a.id !== 'string' || typeof a.creadoEn !== 'string') return false;
  if (typeof a.ocupacion !== 'string' || typeof a.nivel !== 'string' || typeof a.resumen !== 'string') return false;
  if (!Array.isArray(a.fortalezas) || !Array.isArray(a.brechas)) return false;
  // Validar cada brecha
  for (const b of a.brechas) {
    if (!esBrecha(b)) return false;
  }
  return true;
}

function esBrecha(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const b = x as Partial<Brecha>;
  if (typeof b.id !== 'string') return false;
  if (typeof b.categoria !== 'string' || b.categoria !== 'dura' && b.categoria !== 'blanda' && b.categoria !== 'conocimiento' && b.categoria !== 'credencial') return false;
  if (typeof b.titulo !== 'string' || typeof b.evidencia !== 'string' || typeof b.porQueImporta !== 'string') return false;
  if (typeof b.severidad !== 'string' || b.severidad !== 'alta' && b.severidad !== 'media' && b.severidad !== 'baja') return false;
  if (!b.aprender || typeof b.aprender.que !== 'string' || typeof b.aprender.como !== 'string' || typeof b.aprender.comoLoDemuestro !== 'string') return false;
  // El veredicto puede ser null, 'confirmada' o 'rechazada'
  if (b.veredicto !== null && b.veredicto !== 'confirmada' && b.veredicto !== 'rechazada') return false;
  if (b.veredictoEn !== null && typeof b.veredictoEn !== 'string') return false;
  if (b.dominadaEn !== null && typeof b.dominadaEn !== 'string') return false;
  return true;
}

/** Lee la base; si no existe o está corrupta devuelve una vacía (nunca lanza). */
export function cargar(almacen: Almacen, clave: string): Db {
  try {
    const crudo = almacen.getItem(clave);
    if (!crudo) return dbVacia();
    const parsed: unknown = JSON.parse(crudo);
    return esDb(parsed) ? parsed : dbVacia();
  } catch {
    return dbVacia();
  }
}

/** Devuelve false si no pudo guardar (cuota llena, modo privado...). */
export function guardar(almacen: Almacen, clave: string, db: Db): boolean {
  try {
    almacen.setItem(clave, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}
