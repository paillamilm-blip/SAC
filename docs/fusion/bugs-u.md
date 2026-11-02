# Bugs reales del producto único (/u)

Fecha: 2026-11-02 · Base: `main` @ `5a72bd2` · Método: skills **codebase-memory** (mapa de dependencias),
**context-mode** (análisis antes de planear) y **superpowers** (evidencia, alternativas, riesgos).

Cada hallazgo se leyó en el código; ninguno es suposición. Lo que NO pude comprobar está en la sección final.

## Críticos: afirman algo falso o saltan una regla del producto

### BUG-01 · El asistente presenta la muestra fija como «De tu análisis» y «Ausente en el CV»
- **Dónde:** `assistant/recomendar.ts:155,168,207`, `assistant/responder.ts:110,125,150-151`, `brecha/services/muestra.ts:19-58`.
- **Qué pasa:** el análisis de demostración es una muestra fija que no lee el PDF, pero el asistente etiqueta sus frases como «De tu análisis» y cita «Ausente en el CV: …». Ninguna lógica del asistente conoce `Analisis.simulado`.
- **Por qué importa:** viola el principio de PRODUCT.md «la interfaz no afirma más que el dato». La banda de «modo demostración» queda lejos de la burbuja que miente.
- **Se ve en:** captura `movil-07-asistente-respuesta.png`.

### BUG-02 · El chat con IA salta el límite diario de Ómicrom
- **Dónde:** `assistant/ChatPanel.tsx:184` llama `askOmicron` sin `checkOmicronLimit()`. La app original sí lo hace (`omicron/components/OrbShell.tsx:585,658`); `askOmicron` no lo aplica por dentro (`omicron/services/brain.ts:156-215`).
- **Efecto:** el tope de 20 consultas/día (`brain.ts:253`) no rige en `/u`. El código dice que existe un límite del servidor, pero no pude verificar que cubra este caso.

### BUG-03 · `/u` se salta la puerta de acceso `no_access`
- **Dónde:** `App.tsx:116` bloquea con `<NoAccess />` solo dentro de `AppShell`; `/u` monta `UApp` en su lugar (`App.tsx:204`).
- **Efecto:** una cuenta sin acceso (`ProfileContext.tsx:177,183`) ve `/u` como invitada, sin bloqueo ni aviso. Los datos son locales, así que no hay fuga, pero la regla de acceso no se respeta.

## Altos: se rompen o se ven mal en uso normal

### BUG-04 · Datos locales corruptos o antiguos dejan `/u` en blanco, sin salida
- **Dónde:** `brecha/services/repositorio.ts:203-207` (`esDb` solo mira `version` y que `analisis` sea arreglo); `assistant/almacenChat.ts:64-69` (`esMensaje` revisa 3 campos).
- **Efecto:** si un análisis guardado no trae `brechas` (cambio de formato, edición manual, cuota a medias), `Inicio`/`PanelReporte` lanzan al renderizar. No hay `ErrorBoundary` en `UApp` y `main.tsx` tampoco lo tiene: pantalla en blanco, y se repite en cada recarga porque el dato sigue guardado.

### BUG-05 · Las propuestas viejas del chat siguen activas
- **Dónde:** `ChatPanel.tsx:102-103` restaura el historial con acciones en estado `propuesta`; el saludo inicial queda con «Escanear mi CV» aunque ya hayas escaneado.
- **Efecto:** un botón antiguo ejecuta algo que ya no corresponde (por ejemplo «Sí, ya la aprendí» sobre una brecha que dejaste de reconocer).

### BUG-06 · «Listo.» aunque la acción no hizo nada
- **Dónde:** `ChatPanel.tsx:236` marca la acción como hecha antes de saber el resultado; `UApp.tsx:75` llama `dominar(...)`, que no cambia nada si la brecha ya no está confirmada (`repositorio.ts:129-133`).
- **Efecto:** el chat afirma una acción que no ocurrió.

### BUG-07 · «Ver esta brecha» a veces no hace nada
- **Dónde:** `ReportePage.tsx:48` usa `key` con `pestana` y `brechaId` de la URL; las pestañas de `PanelReporte` (`PanelReporte.tsx:83`) viven en estado interno y no actualizan la URL.
- **Efecto:** si estás en la URL `?tab=brechas&brecha=b1`, cambias a «Mapa» a mano y el asistente propone la misma URL, la clave no cambia y no se remonta. Además, recargar vuelve a la pestaña de la URL, no a la que mirabas.

### BUG-08 · El micrófono falla sin decir nada
- **Dónde:** `ChatPanel.tsx:224` solo marca «escuchando» si `startSpeechRecognition` devolvió algo; `onError` solo apaga el estado (`ChatPanel.tsx` en `alternarMicro`).
- **Efecto:** permiso denegado, sin red o sin micrófono: el botón vuelve a su estado sin explicación.

### BUG-09 · El asistente habla con otra voz que el resto de Ómicrom
- **Dónde:** `ChatPanel.tsx:85` usa `infrastructure/voice/engine.speak`; la app usa `speakOmicron` (`OrbShell.tsx:26,597,670`, `omicron/services/voice.ts`).
- **Efecto:** la petición era «un solo asistente»; hoy suena distinto y no comparte cortes ni fragmentación de frases.

## Medios

### BUG-10 · Estado de sesión «cargando» se muestra como invitado
- **Dónde:** `UApp.tsx` trata todo lo que no es `authenticated` como invitado. `AppShell` espera hasta 5 s (`App.tsx` con `forceGuest`).
- **Efecto:** una persona con sesión ve un instante «Iniciar sesión» y el historial de invitado; con sesión lenta, ve el chat sin IA.

### BUG-11 · El historial del invitado queda huérfano al iniciar sesión
- **Dónde:** `useBrecha.ts` fusiona al invitado solo si la cuenta está vacía; si no, los análisis del invitado quedan en `omicron:brecha:db:v1:invitado` sin aviso ni borrado.
- **Efecto:** datos que la persona no ve y que tampoco puede borrar desde la interfaz.

### BUG-12 · El chat no cambia de historial si cambia la sesión con el panel abierto
- **Dónde:** `ChatPanel.tsx:98-120` inicia una sola vez (`iniciado`) y no reacciona a `usuarioId`.

### BUG-13 · Pérdida de funciones de Ómicrom en `/u`
- `AppShell` registra actividad diaria/racha, analítica de apertura y actualización del service worker (`App.tsx` en `AppShell`); `/u` no lo hace. La racha del usuario no suma si solo usa `/u`.

## Bajos / limpieza
- `PanelReporte.tsx:85-86`: `guardando` y `error` son constantes `null` heredadas; el código de «Guardando…» es muerto.
- `PanelReporte.tsx`: `setTimeout` de `brillar` sin limpieza al desmontar.
- Los `.tsx` portados usan comillas dobles; el repo usa simples (el lint lo permite).
- Al cerrar el chat el foco no vuelve al botón «Asistente».
- `validarArchivo` confía en el tipo MIME del navegador; con el proveedor real habrá que validar la firma `%PDF-` también en el servidor.

## Lo que ya está bien (comprobado en navegador real)
Subir PDF → escaneo → reporte → confirmar → asistente → recargar; sin desborde a 390 y 1280 px; objetivos táctiles ≥ 44 px; sin errores de JS; `/` sigue siendo la app de siempre.

## Lo que NO pude comprobar
1. **Recorrido con sesión iniciada:** el recorrido automatizado corre como invitado. El `AuthOverlay` dentro de `.u-app` (posición, z-index, estilos heredados) solo está probado con un doble de pruebas.
2. **Voz y micrófono reales:** Chromium sin cabeza no tiene reconocimiento ni síntesis; solo hay pruebas con dobles.
3. **Producción en vivo:** mi entorno no llega a tu dominio; la comprobación es el despliegue de Vercel en éxito.
4. **Límite del servidor de IA:** no tengo acceso a `proxy-ai` para confirmar si cubre BUG-02.
