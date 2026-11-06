> **Documento histórico (movido aquí el 6 de noviembre de 2026).** Describe el producto anterior a la unificación en `/u` (orbe, academia, mercado, contratos, tokens, red social o reputación de 4 ejes), que se retiró en noviembre de 2026. No describe la app actual: para eso, ver [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md) y [`docs/operacion.md`](../operacion.md).

# PLAN · Aprendizaje Continuo en Tiempo Real

**Objetivo del producto:** que cualquier paso de aprendizaje que dé una persona se refleje
**al instante** en su Gemelo Digital y en su red — sin recargar, sin perder datos al cambiar
de dispositivo, y con activity real (no simulada) en el orbe.

**Métrica única del proyecto:**
> Número de pasos de aprendizaje completados que se ven en el Gemelo y en la red
> en tiempo real (< 3 segundos), medido con dos sesiones conectadas a la vez.
> Hoy: 0. Meta: todos los tipos de paso (lección, quiz, examen, reto diario, racha).

---

## FASE 1 · Arranque verificado (el producto funciona en local con datos reales)

**Para qué:** antes de construir nada nuevo, confirmamos que el ciclo actual funciona
de punta a punta contra tu Supabase real.

| # | Paso | Hecho cuando |
|---|------|--------------|
| 1.1 | Crear `.env.local` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_OPENROUTER_KEY` del proyecto Supabase real | `npm run dev` arranca sin warnings de configuración |
| 1.2 | Instalar dependencias y pasar los chequeos base | `npm run typecheck`, `npm run lint` y `npm run test` en verde |
| 1.3 | Aplicar las migraciones pendientes al proyecto Supabase (si es un proyecto nuevo) | Las tablas de academia (`academy_courses`, `exam_sessions`, etc.) existen y tienen datos semilla |
| 1.4 | Verificar que las Edge Functions necesarias estén desplegadas (`proxy-ai`, `tutor`, `examen-ia`, `run-code`, `simulador-universal`, `register_daily_activity`) | Cada función responde sin error desde la UI |
| 1.5 | Recorrido manual del ciclo completo: login → subir CV → completar lección → pasar quiz → ver el Gemelo actualizado | El recorrido se completa sin pasos rotos ni mensajes "no está desplegada la función" |

**Criterio de salida:** un usuario real completa una lección y la reputación/PE del Gemelo
sube visible en la misma sesión.

---

## FASE 2 · Racha única server-side (el "continuo" no depende del navegador)

**Para qué:** hoy la UI lee la racha del `localStorage` (`StreakBanner`, `profile.ts`)
aunque ya existe el registro server-side `register_daily_activity`. Cambiar de dispositivo
o limpiar el navegador destruye la racha — eso rompe el aprendizaje *continuo*.

| # | Paso | Hecho cuando |
|---|------|--------------|
| 2.1 | Crear/confirmar la vista o RPC server-side que devuelve racha e historial desde la BD | Existe `get_streak()` (o equivalente) alimentada por `register_daily_activity` |
| 2.2 | `StreakBanner`, `DailyChallengeCard` y el Gemelo leen la racha desde la BD, con el localStorage solo como caché offline | Desconectar el internet muestra la última racha; reconectar la actualiza desde el servidor |
| 2.3 | Retos diarios: el estado "ya hecho hoy" se consulta al servidor, no a `localStorage` | El mismo reto no puede completarse dos veces desde dos dispositivos |

**Criterio de salida:** la racha mostrada es **idéntica** en dos dispositivos distintos
logueados con la misma cuenta, tras 2 días de actividad.

---

## FASE 3 · Tiempo real del aprendizaje (la promesa "al instante")

**Para qué:** el realtime de Supabase hoy cubre chat, empleos, notificaciones y reputación,
pero **la Academia no emite ni recibe push**. Y el orbe emite actividad inventada
(`OrbShell.tsx` ~L1023) en lugar de aprendizajes reales.

| # | Paso | Hecho cuando |
|---|------|--------------|
| 3.1 | Emitir un evento broadcast al completar lección / quiz / examen / reto diario (con dados reales: skill, PE ganado) | El evento sale del cliente solo con datos validados server-side |
| 3.2 | Suscribir la red/orbe a esos eventos y mostrarlos como actividad **real**; eliminar el broadcast simulado | El ticker del orbe solo muestra aprendizajes auténticos |
| 3.3 | Suscribir la Academia a `postgres_changes` de `user_lesson_progress` y `exam_sessions` | Un progreso hecho en el dispositivo A aparece en la pantalla abierta del dispositivo B sin recargar |
| 3.4 | Medir: dos sesiones conectadas, completar un paso en A, cronometrar aparición en B | ≤ 3 segundos, en 10 intentos seguidos |

**Criterio de salida:** la métrica única del proyecto deja de ser 0: un paso de aprendizaje
hecho en un dispositivo se ve en el Gemelo **y** en la red del otro en menos de 3 segundos.

---

## Qué queda fuera de este plan (decisión consciente)

- **Copiloto IA del simulador** (`code-tutor`): sigue desactivado a propósito por el piloto
  controlado; se reactiva en una fase aparte cuando el piloto termine.
- **Coach como Edge Function** declarada en `DEFINICION_OMICROM.md`: innecesaria — el coach
  determinista en cliente + `proxy-ai` ya cumplen la función. Actualizamos la documentación
  en lugar de construir la función.
- **"Siguiente mejor paso"**: hoy es simulación declarada; volverlo a mutar estado real es
  un producto nuevo, no parte de esta promesa.

## Riesgos principales

1. **Credenciales/deploy**: si las Edge Functions no están desplegadas en tu proyecto
   Supabase, la Fase 1 se detiene ahí. Se resuelve con la guía `GUIA_ACTIVACION_PRODUCCION.md`.
2. **Flood de canales realtime** (Fase 3): cada suscripción extra consume conexiones;
   se reutiliza el canal `omicron-live` existente en lugar de abrir canales nuevos.
3. **RLS**: emitir/recibir progreso ajeno puede filtrar datos; toda emisión pasa por
   servidor antes de mostrarse en la red.

---

## Orden y dependencia

Fase 1 → Fase 2 → Fase 3. Ninguna fase empieza con la anterior sin criterio de salida
cumplido. Duración estimada: Fase 1 = 1 sesión de trabajo; Fases 2 y 3 = 1–2 sesiones cada una.
