# Ómicrom

**Ve qué te separa de un profesional fuerte de tu ocupación, y demuestra lo que sabes hacer.**

Producción: **https://sac-omi.vercel.app/u**

---

## Qué hace hoy

Una aplicación web, pensada primero para el teléfono, en un solo recorrido de cinco pasos:

1. **Escanear tu CV.** Subes tu CV en PDF o Word (.docx). Se lee en tu navegador; a la inteligencia artificial solo viaja su texto. Funciona sin cuenta.
2. **Ver tu mapa.** La IA compara tu CV con lo que suele mostrar alguien de tu ocupación y nivel, y dibuja un mapa de **brechas**. Cada brecha cita tu CV o dice qué no aparece en él. Lo que la IA no puede respaldar con tu texto se descarta.
3. **Revisar tus brechas.** Tú decides cuáles son reales y cuáles no aplican.
4. **Aprender y demostrar.** Para una brecha que reconociste das un examen corto. Lo califica el servidor, no el navegador; con 70 de 100 o más queda aprobado.
5. **Compartir tu pasaporte.** Cada examen aprobado es un sello. Puedes descargar una imagen o crear un enlace firmado que cualquiera verifica, sin cuenta.

Además: un **asistente** que te guía con tus propios datos, puede responder con IA (con cuenta), leer en voz alta y escucharte; **Mi perfil** con lo que se leyó de tu CV, cuánto te falta y el mapa en números; y **Tus datos**, para descargar todo lo que se guarda de ti o borrar tu cuenta.

Las reglas del producto están en [`PRODUCT.md`](./PRODUCT.md); la más importante: **la interfaz no afirma más que el dato.**

## Qué no hace (todavía)

- Solo existe en **español**.
- No lee **Word antiguo (.doc)** ni **escaneos o fotos** (haría falta reconocimiento de texto).
- No cobra nada: no hay pagos, planes ni monedas internas.
- El mercado, los contratos, los tokens y la red social del producto anterior **se retiraron** (ver [`docs/legado/`](./docs/legado/)).

---

## Stack

| Capa | Qué |
|---|---|
| Interfaz | React 18 + TypeScript 5.6, Vite 5. Estilos en CSS propio (`src/features/brecha/styles/`) con tokens de `src/theme/`. Modo oscuro únicamente. |
| Datos y cuentas | Supabase: Postgres con seguridad por fila, autenticación y Edge Functions (Deno). |
| IA | Edge Function `proxy-ai`: Google Gemini 3.x primero, modelos gratuitos de OpenRouter de respaldo. Voz por `proxy-tts`. |
| Lectura del CV | PDF.js y Mammoth, en el navegador. |
| Alojamiento | Vercel (despliega solo con cada cambio en `main`). |

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173/u
```

Sin un proyecto de Supabase propio, la app arranca con el de producción (la clave anónima es pública por diseño; la seguridad la dan las reglas de la base).

| Comando | Qué hace |
|---|---|
| `npm run test` | Pruebas (Vitest + Testing Library) |
| `npm run typecheck` | Tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run build` | Build de producción |

## Dónde está cada cosa

| Ruta | Qué hay |
|---|---|
| `src/features/brecha/` | El producto: subida y análisis del CV, mapa, reporte, examen, pasaporte, perfil, cuenta |
| `src/features/assistant/` | El asistente: recomendaciones, respuestas con datos propios, chat |
| `src/features/auth/` | Acceso, registro, recuperar contraseña |
| `supabase/functions/` | Edge Functions. En uso: `proxy-ai`, `proxy-tts`, `simulador-universal` (examen), `credential`, `mi-cuenta` |
| `supabase/migrations/` | Migraciones SQL. **Se aplican a mano** (ver [`docs/operacion.md`](./docs/operacion.md)) |
| `scripts/` | Recorrido visual, accesibilidad, prueba en vivo y evaluación del análisis |
| `.kiro/specs/auditoria-omicrom/` | Plan de remediación de la auditoría (requisitos, diseño, tareas) |

## Documentos

| Documento | Para qué |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | Qué es el producto, para quién y sus reglas |
| [`DESIGN.md`](./DESIGN.md) | Sistema visual |
| [`docs/operacion.md`](./docs/operacion.md) | Cómo desplegar y operar hoy, y qué **no** hacer |
| [`docs/auditoria-completa-2026-11-05.md`](./docs/auditoria-completa-2026-11-05.md) | Qué hay, qué falta y qué está roto, por prioridad |
| [`TERMINOS_SERVICIO.md`](./TERMINOS_SERVICIO.md) · [`POLITICA_PRIVACIDAD.md`](./POLITICA_PRIVACIDAD.md) | Documentos legales (también en `/u/terminos` y `/u/privacidad`) |
| [`CHANGELOG.md`](./CHANGELOG.md) | Cambios |
| [`docs/legado/`](./docs/legado/) | Documentos del producto anterior, como referencia histórica |
