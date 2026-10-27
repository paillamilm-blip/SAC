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
  line: "rgba(150,180,255,0.14)"
  locked: "rgba(255,255,255,0.12)"
  locked-bg: "rgba(255,255,255,0.04)"
  grid: "rgba(92,140,255,0.05)"
  ink: "#eaf0fb"
  muted: "#6b7590"
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
> - `typography.ts` → `FONT`, `SIZE`, `FONT_STYLE`
> - `layout.ts` → `SP`, `SPACING`, `RADIUS`, `Z`, `BLUR`, `BORDER`, `BASE`
> - `shadows.ts` → `SHADOW`, `GLOW`
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

`BLUR`: `sm` 8px, `md` 16px, `lg` 24px. Siempre en pareja `backdropFilter` + `WebkitBackdropFilter` — sin el prefijo, Safari en iOS no lo aplica y la tarjeta queda plana.

Blur real por superficie: tarjeta 14px, header 20px, panel de detalle 24px, tarjeta glass premium de auth 16px.

### Shadow Vocabulary

`SHADOW` usa **dos capas** siempre: una cercana que define el borde, una lejana que da profundidad ambiental.

| Token | Valor |
|---|---|
| `sm` | `0 1px 2px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.2)` |
| `md` | `0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35)` |
| `lg` | `0 2px 6px rgba(0,0,0,0.35), 0 16px 48px rgba(0,0,0,0.45)` |
| `xl` | `0 4px 12px rgba(0,0,0,0.4), 0 24px 64px rgba(0,0,0,0.55)` |
| `glow` | `0 0 16px rgba(160,174,192,0.25), 0 8px 24px rgba(0,0,0,0.3)` |

`GLOW` da el halo de color por token (`cyan`, `gold`, `purple`, `green`, `red`, `toast`), todos `0 0 18px` con alpha ~0.45.

### Named Rules

- **Una sombra de una sola capa es un defecto.** Usá `SHADOW`.
- **El glow reemplaza al borde, no lo acompaña.** En los wrappers del orbe se conserva el `boxShadow` suave y se quitó el `border` sólido (PRs #326–#328).
- **`BORDER.default` es `1px solid rgba(150,180,255,0.14)`.** Las variantes de color (`gold`, `purple`, `green`, `red`) van a `0.30`.

## Shapes

`RADIUS`: `sm` 8, `md` 12, `lg` 16, `xl` 22, `pill` 999.

En código hay tres radios que no están en la escala y son reales: tarjeta 18, botón 15, stat card 14. Si tocás uno de esos componentes, mantené el valor existente; no lo "arregles" a la escala en un cambio de otra cosa.

El lenguaje de forma es **rectángulo redondeado generoso**, nunca esquina viva. La única forma circular del producto es el orbe, y es circular porque es el retrato de la persona.

## Components

### Buttons

Los tres viven en `BASE` (`layout.ts`), los tres son `width: 100%`, `padding: '13px 0'`, `borderRadius: 15`, `fontWeight: 700`, `fontSize: 15.5`, `letterSpacing: 0.2`, y centran su contenido con `gap: 8`.

- **Primary** — `linear-gradient(135deg, #a0aec0, #5e5ce6)`, texto blanco, `boxShadow: 0 12px 32px rgba(160,174,192,0.42)`. Es el único gradiente del sistema.
- **Secondary** — `rgba(160,174,192,0.10)`, borde `rgba(160,174,192,0.35)`, texto Silver Ice, blur 12px.
- **Danger** — `rgba(255,92,122,0.12)`, borde `rgba(255,92,122,0.35)`, texto rosa.

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

## Do's and Don'ts

**Do**

- Leé `src/theme/` antes de escribir un valor visual. Si el token existe, usalo.
- Usá `useUserColor()` / `getUserColor()` para cualquier cosa que represente a la persona.
- Escribí estilos con los tokens `C` / `FONT` / `SIZE` / `RADIUS` en las pantallas premium (auth, credencial, reveal). Esas pantallas son **cero clases Tailwind** — objetos de estilo inline con tokens.
- Emparejá siempre `backdropFilter` con `WebkitBackdropFilter`.
- Mostrá la escala completa en cada número: `65/100`, `87/100`. Con su unidad y su contexto.
- Respetá `prefers-reduced-motion` en el mismo commit que la animación.

**Don't**

- **No propongas un mundo visual nuevo.** Ómicrom ya tiene identidad, tokens y 4 colores de usuario. Un `--design-system` que sugiera fondo claro, serif display o un accent nuevo está fuera de mundo: tomá de ahí solo lo que no contradiga este archivo.
- **No uses `#5cc8ff`.** Eliminado del repo.
- **No uses cian saturado** como color de marca. Se lee genérico y pelea con el color del usuario.
- **No inventes valores.** Ni `fontSize: 14`, ni `cubic-bezier` de memoria, ni una sombra de una capa.
- **No pongas `C.cyan` en un orbe.** Es el gris de marca.
- **No escribas jerga.** "Nodo Senior" → "Nivel: Senior". "Fundamento +15" → "Tu Excel está en 45/100 — este empleo pide 60/100". Cada pantalla se tiene que entender sin ambigüedad para un abogado, un ingeniero, un médico o un técnico. Explicá siempre **qué** hacer, **por qué** y **qué gana**.
- **No digas "ADN"** en UI. La identidad del usuario es el **Gemelo Digital**; la vista compartible es la **Credencial Ómicrom**. ("ADN" solo sobrevive en el system prompt interno de la IA, que el usuario no ve.)
- **No muestres "Verificada" en verde por heurística.** Verificar no es declarar. Ese sello se reserva para cuando exista un flag real de validación.
- **No renombres identificadores técnicos** al escribir texto de marca. Lo visible es "Ómicrom" con **M**; las claves de `localStorage`, eventos, canales realtime e ids de CSS son `omicron` con **N** y cambiarlas rompe la app o borra datos de usuarios.
