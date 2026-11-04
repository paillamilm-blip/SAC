---
title: OBRA MAESTRA BRUTAL — combo de diseño para Ómicrom
inclusion: always
---

# 💥 OBRA MAESTRA BRUTAL

Comando: `OBRA MAESTRA BRUTAL [qué diseñar]`. Ejecuta la skill `obra-maestra-brutal`
(brief → dirección de arte → sistema → imagen → build → motion → auditoría).
Complementa a `pipeline-diseno.md`; **no lo reemplaza**.

## Reglas específicas de Ómicrom (mandan sobre la skill)

1. **`DESIGN.md` + `PRODUCT.md` + `src/theme/` son la ley.** Ómicrom no es greenfield:
   dark-mode-only, 4 colores de usuario, tokens ya definidos.
2. **`awesome-design-md`** se usa para inspirarse en patrones (layout, jerarquía, componentes),
   **nunca para reemplazar la paleta ni la tipografía de Ómicrom.** Sin DESIGN.md de otras marcas como fuente de tokens.
3. **`design-taste-frontend`** y la fase "imagen primero" aplican solo a superficies de conversión
   (landing, marketing). En product UI (dashboard, orbe, ajustes) manda impeccable modo **Operate**.
4. **`ui-ux-pro-max --design-system`**: descartar mundos visuales que contradigan DESIGN.md; usar `--domain` / `--stack`.
5. **`shadcn`**: solo si el repo usa `components.json`; si no, ignorarla.
6. **Auditoría final**: `web-design-guidelines` + screenshots con `playwright-cli` + `npm run build`.
