# Diseño técnico — Sistema Ómicrom (arquitectura unificada)

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador para revisión formal) |
| Fecha | 2026-11-02 |
| Base | `origin/main` @ `043dc47` |
| Fuente de hechos | [`audit.md`](./audit.md) |
| Plan de ejecución | [`tasks.md`](./tasks.md) |

**Convención de este documento.** Lo marcado **[ACTUAL]** describe lo que existe hoy y fue verificado. Lo marcado **[OBJETIVO]** es el diseño al que se converge. Lo marcado **[PENDIENTE-APP-B]** depende de la decisión ADR-004 (cómo se integra `brecha`) y no puede cerrarse antes.

---

## 1. Alcance y supuestos

- Ómicrom es la única app con base de datos (92 migraciones). La App B es el repositorio **`paillamilm-blip/brecha`** (confirmado por el dueño el 2026-11-02): una app Next.js sin base de datos, con persistencia en disco. Su inventario está en [`fusion/app-b-inventario.md`](./fusion/app-b-inventario.md) y su impacto en [`fusion/impacto.md`](./fusion/impacto.md).
- El diseño fija la arquitectura del producto unificado y las reglas de integración. **La forma de integrar `brecha` depende de ADR-004** (§2.4): no es una "feature más" por defecto, porque necesita un servidor Node que Ómicrom no tiene.
- Stack **[ACTUAL]**, sin cambios propuestos: TypeScript 5.6 estricto, React 18, Vite 5, Supabase (Postgres, Auth, Realtime, Edge Functions en Deno), TanStack Query 5, Zod, Framer Motion, Lucide, Vitest, Playwright. Despliegue en Vercel como PWA.

---

## 2. Arquitectura unificada

### 2.1 Capas **[OBJETIVO]**

Las dependencias van solo hacia abajo. Una capa no importa de las que están por encima.

```
        ┌───────────────────────────────────────────────────────────┐
  5     │ App.tsx · main.tsx            (raíz de composición)       │
        ├───────────────────────────────────────────────────────────┤
  4     │ features/<x>/                 (módulos de dominio)        │
        ├───────────────────────────────────────────────────────────┤
  3     │ store/                        (estado global: contexts)   │
        ├───────────────────────────────────────────────────────────┤
  2     │ shared/                       (UI y utilidades genéricas) │
        ├───────────────────────────────────────────────────────────┤
  1     │ infrastructure/               (adaptadores: supabase, ai, │
        │                                voice, pwa, query, storage)│
        ├───────────────────────────────────────────────────────────┤
  0     │ domain/                       (lógica pura, sin I/O)      │
        └───────────────────────────────────────────────────────────┘
```

| Capa | Puede importar de | No puede importar de |
|---|---|---|
| `domain/` | nada de la app (solo TS estándar y `decimal.js`/`zod`) | React, DOM, Supabase, cualquier capa superior |
| `infrastructure/` | `domain/` | `shared/`, `store/`, `features/` |
| `shared/` | `domain/`, `infrastructure/` | `store/`, `features/` |
| `store/` | `domain/`, `infrastructure/`, `shared/` | `features/` |
| `features/<x>/` | `domain/`, `infrastructure/`, `shared/`, `store/`, otras features **solo por su `index.ts`** | internals de otra feature |
| `App.tsx`, `main.tsx` | todo, por barrels | — |

Estado **[ACTUAL]** frente a la regla: 3 violaciones hacia `features/gemelo` (`store/ProfileContext.tsx`, `hooks/useGemeloActivation.ts`, `shared/utils/guestMode.ts`), 15 archivos de UI que importan Supabase directamente, 0 barrels, 21 imports cruzados profundos y 3 ciclos entre features. Se corrigen en las tareas 10–17.

### 2.2 Estructura de carpetas **[OBJETIVO]**

Cambios mínimos sobre lo existente. No se reorganiza lo que ya cumple.

```
src/
├── domain/                  NUEVO. Lógica pura compartida
│   ├── reputation.ts          ← mover desde features/gemelo/services/reputation.ts (+ test)
│   ├── nodeLevels.ts          ← levelBandFor, bandDisplayFor (hoy en omicron/utils/nodeUnlock.ts)
│   └── types/                 ← AnalyzedProfile y tipos compartidos
├── infrastructure/
│   ├── ai/ pwa/ query/ supabase/ voice/   (existentes)
│   └── storage/keys.ts      NUEVO. Registro central de claves de localStorage
├── shared/                  (existente)
├── store/                   (existente)
├── features/
│   ├── academia/  auth/  gemelo/  omicron/  redviva/    (existentes, cada una con index.ts NUEVO)
│   └── <app-b>/             [PENDIENTE-APP-B] módulo nuevo, mismo molde
├── App.tsx  main.tsx
supabase/
├── migrations/              (ver §4.4)
├── functions/               (ver §5.2)
├── tests/                   NUEVO. Pruebas SQL de RLS y protección de columnas
└── legacy/                  NUEVO. Scripts SQL históricos archivados (no ejecutar)
docs/
├── audit.md  design.md  tasks.md
├── adr/                     Decisiones de arquitectura (ADR-001…)
├── db/                      Estado de la base: orden de migraciones, funciones, dominios
└── fusion/                  [PENDIENTE-APP-B] inventario, colisiones, datos
```

Molde de una feature **[OBJETIVO]**:

```
features/<x>/
├── index.ts         API pública (único punto de entrada para otras features)
├── components/      UI (no importa infrastructure/supabase)
├── hooks/           orquestación de React + datos
├── services/        acceso a datos y lógica de la feature (único lugar con supabase.from/rpc)
└── utils/           funciones puras locales
```

### 2.3 Dirección de dependencias entre features **[OBJETIVO]**

Orden de menor a mayor nivel. Una feature solo importa de las que están a su izquierda.

```
auth    redviva  →  academia  →  gemelo  →  omicron
(aislada)
```

Para llegar a este orden sin ciclos hay que mover cuatro cosas **[ACTUAL → OBJETIVO]**:

| Hoy | Problema | Destino |
|---|---|---|
| `gemelo/services/reputation.ts` (`calculateGemeloDigital`) lo importa `store/` | Capa inferior depende de feature | `domain/reputation.ts` |
| `omicron/utils/nodeUnlock.ts` (`levelBandFor`, `bandDisplayFor`; sin imports) lo importa `gemelo` | Ciclo `gemelo→omicron→gemelo` | `domain/nodeLevels.ts` |
| `gemelo/services/profile.ts` (`streakDays`) lo importan `academia` y `omicron` | Ciclo `gemelo↔academia`; además duplica la racha del servidor | Se elimina; se lee `profiles.streak_days` (TAREA-17) |
| `omicron/services/brain.ts` (`askOmicron`, `OmicronContext`) lo importa `academia` | Ciclo `academia→omicron→gemelo→academia`. `brain.ts` depende solo de `infrastructure/ai` y de `emotion.ts`/`tools.ts` locales | `infrastructure/ai/omicronBrain.ts` (junto a `emotion` y `tools`); decisión confirmada en TAREA-12 |

### 2.4 Cómo entra la App B **[PENDIENTE: decisión ADR-004]**

`brecha` es una app Next.js con servidor Node (rutas API, escritura en disco, clave de IA en el servidor). Ómicrom es una SPA estática cuyo único backend es Supabase. Hay dos caminos viables (detalle y esfuerzo en [`fusion/impacto.md`](./fusion/impacto.md) §3):

- **Opción A:** `brecha` sigue como app independiente y comparte el proyecto Supabase (Auth, `profiles`, tablas `brecha_*` con RLS). No cambia Ómicrom.
- **Opción B:** se porta a Ómicrom como feature; sus 2 rutas API pasan a Edge Functions y su almacenamiento a Postgres y Storage.

La opción C (migrar Ómicrom a Next.js) queda descartada. Recomendación vigente: validar primero la hipótesis de producto de `brecha` (fase 1b, ≥6/10 brechas reales) y portar solo si se confirma.

**Si se elige B**, rigen estas reglas, que son las mismas para cualquier módulo nuevo:

1. Entra como **una feature**: `src/features/brecha/` con barrel, molde de §2.2 y sin saltarse las capas.
2. **No** trae su propio cliente Supabase, su propio sistema de rutas global ni su propio `package.json`. Usa `infrastructure/supabase/client.ts`.
3. Sus dependencias nuevas requieren ADR y entrada en la tabla de §6.2.
4. Sus tablas, funciones y claves de `localStorage` siguen los espacios de nombres de §4.6, §5.2 y §5.4.
5. Se registra en la navegación ampliando `TabId` (`src/types/common.ts`) y el shell de `App.tsx`.

---

## 3. Modelo de datos

### 3.1 Entidades del núcleo **[ACTUAL]**

Columnas extraídas de las migraciones. **Esc.** indica quién puede escribir.

**`profiles`** (42 columnas; creada en `0000`, ampliada hasta `10004`) — `id` (PK = `auth.users.id`)

La columna **Esc.** expresa la política **objetivo** (§3.4). La protección vigente es parcial: hoy el trigger cubre 20 columnas y deja fuera `is_premium`, `commission_floor_locked_at`, `streak_days`, `competencias_validadas`, `is_ghost` y `member_since` (audit H-02).

| Grupo | Columnas | Esc. |
|---|---|---|
| Identidad | `username`, `full_name`, `avatar_url`, `bio`, `location`, `email`, `created_at`, `member_since`, `updated_at` | usuario (identidad); resto sistema |
| Reputación (derivadas) | `reputation_score`, `reputation_updated_at`, `execution_score`, `quality_score`, `transcendence_score`, `foundation_score`, `traditional_score`, `experience_score`, `pe_points` | **solo servidor** |
| Nodo | `node_type`, `node_level`, `node_status`, `is_verified_professional`, `can_receive_contracts`, `is_pioneer`, `last_audit_date` | **solo servidor** |
| Economía | `token_balance`, `token_escrow`, `total_earnings`, `total_contracts_completed`, `is_premium`, `commission_floor_locked_at` | **solo servidor** |
| CV y competencias | `skills`, `cv_summary`, `competencias_validadas` | RPC `aplicar_analisis_cv` / `convalidar_credencial` |
| Presentación | `user_color`, `onboarding_profession`, `onboarding_senior_label`, `onboarding_completed_at` | usuario |
| Actividad | `last_activity_at`, `streak_days`, `is_ghost` | **solo servidor** |

**`credentials`** — `id`, `user_id`, `cred_type`, `title`, `issuer`, `issue_date`, `expiry_date`, `has_qr`, `verification_url`, `document_path`, `experience_years`, `points`, `status`, `verified_by`, `verified_at`, `reject_reason`, `created_at`.

**Academia** — `academy_courses` (`id`, `node_id`, `title`, `description`, `cover_emoji`, `difficulty`, `passing_score`, `order_index`, `is_published`) → `course_lessons` (`course_id`, `content`, `video_url`, `order_index`) · `user_course_progress` (`user_id`, `course_id`, `status`, `quiz_score`, `quiz_passed`, `completed_at`) · `user_lesson_progress` (`user_id`, `lesson_id`, `completed_at`).

**Skills** — `skill_tree_nodes` (`id` uuid, `title`, `category`, `parent_node_id`, `difficulty_level`, `pe_reward`, `origin`, `created_by`, …) · `user_skill_progress` (`user_id`, `node_id`, `status`, `progress_percentage`, `attempts`, `validated_at`) · `omicron_skill_proofs` (`user_id`, `skill_key`, `skill_label`, `best_score`, `proofs_count`, `tokens_earned`, `first_proven_at`, `last_proven_at`).

**Fondo** — `omicron_knowledge_fund` (`id`, `direction`, `amount`, `source`, `user_id`, `ref`, `note`, `created_at`); RLS activa sin políticas de lectura para el cliente (solo RPC).

**Retención y telemetría** — `daily_activity` (`user_id`, `activity_date`, `challenge_completed`, `pe_earned`) · `push_subscriptions` · `analytics_events` · `reputation_history`.

### 3.2 Invariantes **[ACTUAL, obligatorios]**

Fuente: `DEFINICION_REPUTACION_OMICROM.md` y `0050_reputacion_canonica.sql`.

```
experience_score = round( (execution + quality + transcendence + foundation) / 4 , 2 )   ∈ [0,100]
base             = 0.20 × traditional_score + 0.80 × experience_score
momentum         = min( 15 , round( sqrt(max(pe_points,0)) / 4 , 2 ) )
reputation_score = min( 100 , max( 0 , round(base + momentum , 2) ) )
```

- Solo el trigger `recalc_reputation` calcula estos valores. El cliente nunca los escribe.
- Niveles de nodo: 1 = 0–49, 2 = 50–79, 3 = 80–100. Los umbrales provienen de `project-context.md`, que está desactualizado en otros puntos; TAREA-12 los contrasta con `levelBandFor` antes de moverlo a `domain/`.
- `experience_score` es derivado: nunca se acumula a mano.

### 3.3 Dominios de tablas **[OBJETIVO]**

Cada tabla pertenece a un dominio con estado explícito. Se documenta en `docs/db/dominios.md` (TAREA-21).

| Dominio | Estado | Tablas (parcial) |
|---|---|---|
| Gemelo (perfil, reputación, credenciales) | **Activo** | `profiles`, `credentials`, `reputation_history` |
| Academia y skills | **Activo** | `academy_courses`, `course_lessons`, `user_*_progress`, `skill_tree_nodes`, `omicron_skill_proofs` |
| Retención / telemetría | **Activo** | `daily_activity`, `push_subscriptions`, `analytics_events` |
| Fondo de Conocimiento | **Activo (solo RPC)** | `omicron_knowledge_fund`, `omicron_platform_revenue` |
| Mercado, empleos, pagos, bóveda, gobernanza, social | **Congelado** (el recorte 10006–10008 las elimina si están vacías) | `contracts`, `escrow_contracts`, `market_services`, `jobs`, `messages`, `knowledge_vault_documents`, `disputes`, … |

Regla: una tabla congelada no recibe cambios de esquema. Si el dominio vuelve, se reactiva con una migración nueva y se actualiza esta tabla.

### 3.4 Política de escritura de `profiles` **[OBJETIVO]** (ADR-003)

Reemplaza la lista negra (trigger sobre 20 columnas) por una **lista blanca** de columnas editables:

```sql
revoke update on public.profiles from authenticated, anon;
grant  update (full_name, username, avatar_url, bio, location,
               user_color, onboarding_profession, onboarding_senior_label,
               onboarding_completed_at)
       on public.profiles to authenticated;
```

- Toda columna nueva nace **no editable** por el cliente; para exponerla hay que añadirla al `grant` en la misma migración.
- El trigger `protect_profile_columns` se mantiene como segunda barrera.
- `INSERT` desde el cliente se cierra (`revoke insert`). La fila la crea el trigger de alta, y el fallback del front pasa por una RPC `ensure_profile()` (TAREA-08).
- La lista de columnas editables sale de los `update()` reales del front: `onboarding_*` (`onboardingSync.ts`), `user_color` (`userColorSync.ts`). TAREA-07 la confirma con `grep` antes de aplicar.

### 3.5 Contratos de datos entre módulos fusionados **[PENDIENTE-APP-B]**

Qué se define ya, sin conocer la App B:

| Punto de contacto | Contrato |
|---|---|
| Identidad | La App B usa `auth.users.id` / `profiles.id`. No crea tabla de usuarios propia |
| Reputación | La App B puede **leer** `profiles` y emitir eventos hacia RPC de Ómicrom; no escribe columnas derivadas |
| Datos propios | Tablas con prefijo del módulo (§4.6), RLS activa desde su primera migración |
| Eventos | `analytics_events(event_name, properties)` con `event_name` prefijado por módulo (`<app-b>.<evento>`) |

---

## 4. Base de datos

### 4.1 Estado **[ACTUAL]**
92 archivos en `supabase/migrations/`. 59 tablas creadas, 107 funciones, RLS activada en 59 tablas. Sin `supabase/config.toml` (no hay entorno local declarado). Riesgos detallados en `audit.md` §5.

### 4.2 Entorno local reproducible **[OBJETIVO]**
`supabase/config.toml` versionado y `scripts/db-test.sh` que levanta una base local, aplica todas las migraciones y ejecuta `supabase/tests/*.sql`. Es prerrequisito de las tareas 04–08.

### 4.3 Reglas generales de SQL **[OBJETIVO, obligatorias]**
Ver reglas R-04 a R-07 en §7.

### 4.4 Convención de migraciones **[OBJETIVO]** (ADR-002)

| Aspecto | Regla |
|---|---|
| Nombre de las nuevas | `YYYYMMDDHHMMSS_slug.sql` (14 dígitos, UTC) |
| Existentes | `0000…0082`, `10000…10010` quedan congeladas; no se editan salvo lo indicado abajo |
| `9999_audit_consolidado.sql` | Es la única migración cuyo orden como texto difiere del orden como número. Se corrige en TAREA-06 |
| Coherencia | El orden como texto debe ser igual al orden como número. Lo verifica `scripts/check-migrations.mjs` (TAREA-09) |
| Idempotencia | `if not exists` / `create or replace` / `drop … if exists`. Una migración se puede reaplicar |
| Funciones | `create or replace function` de una función existente debe **repetir todos sus atributos** (`security definer`, `set search_path`), nunca omitirlos |
| Borrados | `DROP` solo con comentario `-- DESTRUCTIVO:` y nota de respaldo. Prohibido el borrado condicionado a datos (`if count = 0`): produce esquemas distintos por entorno |
| Cambios sobre las ya aplicadas | Si una migración aplicada necesita corrección, se añade una nueva. La única excepción documentada es ADR-002 |

Por qué 14 dígitos: con prefijo de 4 o 5 dígitos el orden como texto y como número divergen en cuanto se mezclan longitudes (`9999` frente a `10000`). Con `0xxx` < `1xxxx` < `2026…` ambos órdenes coinciden, así que nada nuevo puede reordenarse respecto a lo existente.

**ADR-002 — decisión recomendada para `9999_`** (se confirma con el resultado de TAREA-04):

| Opción | Efecto | Riesgo |
|---|---|---|
| **A (recomendada)** Renombrar a `0083_audit_consolidado.sql`, añadir `set search_path = public, pg_temp` a sus 5 funciones y guardas `to_regclass` para las tablas que `10006` pueda haber eliminado | Orden como texto = orden como número; una base nueva queda con el `search_path` correcto | Requiere `supabase migration repair` en la remota (cambio de metadatos). **Necesita aprobación explícita del dueño** |
| B Dejar el nombre y solo endurecer las funciones | Evita tocar la remota | No resuelve el orden en una base nueva; si la CLI ordena por texto, `9999` seguiría al final |
| C Aplanar todo en una migración base nueva | Resultado limpio | Es la opción más invasiva; pierde la historia de ejecución |

### 4.5 Orden relativo con la remota
El historial remoto (`supabase_migrations.schema_migrations`) puede no coincidir con los archivos: varios scripts históricos se pegaban a mano en el editor SQL (`audit.md` §3.1). Antes de ejecutar cualquier `repair`, el dueño exporta `supabase migration list` de la remota y se compara con los archivos (TAREA-06, criterio previo).

### 4.6 Integración de los datos de la App B **[PENDIENTE-APP-B]**

Cómo se hace **sin romper** las migraciones actuales:

1. **Solo se añaden migraciones nuevas** con prefijo de 14 dígitos. No se edita ninguna de las 92 existentes.
2. **Espacio de nombres**: tablas nuevas con prefijo del módulo (`<app_b>_*`) en `public`, o esquema propio `<app_b>` si el volumen lo justifica (decisión en ADR-004 tras TAREA-25). No se reutilizan nombres ya usados, incluidas las tablas congeladas.
3. **RLS desde el día uno**: cada `create table` va acompañada de `enable row level security` y sus políticas en la misma migración. Un test SQL falla si una tabla del módulo no tiene RLS.
4. **Claves foráneas** hacia `profiles(id)` con `on delete cascade` donde el dato sea del usuario.
5. **Datos existentes**: `brecha` no trae datos que migrar (su carpeta `data/` está ignorada por git y el repositorio no contiene análisis ni CVs). Si en el futuro hay datos de pruebas locales que conservar, se migran con un script idempotente aparte, nunca dentro de una migración SQL, y con modo `--dry-run`.
6. **Compatibilidad hacia atrás**: ninguna tabla, columna o RPC existente cambia de firma por la integración. Cualquier cambio sobre `profiles` pasa por §3.4.

---

## 5. Contratos de comunicación

### 5.1 RPC de Postgres que consume el front **[ACTUAL]**

Firmas tomadas de la última definición en el orden de archivos. La mayoría declara `security definer` y `set search_path`; no se verificó función por función (por ejemplo, la captura de `omicron_ensure_skill_node` no mostró `set search_path`). La regla R-05 y la TAREA-06 lo comprueban contra `pg_proc.proconfig`.

| RPC | Parámetros | Retorno | Migración vigente |
|---|---|---|---|
| `convalidar_credencial` | `p_kind text` | `json` | `10010` |
| `aplicar_analisis_cv` | `p_name text, p_skills text[], p_exec numeric, p_qual numeric, p_trans numeric, p_fund numeric, p_years int = null, p_summary text = null, p_skills_detail jsonb = null` | `json` | `0077` |
| `register_exam_success` | `p_skill text, p_score int, p_kind text = 'mixed'` | `json` | `10006` |
| `omicron_ensure_skill_node` | `p_title text` | `json` | `10002` |
| `register_daily_activity` | `p_challenge boolean = false, p_pe int = 0` | `void` | `10004` |
| `submit_quiz` | `p_course_id uuid, p_answers jsonb` | `table(score int, passed boolean)` | `10003` |
| `get_course_quiz` | `p_course_id uuid` | `table(id uuid, question text, options jsonb, order_index int)` | `10005` |
| `mark_lesson_complete` | `p_lesson_id uuid` | `void` | `0020` |
| `review_credential` | `p_credential_id uuid, p_approve boolean, p_reason text = null` | `void` | `0022` |
| `get_pending_credentials` | — | `table(id, user_id, username, cred_type, title, issuer, document_path, verification_url, experience_years, created_at)` | `0022` |
| `get_public_credential` | `p_username text` | `table(id, username, full_name, avatar_url, bio, location, node_type, node_level, is_verified_professional, reputation_score, execution_score, quality_score, …)` | `0078` |
| `get_email_for_login` | `p_identifier text` | `text` | `0041` |

Reglas del contrato: las RPC devuelven `json` o `table`, nunca filas de `profiles` completas; los errores de negocio se señalan con `raise exception` y código reconocible; añadir parámetros solo con `default`.

### 5.2 Edge Functions **[ACTUAL + OBJETIVO]**

Invocadas hoy por el front (4 de 21):

| Función | Invocada desde | Cuerpo de la petición | Respuesta |
|---|---|---|---|
| `proxy-ai` | `infrastructure/ai/client.ts` (`callAI`), `stream.ts` | `{ messages: AIMessage[], options?: { maxTokens, temperature, jsonMode } }` | Texto o flujo; errores tipados `AIError` (`timeout`, `credits`, `server`, `network`) |
| `proxy-tts` | `omicron/services/voice.ts`, `infrastructure/voice/voiceAI.ts` | `{ text, voice, format: 'mp3' }` | Audio; fallback a `speechSynthesis` |
| `simulador-universal` | `academia/components/UniversalSimulator.tsx` | `{ action: 'iniciar', node_id }` · `{ action: 'defensa', session_id, caso_respuesta }` · `{ action: 'evaluar', session_id, respuestas, caso_respuesta, defensa_respuesta }` | `{ ejes, pe_awarded, … }` o `{ error }` |
| `credential` | `gemelo/components/RedSocial.tsx`, `VerifyCredential.tsx` | `{ action: 'issue' }` · `{ action: 'verify', token }` | `{ token }` · `{ valid, cred }` |

Las otras 17 se clasifican en TAREA-21 (webhook, cron, trigger, sin uso).

Convenciones **[OBJETIVO]** para funciones nuevas: nombre `<modulo>-<accion>` en kebab-case; verificación de JWT activa salvo webhooks documentados; secretos solo por `Deno.env.get`; respuesta de error `{ error: string, code?: string }`; cada función figura en `docs/db/edge-functions.md`.

### 5.3 API pública entre features **[OBJETIVO]**

Cada `features/<x>/index.ts` exporta únicamente lo que hoy ya consumen otras features (cálculo del 2026-11-02). Todo lo demás pasa a ser privado.

| Feature | Exporta |
|---|---|
| `auth` | `AuthOverlay`, `NoAccess`, `ResetPasswordOverlay` |
| `redviva` | `RedVivaCanvas`, `RedVivaHome`, `useRedViva`, `asegurarNodoDeExamen`, `tomarExamenPendiente`, tipos `NodoRed`, `RedVivaModel`, y `resumenRed`, `textoEstado` |
| `academia` | `DailyChallengeCard`, `StreakBanner` |
| `gemelo` | `LiveNetworkFeed`, `PublicProfileGate`, `VerifyCredentialView`, `useGemeloProfile`, `evaluateProactiveEvents`, `getNextProfileQuestion`, `hasAskedToday`, `markAskedToday`, y el hook de activación del CV (`useGemeloActivation`, tras moverlo en TAREA-12) |
| `omicron` | `OrbShell` |
| `<app-b>` | **[PENDIENTE-APP-B]** |

Tras TAREA-12 salen de las features y pasan a `domain/` o `infrastructure/`: `calculateGemeloDigital`, `AnalyzedProfile`, `levelBandFor`, `bandDisplayFor`, `askOmicron`, `OmicronContext`. `streakDays` desaparece (TAREA-17).

### 5.4 Almacenamiento en el cliente **[ACTUAL + OBJETIVO]**

Claves actuales, congeladas (renombrarlas borraría el estado de los usuarios): `omicron_previous_rep`, `omicron_previous_pe`, `omicron_last_login`, `omicron_push_dismissed`, `omicron_last_challenge_pe`, `omicron_axes_snapshot`, `omicron_visit_count`, `omicron_onboarding_done`, `omicron_gemelo_phantom_expire`.

Claves nuevas: `omicron:<modulo>:<clave>`, declaradas en `infrastructure/storage/keys.ts`. Ningún otro archivo llama a `localStorage` con una cadena literal (TAREA-18).

### 5.5 Variables de entorno **[OBJETIVO]**

| Ámbito | Archivo de referencia | Variables |
|---|---|---|
| Frontend (se publican en el bundle) | `.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` |
| Edge Functions (secretos) | `supabase/functions/.env.example` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `GEMINI_API_KEY`, `OPENROUTER_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PISTON_URL`, `CREDENTIAL_SIGNING_KEY`, `BLACKBOX_MASTER_KEY` |
| E2E | `e2e/.env.example` | `BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD` |

Regla: ninguna variable `VITE_*` contiene un secreto. `scripts/check-env.mjs` falla si hay una variable leída sin documentar o documentada sin lector (TAREA-20). Se retiran `VITE_OPENROUTER_KEY`, `VITE_SENTRY_DSN`, `VITE_ANALYTICS_DOMAIN`, `VITE_STRIPE_ENABLED` salvo que alguien las implemente.

---

## 6. Dependencias

### 6.1 Permitidas hoy
Runtime: `react`, `react-dom`, `@supabase/supabase-js`, `@tanstack/react-query`, `framer-motion`, `lucide-react`, `zod`, `decimal.js`.
Desarrollo: `vite`, `@vitejs/plugin-react`, `typescript`, `typescript-eslint`, `eslint` y plugins, `vitest`, `jsdom`, `@testing-library/*`, `@playwright/test`.
En decisión: `tailwindcss`, `postcss`, `autoprefixer` (2 archivos las usan; TAREA-19).

### 6.2 Dependencias de la App B **[PENDIENTE-APP-B]**
Se registran aquí tras TAREA-24. Toda dependencia nueva exige: motivo, alternativa descartada y peso en el bundle.

---

## 7. Reglas técnicas obligatorias

Cada regla indica cómo se verifica. Las marcadas **[CI]** rompen el build al violarlas, una vez implantada la tarea indicada.

| ID | Regla | Verificación |
|---|---|---|
| R-01 | Respetar las capas de §2.1. Una feature solo importa de otra por su `index.ts` | **[CI]** `scripts/check-layers.mjs` (TAREA-10) |
| R-02 | Solo `services/` e `infrastructure/` (y `store/`, `App.tsx` como composición) llaman a `supabase.from/rpc/functions`. Los componentes no | **[CI]** `check-layers` |
| R-03 | El cliente no escribe columnas derivadas, de economía ni de estado. La reputación se calcula solo en el servidor | Pruebas SQL `supabase/tests/` (TAREA-05, 07) |
| R-04 | Migraciones nuevas: nombre de 14 dígitos, idempotentes, con RLS en la misma migración, sin borrado condicionado a datos | **[CI]** `scripts/check-migrations.mjs` (TAREA-09) |
| R-05 | Toda función `security definer` lleva `set search_path = public, pg_temp`; al redefinirla se repiten todos sus atributos | Prueba SQL sobre `pg_proc.proconfig` (TAREA-06) |
| R-06 | Toda función expuesta a clientes declara `revoke … from public, anon` y `grant` explícito | Revisión + prueba SQL |
| R-07 | Toda tabla del esquema `public` tiene RLS activada | Prueba SQL (`pg_tables.rowsecurity`) |
| R-08 | Variables de entorno documentadas en su `.env.example`; ningún secreto en `VITE_*` | **[CI]** `scripts/check-env.mjs` (TAREA-20) |
| R-09 | `localStorage` solo a través de `infrastructure/storage/keys.ts` | **[CI]** `check-layers` (regla de strings) |
| R-10 | TypeScript `strict`. No añadir `any` nuevos (el recuento no puede subir) | `npm run lint` + línea base |
| R-11 | Lógica nueva con prueba de unidad (Vitest). Cambio de RLS o RPC con prueba SQL | Revisión de PR |
| R-12 | Archivos nuevos ≤ 400 líneas. Los que hoy superan 600 (`OrbShell.tsx` 1 691, `CredencialModal.tsx` 831, `MaxSkillTab.tsx` 725, `AcademiaTab.tsx` 714, `AuthOverlay.tsx` 681) no pueden crecer | Revisión de PR |
| R-13 | Toda Edge Function figura en `docs/db/edge-functions.md` con consumidor y modo de autenticación | **[CI]** script en TAREA-21 |
| R-14 | Todo cambio estructural actualiza `docs/design.md` en el mismo PR | Revisión de PR |
| R-15 | Ramas + PR hacia `main`; CI en verde: `typecheck`, `lint`, `test`, `build` y los `check:*` | `.github/workflows/ci.yml` (TAREA-23) |
| R-16 | `main` se instala con `npm ci` (lockfile determinista) | CI |
| R-17 | Texto de interfaz en español latinoamericano neutro (sin voseo), código en inglés, comentarios en español | Revisión de PR |

---

## 8. Decisiones de arquitectura (ADR)

| ID | Decisión | Estado |
|---|---|---|
| ADR-001 | Desarrollo guiado por especificaciones: `docs/design.md` y `docs/tasks.md` son la fuente de verdad; el código sigue a los documentos | Propuesta |
| ADR-002 | Orden y nomenclatura de migraciones; tratamiento de `9999_` | Propuesta; **depende de TAREA-04 y aprobación del dueño** |
| ADR-003 | Escritura de `profiles` por lista blanca de columnas (`GRANT` por columna) | Propuesta |
| ADR-004 | Integración de la App B (`brecha`). **Propuesta vigente: producto único** dentro de `Sistema-omicrom` con el frontend y el flujo de `brecha` y la voz de Ómicrom (ver `fusion/producto-unico.md`). Reemplaza la opción A (dos apps) | **Pendiente de aprobación del dueño** (TAREA-25) |
| ADR-005 | Orden de dependencias entre features y capa `domain/` | Propuesta |

---

## 9. Riesgos y supuestos

| Riesgo / supuesto | Mitigación |
|---|---|
| La App B no se localiza o difiere de lo supuesto | Las tareas 24–31 quedan `Bloqueada`; las 01–23 son independientes y se pueden ejecutar ya |
| La CLI de Supabase ordena de otra manera a la supuesta | TAREA-04 lo mide antes de cualquier cambio |
| `supabase migration repair` altera la remota | Solo con aprobación y tras exportar `migration list` |
| Mover código (barrels, `domain/`) rompe imports | Un movimiento por tarea, con `typecheck` y `test` en verde como criterio |
| Línea base desconocida (typecheck/lint/test/build no ejecutados aquí) | TAREA-01 es la primera y las demás parten de su resultado |
| Los datos de producción difieren del esquema que muestran las migraciones | El dueño exporta el esquema remoto (`supabase db dump --schema-only`) antes de TAREA-06 |
