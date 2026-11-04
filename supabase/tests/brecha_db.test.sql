-- Prueba de la migración 10012_brecha_db.sql contra un Postgres REAL (la corre .github/workflows/sql.yml).
-- Se ejecuta con:  psql -v ON_ERROR_STOP=1 -f supabase/tests/brecha_db.test.sql   (desde la raíz del repo)
--
-- Un Postgres común no trae lo propio de Supabase, así que primero se simulan: el esquema `auth` con `auth.uid()`
-- (lee `request.jwt.claim.sub`, igual que Supabase), los roles `anon` y `authenticated`, y la tabla `profiles`.
-- Cualquier aserción que falle detiene todo con un error que dice qué falló.

\set ON_ERROR_STOP on

-- ── Simulación mínima de Supabase ───────────────────────────────────────────────────────────────────────
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create table if not exists public.profiles (id uuid primary key);
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into public.profiles values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b')
  on conflict do nothing;

-- ── 1. La migración se aplica, y volver a aplicarla no rompe nada (idempotente) ─────────────────────────
\i supabase/migrations/10012_brecha_db.sql
\i supabase/migrations/10012_brecha_db.sql

do $$
declare n int;
begin
  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'brecha_db';
  if n <> 4 then raise exception 'FALLO: esperaba 4 políticas tras aplicar dos veces y hay %', n; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.brecha_db'::regclass) then
    raise exception 'FALLO: RLS no está activo';
  end if;
  if has_table_privilege('anon', 'public.brecha_db', 'select') then raise exception 'FALLO: anon puede leer'; end if;
  if has_table_privilege('public', 'public.brecha_db', 'select') is distinct from false then raise exception 'FALLO: public puede leer'; end if;
end $$;

-- La fila de B la crea el dueño de la tabla (no pasa por RLS) para comprobar que A no la ve ni la toca.
insert into public.brecha_db (user_id, data) values ('00000000-0000-0000-0000-00000000000b', '{"version":1,"analisis":[]}');

-- ── 2. Persona A con sesión ─────────────────────────────────────────────────────────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$
declare n int; filas int;
begin
  -- No ve nada ajeno
  select count(*) into n from public.brecha_db;
  if n <> 0 then raise exception 'FALLO: A ve % fila(s) ajena(s)', n; end if;

  -- Crea la suya
  insert into public.brecha_db (user_id, data) values ('00000000-0000-0000-0000-00000000000a', '{"version":1,"analisis":[]}');
  select count(*) into n from public.brecha_db;
  if n <> 1 then raise exception 'FALLO: A debería ver solo su fila y ve %', n; end if;

  -- No puede crear una a nombre de B
  begin
    insert into public.brecha_db (user_id, data) values ('00000000-0000-0000-0000-00000000000b', '{"version":1,"analisis":[]}');
    raise exception 'FALLO: A pudo insertar una fila a nombre de B';
  exception when insufficient_privilege or unique_violation then null; end;

  -- No puede modificar la de B (RLS la oculta: 0 filas)
  update public.brecha_db set data = '{"version":1,"analisis":[],"hackeado":true}' where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics filas = row_count;
  if filas <> 0 then raise exception 'FALLO: A modificó % fila(s) de B', filas; end if;

  -- No puede borrar la de B
  delete from public.brecha_db where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics filas = row_count;
  if filas <> 0 then raise exception 'FALLO: A borró % fila(s) de B', filas; end if;

  -- No puede regalar ni robar su propia fila cambiando el dueño
  begin
    update public.brecha_db set user_id = '00000000-0000-0000-0000-00000000000b' where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALLO: A pudo cambiar el dueño de su fila';
  exception when insufficient_privilege or unique_violation then null; end;

  -- Sí puede modificar la suya
  update public.brecha_db set data = '{"version":1,"analisis":[{"id":"x"}]}' where user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics filas = row_count;
  if filas <> 1 then raise exception 'FALLO: A no pudo modificar su propia fila (%)', filas; end if;
end $$;

-- ── 3. El documento debe tener forma y tamaño razonables ────────────────────────────────────────────────
do $$
begin
  begin
    update public.brecha_db set data = '[]'::jsonb where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALLO: se aceptó un documento que no es un objeto';
  exception when check_violation then null; end;

  begin
    update public.brecha_db set data = '{"version":1}'::jsonb where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALLO: se aceptó un documento sin arreglo analisis';
  exception when check_violation then null; end;

  begin
    update public.brecha_db set data = '{"version":1,"analisis":"no"}'::jsonb where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALLO: se aceptó analisis que no es un arreglo';
  exception when check_violation then null; end;

  begin
    update public.brecha_db
       set data = jsonb_build_object('version', 1, 'analisis', jsonb_build_array(repeat(md5(random()::text), 100000)))
     where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALLO: se aceptó un documento de más de 2 MB';
  exception when check_violation then null; end;
end $$;

-- ── 4. updated_at lo pone el servidor: el cliente no puede falsearlo ────────────────────────────────────
select pg_sleep(0.05);
update public.brecha_db set updated_at = '2000-01-01', data = '{"version":1,"analisis":[]}'
 where user_id = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  if (select updated_at from public.brecha_db) < now() - interval '1 minute' then
    raise exception 'FALLO: el cliente pudo fijar updated_at';
  end if;
end $$;

-- Borra la suya
do $$
declare filas int;
begin
  delete from public.brecha_db where user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics filas = row_count;
  if filas <> 1 then raise exception 'FALLO: A no pudo borrar su propia fila (%)', filas; end if;
end $$;

-- ── 5. Sin sesión (anon) no hay acceso a nada ───────────────────────────────────────────────────────────
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  begin
    perform count(*) from public.brecha_db;
    raise exception 'FALLO: anon pudo leer la tabla';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.brecha_db (user_id, data) values ('00000000-0000-0000-0000-00000000000a', '{"version":1,"analisis":[]}');
    raise exception 'FALLO: anon pudo insertar';
  exception when insufficient_privilege then null; end;
end $$;

-- ── 6. Authenticated sin identidad (auth.uid() nulo) tampoco ve ni escribe nada ─────────────────────────
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare n int;
begin
  select count(*) into n from public.brecha_db;
  if n <> 0 then raise exception 'FALLO: sin identidad se ven % fila(s)', n; end if;
  begin
    insert into public.brecha_db (user_id, data) values ('00000000-0000-0000-0000-00000000000a', '{"version":1,"analisis":[]}');
    raise exception 'FALLO: sin identidad se pudo insertar';
  exception when insufficient_privilege then null; end;
end $$;

-- ── 7. Si se borra a la persona, se borra su copia ──────────────────────────────────────────────────────
reset role;
do $$
begin
  delete from public.profiles where id = '00000000-0000-0000-0000-00000000000b';
  if exists (select 1 from public.brecha_db where user_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'FALLO: la copia sobrevivió a la persona';
  end if;
end $$;

select 'OK brecha_db: migración idempotente, RLS por persona, forma y tamaño validados, anon sin acceso' as resultado;
