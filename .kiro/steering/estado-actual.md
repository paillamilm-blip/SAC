---
title: Estado actual y traspaso (noviembre 2026)
inclusion: always
---

# Estado actual del proyecto (traspaso entre chats)

Última actualización: 3 de noviembre de 2026 (fin de sesión). Si algo de aquí contradice al código o a CI, manda el código.

## Qué es esto
Producto único de Ómicrom: la persona sube su CV, ve su **mapa de capacidades**, descubre sus **brechas** y un **asistente de voz y texto** la guía. Vive en `src/features/brecha` (pantallas, dominio) y `src/features/assistant` (chat). Reglas de producto en `PRODUCT.md` (la interfaz no afirma más que el dato; nunca datos falsos; cero jerga; cada número con su escala).

## Repos
- **`paillamilm-blip/SAC`**: hogar nuevo (público, rama `main`, creado el 3-nov-2026). Trabaja aquí.
- `paillamilm-blip/Sistema-omicrom`: el original. Tiene el mismo código hasta `bead844`, pero **no** el PR #2 de SAC. No lo sigas actualizando salvo que se pida.
- SAC tiene el PR #1 abierto (`feat/orbe-armonico-consistencia`), ajeno al trabajo de `/u`.

## Rutas
- Es **un solo producto**. Cualquier dirección que no sea `/u` (la raíz, `/anterior`, enlaces viejos como `/?tab=…`) se reemplaza por `/u`, conservando `?query` y `#hash`. `/u/reporte/:id` es el reporte.
- `?verificar=<token>` (credencial pública) se atiende antes de decidir la ruta. Los perfiles públicos `?perfil=` ya no existen.
- La app anterior (orbe 3D, Academia, Red Viva, Bóveda, `AppShell`) **se retiró el 3-nov-2026** (PR #8, #9 y el de borrado). Recuperable en el historial de git.
- Elección de ruta: `src/App.tsx` y `src/features/brecha/ui/ruta.ts`.

## Qué funciona (verificado por CI y, desde el 3-nov-2026, también en vivo)
- Escaneo real: `cvExtract` lee el PDF en el navegador y a la IA solo viaja el texto (`callAI` → `proxy-ai`). `domain/validar.ts` descarta cualquier evidencia que no sea una «cita literal» presente en el CV o «Ausente en el CV:». Si falla, error y reintentar; nunca cae a la muestra.
- **IA en vivo probada el 3-nov-2026** en `https://sac-omi.vercel.app/u`: dos corridas completas (subir CV → análisis → reporte → confirmar brecha → Diagnóstico) con CV de prueba. `proxy-ai` corre el build `6g-gemini-first-frees-vivos`: Gemini primero en escalera (3.6 → 3.8 → 3.5-lite) y carrera en paralelo de los modelos gratis vivos de OpenRouter como respaldo. El proveedor de análisis reintenta una vez si el modelo devuelve evidencia no verificable (`analisisIA.ts`, con tests).
- `VITE_BRECHA_ANALISIS=demostracion` fuerza la muestra fija (lo usa el recorrido visual de CI y los tests de `UApp`).
- Asistente: una muestra fija se declara «Muestra de ejemplo»; «De tu análisis» solo con análisis real.
- Al iniciar sesión, los análisis del invitado **se preguntan** (traer o descartar); nunca se mueven solos.
- CI de SAC (`typecheck`, `lint`, `vitest`, `build`) y el recorrido visual de `/u` en navegador real pasan en `main`.

## Examen, credencial y asistente (3-nov-2026): en `main`, sin probar con cuenta real
- **Examen en `/u`** (PR #11–#13): «Demostrarlo» abre un examen (3 preguntas + caso + defensa); **aprobado = 70 o más calificado por el servidor**; no existe la autodeclaración (`estaDominada` en `domain/dominio.ts` es la única definición de «dominada»; lo marcado a mano antes se conserva como «sin prueba» y no cuenta). `simulador-universal`: CORS por petición, intento único por sesión (`OPEN → EVALUATING → EVALUATED`), evaluador blindado contra instrucciones dentro de la respuesta, prueba por nombre escrita **solo desde el servidor**. Migración `10011` revoca `register_exam_success` a los usuarios (con `p_score: 100` desde la consola cualquiera quedaba «probado»).
- **Credencial verificable v2** (PR #12 y #15): `credential` firma **solo las habilidades aprobadas con examen**, leídas en el servidor de `omicron_skill_proofs`; vence a los 12 meses; máx. 10 emisiones/hora por persona; no emite sin pruebas (409). Tokens v1 antiguos se siguen verificando. En el Inicio: tarjeta «Comparte lo que demostraste».
- **Asistente** (PR #16): «¿qué he demostrado?» lista los exámenes aprobados; es la **única** respuesta con la etiqueta «Probado».
- **Aplicado por la persona y verificado el 3-nov-2026:** SQL de `10011` a mano en el SQL Editor (`has_function_privilege` → `false, false, true`); `simulador-universal` y `credential` desplegadas (CORS de ambas devuelve `https://sac-omi.vercel.app`); URL de la app agregada en Supabase Auth.
- **Falta desplegar (lo hace la persona):** `supabase functions deploy credential`. El PR #15 la **cambió después** de que se desplegó la versión con CORS; sin este deploy sigue firmando el contenido viejo (reputación, no habilidades).
- ⛔ **NO correr `supabase db push` ni `supabase migration repair`.** La base de producción está en la migración `10002`: `10003`–`10010` **siguen sin aplicarse** y `db push` las aplicaría todas juntas; `10006`/`10007`/`10008` **borran tablas** (`wallet_transactions`, `job_matches`, `freelance_needs`, …). Decidirlas aparte y conscientemente. Las migraciones nuevas se pegan a mano en el SQL Editor (idempotentes). Tampoco marcar `10011` como aplicada.
- ⚠ Antes de compartir credenciales reales, revisar `omicron_skill_proofs`: las filas escritas **antes de `10011`** pudieron falsificarse desde la consola (`select user_id, skill_label, best_score, last_proven_at from omicron_skill_proofs order by last_proven_at desc;`).
- Otras 13 funciones tienen el mismo defecto de CORS (`corsHeaders()` sin `req`); el código vivo solo llama `proxy-ai`, `proxy-tts`, `credential` y `simulador-universal`, así que no se tocaron.

## Guardar en la cuenta (3-nov-2026): código listo, SQL SIN aplicar
- Con sesión iniciada los análisis se guardan además en `brecha_db` (una fila por persona, RLS). **Hasta que la persona pegue `supabase/migrations/10012_brecha_db.sql` en el SQL Editor** (nunca `db push`) la app sigue guardando solo en el navegador y lo dice. Verificar: el `select` final debe dar `true | true | 4 | false | true`.
- **Después de aplicarlo, actualizar `POLITICA_PRIVACIDAD.md`** (hoy dice que los análisis viven solo en el navegador; se dejó así a propósito porque cambiarla antes habría sido falso).
- Diseño, comportamiento (lee y fusiona antes de escribir; nunca escribe si no pudo leer) y pruebas: `docs/plan-de-accion.md` Fase 2. El SQL se prueba en CI contra un Postgres real (`.github/workflows/sql.yml`).

## Endurecimiento (3-nov-2026)
- **CSP en modo «solo reporte»** (`vercel.json`, PR #17). Permite el propio sitio, `cdnjs.cloudflare.com` (PDF.js y mammoth), Google Fonts, el Supabase del cliente (HTTPS y WebSocket) y `blob:` (worker de PDF.js y audio de la voz); sin `eval` ni scripts en línea. Se verifica en tres capas: `scripts/visual-u.mjs` la aplica **en bloqueo** sobre el build; `src/infrastructure/seguridad/csp.test.ts` impide debilitarla y exige que cubra cada CDN/proyecto de Supabase que el código use; `prueba-viva` la mide en producción. En producción, con el flujo completo y un PDF real, **0 violaciones**. **No se ejercen:** voz, sesión iniciada ni examen. **Para activarla:** que la persona haga sus pruebas con la consola (F12) abierta; si no hay avisos «Content-Security-Policy-Report-Only», cambiar la clave a `Content-Security-Policy` (PR de una línea). Si cambia el proyecto de Supabase o se agrega un CDN, hay que actualizar la política (la prueba avisa).
- **Accesibilidad** (PR #18): `scripts/a11y-u.mjs` audita con axe-core (WCAG 2.2 AA) 12 pantallas (móvil y escritorio) y **bloquea el CI**. Primera medición: 3 reglas (contraste de `--dim`, controles anidados y nombre del dropzone), corregidas; hoy 0 violaciones. El examen atrapa y devuelve el foco. **Límite:** axe detecta ~30-40 %; no cubre el examen ni la tarjeta de credencial (exigen sesión) ni el uso real con lector de pantalla. Falta una pasada manual con teclado y VoiceOver/TalkBack.
- **Bug del service worker** (PR #19): la página se **recargaba sola en la primera visita** (`controllerchange` tras `clients.claim()`); borraba lo que la persona hacía. Era también la causa de un fallo intermitente del recorrido de CI. Ahora solo recarga si la persona toca «Actualizar».
- **Limpieza** (PR #20): 34 archivos sin uso, el puente de examen viejo y la prueba e2e de la app anterior. Se conservan `pages/TerminosServicio.tsx` (texto legal por publicar) y `infrastructure/pwa/push.ts`. De las dependencias de producción solo `decimal.js` no la importa nadie: `npm uninstall decimal.js` (exige regenerar `package-lock.json`; no se puede desde el sandbox).
- **GitHub devuelve 502/405/422 intermitentes** al fusionar o empujar: reintentar con pausas de 20-45 s; antes de reintentar un merge, comprobar con `gh api .../pulls/N --jq .merged` que no se haya hecho ya. Un `git add` con una ruta que ya no existe aborta todo el `add` (y el `&&` siguiente): usar `git add -A`.

## Pendiente de la persona (o por dashboard)
1. ~~**Vercel.**~~ **Hecho (3-nov-2026).** Proyecto `sac-omi` (equipo `tuprofendustrial-s-projects`), conectado a SAC. Dominio: **`https://sac-omi.vercel.app`** (producto en `/u`). Sitio probado en vivo el 3-nov-2026.
2. ~~**Supabase → Edge Functions → Secrets `ALLOWED_ORIGINS`.**~~ **Hecho y probado (3-nov-2026):** la llamada cruzada desde `sac-omi.vercel.app` entra a `proxy-ai` sin bloqueo CORS.
3. ~~**Redesplegar las funciones.**~~ **Hecho (3-nov-2026):** `proxy-ai` (build `6g`) y `proxy-tts` redesplegadas con `supabase functions deploy`.
4. ~~**Supabase → Authentication → URL Configuration.**~~ **Hecho por la persona (3-nov-2026):** agregó `https://sac-omi.vercel.app` (sin `/**`; basta, porque la app pide el regreso del correo de «olvidé mi contraseña» a `window.location.origin`). **Sin probar** con un correo real.
5. Pasos detallados en `docs/despliegue-vercel.md`. El estado de Vercel ya aparece en los commits de SAC (`gh api repos/paillamilm-blip/SAC/commits/<sha>/status`, contexto `Vercel`).

## Siguiente trabajo, por prioridad
> El plan por fases, el flujo de la app y los bugs están en **`docs/plan-de-accion.md`** (3-nov-2026). Ahí manda el orden; la lista de abajo es el resumen anterior.

1. **Validar el análisis con CVs reales** (8 a 10 de rubros distintos; meta del plan: al menos 6 de 10 brechas reales). El 3-nov-2026 se probó en vivo con un CV sintético: en la última corrida respondió `gemini-3.5-flash-lite`, el **tercero** de la escalera, o sea que 3.6 y 3.8 fallaron en ese momento; conviene vigilar la calidad con ese modelo. `analisisIA.ts` y `validar.ts` ya tienen tests. Ajustar el prompt en `services/analisisIA.ts` si un rubro falla.
2. ~~Guardar en Supabase~~ (código listo; falta que la persona aplique `10012_brecha_db.sql`, ver arriba).
3. Mapa: habilidades de Ómicrom con porcentaje como nodos sólidos y brechas como nodos huecos. **Acordar el diseño antes de tocar `MapaCapacidades`.**
4. ~~Credencial verificable~~, ~~asistente lee las pruebas~~, ~~retirar la interfaz vieja~~, ~~CSP~~ (en solo reporte), ~~accesibilidad AA~~ (axe), ~~service worker~~ y ~~limpieza~~: hechos. Falta **desplegar `credential`**, **activar la CSP** tras las pruebas de la persona, y **una pasada manual de accesibilidad** (teclado y lector de pantalla).
5. **Páginas legales visibles:** hoy `POLITICA_PRIVACIDAD.md` y `TERMINOS_SERVICIO.md` no se pueden abrir desde la app. Antes de abrirla al público hay que publicarlas (ruta y enlace en el pie). Su contenido (entidad «Ómicron SpA», correo `privacy@omicron.cl (pendiente)`) es decisión de la persona, no se verificó.
6. ~~Actualizar `POLITICA_PRIVACIDAD.md`~~ (hecho). Revisar la sección de exámenes cuando el examen esté en vivo: las respuestas del examen también pasan por IA.

## Decisiones abiertas (preguntar, no suponer)
- SAC público o privado (hoy público; contiene documentos de producto).
- Qué hacer con la revelación inicial, el pasaporte, la Academia y la reputación visible (`docs/fusion/producto-unico.md` §3.4).
- El mapa a 1280×800 **no** está cortado: mide más que la pantalla y se baja con scroll. No es un error.

## Cómo trabajar en este entorno
- **Rama y PR, nunca `main` directo.** PR con `gh api repos/paillamilm-blip/SAC/pulls -f ...` (los subcomandos `gh pr` fallan). Fusionar con `gh api -X PUT .../pulls/N/merge -f merge_method=squash` solo si la persona lo pide.
- **No se puede** instalar paquetes (npm da 403), crear repos (403), ni alcanzar Vercel ni los sitios publicados **desde el sandbox**. **CI de GitHub es el validador real**, y el workflow manual `prueba-viva.yml` (`gh api -X POST repos/paillamilm-blip/SAC/actions/workflows/prueba-viva.yml/dispatches -f ref=main`) sí llega a `sac-omi.vercel.app` y guarda capturas y la respuesta de `proxy-ai`: esperar `CI` y `Recorrido visual de /u` sobre el `head_sha` del push y leer los logs con `gh api .../actions/runs/<id>/logs`.
- Chequeo de tipos rápido sin dependencias: crear `tsconfig.check.json` con `{"extends":"./tsconfig.json","compilerOptions":{"types":[]},"include":["src"]}`, correr `tsc --noEmit -p` con el `tsc` global y filtrar el ruido de módulos faltantes (TS2307, TS7006, TS7026, TS7053, `import.meta.env`). **Borrar ese archivo antes de hacer commit.**
- Nunca decir «listo» sin que CI lo confirme. Se dijo antes que T1–T11 estaban completas sin verificarlo y CI mostró errores de tipos y un crash.
- Marca: el nombre visible es **Ómicrom** (con M). Los identificadores técnicos (`omicron_*`, claves de `localStorage`, eventos) llevan N y no se cambian.
- Los comandos paralelos no esperan entre sí: si un comando depende de otro (merge y luego leer `main`), hacerlos en secuencia.
- Si una herramienta es bloqueada por un hook `PreToolUse`, estaba en `/projects/sandbox/.kiro/hooks/` (fuera del repo) y ya se borró una vez a pedido de la persona.

## Qué no se pudo verificar nunca
El **examen** y la **credencial** de punta a punta (exigen sesión; la prueba en vivo usa invitado; probarlo requeriría una cuenta de prueba como secreto de GitHub), la **voz y el micrófono** en un dispositivo real, **recuperar contraseña** desde el correo real, la **CSP** con voz/sesión/examen, el uso con **lector de pantalla**, y la calidad del análisis con **CVs reales** (solo se probó con un CV sintético).
