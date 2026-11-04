// Lectura segura de una credencial ya verificada por el servidor. La firma garantiza que nadie la alteró, pero
// igual se valida su forma: la pantalla nunca debe romperse ni mostrar basura por un campo inesperado.

export interface HabilidadProbada {
  habilidad: string;
  /** Mejor puntaje de 0 a 100; null = probada sin puntaje registrado. */
  puntaje: number | null;
  /** AAAA-MM-DD, o vacío si no se registró. */
  fecha: string;
}

/** Credencial actual: solo lo que la persona demostró con un examen. */
export interface CredencialV2 {
  version: 2;
  usuario: string;
  nombre: string;
  habilidades: HabilidadProbada[];
  emitidaEn: number;
  venceEn: number;
}

/** Credencial anterior (producto viejo): reputación y ejes. Se sigue pudiendo verificar. */
export interface CredencialV1 {
  version: 1;
  usuario: string;
  nombre: string;
  tipoNodo: string;
  nivel: string;
  reputacion: number;
  ejes: number[];
  competencias: number;
  pe: number;
  emitidaEn: number;
}

export type Credencial = CredencialV1 | CredencialV2;

const MAX_HABILIDADES = 50;
const MAX_TEXTO = 120;

const esTexto = (x: unknown): x is string => typeof x === 'string';
const esNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const recortar = (s: string, max = MAX_TEXTO) => s.trim().slice(0, max);

export function leerCredencial(crudo: unknown): Credencial | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const o = crudo as Record<string, unknown>;
  if (!esTexto(o.u) || !esTexto(o.n) || !esNumero(o.iat)) return null;
  const usuario = recortar(o.u);
  const nombre = recortar(o.n);
  if (!usuario || !nombre) return null;

  if (o.v === 2) {
    if (!esNumero(o.exp) || !Array.isArray(o.h) || o.h.length === 0) return null;
    const habilidades: HabilidadProbada[] = [];
    for (const x of o.h.slice(0, MAX_HABILIDADES)) {
      if (!x || typeof x !== 'object') return null;
      const h = x as Record<string, unknown>;
      if (!esTexto(h.h) || !recortar(h.h)) return null;
      const puntaje = h.p === null || h.p === undefined ? null : esNumero(h.p) && h.p >= 0 && h.p <= 100 ? Math.round(h.p) : undefined;
      if (puntaje === undefined) return null;
      const fecha = esTexto(h.f) && /^\d{4}-\d{2}-\d{2}$/.test(h.f) ? h.f : '';
      habilidades.push({ habilidad: recortar(h.h, 80), puntaje, fecha });
    }
    return { version: 2, usuario, nombre, habilidades, emitidaEn: o.iat, venceEn: o.exp };
  }

  if (o.v === 1) {
    if (!esTexto(o.nt) || !(esTexto(o.nl) || esNumero(o.nl))) return null;
    if (!esNumero(o.rep) || !esNumero(o.cv) || !esNumero(o.pe)) return null;
    if (!Array.isArray(o.ej) || o.ej.length !== 4 || !o.ej.every(esNumero)) return null;
    return {
      version: 1,
      usuario,
      nombre,
      tipoNodo: recortar(o.nt),
      nivel: String(o.nl),
      reputacion: o.rep,
      ejes: o.ej as number[],
      competencias: o.cv,
      pe: o.pe,
      emitidaEn: o.iat,
    };
  }

  return null;
}
