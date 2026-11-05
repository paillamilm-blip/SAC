-- Prueba de 10015_perfil_lista_blanca.sql en un Postgres REAL (la corre .github/workflows/sql.yml).
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/perfil_lista_blanca.test.sql   (desde la raíz)
-- Comprueba el hallazgo H-B: el trigger revierte columnas protegidas escritas por el cliente y deja
-- pasar las editables. El trigger distingue por `current_user`, así que se prueba con un rol real.

\set ON_ERROR_STOP on

-- ── Simulación mínima ───────────────────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;

-- profiles con columnas editables y protegidas (como las de 0062/0082), más updated_at.
create table if not exists public.profiles (id uuid primary key);
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists is_premium boolean default false;
alter table public.profiles add column if not exists competencias_validadas integer default 0;
alter table public.profiles add column if not exists skills_detail jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- updated_at debe avanzar aunque esté fuera de la lista blanca: el trigger de la migración lo pone en now().
grant select, update on public.profiles to authenticated;

insert into public.profiles (id, bio, is_premium, competencias_validadas)
  values ('00000000-0000-0000-0000-0000000000aa', 'viejo', false, 0)
  on conflict (id) do nothing;

-- ── Aplicar la migración DOS veces (idempotente) ───────────────────────────────────────────────────────
\i supabase/migrations/10015_perfil_lista_blanca.sql
\i supabase/migrations/10015_perfil_lista_blanca.sql

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_protect_profile' and tgrelid='public.profiles'::regclass) then
    raise exception 'FALLO: el trigger trg_protect_profile no quedó creado';
  end if;
end $$;

-- ── Como CLIENTE (authenticated): intenta escalar privilegios en su propia fila ─────────────────────────
set role authenticated;
do $$
declare t record;
begin
  raise notice 'DIAG current_user=% session_user=%', current_user, session_user;
  for t in select tgname, tgenabled from pg_trigger where tgrelid='public.profiles'::regclass and not tgisinternal loop
    raise notice 'DIAG trigger en profiles: % (enabled=%)', t.tgname, t.tgenabled;
  end loop;
  raise notice 'DIAG k_editables contiene bio? -> definición:';
  raise notice '%', (select pg_get_functiondef('public.protect_profile_columns()'::regprocedure));
end $$;
update public.profiles
  set is_premium = true, competencias_validadas = 99,
      skills_detail = '[{"name":"React","pct":100}]'::jsonb,
      bio = 'nuevo', location = 'Santiago'
  where id = '00000000-0000-0000-0000-0000000000aa';
reset role;
do $$
declare r public.profiles;
begin
  select * into r from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  raise notice 'DIAG tras update: bio=% location=% is_premium=% comp=%', r.bio, r.location, r.is_premium, r.competencias_validadas;
end $$;

do $$
declare r public.profiles;
begin
  select * into r from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  -- Protegidas: revertidas.
  if r.is_premium is distinct from false then raise exception 'FALLO: is_premium se pudo escalar'; end if;
  if r.competencias_validadas is distinct from 0 then raise exception 'FALLO: competencias_validadas se pudo escalar'; end if;
  if r.skills_detail::text <> '[]' then raise exception 'FALLO: skills_detail se pudo falsear (quedó %)', r.skills_detail; end if;
  -- Editables: sí persisten.
  if r.bio <> 'nuevo' then raise exception 'FALLO: bio editable no persistió (quedó %)', r.bio; end if;
  if r.location <> 'Santiago' then raise exception 'FALLO: location editable no persistió'; end if;
end $$;

-- ── El servidor (service_role / postgres en el test) SÍ puede escribir lo protegido ─────────────────────
update public.profiles set is_premium = true where id = '00000000-0000-0000-0000-0000000000aa';
do $$
declare v boolean;
begin
  select is_premium into v from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v is distinct from true then raise exception 'FALLO: el servidor no pudo escribir is_premium'; end if;
end $$;

select 'OK: 10015 lista blanca — el cliente no escala columnas protegidas, el servidor sí, lo editable persiste' as resultado;
