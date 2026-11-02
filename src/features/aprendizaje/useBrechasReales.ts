// features/aprendizaje/useBrechasReales.ts
// El camino de LECTURA del mapa propio. Hasta acá, el mapa se pintaba con la
// muestra del donante o con el puente del invitado: las filas que `analizar-cv`
// guarda en `brechas_aprendizaje` no las consultaba nadie.
//
// La RLS (`brechas_sueno`, 10012) ya recorta las filas al dueño de la sesión, así
// que el cliente no filtra por usuario: pide y recibe lo suyo. `conSesion` es
// explícito porque un usuario real con cero brechas es un VACÍO, no un permiso
// para mostrar la muestra (spec §8).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import type { CategoriaMapa, SeveridadMapa } from '@/features/mapa/mapaLayout';
import type { EstadoBrecha } from '@/features/gemelo/services/brechas';
import type { BrechaDeTrabajo } from './abrirBrechas';

export const CLAVE_BRECHAS = ['brechas-aprendizaje'] as const;

// La misma referencia cuando todavía no hay nada leído (ver el comentario del
// retorno del hook).
const NINGUNA: BrechaDeTrabajo[] = [];

// La lista de columnas va literal en el `select` (abajo): así el parser de tipos
// de supabase-js la chequea y no devuelve filas de error.

interface FilaBrecha {
  id: string;
  categoria: string;
  titulo: string;
  evidencia: string;
  por_que_importa: string;
  severidad: string;
  aprender_que: string;
  aprender_como: string;
  aprender_demuestro: string;
  state: string;
  confirmed_at: string | null;
  mastered_at: string | null;
  created_at: string;
  analisis: { ocupacion: string | null } | { ocupacion: string | null }[] | null;
}

// La tabla CHECKea estos valores, así que el cast es devolución de un contrato,
// no una validación defensiva.
export function aBrechaDeTrabajo(f: FilaBrecha): BrechaDeTrabajo {
  return {
    id: f.id,
    categoria: f.categoria as CategoriaMapa,
    titulo: f.titulo,
    evidencia: f.evidencia,
    porQueImporta: f.por_que_importa,
    severidad: f.severidad as SeveridadMapa,
    aprender: { que: f.aprender_que, como: f.aprender_como, comoLoDemuestro: f.aprender_demuestro },
    estado: f.state as EstadoBrecha,
    veredictoEn: f.confirmed_at,
    dominadaEn: f.mastered_at,
  };
}

/** PostgREST devuelve el to-one como objeto o como array según la relación. */
function ocupacionDe(filas: FilaBrecha[]): string | null {
  const masReciente = [...filas].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const padre = masReciente?.analisis;
  const unica = Array.isArray(padre) ? padre[0] : padre;
  return unica?.ocupacion ?? null;
}

interface Resultado {
  conSesion: boolean;
  brechas: BrechaDeTrabajo[];
  ocupacion: string | null;
}

export function useBrechasReales() {
  const cliente = useQueryClient();

  const consulta = useQuery<Resultado>({
    queryKey: CLAVE_BRECHAS,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Sin sesión no se toca la tabla: el invitado vive de su puente y la
      // pestaña lo necesita saber para no anunciar "no hay brechas".
      if (!session) return { conSesion: false, brechas: [], ocupacion: null };

      // La última columna es un embed: sube la ocupación del análisis que originó
      // cada brecha, que es la raíz que el mapa muestra en la cabecera.
      const { data, error } = await supabase
        .from('brechas_aprendizaje')
        .select(
          'id, categoria, titulo, evidencia, por_que_importa, severidad, aprender_que, aprender_como, aprender_demuestro, state, confirmed_at, mastered_at, created_at, analisis:analisis_cv(ocupacion)',
        );
      if (error) throw new Error(error.message);

      const filas = (data ?? []) as FilaBrecha[];
      return {
        conSesion: true,
        brechas: filas.map(aBrechaDeTrabajo),
        ocupacion: ocupacionDe(filas),
      };
    },
  });

  return {
    // null mientras la sesión no está resuelta: la pestaña muestra cargando en
    // vez de adelantar la muestra a un usuario que sí tiene análisis.
    conSesion: consulta.data ? consulta.data.conSesion : null,
    cargando: consulta.isPending,
    error: consulta.error instanceof Error ? consulta.error.message : consulta.error ? 'No pudimos leer tu mapa.' : null,
    // NINGUNA (no `[]`): la pestaña identifica la fuente por su referencia para
    // saber si llegó una lectura nueva. Una lista nueva en cada render borraría
    // el borrador optimista del usuario antes de tiempo.
    brechas: consulta.data?.brechas ?? NINGUNA,
    ocupacion: consulta.data?.ocupacion ?? null,
    /** Después de una escritura (RPC `marcar_brecha`) se vuelve a leer la fila. */
    recargar: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE_BRECHAS });
    },
  };
}
