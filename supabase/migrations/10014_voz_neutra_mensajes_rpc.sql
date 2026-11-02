-- ══════════════════════════════════════════════════════════════════════
-- 10014 · VOZ NEUTRA EN LOS MENSAJES DE LA BASE
-- ══════════════════════════════════════════════════════════════════════
--
-- El registro rector de la app es el tú neutro ("Sube tu CV", "Prueba de
-- nuevo"). Tres funciones de la base respondían en voseo ("Necesitás",
-- "Probá", "Volvé", "Solo podés"), así que el usuario leía dos voces
-- distintas según dónde naciera el aviso: el cliente hablaba de tú y la
-- RPC, de vos. Estos textos llegan al navegador tal cual (PostgREST P0001
-- -> HTTP 400, o el campo `error` del json), no son mensajes de log.
--
-- NO se toca ninguna migración ya aplicada: se reemplazan los cuerpos de
-- las funciones con la misma copia literal que creó 10002 y 10012, cambiando
-- solo las cadenas. Ninguna consulta, guard, tope ni transición cambia de
-- comportamiento.
--
-- Verificación (SQL Editor, después de pegar):
--   select prosrc from pg_proc where proname in
--     ('omicron_ensure_skill_node','marcar_brecha','guardar_analisis_completo');
--   -> no debe quedar "Necesitás", "Probá", "Volvé", "podés".

create or replace function public.omicron_ensure_skill_node(p_title text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  k_cap_diario constant integer := 20;
  v_uid    uuid := auth.uid();
  v_label  text := nullif(btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g')), '');
  v_key    text;
  v_id     uuid;
  v_hoy    integer;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'Necesitas iniciar sesión para dar un examen.');
  end if;

  if v_label is null or length(v_label) < 2 then
    return json_build_object('ok', false, 'error', 'El nombre de la habilidad es demasiado corto.');
  end if;

  if length(v_label) > 60 then
    return json_build_object('ok', false, 'error', 'El nombre de la habilidad es demasiado largo (máximo 60 caracteres).');
  end if;

  -- Tiene que ser una habilidad, no un símbolo o un número suelto.
  if v_label !~ '[[:alpha:]]{2}' then
    return json_build_object('ok', false, 'error', 'Ese nombre no parece una habilidad.');
  end if;

  v_key := lower(v_label);

  -- Serializa por nombre: si dos personas piden "Excel" al mismo tiempo, una
  -- espera a la otra y ambas terminan usando el MISMO nodo.
  perform pg_advisory_xact_lock(hashtext(v_key));

  -- ¿Ya existe? (catálogo curado o creado antes por alguien más)
  select id into v_id
  from public.skill_tree_nodes
  where lower(btrim(title)) = v_key
  order by (origin = 'catalog') desc, created_at asc
  limit 1;

  if v_id is not null then
    return json_build_object(
      'ok', true, 'node_id', v_id, 'title', v_label, 'created', false,
      'motivo', 'Ya existe un examen para esta habilidad.'
    );
  end if;

  -- Tope diario por persona.
  select count(*) into v_hoy
  from public.skill_tree_nodes
  where origin = 'demanda'
    and created_by = v_uid
    and created_at >= date_trunc('day', now());

  if v_hoy >= k_cap_diario then
    return json_build_object(
      'ok', false,
      'error', 'Ya abriste muchos exámenes nuevos hoy. Prueba con los que tienes y mañana podrás abrir más.'
    );
  end if;

  -- Se crea el nodo. La descripción está redactada para que la IA del simulador
  -- genere un examen útil: pide dominio práctico, no definiciones de memoria.
  insert into public.skill_tree_nodes
    (title, description, category, difficulty_level, pe_reward, estimated_hours,
     icon, color, order_index, origin, created_by)
  values (
    v_label,
    'Habilidad profesional declarada por alguien de la red: ' || v_label ||
    '. Evaluar dominio práctico y criterio aplicado a situaciones de trabajo reales, no definiciones de memoria.',
    'SPECIALIZATION',
    3,
    15,
    1,
    'Brain',
    'cyan',
    900,           -- después del catálogo curado en cualquier orden por order_index
    'demanda',
    v_uid
  )
  returning id into v_id;

  return json_build_object(
    'ok', true, 'node_id', v_id, 'title', v_label, 'created', true,
    'motivo', 'Se preparó un examen nuevo para esta habilidad.'
  );
end;
$fn$;

revoke all on function public.omicron_ensure_skill_node(text) from public, anon;
grant execute on function public.omicron_ensure_skill_node(text) to authenticated;


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
    raise exception 'No encontramos ese aprendizaje entre los tuyos. Refresca la página y si sigue, vuelve a marcarlo desde la lista.';
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
    raise exception 'Para guardar tu análisis necesitas iniciar sesión. Vuelve a intentarlo.';
  end if;
  if not exists (select 1 from auth.users where id = v_uid) then
    raise exception 'Esa cuenta ya no existe en Ómicrom. Vuelve a iniciar sesión para guardar tu análisis.';
  end if;
  -- Bloqueo de suplantacion (hallazgo T6 review): un usuario autenticado solo
  -- puede guardar para si mismo. Con sesion activa, auth.uid() manda y p_user_id
  -- ajeno se rechaza. Con service_role auth.uid() es nulo (la Edge Function
  -- analizar-cv trae la identidad desde un getUser() verificado), asi que pasa.
  if auth.uid() is not null and auth.uid() <> v_uid then
    raise exception 'Solo puedes guardar tus propios análisis.';
  end if;
  -- Tope por request (I3): el validador del Edge Function ya corta en 12, pero
  -- la RPC se puede invocar directo. Sin este candado, un solo llamado puede
  -- insertar miles de filas propias.
  --
  -- Primero el TIPO, despues el largo: `jsonb_array_length` sobre un objeto o
  -- un escalar no devuelve 0, peta con el texto crudo de Postgres
  -- ("cannot get array length of a scalar", P0001) y ese mensaje en ingles sin
  -- contexto es lo que llegaria al usuario. Aca `p_brechas` nulo o missing
  -- significa "analisis sin brechas" (ramas validas para el motor), asi que se
  -- acepta null y solo se rechaza lo que es jsonb de otra forma.
  if p_brechas is not null and jsonb_typeof(p_brechas) <> 'array' then
    raise exception 'La lista de brechas del analisis llego mal formada: se esperaba una lista.';
  end if;
  if coalesce(jsonb_array_length(p_brechas), 0) > 12 then
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


notify pgrst, 'reload schema';
