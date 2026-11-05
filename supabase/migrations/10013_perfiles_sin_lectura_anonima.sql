-- =====================================================================
-- 10013 · profiles: cerrar la lectura anónima (auditoría H-A / R1)
-- =====================================================================
--
-- QUÉ: hoy `profiles_select_all ... for select using (true)` (0001_core.sql:100)
--   deja que CUALQUIERA con la anon key lea toda la tabla `profiles`. Ninguna
--   migración posterior la revoca. Esta la reemplaza por lectura con sesión.
--
-- POR QUÉ: `profiles` tiene nombre, correo (vía join), color, bio y campos del
--   gemelo. Nada de eso debe ser público. El producto `/u` solo lee el perfil
--   de la persona con sesión (ProfileContext.tsx:57,:139, onboardingSync.ts:96,
--   userColorSync.ts:47) — ninguno necesita leer perfiles ajenos.
--
-- RIESGO SI ROMPE: si alguna pantalla pública (p. ej. un perfil compartible)
--   dependiera de leer `profiles` sin sesión, dejaría de verse. Verificado en
--   código (2026-11-04): esa pantalla no existe en /u. La verificación pública
--   de credenciales va por la Edge Function `credential`, no por esta tabla.
--
-- CÓMO APLICAR: pegar en el SQL Editor de una COPIA del proyecto primero, correr
--   el VERIFY, y recién después en producción. NO usar `migration repair`.
--
-- ── VERIFY (correr después, con la anon key, SIN sesión) ──────────────
--   Antes de esta migración: devuelve filas.
--   Después: debe devolver 401 o 200 con 0 filas.
--     curl 'https://<PROJECT>.supabase.co/rest/v1/profiles?select=id&limit=1' \
--       -H 'apikey: <ANON_KEY>'
--   Y con una cuenta de prueba (CON sesión), su propio perfil SÍ se lee:
--     select count(*) from public.profiles where id = auth.uid();  -- 1
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   drop policy if exists "profiles_select_own" on public.profiles;
--   create policy "profiles_select_all" on public.profiles for select using (true);
--   (reabre la lectura pública; solo si algo imprevisto dependía de ella)
--
-- Idempotente.
-- =====================================================================

alter table public.profiles enable row level security;

-- Fuera la lectura abierta.
drop policy if exists "profiles_select_all" on public.profiles;

-- Lectura solo con sesión, y solo del propio perfil.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- ── VERIFY embebido: deja constancia del estado tras aplicar ──────────
-- Debe listar la política nueva y NINGUNA `using (true)` de select sobre profiles.
do $do$
declare
  abiertas int;
begin
  select count(*) into abiertas
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles'
    and cmd = 'SELECT'
    and qual = 'true';
  if abiertas > 0 then
    raise exception 'profiles aún tiene % política(s) de SELECT abiertas (using true)', abiertas;
  end if;
  raise notice 'OK: profiles sin lectura anónima (solo profiles_select_own, con sesión).';
end;
$do$;
