---
inclusion: always
---

# Ómicrom — contexto técnico del proyecto

Actualizado el 6 de noviembre de 2026 contra `main`. Contexto **estable** (qué es y cómo está hecho). El estado del
momento —qué falta, qué está aplicado en producción— está en `estado-actual.md`. Si algo de aquí contradice al código,
manda el código y se corrige este archivo.

## Qué es

Una app web, primero para el teléfono, que muestra a una persona qué le falta frente a un profesional fuerte de su
ocupación y le deja demostrarlo. Un solo producto en `/u` (producción: https://sac-omi.vercel.app/u), en cinco pasos:

1. **Escanear el CV** (PDF o .docx). Se lee en el navegador; a la IA solo viaja el texto.
2. **Mapa de brechas.** La IA compara el CV con la ocupación y nivel. Cada brecha cita el CV o dice «Ausente en el CV:»;
   lo que no se puede respaldar con el texto se descarta (`domain/validar.ts`).
3. **Revisar:** la persona marca cada brecha «Es real» o «No aplica».
4. **Examen** de una brecha reconocida, calificado por el servidor. Aprobado = 70/100 o más.
5. **Pasaporte:** sellos por examen aprobado, imagen descargable y credencial con enlace firmado.

La app anterior (orbe 3D, academia, mercado, contratos, tokens, red social, reputación de 4 ejes) **se retiró** en
noviembre de 2026. Sus documentos están en `docs/legado/`. No reintroducir esos conceptos al describir la app actual.

Las reglas de producto están en `PRODUCT.md`. La más importante: **la interfaz no afirma más que el dato.**

## Stack

React 18 + TypeScript + Vite 5 · Supabase (Postgres con RLS, Auth, Edge Functions en Deno) · Vercel · CSS propio con
tokens (`src/features/brecha/styles/`, `src/theme/`), modo oscuro únicamente · Vitest + Testing Library · Playwright y
axe solo en CI.

## Dónde está cada cosa

| Ruta | Qué hay |
|---|---|
| `src/features/brecha/ui/` | `UApp` (el armazón: sesión, rutas, avisos), `Inicio`, `ReportePage`, `PasaportePage`, `DocumentoLegal`, `ruta.ts` |
| `src/features/brecha/components/` | `SubirCv`, `PanelReporte`, `MapaCapacidades`, `Examen`, `PerfilPanel`, `TusDatos`, `CompartirCredencial` |
| `src/features/brecha/domain/` | Tipos y reglas puras: `validar.ts`, `dominio.ts` (`estaDominada`: única definición de «dominada»), `colores.ts` |
| `src/features/brecha/services/` | `analisisIA.ts` + `promptAnalisis.ts` (análisis), `repositorio.ts` (base local), `nube.ts` (copia en `brecha_db`), `examen.ts`, `credencial.ts`, `pasaporte.ts`, `estandar.ts`, `analisisPerfil.ts`, `cuenta.ts` |
| `src/features/assistant/` | `recomendar.ts` y `responder.ts` (puros, sin IA), `ChatPanel.tsx` |
| `src/features/auth/` | `AuthOverlay`, `NoAccess`, `ErrorPerfil`, `ResetPasswordOverlay` |
| `src/store/ProfileContext.tsx` | Sesión y perfil. Estados: `loading`, `authenticated`, `unauthenticated`, `no_access`, `error_transitorio` |
| `src/features/gemelo`, `omicron`, `redviva` | Restos del producto anterior que el actual todavía usa: lector del CV y verificación de credenciales; IA del asistente y voz; reglas del examen |
| `supabase/functions/` | En uso: `proxy-ai`, `proxy-tts`, `simulador-universal`, `credential`, `mi-cuenta`. Las otras 16 no las llama la app |
| `supabase/migrations/` | Se aplican **a mano** en el SQL Editor (ver `docs/operacion.md`) |
| `scripts/` | `visual-u.mjs` (recorrido), `a11y-u.mjs` (axe), `prueba-viva.mjs` (contra producción), `eval-analisis.mjs` |

## Flujos y reglas que no se rompen

- **Datos:** el análisis vive en `localStorage` (`omicron:brecha:db:v1:<usuario|invitado>`). Con sesión, además una fila
  por persona en `brecha_db`. Lee y fusiona antes de escribir; nunca escribe si no pudo leer.
- **Invitado → cuenta:** los análisis del invitado se **preguntan** (traer o descartar). Nunca se mueven solos.
- **Examen:** el resultado lo escribe solo el servidor (`register_exam_success` está revocado para clientes). El
  contenido de un examen guarda las respuestas correctas: **nunca** exponerlo al navegador ni en exportaciones.
- **Credencial:** se verifica solo con la firma (no consulta la base). Vence a los 12 meses y no se puede revocar antes.
- **IA:** `proxy-ai` prueba Gemini 3.x en escalera y luego OpenRouter. Una respuesta JSON incompleta no cuenta como éxito.
- **`profiles`:** sin lectura anónima (`10013`) y con lista blanca de columnas editables por el cliente (`10015`).
- **Nunca** `supabase db push` ni `migration repair`: `10006`–`10008` borran tablas y no están aplicadas.
- **Marca:** el nombre visible es **Ómicrom** (con M). Los identificadores técnicos (`omicron_*`, claves de
  `localStorage`, eventos) llevan N y no se cambian.

## Comandos

```bash
npm run dev         # http://localhost:5173/u
npm run test        # vitest --run
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
```

`VITE_BRECHA_ANALISIS=demostracion` fuerza la muestra fija del análisis (lo usan el recorrido de CI y las pruebas).

## Documentos

`README.md` (entrada) · `PRODUCT.md` (producto) · `DESIGN.md` (diseño) · `docs/operacion.md` (desplegar y operar) ·
`docs/auditoria-completa-2026-11-05.md` (qué falta, por prioridad) · `.kiro/specs/auditoria-omicrom/` (plan de
remediación) · `TERMINOS_SERVICIO.md`, `POLITICA_PRIVACIDAD.md` (legales; se ven en `/u/terminos` y `/u/privacidad`).
