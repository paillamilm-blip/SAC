# Análisis de impacto y colisiones — `brecha` (App B) sobre Ómicrom

| Campo | Valor |
|---|---|
| Estado | **Borrador.** TAREA-24 depende de la TAREA-20 (documentar variables de entorno) y esta aún no se ejecutó |
| Insumos | [`app-b-inventario.md`](./app-b-inventario.md) · [`../audit.md`](../audit.md) · [`../design.md`](../design.md) |
| Base | Ómicrom `043dc47`, `brecha` `4a3ebfc` |

## Resumen

1. **El hallazgo que cambia el diseño:** `brecha` es una aplicación con servidor Node (Next.js, escritura en disco, clave de IA en el servidor). Ómicrom es una SPA estática (Vite) cuyo único backend es Supabase. No se pueden "unir" sin decidir primero dónde vive el servidor de `brecha`. `design.md` §2.4 asumía que la App B entraba como una feature más; con este análisis esa suposición queda **parcialmente falsa** y se reemplaza por la decisión de §3.
2. No hay colisión de nombres de tablas ni de dependencias de ejecución (`brecha` solo usa `next`, `react`, `react-dom`). Las colisiones reales son de **versión de React**, de **estilos globales** y de **duplicación de lógica de IA y de CV**.
3. Hay una **oportunidad** de producto sin coste de integración: ambas apps parten del mismo objeto (el CV) y de la misma identidad (`userId`).

## 1. Colisiones de nombres y compatibilidad

| Eje | Ómicrom | `brecha` | Severidad | Resolución propuesta |
|---|---|---|---|---|
| Runtime | SPA estática en Vercel; backend solo Supabase (Postgres, Auth, Edge Functions en Deno) | Servidor Node (App Router, rutas API, `fs`) | **Alta** | Decisión §3 |
| Framework | Vite 5 | Next 16 (Turbopack) | Alta | No mezclar bundles. §3 |
| React | 18.3 | 19.3 | Alta si comparten bundle | Portar a 18 solo si se integra como feature; verificar que no se usen APIs de 19 (los 5 componentes cliente usan hooks y `next/*`, nada más) |
| TypeScript | 5.6 estricto | 7.0 | Media | Al portar, compila con el `tsconfig` de Ómicrom |
| Alias `@/` | `./src/*` | `./*` | Baja | Se reescriben los imports al portar |
| Estilos | Estilos en línea con tokens de `src/theme/`; Tailwind casi sin uso | 1 573 líneas de CSS global en `app/globals.css` | **Media** | Un CSS global afectaría a toda Ómicrom. Acotar con prefijo de clase (`.brecha-*`) o CSS Modules, o migrar a tokens de `src/theme/` (regla R-17 y diseño §2.2) |
| Identidad | `auth.users.id` = `profiles.id` | Constante `"usuario-local"` | Media | Compatible por diseño: toda fila ya lleva `userId` |
| Persistencia | Postgres con RLS | JSON y PDFs en disco | **Alta** | Tablas nuevas + Supabase Storage (§4) |
| IA | Edge Function `proxy-ai`: texto, `AIMessage.content: string`, Gemini primero y OpenRouter de respaldo | Llamada directa a Gemini con el PDF en base64 | **Alta** (duplicación) | `proxy-ai` hoy **no admite adjuntos**. Reutilizarlo exige ampliar su contrato o crear una función propia (§5) |
| Lectura del CV | En el cliente: PDF.js y Mammoth desde CDN (`cvExtract.ts`), luego análisis local + IA | El PDF completo al modelo | Media | Dos pipelines distintos sobre el mismo documento (§6) |
| Rutas | Navegación por estado (`TabId`), un `?verificar=` | `/`, `/reporte/[id]` | Media | No hay router en Ómicrom: la ruta `/reporte/[id]` no existe allí |
| Límite de uso | `_shared/rateLimit.ts` (`checkRateLimit`) y `_shared/iaCredits.ts` (`checkAndConsumeCredit`), verificados en el código | Contador global `uso` en JSON, tope 10 | Media | Sustituir `uso` por el mecanismo existente (§5) |
| Variables de entorno | `GEMINI_API_KEY` (Edge Functions) | `GEMINI_API_KEY` (servidor Next) | Baja | Mismo nombre, sistemas distintos: sin choque si se despliegan separados; si se porta a Edge Function, comparten el secreto |
| `localStorage` | 9 claves `omicron_*` | Ninguna | Ninguna | — |
| Service worker / manifest | `public/sw.js` único | Ninguno | Ninguna | — |
| Nombres de tablas | 59 existentes | `cvs`, `analisis`, `brechas`, `uso` (propuestas) | Baja | Ninguna existe hoy. Usar prefijo `brecha_` para no depender de esa suerte (diseño §4.6) |
| Idioma de la interfaz | Español latinoamericano neutro (R-17) | Español neutro ("Sube tu CV") | Baja | Revisar textos al portar |

## 2. Qué es compatible sin tocar nada

- Modelo de datos con `userId` en cada fila: se mapea a `profiles(id)`.
- Dominio puro: `lib/types.ts` y `lib/comparar.ts` no dependen de Node ni de Next. Se mueven tal cual a `src/domain/` o a la feature.
- Los 5 componentes cliente hablan con el servidor solo por `fetch('/api/...')`: cambiar el destino a Edge Functions es un ajuste de una línea por llamada (`SubirCv.tsx:53`, `PanelReporte.tsx:103`).
- Adaptador de IA (`lib/ai/index.ts`) ya aísla el proveedor, y `fixture` sirve como proveedor de pruebas sin coste.

## 3. Decisión de arquitectura (ADR-004, reemplaza la suposición de §2.4)

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| **A. Dos apps, un solo Supabase** | `brecha` sigue como app Next.js independiente. Comparte proyecto Supabase: Auth, `profiles` y tablas `brecha_*` con RLS | Esfuerzo mínimo; `brecha` puede validar la fase 1b ya; no se toca Ómicrom | Dos despliegues, dos bundles, dos CSS; el usuario salta entre dos URLs; la "fusión" es solo de datos e identidad |
| **B. Portar `brecha` a Ómicrom como feature** | UI a `src/features/brecha/`; las 2 rutas API a Edge Functions; `store.ts` a tablas Postgres y PDFs a Supabase Storage | Un producto, un despliegue, una sesión; reutiliza `profiles`, `rateLimit`, `iaCredits` y el secreto de Gemini | Mayor esfuerzo (ver tabla abajo); riesgo de regresión en Ómicrom si el CSS global no se acota |
| C. Migrar Ómicrom a Next.js | Reescribir el shell de Ómicrom | Un solo framework | Reescritura de un producto en producción sin beneficio que lo justifique. **Descartada** |

**Recomendación: B, precedida de un tramo de A** (a decidir por el dueño):
1. La fase 1b de `brecha` (validar con 10 CVs reales que ≥6/10 brechas son reales) solo necesita una clave de Gemini y **no depende de la integración**. Conviene medirla antes de invertir en el port: si el modelo no produce brechas útiles, portar el código no arregla el problema (lo dice su propio README: sería el prompt, no la interfaz).
2. En paralelo, ejecutar las tareas 01–23 de `tasks.md`, que no dependen de la App B y que el port necesita igualmente (capa de datos, `domain/`, entorno, CI).
3. Portar (opción B) solo cuando la métrica de 1b lo justifique.

Esfuerzo estimado del port (opción B), medido sobre el código actual:

| Pieza | Líneas | Trabajo |
|---|---|---|
| Componentes cliente (5) | 1 057 | Ajustar `next/link` y `next/navigation`; cambiar destino de `fetch`; acotar CSS |
| `app/page.tsx`, `app/reporte/[id]/page.tsx` | 159 | **Reescribir**: hoy son componentes de servidor que leen el store; pasan a cliente con carga de datos por hook |
| `app/api/*` (2 rutas) | 126 | Reescribir como Edge Functions (Deno) |
| `lib/store.ts` | 182 | Reescribir contra Postgres y Storage |
| `lib/ai/gemini.ts`, `validar.ts`, `index.ts`, `fixture.ts` | 356 | Mover a la Edge Function; `fixture` se conserva para pruebas |
| `lib/types.ts`, `lib/comparar.ts` | 175 | Mover casi sin cambios a `src/domain/` |
| `app/globals.css` | 1 573 | Acotar o migrar a tokens |

## 4. Impacto en datos (si se elige B o A)

Tablas nuevas, solo con migraciones nuevas de 14 dígitos (regla R-04). Propuesta sujeta a TAREA-25:

| Tabla | Contenido | Notas |
|---|---|---|
| `brecha_cvs` | `id`, `user_id → profiles(id) on delete cascade`, `nombre_archivo`, `mime`, `tamanio`, `storage_path`, `subido_en` | `storage_path` reemplaza `ruta`. PDF en un bucket privado |
| `brecha_analisis` | `id`, `cv_id`, `user_id`, `creado_en`, `proveedor`, `simulado`, `ocupacion`, `nivel`, `resumen`, `fortalezas jsonb` | |
| `brecha_brechas` | `id`, `analisis_id`, `categoria`, `titulo`, `evidencia`, `por_que_importa`, `severidad`, `aprender jsonb`, `veredicto`, `veredicto_en`, `dominada_en` | `check` sobre `categoria`, `severidad` y `veredicto` |
| (uso diario) | No se crea tabla: se reutiliza `rate_limits` / `_shared/rateLimit.ts` | Evita un segundo contador |

- RLS desde la primera migración: cada fila visible y editable solo por su `user_id` (`auth.uid() = user_id`).
- Los PDFs contienen datos personales. Bucket privado, URL firmada de corta duración, y política de retención definida (hoy `brecha` no borra nada).
- **Sin migración de datos:** el repositorio no contiene análisis ni CVs (`data/` está ignorado).
- Ningún cambio sobre `profiles`, `credentials` ni las 92 migraciones existentes.

## 5. Impacto en Edge Functions y secretos

| Cambio | Detalle |
|---|---|
| Nuevas | `brecha-analizar` (reemplaza `POST /api/analisis`) y `brecha-veredicto` (reemplaza `PATCH /api/brechas/:id`). Convención de diseño §5.2 |
| `proxy-ai` | **No se modifica.** Su contrato (`messages: string`) no admite PDF. Ampliarlo cambiaría una función en producción de la que depende Ómicrom entera |
| Secretos | Reutiliza `GEMINI_API_KEY`. Sin variables nuevas salvo `ANALISIS_PROVEEDOR` y `ANALISIS_TOPE_DIARIO` (a documentar en TAREA-20) |
| Tamaño de petición | `brecha` acepta PDF de hasta 15 MB (base64 ≈ 20 MB). **No comprobado** si las Edge Functions de Supabase admiten ese tamaño de cuerpo; verificar con la documentación vigente antes de elegir B. Alternativa: subir el PDF a Storage y pasar solo la referencia a la función |
| Costes y cuota | Un PDF en base64 consume más tokens que el texto extraído. Con la cuota gratuita compartida con Ómicrom, `brecha` puede agotar la de `proxy-ai`. Medir en la fase 1b |

## 6. Solapamiento de producto (oportunidad, no colisión)

| Ómicrom | `brecha` | Posible unión |
|---|---|---|
| `AnalyzedProfile`: habilidades del CV con nivel (`skills_detail[].pct`) | Brechas por categoría con evidencia citada | Una brecha confirmada ("Es real") es un nodo **hueco** natural en la Red Viva |
| Red Viva: "cada cosa que tu CV afirma sin probar es un nodo hueco" | "aprender.comoLoDemuestro": prueba observable | La prueba de cierre de `brecha` encaja con el examen de la Academia (`register_exam_success`) |
| Reputación 20/80 (afirmaciones frente a pruebas) | Veredicto de la persona + `dominadaEn` | **Ojo:** el veredicto es una opinión del propio usuario; no debe alimentar la reputación (que es solo servidor, regla R-03) sin una prueba verificable |

Esto es una **hipótesis de diseño para una fase posterior**. No se incluye en las tareas de consolidación.

## 7. Cambios en código existente de Ómicrom

| Archivo | Cambio | Solo si |
|---|---|---|
| `src/types/common.ts` | Añadir un valor a `TabId` | Opción B |
| `src/store/NavigationContext.tsx`, `src/App.tsx` | Registrar la pestaña y carga perezosa | Opción B |
| `.env.example`, `supabase/functions/.env.example` | Documentar variables nuevas | Opción B |
| Ninguno más | — | — |

Con la opción A no se modifica nada de Ómicrom.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Portar antes de validar la hipótesis (≥6/10 brechas reales) | Hacer 1b antes del port (§3) |
| CSS global rompe Ómicrom | Acotar con prefijo o tokens; prueba visual antes de fusionar |
| Datos personales de CVs en un servicio de IA sin pago | Decisión del dueño sobre servicio de pago y política de privacidad (inventario §9) |
| `brecha` sin autenticación desplegada públicamente | No desplegar `brecha` fuera de local hasta tener login (B-01) |
| Cuota de Gemini compartida | Medir consumo en 1b; separar claves si hace falta |

## 9. Preguntas para el dueño

1. ¿Opción A (dos apps, mismo Supabase) como paso previo, o directamente B?
2. ¿Se mide la fase 1b (10 CVs reales) antes de portar?
3. ¿Se activa el servicio de pago de Gemini para procesar CVs de usuarios reales, y se actualiza `POLITICA_PRIVACIDAD.md`?
4. ¿La marca "Es real" del usuario debe influir en algo de Ómicrom, o queda aislada por ahora?
