# Producto único — asistente digital de aprendizaje continuo

| Campo | Valor |
|---|---|
| Estado | **Propuesta para aprobación del dueño.** Reemplaza la opción A (dos apps) de ADR-004 |
| Fecha | 2026-11-02 |
| Insumos | [`app-b-inventario.md`](./app-b-inventario.md) · [`impacto.md`](./impacto.md) · [`visual-brecha/`](./visual-brecha/README.md) · [`../audit.md`](../audit.md) · [`../design.md`](../design.md) |
| Pedido del dueño | Un solo sistema: **login de entrada, escáner del CV, el mapa mental** y todo lo de `brecha` que Ómicrom no tiene; de Ómicrom, **el asistente de voz**, para unificar todo en un asistente digital. Que no se pierda lo mejor de Ómicrom |

---

## 1. La idea en una frase

Una persona entra, **escanea su CV**, ve su **mapa de capacidades**, descubre sus **brechas**, **aprende y lo demuestra con una prueba**, y todo el tiempo un **asistente de voz** la guía. Al volver a escanear, el sistema muestra qué brechas cerró.

## 2. El ciclo del producto

```
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                  ASISTENTE DE VOZ (transversal, siempre disponible)       │
   │        "¿qué me falta?" · "léeme el diagnóstico" · "empecemos el examen"  │
   └──────────────────────────────────────────────────────────────────────────┘
        │            │              │               │               │
   1. ENTRAR → 2. ESCANEAR CV → 3. MAPA → 4. BRECHAS → 5. APRENDER Y → 6. CREDENCIAL
   (login +      (PDF, animación    (mapa de   (Es real /   DEMOSTRAR     VERIFICABLE
    invitado)     de escaneo)       capacidades) No aplica,  (examen con    (?verificar=)
                                                 plan de      prueba)
                                                 la semana)
        ▲                                                                       │
        └───────────────  7. VOLVER A ESCANEAR → "brechas cerradas / nuevas" ◄──┘
```

| Paso | Qué ve la persona | Origen |
|---|---|---|
| 1. Entrar | Login, registro, recuperar contraseña; puede probar como invitado y guardar al registrarse | **Ómicrom** (`features/auth`, `shared/utils/guestMode.ts`) |
| 2. Escanear CV | Subir PDF, animación de escaneo con hitos | **brecha** (`SubirCv`, `EscaneoCv`) |
| 3. Mapa | Mapa de capacidades: nodos que se encienden al reconocerlos | **brecha** (`MapaCapacidades`) |
| 4. Brechas | Cola de revisión con evidencia, "qué aprender / cómo / cómo lo demuestro" | **brecha** (`PanelReporte`) |
| 5. Aprender y demostrar | Examen de la habilidad; la brecha pasa a "dominada" **con prueba** | **Ómicrom** (`simulador-universal`, `register_exam_success`, `omicron_skill_proofs`) |
| 6. Credencial | Pasaporte verificable por enlace, sin cuenta | **Ómicrom** (`credential`, `get_public_credential`, `?verificar=`) |
| 7. Re-escaneo | Qué brechas se cerraron y cuáles son nuevas | **brecha** (`comparar.ts`) |
| Asistente | Voz y texto, guía proactiva, comandos | **Ómicrom** (Oráculo) |

## 3. Qué se conserva, qué se reemplaza

Tamaños medidos sobre el código actual de ambos repositorios.

### 3.1 De Ómicrom: lo que se conserva

| Pieza | Tamaño | Por qué |
|---|---|---|
| **Asistente de voz y Oráculo**: `infrastructure/voice/*` (999 líneas), `omicron/services/{voice,oraculo,brain,emotion,tools}.ts` (783), `OmicronBar.tsx` (216) | ≈ 2 000 líneas | Es lo que pediste. Es TypeScript de navegador; ninguno de esos archivos lee `import.meta.env`. El único acople real es `TabId` en `oraculo.ts` y `brain.ts` (navegación por pestañas), que se reasigna a las rutas nuevas |
| **Login y modo invitado**: `features/auth/*` (1 184 líneas), `ProfileContext`, `guestMode.ts` | ≈ 1 200 líneas | Es "el login de entrada". El modo invitado permite escanear el CV antes de registrarse |
| **Backend completo**: Supabase (Auth, Postgres, RLS, 92 migraciones), `proxy-ai`, `proxy-tts`, `credential` | | No se borra nada del backend en esta fase. Es la base sobre la que se construye |
| **Motor de pruebas**: `simulador-universal`, `register_exam_success`, `omicron_skill_proofs`, `omicron_ensure_skill_node` | | Es lo que le falta a `brecha` (ver §4.1) |
| **Credencial verificable** y **reputación calculada solo en el servidor** | | Diferenciador de Ómicrom: evidencia, no declaración |
| **Retención**: racha server-side, `daily_activity`, notificaciones push | | Es el "aprendizaje continuo": hace volver a la persona |

### 3.2 De `brecha`: todo el frontend y la lógica del flujo

| Pieza | Tamaño | Destino |
|---|---|---|
| 5 componentes cliente | 1 057 líneas | `src/features/brecha/components/` |
| 2 páginas (hoy de servidor) | 159 líneas | Se reescriben como pantallas de cliente |
| `app/globals.css` | 1 573 líneas | Se acota con prefijo/CSS Modules para no afectar al resto |
| `lib/types.ts`, `lib/comparar.ts` | 175 líneas | `src/domain/brecha/` casi sin cambios |
| `app/api/*` + `lib/store.ts` + `lib/ai/*` | 664 líneas | **Se reescriben** como Edge Function + tablas Postgres (ver §5) |

### 3.3 De Ómicrom: lo que se reemplaza por la versión de `brecha`

| Pieza actual | Tamaño | Reemplazo |
|---|---|---|
| Shell y home con orbe y pestañas (`OrbShell.tsx`) | 1 691 líneas | Shell de `brecha` (cabecera + barra inferior de 3 pestañas) |
| Red Viva (`features/redviva`, 1 911 líneas con servicios y hooks) | 1 911 líneas | Mapa de capacidades de `brecha`. Los servicios que leen pruebas (`omicron_skill_proofs`) se conservan para el estado "probado" |
| Análisis de CV en el navegador (`cvAnalyzer`, `cvExtract` con PDF.js desde CDN) | | Escaneo de `brecha` (el modelo lee el PDF) |
| Pantallas de `gemelo` (3 387 líneas) y `academia` (2 237 líneas) | 5 624 líneas | Se reutilizan los servicios (2 056 y 122 líneas); la UI se rehace en el estilo de `brecha` (§3.4) |
| Resto de componentes de `omicron` (revelación, onboarding, guía del orbe, 3 959 líneas sin `OmicronBar`) | 3 959 líneas | Se retiran, salvo lo que se decida en §3.4 |

### 3.4 Pendiente de decidir (no se toca hasta que respondas)

| Pieza | Pregunta |
|---|---|
| `GemeloReveal` y onboarding con orbe | ¿Se conserva la revelación "WOW" tras el primer escaneo, con el estilo nuevo? |
| `CredencialModal` (831 líneas) y Pasaporte | ¿El pasaporte verificable es parte del ciclo (paso 6) desde el primer lanzamiento? |
| Academia (cursos, lecciones, quiz) | ¿Es el contenido con el que se "aprende" en el paso 5, o solo se usa el examen? |
| Reputación 20/80 con 4 ejes | ¿Se muestra al usuario o queda como motor interno? |

## 4. Lo mejor de cada lado, y por qué se unen así

### 4.1 `brecha` termina donde Ómicrom empieza
En `brecha`, una brecha pasa a "dominada" cuando la persona lo dice (`marcarDominada` exige solo que antes haya marcado "Es real"). Es una autodeclaración. Ómicrom ya resolvió esa pregunta: su modelo es "20 % afirmaciones + 80 % pruebas", con exámenes por habilidad y un libro de pruebas (`omicron_skill_proofs`). Conectar ambos da una brecha que se cierra **con evidencia**, y deja de ser una opinión. Es la pieza que falta en la fase 3 del propio README de `brecha` ("falta el plan de estudio sostenido").

### 4.2 El mapa y la Red Viva son la misma idea
La Red Viva de Ómicrom ("nodo hueco = lo que tu CV afirma sin probar; sólido = probado") y el mapa de `brecha` ("cada nodo que reconoces se enciende") cuentan lo mismo con otra gráfica. El producto único conserva **un solo mapa** (el de `brecha`, que es el que te encantó) y le añade el estado "probado" que viene de Ómicrom.

### 4.3 La voz como interfaz del ciclo
El Oráculo hoy navega por 3 pestañas y habla de temas que ya no existen. En el producto único su vocabulario pasa a ser el del ciclo: "escanear mi CV", "¿qué brechas tengo?", "léeme la primera", "marcarla como real", "empezar el examen de esa habilidad". Esto es un cambio de configuración de intenciones (`NAV`, `NAV_NATURAL`, `TOOL_CATALOG`), no una reescritura de la voz.

## 5. Arquitectura objetivo

**Base: el repositorio `Sistema-omicrom` (Vite + React + Supabase).** `brecha` aporta el frontend y la lógica del flujo; no se ejecuta como servidor aparte.

```
Navegador (SPA Vite, React 18)
 ├─ shell de brecha (cabecera · barra de 3 pestañas · CSS acotado)
 ├─ features/brecha   (escanear · mapa · brechas · diagnóstico · comparación)
 ├─ features/auth     (login de entrada · invitado)
 ├─ assistant/        (voz + Oráculo, capa global)        ← de Ómicrom
 └─ domain/brecha     (tipos y comparar, lógica pura)
        │ supabase-js (JWT del usuario, RLS)
        ▼
Supabase
 ├─ Postgres: brecha_cvs · brecha_analisis · brecha_brechas · brecha_uso   (RLS)
 ├─ Edge Function brecha-analizar   (PDF → Gemini → guarda análisis)        ← reescribe app/api/analisis
 ├─ Edge Functions existentes: proxy-ai · proxy-tts · simulador-universal · credential
 └─ RPC existentes: register_exam_success · omicron_ensure_skill_node · get_public_credential …
```

**Por qué esta base y no Next.js** (decisión técnica; si prefieres Next.js, dímelo y se replantea):
- Todo lo que sobrevive de Ómicrom es código de navegador más Supabase. Todo lo que sobrevive de `brecha` en el frontend es React plano más CSS: solo usa `next/link` y `next/navigation`.
- Pasar a Next.js obligaría a operar un servidor Node y a reconectar la sesión de Supabase entre servidor y navegador, sin ganar nada visible. El producto resultante tiene **el frontend de `brecha`** igualmente.
- Se aprovecha lo que Ómicrom ya tiene: CI (`typecheck`, `lint`, `test`, `build`), 26 archivos de prueba, despliegue en Vercel y PWA.
- Se necesita un enrutador (`/` y `/reporte/:id`). Ómicrom navega por estado. Opciones: `react-router-dom` (dependencia nueva, exige ADR) o un enrutador mínimo propio sobre la API History. Se decide en la TAREA-34.

### Datos
- Tablas `brecha_*` nuevas con RLS (`auth.uid() = user_id`), migraciones de 14 dígitos, sin tocar las 92 existentes. Detalle de columnas en [`impacto.md`](./impacto.md) §4.
- **Decisión de privacidad por defecto: no guardar el PDF.** Verifiqué que `brecha` nunca vuelve a leer el archivo guardado (`Cv.ruta` solo se escribe). Si la función recibe el PDF, lo envía al modelo y descarta, no hay archivo personal que proteger ni retener. Solo se guardan los metadatos y el análisis.
- Solo el servidor (función con `service_role`) inserta análisis. La persona puede leer los suyos y actualizar únicamente `veredicto`, `veredicto_en` y, hasta la TAREA-37, `dominada_en`, mediante `GRANT` por columna (misma lección que H-02). `dominada_en` empieza autodeclarada, igual que en `brecha`, y la TAREA-37 revoca ese permiso: pasa a ser **solo por RPC con prueba** (§4.1).

## 6. Fases y tamaño

La primera fase entrega algo que ya se puede probar de punta a punta.

| Fase | Qué queda funcionando | Trabajo (tareas de `tasks.md`) |
|---|---|---|
| **0 · Base** | La consolidación técnica que ya está planificada: capas, entorno, CI, seguridad de `profiles` | 01–23 (no dependen del producto único) |
| **1 · Corte vertical** | Entrar → escanear CV → mapa → brechas → "Es real / No aplica", todo con la apariencia de `brecha`, en Ómicrom | 25–35 (versiones 27–29, ley de diseño 26, tokens 30, tablas 31, función 32, dominio 33, shell 34, pantallas 35) |
| **2 · Asistente** | La voz recorre todo el ciclo con comandos del nuevo vocabulario | 36 |
| **3 · Demostrar** | Una brecha se cierra con un examen; la credencial incluye lo probado | 37 |
| **4 · Retiro y prueba de humo** | Se quita la UI antigua de Ómicrom y se corre la prueba de humo | 38–39 |
| **5 · Modernización** | Accesibilidad AA, movimiento, rendimiento, PWA, seguridad web, voz y escáner reales; puertas automáticas en CI. Ver [`../modernizacion.md`](../modernizacion.md) | 40–48 |

Esfuerzo (medido en líneas, no en tiempo): 3 628 líneas de `brecha` se mueven o reescriben, ≈ 2 000 de voz se trasladan y ≈ 11 500 de UI de Ómicrom se retiran al final. No doy estimaciones de duración porque no puedo ejecutar `build` en este entorno; la verificación sería con el CI de GitHub.

## 7. Riesgos

| Riesgo | Detalle | Mitigación |
|---|---|---|
| **`brecha` no está validada** | Su propia fase 1b (≥6 de 10 brechas reales con CVs reales) está pendiente; no tiene pruebas ni CI | Compuerta antes de abrir a usuarios: medir la fase 1b. Pruebas para `comparar` y `validar` en las TAREAS 32 y 33 |
| **Privacidad del CV** | El CV completo va a Gemini. Con el servicio sin pago, Google puede usar el contenido para mejorar sus productos ([términos](https://ai.google.dev/gemini-api/terms)). Aplica también a Ómicrom | Decidir servicio de pago y actualizar `POLITICA_PRIVACIDAD.md` antes de usuarios reales. No es asesoría legal |
| **Voz en desarrollo** | El último PR (#406) dice "voz en desarrollo"; `proxy-tts` depende de un proveedor externo con respaldo a la voz del navegador | Probar la voz de punta a punta antes de la Fase 2 |
| **Tamaño de PDF en Edge Functions** | `brecha` acepta 15 MB (≈ 20 MB en base64). No comprobado si Supabase lo admite | Verificar con la documentación vigente antes de la TAREA-32 |
| **CSS global de 1 573 líneas** | Puede alterar el resto de la app | Acotar con prefijo o CSS Modules; prueba visual |
| **Pérdida percibida de Ómicrom** | Se retiran ≈ 11 500 líneas de UI de las 26 227 de producción (44 %): `gemelo` 3 387, `academia` 2 237, `redviva` 1 911 y el resto de `omicron` 3 959 | No se borra backend ni datos; la UI antigua se retira solo al final (TAREA-38) y queda en el historial de git |
| **Verificación limitada** | Este entorno no instala paquetes: no puedo construir ni ejecutar la app | CI de GitHub en cada PR; capturas revisadas por ti antes de fusionar |

## 8. Decisiones que necesito de ti

1. **¿Apruebas la base?** Producto dentro de `Sistema-omicrom` (Vite + Supabase) con el frontend de `brecha`, sin servidor Next.js.
2. **§3.4:** ¿qué hacemos con la revelación inicial, el pasaporte, la Academia y la reputación visible?
3. **Privacidad:** ¿activas el servicio de pago de Gemini antes de abrir a usuarios reales?
4. **Nombre del producto.** Hoy hay dos: "Sistema Ómicrom" y "Brecha".
5. **¿El PDF no se guarda?** Es mi recomendación por privacidad; si quieres conservarlo (por ejemplo para re-analizar sin volver a subirlo) hay que añadir Storage y una política de retención.
