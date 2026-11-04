-- =====================================================================
-- 10011_examen_solo_servidor.sql — «Probada» solo la puede escribir el servidor
--
-- EL HECHO (2026-11-03, leyendo 0073/10001/10006 y el cliente viejo):
-- `register_exam_success(p_skill, p_score, p_kind)` está concedida a
-- `authenticated`, recibe el PUNTAJE desde el navegador y, con él:
--   · sube quality/execution/foundation del perfil (hasta +5/+3/+2 por llamada), y
--   · escribe en `omicron_skill_proofs`, que es lo que la UI muestra como «probada».
-- Cualquier persona con sesión podía llamarla desde la consola con
-- `p_score: 100` y quedar «probada» en cualquier habilidad, sin dar el examen.
-- El cliente viejo (MaxSkillTab, ya retirado) la llamaba con `p_score: 80`
-- fijo (ver .tasks/red-viva-plan.md). Es el mismo agujero que 0051 cerró
-- para `aplicar_acta` y `handle_skill_attempt`; esta función quedó fuera.
--
-- LA CORRECCIÓN:
--   1. Se le quita el permiso a `authenticated`, `anon` y `public`.
--      Nada del código vigente la llama: el examen de /u pasa por la Edge
--      Function `simulador-universal`, que califica en el servidor.
--   2. `simulador-universal` registra la prueba con `omicron_record_skill_proof`
--      (service role) solo si el servidor mismo dio el veredicto APROBADO.
--      Esa función ya existía; aquí se le concede EXECUTE a `service_role`
--      de forma explícita para no depender de los privilegios por defecto.
--
-- EFECTO SOBRE LOS EJES: `register_exam_success` movía los ejes además de
-- registrar la prueba. Los ejes siguen moviéndose por el examen: `aplicar_acta`
-- (service role) ya mezcla el resultado 85/15 en el perfil y marca el nodo
-- VALIDATED. Lo que se pierde es solo la subida manipulable.
--
-- NO se borra nada: las filas de `omicron_skill_proofs` y `reputation_history`
-- ya escritas siguen siendo el rastro de lo ocurrido. Si se quiere depurar
-- pruebas históricas dudosas, es una decisión aparte que debe tomarse con
-- los nombres encima de la mesa.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   ⚠ NO usar `supabase db push` mientras 10003–10010 sigan sin aplicarse en
--   producción: las aplicaría TODAS (10006/10007/10008 borran tablas).
--   Es idempotente: pegar las dos sentencias `do $do$ … $do$;` y el `notify`
--   en el SQL Editor de Supabase, y luego:
--   supabase functions deploy simulador-universal
--   (van JUNTAS: sin el deploy, un examen aprobado no deja prueba por nombre)
--   NO marcarla con `migration repair`: 10006 (anterior) vuelve a conceder
--   register_exam_success a authenticated; cuando se apliquen todas en orden,
--   esta (la última) lo cierra de nuevo.
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   -- Debe devolver false para authenticated y para anon:
--   select has_function_privilege('authenticated', 'public.register_exam_success(text,integer,text)', 'execute');
--   select has_function_privilege('anon',          'public.register_exam_success(text,integer,text)', 'execute');
--   -- Debe devolver true:
--   select has_function_privilege('service_role', 'public.omicron_record_skill_proof(uuid,text,integer,numeric)', 'execute');
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   grant execute on function public.register_exam_success(text, integer, text) to authenticated;
--   (reabre el hueco; solo para un bundle viejo que lo necesite)
--
-- Idempotente.
-- =====================================================================

do $do$
begin
  execute 'revoke execute on function public.register_exam_success(text, integer, text) from public, anon, authenticated';
exception when undefined_function then
  -- la función no existe en este entorno: nada que cerrar
  null;
end;
$do$;

do $do$
begin
  execute 'grant execute on function public.omicron_record_skill_proof(uuid, text, integer, numeric) to service_role';
exception when undefined_function then
  null;
end;
$do$;

notify pgrst, 'reload schema';
