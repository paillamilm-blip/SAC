---
name: Sistema Ómicrom
description: Reputación profesional verificable, imposible de falsificar. Producto oscuro premium con el Gemelo Digital como protagonista.
colors:
  silver-ice: "#a0aec0"
  silver-ice-dim: "rgba(160,174,192,0.46)"
  silver-ice-faint: "rgba(160,174,192,0.16)"
  silver-ice-ghost: "rgba(160,174,192,0.08)"
  indigo: "#5e5ce6"
  indigo-dim: "rgba(94,92,230,0.44)"
  indigo-faint: "rgba(94,92,230,0.14)"
  teal: "#3fd0c9"
  teal-dim: "rgba(63,208,201,0.44)"
  teal-faint: "rgba(63,208,201,0.14)"
  amber: "#ffb02e"
  amber-dim: "rgba(255,176,46,0.46)"
  amber-faint: "rgba(255,176,46,0.14)"
  rose: "#ff5c7a"
  rose-dim: "rgba(255,92,122,0.44)"
  rose-faint: "rgba(255,92,122,0.14)"
  bg: "#000206"
  surface: "rgba(12,16,30,0.86)"
  surface-light: "rgba(22,28,48,0.9)"
  overlay: "rgba(2,3,10,0.98)"
  header-glass: "rgba(9,12,22,0.55)"
  sticky-glass: "rgba(6,8,16,0.96)"
  glass: "rgba(255,255,255,0.045)"
  glass-raised: "rgba(255,255,255,0.08)"
  wash: "rgba(6,10,22,0.6)"
  scrim: "rgba(0,0,0,0.6)"
  line: "rgba(150,180,255,0.14)"
  line-strong: "rgba(150,180,255,0.28)"
  locked: "rgba(255,255,255,0.12)"
  locked-bg: "rgba(255,255,255,0.04)"
  grid: "rgba(92,140,255,0.05)"
  ink: "#eaf0fb"
  muted: "#76829d"
  on-accent: "#021018"
  ice: "#8bd4ff"
  iris: "#8a88f0"
  teal-deep: "#008b9e"
  flame: "#ff6432"
  user-hielo: "#7dd3fc"
  user-rosa: "#ff6b9d"
  user-oro: "#ffb02e"
  user-lima: "#84cc16"
typography:
  hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    letterSpacing: "-0.3px"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.3px"
  card-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  stat:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    letterSpacing: "-0.5px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: "9px"
    fontWeight: 400
    letterSpacing: "1.4px"
  subtitle:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.5px"
  chip:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.4px"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "64px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, #a0aec0, #5e5ce6)"
    textColor: "#ffffff"
    rounded: "15px"
    padding: "13px 0"
    width: "100%"
  button-secondary:
    backgroundColor: "rgba(160,174,192,0.10)"
    textColor: "{colors.silver-ice}"
    rounded: "15px"
    padding: "13px 0"
    width: "100%"
  button-danger:
    backgroundColor: "rgba(255,92,122,0.12)"
    textColor: "{colors.rose}"
    rounded: "15px"
    padding: "13px 0"
    width: "100%"
  card:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    rounded: "18px"
    padding: "13px 15px"
  stat-card:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.ink}"
    rounded: "14px"
    padding: "9px 11px"
  header:
    backgroundColor: "rgba(9,12,22,0.55)"
    textColor: "{colors.ink}"
    padding: "13px 16px"
  input:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Sistema Ómicrom — Design System

> **Fuente de verdad: `src/theme/`.** Este archivo describe lo que ya existe en código. Si los dos discrepan, el código gana y este archivo está desactualizado. Nunca escribas un valor acá que no exista en `src/theme/`.
>
> - `tokens.ts` → colores (`C`), `statusColor()`, `categoryColor()`
> - `typography.ts` → `FONT`, `SIZE`, `FONT_STYLE`, `LETRA`
> - `layout.ts` → `SP`, `SPACING`, `RADIUS`, `Z`, `BLUR`, `VELO`, `BORDER`, `BASE`
> - `shadows.ts` → `HALO`, `SHADOW`, `CERCANA`, `LEJANA`, `ELEVATED`, `GLOW`
> - `animations.ts` → `EASE`, `TIMING`, `SPRING`, `KEYFRAMES`

## Overview

Ómicrom mide reputación profesional de forma verificable. La tesis del producto — *conocimiento verificable, no declarado* — es también la tesis visual: nada decorativo, todo medido. Cada número que se muestra tiene unidad y escala (`65/100`, nunca `65`).

El mundo visual es **negro-azulado premium tipo Apple**: fondo casi negro, superficies de vidrio, una sola familia tipográfica de sistema, y color usado como señal (estado, categoría, identidad) no como adorno.

La decisión estructural que define todo lo demás: **el color protagonista no es del sistema, es del usuario.** Cada persona elige el color de su Gemelo Digital entre 4 opciones, y ese color manda en su orbe, sus botones, sus focus y sus hovers. Por eso el color de marca (Silver Ice `#a0aec0`) es deliberadamente neutro: existe para *no competir*. Un cian saturado se leería como "startup genérica" y además pelearía con el color elegido.

**Modo:** casi todo el producto es **Operate** — el visitante completa una tarea (subir CV, mirar su credencial, buscar empleo, tomar un curso). Escanabilidad, consistencia y expectativas nativas le ganan a la expresión. La marca vive en el detalle preciso, no en el gesto grande.

Las excepciones **Persuade** son las superficies de entrada: `AuthOverlay`, `NoAccess`, `ResetPasswordOverlay`, `OrbOnboarding` y los 5 actos de `GemeloReveal`. Ahí sí se juega a convencer, y ahí sí hay coreografía.

**Dark-mode only.** No hay tema claro y no se está construyendo uno. Cualquier propuesta con fondo claro está fuera de mundo.

## Colors

Todo sale de `C` en `src/theme/tokens.ts`. Los nombres de las claves son históricos (`C.cyan` ya no es cian) — se conservan porque renombrarlos tocaría ~58 archivos sin ganancia.

### Primary

**Silver Ice `#a0aec0`** (`C.cyan`) — gris-azulado. Color de marca del sistema. Es el héroe plateado: estados activos, bordes de énfasis, `statusColor('IN_PROGRESS')` y `statusColor('ACTIVE')`, categoría `FOUNDATION`.

Su trabajo es *desaparecer cuando corresponde*. Se eligió porque no compite con el color del usuario, se lee como precisión y funciona sobre fondo oscuro.

> **`#5cc8ff` está prohibido.** Era el cian anterior; se eliminó de los 58 archivos que lo contenían (PR #308). Si aparece en un diff, es una regresión.

### Secondary

**Indigo `#5e5ce6`** (`C.purple`) — tiers, destacados, `MAESTRÍA` y `ADVANCED`, profundidad ≥3 en el árbol de skills. Es la segunda mitad del gradiente de `btnPrimary`.

### Tertiary

- **Teal `#3fd0c9`** (`C.green`) — estado OK y economía. `statusColor('VALIDATED')` y `statusColor('MASTERED')`, categoría `ECONOMY`.
- **Ámbar `#ffb02e`** (`C.gold`) — acento cálido. Nodos maestros, `SPECIALIZATION`, profundidad 2.
- **Rosa `#ff5c7a`** (`C.red`) — error y `GOVERNANCE`. Nunca decorativo.

Cada color tiene su `Dim` (~0.45 alpha) para bordes y su `Faint` (~0.14) para fondos. Usá la variante, no `opacity` sobre el sólido.

### Neutral

| Token | Valor | Uso |
|---|---|---|
| `C.bg` | `#000206` | Fondo base |
| `C.ink` | `#eaf0fb` | Texto principal |
| `C.mut` | `#6b7590` | Texto secundario, metadata |
| `C.glass` | `rgba(255,255,255,0.045)` | Superficie de tarjeta |
| `C.glass2` | `rgba(255,255,255,0.08)` | Superficie elevada |
| `C.line` | `rgba(150,180,255,0.14)` | Borde por defecto |
| `C.surface` | `rgba(12,16,30,0.86)` | Paneles |
| `C.overlay` | `rgba(2,3,10,0.98)` | Fondo de modal |
| `C.locked` / `C.lockedBg` | `rgba(255,255,255,0.12)` / `0.04` | Estado bloqueado |

El fondo real no es plano — es el radial de `BASE.root`:

```
radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)
```

Ese `18%` vertical es intencional: pone el punto de luz detrás del orbe.

### Named Rules

- **El color del usuario manda sobre el de marca.** En cualquier superficie que represente a la persona (orbe, credencial, botón primario de auth, focus, hover), el color viene de `useUserColor()` en componentes React o `getUserColor()` en funciones sin hooks. Nunca hardcodees uno de los 4.
- **Paleta de usuario cerrada, 4 opciones:** Hielo `#7dd3fc` (default), Rosa `#ff6b9d`, Oro `#ffb02e`, Lima `#84cc16`. Se bajó de 7 a 4; Púrpura, Esmeralda y Blanco se eliminaron. Fuente: `src/shared/components/ColorPicker.tsx`. Persistido en `localStorage['omicron_user_color']`.
- **El orbe nunca es gris.** `color={C.cyan}` en un `GeodesicOrb` es un bug — `C.cyan` es el gris de marca. Va `color={uc}` o `color={getUserColor()}`.
- **Estado se lee por color, no solo por texto.** Pero el color nunca es el único portador: siempre hay label.
- **Los estados `:focus`/`:hover`** se resuelven con la variable CSS `--omi-accent`, no con clases Tailwind.
- **Vidrio fijo ≠ vidrio sticky.** `header-glass` (0.55) es para la barra superior, que no tiene contenido pasando por debajo. Una barra `position: sticky` sobre una lista que scrollea usa `sticky-glass` (0.96) con el mismo blur: con menos alfa, en el teléfono el texto de abajo se lee *a través* del título (medido en Aprendizaje: a 0.55 y a 0.86 la cola se filtraba; a 0.96 desaparece).

## Typography

Una sola familia de sistema para todo el texto legible, y mono para lo que debe leerse como *dato*.

- **Sans:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif`
- **Mono:** `ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace`

No hay webfonts. No se cargan. La familia de sistema es una decisión, no una omisión: en móvil arranca instantánea y en Apple se ve nativa.

### Hierarchy

Escala armónica ratio ~1.25 (Major Third), en px, de `SIZE`:

| Token | px | Para qué |
|---|---|---|
| `xxs` | 9 | Labels de sistema, badges, contadores tiny |
| `xs` | 11 | Eyebrows, tags, chips, hints |
| `sm` | 13 | Body secundario, captions, metadata |
| `md` | 15 | Body principal |
| `lg` | 17 | Subtítulos, card titles |
| `xl` | 20 | Títulos de sección |
| `xxl` | 24 | Hero numbers, stat values |
| `hero` | 32 | Display headlines |

Los 8 estilos compuestos de `FONT_STYLE` (`label`, `mono`, `title`, `subtitle`, `body`, `chip`, `input`, `stat`) ya combinan familia + tamaño + tracking. Usalos enteros en vez de rearmarlos.

Cuando hace falta **sólo el tracking** (el estilo compuesto no cierra porque el tamaño es propio del componente), se pide a `LETRA`: `apretada` (-0.15), `titulo` (-0.4), `denso` (0.4), `medido` (0.6), `etiqueta` (1), `ancha` (1.5), `anunciada` (2). Antes de la escala había **dieciocho números escritos a mano en 151 sitios** —0.5 acá, 1.4 allá, 2.5 en el aviso de arranque—, que es exactamente lo que la regla 4 prohíbe para el color pero aplicado al aire entre letras. 91 de esos 151 caen exactos en su paso y 139 a 0.1 px o menos; los 12 restantes son dos decisiones explícitas: el aviso del arranque baja de 2.5 a 2 y un 0.1 positivo sube a 0.4. Un `letterSpacing: 1.2` suelto hoy es hallazgo del contrato. La hoja CSS tiene la misma escala escrita como variables (`--letra-apretada` … `--letra-anunciada` en `src/index.css`), porque `var()` no entra en un style en línea y el número tampoco entra dos veces: los nueve `letter-spacing` que quedaban en `aprendizaje.css` se pidieron al espejo, y el test verifica que los siete pasos de un idioma sean los siete del otro.

### Named Rules

- **No inventes tamaños.** Si el que necesitás no está en `SIZE`, usá el más cercano. Un `fontSize: 14` suelto es deuda.
- **Mono = dato, no decoración.** Eyebrows en mayúscula (`label`, tracking `1.4`), métricas, contadores, chips. El texto que se lee como prosa va en sans.
- **Tracking negativo solo en display.** `title` `-0.3`, `stat` `-0.5`. El body nunca lleva tracking negativo.
- **Body a 15px con `line-height` 1.5.** No lo bajes por ganar densidad.

## Layout

Grid de **4px**. `SP` da los múltiplos crudos (`SP[1]`=4 … `SP[16]`=64); `SPACING` da la escala semántica (`xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 40, `xxl` 64).

**Mobile-first, y en serio.** La app se usa en el teléfono; el shell es una columna de altura completa con `flex` y `overflow: hidden` en la raíz (`BASE.root`), y solo el `scrollArea` interno scrollea (`BASE.scrollArea`, con `WebkitOverflowScrolling: 'touch'`). El header y el panel de detalle son `flexShrink: 0`. El panel de detalle está topeado a `maxHeight: 38vh`.

Grillas de stats: `1fr 1fr` con `gap: 8`.

`Z` define las capas: `base` 0, `card` 10, `orb` 20, `overlay` 40, `modal` 50, `toast` 60.

> Dos z-index viven fuera de `Z` a propósito y no se tocan sin leer por qué: `AuthOverlay` en 95 (tiene que quedar sobre `ConvalidaOmicron` en 90) y el loader de arranque de `App.tsx` en 200.

## Elevation & Depth

La profundidad se construye con **vidrio + blur + borde de 1px**, no con sombras duras.

Dos fenómenos ópticos distintos viven acá y se piden por separado: la luz que **atraviesa** una superficie (`BLUR`) y la luz que una superficie **emite** (`HALO`). Confundirlos es lo que produjo los 21 radios sin dueño.

### Vidrio — `BLUR`

`vaho` 8, `escarcha` 12, `cristal` 16, `esmeril` 20. Cuatro pasos de la grilla de 4px; empate hacia arriba, porque más escarcha sigue siendo vidrio y menos escarcha ya es otra superficie. Estaban escritos **44 veces en siete radios** (6/8/12/14/16/18/20); se mueven 14 sitios, todos 2px.

- **El número pierde la unidad.** Un desenfoque es `blur(16px)`, nunca `16px`. El token anterior (`BLUR = { sm: '8px', md: '16px', lg: '24px' }`) era dos errores juntos: sus valores llevaban la unidad escrita y se inyectaban en `backdropFilter` sin la función, así que la barra, las tarjetas y el header emitían `backdrop-filter: 16px` — una declaración inválida que el navegador descarta en silencio. **El vidrio de esas tres superficies nunca se desenfocó.** Hoy se escribe `backdropFilter: \`blur(${BLUR.cristal}px)\`` y `sm`/`lg`, que no usaba nadie, se fueron.
- **Siempre en pareja** `backdropFilter` + `WebkitBackdropFilter`: sin el prefijo, Safari en iOS no lo aplica y la tarjeta queda plana.
- **`VELO` no es vidrio.** El velo de lectura de `useProgressiveBlur` (1.5px sobre contenido todavía no visitado) subido a `BLUR.vaho` (8px) ocultaría texto en vez de insinuarlo: es una escala propia de dos pasos (`apenas` 1.5, `nitido` 0) y está declarada como excepción, no como olvido.

### Luz emitida — `HALO`

`chispa` 4 (glifos, chips, badges), `ascua` 8 (un control encendido), `foco` 12 (tarjeta o píldora flotando), `marca` 16 (el halo canónico de la marca, `--glow-omi`), `resplandor` 24 (superficie grande: CTA, banda), `difusion` 40 (baño de luz de un panel), `escena` 72 (el orbe como escena, no como control). Siete pasos sobre la grilla de 4px, para un inventario de **126 halos escritos a mano en 21 radios** (0, 1, 3, 4, 5, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 26, 30, 40, 72). Ninguno de esos números era una decisión; sólo 16 de los 126 se mueven más de 2px en el radio de un desenfoque, que es el cambio menos visible que existe en esta app. Empate hacia arriba: una luz que se achica deja de contar estado, y el brief prohíbe que un estado sea sólo color.

- **Un anillo no es un halo.** `0 0 0 1px` es offset, offset, **ancho**, radio: un borde. Le pide a `BORDER`, no a `HALO`, y quien lo confunda convierte un borde de 1px en una luz de 4px.
- **`0 0 0px` es la ausencia de luz**, el `initial` de un beat que crece hasta su halo; el cero no es un paso de la escala.
- **El espejo CSS existe** porque `var()` no entra en un style en línea y el número tampoco entra dos veces: `--halo-chispa` … `--halo-escena` y `--vidrio-vaho` … `--vidrio-esmeril` en `src/index.css`, verificados línea a línea contra `HALO` y `BLUR` por el contrato.

### Elevation — la altura de un cuerpo

La **caída** responde a una sola pregunta: ¿a qué altura flota esto? Cuatro pasos, dueño `theme/shadows.ts`, espejos `--altura-*` (las capas completas) y `--caida-*` (la geometría sin pigmento) en `src/index.css`.

| Paso | Capa cercana — define el borde | Capa lejana — da la altura |
|---|---|---|
| `sm` | `CERCANA.sm` · `0 1px 2px rgba(0,0,0,0.25)` | `LEJANA.sm` · `0 4px 12px rgba(0,0,0,0.2)` |
| `md` | `CERCANA.md` · `0 1px 3px rgba(0,0,0,0.3)` | `LEJANA.md` · `0 8px 24px rgba(0,0,0,0.35)` |
| `lg` | `CERCANA.lg` · `0 2px 6px rgba(0,0,0,0.35)` | `LEJANA.lg` · `0 16px 48px rgba(0,0,0,0.45)` |
| `xl` | `CERCANA.xl` · `0 4px 12px rgba(0,0,0,0.4)` | `LEJANA.xl` · `0 24px 64px rgba(0,0,0,0.55)` |

- **`SHADOW.<paso>`** — la pareja completa. Es lo que pide una superficie asentada, y es la forma por defecto.
- **`ELEVATED.lejana(paso, color)`** — **una** capa lejana con el color que el sitio elija. Sirve para el negro de profundidad (`tint(C.black, 30)`) y para la sombra teñida —la de un elemento cuyo color es la marca: el color personal del usuario, el ámbar del brief—, que `SHADOW` no puede dar porque es negro.
- **`ELEVATED.tinte(paso, color)`** — la teñida que además necesita el negro para asentarse: dos capas, misma geometría, dos pigmentos.
- **`--caida-<paso>`** — la geometría sola, sin pigmento. Existe porque el CSS inyectado (el banner de actualización de la PWA) no puede importar el tema: pide la caída y pone su propio color.

**Cómo cae un valor huérfano.** Treinta capas escritas a mano en diecinueve archivos (doce geometrías distintas) se barrieron con dos reglas, y están escritas acá porque ninguna es obvia:

- **Un estado es un paso.** Donde hay dos estados (reposo/foco, calma/alarma) las capas caen a pasos **consecutivos**, no al mismo: si el reposo y el foco comparten paso, la altura deja de contar el estado, y el brief prohíbe que un estado sea sólo color. La prueba viva es la cola de trabajo: `.cola-item` en reposo pide `--altura-sm` y en `:hover`, `--altura-md`.
- **Un paso solo se va al más cercano en desenfoque, y ante un empate se va HACIA ABAJO.** Es el criterio inverso al de `HALO` (empate hacia arriba) y la asimetría es deliberada: una luz que se achica deja de contar estado; una sombra que se agranda sí puede tapar la superficie que está debajo. Este mundo construye la profundidad con superficies escalonadas y vidrio, no con sombras pesadas.

### Shadow Vocabulary

`GLOW` quedó en **una sola entrada viva** (`cyan`, `0 0 ${HALO.marca}px` al 0.42); `gold`, `purple`, `green`, `red` y `toast` eran código muerto escrito con un 18px que era un 16 mal medido.

| Token | Valor |
|---|---|
| `glow` | `0 0 ${HALO.marca}px rgba(106,169,255,0.25), LEJANA.md` |
| `glowGold` | `0 0 ${HALO.marca}px rgba(242,177,52,0.25), LEJANA.md` |

### Named Rules

- **Una superficie asentada pide la pareja.** `SHADOW.<paso>` son dos capas y así se usan. Una capa lejana sola (`ELEVATED.lejana`) es correcta cuando el sitio ya vivía con una —viaja bajo un halo, sobre una escena—: la escala cambia la geometría, no la composición.
- **La altura se pide a la escala, en los dos idiomas.** Un `0 12px 34px` suelto fuera de `theme/` es hoy hallazgo del contrato, igual que `0 0 18px` lo era de la luz. Tres cosas no son altura y están perdonadas por nombre: los offsets ceros (`0 0 Npx` es luz y lo cobra la vara de `HALO`), una capa `inset` (es el filo del vidrio, no un cuerpo elevado) y la línea `--altura-*:` del espejo, que se vela texto a texto contra el dueño.
- **El halo se pide a `HALO`, el desenfoque a `BLUR`.** Un `0 0 18px` o un `blur(14px)` suelto hoy es hallazgo del contrato, en el style en línea y en la hoja CSS.
- **El glow reemplaza al borde, no lo acompaña.** En los wrappers del orbe se conserva el `boxShadow` suave y se quitó el `border` sólido (PRs #326–#328).
- **`BORDER.default` es `1px solid rgba(150,180,255,0.14)`.** Las variantes de color (`gold`, `purple`, `green`, `red`) van a `0.30`.

## Shapes

`RADIUS`: `sm` 8, `md` 12, `lg` 16, `xl` 22, `pill` 999.

En código hay tres radios que no están en la escala y son reales: tarjeta 18, botón 15, stat card 14. Si tocás uno de esos componentes, mantené el valor existente; no lo "arregles" a la escala en un cambio de otra cosa.

El lenguaje de forma es **rectángulo redondeado generoso**, nunca esquina viva. La única forma circular del producto es el orbe, y es circular porque es el retrato de la persona.

## Components

### Buttons

Los tres viven en `BASE` (`layout.ts`), los tres son `width: 100%`, `padding: '12px 0'`, `borderRadius: RADIUS.sm`, `fontWeight: 700`, `fontSize: 15`, `letterSpacing: LETRA.apretada`, y centran su contenido con `gap: 8` y un `minHeight` táctilde de 44px en el sitio de uso.

- **Primary** — `linear-gradient(135deg, C.gold, C.amberDeep)` sobre `C.onAccent` (tinta oscura, nunca blanco), sin borde, y su caída es `ELEVATED.lejana('md', tint(C.gold, 28))`: la escala de altura con el pigmento de la marca.
- **Secondary** — `C.surfaceLight`, borde `1px solid C.line`, texto `C.ink`. Sin sombra: es la superficie asentada, no la que flota.
- **Danger** — `rgba(248,113,113,0.12)`, borde `rgba(248,113,113,0.35)`, texto `C.red`.

> En las superficies de auth el primary se tiñe con el color del usuario en vez del gradiente de marca. Es intencional: ahí el botón representa a la persona.

### Cards / Containers

`BASE.card`: `padding: '13px 15px'`, `borderRadius: 18`, fondo `rgba(255,255,255,0.045)`, borde `rgba(150,180,255,0.14)`, blur 14px.

La **tarjeta glass premium** de las pantallas de auth es una variante distinta: blur 16px + gradiente `160deg`, sin borde sólido.

`BASE.statCard` para métricas: `padding: '9px 11px'`, `borderRadius: 14`, fondo `rgba(255,255,255,0.05)`.

### Inputs / Fields

Texto en `FONT_STYLE.input` (sans, 15px). Fondo de vidrio, borde `BORDER.default`. El `:focus` toma el color del usuario vía `--omi-accent` — nunca un anillo azul de navegador, y nunca `outline: none` sin reemplazo visible.

### Navigation

Header fijo (`BASE.header`): `padding: '13px 16px'`, fondo `rgba(9,12,22,0.55)`, blur 20px, borde inferior `rgba(150,180,255,0.12)`, `zIndex: 2`. Avatar arriba a la derecha; al tocarlo abre `CredencialModal`.

**Barra de asistente (sticky, dentro de una pestaña):** una sola fila de 47px — título `card-title` (17px; 20px recién desde 900px), el contador a la derecha en `SIZE.sm` con `tabular-nums`, y el progreso como **línea inferior** de la barra (riel de 2px, `left:0/right:0`, lleno con `scaleX()` en el color del usuario), no como un bloque más en la pila vertical. Fondo `sticky-glass` + blur 20px, `margin: 0 -16px` para llegar de borde a borde y `box-shadow: 0 1px 0` para la línea de `BASE.header` sin gastar altura. Regla de fondo: en el teléfono la altura es la moneda — una barra de dos filas con aviso largo adentro medía 139px sobre 353px visibles (39% de la pantalla).

### GeodesicOrb (componente firma)

El orbe **es** el producto. Es lo primero que se ve y lo único que se comparte. Tiene que verse **idéntico en toda la app**.

Escala canónica, y no hay tamaños intermedios:

| Uso | `size` |
|---|---|
| `TabLoader` | 64 |
| Auth, fallbacks de Suspense | 80 |
| Carga de app, análisis de CV, Academia | 110 |
| `CredencialModal` (retrato, `spinning={0}`) | 130 |

Dos cinemáticos están fuera de escala **a propósito** y no se tocan: `GemeloReveal` (140/100) y `OrbOnboarding` (240) tienen su propia coreografía.

Reglas duras:

1. **Sin anillo.** Ni el "Outer ring" interno del componente ni un `border` en el wrapper. Solo el `boxShadow` glow.
2. **Siempre el color del usuario.** `color={uc}` o `color={getUserColor()}`.
3. **`breathing` sí, `spinning` según contexto.** En retrato (`CredencialModal`) `spinning={0}`.

## El estándar asistente (aplica a TODA la app)

Ómicrom no es un tablero: es un asistente que vive en un bolsillo. Estas nueve reglas son la vara con la
que se juzga cualquier pantalla; no se renegocian caso por caso.

1. **Una barra por pantalla, de una sola fila.** Título + estado + el progreso como línea inferior. La
   altura del primer viewport es la moneda: en un teléfono de 353px visibles, una barra de dos filas con
   avisos adentro se come el 39% de la pantalla antes de mostrar nada.
2. **Habla, no etiqueta.** "Preparando tu gemelo…" y no "INICIALIZANDO PROTOCOLO". Un código de nivel se
   escribe como palabra ("Fundamento", no `FOUNDATION`). Si hay que explicar la sigla, la sigla sobra.
   **El remate de un aviso de carga es un carácter (`…`), no tres puntos (`...`):** son el mismo estado con
   dos tipografías, y en las etiquetas monoespaciadas los tres puntos se ven sueltos.
3. **Los cuatro estados o la pantalla no existe:** vacío con acción, cargando visible, error con causa y
   salida, y listo con confirmación. Un botón que no cambia de aspecto al tocar no es un botón.
4. **Cero repetición.** `src/shared/components/OmicronChrome.tsx` es la ÚNICA biblioteca de andamio que
   queda: barra, tarjeta, chip, métrica, progreso, anillo, carga y vacío salen de ahí. Dos archivos que
   dibujan lo mismo (una credencial en canvas, un vidrio, un badge) se suben a esa biblioteca o a un token.
   Copiar y pegar estilo está tan prohibido como copiar y pegar lógica.
5. **Cinco familias de tono, no cincuenta.** El sistema tiene silver-ice, índigo, teal, ámbar y rosa-rojo,
   cada una con su `Dim` (borde), `Faint` (relleno) y `Ghost` (soplo). Un `rgba(160,174,192,0.62)` suelto
   es un error de redondeo: se va al token más cercano. **Está prohibido el cian saturado** (`#00f5ff`,
   `rgba(0,245,255,…)`) incluso como alpha: fue el tono que hizo que 40 archivos se vieran de otra marca.
   Los rellenos oscuros también son familias, no inventarios: la app tiene **cuatro paneles** —
   `C.surface` (tarjeta), `C.surfaceLight` (elevado/hover), `C.overlay` (hoja y modal) y `C.wash` (lavado
   translúcido sobre contenido), además de `C.sticky` para la barra fija y `C.scrim` para las sombras.
   Antes de este contrato había 28 rgba casi iguales haciendo esos cinco papeles.
   Dos tonos se promovieron porque ya estaban circulando sin nombre: `C.tealDeep` (#008b9e, el extremo
   oscuro del degradado silver→teal de los botones grandes) y `C.flame` (#ff6432, el naranja de la racha,
   que StreakBanner escribía tres veces). Para una capa de caída en un color que no es negro existe
   `ELEVATED.lejana(paso, color)` —la sombra teñida de un elemento cuyo color es la marca—: `SHADOW` es
   negro y no sirve ahí. `ELEVATED.cta(color)` queda como atajo del paso `md`.
   Y hay **dos rampas de umbral** —lo que se ve antes de que exista el contenido—: `UMBRAL.apertura`
   (auth y takeover del orbe: negro frío → tinta del ámbar → casi negro) y `UMBRAL.credencial` (la misma
   rampa con el centro frío, porque la tarjeta se pinta sobre el navy impreso). La primera estaba copiada
   palabra por palabra en cuatro componentes.
6. **Se toca con el pulgar.** Blancos de 44×44, 8px entre ellos, foco visible en el color del usuario, y
   nada de glifos unicode o emojis como iconos: se dibujan con CSS o con SVG.
7. **Un solo gesto firma.** El orbe respira con el estado real de la persona, y ese mismo latido (mismo
   `ANIM.breathe`, mismo color de acento) es el que heredan las barras de progreso, los puntos de estado y
   el indicador de "guardando". Una animación que no comunica estado es decoración y se borra.
8. **Una sola persona gramatical: el tú neutro.** "Sube tu CV", "Prueba de nuevo", "Vuelve a intentarlo".
   El voseo rioplatense ("Subí", "Probá", "tenés", "Volvé") convivió con el tú en las tres capas —componente,
   Edge Function y los `raise exception` de las RPC, que PostgREST devuelve como P0001 y el navegador muestra
   tal cual— y se leían las dos voces en la misma pantalla de error. Rige el tú porque es el registro del
   cromo de estados y porque es el único que no marca una región. Se perdona el acento sólo en los nombres
   propios y en las palabras que no son vos ("podrás", "estás", "Andrés").
9. **Un concepto, una palabra.** La unidad de capacidad se llama **habilidad** (la barra ya decía
   "Habilidades"), la prueba que la valida se llama **examen**, y lo que falta aprender es **brecha**.
   "skill", "competencia", "quiz", "expertise" y "XP" estaban repartidos por pantalla llamando a la misma
   cosa de tres maneras, y eso es tres oportunidades de que el usuario crea que son tres cosas. Quedan
   admitidas sólo donde nombran un campo de la máquina —una columna, la clave de un JSON del motor—, y eso
   está listado con su coordenada en el guard, no eximido por carpeta.

**Excepción documentada y única:** `src/features/mapa/**` es un port 1:1 del donante. Su escala (17/14/12px,
radio 10, sus `#1a1408`/`#2a313b`) y su coreografía de 4 actos son el contrato y se prueban contra un
golden; no se normalizan con estas reglas.

## Do's and Don'ts

**Do**

- Leé `src/theme/` antes de escribir un valor visual. Si el token existe, usalo.
- **El acento se hereda, no se pide.** `App.tsx` escribe `var(--omi-accent)` una vez en la shell y toda la
  app lo usa con `ACCENT` de `src/theme/tokens.ts`. Un componente de andamio que llama `getUserColor()` en
  el render congela el color del usuario en el momento del import: se borra. Solo leen el hook (`useUserColor()`)
  los roots que ponen la variable y los canvas que pintan píxeles (orbe, credencial).
- **El alfa se calcula, no se pega.** `tint(color, 34)` en vez de `${color}34`: devuelve `color-mix()` y por
  eso funciona con hex y con `var(--omi-accent)`. Concatenar hex es la razón por la que 20 tonos casi iguales
  circulaban como "el silver del sistema".
- **El canvas tiene su propia hoja del mismo tema.** `src/theme/canvasInk.ts` es la única fuente de color
  para lo que se pinta en píxeles: `inkAt(hex, alfa)` reemplaza a `tint()` (canvas no lee `color-mix()`),
  `CARD_INK` da la tinta por rol y `CARD_NAVY` el fondo de la tarjeta imprimida. Ningún componente escribe
  un hex para dibujar, y la credencial la dibuja un solo módulo (`features/gemelo/services/
  credencialCanvas.ts`) —antes eran dos dibujantes con alfas de 0.35 contra 0.45 para el mismo filete.
- **En CSS plano, la hoja habla con variables, no con rgba.** `src/index.css` y `src/styles/responsive.css`
  definen las familias (`--silver`, `--line`, `--glass`, `--sticky`, `--omi-accent`); cualquier otra hoja
  usa `var(--…)` o `color-mix(in srgb, var(--oro) 30%, transparent)`. Las sombras negras (`rgba(0,0,0,…)`)
  son la excepción aceptada: no son un tono de marca, son profundidad.
- **El contrato se vela solo.** `src/theme/contratoAsistente.test.ts` (veintiuna pruebas sobre diecisiete
  afirmaciones) barre el repo y falla
  si vuelve el cian del prototipo fuera del mapa, si alguien reabre un `const C = {}` propio (el espejo del
  simulador), si copia un vidrio de blanco crudo en vez de pedirlo al tema, si la credencial tiene dos
  dibujantes, si un carácter hace de icono, si una frase tuya vuelve al voseo, si la unidad de capacidad
  vuelve a llamarse "skill" en texto que se lee, si un aviso de carga vuelve a teclear `...` en vez de `…`,
  si la rampa de umbral vuelve a escribirse en un componente, si el tracking vuelve a ser un número suelto
  en vez de `LETRA`, si la luz vuelve a ser un número suelto en vez de `HALO` y `BLUR`, o si la caída de un
  cuerpo vuelve a escribirse a mano en vez de pedir la pareja `CERCANA`/`LEJANA` — y las tres varas
  pesan sobre los dos idiomas: `letterSpacing: 1.2` en un style en
  línea y `letter-spacing: 1.4px` en una hoja son la misma fuga escrita dos veces, igual que `0 0 18px` y
  `box-shadow: 0 0 18px`, y `0 12px 34px` y `box-shadow: 0 12px 34px`. Así que `src/index.css` declara los
  espejos `--letra-*`, `--halo-*`, `--vidrio-*`, `--altura-*` y `--caida-*`
  y el test compara los números de un lado contra los del dueño. La vara de la luz lleva dos precisiones que
  la hacen: sin el lookbehind, `0 0 0 1px` (un anillo: offset, offset, **ancho**, radio) casa desde el segundo
  cero y se convierte en un halo de 4px; y `0 0 0px` se perdona porque es la ausencia de luz con la que
  arranca un beat, no un paso de la escala. La de la altura lleva las suyas: manda la propiedad más cercana
  (`margin: 0 -16px 12px` no es una caída), una capa `inset` es una arista y no se mide, y el contexto se
  busca hacia atrás en el archivo porque una sombra larga se parte en varias líneas sin repetir la propiedad.
  Las varas de voz y léxico barren 292 archivos
  (cliente, Edge Functions y migraciones) con redes morfológicas y literales extraídos del código, no con
  una lista de palabras ya vistas; las excepciones se pagan con coordenada exacta. `design.qa.yaml` +
  `scripts/design/audit-debt.mjs` (métrica) y `scripts/design/codemod-dedupe.mjs` (barrido, simula si no le
  pasás `--apply`) son la medida; el test es la reja.
- Escribí estilos con los tokens `C` / `FONT` / `SIZE` / `RADIUS` en las pantallas premium (auth, credencial, reveal). Esas pantallas son **cero clases Tailwind** — objetos de estilo inline con tokens.
- Emparejá siempre `backdropFilter` con `WebkitBackdropFilter`.
- Mostrá la escala completa en cada número: `65/100`, `87/100`. Con su unidad y su contexto.
- Respetá `prefers-reduced-motion` en el mismo commit que la animación.

**Don't**

- **No propongas un mundo visual nuevo.** Ómicrom ya tiene identidad, tokens y 4 colores de usuario. Un `--design-system` que sugiera fondo claro, serif display o un accent nuevo está fuera de mundo: tomá de ahí solo lo que no contradiga este archivo.
- **No uses `#5cc8ff`.** Eliminado del repo.
- **No uses cian saturado** como color de marca. Se lee genérico y pelea con el color del usuario.
- **No inventes valores.** Ni `fontSize: 14`, ni `cubic-bezier` de memoria, ni un `0 0 18px` o un `blur(14px)` a mano, ni una caída escrita a dedo (`0 12px 34px`): la luz se pide a `HALO`, el vidrio a `BLUR` y la altura a `SHADOW` / `ELEVATED`.
- **No pongas `C.cyan` en un orbe.** Es el gris de marca.
- **No escribas jerga.** "Nodo Senior" → "Nivel: Senior". "Fundamento +15" → "Tu Excel está en 45/100 — este empleo pide 60/100". Cada pantalla se tiene que entender sin ambigüedad para un abogado, un ingeniero, un médico o un técnico. Explicá siempre **qué** hacer, **por qué** y **qué gana**.
- **No digas "ADN"** en UI. La identidad del usuario es el **Gemelo Digital**; la vista compartible es la **Credencial Ómicrom**. ("ADN" solo sobrevive en el system prompt interno de la IA, que el usuario no ve.)
- **No muestres "Verificada" en verde por heurística.** Verificar no es declarar. Ese sello se reserva para cuando exista un flag real de validación.
- **No renombres identificadores técnicos** al escribir texto de marca. Lo visible es "Ómicrom" con **M**; las claves de `localStorage`, eventos, canales realtime e ids de CSS son `omicron` con **N** y cambiarlas rompe la app o borra datos de usuarios.
