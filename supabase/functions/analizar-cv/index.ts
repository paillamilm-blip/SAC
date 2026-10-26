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
const BUILD = '9a-cierre-plan-a';
const json = (body: unknown, status = 200, extraHeaders?: Record<string, string>) => {
  // La huella va en el header (para el curl de verificacion) y en el cuerpo
  // (para que el cliente distinga funcion vieja de funcion nueva).
  // El spread del body va PRIMERO y `build` despues (M1): al reves, un cuerpo
  // que trajera su propia clave "build" anulaba la huella — y la huella es
  // justamente lo que se busca despues de un deploy.
  const payload = body && typeof body === 'object' && !Array.isArray(body)
    ? { ...(body as Record<string, unknown>), build: BUILD }
    : body;
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'x-omicron-build': BUILD,
      // M7: sin esto el navegador no puede leer la huella — un header propio no
      // expuesto queda invisible en una respuesta cross-origin. Con Expose, el
      // dueno del producto ve x-omicron-build en la pestaña Network de devtools
      // y comprueba que codigo esta vivo sin abrir curl.
      'Access-Control-Expose-Headers': 'x-omicron-build',
      ...(extraHeaders ?? {}),
    },
  });
};

// INLINE INICIO de _shared/brechas.ts (huella 9a) — las Edge Functions congelan
// _shared al crearse: editar el canonico y re-inlinear aca en el mismo commit
// (pegar el bloque entero, quitar las `export`, no tocar nada mas).
// Copia del canonico menos las 3 palabras `export` (este index.ts es entry file
// de Deno y jamas se importa — Minor #7). El bloque esta delimitado en los dos
// extremos: todo lo que va desde el header "// _shared/brechas.ts" hasta el
// marcador INLINE FIN es byte a byte igual al canonico sin los `export`, y lo
// afirma el test src/features/gemelo/services/contratoEspejos.test.ts (M4) — la
// sincronia no depende de la disciplina de quien edita.
// _shared/brechas.ts — validación defensiva del output de IA.
// Port literal del validador de la app CV (lib/ai/validar.ts) sin zod:
// sin dependencias, corre igual en Deno (Edge Function) y en vitest
// (espejo en src/). Si cambia este archivo, cambia el espejo en el mismo commit.
// Cada campo sale recortado a un máximo sano: un CV malinterpretado no puede
// meter megabytes en las columnas TEXT ni en el localStorage del puente.

type Categoria = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
type Severidad = 'alta' | 'media' | 'baja';
const CATEGORIAS: readonly string[] = ['dura', 'blanda', 'conocimiento', 'credencial'];
const SEVERIDADES: readonly string[] = ['alta', 'media', 'baja'];
const MAX_BRECHAS = 12;
const MAX_CAMPO = {
  titulo: 120, evidencia: 400, porQueImporta: 400,
  que: 300, como: 400, comoLoDemuestro: 300,
} as const;

interface BrechaValidada {
  categoria: Categoria; titulo: string; evidencia: string; porQueImporta: string;
  severidad: Severidad; aprender: { que: string; como: string; comoLoDemuestro: string };
}

const str = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');
const campo = (x: unknown, max: number): string => str(x).slice(0, max);

function normalizarBrecha(x: unknown): BrechaValidada | null {
  if (!x || typeof x !== 'object') return null;
  const b = x as Record<string, unknown>;
  const categoria = str(b.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) return null;
  const titulo = campo(b.titulo, MAX_CAMPO.titulo);
  if (!titulo) return null;
  const ap = (b.aprender && typeof b.aprender === 'object') ? b.aprender as Record<string, unknown> : {};
  const severidadRaw = str(b.severidad).toLowerCase();
  return {
    categoria: categoria as Categoria,
    titulo,
    evidencia: campo(b.evidencia, MAX_CAMPO.evidencia),
    porQueImporta: campo(b.porQueImporta, MAX_CAMPO.porQueImporta),
    severidad: SEVERIDADES.includes(severidadRaw) ? severidadRaw as Severidad : 'media',
    aprender: {
      que: campo(ap.que, MAX_CAMPO.que),
      como: campo(ap.como, MAX_CAMPO.como),
      comoLoDemuestro: campo(ap.comoLoDemuestro, MAX_CAMPO.comoLoDemuestro),
    },
  };
}

function normalizarBrechas(x: unknown): BrechaValidada[] {
  if (!Array.isArray(x)) return [];
  const out: BrechaValidada[] = [];
  for (const item of x) {
    const n = normalizarBrecha(item);
    if (n) out.push(n);
    if (out.length >= MAX_BRECHAS) break;
  }
  return out;
}
// INLINE FIN de _shared/brechas.ts — arriba de esta linea queda la copia del
// canonico (sin `export`); debajo van las funciones propias de esta funcion.

function clientIp(req: Request): string {
  // cf-connecting-ip (Cloudflare, en el borde) primero: es el unico que quien
  // llama no puede forjar con un header propio. Recien despues el primer
  // elemento de x-forwarded-for (falsificable) y x-real-ip.
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Tope diario efectivo (secret ANALISIS_TOPE_DIARIO, solo server-side): si el
// env no es un numero positivo finito, 10 — un NaN jamas debe llegar al RPC.
// floor() porque el parametro es integer: '10.5' es finito y positivo, y un
// no-entero hace petar el RPC (falla abierto igual que un secret roto).
function topeDiario(): number {
  const n = Math.floor(Number(Deno.env.get('ANALISIS_TOPE_DIARIO') ?? '10'));
  return Number.isFinite(n) && n > 0 ? n : 10;
}

// Tope diario de invitados (secret ANALISIS_TOPE_DIARIO_INVITADO, solo
// server-side, default 3): mismo tratamiento que topeDiario() — floor y
// fallback. Nunca VITE_: el numero que manda el servidor no le sirve al cliente.
function topeDiarioInvitado(): number {
  const n = Math.floor(Number(Deno.env.get('ANALISIS_TOPE_DIARIO_INVITADO') ?? '3'));
  return Number.isFinite(n) && n > 0 ? n : 3;
}

// Segundos hasta el reset que dijo el RPC — una sola fuente de verdad para el
// Retry-After de los dos topes de dia. Sin reset_at parseable, la ventana entera
// (86400) es el techo honesto.
function segundosHastaReset(resetAt?: string): number {
  const resetSec = resetAt ? Math.floor(Date.parse(resetAt) / 1000) : NaN;
  return Math.max(1, Number.isFinite(resetSec) ? resetSec - Math.floor(Date.now() / 1000) : 86400);
}

// Fail-open en todas las rutas de fallo: el limitador enfermo nunca rompe el
// producto, pero cada ceguera se loguea con cual tope quedo apagado.
async function rateLimited(req: Request, userId: string | null, tokenRechazado: boolean): Promise<Response | null> {
  if (!_admin) {
    console.error('[analizar-cv] tope IP y tope dia apagados: falta _admin (SUPABASE_URL/SERVICE_KEY)');
    return null;
  }
  try {
    // Tope IP anti-abuso (6/60s): no cambia, aplica a invitados y a usuarios.
    const { data, error } = await _admin.rpc('check_rate_limit', {
      p_bucket: 'analizar-cv',
      p_identifier: clientIp(req),
      p_limit: 6,
      p_window_sec: 60,
    });
    if (error || !data) {
      console.error('[analizar-cv] tope IP apagado (falla abierto):', error?.message ?? 'RPC sin datos');
      console.error('[analizar-cv] tope dia apagado (falla abierto): el limitador corto antes de consultarlo');
      return null;
    }
    const r = data as { allowed?: boolean; reset_at?: string };
    if (r.allowed === false) {
      return json({ ok: false, error: 'Demasiados intentos. Espera unos segundos.', retry_at: r.reset_at ?? null }, 429, { 'Retry-After': '30' });
    }

    // Token presente pero rechazado: no es invitado, es una llamada que cree
    // tener sesion. El 401 va AQUI, despues del tope IP y antes del tope dia
    // y de la IA: el parentesis `JWT → IP → dia` del plan dejaria correr spam
    // de tokens sin throttle, asi que la identidad se resuelve primero pero
    // el rechazo espera a que el anti-abuso diga lo suyo. Sin gasto de IA,
    // sin guardado, y sin payload 200 con guardado_error:false (eso es lo
    // que volcaba las brechas del usuario al puente de invitados).
    if (tokenRechazado) {
      return json({ ok: false, error: 'Tu sesión expiró. Volvé a iniciar sesión para analizar tu CV.' }, 401);
    }

    // Tope dia por usuario (servidor manda; mismo espiritu que usoDeHoy() de la
    // app CV). Ventana fija de 86400s alineada al epoch => el reset es la
    // proxima medianoche UTC; el Retry-After sale del reset_at del RPC.
    if (!userId) {
      // I5: sin usuario no hay contador por usuario, y un script podia vaciar la
      // cuenta gratis de OpenRouter sin morena. Se frena por IP con la MISMA
      // RPC y la misma forma de clave (IP:YYYY-MM-DD) que el bucket de usuario.
      // La IP es falsificable (x-forwarded-for lo decide quien llama; por eso
      // clientIp() prefiere cf-connecting-ip, que tampoco es identidad): esto es
      // FRENO SUAVE, no muro. Un NAT compartido reparte los N analisis.
      const limiteInvitado = topeDiarioInvitado();
      const { data: diaIp, error: diaIpError } = await _admin.rpc('check_rate_limit', {
        p_bucket: 'analisis-dia-ip',
        p_identifier: `${clientIp(req)}:${new Date().toISOString().slice(0, 10)}`,
        p_limit: limiteInvitado,
        p_window_sec: 86400,
      });
      if (diaIpError || !diaIp) {
        console.error('[analizar-cv] tope dia de invitados apagado (falla abierto):', diaIpError?.message ?? 'RPC sin datos');
        return null;
      }
      const g = diaIp as { allowed?: boolean; reset_at?: string };
      if (g.allowed === false) {
        const retryInvitado = segundosHastaReset(g.reset_at);
        return json({ ok: false, error: `Terminaste los ${limiteInvitado} análisis gratis de hoy para este dispositivo. El contador se renueva en ~${Math.ceil(retryInvitado / 3600)} h.`, retry_at: g.reset_at ?? null }, 429, { 'Retry-After': String(retryInvitado) });
      }
      return null;
    }
    const limite = topeDiario();
    const { data: dia, error: diaError } = await _admin.rpc('check_rate_limit', {
      p_bucket: 'analisis-dia',
      p_identifier: `${userId}:${new Date().toISOString().slice(0, 10)}`,
      p_limit: limite,
      p_window_sec: 86400,
    });
    if (diaError || !dia) {
      console.error('[analizar-cv] tope dia apagado (falla abierto):', diaError?.message ?? 'RPC sin datos');
      return null;
    }
    const d = dia as { allowed?: boolean; reset_at?: string };
    if (d.allowed === false) {
      // Una sola fuente de verdad: los segundos salen del reset_at del RPC.
      const retryAfter = segundosHastaReset(d.reset_at);
      return json({ ok: false, error: `Llegaste a los ${limite} análisis de hoy. El contador se renueva en ~${Math.ceil(retryAfter / 3600)} h.`, retry_at: d.reset_at ?? null }, 429, { 'Retry-After': String(retryAfter) });
    }
    return null;
  } catch (e) {
    console.error('[analizar-cv] tope IP y tope dia apagados (falla abierto, limitador exploto):', String(e));
    return null;
  }
}

const SYS = 'Eres el Motor de ADN Digital de Omicron. Tu mision: CLONAR fielmente un CV real y MEDIR al profesional con el sistema de reputacion de Omicron.\n\nCONTEXTO DEL SISTEMA OMICRON:\nOmicron mide a cada persona con 4 EJES de 0-100 basados en EVIDENCIA REAL:\n- EJECUCION (exec): Capacidad de ENTREGAR. Proyectos completados, anios activos, roles de produccion, resultados medibles.\n- CALIDAD (qual): RIGOR profesional. Certificaciones, estandares cumplidos, metodologias, buenas practicas, nivel de responsabilidad.\n- TRASCENDENCIA (trans): IMPACTO mas alla de uno mismo. Liderazgo de equipos, mentoria, docencia, publicaciones, cargos de responsabilidad sobre personas.\n- FUNDAMENTO (fund): BASE teorica y formal. Titulos universitarios, diplomados, certificaciones tecnicas, especializaciones.\n\nFormula: reputacion = 20% credenciales formales + 80% promedio(4 ejes). Un titulo ayuda (20%) pero el 80% se gana DEMOSTRANDO.\n\nTU TRABAJO:\n1. CLONAR el CV: extraer TODA la informacion tal como es. NO omitir nada. NO inventar nada.\n2. POSICIONAR como especialista: seniorLabel = POSICIONAMIENTO REAL basado en EXPERIENCIA DOMINANTE.\n3. MEDIR con los 4 ejes de Omicron basandote en EVIDENCIA CONCRETA del CV.\n\nREGLAS:\n- NO inventes NADA que no este en el texto.\n- NO subestimes: si tiene 15 anios, refleja 15 anios.\n- Los skills deben ser los que REALMENTE domina segun su trayectoria.\n- Los porcentajes (pct) DEBEN diferenciarse: area principal 80-96%, secundarias 50-75%, menores 30-50%.\n- Los anios son la SUMA TOTAL de experiencia laboral.\n- Funciona para CUALQUIER industria.\n\nDevuelve SOLO un JSON valido con esta estructura exacta (sin texto antes ni despues). Ademas del perfil, detecta HASTA 12 brechas reales entre lo que el CV muestra y lo que el puesto objetivo exige; cada brecha debe tener un camino accionable. Estructura:\n{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":"","brechas":[{"categoria":"dura|blanda|conocimiento|credencial","titulo":"","evidencia":"","porQueImporta":"","severidad":"alta|media|baja","aprender":{"que":"","como":"","comoLoDemuestro":""}}]}\nReglas de brechas: si no hay ninguna real, []. Prohibido inventar brechas de skills que el CV si declara. "evidencia" cita el CV; "porQueImporta" habla del puesto, no del mercado en general.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ ok: false, error: 'Falta OPENROUTER_KEY en secrets.' }, 500);

    // Identidad antes que los topes: el tope dia necesita el id verificado por
    // getUser(), y el guardado de abajo reusa este mismo resultado. OJO: en
    // supabase-js v2 getUser NO lanza con token invalido — devuelve
    // {data:{user:null}, error} —, por eso se mira el error aca: un token
    // rechazado con header presente es un 401 (dentro de rateLimited, despues
    // del tope IP), nunca un invitado silencioso.
    const auth = req.headers.get('authorization') ?? '';
    // traiaToken: sirvio para distinguir invitado real de "usuario al que no
    // pudimos verificar" cuando _admin falta (I1, se usa en el guardado).
    const traiaToken = auth !== '';
    let userId: string | null = null;
    let tokenRechazado = false;
    if (_admin && auth) {
      const { data, error } = await _admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
      userId = data.user?.id ?? null;
      if (!userId) {
        tokenRechazado = true;
        console.error('[analizar-cv] token presente pero rechazado (401 tras el tope IP):', error?.message ?? 'getUser sin usuario ni error');
      }
    }

    const limited = await rateLimited(req, userId, tokenRechazado);
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
    // guardado_error: quien llamo parecia tener sesion pero el guardado NO
    // ocurrio (RPC fallo, no trajo datos, o _admin ausente y por lo tanto ni se
    // intento). Distinge ese caso del invitado real (sin token, guardado null)
    // para que el cliente no deposite las brechas de un usuario con sesion en el
    // puente de invitados, donde nunca alcanzan la BD ni el mapa entre
    // dispositivos.
    let guardado_error = false;
    if (_admin && userId) {
      const p = parsed as Record<string, unknown>;
      // Ruling controlador 2026-10-26 (T6): la RPC es security definer con
      // p_user_id (10012). La identidad SOLO sale de getUser() verificado con
      // el JWT adjunto (resuelto arriba, antes de los topes) — nunca del cuerpo
      // de la request. Un token rechazado ya no llega hasta aqui (sale 401 en
      // rateLimited), asi que este id es confianza de servidor.
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
        p_user_id: userId,
      });
      if (!error && data) {
        guardado = data as { analisis_id: string; brechas: string[] };
        // La brecha ya existe; se marca como detectada de nacimiento. El
        // guard lo devuelve con ids reales para que el cliente suscriba.
      } else {
        // Fallo o respuesta vacia: el guardado NO ocurrio para un usuario con
        // sesion. Se marca para que el cliente no lo confunda con un invitado.
        guardado_error = true;
        console.error('[analizar-cv] guardado fallo:', error?.message ?? 'sin datos');
      }
    }
    // I1 (falla abierto disfrazado de invitado): si se presento un token y aun
    // asi no hubo guardado, la bandera va TRUE igualmente — incluso cuando _admin
    // falta, caso en el que el bloque de arriba ni se ejecuto: identidad no
    // verificable, y nada que escribir (menos aun) en el puente de invitados.
    // Un invitado de verdad no trae token y conserva
    // guardado:null / guardado_error:false.
    if (traiaToken && !guardado) guardado_error = true;

    console.log(`[analizar-cv] OK, nombre: ${(parsed as {name?:string})?.name ?? '?'}`);
    return json({ ok: true, analysis: parsed, model: 'openrouter', guardado, guardado_error });
  } catch (e) {
    console.error('[analizar-cv] Error fatal:', String(e));
    return json({ ok: false, error: 'Error inesperado.', detail: String(e) }, 500);
  }
});
