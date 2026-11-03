# Estabilizar el producto único (/u) — Plan de implementación

> **Para quien ejecute:** usar `superpowers:executing-plans`. Cada tarea es test primero (rojo → verde), un commit por tarea.
> No se ejecuta nada hasta que la persona confirme (context-mode, Fase 3).

**Meta:** que `/u` no afirme nada falso, respete las reglas de Ómicrom (acceso, límite de IA, voz) y no se rompa con datos reales.
**Arquitectura:** sin cambios de estructura. Se corrige dentro de `src/features/brecha` y `src/features/assistant`, más un cambio acotado en `src/App.tsx`.
**Stack:** React 18, Vite, Vitest + Testing Library, Playwright (solo en CI).
**Spec:** `docs/fusion/bugs-u.md` (hallazgos BUG-01…13), `docs/fusion/producto-unico.md`.

## Fase 1 de context-mode: análisis

| Pregunta | Respuesta |
|---|---|
| Qué se pide | Corregir los bugs reales de `/u` para que funcione bien |
| Qué se ve afectado | `assistant/{recomendar,responder,ChatPanel,almacenChat}.ts(x)`, `brecha/services/repositorio.ts`, `brecha/ui/{UApp,ReportePage,Inicio}.tsx`, `brecha/components/PanelReporte.tsx`, `App.tsx` |
| Qué podría romperse | Las 401 pruebas actuales; la app de `/` (solo se toca `App.tsx` en un punto); datos ya guardados en navegadores (formato `v1`) |
| Ambigüedades | Dos decisiones abiertas, marcadas **[DECIDIR]** abajo |

## Estructura de archivos

| Archivo | Responsabilidad | Tareas |
|---|---|---|
| `assistant/recomendar.ts`, `responder.ts` | Origen de cada dato (agrega `muestra`) | T1 |
| `assistant/ChatPanel.tsx` | Límite de IA, acciones caducas, resultado real, voz, errores de micrófono, sesión | T2, T5, T7, T8 |
| `assistant/almacenChat.ts` | Validación profunda del historial | T4 |
| `brecha/services/repositorio.ts` | Validación profunda de la base local | T4 |
| `brecha/ui/UApp.tsx` | Puerta de acceso, estado «cargando», `ErrorBoundary`, acciones con resultado | T3, T4, T5 |
| `brecha/ui/{ruta.ts,ReportePage.tsx}` + `PanelReporte.tsx` | Pestaña y brecha en la URL | T6 |
| `scripts/visual-u.mjs` | Recorrido con sesión simulada | T10 |

---

## Fase A — Honestidad y reglas (PR 1)

### T1 · El origen distingue la muestra de un análisis real (BUG-01)
**Alternativas:** (a) nuevo origen `muestra` con etiqueta propia ← **elegida**: es explícito y el tipo obliga a cubrirlo; (b) ocultar citas en demo: pierde la función de mostrar de dónde sale cada dato; (c) reescribir los textos de la muestra: tapa el problema y se pierde al llegar el análisis real.
- **Archivos:** `recomendar.ts` (tipo `Origen`), `responder.ts` (`ETIQUETA_ORIGEN`, `fuentes`), `Inicio.tsx`, `ChatPanel.tsx`, `u-app.css`.
- **Regla:** si `ultimo.simulado` es `true`, todo lo que antes era `analisis` pasa a `muestra`, con etiqueta «Muestra de ejemplo». `probado` sigue reservado.
- **Pasos:** escribir pruebas en `recomendar.test.ts` y `responder.test.ts` (con muestra → `muestra`; con análisis no simulado → `analisis`) → ver fallar → implementar → pasar.
- **Aceptación (binaria):** en el recorrido de CI, la respuesta del asistente ya NO contiene «De tu análisis» y SÍ contiene «Muestra de ejemplo»; `tsc` obliga a cubrir el nuevo origen en todos los `Record<Origen, …>`.

### T2 · El chat respeta el límite diario de IA (BUG-02)
**Alternativas:** (a) llamar `checkOmicronLimit()` desde el chat ← **elegida**, igual que `OrbShell`; (b) moverlo dentro de `askOmicron`: cambiaría el conteo de la app original (doble descuento).
- **Archivos:** `ChatPanel.tsx`, `ChatPanel.test.tsx`.
- **Regla:** antes de `askOmicron`, `if (!checkOmicronLimit())` responde «Llegaste al límite diario del asistente con IA. Mis respuestas con tus datos siguen disponibles.» y no llama a la IA.
- **Aceptación:** prueba que con límite agotado `askOmicron` no se llama y aparece el mensaje.

### T3 · `/u` respeta `no_access` y el estado «cargando» (BUG-03, BUG-10)
- **Archivos:** `UApp.tsx`, `UApp.test.tsx`.
- **Regla:** `no_access` → `<NoAccess />` (igual que `AppShell`). `loading` → pantalla de carga simple hasta 5 s y luego invitado (misma regla que `forceGuest`).
- **Aceptación:** pruebas con `useApp` simulado: `no_access` muestra `NoAccess`; `loading` no muestra «Iniciar sesión».

## Fase B — Que no se rompa (PR 2)

### T4 · Datos corruptos no tumban la pantalla (BUG-04)
- **Archivos:** `repositorio.ts` (`esDb` valida cada análisis y brecha), `almacenChat.ts` (`esMensaje` valida `accion` y `fuentes`), `UApp.tsx` (`ErrorBoundary` con botón «Restablecer mis datos de esta pantalla»).
- **Regla:** un análisis inválido se descarta (no toda la base); si hay un error de render, se muestra el aviso y la salida, nunca pantalla en blanco.
- **Aceptación:** pruebas con 6 formas rotas (sin `brechas`, `brechas` no arreglo, brecha sin `aprender`, `veredicto` inválido, mensaje sin `rol`, `accion` sin `tipo`); la base nunca lanza y conserva los análisis válidos.

### T5 · Las acciones del chat dicen la verdad (BUG-05, BUG-06)
- **Archivos:** `ChatPanel.tsx`, `almacenChat.ts` (`estado: 'caducada'`), `UApp.tsx`.
- **Regla:** al restaurar historial, toda acción `propuesta` pasa a `caducada` (texto «Esta propuesta ya no está vigente»). `onEjecutar` devuelve `boolean`; solo si es `true` se muestra «Listo.»; si no, «No pude hacerlo: la brecha ya no está reconocida como real.»
- **Aceptación:** pruebas de ambos casos.

### T6 · La pestaña y la brecha viven en la URL (BUG-07)
**Alternativas:** (a) pestaña en la URL con `replaceState` ← **elegida**, arregla también la recarga; (b) contador de navegación en el `key`: arregla solo el síntoma.
- **Archivos:** `PanelReporte.tsx` (recibe `pestana` y `onPestana`), `ReportePage.tsx`, `ruta.ts`.
- **Aceptación:** prueba: cambiar de pestaña actualiza `?tab=`; recargar conserva la pestaña; la acción del asistente sobre la URL actual abre la brecha pedida.

## Fase C — Un solo asistente (PR 3)

### T7 · Misma voz y errores de micrófono visibles (BUG-08, BUG-09)
- **Archivos:** `ChatPanel.tsx`.
- **Regla:** hablar con `speakOmicron` y callar con `stopOmicron` (las del asistente actual). Si el micrófono falla (`not-allowed`, `no-speech`, no disponible) mostrar un mensaje claro bajo el campo.
- **Aceptación:** pruebas con dobles de ambos módulos; el error del micrófono aparece con `role="status"`.

### T8 · El chat sigue a la sesión; el invitado huérfano se resuelve (BUG-11, BUG-12)
- **[DECIDIR]** ¿Qué hacemos con el historial del invitado cuando la cuenta ya tiene datos? Opciones: (1) avisar y preguntar «¿Traer estos análisis a tu cuenta?» ← **recomendada**; (2) fusionar siempre; (3) descartar. 
- **Archivos:** `useBrecha.ts`, `Inicio.tsx`, `ChatPanel.tsx`.
- **Aceptación:** pruebas del hook con cuenta vacía/no vacía; el chat recarga su historial al cambiar `usuarioId`.

### T9 · Funciones de Ómicrom que `/u` no ejecuta (BUG-13)
- **[DECIDIR]** ¿Debe `/u` sumar la racha diaria y la analítica de apertura como la app original? Recomiendo que sí, extrayendo ese bloque de `AppShell` a un hook compartido para no duplicar código.
- **Aceptación:** `AppShell` y `UApp` usan el mismo hook; las pruebas existentes de `App` siguen en verde.

## Fase D — Probar lo que hoy no está probado (PR 4)

### T10 · Recorrido con sesión simulada
- **Archivos:** `scripts/visual-u.mjs`.
- **Cómo:** interceptar con Playwright las llamadas de Supabase Auth y `profiles` del cliente (`page.route`) para entrar como usuaria de prueba. Cubre `AuthOverlay` dentro de `.u-app`, el saludo por nombre, el chat con IA habilitada (respuesta simulada) y el cambio de invitado a cuenta.
- **Aceptación:** el recorrido falla si el formulario de acceso queda fuera de pantalla, tapado o sin foco.

### T11 · Limpieza menor
`guardando`/`error` muertos, `setTimeout` sin limpieza, foco al cerrar el chat, comillas. **Aceptación:** lint sin avisos nuevos.

## Fase E — Hacerlo real (requiere tus accesos; PR 5 en adelante)
Ya descrita en `docs/tasks.md` (TAREA-31 tablas `brecha_*`, TAREA-32 función `brecha-analizar`, TAREA-37 examen). Se retoma cuando entregues el project ref y los secretos de GitHub.

---

## Orden, riesgo y reversa
- **Orden:** A → B → C → D (cada PR deja `main` verde y desplegable).
- **Estimación:** A pequeña, B mediana, C mediana, D pequeña.
- **Reversa:** cada PR se revierte entera con «Revert» en GitHub; no hay migraciones ni cambios de datos del servidor.
- **Riesgo principal:** T4 (formato de datos). Mitigación: la validación descarta lo inválido en vez de migrarlo, y no borra nada sin que la persona lo pida.
- **Verificación de cada PR:** CI (typecheck, lint, pruebas, build) + «Recorrido visual de /u» + revisión de capturas.

## Autorevisión del plan
- Cobertura: los 13 bugs tienen tarea (BUG-01→T1, 02→T2, 03/10→T3, 04→T4, 05/06→T5, 07→T6, 08/09→T7, 11/12→T8, 13→T9); los «bajos» van en T11.
- Sin pendientes ocultos: las dos decisiones abiertas están marcadas **[DECIDIR]**.
