# Estándar "asistente de bolsillo" — el diseño de una sola pieza

Compañero de [`2026-10-27-plan-b-mapa-neuronal.md`](2026-10-27-plan-b-mapa-neuronal.md). Este archivo
es el estado **verificado** de la unificación visual de Ómicrom: qué se midió, qué cambió y qué queda.
Nace del ledger de ejecución (`.superpowers/sdd/…/progress.md`, gitignoreado). Todo lo que sigue está
probado contra el repo, no dicho por mí.

**Mandato del usuario (2026-10-27, literal):** *"APLICA UN DISEÑO PARA TODA LA APP COMPLETA QUE NO SE
TE QUEDE NADA"*, refined en *"FUNCIONAR EN LOOPS · VERSE Y SENTIRSE COMO UN ASISTENTE HERRAMIENTA,
AMIGABLE CON EL USUARIO · SIN REPETIR NADA · INNOVADOR"*.

**Regla de oro que gobierna los cinco loops:** la app no se rediseña, se **unifica**. Nada se repite y
lo que queda fuera del sistema se mide, no se opina.

---

## 0 · La vara: qué es "asistente de bolsillo"

Tres criterios, en este orden, y la métrica que cierra cada loop:

| Loop | Qué hace | Criterio de salida (medible) |
| --- | --- | --- |
| L0 · contrato | Un solo vocabulario de tokens y reglas escritas donde el equipo las lee. | `DESIGN.md` + `src/theme/**` sin huecos; guards automatizados en verde. |
| L1 · dedupe | Todo valor fuera del sistema entra al sistema o se justifica. | **valores crudos distintos** en baja y cian prohibido = 0 fuera de `mapa/`. |
| L2 · un dibujante | La credencial se dibuja una vez, no cuatro. | Los 4 canvas comparten un fondo de tokens; `DEUDA_VIDRIO` achica. |
| L3 · voz | Cada superficie habla como el mismo asistente, con sus cuatro estados. | 0 avisos duplicados, 0 glifos unicode como iconos, 44 px mínimos reales. |
| L4 · gesto firma | Un solo movimiento caracteriza a la app. | Una familia de animación, `prefers-reduced-motion` respetado, < 16 ms/frame. |

**Excepción única y documentada:** `src/features/mapa/**` es un port 1:1 del donante. Su geometría, sus
colores y su coreografía de cuatro actos **no se negocian** (lo visual que ya le gusta al usuario se
porta igual, no se rediseña). Está fuera del escáner, fuera del lint de tokens y protegido por
`contratoMapa.test.ts`.

---

## 1 · L0 · El contrato (cerrado)

Aportes al vocabulario, todos nacidos de valores que ya existían repetidos —no de gusto personal—:

- `C.wash = rgba(6,10,22,0.6)` — lavado oscuro translúcido. Existían **6 variantes casi iguales** entre
  alfa 0.25 y 0.72 haciendo el mismo papel (fila sobre contenido, celda del radar, overlay de banner).
- `C.scrim`, `C.sticky`, `C.white`, `C.black`, `C.onAccent`, `C.ice`, `C.iris` — valores que vivían
  sueltos en 3-5 archivos con el mismo rol.
- **Regla de los cuatro paneles** (regla 5 de `DESIGN.md`): tarjeta = `C.surface`; elevado/hover =
  `C.surfaceLight`; hoja/modal = `C.overlay`; lavado translúcido = `C.wash`. Barras sticky = `C.sticky`;
  sombras = `C.scrim`. Antes de la regla había **28 rgba casi iguales** haciendo esos cinco papeles.
- CSS plano habla con variables (`--glass`, `--glass-2`, `--line-strong`, `--sticky`, `--omi-accent`),
  no con rgba copiados. **Excepción aceptada:** las sombras puras de negro en CSS.
- El acento **se hereda** (`var(--omi-accent)`), no se reescribe por componente.

Guards nuevos, en el CI: `src/theme/contratoAsistente.test.ts` (4 tests) vigila —
(1) que el cian saturado y el cian del donante no vuelvan, ni armados por concatenación;
(2) que nadie vuelva a copiar el tema (`const C = {` fuera de `theme/`);
(3) que el vidrio crudo `rgba(255,255,255,0.0x)` solo exista en `theme/`, `index.css` y `mapa/`;
(4) que la lista `DEUDA_VIDRIO` (los canvas pendientes de L2) **solo pueda achicarse**.

---

## 2 · L1 · Dedupe (cerrado)

Herramienta: `scripts/design/codemod-dedupe.mjs` (simulación por defecto; `--apply` escribe) y
`scripts/design/audit-debt.mjs` (la métrica). El codemod **no es un regex plano**: es un escaneador que
reconoce literales, anida `${…}`, salta comentarios y respeta el nombre ligado a `C`. La primera
versión sin parser corrompió plantillas (`'${C.glass2}'` como string) —se revirtió todo el barrido y se
volvió a aplicar desde HEAD limpio.

### Trayectoria medida (no afirmada)

| Momento | valores fuera de token | distintos | archivos afectados |
| --- | --- | --- | --- |
| Fin de L1 antes del barrido | 323 | 174 | 39 |
| Paso 1 (familias de color) | 191 | 123 | 32 |
| Paso 2 (paneles + CSS plano) | 138 | 86 | 26 |
| **Cierre L1** | **127** | **80** | **25** |

Hitos del cierre:

- **Cian prohibido fuera de `mapa/`: 0.** Se fueron 5 `rgba(0,245,255,*)` en `CredentialsPanel.tsx`
  (→ `tint(C.cyan, 4/3/12)`) y las dos reglas de `index.css` que usaban el cian del donante
  (→ `color-mix(in srgb, var(--omi-accent) …)`).
- **`responsive.css`: 367 → 61 líneas.** Todo el andamiaje del prototipo muerto (`.hub-*`,
  `.unified-*`, `.module-card`, `.nav-fab`, `.oraculo-bar`, `.mobile/.tablet/.desktop-only`,
  `.swipe-indicator`, `.pull-refresh-indicator`, `.page-enter/-exit`, `.card-appear`, `.ripple`,
  `.touch-feedback`, `.no-select`, `.allow-select`) y el duplicado `.scrollbar-hidden`. Quedan lo que
  sí se aplica: safe areas, suavizado, tap-highlight heredado del acento, `overscroll`, los 44 px de
  área táctil y el `font-size: 16px` que evita el zoom al enfocar un input.
- **El espejo privado del tema, afuera.** `UniversalSimulator.tsx` tenía su propio `const C` con 14
  entradas reexportadas y sus propios `MONO`/`DISP`. Ahora importa `C` y `FONT` de `@/theme`
  (`C.text→C.ink`, `C.sub→C.mut`, `C.panel→C.surface`, `C.card→C.surfaceLight`). El tema se importa, no
  se copia; y el test (2) no lo deja volver.
- **Paneles degenerados:** dos gradientes `linear-gradient(145deg, X, X)` en `OrbOnboarding.tsx` y un
  ternario `cond ? C.surface : C.surface` en `OmicronBar.tsx` eran complejidad que no dibujaba nada;
  quedaron en un `background` plano.
- **Padding en rejilla de 4 px** en los cinco sitios fuera de escala (`7px 12px → 8px 12px`, etc.).
- **Estado muerto fuera:** `isSpeaking` en `OrbShell` lo escribía un listener y no lo leía nadie, y
  otros tres listeners eran no-op declarados. El efecto quedó escuchando únicamente `oracle:listening`
  (el que sí pinta la barra). Los eventos de voz **siguen emitiéndose** —el contrato de la capa de voz
  no se toca—, solo deja de fingir que la UI los consume. **Lint: 1 warning → 0.**

### Qué son los 127 que quedan

No son basura dispersa: son **el plano de trabajo de L2**. Se repiten exactamente en los tres canvas de
credencial (`CredencialModal` 29, `RedSocial` 20, `PasaporteGemelo` 18, `ProgressRadar` ~10), y los
tres valores más repetidos del sistema están ahí: `#eaf4ff` (7×, tres archivos —un "ink" paralelo que
nadie nombró), `rgba(255,255,255,0.06)` (6×) y `rgba(160,174,192,0.75)` (3×), además del `9.5px`
tipográfico y los `7px`/`28px` mágicos. **Cerrar L2 borra el bloque principal de la deuda restante.**

### Verificación

- CI completo: `typecheck` limpio · `lint` **0 errores y 0 warnings** · `vitest --run` **35 archivos /
  442 pruebas** en verde, incluidos los 4 guards nuevos y el contrato del mapa intacto.
- App corriendo en el navegador (no solo tests: Vitest stubbea CSS, así que las hojas se validan acá):
  `--omi-accent #a0aec0`, `--sticky rgba(6,8,16,0.96)`, `color-mix` resuelve a
  `color(srgb 0.627 0.682 0.753 / 0.34)`, `body` 16 px, 8 botones y **0 por debajo de 40 px**, `#root`
  430 px, 10 hojas de estilo, **0 errores de consola**.
- Pendiente de verificación honesta: la rama de dos columnas en ≥ 900 px no se pudo probar en el
  incrustado (viewport sin alto nativo); cae en el QA del navegador real.

---

## 3 · Lecciones fijadas (aplican a L2-L4 y a cualquier PR futuro)

1. **Sin parser no hay barrido.** Un codemod de estilos es un escaneador de literales o es vandalismo.
2. **Se mide antes y después.** "Quedó más limpio" no existe; existe la tabla de arriba.
3. **El tema se importa, no se copia.** Un `const C` local es un segundo sistema de diseño.
4. **CSS plano habla con variables.** Un rgba en una hoja es un token huérfano; excepción: sombra negra.
5. **La deuda que queda se reserva, no se esconde.** `DEUDA_VIDRIO` es una allowlist que solo achica.
6. **Lo que ya gustó se porta 1:1.** El mapa y sus colores no entran en ninguna unificación.
7. **El código muerto es repetición.** Escuchar un evento que nadie consume repite una promesa vacía.

---

## 4 · Siguiente loop

**L2 · Un solo dibujante de credenciales.** `CredencialModal.tsx`, `PasaporteGemelo.tsx`,
`RedSocial.tsx` y `ProgressRadar.tsx` dibujaban la misma credencial con geometría propia. Objetivo: un
fondo compartido de tokens con **cero cambio visual percibido** (en canvas los colores quedan hex
concretos del token; `color-mix` no existe en canvas 2D). Criterio de salida: los 127 → menos de 60 y
`DEUDA_VIDRIO` vacío o en una entrada.

Después: L3 (voz amigable y los cuatro estados en cada superficie, sin avisos repetidos y sin glifos
unicode como iconos: `◈` en la navegación de `OrbShell`, `🧭`/`👋`/`🎤 ➤` en `AcademiaTab`,
"CARGANDO CREDENCIAL..." en `RedSocial`, `✕` en `ErrorBoundary`) y L4 (gesto firma único, dedupe de
`spin`/`cp-spin` y de las copias de keyframes entre `index.css` y `theme/`).

El **handoff de producción** sigue siendo del usuario (migraciones 10011→10012→10013, borrar las 6 Edge
Functions muertas, secrets, desplegar `analizar-cv`, curl de invitado, RLS cruzada, QA Q1-Q10). Nada de
eso se automatiza desde acá: son sus clics en el dashboard.
