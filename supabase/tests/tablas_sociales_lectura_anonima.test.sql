-- Prueba de 10014_tablas_sociales_sin_lectura_anonima.sql en un Postgres REAL (la corre .github/workflows/sql.yml).
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/tablas_sociales_lectura_anonima.test.sql   (desde la raíz)
-- Comprueba el hallazgo H-A/R4: tras la migración, anon no lee nada y con sesión cada quien ve SOLO lo suyo.

\set ON_ERROR_STOP on

-- ── Simulación mínima de Supabase ───────────────────────────────────────────────────────────────────────
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Tablas como las dejan 0004/0067/0069, con la política ABIERTA (punto de partida).
create table if not exists public.job_postings (id uuid primary key default gen_random_uuid(), company_id uuid);
create table if not exists public.job_matches (id uuid primary key default gen_random_uuid(), user_id uuid not null);
create table if not exists public.follows (id uuid primary key default gen_random_uuid(), follower_id uuid not null, followed_id uuid not null);
create table if not exists public.freelance_needs (id uuid primary key default gen_random_uuid(), publisher_id uuid not null);
do $$ begin
  execute 'alter table public.job_postings enable row level security';
  execute 'alter table public.job_matches enable row level security';
  execute 'alter table public.follows enable row level security';
  execute 'alter table public.freelance_needs enable row level security';
end $$;
grant select on public.job_postings, public.job_matches, public.follows, public.freelance_needs to anon, authenticated;
create policy "jobs_read"    on public.job_postings    for select using (true);
create policy "matches_read" on public.job_matches     for select using (true);
create policy follows_read   on public.follows          for select using (true);
create policy fn_read        on public.freelance_needs  for select using (true);

-- Datos: A es dueña de una fila en cada tabla; B de otra.
\set A '00000000-0000-0000-0000-0000000000aa'
\set B '00000000-0000-0000-0000-0000000000bb'
insert into public.job_matches (user_id) values (:'A'), (:'B');
insert into public.follows (follower_id, followed_id) values (:'A', :'B'), (:'B', :'A'::uuid);
-- (la 2ª fila de follows también involucra a A como followed → A debe ver ambas)
insert into public.freelance_needs (publisher_id) values (:'A'), (:'B');
insert into public.job_postings (company_id) values (:'A'), (null);

-- ── 0. Antes de migrar: 4 políticas abiertas (la prueba mide algo real) ─────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname='public' and tablename in ('job_postings','job_matches','follows','freelance_needs')
     and cmd='SELECT' and qual='true';
  if n <> 4 then raise exception 'FALLO (base): esperaba 4 políticas abiertas, hay %', n; end if;
end $$;

-- ── 1. Aplicar la migración DOS veces (idempotente) ─────────────────────────────────────────────────────
\i supabase/migrations/10014_tablas_sociales_sin_lectura_anonima.sql
\i supabase/migrations/10014_tablas_sociales_sin_lectura_anonima.sql

do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname='public' and tablename in ('job_postings','job_matches','follows','freelance_needs')
     and cmd='SELECT' and qual='true';
  if n <> 0 then raise exception 'FALLO: quedan % política(s) de SELECT abiertas', n; end if;
end $$;

-- ── 2. anon no ve nada en ninguna de las cuatro ─────────────────────────────────────────────────────────
set role anon;
do $$
declare n int;
begin
  select (select count(*) from public.job_postings)
       + (select count(*) from public.job_matches)
       + (select count(*) from public.follows)
       + (select count(*) from public.freelance_needs) into n;
  if n <> 0 then raise exception 'FALLO: anon ve % fila(s) en tablas sociales (debería ver 0)', n; end if;
end $$;
reset role;

-- ── 3. Con sesión (A): ve solo lo suyo ──────────────────────────────────────────────────────────────────
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
do $$
declare matches int; follows_n int; needs int;
begin
  select count(*) into matches from public.job_matches;        -- solo la de A
  if matches <> 1 then raise exception 'FALLO: A ve % job_matches, esperaba 1', matches; end if;

  select count(*) into follows_n from public.follows;          -- A participa en las 2 filas
  if follows_n <> 2 then raise exception 'FALLO: A ve % follows, esperaba 2', follows_n; end if;

  select count(*) into needs from public.freelance_needs;      -- solo la de A
  if needs <> 1 then raise exception 'FALLO: A ve % freelance_needs, esperaba 1', needs; end if;
end $$;
reset request.jwt.claim.sub;
reset role;

select 'OK: 10014 cierra la lectura anónima de las tablas sociales y cada quien ve solo lo suyo' as resultado;
