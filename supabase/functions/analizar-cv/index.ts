// supabase/functions/analizar-cv/index.ts
// Motor ADN Digital — Analiza CV con OpenRouter (gratis).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { callLLM, hasKey } from '../_shared/llm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

import { corsHeaders } from '../_shared/cors.ts';
const CORS = corsHeaders();
const BUILD = '7a-brechas-v1';
const json = (body: unknown, status = 200) => {
  // La huella va en el header (para el curl de verificacion) y en el cuerpo
  // (para que el cliente distinga funcion vieja de funcion nueva).
  const payload = body && typeof body === 'object' && !Array.isArray(body)
    ? { build: BUILD, ...(body as Record<string, unknown>) }
    : body;
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'x-omicron-build': BUILD },
  });
};

// INLINE de _shared/brechas.ts (huella 7a) — las Edge Functions congelan _shared al crearse; editar el canónico y re-inlinear.
// Copia literal (incluidos los `export`) del archivo canónico: si cambia
// _shared/brechas.ts, volver a pegar aqui entero y cambiar la huella.
// _shared/brechas.ts — validación defensiva del output de IA.
// Port literal del validador de la app CV (lib/ai/validar.ts) sin zod:
// sin dependencias, corre igual en Deno (Edge Function) y en vitest
// (espejo en src/). Si cambia este archivo, cambia el espejo en el mismo commit.

type Categoria = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
type Severidad = 'alta' | 'media' | 'baja';
const CATEGORIAS: readonly string[] = ['dura', 'blanda', 'conocimiento', 'credencial'];
const SEVERIDADES: readonly string[] = ['alta', 'media', 'baja'];
const MAX_BRECHAS = 12;

export interface BrechaValidada {
  categoria: Categoria; titulo: string; evidencia: string; porQueImporta: string;
  severidad: Severidad; aprender: { que: string; como: string; comoLoDemuestro: string };
}

const str = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');

export function normalizarBrecha(x: unknown): BrechaValidada | null {
  if (!x || typeof x !== 'object') return null;
  const b = x as Record<string, unknown>;
  const categoria = str(b.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) return null;
  const titulo = str(b.titulo);
  if (!titulo) return null;
  const ap = (b.aprender && typeof b.aprender === 'object') ? b.aprender as Record<string, unknown> : {};
  const severidadRaw = str(b.severidad).toLowerCase();
  return {
    categoria: categoria as Categoria,
    titulo,
    evidencia: str(b.evidencia),
    porQueImporta: str(b.porQueImporta),
    severidad: SEVERIDADES.includes(severidadRaw) ? severidadRaw as Severidad : 'media',
    aprender: { que: str(ap.que), como: str(ap.como), comoLoDemuestro: str(ap.comoLoDemuestro) },
  };
}

export function normalizarBrechas(x: unknown): BrechaValidada[] {
  if (!Array.isArray(x)) return [];
  const out: BrechaValidada[] = [];
  for (const item of x) {
    const n = normalizarBrecha(item);
    if (n) out.push(n);
    if (out.length >= MAX_BRECHAS) break;
  }
  return out;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown';
}

async function rateLimited(req: Request): Promise<Response | null> {
  if (!_admin) return null;
  try {
    const { data, error } = await _admin.rpc('check_rate_limit', {
      p_bucket: 'analizar-cv',
      p_identifier: clientIp(req),
      p_limit: 6,
      p_window_sec: 60,
    });
    if (error || !data) return null;
    const r = data as { allowed?: boolean; reset_at?: string };
    if (r.allowed === false) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Demasiados intentos. Espera unos segundos.', retry_at: r.reset_at ?? null }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '30' } },
      );
    }
    return null;
  } catch { return null; }
}

const SYS = 'Eres el Motor de ADN Digital de Omicron. Tu mision: CLONAR fielmente un CV real y MEDIR al profesional con el sistema de reputacion de Omicron.\n\nCONTEXTO DEL SISTEMA OMICRON:\nOmicron mide a cada persona con 4 EJES de 0-100 basados en EVIDENCIA REAL:\n- EJECUCION (exec): Capacidad de ENTREGAR. Proyectos completados, anios activos, roles de produccion, resultados medibles.\n- CALIDAD (qual): RIGOR profesional. Certificaciones, estandares cumplidos, metodologias, buenas practicas, nivel de responsabilidad.\n- TRASCENDENCIA (trans): IMPACTO mas alla de uno mismo. Liderazgo de equipos, mentoria, docencia, publicaciones, cargos de responsabilidad sobre personas.\n- FUNDAMENTO (fund): BASE teorica y formal. Titulos universitarios, diplomados, certificaciones tecnicas, especializaciones.\n\nFormula: reputacion = 20% credenciales formales + 80% promedio(4 ejes). Un titulo ayuda (20%) pero el 80% se gana DEMOSTRANDO.\n\nTU TRABAJO:\n1. CLONAR el CV: extraer TODA la informacion tal como es. NO omitir nada. NO inventar nada.\n2. POSICIONAR como especialista: seniorLabel = POSICIONAMIENTO REAL basado en EXPERIENCIA DOMINANTE.\n3. MEDIR con los 4 ejes de Omicron basandote en EVIDENCIA CONCRETA del CV.\n\nREGLAS:\n- NO inventes NADA que no este en el texto.\n- NO subestimes: si tiene 15 anios, refleja 15 anios.\n- Los skills deben ser los que REALMENTE domina segun su trayectoria.\n- Los porcentajes (pct) DEBEN diferenciarse: area principal 80-96%, secundarias 50-75%, menores 30-50%.\n- Los anios son la SUMA TOTAL de experiencia laboral.\n- Funciona para CUALQUIER industria.\n\nDevuelve SOLO un JSON valido con esta estructura exacta (sin texto antes ni despues). Ademas del perfil, detecta HASTA 12 brechas reales entre lo que el CV muestra y lo que el puesto objetivo exige; cada brecha debe tener un camino accionable. Estructura:\n{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":"","brechas":[{"categoria":"dura|blanda|conocimiento|credencial","titulo":"","evidencia":"","porQueImporta":"","severidad":"alta|media|baja","aprender":{"que":"","como":"","comoLoDemuestro":""}}]}\nReglas de brechas: si no hay ninguna real, []. Prohibido inventar brechas de skills que el CV si declara. "evidencia" cita el CV; "porQueImporta" habla del puesto, no del mercado en general.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ ok: false, error: 'Falta OPENROUTER_KEY en secrets.' }, 500);

    const limited = await rateLimited(req);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'El CV es muy corto o no se pudo leer.' }, 400);

    const raw = await callLLM([
      { role: 'system', content: SYS },
      { role: 'user', content: 'CV COMPLETO:\n\n' + cv },
    ], true, 2000);

    if (!raw) {
      return json({ ok: false, error: 'La IA no genero respuesta.' }, 502);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      // Try extracting JSON from text
      const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) {
        try { parsed = JSON.parse(raw.slice(a, b + 1)); } catch {
          return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502);
        }
      } else {
        return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502);
      }
    }

    const brechas = normalizarBrechas((parsed as { brechas?: unknown }).brechas);
    (parsed as { brechas?: unknown }).brechas = brechas;

    let guardado: { analisis_id: string; brechas: string[] } | null = null;
    if (_admin) {
      const auth = req.headers.get('authorization') ?? '';
      const { data: userData } = auth
        ? await _admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
        : { data: { user: null } };
      if (userData?.user?.id) {
        const p = parsed as Record<string, unknown>;
        // OJO (reporte T6, rulings pendientes): _admin habla con la service key, y
        // dentro de PostgREST auth.uid() es NULL con ese JWT. Como la RPC es
        // `security invoker` y su guard es auth.uid(), este call puede devolver
        // BRECHA_REQUIERE_SESION y guardado seguiria null (el cliente hace fallback).
        // Arreglo propuesto si el controlador lo manda: client de usuario con
        // ANON_KEY + { global: { headers: { Authorization: auth } } } (house style
        // de carta-ia / verificar-pago / crear-checkout).
        const { data, error } = await _admin.rpc('guardar_analisis_completo', {
          p_cv: {
            nombre_archivo: (body?.nombre_archivo ?? 'cv').toString().slice(0, 200),
            ocupacion: p.seniorLabel ?? null,
            nivel: p.arch ?? null,
            resumen: p.summary ?? null,
            proveedor: 'openrouter',
            simulado: false,
          },
          p_brechas: brechas,
        });
        if (!error && data) {
          guardado = data as { analisis_id: string; brechas: string[] };
          // La brecha ya existe; se marca como detectada de nacimiento. El
          // guard lo devuelve con ids reales para que el cliente suscriba.
        } else if (error) {
          console.error('[analizar-cv] guardado fallo:', error.message);
        }
      }
    }

    console.log(`[analizar-cv] OK, nombre: ${(parsed as {name?:string})?.name ?? '?'}`);
    return json({ ok: true, analysis: parsed, model: 'openrouter', guardado, build: '7a-brechas-v1' });
  } catch (e) {
    console.error('[analizar-cv] Error fatal:', String(e));
    return json({ ok: false, error: 'Error inesperado.', detail: String(e) }, 500);
  }
});
