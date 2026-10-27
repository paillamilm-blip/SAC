-- =====================================================================
-- 10013_ventana_propia_rate_limit.sql — La poda del limitador respeta la
-- ventana de cada fila.
--
-- SIN ESTO: el tope diario de `analizar-cv` (86400 s) es decorativo. La
-- limpieza que 0031 metió dentro de `check_rate_limit` borra
-- `window_start < now() - interval '1 hour'`, pero con ventana diaria la
-- fila de *hoy* (`window_start` = medianoche UTC) envejece más de una hora
-- durante el propio día: la poda la elimina mientras sigue en curso y el
-- contador del día arranca de cero en cada pasada. Ojo con la matemática del
-- gatillo: `v_epoch % 50 = 0` no cuenta requests, muestrea el segundo del
-- epoch — dispara en ~2% de los calls, o sea cada ~50 s con tráfico
-- sostenido, no "una vez cada 50 requests". El límite infraccuenta y el
-- usuario pasa de N análisis en un día sin que el servidor se entere.
--
-- QUÉ HACE: cada fila recuerda la ventana con la que nació.
--   1. `rate_limits` gana la columna `window_sec` (`integer not null
--      default 60`). El default es constante, así que en esta versión de
--      Postgres el `add column` es metadata-only (no reescribe la tabla):
--      las filas que 0031 ya creó salen con 60, que es exactamente la
--      ventana con la que fueron creadas.
--   2. `check_rate_limit` se reDefine con `create or replace function` —
--      MISMA firma (`text, text, integer, integer`), MISMO jsonb de salida
--      `{allowed, count, limit, reset_at}`: ningún otro Edge Function que
--      la consume tiene que redesplegar. Cambian tres líneas del cuerpo:
--      el `insert` lista `window_sec` con `p_window_sec`; el
--      `on conflict ... do update` también reescribe `window_sec` (una fila
--      nacida bajo el deploy viejo se autocorrige en su segundo golpe); y
--      la poda pasa a `window_start < now() - make_interval(secs =>
--      window_sec * 2)`, conservando el mismo oportunismo `v_epoch % 50 = 0`
--      de 0031. Con eso una fila diaria sobrevive 48 h y una de 60 s
--      sobrevive 120 s: la tabla sigue igual de chica que antes.
--   3. Se re-enuncian los grants tal cual 0031 (el `create or replace` los
--      conserva, pero el archivo queda autocontenido e idempotente).
--
-- Idempotente. Pegar en el SQL Editor de Supabase DESPUÉS de 10011 y 10012
-- (10013 no toca ninguna de esas tablas; solo depende de la existencia de
-- `rate_limits` y de `check_rate_limit`, ambas de 0031 ya aplicadas).
-- No borra ni reescribe datos: no hay `delete` fuera de la función, así que
-- los contadores en curso se conservan.
-- =====================================================================

-- ── 1. La ventana con la que nació cada fila ─────────────────────────
alter table public.rate_limits
  add column if not exists window_sec integer not null default 60;

-- ── 2. El mismo RPC de 0031, podando por ventana propia ──────────────
create or replace function public.check_rate_limit(
  p_bucket     text,
  p_identifier text,
  p_limit      integer,
  p_window_sec integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_epoch  bigint      := floor(extract(epoch from now()))::bigint;
  v_window timestamptz := to_timestamp((v_epoch / p_window_sec) * p_window_sec);
  v_count  integer;
begin
  insert into public.rate_limits (bucket, identifier, window_start, count, window_sec)
  values (p_bucket, p_identifier, v_window, 1, p_window_sec)
  on conflict (bucket, identifier, window_start)
  do update set count = public.rate_limits.count + 1,
                window_sec = p_window_sec
  returning count into v_count;

  -- Limpieza oportunista (mantiene la tabla pequeña), ahora por ventana
  -- propia: cada fila sobrevive 2 x su ventana, no una hora fija. Una fila
  -- de 60 s se poda a los 120 s; una de 86400 s (el tope diario) aguanta
  -- 48 h, así que la fila de hoy deja de borrarse a mitad de la propia
  -- ventana.
  if (v_epoch % 50) = 0 then
    delete from public.rate_limits
    where window_start < now() - make_interval(secs => window_sec * 2);
  end if;

  return jsonb_build_object(
    'allowed',  v_count <= p_limit,
    'count',    v_count,
    'limit',    p_limit,
    'reset_at', v_window + make_interval(secs => p_window_sec)
  );
end;
$fn$;

-- ── 3. Los grants de 0031, otra vez, en el mismo orden ───────────────
-- Solo el service_role (Edge Functions) ejecuta el limitador. `create or
-- replace` conserva los grants existentes; se repiten igual para que este
-- archivo sea autocontenido e idempotente.
revoke all on function public.check_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

-- ── Chequeo pre-pegado ──────────────────────────────────────────────
-- Antes de pegar este archivo, mirar qué definición está VIVA en producción.
-- Este `create or replace` reescribe la función pero NO toca el PK de la
-- tabla, y su `on conflict (bucket, identifier, window_start)` exige el PK
-- de 0031:
--
-- select indexdef from pg_indexes where tablename = 'rate_limits';
--   esperado: PRIMARY KEY (bucket, identifier, window_start). Si dice (bucket, identifier),
--   production viene del bootstrap viejo: este archivo NO alcanza, hay que alinear la tabla primero.
-- select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where proname = 'check_rate_limit';
--   (si la consulta de arriba no devuelve filas, 0031 nunca se aplicó:
--    aplicar 0031 antes que este archivo).
--
-- Si el índice sale (bucket, identifier): aplicar primero el PASO 6 de
-- APLICAR_EN_SUPABASE.sql — hoy es espejo de 0031+10013 y trae el DO que
-- alinea el PK (drop constraint + add; la tabla es efímera, solo
-- contadores) — y recién después pegar este archivo. Pegar 10013 a secas
-- dejaría el tope diario fallando abierto en cada request, sin ruido.
--
-- ── Verificacion post-aplicacion ──────────────────────────────────────
-- Dos consultas, en este orden, pegadas en el SQL Editor recién aplicado
-- este archivo.
--
-- (a) La columna nueva existe. Debe devolver 1:
--
-- select count(*)
--   from information_schema.columns
--  where table_name = 'rate_limits'
--    and column_name = 'window_sec';
--
-- Si sale 0, el `alter table` no corrió (pego truncado, cortado a mitad) y
-- hay que volver a pegar el archivo entero: es idempotente, no duplica.
--
-- (b) Las filas ya cargan su ventana. Después de unos requests reales a
-- `analizar-cv`, debe verse el bucket `analisis-dia` con `window_sec =
-- 86400` y `analizar-cv` con `window_sec = 60`:
--
-- select bucket, identifier, window_sec, count
--   from public.rate_limits
--  order by window_start desc
--  limit 5;
--
-- OJO: si este (b) sale VACIO, NO es un fallo de la migración. La tabla
-- vive con RLS habilitado y sin políticas desde 0031 — el acceso real es
-- solo a través de la función `security definer`, así que cualquier rol que
-- no sea propietario o bypassrls ve cero filas. Un resultado vacío acá es
-- esperado; la prueba de que el arrego funciona es un paseo por `analizar-cv`
-- con el header de sesion PUESTO: `Authorization: Bearer <JWT authenticated>`
-- (se copia de devtools -> Network -> cualquier request de la app logueada, o
-- del token de `supabase.auth.getSession()`). Los dos modos de no-traer ese JWT
-- NO son la misma cosa, y cada uno se corta en un punto distinto:
--   * va la anon key como Bearer: la funcion SI corre, pero se lee como invitado
--     y consulta el bucket `analisis-dia-ip` (tope 3 por IP), NO el
--     `analisis-dia` que este archivo repara. Daria 429 igual, midiendo otra cosa.
--   * no va ningun Bearer: la funcion NUNCA corre. `verify_jwt` esta ON y el borde
--     de Supabase responde 401 `UNAUTHORIZED_NO_AUTH_HEADER` antes de ejecutar el
--     handler, asi que NINGUN bucket se consulta y no se cobra nada.
-- En los dos casos no se prueba este arrego; solo difiere donde se corta.
--
-- Con `ANALISIS_TOPE_DIARIO=2`, tres requests del MISMO usuario JWT, donde el
-- tercero cae mas de una hora despues del primero. Los dos primeros dan 200 y el
-- tercero tiene que dar 429 — si da 200, la poda sigue borrando la fila de hoy y
-- el tope es decorativo. Verifique ademas la huella del deploy en la respuesta
-- (`x-omicron-build`: el valor del `const BUILD` del archivo que se desplego). Un
-- 429 de la funcion VIEJA tambien
-- llega, y no prueba nada de este archivo.
