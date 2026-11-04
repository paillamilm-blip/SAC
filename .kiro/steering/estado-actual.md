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

## Examen para «Dominar» (3-nov-2026): construido, NO desplegado ni probado
- **Código en `main`** (PR #11 y #12): `simulador-universal` con CORS por petición, intento único por sesión (`OPEN → EVALUATING → EVALUATED`), evaluador blindado contra instrucciones dentro de la respuesta, y registro de la prueba por nombre **solo desde el servidor**; `credential` con CORS por petición (sin eso `?verificar=` estaba bloqueado desde `sac-omi`); `_shared/llm.ts` con escalera de Gemini. Migración `10011_examen_solo_servidor.sql`: revoca `register_exam_success` a los usuarios (con `p_score: 100` desde la consola cualquiera quedaba «probado»).
- **Falta desplegarlo (lo hace la persona):** `supabase functions deploy simulador-universal` y `supabase functions deploy credential`, y aplicar el SQL de `10011` **a mano en el SQL Editor** (las dos sentencias `do $do$ … $do$` y el `notify`; es idempotente). Verificar con `select has_function_privilege('authenticated','public.register_exam_success(text,integer,text)','execute');` → debe dar `false`.
- ⛔ **NO correr `supabase db push` ni `supabase migration repair` por esto.** En producción (3-nov-2026) la base está en la migración `10002`: `10003`–`10010` **siguen sin aplicarse** y `db push` las aplicaría todas juntas. `10006`/`10007`/`10008` son recortes que **borran tablas** (`wallet_transactions`, `job_matches`, `freelance_needs`, …) con sus propias puertas; decidirlas aparte y conscientemente. Tampoco marcar `10011` como aplicada: `10006` vuelve a conceder `register_exam_success` a `authenticated`, y al aplicarse todo en orden `10011` (la última) lo vuelve a cerrar.
- **Pantalla del examen: PR #13** (abierto, CI verde). Fusionarlo **después** de desplegar. «Demostrarlo» abre el examen dentro de `/u`; aprobado = 70 o más calificado por el servidor; no existe la autodeclaración. Detalle en `docs/plan-de-accion.md` fase 3.
- **Credencial verificable v2 (PR de la credencial, 3-nov-2026):** `credential` ahora firma **solo las habilidades que la persona aprobó con examen**, leídas en el servidor de `omicron_skill_proofs` (nombre, mejor puntaje, fecha); ya no firma reputación ni niveles de nodo. Vence a los 12 meses, máximo 10 emisiones por hora por persona, y no emite nada si no hay pruebas (409). Los tokens v1 antiguos se siguen verificando. En `/u`: tarjeta «Comparte lo que demostraste» en el Inicio (con sesión y ≥ 1 dominada) crea el enlace. **Hay que volver a desplegar:** `supabase functions deploy credential`. Ojo: las filas de `omicron_skill_proofs` escritas **antes de la migración 10011** pudieron ser falsificadas desde la consola; conviene revisarlas antes de compartir credenciales (`select user_id, skill_label, best_score, last_proven_at from omicron_skill_proofs order by last_proven_at desc;`).
- **Hay otras 13 funciones con el mismo defecto de CORS** (`corsHeaders()` sin `req`); el código vivo solo llama `proxy-ai`, `proxy-tts`, `credential` y `simulador-universal`, así que no se tocaron.

## Pendiente de la persona (o por dashboard)
1. ~~**Vercel.**~~ **Hecho (3-nov-2026).** Proyecto `sac-omi` (equipo `tuprofendustrial-s-projects`), conectado a SAC. Dominio: **`https://sac-omi.vercel.app`** (producto en `/u`). Sitio probado en vivo el 3-nov-2026.
2. ~~**Supabase → Edge Functions → Secrets `ALLOWED_ORIGINS`.**~~ **Hecho y probado (3-nov-2026):** la llamada cruzada desde `sac-omi.vercel.app` entra a `proxy-ai` sin bloqueo CORS.
3. ~~**Redesplegar las funciones.**~~ **Hecho (3-nov-2026):** `proxy-ai` (build `6g`) y `proxy-tts` redesplegadas con `supabase functions deploy`.
4. **Supabase → Authentication → URL Configuration:** agregar `https://sac-omi.vercel.app` y `https://sac-omi.vercel.app/**`. **Pendiente (dashboard)** y ahora importa más: sin eso los correos de confirmación y de «olvidé mi contraseña» llevan al dominio anterior, y la recuperación de clave ya vive dentro de `/u`.
5. Pasos detallados en `docs/despliegue-vercel.md`. El estado de Vercel ya aparece en los commits de SAC (`gh api repos/paillamilm-blip/SAC/commits/<sha>/status`, contexto `Vercel`).

## Siguiente trabajo, por prioridad
> El plan por fases, el flujo de la app y los bugs están en **`docs/plan-de-accion.md`** (3-nov-2026). Ahí manda el orden; la lista de abajo es el resumen anterior.

1. **Validar el análisis con CVs reales** (8 a 10 de rubros distintos; meta del plan: al menos 6 de 10 brechas reales). El 3-nov-2026 se probó en vivo con un CV sintético: en la última corrida respondió `gemini-3.5-flash-lite`, el **tercero** de la escalera, o sea que 3.6 y 3.8 fallaron en ese momento; conviene vigilar la calidad con ese modelo. `analisisIA.ts` y `validar.ts` ya tienen tests. Ajustar el prompt en `services/analisisIA.ts` si un rubro falla.
2. Guardar en Supabase (tablas `brecha_*` con RLS) en vez de `localStorage`.
3. Mapa: habilidades de Ómicrom con porcentaje como nodos sólidos y brechas como nodos huecos. **Acordar el diseño antes de tocar `MapaCapacidades`.**
4. ~~Credencial verificable~~ (construida, falta desplegar `credential` y probarla). Pendiente: que el asistente lea las pruebas para rotular «Probado».
5. ~~Retirar la interfaz vieja~~ (hecho). Quedan huérfanos fuera de las 4 features (ver `docs/plan-de-accion.md` §3.5). Cabeceras CSP (probarlas con la app viva: PDF.js viene de cdnjs, además voz y Supabase), accesibilidad AA, actualización del service worker dentro de `/u`.
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
El **examen** de punta a punta (exige sesión y la prueba en vivo usa invitado; probarlo en vivo requeriría una cuenta de prueba como secreto de GitHub), IA con un CV real de la persona, voz y micrófono en un dispositivo real, recuperar contraseña desde el correo, y emitir/verificar una credencial.
