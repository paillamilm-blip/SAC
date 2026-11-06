// Lector de un markdown SIMPLE, el de los documentos legales (TERMINOS_SERVICIO.md, POLITICA_PRIVACIDAD.md).
// Puro y sin dependencias: devuelve bloques que la pantalla dibuja como elementos de React (nunca HTML crudo).
//
// Entiende: títulos (#, ##, ###), párrafos, listas con «- », tablas con «|», citas con «> », separadores «---»,
// y dentro del texto **negrita** y `código`. Lo que no reconoce se muestra como texto tal cual (no se pierde nada).

export type Tramo = { tipo: 'texto' | 'negrita' | 'codigo'; texto: string };

export type Bloque =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; tramos: Tramo[]; id: string }
  | { tipo: 'parrafo'; tramos: Tramo[] }
  | { tipo: 'lista'; items: Tramo[][] }
  | { tipo: 'tabla'; cabecera: Tramo[][]; filas: Tramo[][][] }
  | { tipo: 'cita'; tramos: Tramo[] }
  | { tipo: 'separador' };

/** Texto con **negrita** y `código`. */
export function tramosDe(texto: string): Tramo[] {
  const tramos: Tramo[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > ultimo) tramos.push({ tipo: 'texto', texto: texto.slice(ultimo, i) });
    tramos.push(m[1] !== undefined ? { tipo: 'negrita', texto: m[1] } : { tipo: 'codigo', texto: m[2] });
    ultimo = i + m[0].length;
  }
  if (ultimo < texto.length) tramos.push({ tipo: 'texto', texto: texto.slice(ultimo) });
  return tramos;
}

/** Id estable para enlazar a una sección («8.3 Eliminación» → «8-3-eliminacion»). */
export function idDe(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const celdas = (linea: string) =>
  linea
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => tramosDe(c.trim()));

export function parsearMarkdown(fuente: string): Bloque[] {
  const lineas = fuente.replace(/\r\n?/g, '\n').split('\n');
  const bloques: Bloque[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];
    const t = linea.trim();

    if (!t) {
      i++;
      continue;
    }

    const titulo = /^(#{1,3})\s+(.+)$/.exec(t);
    if (titulo) {
      const nivel = titulo[1].length as 1 | 2 | 3;
      bloques.push({ tipo: 'titulo', nivel, tramos: tramosDe(titulo[2]), id: idDe(titulo[2].replace(/\*\*/g, '')) });
      i++;
      continue;
    }

    if (/^-{3,}$/.test(t)) {
      bloques.push({ tipo: 'separador' });
      i++;
      continue;
    }

    if (t.startsWith('>')) {
      const partes: string[] = [];
      while (i < lineas.length && lineas[i].trim().startsWith('>')) {
        partes.push(lineas[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      bloques.push({ tipo: 'cita', tramos: tramosDe(partes.join(' ')) });
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      const items: Tramo[][] = [];
      while (i < lineas.length && /^[-*]\s+/.test(lineas[i].trim())) {
        items.push(tramosDe(lineas[i].trim().replace(/^[-*]\s+/, '')));
        i++;
      }
      bloques.push({ tipo: 'lista', items });
      continue;
    }

    // Tabla: cabecera «| a | b |» seguida de un separador «|---|---|».
    if (t.startsWith('|') && i + 1 < lineas.length && /^\|?\s*:?-{2,}/.test(lineas[i + 1].trim())) {
      const cabecera = celdas(t);
      i += 2;
      const filas: Tramo[][][] = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        filas.push(celdas(lineas[i]));
        i++;
      }
      bloques.push({ tipo: 'tabla', cabecera, filas });
      continue;
    }

    // Párrafo: esta línea, más las que siguen hasta una vacía o el inicio de otro bloque. La primera se consume siempre:
    // así una línea que no encaja en nada (p. ej. «| suelta» sin separador de tabla) no deja el lector en un bucle.
    const partes: string[] = [t];
    i++;
    while (i < lineas.length) {
      const s = lineas[i].trim();
      if (!s || /^(#{1,3})\s+/.test(s) || /^-{3,}$/.test(s) || /^[-*]\s+/.test(s) || s.startsWith('>') || s.startsWith('|')) break;
      partes.push(s);
      i++;
    }
    bloques.push({ tipo: 'parrafo', tramos: tramosDe(partes.join(' ')) });
  }
  return bloques;
}
