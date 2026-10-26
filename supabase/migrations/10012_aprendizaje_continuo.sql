-- =====================================================================
-- 10012_aprendizaje_continuo.sql — El aprendizaje continuo echa raices
--
-- EL HECHO: el mapa de brechas vivia en la app CV con db.json local y un
-- solo usuario. La spec de unificacion (2026-10-26, D1-D7) lo trae a
-- Omicrom: las brechas y sus estados pasan a la BD con RLS para que el
-- progreso sea continuo entre dispositivos (ley de salida §1).
--
-- IDENTIDAD DE SKILL (spec §4, regla que el plan perdió y este archivo
-- repone): una brecha se identifica por su titulo normalizado dentro del
-- usuario. Un CV nuevo que vuelve a detectar una skill ya confirmada,
-- rechazada o dominada REFRESCA esa fila en vez de crear un duplicado que el
-- usuario tiene que rechazar analisis tras analisis (columna
-- titulo_normalizado + indice unico brechas_unica_skill + on conflict de
-- guardar_analisis_completo).
--
-- MAQUINA DE ESTADOS (espejo en src/features/gemelo/services/brechas.ts):
--   detectada  -> confirmada | rechazada
--   confirmada -> dominada   | rechazada
--   rechazada  -> confirmada            (reactivacion)
--   dominada   -> (terminal, no revierte)
-- Fuera de orden: RAISE EXCEPTION con texto legible, no silencio.
-- =====================================================================

create table if not exists public.analisis_cv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre_archivo text not null default 'cv',
  ocupacion text,
  nivel text,
  resumen text,
  proveedor text not null default 'openrouter',
  simulado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists analisis_cv_user_idx
  on public.analisis_cv (user_id, created_at desc);

create table if not exists public.brechas_aprendizaje (
  id uuid primary key default gen_random_uuid(),
  analisis_id uuid not null references public.analisis_cv(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('dura','blanda','conocimiento','credencial')),
  titulo text not null,
  evidencia text not null default '',
  por_que_importa text not null default '',
  severidad text not null default 'media' check (severidad in ('alta','media','baja')),
  aprender_que text not null default '',
  aprender_como text not null default '',
  aprender_demuestro text not null default '',
  state text not null default 'detectada'
    check (state in ('detectada','confirmada','rechazada','dominada')),
  confirmed_at timestamptz,
  mastered_at timestamptz,
  created_at timestamptz not null default now(),
  -- Identidad de la skill: el titulo sin espacios corridos ni mayusculas. Es
  -- generada (STORED), nadie la escribe a mano, y por eso el indice unico no
  -- puede quedar a merced del que llama.
  titulo_normalizado text GENERATED ALWAYS AS
    (lower(trim(regexp_replace(titulo, '\s+', ' ', 'g')))) STORED
);
create index if not exists brechas_user_state_idx
  on public.brechas_aprendizaje (user_id, state, created_at desc);
-- Una sola fila por skill por usuario: es lo que impide que cada analisis
-- re-cree la brecha que el usuario ya confirmo, rechazo o domino.
create unique index if not exists brechas_unica_skill
  on public.brechas_aprendizaje (user_id, titulo_normalizado);

alter table public.analisis_cv enable row level security;
alter table public.brechas_aprendizaje enable row level security;

drop policy if exists analisis_sueno on public.analisis_cv;
create policy analisis_sueno on public.analisis_cv
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists brechas_sueno on public.brechas_aprendizaje;
create policy brechas_sueno on public.brechas_aprendizaje
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- No hay policy de INSERT para anon: el guardado pasa por la RPC
-- (guardar_analisis_completo), security definer que recibe la identidad ya
-- verificada por p_user_id; si hay sesion (auth.uid() no nulo) la bloquea
-- contra auth.uid(), y con service_role (auth.uid() nulo) confia en p_user_id.

-- ---------- Realtime: la tabla tiene que mutar cambios ----------
-- La ley de salida (spec §1: un paso visto en el Gemelo y en la red en <3 s)
-- no arranca si `brechas_aprendizaje` no esta en la publicacion: los
-- suscriptores postgres_changes de Plan B no reciben nada. Va en ESTE archivo
-- porque es el mismo paste y porque sin esto la ley queda en cero. PG no tiene
-- `if not exists` para publications, asi que se consulta el catalogo: pegar dos
-- veces no puede fallar.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No existe la publicacion supabase_realtime: el realtime de brechas no queda activo.';
  elsif not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'brechas_aprendizaje'
  ) then
    alter publication supabase_realtime add table public.brechas_aprendizaje;
    raise notice 'brechas_aprendizaje: agregada a la publicacion supabase_realtime.';
  else
    raise notice 'brechas_aprendizaje: ya estaba en supabase_realtime, no se duplica.';
  end if;
end $$;

-- ---------- Chequeo pre-pegado (M9) ----------
-- Antes de pegar este archivo, mirar que definiciones estan VIVAS en
-- produccion. Las dos RPCs se instalan con `create or replace`, y ese comando
-- NO puede cambiar el tipo de retorno: si ya existe una version vieja con otra
-- firma o otro retorno, este archivo no la reemplaza y el guardado habla con la
-- funcion equivocada sin ruido.
--
-- select proname, pg_get_function_arguments(oid), pg_get_function_result(oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where proname in ('marcar_brecha','guardar_analisis_completo');
--   expected: 0 filas. Si algo aparece, es un pegado viejo con firma o retorno
--   distinto: este archivo hace CREATE OR REPLACE y NO puede cambiar el tipo de
--   retorno. Hay que dropear la funcion vieja primero (decirlo explicitamente).
--
-- Lo mismo con la tabla: `create table if not exists` tampoco repara una tabla
-- ya creada sin la columna generada de la identidad de skill.
--
-- select column_name from information_schema.columns
--  where table_name = 'brechas_aprendizaje' and column_name = 'titulo_normalizado';
--   expected: 1 fila despues de pegar; 0 filas = existia una version vieja de la
--   tabla (las brechas de ese pegado son de prueba: 10012 aun no se aplico en
--   produccion) y hay que dropear public.brechas_aprendizaje antes de re-pegar.
--
-- ---------- RPC: marcar_brecha ----------
create or replace function public.marcar_brecha(p_brecha uuid, p_state text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.brechas_aprendizaje%rowtype;
  v_now timestamptz := now();
begin
  select * into r from public.brechas_aprendizaje
   where id = p_brecha and user_id = auth.uid();
  if not found then
    -- El texto llega al cliente tal cual (PostgREST P0001 -> HTTP 400): se
    -- escribe para una persona, no como centinela de log.
    raise exception 'No encontramos ese aprendizaje entre los tuyos. Refresca la página y si sigue, volvé a marcarlo desde la lista.';
  end if;

  if p_state = r.state then
    return to_jsonb(r);
  end if;

  if (r.state = 'detectada' and p_state in ('confirmada','rechazada'))
  or (r.state = 'confirmada' and p_state in ('dominada','rechazada'))
  or (r.state = 'rechazada' and p_state = 'confirmada') then
    update public.brechas_aprendizaje
       set state = p_state,
           -- Entrar a confirmada SIEMPRE marca la fecha (M3): al reactivar una
           -- brecha rechazada, confirmed_at vieja dejaria de ordenar el camino
           -- global por fecha real de confirmacion.
           confirmed_at = case when p_state = 'confirmada' then v_now else confirmed_at end,
           mastered_at = case when p_state = 'dominada' then v_now else mastered_at end
     where id = p_brecha
     returning * into r;
    return to_jsonb(r);
  end if;

  if r.state = 'dominada' then
    raise exception 'Ya marcaste esto como dominado — no se puede volver atrás';
  end if;
  raise exception 'Transición no permitida desde % a %', r.state, p_state;
end $$;
revoke all on function public.marcar_brecha(uuid, text) from public, anon;
grant execute on function public.marcar_brecha(uuid, text) to authenticated;

-- ---------- RPC: guardar_analisis_completo ----------
-- security definer a proposito: esta RPC la invoca la Edge Function analizar-cv
-- con la service key (sin JWT de usuario en la conexion). Con security invoker,
-- auth.uid() es NULL dentro del servicio y el guardado jamas funcionaria
-- (hallazgo T6, 2026-10-26). La identidad llega explicita por p_user_id y la
-- valida la funcion. OBLIGACION de quien la llame: p_user_id debe salir de un
-- getUser() verificado con el JWT del usuario (analizar-cv lo hace) — nunca del
-- cuerpo de la request. La funcion solo escribe filas PROPIAS (inserta las
-- skills nuevas y refresca las ya conocidas del mismo usuario); nunca lee ni
-- muta ajenas. El guardado es un upsert por (user_id, titulo_normalizado): es
-- la regla del spec §4, la que impide que cada CV vuelva a crear la brecha que
-- el usuario ya confirmo, rechazo o domino.
create or replace function public.guardar_analisis_completo(p_cv jsonb, p_brechas jsonb, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_analisis_id uuid;
  v_brechas_ids jsonb;
begin
  if v_uid is null then
    raise exception 'Para guardar tu análisis necesitás iniciar sesión. Volvé a intentarlo.';
  end if;
  if not exists (select 1 from auth.users where id = v_uid) then
    raise exception 'Esa cuenta ya no existe en Ómicrom. Volvé a iniciar sesión para guardar tu análisis.';
  end if;
  -- Bloqueo de suplantacion (hallazgo T6 review): un usuario autenticado solo
  -- puede guardar para si mismo. Con sesion activa, auth.uid() manda y p_user_id
  -- ajeno se rechaza. Con service_role auth.uid() es nulo (la Edge Function
  -- analizar-cv trae la identidad desde un getUser() verificado), asi que pasa.
  if auth.uid() is not null and auth.uid() <> v_uid then
    raise exception 'Solo podés guardar tus propios análisis.';
  end if;
  -- Tope por request (I3): el validador del Edge Function ya corta en 12, pero
  -- la RPC se puede invocar directo. Sin este candado, un solo llamado puede
  -- insertar miles de filas propias.
  if jsonb_array_length(coalesce(p_brechas, '[]'::jsonb)) > 12 then
    raise exception 'Un análisis trae a lo sumo 12 brechas.';
  end if;

  insert into public.analisis_cv
    (user_id, nombre_archivo, ocupacion, nivel, resumen, proveedor, simulado)
  values
    (v_uid,
     coalesce(p_cv->>'nombre_archivo', 'cv'),
     p_cv->>'ocupacion', p_cv->>'nivel', p_cv->>'resumen',
     coalesce(p_cv->>'proveedor', 'openrouter'),
     coalesce((p_cv->>'simulado')::boolean, false))
  returning id into v_analisis_id;

  with ins as (
    insert into public.brechas_aprendizaje
      (analisis_id, user_id, categoria, titulo, evidencia, por_que_importa,
       severidad, aprender_que, aprender_como, aprender_demuestro)
    select
      v_analisis_id, v_uid,
      b->>'categoria',
      coalesce(b->>'titulo', 'brecha'),
      coalesce(b->>'evidencia', ''),
      coalesce(b->>'porQueImporta', b->>'por_que_importa', ''),
      coalesce(b->>'severidad', 'media'),
      coalesce(b->'aprender'->>'que', ''),
      coalesce(b->'aprender'->>'como', ''),
      coalesce(b->'aprender'->>'comoLoDemuestro', b->'aprender'->>'como_lo_demuestro', '')
    -- Una misma skill puede aparecer dos veces en UN run (la IA repite). Dos
    -- filas al mismo conflicto en un solo comando dan error 21000 y se llevan
    -- puesto TODO el guardado, asi que queda la primera aparicion de cada titulo
    -- normalizado; el orden lo da la posicion en el array (ordinality).
    from (
      select x as b,
             row_number() over (
               partition by lower(trim(regexp_replace(
                   coalesce(x->>'titulo', 'brecha'), '\s+', ' ', 'g')))
               order by ord
             ) as rn
      from jsonb_array_elements(coalesce(p_brechas, '[]'::jsonb))
           with ordinality as e(x, ord)
    ) as skills
    where skills.rn = 1
    -- Identidad de skill (spec §4, I4): la skill ya conocida se REFRESCA, no se
    -- duplica. Van los campos descriptivos del run nuevo (y el analisis_id que
    -- los trajo); a proposito NO se tocan state, confirmed_at, mastered_at,
    -- titulo ni created_at: lo que el usuario confirmo, rechazo o domino sigue
    -- donde estaba, y el mapa no le reinicia el progreso a una skill repetida.
    --
    -- `returning id` cubre las DOS ramas: con ON CONFLICT DO UPDATE, Postgres
    -- devuelve la fila actualizada, o sea el id preexistente de la skill ya
    -- conocida. Por eso el array de abajo trae un id por cada brecha del run,
    -- nunca menos (con DO NOTHING faltarian los ids de las filas en conflicto,
    -- y el cliente habria quedado suscrito a una lista corta: perdida de datos).
    on conflict (user_id, titulo_normalizado) do update
       set analisis_id       = excluded.analisis_id,
           evidencia         = excluded.evidencia,
           por_que_importa   = excluded.por_que_importa,
           aprender_que      = excluded.aprender_que,
           aprender_como     = excluded.aprender_como,
           aprender_demuestro = excluded.aprender_demuestro,
           severidad         = excluded.severidad
    returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_brechas_ids from ins;

  return jsonb_build_object('analisis_id', v_analisis_id, 'brechas', v_brechas_ids);
end $$;
revoke all on function public.guardar_analisis_completo(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.guardar_analisis_completo(jsonb, jsonb, uuid) to authenticated, service_role;

-- Verificacion post-aplicacion (ejecutar en la misma ventana):
-- select count(*) from information_schema.tables where table_name in ('analisis_cv','brechas_aprendizaje');
--   expected: 2
-- select count(*) from pg_policies where tablename in ('analisis_cv','brechas_aprendizaje');
--   expected: 2
--
-- La identidad de skill (spec §4) instalada: la columna generada y su indice
-- unico. Debe devolver 1 y 1:
-- select count(*) from information_schema.columns
--  where table_name = 'brechas_aprendizaje' and column_name = 'titulo_normalizado';
-- select count(*) from pg_indexes
--  where tablename = 'brechas_aprendizaje' and indexname = 'brechas_unica_skill';
--   0 en cualquiera de las dos = la tabla ya existia de un pegado viejo; ver el
--   chequeo pre-pegado de arriba (hay que dropear y re-pegar el archivo entero).
--
-- La tabla mutando en realtime (sin esto la ley de salida <3 s no arranca).
-- Debe devolver 1 fila:
-- select schemaname, tablename from pg_publication_tables
--  where pubname = 'supabase_realtime' and tablename = 'brechas_aprendizaje';
--   0 filas = la publicacion existe pero el DO no la agrego (o el rol del Editor
--   no tiene permiso): el Plan B no va a recibir postgres_changes.
--
-- Prueba del bloqueo anti-suplantacion (la corre el humano con un JWT authenticated
-- propio, no con service key): llamar la RPC con p_user_id de OTRO usuario,
--   select guardar_analisis_completo('{"nombre_archivo":"t"}'::jsonb, '[]'::jsonb, '<uuid-ajeno>')
--   expected: ERROR 400 "Solo podés guardar tus propios análisis." (auth.uid() <> p_user_id).
-- Con service_role (auth.uid() nulo, como la Edge Function analizar-cv) la misma
--   llamada con p_user_id valido SI pasa — el guardado server-side no se rompe.
--
-- Prueba de la identidad de skill (con service_role, o con el propio JWT): el
-- MISMO titulo dos veces en dos runs debe dejar UNA sola fila y conservar el
-- estado que el usuario ya le puso.
--   select guardar_analisis_completo('{"nombre_archivo":"a"}'::jsonb,
--          '[{"categoria":"conocimiento","titulo":"Excel avanzado"}]'::jsonb, null);
--   select marcar_brecha('<id devuelto>', 'rechazada');
--   select guardar_analisis_completo('{"nombre_archivo":"b"}'::jsonb,
--          '[{"categoria":"conocimiento","titulo":"  excel   AVANZADO "}]'::jsonb, null);
--   select count(*), min(state), min(analisis_id::text) from brechas_aprendizaje
--    where user_id = auth.uid() and titulo_normalizado = 'excel avanzado';
--     expected: count = 1, state = 'rechazada' (no se reabrio), y analisis_id del
--     run "b" (el descriptivo si se refresco). count = 2 = el indice unico no esta.

-- Para que la API nueva (RPCs/tablas) quede visible sin reinicio:
notify pgrst, 'reload schema';
