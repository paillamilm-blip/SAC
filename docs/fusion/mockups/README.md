# Maquetas · Inicio y asistente conversacional

Maquetas estáticas del producto único. **No son la app real:** son HTML y CSS con datos de ejemplo, hechas para decidir el diseño antes de construirlo. Cada pantalla lleva la cinta «Maqueta · datos de ejemplo».

## Imágenes

**Inicio**

| Imagen | Qué muestra |
|---|---|
| [`home-movil.png`](./home-movil.png) | Primera pantalla en móvil (390 × 844): saludo, siguiente paso, y el asistente como barra flotante con su asa |
| [`home-movil-completo.png`](./home-movil-completo.png) | El inicio completo en móvil (la barra y el asistente aparecen en su sitio de lectura, no flotando) |
| [`home-escritorio.png`](./home-escritorio.png) | Escritorio (1280 px): dos columnas |
| [`colores.png`](./colores.png) | Los cuatro colores de identidad: hielo, rosa, **violeta**, lima |

**Asistente (chat)**

| Imagen | Qué muestra |
|---|---|
| [`chat-movil.png`](./chat-movil.png) | Inicio del hilo en móvil: respuesta con citas numeradas y el bloque «De dónde sale cada dato» |
| [`chat-movil-final.png`](./chat-movil-final.png) | Final del hilo: tarjeta de acción, respuesta interrumpida por voz y escucha en vivo |
| [`chat-ajustes-movil.png`](./chat-ajustes-movil.png) | Ajustes del asistente |
| [`chat-escritorio.png`](./chat-escritorio.png) | Escritorio: el chat acoplado a la derecha, sin tapar el inicio |

Código fuente: [`home.html`](./home.html), [`chat.html`](./chat.html), [`colores.html`](./colores.html) y [`tokens.css`](./tokens.css) (tokens compartidos). GitHub muestra el HTML como código; para verlo en el navegador hay que descargarlo. Parámetros de la maqueta: `?c=rosa|violeta|lima`, y en `chat.html` también `?ajustes` y `?arriba`.

## Cambios de esta versión

1. **Se quitó «Oro» y se añadió «Violeta».** «Oro» se confundía con el ámbar de la marca. Para que el violeta no choque con una categoría del mapa, la categoría «Credencial» pasó de morado a turquesa.
2. **El asistente es un chat.** En móvil, la barra flotante se abre a pantalla completa; en escritorio se acopla como panel lateral.
3. **Corrección de un dato:** la etiqueta de la brecha de ejemplo decía «Impacto alto», pero en los datos de `brecha` esa brecha tiene severidad **media**. Ahora dice «Impacto medio».
4. **Punto de corte móvil/escritorio unificado** en 48 rem (768 px): navegación y asistente cambian a la vez.

## La innovación: un chat que dice de dónde sale cada dato

Hoy la mayoría de los asistentes responden con texto seguro de sí mismo. Aquí cada afirmación lleva una **cita numerada** y debajo un bloque con su origen, en una de tres clases:

| Etiqueta | Significa | Forma |
|---|---|---|
| **De tu CV** | Está en tu documento; se muestra la frase textual | Borde sólido azul, icono de documento |
| **Probado** | Lo respalda un examen aprobado | Borde sólido verde |
| **Estimación** | Lo dice el asistente, sin respaldo todavía | Borde **discontinuo**, icono de círculo punteado |

Es una aplicación directa del principio de `PRODUCT.md`: *la interfaz no afirma más que el dato*. Combina tres ideas vigentes, cada una con su fuente:

| Idea | Cómo se aplica aquí | Fuente |
|---|---|---|
| **Citas por afirmación**, no al final de la respuesta | Un marcador por frase, enlazado a su fuente | [ui-patterns.com](https://ui-patterns.com/patterns/SourceCitations), [shapeof.ai](https://www.shapeof.ai/patterns/citations) |
| **Interfaz generativa**: el modelo elige componentes reales, no solo texto | La tarjeta de la brecha con «Empezar examen» y «Ver en el mapa» aparece dentro del chat | [guía de UI generativa](https://dev.to/copilotkit/the-developers-guide-to-generative-ui-in-2026-1bh3), [Builder.io](https://www.builder.io/blog/designing-generative-ui-in-an-agent-native-world) |
| **Interrupción honesta por voz**: si cortas al asistente, el registro no dice que escuchaste lo que no escuchaste | La respuesta cortada se marca y se avisa «lo que no alcanzaste a escuchar no queda en el historial» | [guía de barge-in](https://www.itechguides.com/how-to-build-a-voice-ai-assistant-that-handles-interruptions-barge-in-and-follow-up-questions/) |

Un estudio académico sobre interfaces generativas, "Generative Interfaces for Language Models" ([arXiv 2508.19227](https://arxiv.org/abs/2508.19227)), reporta en su resumen preferencia humana por ellas frente a las puramente conversacionales. *No pude abrir la página del artículo (error 403): cito solo lo que dice su resumen en los resultados de búsqueda. No se midió con tus usuarios.*

*Contenido parafraseado de las fuentes citadas.*

## Ajustes del asistente

| Grupo | Opciones |
|---|---|
| **Voz** | Respuestas habladas (sí/no) · velocidad · permitir interrumpir · manos libres |
| **Cómo responde** | Largo (breve, normal, detallado) · tono (directo, cercano, formal) |
| **Confianza** | «Mostrar de dónde sale cada dato» y «Pedir confirmación antes de actuar» están **siempre activas** y aparecen bloqueadas a propósito: son la promesa del producto, no una preferencia |
| **Privacidad** | Guardar historial (sí/no) · borrarlo · aviso de que el reconocimiento de voz del navegador puede enviar el audio a la nube |

## Qué es real y qué no (importante)

| Elemento de la maqueta | Estado en el código |
|---|---|
| Memoria de la conversación y respuestas por streaming | **Ya existe** en `brain.ts` (10 turnos) |
| Herramientas: examen, CV, reto, academia | **Ya existen** en `tools.ts` |
| Entrada por voz con detección de soporte | **Ya existe** (`isSpeechAvailable`) |
| Panel de chat, citas por afirmación, clasificación de origen | **Hay que construir** |
| «Ver en el mapa» y «ejercicio de práctica con tabla de ventas» | **No existen**: `tools.ts` no los tiene. La maqueta los muestra como propuesta |
| Historial persistente y ajustes | **Hay que construir** |
| Interrupción que corrige el historial | **Hay que construir** |

**Advertencia técnica central:** que el asistente diga «De tu CV» o «Probado» **no puede depender de que el modelo lo afirme**. Esas dos etiquetas deben derivarse de datos reales (el texto extraído del CV y la tabla `omicron_skill_proofs`). Lo que no se pueda enlazar a una de ellas debe salir como «Estimación». Si no, la etiqueta misma sería una afirmación sin respaldo. Está reflejado en el criterio de la TAREA-36.

## Qué se verificó (navegador sin interfaz)

| Comprobación | Resultado |
|---|---|
| Desborde horizontal del inicio a 320, 390, 768 y 1280 px | 0 px en los cuatro |
| Desborde horizontal del chat en las 4 vistas capturadas | 0 px |
| Botón «Empezar examen» visible sin desplazarse | Sí, en 6 tamaños (375×667, 360×740, 390×844, 430×932, 768×1024, 1280×900) |
| Objetivos táctiles menores de 44 px en el inicio | Ninguno |
| Objetivos táctiles menores de 44 px en el chat | Solo las dos citas numeradas (24 × 24 px). Es la excepción WCAG 2.2 para enlaces dentro de una frase; la lista de fuentes de abajo ofrece filas de 44 px como alternativa |
| Errores de JavaScript | Ninguno |

## Qué NO se verificó

- **Contraste calculado:** los colores se eligieron para superar 4,5:1 con una aproximación de luminosidad, pero no se midieron con una herramienta.
- **Lector de pantalla y teclado:** el chat usa `role="log"`, `aria-live`, `role="switch"` y `role="radiogroup"`, pero no se probó con un lector real. Falta revisar el orden de foco.
- **Voz real:** la onda, la transcripción y la interrupción son dibujos. No se probó ningún micrófono ni reconocimiento.
- **Navegadores:** solo Chromium.
- **Los textos del asistente son de ejemplo.** Un modelo real puede responder distinto, y que las citas salgan bien es justamente lo que hay que construir y probar.
- **Los datos de ejemplo** (nombres, fechas, «17:41») no son reales. Las frases de brecha vienen de los datos de muestra de `brecha`.

## Decisiones para ti

1. **¿Te convence la innovación?** Si sí, la TAREA-36 la construye. Si prefieres un chat más simple, se puede quitar el bloque de fuentes y dejar solo el texto.
2. **Etiquetas:** ¿«De tu CV», «Probado», «Estimación» son las palabras correctas para tus usuarios?
3. **Manos libres (escucha continua):** ¿lo incluimos desde el inicio? Es más cómodo, pero consume más batería y plantea más preguntas de privacidad.
4. **Historial del chat:** ¿se guarda por defecto (como en la maqueta) o solo si la persona lo activa? Recomiendo lo segundo por privacidad.
5. **Asistente flotante vs. micrófono pequeño** en móviles bajos (ver la observación anterior sobre el espacio que ocupa).
