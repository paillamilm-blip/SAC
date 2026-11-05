-- =====================================================================
-- 10014 · tablas sociales: cerrar la lectura anónima (auditoría H-A / R4)
-- =====================================================================
--
-- QUÉ: mismas que `profiles` (10013), estas cuatro quedaron `for select using (true)`:
--   · job_postings   (0004_jobs_chat.sql:36)  — ofertas de trabajo
--   · job_matches    (0004_jobs_chat.sql:39)  — a quién se le ofreció cada trabajo (user_id)
--   · follows        (0067_social_follows_ghosts.sql:18) — quién sigue a quién
--   · freelance_needs(0069_freelance_needs.sql:39) — necesidades freelance (publisher_id)
--   Cualquiera con la anon key las lee enteras.
--
-- POR QUÉ: `job_matches` y `follows` son el grafo social de las personas (quién recibió
--   qué oferta, quién sigue a quién). `freelance_needs` lleva `publisher_id`. Nada de esto
--   debe ser público. Hoy ninguna pantalla viva de /u las lee (producto recortado; el mercado
--   y la red social se retiraron), así que cerrarlas no quita nada que se vea.
--
-- CRITERIO POR TABLA:
--   · job_matches, follows, freelance_needs → lectura SOLO de lo propio (su columna de dueño).
--   · job_postings → sin dueño claro por fila (company_id puede ser null); se cierra a
--     lectura con sesión (to authenticated using true). Si más adelante hay un mercado real,
--     se abre con la regla que corresponda; hoy el objetivo es que anon no lea.
--
-- CÓMO APLICAR: pegar en una COPIA del proyecto, correr el VERIFY, y luego en producción.
--   NO usar `migration repair`.
--
-- ── VERIFY (con la anon key, SIN sesión; antes devuelven filas, después 0/401) ─────────
--   for t in job_postings job_matches follows freelance_needs; do
--     curl "https://<PROJECT>.supabase.co/rest/v1/$t?select=id&limit=1" -H "apikey: <ANON_KEY>"; done
--
-- ── ROLLBACK (reabre; solo si algo imprevisto dependía de la lectura pública) ─────────
--   create policy "jobs_read"   on public.job_postings    for select using (true);
--   create policy "matches_read" on public.job_matches    for select using (true);
--   create policy follows_read   on public.follows         for select using (true);
--   create policy fn_read        on public.freelance_needs for select using (true);
--
-- Idempotente. Cada bloque tolera que la tabla no exista en este entorno.
-- =====================================================================

-- job_postings: lectura con sesión (sin dueño por fila).
do $do$
begin
  execute 'alter table public.job_postings enable row level security';
  execute 'drop policy if exists "jobs_read" on public.job_postings';
  execute 'drop policy if exists "job_postings_read_auth" on public.job_postings';
  execute 'create policy "job_postings_read_auth" on public.job_postings for select to authenticated using (true)';
exception when undefined_table then null;
end;
$do$;

-- job_matches: cada quien ve solo sus coincidencias.
do $do$
begin
  execute 'alter table public.job_matches enable row level security';
  execute 'drop policy if exists "matches_read" on public.job_matches';
  execute 'drop policy if exists "job_matches_read_own" on public.job_matches';
  execute 'create policy "job_matches_read_own" on public.job_matches for select to authenticated using (user_id = auth.uid())';
exception when undefined_table then null;
end;
$do$;

-- follows: solo las relaciones en las que la persona participa.
do $do$
begin
  execute 'alter table public.follows enable row level security';
  execute 'drop policy if exists follows_read on public.follows';
  execute 'drop policy if exists follows_read_own on public.follows';
  execute 'create policy follows_read_own on public.follows for select to authenticated using (follower_id = auth.uid() or followed_id = auth.uid())';
exception when undefined_table then null;
end;
$do$;

-- freelance_needs: solo lo que la persona publicó.
do $do$
begin
  execute 'alter table public.freelance_needs enable row level security';
  execute 'drop policy if exists fn_read on public.freelance_needs';
  execute 'drop policy if exists freelance_needs_read_own on public.freelance_needs';
  execute 'create policy freelance_needs_read_own on public.freelance_needs for select to authenticated using (publisher_id = auth.uid())';
exception when undefined_table then null;
end;
$do$;

-- ── VERIFY embebido: ninguna de las cuatro conserva una política de SELECT abierta ──
do $do$
declare abiertas int;
begin
  select count(*) into abiertas
  from pg_policies
  where schemaname = 'public'
    and tablename in ('job_postings','job_matches','follows','freelance_needs')
    and cmd = 'SELECT'
    and qual = 'true';
  if abiertas > 0 then
    raise exception 'quedan % política(s) de SELECT abiertas en tablas sociales', abiertas;
  end if;
  raise notice 'OK: tablas sociales sin lectura anónima.';
end;
$do$;
