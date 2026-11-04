---
title: Puntero al plan de remediación post-auditoría
inclusion: always
---

# Hay un plan de remediación abierto

`.kiro/specs/auditoria-omicrom/` (auditoría del 4-nov-2026, dos pasadas: backend/seguridad y calidad
de código medida con grafo de importaciones).

- `requirements.md` — R1 a R23 con evidencia `file:line`, y una sección de **lo que ya se verificó
  correcto y no hay que tocar**. Leer esa sección antes de "limpiar" nada.
- `design.md` — 16 decisiones de implementación y el orden de 8 fases.
- `tasks.md` — casillas por commit. **La Fase 0 es de solo lectura y no se salta**: mide el estado real
  de la base y lee las tres ramas de septiembre antes de escribir código.

## Reglas al trabajar sobre este plan

1. **Empezar por Fase 0.** El repositorio no permite saber qué migraciones están aplicadas en
   producción; las respuestas de esas consultas deciden el contenido de las fases siguientes.
2. **Las migraciones no se editan, se suceden** (Decisión 1 de `design.md`). Cada corrección de base de
   datos entra como archivo nuevo con sus propias consultas de verificación.
3. **Nada destructivo sin `select` previo y decisión de la dueña.** Las preguntas D1–D11 de `tasks.md`
   son suyas, no se resuelven por suposición.
4. **La Fase 6 va antes que la 7.** No se poda código sin la malla de pruebas que avisa si se rompió
   algo.
5. Un hallazgo retirado: el micrófono **sí** avisa y muestra el motivo en el chat. El defecto real es
   R14 (`recog.start()` sin capturar).

Si algo del plan contradice al código, **manda el código** y se corrige el plan.
