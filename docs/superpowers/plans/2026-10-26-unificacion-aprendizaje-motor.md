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
