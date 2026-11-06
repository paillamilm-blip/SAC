---
title: Estado actual y traspaso (noviembre 2026)
inclusion: always
---

# Estado actual del proyecto (traspaso entre chats)

Última actualización: **6 de noviembre de 2026**. Si algo de aquí contradice al código o a CI, manda el código.
Qué es el producto y cómo está hecho: `project-context.md`. Qué falta, por prioridad y con evidencia:
`docs/auditoria-completa-2026-11-05.md`. Cómo desplegar: `docs/operacion.md`.

## Repositorio
- **`paillamilm-blip/SAC`**, rama `main`. Producción: https://sac-omi.vercel.app/u (proyecto Vercel `sac-omi`).
  Supabase: `cuwuyqpxaibbqjrvamjb`.
- El PR #1 (`feat/orbe-armonico-consistencia`) es ajeno: no tocarlo. El PR #34 (auditoría del 4-nov) quedó reemplazado
  por la del #39; la dueña decide si se cierra.

## En producción y verificado
- El ciclo completo en `/u`: CV (PDF o Word) → mapa → revisar → examen → pasaporte y credencial. «Mi perfil», el
  asistente conectado al mapa y «Tus datos» (descargar / borrar), en `main`.
- Seguridad de datos, **verificada por la dueña en el SQL Editor**: `profiles` sin lectura anónima (`10013`), lista
  blanca de columnas de `profiles` (`10015`), el examen no se registra desde el cliente (`10011`). Las tablas sociales
  (`10014`) no existen en producción. Las 3 filas de `omicron_skill_proofs` son cuentas de prueba, sin falsificaciones.

## Falta desplegar o aplicar (lo hace la dueña)
1. `supabase functions deploy proxy-ai` (build `6h-json-completo`: arreglo del caso docencia).
2. `supabase functions deploy mi-cuenta` (descargar y borrar la cuenta). Sin esto, «Tus datos» solo funciona sin cuenta.
3. Pegar `10016_borrar_cuenta_sin_bloqueos.sql` en el SQL Editor.

## Siguiente trabajo, por prioridad
1. **Tope de gasto de IA.** Sin sesión, `proxy-ai` salta los créditos; `check_and_consume_credit` siempre permite. **Bloqueado
   por la decisión D1** (¿la IA exige cuenta? recomendación: sí).
2. **Monitoreo de errores** en producción (hoy no hay ninguno).
3. **Examen coherente con la profesión** y con reintento ante 502 (`simulador-universal`, `services/examen.ts`).
4. Errores del micrófono que no avisan (`recognition.ts:96`).
5. CSP a modo bloqueo, tras las pruebas de la dueña con F12; lector de PDF/Word alojado en el sitio (hoy cdnjs);
   `analytics_events` sin escritura anónima.
6. **Al final, a pedido de la dueña:** pruebas unitarias y limpieza (Fase 6 y 7 del spec).

## Decisiones abiertas (preguntar, no suponer)
- **D1:** ¿la IA exige cuenta?
- Razón social del responsable en los documentos legales (hoy un marcador «[completar]»), correos `legal@` y
  `privacy@` (pendientes, y con **N**), revisión de un abogado antes de usuarios reales o de cobrar.
- Migraciones `10003`–`10010` sin aplicar (`10006`–`10008` borran tablas): decidir aparte, nunca con `db push`.
- Las 16 Edge Functions que la app no usa; `decimal.js` y TanStack Query sin uso.
- Modelo de negocio (membresía o premium): después de tener usuarios reales.

## Qué no se pudo verificar nunca
Examen, credencial y borrado de cuenta con una **cuenta real** de punta a punta; voz y micrófono en un dispositivo
real; recuperar contraseña desde el correo real; uso con lector de pantalla; el análisis con **CV reales** (solo
sintéticos: 4 de 5 profesiones bien en la primera medición; docencia fallaba y se corrigió en `proxy-ai`, sin
desplegar).

## Cómo trabajar en este entorno
- **Rama y PR, nunca `main` directo.** PR con `gh api repos/paillamilm-blip/SAC/pulls -f ...` (los subcomandos `gh pr`
  fallan). Fusionar con `gh api -X PUT .../pulls/N/merge -f merge_method=merge` solo si la dueña lo pide.
- **No se puede** instalar paquetes (npm da 403), ni correr Docker, ni alcanzar Vercel o Supabase desde el sandbox.
  **CI de GitHub es el validador real:** esperar `CI` y `Recorrido visual de /u` sobre el último commit y leer los logs
  con `gh api .../actions/jobs/<id>/logs`. Las capturas del recorrido están en el artefacto `visual-u`.
- `/tmp` no se conserva entre llamadas: descargar y leer en el mismo comando, o dentro del repo (y borrarlo antes del commit).
- Chequeo de tipos rápido sin dependencias: un `tsconfig.check.json` temporal con `"types": []` y el `tsc` global,
  filtrando los errores de módulos faltantes. **Borrarlo antes de hacer commit.**
- **Nunca decir «listo» sin que CI lo confirme.** El CI ya dio falsa confianza: el recorrido verificaba la página y no
  el diálogo, y `innerText` omitía lo que quedaba bajo el scroll. Mirar las capturas.
- GitHub devuelve 502/405/422 intermitentes: reintentar con pausas; antes de repetir un merge, comprobar con
  `gh api .../pulls/N --jq .merged`. `git add` con una ruta que ya no existe aborta todo: usar `git add -A`.
- `supabase-js` reintenta solo las lecturas que fallan por red (3 veces, ~7 s): no sumar reintentos propios encima.
- La dueña no es técnica: explicar en lenguaje simple, con lo que tiene que hacer ella separado de lo que hago yo.
