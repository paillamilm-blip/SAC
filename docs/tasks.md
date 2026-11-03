# Plan de tareas y seguimiento — Consolidación de Sistema Ómicrom

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador para revisión formal) |
| Fecha de emisión | 2026-11-02 |
| Base | `origin/main` @ `043dc47` |
| Especificación | [`design.md`](./design.md) · hechos en [`audit.md`](./audit.md) |
| Tareas | 48 = 2 completadas (02, 24) · 24 pendientes · 22 bloqueadas (06 por aprobación de `migration repair`; 25, 26, 30–48 por la aprobación de `producto-unico.md` y `modernizacion.md`) |

## Cómo usar este documento

- El **orden numérico es el orden de ejecución**. Toda dependencia apunta a una tarea de número menor.
- Una tarea pasa a `Completada` **solo** cuando su *criterio de aceptación binario* se cumple (el comando termina con código 0 o devuelve el código HTTP indicado) y el resultado se pega en *Incidencias o notas*.
- Fechas y horas en formato `YYYY-MM-DD HH:mm`, en **UTC** (el reloj del entorno de ejecución). `—` significa "aún no ocurrió".
- Una tarea = un PR pequeño a `main` (regla R-15).
- Las tareas 25–48 dependen de la aprobación del dueño de `docs/fusion/producto-unico.md` y `docs/modernizacion.md`; sus criterios pueden ajustarse con sus respuestas. Las tareas 27, 28 y 29 (versiones del stack) no dependen de esa aprobación.

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
FASE 4  02 → 24 → 25* → 26* (ley de diseño v2)
        01,19,23 → 27 → 28 → 29            (versiones: Vite 8 → motion → React 19.2)
        26,27 → 30 (tokens)
        25,07,09 → 31 (tablas) → 32 (función, también 20)
        12,25 → 33 (dominio)
        12,18,25,29,30 → 34 (shell)
        31,32,33,34 → 35 (pantallas) → 36 (voz) → 37 (cerrar con prueba) → 38 (retirar UI) → 39 (humo)
FASE 5  35,36 → 40 (a11y) · 35 → 41 (movimiento) · 35,36 → 42 (rendimiento) · 34,35 → 43 (PWA)
        23,38 → 44 (seguridad web) · 36 → 45 (voz completa) · 32,35 → 46 (escáner real)
        40,42 → 47 (CI de calidad) → todas → 48 (cierre)
```
`*` = esperan una decisión del dueño (TAREA-02 ya está completada).

### Resumen de estado

| Fase | Tareas | Estado |
|---|---|---|
| 0 · Compuertas y línea base | 01–03 | 01, 03 Pendiente · 02 Completada |
| 1 · Base de datos y seguridad | 04–09 | 04, 05, 09 Pendiente · 06 Bloqueada (aprobación del dueño) · 07, 08 Pendiente, pero en la práctica esperan a 06 |
| 2 · Estructura del código | 10–19 | Pendiente |
| 3 · Entorno, backend y CI | 20–23 | Pendiente |
| 4 · Producto único (Ómicrom + brecha) | 24–39 | 24 Completada · 27, 28, 29 Pendiente (versiones del stack) · resto Bloqueada (esperan la aprobación del dueño) |
| 5 · Modernización | 40–48 | Bloqueada (esperan el ciclo construido y la ley de diseño v2) |

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

### TAREA-02: Localizar e inventariar la App B
- **Archivos afectados:** `docs/fusion/app-b-inventario.md` (crear)
- **Criterio de aceptación binario:** `test -d /projects/sandbox/brecha/.git && git -C /projects/sandbox/brecha rev-parse HEAD && test -s docs/fusion/app-b-inventario.md` termina con código 0. El inventario lista stack y versiones, estructura, modelo de datos, interfaz HTTP, variables de entorno y hallazgos propios.
- **Modelo asignado:** Qwen Max
- **Estado:** Completada
- **Registro temporal:**
  - Fecha y hora de inicio: 2026-11-02 16:31
  - Fecha y hora de finalización: 2026-11-02 16:36
- **Incidencias o notas:** Criterio ejecutado: exit 0 (commit `4a3ebfc`). El dueño confirmó que la App B es `paillamilm-blip/brecha` (commit `4a3ebfc`, 2 commits del 2026-11-02). Antes se había dicho que solo existía el prompt; existe código generado a partir de él. Se inventarió por lectura estática: `npm install`, `typecheck` y `next build` no se ejecutaron (registro npm bloqueado en el sandbox). Hallazgos B-01 a B-08 registrados en el inventario; B-01 (sin autenticación), B-02 (disco) y B-03 (privacidad) son altos. Desbloquea la TAREA-24.

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

# FASE 4 · Producto único (Ómicrom + brecha)

> Fase definida por [`fusion/producto-unico.md`](./fusion/producto-unico.md): un solo sistema, con el frontend y el flujo de `brecha` dentro de `Sistema-omicrom` (Vite + Supabase), y el asistente de voz de Ómicrom como interfaz. Las tareas 25–34 están `Bloqueada` hasta que el dueño apruebe esa propuesta (preguntas de su §8). La opción A de ADR-004 (dos apps) queda reemplazada.

### TAREA-24: Análisis de impacto y colisiones de la App B (`brecha`) sobre Ómicrom
- **Archivos afectados:** `docs/fusion/impacto.md` (crear)
- **Criterio de aceptación binario:** `test -s docs/fusion/impacto.md && grep -q '^## 1. Colisiones de nombres y compatibilidad' docs/fusion/impacto.md && grep -q '^## 4. Impacto en datos' docs/fusion/impacto.md && grep -q '^## 5. Impacto en Edge Functions y secretos' docs/fusion/impacto.md && grep -q '^## 7. Cambios en código existente' docs/fusion/impacto.md && grep -q '^## 3. Decisión de arquitectura' docs/fusion/impacto.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Completada
- **Registro temporal:**
  - Fecha y hora de inicio: 2026-11-02 16:36
  - Fecha y hora de finalización: 2026-11-02 17:00
- **Incidencias o notas:** Criterio ejecutado: exit 0. Se relajó la dependencia de TAREA-20 (la comparación de variables de entorno se resolvió a mano: solo `GEMINI_API_KEY` coincide) y se retiró el requisito "el dueño responde §9", porque el dueño respondió en sustancia con un pedido nuevo (producto único). Las opciones A/B/C de su §3 quedan **superadas** por `producto-unico.md`, que adopta la base de Ómicrom (variante de la opción B). Conservar `impacto.md` como evidencia de colisiones y de esfuerzo.

### TAREA-25: Aprobar el producto único y fijar ADR-004 (revisado)
- **Archivos afectados:** `docs/adr/ADR-004-producto-unico.md` (crear), `docs/design.md` (modificar §2.4, §3.3 y tabla de ADR)
- **Criterio de aceptación binario:** `grep -q "^Estado: Aceptada" docs/adr/ADR-004-producto-unico.md && grep -q "^Base: Sistema-omicrom" docs/adr/ADR-004-producto-unico.md && ! grep -n "opción A (dos apps" docs/design.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Bloqueada por la aprobación del dueño de `producto-unico.md` §8: (1) base técnica, (2) qué se hace con revelación, pasaporte, Academia y reputación visible (§3.4), (3) servicio de pago de Gemini, (4) nombre del producto, (5) si el PDF se guarda. Sin esas respuestas no se escribe código del producto.

### TAREA-26: Ley de diseño v2 (DESIGN.md y PRODUCT.md)
- **Archivos afectados:** `DESIGN.md` (reescribir), `PRODUCT.md` (modificar Stack, Capacidades y Accesibilidad), `.kiro/steering/pipeline-diseno.md` (modificar si cambia la autoridad), `docs/modernizacion.md` (registrar las decisiones de §5)
- **Criterio de aceptación binario:** `grep -q "oklch" DESIGN.md && grep -q "^## Color de identidad del usuario" DESIGN.md && ! grep -nE "Three\.js|rioplatense|Tailwind 3\.4|Ómicron[^a-z]" PRODUCT.md DESIGN.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Bloqueada por las decisiones de `modernizacion.md` §5: (1) ley v2, (2) qué pasa con el color elegido por la persona, (3) tema claro, (4) ingreso sin contraseña, (5) nombre. Parte de los tokens de `brecha` y conserva los principios de `PRODUCT.md` que siguen vigentes (cero jerga, cada número con su escala, nunca datos falsos, la interfaz no afirma más que el dato). `PRODUCT.md` hoy lista dominios que ya no existen (empleos, mercado, billetera, Three.js). Depende de TAREA-25.

### TAREA-27: Vite 5 → 8
- **Archivos afectados:** `package.json`, `package-lock.json`, `vite.config.ts`, `.github/workflows/ci.yml` (solo si cambia la versión de Node requerida)
- **Criterio de aceptación binario:** `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` termina con código 0, y `node -e "process.exit(require('./package.json').devDependencies.vite.replace(/[^0-9.]/g,'').startsWith('8')?0:1)"` también.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Solo cambia la compilación, no el código de la app. Vite 8 usa Rolldown y Oxc en lugar de esbuild y Rollup (salió el 12 de marzo de 2026; ver [guía de migración](https://github.com/vitejs/vite/blob/main/docs/guide/migration.md)). Revisar si `manualChunks` y `@vitejs/plugin-react` siguen siendo compatibles y si exige otra versión de Node. Registrar tiempos de `build` y tamaños de chunk antes y después. Verificación solo por CI (este entorno no instala paquetes). Un PR, reversible. Depende de TAREA-01, 19 y 23.

### TAREA-28: `framer-motion` → `motion`
- **Archivos afectados:** `package.json`, `package-lock.json`, `vite.config.ts` (regla de chunks que menciona `framer-motion`), y los archivos de `src/` que importan `framer-motion` (30 importaciones medidas)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && npm run build && ! grep -rn "from 'framer-motion'" src` termina con código 0.
- **Modelo asignado:** Qwen Flash
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Cambio mecánico: el paquete se llama ahora `motion` y se importa desde `motion/react`; la v12 no anuncia cambios incompatibles para React ([guía](https://motion.dev/docs/react-upgrade-guide)). Un PR. Depende de TAREA-27.

### TAREA-29: React 18 → 19.2
- **Archivos afectados:** `package.json`, `package-lock.json` (`react`, `react-dom`, `@types/react`, `@types/react-dom`, `@testing-library/react`, `eslint-plugin-react-hooks`), y los archivos de `src/` que usen APIs retiradas
- **Criterio de aceptación binario:** `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` termina con código 0, y `npm ls react 2>/dev/null | grep -q "react@19"` también.
- **Modelo asignado:** Qwen Coder
- **Estado:** Pendiente
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** El paso más delicado del stack: 26 227 líneas de producción y 26 archivos de prueba como red de seguridad. React 19.2 (1 oct 2025) añade `<Activity>` y `useEffectEvent` ([react.dev](https://react.dev/blog/2025/10/01/react-19-2)). Seguir la guía oficial de actualización a 19 y retirar lo que elimina. `eslint-plugin-react-hooks` v6 usa configuración plana. **TypeScript no se sube a 7.0** mientras `typescript-eslint` no lo soporte (se espera con TS 7.1). Un PR. Depende de TAREA-28.

### TAREA-30: Tokens y base CSS moderna
- **Archivos afectados:** `src/styles/tokens.css` (crear), `src/styles/base.css` (crear), `src/main.tsx` (importar), `src/index.css` (quitar el `@import` de Google Fonts), `index.html` (quitar los `preconnect` a Google Fonts)
- **Criterio de aceptación binario:** `npm run build && ! grep -rn "fonts.googleapis.com\|fonts.gstatic.com" src index.html && grep -q "@layer reset, tokens, base, components, utilities" src/styles/tokens.css` termina con código 0.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Implementa la ley v2 (TAREA-26): variables CSS por rol, `@layer`, `color-scheme`, escalas de espaciado, radios y sombras, tamaños fluidos con `clamp()`, `dvh`/`svh`, consultas de contenedor y foco visible. Pila tipográfica de sistema (cumple el principio "sin webfonts" de `PRODUCT.md`, hoy incumplido por `src/index.css:4`). **Cambio visible menor:** Inter y JetBrains Mono pasan a las fuentes de sistema. Las características CSS nuevas se confirman contra el objetivo de navegadores de Vite 8 antes de usarlas. Depende de TAREA-26 y 27.

### TAREA-31: Tablas `brecha_*` con RLS y pruebas SQL
- **Archivos afectados:** `supabase/migrations/<AAAAMMDDHHMMSS>_brecha_tablas.sql` (crear, instante real), `supabase/tests/brecha_rls.sql` (crear)
- **Criterio de aceptación binario:** `supabase db reset && bash scripts/db-test.sh supabase/tests/brecha_rls.sql && node scripts/check-migrations.mjs` termina con código 0. La prueba falla si alguna tabla `brecha_*` tiene `rowsecurity = false`, si un usuario lee filas de otro, o si un usuario inserta directamente en `brecha_analisis`.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Esquema en `fusion/impacto.md` §4, con una diferencia: **no se guarda el PDF** (sin `storage_path`), salvo que el dueño decida lo contrario. `GRANT` por columna: el usuario actualiza solo `veredicto`, `veredicto_en` y, **hasta la TAREA-37**, `dominada_en` (autodeclarada, como en `brecha`). La TAREA-37 revoca ese último permiso y lo reemplaza por una RPC con prueba. Depende de TAREA-25, TAREA-07 y TAREA-09.

### TAREA-32: Edge Function `brecha-analizar`
- **Archivos afectados:** `supabase/functions/brecha-analizar/index.ts`, `supabase/functions/brecha-analizar/validar.ts` (crear; la lógica viene de `brecha/lib/ai/validar.ts`), `supabase/functions/brecha-analizar/validar.test.ts` (crear), `docs/db/edge-functions.md` (modificar)
- **Criterio de aceptación binario:** `deno check supabase/functions/brecha-analizar/index.ts && deno test supabase/functions/brecha-analizar/` termina con código 0, y `curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPABASE_URL/functions/v1/brecha-analizar"` sin cabecera de autorización devuelve exactamente `401`.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Reemplaza `POST /api/analisis`: valida el PDF (≤ 15 MB), aplica el límite por usuario con `_shared/rateLimit.ts`, llama a Gemini con el prompt de `brecha/lib/ai/gemini.ts`, guarda con `service_role` y devuelve el id. **Antes de implementar:** verificar el límite de tamaño de cuerpo de las Edge Functions (PDF de 15 MB ≈ 20 MB en base64); alternativa: subir a Storage temporal y borrar tras analizar. El proveedor `fixture` se conserva para pruebas. No se modifica `proxy-ai`. La pantalla de privacidad y el servicio de pago de Gemini deben estar decididos antes de abrir a usuarios reales. Depende de TAREA-31 y TAREA-20.

### TAREA-33: Dominio de `brecha` con pruebas
- **Archivos afectados:** `src/domain/brecha/types.ts`, `src/domain/brecha/comparar.ts` (mover desde `brecha/lib/`), `src/domain/brecha/comparar.test.ts` (crear)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && node scripts/check-layers.mjs` termina con código 0, y `comparar.test.ts` cubre al menos: brecha cerrada por "dominada", cerrada por "no aparece", brecha nueva y persistente.
- **Modelo asignado:** Qwen Flash
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Cierra el hallazgo B-05 (sin pruebas). `comparar.ts` y `types.ts` no dependen de Node ni de Next, así que se mueven sin cambios de lógica. Depende de TAREA-12 (existencia de `domain/`) y TAREA-25.

### TAREA-34: Shell, enrutado y CSS acotado
- **Archivos afectados:** `src/features/brecha/index.ts`, `src/features/brecha/styles/brecha.module.css` o `brecha.css` con prefijo (crear), `src/App.tsx`, `src/types/common.ts`, `src/store/NavigationContext.tsx`, `src/store/NavigationContext.test.tsx` (modificar)
- **Criterio de aceptación binario:** `npm run typecheck && npm run lint && npm run test && npm run build` termina con código 0, y `NavigationContext.test.tsx` incluye y pasa un caso para cada ruta nueva (`/` y `/reporte/:id`).
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Ómicrom navega por estado y `brecha` por rutas. Decidir entre `react-router-dom` (dependencia nueva, requiere ADR y alta en `design.md` §6.2) o un enrutador mínimo propio sobre la API History. El CSS de `brecha` (1 573 líneas) se acota para no alterar el resto. Comparar el tamaño de los chunks antes y después. Depende de TAREA-12, 18, 25, 29 y 30.

### TAREA-35: Pantallas del ciclo conectadas a Supabase
- **Archivos afectados:** `src/features/brecha/components/{SubirCv,EscaneoCv,MapaCapacidades,PanelReporte}.tsx`, `src/features/brecha/pages/{Inicio,Reporte}.tsx` (reescribir las dos páginas como cliente), `src/features/brecha/services/brecha.ts` (crear: único lugar con acceso a datos), `src/features/brecha/hooks/useAnalisis.ts` (crear)
- **Criterio de aceptación binario:** `npm run typecheck && npm run lint && npm run test && npm run build && node scripts/check-layers.mjs` termina con código 0, y los componentes no importan `@/infrastructure/supabase` (regla R-02).
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Los 5 componentes cliente (1 057 líneas) solo necesitan cambiar `next/link`, `next/navigation` y el destino de `fetch` (`SubirCv.tsx:53`, `PanelReporte.tsx:103`) por el servicio. Las 2 páginas (159 líneas) se reescriben porque hoy son componentes de servidor. `MapaCapacidades` usa `matchMedia` y SVG: revisar la etiqueta "HABILIDAD BLANDA" cortada en móvil (ver `visual-brecha/README.md`). Verificar con capturas contra `visual-brecha/` antes de fusionar. El login de entrada reutiliza `features/auth`; el modo invitado permite escanear antes de registrarse. Depende de TAREA-31, 32, 33 y 34.

### TAREA-36: Asistente conversacional (chat + voz) con origen verificable de cada dato
- **Archivos afectados:** `src/features/assistant/` (crear con `index.ts`, `components/ChatPanel.tsx`, `components/MensajeAsistente.tsx`, `components/FuentesDelDato.tsx`, `components/TarjetaAccion.tsx`, `components/AjustesAsistente.tsx`, `services/historial.ts`, `services/citas.ts`; mover desde `src/features/omicron/services/{voice,oraculo,emotion,tools}.ts` y `components/OmicronBar.tsx`), `src/infrastructure/voice/*` (sin cambios de lógica), `supabase/functions/proxy-ai/` (solo si hace falta ampliar el contrato para devolver citas; **no se modifica sin su propia aprobación**), pruebas `oraculo.test.ts`, `OmicronBar.test.tsx`, `citas.test.ts` y `ChatPanel.test.tsx`
- **Criterio de aceptación binario:** `npm run typecheck && npm run lint && npm run test && node scripts/check-layers.mjs` termina con código 0, y las pruebas verifican que: (a) cada afirmación del asistente recibe una de tres etiquetas, «De tu CV», «Probado» o «Estimación», y una respuesta sin etiqueta se muestra como «Estimación»; (b) una acción propuesta por el asistente (examen, abrir mapa) **no se ejecuta** hasta que la persona la confirma; (c) al interrumpir una respuesta hablada, el historial guarda solo el texto efectivamente escuchado; (d) `oraculo.test.ts` resuelve a una acción las frases "escanear mi CV", "qué brechas tengo", "léeme la primera", "marcarla como real".
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Ver la maqueta en `fusion/mockups/` (`chat-*.png`). **Ya existe** en Ómicrom (verificado): memoria de 10 turnos y streaming de tokens en `brain.ts`, catálogo de herramientas (`[EXAMEN]`, `[CV]`, `[RETO]`, `[ACADEMIA]`), `isSpeechAvailable()`, manejo de errores de voz y entrada de texto. **Hay que construir:** el panel de chat, las citas por afirmación, la clasificación de origen, las tarjetas de acción con confirmación, la interrupción que corrige el historial, el historial persistente con borrado y los ajustes. **Punto técnico abierto:** hoy `proxy-ai` recibe `messages: string` y devuelve texto; para que el modelo devuelva citas hay que definir un formato estructurado. La clasificación de origen **no debe depender solo de lo que diga el modelo**: «De tu CV» y «Probado» se derivan de datos reales (el texto extraído del CV y `omicron_skill_proofs`); lo que no se pueda enlazar a uno de ellos se rotula «Estimación». Las herramientas de la maqueta («Ver en el mapa», ejercicio de práctica) **no existen aún**: `tools.ts` solo cubre examen, CV, reto y academia. `brain.ts` ya se movió a `infrastructure/ai` en la TAREA-12; ajustar la ruta. **Antes:** probar la voz de punta a punta (el PR #406 la marca "en desarrollo"). Depende de TAREA-34 y TAREA-35.

### TAREA-37: Cerrar una brecha con prueba (examen → "dominada" verificable)
- **Archivos afectados:** `supabase/migrations/<AAAAMMDDHHMMSS>_brecha_dominar_rpc.sql` (crear), `supabase/tests/brecha_dominar.sql` (crear), `src/features/brecha/services/brecha.ts` (modificar), `src/features/brecha/components/PanelReporte.tsx` (modificar: botón "Demostrarlo")
- **Criterio de aceptación binario:** `bash scripts/db-test.sh supabase/tests/brecha_dominar.sql && npm run typecheck && npm run test` termina con código 0. La prueba SQL comprueba que un usuario **no puede** poner `dominada_en` por actualización directa y que la RPC `brecha_dominar` solo lo permite si existe una fila en `omicron_skill_proofs` para esa habilidad.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Es la unión de las dos ideas: la brecha de `brecha` se cierra con el examen de Ómicrom (`omicron_ensure_skill_node` → `simulador-universal` → `register_exam_success`). Hay que definir el mapeo `brecha.aprender.que` → `skill_key` (normalización de texto). Se revoca el `GRANT UPDATE (dominada_en)` de TAREA-31. La marca "Es real" sigue siendo una opinión del usuario y **no** alimenta la reputación (regla R-03). Depende de TAREA-35 y TAREA-36.

### TAREA-38: Retirar la UI antigua de Ómicrom
- **Archivos afectados:** `src/features/gemelo/components/**`, `src/features/academia/components/**`, `src/features/redviva/components/**`, `src/features/omicron/components/**` salvo lo que se decida conservar (§3.4 de `producto-unico.md`); `src/App.tsx` (modificar)
- **Criterio de aceptación binario:** `npm run typecheck && npm run lint && npm run test && npm run build && node scripts/check-layers.mjs` termina con código 0, y `node scripts/check-layers.mjs --rule no-orphans` no reporta módulos huérfanos nuevos.
- **Modelo asignado:** Qwen Flash
- **Estado:** Hecha el 3-nov-2026 (PR #8, #9 y el de borrado); se adelantó a TAREA-37 porque no había usuarios en la app vieja. Ver `docs/plan-de-accion.md` §3.5
- **Registro temporal:**
  - Fecha y hora de inicio: 2026-11-03
  - Fecha y hora de finalización: 2026-11-03
- **Incidencias o notas:** Se retiran ≈ 11 500 líneas de UI (44 % de las 26 227 de producción). No se toca backend, migraciones ni datos. Queda recuperable en el historial de git. Un retiro por commit. Esperar a que el ciclo completo funcione (TAREA-37) y a la decisión de §3.4. Depende de TAREA-37.

### TAREA-39: Prueba de humo del ciclo del producto único
- **Archivos afectados:** `e2e/ciclo.e2e.ts` (crear), `playwright.config.ts` (modificar: `headless` configurable por variable de entorno)
- **Criterio de aceptación binario:** `BASE_URL="$STAGING_URL" TEST_EMAIL="$E2E_EMAIL" TEST_PASSWORD="$E2E_PASSWORD" npx playwright test e2e/ciclo.e2e.ts` termina con código 0 (entrar → escanear un PDF de prueba → ver mapa → marcar una brecha como real → cerrar sesión).
- **Modelo asignado:** Qwen Flash
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Solo contra staging, nunca producción. Usar el proveedor `fixture` para no gastar cuota de IA. La fase 1b de `brecha` (≥ 6 de 10 brechas reales con 10 CVs reales) debe estar medida antes de abrir a usuarios. El cierre general del proyecto pasó a la TAREA-48. Depende de TAREA-37 y 38.

---

# FASE 5 · Modernización (después de que el ciclo funciona)

> Define [`modernizacion.md`](./modernizacion.md). Cada tarea convierte una fila de su §2 en un criterio verificable. Todas esperan que el ciclo del producto único esté construido (TAREA-35) y la aprobación de la ley de diseño v2 (TAREA-26).

### TAREA-40: Accesibilidad WCAG 2.2 AA verificada
- **Archivos afectados:** `e2e/a11y.e2e.ts` (crear), `package.json` (añadir `@axe-core/playwright` como dependencia de desarrollo), `src/features/brecha/**` y `src/features/assistant/**` (corregir hallazgos), `docs/accesibilidad.md` (crear)
- **Criterio de aceptación binario:** `npx playwright test e2e/a11y.e2e.ts` termina con código 0 (cero violaciones serias o críticas en cada pantalla del ciclo) y `test -s docs/accesibilidad.md`.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Criterios de WCAG 2.2 a cubrir: objetivo táctil ≥ 24×24 px (el mapa tiene nodos pequeños), foco no oculto por la cabecera ni la barra inferior fijas (`scroll-padding`), alternativa al arrastre del PDF (ya existe el clic), autenticación accesible, entrada no redundante, ayuda en el mismo lugar. **`axe` detecta solo una parte**: `docs/accesibilidad.md` debe registrar la revisión manual con teclado y con lector de pantalla. Fuentes: [W3C](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/). Depende de TAREA-35 y 36.

### TAREA-41: Movimiento moderno con variante reducida
- **Archivos afectados:** `src/styles/motion.css` (crear), `scripts/check-motion.mjs` (crear), `src/shared/motion/**` y `src/features/brecha/**` (adaptar)
- **Criterio de aceptación binario:** `npm run typecheck && npm run test && npm run build && node scripts/check-motion.mjs` termina con código 0. El script falla si un archivo define `animation` o `transition` sin su variante dentro de `@media (prefers-reduced-motion: reduce)`.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Transiciones de pantalla con la API nativa de View Transitions y `@starting-style` para entradas; `motion` solo para gestos. La variante reducida es **más suave, no cero** (regla de `PRODUCT.md`). Depende de TAREA-35.

### TAREA-42: Rendimiento con presupuesto y carga diferida
- **Archivos afectados:** `lighthouserc.json` (crear), `scripts/check-bundle.mjs` (crear), `src/App.tsx` y `src/features/**` (carga diferida del mapa, la voz y el examen), `vite.config.ts`
- **Criterio de aceptación binario:** `npm run build && node scripts/check-bundle.mjs` termina con código 0 (presupuesto de tamaño por chunk definido en el script), y `npx lhci autorun` termina con código 0 con aserciones LCP ≤ 2 500 ms y CLS ≤ 0,1.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Umbrales "buenos" de Core Web Vitals. **INP (≤ 200 ms) no se mide en laboratorio**: en CI se usa TBT como sustituto y el INP real se vigila con datos de campo. El presupuesto se fija con la primera medición real, no antes. Depende de TAREA-35 y 36.

### TAREA-43: PWA moderna: manifiesto, iconos y service worker
- **Archivos afectados:** `public/manifest.webmanifest` (reescribir), `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (crear), `public/sw.js` (reescribir), `index.html` (`og:locale`, `apple-touch-icon`), `scripts/check-manifest.mjs` (crear), `src/infrastructure/pwa/update.ts` (modificar)
- **Criterio de aceptación binario:** `node scripts/check-manifest.mjs && npm run build` termina con código 0. El script verifica: nombre **Ómicrom**, descripción vigente, iconos PNG 192 y 512 más uno *maskable* aparte, `lang` correcto y que cada atajo apunta a una ruta que existe.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Defectos medidos hoy: nombre "Sistema Ómicron", descripción "Marketplace de capital intelectual", atajos a `?tab=wallet` y `?tab=academia` que nada lee, un solo `icon.svg` marcado `any maskable`, `og:locale` `es_ES`. El service worker pasa de "red primero para todo" a precarga del shell versionado, caché solo de recursos estáticos, nunca de las llamadas a Supabase, y aviso de nueva versión. Depende de TAREA-34 y 35.

### TAREA-44: Seguridad web: CSP, HSTS y cabeceras
- **Archivos afectados:** `vercel.json` (modificar), `scripts/check-headers.mjs` (crear)
- **Criterio de aceptación binario:** `node scripts/check-headers.mjs` termina con código 0 (verifica en `vercel.json` `Content-Security-Policy-Report-Only` y luego `Content-Security-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`), y tras desplegar en staging `curl -sI "$STAGING_URL" | grep -qi "^content-security-policy"` también.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Hoy hay 5 cabeceras y **ninguna CSP ni HSTS**. Primero solo informe, se revisan las violaciones en staging y recién entonces se activa la política. La CSP debe permitir el origen de Supabase en `connect-src`. El script de PDF.js desde un CDN (`cvExtract.ts`) desaparece con la TAREA-38. Depende de TAREA-23 y 38.

### TAREA-45: Asistente: voz manos libres, interrupción continua y accesibilidad del chat
- **Archivos afectados:** `src/features/assistant/**` (modificar), pruebas `*.test.tsx` del asistente (crear)
- **Criterio de aceptación binario:** `npm run typecheck && npm run lint && npm run test` termina con código 0, incluyendo pruebas que verifican que (a) sin `SpeechRecognition` el campo de texto sigue permitiendo usar todo el ciclo, (b) los estados *escuchando / pensando / hablando* y los mensajes nuevos se anuncian (`role="log"`, `aria-live`), (c) no se reproduce audio sin una acción del usuario y (d) el modo manos libres se puede apagar en cualquier momento con el teclado.
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Ya existen `isSpeechAvailable()`, manejo de `onerror` y entrada de texto. La interrupción básica y el historial correcto pasan a la TAREA-36; aquí queda el **modo manos libres** (escucha continua) y la revisión de accesibilidad del chat completo. **Por verificar:** explicación del permiso del micrófono y detección de voz propia vs. ruido de fondo (una interrupción accidental no debe cortar la respuesta). `SpeechRecognition` funciona en Chromium y parcialmente en Safari, no en Firefox por defecto, y suele enviar el audio a un servicio en la nube: avisarlo. Probar la voz de punta a punta (el PR #406 la marca "en desarrollo"). Depende de TAREA-36.

### TAREA-46: Escáner del CV con progreso real
- **Archivos afectados:** `supabase/functions/brecha-analizar/index.ts` (modificar: respuesta por eventos), `supabase/functions/brecha-analizar/eventos.test.ts` (crear), `src/features/brecha/services/brecha.ts`, `src/features/brecha/components/EscaneoCv.tsx`, `src/features/brecha/components/SubirCv.tsx`, `src/features/brecha/components/SubirCv.progreso.test.tsx` (crear)
- **Criterio de aceptación binario:** `deno test supabase/functions/brecha-analizar/ && npm run test` termina con código 0. La prueba `SubirCv.progreso.test.tsx`, con temporizadores simulados, comprueba que tras 10 s sin eventos del servidor la etapa **no avanza** más allá de "leyendo".
- **Modelo asignado:** Qwen Coder
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Hoy `SubirCv.tsx` avanza con pausas fijas (`dormir(500)`, `dormir(550)`, `dormir(700)`, `dormir(420)`), sin relación con lo que hace el servidor. `PRODUCT.md` lo prohíbe: "la interfaz no afirma más que el dato". La función emite eventos (`recibido`, `leyendo`, `comparando`, `guardado`) y la interfaz solo avanza con ellos; si no hay evento, el avance es indeterminado. Debe poder cancelarse. Depende de TAREA-32 y 35.

### TAREA-47: Calidad continua: accesibilidad, rendimiento y regresión visual en CI
- **Archivos afectados:** `.github/workflows/ci.yml` (modificar), `playwright.config.ts` (modificar), `e2e/visual.e2e.ts` (crear), `package.json` (modificar scripts)
- **Criterio de aceptación binario:** `grep -q "lhci" .github/workflows/ci.yml && grep -q "a11y" .github/workflows/ci.yml && grep -q "toHaveScreenshot" e2e/visual.e2e.ts` termina con código 0, y el pipeline completo queda en verde en un PR de prueba.
- **Modelo asignado:** Qwen Flash
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Convierte en puertas automáticas lo construido en las tareas 40 y 42, y añade comparación de capturas por pantalla y por ancho (320, 390, 768, 1280). Las capturas de referencia se generan con el CI y las revisa el dueño. Depende de TAREA-40 y 42.

### TAREA-48: Cierre general de la consolidación y la modernización
- **Archivos afectados:** `docs/design.md`, `docs/tasks.md`, `docs/modernizacion.md`, `CHANGELOG.md`, `README.md` (modificar)
- **Criterio de aceptación binario:** `npm ci && npm run typecheck && npm run lint && npm run test && npm run build && npm run check:layers && npm run check:migrations && npm run check:env && ! grep -n "PENDIENTE-APP-B" docs/design.md` termina con código 0.
- **Modelo asignado:** Qwen Max
- **Estado:** Bloqueada
- **Registro temporal:**
  - Fecha y hora de inicio: —
  - Fecha y hora de finalización: —
- **Incidencias o notas:** Depende de todas las anteriores. Revisión formal final por el dueño. Confirmar que `docs/design.md` coincide con el código real (regla R-14) y que no queda ningún "Ómicron" visible fuera de identificadores técnicos.

---

## Registro de cambios de este documento

| Fecha | Cambio |
|---|---|
| 2026-11-02 | Emisión inicial (borrador v0.1) |
