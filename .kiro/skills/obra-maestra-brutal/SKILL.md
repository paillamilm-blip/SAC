---
name: obra-maestra-brutal
description: >
  COMBO BRUTAL de diseno visual. Fusiona en un solo pipeline todas las skills de diseno del repo:
  design-taste-frontend (taste v2, direccion de arte anti-slop), taste-skill, awesome-design-md
  (84 DESIGN.md de marcas reales), ui-ux-pro-max (estilos, paletas, fonts, reglas UX), image-to-code
  (disenar la imagen primero y luego codificarla), impeccable (barra de director de arte, comandos),
  shadcn y reglas-cursor-web (guardianes de codigo), animate (movimiento con proposito),
  web-design-guidelines (auditoria Vercel) y playwright-cli (screenshots reales para verificar).
  Usar cuando el usuario dice OBRA MAESTRA BRUTAL, diseno brutal, UI nivel dios, landing/dashboard/portfolio
  que se vea carisimo, redisena todo, quiero algo que no parezca hecho por IA, o pide la mejor
  combinacion posible de diseno visual.
triggers:
  - OBRA MAESTRA BRUTAL
  - DISENO BRUTAL
  - combo brutal de diseno
  - UI nivel dios
  - que no parezca hecho por IA
  - la mejor combinacion de diseno
metadata:
  type: combo
  combines:
    - design-taste-frontend
    - taste-skill
    - awesome-design-md
    - ui-ux-pro-max
    - image-to-code
    - impeccable
    - shadcn
    - reglas-cursor-web
    - animate
    - web-design-guidelines
    - playwright-cli
    - ui-verification
  version: 1.0.0
  author: paillamilm-blip
---
# OBRA MAESTRA BRUTAL

> Hermana mayor de `obra-maestra`. Mismo espiritu, pero con las skills nuevas: direccion de arte v2,
> referencias de marcas reales, diseno-por-imagen primero, auditoria Vercel y verificacion con
> screenshots reales. 7 fases, cada una alimenta a la siguiente.

```
OBRA MAESTRA BRUTAL [que disenar]
OBRA MAESTRA BRUTAL landing para [producto] estilo [Linear/Stripe/Apple...]
OBRA MAESTRA BRUTAL redisena [url o carpeta]
```

## Como cargar las piezas

Todas viven en la misma carpeta de skills (`../<skill>/SKILL.md`). Para cada una: leerla por nombre;
si no esta, `find / -path "*/<skill>/SKILL.md" 2>/dev/null | head -1`; si no existe, bajar de
`paillamilm-blip/mis-skills` (`.kiro/skills/<skill>`) con sparse-checkout. Si falta algo y no hay red,
avisar en una linea y seguir. **Nunca detener el pipeline por una pieza faltante.**
Archivos que no caben en una skill estan enlazados en su `ARCHIVOS-EXTRA.md`.

## Pipeline

```
0 BRIEF ─▶ 1 DIRECCION ─▶ 2 SISTEMA ─▶ 3 IMAGEN ─▶ 4 BUILD ─▶ 5 VIDA ─▶ 6 AUDITORIA
 taste     taste v2 +     ui-ux-pro-   image-to-   impeccable  animate   web-design-guidelines
 dials     awesome-       max          code        + shadcn +            + playwright-cli
           design-md                               reglas-web            + ui-verification
```

### FASE 0 — BRIEF (taste-skill)
Declarar en una linea: *"Lo leo como: `<tipo>` para `<audiencia>`, vibe `<x>`, tirando hacia `<marca/estetica>`."*
Fijar los 3 dials (`DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY`, baseline 8/6/4; dashboards: densidad 7-9).
Una sola pregunta solo si el read realmente diverge.

### FASE 1 — DIRECCION DE ARTE (design-taste-frontend + awesome-design-md)
1. Leer `design-taste-frontend` y sacar de su `library/` una direccion concreta: idea, composicion, tipografia,
   paleta, fotografia y blueprint de secciones. Su `references/` (layout, colour, copy, motion, critique) manda sobre defaults.
2. Si el usuario nombra una marca/sitio de referencia (o el read apunta a una): leer
   `awesome-design-md/design-md/<marca>/DESIGN.md` y usarlo como **fuente de tokens** (colores, tipos, espaciado, componentes).
   Sin marca exacta: elegir la mas cercana o mezclar maximo 2, y **inspirarse, no copiar el logo ni el contenido**.
3. Salida: *direccion elegida + DESIGN.md de referencia (si aplica)*.

### FASE 2 — SISTEMA (ui-ux-pro-max)
Generar el design system con los dials mapeados a `--variance/--motion/--density` y `--persist` (guarda `MASTER.md`).
Cruzar con la fase 1: **si la DB propone algo que choca con la direccion de arte o con "NUNCA SHIPEAR", gana la fase 1**.
Respetar las prioridades UX: accesibilidad > touch > performance > estilo > responsive > tipografia/color > animacion.

### FASE 3 — IMAGEN PRIMERO (image-to-code) — solo si la pieza es visualmente critica
Si hay generacion de imagenes disponible: seguir `image-to-code` (generar imagenes grandes por seccion, analizarlas,
implementar fiel a ellas). Si no hay: saltar esta fase y declararlo; la direccion de la fase 1 + `MASTER.md` hacen de maqueta.

### FASE 4 — BUILD (impeccable + guardianes)
- Detectar stack (`package.json`, `components.json`, `vite.config.*`, `tailwind.config.*`).
- Cargar solo las reglas de `reglas-cursor-web` para ese stack y las Critical Rules de `shadcn`
  (tokens semanticos, `gap-*`, `cn()`, componentes existentes primero). La personalidad va **en el tema** (variables CSS), no en clases sueltas.
- Elegir modo impeccable: Persuade / Operate / Read / Experience (sale de la superficie pedida).
- Refinar preserva; Redisenar reemplaza. Nunca partir la diferencia.
- Comandos utiles: `shape`, `critique`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `typeset`, `colorize`, `layout`.

### FASE 5 — VIDA (animate)
Aplicar el gate de frecuencia (lo que se usa 100+ veces/dia no se anima). CSS primero; Motion para springs/layout/exit;
GSAP solo para choreography de scroll real. Solo `transform` y `opacity`, <300ms en UI, `prefers-reduced-motion` desde el dia 1.

### FASE 6 — AUDITORIA (web-design-guidelines + playwright-cli + ui-verification)
Una sola pasada acotada, no un loop infinito:
1. **Screenshots reales** con `playwright-cli` (desktop 1440 y mobile 390) de las pantallas clave.
2. **`web-design-guidelines`**: revisar los archivos de UI contra las Web Interface Guidelines (a11y, foco, formularios, motion, tipografia, imagenes).
3. **`ui-verification`**: comparar lo construido contra la direccion/maqueta.
4. **impeccable `audit` + `critique`** y el checklist de `design-taste-frontend/references/critique.md`.
5. Arreglar TODO en un batch, confirmar con maximo una ronda mas, **parar**. Correr `npm run build`.

## Extra: diagramas (archify)
Si el entregable incluye explicar arquitectura, flujo o datos (docs, case study, pitch): usar `archify` para generar
el diagrama HTML/SVG en vez de dibujarlo a mano.

## Reglas de prioridad cuando las skills chocan
1. **El repo del usuario manda** (un solo sistema de diseno; no reescribir codigo existente solo por cumplir una regla).
2. **Fase 1 (direccion de arte) > base de datos de ui-ux-pro-max** en gusto; **ui-ux-pro-max > todos** en accesibilidad y UX.
3. **animate manda sobre el movimiento**, aunque otras skills pidan "bold".
4. **Marca de referencia = tokens y espiritu**, nunca copiar assets, logos ni textos.
5. Verificacion acotada siempre gana al instinto de seguir puliendo.

## NUNCA SHIPEAR
Gradiente purpura-AI por defecto · `Inter` por defecto · hero centrado sobre mesh oscuro + 3 cards iguales ·
glassmorphism en todo · loops de animacion infinitos · emojis como iconos · contraste < 4.5:1 · targets < 44px ·
hero que no entra en el viewport · imagenes sin `alt` · colores crudos (`bg-blue-500`) en vez de tokens ·
copy generico ("Revoluciona tu flujo de trabajo"). Si aparece uno, es fail: corregir antes de entregar.

## Entrega
Resumir en <10 lineas: direccion elegida, referencia usada, que skills participaron, que se audito y que quedo pendiente.
