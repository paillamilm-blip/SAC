-- =====================================================================
-- 10012_aprendizaje_continuo.sql — El aprendizaje continuo echa raices
--
-- EL HECHO: el mapa de brechas vivia en la app CV con db.json local y un
-- solo usuario. La spec de unificacion (2026-10-26, D1-D7) lo trae a
-- Omicrom: las brechas y sus estados pasan a la BD con RLS para que el
-- progreso sea continuo entre dispositivos (ley de salida §1).
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
  created_at timestamptz not null default now()
);
create index if not exists brechas_user_state_idx
  on public.brechas_aprendizaje (user_id, state, created_at desc);

alter table public.analisis_cv enable row level security;
alter table public.brechas_aprendizaje enable row level security;

create policy analisis_sueno on public.analisis_cv
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy brechas_sueno on public.brechas_aprendizaje
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- No hay policy de INSERT para anon: el guardado pasa por la RPC
-- (guardar_analisis_completo), que usa auth.uid() real.

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
    raise exception 'BRECHA_NO_ENCONTRADA';
  end if;

  if p_state = r.state then
    return to_jsonb(r);
  end if;

  if (r.state = 'detectada' and p_state in ('confirmada','rechazada'))
  or (r.state = 'confirmada' and p_state in ('dominada','rechazada'))
  or (r.state = 'rechazada' and p_state = 'confirmada') then
    update public.brechas_aprendizaje
       set state = p_state,
           confirmed_at = case
             when p_state = 'confirmada' and r.confirmed_at is null then v_now
             else confirmed_at end,
           mastered_at = case when p_state = 'dominada' then v_now else mastered_at end
     where id = p_brecha
     returning * into r;
    return to_jsonb(r);
  end if;

  if r.state = 'dominada' then
    raise exception 'Ya marcaste esto como dominado — no se puede volver atras';
  end if;
  raise exception 'Transicion no permitida desde % a %', r.state, p_state;
end $$;
revoke all on function public.marcar_brecha(uuid, text) from public, anon;
grant execute on function public.marcar_brecha(uuid, text) to authenticated;

-- ---------- RPC: guardar_analisis_completo ----------
create or replace function public.guardar_analisis_completo(p_cv jsonb, p_brechas jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_analisis_id uuid;
  v_brechas_ids jsonb;
begin
  if v_uid is null then
    raise exception 'BRECHA_REQUIERE_SESION';
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
    from jsonb_array_elements(coalesce(p_brechas, '[]'::jsonb)) as b
    returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_brechas_ids from ins;

  return jsonb_build_object('analisis_id', v_analisis_id, 'brechas', v_brechas_ids);
end $$;
revoke all on function public.guardar_analisis_completo(jsonb, jsonb) from public, anon;
grant execute on function public.guardar_analisis_completo(jsonb, jsonb) to authenticated;

-- Verificacion post-aplicacion (ejecutar en la misma ventana):
-- select count(*) from information_schema.tables where table_name in ('analisis_cv','brechas_aprendizaje');
--   expected: 2
-- select count(*) from pg_policies where tablename in ('analisis_cv','brechas_aprendizaje');
--   expected: 2
