# Modernización integral del producto único

| Campo | Valor |
|---|---|
| Estado | **Propuesta para aprobación.** Depende de [`fusion/producto-unico.md`](./fusion/producto-unico.md) |
| Fecha | 2026-11-02 |
| Modo | `superpowers` (análisis → solución → razonamiento → riesgos → mejoras) |
| Pedido | "Modernidad en todos los puntos de la app" |
| Método | Medición sobre ambos repositorios, `ui-ux-pro-max` (evidencia UX), búsqueda de versiones y estándares vigentes. Sin ejecutar la app: ver "Límites" |

---

## 1. Análisis

### 1.1 Qué se pide realmente
"Moderno" aquí significa tres cosas distintas, y conviene separarlas porque se arreglan de forma distinta:

| Capa | Pregunta | Ejemplos |
|---|---|---|
| **Se ve** | ¿Parece un producto de 2026? | Sistema de diseño, tipografía, movimiento, mapa, escáner |
| **Se siente** | ¿Responde, incluye y no estorba? | Velocidad, accesibilidad, voz, instalación como app |
| **Sostiene** | ¿Se puede mantener y confiar en él? | Versiones del stack, seguridad, pruebas, CI |

### 1.2 Hallazgo central: la "ley" de diseño de Ómicrom choca con el look de `brecha`
Ómicrom declara que `DESIGN.md` y `PRODUCT.md` "ganan siempre" (`.kiro/steering/pipeline-diseno.md`). Esa ley describe un mundo visual distinto al de `brecha`:

| Aspecto | Ley de Ómicrom (`DESIGN.md`) | `brecha` (`globals.css`) |
|---|---|---|
| Fondo | `#000206` (casi negro azulado) | `#0b0d10` (carbón) |
| Acento de marca | Plata `#a0aec0` + índigo `#5e5ce6`, deliberadamente neutro | Ámbar `#f2b134` |
| Color protagonista | **Del usuario** (4 opciones: hielo, rosa, oro, lima) | Fijo, del sistema |
| Etiquetas | Monoespaciadas de 9 px | Sans de sistema en mayúsculas pequeñas |
| Tema | Solo oscuro, "no se está construyendo uno claro" | Solo oscuro, sin `prefers-color-scheme` |

Adoptar el frontend de `brecha` sin tocar la ley dejaría dos autoridades visuales contradictorias. Tres salidas:

| Opción | Qué es | Veredicto |
|---|---|---|
| **A. Ley v2 (recomendada)** | Reescribir `DESIGN.md` y `PRODUCT.md` partiendo de los tokens de `brecha` y **conservando los principios de producto** que siguen siendo válidos: cero jerga, cada número con su escala, nunca datos falsos, la interfaz no afirma más que el dato | La única que permite un producto coherente y que respeta lo que Ómicrom tiene de valioso |
| B. Mantener la ley de Ómicrom | Aplicar la estética plata/índigo a las pantallas de `brecha` | Contradice tu pedido ("que quede con el frontend de brecha") |
| C. Inventar una tercera identidad | Pedir a `ui-ux-pro-max --design-system` un mundo nuevo | Descartada: el propio repo documenta que ese comando propone "mundos visuales completos" (probó *Liquid Glass* con oro sobre fondo claro) que destruyen la identidad |

### 1.3 Estado medido (evidencia)

**Ómicrom**

| Hecho | Dato | Fuente |
|---|---|---|
| Estilos | 999 usos de `style={{` en componentes; el sistema de diseño vive en objetos TS, no en CSS | `grep` en `src/` |
| Tipografía | `PRODUCT.md` dice "sin webfonts", pero `src/index.css:4` importa Inter y JetBrains Mono desde Google Fonts con `@import` | `src/index.css` |
| Movimiento reducido | 102 referencias a `prefers-reduced-motion`/`useReducedMotion` | `grep` |
| Accesibilidad | 46 `aria-label`; foco visible exigido por `PRODUCT.md` | `grep` |
| Manifiesto PWA | Nombre "Sistema Ómicron" (sin M; el nombre de marca es Ómicrom), descripción "Marketplace de capital intelectual", atajos a `?tab=wallet` y `?tab=academia` que nada lee (`TabId` solo tiene 3 valores) | `public/manifest.webmanifest` |
| Iconos PWA | Un solo `icon.svg` con `purpose: "any maskable"`, sin PNG 192/512 | `public/` |
| Service worker | 106 líneas, red primero para todo `GET` del mismo origen, sin precarga del shell versionado | `public/sw.js` |
| Cabeceras | 5 (`Cache-Control`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`); **sin CSP ni HSTS** | `vercel.json` |
| Idioma de metadatos | `og:locale` = `es_ES` en un producto latinoamericano | `index.html` |
| Stack | React 18.3, Vite 5.4, TS 5.6, `framer-motion` 11, Tailwind 3.4 (2 archivos lo usan) | `package.json` |
| Voz | Reconocimiento con `SpeechRecognition`, con `isSpeechAvailable()` y manejo de errores; entrada de texto como alternativa en `OmicronBar` | `infrastructure/voice/recognition.ts` |

**`brecha`**

| Hecho | Dato |
|---|---|
| CSS moderno usado | `clamp()` 0 · `@container` 0 · `@layer` 0 · `oklch()` 0 · `color-mix()` 0 · `light-dark()` 0 · View Transitions 0 · `dvh`/`svh` 0 · `text-wrap` 0 · `:has()` 1 |
| Adaptación | Solo `@media (max-width)` (5); ningún `min-width` ni `prefers-color-scheme` |
| Accesibilidad en TSX | 6 `aria-label`, 9 `role=`, 1 `aria-live`, 2 `aria-selected`, 1 `aria-expanded`; `prefers-reduced-motion` 3 veces; `focus-visible` 2 |
| **Escáner del CV** | El avance son pausas fijas, no etapas reales: `dormir(500)`, `dormir(550)`, `dormir(700)`, `dormir(420)` en `SubirCv.tsx`. La animación "Leyendo el documento…" avanza aunque el servidor no haya hecho nada |
| Mapa | SVG de 439 líneas; la información solo se transmite visualmente |
| Diseño | Un solo archivo global de 1 573 líneas, sin capas ni variables de color por rol |

### 1.4 Lo que dicen los estándares y el ecosistema (verificado en línea)

| Tema | Hecho vigente | Fuente |
|---|---|---|
| Vite | Vite 8 salió el 12 de marzo de 2026 con Rolldown (bundler en Rust) como motor único, en lugar de esbuild y Rollup | [guía de migración de Vite](https://github.com/vitejs/vite/blob/main/docs/guide/migration.md), [resumen](https://noqta.tn/en/tutorials/rolldown-vite-rust-bundler-migration-guide-2026) |
| React | React 19.2 (1 oct 2025) añade `<Activity>` y `useEffectEvent` | [react.dev](https://react.dev/blog/2025/10/01/react-19-2) |
| Animación | `framer-motion` pasó a llamarse **`motion`** (import desde `motion/react`); la v12 no trae cambios incompatibles para React | [motion.dev](https://motion.dev/docs/react-upgrade-guide) |
| TypeScript | TS 7.0 (compilador nativo en Go, 8–12× más rápido) es estable desde el 8 jul 2026, **pero `typescript-eslint` no lo soporta**: no hay API de compilador estable hasta TS 7.1 | [InfoQ](https://infoq.com/news/2026/08/typescript-7-released/), [explicación del bloqueo](https://dev.to/gabrielanhaia/typescript-7-has-no-stable-compiler-api-yet-thats-why-typescript-eslint-wont-install-4pa) |
| Accesibilidad | WCAG 2.2 es Recomendación del W3C desde el 5 oct 2023. Añade 9 criterios: tamaño mínimo de objetivo (24×24 px CSS), foco no oculto, alternativa al arrastre, autenticación accesible, ayuda consistente, entrada no redundante | [W3C](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [Comisión Europea](https://accessible-eu-centre.ec.europa.eu/content-corner/news/wcag-22-officially-w3c-recommendation-2023-10-06_en) |
| Voz | `SpeechRecognition` funciona en navegadores Chromium y parcialmente en Safari; Firefox no lo activa por defecto. La implementación habitual envía el audio a un servicio en la nube | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [LambdaTest](https://www.lambdatest.com/web-technologies/speech-recognition-firefox) |
| UX (`ui-ux-pro-max`) | Mostrar progreso en procesos de varios pasos; separación mínima de 8 px entre objetivos táctiles; objetivos táctiles más grandes en móvil | `search.py --domain ux` |

*Contenido parafraseado de las fuentes citadas.*

---

## 2. Solución: qué significa "moderno" en cada punto de la app

Cada fila tiene un criterio de verificación. Las identificadas con **P0** deben estar antes de abrir a usuarios.

| # | Punto de la app | Hoy (medido) | Objetivo moderno | Verificación | Prio |
|---|---|---|---|---|---|
| 1 | **Sistema de diseño** | 999 estilos en línea en Ómicrom; 1 573 líneas de CSS plano en `brecha` | Un solo conjunto de tokens en CSS (`@layer reset, tokens, base, components, utilities`), color por rol, escala de espaciado, radios y sombras. Los componentes nuevos no usan `style={{` | `grep -r "style={{" src/features/brecha \| wc -l` = 0 | P0 |
| 2 | **Color y temas** | Un acento fijo, solo oscuro | Paleta perceptual (`oklch()`), `color-scheme`, `light-dark()` listo para activar un tema claro; el **color del usuario** se conserva como acento de identidad (decisión §5) | Contraste ≥ 4,5:1 texto normal y ≥ 3:1 texto grande, medido con la paleta | P0 |
| 3 | **Tipografía** | Google Fonts por `@import` (bloquea el render, tercero recibe la IP) | Pila de sistema, `clamp()` para tamaños fluidos, `text-wrap: balance` en titulares, `tabular-nums` en puntajes. Sin dependencia externa | Cero peticiones a `fonts.googleapis.com` | P0 |
| 4 | **Layout** | `@media (max-width)` y altura fija de la barra (`--topbar-alto: 65px`) | Consultas de contenedor (`@container`), `dvh`/`svh` en el shell móvil, `env(safe-area-inset-*)`, mobile-first | Capturas a 320, 390, 768, 1280 sin desbordes ni etiquetas cortadas | P0 |
| 5 | **Entrada (login / invitado)** | Formulario con `autoComplete` correcto (verificado) | Mantenerlo; añadir ingreso sin contraseña como opción (enlace o código por correo) y que el modo invitado conserve el CV al registrarse sin pedir nada dos veces (WCAG 2.2 "entrada no redundante") | Prueba E2E invitado → registro conserva el análisis | P1 |
| 6 | **Escáner del CV** | Etapas falsas por temporizador | **Progreso real**: la función envía eventos (`recibido`, `leyendo`, `comparando`, `guardado`) y la interfaz solo avanza con ellos; si no hay evento, indeterminado. Cancelable | Prueba que simula una función lenta y comprueba que el avance no se adelanta | P0 |
| 7 | **Mapa de capacidades** | SVG visual sin equivalente textual; nodos pequeños | `role="img"` con descripción, nodos operables con teclado y área táctil ≥ 24 px, alternativa en lista (la pestaña "Brechas" ya lo es: enlazarla), estado "probado/no probado" que no depende del color | Navegación solo con teclado; auditoría `axe` sin violaciones graves | P0 |
| 8 | **Cola de brechas** | Acordeón con botones "Es real / No aplica" | Mantener el flujo (es lo que gusta); anunciar cambios con `aria-live`, deshacer visible, foco gestionado al cerrar una brecha | Prueba de lector de pantalla simulada con Testing Library | P1 |
| 9 | **Diagnóstico y comparación** | Texto y listas | Visualización de "cerradas / nuevas / persisten" con etiquetas, no solo color; cada número con su escala (`2/8`, `67 %`) como exige `PRODUCT.md` | Revisión contra el principio 3 de `PRODUCT.md` | P1 |
| 10 | **Aprender y demostrar** | Examen en pestaña antigua | Se integra como paso 5 del ciclo, con progreso por pregunta y recuperación si se corta la conexión | Prueba E2E del examen con función simulada | P1 |
| 11 | **Credencial verificable** | `?verificar=<token>` público | Mantener; añadir vista previa social correcta (`og:locale` `es_419`/`es_CL`, imagen dinámica) | Cabeceras `og:*` revisadas | P2 |
| 12 | **Asistente de voz** | Ya existe `isSpeechAvailable()` y manejo de `onerror` en `recognition.ts`, y una entrada de texto en `OmicronBar`. **No verificado:** si la interfaz explica el permiso del micrófono, muestra la transcripción en vivo y distingue los estados *escuchando / pensando / hablando* | Partir de lo que hay y completar: detección de soporte (Chromium/Safari sí; Firefox no) con **el campo de texto siempre visible**, explicación antes de pedir el micrófono, transcripción en vivo, estados *escuchando / pensando / hablando* con `aria-live`, interrumpir la voz al hablar, nunca reproducir audio sin gesto del usuario, aviso de que el navegador puede enviar el audio a la nube | Prueba en Chromium y Firefox: sin micrófono, el asistente sigue siendo usable | P0 |
| 13 | **Movimiento** | `framer-motion` 11; 102 referencias a movimiento reducido | Transiciones de pantalla con la API nativa de View Transitions, `@starting-style` para entradas, `motion` (v12) solo para gestos; versión reducida **más suave, no cero** (regla de `PRODUCT.md`) | Cada animación nueva trae su variante reducida en el mismo commit | P1 |
| 14 | **Accesibilidad** | Parcial | WCAG 2.2 nivel AA: objetivo ≥ 24×24, foco no oculto por la cabecera ni la barra inferior (`scroll-padding`), alternativa a arrastrar el PDF (ya existe el clic), ayuda en el mismo lugar en todas las pantallas | `@axe-core/playwright` sin violaciones serias en cada pantalla | P0 |
| 15 | **Rendimiento** | Sin presupuesto | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (umbrales "buenos" de Core Web Vitals). Carga diferida del mapa, la voz y el examen. Presupuesto de tamaño del paquete en CI | Lighthouse CI en CI con esos umbrales | P0 |
| 16 | **Instalable (PWA)** | Manifiesto desactualizado, un solo icono SVG | Manifiesto reescrito (nombre **Ómicrom**, descripción real, atajos a pantallas que existen), iconos PNG 192/512 y uno *maskable* aparte, capturas, `lang` correcto; service worker con precarga del shell versionado, caché solo de recursos estáticos y aviso de nueva versión | Lighthouse "installable" = pasa | P1 |
| 17 | **Seguridad web** | Sin CSP ni HSTS; script de PDF.js desde CDN | CSP (primero en modo informe, luego obligatoria), HSTS, política de recursos; el CDN de PDF.js desaparece porque el modelo lee el PDF | `curl -I` muestra las cabeceras; CSP sin violaciones en staging | P0 |
| 18 | **Datos y privacidad** | Ver H-02, H-03, B-01..B-03 | Lista blanca de columnas editables, RLS en tablas nuevas, PDF sin guardar, servicio de pago de Gemini antes de usuarios reales | Pruebas SQL de TAREAS 05, 07 y 31 | P0 |
| 19 | **Herramientas y versiones** | React 18.3 · Vite 5.4 · TS 5.6 · `framer-motion` 11 | Escalonado y reversible, ver §3 | CI en verde tras cada paso | P1 |
| 20 | **Calidad continua** | 26 archivos de prueba; E2E fuera de CI | Pruebas visuales (`toHaveScreenshot` de Playwright), `axe` y Lighthouse en CI, E2E contra *staging* | Pipeline con esos pasos en verde | P1 |
| 21 | **Contenido y marca** | `og:locale` `es_ES`; manifiesto con "Ómicron"; `PRODUCT.md` dice "rioplatense" mientras la regla R-17 pide español latinoamericano neutro | Un solo nombre visible (**Ómicrom**), un solo registro de idioma, microcopy sin jerga | Búsqueda de "Ómicron" visible = 0 (fuera de identificadores técnicos) | P1 |

### Qué NO se hace, a propósito
- **No se migra a Tailwind v4 ni se añade una librería de componentes.** Solo 2 archivos usan Tailwind; el CSS nativo actual (capas, variables, contenedores, `light-dark()`) cubre lo necesario sin dependencias nuevas.
- **No se sube a TypeScript 7.0 todavía.** Ver §3.
- **No se cambia de framework a Next.js** (decisión de `producto-unico.md`).

---

## 3. Razonamiento (alternativas comparadas)

### 3.1 Actualizar el stack: ¿todo de golpe o por pasos?

| Opción | Ventaja | Inconveniente | Veredicto |
|---|---|---|---|
| Subir todo a la vez | Una sola vez | Si algo falla no se sabe qué fue; **aquí no puedo ejecutar `build`**, solo el CI de GitHub | Descartada |
| **Por pasos, de menor a mayor riesgo** | Cada paso es un PR reversible y el CI lo valida | Más PR | **Elegida** |

Orden propuesto, cada uno su propio PR:
1. **Vite 5 → 8** (solo la compilación; no toca el código de la app). Revisar la guía de migración.
2. **`framer-motion` → `motion`** (cambio de nombre del paquete y de la ruta de importación, sin cambios incompatibles anunciados para React en v12).
3. **React 18 → 19.2**. Es el más delicado: 26 227 líneas de producción y `@testing-library/react`.
4. **TypeScript: se mantiene en 5.x/6.x.** Subir a 7.0 rompería `typescript-eslint` (no hay API hasta 7.1). Alternativa a evaluar: usar el compilador nativo solo para `tsc --noEmit` y conservar el clásico para ESLint, a decidir cuando exista 7.1.

### 3.2 Sistema de diseño: ¿repintar o rehacer sobre tokens?

| Opción | Ventaja | Inconveniente | Veredicto |
|---|---|---|---|
| Pegar el CSS de `brecha` sobre toda la app | Rápido | 1 573 líneas globales que pisan estilos de Ómicrom; sin base para tema claro ni para el color del usuario | Descartada |
| **Tokens primero, pantallas después** | Coherencia, accesibilidad por construcción, base para temas | Hay que hacerlo antes de portar pantallas | **Elegida** |

Por eso en el plan la ley de diseño v2 (TAREA-26), las versiones del stack (TAREAS 27–29) y los tokens (TAREA-30) van **antes** del shell (TAREA-34) y de las pantallas (TAREA-35).

### 3.3 Escáner: ¿animación más bonita o progreso honesto?
Una animación más bonita sobre pausas fijas sigue prometiendo algo que el sistema no sabe. `PRODUCT.md` lo prohíbe expresamente ("la interfaz no afirma más que el dato"). Se elige **progreso real por eventos**; es además la única forma de que el escáner cuente la verdad cuando el análisis tarda o falla.

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| No puedo ejecutar `npm`/`build` en este entorno | Todo cambio de código se valida con el CI de GitHub, con un PR por paso |
| Actualizar React 18→19 rompe pruebas o componentes | Paso aislado, con el conjunto de 26 archivos de prueba como red de seguridad |
| Un color de marca nuevo choca con el color del usuario | Decisión explícita en §5 antes de escribir tokens |
| Aumentar la complejidad con CSS nuevo | Solo características estándar de la plataforma; se confirma su soporte contra el objetivo de navegadores de Vite 8 antes de usarlas |
| La voz no funciona en todos los navegadores | El texto es siempre una vía completa, no un respaldo |
| Cumplir WCAG 2.2 AA no se demuestra con una herramienta | `axe` detecta una parte; el resto exige revisión manual con teclado y lector de pantalla (TAREA-40) |

## 5. Decisiones que necesito de ti

1. **¿Ley de diseño v2 (opción A)?** Es decir: base visual de `brecha`, principios de producto de Ómicrom.
2. **Color del usuario:** ¿se conserva que cada persona elija el color de su identidad (4 opciones) y el acento ámbar de `brecha` queda como color de marca? Es la forma de no perder lo más distintivo de Ómicrom.
3. **Tema claro:** ¿se deja solo oscuro (como hoy) o se prepara el claro desde los tokens?
4. **Ingreso sin contraseña** (enlace/código por correo): ¿lo quieres?
5. **Nombre:** confirmar **Ómicrom** (con M) como único nombre visible.

## 6. Mejoras futuras (no incluidas en el plan)
Tema claro completo, llaves de acceso (*passkeys*), modo sin conexión para el reporte ya generado, traducción a otros idiomas, reconocimiento de voz propio en el servidor para que funcione igual en todos los navegadores.

## 7. Límites de este documento
- No ejecuté ninguna de las dos aplicaciones ni ningún análisis de rendimiento, así que los objetivos de §2 (LCP, INP, CLS) son **metas**, no mediciones.
- Las versiones y fechas vienen de fuentes públicas citadas; si alguna cambia, vale la fuente oficial vigente.
- La compatibilidad exacta de cada característica CSS se confirma al implementar.
