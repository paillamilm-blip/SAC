---
title: Diseño de la remediación (decisiones y orden)
inclusion: manual
---

# Diseño

Cómo se arregla sin romper. Este documento fija las decisiones; `tasks.md` las ejecuta.

## Decisión 0 — Regla de oro: las migraciones no se editan, se suceden

Las 94 migraciones son historia aplicada. Reescribir `0001_core.sql` no cambia nada en producción y
destruye la trazabilidad. **Toda corrección de base de datos entra como un archivo nuevo y
expresivo** en `supabase/migrations/`, con su propia cláusula `drop policy if exists` antes de la
nueva, y con su consulta de verificación al final.

Convención de nombres sugerida para este plan (sigue el estilo del repo, que usa prefijos
numéricos y remata en la serie 100xx):

```
10013_perfiles_sin_lectura_anonima.sql
10014_tablas_sociales_sin_lectura_anonima.sql
10015_pruebas_solo_servidor_verificado.sql
10016_eventos_de_analitica_con_sesion.sql
```

Cada archivo termina con sus propias `select` de comprobación, para que aplicarlo sea también
verificarlo. El repo ya hace esto: `10011_examen_solo_servidor.sql:46-50` y
`10012:106-111` traen consultas de verificación. Copiar ese patrón.

## Decisión 1 — Primero medir, después tocar (el paso que evita el desastre)

`10011_examen_solo_servidor.sql:35-43` advierte que hay un conjunto de migraciones "pendientes" que
**no se aplican con `db push`**, y que `10006` reabre lo que `10011` cierra. Por tanto el repositorio
no permite saber el estado real de la base. Antes de escribir una sola línea nueva hay que consultar
producción (Supabase → SQL Editor, proyecto `cuwuyqpxaibbqjrvamjb`) y anotar la respuesta:

```sql
-- 1. ¿Sigue abierto el hueco del examen?
select has_function_privilege(
  'authenticated', 'public.register_exam_success(text,integer,text)', 'execute'
) as examenabierto;

-- 2. ¿Qué políticas tiene profiles y a qué roles?
select policyname, role_name, cmd, qual
from pg_policies where schemaname='public' and tablename in
  ('profiles','job_matches','follows','freelance_needs','analytics_events');

-- 3. ¿Hay pruebas ya escritas por la vía abierta?
--    (la tabla no tiene created_at: usa first_proven_at / last_proven_at)
select user_id, skill_key, best_score, last_proven_at
from omicron_skill_proofs
where last_proven_at >= '2026-01-01'
order by last_proven_at desc;
```

**Por qué este orden:** si se aplica una migración nueva sin saber qué hay aplicado, se puede
cerrar de a un rol lo que otra política sigue dejando abierto, o revocar un permiso que alguna
pantalla todavía usa. Las consultas 1 y 2 deciden el contenido de las tareas siguientes.

## Decisión 2 — Cerrar la lectura anónima sin romper las pantallas

El riesgo: `profiles` hoy se lee con `select('*')`. Restringirlo de golpe podría dejar el mapa de
capacidades vacío o el chat sin nombre.

**Buenas noticias ya verificadas:** los cinco lecto-escritores de `profiles` en el cliente están
acotados a la propia sesión — `ProfileContext.tsx:57` y `:139` (`.eq('id', userId)` / `upsert` con
`session.user.id`), `onboardingSync.ts:96` y `:104`, `userColorSync.ts:47` (`.eq('id', user.id)`).
Ninguno lee perfiles ajenos ni lee sin sesión. **Cerrar la lectura anónima no debe romper ninguna
pantalla**, y aun así se verifica antes de publicar.

Receta en dos movimientos, cada uno en su propio PR:

1. **Re-chequear el trazado** con `grep -rn "from('profiles')" src/` después de cualquier cambio
   reciente, y confirmar que ningún lector nuevo sea anónimo. Si apareciera uno, pasar por
   `get_public_credential` (existe desde `0078`, no devuelve correo) o eliminarlo.
2. **Después** la migración `10013`: `drop policy if exists profiles_select_all` y política nueva
   `to authenticated using (id = auth.uid())`. Sólo si se demuestra que alguna pantalla necesita ver
   el perfil de otra persona se añade una lectura pública acotada a las columnas que el pasaporte ya
   muestra.

**Prueba de no-ruptura:** correr el ciclo completo de cinco pasos con una cuenta de prueba *después*
de la migración, no solo las 368 pruebas unitarias (usan base falsa y no detectan RLS).

## Decisión 3 — El examen: cerrar el hueco sin dejar a nadie sin poder rendir

Revocar `register_exam_success` de `authenticated` es correcto **sólo si** la vía buena está
desplegada y funcionando. `simulador-universal` sí lo está y ya escribe con el `uid` de la sesión
validada (`simulador-universal/index.ts:100`, `:277`, `:297`). Orden seguro:

1. Confirmar en el panel que `simulador-universal` responde y aprueba exámenes de punta a punta.
2. Aplicar la revocación (tarea 2.2).
3. Correr el ciclo completo con cuenta de prueba y verificar que el acta se escribe igual.
4. Recién entonces depurar las pruebas falsas que haya dejado el hueco abierto. **No borrar por
   borrado:** primero listar, decidir con criterio de fecha, y eliminar con un `where` angosto.

**Si el paso 3 falla:** no se revoca. Se deja la tarea bloqueada y se arregla la vía buena antes.

## Decisión 4 — Proxy de IA: sesión obligatoria, límite por usuario, falla-cerrado

- En `proxy-ai/index.ts` exigir `supabase.auth.getUser()` incluso en el modo "gratis", y separar el
  presupuesto de anónimos del de usuarios con sesión (hoy el `Bearer` vacío **omite todo control**,
  `:262-269`).
- En `_shared/rateLimit.ts`: la IP se toma del borde (`x-real-ip` / `cf-connecting-ip`), no de
  `x-forwarded-for` que trae el visitante (`:73-77`); y `checkRateLimit` pasa a **falla-cerrado**
  (`:39-42`) en los endpoints que cuestan plata. Se deja falla-abierto únicamente donde un fallo no
  cause coste.
- **Riesgo a controlar:** si el sitio ofrece un modo demostración sin sesión, cerrarlo de golpe
  cambia el producto. La decisión de producto (¿el visitante sin cuenta puede gastar IA?) se toma
  antes de escribir el código. Un tope bajo y por dispositivo es un punto medio.

## Decisión 5 — CSP y PDF: invertir el orden para no quedarte sin escáner

Pasar `Report-Only` a aplicativa de golpe puede romper el escáner el mismo día. Orden:

1. Bajar `pdf.js` y `mammoth` al propio sitio y apuntar `cvExtract.ts:6-8` a origen propio. Con esto
   `cdnjs` deja de hacer falta.
2. Dejar la cabecera como `Report-Only` una o dos semanas y mirar los reportes; confirmar que no hay
   violaciones propias.
3. Renombrar a `Content-Security-Policy` en `vercel.json:13`, con `script-src 'self'`,
   `frame-ancestors 'self'`, `upgrade-insecure-requests` y **sin** `'unsafe-inline'` en `style-src`.
4. Si Tailwind obliga a conservar estilos en línea, usar `style-src 'self' 'unsafe-inline'` **solo**
   hasta medir, y anotarlo como deuda en `requirements.md`.

**Prueba de no-ruptura:** escanear un PDF real con la cabecera aplicativa en un despliegue de
vista previa antes de publicar.

## Decisión 6 — El reintento del examen vive en el cliente, la truncación en el servidor

Dos causas separadas, dos arreglos separados, no juntos:

- **Cliente:** en `src/features/brecha/services/examen.ts` (`invocar`, `:53-66`) un reintento con
  espera corta ante 502, y limpiar el error anterior al reintentar (el texto viejo quedaba pegado
  en el diálogo). El reintento se nota en pantalla ("reintentando…"), nunca en silencio.
- **Servidor:** la hipótesis es que la carrera aborta una respuesta utilizable
  (`proxy-ai/index.ts:341-346`, `group.abort()` sobre `Promise.any`). Se comprueba midiendo, no
  cambiando: registrar largo de la respuesta y si el corte ocurrió por plazo o por modelo. Después
  se decide si el abort sólo borra al perdedor o si el plazo debe ser más largo.

## Decisión 7 — Botón de cerrar sesión: chiquito, pero con una trampa que hay que ver

Hoy el único `signOut()` está en `NoAccess.tsx:92`. Addirlo a `/u` parece dos líneas, y hay que
chequear tres cosas antes:

- El estado invitado vive en `localStorage` bajo `omicron:brecha:db:v1:invitado`; cerrar sesión no
  debe borrar el trabajo de quien no tiene cuenta.
- El historial del chat (`src/features/assistant/almacenChat.ts`) y `clearConversationMemory`
  (`ProfileContext.tsx:212`) no deben cruzarse entre la persona que sale y la que entra.
- La credencial ya emitida (`CompartirCredencial.tsx`) debe salir del estado en memoria, no sólo de
  la vista.

## Decisión 8 — Repo y documentación: limpiar por movimiento, no por borrado

`.kiro/` es herramienta de trabajo, no parte del producto. **No se borra**: se excluye del paquete
publicado (`.gitignore` nuevo o submódulo) o se separa en su propio repositorio, decisión de la dueña.
Lo mismo para `docs/fusion/*.png` (≈3 MB de maquetas). Lo que sí se borra sin permiso es la
configuración que no hace nada: `vite.config.ts:36` (trozo para `three`), el comentario de
`ci.yml` sobre `src/lib/supabase.ts` y las cuatro variables muertas de `.env.example`.

**Sobre la clave de producción en el código** (`src/infrastructure/supabase/client.ts:15-17`):
es lo que permite que un clon funcione contra esta base. Sacarla rompe el "clonear y correr" que
hoy hace útil al repositorio público. Se decide con la dueña; la opción intermedia es dejar el valor
por defecto apuntando a una base de demostración y exigir `.env.local` para la real.

## Decisión 9 — Funciones no desplegadas: dejarlas visibles, no borrarlas aún

16 de 21 no están activas. Borrarlas destruye trabajo y no elimina riesgo (no están alcanzando a
nadie). Lo que sí se hace ya: **marcar el estado** en un inventario corto (`docs/inventario-funciones.md`:
activa / inactiva / rota) y **arreglar los dos candados rotos por si algún día se activan**
(`ghost-approval/index.ts:43-47`, `send-push/index.ts:119-148`). Un candado que no devuelve ningún
rechazo es una deuda que se paga el día que alguien la active sin leer.

## Decisión 10 — Commits chicos otra vez

El estado actual es 1 solo commit con 380.693 líneas. Eso impide volver atrás. A partir de ahora,
cada tarea de `tasks.md` es un commit, cada punto es un PR y se etiqueta al cerrar la fase
(`v0.11-post-auditoria`). No se intenta "rehacer" la historia: se empieza limpia desde acá.

## Orden de fases

| Fase | Contenido | Condición para pasar a la siguiente |
|---|---|---|
| 0 | Medir producción (Decisión 1) | Las tres consultas respondidas y anotadas |
| 1 | R1, R2, R4 — datos de personas y falsificación | Ciclo completo verde con cuenta de prueba |
| 2 | R3, R10 (analítica) — coste y métricas | Coste por visitante desconocido ≈ 0 |
| 3 | R8, R7 — lo que siente la usuaria | El examen rinde a la primera y `/u` tiene cerrar sesión |
| 4 | R5, R6 — CSP y obligaciones legales | Escáner verde con cabecera aplicativa |
| 5 | R9, R10, R11 — accesibilidad, repo, dependencias |axe en verde, README dice la verdad |

Fase 0 no se salta. Fases 1 y 2 van antes que cualquier arreglo cosmético: son las únicas donde un
tercero puede causar daño hoy.
