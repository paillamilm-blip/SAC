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
  - [x] 0.1a `has_function_privilege('authenticated','public.register_exam_success(text,integer,text)','execute')` → `false` (anon: `false`)
      - Medido en producción por la dueña (2026-11-05): ni `authenticated` ni `anon` pueden ejecutar `register_exam_success`.
        `10011` está aplicada. **R2 cerrado en producción.**
  - [ ] 0.1b `pg_policies` de `profiles`, `job_matches`, `follows`, `freelance_needs`, `analytics_events` → `______`
  - [x] 0.1c pruebas sospechosas en `omicron_skill_proofs` (por `last_proven_at`) → 3 filas, todas de cuentas de prueba
      - `1f6ac182…` (usuaria de prueba 2026-11-04, `best_score` 87) y `1d8122af…` / `3be95691…` (piloto «verificacion fase 6/6b»,
        2026-10-24). Ninguna prueba ajena: **no hay señal de falsificación** por el hueco de R2.
- [ ] 0.2 Confirmar desde el panel qué funciones están desplegadas hoy (el registro de la auditoría
      dice: `proxy-ai`, `proxy-tts`, `simulador-universal`, `credential` + una de verificación) y
      anotar divergencias.
- [ ] 0.3 Anotar qué migraciones de la serie 10003–10012 están aplicadas (`select * from supabase_migrations.schema_migrations order by version;`).
- [ ] 0.4 Decidir y registrar: ¿el visitante sin cuenta debe poder gastar IA? (bloquea 2.1)
      ¿La clave de producción sigue fija en el código? (bloquea 7.6)

### 0.5 Leer septiembre antes de escribir noviembre (R23, Decisión 16)

Tres ramas remotas detenidas, sin PR abierto, entre 120 y 212 commits por detrás de `main`.
**No se fusionan crudas.** Se leen y se clasifica cada hallazgo.

- [x] 0.5.1 `git fetch origin seguridad/strix-ci` y leer su `.security/HALLAZGOS-2026-09.md`.
      Comparar contra R1–R11 de este plan y marcar cada punto como **ya hecho / pendiente / descartado**.
      - Leído (`origin/seguridad/strix-ci:.security/HALLAZGOS-2026-09.md`). Hallazgo crítico que **falta en R1–R11**:
        `check_and_consume_credit` (en `APLICAR_EN_SUPABASE.sql`, no versionada en `supabase/migrations/`) es
        **fail-open fijo** (`allowed:true`, `remaining:99`) y `_shared/iaCredits.ts` recibe `userAuthHeader` y
        **nunca lo usa** → `auth.uid()` es NULL dentro de la RPC. **Alimenta la Fase 2 (coste de IA)**: el límite
        diario no existe hoy; 2.1–2.4 deben contar con que la RPC de crédito no cuenta nada.
- [ ] 0.5.2 `git show origen/seguridad/perfil-lista-blanca:supabase/migrations/0083_perfil_lista_blanca.sql`.
      Verificar si está aplicada en producción (consulta de 0.1b) y confirmar que protege el `UPDATE`
      de columnas — **complementa** R1, no la resuelve.
- [x] 0.5.3 `git show origin/fix/working-openrouter-models:supabase/functions/proxy-ai/index.ts` y
      extraer la lista de modelos confirmados disponibles: es insumo directo para 4.1.4 (la carrera de
      modelos) y no se vuelve a averiguar desde cero.
      - **OJO:** esa rama es de **ago-2026** y su lista está obsoleta frente a lo que ya se desplegó en esta
        sesión. En esa rama: `GEMINI_MODEL = 'gemini-2.0-flash'` (apagado) y `FREE_MODELS` con modelos hoy
        muertos (`z-ai/glm-5.2:free`, `minimax/minimax-m3:free`, gemma/nemotron antiguos). La verdad vigente
        es `proxy-ai` en producción (BUILD `6g-gemini-first-frees-vivos`): Gemini 3.x primero + OpenRouter
        gratis vivos de respaldo. **No usar la lista de esta rama para 4.1.4**: tomarla del `index.ts` desplegado.
- [ ] 0.5.4 Decidir el destino de las tres ramas (¿se reimplementa el hallazgo y se borra la rama?) y
      anotarlo aquí. Borrar una rama ajena sin confirmación no es tarea de este plan.

**Salida de fase:** ninguna de las anteriores escribe nada. Es lectura pura, no cambia nada.

---

## Fase 1 — Datos de las personas y falsificación del pasaporte

### 1.1 Lectura anónima de `profiles` (R1 — confirmado vivo)

- [x] 1.1.1 Re-chequear el trazado: `grep -rn "from('profiles')" src/` y confirmar que ningún lector
      es anónimo (la auditoría verificó los cinco actuales: `ProfileContext.tsx:57,:139`,
      `onboardingSync.ts:96,:104`, `userColorSync.ts:47`).
      - Confirmado en código (2026-11-04): los cinco usos siguen siendo exactamente esos y todos ocurren con
        sesión. **El riesgo R1 no es un lector del front, es la política `profiles_select_all` abierta en la
        base**: se cierra en 1.1.2 y se mide en 0.1b. Ninguna casilla que escriba SQL se toca sin la copia
        del proyecto (1.1.3).
- [x] 1.1.2 Escribir `10013_perfiles_sin_lectura_anonima.sql`: `drop policy if exists profiles_select_all`,
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

- [x] 1.2.1 `10014_tablas_sociales_sin_lectura_anonima.sql`: restringir `job_matches`
      (`0004_jobs_chat.sql:39`), `follows` (`0067_social_follows_ghosts.sql:18`) y `freelance_needs`
      (`0069_freelance_needs.sql:39`) con `to authenticated` + `auth.uid()`.
      - Verificado en código (2026-11-04): las tres son `FOR SELECT USING (true)` tal cual dice la auditoría
        (`0004:39`, `0067:18`, `0069:39`), más `job_postings` `jobs_read USING (true)` (`0004:36`) que no
        figuraba y conviene cerrar en el mismo lote. Confirmar en 1.2.2 si alguna pantalla viva de `/u` las lee.
- [ ] 1.2.2 Antes de escribir: verificar si alguna pantalla viva de `/u` lee esas tablas. Si no
      (producto recortado), la política se cierra sin riesgo; si sí, se anota cuál.
- [ ] 1.2.3 Copia → verificar → producción. Mismo procedimiento que 1.1.3–1.1.6.

### 1.3 Cerrar la falsificación del pasaporte (R2)

- [x] 1.3.1 Condicionado a 0.1a. Si `true`: **no aplica — 0.1a dio `false`** (ya cerrado en producción por `10011`). Pasa a 1.3.2.
      Si `true`:
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

## Fase 2 — Coste, métricas y reputación

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
      - Verificado en código (2026-11-04): `0068:34 GRANT INSERT ON public.analytics_events TO anon;` existe
        (y `:35` a `authenticated`). El grant a `anon` es el que se quita. Queda para migración nueva, no editar `0068`.
- [ ] 2.6 Decidir y anotar: ¿qué se hace con los eventos ya contaminados? (no se borran sin decisión)

### 2.7 La reputación deja de ser writable desde el navegador (R13)

- [ ] 2.7.1 Confirmar primero que **nada** renderiza `gemelo`: `useGemeloDigital` en `AppContext.tsx:64-66`
      tiene 0 consumidores (medido en R17). Si eso es cierto, el paso siguiente no cambia lo que nadie ve
      — por eso es de riesgo bajo y va temprano (Decisión 12).
- [ ] 2.7.2 Eliminar el `upsert` con `reputation_score: 50` de `ProfileContext.tsx:138-162` y convertir la
      creación de perfil en una RPC del servidor.
- [ ] 2.7.3 Poda de `src/features/gemelo/services/reputation.ts` (conservando tipos): la fórmula canónica
      es `recalc_reputation()` de `0050_reputacion_canonica.sql`, que aplica `round(..., 2)` y con la que
      la copia del cliente deriva 0–0,02.
- [ ] 2.7.4 Verificar que `/u` lee `profiles.reputation_score` (canal Realtime ya existente,
      `ProfileContext.tsx:226-258`) sin escribirlo nunca.
- [ ] 2.7.5 Prueba: dos cuentas, una intenta `update` de `reputation_score` desde el cliente → la RLS o la
      función de protección la rechazan. **Este paso es el que decide si el pasaporte es infalsificable
      de punta a punta**, igual que 1.3 para el examen.

---

## Fase 3 — Lo que expulsa o engaña a la usuaria (R12, R15, R14, R19)

### 3.1 Red que se siente como veto (R12)

- [x] 3.1.1 Leer `src/store/ProfileContext.tsx:180-186` y confirmar que hoy un `catch` por red cae en
      `setAuthStatus('no_access')` igual que un 403 real.
- [x] 3.1.2 Añadir un estado distinguible (`error_transitorio`) con acción "Reintentar" que vuelva a
      llamar `loadProfile(session)`. **No** agregar el botón a `NoAccess.tsx`: esa pantalla es correcta
      para acceso denegado; lo que está mal es llegar a ella por red (Decisión 11).
- [x] 3.1.3 Reintento manual con contador visible, no automático infinito (una base caída no se golpea).
- [ ] 3.1.4 Prueba: `ProfileContext.test.tsx` con `fetch` rechazando → la usuaria sigue en su sesión con
      aviso recuperable, y **no** aparece el botón de cerrar sesión.
- [ ] 3.1.5 Prueba manual: levantar el dev server con la base inalcanzable (cortar red o bloquear el
      dominio) y verificar que el texto no dice "sin acceso".

### 3.2 Login que miente y progreso de invitado que se pierde (R15)

- [x] 3.2.1 Leer `src/features/auth/components/AuthOverlay.tsx:240-246` y separar el fallo de la RPC
      `get_email_for_login` de las credenciales inválidas, con mensaje propio
      ("no podemos verificar tu usuario en este momento").
- [x] 3.2.2 **No aplica a `/u`** (verificado 2026-11-05): `migrateGuestProfile` migra el onboarding de la app anterior y nada lo escribe ya;
      el traspaso real es `traerInvitado` (`useBrecha.ts`), explícito y elegido por la persona. Riesgo residual bajo anotado en
      `docs/auditoria-completa-2026-11-05.md` §1.5. Texto original: `AuthOverlay.tsx:114-123`: `migrateGuestProfile()` hoy cierra con
      `catch { /* silencioso */ }`. Reportar el fallo **antes** de cerrar la sesión del invitado: si la
      migración no ocurrió, el progreso de esa persona se pierde en el momento de registrarse.
- [ ] 3.2.3 Prueba: `AuthOverlay.test.tsx` con la RPC ausente → el mensaje no dice "contraseña
      incorrecta".
- [ ] 3.2.4 Prueba manual del caso de negocio: avanzar en modo invitado hasta tener brechas,
      registrarse con la RPC bloqueada y confirmar que el progreso queda recuperable o se avisa.

### 3.3 Micrófono (R14) — el arreglo es en la capa de voz, no en la pantalla

- [ ] 3.3.1 `src/infrastructure/voice/recognition.ts:96`: capturar `recog.start()`, tiparlo
      `void | Promise<void>` en `:31` y propagar el nombre del error al `onError` existente.
- [ ] 3.3.2 `ChatPanel.tsx:236-270`: `try/catch` que enroute a `decir(...)` para que ningún camino
      quede sin mensaje (el mapa `not-allowed` / `no-speech` / `audio-capture` de `:272-285` ya existe y
      está bien; no se reescribe).
- [ ] 3.3.3 Prueba que antes era imposible: `isSpeechAvailable: () => true` con `start()` rechazando →
      aparece el aviso. **Obligatorio**: hoy `ChatPanel.test.tsx:17` y `UApp.test.tsx:46` mockean `false`
      y excluyen la rama del test **por construcción** (Decisión 13).
- [ ] 3.3.4 Verificar en Safari si hay un Mac a mano; si no, anotar que quedó sin probar en el
      navegador donde el síntoma es más seguro.

### 3.4 Términos legibles y push (R19)

- [ ] 3.4.1 Confirmar que `src/pages/TerminosServicio.tsx` (378 líneas) no tiene ninguna ruta ni
      enlace: `grep -rn "TerminosServicio" src/ index.html` fuera de su propio archivo.
- [ ] 3.4.2 Decidir: enlazarla desde `AuthOverlay` (donde se aceptan) y del pie de `/u`, **o** borrarla
      y servir el markdown estático. Es decisión de producto → D7.
- [ ] 3.4.3 `src/infrastructure/pwa/push.ts` (121): cablear `initPush()` en el `SIGNED_IN` de
      `ProfileContext`, o borrarlo junto con la función `send-push` (Fase 7). Ninguna tercera opción:
      un archivo que no se registra y una función que no se llama son la misma deuda contada dos veces.

---

## Fase 4 — El ciclo y el examen (R8, R7)

### 4.1 El examen (R7)

- [ ] 4.1.1 `src/features/brecha/services/examen.ts` (`invocar`, `:53-66`): reintento automático con
      espera corta ante 502. Que se vea en pantalla ("reintentando…"), nunca en silencio.
- [ ] 4.1.2 Limpiar el error anterior al reintentar (hoy el texto viejo queda pegado en el diálogo).
- [ ] 4.1.3 Probar la hipótesis de la truncación **midiendo**, no cambiando: registrar largo de la
      respuesta y si el corte vino del plazo o del modelo (`proxy-ai/index.ts:341-346`, `group.abort()`).
- [ ] 4.1.4 Con la medición en mano, decidir: plazo más largo, abortar sólo al perdedor, o pedir el
      examen en dos llamadas. Una sola, documentando por qué.
- [ ] 4.1.5 Examen coherente con el perfil (a docencia básica no le salen temas de arquitectura de
      plataformas): pasar el contexto ocupacional como restricción en
      `supabase/functions/simulador-universal/index.ts`, no como adorno del aviso.
- [ ] 4.1.6 Prueba: dos perfiles distintos, mismo día, y comparar que los temas cambien.

### 4.2 Ciclo y sesión (R8)

- [ ] 4.2.1 Paso 5 del panel con datos reales, no fijo
      (`src/features/assistant/recomendar.ts:114-119`).
- [ ] 4.2.2 Cerrar sesión en `/u` (hoy el único `signOut()` está en `NoAccess.tsx:92`). Antes de
      escribir, verificar las tres trampas de `design.md` Decisión 7: que el modo invitado
      (`omicron:brecha:db:v1:invitado`) no se borre, que el historial del chat no cruce de persona a
      persona (`almacenChat.ts`, `ProfileContext.tsx:212`) y que la credencial salga del estado en
      memoria, no sólo de la vista.
- [ ] 4.2.3 Restaurar el pasaporte ya emitido al volver a entrar (`Inicio.tsx:129` + guard de
      `CompartirCredencial.tsx`).
- [ ] 4.2.4 Prueba manual completa: entrar → salir → entrar → el pasaporte está, el progreso está,
      el chat del anterior no aparece.

---

## Fase 5 — Transporte y obligaciones legales

- [ ] 5.1 Bajar `pdf.js` y `mammoth` al propio sitio y re-apuntar
      `src/features/gemelo/services/cvExtract.ts:6-8`. Con esto `cdnjs` deja de hacer falta.
- [ ] 5.2 Prueba: escanear un PDF real con el asset local (el escáner es la única razón de ser del
      paso 1 del ciclo; si se rompe, el producto no arranca).
- [ ] 5.3 Dejar la CSP en `Report-Only` una o dos semanas y revisar reportes (`vercel.json:13`).
- [ ] 5.4 Renombrar a `Content-Security-Policy` aplicativa: `script-src 'self'`,
      `frame-ancestors 'self'`, `upgrade-insecure-requests`, sin `'unsafe-inline'` en `style-src`.
- [ ] 5.5 Si Tailwind obliga a conservar `'unsafe-inline'`, dejarlo anotado como deuda en
      `requirements.md` y no como éxito.
- [ ] 5.6 Flujo real de **borrar cuenta** (endpoint autenticado; las cascadas ya existen:
      `0001_core.sql:8`, `0036_examen_ia.sql:16`, `10001_pruebas_por_nombre.sql:69`).
- [ ] 5.7 Flujo real de **exportar datos** (JSON con lo propio), como promete
      `POLITICA_PRIVACIDAD.md:132-166`.
- [ ] 5.8 Poner los correos de contacto que hoy figuran "pendiente"
      (`POLITICA_PRIVACIDAD.md:176,202`, `TERMINOS_SERVICIO.md:179`).
- [ ] 5.9 Fijar caducidad a credenciales v1 (`credential/index.ts:106-119`) o decidir la lista de
      revocación; documentar el costo: se pierde verificación 100 % sin conexión.
- [ ] 5.10 Alinear `POLITICA_PRIVACIDAD.md` con lo que el producto hace (ni más, ni menos).

---

## Fase 6 — Malla de pruebas antes de tocar volumen (R21, Decisión 15)

El podado de la Fase 7 mueve muchas líneas. Sin esta red se poda a ciegas, y hoy **el CI verde ya dio
falsa confianza una vez**: los dos peores bugs del repo (3.1 y 3.2) viven en archivos con 0 pruebas.

- [ ] 6.1 `@vitest/coverage-v8` con umbral **por carpeta**, no global: `features/brecha` y `store` ≥ 80 %.
      Un número global se cumple solo con tests fáciles y es lo que pasa hoy.
- [ ] 6.2 `ProfileContext.test.tsx`: `fetch` rechazando → estado recuperable, no `no_access`. Este test
      **es** la prueba de 3.1; escribirlo antes que el arreglo y ver que reviente.
- [ ] 6.3 `AuthOverlay.test.tsx`: login con la RPC `get_email_for_login` ausente → el mensaje no dice
      "contraseña incorrecta". Prueba de 3.2.
- [ ] 6.4 Un test de `recognition.ts` con `start()` devolviendo una promesa rechazada (prueba de 3.3).
- [ ] 6.5 `analytics.ts`: un test de la rama de error, para que 5.x no vuelva a escribir a ciegas.
- [ ] 6.6 Decidir cómo se prueba una Edge Function (hoy `credential`, `simulador-universal`, `proxy-ai`,
      `proxy-tts` tienen 0 pruebas y no hay harness en el repo). Puede ser `supabase functions` en un
      proyecto de copias o contratos de petición/respuesta en unitario; lo que no vale es seguir sin
      ninguna.
- [ ] 6.7 Retirar **en la misma PR del borrado** los tres tests que protegen código muerto:
      `cvAnalyzer.test.ts` (178 líneas), `NavigationContext.test.tsx` y la parte de `reputation.test.ts`
      que compara la copia del cliente contra sí misma. Antes de tocarlos, dejar constancia de qué
      cubrían.
- [ ] 6.8 Un test SQL en `supabase/tests/` que aserte que las reglas de `redviva/services/examenSkill.ts`
      coinciden con `omicron_ensure_skill_node` (migración 10002), para que el espejo defensivo no derive.

---

## Fase 7 — Aseo del repositorio y dependencias

- [ ] 7.1 Retomar commits chicos: una casilla de este archivo = un commit, un bloque = un PR.
      Etiquetar al cerrar la fase (`v0.11-post-auditoria`).
- [ ] 7.2 Decidir destino de `.kiro/` (853 archivos, 25 MB): excluir del paquete publicado o
      repositorio aparte. **No borrar** (Decisión 9).
- [ ] 7.3 Decidir destino de `docs/fusion/*.png` (≈3 MB de maquetas).
- [ ] 7.4 Inventario de funciones (`docs/inventario-funciones.md`): activa / inactiva / rota, para
      las 21. No borrar las inactivas.
- [ ] 7.5 Arreglar los dos candados rotos por si algún día se activan: `ghost-approval/index.ts:43-47`
      (rechazar 401 si no es cron interno o `service_role`) y `send-push/index.ts:119-148`
      (restringir a cron/servicio).
- [ ] 7.6 Con la decisión de 0.4: sacar o redirigir la clave de producción fija en
      `src/infrastructure/supabase/client.ts:15-17`. Opción intermedia documentada en
      `design.md` Decisión 8.
- [ ] 7.7 Borrar configuración muerta: el trozo de `three` en `vite.config.ts:36` (ya no es
      dependencia y `OrbNeuronal` no existe) y el comentario de `ci.yml` sobre
      `src/lib/supabase.ts` (no existe).
- [ ] 7.8 `.env.example`: quitar o implementar `VITE_OPENROUTER_KEY`, `VITE_SENTRY_DSN`,
      `VITE_ANALYTICS_DOMAIN`, `VITE_STRIPE_ENABLED`. Ninguna se lee en `src/`. **Prioridad a
      `VITE_OPENROUTER_KEY`: si alguien la llega a llenar y se conecta, acaba publicada en el
      navegador.**
- [ ] 7.9 Decidir si se instala monitoreo de errores (hoy no hay ninguno en producción) o se deja
      de prometerlo.
- [ ] 7.10 Reescribir `README.md`: el ciclo de cinco pasos en `/u`, qué es real y qué no. Reducir
      los 12 `.md` de la raíz y deshacer el solape de los dos `DEFINICION_OMICROM`.
- [ ] 7.11 Arreglar `scripts/prueba-viva.mjs:159-160` (doble clic en el botón del asistente; está en
      CI y da resultados frágiles).
- [ ] 7.12 Actualizar `.kiro/steering/project-context.md`: sigue describiendo el Orbe 3D y el
      "Oráculo" de un producto que ya no existe.
- [ ] 7.13 `npm audit fix` → resuelve las 8 de cadena de build no mayores. Verificar 368 pruebas.
- [ ] 7.14 Subir `zod` a `>=4.6.6` (la única que corre en el navegador) en su propio PR, con las
      validaciones de `src/` revisadas.
- [ ] 7.15 PR aparte para `vite` y `vitest` mayores (las dos críticas). Cambian configuración; no
      mezclar con nada.
- [ ] 7.16 Añadir a CI: `npm audit --omit=dev` falla si aparece algo alto en dependencias de
      producción (hasta ahora sólo `zod`).

### 7.17 Podado por consumo demostrado (R17, Decisión 14)

Regla: **sólo se borra lo que tiene 0 consumidores medidos**, y la prueba es el `grep` del símbolo. Un
paso = un commit, y el ciclo de cinco pasos se corre después de cada uno.

- [ ] 7.17.1 Inofensivos primero (no se renderizan ni se leen): `gemelo/services/memory.ts` (457, sólo se
      usa `clearMemory` desde `ProfileContext.tsx:213` — mover esa limpieza a la ruta que la necesite),
      `theme/{animations,layout,shadows}.ts` (166), `store/NavigationContext.tsx` (43, y con él el
      `ctx.activeTab || 'perfil'` de `omicron/services/brain.ts:40,77`).
- [ ] 7.17.2 Los que tienen efecto en tiempo de ejecución, de a uno:
      `infrastructure/voice/voiceAnalyser.ts` (387 — crea AudioContext y corre FFT emitiendo `oracle:voice`
      y `oracle:spectrum` sin un solo `addEventListener` en el repo; al borrarlo se libera CPU real),
      `store/RealtimeContext.tsx` + `hooks/useRealtimeNetwork.ts` (242 — cierra canales Realtime; verificar
      que el canal `reputation-changes-<id>` de `ProfileContext.tsx:226-258` **no** viva ahí).
- [ ] 7.17.3 `gemelo/services/cvAnalyzer.ts` (348): mover el tipo `AnalyzedProfile` (su único uso, en
      `shared/utils/guestMode.ts:8`) a `domain/types.ts` antes de borrar, y retirar su test en el mismo
      commit (6.7).
- [ ] 7.17.4 **`Toast.tsx` se decide aparte y después de 3.1/3.2**: es el componente que esos arreglos
      necesitan para enrutarse. Borrarlo antes sería destruir la solución que se está buscando. Lo
      correcto es usarlo en los 9 silenciamientos de sincronización
      (`ProfileContext.tsx:81,:95,:212-214`, `ColorPicker.tsx:69`, `useOmicronStats.ts:30`,
      `AuthOverlay.tsx:264`, `voice.ts:181`, `pwa/update.ts:24`).
- [ ] 7.17.5 Los 138 símbolos exportados sin uso en ~53 archivos: ataque por archivo con
      `noUnusedLocals` como verificador (7.17.7), empezando por `src/types/skills.ts`, que describe
      dominios retirados (`SkillTest`, `ExamGenerated`, `UserSkillProgress`, `ReputationHistoryEntry`).
- [ ] 7.17.6 `src/pages/TerminosServicio.tsx` y `src/infrastructure/pwa/push.ts` según lo resuelto en 3.4.
- [ ] 7.17.7 Reactivar `noUnusedLocals: true` y `noUnusedParameters: true` en `tsconfig.json` (hoy `false`,
      con el comentario "se pueden reactivar tras una limpieza dedicada"). Es el verificador del conjunto y
      el cierre de esta sección.
- [ ] 7.17.8 Decisión de producto antes que de código: ¿la persona elige su color en `/u`? Hoy
      `ColorPicker.tsx` existe con sus 4 colores y **no se monta** (`grep "<ColorPicker"` = 0), mientras
      `DESIGN.md:204` lo documenta como si estuviera disponible → D7.

### 7.18 Funciones SQL y Edge huérfanas (R16, 2.1 del informe de backend)

- [ ] 7.18.1 Script versionado de inventario: `tablas_creadas ∖ tablas referidas por código vivo` y
      `funciones_creadas ∖ llamadores (SQL interno + triggers + RPC del cliente)`. Hoy da ≈50 de 60 tablas
      y **35 funciones huérfanas** sobre 108. Sin el script, la cifra se vuelve a perder en dos meses.
- [ ] 7.18.2 Migración nueva (no editar las aplicadas) con `drop function` del lote huérfano + `revoke`, y
      su verificación final al estilo `10011:46-50`. Por lotes, no de un golpe: las 35 incluyen
      `open_blackbox` y el conjunto de escrow/pagos, que tocan dinero.
- [ ] 7.18.3 Registrar en `docs/inventario-funciones.md` (7.4) las 99 ocurrencias de `SECURITY DEFINER` que
      quedan vivas, y por qué cada una lo necesita.
- [ ] 7.18.4 `_shared/blackbox.ts` (174, sin importador) se borra junto con `run-code`.
- [ ] 7.18.5 Las 14 funciones sin llamador (1.598 líneas) y las 3 de cron (566): `supabase functions delete`
      por lote, con un commit de inventario por función. **Antes de borrar `stripe-webhook`**, confirmar
      desde el panel si Stripe la llama desde fuera (su "muerte" no es verificable desde el repo).

### 7.19 Estilo: una sola fuente de paleta (R18)

- [ ] 7.19.1 Contar la deuda real antes de prometer: 136 `style={{`, 94 literales hex (34 distintos),
      250 literales `Npx`, contra 7 archivos que importan `@/theme` y 0 utilidades Tailwind.
- [ ] 7.19.2 Elegir **una** dirección y anotarlo aquí: (a) Tailwind de verdad y se borra `theme/tokens.ts`,
      o (b) quitar Tailwind del build y quedarse con CSS + tokens. Hoy `src/index.css:6-8` ejecuta
      `@tailwind base/components/utilities` para aplicar sólo el preflight.
- [ ] 7.19.3 Borrar el comentario falso de `src/index.css:13-27` ("Single source of truth (mirrors
      theme/tokens.ts)") o hacerlo cierto: hoy `--cyan: #5cc8ff` contra `C.cyan '#a0aec0'`, y
      `brecha.css:3-27` hace sombra con `--accent:#f2b134` contra `C.gold '#ffb02e'`. El mismo botón puede
      salir en dos colores según el árbol.
- [ ] 7.19.4 `responsive.css`: de 367 líneas, 30 de sus 35 selectores no aparecen en ningún TSX
      (`.hub-modules-grid`, `.desktop-sidebar`, `.oraculo-bar`, `.module-card`, `.nav-fab`,
      `.mobile-only/.tablet-only/.desktop-only`…). Vaciarlo a las reglas que sí se usan (`.safe-bottom`).
      Lo mismo en `index.css` (16 de 20 muertos, incl. `.bg-omicron-card` y sus `::before/::after` en
      `:192,:202,:211`). `u-app.css` está bien: sólo 2 de 73 muertos.
- [ ] 7.19.5 Migrar los 34 hex a variables con un script de un solo paso, no a mano.

### 7.20 Dependencias muertas (R20)

- [ ] 7.20.1 `decimal.js`: 0 imports en `src`, y `PRODUCT.md:11` lo cita como "para dinero". Retirar.
      - Re-verificado (2026-11-04): `grep -rln "decimal" src/` = 0. La persona pidió antes no regenerar el
        lockfile hasta tener las pruebas listas; cuando lo haga: `npm uninstall decimal.js`.
- [ ] 7.20.2 `@tanstack/react-query`: sólo el provider en `App.tsx` y `infrastructure/query/client.ts`
      (27 líneas), con 0 `useQuery`/`useMutation` en todo `src`. Retirar provider y cliente junto con la
      dependencia, o empezar a usarlo de verdad. La primera opción es más chica y más honesta.
- [ ] 7.20.3 Dejar `zod` (sí se usa y bien, en `brecha/domain/validar.ts:10`) y actualizarlo según 7.14.
- [ ] 7.20.4 Anotar en `design.md` que `scripts/{a11y-u,visual-u,prueba-viva}.mjs` usan Playwright **sin
      declararlo** en `package.json` (CI lo instala con `npm install --no-save` en `visual-u.yml:44`):
      localmente esos scripts no corren y eso es una sorpresa para cualquiera que clone.

### 7.21 Documentación que engaña (R22)

- [ ] 7.21.1 `PRODUCT.md:11` y `:17` regenerados desde el grafo real de importaciones: no hay Three.js,
      no hay TanStack Query (tras 7.20.2), no hay `decimal.js`, y los dominios son
      `assistant`, `auth`, `brecha`, `gemelo`, `omicron`, `redviva` — no `academia`, `contratos`,
      `empleos`, `gobernanza`, `market`, `wallet`. Fechar cada afirmación de stack contra `package.json`,
      porque `:3` se declara "escrito leyendo el código" y aun así falla.
- [ ] 7.21.2 `DESIGN.md:151,:326,:331`: quitar `OrbOnboarding`, `GemeloReveal`, `TabLoader` (inexistentes)
      o marcar la sección como "histórico Fase 4"; reescribirla sobre `brecha.css`/`u-app.css`, que son la
      realidad visual de hoy. `:204` manda al picker que la usuaria no puede usar (7.17.8).
- [ ] 7.21.3 `CHANGELOG.md`: commit de cierre de Fase 5 (hoy nada después del 06-ago, y `:11` anuncia
      `PerfilSkillVisual.tsx`, que no existe) y `README.md` reescrito según 7.10.
- [ ] 7.21.4 Cabecera "estado pre-Fase 5" en `DEFINICION_OMICROM.md` (cita una Edge Function `coach` que no
      existe y `activeTab` de un store que ya no navega), `PLAN_PRODUCCION.md` (06-ago, 9 hubs, 63
      migraciones) y `DEFINICION_OMICROM_v8_BACKEND.md`. Mover `DEFINICION_OMICROM.md:82-85,:200,:229` a
      `docs/LEGADO/`.
- [ ] 7.21.5 `eslint.config.js`: quitar los ignores de `e2e/**` y `playwright.config.ts`, que **no existen**
      (falso positivo de "hay tests E2E"), y `vite.config.ts` `test.exclude: '**/e2e/**'`.
- [ ] 7.21.6 Lo único fiable hoy es `docs/fusion/producto-unico.md`. Dejarlo como base y enlazarlo desde el
      `README.md` nuevo, en vez de redactar una quinta versión de la misma historia.

### 7.22 Accesibilidad (R9)

- [ ] 7.22.1 Dejar un solo `banner` en la pantalla de reporte (hoy conviven la barra antigua y la nueva;
      axe lo reporta como `landmark-no-duplicate-banner` y `landmark-unique`). `/u` dio **0 violaciones** en
      la medición con axe-core 4.10.2 sobre la app viva; el resto del ciclo está limpio.
- [ ] 7.22.2 Pasar axe-core en las tres pantallas del ciclo dentro de la CI (`scripts/a11y-u.mjs` ya existe
      y está cableado en `visual-u.yml`), para que un `<header>` duplicado no vuelva a llegar verde.

## Pendientes de decisión de la dueña (no hay que adivinarlos)

| # | Pregunta | Bloquea |
|---|---|---|
| D1 | ¿El visitante sin cuenta debe poder usar la IA? | 2.1 |
| D2 | ¿La clave de producción sigue fija en el código para que un clon funcione? | 7.6 |
| D3 | ¿`.kiro/` se excluye del público o se separa en otro repositorio? | 7.2 |
| D4 | ¿Se instala monitoreo de errores o se deja de mencionar? | 7.9 |
| D5 | ¿Qué se borra de las pruebas ya registradas por la vía abierta? | 1.3.3 |
| D6 | ¿Se ofrece auto-borrado de cuenta al público o sólo por solicitud? | 5.6 |
| D7 | ¿La persona elige su color en `/u`? El selector existe pero no se monta | 7.17.8 |
| D8 | ¿Los términos se enlazan o se sirve el markdown estático? | 3.4.2 |
| D9 | ¿Web Push se cablea o se retira junto con `send-push`? | 3.4.3 |
| D10 | ¿Tailwind de verdad, o se quita del build? Hoy corre sólo el preflight | 7.19.2 |
| D11 | ¿Se re-implementa lo rescatable de las tres ramas de septiembre o se descarta? | 0.5.4 |

## Datos de prueba dejados en producción

Creados con autorización explícita para la prueba en vivo. **No se borraron**: la autorización fue
de escritura, no de eliminación.

- Usuaria `prueba.viva.20261104@example.com` (id `1f6ac182-3827-42b0-b5aa-1f73a7c8030b`).
- 1 análisis de CV, 6 brechas confirmadas, 1 sesión de examen + acta + prueba de habilidad,
  1 credencial firmada (vence 2027-11-04), eventos de analítica y una racha diaria.
- Con R1 sin cerrar, esta usuaria es legible públicamente mientras exista.
- Ruta de borrado: Supabase → Authentication → Users → eliminar (la cascada limpia el resto).
- [ ] 0.6 Confirmar con la dueña si se elimina ya o después de cerrar R1.

## Registro de avance en producción (2026-11-05)

Verificado por la dueña en el SQL Editor de `cuwuyqpxaibbqjrvamjb`. Cada fila dice qué consulta lo respalda.

| Hallazgo | Migración | Estado en producción | Evidencia |
|---|---|---|---|
| H-A · lectura anónima de `profiles` | `10013` | **Cerrado** | `pg_policies`: una sola política de SELECT, `profiles_select_own`, `{authenticated}`, `(id = auth.uid())` |
| H-B · protección de `profiles` por lista negra | `10015` | **Aplicada** | `protect_profile_columns()` contiene `k_editables` (`true`); `trg_protect_profile` activo (`O`) |
| R2 · falsificación del examen | `10011` | **Cerrado** | `has_function_privilege` de `register_exam_success`: `authenticated=false`, `anon=false` |
| R4 · lectura anónima de tablas sociales | `10014` | **Sin objeto** | `pg_policies` y `pg_class` devuelven 0 filas para `job_postings`, `job_matches`, `follows`, `freelance_needs`: **las tablas no existen en producción** |

**Sin verificar todavía:**
- Prueba funcional de `10015` desde la app (que color y nombre siguen guardando con la lista blanca activa).
- `0.1b` completa (políticas del resto de tablas), `0.3` (migraciones aplicadas) y `0.4` (decisiones D1 y D2).
- 1.1.3–1.1.6 y 1.2.2–1.2.3 (copia del proyecto y curl anónimo): `10013`, `10014` y `10015` se aplicaron directo en
  producción, sin pasar por una copia. Eso es una desviación del procedimiento del plan; queda anotada, no ocultada.

**Siguiente riesgo abierto:** H-C (el límite de IA del servidor no cuenta nada). Bloqueado por D1.

## Registro de bloqueos

*(anotar aquí `id de tarea — motivo — qué se necesita para desbloquear`)*

- (vacío)
