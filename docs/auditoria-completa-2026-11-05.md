# Auditoría completa y priorizada — Ómicrom

| | |
|---|---|
| Fecha | 2026-11-05 |
| Base | `main` @ `300aefa` |
| Objetivo | Una app que **cualquier profesional** pueda usar, lista para muchos usuarios |
| Método | Lectura del código + consultas a producción hechas por la dueña + CI. **Nadie ha probado el producto de punta a punta con un usuario real.** |

Cómo leerla: cada hallazgo dice **qué pasa, por qué importa y cómo se sabe** (evidencia). Está ordenada por
prioridad. Si solo lees una cosa, lee la sección 1.

---

## 0. En una página

**Qué tienes y funciona hoy**
Subes un CV en PDF → la IA lo compara con tu ocupación → ves un mapa de brechas → reconoces cuáles son reales →
das un examen → ganas «sellos» en un pasaporte con enlace verificable. Hay cuentas, modo invitado, recuperar
contraseña, un asistente que te guía, «Mi perfil», y funciona en el teléfono. Los datos de las personas ya están
protegidos en producción (verificado).

**Qué te impide hoy invitar gente** (sección 1, 5 puntos)
El gasto de IA no tiene tope real, no verás las fallas, las promesas legales (borrar/exportar cuenta) no existen,
y dos mensajes de error mienten.

**Qué te impide decir "sirve para cualquier profesional"** (sección 2, 5 puntos)
Solo acepta PDF con texto, solo está en español, y la primera medición del análisis en 5 profesiones dio
**4 de 5**: el CV de **docencia falló** las dos veces (sección 6).

**El mayor riesgo no es técnico:** nadie ha usado la app. Todo lo de abajo es mejor decidirlo con 10 usuarios reales.

---

## 1. P0 — Resolver ANTES de invitar a la primera persona

### 1.1 El gasto de IA no tiene tope que funcione
- **Qué pasa:** sin sesión, `proxy-ai` salta el control de créditos (`proxy-ai/index.ts:263-269`: solo revisa créditos
  si hay `Authorization`). Lo único que queda es 15 pedidos/minuto **por IP**, y esa IP viene de una cabecera que el
  cliente puede falsear. El tope de 20 consultas/día (`brain.ts:259`) vive en el navegador (`localStorage`): se borra y listo.
  Además, la función de créditos del servidor siempre responde «permitido» (hallazgo de la auditoría de septiembre).
- **Por qué importa:** con 50 personas está bien; con una sola persona mal intencionada, o con éxito, la factura crece sin freno.
- **Decisión tuya (D1):** ¿la IA exige cuenta? Recomendación: **sí**, el invitado ve la demostración.
- **Arreglo:** exigir sesión en `proxy-ai` + tope por usuario en el servidor + IP desde el borde. (Spec 2.1 a 2.4.)

### 1.2 No te enterarás cuando algo falle
- **Qué pasa:** no hay ningún monitoreo de errores en producción (`grep Sentry|captureException` = 0).
- **Por qué importa:** si el análisis falla para una profesión, o el examen devuelve 502, el usuario se va y tú no lo sabes.
- **Arreglo:** un monitoreo de errores (hay variable de entorno prevista, sin usar) o al menos un registro propio de fallos de IA.

### 1.3 Promesas legales que el producto no cumple
- **Qué pasa:**
  - **Borrar cuenta: no existe** (0 resultados). **Exportar datos: no existe** (el único hallazgo era la descarga del pasaporte).
    `POLITICA_PRIVACIDAD.md` promete ambos.
  - Los correos de contacto figuran **«(pendiente)»**: `privacy@omicron.cl`, `legal@omicron.cl`.
  - **Los Términos de Servicio existen pero no están enlazados** en ninguna pantalla.
  - Los Términos dicen que la empresa tiene **«RUT pendiente de constitución»**.
- **Por qué importa:** con usuarios reales, prometer un derecho y no poder cumplirlo es el tipo de problema que cuesta caro.
  La falta de empresa constituida se vuelve urgente **antes de cobrar**.
- **Arreglo:** borrar y exportar cuenta (Spec 5.6, 5.7), crear los correos, enlazar términos y privacidad (3.4, 5.8, 5.10).
  La constitución de la empresa es una decisión y trámite tuyo; yo no puedo resolverlo.

### 1.4 Dos mensajes de error que mienten
- **Red caída → dice «sin acceso».** Si se cae la conexión al cargar el perfil, la persona ve la pantalla de «no tienes acceso»
  y cree que la expulsaron. (`ProfileContext.tsx`, Spec 3.1.)
- **Falla la verificación del usuario → dice «contraseña incorrecta».** (`AuthOverlay.tsx`, Spec 3.2.)
- **Por qué importa:** son los dos momentos donde más gente abandona, y la causa es nuestra.
- **Arreglo:** estados distintos con un botón «Reintentar»; mensajes propios.

### 1.5 El progreso del invitado puede perderse en silencio
- **Qué pasa:** al registrarse, si falla el traspaso del progreso de invitado a cuenta, el error se traga sin avisar
  (`AuthOverlay.tsx:114-123`, Spec 3.2.2). El invitado es justo quien más probablemente se registre después de ver su mapa.
- **Arreglo:** avisar y no cerrar la sesión de invitado hasta que el traspaso haya salido bien.

---

## 2. P1 — Resolver para que sirva a CUALQUIER profesional

### 2.1 Solo acepta PDF con texto
- **Qué pasa:** el selector solo admite `application/pdf` (`SubirCv.tsx:118`). Un CV en Word, o un PDF escaneado
  (una foto), no entra: la app muestra un mensaje que pide convertirlo.
- **Por qué importa:** muchísimos profesionales —sobre todo fuera de tecnología, que es tu público— tienen su CV en Word o escaneado.
  Es la primera pantalla: si falla ahí, no ven nada más.
- **Arreglo:** aceptar `.docx` (la dependencia `mammoth` ya existe en el código) y decidir si se hace OCR para escaneos.

### 2.2 Solo existe en español
- **Qué pasa:** no hay traducción (0 usos de i18n); `lang="es"`; la voz es `es-CL`.
- **Por qué importa:** «cualquier profesional» hoy significa «cualquier profesional hispanohablante».
- **Decisión tuya:** ¿tu primer mercado es solo Chile/Latinoamérica? Si sí, no es un problema por ahora; solo hay que ser honesto en el mensaje.

### 2.3 El análisis falló en una de las 5 profesiones medidas (docencia)
- **Qué pasa:** se ejecutó por primera vez el banco de 5 CVs (administración, desarrollo, salud, ventas, docencia).
  **Docencia falló en los dos intentos** con «sin JSON en la respuesta», y ambos con el mismo modelo (`gemini-3.6-flash`).
  Resultado completo en la sección 6.
- **Por qué importa:** una profesora que suba su CV vería un error. Docencia es justo un público no técnico, el tuyo.
- **Causa: no confirmada.** Hipótesis: el modelo devuelve texto sin el objeto JSON (cortado por límite de tokens, o con otro formato).
  Se confirma mirando la respuesta cruda, que el script hoy no guarda.
- **Limitación:** son CVs sintéticos, una sola corrida por profesión. No mide si una brecha es *correcta* para la persona.

### 2.4 El examen puede ser incoherente con la profesión (hipótesis, sin medir)
- **Qué pasa:** la auditoría señaló que a un docente le pueden salir temas ajenos, y que ante un error 502 el examen falla sin reintentar (Spec 4.1).
- **Por qué importa:** el examen es el momento de mayor esfuerzo del usuario y la base del pasaporte.
- **Estado:** no verificado. Se mide con dos perfiles distintos el mismo día.

### 2.5 Dependes de proveedores de IA gratuitos
- **Qué pasa:** el análisis corre sobre Gemini y modelos gratuitos de OpenRouter, que cambian, se apagan y tienen cupos bajos
  (esta semana pasó con Gemini 2.0). No se ha medido el costo por análisis ni el límite de usuarios simultáneos.
- **Por qué importa:** es el techo real de «muchos usuarios».
- **Arreglo:** medir costo y tiempo de un análisis completo, y decidir plan de pago.

---

## 3. P2 — Importante, pero no bloquea

| # | Qué | Evidencia | Spec |
|---|---|---|---|
| 3.1 | La política de seguridad (CSP) solo reporta, no bloquea | `vercel.json` usa `Content-Security-Policy-Report-Only` | 5.3–5.4 |
| 3.2 | El lector de PDF se descarga de un CDN externo (`cdnjs`) | `cvExtract.ts:6-8`; si el CDN cae, el escáner no arranca | 5.1 |
| 3.3 | Errores del micrófono pueden quedar sin mensaje | `recognition.ts:96`; las pruebas lo excluyen por construcción | 3.3 |
| 3.4 | La imagen del pasaporte nunca se vio generada | solo hay pruebas con un contexto falso | — |
| 3.5 | «Mi perfil» y el porcentaje nunca se vieron con una cuenta y CV reales | el recorrido usa invitado + muestra | — |
| 3.6 | Prueba funcional de la lista blanca de `profiles` (que color/nombre sigan guardando) | pendiente de la dueña | 1.1 |
| 3.7 | Solo 35 archivos de prueba; los peores bugs viven en archivos sin pruebas | `ProfileContext`, `AuthOverlay`, `recognition` | Fase 6 |

---

## 4. P3 — Limpieza (al final)

Unas 60 casillas del spec (Fase 7): código sin uso, dependencias muertas (`decimal.js`, `react-query`),
12 documentos `.md` en la raíz que contradicen al código, estilos duplicados, funciones SQL huérfanas.
Mejoran el mantenimiento. **No afectan al usuario.** No las hagas antes de lanzar.

---

## 5. Lo que ya está resuelto (para no volver a mirarlo)

| Qué | Cómo se sabe |
|---|---|
| Los datos de las personas ya no son legibles sin cuenta (`profiles`) | Consulta en producción: única política `profiles_select_own` |
| Un cliente no puede darse permisos en su perfil | `protect_profile_columns` con `k_editables`, trigger activo |
| Nadie puede falsificar un examen desde el navegador | `has_function_privilege` = false para `anon` y `authenticated` |
| Las 3 cuentas con pruebas en producción son de prueba | `omicron_skill_proofs`: 3 filas, todas internas |
| Las tablas sociales abiertas no existen en producción | `pg_class` = 0 filas |
| Cerrar sesión desde `/u` | existe en «Mi perfil» (Spec 4.2.2 está hecha) |
| Paso 5 del ciclo con datos reales y pasaporte | existe `/u/pasaporte` (Spec 4.2.1 está hecha) |
| Los 13 bugs de `/u` del 2-nov | verificados en código |

> Nota: el `tasks.md` del spec quedó **desactualizado** en 4.2.1 y 4.2.2: el trabajo de producto de esta semana las resolvió.
> Conviene marcarlas.

---

## 6. Evaluación del análisis en 5 profesiones

Corrida del 2026-11-05 (workflow «Evaluación del análisis de CV», contra producción, un CV por profesión).

| Profesión | Resultado | Brechas aceptadas | Con cita del CV | «Ausente en el CV» | Fortalezas | Intentos | Modelo | Segundos |
|---|---|---|---|---|---|---|---|---|
| Administración | ✓ | 5 de 5 | 0 | 5 | **0 de 4** | 1 | `xingchen-agi/xing4.0-29b-a4b:free` | 17 |
| Desarrollo de software | ✓ | 5 de 5 | 1 | 4 | 2 de 2 | 1 | `gemini-3.5-flash-lite` | 29 |
| **Docencia** | **✗ falló** | — | — | — | — | 2 | `gemini-3.6-flash` ×2 | 40 |
| Salud (enfermería) | ✓ | 5 de 5 | 1 | 4 | 3 de 3 | 2 | `gemini-3.5-flash-lite` | 78 |
| Ventas | ✓ | 5 de 5 | 3 | 2 | 1 de 2 | 1 | `gemini-3.5-flash-lite` | 29 |

**Qué dice la tabla, sin adornar:**
- **4 de 5 válidos** (3 a la primera). Docencia: error para el usuario.
- **Las brechas pasan la validación (20 de 20)**, pero **15 de las 20 son «Ausente en el CV»** y solo 5 citan el CV. El análisis
  es sobre todo «esto no aparece», que es honesto pero menos específico de la persona.
- **Administración: 0 fortalezas aceptadas** (el modelo propuso 4 y ninguna citaba el CV). Ese caso lo ganó un modelo gratuito
  distinto a los demás; con otro modelo habría salido distinto. **La calidad depende de qué modelo gane la carrera**, que no controlamos.
- **Tiempo: 17 a 78 segundos** por análisis. 78 s (salud, con reintento) es largo para quien espera mirando una pantalla.

**Lo que esta medición NO prueba:** que las brechas sean correctas para esa persona (eso solo lo dice ella), ni que 5 CVs sintéticos
representen a todos los profesionales. Una corrida por profesión tampoco da estadística: el resultado de docencia puede repetirse o no.

---

## 7. Qué NO pude verificar

- **Ningún recorrido real:** nadie ha subido un CV propio de punta a punta en producción y reportado qué pasó.
- Costo real por análisis y límite de usuarios simultáneos.
- Estado de producción fuera de lo que la dueña consultó (`0.1b` completa, `0.3`, `0.2`).
- Si el CI de GitHub pasa en navegadores reales distintos de Chromium (Safari/iPhone).

---

## 8. Orden recomendado

1. **Tú:** responder D1 → yo hago 1.1.
2. **Yo:** el fallo de docencia (2.3): guardar la respuesta cruda, confirmar la causa y arreglarla; es un error que ve el usuario.
   Luego 1.4 y 1.5 (mensajes que mienten, progreso de invitado).
3. **Yo:** 1.2 (monitoreo) y 1.3 (borrar/exportar cuenta, términos, correos).
4. **Con 5–10 personas reales:** probar 2.1 a 2.5 y decidir con datos si hace falta Word, OCR, inglés, plan de IA de pago.
5. **Recién después:** modelo de negocio (membresía o premium). La empresa debe estar constituida antes de cobrar.
6. P2 y P3 en el tiempo libre.
