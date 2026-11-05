# Auditoría — Sistema Ómicrom (2026-11-04)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-04 |
| Base analizada | `origin/main` @ `834f5cc` |
| Método | Análisis estático del repo (grep, git, lectura). Sin ejecutar typecheck/lint/test/build (el sandbox da HTTP 403 en `npm ci` por `zod`) y sin acceso a producción |
| Compara con | [`docs/audit.md`](./audit.md) (2026-11-02, base `043dc47` del 24-oct, PR #406) |

> Esta auditoría no reemplaza a `docs/audit.md`: la actualiza. La anterior sigue siendo la referencia
> estructural (migraciones, Edge Functions, grafo de imports). Aquí se mide **qué cambió desde entonces**
> y qué de sus hallazgos sigue vivo, usando el mismo criterio: nada se afirma sin un comando que lo muestre.

---

## 0. Resumen ejecutivo

Desde la auditoría del 2-nov, el producto único `/u` avanzó mucho en **funcionalidad y calidad de front**
(mapa como red neuronal, pasaporte con sellos, «Mi perfil» con análisis del mapa, «Tu ciclo» clicleable,
asistente conectado), y los **13 bugs de `/u`** que listaba `docs/fusion/bugs-u.md` están resueltos en el
código. En cambio, **los hallazgos de base de datos y de coste siguen abiertos**: no se ha aplicado ninguna
migración nueva (`10013+` no existe), la lectura anónima de `profiles` sigue abierta y la CSP sigue en modo
reporte. El riesgo se concentra hoy en backend y datos, no en la interfaz.

**Semáforo frente a la auditoría anterior:**

| Área | 2026-11-02 | 2026-11-04 | Cambio |
|---|---|---|---|
| Bugs funcionales de `/u` (BUG-01…13) | abiertos | **resueltos en código** | ▲ |
| Lectura anónima de `profiles` (H-02 / R1) | abierto | **abierto** | = |
| Falsificación del examen (R2) | por verificar | **cerrado en código** (10011 revoca) | ▲ |
| Coste de IA sin sesión (R3/R13) | abierto | **abierto** | = |
| CSP aplicada | Report-Only | **Report-Only** | = |
| Migraciones nuevas aplicadas | 10002 en prod | **sin cambios** (10013+ no existe) | = |
| Documentación vs código | contradictoria | **sigue contradictoria** (12 .md en raíz) | = |

---

## 1. Lo que cambió y se puede verificar

### 1.1 Los 13 bugs de `/u` están corregidos en el código
`docs/fusion/bugs-u.md` listaba 13 hallazgos. Verificados hoy en `main`:

- **BUG-02 (límite de IA en el chat):** `ChatPanel.tsx:212` ahora llama `checkOmicronLimit()` antes de `askOmicron`. **Resuelto.**
- **BUG-03 (`/u` saltaba `no_access`):** `UApp.tsx:155` bloquea con `<NoAccess />` cuando `authStatus === 'no_access'`. **Resuelto.**
- **BUG-04 (datos corruptos dejaban `/u` en blanco):** `UApp.tsx:282` envuelve el contenido en `<ErrorBoundary>`. **Resuelto** (nota: `main.tsx` aún no tiene uno de nivel raíz; el de `UApp` cubre `/u`).
- **BUG-01 (el asistente presentaba la muestra como «De tu análisis»):** el origen `muestra` existe en `recomendar.ts`/`responder.ts` y el asistente lo declara. **Resuelto.**

### 1.2 El examen ya no se puede falsificar desde el cliente (R2)
`10011_examen_solo_servidor.sql:61` ejecuta `revoke execute on function public.register_exam_success(...) from public, anon, authenticated` y trae su verificación (`:47-48`). La migración está **en el repo**; la auditoría del 2-nov la daba «por verificar». Queda confirmar en producción que esté aplicada (tarea 0.1a del spec).

### 1.3 Superficie de producto nueva (post-auditoría)
`git diff 043dc47 HEAD` sobre `features/brecha` y `features/assistant`: **+12.283 líneas, 67 archivos**. Mapa, pasaporte, perfil, ciclo y asistente. Nada de esto existía cuando se escribió `docs/audit.md`.

---

## 2. Hallazgos que siguen abiertos (sin cambios desde el 2-nov)

### H-A (Alto) · Lectura anónima de `profiles` — era H-02/R1
`0001_core.sql:100-102` crea `profiles_select_all … for select using (true)` y **ninguna migración posterior la revoca** (`grep` de `drop policy … profiles_select_all` fuera de 0001 = 0). Cualquiera con la anon key puede leer filas de `profiles`. La corrección (`10013`) está planificada en el spec pero **no escrita** (`10013+` no existe en `supabase/migrations`).
- Agravante nuevo: hay una usuaria de prueba real en producción (`prueba.viva.20261104@example.com`, ver `tasks.md`), legible públicamente mientras esto siga abierto.

### H-B (Alto) · La protección de `profiles` usa lista fija de columnas — era H-02
`0007_protect_profile.sql` enumera columnas a mano; columnas nuevas quedan fuera. La corrección vive en la rama `seguridad/perfil-lista-blanca` (`0083_perfil_lista_blanca.sql`) y **no está en `supabase/migrations/`** → no aplicada. Sin cambios.

### H-C (Alto) · El límite de IA no cuenta nada a nivel de servidor — era R3, refinado
Hallazgo que la auditoría de septiembre (`seguridad/strix-ci`) ya había encontrado y que `docs/audit.md` no incluía: `check_and_consume_credit` es fail-open fijo (`allowed:true`) y `_shared/iaCredits.ts` ignora la sesión. BUG-02 cerró el límite *del cliente*; el *del servidor* sigue sin contar. Un visitante sin cuenta puede gastar IA (decisión D1 pendiente).

### H-D (Medio) · H-03 (orden de `9999`) — mitigado, no resuelto
`9999_audit_consolidado.sql` fija `search_path = public` en sus funciones (`:40,:121,:142`), así que el riesgo de pisar el `search_path` de `0057` es menor de lo temido. Pero el nombre `9999` sigue ordenándose después de `10000…10012` si la CLI compara como texto. Se cierra con la prueba empírica en base local (tarea 0.4/0.3 del spec).

### H-E (Medio) · CSP en Report-Only
`vercel.json` sigue con `Content-Security-Policy-Report-Only`. No bloquea nada todavía. El plan (5.3–5.4) la deja así una o dos semanas y luego la activa. Sin cambios.

### H-F (Medio) · Documentación contradice al código — era H-05
Siguen 12 `.md` en la raíz. `PRODUCT.md` aún cita Three.js, TanStack Query y `decimal.js` (0 imports de los dos últimos en `src`). Sin cambios; es la Fase 7.21 del plan.

---

## 3. Lo que esta auditoría NO pudo verificar (igual que la anterior)

| Qué | Por qué | Cómo se cierra |
|---|---|---|
| `typecheck`/`lint`/`test`/`build` | `npm ci` → 403 por `zod` en el sandbox | correr en CI (ya corre) o local |
| Estado real de la base de producción (qué migraciones, qué políticas) | sin credenciales | tareas 0.1–0.3 del spec, SQL Editor |
| Si `register_exam_success` está revocada en prod | sin acceso | tarea 0.1a |
| Explotabilidad real de H-A contra producción | a propósito, no se prueba en prod | copia del proyecto (tarea 1.1) |

---

## 4. Diferencias concretas con `docs/audit.md`

1. **El bloqueante H-01 de la anterior ya no aplica:** la «segunda app» (repo `brecha`) ya se integró en `/u`; no es un trabajo pendiente, es la base del producto de hoy.
2. **Cifras actualizadas:** 94 migraciones (antes 92), 21 Edge Functions, 101 archivos de producto + 35 tests. La anterior analizaba `043dc47`; esta, `834f5cc`.
3. **Los bugs funcionales se movieron de "abiertos" a "resueltos"**, algo que la anterior no podía ver porque son de código nuevo.
4. **El foco de riesgo se desplazó**: la anterior lo repartía entre integración y deuda; hoy está casi todo en **base de datos y coste de IA** (H-A, H-B, H-C), porque el front se estabilizó.

---

## 5. Recomendación de orden (coincide con el plan del spec)

1. **Primero la Fase 0 del spec** (medir producción: 0.1–0.4). Sin esos datos, H-A/H-B/H-C se arreglan a ciegas.
2. **H-A** (cerrar lectura anónima de `profiles`, `10013`) y **H-B** (lista blanca, `0083`) en una copia antes que en producción.
3. **H-C** (coste de IA) tras decidir D1.
4. CSP a bloqueo (H-E) después de las pruebas manuales de la dueña.
5. Documentación (H-F) al final, cuando el código deje de moverse.

> Conclusión: el producto está mucho más usable que hace dos días, pero el riesgo real (datos de personas
> legibles y coste de IA) sigue intacto. La prioridad no es más interfaz, es cerrar la Fase 0 y las tres
> migraciones de seguridad.
