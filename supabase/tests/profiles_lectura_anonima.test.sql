-- Prueba de 10013_perfiles_sin_lectura_anonima.sql contra un Postgres REAL (la corre .github/workflows/sql.yml).
-- Comprueba el hallazgo H-A de la auditoría: tras la migración, `profiles` NO tiene lectura abierta y una
-- persona con sesión lee SOLO su propio perfil. Un Postgres común no trae Supabase, así que se simula lo mínimo.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/profiles_lectura_anonima.test.sql   (desde la raíz del repo)

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
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- `profiles` como la crea 0001_core.sql, con la política ABIERTA que la auditoría reporta (el punto de partida).
create table if not exists public.profiles (id uuid primary key, display_name text);
alter table public.profiles enable row level security;
grant select on public.profiles to anon, authenticated;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
insert into public.profiles values
  ('00000000-0000-0000-0000-00000000000a', 'Ana'),
  ('00000000-0000-0000-0000-00000000000b', 'Beto')
  on conflict do nothing;

-- ── 0. Antes de la migración: la lectura abierta existe (confirma que la prueba mide algo real) ─────────
do $$
declare abiertas int;
begin
  select count(*) into abiertas from pg_policies
   where schemaname='public' and tablename='profiles' and cmd='SELECT' and qual='true';
  if abiertas <> 1 then raise exception 'FALLO (base): esperaba 1 política abierta antes de migrar, hay %', abiertas; end if;
end $$;

-- ── 1. Aplicar la migración DOS veces (idempotente) ─────────────────────────────────────────────────────
\i supabase/migrations/10013_perfiles_sin_lectura_anonima.sql
\i supabase/migrations/10013_perfiles_sin_lectura_anonima.sql

-- ── 2. Ya no hay lectura abierta, y la política nueva es solo para authenticated ────────────────────────
do $$
declare abiertas int; propias int;
begin
  select count(*) into abiertas from pg_policies
   where schemaname='public' and tablename='profiles' and cmd='SELECT' and qual='true';
  if abiertas <> 0 then raise exception 'FALLO: profiles aún tiene % política(s) de SELECT abiertas', abiertas; end if;

  select count(*) into propias from pg_policies
   where schemaname='public' and tablename='profiles' and policyname='profiles_select_own';
  if propias <> 1 then raise exception 'FALLO: falta la política profiles_select_own'; end if;

  if not exists (select 1 from pg_policies
     where schemaname='public' and tablename='profiles' and policyname='profiles_select_own'
       and 'authenticated' = any(roles)) then
    raise exception 'FALLO: profiles_select_own no está limitada a authenticated';
  end if;
end $$;

-- ── 3. Comportamiento real con RLS: anon no ve nada; cada quien ve solo lo suyo ─────────────────────────
-- anon (sin sesión): 0 filas
set role anon;
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  if n <> 0 then raise exception 'FALLO: anon ve % fila(s) de profiles (debería ver 0)', n; end if;
end $$;
reset role;

-- Ana, con sesión: ve 1 fila (la suya), no la de Beto
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare n int; ajenas int;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FALLO: Ana ve % perfil(es), debería ver solo el suyo', n; end if;
  select count(*) into ajenas from public.profiles where id <> auth.uid();
  if ajenas <> 0 then raise exception 'FALLO: Ana ve % perfil(es) ajeno(s)', ajenas; end if;
end $$;
reset request.jwt.claim.sub;
reset role;

select 'OK: 10013 cierra la lectura anónima de profiles y cada quien ve solo lo suyo' as resultado;
