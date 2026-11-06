# Sistema Ómicrom — Product Record

> **Procedencia.** Este archivo se escribió leyendo el código (`package.json`, `src/features/`, `src/theme/`) y el historial de decisiones ya confirmadas del proyecto — no de una entrevista en vivo. Los hechos derivados del código son verificables ahí mismo. Lo que está marcado _(inferido)_ no fue confirmado por una persona y debería revisarse antes de tratarlo como verdad durable.
>
> **Actualizado el 6 de noviembre de 2026** contra el código de `main`. Las secciones de producto (usuarios, propósito, posicionamiento, principios, marca) son decisiones de la dueña y se conservan; lo que describe el código se corrigió.

## Platform

web

## Stack

React 18 + TypeScript 5.6, Vite 5. Supabase (`@supabase/supabase-js`) para auth, base (Postgres con seguridad por fila) y Edge Functions. Estilos en CSS propio (`src/features/brecha/styles/brecha.css` y `u-app.css`) con tokens de `src/theme/`; Tailwind 3.4 está instalado pero solo aplica su reinicio base (cero clases Tailwind en uso). framer-motion 11 en la pantalla de acceso y el selector de color. `lucide-react` para iconos, `zod` para validar la respuesta de la IA. Lectura del CV en el navegador con PDF.js y Mammoth, cargados desde cdnjs.

No se usan: Three.js (retirado con el orbe), `decimal.js` (0 imports) ni TanStack Query (solo queda el proveedor en `App.tsx`, sin consultas).

Tests con Vitest + Testing Library (`npm run test`, ~400 casos en 40 archivos), typecheck con `tsc --noEmit`, lint con ESLint 9. Además, un recorrido en navegador real con Playwright y una auditoría de accesibilidad con axe en cada PR, y pruebas de las migraciones de seguridad en un Postgres real.

Deploy del frontend en Vercel (`https://sac-omi.vercel.app/u`). La IA va por la Edge Function `proxy-ai` (Google Gemini 3.x primero, modelos gratuitos de OpenRouter de respaldo); voz por `proxy-tts`. Exámenes por `simulador-universal`, credenciales por `credential`, exportar y borrar la cuenta por `mi-cuenta`. Cómo desplegar: `docs/operacion.md`.

Dominios funcionales en `src/features/`: `brecha` (el producto: CV, mapa, reporte, examen, pasaporte, perfil, cuenta), `assistant` (el asistente), `auth`, y restos del producto anterior que todavía usa el producto actual: `gemelo` (lectura del CV, verificación de credenciales), `omicron` (IA del asistente y voz), `redviva` (reglas del examen).

## Users

Profesionales de cualquier disciplina — abogados, ingenieros, médicos, técnicos — que necesitan probar lo que saben hacer sin depender de que alguien les crea el CV. No son necesariamente gente de tecnología, y ese es el punto: la interfaz no puede asumir alfabetización técnica.

Del otro lado, quien contrata y necesita distinguir competencia real de competencia declarada.

## Product Purpose

Medir reputación profesional de forma que no se pueda falsificar.

El modelo es **20/80**: el 20% viene de credenciales declaradas (el CV), el 80% de desempeño demostrado (cursos completados, contratos cumplidos, casos prácticos resueltos, validaciones de colegas). El CV es el punto de partida, no la prueba.

El artefacto central es el **Gemelo Digital**: un perfil vivo que se expande con cada evidencia nueva.

**Lo implementado hoy (noviembre 2026)** es la parte del CV y la de desempeño demostrado por examen, en un ciclo de cinco pasos en `/u`: escanear el CV → mapa de brechas → la persona revisa cuáles son reales → examen calificado por el servidor → pasaporte con sellos y credencial verificable. La reputación de 4 ejes, los cursos, los contratos y las validaciones de colegas del modelo 20/80 **no están implementados** en el producto actual.

## Positioning

"Tu reputación, imposible de falsificar."

El sello es **conocimiento verificable, no declarado**. Todo lo demás del producto se subordina a eso — incluida la interfaz, que no puede afirmar visualmente más de lo que el dato respalda.

## Operating Context

Uso primario en **teléfono**. El shell es una columna de altura completa; solo el área interna scrollea.

Hay un **modo invitado** real: se puede entrar sin cuenta, subir un CV y ver el análisis completo antes de registrarse. Al iniciar sesión, la app **pregunta** si traer los análisis del invitado a la cuenta o descartarlos; nunca los mueve sola. El traspaso es un momento frágil y tiene una regla dura: `UApp` muestra pantallas distintas según `authStatus` (cargando, sin acceso, error recuperable, la app), así que el contenido se desmonta en cada cambio de estado; cualquier cosa que deba sobrevivir ese traspaso **no puede vivir solo en estado o refs de React** — va por `localStorage` (o `sessionStorage`) como puente.

## Capabilities and Constraints

- **Dark-mode only.** No hay tema claro y no se está construyendo uno.
- **El color protagonista es del usuario, no del sistema.** Cada persona elige entre 4 colores para su Gemelo Digital. El color de marca es deliberadamente neutro para no competir.
- **Sin webfonts.** Familia de sistema, para que arranque instantánea en móvil.
- **Nunca datos falsos.** Si el análisis de IA falla, se muestra el error y un botón "Reintentar" — no un resultado inventado. Un "Tech Lead" fabricado para un Ingeniero Industrial destruye la única cosa que el producto vende.
- **Las claves nunca van al cliente.** Nada de secretos con prefijo `VITE_`; todo pasa por Edge Functions.

## Brand Commitments

- El nombre visible es **Ómicrom**, con **M** final. Los identificadores técnicos (claves de `localStorage`, eventos, canales realtime, ids de CSS) son `omicron` con **N** y cambiarlos rompe la app o borra datos de usuarios. Son dos capas distintas y no se mezclan.
- La identidad del usuario se llama **Gemelo Digital**. La vista compartible se llama **Credencial Ómicrom**. "ADN" no se usa como etiqueta de UI.
- **"Verificada" no se muestra por heurística.** Ese sello se reserva para cuando exista un flag real de validación por competencia. Mostrarlo por un umbral de porcentaje sería declarar, no verificar.

## Evidence on Hand

- `src/theme/` — sistema de diseño completo en código (tokens, tipografía, layout, sombras, animaciones). Es la fuente de verdad visual.
- `DESIGN.md` — el mundo visual documentado a partir de ese código.
- `.kiro/steering/` — contexto de proyecto, visión de producto y combos de comandos.
- `docs/auditoria-completa-2026-11-05.md` — qué hay, qué falta y qué está roto, por prioridad.
- `docs/operacion.md` — cómo desplegar y operar hoy.

## Product Principles

1. **Todo suma.** El sistema es un medidor acumulativo: el onboarding genera la base, el CV la **expande** (nunca la reemplaza), cursos y contratos siguen sumando. Los ejes usan `GREATEST`, las skills se **fusionan** por unión, los años usan `GREATEST`. La única excepción son las **penalizaciones** — contratos incumplidos, disputas perdidas — que sí bajan el puntaje.
2. **Cero jerga, cero dudas.** Cada pantalla se tiene que entender sin ambigüedad para cualquier profesional. Siempre **qué** hacer, **por qué**, y **qué gana**.
3. **Cada número lleva su escala.** `65/100`, nunca `65`.
4. **La interfaz no afirma más que el dato.**

## Accessibility & Inclusion

- `prefers-reduced-motion` se respeta, y se implementa en el mismo commit que la animación — no como follow-up. La variante reducida es más suave, no cero.
- El foco siempre es visible y toma el color del usuario. Nunca `outline: none` sin reemplazo.
- El color nunca es el único portador de significado: todo estado tiene label.
- Español neutro latinoamericano, con «tú» (sin voseo); voz neutra latinoamericana en TTS.
- El lenguaje es la barrera de accesibilidad principal de este producto: la regla de cero jerga es una decisión de accesibilidad, no de tono.
