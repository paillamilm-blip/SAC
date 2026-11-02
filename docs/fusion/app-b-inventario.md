# Inventario de la App B — `brecha`

| Campo | Valor |
|---|---|
| Repositorio | `paillamilm-blip/brecha` (confirmado por el dueño como la App B el 2026-11-02) |
| Commit analizado | `4a3ebfc` en `main` ("Renombrar el paquete a brecha, igual que el repo") |
| Historial | 2 commits, ambos del 2026-11-02 (`19e84a0`, `4a3ebfc`) |
| Método | Lectura estática del código clonado. No se ejecutó (ver "No verificado") |
| Tarea | TAREA-02 de [`../tasks.md`](../tasks.md) |

## 1. Qué hace

Recibe un CV en PDF, identifica ocupación y nivel, lo compara contra el perfil de un profesional fuerte de la misma ocupación y devuelve entre 6 y 10 brechas. Cada brecha lleva evidencia citada del CV, severidad, por qué importa y un plan de aprendizaje con la prueba de que se cerró. La persona marca cada brecha como "Es real" o "No aplica". Esa marca alimenta la métrica del producto: brechas confirmadas por análisis (meta: al menos 6 de cada 10).

## 2. Estado y fases (según su README)

| Fase | Contenido | Estado |
|---|---|---|
| 1a | App completa local, sin claves, con análisis simulado | Hecha |
| 1b | Conectar Gemini y validar con 10 CVs reales que ≥6/10 brechas sean confirmadas | Pendiente |
| 2 | Supabase (login multiusuario), tope diario y cola | Pendiente |
| 3 | Plan de aprendizaje persistente (el re-análisis ya compara contra el CV anterior) | Parcial |

## 3. Stack y tamaño

| Aspecto | Valor |
|---|---|
| Framework | Next.js `^16.4.3`, App Router, Turbopack |
| React / TypeScript | React `^19.3.1` / TypeScript `^7.0.2` |
| Dependencias de ejecución | Solo `next`, `react`, `react-dom`. Sin SDK de IA (llama a Gemini por REST), sin librería de estilos ni de iconos, sin validador (valida a mano en `lib/ai/validar.ts`) |
| Archivos versionados | 25 + `package-lock.json` |
| Código TS/JS | 2 172 líneas |
| CSS | 1 573 líneas en un único `app/globals.css` |
| Pruebas | Ninguna |
| CI | Ninguno |
| Alias | `@/*` → `./*` (raíz del repo) |

## 4. Estructura

| Ruta | Líneas | Rol | Tipo |
|---|---|---|---|
| `app/page.tsx` | 118 | Inicio: lista análisis y métrica global. Lee `lib/store` directamente | **Servidor** |
| `app/reporte/[id]/page.tsx` | 41 | Reporte de un análisis. Lee `lib/store` directamente | **Servidor** |
| `app/layout.tsx` | 43 | Layout raíz | Servidor |
| `app/api/analisis/route.ts` | 77 | `POST`: recibe el PDF (multipart), aplica tope diario, llama al proveedor, guarda | API |
| `app/api/brechas/[id]/route.ts` | 49 | `PATCH`: marca veredicto o "dominada" | API |
| `components/SubirCv.tsx` | 140 | Subida del CV (`fetch('/api/analisis')`) | Cliente |
| `components/EscaneoCv.tsx` | 74 | Animación mientras analiza | Cliente |
| `components/MapaCapacidades.tsx` | 439 | Visualización del mapa de capacidades | Cliente |
| `components/PanelReporte.tsx` | 390 | Reporte de brechas (`fetch('/api/brechas/:id')`) | Cliente |
| `components/BotonNuevoAnalisis.tsx` | 14 | Navegación | Cliente |
| `lib/ai/index.ts` | 26 | Elige proveedor por `ANALISIS_PROVEEDOR` | Servidor |
| `lib/ai/gemini.ts` | 122 | Llamada REST a Gemini con el PDF en base64 (`inlineData`), `temperature 0.3`, salida JSON | Servidor |
| `lib/ai/fixture.ts` | 130 | Análisis simulado sin IA | Servidor |
| `lib/ai/validar.ts` | 78 | Extrae y valida el JSON de la IA | Servidor |
| `lib/comparar.ts` | 67 | Aparea brechas de dos análisis por similitud de tokens (umbral 0,4) | Puro |
| `lib/store.ts` | 182 | Persistencia en `data/db.json` y PDFs en `data/uploads/`. Usa `fs` | Servidor |
| `lib/types.ts` | 108 | Tipos del dominio | Puro |
| `tools/generar-pdf-ejemplo.mjs` | 63 | Genera un PDF de prueba | Herramienta |

## 5. Modelo de datos (tomado de `lib/types.ts`)

```
Db { cvs: Cv[]; analisis: Analisis[]; uso: Record<fecha, number> }

Cv        { id, userId, nombreArchivo, mime, tamanio, ruta, subidoEn }
Analisis  { id, cvId, userId, creadoEn, proveedor, simulado,
            ocupacion, nivel, resumen, fortalezas[], brechas[] }
Brecha    { id, categoria: dura|blanda|conocimiento|credencial,
            titulo, evidencia, porQueImporta, severidad: alta|media|baja,
            aprender: { que, como, comoLoDemuestro },
            veredicto: confirmada|rechazada|null, veredictoEn, dominadaEn }
```

- Toda fila lleva `userId`. Hoy es la constante `"usuario-local"` (`lib/store.ts`), pensada para que el login de la fase 2 no obligue a migrar datos.
- No hay datos previos que migrar: `data/` está en `.gitignore`, así que el repositorio no contiene ningún análisis ni CV.

## 6. Interfaz HTTP

| Método y ruta | Entrada | Salida | Errores |
|---|---|---|---|
| `POST /api/analisis` | multipart, campo `cv` (solo `application/pdf`, ≤ 15 MB) | `{ ok, id, ocupacion, brechas }` | 400, 413, 415, 429 (tope diario o cuota), 502 |
| `PATCH /api/brechas/:id` | JSON `{ analisisId, veredicto }` o `{ analisisId, dominada: true }` | brecha actualizada | 400, 409 (dominar sin haber confirmado) |

## 7. Variables de entorno

| Variable | Uso | Por defecto |
|---|---|---|
| `ANALISIS_PROVEEDOR` | `fixture` o `gemini` | `fixture` |
| `GEMINI_API_KEY` | Clave de Google AI Studio | — |
| `GEMINI_MODELO` | Modelo | `gemini-2.5-flash` |
| `ANALISIS_TOPE_DIARIO` | Análisis reales por día | `10` |

## 8. Hallazgos propios de la App B

| ID | Sev. | Hallazgo |
|---|---|---|
| B-01 | Alto | Sin autenticación: toda petición actúa como `usuario-local`. Cualquiera con acceso a la URL lee y marca todos los análisis. No es desplegable públicamente tal cual |
| B-02 | Alto | Persistencia en el disco del servidor (`fs`). En funciones serverless el disco no es persistente, así que `store.ts` no sirve para producción en Vercel |
| B-03 | Alto | Privacidad: el CV completo (datos personales) se envía a Gemini con una clave gratuita. Según los términos de la API de Gemini, el contenido enviado a servicios sin pago puede usarse para mejorar productos de Google, y para usuarios del EEE, Suiza y Reino Unido se exige el servicio de pago. Ver §9 |
| B-04 | Medio | El tope diario (`uso`) es un contador global en un JSON, no por usuario. Se pisaría con varios usuarios o instancias |
| B-05 | Medio | Sin pruebas ni CI. `lib/comparar.ts` (aparea por tokens) y `lib/ai/validar.ts` son la lógica con más riesgo y no tienen cobertura |
| B-06 | Bajo | `Cv.ruta` guarda la ruta absoluta del PDF en el servidor. Verificado con `grep`: solo se escribe en `lib/store.ts` y no llega al cliente (a los componentes solo viaja `nombreArchivo`). Al pasar a Postgres debe sustituirse por una clave de Storage, no por una ruta de disco |
| B-07 | Bajo | `catch` de `/api/analisis` decide 429 por `mensaje.includes("cuota")`: acoplamiento frágil al texto del error |
| B-08 | Bajo | `typescript ^7.0.2`, `next ^16.4.3`, `@types/node ^26.6.5`: versiones muy por delante de Ómicrom (TS 5.6, React 18). No se pudo comprobar su existencia en el registro desde el sandbox, aunque el `package-lock.json` las fija |

## 9. Nota sobre privacidad (B-03)

Fuente: [Términos adicionales de la API de Gemini](https://ai.google.dev/gemini-api/terms) y las citas en el foro oficial [discuss.ai.google.dev](https://discuss.ai.google.dev/t/google-ai-pro-ai-studio-privacy-does-one-billed-api-project-protect-playground-chats-from-training/183321/3). Contenido parafraseado: con el servicio sin pago, Google usa lo que se envía y las respuestas para mejorar sus productos y tecnologías de aprendizaje automático. Es una restricción legal y de producto, no técnica, y aplica también a Ómicrom, que usa Gemini primero en `proxy-ai`. Antes de abrir el análisis de CVs a usuarios reales hay que decidir si se activa el servicio de pago y qué dice `POLITICA_PRIVACIDAD.md`. **No es asesoría legal.**

## 10. No verificado

| Qué | Motivo |
|---|---|
| `npm install`, `typecheck`, `next build` | El registro npm del sandbox devuelve 403; además no hay CI |
| Comportamiento real con Gemini | Sin clave; la fase 1b está pendiente según su propio README |
| Calidad de las brechas (≥6/10) | Es precisamente la hipótesis de la fase 1b, aún sin medir |
| Que `data/` no se haya subido en otra rama | Solo se clonó `main` |
