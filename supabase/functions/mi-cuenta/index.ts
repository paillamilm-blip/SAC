// supabase/functions/mi-cuenta/index.ts — Los derechos de la persona sobre su cuenta, hechos producto.
//
// Acciones (siempre con sesión; el usuario sale del token, nunca del cuerpo):
//   · 'exportar' → JSON con TODO lo que el servidor guarda de la persona (política de privacidad §8.1 y §8.5).
//   · 'borrar'   → borra la cuenta de autenticación; la base borra el resto en cascada (§8.3).
//
// Por qué en el servidor: varias tablas no tienen permiso de lectura para el navegador (p. ej. exam_sessions), y borrar
// un usuario de autenticación exige la service role, que nunca va al cliente.
//
// Lo que NO se exporta, a propósito:
//   · exam_sessions.payload: es el examen completo CON las respuestas correctas. Exportarlo dejaría empezar un examen,
//     descargar los datos, leer las respuestas y aprobar. De esa tabla solo va la fecha y el estado.
//   · push_subscriptions.p256dh / auth: claves de cifrado del aviso push del dispositivo. Son secretos técnicos.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, tooManyRequests } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUILD = 'mi-cuenta-1';
/** Lo que la persona escribe para confirmar. Se exige también aquí, no solo en la pantalla. */
const CONFIRMACION = 'BORRAR';
/** Tope de filas por tabla en la exportación (los eventos de uso pueden ser muchos). Si se alcanza, se avisa. */
const MAX_FILAS = 5000;

/** Tablas con datos de la persona: qué columna la identifica y qué columnas se exportan. */
const TABLAS: { tabla: string; columna: string; columnas: string; nota?: string }[] = [
  { tabla: 'profiles', columna: 'id', columnas: '*' },
  { tabla: 'brecha_db', columna: 'user_id', columnas: '*', nota: 'Tus análisis de CV y su avance, copia en la nube.' },
  { tabla: 'omicron_skill_proofs', columna: 'user_id', columnas: '*', nota: 'Habilidades aprobadas con examen.' },
  { tabla: 'actas_evidencia', columna: 'user_id', columnas: '*', nota: 'Constancia de cada examen evaluado.' },
  {
    tabla: 'exam_sessions',
    columna: 'user_id',
    columnas: 'id,node_id,status,created_at',
    nota: 'Solo fecha y estado: el contenido del examen incluye las respuestas correctas y no se entrega.',
  },
  { tabla: 'skill_test_attempts', columna: 'user_id', columnas: '*' },
  { tabla: 'reputation_history', columna: 'user_id', columnas: '*' },
  { tabla: 'daily_activity', columna: 'user_id', columnas: '*', nota: 'Días con actividad (racha).' },
  {
    tabla: 'push_subscriptions',
    columna: 'user_id',
    columnas: 'id,endpoint,last_active,created_at',
    nota: 'Sin las claves de cifrado del aviso push.',
  },
  { tabla: 'analytics_events', columna: 'user_id', columnas: '*', nota: 'Eventos de uso de la app.' },
];

async function usuarioDelToken(authHeader: string): Promise<{ id: string; email: string | null } | null> {
  if (!authHeader) return null;
  const c = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await c.auth.getUser();
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** ¿El error dice que la tabla no existe en este proyecto? (algunas se retiraron con el producto anterior). */
function tablaInexistente(e: { code?: string; message?: string } | null): boolean {
  return !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? ''));
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json', 'x-omicron-build': BUILD },
    });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ build: BUILD });

  try {
    const yo = await usuarioDelToken(req.headers.get('Authorization') ?? '');
    if (!yo) return json({ error: 'Inicia sesión para gestionar tu cuenta.' }, 401);

    const body = await req.json().catch(() => ({}));
    const action: string = (body?.action ?? '').toString();

    // ── EXPORTAR ─────────────────────────────────────────────────────────────────────────────────────
    if (action === 'exportar') {
      const rl = await checkRateLimit(admin, 'mi-cuenta-exportar', yo.id, 10, 3600);
      if (!rl.allowed) return tooManyRequests(rl.reset_at, CORS);

      const { data: cuentaAuth } = await admin.auth.admin.getUserById(yo.id);
      const u = cuentaAuth?.user;
      const tablas: Record<string, unknown> = {};

      for (const t of TABLAS) {
        const { data, error } = await admin.from(t.tabla).select(t.columnas).eq(t.columna, yo.id).limit(MAX_FILAS);
        if (error) {
          tablas[t.tabla] = tablaInexistente(error)
            ? { estado: 'no existe en este proyecto' }
            : { estado: 'no se pudo leer', detalle: error.message };
          continue;
        }
        const filas = data ?? [];
        tablas[t.tabla] = {
          ...(t.nota ? { nota: t.nota } : {}),
          filas: filas.length,
          ...(filas.length >= MAX_FILAS ? { aviso: `Se entregan las primeras ${MAX_FILAS} filas.` } : {}),
          datos: filas,
        };
      }

      return json({
        generado: new Date().toISOString(),
        cuenta: {
          id: yo.id,
          email: u?.email ?? yo.email,
          creada: u?.created_at ?? null,
          ultimo_ingreso: u?.last_sign_in_at ?? null,
          correo_confirmado: u?.email_confirmed_at ?? null,
        },
        tablas,
      });
    }

    // ── BORRAR ───────────────────────────────────────────────────────────────────────────────────────
    if (action === 'borrar') {
      if ((body?.confirmar ?? '').toString() !== CONFIRMACION) {
        return json({ error: `Para borrar tu cuenta escribe ${CONFIRMACION}.` }, 400);
      }
      const rl = await checkRateLimit(admin, 'mi-cuenta-borrar', yo.id, 3, 3600);
      if (!rl.allowed) return tooManyRequests(rl.reset_at, CORS);

      // Borrar el usuario de autenticación arrastra `profiles` y, desde ahí, el resto (on delete cascade).
      const { error } = await admin.auth.admin.deleteUser(yo.id);
      if (error) {
        // Sin datos personales en el registro: solo el id y el motivo técnico.
        console.error(`[mi-cuenta] no se pudo borrar ${yo.id}: ${error.message}`);
        return json(
          {
            error:
              'No pudimos borrar tu cuenta en este momento. No se borró nada. Inténtalo de nuevo en unos minutos.',
            detalle: error.message,
          },
          409,
        );
      }
      console.log(`[mi-cuenta] cuenta borrada ${yo.id}`);
      return json({ borrada: true });
    }

    return json({ error: 'Acción no válida.' }, 400);
  } catch (e) {
    return json({ error: 'Error inesperado al gestionar tu cuenta.', detalle: String(e) }, 500);
  }
});
