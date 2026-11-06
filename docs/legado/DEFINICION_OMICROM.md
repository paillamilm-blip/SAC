> **Documento histórico (movido aquí el 6 de noviembre de 2026).** Describe el producto anterior a la unificación en `/u` (orbe, academia, mercado, contratos, tokens, red social o reputación de 4 ejes), que se retiró en noviembre de 2026. No describe la app actual: para eso, ver [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md) y [`docs/operacion.md`](../operacion.md).

# Sistema Omicrom — Definicion Maestra + Vision de Producto

> **Fuente unica de verdad** del QUE es Omicron, para QUIEN es, y HACIA DONDE va.
> Ultima actualizacion: **20 de agosto de 2026**.

---

## 1. Que es Omicron (una frase)

**Omicron es una herramienta de aprendizaje continuo en tiempo real, para todo el mundo.**
Es un asistente de IA estilo "Jarvis" que envuelve toda la app y, desde donde estes
parado, te empuja en tiempo real hacia tu proxima mejora — y esa mejora se traduce, al
instante, en oportunidades reales del mercado. Es la Industria 5.0 aplicada al talento
humano: nada de esperar meses para validar lo que sabes — se mide y se conecta ahora.

---

## 2. Vision (manifiesto)

Sistema Omicron es un ecosistema de capital intelectual y validacion meritocratica que
transforma la capacidad humana en valor economico, mediante una reputacion verificable e
imposible de falsear: el **Gemelo Digital**.

Donde un CV se inventa y las resenas se compran, Omicron construye confianza con evidencia
real, validada entre pares. Opera bajo una arquitectura de "confianza cero": nada se asume,
todo se prueba. Y todo esto ocurre en tiempo real y sin restriccion geografica.

### Pilares innovadores

- **Gemelo Digital** — reputacion dinamica que audita el desempeno en tiempo real:
  20% credenciales validadas + 80% de 4 ejes (Ejecucion, Calidad, Trascendencia, Fundamento).
- **Boveda de Conocimiento** — mercado de soluciones tecnicas donde el conocimiento se indexa,
  se valida por expertos y se capitaliza (genera ingresos por consultas de terceros).
- **Regalias Encadenadas** — cuando una solucion se reutiliza o mejora, el valor fluye en
  cadena hacia sus creadores originales.
- **Depreciacion Automatica (H-07)** — los activos de conocimiento pierden valor a medida que
  se vuelven obsoletos, manteniendo la Boveda siempre de vanguardia.
- **Tribunal de Pares (Justicia Distribuida)** — los "Nodos Arquitectos" validan la integridad
  de contratos y entregas. Disputas resueltas entre pares, no por una autoridad central.

---

## 3. Version usuario (lo que ve el estudiante/tecnico)

> "Demuestra lo que sabes, aprende haciendo y gana tus primeras oportunidades —
> con una reputacion que las empresas SI confian."

- Aprende y sube de nivel superando retos reales (no solo viendo videos).
- Construye tu reputacion desde cero — verificada por ingenieros y profesores reales.
- Consigue trabajos y cobra de forma segura (tu pago esta protegido).
- Capitaliza lo que sabes: comparte soluciones y gana cuando otros las usan.

Rompe el circulo "sin experiencia no me contratan / sin que me contraten no gano experiencia".

---

## 4. El asistente que empuja (norte del producto)

### Principios

1. **La orbe es la presencia viva.** Centro de la experiencia; reacciona a la voz y al estado.
2. **Le hablas o le escribis.** Una barra de comando unica (voz + texto) para toda la app.
3. **Los sub-nodos NO explican — EMPUJAN.** Detectan tu punto debil y te lanzan el paso concreto para mejorar.
4. **Mide tus capacidades en tiempo real.** Los 4 ejes son el pulso vivo de tu Gemelo Digital.
5. **Sinergia total y fluidez.** Aprender (Academia) -> medir (Reputacion) -> oportunidad (Empleos/Market) -> comunidad.
6. **Oportunidades reales del mercado, en tiempo real**, a cualquier persona en cualquier lugar.

### El loop central

```
Omicron te lee  ->  detecta tu eje mas debil / tu meta
      |
"Tu Ejecucion esta en 52. Para calificar a estos trabajos -> hace este reto ahora."   [ IR -> ]
      |
Lo haces  ->  sube tu capacidad EN VIVO  ->  se abren nuevas puertas y oportunidades
```

### Como se apoya en lo que YA existe

| Pieza actual | Rol en Omicron |
|---|---|
| `OrbNeuronal` + `OrbShell` (3D neuronal) | La orbe viva |
| `OraculoBar` + `oraculo.ts` + `voiceEngine.ts` | Hablar/escribir (voz es-ES + intencion) |
| Edge Functions (`coach`, `tutor`, `chat-assist`...) | El cerebro IA que responde y aconseja |
| `activeTab` / `setActiveTab` | Los nodos de navegacion |
| `gemelo/services/reputation.ts` (4 ejes) | El medidor de capacidades en tiempo real |
| Empleos, Market, Red Social | Las oportunidades reales de la comunidad |

---

## 5. Evolucion del usuario: de estudiante a Nodo Arquitecto

1. **Entrenamiento** (Academia + arbol de habilidades) -> adquiere niveles verificables.
2. **Ejecucion** (trabajo) -> contratos con Escrow (pago protegido).
3. **Capitalizacion** (Boveda) -> convierte su experiencia en activos que generan ingreso pasivo.

---

## 6. Modelo economico por fases

### Dos carriles (NUNCA fusionarlos, por temas legales)

| Carril | Que es | Uso |
|--------|--------|-----|
| Tokens | Puntos internos (NO son dinero) | Desbloquear conocimiento, destacar perfil, gamificacion |
| Dinero real | Pagos via pasarela (Stripe) | Pagar contratos |

### FASE 1 — Sin volumen (lanzamiento / comunidad)
- Tokens = puntos internos.
- El talento gana: reputacion verificable + habilidades + portafolio + primeras oportunidades.
- Transparencia: en esta fase los tokens no son plata.

### FASE 2 — Con volumen (dinero real)
- El cliente paga dinero real -> Escrow -> se libera al freelancer (menos comision).
- Requiere KYC para retirar + boletas/facturas (tributario).
- Tokens siguen siendo puntos (gamificacion/utilidad), no se convierten en cash.

### Fuentes de ingreso

1. Comision por contrato (% del dinero real).
2. Suscripcion Premium: talento (visibilidad, certificacion) + empresas (busqueda por Gemelo).
3. Boveda de Conocimiento: comision sobre consultas + parte de las Regalias Encadenadas.
4. Destacados/boosts (con tokens o dinero).

> Clave: los estudiantes (sin recursos) casi no pagan; pagan las empresas y los servicios premium.

---

## 7. Por que es innovador

- Aprendizaje conectado a oportunidad real, en tiempo real — cada progreso te acerca a un trabajo real.
- Reputacion imposible de falsear (vs CV auto-declarado / resenas compradas).
- Conocimiento que se capitaliza y paga en cadena a sus creadores (Regalias Encadenadas).
- Activos de conocimiento que se autodeprecian para mantener vigencia (H-07).
- Justicia entre pares en un entorno de confianza cero.
- Inclusion real y sin fronteras: cualquier persona, en cualquier lugar.

> Vision = bold. MVP = liviano (Aprender + Reputacion + Primeros trabajos).
> Lo avanzado (Regalias, H-07, Tribunal complejo) se construye con traccion real, no antes.

---

## 8. Arquitectura conceptual: Solo 2 conceptos

> Ultima actualizacion: **20 de agosto de 2026** (refactor de claridad conceptual).

El sistema se entiende con **solo 2 conceptos** claros. No 3, no 5. Dos.

### 🔮 ÓMICRON — Tu asistente de mejora

**Definicion**: Ómicron es la inteligencia que te observa, te entiende y te empuja
hacia tu siguiente mejora. Es activo, proactivo, y siempre sabe qué decirte.

**Responsabilidades**:
- La orbe 3D (presencia viva, navegación por nodos)
- El Oráculo (barra de voz + texto)
- El Coach (motor determinista de "siguiente mejor paso")
- Voz y TTS (te habla)
- Chips de sugerencias proactivas
- Onboarding (te conoce por primera vez)

**Módulo técnico**: `src/features/omicron/`

**Frase clave**: *"Te empuja."*

---

### 🧬 GEMELO DIGITAL — Todo lo que eres y todo lo que podrías ser

**Definicion**: El Gemelo Digital es TU representación completa en el sistema.
No solo lo que ya demostraste — también lo que podrías llegar a ser.
Es tu ADN profesional: identidad, competencias, reputación, credenciales,
red social, pasaporte, y el motor que calcula tu potencial.

**Responsabilidades**:
- Tu identidad (nombre, avatar, nivel, nodo)
- Tus 4 ejes (Ejecución, Calidad, Trascendencia, Fundamento)
- Tu reputación (20% credenciales + 80% ejes + momentum PE)
- Tus competencias y skills (análisis de CV, barras de progreso)
- Tus credenciales verificables (títulos, años, CV)
- Tu pasaporte digital (descargable, verificable)
- Tu red social (conexiones, presencia en vivo, ranking)
- Tu progreso (journey, racha, desafío diario)
- Tu memoria (patrones, personalidad inferida, metas)
- Tu ruta de crecimiento (siguiente nodo, siguiente tier)

**Módulo técnico**: `src/features/gemelo/`

**Frase clave**: *"Te mide — lo que eres y lo que podrías ser."*

---

### Relación entre ambos

```
🧬 GEMELO (pasivo, te mide)          🔮 ÓMICRON (activo, te empuja)
─────────────────────────────         ─────────────────────────────
Tu Ejecución = 52                →    "Validá este nodo para subir"
Tu Calidad = 78                  →    "Rendí el examen de React"
Tu Trascendencia = 31            →    "Compartí algo en la Bóveda"
Reputación = 61                  →    "Ya podés postular a estos trabajos"
```

El Gemelo PRODUCE datos. Ómicron los LEE y decide qué decirte.

---

### Antes vs Después (este refactor)

| Antes (confuso) | Después (claro) |
|-----------------|-----------------|
| 3 módulos: omicron + perfil + gemelo | 2 módulos: omicron + gemelo |
| "Perfil" ≠ "Gemelo" ≠ "Omicron" — ¿quién hace qué? | Ómicron = coach. Gemelo = tú. |
| Dependencia circular gemelo → omicron → gemelo | Funciones puras en `shared/utils/guidance.ts` |
| Componentes "Gemelo" vivían en carpeta "perfil" | Todo en `features/gemelo/` |
| `reputationService.ts` suelto en `src/services/` | Dentro de `features/gemelo/services/reputation.ts` |
| `useGemeloProfile.ts` suelto en `src/hooks/` | Dentro de `features/gemelo/hooks/` |

---

### Mapa de módulos post-refactor (9 módulos)

| Módulo | Concepto | Frase |
|--------|----------|-------|
| `omicron/` | 🔮 El Coach | Te observa y te empuja |
| `gemelo/` | 🧬 El Gemelo | Todo lo que eres y podrías ser |
| `academia/` | 🎓 Aprendizaje | Cursos, exámenes, skills |
| `empleos/` | 💼 Oportunidades | Trabajo te encuentra |
| `market/` | 🏪 Mercado | Compra/vende servicios |
| `wallet/` | 💰 Economía | Tokens PE, pagos, nodos |
| `chat/` | 💬 Comunicación | Mensajería segura |
| `gobernanza/` | 🏛️ Justicia | Arbitraje, disputas |
| `auth/` | 🔐 Acceso | Login, registro |

