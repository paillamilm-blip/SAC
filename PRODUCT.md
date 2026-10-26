# Sistema Ómicrom — Product Record

> **Procedencia.** Este archivo se escribió leyendo el código (`package.json`, `src/features/`, `src/theme/`) y el historial de decisiones ya confirmadas del proyecto — no de una entrevista en vivo. Los hechos derivados del código son verificables ahí mismo. Lo que está marcado _(inferido)_ no fue confirmado por una persona y debería revisarse antes de tratarlo como verdad durable.

## Platform

web

## Stack

React 18 + TypeScript 5.6, Vite 5. Supabase (`@supabase/supabase-js`) para auth, base y Edge Functions. TanStack Query 5 para estado de servidor. framer-motion 11 para animación. Three.js 0.170 con `@react-three/fiber` / `drei` / `postprocessing` para el orbe. Tailwind 3.4 está instalado, pero las pantallas premium usan objetos de estilo inline con los tokens de `src/theme/` (cero clases Tailwind). `lucide-react` para iconos, `zod` para validación, `decimal.js` para dinero.

Tests con Vitest + Testing Library (`npm run test`), typecheck con `tsc --noEmit`, lint con ESLint 9. CI corre los tres.

Deploy del frontend en Vercel (`https://sistema-omicrom.vercel.app`). La IA va por la Edge Function `proxy-ai` (OpenRouter primario, Gemini `gemini-2.0-flash` de respaldo); TTS por `proxy-tts`.

Dominios en el código (`src/features/`): `academia`, `auth`, `gemelo`, `omicron`, `redviva`. Los dominios `chat`, `contratos`, `empleos`, `gobernanza`, `market`, `wallet` existen solo en documentación/migraciones: son **visión**, no capacidad, y ninguna pantalla debe asumir que funcionan.

## Users

Profesionales de cualquier disciplina — abogados, ingenieros, médicos, técnicos — que necesitan probar lo que saben hacer sin depender de que alguien les crea el CV. No son necesariamente gente de tecnología, y ese es el punto: la interfaz no puede asumir alfabetización técnica.

Del otro lado, quien contrata y necesita distinguir competencia real de competencia declarada.

## Product Purpose

Medir reputación profesional de forma que no se pueda falsificar.

El modelo es **20/80**: el 20% viene de credenciales declaradas (el CV), el 80% de desempeño demostrado (cursos completados, contratos cumplidos, casos prácticos resueltos, validaciones de colegas). El CV es el punto de partida, no la prueba.

El artefacto central es el **Gemelo Digital**: un perfil vivo que se expande con cada evidencia nueva.

## Positioning

"Tu reputación, imposible de falsificar."

El sello es **conocimiento verificable, no declarado**. Todo lo demás del producto se subordina a eso — incluida la interfaz, que no puede afirmar visualmente más de lo que el dato respalda.

## Operating Context

Uso primario en **teléfono**. El shell es una columna de altura completa; solo el área interna scrollea.

Hay un **modo invitado** real: se puede entrar sin cuenta, hacer el onboarding, subir un CV y ver el análisis completo antes de registrarse. El traspaso invitado → autenticado es un momento frágil del producto y tiene una regla dura: `App.tsx` remonta el árbol al cambiar `authStatus`, así que cualquier estado que deba sobrevivir ese traspaso **no puede vivir solo en estado o refs de React** — va por `localStorage` como puente.

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

## Product Principles

1. **Todo suma.** El sistema es un medidor acumulativo: el onboarding genera la base, el CV la **expande** (nunca la reemplaza), cursos y contratos siguen sumando. Los ejes usan `GREATEST`, las skills se **fusionan** por unión, los años usan `GREATEST`. La única excepción son las **penalizaciones** — contratos incumplidos, disputas perdidas — que sí bajan el puntaje.
2. **Cero jerga, cero dudas.** Cada pantalla se tiene que entender sin ambigüedad para cualquier profesional. Siempre **qué** hacer, **por qué**, y **qué gana**.
3. **Cada número lleva su escala.** `65/100`, nunca `65`.
4. **La interfaz no afirma más que el dato.**

## Accessibility & Inclusion

- `prefers-reduced-motion` se respeta, y se implementa en el mismo commit que la animación — no como follow-up. La variante reducida es más suave, no cero.
- El foco siempre es visible y toma el color del usuario. Nunca `outline: none` sin reemplazo.
- El color nunca es el único portador de significado: todo estado tiene label.
- Español rioplatense, voz neutra latinoamericana en TTS.
- El lenguaje es la barrera de accesibilidad principal de este producto: la regla de cero jerga es una decisión de accesibilidad, no de tono.
