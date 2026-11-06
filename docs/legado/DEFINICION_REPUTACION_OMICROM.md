> **Documento histórico (movido aquí el 6 de noviembre de 2026).** Describe el producto anterior a la unificación en `/u` (orbe, academia, mercado, contratos, tokens, red social o reputación de 4 ejes), que se retiró en noviembre de 2026. No describe la app actual: para eso, ver [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md) y [`docs/operacion.md`](../operacion.md).

# 🧬 Definición Canónica de la Reputación — Sistema Ómicron

> **Fuente única de verdad del Gemelo Digital.**
> Este documento define *un solo* modelo de reputación para **todo** el ecosistema
> (aprender, vender, comprar, mentorías, freelance, contratos por empresa).
> Si algún documento, migración o componente lo contradice, **este documento manda**.
>
> _Versión 1.0 — 9 de julio de 2026._

---

## 0. El problema que resuelve (por qué existe este documento)

Hasta ahora coexistían **dos definiciones de "experiencia" que se contradecían**:

1. **Manifiesto (`DEFINICION_OMICROM.md`)**: reputación = `20% credenciales + 80% (promedio de los 4 ejes)`.
2. **Código antiguo**: `experience_score` era un **acumulador de PE** independiente, y la
   reputación se calculaba como `20% tradicional + 80% experience_score`.

Resultado: el **radar de 4 ejes** que veía el usuario **no era** lo que movía su reputación.
El frontend (`calculateMatchScore`) y el backend calculaban números distintos.

**Decisión canónica (esta versión):**

> La reputación se mide **en tiempo real con TODO sobre la mesa**: es la suma de
> **lo que TIENES** (base demostrada 20/80 sobre los 4 ejes) **más lo que PUEDES conseguir**
> (un bono de *momentum* por tus Puntos de Experiencia acumulados).
>
> - `experience_score` **deja de ser un acumulador** y pasa a ser una **columna derivada**:
>   es **exactamente el promedio de los 4 ejes**. Así el radar de 4 ejes **sí** determina la base.
> - Los **PE (Puntos de Experiencia)** **SÍ suman** a la reputación, como un bono acotado
>   que representa tu potencial y tu ritmo de aprendizaje.

---

## 1. Fórmula maestra

```
experience_score = promedio( Ejecución, Calidad, Trascendencia, Fundamento )        # 0–100

base      = 0.20 · traditional_score  +  0.80 · experience_score        # lo que TIENES
momentum  = min(15, sqrt(pe_points) / 4)                                # lo que PUEDES conseguir
reputation_score = min(100, base + momentum)                            # 0–100  (tiempo real)
```

- Todos los valores viven en escala **0–100**.
- Se calculan **en el servidor** (trigger `recalc_reputation` sobre `public.profiles`), que
  se dispara ante **cualquier** cambio de las variables → reputación **siempre en tiempo real**.
- El cliente **nunca** escribe estos campos (los revierte el trigger `protect_profile_columns`).
- `traditional_score` = credenciales verificadas (20%). `experience_score` = desempeño real (80%).

**Ponderación 20/80** = un título ayuda, pero **el 80% se gana demostrando**. Rompe el círculo
"sin experiencia no me contratan".

**El bono de momentum** (máx **+15**, con rendimientos decrecientes vía raíz cuadrada) hace que
el aprendizaje y el esfuerzo **cuenten desde el día uno**, pero **sin permitir inflar** la
reputación sin límite ni "comprarla": satura cerca del nivel máximo (~3.500 PE ≈ +15).

---

## 2. Los cuatro ejes del Gemelo Digital

Cada eje es 0–100 y se recalcula **automáticamente** por triggers cuando ocurre una acción real.
Ningún eje se auto-declara; todos derivan de evidencia en la base de datos.

| Eje | Qué mide | Se alimenta de | Regla actual |
|-----|----------|----------------|--------------|
| 🛠️ **Ejecución** (`execution_score`) | Que entregas y cierras trabajo | Contratos `RELEASED` como vendedor | `min(100, nº_contratos × 12)` (~9 contratos = 100) |
| ⭐ **Calidad** (`quality_score`) | Qué tan bien lo haces | Calificaciones 1–5 del comprador | `promedio(estrellas)/5 × 100`; sin datos = 50 (neutral) |
| 🌱 **Trascendencia** (`transcendence_score`) | Cuánto aportas al ecosistema | Servicios en Market + docs validados en Bóveda + mentorías | `min(100, servicios×8 + docs×12 + mentorías×6)` |
| 📚 **Fundamento** (`foundation_score`) | Tu base de conocimiento | Nodos del árbol de habilidades `VALIDATED`/`MASTERED` | `% ponderado por dificultad de nodos completados` |

> **Neutral de arranque:** un usuario nuevo parte con ejes en torno a un valor base (Calidad = 50
> por defecto) para no castigar la falta de historial. La reputación inicial de referencia es **40**.

---

## 3. Rol de los PE (Puntos de Experiencia) y los Niveles

- **PE** = métrica de **progreso**. Se acumulan al estudiar, aprobar exámenes, cerrar operaciones
  de mercado, etc. Viven en `pe_points`.
- Los PE cumplen **dos funciones**:
  1. **Suben de nivel** al usuario (`node_level`).
  2. **Suman a la reputación** como bono de **momentum** (`min(15, sqrt(pe_points)/4)`),
     representando tu potencial ("lo que puedes conseguir").
- Además, la formación impacta la reputación **también** por el eje Fundamento (estudiar → validar
  nodos → sube Fundamento → sube experiencia → sube base). Doble incentivo al aprendizaje, pero
  el momentum está **acotado (+15)** para que nunca reemplace al desempeño demostrado.

### Niveles del nodo (evolución del usuario)

| Nivel | Nombre | Umbral (reputación) | Qué desbloquea |
|-------|--------|---------------------|----------------|
| N1 | 🌱 Estudiante | 0–49 | Aprender, primeros retos, micro-trabajos |
| N2 | 🔧 Técnico | 50–79 | Vender servicios, tomar contratos, calificar |
| N3 | 🏛️ Arquitecto | 80–100 | Mentorías, arbitraje (Tribunal de Pares), Bóveda avanzada |
| N4+ | 🚀 Pioneer | (fase 2, gobernanza/staking) | Apelaciones senior, poder de gobernanza |

> Umbrales de reputación: `determineNodeLevel()` en `features/gemelo/services/reputation.ts`.
> Umbrales de PE para progreso de nivel: `calculatePEThreshold()` (N1→N2 = 1000 PE, N2→N3 = 2500 PE).

---

## 4. Cómo cada acción del ecosistema mueve la reputación

Este es el mapa que hace que **"todo se conecte con todo"**. El usuario siente que el sistema
lo posiciona en tiempo real porque **cada acción real recae en un eje**.

| Rol / Acción | Eje impactado | Efecto |
|--------------|---------------|--------|
| 🎓 **Estudiar / validar nodos** (Academia, árbol) | Fundamento ↑ | Sube base → sube reputación |
| 🧪 **Aprobar examen IA / test de skill** | PE ↑ (nivel) + Fundamento ↑ (al validar nodo) | Progreso + reputación indirecta |
| 💼 **Completar contrato freelance (vendedor)** | Ejecución ↑ | Demuestra que entregas |
| ⭐ **Recibir calificación del comprador** | Calidad ↑/↓ | Refleja satisfacción real |
| 🏢 **Contrato con empresa (RELEASED)** | Ejecución ↑ (+ Calidad si califican) | Igual que freelance, mayor peso por volumen |
| 🛒 **Comprar** en Market/Bóveda | — (sin PE de reputación) | No otorga momentum: evita "comprar" reputación |
| 🏪 **Publicar servicio en Market** | Trascendencia ↑ | Aportas oferta al ecosistema |
| 📖 **Publicar doc validado en Bóveda** | Trascendencia ↑ | Capitalizas conocimiento |
| 🧑‍🏫 **Completar mentoría** | Trascendencia ↑ | Elevar a otros cuenta |
| 🎖️ **Convalidar credencial** (título/portafolio) | Tradicional ↑ (tope 60/70 vía RPC) | 20% de la reputación |
| ⚠️ **Penalización (PMC)** | Reputación ↓ + tokens ↓ | Mala conducta, disputas perdidas |

> **Anti-inflación:** comprar, auto-declararse o escribir el score desde el cliente **no** sube
> la reputación. Solo la evidencia validada por el servidor cuenta (triggers `SECURITY DEFINER`).

---

## 5. Los dos carriles económicos (no confundir con reputación)

La reputación **no es dinero**. Son planos separados:

| Plano | Métrica | Para qué |
|-------|---------|----------|
| 🧬 **Reputación** | `reputation_score` (0–100) | Confianza, ranking, matching de trabajos, acceso a niveles |
| 🪙 **Tokens (Ω)** | `token_balance` | Gamificación, desbloquear conocimiento, destacar perfil (NO son plata) |
| 💵 **Dinero real** | Escrow + pasarela | Pagar contratos (fase 2, con KYC) |

---

## 6. Decaimiento y penalizaciones (mantener la reputación "viva")

- **Calidad y Ejecución** reflejan siempre el historial acumulado (no caducan solos hoy;
  el decaimiento por inactividad es una mejora de Fase 2).
- **Tokens** sí tienen depreciación suave (5–10% mensual tras 90 días sin uso — `0045`).
- **Penalizaciones (PMC, `0042`)**: mala conducta o disputas perdidas restan reputación y tokens,
  con mecanismo de recuperación en el tiempo.
- **Auditoría automática**: una caída de reputación ≥ 15 puntos dispara revisión
  (`shouldTriggerAudit()`).

---

## 7. Matching de trabajos ("el trabajo te busca")

El puntaje que decide qué oportunidades se te ofrecen usa la **misma** reputación:

```
matchScore = clamp( 0.20·traditional_score + 0.80·experience_score + momentum(pe_points) )
           == reputation_score
```

Como `experience_score = promedio de los 4 ejes` y el momentum es el mismo bono por PE,
**el match score y la reputación son el mismo número**. Ya no hay dos verdades.
(`calculateMatchScore()` / `calculateTotalReputation()` en `features/gemelo/services/reputation.ts`.)

---

## 8. Dónde vive cada cosa (implementación)

| Concepto | Ubicación |
|----------|-----------|
| Fórmula maestra + trigger | `supabase/migrations/0050_reputacion_canonica.sql` |
| Eje Fundamento | `0015_foundation_from_skills.sql` |
| Eje Ejecución | `0016_execution_from_contracts.sql` |
| Eje Calidad | `0017_quality_from_ratings.sql` |
| Eje Trascendencia | `0018_transcendence.sql` |
| Blindaje anti-escritura del cliente | `0007_protect_profile.sql` / `9999_audit_consolidado.sql` |
| Convalidación de credenciales (RPC) | `0048_convalidar_credencial.sql` |
| Cálculos de cliente (deben reflejar, no calcular) | `src/features/gemelo/services/reputation.ts` |
| Tipo `Profile` | `src/types/index.ts` |

---

## 9. Reglas de oro (para no volver a romperlo)

1. **La reputación se calcula SOLO en el servidor.** El cliente lee, no escribe.
2. **`experience_score` es derivado** = promedio de los 4 ejes. Nunca se acumula a mano.
3. **Los PE suman a la reputación como momentum acotado (+15)** y además suben de nivel.
   El momentum nunca reemplaza al desempeño demostrado.
4. **Todo eje deriva de evidencia real** (contratos, calificaciones, nodos, publicaciones).
5. **20/80 es sagrado**: credenciales pesan 20%, desempeño demostrado 80%.
6. Si agregas una fuente nueva (p. ej. certificación externa), **decide a qué eje pertenece**
   y créale su trigger; no inventes un score paralelo.
