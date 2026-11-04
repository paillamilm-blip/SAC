---
title: Plan de remediación post-auditoría (4 de noviembre de 2026)
inclusion: manual
---

# Requisitos — qué está mal y cómo se ve "resuelto"

Este documento nace de una auditoría con evidencia ejecutada (no solo lectura de código):
ciclo de uso completo contra producción, 368 pruebas automatizadas, lint y tipos en verde,
build, `npm audit`, axe-core sobre la app viva, revisión de las 94 migraciones y de las 21
funciones de servidor.

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
   `index.html` con `lang="es"`).
10. El micrófono **sí** avisa y muestra el motivo en el chat (`ChatPanel.tsx:257-261` → `decir` →
    `setMensajes` en `:93`). Una corrección de la primera versión de este informe: se había reportado
    como "falla en silencio" y no es así.
11. `stripe-webhook` está bien (firma HMAC verificada + anti-replay); las funciones de pago y de
    examen (`crear-checkout`, `verificar-pago`, `examen-ia`, `simulador-universal`, `credential`)
    sí validan sesión.

---

## Fuera de alcance de este plan

- Volver a abrir el producto multi-pestaña (Orbe 3D, Academia, Empleos, Billetera).
- Pantalla de pagos, `run-code`, arbitraje y bóveda: no existen en el producto actual.
- Reescaneo del CV: bloqueado por una ventan de 30 días, no es un defecto.
