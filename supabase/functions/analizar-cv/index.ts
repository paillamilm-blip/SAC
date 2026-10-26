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
const BUILD = '10c-ejes-estrictos';
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

// INLINE INICIO de _shared/brechas.ts (huella 10c) — las Edge Functions congelan
// _shared al crearse: editar el canonico y re-inlinear aca en el mismo commit
// (pegar el bloque entero, quitar las `export`, no tocar nada mas).
// Copia del canonico menos las 4 palabras `export` (este index.ts es entry file
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

// La misma identidad de skill que aplica la RPC de 10012 (titulo normalizado): la IA
// repite habilidades dentro de UN run y el cliente tiene que ver la misma lista que
// la BD, o los ids de `guardado.brechas` quedan mas cortos que las brechas.
// Equivalencia con la SQL: la columna generada usa
// lower(trim(regexp_replace(titulo, '\s+', ' ', 'g'))) — aca `str()` ya recorta por
// los lados, `toLowerCase()` es el lower() y `\s+ -> ' '` es el regexp_replace con 'g'.
// La primera aparicion gana, igual que `order by ord` en el row_number() de la RPC.
const claveSkill = (t: string): string => t.toLowerCase().replace(/\s+/g, ' ').trim();

function normalizarBrechas(x: unknown): BrechaValidada[] {
  if (!Array.isArray(x)) return [];
  const out: BrechaValidada[] = [];
  const vistas = new Set<string>();
  for (const item of x) {
    const n = normalizarBrecha(item);
    if (!n) continue;
    const clave = claveSkill(n.titulo);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    out.push(n);
    if (out.length >= MAX_BRECHAS) break;
  }
  return out;
}

// El numero tiene que llegar como numero, o como string que se lee como numero.
// Number(null), Number(''), Number('   '), Number(false) y Number([]) devuelven 0:
// un analisis con los 4 ejes en 0 pasa cualquier guard de "estan los 4" y se guarda
// como si fuera un perfil real. El prompt exige enteros 0-100; lo que no se pueda
// leer como numero no es un eje.
const numEje = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// Un analisis sin los 4 ejes no es un analisis: es lo que dibuja el Gemelo y lo que
// cuenta en la metrica de la Fase 1. Se exige ANTES de guardar y ANTES de devolver
// ok, para que un run incompleto no deje fila ni se venda como exito. Vive en el
// validador y no en el handler para que su tabla de verdad se pueda ejecutar en
// vitest (el entry de Deno no se puede importar).
function ejesUsables(p: unknown): boolean {
  const a = (p as { axes?: unknown } | null)?.axes;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
  const ejes = a as Record<string, unknown>;
  return ['exec', 'qual', 'trans', 'fund'].every((k) => {
    const n = numEje(ejes[k]);
    return n !== null && n >= 0 && n <= 100;
  });
}
// INLINE FIN de _shared/brechas.ts — arriba de esta linea queda la copia del
// canonico (sin `export`); debajo van las funciones propias de esta funcion.

// Presupuesto de IA del request. La cuenta HONESTA del peor caso en _shared/llm.ts
// (que NO se puede editar: las Edge Functions del dashboard congelan _shared al
// crearse, leccion 6F del ledger): con GEMINI_API_KEY puesta prueba GEMINI PRIMERO,
// con abort de 40 s —su propio comentario dice 25 s y esta mal, queda congelado—,
// y recien despues recorre los 6 modelos gratuitos de OpenRouter a 25 s cada uno.
// Peor caso real: 40 + 6 x 25 = ~190 s, no los ~150 s que decia esta linea antes.
// Con que cerrar: el timer del cliente es 150 s (SAFETY_TIMEOUT_MS en
// src/hooks/useGemeloActivation.ts, desde 10-B). 60 s queda comodamente por debajo
// de ese numero y deja margen para el guardado dentro del mismo request.
// HONESTO: la carrera libera la RESPUESTA al cliente, no cancela el fetch de
// _shared/llm.ts — esa promesa se resuelve en el vacio. No deja fila huerfana porque
// el handler ya retorno antes del guardado.
const PRESUPUESTO_IA_MS = 60_000;

// Centinela del corte: un simbolo unico, no la cadena 'saturado'. Con cadena, un
// modelo que devuelva exactamente ese texto se confunde con el presupuesto agotado
// y el 504 miente; comparando por identidad ninguna respuesta lo puede simular.
const CORTE_PRESUPUESTO = Symbol('corte por presupuesto de IA');

function clientIp(req: Request): string | null {
  // cf-connecting-ip (Cloudflare, en el borde) primero: es el unico que quien
  // llama no puede forjar con un header propio. Recien despues el primer
  // elemento de x-forwarded-for (falsificable) y x-real-ip.
  // Sale null (y no una etiqueta fija tipo "no se de donde venis") cuando no hay
  // ninguna de las tres o vienen vacias: un identificador fijo para el origen
  // desconocido compartira baldio entre TODAS las personas anonimas, y la primera
  // agotaria el cupo de todas las demas. Quien llama decide el header, asi que la
  // ausencia es el caso normal en dev y en un path raro del borde, no un error.
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim() || null;
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || null;
  const real = req.headers.get('x-real-ip');
  return real?.trim() || null;
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

// Invitado sin origen: una sola fuente del mensaje, porque lo devuelve la puerta de
// acceso y la defensa del bucket diario de invitados (que nunca se ve, pero evita
// que un refactor vuelva a usar un identificador fijo para 'no se de donde venis').
// SIN Retry-After: esto no es "volvé en 30 s", es "falta identidad" — el reintento
// llega con las mismas cabeceras y falla igual, y un numero de segundos invited a
// gastar requests que no pueden funcionar. Tampoco "recargá la página": recargar
// no hace que aparezca cf-connecting-ip.
const analisis_sin_origen = () => json({
  ok: false,
  error: 'No pudimos identificar tu conexión para asignarte los análisis gratis del día. Iniciá sesión y te devolvemos el análisis.',
}, 503);

// Puerta de acceso: lo que protege el endpoint del abuso (burst por IP, token
// rechazado, invitado sin origen). NO consulta los buckets diarios: esos viven en
// topeDelDia(), que corre despues de validar el CV para que un request rechazado
// por el servidor no cobre cupo. El orden anti-abuso no cambia — el burst por IP
// sigue siendo lo primero que corre, antes de leer el cuerpo.
// Fail-open en las rutas de fallo: el limitador enfermo nunca rompe el producto,
// pero cada ceguera se loguea con cual tope quedo apagado.
async function puertaDeAcceso(req: Request, userId: string | null, tokenRechazado: boolean): Promise<Response | null> {
  if (!_admin) {
    console.error('[analizar-cv] tope IP (burst) apagado: falta _admin (SUPABASE_URL/SERVICE_KEY)');
    return null;
  }
  try {
    const ip = clientIp(req);

    // SIN ORIGEN y SIN SESION -> falla CERRADO. Sin origen no hay a quien
    // asignarle el cupo diario de invitados, y el identificador fijo de antes
    // ponia a todas las personas anonimas en el MISMO baldio: la primera agotaba
    // los 3 analisis del dia para todo el mundo. Negar le sale mas barato a la
    // cuenta de OpenRouter que adivinar de donde vino el call.
    // PREMISA DE INFRAESTRUCTURA TODAVIA SIN MEDIR: el "falla cerrado" asume que
    // el borde manda cf-connecting-ip; si no la manda, NINGUN invitado pasa y el
    // producto queda solo para quien tenga sesion. Se verifica en produccion con el
    // curl de invitado del handoff: un 200 prueba que la cabecera llega, un 503 con
    // el texto de analisis_sin_origen() prueba que no.
    if (!ip && !userId && !tokenRechazado) {
      console.error('[analizar-cv] invitado sin cabecera de origen (se busco cf-connecting-ip, x-forwarded-for, x-real-ip): analisis denegado (falla CERRADO, sin baldio compartido)');
      return analisis_sin_origen();
    }

    if (ip) {
      // Tope IP anti-abuso (6/60s): no cambia, aplica a invitados y a usuarios.
      const { data, error } = await _admin.rpc('check_rate_limit', {
        p_bucket: 'analizar-cv',
        p_identifier: ip,
        p_limit: 6,
        p_window_sec: 60,
      });
      if (error || !data) {
        // Se loguea SOLO el burst: el tope dia se consulta despues, en su propia
        // funcion, y si ese tambien falla lo dice ahi. Anunciarlo apagado desde
        // aca seria mentir (y taparia el log verdadero).
        console.error('[analizar-cv] tope IP apagado (falla abierto):', error?.message ?? 'RPC sin datos');
        return null;
      }
      const r = data as { allowed?: boolean; reset_at?: string };
      if (r.allowed === false) {
        return json({ ok: false, error: 'Demasiados intentos. Espera unos segundos.', retry_at: r.reset_at ?? null }, 429, { 'Retry-After': '30' });
      }
    } else if (userId) {
      // Sesion verificada sin cabecera de origen: se apaga SOLO el burst por IP
      // (no hay identificador) y se continua al tope diario por userId, que no
      // depende de la IP. Se loguea igual: un tope apagado en silencio es invisible.
      console.error('[analizar-cv] tope IP apagado: sin cabecera de origen; el tope día sí corre por id de usuario');
    } else {
      // Token rechazado sin cabecera de origen: el 401 de abajo responde sin
      // necesitar IP y no gasta IA ni cupo, asi que no se lo confunde con el
      // anonimo que si se disputaria el baldio.
      console.error('[analizar-cv] tope IP apagado: sin cabecera de origen y sin sesion verificada');
    }

    // Token presente pero rechazado: no es invitado, es una llamada que cree
    // tener sesion. El 401 va AQUI, despues del tope IP y antes de la IA: el
    // parentesis `JWT → IP → dia` del plan dejaria correr spam de tokens sin
    // throttle, asi que la identidad se resuelve primero pero el rechazo espera
    // a que el anti-abuso diga lo suyo. Sin gasto de IA, sin guardado, y sin
    // payload 200 con guardado_error:false (eso es lo que volcaba las brechas
    // del usuario al puente de invitados).
    // CORNER CONOCIDO Y ACEPTADO: sin cabecera de origen este 401 sale SIN ningun
    // throttle (el burst se apago por no tener ip), o sea que se pueden quemar
    // tokens verificados sin limite por IP. Se acepta porque priorizar el 401 es
    // lo correcto — el spammer no recibe cuerpo ni IA — y en produccion
    // cf-connecting-ip cierra el corner: solo se abre en dev y en un path raro
    // del borde.
    if (tokenRechazado) {
      return json({ ok: false, error: 'Tu sesión expiró. Volvé a iniciar sesión para analizar tu CV.' }, 401);
    }
    return null;
  } catch (e) {
    console.error('[analizar-cv] tope IP (burst) apagado (falla abierto, limitador exploto):', String(e));
    return null;
  }
}

// Cupo del dia: los dos buckets diarios (por userId y, para invitados, por IP).
// Mismos limites, mismos Retry-After derivados del reset_at, mismos logs que antes
// de la division; lo unico que cambio es CUANDO corre (ver el llamado en el handler).
async function topeDelDia(req: Request, userId: string | null): Promise<Response | null> {
  if (!_admin) {
    console.error('[analizar-cv] tope dia apagado: falta _admin (SUPABASE_URL/SERVICE_KEY)');
    return null;
  }
  try {
    // Se vuelve a leer la cabecera aca (en vez de pasarla desde la puerta) porque
    // el bucket de invitados depende SOLO de ella: asi topeDelDia() no puede ser
    // llamado con un identificador prestado por otro paso.
    const ip = clientIp(req);
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
      // La puerta de acceso ya nego al invitado sin origen; se vuelve a exigir aca
      // para que el bucket diario JAMAS se consulte con un identificador nulo o
      // fijo (el dia por usuario no depende de la IP, este si).
      if (!ip) {
        console.error('[analizar-cv] invitado sin cabecera de origen: no se consulto el tope dia por IP (falla CERRADO)');
        return analisis_sin_origen();
      }
      const limiteInvitado = topeDiarioInvitado();
      const { data: diaIp, error: diaIpError } = await _admin.rpc('check_rate_limit', {
        p_bucket: 'analisis-dia-ip',
        p_identifier: `${ip}:${new Date().toISOString().slice(0, 10)}`,
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
    console.error('[analizar-cv] tope dia apagado (falla abierto, limitador exploto):', String(e));
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
    // rechazado con header presente es un 401 (dentro de puertaDeAcceso, despues
    // del burst por IP), nunca un invitado silencioso.
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

    // Puerta de acceso (burst por IP + 401 + 503) antes de tocar el cuerpo: es lo
    // que frena el flood de bodies grandes y el spam de tokens.
    const accesoNegado = await puertaDeAcceso(req, userId, tokenRechazado);
    if (accesoNegado) return accesoNegado;

    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'El CV es muy corto o no se pudo leer.' }, 400);

    // EL CUPO DIARIO VA ACA, DESPUES DEL 400, Y ESE ES EL PUNTO: check_rate_limit
    // incrementa al CONSULTAR, asi que un request que el servidor rechazo por CV
    // ilegible o vacio jamas llamo a la IA y no tiene que cobrar uno de los N
    // analisis del dia (con ANALISIS_TOPE_DIARIO_INVITADO=3, pegar una foto sin
    // texto se llevaba 1/3 del cupo). Lo que SI sigue cobrando slot: los 504/502
    // de abajo (saturado, sin respuesta, JSON no interpretable, analisis sin los 4
    // ejes) — ahi el modelo ya respondio o ya intento responder, y eso es
    // justamente lo que el tope limita. No se mueve esta llamada por encima del
    // 400 ni por debajo de la carrera sin releer este parrafo.
    const sinCupo = await topeDelDia(req, userId);
    if (sinCupo) return sinCupo;

    // Carrera contra el presupuesto (PRESUPUESTO_IA_MS arriba), no contra la
    // funcion compartida: sin esto, Gemini (abort 40 s) + 6 modelos x 25 s de abort
    // llegan a ~190 s y el cliente ya abandono mucho antes. El .catch() es parte
    // del contrato: el rechazo de callLLM ('todos los modelos fallaron') NUNCA
    // tiene que escapar al catch general de abajo, que contesta 500 con `detail` —
    // aca se distingue el corte por presupuesto (CORTE_PRESUPUESTO, comparado por
    // identidad) de "sin respuesta" (exploto antes).
    let cronometro: ReturnType<typeof setTimeout> | undefined;
    const crudo = await Promise.race([
      callLLM([{ role: 'system', content: SYS }, { role: 'user', content: 'CV COMPLETO:\n\n' + cv }], true, 2000)
        .catch((e) => { console.error('[analizar-cv] callLLM exploto:', String(e)); return null; }),
      new Promise<typeof CORTE_PRESUPUESTO>((resolve) => {
        cronometro = setTimeout(() => resolve(CORTE_PRESUPUESTO), PRESUPUESTO_IA_MS);
      }),
    ]);
    // El cronometro se cancela en el camino normal: un timeout de 60 s colgado
    // mantiene el isolate vivo (y cobrandose) incluso cuando la respuesta ya
    // salio. Si el que gano fue el propio timer, clearTimeout es un no-op inocuo.
    clearTimeout(cronometro);
    if (crudo === CORTE_PRESUPUESTO) {
      return json({ ok: false, error: 'El modelo gratuito está saturado: ningún modelo respondió a tiempo. Reintentá en unos minutos.' }, 504);
    }
    if (!crudo) return json({ ok: false, error: 'La IA no genero respuesta.' }, 502);
    const raw = crudo as string;

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

    // El guard de ejes va DESPUES de interpretar el JSON y ANTES de cualquier
    // efecto (normalizar, guardar, devolver ok): un run sin los 4 ejes no deja
    // fila en analisis_cv ni se vende como exito, asi no contamina la metrica de
    // la Fase 1 ni obliga al cliente a descartar el analisis (502 = del motor, no
    // del usuario).
    if (!ejesUsables(parsed)) {
      console.error('[analizar-cv] la IA devolvio un analisis sin los 4 ejes: no se guarda, no se devuelve ok.');
      return json({ ok: false, error: 'La IA devolvió un análisis incompleto (faltan los 4 ejes del Gemelo). Volvé a intentar.' }, 502);
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
      // puertaDeAcceso), asi que este id es confianza de servidor.
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
