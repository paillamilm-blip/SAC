# Plan A · Motor de aprendizaje unificado (Fase 0 limpieza + Fase 1 motor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ómicrom guarda análisis de CV y brechas en Supabase con estados de aprendizaje server-side, y el análisis IA (`analizar-cv`) devuelve brechas accionables que se persisten solas.

**Architecture:** Migración SQL crea `analisis_cv` + `brechas_aprendizaje` con RLS y una RPC `marcar_brecha` que es la máquina de estados; la Edge Function `analizar-cv` (ya existe, OpenRouter vía `_shared/llm.ts`) se extiende con un prompt que pide brechas, un validador puro compartido, y persistencia server-side con la identidad del JWT. El cliente actualiza el mapa del modo invitado vía el puente `localStorage` que el producto ya exige.

**Tech Stack:** Supabase Postgres (migraciones numeradas 10012+), PL/pgSQL, Deno Edge Functions (`supabase/functions/`), React 18 + TypeScript 5.6 + Vite, Vitest, zod.

**Spec:** `docs/superpowers/specs/2026-10-26-unificacion-omicrom-aprendizaje-design.md` ( decisions D1–D7, ley de salida §1, fases §10)

**Trabajo en:** `C:\Users\paill\Documents\Qoder\2026-10-23\ea694392\Sistema-omicrom`, rama `fase-6-recorte-datos`. (El Plan B — mapa intacto + realtime <3 s + racha — se escribe al aprobarse el cierre de este plan.)

## Addendum del controlador (rulings post-dispatch, 2026-10-26)

Estos fallos del plan original se corrigieron en el código; el texto de los Tasks 4/6 queda como fue escrito y **mandan las firmas corregidas**:

1. `marcar_brecha(p_brecha uuid, p_state text) → **jsonb**` (no `jsonb·text`; la prosa del Task 4 contradecía su propio SQL verbatim — mandó el SQL).
2. `guardar_analisis_completo(p_cv jsonb, p_brechas jsonb, **p_user_id uuid**) → jsonb {analisis_id, brechas: uuid[]}` — **security definer**, granted a `authenticated, service_role`. Motivo (hallazgo T6): invocada desde la Edge Function con service key, `auth.uid()` es NULL y una RPC `security invoker` nunca habría guardado nada. La identidad la pasa la función analizando el JWT verificado via `getUser()` — nunca el cuerpo de la request; la RPC además valida que el usuario exista en `auth.users`.
3. `10012` incluye `drop policy if exists` (re-aplicación segura) y `notify pgrst, 'reload schema'` (las RPCs nuevas quedan visibles en la API sin reinicio).
4. El validador va **inlineado** en `analizar-cv/index.ts` (lección 6F: `_shared/` se congela por función en el dashboard); `_shared/brechas.ts` queda canónica para funciones nuevas y `brechasValidar.ts` es su espejo testeable en vitest.
5. Task 7 queda acotado al servicio `aprendizaje.ts` + tests: el rewire de `useGemeloActivation` ocurre en el Plan B con la UI del mapa (hoy el heurístico `analyzeCV` sigue mandando en la activación; `analizarCvConIA` es su reemplazo declarado cuando la función esté desplegada).

### Addendum de cierre (ronda 2, 2026-10-26) — **el SQL del plan quedó viejo; manda el archivo**

El texto de los Tasks 4, 6 y 8 de este plan se escribió antes de dos rondas de
revisión y **contiene SQL y firmas que ya no existen** (p. ej. el
`guardar_analisis_completo` de dos parámetros del Task 4, y el `ANALISIS_TOPE_DIARIO`
crudo del Task 8). Para pegar en producción no se lee este plan: se lee el archivo.

- Fuente de verdad del SQL: `supabase/migrations/10012_aprendizaje_continuo.sql` y
  `supabase/migrations/10013_ventana_propia_rate_limit.sql`, y su espejo manual
  `APLICAR_EN_SUPABASE.sql` (PASO 6). Cada uno abre con su chequeo pre-pegado y cierra
  con las consultas de verificación post-aplicación y su salida esperada.
- Fuente de verdad del contrato del motor: `supabase/functions/analizar-cv/index.ts`
  (la huella vigente es la del `const BUILD` de ese archivo; se comprueba contra el header
  `x-omicron-build`, no contra este texto) y el canónico `_shared/brechas.ts`, con
  `src/features/gemelo/services/contratoEspejos.test.ts` afirmando que las tres copias
  del validador siguen siendo el mismo texto.

Rulings del controlador que el plan no prevedía y ya son código:

1. **Identidad de skill (spec §4) restaurada en 10012.** El plan la perdió: una brecha
   se identifica por `titulo_normalizado` dentro del usuario (columna generada +
   `brechas_unica_skill` + upsert que refresco lo descriptivo y **nunca** el estado).
   Un CV nuevo que re-detecta una skill ya confirmada, rechazada o dominada no crea el
   duplicado que el usuario tendría que rechazar análisis tras análisis.
2. **Un análisis incompleto no se guarda.** El motor exige los 4 ejes **antes** de la
   RPC y antes de devolver `ok:true` (`ejesUsables`); sin eso, un run basura de la IA
   dejaba fila en `analisis_cv` y contaba como análisis real en la métrica de la Fase 1.
3. **El motor responde dentro de un presupuesto propio** (`PRESUPUESTO_IA_MS = 60 s`,
   carrera en el entry file porque `_shared/llm.ts` está congelado y recorre 6 modelos
   × 25 s). El cliente le creyó primero 90 s; ahora `SAFETY_TIMEOUT_MS = 150 s` cubre
   la cuenta real: motor 60 + fallback Gemini 75 (`gemini.ts:67`) + margen.
4. **Tope nunca silencioso (spec §8), decide el cliente.** 401/429/503 **no** caen al
   fallback Gemini: `analizarCvConFallback` devuelve `{fuente:'bloqueado'}` y el hook
   muestra el texto del servidor. Caerse a Gemini ante un 429 anulaba el control de
   gasto del servidor — el usuario igual obtenía su análisis.
5. **Sin baldío compartido de invitados.** `clientIp()` devuelve `null` si no hay
   ninguna cabecera de origen (antes `'unknown'`, un identificador fijo que ponía a
   todas las personas anónimas en el mismo contador). Invitado sin origen falla
   **cerrado** con 503; usuario con sesión pierde solo el burst por IP y conserva su
   tope diario por id.
6. **El tope diario de invitados es un secret propio:** `ANALISIS_TOPE_DIARIO_INVITADO`
   (default 3) además de `ANALISIS_TOPE_DIARIO` (default 10). Ambos server-side, jamás
   `VITE_`. Es freno suave por IP (un NAT compartido los reparte), no muro.
7. **El dedupe por skill también vive en el validador** (las tres copias), no solo en
   SQL: si el cliente conserva las habilidades repetidas y la RPC no, los
   `guardado.brechas` uuid quedan más cortos que la lista de brechas del cliente.
8. **Tarea 1 (Docs honestos) se cierra acá**, no como commit aparte: los textos de
   producción correctos son los de los archivos de migración; este addendum es el
   señalamiento. Los dominios de visión del README que el Task 1 pedía marcar quedan
   como deuda declarada de Plan B (no bloquean la Fase 1).
9. **Cómo se mide el gate de la Fase 1 (Task 9), corregido.** El spec lo escribe "precisión
   ≥ 6/10, métrica = confirmadas/revisadas, mismo cálculo que `metricaGlobal`", y esas dos
   últimas frases no aplican a Ómicrom: `metricaGlobal` vive en la app CV (proyecto par), y
   confirmar/rechazar una brecha es un click del mapa neuronal — que es Plan B. Hoy
   `mezclarAnalisis` (`src/hooks/useGemeloActivation.ts:58-82`) ni siquiera consume
   `ia.brechas`: el usuario ve los 4 ejes y el resumen, y las brechas se persisten sin
   mostrarse. No se puede juzificar lo que todavía no se ve.
   **Ruling:** la precisión de la Fase 1 se mide sobre lo persistido, en una sola pasada
   humana. Tras los 10 CVs reales, el SQL Editor devuelve las listas por análisis
   (`select a.nombre_archivo, a.created_at, b.titulo, b.categoria, b.severidad from
   analisis_cv a join brechas_aprendizaje b on b.analisis_id = a.id order by a.created_at`)
   y el dueño del producto decide por cada lista si la conserva o la descarta; el gate es
   ≥ 6 de 10 conservadas. El conteo se registra en el ledger de la tarea, no en la BD:
   `brechas_aprendizaje.state` es estado de aprendizaje del usuario (Plan B), no juicio de
   precisión. Si el mapa ya estuviera vivo cuando se corre el gate, se usa el cálculo
   original (confirmadas/revisadas) sin cambiar nada.
10. **El modo invitado no llegaba al motor, y la culpa era nuestra, no del borde (medido
    2026-10-26).** Con `apikey` y sin `Authorization`, el borde de Supabase responde
    `401 UNAUTHORIZED_NO_AUTH_HEADER` porque `verify_jwt` está ON: el handler no corre. El
    Step 4 del Task 6 (curl de invitado de este plan) nunca iba a dar 200, y el puente
    `localStorage`, el bucket `analisis-dia-ip` y `ANALISIS_TOPE_DIARIO_INVITADO` eran
    inalcanzables. **Ruling: `verify_jwt` no se apaga.** La ruta es la que ya usa
    `supabase-js` — `session?.access_token ?? supabaseKey`
    (`node_modules/@supabase/supabase-js/dist/index.mjs:811`) — y `analizarCvConIA` se
    desvió de ella al omitir el header sin sesión (`src/features/gemelo/services/aprendizaje.ts:93`).
    Medición que lo prueba: con `Authorization: Bearer <anon key>` el borde **pasa** y
    responde el `400 "El CV es muy corto o no se pudo leer."` de la función (con
    `x-served-by: supabase-edge-runtime`). Cierre en la tarea T10-D: el cliente manda el
    Bearer siempre y el handler reconoce ese token como invitado en vez de rechazarlo.
11. **Nada de esto es verificable contra la función desplegada hoy.** La `analizar-cv` de
    producción **no manda `x-omicron-build`** en ningún response, así que corre una build
    anterior a este plan. El deploy del Task 6 Step 3 es precondición de cualquier medida,
    incluidas las de este addendum.


Deuda explícita que NO cierra este plan (va al Plan B): dos prompts de CV en el repo
(`gemini.ts` y `analizar-cv`), la promoción invitado→autenticado usando
`puenteBrechasInvitado.limpiar()`, la cola de retry para guardados fallidos, la única
puerta de escritura por RPC, y el `alter publication` de 10012 si el rol del Editor no
es dueño de `supabase_realtime` (falla con NOTICE y hay que hacer el click en la UI).

## Global Constraints

- Nomenclatura SQL/commits en español, estilo `10010_convalidar_sin_boveda.sql` (comentario `-- EL HECHO:` explicando el porqué).
- El nombre visible es **Ómicrom** (M); identificadores técnicos (`localStorage` keys, canales, ids CSS) son `omicron` (N). No renombrar nada técnico.
- Nunca `#5cc8ff`, nunca cian de marca, sin webfonts, dark-mode only, colores solo de `src/theme/`.
- Cero jerga en textos de usuario; nunca la palabra "Verificada" para estado autodeclarado.
- `prefers-reduced-motion` en el mismo commit que cualquier animación; táctiles ≥44 px.
- Las claves nunca van al cliente: nada de `VITE_` para secrets; todo IA pasa por Edge Functions.
- No tocar tablas de la Bóveda ni su historia (`knowledge_vault_documents` etc., dropeadas 10006–10010).
- SQL para el usuario se entrega **al portapapeles** (PowerShell UTF8) diciendo en qué ventana de Supabase va; esperar su "listo" antes de verificar.
- Verificación = medición, no creencia: toda tarea de deploy/SQL termina con una consulta o request que prueba el efecto.
- CI del repo huésped: `npm run typecheck`, `npm run lint`, `npm run test` deben quedar verdes en cada commit.

---

### Task 1: Docs honestos — dominios de visión marcados como tales

**Files:**
- Modify: `PRODUCT.md` (sección Stack, línea "Dominios funcionales en `src/features/`: ...")
- Modify: `DEFINICION_OMICROM.md` (tabla "Mapa de módulos post-refactor (9 módulos)")

**Interfaces:**
- Consumes: nada.
- Produces: docs que coinciden con el disco (`src/features/` real: academia, auth, gemelo, omicron, redviva), para que el Plan B no construya sobre funciones inexistentes.

- [ ] **Step 1: Verificar el hecho antes de escribir**

Run: `ls src/features`
Expected: `academia auth gemelo omicron redviva` (5, no 10).

- [ ] **Step 2: Editar PRODUCT.md**

En la línea que enumera dominios funcionales, reemplazar por:

```markdown
Dominios en el código (`src/features/`): `academia`, `auth`, `gemelo`, `omicron`, `redviva`. Los dominios `chat`, `contratos`, `empleos`, `gobernanza`, `market`, `wallet` existen solo en documentación/migraciones: son **visión**, no capacidad, y ninguna pantalla debe asumir que funcionan.
```

- [ ] **Step 3: Editar DEFINICION_OMICROM.md**

En la tabla de 9 módulos, agregar una columna `¿En el código?` con `sí` para omicron/gemelo/academia/auth y `no — visión` para empleos/market/wallet/chat/gobernanza; debajo de la tabla:

```markdown
> Actualizado 2026-10-26: verificado contra `src/features/` en la rama fase-6-recorte-datos. Los módulos "no — visión" no tienen carpeta ni pantallas; están en esta tabla como norte, no como inventario.
```

- [ ] **Step 4: Commit**

```bash
git add PRODUCT.md DEFINICION_OMICROM.md
git commit -m "Docs: los dominios sin codigo se marcan como vision, no como capacidad"
```

### Task 2: Aplicar 10011 (desprogramar latidos huérfanos) y verificar

**Files:**
- Consume: `supabase/migrations/10011_desprogramar_latidos_huerfanos.sql` (ya commiteada, `78c4bf6`)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `cron.job` sin jobs que apunten a funciones muertas — condición para el borrado del Task 3 sin dejar 1.440 requests fallidos/día.

- [ ] **Step 1: Entregar el SQL de la 10011 al portapapeles**

Run (PowerShell, UTF8): `Get-Content -Raw -Encoding UTF8 supabase/migrations/10011_desprogramar_latidos_huerfanos.sql | Set-Clipboard`
Decir al usuario: va en **Supabase → cuwuyqpxaibbqjrvamjb → SQL Editor → nueva ventana** (la del proyecto de producción). Esperar "listo".

- [ ] **Step 2: Verificar desprogramación (medición, no creencia)**

SQL de verificación al portapapeles:

```sql
select jobname, schedule, command
from cron.job
where command ilike '%ghost-approval%'
   or command ilike '%sync-jobs%'
   or command ilike '%notify-matches%'
   or command ilike '%vault_depreciation%'
   or command ilike '%pmc_recovery%'
   or command ilike '%token_depreciation%'
order by jobname;
```

Expected: **0 filas**. Los 6 candidatos a borrado quedan sin latidos; cualquier job que sobreviva con otro nombre pero comando huérfano ya lo agarró el descubrimiento por `command` de la 10011.

- [ ] **Step 3: Baseline HTTP de las 6 funciones antes de borrar**

Run:

```bash
for f in ghost-approval sync-jobs notify-matches market-match vault-oracle verificar-pago; do
  printf "%s: %s\n" "$f" "$(curl -s -o /dev/null -w '%{http_code}' https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/$f)"
done
```

Expected: código distinto de 404 para cada una (vivas en el borde). Anotar la salida en el reporte: es la línea de base que el Task 3 compara.

### Task 3: Borrar las 6 Edge Functions muertas, en orden

**Files:**
- Delete (dashboard, clics del usuario): `supabase/functions/{ghost-approval,sync-jobs,notify-matches,market-match,vault-oracle,verificar-pago}`
- Delete (repo): las 6 carpetas correspondientes de `supabase/functions/`

**Interfaces:**
- Consumes: Task 2 (jobs desprogramados).
- Produces: superficie de deploy reducida y verificada; `notify-matches`→`sync-jobs` ya no es un par que pueda quedar a medias.

- [ ] **Step 1: Confirmar que ningún código vivo las invoca**

Run: `grep -rn "ghost-approval\|sync-jobs\|notify-matches\|market-match\|vault-oracle\|verificar-pago" src --include='*.ts*' | grep -v node_modules`
Expected: vacío (verificado 2026-10-26: 0 refs en `src/`). La única referencia cruzada era `notify-matches/index.ts` → `sync-jobs`; ambas mueren juntas, **notify-matches se borra después de sync-jobs** por si alguien prueba a medias.

- [ ] **Step 2: Lista de borrado al usuario, en orden, con URL**

Entregar (texto, no SQL), Supabase → Edge Functions → cada ficha → Delete:
1. `ghost-approval` 2. `sync-jobs` 3. `notify-matches` 4. `market-match` 5. `vault-oracle` 6. `verificar-pago`
URL directa: `https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/functions`. Esperar "listo".

- [ ] **Step 3: Verificar el borrado (repetir el baseline del Task 2)**

Run: el mismo loop curl del Task 2 Step 3.
Expected: las seis devuelven **404**. Si alguna sigue viva, no repetir el borrado a ciegas: revisar si el usuario borró otra ficha (los nombres del dashboard son las rutas).

- [ ] **Step 4: Borrar las carpetas del repo y commit**

```bash
git rm -r supabase/functions/ghost-approval supabase/functions/sync-jobs supabase/functions/notify-matches supabase/functions/market-match supabase/functions/vault-oracle supabase/functions/verificar-pago
git commit -m "Fase 0: se borran las 6 Edge Functions muertas (desprogramadas en 10011)"
```

---

### Task 4: Migración 10012 — tablas, RLS y máquina de estados

**Files:**
- Create: `supabase/migrations/10012_aprendizaje_continuo.sql`
- Test: `src/features/gemelo/services/brechas.test.ts` (vitest — la tabla de transiciones se espeja en TS para poder probarla sin BD; la versión SQL es la que manda en runtime, la versión TS es el contrato documentado y usado por la UI)

**Interfaces:**
- Produces: tablas `analisis_cv`, `brechas_aprendizaje`; RPCs `marcar_brecha(p_brecha uuid, p_state text) → text` (devuelve la fila nueva como jsonb·text para no atarse a versiones) y `guardar_analisis_completo(p_cv jsonb, p_brechas jsonb) → jsonb` `{analisis_id, brechas_ids[]}`; tipos TS compartidos en `src/features/gemelo/services/brechas.ts`:

```ts
export type EstadoBrecha = 'detectada' | 'confirmada' | 'rechazada' | 'dominada';
export const TRANSICIONES_VALIDAS: Record<EstadoBrecha, EstadoBrecha[]> = {
  detectada:  ['confirmada', 'rechazada'],
  confirmada: ['dominada', 'rechazada'],
  rechazada:  ['confirmada'],
  dominada:   [],
};
export function transicionValida(de: EstadoBrecha, a: EstadoBrecha): boolean;
```

- [ ] **Step 1: Escribir el test que falla**

`src/features/gemelo/services/brechas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { transicionValida, TRANSICIONES_VALIDAS } from './brechas';

describe('máquina de estados de brechas (espejo del RPC marcar_brecha)', () => {
  it('detectada solo avanza a confirmada o rechazada', () => {
    expect(transicionValida('detectada', 'confirmada')).toBe(true);
    expect(transicionValida('detectada', 'rechazada')).toBe(true);
    expect(transicionValida('detectada', 'dominada')).toBe(false);
  });
  it('dominada es terminal', () => {
    expect(TRANSICIONES_VALIDAS.dominada).toEqual([]);
    expect(transicionValida('dominada', 'confirmada')).toBe(false);
  });
  it('rechazada puede reactivarse a confirmada, nunca directo a dominada', () => {
    expect(transicionValida('rechazada', 'confirmada')).toBe(true);
    expect(transicionValida('rechazada', 'dominada')).toBe(false);
  });
  it('confirmada domina o se rechaza', () => {
    expect(transicionValida('confirmada', 'dominada')).toBe(true);
    expect(transicionValida('confirmada', 'rechazada')).toBe(true);
  });
});
```

- [ ] **Step 2: Run para verificar que falla**

Run: `npx vitest --run src/features/gemelo/services/brechas.test.ts`
Expected: FAIL — `Failed to resolve import "./brechas"`.

- [ ] **Step 3: Implementar `brechas.ts` (tipos + espejo + tipos de fila)**

```ts
// features/gemelo/services/brechas.ts
// Contrato del aprendizaje continuo. La autoridad en runtime es el RPC
// marcar_brecha (10012); este espejo alimenta la UI, los tests y el guard
// optimista del cliente. Cambiar uno sin el otro es un bug.

export type EstadoBrecha = 'detectada' | 'confirmada' | 'rechazada' | 'dominada';
export type CategoriaBrecha = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
export type SeveridadBrecha = 'alta' | 'media' | 'baja';

export const TRANSICIONES_VALIDAS: Record<EstadoBrecha, EstadoBrecha[]> = {
  detectada:  ['confirmada', 'rechazada'],
  confirmada: ['dominada', 'rechazada'],
  rechazada:  ['confirmada'],
  dominada:   [],
};

export function transicionValida(de: EstadoBrecha, a: EstadoBrecha): boolean {
  return TRANSICIONES_VALIDAS[de].includes(a);
}

export interface BrechaFila {
  id: string;
  analisis_id: string;
  categoria: CategoriaBrecha;
  titulo: string;
  evidencia: string;
  por_que_importa: string;
  severidad: SeveridadBrecha;
  aprender_que: string;
  aprender_como: string;
  aprender_demuestro: string;
  state: EstadoBrecha;
  confirmed_at: string | null;
  mastered_at: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Run para verificar que pasa**

Run: `npx vitest --run src/features/gemelo/services/brechas.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Escribir la migración completa**

`supabase/migrations/10012_aprendizaje_continuo.sql`:

```sql
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
```

- [ ] **Step 6: Entregar la migración al portapapeles (SQL por portapapeles)**

Run: `powershell -Command "Get-Content -Raw -Encoding UTF8 supabase/migrations/10012_aprendizaje_continuo.sql | Set-Clipboard"`
Mensaje al usuario: **"Va en Supabase → SQL Editor del proyecto cuwuyqpxaibbqjrvamjb, nueva ventana. Pegar, Run, y mandame la salida de las 2 queries del final."** Esperar "listo" antes de seguir.

- [ ] **Step 7: Verificar aplicado (medición desde el cliente anónimo)**

Run:

```bash
curl -s "https://cuwuyqpxaibbqjrvamjb.supabase.co/rest/v1/brechas_aprendizaje?select=id&limit=1" -H "apikey: $ANON" 
```
Expected: error de RLS/permiso vacío (no `42P01 table not found`) — la tabla existe y RLS la protege. Y la salida del usuario de las 2 queries: `2` y `2`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/10012_aprendizaje_continuo.sql src/features/gemelo/services/brechas.ts src/features/gemelo/services/brechas.test.ts
git commit -m "10012: analisis_cv + brechas_aprendizaje con RLS y maquina de estados"
```

### Task 5: Validador puro de brechas portado de la app CV (TDD)

**Files:**
- Create: `supabase/functions/_shared/brechas.ts` (Deno, sin imports de jsr → testeable con vitest)
- Create: `src/features/gemelo/services/brechasValidar.ts` (re-export para el cliente/tests; espejo exacto del compartido)
- Test: `src/features/gemelo/services/brechasValidar.test.ts`

**Interfaces:**
- Consumes: tipos de Task 4 (`CategoriaBrecha`, `SeveridadBrecha`).
- Produces: `normalizarBrecha(x: unknown): BrechaValidada | null` y `normalizarBrechas(x: unknown): BrechaValidada[]` — usadas por la Edge Function (Task 6) y por el guard del cliente. `BrechaValidada = { categoria; titulo; evidencia; porQueImporta; severidad; aprender: { que; como; comoLoDemuestro } }` (mismos campos que la app CV: `ProveedorAnalisis.resultado.brechas`).

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { normalizarBrecha, normalizarBrechas } from './brechasValidar';

const OK = {
  categoria: 'conocimiento', titulo: 'Excel avanzado',
  evidencia: 'no aparece en el CV', porQueImporta: 'lo pide el puesto',
  severidad: 'alta',
  aprender: { que: 'tablas dinámicas', como: 'curso 4h + práctica', comoLoDemuestro: 'archivo de ejemplo' },
};

describe('normalizarBrecha (port del validador de la app CV)', () => {
  it('brecha válida pasa con defaults', () => {
    const r = normalizarBrecha(OK);
    expect(r).not.toBeNull();
    expect(r!.titulo).toBe('Excel avanzado');
    expect(r!.severidad).toBe('alta');
  });
  it('categoria inventada mata la brecha, no la inventa', () => {
    expect(normalizarBrecha({ ...OK, categoria: 'superpoder' })).toBeNull();
  });
  it('severidad inválida cae a media en vez de matar', () => {
    expect(normalizarBrecha({ ...OK, severidad: 'critical' })!.severidad).toBe('media');
  });
  it('aprender incompleto se tolera con vacíos, titulo faltante mata', () => {
    expect(normalizarBrecha({ ...OK, titulo: '' })).toBeNull();
    expect(normalizarBrecha({ ...OK, aprender: {} })!.aprender.que).toBe('');
  });
  it('normalizarBrechas filtra, limita a 12 y no lanza con basura', () => {
    expect(normalizarBrechas(null)).toEqual([]);
    expect(normalizarBrechas('no soy array')).toEqual([]);
    expect(normalizarBrechas([OK, { basura: true }, OK])).toHaveLength(2);
    expect(normalizarBrechas(Array(30).fill(OK))).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run para verificar que fallan**

Run: `npx vitest --run src/features/gemelo/services/brechasValidar.test.ts`
Expected: FAIL — import no resuelve.

- [ ] **Step 3: Implementar el compartido (función pura, sin imports externos)**

`supabase/functions/_shared/brechas.ts`:

```ts
// _shared/brechas.ts — validación defensiva del output de IA.
// Port literal del validador de la app CV (lib/ai/validar.ts) sin zod:
// sin dependencias, corre igual en Deno (Edge Function) y en vitest
// (espejo en src/). Si cambia este archivo, cambia el espejo en el mismo commit.

type Categoria = 'dura' | 'blanda' | 'conocimiento' | 'credencial';
type Severidad = 'alta' | 'media' | 'baja';
const CATEGORIAS: readonly string[] = ['dura', 'blanda', 'conocimiento', 'credencial'];
const SEVERIDADES: readonly string[] = ['alta', 'media', 'baja'];
const MAX_BRECHAS = 12;

export interface BrechaValidada {
  categoria: Categoria; titulo: string; evidencia: string; porQueImporta: string;
  severidad: Severidad; aprender: { que: string; como: string; comoLoDemuestro: string };
}

const str = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');

export function normalizarBrecha(x: unknown): BrechaValidada | null {
  if (!x || typeof x !== 'object') return null;
  const b = x as Record<string, unknown>;
  const categoria = str(b.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) return null;
  const titulo = str(b.titulo);
  if (!titulo) return null;
  const ap = (b.aprender && typeof b.aprender === 'object') ? b.aprender as Record<string, unknown> : {};
  const severidadRaw = str(b.severidad).toLowerCase();
  return {
    categoria: categoria as Categoria,
    titulo,
    evidencia: str(b.evidencia),
    porQueImporta: str(b.porQueImporta),
    severidad: SEVERIDADES.includes(severidadRaw) ? severidadRaw as Severidad : 'media',
    aprender: { que: str(ap.que), como: str(ap.como), comoLoDemuestro: str(ap.comoLoDemuestro) },
  };
}

export function normalizarBrechas(x: unknown): BrechaValidada[] {
  if (!Array.isArray(x)) return [];
  const out: BrechaValidada[] = [];
  for (const item of x) {
    const n = normalizarBrecha(item);
    if (n) out.push(n);
    if (out.length >= MAX_BRECHAS) break;
  }
  return out;
}
```

`src/features/gemelo/services/brechasValidar.ts`: mismo contenido exacto, encabezado con el comentario `// ESPEJO de supabase/functions/_shared/brechas.ts — no editar sin el otro.` (por qué espejo: las Edge Functions congelan `_shared/` al crearse — lección 6F — y vitest no puede importar desde `supabase/`).

- [ ] **Step 4: Run para verificar que pasan**

Run: `npx vitest --run src/features/gemelo/services/brechasValidar.test.ts && npm run typecheck && npm run lint`
Expected: PASS 5 tests, typecheck y lint verdes.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/brechas.ts src/features/gemelo/services/brechasValidar.ts src/features/gemelo/services/brechasValidar.test.ts
git commit -m "Validador de brechas portado de la app CV: puro, sin zod, testeable en Deno y vitest"
```

### Task 6: `analizar-cv` devuelve brechas + persiste con identidad del JWT

**Files:**
- Modify: `supabase/functions/analizar-cv/index.ts` (SYS prompt, parse, persistencia)
- Consume: `_shared/brechas.ts` (Task 5)

**Interfaces:**
- Consumes: `callLLM`, `hasKey`, `corsHeaders`, `_admin` (service client, ya en el archivo), RPC `guardar_analisis_completo` (Task 4).
- Produces: respuesta `{ok:true, analysis: {..., brechas: BrechaValidada[]}, guardado: {analisis_id, brechas: uuid[]}, build: '7a-brechas-v1'}` — el contrato que consumen el cliente (Task 7) y el mapa (Plan B).

- [ ] **Step 1: Agregar el objeto brechas al prompt SYS**

En la constante `SYS`, reemplazar la frase final `Devuelve SOLO un JSON valido con esta estructura exacta (sin texto antes ni despues):` y su JSON por:

```
Devuelve SOLO un JSON valido con esta estructura exacta (sin texto antes ni despues). Ademas del perfil, detecta HASTA 12 brechas reales entre lo que el CV muestra y lo que el puesto objetivo exige; cada brecha debe tener un camino accionable. Estructura:
{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":"","brechas":[{"categoria":"dura|blanda|conocimiento|credencial","titulo":"","evidencia":"","porQueImporta":"","severidad":"alta|media|baja","aprender":{"que":"","como":"","comoLoDemuestro":""}}]}
Reglas de brechas: si no hay ninguna real, []. Prohibido inventar brechas de skills que el CV si declara. "evidencia" cita el CV; "porQueImporta" habla del puesto, no del mercado en general.`
```

- [ ] **Step 2: Normalizar y persistir después del parse**

Después de `let parsed: unknown; ... catch ...` (parse existente, intacto), antes del `return json({ ok: true, ...`, insertar:

```ts
    const brechas = normalizarBrechas((parsed as { brechas?: unknown }).brechas);
    (parsed as { brechas?: unknown }).brechas = brechas;

    let guardado: { analisis_id: string; brechas: string[] } | null = null;
    if (_admin) {
      const auth = req.headers.get('authorization') ?? '';
      const { data: userData } = auth
        ? await _admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
        : { data: { user: null } };
      if (userData?.id) {
        const p = parsed as Record<string, unknown>;
        const { data, error } = await _admin.rpc('guardar_analisis_completo', {
          p_cv: {
            nombre_archivo: (body?.nombre_archivo ?? 'cv').toString().slice(0, 200),
            ocupacion: p.seniorLabel ?? null,
            nivel: p.arch ?? null,
            resumen: p.summary ?? null,
            proveedor: 'openrouter',
            simulado: false,
          },
          p_brechas: brechas,
        });
        if (!error && data) {
          guardado = data as { analisis_id: string; brechas: string[] };
          // La brecha ya existe; se marca como detectada de nacimiento. El
          // guard lo devuelve con ids reales para que el cliente suscriba.
        } else if (error) {
          console.error('[analizar-cv] guardado fallo:', error.message);
        }
      }
    }
```

Con el import arriba del archivo junto a los otros `_shared`: `import { normalizarBrechas } from '../_shared/brechas.ts';`
Y el `json` final pasa a `{ ok: true, analysis: parsed, model: 'openrouter', guardado, build: '7a-brechas-v1' }`.

**Advertencia obligatoria del plan (lección 6F verificada en el chat del 24/10):** al recrear/actualizar la función desde el dashboard, pegar **todo el archivo `index.ts`** y verificar la huella antes de confiar — `_shared/` se congela por función. Si la función ya desplegada existe, el deploy del dashboard actualiza la copia congelada; la huella `build` es la prueba.

- [ ] **Step 3: Deploy con el mismo procedimiento de las fases 6E/6F**

Entregar el archivo completo al portapapeles: `powershell -Command "Get-Content -Raw -Encoding UTF8 supabase/functions/analizar-cv/index.ts | Set-Clipboard"`
Usuario: Supabase → Edge Functions → **analizar-cv** → Code → seleccionar todo → pegar → Deploy. Esperar "listo".

- [ ] **Step 4: Verificar huella y brechas desde el borde**

```bash
curl -s -D - -o nul -X POST "https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/analizar-cv" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{"text":"Soy abogado familiar con 8 anos de ejercicio, postulando a un cargo que pide Excel y liderazgo de equipos."}' | grep -i "x-omicron-build\|HTTP/"
```

Antes del grep, agregar la huella también como header en `json()`: `{ ...CORS, 'Content-Type': 'application/json', 'x-omicron-build': '7a-brechas-v1' }`.
Expected: header con `7a-brechas-v1`; la respuesta JSON trae `analysis.brechas` como array (puede ser `[]` con un texto corto — válido) y `guardado: null` (sin JWT de usuario — válido).

> **Este comando quedó viejo (addendum, ruling 10).** Tal como está, el borde responde `401 UNAUTHORIZED_NO_AUTH_HEADER` antes de correr la función: `verify_jwt` está ON y no se apaga. El probe de invitado correcto agrega `-H "Authorization: Bearer $ANON"` (la anon key, igual que hace `supabase-js`), y la huella esperada es la del `const BUILD` vigente, no `7a-brechas-v1`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/analizar-cv/index.ts
git commit -m "analizar-cv: prompt de brechas, validador compartido, guardado server-side y huella 7a"
```

### Task 7: El cliente gasta el análisis y lo guarda (modo invitado → puente)

**Files:**
- Modify: `src/features/gemelo/services/cvAnalyzer.ts` (la ruta IA: donde hoy se invoca el análisis — verificar con grep)
- Modify: `src/hooks/useGemeloActivation.ts` (persistencia del análisis; el flujo invitado ya usa `localStorage` como puente)
- Create: `src/features/gemelo/services/aprendizaje.ts` (fetch a analizar-cv + puente localStorage para invitados)

**Interfaces:**
- Consumes: respuesta Task 6 (`analysis.brechas`, `guardado`), tipos Task 4/5.
- Produces: `analizarCvConIA(texto: string, nombreArchivo: string): Promise<{ analysis: AnalyzedProfile & { brechas: BrechaValidada[] }; guardado: { analisis_id: string; brechas: string[] } | null }>` y `puenteBrechasInvitado: { leer(): BrechaValidada[]; escribir(b: BrechaValidada[]): void }` (localStorage key `omicron.brechas.puente` — clave con N, regla de identificadores).

- [ ] **Step 1: Encontrar el punto real de llamada**

Run: `grep -rn "analizar\|AnalyzedProfile" src/features/gemelo/services/cvAnalyzer.ts src/hooks/useGemeloActivation.ts | grep -v "//" | head -20`
Anotar dónde hoy el texto del CV va a IA (proxy-ai o heurístico puro) y devolverlo en el reporte — este paso existe porque el grep de `functions.invoke` no mostró analizar-cv: puede que hoy no haya ruta IA de CV en producción. Si no hay, `analizarCvConIA` es la primera y el hook la adopta.

- [ ] **Step 2: Escribir `aprendizaje.ts`**

```ts
// features/gemelo/services/aprendizaje.ts
// Cliente del motor de aprendizaje. Guardado server-side para usuarios con
// sesion; para invitados, puente localStorage (regla de App.tsx: el estado
// que sobrevive el traspaso invitado->autenticado no puede vivir solo en React).
import { supabase } from '@/infrastructure/supabase/client';
import type { BrechaValidada } from './brechasValidar';

const PUENTE_KEY = 'omicron.brechas.puente';

export const puenteBrechasInvitado = {
  leer(): BrechaValidada[] {
    try {
      const raw = localStorage.getItem(PUENTE_KEY);
      return raw ? (JSON.parse(raw) as BrechaValidada[]) : [];
    } catch { return []; }
  },
  escribir(brechas: BrechaValidada[]) {
    try { localStorage.setItem(PUENTE_KEY, JSON.stringify(brechas)); } catch { /* llena o privada: el mapa pierde el puente, no la app */ }
  },
};

export async function analizarCvConIA(texto: string, nombreArchivo: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analizar-cv`, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texto, nombre_archivo: nombreArchivo }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'El analisis fallo.');
  const analysis = json.analysis as AnalyzedProfileConBrechas;
  if (json.guardado == null) puenteBrechasInvitado.escribir(analysis.brechas ?? []);
  return { analysis, guardado: (json.guardado ?? null) as { analisis_id: string; brechas: string[] } | null };
}

export type AnalyzedProfileConBrechas = import('./cvAnalyzer').AnalyzedProfile & {
  brechas: BrechaValidada[];
};
```

- [ ] **Step 3: Conectar el flujo existente**

Donde el Step 1 identificó la llamada (o en `useGemeloActivation.ts` si no existe), reemplazar la fuente del análisis por `analizarCvConIA` **solo cuando hay texto real de CV**; mantener el heurístico `analyzeCV` como fallback declarado (la regla "nunca datos falsos" sigue: si la IA falla, error visible + Reintentar, no inventar). Si el usuario estaba autenticado y el guardado trajo `brechas: uuid[]`, esos ids son los que el mapa (Plan B) va a suscribir.

- [ ] **Step 4: Verificar en el navegador**

Con `npm run dev` + sesión de usuario real: subir un CV → la respuesta trae `guardado` no-null → en SQL Editor: `select state, count(*) from brechas_aprendizaje group by state;` muestra `detectada` con las brechas del análisis. Con sesión invitada: `localStorage['omicron.brechas.puente']` tiene el array.
Expected: ambos caminos visibles con evidencia (respuesta + query/screenshot del usuario).

- [ ] **Step 5: Commit**

```bash
git add src/features/gemelo/services/aprendizaje.ts src/hooks/useGemeloActivation.ts
git commit -m "Cliente del motor: analizar-cv con guardado server-side y puente de invitados"
```

### Task 8: Tope diario por usuario autenticado (servidor manda)

**Files:**
- Modify: `supabase/functions/analizar-cv/index.ts` (ampliar `rateLimited`)
- Test: medición real, no unit (el límite vive en la BD).

**Interfaces:**
- Consumes: RPC `check_rate_limit(p_bucket, p_identifier, p_limit, p_window_sec)` existente (0031), `_admin`.
- Produces: 429 con `{ok:false, error:'Llegaste a los N análisis de hoy...'}` cuando `analysis_usage_daily` (o el bucket de 0031 con día como identificador) lo dice.

- [ ] **Step 1: Implementar tope por usuario-día**

Cambiar el bloque `rateLimited(req)` para que, si hay `userData.id` (extraer antes, reordenar: JWT → tope IP → tope día), llame `check_rate_limit` con `p_bucket: 'analisis-dia'`, `p_identifier: `${userData.id}:${new Date().toISOString().slice(0,10)}` (clave día a la misma forma que `usoDeHoy()` de la app CV), `p_limit: Number(Deno.env.get('ANALISIS_TOPE_DIARIO') ?? '10')`, `p_window_sec: 86400`. Mantener el tope IP de 6/60s actual encima (anti-abuso no cambia).

- [ ] **Step 2: Deploy + verificación con dos requests reales autenticados**

Subir tope demo a 2 (secret temporal) → 3 requests con JWT → el tercero debe salir 429 con el mensaje legible y el `retry_at`/reset. Verificar con curl, pegar la salida. Devolver el secret a 10 y redeploy si se cambió por secret (no por hardcode).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/analizar-cv/index.ts
git commit -m "analizar-cv: tope diario por usuario (espíritu usoDeHoy de la app CV, servidor manda)"
```

---

## Self-Review (después de escribir el plan, antes de entregarlo)

1. **Cobertura de spec:** §4 datos → Task 4; §5 motor → Tasks 5-6-8; §6 visual → **Plan B (declarado)**; §7 realtime → Plan B excepto la persistencia que ya permite `postgres_changes` (ids server-side, Task 4); §8 errores → Tasks 4 (RAISE legible), 6 (build/verify), 7 (Reintentar); §10 Fase 0 → Tasks 1-3, Fase 1 → Tasks 4-8, gate de precisión ≥6/10 con 10 CVs reales → Step de Task 9 abajo; D1–D7 respetadas (D5/D6 caen en Plan B).
2. **Placeholders:** ninguno — todo SQL/TS/commits literales.
3. **Consistencia de tipos:** `BrechaValidada` (Task 5) = lo que persiste `guardar_analisis_completo` (Task 4, camel→snake mapeado ahí); `TRANSICIONES_VALIDAS` (Task 4) es espejo exacto del RAISE del RPC; `analizarCvConIA` (Task 7) consume el contrato del Task 6 (campo `guardado`). Corregido inline durante la escritura: el RPC devuelve jsonb·text→jsonb unificado.

### Task 9: Criterio de salida de la Fase 1 (métrica única)

- [ ] **Step 1:** El usuario sube 10 CVs reales (los suyos o de su cartera) desde la app en local contra Supabase de producción.
- [ ] **Step 2:** Para cada run, el usuario marca cada brecha como Es real / No es real (UI mínima de lista: este plan persiste estados con RPCs ya existentes; la pantalla de revisión vive hoy en la app CV y se porta entera en el Plan B — hasta entonces, la tabla se puede marcar a mano con `select` + `marcar_brecha` desde SQL Editor con la sesión del usuario).
- [ ] **Step 3:** Métrica: `select count(*) filter (where state='confirmada')::float / nullif(count(*) filter (where state in ('confirmada','rechazada')),0) from brechas_aprendizaje;` **≥ 0.6** → Fase 1 cerrada. Si < 0.6: iterar el prompt SYS (Task 6 Step 1) con los casos rechazados como ejemplos — no cambiar la arquitectura.
- [ ] **Step 4:** Commit de cierre: `git commit --allow-empty -m "Fase 1 cerrada: 10 CVs reales con precision >= 6/10 (spec §10)"` con el número real en el mensaje.

---

## Pase de QA del dueño (después del handoff de producción)

Escrito para que lo corras vos, en orden, sin leer código. Cada paso dice qué hacer, qué tenés que ver y **qué
significa ver otra cosa**. Ningún paso exige esperar una hora.

### Q1 · Que lo que corre sea el código del repo

Subí un CV desde la app, devtools → Network → el request a `analizar-cv` → *Response Headers*.
**Esperado:** `x-omicron-build: 10e-dos-claves` (se ve en el navegador: está en `Access-Control-Expose-Headers`).
**Si no aparece:** el deploy no corrió o corrió con un archivo viejo. No sigas con el resto del pase: estaría
midiendo otra cosa.

### Q2 · El invitado llega al motor

En **modo invitado** (sin iniciar sesión), subí un CV real de más de 2000 caracteres.
**Esperado:** HTTP 200, cuerpo con `analysis.axes` (los 4 ejes), `analysis.brechas` como array (puede ser `[]`) y
`guardado: null` — el invitado no persiste, va al puente de `localStorage`.
**Si ves `401 {"code":"UNAUTHORIZED_NO_AUTH_HEADER"}`:** el cliente volvió a mandar el request sin `Authorization`
(es el borde de Supabase, no la función: regresión de T10-D).
**Si ves `401` con "Tu sesión expiró…" estando SIN sesión:** la función corrió pero no reconoció la clave pública
que mandó el navegador. Con la clave rotada conviven dos (`SUPABASE_ANON_KEY` JWT viejo + `SUPABASE_PUBLISHABLE_KEY`
`sb_publishable_…`) y el header `apikey`: la decisión de invitado es pertenencia a esa lista, no igualdad con un
solo valor (regresión de T10-E). Se reporta con la huella y las dos claves del proyecto **por nombre, nunca su
valor**.
**Si ves `503` con "No pudimos identificar tu conexión…":** la función ya corre, pero el borde no está entregando
`cf-connecting-ip` y el tope de invitados falla **cerrado** a propósito. Eso no es un bug del QA: se reporta con
la huella y el texto exacto, y decide si el bucket de invitados cambia de llave.

### Q3 · Un análisis real deja filas reales

Iniciá sesión y subí el mismo CV. **Esperado:** el cuerpo trae `guardado.analisis_id` con un uuid. En SQL Editor:

```sql
select id, nombre_archivo, created_at from public.analisis_cv order by created_at desc limit 5;
select titulo, titulo_normalizado, categoria, severidad, state from public.brechas_aprendizaje
 order by created_at desc limit 20;
```

**Si `guardado` es `null` habiendo sesión:** el guardado falló (`guardado_error: true`) y las brechas no llegaron a
la BD. Con las dos consultas vacías, el gate de la Fase 1 todavía no puede medirse.

### Q4 · La skill tiene identidad (spec §4)

Con la sesión abierta, subí **el mismo CV otra vez**. **Esperado:** no aparecen duplicados y una brecha que ya
habías marcado conserva su estado.

```sql
select titulo_normalizado, count(*) from public.brechas_aprendizaje group by 1 having count(*) > 1;  -- 0 filas
```

**Si sale alguna fila:** el upsert por `titulo_normalizado` no está aplicando (10012 no se pegó, o se pegó a medias).

### Q5 · La máquina de estados no permite saltos imposibles

Hoy **no hay pantalla** para marcar una brecha (eso es Plan B), así que se marca por REST con tu token — copialo
de devtools → Network → cualquier request de la app logueada, el header `Authorization`:

```bash
curl -s -X POST "https://cuwuyqpxaibbqjrvamjb.supabase.co/rest/v1/rpc/marcar_brecha" \
  -H "apikey: $ANON" -H "Authorization: Bearer <TU JWT>" -H "Content-Type: application/json" \
  -d '{"p_brecha":"<uuid de Q3>","p_state":"confirmada"}'
```

**Esperado:** `detectada → confirmada` ok · `confirmada → dominada` ok · `rechazada → confirmada` ok (reactivar
refresca `confirmed_at`) · `detectada → dominada` **rechazado** · `confirmada → detectada` **rechazado** ·
`dominada → anything` **rechazado**. Los rechazos contestan texto en español, no un código.
**No lo pruebes en el SQL Editor:** ahí `auth.uid()` es `null` y la función no te deja tocar la brecha de otro;
la prueba real es con sesión, como arriba.

### Q6 · El tope diario existe y se ve

Bajá temporariamente el secret `ANALISIS_TOPE_DIARIO` a `2` (Dashboard → Edge Functions → Configuration/Secrets →
guardar). Con sesión, pedí tres análisis seguidos.
**Esperado:** 200, 200 y el tercero **429** con `Llegaste a los 2 análisis de hoy…` y header `Retry-After`.
Tres lecturas inmediatas, en SQL Editor:

```sql
select bucket, identifier, window_sec, count, window_start
  from public.rate_limits order by window_start desc limit 8;
-- debe verse el bucket `analisis-dia` con window_sec = 86400 y el count acumulando entre requests
-- separados segundos (antes de 10013 la poda se comía la fila del día)

select prosrc from pg_proc where proname = 'check_rate_limit';
-- debe contener: make_interval(secs => window_sec * 2)
-- NO debe contener: interval '1 hour'
```

Si algún tope estuviera apagado, la función lo grita en **Dashboard → Edge Functions → analizar-cv → Logs** con la
línea `tope dia apagado`. Sin esa línea, el limitador está corriendo. **Devolvé `ANALISIS_TOPE_DIARIO` a 10.**

### Q7 · El motor se rinde a tiempo y lo dice

Con los modelos gratuitos saturados, el request corta en ~60 s con 504 y el texto
`El modelo gratuito está saturado: ningún modelo respondió a tiempo. Reintentá en unos minutos.`
**Esperado en la app:** ese texto en la UI y **sin** caerse al respaldo Gemini (un 504 del motor es el motor
hablando), y la pantalla de subida vuelve a estar útil. El timer propio del cliente es 150 s: si ves el spinner
pasando los 150 s, eso es un defecto, no lentitud.

### Q8 · Un bloqueo habla en español

Con un token vencido (dejá la app abierta hasta que expire): **esperado**
`Tu sesión expiró. Volvé a iniciar sesión para analizar tu CV.` en la UI. **Nunca** tiene que aparecer la palabra
`HTTP` ni un número de status en la cara del usuario; si aparece, es la regresión que cierra T10-D.

### Q9 · El puente del invitado no se pierde al iniciar sesión

Modo invitado → subí un CV → devtools → Application → Local Storage → clave `omicron.brechas.puente` trae las
brechas. Iniciá sesión. **Esperado:** la app se remonta, el análisis se ve, y el puente no se vació en el intento.
La **promoción** del puente (que esas brechas pasen a la BD del usuario) es deuda declarada de Plan B: acá se
verifica que no se pierdan, no que se copien.

### Q10 · El gate de la Fase 1

Diez CVs reales con tu sesión (Task 9) y una sola pasada humana. En SQL Editor:

```sql
select a.nombre_archivo, a.created_at, b.titulo, b.categoria, b.severidad
  from public.analisis_cv a
  join public.brechas_aprendizaje b on b.analisis_id = a.id
 order by a.created_at;
```

Por cada análisis decidís si esa lista de brechas la conservarías como diagnosis tuya. **Gate: ≥ 6 de 10
conservadas.** El número se anota en el ledger de la tarea, no en la BD. Si sale < 6 se itera el prompt `SYS` con
las listas rechazadas como ejemplos — no se toca la arquitectura.

### Lo que este pase **no** prueba (para que no lo busques)

El mapa neuronal dibujando esas brechas, el orbe y la **ley de salida** (un paso hecho en el dispositivo A se ve
en B en <3 s) son **Plan B**: `mezclarAnalisis` todavía no consume `ia.brechas` y la pantalla del mapa no está
portada. Plan A compra el motor, los datos y las reglas; Plan B compra la vista.


---

## 2026-11-01 · La portada es el mapa (ruling del dueño)

> «yo queria ver esa pantalla como principal con la orbe adaptada y esperando para la mejora»

El home de Ómicrom dejó de ser la Red Viva. Ahora es la pantalla de capacidades que se prototipó en la Cabina,
con el orbe geodésico plantado en la raíz dorada. La franja de arriba (`OrbTopbar`) ya presidía; el orbe chico de
la franja y la raíz del mapa son **el mismo dibujo**: la geometría de los 42 vértices se fue de `GeodesicOrb.tsx`
a `src/shared/components/orbGeometry.ts` y los dos la consumen. Un orbe escrito dos veces es un orbe que se
desincroniza.

**Qué cambió, en orden de dependencia:**

| Archivo | Cambio |
|---|---|
| `shared/components/orbGeometry.ts` (nuevo) | `tramaOrbe(diametro, nodos)` devuelve aristas, puntos y grosor centrados en el origen. El radio y el trazo escalan con el diámetro pero tienen piso (0,9 px / 0,6 px): un orbe de 30 px en la franja necesita puntos que se vean. |
| `shared/components/GeodesicOrb.tsx` | Consumidor de la trama. La geometría local y `project()` se borraron; el `<g>` se traslada al centro del cuadro. |
| `features/mapa/MapaCapacidades.tsx` | Props `orbe` (dibuja la trama sobre la raíz, `tramaOrbe(raiz.r * 2.4, 12)`) y `escena` (sin cabecera, sin leyenda, sin camino). |
| `features/mapa/mapa.css` | `.mapa-orbe` (gira con el `girar` que ya existía, 25 s, `prefers-reduced-motion` lo apaga), el plato de ámbar bajo el nombre de la raíz, y **los tokens de pintura declarados también en `.mapa-escena`**. |
| `features/aprendizaje/useVistaBrechas.ts` (nuevo) | El único lector de la verdad (base > puente > muestra). Devuelve el `VistaTrabajo` discriminado además de la fuente ya resuelta. |
| `features/aprendizaje/AprendizajeTab.tsx` | 21 líneas de cableado propio (puente + `useBrechasReales` + `resolverVista` + `MUESTRA` + `SIN_MAPA`) reemplazadas por el hook. La pestaña y el home no pueden ver dos mapas distintos. |
| `features/omicron/components/OrbShell.tsx` | El centro del home: `RedVivaCanvas` → la escena. Cuatro estados en la portada (mapa · cargando · error · vacío con una sola acción: subir el CV). `ESCENA_MAPA = min(86vmin, 620px)` y `padding-bottom` para que las etiquetas del anillo exterior no se metan bajo la barra. |

**Qué se llevó puesto (no es olvido, es consecuencia):** tocar un nodo del home ya no abre Habilidades. Los nodos
del mapa no son botones —en el teléfono el disco mide 18-24 px y el estándar de la app pide 44—, así que la
decisión se toma en la cola de la pestaña Aprendizaje, y la portada queda para leer. La lectura de Ómicrom de la
barra sigue hablando con textos reales de la Red Viva (`textoLecturaOmicron(model, null)`), ahora sin nodo enfocado
porque no hay nodo que enfocar.

**Medido, no afirmado:** typecheck 0 errores, lint 0 errores / 0 advertencias, `npx vitest --run` **437 pasan / 27
fallan** — la misma línea base de antes del cambio, confinada a los cuatro archivos del DOM viejo del donante
(`mapaLayout.test.ts`, `MapaCapacidades.test.tsx`, `AprendizajeTab.test.tsx`, `contratoMapa.test.ts`), que son la
tarea #54. En vivo, con la pestaña embebida a 485×418: `.mapa-escena` presente, 8 nodos, 25 hilos y 12 puntos de
malla, el lienzo a 359×298 dentro del viewport, `stroke` de la malla `rgb(26,20,8)` sobre el ámbar y el nombre de
la raíz con `paint-order: stroke`.

**Lo que este pase no prueba:** los estados vacío / cargando / error de la portada necesitan una sesión real sin
filas en `brechas_aprendizaje` (el invitado siempre cae en el mapa con la muestra etiquetada); las capturas a 1440
y a 390 px reales; y la continuidad de escena que falta —el orbe de la franja descendiendo al centro cuando
termina un análisis— sigue en la tarea #53.

## 2026-11-01 · Tarea #54: el oráculo del donante se jubila (y el mapa se vuelve legible)

### 1. Derogación del guard del ámbar

El `__golden__/mapa-8-brechas.json` era la salida del sistema del donante, byte por byte. Mientras regía el port 1:1
tenía sentido: si el dibujo cambiaba un píxel, el test avisaba. Con el ruling de hoy **el mapa radial es dibujo de
Ómicrom**, así que ese archivo dejó de ser una especificación y pasó a ser una jaula: cualquier mejora de lectura
(retruncar, reubicar una etiqueta) fallaba el test, y el test fallado no decía qué regla se rompió —decía «no sos el
donante».

Borrado con criterio, no por impulso: `git log -1` y `git status --porcelain` limpios antes de tocarlos, o sea que
ambos son recuperables desde `a662dbf`.

| Se fue | Qué hacía |
|---|---|
| `src/features/mapa/__golden__/mapa-8-brechas.json` | La verdad del donante, 8 brechas serializadas. |
| `scripts/oracle-donante.mjs` | El generador del golden. Sin golden, no hay a quién regenerar. |
| `contratoMapa.test.ts` → `jsonDeReferencia` | Queda solo `__fixtures__/analisis-donante.json` (la **entrada**, etiquetada a mano: sigue siendo la muestra que no se puede re-etiquetar para hacer pasar un test). |

### 2. Qué ocupa el lugar: invariantes, no bytes

Un oráculo viejo se reemplaza con reglas que se puedan leer en voz alta. **76 tests** en los cuatro archivos
reescritos (`mapaLayout.test.ts` 27 · `MapaCapacidades.test.tsx` 26 · `AprendizajeTab.test.tsx` 15 ·
`contratoMapa.test.ts` 8) afirman hoy:

- **Geometría por decisión, no por coordenada.** El radio de cada nodo se mide (`hypot` al centro) y resulta 105 ·
  195 · 272 según el estado; los anillos guía **existen solo si hay nodos en ellos** (sin reconocidas, `['105','272']`).
  Los abanicos ±18° y ±27° se miden con `atan2`, con `toBeCloseTo(…, 2)` porque el modelo redondea a 2 decimales.
- **Invariante 2 (stagger).** `modo="naciendo"` da delays `(4+i)·45` en raíz→categoría y `(9+n)·45` en categoría→nodo;
  `modo="vivo"` los aplana a 0 ms y `recienId` **solo brilla** (`g.mapa-brillar`), nunca renace. El remontaje es del
  botón, por `key={semilla}`.
- **Invariante 3 (pintura).** Ningún hijo del SVG lleva `fill`/`stroke`: todo cuelga de `data-rol-stroke` /
  `data-rol-fill` y `currentColor`, y el color vive en `mapa.css`. El barrido lo verifica el test, componente a
  componente.
- **Precedencia de estado.** `rechazada > dominada > confirmada > pendiente`; una rechazada conserva `dominadaEn` y
  aun así sale tachada.
- **Los nodos NO son botones:** el test afirma 0 `<button>`, 0 `role=button`, 0 `tabindex` dentro del SVG. Es una
  decisión de accesibilidad (disco de 18-24 px contra un estándar de 44 px), no un olvido, y ahora está escrita.
- **Contrato de los 4 colores fijos** (`MAPA_CAT`), raíz y `blanda` sobre el ámbar de la casa, `blanda`/`conocimiento`
  apuntando al token madre y no a un clon con deriva, y **cero hex literales** en `src/features/mapa/*.ts*` —incluido
  los comentarios, que por eso son ASCII.

### 3. El defecto de producto que la verificación encontró (esto es lo importante)

No era un test rojo: era **letra ilegible**. Un `font-size: 11px` dentro de un SVG no son 11 px de pantalla, son 11
*unidades de usuario*: escalan con el `viewBox`. Con el lienzo a 359 px reales, las etiquetas del anillo exterior se
dibujaban a ~5 px en el teléfono y a ~8,8 px con el tope antiguo de escritorio (`min(86vmin, 620px)`). Nadie lo había
visto porque nunca se midió el texto renderizado.

| Pieza | Cambio |
|---|---|
| `MapaCapacidades.tsx` | ~~Un `ResizeObserver` sobre el propio `<svg>`~~ **ESTA FILA ESTÁ CORREGIDA ABAJO (§3-b): el mecanismo descrito nunca funcionó en el navegador.** Se medía ancho renderizado / ancho del `viewBox` → `--mapa-escala` (recortada a `[0.2, 1.5]`), con el observador reenganchado por `semilla`. |
| `mapa.css` | Las tres clases de texto pasan a `font-size: calc(11px / var(--mapa-escala, 1))` (y el `stroke-width` del halo a `calc(3px / …)`): la letra recupera su tamaño óptico sin agrandar el dibujo. |
| `mapa.css` + componente | **Bajo `escala < 0.62` la palabra se retira**, no se achica: `.mapa-svg[data-estrecho="si"] .mapa-nodo-texto/.mapa-cat-texto/.mapa-raiz-nombre { display: none }` y aparecen unos chips HTML (`mapa-escena-chips`) con las categorías, donde 12,5 px **sí** son 12,5 px. El SVG queda como escena de formas; la lectura, en HTML. |
| `OrbShell.tsx` | `ESCENA_MAPA: min(86vmin, 620px)` → **`min(78vh, 92vw, 772px)`**. El tope es la altura del primer viewport (la moneda de este producto) y 772 es el ancho del `viewBox`: ahí una unidad vale exactamente un píxel. |
| `OrbShell.tsx` | El `aria-live` decía «Tocá un nodo o escribí abajo». Nadie puede tocar un nodo. Dice: **«Mapa de tus capacidades. Se lee, no se toca: decide abajo, en la barra, o entra a Aprendizaje para revisar cada una.»** Un anuncio accesible que describe una affordance falsa es peor que ningún anuncio. |
| `infrastructure/pwa/update.ts` | El banner se inyecta fuera de React, y venía con **4 hex propios** (`#eaf0fb`, `#fff`, y un degradado gris-índigo `#a0aec0`/`#5e5ce6` que no era esta marca), `font-family` incrustada, radios 16/11 y un botón de ~34 px. Ahora cuelga de las variables del documento (`color-mix(... var(--surface) 92% ...)`, `var(--line-strong)`, `var(--ink)`, `var(--on-accent)`, degradado `var(--gold) → var(--gold-deep)`), radios 14/9, `min-height:44px`, y un `rgba` restante: la sombra negra, que no es un color de marca. Verificado: los cinco tokens existen en `src/index.css`. «Tocá» pasa a «Toca», la voz de la app en español neutro. |

### 3-b. §3 corregida: el observador sobre `<svg>` estaba muerto (medido el mismo día)

Al volver a medir la app corriendo —no la suite— el defecto seguía ahí: `--mapa-escala` en `1`, `data-estrecho="no"`,
y una etiqueta de nodo con `font-size: 11px` declarada que **renderizaba 5 px de alto**. El experimento lo cerró: un
`ResizeObserver` registrado sobre el elemento `<svg>` **nunca llega a invocar el callback**, ni siquiera con la primera
entrega (una promesa que resolvía en el primer callback siguió pendiente 1200 ms y devolvió `{ sinCallback: true }`).
Es decir: el arreglo documentado arriba jamás corrió, y los 496 tests verdes no lo podían ver porque jsdom no pinta.

El mecanismo que sí funciona, en `MapaCapacidades.tsx`:

- Se mide **`svg.getBoundingClientRect()` en el montaje**, no en un callback del observador.
- El `ResizeObserver` se engancha al contenedor HTML (`<section className="mapa-escena">`), que es un objetivo legítimo,
  y se complementa con un `resize` en `window`.
- La escala correcta es **`min(ancho/vbAncho, alto/vbAlto)`**, no `ancho/vbAncho`: con `width:100%; height:auto;
  max-height:100%` el `height` también recorta, y usar solo el ancho devolvía 0.4223 donde el valor real era 0.4219.
- Con eso, el `data-estrecho` se enciende de verdad y la letra se va a los chips HTML.

Lección para el resto del plan: **ningún arreglo de geometría se da por cerrado con la suite verde.** Un test de
pintado en jsdom prueba el cable (que el número llega al DOM), nunca que el navegador lo interpretó.

### 4. Revisión AA medida (no afirmada)

Contraste calculado sobre los tres fondos reales de la casa (`#0b0d10` · `#14171c` · `#1a1e25`), suelo exigido 4.5:1:

| Token | fondo | superficie | superficie-2 | |
|---|---|---|---|---|
| `ink #e9ecef` | 16.41 | 15.15 | 14.10 | ✔ |
| `muted #98a2b0` | 7.53 | 6.95 | 6.47 | ✔ |
| `gold #f2b134` | 10.30 | 9.51 | 8.85 | ✔ |
| `green #3ddc97` | 11.01 | 10.16 | 9.46 | ✔ |
| `red #f87171` | 7.03 | 6.49 | 6.04 | ✔ |
| `blue #6aa9ff` | 8.09 | 7.47 | 6.95 | ✔ |
| `violet #c084fc` | 7.36 | 6.80 | 6.33 | ✔ |
| texto `#1a1408` sobre ámbar | — | — | — | 9.69 ✔ |
| `mut-soft #6d7885` | **4.33** | **4.00** | 3.72 | ✘ |

`--mut-soft` **no se tocó**: el brief fija ese hex, y hoy está **muerto** —declarado en `src/index.css:27` y
`src/theme/tokens.ts:47` con **cero consumidores** (verificado con grep). Riesgo dormido, no defecto: si alguien lo
consume para texto secundario, esa línea ya no pasa. Lo correcto entonces será pedir un valor nuevo, no parchear el
fijado. El resto de la paleta cumple con holgura incluso sobre la superficie más clara.

También cumplido por construcción en el mapa: estado **nunca** va solo por color (cada nodo lleva `<title>` con su
palabra, la leyenda tiene 4 estados nombrados, el camino fechados), el lienzo es `role="img"` con el resumen hablado
de `ariaLabel`, `prefers-reduced-motion` apaga el giro del orbe y el `brillar`, y los targets del HTML (chips, botón
del banner, barra) respetan 44 px.

### 5. Verificación

- **Trío:** typecheck 0 errores · lint 0 errores y 0 advertencias · `npx vitest --run` **496 pasan / 496** en 38
  archivos. Era 437/27 antes de este pase: los 27 rojos eran exactamente los cuatro archivos del DOM viejo del
  donante, y aquí se reescribieron.
- **En vivo, a 485×418** (el viewport que esta herramienta permite; medido, no recordado): ~~`--mapa-escala = 0.4223`
  y `data-estrecho="si"`~~ **ESA MEDICIÓN FALSA — ver §3-b.** Lo que había ese día era escala `1`, `estrecho="no"` y
  letra de 5 px. El estado real y verificado después de la corrección queda anotado en la sección de la tarea #53.

### 6. Lo que este pase **no** prueba (honesto)

- **La captura a 1440 px no se tomó.** El viewport de esta sesión está fijado a 485×418 y no hay forma de agrandarlo
  desde acá. La geometría está cubierta por los tests (viewBox, `--mapa-escala` con tope superior 1.5, el `data-estrecho`
  solo se apaga arriba de 0.62), pero **el aspecto a escritorio ancho sigue sin visto**. Falta un barrido visual del
  dueño en su navegador.
- **La escala 0.62 es un umbral elegido, no medido.** Elegido porque por debajo la letra del anillo cae de ~7 px. Si
  al verlo en escritorio se siente agresivo (desaparecer palabras demasiado pronto), es **una constante** en
  `MapaCapacidades.tsx` (`ESCALA_LECTURA`), no una arquitectura.
- Los estados vacío / cargando / error de la portada siguen sin sesión real (el invitado siempre cae en la muestra
  etiquetada), y el `Escaneo` narrado (#52) y la descenso del orbe (#53) no están en este pase.
- Deuda de piel que este pase no tocó: la rejilla `body::after` con `rgba(92,140,255,.055)`, el degradado del
  scrollbar, `.bg-omicron-card` con `holoShimmer`, y los ~200 sitios que usan `C.cyan` como si fuera la marca.

**Cierre de #54.** Queda pendiente lo que nunca depende del código: el commit sigue esperando su «¿commiteo?».

---

## 2026-11-01 · Tarea #53: el camino blanco, el descenso del orbe y la banda de la portada

### 1. Faltaba la segunda mitad del sello narrativo

El brief pide dos cosas juntas: «una **línea blanca** cronológica une los pasos hechos, **con lista de hitos fechados
debajo**». La lista existía desde el port; la línea no existía. Ahora existe, y la geometría la decide el modelo:

- `mapaLayout.ts` entrega `caminoTrazos: TrazoCamino[]`: un segmento por salto raíz→hito→hito, en el orden de la lista
  fechada. Cada tramo **nace afuera del disco de origen** (por el radio de la raíz el primero, por 24 unidades los
  demás) y **muere 24 unidades antes del nodo de destino**, así la tinta nunca pinta un disco. Dos pasos consecutivos
  del mismo nodo (reconocer y dominar la misma brecha) no dejan un segmento de largo cero: se descarta.
- **Velocidad constante**: el presupuesto de 1,7 s se reparte proporcionalmente al largo de cada tramo, redondeado a
  milisegundos enteros, y el primero arranca justo cuando terminó de nacer el último nodo
  (`(9 + nodos − 1) × 45 + 300`). El reparto viene calculado en el modelo, no en el CSS.
- Pintura por rol, como el resto del mapa: `ROL_CAMINO = 'camino'` → `[data-rol-stroke="camino"] { color: var(--tiza) }`
  con `--tiza: var(--ink)`. El componente sigue sin conocer ningún hex (Invariante 3 intacta).
- El grupo se dibuja **antes** del grupo de los nodos: lo que el tramo tocara lo tapa el disco. Va `aria-hidden` porque
  la lista fechada ya lo cuenta con palabras.
- `prefers-reduced-motion`: sin animación y con `stroke-dashoffset: 0` — el camino llega ya trazado.
- Tests: 6 en `mapaLayout.test.ts` (teclas, rol, recorte medido contra cada disco, colapso del mismo nodo, vacío, y el
  reparto de velocidad) + 3 en `MapaCapacidades.test.tsx` (que el `<line>` reciba literal el rol, `--largo`,
  `--d-camino`, el delay y la coordenada, y que mapa.css efectivamente pinte y apague el rol).

### 2. El orbe de la franja baja y se planta en la raíz

Es lo que el dueño pidió ver: «la orbe arriba de todo… y cuando ya se cargó todo el CV me aparece el mapa de
capacidades y ahí todo se conecta». `src/shared/components/OrbeEnVuelo.tsx`:

- Copia que vuela por `createPortal` al `body` — no el nodo de la franja viajando: sacarlo de un `<header sticky>`
  desarmaría la franja, y además el contenedor del home lleva `transform: scale(1)`, que secuestra `position: fixed`.
- Solo `transform` y `opacity`, con `TIMING.slow` + `EASE.default` de la familia; el opacado entra diferido para que el
  orbe se apague en los últimos 150 ms, justo cuando la trama del mapa aparece en su lugar.
- **El destino no se mide con `getBoundingClientRect` del disco**: el disco está naciendo (escala 0.18 → 1). Se traduce
  la coordenada del viewBox con `getScreenCTM()` + `DOMPoint` sobre `data-orbe-x/y/d` del `<svg>`.
- Un solo orbe visible en cada instante: la franja esconde el suyo con `visibility` (no `display`: la caja vacía es lo
  que el vuelo mide) y el mapa recibe `orbe={false}` mientras dura el vuelo.
- Disparador: cerrar el modal de CV invalida y vuelve a leer `brechas-aprendizaje`; el vuelo solo se dispara si **la
  referencia del array cambió** y el home está mostrando el mapa con contenido. Ese refetch arregla de paso un defecto
  real de datos: nadie invalidaba la consulta cuando `analizar-cv` escribe filas, así que la portada se quedaba con el
  análisis viejo.
- `prefers-reduced-motion`: no hay vuelo, el orbe simplemente ya está plantado.
- **Medido en el navegador real** (el componente montado vivo sobre el mapa de la app): franja de 30 px en (28,28) →
  raíz de 60 px en (238,157). t=0 `transform: none`, opacidad 1, orbe de 30 px; t=200 ms escala 1,894 con
  translate (189,7 · 116,1) y el orbe midiendo 57 px; t=600 ms escala 1,993 con translate (210,8 · 129,0) y opacidad 0
  → centro final (238,4 · 157) y 60 px de ancho: **aterriza exacto sobre la raíz**. `onPlantado` suena una sola vez.
- Tests: 9 en `OrbeEnVuelo.test.tsx`. jsdom 25 no implementa `getScreenCTM` ni `DOMPoint`, así que el fixture se los da
  y lo que se prueba es el cable (números del DOM → estilo del fantasma, orden, un solo aterrizaje, los tres caminos de
  rechazo: sin escena, con movimiento reducido, sin atributo de aterrizaje, franja de ancho cero).

### 3. La portada colisionaba con su propia barra

El contenedor del home ya reservaba 56 px arriba y 104 + `safe-area` abajo, pero `ESCENA_MAPA` se dimensionaba contra
el viewport entero (`78vh`): a 418 px de alto la sección medía 326 y la fila de chips se metía bajo la barra de chat. El
`min()` gana un cuarto término atado a la banda real — `calc((100dvh − 216px − env(safe-area-inset-bottom,0px)) × 1.2)`,
donde 216 = 56 + 104 + los 56 de la fila de chips y 1,2 = 772/640, el factor del `viewBox`. Mordida solo en pantallas
bajas: en un teléfono de 844 y en escritorio de 900 manda lo mismo de antes. Medido después: escena 57→313, barra
empezando en 341 → **28 px de aire**, `--mapa-escala 0.3139`, los cuatro trazos del camino pintados.

### 4. Documentación podrida corregida

`src/theme/contratoMovimiento.test.ts` justificaba la excepción del mapa diciendo que era «un port 1:1 del donante».
Desde el 2026-11-01 eso es falso. La razón que ahora queda en el archivo es la verdadera —el mapa es el único sitio que
anima trazado de líneas y órbita, gestos que no son de la familia de la interfaz— y es la misma que ya decía la
cabecera de `mapa.css`.

### 5. Verificación

- **Trío:** typecheck 0 errores · lint 0 errores y **0 advertencias** (bajando la única nueva, `exhaustive-deps` sobre
  `aterrizar`: resuelta metiendo el callback en un ref, no ensanchando las dependencias — eso habría reiniciado el
  vuelo en cada render del padre) · `npx vitest --run` **514 pasan / 514 en 39 archivos**. La apertura de esta tarea
  estaba en 496/38.
- **En vivo:** las mediciones de §2 y §3, tomadas sobre la app corriendo en `localhost:5174`, no sobre un render de
  prueba.

### 6. Lo que este pase **no** prueba

- **El vuelo gatillado por un análisis real** (subir un CV de verdad). La mecánica está medida montando el componente
  vivo, pero el disparador end-to-end necesita un archivo del dueño; no se escribió nada en su Supabase para simularlo.
- La captura ancha a 1440 px sigue sin tomarse (viewport de la sesión fijado a 485×418).
- `ESCALA_LECTURA = 0.62` sigue siendo un umbral **elegido**, no medido.
- El aviso ámbar de sugerencias del asistente, cuando aparece, pinta encima de la fila de chips de la portada. Es de la
  capa del asistente, no del mapa; se ataca en el pase de la #52/#47.

**Cierre de #53 y de #51** (orbe arriba de todo + mapa como portada, ya con su camino blanco y su descenso). Lo que no
depende de código sigue igual: el commit espera un «¿commiteo?».

## 2026-11-02 · Tarea #52: el escaneo narra hechos, no un cronómetro

### 1. Qué mentía la pantalla de análisis

Durante la espera real, la pantalla de convalidación mostraba cuatro textos (`PROGRESS_MESSAGES`) avanzando en un
`setInterval` de 6 s, sobre un riel de tres pasos atado a `currentStep` — y `currentStep` sólo se mueve en la cadena de
convalidación **posterior** a persistir. Es decir: la barra estaba congelada mientras el texto desfilaba, y el cuarto
paso contaba una credencial de una función que ya no existe (`SCAN_STEPS = 4`). El sello narrativo del brief —«hitos de
progreso reales en orden»— era justo lo que no estaba.

### 2. El modelo que lo reemplaza

Seis hitos, y no hay un séptimo ni un relleno (`HITOS_ESCANEO` en `src/hooks/useGemeloActivation.ts`): tu documento,
primera lectura, análisis con IA, ejes y habilidades, run en el servidor, gemelo listo. Cada uno existe porque algo
**pasó**:

| hito | hecho cuando | medida que se lee |
| --- | --- | --- |
| documento | el texto ya está en la mano | `29 palabras · 219 caracteres` |
| lectura | corre la heurística local (antes corría adentro de `mezclarAnalisis`, tardísimo) | `6 etiquetas del documento` |
| análisis | responde el motor o el respaldo declarado | `respondió el motor propio` / `respondió el respaldo declarado` |
| ejes | el análisis trae los cuatro ejes | `N habilidades · 4 ejes calculados` |
| registro | el servidor devolvió `guardado` | `2 brechas · huella 7a` — y **fallido** con `el respaldo no deja run en el servidor` |
| gemelo | el reveal está montado | `Tech Lead / Arquitecta · 8 años` |

`fraccionEscaneo()` cuenta sólo `hecho`: un corte del servidor (401/429/503) o un timeout **no** suman barra. El único
movimiento continuo es el haz ámbar; el único número que corre durante la espera es `segundos`, que es tiempo medido.
El timeout de seguridad rinde el hito que estaba en el aire con `sin respuesta en 150 s`, y una respuesta tardía cae en
el guard de `cancelledRef` sin reescribir nada.

### 3. El port del donante, en React

`src/features/omicron/components/EscaneoDocumento.tsx`: silueta 220×290 con repliegue, un trazo por renglón real del CV
(grosor 4 para títulos, 3 para cuerpo; ancho proporcional al renglón, acotado 34–172, tope de 32 trazos), prefijo
encendido en ámbar igual a `trazosEncendidos(fracción)`, barra en `scaleX` (nunca `width`, por el contrato de
movimiento) y lista de seis filas con `role="img"` + `<title>` que resume en una frase lo que el dibujo dice. Con
movimiento reducido el haz no se dibuja: la barra y los hitos ya cuentan lo mismo con palabras.

### 4. El defecto que la suite no podía ver (y el navegador sí)

Medido montando el componente vivo sobre `localhost:5174` a **485×418**, la altura de la moneda:

- Antes: el `<svg>` ocupaba 300×159 con `viewBox` 220×290 → el papel se dibujaba **encajonado**, con dos franjas vacías
  de 90 px a cada lado y escala 0,55. Ratio observado 1,89 contra 0,759 objetivo.
- Causa: `width:100%` + `maxHeight:38vh` peleando por ejes distintos.
- Después: alto manda, ancho sale de la proporción (`height:'min(340px, 38vh)', width:'auto'`). Medido: svg 120×159,
  ratio 0,759 = exacto, margen muerto 5 px a cada lado (que es el padding `x=10` del propio `viewBox`, no carta de
  ajuste), papel 110×148, seis filas de hitos a **44 px** clavados, `aria-valuenow="33"` con 3 de 8 trazos encendidos,
  animación `omi-barrido 2.4s` corriendo, `scrollWidth` sin desborde horizontal.

### 5. La trampa de testing que hay que conocer para no repetirla

`act` de React 18 **no devuelve** mientras el flujo queda parked en una promesa que no resuelve: dos tests colgaban a
5 s sin que el reloj tuviera la culpa. Y `vi.useFakeTimers()` completo traba el `await import()` del servicio (el flujo
lo carga adentro del `try`), así que congelar todos los timers también deadlockea. La forma que quedó en
`useGemeloActivation.escaneo.test.ts`:

- `cargar()` y `disparar()` en `act` **síncronos** (el callback del hook cierra sobre el `cvText` del render anterior:
  vacío, devuelve sin hacer nada — por eso el texto se pone antes, en su propio act).
- Los tests que dejan el flujo parked usan sólo act síncronos y mueven el cronómetro con
  `useFakeTimers({ toFake: ['setInterval'] })` + `advanceTimersByTime`.
- El timeout de seguridad se intercepta por su retardo exacto (`ms === 150_000`) en vez de vivir 150 segundos.
- El camino que sí resuelve usa `hastaElFinal()`: un solo `await act(async …)` que cubre los ~2 s del piso de espera,
  porque si no, el intervalo de 1 s del hook hace tick **fuera** de la scope y la suite se llena de warnings.

### 6. Verificación

- **Trío:** typecheck 0 errores · lint 0 errores y 0 advertencias · `npx vitest --run` **535 pasan / 535 en 41
  archivos** (la apertura de esta tarea estaba en 514/39; +21 tests en los dos archivos nuevos).
- **En vivo:** las mediciones de §4 sobre la app corriendo, y la captura `escaneo-bolsillo-485x418.png` tomada en la
  sesión de medición.

### 7. Lo que este pase **no** prueba

- **El gatillo end-to-end con un CV real**: la pantalla de `syncing` se midió montando el componente vivo, no subiendo
  un archivo — no se escribió nada en el Supabase del dueño para simular un análisis (costaría cota diaria y filas).
- La captura ancha a 1440 px sigue pendiente (viewport de la sesión fijado a 485×418).
- El aviso ámbar de sugerencias del asistente que pinta sobre los chips de la portada **no** se tocó acá: es de la capa
  del asistente y sigue abierto.
- `ESCALA_LECTURA = 0.62` sigue siendo un umbral elegido, no medido.

**Cierre de #52 y de #47** (escaneo narrado con etapas reales, portado y medido). El commit sigue esperando el
«¿commiteo?» del dueño.

## 2026-11-02 · Tarea #48: el workspace dice CUÁL sigue

### 1. Primero la evidencia, después el código

La tarea estaba redactada como «traer la cronología fechada del laboratorio al workspace». Un barrido antes de tocar
nada mostró que **esa parte ya estaba**: `MapaCapacidades` (monte no-escena) dibuja el bloque cronológico con
`fechaCorta()` sobre `veredictoEn` / `dominadaEn`, y esos dos campos vienen de `confirmed_at` / `mastered_at` reales de
`brechas_aprendizaje` (`useBrechasReales.ts:44-57` → `abrirBrechas.ts:62`). Reescribir la cronología habría sido
duplicar al dueño de la verdad.

Lo que **no** estaba es lo que el brief pedía con otras palabras: una fila que responda «¿cuál sigue?» y
«¿cuántas quedan?». Hoy el usuario ve ocho filas idénticas en estructura y tiene que leer los badges una por una.

### 2. El puntero

Una sola fila entre el aviso y la grilla (`AprendizajeTab.tsx:204-225`):

```
SIGUIENTE  Comunicación escrita breve            →
           Quedan 5 en la cola
```

- Sale de `pendientes[0]` sobre `filas`, o sea **la primera pendiente en el orden que ve el usuario** (categoría →
  severidad), no la primera que devolvió la base.
- `aria-controls="brecha-<id>"` apunta a la fila que ya existe (`id` en `.cola-item`): el destino está declarado, no se
  deduce del texto.
- Tocar abre ESA fila y la lleva a la vista. Abrir y scrollear son dos pasos: el `scrollIntoView` corre en un effect
  posterior al render que expande el cuerpo, porque medir sobre el cierre da la coordenada vieja. Con
  `prefers-reduced-motion: reduce` el scroll es `auto`, no `smooth`.
- Sin pendientes **no hay botón**: la misma clase se vuelve `<p role="status">` «Cola libre · No queda ninguna brecha
  por responder…». No se puede «ir» a ninguna parte, así que no se finge un control.
- El recuento aparece dos veces a propósito (el header de la cola dice `5 pendientes`, el puntero `Quedan 5 en la
  cola`): en el bolsillo están separados por el mapa entero, y cada uno es el resumen local de su región. El puntero
  vive arriba del mapa porque es el atajo; la cabecera vive sobre la lista porque es su título.

### 3. Lo que midió el navegador (485×418, app real, cero escrituras)

Primero con `flex-wrap`, y la medición mostró el defecto que el test no ve:

| | flex (primera versión) | grid (versión final) |
|---|---|---|
| alto de la fila | 62 px | **58 px** (mínimo táctil 44 px) |
| ancho | 449 px, sin desborda | 449 px, sin desborda |
| reparto | etiqueta 66 + título 211 + cuenta 125 + icono 16 = 418 + 3 huecos 24 = **442 > 421 útiles** | etiqueta 66 · título 321 (elástico) · icono 16 en la línea 1; cuenta 125 en la línea 2 |
| el icono | **caía solo a la segunda línea** (top 186 contra 157 del texto) | top 160, alineado con el título |

La fila se partía mal, no «en dos líneas»: la flecha quedaba abandonada. Se pasó a rejilla con áreas nombradas
(`etiqueta / titulo / icono` arriba, `cuenta` abajo, alineada bajo el título y no bajo la etiqueta), así el reparto es
decidido y no consecuencia del ancho del título.

Contrastes medidos sobre el fondo `#14171c`: etiqueta ámbar **9,51:1** · título `--ink` **15,15:1** · cuenta `--info`
**7,47:1**. Foco: `outline: 2px solid` con 2 px de offset, `tabIndex 0`, elemento `BUTTON` real.

Comportamiento medido al tocar: `aria-expanded` de la fila destino pasa de `false` a `true`, **una sola fila abierta**
a la vez, el cuerpo aparece con sus acciones (`Es real`, `No aplica`), y el contenedor baja de `scrollTop` 0 a 1510
dejando la fila a 15 px del borde superior.

La variante `libre` (449×59, borde discontinuo, etiqueta `--teal` 10,16:1, cuerpo `--ink` 15,15:1) expuso un bug de
token: estaba escrita con `var(--green)`, que **no existe** en `index.css`. Un `color-mix` con variable inexistente se
cae en silencio y pinta el borde heredado. El éxito de esta app se llama `--teal` (y `--logro`, pero ése está declarado
dentro de `.mapa-caja, .mapa-escena` y no llega al workspace).

### 4. La trampa que esto armó en los tests

El atajo nombra a la primera pendiente, así que `getByRole('button', { name: /Comunicación escrita breve/i })` sobre
toda la pantalla pasó a devolver **dos** controles: el atajo y la fila. Ocho tests cayeron. No es un defecto del
andamio —un usuario real oye «Siguiente: …» y distingue—, pero tampoco se deja el nombre ambiguo: las consultas de
fila se metieron dentro de la región `complementary` (`enCola()` / `abrirFilaEnCola()`), que es el único sitio donde el
título ES la fila. Y el test del puntero no busca por texto: lee `aria-controls` y verifica la fila destino.

### 5. Verificación

- **Trío:** typecheck 0 · lint 0 errores y **0 advertencias** · `npx vitest --run` **537 pasan / 537 en 41 archivos**
  (la apertura de esta tarea estaba en 535/41; +2 en `AprendizajeTab.test.tsx`, que pasa de 15 a 17).
- **En vivo:** todas las cifras de §3 tomadas sobre la app corriendo en `localhost:5174` montando la pestaña real, y la
  captura `puntero-cola-485x418.png`.

### 6. Lo que este pase **no** prueba

- **La variante `libre` no es alcanzable en vivo** sin escribir en el Supabase del dueño: el puente del invitado llega
  siempre `detectada` y la lectura propia necesita sesión. Se midió su CSS clonando la fila con el mismo
  `data-estado`, lo cual prueba la hoja de estilo, no el camino de datos.
- **Enter activando el atajo:** el `outline` y el `tabIndex` están medidos; la activación por teclado no se probó
  end-to-end (es un `BUTTON` nativo, y la primera medición quedó contaminada porque la fila ya estaba abierta).
- Sigue abierto lo de siempre: captura ancha a 1440 px, `ESCALA_LECTURA = 0.62` como umbral elegido, y el aviso ámbar
  del asistente que pinta sobre los chips de la portada.

**Cierre de #48.** Queda #49 (retiro del laboratorio, puerto 4173). El commit sigue esperando el «¿commiteo?» del dueño.

---

## 2026-11-02 · Tarea #49: cuatro puertos acotados y el laboratorio fuera

El inventario del donante devolvió 11 cosas que la app no tenía. Se portaron **cuatro**,
se rechazaron siete con nombre y razón (§5), y se jubiló el laboratorio. El criterio de
corte fue uno solo: un puerto entra si corrige algo que en la app **miente o no funciona**;
no entra si es comodidad del laboratorio con otro dueño de los datos.

### 1. Lo que se portó (y por qué cada uno era un defecto, no un capricho)

| Puerto | Dónde | Qué estaba mal en la app |
|---|---|---|
| **A · arrastrar y soltar de verdad** | `src/features/omicron/components/ConvalidaOmicron.tsx` (label con `onDragOver` / `onDragLeave` / `onDrop`, estado `sobre`, `data-sobre`) | El recuadro punteado decía «Soltar archivo» y **no tenía ningún `onDrop` en todo el repo**: era una affordance falsa. Un `div` suelto con `onDrop` tampoco funciona — el navegador cancela el `dragover` por defecto; hay que `preventDefault()` en las tres fases. |
| **B · el recorte avisado** | `src/features/gemelo/services/cvExtract.ts` devuelve `LecturaCV { texto, totales }`; `TOPE_CV` / `PISO_CV` exportados | El `slice(0, 15000)` existía y **no se decía**: un CV de 40 000 volvía como «leído (15000 caracteres)» y el usuario creía que el análisis vio todo el documento. |
| **C · piso de texto con su razón** | `activateGemeloCompleto` (`text.length < PISO_CV`) + CTA `canActivate` + la leyenda bajo el botón | Con 0 caracteres el botón devolvía en silencio (`if (!text) return;`): el usuario tocaba y no pasaba nada, sin mensaje y sin culpa. |
| **D · Escape colapsa la fila** | `<aside class="aprendizaje-cola" onKeyDown>` en `AprendizajeTab.tsx` | El workspace no tenía forma de cerrar una fila sin volver a tocar el cabezal; y el modal de activación ya usa Escape, así que la tecla pedía un dueño único. |

**D es scope-ada a la cola a propósito**, no un listener de documento: `ConvalidaOmicron`
cierra con Escape y dos dueños para la misma tecla cierran las dos cosas de una vez. El test
fija las dos mitades (desde `document.body` **no** colapsa; con el foco dentro de la fila
**sí**).

### 2. Los cinco defectos que aparecieron midiendo, no leyendo

Ninguno se habría visto en el código; los cinco salieron de montar el flujo real.

1. **`await file.arrayBuffer()` estaba fuera del `try`.** Un `.txt` no necesita buffer, y si
   esa lectura fallaba el `catch` no la cubría: se rompía la promesa escrita en la cabecera
   del módulo («si algo falla, cae a texto plano»). Movida dentro del intento y solo para
   `.pdf`/`.docx`. De paso desapareció el `buffer.slice(0)`, que era una copia del buffer
   entero para nada.
2. **`setCvFileName(file.name)` se ejecutaba antes de leer.** Un archivo rechazado dejaba la
   pantalla nombrando a un archivo que no se usó: medido en vivo, tras soltar `cv-minimo.txt`
   sobre un `cv-largo.txt` ya cargado, la píldora decía *cv-minimo.txt*, el `textarea` tenía
   los 209 caracteres del anterior y el CTA seguía **habilitado**. El nombre ahora viaja con
   el texto que se va a analizar.
3. **Había dos pisos para una sola regla.** La lectura aceptaba 30 caracteres y el CTA exigía
   40: «CV leído» sin habilitar nada. `PISO_CV` es ahora el único número, importado por el
   hook y por el componente.
4. **El filtro de basura decidía por longitud absoluta.** Con `printable.length > 30`, un `.txt`
   de 9 caracteres volvía vacío y la pantalla le decía al usuario *«solo 0 caracteres»*. La
   basura se detecta por **proporción** de caracteres imprimibles, no por tamaño; la longitud
   la juzga `PISO_CV` en el hook, que es donde existe el porqué. El filtro pasó de una regex
   con cuatro escapes a un `codePointAt` (`0x20–0x7E` y `>= 0xA0`, más tab/LF/CR): mismo
   conjunto, sin escapes.
5. **El mock del módulo se quedó viejo.** `vi.mock('…/cvExtract', () => ({ extractCVText }))`
   sin `PISO_CV` hacía que el hook revienta **antes** de llegar al motor: 6 tests caían con
   `phase: 'upload'` en vez de `'syncing'`, y el síntoma no tenía nada que ver con la causa.
   Reemplazado por un mock parcial con `importOriginal`: se finge la lectura (que pide CDN),
   los números se quedan verdaderos.

### 3. Medido en la app corriendo (antes → después)

| Medición | Antes | Después |
|---|---|---|
| `dragover` sobre el recuadro | nada (`onDrop` inexistente) | `data-sobre="si"`, borde `dashed/1.33px` → **`solid/2px`** |
| `dragleave` | nada | vuelve a `data-sobre="no"`, `dashed/1.33px` |
| soltar `.txt` de 219 caracteres | aceptado a ciegas | píldora + `textarea` 219, CTA `disabled: false`, mensaje *«"cv-largo.txt" leído (219 caracteres)»* |
| soltar `.txt` de 20 000 caracteres | «leído (15000 caracteres)» | ***«"cv-enorme.txt" tiene 20000 caracteres y el análisis llega a 15000: uso los primeros. Si algo clave quedó afuera, pegalo abajo.»*** |
| soltar `.txt` de 9 caracteres | *«solo 0 caracteres»* | ***«solo 9 caracteres»*** + «con menos de 40 no alcanzo a ver un rol», CTA `disabled: true` |
| pegar 12 caracteres | botón activo que no hacía nada | leyenda ámbar *«Con 12 caracteres no alcanzo a ver un rol: pegá al menos 40, o subí el CV.»*, CTA bloqueado |
| `Escape` con foco en la fila abierta | fila se queda abierta | `aria-expanded` `true → false`; desde `document.body` sigue `true` |

La captura del estado de recorte es `arrastre-cv-485x418.png` (workspace del chat, 485×418).

### 4. Pruebas

- `src/features/gemelo/services/cvExtract.test.ts` — **nuevo, 6 tests**: texto corto (total =
  lo leído), texto largo (recorte **y** total verdadero), archivo vacío (`''` y `0`), corto
  pero legible (9 caracteres, no 0), binario real (se descarta por basura), y el contrato
  «piso y tope son una sola regla» (`PISO_CV < TOPE_CV`, `TOPE_CV === 15000`).
  - jsdom **no implementa `Blob.text()` ni `Blob.arrayBuffer()`**; el archivo lleva un shim
    sobre `FileReader` (que sí existe) para que una limitación del entorno no se parezca a un
    fallo del producto. El shim toca `text`, no `arrayBuffer`: así un `.txt` que pidiera buffer
    revienta la prueba en vez de pasar disfrazado (que fue exactamente el defecto 2.1).
- `src/features/aprendizaje/AprendizajeTab.test.tsx` — **18 tests** (+1: Escape). Salió un
  helper nuevo, `toggleDe()`: abierta la fila, el título nombra **tres** botones dentro de la
  cola (el cabezal, «Es real: X», «No aplica: X»), así que el cabezal se toma por su clase.
- `src/hooks/useGemeloActivation.escaneo.test.ts` — 10 tests, verdes otra vez con el mock parcial.

### 5. Lo que **no** se portó, con su motivo

| Del laboratorio | Por qué no entra |
|---|---|
| Historial de corridas (12 en `localStorage`) | El historial de Ómicrom vive en `analisis_cv`/`brechas_aprendizaje`; un segundo almacén en el navegador sería un segundo dueño de la verdad. |
| Deshacer una decisión | Por D7 dominar es declarado y terminal; revertir necesitaría una tabla de auditoría que no existe. |
| Botón «usar texto de muestra» | En la app cada corrida cuesta cupo del motor (`ANALISIS_TOPE_DIARIO`); inyectar muestra es gastar el tope del dueño para ahorrar un clic. |
| Click en el nodo para abrir su fila | El mapa es `role="img"` por decisión del dueño (se lee, no se toca); volverlo interactivo pide su propio pase de accesibilidad, no un `onClick` suelto. |
| Rechazo explícito de PDF | La app ya parsea PDF y DOCX con PDF.js/Mammoth; el rechazo era límite del laboratorio, no regla de producto. |
| Orbe con estados reales / realtime < 3 s | Es Plan B (deuda declarada), no un puerto de piel. |
| Tope diario visible en la pantalla | Lo aplica la Edge Function con 401/429/503; duplicarlo en el cliente sería un segundo presupuesto. |

### 6. Retiro del laboratorio

- Servidor **detenido** (PID 10556, `node servidor.mjs`); el puerto **4173 está cerrado**.
- La carpeta se **renombró** a `cabina-lab-jubilada-2026-11-02/` y su `README.md` abre con el
  banner de jubilación, el link único y la instrucción de no levantar el servidor: sus
  pantallas se ven idénticas a las reales con datos que no existen, y eso es exactamente el
  *«¿por qué sigo viendo ómicron antiguo?»*.
- **No se borró.** Este workspace no es un repo git: volver atrás es cambiar el nombre de
  vuelta y levantar `servidor.mjs`.
- **Link único de la app: http://localhost:5174/**

### 7. Verificación

- **Trío:** typecheck 0 · lint 0 errores y 0 advertencias · `npx vitest --run`
  **542 pasan / 542 en 42 archivos**.
- **En vivo:** las siete filas de §3 tomadas sobre `localhost:5174`, abriendo el modal real
  con el evento `omicron:request-cv` y soltando `File` reales (`DataTransfer`), sin tocar la
  sesión del dueño y sin gastar cupo del motor (ninguna de estas mediciones llegó a
  `activateGemeloCompleto`).

### 8. Lo que este pase **no** prueba

- **Arrastre del sistema operativo.** Se probó con `DragEvent` sintético y `DataTransfer` con
  `File`; los manejadores son los mismos, pero la trayectoria real del SO (archivos
  restringidos, `text/uri-list`, soltar fuera de la ventana) no está cubierta.
- **PDF y DOCX reales.** El cambio 2.1 toca justo el camino binario; el entorno de prueba no
  tiene las librerías del CDN, así que la ruta `.pdf`/`.docx` quedó verificada solo por
  lectura de código.
- **Escape en vivo.** Su evidencia es la prueba unitaria del `aside`; la pestaña Aprendizaje
  necesita sesión para mostrarse y no se abrió la del dueño.
- Sigue abierto lo de siempre: captura ancha a 1440 px, `ESCALA_LECTURA = 0.62` como umbral
  elegido, y el aviso ámbar del asistente que pinta sobre los chips de la portada.

**Cierre de #49 y de las cuatro tareas de unificación** (mapa radial · escaneo por hitos
reales · cronología fechada · retiro del laboratorio). El **commit sigue esperando el
«¿commiteo?» del dueño** — #41 continúa abierto por lo mismo.

---

## 2026-11-02 · Tarea #55: la franja de ayuda deja de tapar los chips que manda tocar

Apareció en la lista de huecos de #48 y #49 como «el aviso ámbar del asistente pinta sobre los chips de
la portada». Primero había que medirlo: no era un gusto, era un **contrasentido geométrico**.

### 1. La evidencia

La escalada por inactividad (`useIdleEscalation`) dispara a los 30 s sin gestos y manda, en la misma
frase, a *tocar un chip*. A 485×418 (el viewport de bolsillo con el que se mide todo este plan):

| | Antes | Después |
|---|---|---|
| Texto | `¿Necesitas ayuda? Prueba diciendo "aprender una lección" o toca un chip abajo.` (78 caracteres) | `¿Te ayudo? Decí "aprender una lección" o tocá un chip.` (54) |
| Franja | `x17 y288 w452 h53` + margen 8 → **61 px** | `x17 y313 w452 h29` + margen 6 → **35 px** |
| Hueco disponible entre la leyenda (baja a y 313) y la barra (sube a y 349) | 36 px — la franja pedía 61 | 36 px — la franja pide 35 |
| Solapamiento con los chips | «Conocimiento» **1980 px²**, «Credencial» **1600 px²** | **0 px² en los cuatro chips** |
| Renglones / desborde | 2 renglones | 1 renglón, `scrollWidth <= clientWidth` (no corta) |
| Semántica | `div` suelto, mudo para lector de pantalla | `role="status"` |

La página **no scrollea** a este alto (`scrollHeight === viewportHeight`), así que no había forma de
«hacer lugar» moviendo el contenido: la única salida honesta era que la franja cupiera en los 36 px que
existen. De ahí las dos decisiones: **una línea** y **copy más corto**.

### 2. Qué cambió

- `src/hooks/useIdleEscalation.ts` — la frase sale del cuerpo del hook como `AYUDA_MS` exportada, para
  que la prueba mida **el mismo texto que se pinta** y no una copia que se desincroniza. La cabecera del
  hook ahora dice `30s → AYUDA_MS` en vez de citar la frase.
- `src/features/omicron/components/OrbShell.tsx:1394` — la franja pasa a `padding: 6px 12px`,
  `lineHeight: 1.45`, `borderRadius: 9` (radio de control del brief, no de tarjeta), `marginBottom: 6` y
  `role="status"`. Comentario en el sitio explica el hueco de 36 px: sin ese número, el siguiente que pase
  va a volver a poner `padding: 8px 12px` «porque se ve mejor».
- La voz: el resto de la app vosea («pegá», «tocá», «arrastrá»); la escalada decía *Prueba* y *toca*. Ahora
  habla como el resto, y **sigue nombrando las dos salidas** — el comando de voz que el oráculo entiende y
  el gesto táctil equivalente — porque una ayuda que no dice qué hacer es ruido.

### 3. Pruebas

`src/hooks/useIdleEscalation.test.ts` — **nuevo, 7 tests** con timers falsos:

- escalada: `chips_bounce` a los 12 s, `highlight_node` a los 22 s, `help_offer` a los 32 s **con el mensaje
  exacto**, y `quiet` a los 60 s sin retorno;
- `resetIdle` al primer `keydown` apaga la oferta (el listener es de `window`, no del documento);
- `enabled = false` no escala nunca;
- y el contrato de la franja: `AYUDA_MS.length <= 60` (lo que entra en una línea de mono 11 px dentro de
  396 px útiles), que nombre el comando de voz **y** el chip, y que no vuelva al «tú».

RED → GREEN: los 7 arrancaron en 5 fallados / 2 pasando; las 5 caídas eran todas por `AYUDA_MS` sin
exportar, y el síntoma (`expected '¿Necesitas ayuda?…' to be undefined`) no decía la causa.

### 4. Verificación

- **Trío:** typecheck 0 · lint 0 errores y 0 advertencias · `npx vitest --run` **551 pasan / 551 en 43
  archivos** (542 → +2 de `cvExtract` en #49 y +7 de este archivo).
- **En vivo:** las cifras de §1 tomadas en `localhost:5174` esperando la escalada real (30 s sin gestos),
  y la captura `franja-ayuda-485x418.png`.

### 5. Lo que este pase **no** prueba

- **Otros anchos.** El hueco de 36 px es de 485×418. A 390 px de ancho la leyenda se parte y el hueco
  cambia; a 1440 px la portada se comporta distinto y sigue sin medir (arrastre de #48).
- **Lector de pantalla.** `role="status"` está puesto, no anunciado: no hay prueba de que el aviso se lea
  al aparecer, y `speakLocal()` ya lo dice en voz — puede ser doble aviso para quien use ambos canales.
- La franja sigue siendo **texto sobre el degradé de la barra**: no choca con los chips, pero pinta encima
  del halo del mapa. Es una elección de altura, no un defecto cerrado.

**Cierre de #55.** Quedan del ledger: la captura ancha a 1440 px, `ESCALA_LECTURA = 0.62` como umbral
elegido, y el **commit**, que sigue esperando el «¿commiteo?» del dueño (#41 abierto por lo mismo).

## 2026-11-02 · Tarea #56 — Recorrido de usuario nuevo con CV real

Medido en `http://localhost:5173/` con `localStorage` y `sessionStorage` vacíos
(10 claves borradas en esa ventana automatizada, entre ellas
`sb-cuwuyqpxaibbqjrvamjb-auth-token`: es la sesión del navegador del agente, no
la de su Chrome).

**Flujo recorrido:** elegir color → "¿A qué te dedicas?" con texto libre
("Soy ingeniera en informatica, trabajo en una fintech") → portada → modal
ACTIVAR GEMELO → `cv-camila.txt` (1.818 caracteres) → Activar.

**Funcionó de punta a punta en 5173.** El escaneo narró datos reales: identidad
"Camila Rojas Medina", "Tech Lead especializada en migración de sistemas legacy",
"Detectado: Node.js / React / TypeScript", cierre "Gemelo Digital calibrado. 12
competencias detectadas". Los ejes medidos quedaron en
`omicron_axes_snapshot` = 88 / 82 / 78 / 80 y el análisis completo en
`omicron_pending_cv_analysis` (2.166 bytes).

### Los tres hallazgos

**A · El onboarding inventa el Gemelo antes del CV.** `OrbOnboarding.tsx:186-200`
fabrica el perfil con aritmética, no con lo que el usuario dijo. Medido con la
frase real de arriba: `years` 3 (nunca dijo años), `axes` 45/37/24/32 =
`30+years·5 / 25+years·4 / 15+years·3 / 20+years·4`, `seniorLabel`
"Profesional Mid", y el oficio se trunca a 50 caracteres:
`profession` "Soy ingeniera en informatica, trabajo en una finte" y `summary`
"Profesional en Soy ingeniera en informatica, trabajo en." Peor: el mapeo por
patrones tradujo "ingeniera en informatica" a la skill **"Ing. Industrial"**. Un
producto que promete "reputación imposible de falsificar" falsifica el primer
número que muestra.

**B · El motor está cortado por CORS, no por conexión.** En 5174 el aviso decía
"La IA no pudo analizar tu CV. Verifica tu conexión": cero relación con la
conexión. Medido con curl contra la función desplegada, sin navegador:
`POST /functions/v1/analizar-cv` → **200 OK con un clon correcto del CV** (years
8, ejes 88/82/70/75, skills reales). El bloqueo es de cabecera:
`Access-Control-Allow-Origin: https://sistema-omicrom.vercel.app` llega **para
cualquier origen**, incluido el localhost que la propia lista dice permitir. Dos
defectos distintos:
  - 15 funciones hacen `const CORS = corsHeaders()` a nivel de módulo — sin
    request, el origen queda congelado en producción para siempre. Están bien
    escritas solo `proxy-ai` y `proxy-tts`.
  - `cors.ts` permitía los puertos exactos 5173 y 3000. Vite arrancó en 5174
    porque 5173 estaba ocupado, y ni el fallback respondía.
Consecuencia: **ningún camino del motor es verificable desde un preview de
Vercel ni desde un dev con el puerto corrido**, que es exactamente lo que
venía pasando cada vez que "la IA no respondía".

**C · El análisis real no llega a la portada.** Recargada la app después del
análisis exitoso, el `aria-label` del mapa sigue diciendo *"Mapa radial de
Profesional con experiencia media (muestra)"* y el puente
`omicron_brechas_invitado` está vacío. El trabajo se hizo y quedó esperando en
`localStorage` (`pending_cv_analysis` es el puente hacia la promoción
invitado→cuenta), mientras la pantalla del hero muestra la demostración. Es la
traba que él ya nombró: conectar los datos no basta, la fusión se juzga en la
portada.

### Arreglo aplicado (código, sin desplegar)

- `supabase/functions/_shared/cors.ts`: cualquier puerto de loopback
  (`localhost`, `127.0.0.1`, `[::1]`) es origen válido; la lista fija de 5173/3000
  se eliminó.
- Nuevo `withCors(handler)` en el mismo archivo: envuelve `Deno.serve`, resuelve
  el OPTIONS y **reescribe las cabeceras CORS de cada respuesta con el origen de
  esa petición**. Sin estado mutable por módulo, así que no hay carrera entre
  requests concurrentes del mismo isolate.
- 15 funciones envueltas (`analizar-cv`, `arbiter-ai`, `carta-ia`, `chat-assist`,
  `crear-checkout`, `credential`, `embed`, `examen-ia`, `ghost-approval`,
  `market-match`, `run-code`, `simulador-universal`, `tutor`, `vault-oracle`,
  `verificar-pago`). Diff: 3 líneas por archivo (import, apertura, cierre),
  verificado con `git diff --numstat`. Ninguna lógica de negocio tocada.
- **No se desplegó nada**: el deploy es de él. Hasta ese deploy, la función viva
  sigue siendo la vieja — y eso también se midió: la respuesta 200 no trajo
  `brechas`, no trajo `guardado` y no trajo la huella `x-omicron-build`, o sea
  que el servidor corre código anterior a T6/T7/T10.

### Lo que esto no prueba

- Que el fix funcione en el navegador: requiere el deploy de las funciones.
- 1440 px, PDF/DOCX reales, lector de pantalla, y el plan "orbe con estados
  reales" (hallazgo C) siguen sin medir.
- El tope diario de invitado no se ejercitó: la función desplegada vieja no lo
  tiene, así que el 429/503 del invitado sigue siendo teoría.

Sigue sin commitearse nada: su "¿commiteo?" continúa sin respuesta.


---

## 2026-11-02 · Tarea #59 — Home: fuera órbitas, punto en órbita y pentágono girando

**Pedido literal:** "en la pestaña home veo unas órbitas, un punto dando vuelta y el pentágono girando; todo eso hay que sacarlo, solo dejar el mapa mental y la orbe".

**Lo que era cada cosa (medido en el DOM vivo, no adivinado):**

| Lo que él vio | Era | Acción |
|---|---|---|
| unas órbitas | `g.mapa-anillos`: 3 círculos guía punteados | fuera de la portada (quedan en el workspace, donde la distancia al centro sí explica en qué anillo vive un nodo) |
| un punto dando vuelta | `g.mapa-orbita`: la chispa del logro girando 9 s alrededor de un nodo dominado | fuera de la portada (la recompensa nace de DOMINAR una brecha, decisión que se toma en el workspace) |
| el pentágono girando | el `animation: girar 25s` sobre la trama geodésica + el logo de la franja girando 25 s + el orbe del loader girando 25 s | el GIRO se quitó en los tres; la trama quedó |
| puntos flotando | `EmotionParticles`: 8 divs con `omi-float`, posición y tamaño sacados de `Math.random()` en cada render | borrado de la app (componente, montaje y la variable `--emotion-particles` que nadie leía) |

**Decisión de fondo (y por qué no borré el orbe):** sus tres quejas son de MOVIMIENTO, y la cláusula que salva dice "dejar la orbe". La trama geodésica sobre la raíz dorada ES el orbe plantado en el centro del mapa (fue el fallo que él mismo pidió: "la orbe adelante de todo, escena cuando se conecta el mapa"). Borrarla dejaba un disco ámbar plano y mataba justo lo que hay que quedar. Así que se fue el `girar`, no la esfera: la trama ahora llega quieta, igual que llega el orbe en vuelo (`OrbeEnVuelo` ya usaba `spinning={0}`; el mapa era la única inconsistencia).

**Archivos tocados:**
- `src/features/mapa/MapaCapacidades.tsx` — anillos y chispa detrás de `!escena`; comento del `data-orbe-*` actualizado (sigue siendo la diana de aterrizaje).
- `src/features/mapa/mapa.css` — `.mapa-orbe` sin `animation` (ni `transform-box`/`origin`); `.mapa-orbe` fuera del bloque reduced-motion (ya no había nada que detener).
- `src/shared/components/OrbTopbar.tsx:107` — `spinning={25}` → `spinning={0}`.
- `src/App.tsx:176` — orbe del loader `spinning={25}` → `0` (el estado de carga lo siguen contando el texto y la respiración del orbe).
- `src/shared/components/EmotionBridge.tsx` — montaje de `EmotionParticles` fuera.
- `src/shared/components/EmotionAwareUI.tsx` — componente, campo `particles` de la configuración y su CSS var, borrados.
- `src/features/mapa/MapaCapacidades.test.tsx` — dos tests nuevos: la portada no tiene anillos ni chispa y `.mapa-orbe` no declara `animation:`; y el workspace conserva anillos + chispa (para que el recorte no se coma el LABORATORIO).

**Verificación (medida, no afirmada):**
- `npm run typecheck` limpio · `npm run lint` limpio · `npx vitest --run` → **43 archivos / 553 pruebas** (antes 551; +2 de guarda).
- Home vivo en `http://localhost:5173/` tras recargar y esperar 1,5 s: elementos con `omi-spin`/`girar`/órbita = **0**; malla del orbe = 25 aristas + 12 puntos con `animation: none`; `g.mapa-anillos` = 0; `g.mapa-orbita` = 0; puntos `omi-float` = 0; `circle.mapa-raiz` presente. El orbe de la franja reporta `animation: none`.
- Motion que queda en la portada y es deliberado: el nacimiento de los nodos (`nacer`/`trazar`/`aparecer`, una vez), la respiración del orbe (`omi-breathe` 3 s) y la barra de red (`omi-pulse`/`omi-shimmer`). Nada da vueltas.

**No probado / queda dicho:**
- La captura visual no salió: el Browser interno estaba oculto (`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`), así que esto está medido en DOM y estilos computados, no visto con los ojos.
- Mismo patrón de órbitas CON punto dando vuelta vive en la tarjeta "Orbital" de `GemeloTab.tsx:286-304` (dos aros girando con un punto cada uno). Es otra pestaña, no la home, y no lo toqué: él pidió la home. Si quiere la misma vara en toda la app, es un cambio de dos líneas y sus colores ya son hex escritos a mano.
- Nada commiteado (sigue en pie la pregunta del commit #41). Nada desplegado.


## 2026-11-02 · Tarea #57 · Hallazgo A: el onboarding deja de inventar el Gemelo (y descubre que el nacimiento no se pintaba)

**Qué se pidió.** Después del recorrido de usuario nuevo (#56) quedaron tres
hallazgos. A: del "¿a qué te dedicas?" salía un Gemelo fabricado. B: decoración
en movimiento sobre datos de muestra (cerrado en #59). C: la portada sigue
mostrando "(muestra)" (pendiente, #58).

**Cómo estaba inventado (antes).**

| Dato | De dónde salía | Qué decía |
|---|---|---|
| Ejes exec/qual/trans/fund | `30 + años·5`, con mínimo 20 exigido al modelo | una medición que nadie midió |
| Años | defecto 3 si la frase no los nombraba | "3 años de experiencia" |
| Habilidades | terna `Profesional / Adaptabilidad / Trabajo en equipo` cuando no entendía nada | perfil relleno |
| % por habilidad | 80/70/60 por POSICIÓN en la lista, escrito en la base como `p_skills_detail` | precisión de instrumento |
| Resumen | plantilla "Profesional en X" / "Dominas…" | juicio sobre el usuario |
| Segunda capa | `callAI(PROFILE_PROMPT)` en segundo plano, con catch silencioso | consumía el cupo del invitado para inflar |

**Cómo quedó.** `perfilDesdeDeclaracion()` ([perfilDeclaracion.ts](file:///C:/Users/paill/Documents/Qoder/2026-10-23/ea694392/Sistema-omicrom/src/features/omicron/utils/perfilDeclaracion.ts)) es módulo puro, sin React ni audio, y sólo admite PALABRAS DICHAS: ejes siempre `{0,0,0,0}`, años 0 si no se dijeron (y entonces sin etiqueta de antigüedad), habilidades vacías si no nombró nada, `p_skills_detail: []` en la escritura a `aplicar_analisis_cv` ([OrbShell.tsx:971](file:///C:/Users/paill/Documents/Qoder/2026-10-23/ea694392/Sistema-omicrom/src/features/omicron/components/OrbShell.tsx#L971)), y el `callAI` de relleno borrado junto con `PROFILE_PROMPT` y `quickSkillsFromText`. El aviso del nacimiento es una sola frase, honesta y de 91 caracteres: "Tu Gemelo Digital nació con lo que me contaste. Súbele el CV y lo completo con datos reales."

Recorte extra en el nombre: la cola "con 12 años de familia" se quita del oficio
porque los años viajan en su propio campo (la raíz del mapa se rotula con él). Si
la frase ENTERA era la antigüedad ("Con 8 años en ventas"), se devuelve tal cual:
el recorte no puede dejar la raíz sin nombre.

**El bug que apareció al medirlo.** La bandera `omicron_onboarding_done` se
escribía en el mismo lote que `setStep('born')`, y `shouldHide` se evalúa en cada
render: el paso de la celebración se montaba YA oculto. Traducción: el aviso del
nacimiento nunca se veía en pantalla, sólo se oía por voz. Movido al cierre del
flujo (a los 4 s, junto a `onComplete`). Evidencia medida antes del arreglo:
`document.body.textContent` = `''` a los 2,2 s del envío; después: contiene
`GEMELO DIGITAL ACTIVADO` y la frase completa.

**Verificación.** `npm run typecheck` limpio · `npm run lint` limpio ·
`npx vitest --run` **45 archivos / 574 pruebas verdes** (antes 44/566; +7 en
`OrbOnboarding.test.tsx`, +1 en `perfilDeclaracion.test.ts`, que llega a 14).
Los 7 nuevos recorren el flujo real montado (color → declaración → nacimiento →
cierre), no la función suelta: qué le llega al huésped, qué queda guardado en
`omicron_guest_profile`, y dos guardas de fuente que impiden que la invención
vuelva por el costado (ni `PROFILE_PROMPT`/`callAI` en el onboarding, ni
`p_skills_detail` con números en la escritura).

**Por qué no en el navegador.** El Browser embebido está oculto
(`visible=false`, viewport 485×418) y **con rAF congelado: 0 frames en 1 s
medidos**. Sin frames, `AnimatePresence mode="wait"` no suelta el paso nuevo y el
recorrido vivo no avanza del selector de color; tampoco termina la salida del
loader. Por eso el contrato del nacimiento se fijó en jsdom, donde el loop sí
corre. Queda para sus ojos, en pantalla real: que el aviso se vea ~2 s antes de
entrar a la app.

**No probado en esta tarea.** El recorrido vivo (por lo de arriba) · el estado
vacío que ahora produce un perfil sin CV en la credencial y el mapa (ejes 0 y
posibles `skills: []`) — es la consecuencia directa de dejar de inventar y se
atiende en #58 · PDF/DOCX reales · los 15 despliegues de Edge Function y las
migraciones 10011/10012/10013, que siguen esperando sus clicks.
## 2026-11-02 · Tarea #58 · la portada consume el análisis real del CV

**Lo que vio el dueño (Hallazgo C, prueba de usuario nuevo):** sube su CV, el análisis
termina, y el home sigue mostrando el mapa de OTRA persona (la muestra del donante) con
sus 16 nodos, sin decirlo. Para enterarse de su propio análisis tenía que recargar.

### Tres causas, tres arreglos

| # | Causa medida | Arreglo |
|---|---|---|
| 1 | `useVistaBrechas` leía el puente **una sola vez** (`useMemo(…, [])`). El puente se escribe después del análisis, con la portada ya montada. | El puente se **escucha**: `puenteBrechasInvitado` es un store con `suscribir/notificarPuente` y una `huella()` que devuelve el crudo (cadena estable, apta para `useSyncExternalStore`). El parse vive en un solo lado (`puenteDesdeHuella`) para que `leer()` y el hook no puedan diverger. Un suscriptor que lanza no deja mudos a los demás. |
| 2 | El **fallback Gemini** no emite brechas y además **no tocaba el puente**: `useGemeloActivation` guardaba el pending y el puente seguía inexistente. | El respaldo deja la marca: si no hay sesión y no hay puente previo, escribe `[]`. No borra nunca un puente con brechas (el mismo cuidado que M6 con la función vieja). |
| 3 | La muestra se etiquetaba **sólo en la pestaña** (`AVISO_MUESTRA` era un const local de `AprendizajeTab`). El home pintaba 16 nodos ajenos con aviso cero, y el vacío tenía DOS redacciones (`'Subir tu CV para empezar el mapa'` hardcodeado en la portada). | `AVISO_MUESTRA` y `AVISO_VACIO` (los dos vacíos con su título/explicación/acción) viven en `abrirBrechas.ts`. La portada y la pestaña leen de ahí. Con `cvLeido` (existe la clave del puente) el invitado que ya subió su CV **deja de ver la muestra**: ve `Leí tu CV y no te marqué brechas` + `Subir un CV más detallado`. |

### Medición en la app corriendo (DOM real, http://localhost:5173/)

El Browser embebido sigue con `visibilityState: hidden` y 0 fps, así que se midió texto e
inventario de nodos, no píxeles:

| Estado sembrado | Nodos del donante | Etiqueta de muestra | Aviso del vacío | CTA |
|---|---|---|---|---|
| invitado sin puente | 16 | `ANÁLISIS DE MUESTRA · SIN IA CONECTADA` | — | — |
| puente `[]` (CV leído, sin brechas) | **0** | ausente | `Leí tu CV y no te marqué brechas` | `Subir un CV más detallado` |
| puente con 1 brecha propia | 2 nodos del puente | ausente | ausente | — (aria: *1 en el anillo de las brechas*) |

Después de la prueba se limpiaron las claves sembradas: el navegador del dueño quedó con
las dos que ya tenía (`omicron_user_color`, `omicron_visit_count`).

### Verificación

- `npm run typecheck` y `npm run lint`: limpios.
- `npx vitest --run`: **45 archivos / 594 pruebas en verde** (era 574; +20).
- Pruebas nuevas: puente reactivo (`escribir`/`limpiar` despiertan oyentes, `huella()`,
  suscriptor que falla no enmudece al resto), los dos vacíos de `resolverVista`, el
  respaldo Gemini que marca el CV leído / respeta un puente previo / no toca el puente
  autenticado, y el montaje real de la pestaña con puente `[]` y con puente que llega
  después del render.
- Guard de duplicación (`abrirBrechas.test.ts`): la portada y la pestaña importan
  `AVISO_VACIO` y `AVISO_MUESTRA`, y no conservan su redacción vieja.

### Lo que NO quedó probado

- El recorrido completo con un CV real hasta el mapa propio: depende del motor
  `analizar-cv` desplegado y de los 15 despliegues pendientes del `withCors`, que son
  clicks del dueño. Acá se probó el estado del puente, no la ida y vuelta con Supabase.
- Que el puente reactivo se vea en la **portada** sin recargar (no en la pestaña): la
  reactividad está probada en el hook y en el montaje de la pestaña; en el home no se
  pudo accionar porque no hay forma de escribir el puente sin un análisis real, y el
  análisis real está trabado por el punto anterior.
- El `storage` event entre pestañas: no se agregó (ningún camino del app escribe el
  puente desde otra pestaña). Si la promoción invitado→autenticado lo hace, hay que
  sumarlo ahí.

## 2026-11-02 · Tarea #60 · Voz única: el voseo sale del texto que ve el usuario

**Qué se pidió.** Después de #58 quedó un contraste que nadie había medido: el
cromo de estados hablaba de tú ("Sube tu CV", "Prueba de nuevo") y el resto de la
app hablaba de vos ("Subí tu CV", "Probá una", "Volvé a intentar", "tenés",
"Solo podés"). En la misma pantalla de error convivían las dos personas
gramaticales: la frase nacía en un componente y el aviso técnico venía de una RPC.
El brief del laboratorio cierra con "iconos SVG, cero emojis" y una voz; un
register mezclado es la misma fuga por el lado del texto.

**Dónde estaba el voseo (las tres capas).**

| Capa | Dónde | Ejemplo viejo |
|---|---|---|
| Cliente | 20 archivos de `src/` (OrbShell, cabina, academia, gemelo, red viva, aprendizaje, hooks) | `Arrastrá el archivo acá, o tocá para elegirlo` |
| Edge Function | `supabase/functions/analizar-cv/index.ts:301,514` | `Tu sesión expiró. Volvé a iniciar sesión…` |
| Base (RPC) | `10002` ×2, `10012` ×4 `raise exception` / `json_build_object('error', …)` | `Solo podés guardar tus propios análisis.` |

Los textos de la base no son detalle: PostgREST devuelve el `raise exception` como
`P0001` → HTTP 400 y el cliente lo muestra **tal cual** (`marcarBrecha.ts` lo
reenvía sin reescribir). O sea que el usuario leía voseo sin tocar una pantalla
administrativa.

**Cómo quedó.**

- **Cliente:** las cadenas voseantes pasaron al tú neutro en un solo barrido con
  `perl -CSD -Mutf8` (con word boundary, para no romper "automática", "análisis"
  ni "demás"). Además del imperativo se normalizaron el pronombre (`lo que
  dijiste de vos` → `de ti`) y el `acá` visible → `aquí`, porque el resto del
  sistema ya decía "aquí" y dejar las dos variantes era la misma grieta en chico.
- **Dos avisos de muestra en uno:** `AprendizajeTab.tsx` tenía `{vista.simulado &&
  …}` pegado dos veces seguidas —chip y párrafo— cada uno con su redacción de lo
  mismo. Ahora es un solo bloque, el chip pone la etiqueta y el párrafo dice la
  única cosa que el chip no dice: `Son habilidades de ejemplo, no son tuyas. Sube
  tu CV y aquí aparecen tus brechas reales.` Se fue también la promesa vieja "Con
  el motor conectado, acá aparece tu análisis", que ya era falsa: el motor está
  conectado.
- **Una frase, un dueño:** el aviso de espera larga del coach y del oráculo estaba
  escrito dos veces en `OrbShell.tsx` (612 y 685, idénticas palabra por palabra).
  Ahora es una const, `MS_ESPERA_LARGA` [OrbShell.tsx:111](file:///C:/Users/paill/Documents/Qoder/2026-10-23/ea694392/Sistema-omicrom/src/features/omicron/components/OrbShell.tsx#L111), y los dos caminos la leen (617 y 690).
- **Base:** migración nueva `supabase/migrations/10014_voz_neutra_mensajes_rpc.sql`.
  No se editó 10002 ni 10012: están aplicadas y editar lo aplicado es mentirle al
  historial. 10014 reemplaza los cuerpos de las tres funciones
  (`omicron_ensure_skill_node`, `marcar_brecha`, `guardar_analisis_completo`) con la
  copia literal extraída por programa de las migraciones originales —cero
  transcripción a mano— y cambia **solo las cadenas**. Los `revoke`/`grant` viajan
  con cada función, incluido el `service_role` de `guardar_analisis_completo`.
- **Edge Function:** `analizar-cv` dice ahora `Vuelve a iniciar sesión…` y
  `Vuelve a intentarlo.`; los tests que afirmaban el texto viejo se movieron con
  ella.

**El guard (afirmaciones 7, 8 y 9 de `contratoAsistente.test.ts`).** La vara no es
una lista de palabras ya vistas: es la terminación. Tres redes, cada una con su
razón:

- `TERMINAL` caza cualquier forma `-ás/-és/-ís` y descarta lo que parece y no es
  (futuro de tú: **todo** futuro termina en `-rás`, así que se descarta por esa
  señal; `estás`, `jamás`, `demás`, `quizás`, `atrás`, `después`, `interés`,
  `francés`, `inglés`, `portugués`, `Andrés`, `Nicolás`, `Tomás`).
- `IMPERATIVO_AR` es la red general del imperativo en `-ar`: cualquier palabra que
  termina en `á` sin `r` delante. La `r` es lo que separa las dos personas:
  `amará` es futuro de él, `cantá` es imperativo de vos. Con esta red cayeron
  `aprobá`, `dominá`, `Intentá`, `Iniciá`, `Reintentá` — la primera versión del
  guard sólo llevaba una lista y estaba ciega a esa familia entera. Excepciones
  neutras: `está`, `acá`, `allá`, `sofá`, `mamá`, `papá`, `Bogotá`.
- `IMPERATIVO` (lista cerrada) queda sólo para `-er`/`-ir`, y ahí la lista es
  inevitable: `escribí` y `compré` son a la vez imperativo de vos y pretérito de
  tú, escritos letra por letra igual. Ninguna terminación los distingue, así que
  se nombran. La lista exige la tilde: "mira", "busca", "deja", "usa" son
  imperativos legítimos de tú mientras que "mirá", "buscá", "dejá", "usá" son de
  vos, así que la tilde es la única señal que los separa.

Cierre con lookahead, no con `\b`: en JS el límite de palabra es de
clase ASCII y una `á` final no cuenta como letra, así que `\bprobá\b` no existe.

Barre las tres capas: `src/**` (ts/tsx/css, sin `features/mapa/`, sin tests),
`supabase/functions/**.ts` y `supabase/migrations/*.sql` — 162 + 130 = **292
archivos** —, con los comentarios
quitados —un autor puede citar el texto viejo para explicarlo sin que ese
citamiento le llegue a nadie. Reporta `archivo:línea → palabra`, con el número de
línea ORIGINAL (no el índice del array filtrado), porque "hay voseo por acá" no
es un criterio que se pueda cerrar. Ratchet `DEUDA_VOSEO` con las tres migraciones
aplicadas: se justifica su presencia verificando que todavía tienen voseo (si
alguien las limpia, sobran en la lista) y prohibiendo que la deuda viva en otro
lado que no sea `migrations/`. `10014` no puede deber nada: es la corrección.

El caso distinto es `10011`: su "Pasá" vive dentro de un `raise warning`, o sea
que sólo se lee en la consola del SQL Editor mientras el dueño aplica el script y
nunca llega a una pantalla. Se lista, no se copia a `10014` — corregir historia
aplicada por un texto que nadie veía sería exactamente el error que esta tarea
viene a eliminar.

**Control positivo:** una prueba afirma que las redes pescan (`tenés`, `Probá`,
`Subí`, `aprobá`, `sos`) y que no pescan lo que se parece (`podrás`, `marcas`,
`Andrés`, `está`, `acá`, `Bogotá`). Un guard que siempre devuelve limpio es peor
que no tenerlo: da permiso tácito.

**Segunda ronda, abierta por el propio guard.** Cuando `IMPERATIVO_AR` entró, el
barrido devolvió 7 hallazgos en vez de 0: 5 cadenas reales que la primera lista
no veía (`dailyChallenge.ts:50`, `OrbShell.tsx:525`, `useGemeloActivation.ts:415`,
`analizar-cv/index.ts:223` y `:489`), `Bogotá` como falso positivo y el `raise
warning` de `10011`. Las 5 pasaron al tú neutro; `Bogotá` entró a la lista de
excepciones neutras; `reconocé` entró a la lista `-é/-í` porque es homógrafo del
pretérito y ninguna red general lo puede separar. Esta es la segunda vez en el
loop que un guard enumerativo se cree completo y una red morfológica lo desmiente:
la lección va en el guard, no en el comentario del commit.

**Medición.**

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | limpio |
| `npm run lint` | limpio |
| `npx vitest --run` | **45 archivos · 597 pruebas verdes** (594 → 597: +3 del guard de voz). Medido **después** de la segunda ronda, no antes |
| `npx vitest --run src/theme/contratoAsistente.test.ts` | 9 pruebas verdes: el barrido devuelve `[]` sobre 292 archivos |
| App corriendo (medida DOM, no captura) | `document.body.innerText` = 328 caracteres, **0** tokens voseantes; el chip de la portada lee `ANÁLISIS DE MUESTRA · SIN IA CONECTADA` |
| Módulos servidos por Vite (fetch en vivo) | `ConvalidaOmicron`, `dailyChallenge`, `proactive`, `useIdleEscalation`, `abrirBrechas`: 0 hallazgos; `redViva`: sólo `estás`, que es tú, no vos |

**Lo que NO quedó probado.**

- 10014 no se ejecutó: va al portapapeles del dueño y a su SQL Editor. Hasta ese
  click, la base viva sigue respondiendo `Solo podés guardar tus propios análisis.`
  Aunque el repositorio ya no tenga esa frase en ninguna parte.
- Los 15 despliegues de Edge Function con `withCors` siguen pendientes (y ahora
  `analizar-cv` trae el texto neutro, así que su despliegue cuenta dos).
- El `acá` que queda en el **mapa donante** (`MapaCapacidades`: "Cada paso queda
  acá, con su fecha") no se tocó: el mapa es port 1:1 y sus propios tests afirman
  esa cadena. Es la única isla regional que queda, deliberada.
- El `acá`/`vos`/`sos` de los comentarios de código tampoco se barrieron: no
  llegan a la pantalla y el guard los excluye a propósito.
- La captura de pantalla sigue imposible (Browser embebido con
  `visibilityState: hidden` y 0 rAF/s): la verificación es DOM, no píxel.

**Descubierto camino a #60 (no se arregló acá):** el sistema llama "skill" a lo
mismo que llama "habilidad" (`Descubre skills`, `Valida una skill`, `Skill
Genome`, `Examen en MaxSkill`). Es la misma grieta de dos voces pero en el
léxico, no en la persona gramatical, y merece su propia tarea con su propio
guard: un concepto, una palabra.

## 2026-11-02 · Tarea #61 · Léxico: un concepto, una palabra

**Qué se descubrió.** #60 cerró la persona gramatical y dejó al descubierto la
otra grieta: la misma cosa tenía tres nombres. La unidad de capacidad se llamaba
`habilidad` en la barra de navegación y en la ficha, `skill` en los chips de
invitación y en el header (`Descubre skills`, `Valida una skill`, `Skill
Genome`), y `competencia` en las credenciales y en la pestaña del Gemelo
(`Nivel de Competencias`, `COMPETENCIAS VALIDADAS`, `competencias · años XP`). La
prueba que la valida se llamaba `examen` en Habilidades y `quiz` en Academia
(`RENDIR QUIZ FINAL`, `aprueba su quiz`). Tres nombres para un objeto son tres
oportunidades de que el usuario crea que son tres objetos, y dos nombres para la
misma acción rompen la promesa de "cero repetición" por el lado del texto.

**El fallo de diseño que lo causó.** El sistema de detección de habilidades se
bautizó "MaxSkill" primero; después llegaron la Academia con su "quiz" y la
credencial con su "competencias", cada una nombrando desde su propio origen y
nadie nombrando desde el usuario. La barra de navegación ya había resuelto el
asunto —el chip dice **Habilidades**— y ninguna hoja nueva la consultó.

**El fallo que lo agrava.** Los prompts del motor decían `skills` y
`competencias` en su prosa en español. Un modelo responde con el vocabulario que
le dan: el oráculo devolvía "tu skill" porque el sistema que lo guía se lo pedía
así. Aquí el léxico no era cosmética: era la salida.

**La vara elegida.** Tres palabras canónicas y ninguna más:

| Concepto | Palabra | Prohibido en texto que se lee |
|---|---|---|
| unidad de capacidad | **habilidad** | `skill`, `skills`, `competencia`, `expertise`, `XP` |
| la prueba que la valida | **examen** | `quiz`, `quizzes` |
| lo que falta aprender | **brecha** | `gap`, `gaps` |

No se eligió por gusto: `habilidad` ya ganaba por goleo en la capa visible, era
la palabra de la barra, y la tabla real se llama `brechas_aprendizaje`. `XP`
salió porque "años XP" medía experiencia con la unidad de un videojuego en una
app que se presenta como laboratorio.

**Dónde estaba (las cuatro capas).** 22 hallazgos en la primera corrida del
barrido, sobre 292 archivos:

| Capa | Archivos | Qué |
|---|---|---|
| Cliente | 14 (OrbShell, brain, MaxSkillTab, dailyChallenge, JourneyProgress, CredencialModal, GemeloTab, VerifyCredential, UniversalSimulator, GemeloReveal, AcademiaTab, useBroadcastAchievement, cvAnalyzer, gemini) | `Skill Genome` → `Genoma de habilidades`, `años XP` → `años de experiencia`, `Nivel de Competencias` → `Nivel de habilidades`, `RENDIR QUIZ FINAL` → `RENDIR EXAMEN FINAL`, `certificó una skill` → `una habilidad` |
| Edge Functions | 8 (chat-assist, examen-ia, market-match, tutor, vault-oracle, simulador-universal, analizar-cv, carta-ia) | prosa de los prompts al tú del producto; `NODO/COMPETENCIA` → `NODO/HABILIDAD`, `Carta de Competencias` → `Carta de Habilidades`, `refuercen sus gaps` → `complementen las que le faltan` |
| Base | `10014` (aún sin aplicar) | la descripción que el mapa muestra al expandir un nodo declarado: `Competencia profesional declarada…` → `Habilidad profesional declarada…` |
| Historial | `0062`, `0072`, `0077`, `10002` | migraciones aplicadas: se listan, no se reescriben |

**Lo que NO se tocó, y por qué es distinto.** Un literal no es prosa porque esté
entre comillas. La columna `skills_detail`, el canal `omicron-live`, el evento
`omicron:probar-skill`, el estado `'quiz'` de la Academia y las claves del JSON
que el parser del motor lee (`"skills":[]`, `skillsDetail`) son nombres de
máquina: cambiarlos no unifica el idioma del producto, rompe el contrato. Por
eso la exención se paga con **coordenada exacta** (`gemini.ts:36`,
`analizar-cv/index.ts:382`, `notify-matches/index.ts:49`) y no con carpeta: un
archivo exento sería un agujero donde esconder copy de pantalla. La prueba
además exige que esas tres líneas sigan nombrando un campo —si envejecen, el
guard las devuelve al barrido.

**El guard (afirmaciones 10, 11 y 12).** No barre líneas: barre **literales y
texto JSX** extraídos con un parser de comillas de tres caracteres, y eso es lo
que lo hace distinto de la vara de voz, que sí barría la línea entera.

- Las interpolaciones se **excisan**, no se reemplazan por espacio. La primera
  versión las borraba con `' '` y `id: \`skill-${i}\`` se volvía "skill-" con un
  espacio: un prefijo de identificador disfrazado de frase de dos palabras.
- Un token suelto en minúscula se ignora (`'quiz'`, `'maxskill'`, `'level_up'`):
  así nombran las cosas el código. Un token suelto con mayúscula **sí** cuenta
  (`'Competencias'`, `'Quiz final'`): así nombran las cosas las etiquetas. Es la
  distinción entre lo que ve el compilador y lo que ve la persona, y cabe en una
  línea.
- El texto entre etiquetas JSX se barre sin esa regla: un hijo de JSX se imprime
  tal cual, no puede ser un identificador.
- Se excluye lo estructural reconocible: JSON que empieza con `{`, rutas de
  import, snake_case de columnas, y valores de CSS (`px`, `solid`, `gradient`,
  `rgba(`, `var(`).
- Control positivo con las formas exactas que salieron del inventario y control
  negativo sobre las que se parecen (`examenSkill`, `'skill_tree_nodes'`,
  `useState<'list'|'course'|'quiz'>`, el esquema JSON). Sin el negativo, el día
  que alguien renombra una columna el guard trabaja contra el cambio correcto.
- `DEUDA_LEXICO` (4 migraciones aplicadas) se autovalida: cada una tiene que
  seguir teniendo el sinónimo que justifica listarla, sólo puede vivir en
  `migrations/` y `10014` no puede deber nada.
- La regla de la mayúscula se escribió para cubrir un caso que la lista de
  sinónimos no cubría: la vara de voz dejó `archivos:línea` en el reporte, la de
  léxico dejó además el fragmento en el debug, y fue ese debug el que mostró que
  `skill- -` era un prefijo de id y no una frase.

**Por qué 0077 y 0072 pueden quedarse en el historial.** `0077` escribe
`reputation_history.reason` y `getReputationHistory()` no tiene ningún llamador
en `src/`; `0072` arma la razón legible de un ranking de ofertas que el cliente
ya no consulta (fase 6 lo recortó); `0062` es un `comment on column` que sólo
lee quien está en el SQL Editor. Ninguno llega a una pantalla hoy. Si una
pantalla empieza a leer esas filas, la deuda deja de ser inocua y el fix es una
migración nueva, no editar la vieja.

**Medición.**

| Prueba | Resultado |
|---|---|
| `npx vitest --run src/theme/contratoAsistente.test.ts` | **12 pruebas verdes** (9 → 12: +3 de léxico) |
| `npx vitest --run` | **45 archivos · 600 pruebas verdes** (597 → 600). Ninguna prueba de comportamiento cayó: ningún test afirmaba el texto viejo, o sea que el léxico tampoco estaba atado por contrato en los tests |
| `npm run typecheck` | limpio |
| `npm run lint` | limpio |
| App corriendo (medida DOM) | `document.body.innerText` = 328 caracteres, **0** palabras del inventario prohibido; chips del onboarding sin desborde (`Habilidad dura` 103px, `Habilidad blanda` 115px, `Conocimiento` 99px, `Credencial` 80px sobre viewport de 485px) |
| Barrido de literales | 22 hallazgos → 0 tras el segundo lote; 3 exenciones con coordenada y 4 migraciones en ratchet |

**Documentado.** `DESIGN.md` pasó de siete a nueve reglas del estándar asistente:
la 8 fija el tú neutro (con las tres palabras que se parecen y no son vos) y la
9 fija habilidad / examen / brecha con su lista de prohibidos y la cláusula de
campo de máquina. El bullet "El contrato se vela solo" nombra las dos varas
nuevas.

**Lo que NO quedó probado.**

- `10014` cambió de contenido con esta tarea (la descripción del nodo) y **volvió
  al portapapeles**: hay que pegar la versión nueva, no la de #60. Sigue sin
  ejecutarse hasta el click del dueño.
- Los despliegues de Edge Function siguen pendientes; ver el bloque de abajo: la
  lista real es **3 funciones**, no 15.
- Las etiquetas de invitación que se alargaron (`Descubre skills` → `Descubre
  habilidades`, `Valida expertise` → `Valida una habilidad`) no se pintaron en la
  medición: en el estado guest que alcanza el navegador oculto gana el overlay
  de onboarding y el mapa no llega a montar los nodos. Caben —20 caracteres
  contra el tope de 22 que el propio OrbShell aplica a los nodos de habilidad—
  pero es un cálculo, no una captura.
- La captura sigue imposible (`visibilityState: hidden`, 0 rAF/s): verificación
  DOM y números, no píxeles.
- Los sinónimos que el **usuario** puede escribir siguen siendo todos válidos:
  el intents de OrbOnboarding prueba `/validar|demostrar|certificar|skill|
  competencia|examen/` a propósito. Unificar la salida no es corregir el input
  de nadie.

**Descubierto camino a #61 (no se arregló acá):** `seniorLabel`, `junior`,
`semi-senior` y `expertise` en el Dossier (0062) son anglicismos de nivel, no
sinónimos de un concepto propio —el mercado chileno habla de "junior/senior" y
renombrarlos sería menos claro, no más. Se decide aparte, con la pregunta de
producto correcta: ¿le suman o le restan a una persona que no es de tecnología?

## 2026-11-02 · Cierre de #61 · El despliegue pendiente se mide, no se supone

**Por qué se abrió.** La deuda que veníamos enunciando era "15 despliegues de Edge
Function con `withCors`", y #61 la agrandó a "8 funciones cambiaron texto". Nadie
había medido cuántas de esas las llama la app. Un número que no se mide se
convierte en una montaña que el dueño tiene que creer.

**Medición (grep de `src/`, excluyendo tests).**

| Llamada | Dónde | ¿Cambia con esta unificación? |
|---|---|---|
| `analizar-cv` | `fetch(.../functions/v1/analizar-cv)` en `features/gemelo/services/aprendizaje.ts:137` | **Sí** — voz neutra (2 avisos) y prompt con `habilidades` |
| `simulador-universal` | `functions.invoke` ×3 en `academia/components/UniversalSimulator.tsx:94,121,136` | **Sí** — prompt: `NODO/HABILIDAD`, `se aplica esta habilidad` |
| `credential` | `RedSocial.tsx:102`, `VerifyCredential.tsx:22` | Sólo `withCors` (3 líneas, cero texto) |
| `proxy-tts` | `omicron/services/voice.ts:105`, `infrastructure/voice/voiceAI.ts:133` | No está modificada |
| `proxy-ai` | `infrastructure/ai/client.ts:50` (+4 refs) | No está modificada |

Y las otras seis que reescribimos —`carta-ia`, `chat-assist`, `examen-ia`,
`market-match`, `tutor`, `vault-oracle`— **no tienen ningún llamador en `src/`**:
`grep -rn "invoke('tutor'"` y sus hermanas devuelven vacío. Estaban dentro de las
16 funciones modificadas por el arreglo de CORS, pero la app no las invoca.

**Lo que esto cambia.**

- La montaña son **2 clicks de despliegue que afectan lo que se ve** (`analizar-cv`,
  `simulador-universal`) y **1 de robustez** (`credential`, que sin `withCors` no
  responde al `OPTIONS` del navegador). No son 15.
- El texto de seis funciones ya corregidas queda sin desplegar **sin costo**: nadie
  lo pide. Su despliegue es opcional y puede esperar a que exista un llamador.
- `10014` (la migración de voz) sigue siendo el click de mayor impacto: es la única
  capa que el usuario lee hoy en vivo, porque PostgREST reenvía el `raise exception`
  tal cual.

**Punteo para el dueño (el único que queda).**

1. SQL Editor → pegar el `10014` **que está en el portapapeles** (12 459 caracteres;
   la versión de #60 ya es vieja).
2. Supabase → Functions → desplegar `analizar-cv`.
3. Supabase → Functions → desplegar `simulador-universal`.
4. (Opcional, mismo rito) desplegar `credential`.

Nada de esto se ejecuta solo ni se verificó desde acá: requiere su sesión.

## 2026-11-02 · Tarea #62 · Tipografía de estados: el aviso de carga se escribe con un carácter

**Qué se pidió.** Cerrando #61 se pasó la misma vara morfológica sobre otros
anglicismos del texto visible (`match`, `gap`, `streak`, `feedback`, `onboarding`,
`dashboard`, `hard skills`…). El resultado fue flaco y por eso es creíble: **un
solo hallazgo**. Todo lo demás que pescaron las redes era nombre de archivo, import
o propiedad CSS. La contaminación del léxico era exactamente `skill` / `competencia`
/ `quiz` / `expertise` / `XP`, y ya está barrida.

**El hallazgo y su arreglo.** `PushPermissionBanner` prometía «empleos nuevos con
**match** alto». Es la misma puerta de entrada que el guard de #61 no cubría: el
anglicismo no nombra un concepto propio de Ómicrom, nombra el score de una función
que el usuario no ve. Queda: «empleos nuevos que calzan con tu perfil». La función
`market-match` sigue llamándose así adentro: es un nombre de despliegue, no una
frase.

**El segundo hallazgo, abierto por casualidad y verificado.** Al barrer glifos sueltos
apareció una tipografía doble dentro de la misma familia de avisos: **52 mensajes ya
usaban `…` y 16 seguían tecleando `...`**. No es cosmética de manual: los tres puntos
son tres glifos con ancho propio, y caen justo en las etiquetas monoespaciadas del
Gemelo (`VERIFICANDO FIRMA...`, `CARGANDO CREDENCIAL...`, `ANALIZANDO TU PERFIL...`),
donde el remate se veía suelto al lado del texto. Es la regla 2 del estándar («Habla,
no etiqueta») escrita dos veces en dos caracteres distintos.

**Cómo quedó.** Barrido con `perl -CSD -Mutf8` sobre 11 archivos, patrón
`\p{L}\.{3}(?=["'\`\s<])` — la letra antes y el cierre de comilla/tag después son lo
que separa un aviso de un `...form` (spread). Los 16 sitios pasaron a `…`; ningún
spread, import o ruta resultó tocado (se revisó el `git diff -U0` línea por línea).
Ningún test afirmaba el texto viejo.

| Capa | Remates | Ejemplo |
|---|---|---|
| Portada y auth | 3 | `Conectando a la Red Ómicrom…` · `Procesando…` · `Guardando…` |
| Academia | 8 | `El tutor está pensando…` · `ANALIZANDO TU PERFIL…` · `Evaluando tu desempeño con IA…` · placeholder `Escribe tu duda…` |
| Gemelo | 4 | `VERIFICANDO FIRMA…` · `CARGANDO CREDENCIAL…` · `Firmando…` · `Detectando identidad…` |
| Aprendizaje y push | 2 | placeholder `…empresas donde trabajaste…` · `Activando…` |

Dieciséis líneas, diecisiete remates: una (`UniversalSimulator:200`) llevaba los dos
estados del simulador en la misma frase con ternario.

**La vara (afirmación 13 de `contratoAsistente.test.ts`).** Reutiliza la máquina de
#61: literales y texto JSX extraídos con `trozosVisibles()`, comentarios fuera,
`esCodigo()` como filtro. `SUSPENSIVO = /\p{L}\.{2,}/u` — dos puntos también cuentan,
`Cargando..` es la misma fuga en chico. Barrida **sólo el cliente** (`src/`), no los
tres lados como voz y léxico: un `console.log` de una Edge Function nunca llega a una
pantalla y ahí queda uno (`sync-jobs`). El archivo pasa de doce a **trece pruebas**;
el encabezado además existo — describía diez cuando ya había doce — así que se le
escribieron las tres que faltaban. Control positivo y negativo en la misma vara:
pesca `A...` de JSX, `o...` de un literal de botón y `a...` de un placeholder, y deja
tranquilos `{ ...a, color: uc }`, `[...t]`, `"Haz esto ahora: ..."` (espacio antes del
remate) y `placeholder="..."` (remate sin palabra). Los dos últimos son el límite
declarado de la red, no un descuido: la vara caza el aviso de carga, que es donde el
doble estilo se veía.

**Lo que NO se tocó, con motivo.** `AuthOverlay.tsx:483` deja `placeholder="..."` en
la contraseña: no es el mismo aviso escrito de dos formas, es un campo que no quiere
nombrarse a sí mismo, y la pantalla de auth es la que él eligió mirando. Y las
etiquetas en mayúsculas de la secuencia del Gemelo (`VERIFICANDO FIRMA…`) siguen
siendo mayúsculas: son la coreografía de arranque, aprobada en pantalla; pasarlas a
minúscula es un cambio de look, no de sistema, y se pide aparte.

**Medición.**

| Prueba | Resultado |
|---|---|
| `npx vitest --run src/theme/contratoAsistente.test.ts` | **14 verdes** |
| `npm run typecheck` · `npm run lint` | limpios |
| `npx vitest --run` | 45 archivos · **602 pruebas** (600 → 602: +2 de la vara de elipsis) |
| Barrido residual en `src/` | `letra + ...` en texto visible: **0** |
| App corriendo (DOM) | `document.body.innerText` = 326 caracteres · `...`: **0** · `…`: 1 · tokens voseantes: **0** |
| Módulos servidos por Vite (11 archivos) | todos HTTP 200 con JS real · `letra…` servido: **22** · `letra...`: **0** |

**Hallazgo nuevo, anotado y sin arreglar.** `src/theme/tokens.ts` llama `cyan` (y
`cyanDim`/`cyanFaint`/`cyanGhost`) al azul de info `#6aa9ff`: el valor ya no es cian
—el cian saturado está prohibido por la regla 5— pero el nombre quedó del prototipo
donante, y 97 uso lo siguen diciendo. Es exactamente la enfermedad de #61 (dos
nombres para una cosa) pero del lado del tema, invisible en pantalla. Renombrar es
mecánico y seguro; se decide aparte porque no cambia un píxel.

## 2026-11-02 · Tarea #63 · Cero repetición: el fondo de umbral deja de estar copiado en cuatro componentes

**Cómo apareció.** La métrica, no la vista. Después de #62 se volvió a correr
`scripts/design/audit-debt.mjs` y el top de valores fuera de token traía tres hex
casi-negros que se repetían `#050813` ×5, `#000003` ×5, `#02030a` ×1. Al buscarlos
salió la misma rampa radial escrita **palabra por palabra en cuatro componentes** —
`AuthOverlay:578`, `NoAccess:119`, `ResetPasswordOverlay:210`, `OrbShell:1621`— y una
quinta variante con el centro frío en `CredencialModal:31`. Regla 4 del estándar:
dos archivos que dibujan lo mismo se suben a la biblioteca o a un token. La regla
existía; la rampa se había salvado porque el guard de L1 miraba vidrios de blanco y
el `const C = {}` espejo, no degradados.

**Cómo quedó.** `src/theme/tokens.ts` gana `UMBRAL` con dos llaves y una línea de
motivo por cada una:

```ts
export const UMBRAL = {
  apertura:   `radial-gradient(130% 95% at 50% 18%, #050813 0%, ${C.onAccent} 52%, #000003 100%)`,
  credencial: 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)',
} as const;
```

Se mantienen **dos** porque son dos pantallas distintas: `apertura` usa la tinta del
ámbar en el centro (es el fondo de auth y del takeover del orbe, donde el acento manda)
y `credencial` usa el navy frío (la tarjeta imprimida se pinta sobre `CARD_NAVY`, no
sobre el ámbar). Unificarlas en una sola rampa habría sido borrar una diferencia real
para mejorar el conteo. Se sacó también el alias local `OMICRON_BG` del modal: un
componente no vuelve a nombrar lo que el tema ya nombra.

**Cero píxeles movidos, probado con igualdad literal.** La prueba 14 del contrato
afirma `UMBRAL.apertura === 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #1a1408 52%, #000003 100%)'`
y lo mismo con `credencial`: la subida al tema es un movimiento de código, no de
look, y si alguien toca un stop se queja la máquina antes que el ojo. No se pudo
verificar en pantalla porque esas dos capas (auth y takeover) sólo montan con sesión
activa o durante el arranque del análisis, y **la sesión del dueño no se toca**.

**La vara nueva (afirmación 14, 15 pruebas).** Barriendo `src/` con la firma
geométrica de la rampa —construida con `new RegExp`, no escrita literal, porque este
archivo también se barre— y exigiendo que ningún archivo fuera de `theme/` la
contenga. Además el dueño existe: `tokens.ts` tiene que seguir declaring `UMBRAL = {`
con `apertura:` y `credencial:`, porque una vara que busca ausencia en un lado y el
valor se borró del otro aprueba el repo por vacío.

**Medición.**

| Prueba | Antes | Después |
|---|---|---|
| `audit-debt.mjs` · valores fuera de token | 66 en 43 distintos · 24 archivos | **55 en 40 distintos · 22 archivos** |
| `npx vitest --run src/theme/` | 4 + 14 | 4 + **15** verdes |
| Copias de la rampa en componentes | 5 (4 idénticas + 1 variante) | **0** (dueño: `theme/tokens.ts`) |
| `npm run typecheck` · `npm run lint` | limpios | limpios |
| `npx vitest --run` | 45 · 602 | 45 · **603** |

**Lo que la métrica dejó ver y sigue abierto.** Los 55 valores que quedan no son
colores de marca: son `px` de geometría. Dos casos sí son deuda real y son los que
hay que decidir: `1.4px` escrito tres veces como `letter-spacing` de etiquetas en
`aprendizaje.css:463,494,517` (el brief pide `0.08em` para las mayúsculas — es la
misma intención con dos dueños), y `1.5px` como grosor de borde en
`aprendizaje.css:405,406` y `GemeloTab.tsx:299`. El resto son tamaños de lienzo y de
hoja (340/430/720/78/84/76/900/372px) donde un número fijo es el dibujo, no el
sistema: `design.qa.yaml` debería declararlos excepción documentada en vez de
contarlos como hallazgo.

## 2026-11-02 · Tarea #64 · LETRA: dieciocho trackings a mano se convierten en siete pasos

**Qué se pidió.** #63 cerró con la lista de lo que la métrica aún marcaba. El
`audit-debt.mjs` seguía contando 55 valores fuera de token, y el bloque más grande
no era un color ni un radio: era `letterSpacing`. El brief pide dos cosas de
tipografía —«títulos con letter-spacing negativo» y «etiquetas de sección…
letter-spacing 0.08em»— y el repo las había resuelto escribiendo un número por
pantalla. Es la regla 4 («un valor, un dueño») violada en el eje que nadie mira
porque el error no se ve: un `0.5` y un `1` a 12 px son casi el mismo aire.

**El inventario, medido antes de tocar nada.** 151 sitios con un número literal,
18 valores distintos. La distribución es el hallazgo: **47 sitios escribían `1`,
19 escribían `1.5`, 12 escribían `0.4`, 20 escribían `0.5`**. Cuatro valores
concentran el 65 % del inventario; los catorce restantes suman 53 sitios repartidos
en variantes de medio píxel. Eso no es una tipografía con 18 intenciones: es una
escala de 7 pasos que alguien estaba adivinando a mano, sitio por sitio.

| Valor viejo | Sitios | Paso | Desvío |
|---|---|---|---|
| -0.5 / -0.3 | 12 | `titulo` (-0.4) | 0.1 |
| -0.2 | 6 | `apretada` (-0.15) | 0.05 |
| 0.1 / 0.2 / 0.3 / 0.5 | 26 | `denso` (0.4) | 0.1–0.3 |
| 0.4 / 0.6 | 14 | `denso` / `medido` | 0 |
| 0.7 | 1 | `medido` (0.6) | 0.1 |
| 0.8 / 1.0 / 1.2 | 51 | `etiqueta` (1) | 0–0.2 |
| 1.4 / 1.5 / 1.6 | 27 | `ancha` (1.5) | 0–0.1 |
| 2.0 / 2.5 | 14 | `anunciada` (2) | 0 / 0.5 |

Cierre: **91 sitios exactos, 139 a 0.1 px o menos, 12 con desvío visible**. Los 12
son dos decisiones y están escritas en el comentario del dueño: el aviso del
arranque baja de 2.5 a 2 (ese medio píxel extra era aire de más, no una intención
que alguien pudiera defender), y un `0.1` escrito positivo sube a 0.4 en vez de
bajar a `-0.15`. El segundo es una regla de signo que la cercanía numérica sola no
puede tomar: un número escrito sin menos no pidió nunca que las letras se pegaran.

**Cómo se hizo.** Un codemod de un solo uso (`scratch-letra.mjs`, ejecutado y
borrado) que recorría `src/` salvo `theme/` y `features/mapa/`, mapeaba cada valor a
su paso y escribía `letterSpacing: LETRA.<paso>` agregando el import cuando hacía
falta. 36 archivos, 152 referencias. Script efímero a propósito: una conversión
que deja ruido en `lint` y vive para siempre en el repo es deuda nueva.

**Dos bugs del barrido, ambos encontrados por el trío, no por el ojo.**
1. `0.1 → LETRA.apretada` en `OrbEstadoDelDia.tsx`: el mapeo buscaba el valor más
   cercano y -0.15 está a 0.25 mientras 0.4 está a 0.3. La aritmética era correcta
   y el resultado estaba invertido. Se corrigió a mano y la regla de signo quedó
   escrita en el dueño.
2. La vara nueva tiraba `ENOENT …\src\src\App.tsx`: `caminar('src')` devuelve las
   rutas ya con `src/` delante, y yo las volvía a prefijar. El mismo error de #61
   repetido — y por eso esta vez la vara se escribe con `bajo(r)` desde el principio.

**La vara (afirmación 15 de `contratoAsistente.test.ts`).** Barrer los `.ts`/`.tsx`
fuera de `theme/` en busca de `letterSpacing:` seguido de un número, y exigir
`[]`. El dueño se verifica a sí mismo: `Object.keys(LETRA)` tiene que ser
exactamente los siete pasos declarados, para que la vara no pueda aprobar el repo
por vacío (si alguien borra la escala, `letterSpacing: 1.2` vuelve a ser legal y el
test tiene que gritar antes de que eso pase).

**La honestidad del inventario.** El comentario del dueño decía «veinte valores en
167 sitios», y DESIGN.md repetía la cifra. Ninguna de las dos estaba medida: salió
de un grep apurado que contaba también los glifos de `index.css` y el mapa. Al
verificar para este cierre, el `git diff -U0` da la respuesta real: **18 valores,
151 sitios**. Ambas frases se corrigieron con el número del diff. Vale la pena
dejarlo escrito: la misma tentación de «más o menos» que este loop persigue en el
diseño aparece en la documentación del loop.

**Medición.**

| Prueba | Antes | Después |
|---|---|---|
| `letterSpacing` numérico fuera de `theme/` y `mapa/` | 151 sitios · 18 valores | **0** · 7 pasos |
| `audit-debt.mjs` · valores fuera de token | 55 en 40 distintos · 22 archivos | **49 en 39 distintos · 19 archivos** |
| `npm run typecheck` · `npm run lint` | limpios | limpios |
| `npx vitest --run` | 45 · 603 | 45 · **604** |
| Portada servida (texto del DOM) | 326 caracteres | **326 caracteres** |
| Módulos servidos con `LETRA` | — | `OmicronChrome` 12 · `OrbShell` 6 · `CredencialModal` 15 |

La verificación visual no estaba disponible (el navegador embebido sigue con
`visibilityState: hidden` y 0 rAF/s), así que se cerró con la vara fuerte: si el
texto del DOM mide lo mismo y ningún número cambió de valor más allá de lo declarado
en la tabla, el barrido es una reescritura con dueño, no un rediseño.

**Lo que queda abierto, medido y sin fingir.** El tracking de la capa CSS sigue
fuera: `letter-spacing: 1.4px` tres veces en `aprendizaje.css:463,494,517`,
`0.4px` cuatro veces y `0.08em` una. La vara de #64 barre `.ts`/`.tsx` porque ése es
el idioma donde el contrato vive; llevarla a CSS es un test distinto (y el brief
dice `0.08em`, que a 12 px son 0.96 px ≈ `etiqueta`: el `1.4px` es la misma
intención con dos dueños, otra vez). Y los `1.5px` de grosor de borde esperan su
decisión en `design.qa.yaml`, no un token.

## 2026-11-02 · Tarea #65 · CSS: la hoja de etiquetas también pide la escala LETRA

**Qué se pidió.** #64 cerró con una deuda explícita: la vara barría `.ts`/`.tsx` y
dejaba afuera la otra mitad del mismo idioma. El tracking de las etiquetas de
sección estaba escrito **nueve veces más** en `aprendizaje.css`, y dos de esos
valores (`1.4px`, `-0.3px`) eran exactamente los que el barrido del cliente ya había
resuelto con `ancha` y `titulo`. O sea: la misma palabra, dos dueños, y el contrato
no lo veía.

**El inventario.** 9 sitios fuera del mapa —`0.4px` ×4, `1.4px` ×3, `0.08em` ×1,
`-0.3px` ×1—. El mapa tiene tres (`-0.01em`, `0.06em`, `0.14em`) y no se le pide
cuenta: es port 1:1 con su propia escala. Los nueve sitios viven en ocho selectores:
`aprendizaje-titulo`, `aprendizaje-badge`, `siguiente-etiqueta`, `cola-titulo b`,
`cola-badge`, `cola-severidad` (+ su `i`), `cola-label` y `cola-aprender dt`.

| Sitio | Antes | Después (calculado) | Δ |
|---|---|---|---|
| `.aprendizaje-titulo` (17px) | -0.3px | `var(--letra-titulo)` → **-0.4px** | 0.1 |
| `.aprendizaje-badge`, `.cola-badge`, `.cola-titulo b`, `.cola-severidad i` | 0.4px | `var(--letra-denso)` → **0.4px** | 0 |
| `.cola-severidad`, `.cola-label`, `.cola-aprender dt` | 1.4px | `var(--letra-ancha)` → **1.5px** | 0.1 |
| `.siguiente-etiqueta` (11px) | 0.08em = 0.88px | `var(--letra-etiqueta)` → **1px** | 0.12 |

El `0.08em` es el único que merece párrafo, porque es el brief citándose a sí mismo:
la regla dice «etiquetas de sección en mayúsculas, 12-13px, letter-spacing 0.08em».
A 12 px, 0.08em son 0.96 px — que es `etiqueta` con dos decimales de redondeo. El
selector que estaba escrito en `em` vive a 11 px, así que su valor real era 0.88 px y
ahora es 1 px: la misma intención, 0.12 px más de aire. Se pasó a la escala porque
dejar `0.08em` suelto habría conservado la segunda dueña, que es lo que este loop
viene a matar.

**Cómo se hizo.** `src/index.css` declara el espejo: siete variables `--letra-*` con
los mismos siete números de `LETRA`. Un `var()` no puede entrar en un style en línea
de React y un número de TS no puede entrar en una hoja, así que la escala se escribe
dos veces por necesidad del idioma — y eso es justamente lo que obliga a velar que
las dos veces digan lo mismo.

**La vara (afirmación 15, ahora en los dos idiomas).** La red se sacó del test a una
función `trackingsSueltos(texto)` que pesca `letterSpacing: 1.2` y
`letter-spacing: 1.4px|0.08em` con la misma expresión, y se le agregó una prueba de
control (mismo criterio de #61/#62: una vara sin control no se sabe si mide). La
afirmación ahora verifica tres cosas: ningún número suelto fuera de `theme/`, los
siete pasos declarados en TS, y que los siete `--letra-*` de `index.css` tengan los
mismos nombres **y los mismos números** — `expect(LETRA[paso]).toBe(valor)` por paso.
Si alguien mueve `ancha` a 1.6 en la hoja y no en el tema, el test se prende.

**El bug del control, y por qué es el más caro de la tarea.**
`for (const [paso, valor] of espejo)` sobre un arreglo de `RegExpMatchArray` no da los
grupos 1 y 2: el índice 0 es el match completo, así que `paso` era
`'--letra-apretada: -0.15px;'` y la comparación daba `undefined`. El test falló con
`Expected: NaN / Received: undefined` en vez de aprobarse por vacío — que es el modo
en que una vara mal escrita se vuelve decoración. Se corrigió mapeando a tuplas
`[m[1], parseFloat(m[2])]` antes de desestructurar.

**Medición.**

| Prueba | Antes | Después |
|---|---|---|
| `letter-spacing` numérico fuera de `theme/` y `mapa/` | 9 sitios | **0** |
| `audit-debt.mjs` · valores fuera de token | 49 en 39 distintos · 19 archivos | **45 en 37 distintos · 19 archivos** |
| `npx vitest --run` | 45 · 604 | 45 · **605** |
| Pruebas del contrato asistente | 16 | **17** (quince afirmaciones + controles) |
| `npm run typecheck` · `npm run lint` | limpios | limpios |
| Selectores servidos | — | 9 de 9 con `var(--letra-` |

**Verificación sin capturas.** El navegador embebido sigue oculto
(`visibilityState: hidden`, 0 rAF/s), pero `getComputedStyle` no depende del
viewport: se trajo `aprendizaje.css?direct` del dev server, se montó en un `<style>`
temporal y se midieron los seis selectores con sondas sueltas que se borraron después.
La tabla de arriba es esa medición, no una promesa. El app del usuario no se tocó: ni
pestaña, ni sesión, ni clic.

**Lo que queda, medido.** Los 45 valores que siguen en la métrica son geometría de
lienzo (340/430/720px) y los `1.5px` de grosor de borde que ya estaban anotados en
#63. Ninguno es tipografía ni color de marca. La decisión que falta no es un token
sino un permiso: `design.qa.yaml` tiene que declararlos excepción documentada para
que la métrica deje de contarlos y vuelva a ser una señal que se lee.

## 2026-11-02 · Tarea #66 · Color: los últimos diez valores huérfanos piden el tema, y la métrica aprende a leer su permiso

**Qué se pidió.** #65 cerró diciendo «los 45 que quedan son geometría». Era falso,
y se vio en cuanto se listaron uno por uno: **trece de ellos eran colores**, y cuatro
contradicían el brief del dueño. La frase «es geometría» era el tipo de cierre que
este loop vinieron a matar: un resumen que suena razonable y perdona el trabajo.

**Qué estaba pasando en esos colores.**

| Hallazgo | Dónde | Estaba escrito | Pide |
|---|---|---|---|
| El rojo del toast de error | `Toast.tsx:14` | `#ff5066` | `C.red` = **#f87171, el del brief** |
| El vidrio del brillo de la credencial | `CredencialModal.tsx:346` (×2) | `rgba(255,255,255,0.10)` | `tint(C.white, 10)` |
| El turquesa del botón «Generar Pasaporte» | `RedSocial.tsx:203` | `rgba(63,208,201,.12)` | `C.greenFaint` |
| La placa del avatar | `RedSocial.tsx:330` | `#0a1120` | `C.noche` |
| El degradado de la tarjeta | `RedSocial.tsx:56` | `rgba(22,34,58,.98), rgba(10,17,32,.99)` | `C.nocheClara`, `C.noche` |
| La página de verificación | `VerifyCredential.tsx:37` | `#061024` | `C.noche` |
| La sombra de la tarjeta | `RedSocial.tsx:57` | `rgba(0,0,0,0.6)` | `C.scrim` (VerifyCredential ya la pedía) |
| El texto del ErrorBoundary | `ErrorBoundary.tsx:81,96` | `#9fb3cc` y `rgba(159,179,204,0.5)` — el MISMO color en dos ortografías | `C.mut` y `tint(C.mut, 50)` |
| La X de instalar | `InstallPWA.tsx:107` | `rgba(234,242,255,0.5)` | `tint(C.ink, 50)` |
| El halo de la racha | `StreakBanner.tsx:69` | `rgba(255,100,50,0.6)` = `C.flame` escrito en rgb | `tint(C.flame, 60)` |
| El desvanecido del takeover | `OrbShell.tsx:1416` | `rgba(0,2,6,0.98)` | `tint(C.black, 98)` |

Dos de ellos son del tipo que importa, no del tipo cosmético. **`#ff5066`**: el
`COLOR` de los toast definía el rojo de error con un hex que no es el semántico del
brief, así que todo fallo del sistema se anunciaba en un color que el sistema no
reconoce. **`rgba(63,208,201,…)`**: un turquesa de la paleta del prototipo donante
sobrevivió justo donde el guard de cianes no mira, porque el guard busca `#5cc8ff` y
`#00f5ff`, no un pariente lejado en hueco. Un color viejo no se va porque lo dejen
de nombrar; se va cuando lo reemplaza un token.

**El vidrio tenía un agujero.** La vara 3 (`el vidrio se pide al tema`) barría
`rgba(255,255,255,0.0[0-9])`. El brillo de la credencial estaba escrito con alfa
`0.10` —un décimo más abierto— y pasaba de largo. La red ahora es
`rgba\(\s*255\s*,\s*255\s*,\s*255\s*,` sin grado: el alfa no decide si es deuda,
decide cuánto vidrio. Ningún archivo fuera de `theme/` y `index.css` quedó tocado por
el ensanchamiento (se verificó antes: la única coincidencia era la hoja de
variables, autorizada).

**Nuevos dueños.** `C.noche` (`#0a1120`) y `C.nocheClara` (`#16223a`): la credencial
se pinta sobre azul-noche, no sobre el fondo neutro del sistema, y eso existía en
cuatro ortografías. `ANCHO.bolsillo` (430): la barra de conexión y la hoja del modal
eran el mismo ancho escrito dos veces —una en style en línea, otra como
`max-w-[430px]` arbitrario de Tailwind, que es la única deuda de Tailwind que quedaba
en el sistema (el modal la heredó de antes; ahora es `style={{ maxWidth:
ANCHO.bolsillo }}`). Y `theme/layout.ts`, que se había quedado con tres
`letterSpacing: -0.1` propios adentro del tema, ahora pide `LETRA.apretada`.

**La métrica y el permiso vivían en dos lugares.** `audit-debt.mjs` recibía
`--config design.qa.yaml` **y nunca abría el archivo**: las rutas perdonadas estaban
duplicadas —lista de regex en el script, lista de entradas en el yaml—, así que
agregar una excepción al yaml no cambiaba nada. Ahora el yaml es la fuente, el script
traduce glob a red, y **si el bloque `code.exclude` no aparece, el script sale con 2**
en vez de informar «cero deuda»: una métrica que no encontró su permiso no tiene
derecho a absolverte. Tres correcciones de la propia métrica, todas falsos positivos
que estaban tapando señal:

1. `rgba(0,0,0,α)` cuenta como profundidad, no como deuda — DESIGN.md lo dice con una
   frase y la métrica le creía a medias.
2. El interior de un comentario de varias líneas se barría como código: el
   invariante de dos columnas de `aprendizaje.css` dice «desde 900px» en una nota y
   ese 900px aparecía como deuda. Se vacían los comentarios conservando los saltos.
3. `rgba(${r},${g},${b},${a})` es una plantilla, no un valor.

Y un bug del permiso nuevo: `acceptedValues` no alcanzaba a los tipos numéricos
(`typography-drift`, `non-token-radius`), que sólo consultaban los números de
`theme/`. El glifo de 6.5px del lienzo RedViva no se perdonaba aunque estuviera
listado. Se corrigió la condición.

**El error que casi cuesta caro.** El barrido de los diez colores se hizo con `perl
-i -pe` entre comillas dobles de bash, y el reemplazo contenía `${C.noche}`. Perl
interpreta `${…}` dentro de la sustitución: tres líneas quedaron con el color
**borrado** (`linear-gradient(165deg, , )`, `0 20px 60px `, `50% 0%, ,`). Ningún test
lo habría agarrado —el `borderRadius` seguía intacto— y lo detecté leyendo las líneas de
vuelta después del barrido, que es la regla que ya estaba escrita en este ledger y
que esta vez se aplicó a tiempo. Se repararon con ediciones literales, y el resto del
barrido se hizo con el mismo criterio.

**Medición.**

| Prueba | Antes | Después |
|---|---|---|
| `audit-debt.mjs` · valores fuera de sistema | 45 en 39 distintos · 19 archivos | **0 en 0 · 0 archivos** |
| — descomposición | 45 → 26 (los 10 colores + las 3 correcciones de la métrica) → 0 (20 excepciones declaradas) | |
| Colores del brief contradichos en componentes | 4 (rojo de error, turquesa, plateado, alfa de blanco) | **0** |
| Ortografías del azul-noche | 4 | **1 dueño** (`C.noche`, `C.nocheClara`) |
| Pruebas del contrato asistente | 17 | 17 (la vara 3 ensanchada, no nueva) |
| `npm run typecheck` · `npm run lint` | limpios | limpios |
| `npx vitest --run` | 45 · 605 | 45 · **605** |

**Cero no quiere decir vacío.** Cero quiere decir: nada fuera del sistema, y veinte
números adentro con su nombre, su archivo y una línea que explica por qué no son
tokenizables (un `@container` y una media query no leen `var()`; un radio de órbita
es el dibujo). Si alguien borra una de esas veinte líneas, su valor vuelve al reporte
solo.

**Lo visible, para que lo decidas vos.** Dos cambios se ven en pantalla, y ambos
vienen de una contradicción con el brief, no de un capricho: el toast de error pasa
de `#ff5066` a `#f87171` (el rojo que el brief nombra), y la página de verificación
de la credencial arranca en `#0a1120` en vez de `#061024` (8 pasos de azul, casi
indistinguibles). Todo lo demás se movió 0.15 px o menos. Si el rojo de error viejo
te gustaba, se revierte en una línea en `Toast.tsx:14`.

**Lo que dejó la métrica, abierto.** Los radios de halo están escritos cinco veces
sin escala: `0 0 16px`, `0 0 15px`, `0 0 18px`, `0 0 24px`, `0 0 72px`. `--glow-omi`
existe y vale 16, así que hay un dueño para el color del halo pero no para su
apertura. Ese es el siguiente #67: una escala de halos, o declarar que el halo es
geometría de escena y perdonarlo con nombre.

## 2026-11-02 · Tarea #67 · Luz: dos fenómenos ópticos que nadie había separado

La hipótesis de cierre de #66 («cinco radios huérfanos») era corta. Al medir, la
luz de la app resultó ser **dos sistemas distintos escritos como si fueran uno**:

- **HALO** — la luz que una superficie **emite** (`box-shadow: 0 0 Npx color`).
  **126 sitios en 21 radios**: 0, 1, 3, 4, 5, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20,
  22, 24, 26, 30, 40, 72 px. Ninguno era una decisión; eran el 16 de al lado
  recalculado a ojo, y un 18 y un 14 compitiendo en la misma pantalla.
- **BLUR** — la luz que **atraviesa** una superficie (`backdrop-filter: blur(Npx)`).
  **44 sitios en 7 radios**: 6, 8, 12, 14, 16, 18, 20 px.

Siete pasos y cuatro pasos sobre la grilla de 4 px, con un criterio de desempate
declarado: **hacia arriba**. Para el halo, porque una luz que se achica deja de
contar estado y el brief prohíbe que un estado sea sólo color; para el vidrio,
porque más escarcha sigue siendo vidrio y menos escarcha ya es otra superficie.

| Dueño nuevo | Pasos |
|---|---|
| `HALO` (`theme/shadows.ts`) | chispa 4 · ascua 8 · foco 12 · **marca 16** · resplandor 24 · difusion 40 · escena 72 |
| `BLUR` (`theme/layout.ts`) | vaho 8 · escarcha 12 · **cristal 16** · esmeril 20 |
| `VELO` (`theme/layout.ts`) | apenas 1.5 · nitido 0 — **excepción con nombre**, no olvido |
| `--halo-*` / `--vidrio-*` (`index.css`) | el espejo para las hojas, verificado contra los dueños |

`VELO` es el caso que prueba que la escala no es un embudo: el velo de lectura de
`useProgressiveBlur` (el contenido todavía no visitado aparece levemente tapado)
subido a `BLUR.vaho` (8 px) **ocultaría texto en vez de insinuarlo**. 1.5 px no es
vidrio ni es luz; es una tercera cosa, y se queda con su nombre.

### El defecto vivo que sólo aparece al construir la escala

El token viejo era `BLUR = { sm: '8px', md: '16px', lg: '24px' }` y los tres sitios
que lo usaban hacían `backdropFilter: BLUR.md`. El navegador recibía
`backdrop-filter: 16px`, una declaración **inválida que descarta en silencio**: el
vidrio de la barra, del header y de las tarjetas **nunca se desenfocó**. Nadie lo
veía porque el resultado es una superficie que se ve «más o menos» de vidrio y el
fondo del laboratorio es casi negro. Se midió en la app corriendo, no se supuso:

- Antes: `getComputedStyle(topbar).backdropFilter` → `none` con un style que decía
  `16px`.
- Después: `blur(16px)` en el `HEADER` y `blur(20px)` en el panel; **0 elementos**
  con un `backdrop` declarado y computado `none`.

Y un segundo defecto de la misma familia: `sm` y `lg` no los usaba nadie, y el
`24px` de `lg` no aparecía en ninguna hoja. Dos errores juntos —valores con unidad
suelta y pasos muertos—, y la escala los expulsó.

### Los cuatro errores del barrido, y cómo se atraparon

Un codemod numérico sobre CSS/inline-styles es una máquina de producir falsos
positivos. Estos cuatro ocurrieron; los cuatro se detectaron antes de dejarlos
pasar, y los cuatro terminaron convertidos en partes de la vara:

1. **`0 0 Npx` es ambiguo de posición.** El barrido convirtió
   `margin: '0 0 14px'` en un halo, en TS y en CSS. Se vio con `diff -r src-antes
   src` sobre una copia hecha **antes** de tocar nada (la copia es el instrumento,
   no la confianza); se restauró desde la snapshot y se agregó el filtro de
   contexto de propiedad.
2. **Un anillo no es un halo.** `0 0 0 1px` es offset, offset, **ancho**, radio. La
   red casaba desde el segundo cero y convertía bordes de 1 px en luces de 4 px: 3
   anillos de 4 componentes quedaron deformados. La reparación es el lookbehind
   `(?<![\d.]\s)` de la vara.
3. **Interpolación dentro de comillas simples.** `backdropFilter:
   'blur(${BLUR.cristal}px)'` — código dentro de un literal, invisible para el
   tipado y para los tests de render. Lo pescó un caminador de estado de comillas
   escrito para la ocasión (`detecta-comillas.mjs`), que dio exactamente 2 casos
   reales y 1 falso legítimo en un test.
4. **El contador del codemod mentía.** Reportaba 142 sitios cuando el barrido real
   era ~71 (incrementaba por reemplazo y otra vez por archivo). La contabilidad se
   hizo con `grep` de archivo y línea, no con el número del script. Un instrumento
   de medición que no cuadra se repara antes de usar su salida.

Dos defectos menores, por completitud: la escala se escribió primero con nombres
distintos (`tenue/suave/medio/…`) de los que usaban el codemod y el CSS
(`chispa/ascua/foco/…`) → 6 errores TS2339; y quedaron `HALO` importado sin uso en
un componente tras las reparaciones.

### La vara 16 y por qué la métrica no alcanzaba

Al cerrar el barrido pasó algo peor que un test rojo: `audit-debt.mjs` seguía
diciendo **0 fuera de token** con números de halo sueltos todavía en el repo. Su
conjunto de valores aceptados se construye con *todos* los `Npx` que aparecen en
`theme/`, `index.css` y `DESIGN.md`, así que un `0 0 16px` escrito en un componente
no es deuda para la métrica: **coincide** con un número del tema. La métrica mide
coincidencia, no propiedad.

Se le quitó primero el atajo que absorbía los números de la grilla `SP` (era un
`if` que perdonaba cualquier múltiplo de 4) y la rama numérica quedó en
`isToken(value)` a secas. El total no cambió: 0. Lo que sí cambió fue el derecho a
ese 0, que ahora tiene una línea escrita explicando que no es una prueba de
propiedad. La propiedad la vela el contrato, como ya hacía con `LETRA`:

- **Afirmación 16** — `0 0 Npx` y `blur(Npx)` fuera de `theme/` son hallazgo, en los
  dos idiomas (style en línea y hoja). El contexto se busca **hacia atrás en el
  archivo**, no en la línea, porque una sombra larga se parte en varias y la
  continuación no repite la propiedad; gana la propiedad más cercana, así que
  `margin: '0 0 14px'` queda descartado por su `margin`. `0 0 0px` se perdona: es la
  **ausencia de luz** con la que arranca un beat, no un paso de la escala.
- **Fijación del espejo** — los 7 pasos de `HALO` y los 4 de `BLUR` contra las 11
  variables `--halo-*` / `--vidrio-*` de `index.css`: mismos nombres, mismos
  números, y el tamaño del conjunto fijado (11), para que el espejo no pueda crecer
  por su cuenta.
- **Control positivo y negativo** — la vara pesca `0 0 18px`, `0 0 22px` y
  `blur(14px)`, y deja tranquilos el anillo `0 0 0 1px`, el anillo dentro de una
  sombra compuesta (`… rgba(0,0,0,.3), 0 0 0 3px #fff`), el `0 0 0px` del beat, el
  `margin: '0 0 16px'` y todo lo que ya pide `var(--halo-*)` o `${HALO.marca}`.

### Medición

| Prueba | Antes | Después |
|---|---|---|
| Radios de halo escritos a mano | 126 sitios · 21 radios | **0 sitios · 7 pasos con nombre** |
| Radios de vidrio escritos a mano | 44 sitios · 7 radios | **0 sitios · 4 pasos con nombre** (14 sitios se mueven 2 px) |
| Superficies de vidrio que no desenfocaban | 3 (`backdrop-filter: 16px`, inválido) | **0**, medido en el navegador |
| Entradas muertas de `GLOW` | 6 (`gold`, `purple`, `green`, `red`, `toast` + `cyan` a 18 px) | **1** (`cyan`, a `HALO.marca` = 16 px) |
| Pruebas del contrato asistente | 17 · 15 afirmaciones | **19 · 16 afirmaciones** |
| `npm run typecheck` · `npm run lint` | limpios (lint con 1 warning) | **limpios, sin warnings** |
| `npx vitest --run` | 45 archivos · 605 | **45 · 607** |
| `audit-debt.mjs` | 0 fuera de token (aceptados 176) | **0 fuera de token** (aceptados **171**: el tema se limpió y 5 números muertos dejaron de dar permiso) |
| Hallazgo nuevo de la métrica ajustada | — | `fontSize: 26` en `RedSocial.tsx:331` → `SIZE.xxl` (24) |

### Lo visible, para que lo decidas vos

Cinco cambios se ven en pantalla. Ninguno es un capricho: los cinco salen de la
grilla o del brief.

1. **La barra, el header y las tarjetas ahora sí empañan** (antes no desenfocaban
   nada). Es el cambio más grande y es una reparación, no un rediseño.
2. **El anillo del orbe de arranque** sube de 30→60 px a 24→48 px (`resplandor` y
   su doble): la rampa de carga sigue creciendo, dos pasos más adentro de la escala.
3. **El vidrio global** pasa de 18 a 20 px (`esmeril`) y ocho píldoras de 14 a 16 px
   (`cristal`): un dedo de escarcha más.
4. **El pulso ámbar de la keyframe** pasa de 14→26 a 16→24: el mismo latido, con
   los dos extremos de la escala.
5. **`GLOW.cyan`** de 18 a 16 px, y **las iniciales del Pasaporte** de 26 a 24 px.

Si el 2 o el 3 te molestan al mirar, se revierten cambiando un paso de `HALO` o de
`BLUR` en `theme/` — que es justamente el punto de tener un solo dueño.

### Lo que sigue

Queda la tercera familia de números de profundidad: **las sombras de elevación**
(`0 Npx Npx`), medidas en 50 sitios con ~20 parejas distintas (`0 20px 60px` ×6,
`0 8px 32px` ×4, `0 16px 48px` ×3). Es #68, con el mismo método: medir, decidir
escala con desempate declarado, barrer con snapshot y diff, y poner la vara antes
de creerse el 0 de la métrica.

---

## #68 · La altura de un cuerpo (2026-11-02)

### La medición anterior estaba mal, y este bloque empieza diciendo cuántos eran

El párrafo de arriba anunciaba **50 sitios con ~20 parejas**. Lo que había, medido
con la misma lógica que la vara (contexto de propiedad + los tres permisos), son
**30 capas en 19 archivos, 12 geometrías distintas**. Los 50 venían de un grep que
contaba `0 Npx Npx` en cualquier lado: mezclaba márgenes (`margin: 0 -16px 12px`),
las líneas del espejo que yo mismo estaba escribiendo en `index.css`, y valores de
`theme/` que son el dueño. Es el mismo error de #67 en miniatura —**contar ocurrencias
no es medir hallazgos**— y esta vez lo cometí antes de publicar el número, no después.

Y el inventario que sí midió bien tuvo su propio accidente: el script marcaba
**todas** las líneas como `:1`, porque usé `findIndex` para buscar la línea de un
offset cuando lo que buscaba era la última línea que empieza antes del offset
(`findLastIndex`). No lo arreglé de memoria: lo detecté porque el resultado era
imposible, y un resultado imposible se lee antes de usarse.

### El dueño: dos capas por paso, y el color se elige aparte

`theme/shadows.ts` tenía `SHADOW` escrito a mano en cuatro literales. Ahora la
geometría y el pigmento están separados, y la pareja es el átomo:

| Paso | `CERCANA` (define el borde) | `LEJANA` (da la altura) |
|---|---|---|
| `sm` | `0 1px 2px` · α 0.25 | `0 4px 12px` · α 0.2 |
| `md` | `0 1px 3px` · α 0.3 | `0 8px 24px` · α 0.35 |
| `lg` | `0 2px 6px` · α 0.35 | `0 16px 48px` · α 0.45 |
| `xl` | `0 4px 12px` · α 0.4 | `0 24px 64px` · α 0.55 |

- `SHADOW.<paso>` = la pareja (lo que pide una superficie asentada).
- `ELEVATED.lejana(paso, color)` = **una** capa lejana con el color del sitio: sirve
  para el negro (`tint(C.black, 30)`) y para la sombra teñida (color personal del
  usuario, ámbar de la marca), que `SHADOW` no puede dar porque es negro.
- `ELEVATED.tinte(paso, color)` = la teñida que además necesita el negro para asentarse.
- `SHADOW.glow` y `glowGold` ahora componen `LEJANA.md` en vez de repetirla literal.

**Cómo cae un valor huérfano — dos reglas, y la segunda es al revés que en la luz.**

- **Un estado es un paso.** Donde hay dos estados, las capas caen a pasos
  CONSECUTIVOS: si reposo y foco comparten paso, la altura deja de contar el estado
  y el brief prohíbe que un estado sea sólo color. La prueba ya existía en la app:
  `.cola-item` en reposo pide `--altura-sm` y en `:hover`, `--altura-md`; y en
  `OmicronBar` el reposo va a `LEJANA.sm` y el foco a `LEJANA.md`.
- **Un paso solo va al más cercano en desenfoque; ante un empate, HACIA ABAJO.**
  Es el inverso del desempate de `HALO` (hacia arriba) y la asimetría es deliberada,
  no descuido: una luz que se achica deja de contar estado; una sombra que se
  agranda sí puede tapar la superficie de abajo. Este mundo construye la profundidad
  con superficies escalonadas y vidrio, no con sombras pesadas.

Las doce geometrías barrieron así (regla: desenfoque más cercano):
`0 4px 12px`·`0 4px 16px`·`0 6px 16px` → `sm` · `0 4px 20px`·`0 4px 24px`·`0 6px 20px`·
`0 8px 20px`·`0 8px 24px`·`0 8px 32px`·`0 12px 34px` → `md` · `0 12px 40px`·`0 16px 48px` → `lg` ·
`0 20px 60px` → `xl`.

### El espejo, y por qué hizo falta una segunda familia

`src/index.css` declara `--altura-<paso>-cercana`, `--altura-<paso>-lejana`,
`--altura-<paso>` (la pareja) y **`--caida-<paso>`** —la geometría sola, sin pigmento.
`--caida-*` no es un adorno: el banner de actualización de la PWA (`infrastructure/pwa/update.ts`)
se inyecta como cadena de CSS dentro de un `<style>` y **no puede importar el tema**.
Sin una var de geometría, ese escrito tenía que elegir entre dos defectos: copiar
`0 12px 40px` a mano o perder su color. Pide `var(--caida-lg)` y pone su `rgba(0,0,0,.6)`.
El contrato verifica los doce `--altura-*` y los cuatro `--caida-*` **texto a texto**
contra `CERCANA`/`LEJANA`, igual que los espejos de `--halo-*` y `--vidrio-*`.

### Los cuatro errores del barrido (ninguno lo agarró un test; los agarró leer)

1. **Falsa pareja.** `GemeloTab` tenía `0 4px 20px` en tres tarjetas. Al desenfoque
   es `md`, pero la geometría `y` salta de 4 a 8. Aceptado y declarado: la vara es la
   escala, no el píxel exacto, y el delta se lista abajo en «lo visible».
2. **El negativo que me escribí mal.** En el test de control puse
   `alturasSueltas('boxShadow: \`0 4px 24px ${c}, ${LEJANA.md}\`') → []`. Falso: una capa
   suelta dentro de una plantilla sigue siendo una capa suelta, y la vara la pesca bien
   —el que estaba mal era mi expect, no la red. Lo cambié a `['0 4px 24px']` y agregué
   el negativo verdadero (`${SHADOW.md}, 0 0 ${HALO.ascua}px …`).
3. **`expect(…).startsWith(…)` no existe en este `Assertion`.** El typecheck lo frenó
   (TS2339) antes de que se volviera un test verde por accidente; se reemplazó por
   `LEJANA[paso].startsWith(…)` comparado contra `true`.
4. **Finale de línea.** El codemod normalizaba CRLF/LF del archivo entero. Sobre un
   checkout mixado eso reescribe cada línea y el diff deja de ser legible: se sacó la
   normalización (ningún par tocaba un salto de línea) y se escribió el texto tal cual.

### El defecto que sólo apareció al verificar en el navegador

`GeodesicOrb` (el núcleo del orbe, la pieza que más mirás) calculaba sus dos halos
multiplicando: `0 0 ${30 * intensity}px` y `0 0 ${60 * intensity}px`, con `intensity`
entre 0.5 y 0.9 según el estado. En pantalla eso es **21px y 42px**, dos números que
no están en `HALO`. La vara 16 no los podía ver: no son literales en el código, son
geometría fabricada en runtime. Medido con `getComputedStyle` sobre los 249 elementos
renderizados, era lo único fuera de escala que quedaba.

Se resolvió pidiendo dos pasos (`HALO.resplandor` 24 y `HALO.difusion` 40) y dejando
que `intensity` siga haciendo lo que su propia documentación dice que hace —
**brillo** (ya gobierna el alfa del halo y la opacidad de los vértices)—. El estado del
orbe no queda sólo en color: sigue teniendo conteo de nodos (12 → 42 al completar todo),
giro y brillo. Es, además, lo que el brief pide para el movimiento: transform y opacidad.

Después del cambio, la sonda del navegador da: **0 capas fuera de escala, 0 sombras
rotas (`undefined`/`NaN`), desenfoques de vidrio {16, 20}** —dos pasos de `BLUR`— y
consola limpia. Cobertura declarada: la pantalla renderizada es la de arranque; las
que requieren sesión no se recorrieron, porque no toco tu login ni tus credenciales.
La garantía completa de esas pantallas es la vara sobre el código fuente, no esta sonda.

### La vara 17, y por qué la métrica no alcanzaba otra vez

`audit-debt.mjs` midió `0 valores fuera de token` antes de este bloque y también
después: su detector compara **números contra la lista del tema**, así que un
`0 12px 34px` que casualmente coincide con algo de `theme/` no es deuda para él.
La propiedad (quién es el dueño de ese número) la vela `contratoAsistente.test.ts`.
Tres permisos, cada uno un defecto que alguien podría cometer creyendo que hace bien:

- `0 0 Npx` con dos offsets ceros **es luz**, y la cobra la vara 16 — si las dos redes
  la pescaran, un halo podría moverse de escala sin que nadie lo decida.
- Una capa `inset` **es una arista** (el filo del vidrio, `--filo-vidrio`), no un cuerpo
  elevado: no se mide.
- Una línea `--altura-md-lejana: …` o `--caida-lg: …` **es el espejo**, y el espejo se
  vela texto a texto, no se lo perdona en silencio. Se vacían las definiciones
  conservando los saltos, como los comentarios en #67.
- Y manda la **propiedad más cercana hacia atrás en el archivo**, no en la línea:
  `margin: 0 -16px 12px` no es una caída, y una sombra larga partida en varias líneas
  no repite la propiedad.

### Un defecto de documentación que la métrica estaba protegiendo

`DESIGN.md`, sección Buttons, seguía describiendo botones que ya no existen:
`padding: '13px 0'`, `borderRadius: 15`, `fontSize: 15.5`, `letterSpacing: 0.2` y
`boxShadow: 0 12px 32px rgba(160,174,192,0.42)`. Ninguno de esos valores vive en el
código (`BASE.btnPrimary` es ámbar con `RADIUS.sm`, `fontSize: 15` y `LETRA.apretada`).
Y como `audit-debt.mjs` lee `DESIGN.md` para armar su lista de valores conocidos,
**el párrafo viejo blanqueaba sus propios números muertos**: la doc instructiva y el
permiso de la métrica eran el mismo texto rancio. Se reescribió contra lo que hay, y
la regla «una sombra de una capa es un defecto» se corrigió por su versión verdadera:
la pareja es la forma por defecto, y una capa lejana sola es correcta cuando el sitio
ya vivía con una (viaja bajo un halo, sobre una escena) — **la escala cambia la
geometría, no la composición**.

### Medición

| Prueba | Antes | Después |
|---|---|---|
| Capas de altura escritas a mano fuera de `theme/` | **30 en 19 archivos · 12 geometrías** | **0 en 0 · 0 geometrías** |
| Capas de los 3 sitios de hoja CSS (`aprendizaje.css`, `.bg-omicron-card`) | 3 literales copiados de `SHADOW` | `var(--altura-*)` |
| Sombras del banner PWA inyectado | 2 literales | `var(--caida-lg)` / `var(--caida-sm)` |
| Halos calculados en runtime (orbe) | 21px y 42px, fuera de escala | 24px y 40px, dos pasos |
| Pruebas del contrato asistente | 19 · 16 afirmaciones | **21 · 17 afirmaciones** |
| `npm run typecheck` · `npm run lint` | limpios | limpios |
| `npx vitest --run` | 45 · 609 | 45 · **609** |
| `audit-debt.mjs` · fuera de token | 0 | 0 (y ahora con dueño, no con coincidencia) |
| Sombras renderizadas fuera de escala (navegador) | 1 (el orbe) | **0** |

### Lo visible, para que lo decidas vos

Ocho sitios mueven geometría; el resto se fue a un paso que ya era el suyo.

1. **Las cuatro tarjetas del Gemelo**: `0 4px 20px` → `0 8px 24px` (más altura, se
   asientan un poco más).
2. **La tarjeta de presencia en vivo**: `0 12px 34px` → `0 8px 24px` (−10px de
   desenfoque; es el mayor movimiento del barrido).
3. **Los cinco paneles modales** (academia ×2, credencial, red social, verificación):
   `0 20px 60px` → `0 24px 64px`.
4. **El orbe**: su halo pasa de 21/42 a 24/40 px — 3px de luz de más adentro, 2px de
   baño de luz de menos afuera.
5. **Chip de conexión y tarjeta del desafío diario**: `0 4px 16px` → `0 4px 12px`.
6. **El botón primario del orbe** (`BASE.btnPrimary`): su sombra ámbar se tiñe ahora
   con `color-mix` del oro del tema en vez de un `rgba(242,177,52,0.28)` literal.
7. **`SHADOW.glow`/`glowGold`**: la capa lejana adopta el α de la escala (0.3 → 0.35).
8. **Las tres superficies grandes de auth** (`0 16px 48px`) no se mueven: ya estaban
   en el paso `lg`.

Si el 2 o el 4 te molestan al mirar, se revierten cambiando un paso de la escala en
`theme/shadows.ts` — no en el componente, que es el punto entero de #67 y #68.

### Lo que quedó abierto, con nombre

- **`DESIGN.md` todavía nombra colores que ya no son los del tema** en la sección de
  paleta: dice que el índigo `#5e5ce6` es «la segunda mitad del gradiente de
  `btnPrimary`» (el gradiente es ámbar desde la derogación de D5) y lista `#ffb02e` /
  `#ff5c7a` para `C.gold` / `C.red`, que valen `#f2b134` / `#f87171`. Es escombro de
  #66, no de #68, y lo dejo escrito en vez de tocarlo de paso: la regla que acabamos
  de firmar en `.qoderrules` dice que se actúa sobre lo indicado.
- **La vara 17 no ve geometrías fabricadas en runtime** (`${30 * intensity}px`). La
  sonda de navegador que corrí acá es la única que las agarra. Si vuelve a aparecer
  una, la defensa natural es una prueba de styles computados sobre un render con jsdom
  o una captura del navegador en CI, no otra red sobre el fuente.
- **Un `console.log` vivo** en `src/shared/utils/analytics.ts:19` (tres si se cuentan
  las repeticiones del arrastre). La regla 3 de `.qoderrules` lo prohíbe hacia
  adelante; sacarlo es una tarea aparte, no un cambio de diseño.

