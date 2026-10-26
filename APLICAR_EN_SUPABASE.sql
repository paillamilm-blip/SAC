-- ═══════════════════════════════════════════════════════════════════════
-- SISTEMA OMICRON — SQL COMPLETO PARA CONVALIDAR CV
-- ═══════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES:
-- 1. Abrí Supabase Dashboard → SQL Editor → New Query
-- 2. Pegá TODO este contenido
-- 3. Click "Run"
-- 4. Verificá que diga "Success" en cada bloque
--
-- Este script es 100% IDEMPOTENTE (seguro de correr múltiples veces).
-- Crea las funciones si no existen, las actualiza si ya existen.
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 1: Columnas necesarias en profiles (si no existen)
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_summary text,
  ADD COLUMN IF NOT EXISTS cv_years_experience integer,
  ADD COLUMN IF NOT EXISTS skills_detail jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Campos base que podrían faltar si la BD es vieja:
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS execution_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transcendence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS foundation_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS traditional_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS pe_points integer DEFAULT 0;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 2: Trigger de reputación canónico (recalcula en tiempo real)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recalc_reputation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_exp      numeric;
  v_base     numeric;
  v_momentum numeric;
BEGIN
  -- experiencia = promedio de los 4 ejes del Gemelo Digital
  v_exp := round((coalesce(new.execution_score, 0)
                + coalesce(new.quality_score, 0)
                + coalesce(new.transcendence_score, 0)
                + coalesce(new.foundation_score, 0)) / 4.0, 2);
  new.experience_score := least(100, greatest(0, v_exp));

  -- base: 20% credenciales + 80% experiencia
  v_base := coalesce(new.traditional_score, 0) * 0.20
          + new.experience_score * 0.80;

  -- momentum por PE (potencial): máx +15, rendimientos decrecientes
  v_momentum := least(15, round(sqrt(greatest(coalesce(new.pe_points, 0), 0)::numeric) / 4.0, 2));

  new.reputation_score := least(100, greatest(0, round(v_base + v_momentum, 2)));
  new.reputation_updated_at := now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_reputation ON public.profiles;
CREATE TRIGGER trg_recalc_reputation
  BEFORE INSERT OR UPDATE OF
    traditional_score,
    experience_score,
    execution_score,
    quality_score,
    transcendence_score,
    foundation_score,
    pe_points
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.recalc_reputation();


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 3: RPC aplicar_analisis_cv (la función que guarda el análisis)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.aplicar_analisis_cv(
  p_name          text,
  p_skills        text[],
  p_exec          numeric,
  p_qual          numeric,
  p_trans         numeric,
  p_fund          numeric,
  p_years         integer DEFAULT NULL,
  p_summary       text DEFAULT NULL,
  p_skills_detail jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  v_clamp_exec  numeric := greatest(0, least(100, coalesce(p_exec, 0)));
  v_clamp_qual  numeric := greatest(0, least(100, coalesce(p_qual, 0)));
  v_clamp_trans numeric := greatest(0, least(100, coalesce(p_trans, 0)));
  v_clamp_fund  numeric := greatest(0, least(100, coalesce(p_fund, 0)));
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'sin sesión');
  END IF;

  -- Ejes: ADITIVO (nunca baja un eje existente)
  -- Nombre/skills/resumen/años: se sobrescriben (foto más reciente)
  UPDATE public.profiles SET
    full_name           = CASE WHEN coalesce(p_name, '') <> '' THEN p_name ELSE full_name END,
    skills              = CASE WHEN p_skills IS NOT NULL AND array_length(p_skills, 1) > 0 THEN p_skills ELSE skills END,
    execution_score     = greatest(coalesce(execution_score, 0), v_clamp_exec),
    quality_score       = greatest(coalesce(quality_score, 0), v_clamp_qual),
    transcendence_score = greatest(coalesce(transcendence_score, 0), v_clamp_trans),
    foundation_score    = greatest(coalesce(foundation_score, 0), v_clamp_fund),
    cv_years_experience = coalesce(p_years, cv_years_experience),
    cv_summary          = coalesce(p_summary, cv_summary),
    skills_detail       = coalesce(p_skills_detail, skills_detail)
  WHERE id = uid;
  -- → el trigger recalc_reputation recalcula experience_score y reputation_score

  -- Auditoría best-effort
  BEGIN
    INSERT INTO public.reputation_history(user_id, reason)
    VALUES (uid, 'Análisis de CV aplicado (IA + heurística)');
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN json_build_object(
    'ok', true,
    'reputation', (SELECT reputation_score FROM public.profiles WHERE id = uid)
  );
END;
$fn$;

-- Permisos: solo usuarios autenticados pueden llamarla
REVOKE ALL ON FUNCTION public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) TO authenticator;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 4: RPC convalidar_credencial (título, años, bóveda)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.convalidar_credencial(p_kind text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  d_trad numeric := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'sin sesión');
  END IF;

  IF p_kind = 'cv' THEN d_trad := 6;
  ELSIF p_kind = 'title' THEN d_trad := 5;
  ELSIF p_kind = 'year' THEN d_trad := 4;
  ELSIF p_kind = 'vault' THEN d_trad := 3;
  ELSE RETURN json_build_object('ok', false, 'error', 'tipo inválido');
  END IF;

  UPDATE public.profiles SET
    traditional_score = greatest(coalesce(traditional_score, 0),
                                 least(60, coalesce(traditional_score, 0) + d_trad))
  WHERE id = uid;

  -- Auditoría best-effort
  BEGIN
    INSERT INTO public.reputation_history(user_id, reason)
    VALUES (uid, 'Convalidación: ' || p_kind);
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN json_build_object(
    'ok', true,
    'reputation', (SELECT reputation_score FROM public.profiles WHERE id = uid)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.convalidar_credencial(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.convalidar_credencial(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convalidar_credencial(text) TO authenticator;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 5: Tabla reputation_history (si no existe — para auditoría)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reputation_history (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_history_user ON public.reputation_history(user_id);


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 6: Rate limiting (necesario para proxy-ai)
-- ═══════════════════════════════════════════════════════════════════════
-- ESPEJO, no dueño. La fuente canónica es:
--   supabase/migrations/0031_rate_limiting.sql      (tabla + RPC original)
--   supabase/migrations/10013_ventana_propia_rate_limit.sql  (poda por ventana propia)
-- Este bloque produce el mismo estado de producción que 0031 + 10013 aplicadas
-- en orden, TAMBIÉN sobre una máquina donde la tabla ya existe sin la columna
-- window_sec: el CREATE TABLE IF NOT EXISTS no repara una tabla vieja (la omite)
-- y el cuerpo del RPC que se instala más abajo sí la inserta — sin el ALTER del
-- final de este paso, el limitador de las 12 Edge Functions quedaba muerto
-- (falla abierto) hasta pegar 10013. Si cambiás una de las dos migraciones,
-- actualizás este espejo.
-- El limitador falla abierto en las Edge Functions: si este bloque queda
-- desalineado (ej. tabla con PK viejo), el tope se apaga sin ruido.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket        text        NOT NULL,   -- nombre del endpoint (ej. 'run-code')
  identifier    text        NOT NULL,   -- user_id o IP
  window_start  timestamptz NOT NULL,   -- inicio de la ventana fija
  count         integer     NOT NULL DEFAULT 0,
  window_sec    integer     NOT NULL DEFAULT 60,  -- ventana con la que nació la fila (10013)
  PRIMARY KEY (bucket, identifier, window_start)
);

-- La tabla es interna (solo la usa el limitador vía SECURITY DEFINER).
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Sin políticas => nadie puede leerla/escribirla directamente (ni anon ni authenticated).

-- Si una versión VIEJA de este bootstrap creó la tabla con PK
-- (bucket, identifier), el ON CONFLICT del RPC peta 42P10 y el limitador
-- muere en silencio (falla abierto). Alinear sin destruir: la tabla es
-- efímera (solo contadores), y (bucket, identifier) único implica
-- (bucket, identifier, window_start) único, así que el cambio es seguro.
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE contype = 'p' AND conrelid = 'public.rate_limits'::regclass;
  IF v_def IS NULL THEN
    RAISE NOTICE 'rate_limits: sin PK visible; no hay nada que alinear.';
  ELSIF v_def <> 'PRIMARY KEY (bucket, identifier, window_start)' THEN
    ALTER TABLE public.rate_limits DROP CONSTRAINT rate_limits_pkey;
    ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_pkey
      PRIMARY KEY (bucket, identifier, window_start);
    RAISE NOTICE 'rate_limits: PK realineada a (bucket, identifier, window_start). Los contadores en curso se conservan.';
  ELSE
    RAISE NOTICE 'rate_limits: PK ya alineada a (bucket, identifier, window_start).';
  END IF;
END $$;

-- El DO de arriba REALINEA la PK, pero no agrega columnas: una tabla creada
-- por una versión vieja de este bootstrap sigue sin window_sec, y el insert del
-- RPC (más abajo) la lista => 42703 en cada request => el limitador de las 12
-- Edge Functions falla abierto hasta pegar 10013. Es la misma sentencia idempotente
-- de 10013, y el default es constante: metadata-only, las filas existentes salen
-- con 60 (la ventana con la que nacieron).
ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS window_sec integer NOT NULL DEFAULT 60;

DO $$
DECLARE v_sec text;
BEGIN
  SELECT data_type INTO v_sec
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'rate_limits'
     AND column_name = 'window_sec';
  IF v_sec IS NULL THEN
    RAISE NOTICE 'rate_limits: window_sec sigue ausente; el limitador queda fail-open hasta aplicar 10013.';
  ELSE
    RAISE NOTICE 'rate_limits: window_sec presente (%) — espejo de 10013 completo.', v_sec;
  END IF;
END $$;

-- Se CONSERVA el DROP (aunque 10013 no lo necesite): el bootstrap tiene que
-- ser autocontenido y poder reparar su propio pegado anterior, que declaraba
-- la función RETURNS json. CREATE OR REPLACE no cambia el tipo de retorno,
-- así que sin el DROP el pegado petaría contra la versión vieja.
DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer);

-- ── Cuerpo byte a byte igual a 10013 (espejo; editar 10013 y re-pegar acá) ──
create or replace function public.check_rate_limit(
  p_bucket     text,
  p_identifier text,
  p_limit      integer,
  p_window_sec integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_epoch  bigint      := floor(extract(epoch from now()))::bigint;
  v_window timestamptz := to_timestamp((v_epoch / p_window_sec) * p_window_sec);
  v_count  integer;
begin
  insert into public.rate_limits (bucket, identifier, window_start, count, window_sec)
  values (p_bucket, p_identifier, v_window, 1, p_window_sec)
  on conflict (bucket, identifier, window_start)
  do update set count = public.rate_limits.count + 1,
                window_sec = p_window_sec
  returning count into v_count;

  -- Limpieza oportunista (mantiene la tabla pequeña), ahora por ventana
  -- propia: cada fila sobrevive 2 x su ventana, no una hora fija. Una fila
  -- de 60 s se poda a los 120 s; una de 86400 s (el tope diario) aguanta
  -- 48 h, así que la fila de hoy deja de borrarse a mitad de la propia
  -- ventana.
  if (v_epoch % 50) = 0 then
    delete from public.rate_limits
    where window_start < now() - make_interval(secs => window_sec * 2);
  end if;

  return jsonb_build_object(
    'allowed',  v_count <= p_limit,
    'count',    v_count,
    'limit',    p_limit,
    'reset_at', v_window + make_interval(secs => p_window_sec)
  );
end;
$fn$;

-- Solo el service_role (Edge Functions) ejecuta el limitador. ANTES este
-- bloque le daba EXECUTE a anon: un security definer accesible desde el
-- anon se puede invocar por REST y escribir en rate_limits salteando RLS.
-- Esto alinea con 0031/10013.
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 7: Créditos IA (necesario para proxy-ai)
-- ═══════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.check_and_consume_credit(text);

CREATE OR REPLACE FUNCTION public.check_and_consume_credit(
  p_function_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fail-open: siempre permitir (sistema de créditos completo es opcional)
  RETURN json_build_object('allowed', true, 'remaining', 99, 'limit', 100, 'used', 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_consume_credit(text) TO authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 8: Actividad diaria (para rachas)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.register_daily_activity(
  p_challenge boolean DEFAULT false,
  p_pe integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Placeholder: se puede expandir para tracking de rachas
  NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_daily_activity(boolean, integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 9: Forzar recarga del schema de PostgREST
-- ═══════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';


-- ═══════════════════════════════════════════════════════════════════════
-- ✅ LISTO. Verificá ejecutando:
--    SELECT aplicar_analisis_cv('Test', ARRAY['skill1'], 50, 50, 50, 50, 3, 'Test summary', '[]'::jsonb);
-- Debería retornar: {"ok": true, "reputation": <number>}
-- (Si retorna "sin sesión" es porque no hay usuario autenticado — normal en SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════
