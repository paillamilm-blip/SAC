---
title: Tareas de remediación post-auditoría
inclusion: manual
---

# Tareas

Una casilla = un commit. Un bloque = un PR. No se marca una casilla sin correr su verificación.
Las casillas de **Fase 0** deciden el contenido de las demás: no se saltear.

Estados: `[ ]` pendiente · `[x]` hecha y verificada · `[!]` bloqueada (anotar abajo el motivo).

---

## Fase 0 — Medir producción antes de tocar nada

- [ ] 0.1 Correr en Supabase → SQL Editor (proyecto `cuwuyqpxaibbqjrvamjb`) las tres consultas de
      `design.md` (Decisión 1) y pegar las respuestas en este archivo, abajo de cada casilla.
  - [ ] 0.1a `has_function_privilege('authenticated','public.register_exam_success(text,integer,text)','execute')` → `______`
  - [ ] 0.1b `pg_policies` de `profiles`, `job_matches`, `follows`, `freelance_needs`, `analytics_events` → `______`
  - [ ] 0.1c pruebas sospechosas en `omicron_skill_proofs` (por `last_proven_at`) → `______`
- [ ] 0.2 Confirmar desde el panel qué funciones están desplegadas hoy (el registro de la auditoría
      dice: `proxy-ai`, `proxy-tts`, `simulador-universal`, `credential` + una de verificación) y
      anotar divergencias.
- [ ] 0.3 Anotar qué migraciones de la serie 10003–10012 están aplicadas (`select * from supabase_migrations.schema_migrations order by version;`).
- [ ] 0.4 Decidir y registrar: ¿el visitante sin cuenta debe poder gastar IA? (bloquea 2.1)
      ¿La clave de producción sigue fija en el código? (bloquea 5.6)

**Salida de fase:** ninguna. Es lectura pura, no cambia nada.

---

## Fase 1 — Datos de las personas y falsificación del pasaporte

### 1.1 Lectura anónima de `profiles` (R1 — confirmado vivo)

- [ ] 1.1.1 Re-chequear el trazado: `grep -rn "from('profiles')" src/` y confirmar que ningún lector
      es anónimo (la auditoría verificó los cinco actuales: `ProfileContext.tsx:57,:139`,
      `onboardingSync.ts:96,:104`, `userColorSync.ts:47`).
- [ ] 1.1.2 Escribir `10013_perfiles_sin_lectura_anonima.sql`: `drop policy if exists profiles_select_all`,
      crear `profiles_select_own` con `to authenticated using (id = auth.uid())`, y las consultas de
      verificación al final (patrón de `10011:46-50`).
- [ ] 1.1.3 Aplicar en una **copia** del proyecto, no en producción.
- [ ] 1.1.4 En la copia: correr el ciclo de cinco pasos completo con cuenta de prueba (subir CV →
      mapa → confirmar brecha → examen ≥70 → pasaporte). Las 368 pruebas no alcanzan: usan base
      falsa y no detectan RLS.
- [ ] 1.1.5 Verificar que la lectura anónima ahora falla: `fetch(.../rest/v1/profiles?select=id&limit=1)`
      con `apikey` y sin sesión → 200 con 0 filas o 401. **Antes y después, mismo comando.**
- [ ] 1.1.6 Aplicar en producción y repetir 1.1.4 sobre producción con la cuenta de prueba.

### 1.2 Tablas sociales abiertas (R4)

- [ ] 1.2.1 `10014_tablas_sociales_sin_lectura_anonima.sql`: restringir `job_matches`
      (`0004_jobs_chat.sql:39`), `follows` (`0067_social_follows_ghosts.sql:18`) y `freelance_needs`
      (`0069_freelance_needs.sql:39`) con `to authenticated` + `auth.uid()`.
- [ ] 1.2.2 Antes de escribir: verificar si alguna pantalla viva de `/u` lee esas tablas. Si no
      (producto recortado), la política se cierra sin riesgo; si sí, se anota cuál.
- [ ] 1.2.3 Copia → verificar → producción. Mismo procedimiento que 1.1.3–1.1.6.

### 1.3 Cerrar la falsificación del pasaporte (R2)

- [ ] 1.3.1 Condicionado a 0.1a. Si `true`:
      - [ ] 1.3.1a Confirmar que `simulador-universal` está desplegada y aprueba exámenes de punta a
            punta en producción (la revocación deja de servir el examen si la vía buena no funciona).
      - [ ] 1.3.1b Escribir `10015_pruebas_solo_servidor_verificado.sql` con el `revoke` de
            `register_exam_success` (patrón de `10011:61`) **y** la comprobación de que ninguna
            migración futura vuelve a concederlo.
      - [ ] 1.3.1c Aplicar, correr el ciclo completo otra vez y verificar que el acta se escribe igual.
      - [ ] 1.3.1d [!] Si 1.3.1c falla: **no revocar**. Arreglar la vía buena primero y volver.
- [ ] 1.3.2 Si `false` (ya cerrado): agregar a CI una prueba que **reviente** si `authenticated`
      recupera el permiso, para que `10006`-estilo no lo reabra en silencio.
- [ ] 1.3.3 Depurar las pruebas falsas que haya dejado el hueco (resultado de 0.1c). Listar primero,
      `where` angosto, decidir con la dueña qué se borra. **Nunca `delete` sin `select` previo.**
- [ ] 1.3.4 Hacer obligatoria `CREDENTIAL_SIGNING_KEY`: la función falla con 500 si no está, en vez
      de caer a `SERVICE_KEY` (`credential/index.ts:16-18`). Verificar antes en el panel que la
      variable exista; si no, crearla y re-validar que los pasaportes ya emitidos sigan verificando.

---

## Fase 2 — Coste y métricas

- [ ] 2.1 `proxy-ai`: exigir sesión (`proxy-ai/index.ts:262-269`), separar presupuesto de anónimos y
      de usuarios, según lo decidido en 0.4.
- [ ] 2.2 `_shared/rateLimit.ts`: IP desde el borde (`x-real-ip`/`cf-connecting-ip`), no de
      `x-forwarded-for` del cliente (`:73-77`); límite por `auth.uid()`.
- [ ] 2.3 `_shared/rateLimit.ts`: falla-**cerrado** en endpoints que cuestan dinero (`:39-42`).
      Deja falla-abierto sólo donde un fallo no cause coste, y anotar cuáles son.
- [ ] 2.4 Verificar: 200 llamadas sin sesión no consumen saldo medible en Gemini/OpenRouter.
- [ ] 2.5 `analytics_events`: insert sólo con sesión (`0068_analytics_events.sql:26-34`,
      `GRANT INSERT ... TO anon` → quitar). Confirmar que la analítica propia del sitio
      (`src/shared/utils/analytics.ts:63`) sigue registrando eventos para quien tiene cuenta.
- [ ] 2.6 Decidir y anotar: ¿qué se hace con los eventos ya contaminados? (no se borran sin decisión)

---

## Fase 3 — Lo que siente la usuaria

### 3.1 El examen (R7)

- [ ] 3.1.1 `src/features/brecha/services/examen.ts` (`invocar`, `:53-66`): reintento automático con
      espera corta ante 502. Que se vea en pantalla ("reintentando…"), nunca en silencio.
- [ ] 3.1.2 Limpiar el error anterior al reintentar (hoy el texto viejo queda pegado en el diálogo).
- [ ] 3.1.3 Probar la hipótesis de la truncación **midiendo**, no cambiando: registrar largo de la
      respuesta y si el corte vino del plazo o del modelo (`proxy-ai/index.ts:341-346`, `group.abort()`).
- [ ] 3.1.4 Con la medición en mano, decidir: plazo más largo, abortar sólo al perdedor, o pedir el
      examen en dos llamadas. Una sola, documentando por qué.
- [ ] 3.1.5 Examen coherente con el perfil (a docencia básica no le salen temas de arquitectura de
      plataformas): pasar el contexto ocupacional como restricción en
      `supabase/functions/simulador-universal/index.ts`, no como adorno del aviso.
- [ ] 3.1.6 Prueba: dos perfiles distintos, mismo día, y comparar que los temas cambien.

### 3.2 Ciclo y sesión (R8)

- [ ] 3.2.1 Paso 5 del panel con datos reales, no fijo
      (`src/features/assistant/recomendar.ts:114-119`).
- [ ] 3.2.2 Cerrar sesión en `/u` (hoy el único `signOut()` está en `NoAccess.tsx:92`). Antes de
      escribir, verificar las tres trampas de `design.md` Decisión 7: que el modo invitado
      (`omicron:brecha:db:v1:invitado`) no se borre, que el historial del chat no cruce de persona a
      persona (`almacenChat.ts`, `ProfileContext.tsx:212`) y que la credencial salga del estado en
      memoria, no sólo de la vista.
- [ ] 3.2.3 Restaurar el pasaporte ya emitido al volver a entrar (`Inicio.tsx:129` + guard de
      `CompartirCredencial.tsx`).
- [ ] 3.2.4 Prueba manual completa: entrar → salir → entrar → el pasaporte está, el progreso está,
      el chat del anterior no aparece.

### 3.3 Corrección de accesoibilidad (R9)

- [ ] 3.3.1 Dejar un solo `banner` en la pantalla de reporte (hoy conviven la barra antigua y la
      nueva; axe lo reporta como `landmark-no-duplicate-banner` y `landmark-unique`).
- [ ] 3.3.2 Pasar axe-core en las tres pantallas del ciclo en la CI
      (`scripts/a11y-u.mjs`, ya existe y está cableado en `visual-u.yml`).

---

## Fase 4 — Transporte y obligaciones legales

- [ ] 4.1 Bajar `pdf.js` y `mammoth` al propio sitio y re-apuntar
      `src/features/gemelo/services/cvExtract.ts:6-8`. Con esto `cdnjs` deja de hacer falta.
- [ ] 4.2 Prueba: escanear un PDF real con el asset local (el escáner es la única razón de ser del
      paso 1 del ciclo; si se rompe, el producto no arranca).
- [ ] 4.3 Dejar la CSP en `Report-Only` una o dos semanas y revisar reportes (`vercel.json:13`).
- [ ] 4.4 Renombrar a `Content-Security-Policy` aplicativa: `script-src 'self'`,
      `frame-ancestors 'self'`, `upgrade-insecure-requests`, sin `'unsafe-inline'` en `style-src`.
- [ ] 4.5 Si Tailwind obliga a conservar `'unsafe-inline'`, dejarlo anotado como deuda en
      `requirements.md` y no como éxito.
- [ ] 4.6 Flujo real de **borrar cuenta** (endpoint autenticado; las cascadas ya existen:
      `0001_core.sql:8`, `0036_examen_ia.sql:16`, `10001_pruebas_por_nombre.sql:69`).
- [ ] 4.7 Flujo real de **exportar datos** (JSON con lo propio), como promete
      `POLITICA_PRIVACIDAD.md:132-166`.
- [ ] 4.8 Poner los correos de contacto que hoy figuran "pendiente"
      (`POLITICA_PRIVACIDAD.md:176,202`, `TERMINOS_SERVICIO.md:179`).
- [ ] 4.9 Fijar caducidad a credenciales v1 (`credential/index.ts:106-119`) o decidir la lista de
      revocación; documentar el costo: se pierde verificación 100 % sin conexión.
- [ ] 4.10 Alinear `POLITICA_PRIVACIDAD.md` con lo que el producto hace (ni más, ni menos).

---

## Fase 5 — Aseo del repositorio y dependencias

- [ ] 5.1 Retomar commits chicos: una casilla de este archivo = un commit, un bloque = un PR.
      Etiquetar al cerrar la fase (`v0.11-post-auditoria`).
- [ ] 5.2 Decidir destino de `.kiro/` (853 archivos, 25 MB): excluir del paquete publicado o
      repositorio aparte. **No borrar** (Decisión 9).
- [ ] 5.3 Decidir destino de `docs/fusion/*.png` (≈3 MB de maquetas).
- [ ] 5.4 Inventario de funciones (`docs/inventario-funciones.md`): activa / inactiva / rota, para
      las 21. No borrar las inactivas.
- [ ] 5.5 Arreglar los dos candados rotos por si algún día se activan: `ghost-approval/index.ts:43-47`
      (rechazar 401 si no es cron interno o `service_role`) y `send-push/index.ts:119-148`
      (restringir a cron/servicio).
- [ ] 5.6 Con la decisión de 0.4: sacar o redirigir la clave de producción fija en
      `src/infrastructure/supabase/client.ts:15-17`. Opción intermedia documentada en
      `design.md` Decisión 8.
- [ ] 5.7 Borrar configuración muerta: el trozo de `three` en `vite.config.ts:36` (ya no es
      dependencia y `OrbNeuronal` no existe) y el comentario de `ci.yml` sobre
      `src/lib/supabase.ts` (no existe).
- [ ] 5.8 `.env.example`: quitar o implementar `VITE_OPENROUTER_KEY`, `VITE_SENTRY_DSN`,
      `VITE_ANALYTICS_DOMAIN`, `VITE_STRIPE_ENABLED`. Ninguna se lee en `src/`. **Prioridad a
      `VITE_OPENROUTER_KEY`: si alguien la llega a llenar y se conecta, acaba publicada en el
      navegador.**
- [ ] 5.9 Decidir si se instala monitoreo de errores (hoy no hay ninguno en producción) o se deja
      de prometerlo.
- [ ] 5.10 Reescribir `README.md`: el ciclo de cinco pasos en `/u`, qué es real y qué no. Reducir
      los 12 `.md` de la raíz y deshacer el solape de los dos `DEFINICION_OMICROM`.
- [ ] 5.11 Arreglar `scripts/prueba-viva.mjs:159-160` (doble clic en el botón del asistente; está en
      CI y da resultados frágiles).
- [ ] 5.12 Actualizar `.kiro/steering/project-context.md`: sigue describiendo el Orbe 3D y el
      "Oráculo" de un producto que ya no existe.
- [ ] 5.13 `npm audit fix` → resuelve las 8 de cadena de build no mayores. Verificar 368 pruebas.
- [ ] 5.14 Subir `zod` a `>=4.6.6` (la única que corre en el navegador) en su propio PR, con las
      validaciones de `src/` revisadas.
- [ ] 5.15 PR aparte para `vite` y `vitest` mayores (las dos críticas). Cambian configuración; no
      mezclar con nada.
- [ ] 5.16 Añadir a CI: `npm audit --omit=dev` falla si aparece algo alto en dependencias de
      producción (hasta ahora sólo `zod`).

---

## Pendientes de decisión de la dueña (no hay que adivinarlos)

| # | Pregunta | Bloquea |
|---|---|---|
| D1 | ¿El visitante sin cuenta debe poder usar la IA? | 2.1 |
| D2 | ¿La clave de producción sigue fija en el código para que un clon funcione? | 5.6 |
| D3 | ¿`.kiro/` se excluye del público o se separa en otro repositorio? | 5.2 |
| D4 | ¿Se instala monitoreo de errores o se deja de mencionar? | 5.9 |
| D5 | ¿Qué se borra de las pruebas ya registradas por la vía abierta? | 1.3.3 |
| D6 | ¿Se ofrece auto-borrado de cuenta al público o sólo por solicitud? | 4.6 |

## Datos de prueba dejados en producción

Creados con autorización explícita para la prueba en vivo. **No se borraron**: la autorización fue
de escritura, no de eliminación.

- Usuaria `prueba.viva.20261104@example.com` (id `1f6ac182-3827-42b0-b5aa-1f73a7c8030b`).
- 1 análisis de CV, 6 brechas confirmadas, 1 sesión de examen + acta + prueba de habilidad,
  1 credencial firmada (vence 2027-11-04), eventos de analítica y una racha diaria.
- Con R1 sin cerrar, esta usuaria es legible públicamente mientras exista.
- Ruta de borrado: Supabase → Authentication → Users → eliminar (la cascada limpia el resto).
- [ ] 0.5 Confirmar con la dueña si se elimina ya o después de cerrar R1.

## Registro de bloqueos

*(anotar aquí `id de tarea — motivo — qué se necesita para desbloquear`)*

- (vacío)
