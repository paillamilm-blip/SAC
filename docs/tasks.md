# Plan de tareas y seguimiento — Consolidación de Sistema Ómicrom

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador para revisión formal) |
| Fecha de emisión | 2026-11-02 |
| Base | `origin/main` @ `043dc47` |
| Especificación | [`design.md`](./design.md) · hechos en [`audit.md`](./audit.md) |
| Tareas | 31 = 21 ejecutables ya · 10 bloqueadas (02 y 06 por una decisión del dueño; 24–31 por la App B) |

## Cómo usar este documento

- El **orden numérico es el orden de ejecución**. Toda dependencia apunta a una tarea de número menor.
- Una tarea pasa a `Completada` **solo** cuando su *criterio de aceptación binario* se cumple (el comando termina con código 0 o devuelve el código HTTP indicado) y el resultado se pega en *Incidencias o notas*.
- Fechas y horas en formato `YYYY-MM-DD HH:mm`, hora de Santiago (UTC−3/−4). `—` significa "aún no ocurrió".
- Una tarea = un PR pequeño a `main` (regla R-15).
- Los criterios de las tareas `Bloqueada` por la App B son **provisionales**: se concretan al cerrar la TAREA-02.

### Leyenda de modelos

| Modelo | Uso previsto |
|---|---|
| **Qwen Flash** | Tareas mecánicas, tipos, tests, documentación |
| **Qwen Max** | Lógica de seguridad, decisiones, análisis cruzado |
| **Qwen Coder** | Lógica de código e integración |
| **DeepSeek** | Depuración y comportamiento no determinista |

### Grafo de dependencias

```
FASE 0  01   02*   03
FASE 1  04 → 05 ─┐
        04 → 06 ─┴→ 07 → 08
              06 → 09
FASE 2  01 → 10 → 11 → 12 → 14, 15
              01 → 13 → 16 (también 12) → 17 (también 15)
                    12 → 18
                    13 → 19
FASE 3  01 → 20      21      06 → 22      09,10,20 → 23
FASE 4* 02,20 → 24 → 25 → 26 (también 09, 07)
        24,12,18 → 27      26 → 28      27 → 29      26,29 → 30      todas → 31
```
`*` = bloqueada por la TAREA-02.

### Resumen de estado

| Fase | Tareas | Estado |
|---|---|---|
| 0 · Compuertas y línea base | 01–03 | 01, 03 Pendiente · 02 Bloqueada |
| 1 · Base de datos y seguridad | 04–09 | 04, 05, 09 Pendiente · 06 Bloqueada (aprobación del dueño) · 07, 08 Pendiente, pero en la práctica esperan a 06 |
| 2 · Estructura del código | 10–19 | Pendiente |
| 3 · Entorno, backend y CI | 20–23 | Pendiente |
| 4 · Integración de la App B | 24–31 | Bloqueada (TAREA-02) |

---

# FASE 0 · Compuertas y línea base

### TAREA-01: Línea base ejecutable (typecheck · lint · test · build)
- **Archivos afectados:** `docs/baseline.md` (crear)
- **Criterio de aceptación binario:** `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` termina con código 0 y la salida queda pegada en `docs/baseline.md`.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** En el sandbox de la auditoría `npm ci` devolvió HTTP 403 para `zod`; no se pudo medir. Ejecutar en CI o máquina local. Si algún paso falla hoy, registrar el fallo como línea base y no corregirlo aquí: abrir tarea aparte. `npm run lint` admite advertencias (exit 0).

### TAREA-02: Convertir el prompt de la App B en requisitos verificables
- **Archivos afectados:** `docs/fusion/app-b-prompt.md` (crear: copia literal del prompt del dueño), `docs/fusion/app-b-requisitos.md` (crear)
- **Criterio de aceptación binario:** `test -s docs/fusion/app-b-prompt.md && test -s docs/fusion/app-b-requisitos.md && grep -qE '^\| RF-[0-9]+' docs/fusion/app-b-requisitos.md && grep -q '^## Preguntas abiertas' docs/fusion/app-b-requisitos.md` termina con código 0. Cada requisito `RF-n` lleva su criterio de aceptación comprobable. Se declara si el prompt menciona datos previos, rutas, dependencias o integraciones externas.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** El dueño confirmó que de la App B solo existe el prompt. Bloqueada hasta que lo entregue completo. No se escribe código en esta tarea. Las ambigüedades del prompt se listan en "Preguntas abiertas" y se resuelven con el dueño, sin inventar. Desbloquea las tareas 24–31. Ver `audit.md` §2 (actualización) y §9.

### TAREA-03: Corregir la documentación que contradice al código
- **Archivos afectados:** `README.md` (modificar), `.kiro/steering/project-context.md` (modificar), `.github/workflows/ci.yml` (modificar solo comentarios), `tailwind.config.js` (modificar solo comentarios)
- **Criterio de aceptación binario:** `! grep -rnE "Three\.js|@react-three|63 migraciones|75 migraciones|src/lib/supabase\.ts|BITACORA_MAESTRA|REFACTORING_PLAN|9 Tabs|infrastructure/router|src/theme\.ts" README.md .kiro/steering/project-context.md .github/workflows/ci.yml tailwind.config.js` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Valores reales a escribir: `TabId` = 3 valores, 5 features, 92 migraciones, 21 Edge Functions, orbe 2D, IA vía `proxy-ai`. No cambia comportamiento. Añadir en `README.md` un enlace a `docs/design.md`.

---

# FASE 1 · Base de datos y seguridad

### TAREA-04: Medir el orden real en que la CLI aplica las migraciones
- **Archivos afectados:** `supabase/config.toml` (crear), `scripts/db-order-probe.sh` (crear), `docs/db/orden-migraciones.md` (crear)
- **Criterio de aceptación binario:** `bash scripts/db-order-probe.sh && grep -E "^ORDEN_CLI=(lexicografico|numerico)$" docs/db/orden-migraciones.md` termina con código 0. El informe incluye el resultado de `supabase db reset` en una base local limpia (éxito o primer error y su archivo).
- **Modelo asignado:** DeepSeek
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Requiere Docker y la CLI de Supabase. Resuelve H-03 con un dato en vez de una suposición. Si el resultado es `lexicografico` y `db reset` falla en `9999` (por `contracts` inexistente), queda confirmado el riesgo; si es `numerico`, la TAREA-06 se reduce a endurecer funciones. Contrastar con la rama `fix/broken-migrations-fresh-apply` (`c417bff`, corrige `0064`, `0068`, `0072`, no fusionada): si `db reset` falla antes de `9999`, aplicar primero esa rama en un PR aparte.

### TAREA-05: Prueba de caracterización de la protección de `profiles` (rojo esperado)
- **Archivos afectados:** `scripts/db-test.sh` (crear), `supabase/tests/profiles_protection.sql` (crear)
- **Criterio de aceptación binario:** `bash scripts/db-test.sh supabase/tests/profiles_protection.sql 2>&1 | grep -q "FAIL: is_premium"` termina con código 0. Es decir: contra el esquema actual la prueba **falla** y nombra `is_premium`, `commission_floor_locked_at` y `streak_days`.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Test dentro de una transacción con `rollback`, simulando el rol `authenticated` (`set local role authenticated; set local request.jwt.claims …`). Solo contra base local, nunca contra la remota. Si la prueba pasa (la columna sí estaba protegida por otra vía), documentarlo y cerrar H-02 como falso positivo.

### TAREA-06: Reordenar y endurecer `9999_audit_consolidado.sql` (ADR-002)
- **Archivos afectados:** `supabase/migrations/9999_audit_consolidado.sql` → `supabase/migrations/0083_audit_consolidado.sql` (renombrar, solo si TAREA-04 = `lexicografico`; editar siempre), `docs/adr/ADR-002-orden-migraciones.md` (crear), `docs/db/remote-migration-list.txt` (crear, lo aporta el dueño)
- **Criterio de aceptación binario:** `supabase db reset && psql "$LOCAL_DB_URL" -tAc "select bool_and(coalesce(proconfig::text,'') like '%search_path%') from pg_proc where proname in ('recalc_reputation','protect_profile_columns','ensure_unique_username','object_delivery','declare_delivery')" | grep -qx t` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Bloqueada hasta (a) resultado de TAREA-04 y (b) **aprobación explícita del dueño** para ejecutar `supabase migration repair` en la remota, después de que aporte `supabase migration list` y `supabase db dump --schema-only` de producción. La edición del archivo añade `set search_path = public, pg_temp` a sus funciones y guardas `to_regclass(...)` antes de tocar `contracts`/`messages`/`blackbox_votes`. No ejecutar `repair` sin ese visto bueno.

### TAREA-07: Lista blanca de columnas editables en `profiles` (ADR-003)
- **Archivos afectados:** `supabase/migrations/<AAAAMMDDHHMMSS>_profiles_update_allowlist.sql` (crear, usar el instante real de creación), `supabase/tests/profiles_protection.sql` (modificar: ahora debe pasar)
- **Criterio de aceptación binario:** `bash scripts/db-test.sh supabase/tests/profiles_protection.sql` termina con código 0, y `npm run test` también.
- **Modelo asignado:** Qwen Max
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Se declara dependiente de 05 y 06. Su criterio exige `db reset` correcto, y eso no ocurre en una base nueva mientras `9999` siga rompiéndola (si TAREA-04 lo confirma). Antes de escribir el `GRANT`, confirmar con `grep -rn "from('profiles')" src` qué columnas escribe el cliente hoy (`onboarding_profession`, `onboarding_senior_label`, `onboarding_completed_at`, `user_color` y la identidad). El `upsert` de `ProfileContext.tsx:139` se trata en TAREA-08. Mantener el trigger como segunda barrera.

### TAREA-08: RPC `ensure_profile()` y cierre del INSERT directo
- **Archivos afectados:** `supabase/migrations/<AAAAMMDDHHMMSS>_ensure_profile_rpc.sql` (crear), `supabase/tests/profiles_insert.sql` (crear), `src/store/ProfileContext.tsx` (modificar)
- **Criterio de aceptación binario:** `bash scripts/db-test.sh supabase/tests/profiles_insert.sql && npm run typecheck && npm run test` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** `ensure_profile()` es `security definer` con `set search_path`, crea la fila solo con valores por defecto y es idempotente. Tras esto: `revoke insert on public.profiles from authenticated`. Verificar que el alta normal (trigger de registro) sigue funcionando, incluido el flujo de invitado que migra al registrarse.

### TAREA-09: Validador de migraciones en CI
- **Archivos afectados:** `scripts/check-migrations.mjs` (crear), `package.json` (modificar: script `check:migrations`)
- **Criterio de aceptación binario:** `node scripts/check-migrations.mjs` termina con código 0 sobre el repositorio actual, y con código distinto de 0 si se añade un archivo de prueba `supabase/migrations/9998_x.sql`.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Reglas: nombre `^(\d{4}|\d{5}|\d{14})_[a-z0-9_]+\.sql$` (4 y 5 dígitos solo para las existentes, lista cerrada); orden como texto = orden como número; sin nombres duplicados salvo los dos `rate_limiting` listados; los nuevos exigen 14 dígitos. Para pasar sobre el repositorio actual depende de que TAREA-06 haya resuelto `9999`; si no, ejecutarlo con la excepción documentada de `9999`.

---

# FASE 2 · Estructura del código

### TAREA-10: Control de capas con tope descendente (ratchet)
- **Archivos afectados:** `scripts/check-layers.mjs` (crear), `scripts/layers-baseline.json` (crear), `package.json` (modificar: script `check:layers`)
- **Criterio de aceptación binario:** `npm run check:layers` termina con código 0 sobre el código actual (iguala la línea base) y con código distinto de 0 si se añade un import prohibido de prueba.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Implementa R-01, R-02 y R-09 con cinco reglas nombradas, invocables con `--rule <nombre>`: `no-deep-cross-feature`, `no-feature-cycles`, `no-upward-imports` (capas de §2.1), `no-ui-supabase` y `no-orphans`. Sin `--rule` ejecuta todas. La línea base registra las violaciones de hoy (3 inversiones, 15 accesos directos a Supabase desde UI, 21 imports profundos entre features, 3 ciclos). El script solo permite que el número baje. Cada tarea siguiente actualiza la línea base a la baja. Sin dependencias nuevas (Node puro).

### TAREA-11: Barrels públicos por feature y reescritura de imports cruzados
- **Archivos afectados:** `src/features/auth/index.ts`, `src/features/redviva/index.ts`, `src/features/academia/index.ts`, `src/features/gemelo/index.ts`, `src/features/omicron/index.ts` (crear los cinco); importadores a modificar: `src/App.tsx`, `src/hooks/useGemeloActivation.ts`, `src/store/ProfileContext.tsx`, y los archivos de `src/features/**` que importan otra feature
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && node scripts/check-layers.mjs --rule no-deep-cross-feature` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Exportar exactamente lo listado en `design.md` §5.3, ni más ni menos. Cambio puramente mecánico: ningún comportamiento cambia. Actualizar `layers-baseline.json`.

### TAREA-12: Capa `domain/` y eliminación de dependencias invertidas y ciclos
- **Archivos afectados:** `src/domain/reputation.ts` y `src/domain/reputation.test.ts` (mover desde `src/features/gemelo/services/`), `src/domain/nodeLevels.ts` (extraer de `src/features/omicron/utils/nodeUnlock.ts`), `src/domain/types/analyzedProfile.ts` (extraer de `src/features/gemelo/services/cvAnalyzer.ts`), `src/infrastructure/ai/omicronBrain.ts` (mover desde `src/features/omicron/services/brain.ts` junto con `emotion.ts` y `tools.ts`), `src/hooks/useGemeloActivation.ts` → `src/features/gemelo/hooks/useGemeloActivation.ts`, `src/store/ProfileContext.tsx`, `src/shared/utils/guestMode.ts`, `src/features/academia/**` y `src/features/omicron/**` (actualizar imports)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && ! grep -rEn "from '@/features/" src/store src/hooks src/shared src/infrastructure` termina con código 0, y `node scripts/check-layers.mjs --rule no-feature-cycles` también.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Hacer un movimiento por commit. `reputation.test.ts` y `nodeUnlock.test.ts` deben seguir pasando sin cambios de aserción: sirven de red de seguridad. Contrastar los umbrales de nivel (0–49 / 50–79 / 80–100) con `levelBandFor` antes de moverlo. Confirmar que `brain.ts` no importa nada más de `omicron/` además de `emotion.ts` y `tools.ts` (verificado en la auditoría: solo `infrastructure/ai/*`, `./emotion`, `./tools`, tipo `TabId`). `streakDays` no se mueve: se elimina en TAREA-17.

### TAREA-13: Retirar o cablear los 9 módulos sin importadores
- **Archivos afectados:** `src/shared/components/Skeleton.tsx`, `src/shared/hooks/useProgressiveBlur.ts` (eliminar, previa verificación); a decidir con el dueño: `src/features/gemelo/components/CredentialReview.tsx`, `src/features/gemelo/components/CredentialsPanel.tsx`, `src/pages/TerminosServicio.tsx`, `src/features/gemelo/components/Guidance.tsx`, `src/features/gemelo/components/PasaporteGemelo.tsx`, `src/features/omicron/services/notify.ts`, `src/shared/components/Modal.tsx`
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && npm run build` termina con código 0, y `node scripts/check-layers.mjs --rule no-orphans` también.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Para cada archivo: `git grep -n "<Nombre>"` incluyendo importaciones dinámicas y `public/sw.js`. Decisión del dueño obligatoria para: `CredentialReview` y `CredentialsPanel` (únicas consumidoras de las RPC `review_credential` y `get_pending_credentials`; pueden ser una función de revisor sin cablear) y `TerminosServicio` (página legal; existe `TERMINOS_SERVICIO.md`, quizá deba cablearse en vez de borrarse). `Guidance`, `PasaporteGemelo`, `notify` y `Modal` aparecen nombrados en otros archivos: confirmar si son referencias reales o texto. Si se elimina `Modal.tsx`, se resuelve parte de la TAREA-19 (uso de Tailwind).

### TAREA-14: Capa de datos de `auth` (la UI deja de importar Supabase)
- **Archivos afectados:** `src/features/auth/services/auth.ts` (crear), `src/features/auth/components/AuthOverlay.tsx`, `src/features/auth/components/NoAccess.tsx`, `src/features/auth/components/ResetPasswordOverlay.tsx` (modificar)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && ! grep -rln "@/infrastructure/supabase" src/features/auth/components` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Mover las llamadas (`signIn`, `signUp`, `resetPassword`, `get_email_for_login`) sin cambiar mensajes ni flujo. `AuthOverlay.tsx` tiene 681 líneas: no debe crecer (R-12). Probar manualmente login por correo y por usuario.

### TAREA-15: Capa de datos de `academia`
- **Archivos afectados:** `src/features/academia/services/academia.ts` (crear), `src/features/academia/components/AcademiaTab.tsx`, `DailyChallengeCard.tsx`, `MaxSkillTab.tsx`, `UniversalSimulator.tsx` (modificar)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && ! grep -rln "@/infrastructure/supabase" src/features/academia/components` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Encapsular las RPC `mark_lesson_complete`, `submit_quiz`, `get_course_quiz`, `register_daily_activity`, `register_exam_success`, `omicron_ensure_skill_node` y la Edge Function `simulador-universal`. `MaxSkillTab.tsx` (725 líneas) y `AcademiaTab.tsx` (714) no deben crecer. Conservar los contratos de §5.1 y §5.2 de `design.md` sin cambios.

### TAREA-16: Capa de datos de `gemelo`
- **Archivos afectados:** `src/features/gemelo/services/credentials.ts` (crear), `src/features/gemelo/components/CredencialModal.tsx`, `DashboardVivo.tsx`, `RedSocial.tsx`, `VerifyCredential.tsx` (modificar); `CredentialReview.tsx` y `CredentialsPanel.tsx` solo si TAREA-13 decidió conservarlos
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && ! grep -rln "@/infrastructure/supabase" src/features/gemelo/components` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Encapsular `convalidar_credencial`, `get_public_credential`, lecturas de `profiles`/`credentials` y la Edge Function `credential` (`issue`/`verify`). `CredencialModal.tsx` tiene 831 líneas: no debe crecer. Los 2 archivos de UI de `store/` y `App.tsx` quedan exentos (composición).

### TAREA-17: Una sola fuente de verdad para la racha
- **Archivos afectados:** `src/features/gemelo/services/profile.ts` (modificar: eliminar `streakDays`), `src/features/academia/components/StreakBanner.tsx`, `src/features/omicron/**` (consumidores de `streakDays`), `src/types/profile.ts` (modificar si falta `streak_days`)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && ! grep -rn "streakDays" src` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Los consumidores pasan a leer `profiles.streak_days` (calculado en el servidor, `10004`). Hoy el cliente lo deriva del historial local en `localStorage`, por lo que dos dispositivos del mismo usuario muestran rachas distintas. Cambio de comportamiento visible: avisar al dueño. Ajustar los tests que dependan de `streakDays`.

### TAREA-18: Registro central de claves de `localStorage`
- **Archivos afectados:** `src/infrastructure/storage/keys.ts` (crear), y los archivos que hoy escriben claves literales (`grep -rln "localStorage" src`)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && ! grep -rEn "localStorage\.(get|set|remove)Item\(['\"]" src --include=*.ts --include=*.tsx --exclude=*.test.* --exclude-dir=storage` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Las 9 claves `omicron_*` actuales **no se renombran** (borraría el estado de los usuarios); se registran tal cual. Las nuevas usan `omicron:<modulo>:<clave>`. Prepara el espacio de nombres para la App B (audit §3.2).

### TAREA-19: Configuración residual (chunks de Vite y Tailwind)
- **Archivos afectados:** `vite.config.ts` (modificar), `package.json` y `package-lock.json` (modificar solo si el dueño decide retirar Tailwind), `tailwind.config.js` y `postcss.config.js` (eliminar si se retira), `src/features/gemelo/components/ProgressRadar.tsx` y `src/shared/components/Modal.tsx` (migrar a tokens de `src/theme/` si se retira)
- **Criterio de aceptación binario:** `npm run build && ! grep -nE "three|react-router|postprocessing" vite.config.ts` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Parte 1 (siempre): quitar de `manualChunks` las ramas de `three`, `@react-three`, `postprocessing`, `react-router`, que no existen. Parte 2 (decisión del dueño, pregunta 5 de la auditoría): retirar Tailwind, ya que solo 2 archivos usan utilidades; si se retira, el criterio añade `! grep -q tailwindcss package.json`. Comparar el tamaño de los chunks antes y después de `npm run build` y anotarlo.

---

# FASE 3 · Entorno, backend y CI

### TAREA-20: Variables de entorno: documentar, depurar y validar
- **Archivos afectados:** `.env.example` (modificar), `supabase/functions/.env.example` (crear), `e2e/.env.example` (crear), `scripts/check-env.mjs` (crear), `package.json` (modificar: script `check:env`)
- **Criterio de aceptación binario:** `node scripts/check-env.mjs` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** El script compara `import.meta.env.*`, `Deno.env.get(...)` y `process.env.*` con los tres `.env.example`, en ambos sentidos. Retirar `VITE_OPENROUTER_KEY`, `VITE_SENTRY_DSN`, `VITE_ANALYTICS_DOMAIN`, `VITE_STRIPE_ENABLED` (sin lector) y añadir `VITE_VAPID_PUBLIC_KEY`. Comprobar que ningún secreto empiece por `VITE_`. No contiene valores reales, solo nombres.

### TAREA-21: Inventario de la superficie backend (Edge Functions y tablas por dominio)
- **Archivos afectados:** `docs/db/edge-functions.md` (crear), `docs/db/dominios.md` (crear), `scripts/check-functions-doc.mjs` (crear)
- **Criterio de aceptación binario:** `node scripts/check-functions-doc.mjs` termina con código 0 (cada carpeta de `supabase/functions/` excepto `_shared` aparece en `docs/db/edge-functions.md`, y cada `create table` de las migraciones aparece en `docs/db/dominios.md` con estado `Activo` o `Congelado`).
- **Modelo asignado:** Qwen Max
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Clasificar las 17 funciones sin consumidor en el front como `webhook`, `cron/trigger`, `sin uso` (buscar en migraciones `pg_cron`, `net.http_post`, triggers). No se asume que estén muertas. Para las tablas, revisar el alcance de los `DROP` condicionales de `10006` y `10007` (borran solo si la tabla está vacía; el esquema difiere entre entornos). Las funciones de pago siguen desplegables: confirmar con el dueño si deben retirarse. No elimina nada: solo documenta.

### TAREA-22: Archivar los scripts SQL sueltos y `schema.sql` desactualizado
- **Archivos afectados:** `supabase/APLICAR_PENDIENTES.sql`, `supabase/PUESTA_EN_MARCHA.sql`, `supabase/CERRAR_HALLAZGOS_SEGURIDAD.sql`, `APLICAR_EN_SUPABASE.sql` (raíz), `supabase/schema.sql` (mover a `supabase/legacy/`), `supabase/legacy/README.md` (crear)
- **Criterio de aceptación binario:** `test ! -e supabase/schema.sql && test ! -e APLICAR_EN_SUPABASE.sql && test -s supabase/legacy/README.md` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Se mueven con `git mv` (historial preservado), no se borran. `legacy/README.md` explica: "copias manuales de migraciones; no ejecutar; la fuente de verdad es `supabase/migrations/`". Buscar referencias en `GUIA_ACTIVACION_PRODUCCION.md` y `PLAN_PRODUCCION.md` y actualizarlas. Mantener `seed.sql`, `seed_demo.sql` y `auditoria_check.sql` donde están. Depende de TAREA-06: no mover antes de saber si alguno aporta algo que `9999` no cubre.

### TAREA-23: Endurecer el pipeline de CI
- **Archivos afectados:** `.github/workflows/ci.yml` (modificar), `package.json` (modificar si falta algún script `check:*`)
- **Criterio de aceptación binario:** `grep -q "npm ci" .github/workflows/ci.yml && ! grep -q "npm install" .github/workflows/ci.yml && grep -q "check:layers" .github/workflows/ci.yml && grep -q "check:migrations" .github/workflows/ci.yml && grep -q "check:env" .github/workflows/ci.yml` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Cambiar `npm install` por `npm ci` (el comentario que lo justificaba es de julio). Verificar antes que `package-lock.json` está sincronizado (`npm ci` fallará si no lo está). Añadir los pasos `check:layers`, `check:migrations`, `check:env`. Corregir el comentario sobre `concurrency` (dice cancelar, el valor es `cancel-in-progress: false`). El E2E de Playwright sigue fuera de CI (usa navegador visible); decidirlo aparte.

---

# FASE 4 · Integración de la App B (todas bloqueadas por TAREA-02)

> La App B existe solo como prompt. Los criterios de esta fase son **provisionales**: se reescriben al cerrar la TAREA-02 con los requisitos y el nombre real del módulo (`<app-b>` abajo). La TAREA-27 se subdivide entonces.

### TAREA-24: Análisis de impacto y colisiones del prompt de la App B sobre Ómicrom
- **Archivos afectados:** `docs/fusion/impacto.md` (crear)
- **Criterio de aceptación binario:** `test -s docs/fusion/impacto.md && grep -q '^## Colisiones de nombres' docs/fusion/impacto.md && grep -q '^## Dependencias nuevas' docs/fusion/impacto.md && grep -q '^## Tablas y RPC nuevas' docs/fusion/impacto.md && grep -q '^## Cambios en código existente' docs/fusion/impacto.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Como no hay código de la App B, no se compara contra nada: se evalúa qué colisionaría cuando el prompt se construya (nombres de tablas, funciones, rutas, claves de `localStorage`, `TabId`, `sw.js`/manifest, variables de entorno). La lista "Cambios en código existente" debe quedar vacía o justificada fila por fila. Plantilla de puntos de contacto en `audit.md` §3.2. Depende de TAREA-02 y TAREA-20.

### TAREA-25: Modelo de datos de la App B y ADR-004
- **Archivos afectados:** `docs/fusion/datos-b.md` (crear), `docs/adr/ADR-004-datos-app-b.md` (crear), `docs/design.md` (modificar §3.5, §4.6, §6.2)
- **Criterio de aceptación binario:** `grep -q "^Estado: Aceptada" docs/adr/ADR-004-datos-app-b.md && test -s docs/fusion/datos-b.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Decide prefijo de tablas frente a esquema propio, las claves foráneas hacia `profiles`, las políticas RLS y si hay datos existentes que migrar (`scripts/migrar-app-b.mjs`, con `--dry-run`). Requiere revisión del dueño antes de pasar a `Aceptada`. Depende de TAREA-24 y TAREA-09.

### TAREA-26: Migraciones de la App B
- **Archivos afectados:** `supabase/migrations/<AAAAMMDDHHMMSS>_<app_b>_*.sql` (crear), `supabase/tests/<app_b>_rls.sql` (crear)
- **Criterio de aceptación binario:** `supabase db reset && bash scripts/db-test.sh supabase/tests/<app_b>_rls.sql && node scripts/check-migrations.mjs` termina con código 0. La prueba falla si alguna tabla del módulo tiene `rowsecurity = false`.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Solo migraciones nuevas; ninguna de las 92 existentes se edita (regla de §4.6). Cada tabla lleva RLS en la misma migración. Depende de TAREA-25 y TAREA-07 (política de `profiles` ya cerrada).

### TAREA-27: Construir la App B como feature (a partir de sus requisitos)
- **Archivos afectados:** `src/features/<app-b>/**` (crear, con `index.ts`, `components/`, `hooks/`, `services/`), `src/domain/**` (si aporta lógica pura)
- **Criterio de aceptación binario:** `npm run typecheck && npm run lint && npm run test && node scripts/check-layers.mjs` termina con código 0, sin aumentar `scripts/layers-baseline.json`. Cada `RF-n` de `docs/fusion/app-b-requisitos.md` tiene al menos una prueba que referencia su identificador.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** No hay código que importar: se construye desde los requisitos. **Esta tarea se subdivide** (una tarea por grupo de `RF-n`) al cerrar TAREA-02 y TAREA-25; hoy es un marcador. Usa `infrastructure/supabase/client.ts`; sin segundo cliente, sin `package.json` propio. Claves de `localStorage` solo vía `infrastructure/storage/keys.ts`. Cada dependencia nueva requiere ADR y alta en `design.md` §6.2. Depende de TAREA-24, TAREA-12 y TAREA-18.

### TAREA-28: Edge Functions de la App B
- **Archivos afectados:** `supabase/functions/<app-b>-*/index.ts` (crear), `supabase/functions/.env.example` (modificar), `docs/db/edge-functions.md` (modificar)
- **Criterio de aceptación binario:** `deno check supabase/functions/<app-b>-*/index.ts && node scripts/check-functions-doc.mjs && node scripts/check-env.mjs` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Nombre `<modulo>-<accion>`; JWT verificado salvo webhooks documentados; secretos solo por `Deno.env.get`. Depende de TAREA-26. Puede no ser necesaria si la App B no tiene lógica de servidor: en ese caso marcar `Completada` con la nota "no aplica".

### TAREA-29: Navegación y shell para la App B
- **Archivos afectados:** `src/types/common.ts` (modificar `TabId`), `src/store/NavigationContext.tsx` (modificar), `src/App.tsx` (modificar), `public/manifest.webmanifest` y `public/sw.js` (modificar solo si la App B aporta rutas o caché propias)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && npm run build` termina con código 0, y `src/store/NavigationContext.test.tsx` incluye y pasa un caso para la nueva pestaña.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Hoy `TabId = 'perfil' | 'academia' | 'maxskill'`. Carga perezosa (`React.lazy`) del módulo. Cuidar el service worker: un único `sw.js` sirve a ambos módulos. Depende de TAREA-27.

### TAREA-30: Prueba de humo end-to-end del producto unificado
- **Archivos afectados:** `e2e/unificado.e2e.ts` (crear), `playwright.config.ts` (modificar: `headless` configurable por variable de entorno)
- **Criterio de aceptación binario:** `BASE_URL="$STAGING_URL" TEST_EMAIL="$E2E_EMAIL" TEST_PASSWORD="$E2E_PASSWORD" npx playwright test e2e/unificado.e2e.ts` termina con código 0. Además, la petición `GET "$SUPABASE_URL/rest/v1/profiles?select=id&limit=1"` con la clave anónima devuelve HTTP **200** y la misma petición sin cabecera de clave devuelve HTTP **401**.
- **Modelo asignado:** Qwen Flash
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Recorrido mínimo: registro o login → ver Gemelo → abrir la App B → volver. Solo contra **staging**, nunca producción. Depende de TAREA-26 y TAREA-29.

### TAREA-31: Cierre de la consolidación
- **Archivos afectados:** `docs/design.md` (modificar: quitar marcas `[PENDIENTE-APP-B]`), `docs/tasks.md` (modificar), `CHANGELOG.md` (modificar), `README.md` (modificar)
- **Criterio de aceptación binario:** `npm ci && npm run typecheck && npm run lint && npm run test && npm run build && npm run check:layers && npm run check:migrations && npm run check:env && ! grep -n "PENDIENTE-APP-B" docs/design.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Depende de todas las anteriores. Revisión formal final por el dueño. Confirmar que `docs/design.md` coincide con el código real (R-14).

---

## Registro de cambios de este documento

| Fecha | Cambio |
|---|---|
| 2026-11-02 | Emisión inicial (borrador v0.1) |
