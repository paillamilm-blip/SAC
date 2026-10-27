# Plan B — el mapa neuronal del donante dentro de Ómicrom

Compañero de [`2026-10-26-unificacion-aprendizaje-motor.md`](2026-10-26-unificacion-aprendizaje-motor.md)
(Plan A: el motor). Este archivo es el estado **verificado** del port visual y el corte B5-B11 con la
traba real de cada fase. Nace del ledger de ejecución (`.superpowers/sdd/…/progress.md`, que está
gitignoreado); todo lo que sigue es lo que quedó probado, no lo que quedó dicho.

Fecha de cierre de B-verif: 2026-10-27.

## 1 · Qué es "1:1" acá, y cómo se mide

El donante (app CV, Next 16 / React 19) no usa ninguna librería de animación: toda la coreografía del
mapa son keyframes CSS con `animation-delay` inline. Portar "1:1" significa que la geometría, los
textos, los tiempos y los estados del SVG hijo son los mismos, y que lo único negociable son los
colores (D5: el ámbar del donante es el color del usuario en Ómicrom).

La medición tiene tres capas, y la segunda fue la que corrigió la primera:

| Capa | Artefacto | Qué prueba |
| --- | --- | --- |
| Generador | `scripts/oracle-donante.mjs` | Corre el algoritmo del donante sobre su propio `data/db.json` y congela el resultado. |
| Golden | `src/features/mapa/__golden__/mapa-8-brechas.json` | El contrato que el port debe reproducir byte a byte (sin hex: con **roles**). |
| Validación externa | DOM SSR real del donante (`referencia/donor-render.html`) + navegador vivo | Que el golden no sea lo que el autor del port cree que hace el donante. |

**Lección fijada:** el oráculo escrito por quien escribe el port no es oráculo. La validación contra el
DOM del donante encontró un error de texto en tres lugares del golden (el donante pinta
`CATEGORIAS[cat]` = "Habilidad dura", no la clave `dura`) que el test de golden habría dado por bueno.

## 2 · Fases cerradas

| Fase | Commit | Métrica única con la que se cerró |
| --- | --- | --- |
| B1 tokens | `b1e1b31` | Cero hex en `src/features/mapa/*.ts*` (contrato) y cero consumidores del cian prohibido `#5cc8ff`. |
| B2 geometría | `44603ed` | `construirMapa()` reproduce el golden entero: 18 pasos, delays `[135,180,315,360,495,540,675,720]`, `caminoDelay 960`, logro en `(468.51, 8.66)`. |
| B3 mapa + actos | `9f6dde5` | 16 tests: el SVG pinta el golden con roles, los 4 actos en CSS puro y `prefers-reduced-motion` sin nodos fantasma. |
| B4 montaje | `b4f0912` | 8 tests de la pestaña: puente → muestra → vacío, cola colapsada, escritura optimista con reversión. |
| B-verif | `acce6ba`, `f300554` | La app corriendo en navegador: la pestaña se abre escribiéndole al Oráculo y el mapa es idéntico al del donante vivo. |

CI al cierre: typecheck limpio, lint con el único warning preexistente (`OrbShell.tsx:325 isSpeaking`),
**436 tests en 34 archivos, todos verdes**.

## 3 · B-verif: lo que se vio en el navegador

Chrome embebido contra `http://localhost:5173`, viewport 490×417 css. Se llegó a la pestaña escribiendo
`abrir aprendizaje` en la barra del Oráculo y tocando el CTA "Abrir Aprendizaje →".

- Cabecera sticky "Aprendizaje", banner "Mapa de aprendizaje", etiqueta ámbar **"Análisis de muestra ·
  sin IA conectada"** (texto literal del donante) y "3 de 8 reconocidas" — el aviso de muestra vive arriba
  del mapa, no escondido.
- `svg.mapa-svg` con `viewBox="0 0 980 720"` (el del donante, literal), 17 círculos, 15 trazos, los 6
  textos `["Profesional","con","HABILIDAD DURA","HABILIDAD BLANDA","CONOCIMIENTO","CREDENCIAL"]`.
- **Lado a lado con el donante vivo** (`localhost:3000/reporte/48120c0f-…`, la misma muestra): su DOM da
  17 círculos, 15 trazos, los mismos 6 textos y el mismo `aria-label` byte a byte. Mismas posiciones
  relativas de las 4 categorías y sus racimos.
- Acto 1 reproducido con "Reproducir el nacimiento": a los 300 ms había 9 de 36 elementos con
  `opacity: 0`; a los 5,5 s, **0 invisibles**. La coreografía corre y siempre termina visible.
- Acto 2 ejercitado desde la cola ("Comunicación escrita breve" → "Es real"): salió el POST real a
  `/rest/v1/rpc/marcar_brecha` y devolvió **404** (10012 sigue sin desplegarse). La UI revirtió: sigue
  "3 de 8", 4 pasos en el camino, la fila vuelve a Pendiente. El optimismo no miente.
- La cola arranca colapsada y cada fila expande con Impacto / Evidencia en el CV / Qué aprender / Cómo /
  Cómo lo demuestro y dos botones con nombre accesible ("Es real: Comunicación escrita breve").

**No verificado en pantalla, y por qué:**

- La rama de 2 columnas `@media (min-width: 900px)` (`1fr + 380px`). El panel embebido no pasa de 490 css
  px y el agente no puede agrandarlo. Se verificó la regla en el CSS y la rama apilada en vivo; las dos
  columnas quedan para la pantalla del dueño.
- `prefers-reduced-motion`: no es emulable desde acá (sí está cubierto por test).
- Actos 3 y 4 en pantalla: pasan por el mismo RPC 404, así que en vivo solo mostrarían otra reversión.

**Defectos que solo aparecen corriendo** (los dos con su RED medido antes del fix):

1. `acce6ba` — el Oráculo no sabía nombrar la pestaña: `abrir aprendizaje` abría **Academia**, porque la
   clave `'aprend'` es prefijo de "aprendizaje" y `NAV` se evalúa en orden. Guardas escritas antes del fix
   para que no robe vocabulario: "curso"/"lección" siguen a Academia y "¿cuál es mi brecha?" sigue siendo
   coach (la diagnosis la responde Ómicrom, no una pantalla).
2. `f300554` — la falla de escritura mostraba jerga de PostgREST al fundador:
   *"Could not find the function public.marcar_brecha(p_brecha, p_state) in the schema cache"* pintado en
   la pestaña. Ahora solo pasa el `code === 'P0001'` (el `raise exception` del SQL de 10012, que ya está
   redactado en español); lo demás se enmascara con "No se pudo guardar tu respuesta. Probá de nuevo." y
   el detalle va a `console.warn`.

**Hallazgo menor, no bloqueante:** los nodos del mapa son `<g>` sin `tabindex`, `role` ni `aria-label`,
igual que el donante. El mapa es de mouse; los actos son accesibles por la cola, que sí tiene botones
nombrados. Operar el mapa por teclado es un pedido nuevo, no una regresión.

## 4 · Riesgos abiertos que necesitan un fallo del dueño

Ninguno bloquea; todos son decisiones o formas héritadas que conviene mirar con los propios ojos.

| # | Qué | Por qué está abierto |
| --- | --- | --- |
| R1 | `blanda` es lima `#84cc16`; el donante usa ámbar `#f2b134`. | Ruling D5: el ámbar es el color del usuario y en Ómicrom ya lo gasta el nodo raíz. Si el lima no cierra, hay que elegir un quinto color — es una palabra del dueño, no una corrección. |
| R2 | El nodo raíz se etiqueta "Profesional / con" (truncado) y el nodo de logro queda a 8,66 px del borde superior del `viewBox`. | Son dos quirks del donante, portados a propósito por fidelidad. Se arreglan solo con autorización expresa. |
| R3 | `@keyframes brillar` (pulso de 1100 ms del `recienId`) tiene forma inventada. | El donante no tenía flash equivalente; el tiempo sí es el medido. |
| R4 | `--ok` quedó aliasiado al teal `#3fd0c9`, no al mint `#3ddc97` del donante. | Lo pidió el sistema de tokens del huésped; el mapa lo pinta igual porque consume roles, no hex. |
| R5 | El botón "Reproducir el nacimiento" no puede devolver `modo` a `'naciendo'` desde afuera de `MapaCapacidades`. | Hoy el replay se maneja interno. Si B8 quiere reiniciar la coreografía desde un evento externo, hay que subir ese estado. |
| R6 | Sigue un `rgba(92,200,255,…)` (el cian prohibido como rgba pelado, no como `#`). | Lo reportó B1 y quedó abierto a propósito: el contrato prohíbe el hex, no la forma. Vale una limpieza cuando se toque ese archivo. |

## 5 · B5-B11: el corte, con su traba real

El corte se fijó al cerrar B4. **Ninguna de estas fases se puede empezar sin los clics del dueño en
Supabase**: el código está escrito, testeado y commiteado, pero el backend desplegado va detrás del repo.

| Fase | Qué produce | Traba real (no es trabajo pendiente mío) |
| --- | --- | --- |
| **B5** | El mapa come el análisis real y la muestra pasa a ser fallback. `abrirBrechas()` ya tiene el orden puente → muestra → vacío; solo hay que quitar el prefijo de la etiqueta cuando haya datos del motor. | Aplicar `10012` y desplegar `analizar-cv`. Se comprueba con `x-omicron-build: 10e-dos-claves`; hoy la función desplegada responde `10d-invitado-llega`. |
| **B6** | `EscaneoCv` portado (subida del CV + pasos del pipeline con eventos reales en lugar de simulados). | Los pasos los emite la Edge Function: sin deploy, la pantalla mienta. Mismo traba que B5. |
| **B7** | El puente del invitado aterriza en la cuenta: al iniciar sesión, las brechas guardadas en `omicron.brechas.puente` se escriben en la cuenta real y el puente se limpia. | RPC `guardar_analisis_completo` de 10012 desplegado + una sesión de prueba cruzada (QA Q9 del Plan A). |
| **B8** | Realtime: `postgres_changes` sobre `brechas_aprendizaje` dentro del canal único `omicron-live`. **Acá se juega la ley de salida** (un paso confirmado en el dispositivo A aparece en el mapa, la red y el orbe de B en <3 s, 10/10). | Que la tabla esté en la publicación `supabase_realtime`. El SQL de 10012 intenta agregarla y, si no tiene permiso (42501), avisa cómo hacerlo a mano: Table Editor → `brechas_aprendizaje` → Enable realtime. Hacen falta dos dispositivos/logins. |
| **B9** | El orbe come brechas vía `orbFusion` (D6: el mapa no se absorbe; el orbe recibe el estado como actividad real). | Depende de B8: sin evento real no hay actividad que mostrar. |
| **B10** | D5 completa: que el mapa respire el color elegido del Gemelo sin romper el contraste de tinta sobre nodo (hoy las 4 categorías son fijas y el acento va por `--uc`). | Decisión de diseño del dueño (R1 y R2), no código. |
| **B11** | Un motor y un prompt: fusionar el prompt del donante con el del huésped para que `analizar-cv` sea la única fuente. | Deploy + corrida A/B contra el fixture para no romper el validador inline (que es copia a propósito del `_shared/`, por la lección 6F). |

## 6 · Handoff de producción (el orden real de los clics)

1. **10011** → **10012** → **10013** en el SQL Editor, en ese orden (cada una ya está en el repo y
   verificada localmente; el SQL de 10012 avisa por `raise notice` si algo quedó manual).
2. Borrar las 6 Edge Functions muertas (Task 3 del Plan A).
3. Secrets: `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` en la función; **ninguna clave va al
   cliente** y la `service_role` queda solo en el entorno de Deno.
4. Desplegar `analizar-cv` y confirmar la huella: `x-omicron-build: 10e-dos-claves`.
5. Curl de invitado (debe llegar al motor, no recibir "sesión expirada").
6. RLS cruzado: dos cuentas, cada una ve solo sus filas.
7. Pase de QA Q1-Q10 del Plan A, y recién ahí el gate de la Fase 1 (realtime <3 s, 10/10).
8. `superpowers:finishing-a-development-branch` sobre la rama `fase-6-recorte-datos`.
