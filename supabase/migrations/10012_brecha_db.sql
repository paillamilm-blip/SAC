-- =====================================================================
-- 10012_brecha_db.sql — Los análisis de /u se guardan en la cuenta de la persona
--
-- HOY (3-nov-2026) los análisis, brechas y pruebas viven SOLO en el navegador (localStorage): quien cambia de
-- navegador, de equipo o borra los datos del navegador, lo pierde todo. Esta migración crea donde guardarlos.
--
-- DISEÑO: una fila por persona con todos sus análisis como un documento (`data`). Es lo mismo que ya guarda el
-- navegador, así que la app lo fusiona sin conversiones. Tablas separadas por análisis y por brecha serían más
-- prolijas, pero no hacen falta a este volumen y multiplicarían el riesgo.
--
-- SEGURIDAD (RLS): cada persona lee, crea, modifica y borra SOLO su fila. `anon` no tiene acceso. No hay nada que
-- un usuario pueda hacer sobre la fila de otro: la política compara `auth.uid()` con `user_id` en las cuatro
-- operaciones, y el `with check` impide además cambiar `user_id` hacia otra persona.
--
-- LÍMITE: la copia es del propio usuario, así que NO es una fuente de verdad para lo que otras personas ven. La
-- prueba de un examen que aparece dentro (`prueba.actaId`, `puntaje`) es una COPIA para mostrarla en pantalla; lo
-- verificable (la credencial) se lee siempre de `omicron_skill_proofs`, que solo escribe el servidor.
--
-- LÍMITES DE TAMAÑO: `data` debe ser un objeto con un arreglo `analisis` y pesar como máximo ~2 MB, para que una
-- cuenta no pueda usarse como almacén de archivos.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   ⚠ NO usar `supabase db push`: aplicaría también 10003–10010, que siguen pendientes y borran tablas.
--   Es idempotente: pegar TODO este archivo (desde `create table` hasta el `select` final) en el SQL Editor de
--   Supabase y ejecutar. Hay que pegar solo SQL: sin comandos de la terminal ni salida de ellos.
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   El `select` del final debe devolver una fila:
--     tabla_existe = true | rls_activo = true | politicas = 4 | anon_puede_leer = false | autenticado_puede_leer = true
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   drop table public.brecha_db;   -- la app vuelve a guardar solo en el navegador, sin errores
--   (se pierde la copia de la cuenta; lo que cada navegador tiene guardado sigue ahí)
-- =====================================================================

create table if not exists public.brecha_db (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  -- Ojo: un CHECK que da NULL PASA. Si falta la clave `analisis`, jsonb_typeof(NULL) es NULL y la condición dejaría
  -- entrar el documento; por eso el coalesce(…, false): lo que no es claramente un arreglo se rechaza.
  constraint brecha_db_forma check (
    jsonb_typeof(data) = 'object'
    and coalesce(jsonb_typeof(data -> 'analisis') = 'array', false)
  ),
  constraint brecha_db_tamano check (pg_column_size(data) <= 2000000)
);

comment on table public.brecha_db is
  'Copia en la cuenta de los análisis de /u (una fila por persona). RLS: cada quien solo ve y toca la suya. NO es fuente de verdad de las pruebas de examen: esas viven en omicron_skill_proofs (solo el servidor escribe).';

-- updated_at lo pone el servidor en cada modificación (no se confía en el cliente).
create or replace function public.brecha_db_touch()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists brecha_db_touch on public.brecha_db;
create trigger brecha_db_touch
  before update on public.brecha_db
  for each row execute function public.brecha_db_touch();

-- RLS: cada persona, solo su fila, en las cuatro operaciones.
alter table public.brecha_db enable row level security;

do $do$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brecha_db' and policyname = 'brecha_db_leer_propia') then
    create policy brecha_db_leer_propia on public.brecha_db
      for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brecha_db' and policyname = 'brecha_db_crear_propia') then
    create policy brecha_db_crear_propia on public.brecha_db
      for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brecha_db' and policyname = 'brecha_db_actualizar_propia') then
    create policy brecha_db_actualizar_propia on public.brecha_db
      for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brecha_db' and policyname = 'brecha_db_borrar_propia') then
    create policy brecha_db_borrar_propia on public.brecha_db
      for delete to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end;
$do$;

revoke all on public.brecha_db from anon, public;
grant select, insert, update, delete on public.brecha_db to authenticated;

notify pgrst, 'reload schema';

-- Comprobación (debe dar: true | true | 4 | false | true)
select
  to_regclass('public.brecha_db') is not null                                              as tabla_existe,
  (select relrowsecurity from pg_class where oid = 'public.brecha_db'::regclass)          as rls_activo,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'brecha_db') as politicas,
  has_table_privilege('anon', 'public.brecha_db', 'select')                               as anon_puede_leer,
  has_table_privilege('authenticated', 'public.brecha_db', 'select')                      as autenticado_puede_leer;
