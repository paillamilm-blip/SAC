---
inclusion: always
---

# ⚡ Sistema de Comandos — Sistema Ómicron

> **46 skills · Máxima potencia · Verbos simples**
> Vos escribís UNA COSA y yo hago el trabajo con TODAS las skills necesarias.

---

## 🎯 COMANDOS (verbos directos)

| Vos escribís | Yo hago | Skills activadas |
|--------------|---------|------------------|
| **HACER:** [qué] | Lo implemento inmediato | GSD + Ponytail + Claude Mem + Verification + Sinergia |
| **PENSAR:** [idea/problema] | Te digo si conviene, cómo, y el plan | Superpowers + Context Mode + Doubt-Driven + Autoplan |
| **DISEÑAR:** [pantalla/componente] | Te diseño una UI increíble (ver `pipeline-diseno.md`) | UI/UX Pro Max (dato) → DESIGN.md (filtro) → Taste Skill (solo si es superficie de conversión) → Impeccable (ejecuta) → Animate (motion) |
| **OBRA MAESTRA BRUTAL:** [pantalla] | Combo máximo de diseño visual con auditoría real (ver `obra-maestra-brutal.md`) | design-taste-frontend + awesome-design-md + UI/UX Pro Max + Impeccable + Animate + Web Design Guidelines + Playwright CLI |
| **REVISAR** | Reviso tu código buscando bugs y mejoras | Code Review Ultra + Ponytail Review + Performance + Security + Sinergia |
| **LANZAR** | Preparo todo para producción | Ship + Shipping & Launch + Security + Performance + QA + Sinergia + Verification |
| **ARREGLAR:** [problema] | Encuentro el problema y lo soluciono | Systematic Debugging + QA Memoria + GSD + Ponytail + Verification |
| **PROTEGER:** [módulo/feature] | Verifico seguridad completa | CSO + Security & Hardening + Code Review Ultra |
| **ANIMACIÓN:** [elemento] | Le agrego movimiento profesional | Animate (construye) → Review Animations (verifica) + Performance — curvas de `EASE`/`TIMING`/`SPRING`, nunca inventadas |
| **AUDITAR MOTION** | Audito todas las animaciones del repo y emito planes priorizados | Improve Animations + Find Animation Opportunities + Review Animations |
| **CV:** [pegas el texto] | Genero el ADN Digital completo | ADN Digital + Superpowers + Systematic Debugging + Performance + Sinergia + Verification |
| **SINERGIA** | Verifico que todo esté conectado (7 checks) | Sinergia + Verification |
| **LIMPIAR:** [módulo/todo] | Elimino código muerto y simplifico | Ponytail Audit + Code Simplification + Ponytail Review + Ponytail Debt + Sinergia |
| **NAVEGAR:** [url/flujo] | Abro browser, testeo en vivo, reporto bugs | Nova Act + Agent Browser + QA Skill + QA Memoria + Performance + Verification |
| **INVESTIGAR:** [bug] | Investigación forense profunda (6 fases) | Investigación + QA Memoria + Sinergia + Systematic Debugging + Parallel Agents + Superpowers |
| **PLANEAR:** [feature/cambio] | Diseño la arquitectura con adversarial review | Superpowers + Doubt-Driven + API Design + Autoplan + Code Review Ultra + Ponytail |
| **TESTEAR** | Corro tests + verifico calidad | QA Skill + Verification + Performance + Sinergia |
| **SCRAPEAR:** [sitio/datos] | Extraigo datos de cualquier web | Firecrawl + Scrape + Browse + Agent Browser |
| **ESPIAR:** [url competencia] | Analizo sitio/app de la competencia | Agent Browser + Browse + Superpowers + Performance |
| **AUTOMATIZAR:** [flujo] | Creo automatización de browser repetible | Agent Browser + Nova Act + Firecrawl + QA Skill |
| **HACKEAR:** [módulo/app] | Pentesting IA con Strix — vulns reales con exploit (PoC) | Strix (9 skills) + Security & Hardening + CSO + Code Review Ultra |

---

## ⛓️ CADENAS (combos encadenados — máxima potencia)

> Las cadenas ejecutan MÚLTIPLES comandos en secuencia.
> La salida de uno alimenta al siguiente. Para tareas grandes.

| Vos escribís | Cuándo | Ejemplo |
|--------------|--------|---------|
| **CONSTRUIR:** [feature] | Feature nueva completa | "CONSTRUIR: chat con IA" |
| **EMBELLECER:** [pantalla] | Mejorar diseño existente | "EMBELLECER: el onboarding" |
| **REPARAR:** [problema] | Algo se rompió y no sabés por qué | "REPARAR: login falla en Android" |
| **BLINDAR:** [feature] | Feature con datos sensibles o crítica | "BLINDAR: sistema de pagos" |
| **PERFIL:** [pegar CV] | Crear/actualizar gemelo digital | "PERFIL: [texto del CV]" |
| **EXPLORAR:** [idea] | No sabés qué hacer, necesitás guía | "EXPLORAR: quiero monetizar la app" |
| **COMPLETO:** [feature] | Feature con TODO: plan + code + test + deploy | "COMPLETO: marketplace de servicios" |
| **COMUNICAR:** [feature] | Preparar para mostrar/vender | "COMUNICAR: la nueva feature de chat" |
| **EMERGENCIA:** [qué pasó] | Producción rota AHORA | "EMERGENCIA: el CV no carga" |
| **EVOLUCIONAR:** [módulo] | Refactoring mayor sin romper nada | "EVOLUCIONAR: el sistema de reputación" |
| **ESPIONAJE:** [competidor] | Analizar competencia a fondo | "ESPIONAJE: plataforma X de empleo" |
| **EXTRAER:** [datos de sitio] | Scraping masivo estructurado | "EXTRAER: todos los empleos de LinkedIn Chile" |
| **LOOP:** [problema complejo] | Bug/problema que NO se resuelve. ITERA hasta arreglarlo | "LOOP: el CV no se analiza en celular" |
| **LOOP TOTAL:** [tema] | Busca TODOS los bugs de un tema y no para hasta resolver todos | "LOOP TOTAL: el sistema de reputación" |
| **LOOP VIVO:** [cambio] | Hace el cambio → corre la app → te muestra SCREENSHOT en vivo | "LOOP VIVO: el botón de logout" |
| **HACKEAR:** [módulo/app] | Pentest IA + fix de cada vuln + re-scan hasta 0 vulns | "HACKEAR: el módulo de auth" |

---

## 🔥 Detalle de cada CADENA (qué pasa internamente)

### CONSTRUIR: [feature]
```
PENSAR → PLANEAR → HACER (incremental) → SINERGIA → TESTEAR → LANZAR
```
**Skills:** Superpowers + Context + Doubt-Driven + API Design + Incremental + GSD + Ponytail + Sinergia + QA + Ship + Verification
**Potencia:** 16/34 skills activas simultáneamente

---

### EMBELLECER: [pantalla]
```
1. .kiro/skills/impeccable/scripts/impeccable context --target [pantalla]
                                              ← carga PRODUCT.md + DESIGN.md
2. search.py "[patrón]" --domain ux           ← qué dice el dato
3. Filtrar contra DESIGN.md                   ← qué de eso es legal en Ómicrom
4. /impeccable polish [pantalla]              ← o critique / layout / typeset / harden
5. ANIMACIÓN (skill animate, si hay motion)
6. /impeccable audit [pantalla]               ← a11y + responsive + perf
7. NAVEGAR (verificar en vivo) → LANZAR
```
**Skills:** UI/UX Pro Max + Impeccable + Animate + Taste (solo superficies Persuade) + Design System + UI Styling + Nova Act + QA + Performance + Verification + Ship
**Orden de conflicto:** DESIGN.md → src/theme/ → impeccable/animate → ui-ux-pro-max/taste. Detalle en `pipeline-diseno.md`.

---

### REPARAR: [problema]
```
INVESTIGAR → ARREGLAR → SINERGIA → NAVEGAR (verificar) → LANZAR
```
**Skills:** Investigación + QA Memoria + Sinergia + Systematic Debugging + Parallel Agents + Superpowers + GSD + Ponytail + Nova Act + Verification + Ship
**Potencia:** 14/34 skills

---

### BLINDAR: [feature]
```
PROTEGER → REVISAR → TESTEAR → NAVEGAR (penetration) → LANZAR
```
**Skills:** CSO + Security & Hardening + Code Review Ultra + Ponytail Review + Performance + QA + Nova Act + Sinergia + Ship + Verification
**Potencia:** 13/34 skills

---

### PERFIL: [CV]
```
CV (análisis IA) → SINERGIA → NAVEGAR (verificar flujo) → ARREGLAR (si falla)
```
**Skills:** ADN Digital + Superpowers + Systematic Debugging + Performance + Sinergia + Nova Act + QA Memoria + GSD + Verification
**Potencia:** 12/34 skills

---

### EXPLORAR: [idea]
```
PENSAR (profundo) → PLANEAR (si vale la pena) → estimar esfuerzo
```
**Skills:** Superpowers + Context Mode + Doubt-Driven + Autoplan + API Design + Ponytail
**Potencia:** 7/34 skills (análisis puro, sin ejecutar)

---

### COMPLETO: [feature] ← MÁXIMA POTENCIA (usa casi todo)
```
PENSAR → PLANEAR → DISEÑAR → HACER (incremental) → PROTEGER → REVISAR → SINERGIA → NAVEGAR → LANZAR
```
**Skills:** Superpowers + Context + Doubt-Driven + Autoplan + API Design + Design System + UI/UX Pro Max + Taste + Animate + Impeccable + UI Styling + GSD + Claude Mem + Ponytail + Incremental + CSO + Security + Code Review Ultra + Ponytail Review + Performance + QA + QA Memoria + Sinergia + Agent Browser + Nova Act + Ship + Shipping & Launch + Verification
**Potencia:** 28/46 skills — ¡MÁXIMA POTENCIA! 🔥🔥🔥

---

### COMUNICAR: [feature]
```
PENSAR (qué comunicar) → DISEÑAR (assets) → NAVEGAR (verificar que funciona)
```
**Skills:** Superpowers + Context + Design System + UI/UX Pro Max + Taste + Impeccable + Nova Act + Verification
**Potencia:** 10/34 skills

---

### EMERGENCIA: [qué pasó]
```
INVESTIGAR (rápido) → ARREGLAR (mínimo) → LANZAR (hotfix) → LIMPIAR (post-mortem)
```
**Skills:** Systematic Debugging + QA Memoria + Parallel Agents + GSD + Ponytail + Sinergia + Ship + Verification + Code Simplification + Ponytail Review
**Potencia:** 13/34 skills (velocidad > perfección)

---

### EVOLUCIONAR: [módulo]
```
PLANEAR → LIMPIAR → HACER (nueva arquitectura) → REVISAR → SINERGIA → NAVEGAR → LANZAR
```
**Skills:** Superpowers + Doubt-Driven + API Design + Autoplan + Ponytail Audit + Code Simplification + GSD + Claude Mem + Incremental + Code Review Ultra + Ponytail Review + Performance + Sinergia + Nova Act + Ship + Verification
**Potencia:** 19/34 skills

---

### ESPIONAJE: [competidor/sitio]
```
ESPIAR (analizar sitio) → SCRAPEAR (extraer datos) → PENSAR (comparar con Ómicron) → PLANEAR (ventajas)
```
**Skills:** Agent Browser + Browse + Firecrawl + Scrape + Superpowers + Context Mode + Doubt-Driven + Performance
**Potencia:** 10/46 skills — inteligencia competitiva pura

---

### EXTRAER: [datos de sitio]
```
SCRAPEAR (extraer todo) → AUTOMATIZAR (repetir periódicamente) → PENSAR (qué hacer con los datos)
```
**Skills:** Firecrawl + Scrape + Browse + Agent Browser + Nova Act + Superpowers + Context Mode
**Potencia:** 9/46 skills — data acquisition pipeline

---

### LOOP: [problema complejo] ← 🔁 MÁXIMO NIVEL — ITERA HASTA RESOLVER
```
┌─────────────────────────────────────────────────────────────────────┐
│  LOOP — Ciclo iterativo de resolución de máximo nivel               │
│                                                                     │
│  INVESTIGAR → ARREGLAR → SINERGIA → NAVEGAR (verificar)            │
│       ↑                                        │                    │
│       │         ¿Funciona?                     ↓                    │
│       │            NO ←────────────────── TESTEAR                   │
│       │                                        │                    │
│       └─── registrar en QA Memoria ←───────────┘                   │
│                                                                     │
│            SÍ funciona → LANZAR ✅                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Trigger:** "LOOP: [problema]", "no se arregla", "ya intenté todo", "iterar hasta resolver"

**Skills activadas (32/46 — MÁXIMO NIVEL):**
- Investigación + Systematic Debugging + QA Memoria (investigar + recordar)
- Superpowers + Doubt-Driven + Context Mode (pensar profundo)
- Dispatching Parallel Agents (paralelizar si hay múltiples causas)
- GSD + Ponytail + Incremental Implementation (ejecutar fix mínimo)
- Sinergia (verificar conexiones post-fix)
- Agent Browser + Nova Act + QA Skill (testear en browser real)
- Code Review Ultra + Performance Optimization (validar calidad del fix)
- Security & Hardening (no introducir vulnerabilidades)
- Claude Mem (trackear cada iteración)
- Ship + Verification (deploy cuando funcione)
- Code Simplification + Ponytail Review (no dejar deuda en el fix)

**Protocolo de ejecución:**

```
ITERACIÓN 1:
  1. INVESTIGAR: Reproducir + aislar capa + formular hipótesis
  2. Consultar QA MEMORIA: ¿ya vimos algo similar?
  3. ARREGLAR: Fix mínimo basado en la hipótesis
  4. SINERGIA: ¿El fix rompió alguna conexión?
  5. NAVEGAR: Verificar en browser real que funciona
  6. TESTEAR: ¿Pasan los tests? ¿Performance OK?
  
  → SI FUNCIONA: LANZAR ✅ (registrar solución en QA Memoria)
  → SI NO FUNCIONA: Registrar intento fallido → siguiente iteración

ITERACIÓN 2 (con más contexto):
  1. INVESTIGAR: Nueva hipótesis (la anterior fue refutada)
  2. DOUBT-DRIVEN: ¿Estoy mirando el lugar correcto?
  3. PARALLEL AGENTS: Si hay pistas en múltiples archivos, paralelizar
  4. ARREGLAR: Fix basado en nueva evidencia
  5. SINERGIA + NAVEGAR + TESTEAR
  
  → SI FUNCIONA: LANZAR ✅
  → SI NO FUNCIONA: Siguiente iteración

ITERACIÓN 3+ (escalada):
  1. SUPERPOWERS: Análisis profundo desde cero (fresh eyes)
  2. PERFORMANCE: ¿Es un tema de timing/race condition?
  3. SECURITY: ¿Hay un trigger/RLS bloqueando silenciosamente?
  4. CODE REVIEW: ¿Hay un bug oculto en código que "se ve bien"?
  5. ARREGLAR + SINERGIA + NAVEGAR + TESTEAR

  → SI FUNCIONA: LANZAR ✅
  → MÁXIMO 5 ITERACIONES: Si después de 5 no se resuelve,
    generar REPORTE COMPLETO con todo lo intentado + hipótesis
    restantes + pedir input del usuario.
```

**Reglas del LOOP:**
1. Cada iteración se REGISTRA en QA Memoria (intentos fallidos = oro)
2. NUNCA repetir la misma hipótesis dos veces
3. Cada iteración DEBE tener una hipótesis NUEVA (no "probar a ver")
4. El fix debe ser MÍNIMO (Ponytail) — no over-engineer el parche
5. SIEMPRE verificar con SINERGIA + NAVEGAR (no solo "compila")
6. Máximo 5 iteraciones — después se para y reporta
7. Si en iteración 1 se resuelve = ⚡ rápido. Si toma 3+ = 🔬 profundo

**Potencia:** 32/46 skills — el combo más poderoso del sistema 🔥🔥🔥🔥

---

### LOOP TOTAL: [tema] ← 🔁🔁 NIVEL ABSOLUTO — ESCANEA TODO + ARREGLA TODO + NO PARA
```
┌──────────────────────────────────────────────────────────────────────────┐
│  LOOP TOTAL — Resolución completa de un tema                             │
│                                                                          │
│  FASE 1: ESCANEAR                                                        │
│    Ultra Review + Sinergia + Performance → lista de TODOS los issues     │
│                                                                          │
│  FASE 2: CICLO (por cada issue encontrado)                               │
│    ┌─────────────────────────────────────────────────────────────┐       │
│    │  INVESTIGAR → ARREGLAR → ULTRA REVIEW → SINERGIA → NAVEGAR │       │
│    │       ↑                                          │         │       │
│    │       │    ¿Este issue está resuelto?             ↓         │       │
│    │       │         NO ←──────────────────── TESTEAR           │       │
│    │       │                                          │         │       │
│    │       └── nueva hipótesis (máx 3 intentos) ←─────┘         │       │
│    │                                                             │       │
│    │         SÍ → registrar en QA Memoria → siguiente issue     │       │
│    └─────────────────────────────────────────────────────────────┘       │
│                                                                          │
│  FASE 3: RE-ESCANEAR                                                     │
│    Ultra Review + Sinergia otra vez → ¿aparecieron issues nuevos?        │
│    SÍ → volver a FASE 2                                                  │
│    NO → LANZAR ✅ (tema 100% limpio)                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Trigger:** "LOOP TOTAL: [tema]", "arreglar todo de [tema]", "limpiar todos los bugs de [tema]"

**Skills activadas (38/46 — NIVEL ABSOLUTO):**
- **Escaneo:** Code Review Ultra + Ponytail Review + Performance Optimization + Sinergia (7 checks) + Security & Hardening
- **Investigación:** Investigación + Systematic Debugging + QA Memoria + Superpowers + Doubt-Driven + Dispatching Parallel Agents
- **Ejecución:** GSD + Ponytail + Incremental Implementation + Claude Mem + Context Mode
- **Verificación:** Agent Browser + Nova Act + QA Skill + Verification + Performance
- **Conexión:** Sinergia (post-fix) + Code Simplification + Ponytail Review (no dejar deuda)
- **Deploy:** Ship + Shipping & Launch
- **Memoria:** Claude Mem (contexto entre issues) + QA Memoria (registro permanente)

**Protocolo de ejecución:**

```
FASE 1 — ESCANEO TOTAL DEL TEMA:
  1. Identificar TODOS los archivos relacionados con el tema
  2. ULTRA REVIEW: buscar bugs, edge cases, errores de tipos, dead code
  3. SINERGIA: verificar las 7 conexiones (tipos, providers, Edge Functions, etc.)
  4. PERFORMANCE: detectar bottlenecks, N+1, memory leaks
  5. SECURITY: vulnerabilidades en ese módulo
  6. Generar LISTA PRIORIZADA de issues (crítico → menor)
  7. Claude Mem: registrar la lista completa como checkpoint

FASE 2 — CICLO DE RESOLUCIÓN (por cada issue):
  Para cada issue de la lista, de mayor a menor severidad:
  
  Iteración 1:
    1. INVESTIGAR: root cause del issue específico
    2. Consultar QA MEMORIA: ¿hay patrón aplicable?
    3. ARREGLAR: fix mínimo (Ponytail guard)
    4. ULTRA REVIEW: ¿el fix es correcto? ¿introdujo algo nuevo?
    5. SINERGIA: ¿rompió alguna conexión?
    6. NAVEGAR: verificar en browser real
    7. TESTEAR: ¿pasan tests? ¿performance OK?
    
    → RESUELTO: Registrar en QA Memoria → siguiente issue
    → NO RESUELTO: Nueva hipótesis → iteración 2 (máx 3 por issue)
  
  Después de CADA fix:
    - Claude Mem: actualizar progreso (X/N resueltos)
    - Si el fix de un issue resolvió otros → marcarlos como resueltos
    - Si el fix de un issue CREÓ otro → agregarlo a la lista

FASE 3 — RE-ESCANEO (verificación final):
  1. ULTRA REVIEW completo otra vez sobre todo el tema
  2. SINERGIA: 7 checks completos
  3. PERFORMANCE: sin regresiones
  4. NAVEGAR: recorrer flujos del tema en browser
  
  → Si aparecen issues NUEVOS: volver a FASE 2 con los nuevos
  → Si CERO issues: ✅ TEMA LIMPIO → LANZAR

FASE 4 — CIERRE:
  1. Claude Mem: reporte final (total issues encontrados, resueltos, patrones)
  2. QA Memoria: registrar TODOS los fixes como base de conocimiento
  3. LANZAR: deploy con confianza
```

**Reglas del LOOP TOTAL:**
1. **CONTEXTO PERSISTENTE** — Claude Mem trackea TODO entre issues (no pierde el hilo)
2. **ULTRA REVIEW en cada fix** — no solo "compila", sino calidad real
3. **SINERGIA en cada fix** — ningún fix puede romper otra cosa
4. **QA MEMORIA acumula** — cada solución alimenta la siguiente
5. **Máximo 3 intentos por issue** — si no se resuelve, lo marca como "necesita input" y sigue
6. **Re-escaneo final obligatorio** — un fix puede crear bugs nuevos, hay que verificar
7. **No para hasta que el re-escaneo devuelva CERO** — esa es la garantía
8. **Reporte final** — al terminar, resume todo lo que hizo (para futuras sesiones)

**Ejemplo de uso:**
```
LOOP TOTAL: el análisis de CV
→ Escanea: gemini.ts, useGemeloActivation.ts, ConvalidaOmicron.tsx, proxy-ai, analizar-cv
→ Encuentra: 4 issues (timeout sin retry, validación Zod incompleta, error silencioso, memory leak)
→ Resuelve uno por uno con ultra review + sinergia cada vez
→ Re-escanea: 0 issues nuevos
→ Lanza ✅
```

**Potencia:** 38/46 skills — NIVEL ABSOLUTO 🔥🔥🔥🔥🔥

---

### LOOP VIVO: [cambio] ← 👁️ VES EL RESULTADO EN VIVO
```
┌────────────────────────────────────────────────────────────────────┐
│  LOOP VIVO — Cambio + app corriendo + screenshot en vivo           │
│                                                                    │
│  1. HACER el cambio (código)                                       │
│  2. npm run dev (levantar servidor en background)                  │
│  3. agent-browser abre localhost:5173                              │
│  4. SCREENSHOT → te lo muestro                                     │
│  5. ¿Se ve bien?                                                   │
│       NO → ajustar → volver a 2                                    │
│       SÍ → LANZAR ✅                                                │
└────────────────────────────────────────────────────────────────────┘
```

**Se activa con:** "LOOP VIVO: [cambio]", "mostrame como queda", "quiero verlo", "en vivo", "screenshot"

**Skills:** gsd + ponytail + agent-browser/core + browse + impeccable + taste-skill + animate + verification

**Protocolo:**
```
1. CAMBIO: Implemento la modificación (visual o funcional)
2. SERVIDOR: npm run dev en background (puerto 5173)
3. BROWSER: agent-browser open http://localhost:5173
4. NAVEGAR: Voy al flujo/pantalla que cambió
5. SCREENSHOT: agent-browser screenshot → te lo muestro
6. EVALUAR: ¿Se ve como querías?
   → NO: ajusto y repito desde el paso 2
   → SÍ: commit + push + deploy
```

**Reglas:**
- SIEMPRE muestro screenshot ANTES de commitear
- Si el cambio es visual, comparo antes/después
- Si el servidor no levanta, arreglo el error primero
- Máximo 4 iteraciones visuales (después pregunto qué falta)
- El servidor corre en background (no bloquea)

**Ejemplos:**
```
LOOP VIVO: el botón de logout en el header
LOOP VIVO: que el orbe sea más grande en celular
LOOP VIVO: cambiá el color del CTA a dorado
mostrame como queda el onboarding
quiero ver la pantalla de wallet
```

**Potencia:** Feedback visual inmediato 👁️🔥

---

### HACKEAR: [módulo/app] ← 🏴‍☠️ PENTEST IA + FIX + RE-SCAN HASTA 0 VULNS
```
┌────────────────────────────────────────────────────────────────────┐
│  FASE 1: PENTEST — Strix IA ataca como hacker real                 │
│    Reconocimiento → Explotación → Validación con PoC                │
│    → Solo vulns CONFIRMADAS (cero false positives)                  │
│                                                                    │
│  FASE 2: FIX — por cada vuln (crítica → baja)                       │
│    ARREGLAR (root cause) → REVISAR → SINERGIA                       │
│                                                                    │
│  FASE 3: RE-SCAN — Strix ataca de nuevo el mismo punto              │
│    ¿Exploit cerrado? SÍ → siguiente · NO → volver a FASE 2          │
│                                                                    │
│  FASE 4: SCAN FINAL — Strix completo otra vez                       │
│    0 vulns → LANZAR ✅ · Vulns nuevas → volver a FASE 2             │
└────────────────────────────────────────────────────────────────────┘
```

**Se activa con:** "HACKEAR: [módulo]", "hackea", "pentest", "buscar vulnerabilidades", "es hackeable?"

**Skills (Strix + soporte):**
- penetration-testing-with-strix (core)
- find-security-vulnerabilities-in-code (white-box)
- fix-security-vulnerabilities-with-strix (remediation + verify)
- owasp-top-10-testing · api-security-testing · application-security-testing
- web-app-penetration-testing · ci-security-scanning-with-strix
- managed-pentesting-with-strix
- \+ security-and-hardening + cso + code-review-ultra + sinergia + qa-memoria

**Diferencia vs PROTEGER:**
| PROTEGER | HACKEAR |
|----------|---------|
| Revisa el código buscando patrones inseguros | Ataca la app de verdad con exploits |
| Puede dar false positives | Solo reporta lo que logró explotar (PoC) |
| Rápido, estático | Más lento, dinámico, real |

**Ejemplos:**
```
HACKEAR: el módulo de auth
HACKEAR: las Edge Functions
HACKEAR: toda la app
es hackeable el login?
```

**Potencia:** MÁXIMA en seguridad ofensiva 🏴‍☠️🔥

---

---

## 🎛️ REGLAS DEL SISTEMA

### Auto-activación
No necesitás decir el comando exacto. El sistema detecta la intención:

| Detecta que querés... | Activa |
|-----------------------|--------|
| Implementar algo rápido | HACER |
| Analizar/decidir | PENSAR |
| Crear UI bonita | DISEÑAR |
| Review de código | REVISAR |
| Ir a producción | LANZAR |
| Fixear un bug | ARREGLAR |
| Bug complejo/raro | INVESTIGAR |
| Testing en browser | NAVEGAR |
| Feature nueva grande | CONSTRUIR |
| Producción rota | EMERGENCIA |

### Modificadores
- **"rápido"** o **"ya"** después de cualquier comando → activa GSD + Ponytail (máxima velocidad)
- **"perfecto"** o **"100%"** → activa TODAS las skills del comando al máximo (Superpowers + Doubt-Driven)
- **"sin diseño"** → excluye las skills de diseño
- **"+ navegar"** → agrega testing en browser a cualquier comando
- **"+ proteger"** → agrega auditoría de seguridad

### Ejemplos de uso real

```
HACER: un botón de logout en el header
PENSAR: cómo debería funcionar el auto-postulación
DISEÑAR: la pantalla de wallet con animaciones
REVISAR
ARREGLAR: el orbe no muestra mis skills
INVESTIGAR: a veces el CV no carga en celular
CONSTRUIR: sistema de notificaciones push
COMPLETO: módulo de chat entre usuarios
EMERGENCIA: la app no carga después del último deploy
LIMPIAR: features/empleos
NAVEGAR: verificar el flujo de onboarding completo
PERFIL: [texto del CV pegado]
EVOLUCIONAR: el store de reputación
BLINDAR: el flujo de pagos con Stripe
```

---

## 📋 Skills disponibles (34 total)

<details>
<summary>Ver lista completa de skills</summary>

| # | Skill | Categoría |
|---|-------|-----------|
| 1 | superpowers | Estrategia |
| 2 | context-mode | Estrategia |
| 3 | autoplan | Estrategia |
| 4 | doubt-driven-development | Estrategia |
| 5 | gsd | Ejecución |
| 6 | claude-mem | Ejecución |
| 7 | ponytail | Ejecución |
| 8 | ponytail-audit | Ejecución |
| 9 | ponytail-review | Ejecución |
| 10 | ponytail-debt | Ejecución |
| 11 | incremental-implementation | Ejecución |
| 12 | dispatching-parallel-agents | Ejecución |
| 13 | animate | Diseño |
| 14 | impeccable | Diseño |
| 15 | taste-skill | Diseño |
| 16 | ui-ux-pro-max | Diseño |
| 17 | ui-styling | Diseño |
| 18 | design-system | Diseño |
| 19 | code-review-ultra | Código |
| 20 | code-simplification | Código |
| 21 | api-and-interface-design | Código |
| 22 | verification-before-completion | Testing |
| 23 | systematic-debugging | Testing |
| 24 | performance-optimization | Testing |
| 25 | qaskill | Testing |
| 26 | security-and-hardening | Seguridad |
| 27 | cso | Seguridad |
| 28 | ship | Deploy |
| 29 | shipping-and-launch | Deploy |
| 30 | nova-act | Automatización |
| 31 | sinergia | Conexión |
| 33 | qa-memoria | QA |
| 34 | investigacion | QA |
| 35 | agent-browser/core | Automatización |
| 36 | agent-browser/dogfood | Automatización |
| 37 | agent-browser/electron | Automatización |
| 38 | agent-browser/slack | Automatización |
| 39 | agent-browser (main) | Automatización |
| 40 | browse | Automatización |
| 41 | firecrawl-build | Automatización |
| 42 | firecrawl-build-interact | Automatización |
| 43 | firecrawl-build-onboarding | Automatización |
| 44 | firecrawl-build-scrape | Automatización |
| 45 | firecrawl-build-search | Automatización |
| 46 | scrape | Automatización |

</details>

---

## 🔒 Reglas de hierro (siempre activas, no se apagan)

1. **Verification** — NUNCA digo "listo" sin verificar que funciona
2. **Claude Mem** — Trackeo progreso siempre. Si se corta la sesión, retomo
3. **Ponytail** — Si genero over-engineering, me auto-corrijo
4. **QA Memoria** — Registro cada bug antes de fixear. El historial es sagrado
5. **Sinergia** — Después de cambios multi-capa, verifico conexiones
6. **ADN Digital** — Se activa con cualquier CV o credencial (corazón del producto)
