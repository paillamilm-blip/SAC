---
title: Plan de remediación post-auditoría (4 de noviembre de 2026)
inclusion: manual
---

# Requisitos — qué está mal y cómo se ve "resuelto"

Este documento nace de una auditoría con evidencia ejecutada (no solo lectura de código):
ciclo de uso completo contra producción, 368 pruebas automatizadas, lint y tipos en verde,
build, `npm audit`, axe-core sobre la app viva, revisión de las 94 migraciones y de las 21
funciones de servidor.

Dos pasadas, numeradas en corrido:

- **R1–R11** — seguridad, datos de las personas, flujo de uso y repo. Revisión de backend y producto.
- **R12–R23** — calidad y mantenimiento, medidos con grafo de importaciones desde `src/main.tsx` y
  `src/App.tsx`, y cruce de las 94 migraciones contra el código vivo. Añaden lo que la primera pasada
  no vio: cuatro fallos que expulsan o engañan a la usuaria (R12, R14, R15, R19) y la deuda que los
  ocultó (R21).

Si algo de aquí contradice al código, **manda el código**. Verificar cada evidencia antes de
actuar sobre ella.

## Principios que ordenan todo el plan

1. **Nada destructivo sin verificación previa.** Ninguna tarea borra datos, revoca accesos o
   aplica una migración sin primero confirmar el estado real de producción.
2. **Un PR por punto.** Cada tarea cierra un hallazgo. No se mezclan seguridad con cosmética.
3. **No romper nada que funcione.** Antes de tocar una política de base o una función desplegada,
   se copia su estado actual y se deja preparado el revés.
4. **El producto es el ciclo de cinco pasos en `/u`.** Todo lo demás (pagos, empleos, orbe 3D)
   ya no existe; no se gasta esfuerzo en ello.

---

## R1 — La tabla de usuarios no debe ser legible por anónimos

**Estado hoy (confirmado en vivo):** con la clave pública `anon` y **sin sesión**, la base
devuelve filas de `profiles`. La lectura no restringe rol.

- Evidencia: `supabase/migrations/0001_core.sql:100-102` — `using (true)` sin cláusula `to`.
- La tabla contiene correo, nombre, localidad, saldo y reputación (`0001_core.sql:9-53`).
- **Criterio de resuelto:** `select` anónimo sobre `profiles` devuelve 401/0 filas, y la persona
  dueña de la sesión sigue leyendo su propio perfil sin que se rompa ninguna pantalla.

## R2 — Nadie debe poder registrar una prueba aprobada sin rendir el examen

**Estado hoy (pendiente de verificar):** la función que escribe "probado" recibe el puntaje
desde el cliente y basta 70 para quedar acreditada en cualquier habilidad; después el servidor
firma eso como credencial válida.

- Estaba concedida a `authenticated`: `0073_register_exam_success.sql:83`, y
  `10006_recorte_economico.sql:144` vuelve a concedérsela.
- La cierra `10011_examen_solo_servidor.sql:61`, que el propio archivo declara "pendiente"
  (`10011_examen_solo_servidor.sql:35-43`).
- **Criterio de resuelto:** `has_function_privilege('authenticated',
  'public.register_exam_success(text,integer,text)','execute')` devuelve `false`, una prueba
  automatizada falla si el permiso reaparece, y el examen sólo se aprueba por la vía del
  servidor.

## R3 — El proxy de IA no debe ser un grifo abierto

- Sin sesión la función no verifica nada y reenvía igual: `proxy-ai/index.ts:262-269`.
- El límite por IP confía en `x-forwarded-for` del cliente (`_shared/rateLimit.ts:73-77`) y es
  falla-abierto (`_shared/rateLimit.ts:39-42`).
- **Criterio de resuelto:** la llamada sin sesión válida se rechaza; el límite se cuenta por
  usuario; ante un fallo del control se cierra. Coste por visitante desconocido ≈ 0.

## R4 — Las demás tablas personales, igual que R1

- `job_matches` (`0004_jobs_chat.sql:39`), `follows` (`0067_social_follows_ghosts.sql:18`),
  necesidades freelance (`0069_freelance_needs.sql:39`).
- **Criterio de resuelto:** lectura sólo para `authenticated` con filtro por `auth.uid()`.

## R5 — La CSP debe bloquear de verdad y el PDF no debe venir de un CDN ajeno

- `vercel.json:13` publica la CSP como `Report-Only` (informa, no bloquea) y autoriza `cdnjs`.
- El procesador de PDF se descarga en cada escaneo: `src/features/gemelo/services/cvExtract.ts:6-8`.
- **Criterio de resuelto:** cabecera `Content-Security-Policy` aplicativa, pdf.js y mammoth
  servidos desde origen propio, sin `'unsafe-inline'` en estilos, con `frame-ancestors 'self'`.

## R6 — La política de privacidad tiene que ser operativa

- `POLITICA_PRIVACIDAD.md:132-166` promete borrado y copia de datos; las cascadas sí existen en
  el esquema (`0001_core.sql:8`, `0036_examen_ia.sql:16`, `10001_pruebas_por_nombre.sql:69`) pero
  no hay pantalla, endpoint ni exportación. Correos de contacto figuran "pendiente" (`:176,202`).
- Agrava: una credencial v1 ya compartida es pública para siempre, porque verificar no consulta
  la base (`credential/index.ts:106-119`).
- **Criterio de resuelto:** borrar cuenta y exportar datos funcionan desde la app; el documento
  describe lo que el producto realmente hace; v1 deja de aceptarse sin caducidad.

## R7 — El examen debe rendirse bien a la primera

- Falló en la primera llamada del ciclo en vivo. El servidor corta antes de tiempo
  (`simulador-universal/index.ts:177`) y el cliente no reintenta. Sospecha concreta: la carrera
  de modelos aborta en `proxy-ai/index.ts:341-346`. Se descartó el tope de tokens del cliente
  (`stream.ts:35`, 512).
- Los temas del examen no calzaron con el perfil (docencia básica recibió temas de arquitectura
  de plataformas).
- El mensaje de error viejo queda pegado tras un reintento exitoso.
- **Criterio de resuelto:** la primera intención rinde examen; si falla, se reintenta solo y el
  diálogo limpio; los temas salen del contexto ocupacional de la persona.

## R8 — El ciclo debe decir la verdad en cada paso

- Paso 5 fijo, sin datos reales: `src/features/assistant/recomendar.ts:114-119`.
- No hay forma de cerrar sesión: el único `signOut()` vive en una pantalla de error de acceso
  (`src/features/auth/components/NoAccess.tsx:92`). Riesgo real en computador compartido
  (biblioteca, escuela, gabinete).
- Al volver a entrar, el pasaporte ya emitido no reaparece (`Inicio.tsx:129` + guard de
  `CompartirCredencial.tsx`).
- **Criterio de resuelto:** los cinco pasos reflejan el estado; cerrar sesión existe en `/u`; la
  credencial se restaura al volver.

## R9 — Accesibilidad: mantener el nivel y cerrar los dos avisos

- axe-core en `/u`: **0 violaciones**. En la pantalla de reporte: 2 avisos moderados por `<header>`
  duplicados (convive la barra antigua con la nueva).
- **Criterio de resuelto:** un solo `banner`, 0 violaciones en axe en las tres pantallas del ciclo,
  y la prueba `scripts/a11y-u.mjs` cubriéndolas en CI.

## R10 — El repositorio debe reflejar el producto

- **1 solo commit** con 380.693 líneas: sin historia, sin `blame`, sin etiquetas.
- 853 de 1.212 archivos (25 MB) son `.kiro/`; `docs/` ocupa 6 MB. El código real son 125 archivos.
- 16 de 21 funciones de servidor no están desplegadas. Dos tienen el candado roto si algún día se
  activan: `ghost-approval/index.ts:43-47` (el bloque de autenticación no devuelve ningún rechazo y
  libera dinero) y `send-push/index.ts:119-148` (notifica a toda la base sin preguntar quién llama).
- `README.md` describe Orbe 3D, Academia, Empleos y Billetera (ya no existen). Hay 12 `.md` en la
  raíz, con dos `DEFINICION_OMICROM` solapándose.
- Configura muerta que engaña: `vite.config.ts:36` reserva un trozo para `three` que ya no es
  dependencia (el componente `OrbNeuronal` no existe); `ci.yml` comenta un archivo inexistente
  (`src/lib/supabase.ts`); `.env.example` ofrece cuatro variables que el código jamás lee
  (`VITE_OPENROUTER_KEY`, `VITE_SENTRY_DSN`, `VITE_ANALYTICS_DOMAIN`, `VITE_STRIPE_ENABLED`).
  Consecuencias: no hay monitoreo de errores en producción y, si alguien pusiera una clave de
  OpenRouter en `VITE_OPENROUTER_KEY`, terminaría publicada en el navegador.
- La URL y clave de producción están fijadas en el código (`src/infrastructure/supabase/client.ts:15-17`):
  el sitio de un tercero funciona contra esta base sin configurar nada.
- `scripts/prueba-viva.mjs:159-160` pulsa el botón del asistente dos veces (está en CI → resultados
  frágiles).
- `analytics_events` acepta inserciones de cualquiera (`0068_analytics_events.sql:26-34`) y de ahí
  salen las métricas del producto (`src/shared/utils/analytics.ts:63`).
- **Criterio de resuelto:** el README dice qué es real; no hay funciones ni config que prometan lo
  que el producto no hace; `.kiro/` fuera del producto publicado; los commits vuelven a ser chicos.

## R11 — Dependencias: sólo una toca el navegador

- 2 críticas + 8 altas. **Sólo `zod < 4.6.6`** corre en el sitio; las otras 9 (incluidas `vitest` y
  `tinypool`) son cadena de build/pruebas y se arreglan con subidas de versión aparte.
- **Criterio de resuelto:** `zod` actualizado sin romper validaciones; las mayores (`vite`,
  `vitest`) en su propio PR con las 368 pruebas en verde.

---

## Lo que la auditoría encontró correcto y no debe tocarse

Registrar esto evita que una futura "limpieza" lo rompa.

1. Cero `any`, cero `@ts-ignore`, 8 aserciones en 17.708 líneas. Lint y tipos limpios.
2. Los errores no se tragan: devuelven estado clasificado que la pantalla muestra
   (`src/features/brecha/services/nube.ts:31-52`).
3. Precaución de datos: una copia ilegible **no** se trata como vacía, para no pisar progreso
   (`nube.ts:37-38`).
4. La firma del pasaporte es sólida: no es JWT (no admite el truco del algoritmo "ninguno"), el
   servidor recalcula la firma antes de fiarse (`credential/index.ts:108-113`) y las habilidades se
   leen del servidor (`:75-96`).
5. No hay secretos privados publicados; lo único en el bundle es la clave pública `anon` (correcto).
6. No hay XSS por texto del currículum: nadie inyecta HTML crudo (`dangerouslySetInnerHTML` = 0).
7. Cierre de candados bien hecho en `exam_sessions` (RLS activo y **cero políticas** = deny por
   defecto, `0036_examen_ia.sql:22-23`), `skill_test_attempts`, `omicron_skill_proofs`, `brecha_db`
   (`10012:69-101`, con `revoke all ... from anon, public`).
8. CI buena: tipos + lint + pruebas + build en PR y en `main`, con variables ficticias a propósito.
9. PWA cableada (`public/sw.js`, `src/infrastructure/pwa/update.ts:23`, `manifest.webmanifest`,
   `index.html` con `lang="es"`). **Con una excepción**: el registro de notificaciones nunca ocurre
   (`push.ts` es inalcanzable — ver R19).
10. El micrófono **sí** avisa y muestra el motivo en el chat (`ChatPanel.tsx:257-261` → `decir` →
    `setMensajes` en `:93`), y el botón se oculta si no hay API de voz (`:497`). Una corrección de la
    primera versión de este informe: se había reportado como "falla en silencio" y no es así. El
    defecto real está una capa más abajo y lo describe **R14**, no esto.
11. `stripe-webhook` está bien (firma HMAC verificada + anti-replay); las funciones de pago y de
    examen (`crear-checkout`, `verificar-pago`, `examen-ia`, `simulador-universal`, `credential`)
    sí validan sesión.
12. **Cero `any` en las 17.829 líneas de `src`** (código y tests), cero `@ts-ignore`, cero
    `@ts-expect-error`, `tsconfig.json` en `strict: true`. La sospecha inicial de tipos flojos en las
    rutas de credencial y dinero **no se sostiene**.
13. `src/features/brecha/domain/credencial.ts` (87 líneas) y `domain/validar.ts` (133) son el estándar
    a copiar: guardas `esTexto`/`esNumero`, topes (`MAX_HABILIDADES=50`, `MAX_TEXTO=120`), validación
    de fecha con expresión, y **devuelven `null` en vez de castear**.
14. El flujo núcleo de `/u` sí está bien protegido contra errores: `SubirCv.tsx:139-142` con
    `role="alert"`, tres avisos en `Examen.tsx`, dos banners de nube en `UApp.tsx:236-257`,
    clasificación de errores en `nube.ts:34-35` y `servicios/errores.ts`. **Los problemas de la
    sección F están en la periferia** (voz, analítica, autenticación, stores), no en el ciclo de cinco
    pasos.
15. `docs/fusion/producto-unico.md` es exacto contra el código, y en su línea 163 declara la causa
    raíz de todo el abandono: *"No se borra nada del backend en esta fase"*.

---

## F. Calidad y mantenimiento (segunda revisión, agente de código)

Medido con grafo de importaciones desde `src/main.tsx` y `src/App.tsx`, más cruce de las 94
migraciones contra el código vivo.

### R12 — Un corte de red expulsa a la persona de su sesión. **CRÍTICA**

**Hallazgo:** si `loadProfile` falla por cualquier motivo —incluido un fallo transitorio de red— el
estado pasa a `no_access`, y esa pantalla **solo ofrece cerrar sesión**. No hay botón de reintentar.

- Evidencia: `src/store/ProfileContext.tsx:180-186` (`catch` → `setAuthStatus('no_access')`) →
  `UApp.tsx:138` → `NoAccess.tsx:91-98` (única acción: `supabase.auth.signOut()`).
- Por qué importa: en un producto cuyo valor es la credencial, el peor fallo posible es que una red
  lenta se sienta como un veto. Pesa más que la falta de botón de cerrar sesión en **R8**, que sigue
  siendo real pero es menor.
- **Criterio de resuelto:** `no_access` sólo ante 403/RLS; un fallo de red da estado recuperable con
  "Reintentar" que vuelva a llamar `loadProfile(session)`; prueba automatizada con `fetch` fallando.

### R13 — El navegador escribe la reputación que es dueña el servidor. **CRÍTICA**

**Hallazgo:** dos copias de la fórmula canónica de reputación (cliente y SQL) y, además, el cliente
hace `upsert` del perfil con un puntaje por defecto.

- Evidencia: `src/features/gemelo/services/reputation.ts` (`traditional*0.2 + experience*0.8`,
  `Math.min(15, Math.sqrt(pe)/4)`) frente a `supabase/migrations/0050_reputacion_canonica.sql`
  (`recalc_reputation()`, que aplica `round(..., 2)` a los tres valores → deriva de 0–0,02 acumulado).
  Y `src/store/ProfileContext.tsx:138-162` hace `upsert` desde el navegador con
  `reputation_score: 50`.
- Por qué importa: es un vector de fraude de reputación del mismo estilo que **R2** pero en otra tabla,
  y el resultado del cliente (`gemelo`) **nunca se renderiza** — o sea, se paga el riesgo sin el
  beneficio.
- **Criterio de resuelto:** el servidor es la única fuente; `/u` lee `profiles.reputation_score` sin
  escribirlo; la creación de perfil pasa por una RPC.

### R14 — El micrófono tiene un defecto real una capa debajo del aviso. **ALTA**

**Hallazgo:** `recog.start()` se llama sin capturar. En Chrome y Edge modernos devuelve una promesa
que **rechaza** con `NotAllowedError`; y si lanza de forma síncrona (Safari, o un segundo `start()`),
el error escapa hacia `alternarMicro()`, que tampoco tiene `try/catch`.

- Evidencia: `src/infrastructure/voice/recognition.ts:96` (sin `try/catch`, a diferencia de `:100` que
  sí protege `abort`), tipado como síncrono en `:31`; `src/features/assistant/ChatPanel.tsx:236-270`
  sin protección.
- Por qué importa: clic sin efecto, `escuchando` queda en `false` y **no aparece el aviso** que R12
  de "lo que está bien" sí garantiza en la ruta normal. Y es invisible para la suite **por
  construcción**: `ChatPanel.test.tsx:17` y `UApp.test.tsx:46` mockean `isSpeechAvailable: () => false`.
- **Criterio de resuelto:** capturar el resultado de `start()`, tiparlo como `void | Promise<void>` con
  `.catch()`, envolver `alternarMicro` y que el aviso en español salga igual; un test con
  `isSpeechAvailable: () => true` y `start()` rechazando.

### R15 — El fallo de infraestructura se disfraza de contraseña incorrecta. **ALTA**

- Evidencia: `src/features/auth/components/AuthOverlay.tsx:240-246` — si la RPC
  `get_email_for_login` falla, el camino termina en `throw new Error('Invalid login credentials')`. Y
  `:114-123` `migrateGuestProfile()` cierra con `} catch { /* silencioso */ }` (`:123`).
- Por qué importa: una usuaria con la RPC ausente o rota recibe "correo o contraseña incorrectos" y se
  va para siempre. Y el progreso del modo invitado puede perderse **sin aviso** justo en el momento de
  registrarse — que es la conversión más valiosa del producto.
- **Criterio de resuelto:** mensaje propio para fallo de infraestructura, y el fallo de la migración se
  reporta antes de cerrar la sesión.

### R16 — 99 funciones de privilegio elevado, 35 sin ningún llamador. **ALTA**

- Evidencia: 108 `create function` en las migraciones; restados los llamadores internos del propio SQL
  y los 21 objetivos de `trigger`, quedan **35 huérfanas** (`accept_applicant`, `apply_to_job`,
  `create_escrow_contract`, `release_escrow`, `transfer_tokens`, `send_direct_message`,
  `get_leaderboard`, `get_retention_cohort`, `unfollow_user`, `open_blackbox`…). Ocurrencias de
  `security definer`: **99**.
- Por qué importa: cada `SECURITY DEFINER` huérfana es un camino de escalado vigente y sin prueba. La
  CI de `sql.yml` sólo cubre `supabase/tests/brecha_db.test.sql`.
- **Criterio de resuelto:** migración nueva (no editar las aplicadas) con el `drop function` del lote
  huérfano y su verificación final, replicando el patrón de `10011:46-50`.

### R17 — ≈2.600 líneas se ejecutan para nadie. **MEDIA**

- Evidencia (0 consumidores reales, verificado símbolo a símbolo): `gemelo/services/memory.ts` (457; de
  12 exportaciones sólo se usa `clearMemory`, y desde un `catch` silencioso en
  `ProfileContext.tsx:213`), `store/RealtimeContext.tsx` + `hooks/useRealtimeNetwork.ts` (242; `useRealtime()`
  sin consumidores), `store/NavigationContext.tsx` (43; el `activeTab` que ya no navega),
  `gemelo/services/cvAnalyzer.ts` (348; sólo se importa un tipo), `infrastructure/voice/voiceAnalyser.ts`
  (387; **crea AudioContext y corre FFT** emitiendo eventos sin un solo `addEventListener` en el repo),
  `shared/components/ColorPicker.tsx` (132; `grep "<ColorPicker"` = 0 → la usuaria **no puede elegir su
  color**), `theme/{animations,layout,shadows}.ts` (166), y `shared/components/Toast.tsx` (66).
- Por qué importa: ≈19 % del código no-test sin valor observable, con coste real en tiempo de ejecución
  (canales Realtime abiertos, AudioContext creado, timers) y coste de lectura en cada refactor futuro.
  `Toast.tsx` es el agravante: **el sistema de avisos globales está montado y nadie lo usa**, que es
  exactamente lo que falta para R12, R15 y los nueve `catch(() => {})` de sincronización que enumera
  `tasks.md` en 7.17.4.
- **Criterio de resuelto:** una PR de "podado por consumo", y reactivar `noUnusedLocals`
  (`tsconfig.json`, hoy `false`) como verificador.

### R18 — Tres capas de estilo con cuatro fuentes de paleta. **MEDIA**

- Evidencia: `src/theme/tokens.ts:10-39` (`C.gold '#ffb02e'`) vs `src/index.css:13-27` (bajo el
  comentario *"Single source of truth (mirrors theme/tokens.ts)"* — **no lo espeja**: `--cyan: #5cc8ff`)
  vs `brecha.css:3-27` (`--accent:#f2b134`, que **hace sombra** dentro de `/u`) vs
  `tailwind.config.js` y `shared/services/userColor.ts:17-22`. Medido: 136 `style={{`, 94 literales hex
  (34 distintos), 250 literales `Npx`, frente a 7 archivos que importan `@/theme` y **0** utilidades
  Tailwind. Además `responsive.css` tiene 30 de 35 selectores sin uso y `index.css` 16 de 20.
- Por qué importa: el mismo botón sale ámbar o dorado según el árbol, y ningún cambio de tema es fiable.
  Tailwind corre en cada build para aplicar sólo el preflight.
- **Criterio de resuelto:** una sola fuente declarada; o se usan utilidades Tailwind y se borra
  `theme/tokens.ts`, o se quita Tailwind. Las dos copias conviviendo es el estado que ya no funciona.

### R19 — La página de Términos existe pero es inalcanzable. **ALTA (legal)**

- Evidencia: `src/pages/TerminosServicio.tsx` (378 líneas) es uno de los dos únicos archivos
  estrictamente inalcanzables del repo (`grep` de referencias = 0 fuera de sí mismo). El otro es
  `infrastructure/pwa/push.ts` (121), que nunca se registra pese a existir la función `send-push`.
- Por qué importa: refuerza **R6** — no solo no hay borrado de cuenta, es que **los términos no se
  pueden leer**, mientras `AuthOverlay` da por hecho que la persona los aceptó.
- **Criterio de resuelto:** enlazada desde `AuthOverlay` y el pie de `/u`, o sustituida por el markdown
  estático. `push.ts`: cablear `initPush()` o borrarlo junto con `send-push`.

### R20 — Dependencias vivas para código muerto. **MEDIA**

- Evidencia: `decimal.js` → 0 imports en `src` (y `PRODUCT.md:11` lo cita "para dinero");
  `@tanstack/react-query` → sólo el provider en `App.tsx` y `infrastructure/query/client.ts` (27 líneas)
  con **0 `useQuery`/`useMutation` en todo `src`**. `zod` sí se usa y bien
  (`brecha/domain/validar.ts:10`) — es la actualización de **R11**.
- **Criterio de resuelto:** retirar las dos, con `tsc` y las 368 pruebas en verde.

### R21 — Los tests no cubren donde están los bugs, y protegen código muerto. **ALTA**

- Evidencia: 0 pruebas en `AuthOverlay.tsx` (682, **el archivo más grande de `src`** y donde viven R15 y
  parte de R12), `ResetPasswordOverlay.tsx` (296), `ProfileContext.tsx` (280), voz (1.003 líneas),
  `analytics.ts` y las 4 funciones Edge vivas. Al revés: `cvAnalyzer.test.ts` (178) protege la ruta de CV
  muerta, `NavigationContext.test.tsx` prueba el `activeTab` que nadie renderiza, y `reputation.test.ts`
  está verde **a pesar** del deriva con `0050_reputacion_canonica.sql` porque no la compara. Sin
  provider de cobertura (`grep coverage vite.config.ts package.json` = vacío).
- Por qué importa: un CI verde aquí da falsa confianza — es exactamente lo que permitió que R12 y R15
  llegaran a producción.
- **Criterio de resuelto:** umbral de cobertura por carpeta (`features/brecha` y `store` ≥80 %),
  `ProfileContext.test.tsx` con `fetch` fallando, `AuthOverlay.test.tsx` con RPC ausente, y los tests de
  código podado retirados **en la misma PR** del borrado.

### R22 — `PRODUCT.md` es tan falso como el README. **ALTA**

- Evidencia: `PRODUCT.md:11` declara "TanStack Query 5", "Three.js 0.170 con @react-three/fiber / drei /
  postprocessing" y "`decimal.js` para dinero"; `:17` lista seis dominios que no existen (`academia`,
  `contratos`, `empleos`, `gobernanza`, `market`, `wallet`; los reales son `assistant`, `auth`, `brecha`,
  `gemelo`, `omicron`, `redviva`). Y `:3` se declara "escrito leyendo el código". Agravan:
  `DESIGN.md:151,326,331` prescribe `OrbOnboarding`, `GemeloReveal` y `TabLoader` inexistentes, y `:204`
  documenta el picker de 4 colores que la usuaria no puede usar (R17); `CHANGELOG.md:11` anuncia
  `PerfilSkillVisual.tsx` (no existe) y nada después del 06-ago → **la Fase 5 no está en el changelog**.
- Por qué importa: `PRODUCT.md` es el documento con más apariencia de fuente de verdad y el más falso; es
  el que invita a reintroducir dependencias y dominios retirados.
- **Criterio de resuelto:** `README.md`, `PRODUCT.md` y `DESIGN.md` regenerados desde el grafo real de
  importaciones, con fecha y contraste contra `package.json`; cierre de Fase 5 en `CHANGELOG.md`; y una
  cabecera "estado pre-Fase 5" en `DEFINICION_OMICROM.md` (que cita una función Edge `coach` inexistente),
  `PLAN_PRODUCCION.md` (fechado el 06-ago, habla de 9 hubs y 63 migraciones) y `DEFINICION_OMICROM_v8_BACKEND.md`.

### R23 — Hay una auditoría de seguridad de septiembre sin fusionar. **PRIORIDAD DE LECTURA**

- Evidencia: la rama remota `seguridad/strix-ci` (último commit 07-sep-2026, 120 commits por detrás de
  `main`, sin PR) trae `.security/HALLAZGOS-2026-09.md` y un workflow de pentest. Otras dos ramas en el
  mismo estado: `seguridad/perfil-lista-blanca` (`0083_perfil_lista_blanca.sql`, protege columnas del
  perfil por el lado del `UPDATE` — **complementa R1, no lo duplica**) y `fix/working-openrouter-models`
  (modelos OpenRouter confirmados en `proxy-ai/index.ts` — **insumo directo para R7**).
- Por qué importa: puede que parte de este plan ya esté trabajado, o que haya hallazgos de septiembre que
  nunca se aplicaron. Read antes de escribir código.
- **Criterio de resuelto:** las tres ramas leídas y cada hallazgo marcado como *ya hecho / pendiente /
  descartado* dentro de este plan.


---

## Fuera de alcance de este plan

- Volver a abrir el producto multi-pestaña (Orbe 3D, Academia, Empleos, Billetera).
- Pantalla de pagos, `run-code`, arbitraje y bóveda: no existen en el producto actual.
- Reescaneo del CV: bloqueado por una ventan de 30 días, no es un defecto.
