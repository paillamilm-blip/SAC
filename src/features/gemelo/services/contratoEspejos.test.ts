// features/gemelo/services/contratoEspejos.test.ts
// M4: los espejos del validador no pueden depender de la disciplina de quien
// edita. Este test lee los TRES archivos desde el disco (canonico, espejo de
// navegador y bloque INLINE del entry Deno) y afirma que son el mismo codigo:
// si alguien cambia uno sin los otros, la tanda rompe aqui, no en produccion.
// Y prueba la maquina de estados contra el SQL que manda en runtime (10012),
// no solo contra si misma.
//
// Se lee con `?raw` (import crudo de Vite) porque `supabase/` esta fuera del
// tsconfig de la app y no tiene tipos de Deno: aca no se ejecuta ese codigo, se
// compara texto.
import { describe, it, expect } from 'vitest';
import canonicoRaw from '../../../../supabase/functions/_shared/brechas.ts?raw';
import espejoRaw from './brechasValidar.ts?raw';
import entryRaw from '../../../../supabase/functions/analizar-cv/index.ts?raw';
import migracionRaw from '../../../../supabase/migrations/10012_aprendizaje_continuo.sql?raw';
import { TRANSICIONES_VALIDAS } from './brechas';

// El canonico empieza en esta linea; el espejo del navegador y el bloque inline
// traen encabezados propios ANTES de la copia, y se comparan desde ahi. Es la
// linea completa (no el mero "// _shared/brechas.ts") porque ese texto tambien
// aparece citado dentro de los comentarios que explican el inline.
const HEADER = '// _shared/brechas.ts — validación defensiva del output de IA.';

const desdeElHeader = (src: string, donde: string): string => {
  const i = src.indexOf(HEADER);
  expect(i, `${donde}: no esta el header del canonico (${HEADER}) — se reescribio el encabezado`).toBeGreaterThanOrEqual(0);
  return src.slice(i).trimEnd();
};

const sinExport = (src: string): string => src.replace(/^export /gm, '');

// Los `?raw` no llegan con el mismo salto de linea: en este checkout el entry de
// Deno conserva CRLF y los modulos TS vienen con LF (core.autocrlf del clon). La
// terminacion de linea no es codigo — el contrato es sobre el TEXTO, asi que se
// compara sin retornos de carro.
const sinCR = (src: string): string => src.replace(/\r/g, '');

describe('las tres copias del validador (M4)', () => {
  // 4 y no 3: el guard de ejes (`ejesUsables`) se mudo del entry de Deno al
  // canonico para que su tabla de verdad corra en vitest. Es el MISMO guard, no
  // una laxitud del contrato — si esta cuenta sube sola, alguien exporto algo
  // nuevo del validador sin re-inlinear.
  it('el canonico declara exactamente 4 `export`', () => {
    expect(canonicoRaw.match(/^export /gm)).toHaveLength(4);
  });

  it('el espejo del navegador es el canonico texto por texto', () => {
    expect(sinCR(desdeElHeader(espejoRaw, 'brechasValidar.ts'))).toBe(sinCR(canonicoRaw).trimEnd());
  });

  it('el bloque INLINE de analizar-cv es el canonico menos las 4 `export`', () => {
    const inicio = entryRaw.indexOf('// INLINE INICIO');
    const fin = entryRaw.indexOf('// INLINE FIN');
    expect(inicio, 'falta el marcador INLINE INICIO').toBeGreaterThanOrEqual(0);
    expect(fin, 'falta el marcador INLINE FIN (el rango copiado tiene que estar delimitado en los dos extremos)').toBeGreaterThan(inicio);
    const bloque = sinCR(desdeElHeader(entryRaw.slice(inicio, fin), 'INLINE de analizar-cv'));
    const esperado = sinCR(sinExport(canonicoRaw)).trimEnd();
    expect(bloque).toBe(esperado);
    // misma cantidad de lineas: si alguien agrega una linea al canonico y re-inlinea
    // a medias, el texto puede seguir coincidiendo por accidente; el conteo no.
    expect(bloque.split('\n'), 'el INLINE no tiene las mismas lineas que el canonico').toHaveLength(esperado.split('\n').length);
    // EL guard de ejes tiene que viajar DENTRO del rango comparado. Si queda abajo
    // de INLINE FIN (o alguien deja una segunda copia local en el entry), el texto
    // ya no es espejo del canonico: la copia que corre en Deno y la que prueban
    // los tests de brechasValidar.test.ts serian funciones distintas.
    const definiciones = [...entryRaw.matchAll(/^function ejesUsables/gm)].map((m) => m.index);
    expect(definiciones, 'ejesUsables tiene una definicion en el entry').toHaveLength(1);
    expect(fin, 'la definicion de ejesUsables esta abajo de INLINE FIN: no es espejo del canonico').toBeGreaterThan(definiciones[0]);
  });

  it('el entry de Deno no exporta nada (nunca se importa)', () => {
    expect(/^export /m.test(entryRaw), 'hay un `export` de verdad en el entry file').toBe(false);
  });

  it('el limite de tamano por campo vive en las tres copias', () => {
    const limites = (src: string) => /titulo: 120, evidencia: 400, porQueImporta: 400,\s*que: 300, como: 400, comoLoDemuestro: 300/.test(src);
    expect(limites(canonicoRaw)).toBe(true);
    expect(limites(espejoRaw)).toBe(true);
    expect(limites(entryRaw)).toBe(true);
  });
});

describe('el gate de ejes (copia INLINE) y el presupuesto de IA viven en el entry de Deno', () => {
  // El entry file importa `jsr:` y usa `Deno.serve`: vitest no puede importarlo,
  // asi que la conducta se afirma sobre el TEXTO del archivo, en el ORDEN del
  // archivo — que es lo que hace a un guard ser guard. Si alguien mueve el
  // guardado por encima del guard, o le quita el .catch() a la carrera, ruge aca.
  // Desde 10-C la DEFINICION de ejesUsables viene en el rango INLINE (arriba); aca
  // se afirma que el handler la LLAMA en el lugar correcto.
  const i = (s: string): number => {
    const n = entryRaw.indexOf(s);
    expect(n, `no existe \`${s}\` en el entry: se borro el mecanismo que afirma este test`).toBeGreaterThanOrEqual(0);
    return n;
  };

  it('el analisis incompleto no se guarda y no se devuelve ok', () => {
    const guard = i('if (!ejesUsables(parsed))');
    expect(guard, 'el guard de ejes tiene que estar antes del guardado').toBeLessThan(i("'guardar_analisis_completo'"));
    expect(guard).toBeLessThan(i('return json({ ok: true'));
    // 502 (falla del motor), no 200: el cliente no puede pintarlo como exito.
    expect(entryRaw.slice(guard, guard + 600)).toContain('502');
  });

  it('el request tiene presupuesto propio y distingue saturado de sin respuesta', () => {
    const carrera = i('await Promise.race([');
    expect(carrera).toBeLessThan(i("'guardar_analisis_completo'"));
    expect(entryRaw).toContain('PRESUPUESTO_IA_MS');
    // El .catch() es lo que evita que el rechazo de callLLM caiga en el catch
    // general (500 con `detail`): sin el, la carrera no sirve de nada.
    expect(entryRaw.slice(carrera, carrera + 800)).toContain('.catch(');
    expect(entryRaw).toContain('}, 504)');
  });

  it('nadie comparte el baldio de los anonimos: clientIp devuelve null y el bucket de invitados exige ip', () => {
    expect(entryRaw).toContain('function clientIp(req: Request): string | null');
    expect(/'unknown'/.test(entryRaw), 'volvio un identificador fijo para el origen desconocido').toBe(false);
    // El bucket diario de invitados se arma con la ip ya resuelta (el 503 de
    // arriba corta al invitado sin ip antes de llegar aca).
    expect(entryRaw).toContain('p_identifier: `${ip}:${new Date().toISOString().slice(0, 10)}`');
    expect(entryRaw).toContain('503');
  });

  it('el entry declara una sola huella legible (el curl de deploy la verifica contra el archivo)', () => {
    // El literal de la huella NO se fija aca: fijarlo obligaba a tocar este archivo
    // en cada ronda de fix y una ronda (10-D) no pudo bumpear la huella por eso. La
    // forma si se garantiza: un unico BUILD y un slug no vacio.
    const huellas = entryRaw.match(/^const BUILD = '[^']+'/gm) ?? [];
    expect(huellas).toHaveLength(1);
    expect(huellas[0]).toMatch(/^const BUILD = '[0-9a-z]+(-[0-9a-z]+)+'$/);
  });
});

describe('la maquina de estados del TS es la del SQL de 10012 (M4)', () => {
  // Ramas del guard de marcar_brecha: `r.state = 'X' and p_state in (...)` o
  // `r.state = 'X' and p_state = 'Y'`. Sin parser: cadenas fijas; si el SQL
  // cambio de forma, la extraccion sale vacia y el test ruge.
  const RAMA = /r\.state = '([a-z]+)' and p_state (?:in \(([^)]*)\)|= '([a-z]+)')/g;

  const ramasDelSql = (): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const m of migracionRaw.matchAll(RAMA)) {
      const destinos = m[2]
        ? m[2].split(',').map((s) => s.trim().replace(/'/g, ''))
        : [m[3]];
      out[m[1]] = [...(out[m[1]] ?? []), ...destinos];
    }
    return out;
  };

  it('el guard de marcar_brecha sigue teniendo sus ramas', () => {
    expect(Object.keys(ramasDelSql()).length, 'el guard de marcar_brecha cambio de forma: hay que revisar este test y el SQL juntos').toBe(3);
  });

  it('toda transicion que el TS permite es una rama del SQL, y ninguna rama del SQL queda fuera del TS', () => {
    const esperadas: Record<string, string[]> = Object.fromEntries(
      Object.entries(TRANSICIONES_VALIDAS).filter(([, destinos]) => destinos.length > 0),
    );
    expect(ramasDelSql()).toEqual(esperadas);
  });

  it('dominada es terminal en los dos lados', () => {
    expect(TRANSICIONES_VALIDAS.dominada).toEqual([]);
    expect(migracionRaw.includes('if r.state = \'dominada\' then'), 'el SQL perdio la rama de dominada terminal').toBe(true);
    expect(migracionRaw.includes('Ya marcaste esto como dominado')).toBe(true);
  });

  it('el indice unico de identidad de skill y su upsert estan en el SQL (spec §4)', () => {
    expect(migracionRaw.includes('create unique index if not exists brechas_unica_skill')).toBe(true);
    expect(migracionRaw.includes('on conflict (user_id, titulo_normalizado) do update')).toBe(true);
    // El estado del usuario jamas lo pisa un run nuevo.
    expect(migracionRaw.includes('state = excluded.state')).toBe(false);
    expect(migracionRaw.includes('confirmed_at = excluded.confirmed_at')).toBe(false);
    expect(migracionRaw.includes('mastered_at = excluded.mastered_at')).toBe(false);
  });
});
