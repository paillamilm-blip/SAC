---
title: Estado actual y traspaso (noviembre 2026)
inclusion: always
---

# Estado actual del proyecto (traspaso entre chats)

Última actualización: 3 de noviembre de 2026. Si algo de aquí contradice al código o a CI, manda el código.

## Qué es esto
Producto único de Ómicrom: la persona sube su CV, ve su **mapa de capacidades**, descubre sus **brechas** y un **asistente de voz y texto** la guía. Vive en `src/features/brecha` (pantallas, dominio) y `src/features/assistant` (chat). Reglas de producto en `PRODUCT.md` (la interfaz no afirma más que el dato; nunca datos falsos; cero jerga; cada número con su escala).

## Repos
- **`paillamilm-blip/SAC`**: hogar nuevo (público, rama `main`, creado el 3-nov-2026). Trabaja aquí.
- `paillamilm-blip/Sistema-omicrom`: el original. Tiene el mismo código hasta `bead844`, pero **no** el PR #2 de SAC. No lo sigas actualizando salvo que se pida.
- SAC tiene el PR #1 abierto (`feat/orbe-armonico-consistencia`), ajeno al trabajo de `/u`.

## Rutas
- `/` redirige a `/u` (el producto). `/u/reporte/:id` es el reporte.
- `/anterior` es la app de siempre. Sus enlaces con parámetros (`/?tab=…`, perfiles compartidos) siguen en la raíz.
- Elección de ruta: `src/App.tsx` y `src/features/brecha/ui/ruta.ts`.

## Qué funciona (verificado por CI y, desde el 3-nov-2026, también en vivo)
- Escaneo real: `cvExtract` lee el PDF en el navegador y a la IA solo viaja el texto (`callAI` → `proxy-ai`). `domain/validar.ts` descarta cualquier evidencia que no sea una «cita literal» presente en el CV o «Ausente en el CV:». Si falla, error y reintentar; nunca cae a la muestra.
- **IA en vivo probada el 3-nov-2026** en `https://sac-omi.vercel.app/u`: dos corridas completas (subir CV → análisis → reporte → confirmar brecha → Diagnóstico) con CV de prueba. `proxy-ai` corre el build `6g-gemini-first-frees-vivos`: Gemini primero en escalera (3.6 → 3.8 → 3.5-lite) y carrera en paralelo de los modelos gratis vivos de OpenRouter como respaldo. El proveedor de análisis reintenta una vez si el modelo devuelve evidencia no verificable (`analisisIA.ts`, con tests).
- `VITE_BRECHA_ANALISIS=demostracion` fuerza la muestra fija (lo usa el recorrido visual de CI y los tests de `UApp`).
- Asistente: una muestra fija se declara «Muestra de ejemplo»; «De tu análisis» solo con análisis real.
- Al iniciar sesión, los análisis del invitado **se preguntan** (traer o descartar); nunca se mueven solos.
- CI de SAC (`typecheck`, `lint`, `vitest`, `build`) y el recorrido visual de `/u` en navegador real pasan en `main`.

## Pendiente de la persona (o por dashboard)
1. ~~**Vercel.**~~ **Hecho (3-nov-2026).** Proyecto `sac-omi` (equipo `tuprofendustrial-s-projects`), conectado a SAC. Dominio: **`https://sac-omi.vercel.app`** (producto en `/u`). Sitio probado en vivo el 3-nov-2026.
2. ~~**Supabase → Edge Functions → Secrets `ALLOWED_ORIGINS`.**~~ **Hecho y probado (3-nov-2026):** la llamada cruzada desde `sac-omi.vercel.app` entra a `proxy-ai` sin bloqueo CORS.
3. ~~**Redesplegar las funciones.**~~ **Hecho (3-nov-2026):** `proxy-ai` (build `6g`) y `proxy-tts` redesplegadas con `supabase functions deploy`.
4. **Supabase → Authentication → URL Configuration:** agregar el dominio nuevo. Pendiente (dashboard).
5. Pasos detallados en `docs/despliegue-vercel.md`. El estado de Vercel ya aparece en los commits de SAC (`gh api repos/paillamilm-blip/SAC/commits/<sha>/status`, contexto `Vercel`).

## Siguiente trabajo, por prioridad
1. **Validar el análisis con CVs reales** (8 a 10 de rubros distintos; meta del plan: al menos 6 de 10 brechas reales). El 3-nov-2026 se probó en vivo con un CV de prueba (2 corridas completas); falta la matriz de rubros y los CVs reales de la persona. `analisisIA.ts` ya tiene tests; faltan los de `validar.ts`. Ajustar el prompt en `services/analisisIA.ts` si un rubro falla.
2. Guardar en Supabase (tablas `brecha_*` con RLS) en vez de `localStorage`.
3. Mapa: habilidades de Ómicrom con porcentaje como nodos sólidos y brechas como nodos huecos. **Acordar el diseño antes de tocar `MapaCapacidades`.**
4. «Dominar» con examen real (`simulador-universal`, `register_exam_success`) y credencial verificable. Hoy «dominada» es autodeclarada.
5. Retirar la interfaz vieja, cabeceras CSP (probarlas con la app viva: PDF.js viene de cdnjs, además voz y Supabase), accesibilidad AA, actualización del service worker dentro de `/u`.
6. Actualizar `POLITICA_PRIVACIDAD.md`: el texto del CV pasa por Gemini u OpenRouter.

## Decisiones abiertas (preguntar, no suponer)
- SAC público o privado (hoy público; contiene documentos de producto).
- Qué hacer con la revelación inicial, el pasaporte, la Academia y la reputación visible (`docs/fusion/producto-unico.md` §3.4).
- El mapa a 1280×800 **no** está cortado: mide más que la pantalla y se baja con scroll. No es un error.

## Cómo trabajar en este entorno
- **Rama y PR, nunca `main` directo.** PR con `gh api repos/paillamilm-blip/SAC/pulls -f ...` (los subcomandos `gh pr` fallan). Fusionar con `gh api -X PUT .../pulls/N/merge -f merge_method=squash` solo si la persona lo pide.
- **No se puede** instalar paquetes (npm da 403), crear repos (403), ni alcanzar Vercel ni los sitios publicados. **CI de GitHub es el validador real**: esperar `CI` y `Recorrido visual de /u` sobre el `head_sha` del push y leer los logs con `gh api .../actions/runs/<id>/logs`.
- Chequeo de tipos rápido sin dependencias: crear `tsconfig.check.json` con `{"extends":"./tsconfig.json","compilerOptions":{"types":[]},"include":["src"]}`, correr `tsc --noEmit -p` con el `tsc` global y filtrar el ruido de módulos faltantes (TS2307, TS7006, TS7026, TS7053, `import.meta.env`). **Borrar ese archivo antes de hacer commit.**
- Nunca decir «listo» sin que CI lo confirme. Se dijo antes que T1–T11 estaban completas sin verificarlo y CI mostró errores de tipos y un crash.
- Marca: el nombre visible es **Ómicrom** (con M). Los identificadores técnicos (`omicron_*`, claves de `localStorage`, eventos) llevan N y no se cambian.
- Los comandos paralelos no esperan entre sí: si un comando depende de otro (merge y luego leer `main`), hacerlos en secuencia.
- Si una herramienta es bloqueada por un hook `PreToolUse`, estaba en `/projects/sandbox/.kiro/hooks/` (fuera del repo) y ya se borró una vez a pedido de la persona.

## Qué no se pudo verificar nunca
IA en vivo con un CV real, voz y micrófono en un dispositivo real, recorrido con sesión iniciada, y cualquier cosa que dependa de Vercel o Supabase.
