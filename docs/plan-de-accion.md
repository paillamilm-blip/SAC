# Plan de acción: dejar `/u` usable

Fecha: 3 de noviembre de 2026 · Base: `main` @ `02e01aa` · Producción: https://sac-omi.vercel.app/u

Este plan sale de leer el código y de lo que se probó en vivo el 3-nov-2026. Lo que no se pudo verificar está marcado. Si algo contradice al código o a CI, manda el código.

---

## 1. El flujo de la app

### 1.1 Recorrido de la persona

```
 1. ENTRAR ──► 2. ESCANEAR CV ──► 3. MAPA ──► 4. BRECHAS ──► 5. APRENDER Y ──► 6. CREDENCIAL
 (login o       (subir PDF,        (mapa de    (¿es real o     DEMOSTRAR         VERIFICABLE
  invitado)      análisis con IA)   capacidades) no aplica?)   (examen)          (?verificar=)
      ▲                                                                              │
      └────────────── 7. VOLVER A ESCANEAR: «brechas cerradas / nuevas» ◄───────────┘

 ASISTENTE de voz y texto: disponible en todas las pantallas.
```

### 1.2 Pantallas y rutas

| Ruta | Pantalla | Qué hace |
|---|---|---|
| `/` | Redirige a `/u` | También cualquier otra dirección (`/anterior`, `/?tab=…`); se conservan `?query` y `#hash` |
| `/u` | Inicio | Subir el CV, historial de análisis, resumen de avance |
| `/u/reporte/:id` | Reporte | Tres pestañas: `mapa`, `brechas`, `diagnostico`. La URL admite `?tab=` y `?brecha=` |
| `?verificar=<token>` | Credencial pública | Se atiende antes de decidir la ruta; no requiere cuenta |

El enrutado vive en `src/App.tsx` y `src/features/brecha/ui/ruta.ts`.

### 1.3 Camino de los datos al escanear un CV

```
 PDF ──► pdf.js en el NAVEGADOR (el archivo no sale del equipo)
     └──► texto del CV (mínimo 200 caracteres, máximo 15 000)
            └──► callAI ──► Edge Function proxy-ai (Supabase)
                              ├─ 1º Gemini en escalera: gemini-3.6-flash → gemini-3.8-flash → gemini-3.5-flash-lite
                              └─ 2º OpenRouter (modelos gratuitos), solo si fallan los tres de Gemini
            └──► domain/validar.ts: descarta toda evidencia que no sea una «cita literal»
                 presente en el CV o un «Ausente en el CV:». Si falla, reintenta una vez.
            └──► repositorio.ts ──► localStorage (una clave por persona; hoy NO va a Supabase)
            └──► Reporte (mapa, brechas, diagnóstico) y asistente
```

Reglas que no se rompen (`PRODUCT.md`): la interfaz no afirma más que el dato, nunca hay datos falsos, cero jerga, cada número con su escala. Si el análisis falla se informa el error y la persona reintenta; nunca se cae a la muestra fija.

### 1.4 Sesión

- **Invitado:** puede escanear sin registrarse. Sus análisis quedan en `omicron:brecha:db:v1:invitado`.
- **Al iniciar sesión:** los análisis del invitado **se preguntan** (traer a la cuenta o descartar). Nunca se mueven solos.
- **Cuenta sin acceso (`no_access`):** `/u` muestra el bloqueo, igual que la app anterior.

### 1.5 Estado de cada paso

| Paso | Estado | Evidencia |
|---|---|---|
| 1. Entrar | Funciona | Verificado en vivo: sesión iniciada con «Hola, Matías» |
| 2. Escanear CV | Funciona con IA real. **Calidad sin medir** | Verificado en vivo el 3-nov-2026. No hay medición de brechas reales |
| 3. Mapa | Existe. Rediseño pendiente | Acordar el diseño antes de tocar `MapaCapacidades` |
| 4. Brechas | Funciona, **solo en el navegador** | Se guarda en `localStorage` |
| 5. Aprender y demostrar | **Falta** | «Dominada» es autodeclarada (la pantalla dice «Dominadas (declaradas)») |
| 6. Credencial | **Falta** | Nada en `/u` usa `credential` ni `?verificar=` |
| 7. Re-escaneo | Existe | `comparar.ts` y capturas en `docs/fusion/visual-brecha/` |

---

## 2. Bugs

**Los 13 bugs de `docs/fusion/bugs-u.md` tienen su corrección en el código** (PR #411, tareas T1 a T11). Se comprobó que existe la señal de cada arreglo en el código, por ejemplo `ErrorBoundary`, estado `caducada`, `checkOmicronLimit`, pestaña en la URL y `traerInvitado`. **No está verificado en un dispositivo real:** el recorrido con sesión iniciada y la voz y el micrófono reales.

Problemas encontrados el 3-nov-2026:

| # | Problema | Estado |
|---|---|---|
| A | Cadena de IA rota: Gemini 2.0 Flash apagado (1-jun-2026), clave de Gemini inválida, modelos gratuitos de OpenRouter inexistentes | **Resuelto** (PR #5, #6 y `9894648`). Requiere `supabase functions deploy proxy-ai` tras cada cambio |
| B | La política de privacidad no dice que el texto del CV viaja a Google y OpenRouter, y afirma que los datos van a Supabase cuando `/u` los guarda en el navegador | Pendiente (1.3) |
| C | `domain/validar.ts` no tiene pruebas. Es la pieza que impide que la IA invente citas | Pendiente (1.2) |
| D | 4 avisos de lint (`isSpeaking` en `OrbShell.tsx`, `isLoadingProfile` en `UApp.tsx`, dependencias sobrantes en `useBrecha.ts`, `analisisId` en `PanelReporte.tsx`) y aviso de `ubuntu-latest` en CI | Pendiente (1.5) |
| E | Sin política CSP en `vercel.json` | Pendiente (Fase 4) |
| F | `estado-actual.md` desactualizado | Pendiente (1.4) |

---

## 3. Plan por fases

### Fase 1: usable por un grupo pequeño de prueba (5 a 10 personas)

| # | Tarea | Quién | Se acepta cuando |
|---|---|---|---|
| 1.1 | Probar 8 a 10 CVs de rubros distintos y ajustar el prompt en `services/analisisIA.ts` | Persona prueba, Kiro ajusta | Al menos 6 de cada 10 brechas son reales y ninguna cita inventada llega a pantalla |
| 1.2 | Pruebas de `domain/validar.ts` | Kiro | Fallan si se acepta una evidencia que no está en el CV |
| 1.3 | Política de privacidad: CV a Google y OpenRouter, y dónde se guardan los datos | Kiro redacta, la persona revisa | El texto coincide con lo que hace el código |
| 1.4 | Actualizar `estado-actual.md` | Kiro | Refleja dominio, IA y pasos de Supabase |
| 1.5 | Limpiar los avisos de lint y fijar la versión de Ubuntu en `ci.yml` | Kiro | CI sin avisos |
| 1.6 | Workflow de GitHub Actions que abre `sac-omi.vercel.app/u` con un CV de ejemplo | Kiro | Guarda capturas y la respuesta de `proxy-ai` como artefactos. Usa un CV de ejemplo: el repo es público |
| 1.7 | Probar en un celular real: login, voz y micrófono | Persona | Sin errores, o los fallos quedan reportados |

Condición para pasar de fase: 1.1 cumplida y 1.3 publicada. Avisar a quienes prueben que sus datos viven en su navegador.

### Fase 2: que los datos no se pierdan

Crear las tablas `brecha_*` con RLS (TAREA-31 de `docs/tasks.md`) y pasar de `localStorage` a Supabase. Requiere migraciones SQL que aplica la persona con `supabase db push`. **No abrir al público antes de esta fase.**

### Fase 3: cerrar el ciclo

Examen real para «Dominar» (TAREA-37) y credencial verificable (paso 6).

- Ya existe en el repo: funciones `simulador-universal`, `examen-ia` y `credential`; `register_exam_success` y la migración `10002` (examinar cualquier habilidad); `redviva/services/examenSkill.ts` y `hooks/useProbarHabilidad.ts`.
- Falta conectarlo a `/u`: abrir el examen desde una brecha, guardar el resultado en la brecha y mostrar lo probado en la credencial.
- **Decisiones previas:** si el examen vive dentro de `/u` o reutiliza el simulador de la app anterior, y qué cuenta como «dominada» (aprobar, o aprobar con cierta nota).

### Fase 4: endurecer

- Cabeceras de seguridad: CSP primero en modo «solo reporte», después bloqueando. PDF.js viene de cdnjs; además hay voz y Supabase. Probar con la app viva.
- Accesibilidad AA.
- ~~Retirar la interfaz anterior~~ **Hecho el 3-nov-2026**, ver §3.5.
- Actualización del service worker dentro de `/u`.

---

### 3.5 Retiro de la app anterior (hecho el 3-nov-2026)

Es un solo producto y no había usuarios en la app vieja. Se hizo en pasos, cada uno con CI en verde antes del siguiente:

| Paso | Qué | PR |
|---|---|---|
| 1 | Mover a `/u` lo que solo hacía la app vieja: recuperar contraseña (`PASSWORD_RECOVERY`) e instalar la PWA; quitar «Versión anterior» | #8 |
| 2 | Todo abre `/u`; se elimina `AppShell`; el recorrido visual de CI comprueba `/`, `/anterior`, `/?tab=wallet` y `/?source=pwa` | #9 |
| 3 | Borrar el código sin uso de `omicron`, `gemelo`, `academia` y `redviva`: 70 archivos (≈ 15 600 líneas con sus pruebas) | este PR |

**Se conserva** (lo usa `/u`): `gemelo/services/{cvExtract,cvAnalyzer,memory,reputation}` y `VerifyCredential`; `omicron/services/{brain,voice,emotion,tools}`; y, para el examen futuro, `redviva/services/examenSkill`, `redviva/hooks/useProbarHabilidad` y la prueba de `examenSkill`.

**Se pierde a propósito:** orbe 3D, Academia, Red Viva, Bóveda, perfiles públicos `?perfil=`, red en vivo y audio espacial. El backend y los datos de Supabase no se tocaron.

**Pendiente de limpieza (fuera de las 4 features, hoy huérfano):** `src/shared/motion/*`, varios `shared/components`, `hooks/useGemeloActivation` y otros, `infrastructure/ai/gemini.ts`, `infrastructure/pwa/push.ts` y `pages/TerminosServicio.tsx`. No se borraron: `TerminosServicio` es texto legal que `/u` debe enlazar y `push.ts` es la base de las notificaciones. También quedan `e2e/omicron.e2e.ts` (prueba la app vieja y no corre en CI) y dependencias de npm sin uso (por ejemplo las del orbe 3D), que exigen regenerar `package-lock.json` con `npm install`.

**Examen:** `UniversalSimulator` y la pantalla de Red Viva se borraron; el examen para «Dominar» se construye dentro de `/u` sobre `examenSkill` y `useProbarHabilidad`.

## 4. Riesgos

- **Cuota y saturación de Gemini.** El 3-nov-2026 ya respondió 503 por alta demanda. La escalera de tres modelos y OpenRouter lo amortiguan, no lo eliminan. Vigilar los logs de `proxy-ai`.
- **Límite de 15 peticiones por minuto por IP** en `proxy-ai`. Un grupo en la misma red puede alcanzarlo.
- **Datos locales:** quien cambie de navegador o borre datos pierde su historial hasta la Fase 2.
- **Despliegue manual de Supabase:** fusionar un PR de `supabase/functions/` no actualiza producción. Hay que correr `supabase functions deploy <función>`.
- **No verificado nunca:** voz y micrófono en un dispositivo real, recorrido con sesión iniciada, calidad del análisis con CVs variados.

## 5. Decisiones abiertas

1. ¿SAC queda público o privado? Hoy es público y contiene documentos de producto.
2. ¿Hay usuarios reales desde ya, o es una salida de prueba? Si hay usuarios, la Fase 2 sube de prioridad.
3. Examen: se construye dentro de `/u` (el simulador anterior se retiró). ¿Qué cuenta como «dominada»: aprobar, o aprobar con cierta nota?
4. Qué hacer con la revelación inicial, el pasaporte, la Academia y la reputación visible (`docs/fusion/producto-unico.md` §3.4).
5. Rediseño del mapa: habilidades con porcentaje como nodos sólidos y brechas como nodos huecos.
