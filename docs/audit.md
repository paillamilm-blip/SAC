# Auditoría estructural — Sistema Ómicrom

| Campo | Valor |
|---|---|
| Fecha | 2026-11-02 |
| Base analizada | `origin/main` @ `043dc47` (2026-10-24, PR #406) |
| Autor | Arquitecto principal (análisis estático, sin modificar código) |
| Estado del documento | **Borrador para revisión formal** |
| Documentos hermanos | [`design.md`](./design.md) · [`tasks.md`](./tasks.md) |

---

## 0. Resumen ejecutivo

1. **La segunda aplicación no está dentro de este repositorio.** Era el hallazgo bloqueante (H-01). El dueño la identificó después (2026-11-02): es el repositorio **`paillamilm-blip/brecha`**, una app Next.js aparte. No hubo "fusión" física; la integración está por hacer. Su inventario y el análisis de impacto están en `docs/fusion/`. La forma de integrarla depende de una decisión pendiente (ADR-004).
2. Lo que sí es verificable es la deuda interna del repositorio actual. Los hallazgos de mayor impacto:
   - **H-02 (Alto):** el trigger que protege `profiles` usa una lista fija de 20 columnas. Columnas añadidas después (`is_premium`, `commission_floor_locked_at`, `streak_days`, `competencias_validadas`) no están en ella, y la política RLS deja al usuario actualizar su propia fila.
   - **H-03 (Alto, por verificar):** `9999_audit_consolidado.sql` se ordena después de `10000…10010` si la CLI compara nombres como texto. En ese caso fallaría en una base nueva y, aunque no fallara, pisaría el `search_path` fijado por `0057`.
   - **H-05 (Medio):** la documentación contradice al código en cifras y arquitectura (Three.js, 9 tabs, 63/75 migraciones...).
3. **No pude ejecutar typecheck, lint, test ni build** (el registro npm del sandbox devolvió 403 para `zod`). La línea base ejecutable es la `TAREA-01`.

---

## 1. Alcance y límites

### Verificado (con comando reproducible)
- Historial git completo (943 commits, 1 commit raíz, 137 ramas remotas).
- Estructura de `src/`, grafo de imports, módulos sin importadores, uso de variables de entorno.
- Las 92 migraciones: nombres, orden, tablas, funciones, políticas, triggers.
- Edge Functions: inventario y quién las invoca desde el front.

### No verificado
| Qué | Por qué | Cómo se cierra |
|---|---|---|
| Segunda app | No está en `origin/main` ni en ninguna rama remota | `TAREA-02` |
| `typecheck`, `lint`, `test`, `build` | `npm ci` → HTTP 403 (`zod`) en el sandbox | `TAREA-01` en CI o máquina local |
| Estado de la base remota (`supabase_migrations.schema_migrations`, datos reales) | Sin credenciales ni acceso | `TAREA-04` (local) y revisión del dueño (remota) |
| Orden real de aplicación de la CLI de Supabase | La documentación consultada no lo confirma; el issue relacionado devolvió 403 | `TAREA-04` (prueba empírica) |
| Explotabilidad de H-02 | No se probó contra ninguna base real, a propósito | `TAREA-05` en base local |

---

## 2. Auditoría de la fusión

### H-01 · Crítico · La segunda app no está en el repositorio

Evidencia:

| Comprobación | Resultado |
|---|---|
| Commits raíz (`git rev-list --max-parents=0 --all`) | 1 solo: `16070c4`, 2026-06-26 (un único linaje) |
| `package.json` / `vite.config.*` / `index.html` versionados | 1 de cada uno; no hay subproyectos |
| Directorios top-level versionados | `.kiro`, `src`, `supabase`, `public`, `.tasks`, `scripts`, `.github`, `e2e` |
| `git status` del clon | limpio, sin trabajo sin confirmar |
| Ramas remotas que contienen `omicron-next/` | 0 |

Antecedente relevante: `omicron-next/` (Next.js 14, con su propio `package.json` y `supabase/`) sí existió. Entró el 2026-07-09 y **se separó el mismo día** a `paillamilm-blip/sac` (commit `e0b5265`). Ese repositorio devuelve 404 con las credenciales del sandbox (privado, renombrado o eliminado).

Otras lecturas posibles de "fusión" y por qué no las doy por buenas:

| Hipótesis | Evidencia | Veredicto |
|---|---|---|
| App B = `omicron-next` / `sac` | Separado el 2026-07-09; no reintegrado | Posible, no confirmado |
| "Fusión" = orbe + Red Viva | Commit `6c8b864` fusiona dos pantallas de la misma app | No encaja con "base de datos distinta" |
| App B = otro repo de la cuenta (`tuprofeindustrial-web`, `VideoseductaivosIA`, `causaspro`) | Cada uno tiene su propio stack; ninguno referenciado aquí | Sin evidencia |
| La fusión vive en una rama local o fork no publicado | No verificable desde aquí | Posible |

**Resolución (2026-11-02).** Primero el dueño indicó que solo tenía el prompt de la App B; después compartió `paillamilm-blip/brecha` y confirmó que **esa es la App B** (2 commits, ambos del 2026-11-02, generados a partir de ese prompt). Queda descartado `sac`/`omicron-next`. Ómicrom, con sus 92 migraciones, es la única app con base de datos.

Consecuencias:
- Los puntos 1a y 1b (duplicados y colisiones entre apps) se resuelven en [`fusion/impacto.md`](./fusion/impacto.md), contra el código real. Resultado: **no hay duplicados de archivos ni choques de nombres de tablas**; las colisiones son de runtime (servidor Node frente a SPA estática), de versión de React (18 frente a 19), de CSS global y de lógica de IA duplicada.
- La integración de datos se reduce a tablas nuevas `brecha_*` sin tocar las 92 migraciones (design §4.6). **No hay datos que migrar**: `data/` está ignorado y el repositorio no contiene análisis ni CVs.
- Se añaden los hallazgos propios de la App B (B-01 a B-08, ver [`fusion/app-b-inventario.md`](./fusion/app-b-inventario.md) §8): sin autenticación, persistencia en disco y privacidad de CVs en el nivel gratuito de Gemini.
- La TAREA-02 queda `Completada`, la TAREA-24 `En progreso`, y las 25–48 esperan la aprobación del producto único y de la modernización. Las tareas 01 y 03–23 no dependen de la App B.

---

## 3. Duplicados y colisiones

### 3.1 Dentro del repositorio actual

| Tipo | Detalle | Severidad |
|---|---|---|
| Archivos idénticos en `src/` | Ninguno (`md5sum`) | — |
| Nombre de archivo repetido | `client.ts` ×3 (`ai`, `query`, `supabase`), `index.ts`, `profile.ts` ×2 (`types/profile.ts`, `features/gemelo/services/profile.ts`) | Bajo |
| Doble fuente de la racha | Cliente: `streakDays()` calcula desde `localStorage` (`gemelo/services/profile.ts:121`). Servidor: `profiles.streak_days` + `get_user_streak()` + RPC `register_daily_activity` (`10004_racha_server.sql`) | Medio |
| Migración repetida por nombre | `rate_limiting.sql` en `0012` y `0031` | Bajo |
| Scripts SQL sueltos que copian migraciones | `APLICAR_PENDIENTES.sql`, `PUESTA_EN_MARCHA.sql`, `CERRAR_HALLAZGOS_SEGURIDAD.sql`, `APLICAR_EN_SUPABASE.sql` (raíz), más `supabase/schema.sql` (25 tablas, última edición 2026-07-07, frente a 59 en migraciones) | Medio |
| Funciones SQL redefinidas en varias migraciones | `recalc_reputation` (definida en 0009, 0050, 9999; 0057 solo la altera); `protect_profile_columns` (0007, 9999; 0057 solo la altera); `ensure_unique_username` (0008, 9999); `object_delivery` (0010, 9999) | Alto (ver H-03) |

### 3.2 Colisiones latentes para cuando entre la App B

Son los puntos donde dos apps pisarían el mismo espacio de nombres. Se evalúan sin conocer la App B:

| Espacio compartido | Estado actual | Riesgo |
|---|---|---|
| Prefijo `omicron_*` en `localStorage` | 9 claves sin registro central (`omicron_previous_rep`, `omicron_onboarding_done`, ...) | Medio |
| Esquema Postgres `public` | 59 tablas creadas, 12 usadas por el front | Alto: sin prefijo ni esquema por módulo |
| Nombres de Edge Functions | 21 funciones, sin convención de prefijo | Medio |
| Alias `@/` y `TabId` | `TabId = 'perfil' \| 'academia' \| 'maxskill'` | Bajo |
| Service worker y manifest PWA | Un solo `public/sw.js` y `manifest.webmanifest` | Medio |
| Variables `VITE_*` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` | Se resuelve compartiendo el mismo proyecto Supabase |

---

## 4. Entorno y dependencias

### H-08 · Medio · Variables de entorno sin lector o sin documentar

Frontend (`import.meta.env` en `src/`) frente a `.env.example`:

| Variable | Leída en `src/` | En `.env.example` | Acción |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Sí | Sí | — |
| `VITE_SUPABASE_ANON_KEY` | Sí | Sí | — |
| `VITE_VAPID_PUBLIC_KEY` | Sí (`pwa/push.ts:12`) | **No** | Documentar |
| `VITE_OPENROUTER_KEY` | **No** | Sí | Eliminar (la IA va por `proxy-ai`) |
| `VITE_SENTRY_DSN` | **No** | Sí | Eliminar o implementar |
| `VITE_ANALYTICS_DOMAIN` | **No** | Sí | Eliminar o implementar |
| `VITE_STRIPE_ENABLED` | **No** | Sí | Eliminar o implementar |

`VITE_OPENROUTER_KEY` merece atención aparte: toda variable `VITE_*` se incrusta en el bundle público. Aunque hoy nada la lee, el archivo invita a rellenarla.

Backend (`Deno.env.get` en `supabase/functions/`), sin documento alguno:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `OPENROUTER_KEY`, `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PISTON_URL`, `CREDENTIAL_SIGNING_KEY`, `BLACKBOX_MASTER_KEY`.

E2E (`process.env`): `BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`.

### Dependencias

- Código en `src/` importa 6 paquetes externos: `react`, `react-dom`, `lucide-react`, `framer-motion`, `@tanstack/react-query`, `@supabase/supabase-js`, más `zod`. Coincide con `dependencies` de `package.json`. **No hay conflicto de versiones hoy.**
- **H-11 · Bajo · Configuración residual:**
  - `vite.config.ts` define `manualChunks` para `three`, `@react-three`, `postprocessing` y `react-router`; ninguno está instalado ni se importa (el orbe 3D se reemplazó por 2D en el commit `78049d2`).
  - `tailwindcss`, `postcss` y `autoprefixer` están instalados; solo 2 archivos usan utilidades (`ProgressRadar.tsx`, `Modal.tsx`). `project-context.md` afirma que Tailwind no se usa en componentes.
  - `tailwind.config.js` remite a `src/theme.ts`, que ya no existe (ahora `src/theme/`).
  - Este es el punto donde una App B con Tailwind, Next.js u otra versión de React generaría el conflicto real; hoy no hay base de comparación.

---

## 5. Base de datos

### H-02 · Alto · `profiles`: protección por lista fija de columnas

Mecanismo actual:
- Política `profiles_update_own`: `for update using (auth.uid() = id)` (`0001_core.sql:104`). Sin `with check` ni restricción de columnas. No hay `GRANT/REVOKE` de columna en ninguna migración.
- Trigger `trg_protect_profile` (BEFORE UPDATE) revierte 20 columnas con una lista fija (`0007`, `9999`).

Columnas de `profiles` que **no** están en esa lista y tienen significado de negocio:

| Columna | Origen | Por qué importa |
|---|---|---|
| `is_premium` | `0039_premium.sql` | Entitlement |
| `commission_floor_locked_at` | `0082` | Comisión (el piso "ganado") |
| `streak_days` | `10004` | Racha calculada por el servidor |
| `competencias_validadas` | columna de `profiles` | Afirma competencias validadas |
| `is_ghost`, `member_since` | `profiles` | Estado de cuenta |

Conclusión: **según la lectura del SQL**, un usuario autenticado podría actualizar esas columnas de su propia fila vía PostgREST. No lo probé contra ninguna base; la `TAREA-05` lo demuestra en local con un test que debe fallar hoy.

### H-04 · Medio · `profiles`: INSERT sin restricción de valores

- `profiles_insert_own`: `with check (auth.uid() = id)`. El trigger de protección es solo BEFORE UPDATE.
- `ProfileContext.tsx:139` hace `upsert` desde el cliente con valores para `reputation_score`, `token_*`, `node_*`, etc.
- En el flujo normal la fila ya existe (la crea un trigger de alta) y el upsert se convierte en UPDATE, que sí pasa por el trigger. El hueco existe solo si la fila falta. Severidad moderada, por verificar.

### H-03 · Alto (por verificar) · Orden de migraciones y `9999_audit_consolidado.sql`

Nomenclatura actual: `0000…0082` (4 dígitos), `10000…10010` (5 dígitos) y `9999_` (4 dígitos). Orden como texto: `0082` < `10000` < `10010` < `9999`. Orden como número: `0082` < `9999` < `10000`.

Si la CLI aplica en orden de texto (lo habitual al listar archivos, **por confirmar en `TAREA-04`**):

1. En una base nueva, `9999` corre **después** de `10006` y `10007`, que eliminan tablas vacías (entre ellas `contracts`, `messages`, `blackbox_votes`).
2. `9999` hace `update public.contracts …` y `alter table public.contracts …`. Contra una tabla ya eliminada, el `db reset` falla.
3. Aun sin fallar, `9999` redefine con `create or replace` cinco funciones (`recalc_reputation`, `protect_profile_columns`, `ensure_unique_username`, `object_delivery`, `declare_delivery`). `0057` aplicó `alter function … set search_path = public, pg_temp` al menos a `protect_profile_columns` y `recalc_reputation` (`0057_endurecer_funciones.sql:7-8`). Según el comportamiento documentado de PostgreSQL, `create or replace` sin esa cláusula **descarta** el ajuste de configuración de la función. La `TAREA-06` lo comprueba consultando `pg_proc.proconfig`.

Agravante: la rama `fix/broken-migrations-fresh-apply` (commit `c417bff`, 2026-08-29) corrige `0064`, `0068` y `0072` para que apliquen limpio en una base nueva. **No está fusionada en `main`.** Es evidencia de que el flujo de base nueva ya se rompió antes.

Y un dato que complica el diagnóstico: `10006` y `10007` borran tablas **solo si están vacías**. El esquema resultante depende de los datos de cada entorno; producción (con filas) y una base nueva divergen.

### H-12 · Bajo · Higiene de migraciones

- Huecos de numeración: `0011`, `0060`.
- `rate_limiting.sql` duplicado (0012 y 0031).
- 92 archivos; sin `supabase/config.toml` en el repositorio (no hay entorno local reproducible declarado).

### H-07 · Medio · Esquema de dominios recortados

- Tablas con `CREATE TABLE` en migraciones: **59**. Tablas que usa el front: **12** (`profiles`, `credentials`, `skill_tree_nodes`, `user_lesson_progress`, `push_subscriptions`, `course_lessons`, `user_course_progress`, `reputation_history`, `omicron_skill_proofs`, `daily_activity`, `analytics_events`, `academy_courses`).
- RPC usadas por el front: 12. Funciones SQL definidas: 107.
- Las migraciones de recorte (`10006`–`10008`) eliminan tablas condicionalmente. Qué sobrevive en producción es desconocido hasta consultar esa base.

### H-06 · Medio · Edge Functions sin consumidor en el front

El front invoca solo 4 de 21: `proxy-ai`, `proxy-tts`, `simulador-universal`, `credential`. Las otras 17 no tienen referencia en `src/`: `analizar-cv`, `arbiter-ai`, `carta-ia`, `chat-assist`, `crear-checkout`, `embed`, `examen-ia`, `ghost-approval`, `market-match`, `notify-matches`, `run-code`, `send-push`, `stripe-webhook`, `sync-jobs`, `tutor`, `verificar-pago`, `vault-oracle`.

Algunas pueden ser legítimas (webhooks, cron, triggers). Hay que clasificarlas; no se asume que estén muertas. Las de pago (`crear-checkout`, `stripe-webhook`, `verificar-pago`) siguen desplegables con secretos reales.

---

## 6. Código y capas

| ID | Sev. | Hallazgo | Evidencia |
|---|---|---|---|
| H-09a | Medio | 15 archivos de UI/estado importan el cliente Supabase directamente | `grep -rl "@/infrastructure/supabase" src --include=*.tsx` |
| H-09b | Medio | 3 dependencias invertidas hacia `features/gemelo` | `store/ProfileContext.tsx`, `hooks/useGemeloActivation.ts`, `shared/utils/guestMode.ts` |
| H-09c | Medio | 0 barrels (`index.ts`) en `features/`; todos los imports entre features son profundos | 21 imports cruzados |
| H-09d | Medio | Ciclos entre features | `gemelo→omicron→gemelo`, `gemelo→academia→gemelo`, `academia→omicron→gemelo→academia` |
| H-10 | Bajo | 9 módulos sin importadores por ruta | `CredentialReview`, `CredentialsPanel`, `Guidance`, `PasaporteGemelo`, `notify`, `TerminosServicio`, `Modal`, `Skeleton`, `useProgressiveBlur` |
| H-13 | Bajo | Archivos grandes | `OrbShell.tsx` 1 691 líneas; 4 más superan 700 |
| H-14 | Bajo | CI: usa `npm install` (la nota que lo justifica es de julio), comentarios citan `src/lib/supabase.ts` y `BITACORA_MAESTRA.md`, inexistentes; E2E no corre en CI (`headless: false`) | `.github/workflows/ci.yml` |

Matices sobre H-10: `TerminosServicio` es una página legal (existe `TERMINOS_SERVICIO.md`); `CredentialReview` y `CredentialsPanel` son las únicas consumidoras de las RPC `review_credential` y `get_pending_credentials`. Puede tratarse de una función de revisor sin cablear, no de código muerto. **Decisión del dueño** antes de borrar.

Direcciones de dependencia actuales entre features (nº de imports): `omicron→redviva` 7, `omicron→gemelo` 6, `gemelo→omicron` 2, `gemelo→academia` 2, `gemelo→redviva` 1, `academia→redviva` 1, `academia→omicron` 1, `academia→gemelo` 1.

---

## 7. Documentación divergente (H-05 · Medio)

| Afirmación en la documentación | Realidad medida |
|---|---|
| `project-context.md`: 9 tabs (`perfil`, `maxskill`, `academia`, `empleos`, `chat`, `market`, `wallet`, `gobernanza`, `vault`) | `TabId` = 3 valores (`src/types/common.ts:13`) |
| 9 módulos en `features/` (incl. `chat`, `empleos`, `market`, `wallet`, `gobernanza`) | 5: `academia`, `auth`, `gemelo`, `omicron`, `redviva` |
| Three.js, `@react-three/*` en el stack | Ausentes de `package.json` y del código |
| `infrastructure/router/routes.ts` | No existe |
| 75 migraciones / 22 funciones (`project-context.md`); 63 / 21 (`README.md`) | 92 / 21 |
| "203 archivos TS/TSX" | 171 en `src/` (146 de producción + 25 de test) |
| `REFACTORING_PLAN.md`, `BITACORA_MAESTRA.md` | No existen |
| `README.md`: IA vía `VITE_OPENROUTER_KEY` | La IA va por la Edge Function `proxy-ai`; la variable no se lee |
| `docs/` | No existía antes de esta auditoría |

---

## 8. Matriz hallazgo → tarea

| Hallazgo | Sev. | Tareas |
|---|---|---|
| H-01 App B ausente | Crítico | 02, 24–39 |
| H-02 `profiles` UPDATE | Alto | 05, 07 |
| H-03 orden de migraciones | Alto | 04, 06, 09 |
| H-04 `profiles` INSERT | Medio | 08 |
| H-05 documentación | Medio | 03 |
| H-06 Edge Functions | Medio | 21 |
| H-07 dominios recortados | Medio | 21, 22 |
| H-08 entorno | Medio | 20 |
| H-09 capas y ciclos | Medio | 10–12, 14–16 |
| H-10 módulos sin importadores | Bajo | 13 |
| H-11 configuración residual | Bajo | 19 |
| H-12 higiene de migraciones | Bajo | 09, 22 |
| H-13 archivos grandes | Bajo | regla R-12 (no crecer); sin tarea de refactor |
| H-14 CI | Bajo | 23 |
| Doble fuente de la racha | Medio | 17 |
| Colisiones latentes (§3.2) | Medio | 18, 24 |

---

## 9. Preguntas abiertas para el dueño

1. ~~¿Dónde está la App B?~~ **Respondida:** `paillamilm-blip/brecha`.
2. ~~¿Cuál de las dos apps tiene base de datos?~~ **Respondida:** Ómicrom. La App B no tiene datos previos que migrar.
2b. **Nuevas** (de `fusion/impacto.md` §9): ¿opción A o B para integrar? ¿se mide la fase 1b antes de portar? ¿se activa el servicio de pago de Gemini para CVs reales? ¿la marca "Es real" debe influir en Ómicrom?
3. ¿`CredentialReview` / `CredentialsPanel` son una función de revisor pendiente de cablear?
4. ¿Se aprueba ejecutar `supabase migration repair` en la base remota para alinear el orden de `9999_` (ADR-002)?
5. ¿Se mantiene Tailwind o se retira (2 archivos lo usan)?
6. ¿Los dominios recortados (mercado, bóveda, gobernanza, pagos) están congelados definitivamente o volverán?
