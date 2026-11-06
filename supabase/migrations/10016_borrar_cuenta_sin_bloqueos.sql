-- =====================================================================
-- 10016 · borrar una cuenta no puede fallar por datos de OTRA persona
-- =====================================================================
--
-- QUÉ: borrar una cuenta borra `auth.users` → `profiles` → (en cascada) todo lo de la persona. Dos columnas apuntan a
--   `profiles` SIN regla de borrado, y bloquearían ese borrado con un error de clave foránea:
--     · credentials.verified_by       (0013_credentials.sql:28)    — quién verificó la credencial de OTRA persona
--     · freelance_needs.selected_id   (0069_freelance_needs.sql:24) — a quién eligió OTRA persona para un trabajo
--   Las dos son datos de OTRA persona que solo nombran a quien se va. Esta migración las pasa a `on delete set null`:
--   la fila de la otra persona se conserva y solo pierde la referencia.
--
-- ESTADO EN PRODUCCIÓN (consultado por la dueña 2026-11-05): `freelance_needs` no existe. `credentials` no se consultó.
--   Cada bloque tolera que la tabla o la columna no existan.
--
-- CÓMO APLICAR: pegar en el SQL Editor. NO usar `migration repair` ni `db push`. Idempotente.
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as definicion
--   from pg_constraint
--   where contype = 'f' and confrelid = 'public.profiles'::regclass
--     and pg_get_constraintdef(oid) not ilike '%on delete%';
--   -- Debe devolver 0 filas: ninguna referencia a profiles sin regla de borrado.
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   No hace falta: `set null` solo cambia qué pasa al borrar una cuenta.
-- =====================================================================

do $do$
declare
  r record;
  objetivo record;
begin
  for objetivo in
    select * from (values ('credentials', 'verified_by'), ('freelance_needs', 'selected_id')) as t(tabla, columna)
  loop
    if to_regclass('public.' || objetivo.tabla) is null then
      raise notice '10016: la tabla % no existe en este proyecto, se omite', objetivo.tabla;
      continue;
    end if;

    -- La(s) clave(s) foránea(s) de esa columna hacia profiles, sea cual sea su nombre.
    for r in
      select c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.contype = 'f'
        and c.conrelid = ('public.' || objetivo.tabla)::regclass
        and c.confrelid = 'public.profiles'::regclass
        and a.attname = objetivo.columna
    loop
      execute format('alter table public.%I drop constraint %I', objetivo.tabla, r.conname);
    end loop;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = objetivo.tabla and column_name = objetivo.columna
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete set null',
        objetivo.tabla, objetivo.tabla || '_' || objetivo.columna || '_fkey', objetivo.columna
      );
      raise notice '10016: %.% ahora es on delete set null', objetivo.tabla, objetivo.columna;
    end if;
  end loop;
end;
$do$;

-- ── VERIFY embebido: ninguna referencia a profiles puede quedar sin regla de borrado ──
do $do$
declare
  sin_regla int;
begin
  select count(*) into sin_regla
  from pg_constraint
  where contype = 'f'
    and confrelid = 'public.profiles'::regclass
    and pg_get_constraintdef(oid) not ilike '%on delete%';
  if sin_regla > 0 then
    raise exception '10016: quedan % referencia(s) a profiles sin regla de borrado: borrar una cuenta fallaría', sin_regla;
  end if;
  raise notice 'OK: borrar una cuenta no queda bloqueado por referencias de otras personas.';
end;
$do$;
