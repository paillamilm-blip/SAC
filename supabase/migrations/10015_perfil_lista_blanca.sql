-- =====================================================================
-- 10015_perfil_lista_blanca.sql  (portada desde la rama seguridad/perfil-lista-blanca, renumerada
--   de 0083 a 10015 para ir DESPUÉS de las migraciones ya aplicadas; su contenido es idéntico)
--
-- Invierte protect_profile_columns de LISTA NEGRA a LISTA BLANCA.
--
-- EL PROBLEMA
-- 0007_protect_profile.sql blindó el perfil enumerando las columnas
-- prohibidas: 21 asignaciones `new.X := old.X`. El mecanismo funciona,
-- pero tiene un defecto estructural: una columna nueva nace DESPROTEGIDA.
-- Nadie se acuerda de volver a 0007 cada vez que agrega un campo.
--
-- Once columnas se agregaron después de 0007 y ninguna quedó cubierta:
--
--   columna                     │ migración │ por qué importa
--   ────────────────────────────┼───────────┼──────────────────────────
--   competencias_validadas      │ 0037      │ ordena el ranking del
--                               │           │ marketplace y se publica
--                               │           │ en la credencial
--   is_premium                  │ 0039      │ desbloquea la IA de pago
--   last_activity_at            │ 0045      │ alimenta la depreciación
--                               │           │ de tokens
--   cv_summary                  │ 0062      │ el veredicto de la IA
--   cv_years_experience         │ 0062      │ años de experiencia
--   skills_detail               │ 0062      │ los % de dominio del
--                               │           │ Nivel de Competencias
--   is_ghost                    │ 0067      │ visibilidad en la red
--   member_since                │ 0082      │ antigüedad: es una de las
--                               │           │ condiciones del 0.5 %
--   commission_floor_locked_at  │ 0082      │ el 0.5 % permanente.
--                               │           │ "ganado es ganado" — y se
--                               │           │ podía autootorgar
--
-- Con RLS permitiendo `update` sobre la fila propia (profiles_update_own,
-- 0001_core.sql:105), cualquier usuario autenticado escribía esas columnas
-- directo contra la API REST:
--
--   PATCH /rest/v1/profiles?id=eq.<uuid-propio>
--   { "is_premium": true, "competencias_validadas": 99,
--     "skills_detail": [{"name":"React","pct":100}],
--     "commission_floor_locked_at": "2020-01-01" }
--
-- Es decir: premium gratis, primer lugar en el marketplace con
-- competencias que nadie validó, un CV escrito a mano haciéndose pasar por
-- análisis de IA, y la comisión mínima permanente. Todo sin tocar una sola
-- de las columnas que 0007 sí protegía.
--
-- LA SOLUCIÓN
-- Dar vuelta la lógica: en vez de enumerar lo prohibido, enumerar lo
-- permitido y revertir todo lo demás. Y hacerlo recorriendo las columnas
-- reales de la fila (vía jsonb) en lugar de una lista escrita a mano, para
-- que el trigger no necesite conocer el esquema. Una columna nueva queda
-- protegida sin que nadie haga nada.
--
-- No cambia quién puede escribir qué: las columnas que 0007 protegía siguen
-- protegidas, y los RPC SECURITY DEFINER (aplicar_analisis_cv,
-- convalidar_credencial, register_exam_success, aplicar_acta...) siguen
-- pasando por la misma excepción de rol privilegiado.
--
-- Idempotente.
-- =====================================================================

-- IMPORTANTE: igual que 0007, esta función NO es SECURITY DEFINER a
-- propósito. Necesita que current_user sea el llamante real para poder
-- distinguir al cliente (authenticated) de los RPC del servidor.
-- `set search_path` va acá dentro y no en un ALTER aparte: 0057 se lo había
-- fijado a esta función con `alter function ... set search_path`, y un
-- `create or replace` reemplaza también la configuración, así que sin esta
-- línea esta migración desharía en silencio ese endurecimiento.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  -- ── LISTA BLANCA ──────────────────────────────────────────────────
  -- Lo único que el usuario edita de su propio perfil. Cada entrada
  -- corresponde a una pantalla real; si se agrega una columna editable,
  -- va acá y en ningún otro lugar.
  --
  --   username, full_name, bio, location, skills → EditProfileModal
  --   avatar_url                                 → AvatarPicker
  --   user_color                                 → userColorSync (0079)
  --   onboarding_*                               → onboardingSync (0080)
  --
  -- OJO con la diferencia entre `skills` y `skills_detail`:
  --   · skills        = etiquetas que la persona se pone sola. Editable.
  --   · skills_detail = {name, pct} que MIDE la IA. Protegida — es la que
  --                     se muestra como "Nivel de Competencias".
  -- Son dos cosas distintas a propósito: una es declarar, la otra es medir.
  k_editables constant text[] := array[
    'username',
    'full_name',
    'bio',
    'location',
    'skills',
    'avatar_url',
    'user_color',
    'onboarding_profession',
    'onboarding_senior_label',
    'onboarding_completed_at'
  ];

  v_new  jsonb;
  v_old  jsonb;
  v_col  text;
begin
  -- Roles del servidor: acceso total. Es la puerta por la que los RPC
  -- SECURITY DEFINER escriben reputación, puntajes y saldos.
  if current_user in ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') then
    return new;
  end if;

  v_new := to_jsonb(new);
  v_old := to_jsonb(old);

  -- Recorre las columnas REALES de la fila. No hay lista de columnas
  -- prohibidas que mantener: lo que no está en la lista blanca, vuelve
  -- a su valor anterior.
  for v_col in select jsonb_object_keys(v_new)
  loop
    if not (v_col = any (k_editables)) then
      v_new := jsonb_set(v_new, array[v_col], v_old -> v_col);
    end if;
  end loop;

  new := jsonb_populate_record(new, v_new);

  -- updated_at queda FUERA de la lista blanca (para que el cliente no
  -- pueda falsear la fecha) pero tiene que seguir avanzando. El trigger
  -- profiles_set_updated_at ya lo pone en now(), y corre antes que este
  -- por orden alfabético — así que acá se acaba de revertir. Se vuelve a
  -- poner, ahora con un valor que el cliente no controla.
  new.updated_at := now();

  return new;
end;
$$;

comment on function public.protect_profile_columns() is
  'Lista blanca: revierte cualquier cambio del cliente a columnas de profiles que no sean las editables por el usuario. Las columnas nuevas quedan protegidas por defecto. Los RPC SECURITY DEFINER y service_role la saltean.';

-- El trigger ya existe desde 0007 con este mismo nombre y timing; se
-- recrea para que quede explícito y para que esta migración funcione
-- también sobre una base donde 0007 no corrió.
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_columns();


-- =====================================================================
-- VERIFICACIÓN MANUAL
--
-- Con la sesión de un usuario común (no service_role), tomando su propio
-- id, esto NO debe cambiar ningún valor:
--
--   update public.profiles set
--     is_premium = true,
--     competencias_validadas = 99,
--     reputation_score = 100,
--     token_balance = 999999,
--     skills_detail = '[{"name":"React","pct":100}]'::jsonb,
--     cv_summary = 'me escribo solo el veredicto',
--     commission_floor_locked_at = '2020-01-01',
--     member_since = '2020-01-01'
--   where id = auth.uid();
--
--   select is_premium, competencias_validadas, reputation_score,
--          token_balance, skills_detail, cv_summary,
--          commission_floor_locked_at, member_since
--   from public.profiles where id = auth.uid();
--   -- → todo igual que antes del update
--
-- Y esto SÍ debe persistir:
--
--   update public.profiles set bio = 'hola', location = 'Santiago'
--   where id = auth.uid();
--
-- Chequeo de cobertura — lista las columnas que el cliente puede escribir.
-- Si aparece algo que no debería, va sacado de k_editables:
--
--   select column_name
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--     and column_name in (
--       'username','full_name','bio','location','skills','avatar_url',
--       'user_color','onboarding_profession','onboarding_senior_label',
--       'onboarding_completed_at')
--   order by column_name;
-- =====================================================================
