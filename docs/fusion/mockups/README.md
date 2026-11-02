# Maqueta · Inicio del producto único

Maqueta estática de la pantalla de inicio de Ómicrom ya unificado con `brecha`. **No es la app real:** es HTML y CSS con datos de ejemplo, hecha para decidir el diseño antes de construirlo. Cada imagen lleva la cinta "Maqueta · datos de ejemplo".

## Imágenes

| Imagen | Qué muestra |
|---|---|
| [`home-movil.png`](./home-movil.png) | Primera pantalla en móvil (390 × 844): saludo, siguiente paso con su botón, asistente flotante y barra inferior |
| [`home-movil-completo.png`](./home-movil-completo.png) | El inicio completo en móvil. *El asistente y la barra aparecen en su sitio de lectura (no flotando); en la app real flotan* |
| [`home-escritorio.png`](./home-escritorio.png) | Escritorio (1280 px): dos columnas, navegación arriba y asistente integrado en la página |
| [`colores.png`](./colores.png) | Los cuatro colores de identidad que la persona puede elegir: hielo, rosa, oro, lima |
| [`home.html`](./home.html), [`colores.html`](./colores.html) | Código fuente de la maqueta (`home.html?c=rosa` cambia el color) |

GitHub muestra las imágenes, pero el HTML solo como código: para verlo en el navegador hay que descargarlo.

## Supuestos de diseño (las recomendaciones de `modernizacion.md` §5)

1. Ley de diseño v2: base visual de `brecha` (carbón y ámbar), con los principios de producto de Ómicrom.
2. El **ámbar es la marca** (logotipo y botones principales) y el **color de identidad lo elige la persona** (avatar, micrófono, paso actual, nodos probados del mapa, barras, foco).
3. Solo oscuro, con el tema claro posible más adelante.
4. Pila tipográfica de sistema (sin Google Fonts).

## Qué contiene el inicio y por qué

| Bloque | Razón |
|---|---|
| **Asistente** (micrófono + campo de texto) | Es la interfaz del ciclo. El campo de texto siempre está: la voz no es obligatoria. En móvil flota sobre la navegación para acompañar en todas las pantallas |
| **Siguiente paso** | Una sola acción principal ("Empezar examen") y una secundaria ("Léemelo"). Es el puente entre las dos ideas: la brecha de `brecha` se cierra con la prueba de Ómicrom |
| **Tu recorrido** | Los 5 pasos del ciclo. El paso 3 muestra **"3 de 8"** con borde discontinuo y no un check, para no afirmar más de lo que dice el dato |
| **Tu mapa** | Versión pequeña del mapa. Cada estado se distingue por **forma y etiqueta**, no solo por color: probada (relleno y check), reconocida (anillo), por revisar (discontinuo), no aplica (tachado) |
| **Tu progreso** | Cada número lleva su escala: `1/8`, `4 días`, `67 %` |
| **Tus análisis** | Historial. Al volver a escanear aparecen las brechas cerradas y nuevas |

## Qué se verificó (medido en un navegador sin interfaz)

| Comprobación | Resultado |
|---|---|
| Desborde horizontal a 320, 390, 768 y 1280 px | 0 px en los cuatro anchos |
| Objetivos táctiles menores de 44 × 44 px | Ninguno |
| Botón "Empezar examen" visible sin desplazarse | Sí, en 375×667, 360×740, 390×844, 430×932, 768×1024 y 1280×900 |
| Final de la página libre del asistente flotante | Sí, en los mismos seis tamaños |
| Segunda columna en escritorio | Sí a 1280 px; una columna en 320, 390 y 768 |
| Errores de JavaScript | Ninguno |

## Qué NO se verificó

- **Contraste calculado:** los colores se eligieron para superar 4,5:1 con una aproximación de luminosidad, pero no se midió con una herramienta. Hay que hacerlo antes de adoptar la paleta.
- **Lector de pantalla y teclado:** la maqueta usa HTML semántico, `aria-*` y foco visible, pero no se probó con un lector real.
- **Navegadores:** solo Chromium. Safari y Firefox no se probaron.
- **Interacción:** no hay clics ni estados de voz reales (escuchando, pensando, hablando).
- **Contenido de ejemplo:** los nombres, fechas, números y «Análisis de datos con planillas o SQL» vienen de los datos de muestra de `brecha`.

## Dos observaciones de diseño para decidir

1. **"Oro" se confunde con la marca.** Con ese color, el anillo del avatar y el micrófono son casi idénticos al ámbar del logotipo (ver `colores.png`). Opciones: quitar "oro" de la lista, o cambiarlo por otro tono distinguible.
2. **El asistente flotante tapa algo de contenido.** Se compensa con espacio al final de la página, pero en móviles muy bajos ocupa casi un décimo de la pantalla. La alternativa es un botón de micrófono más pequeño que se expande al tocarlo.
