> **Documento histórico (movido aquí el 6 de noviembre de 2026).** Describe el producto anterior a la unificación en `/u` (orbe, academia, mercado, contratos, tokens, red social o reputación de 4 ejes), que se retiró en noviembre de 2026. No describe la app actual: para eso, ver [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md) y [`docs/operacion.md`](../operacion.md).

# 🌐 SISTEMA ÓMICROM — DEFINICIÓN MAESTRA (VERSIÓN BACKEND / ARQUITECTURA)
**Versión 8.1 - Enfoque Técnico y de Sistema**
**7 de julio de 2026**

> Documento de arquitectura objetivo aportado por el usuario. Se conserva íntegro como
> referencia. **Diagnóstico de implementación completado en julio 2026** (ver anotaciones
> `[ESTADO]` en cada sección). Las 63 migraciones en `supabase/migrations/` y las 21 Edge
> Functions en `supabase/functions/` cubren la mayor parte de las capas 1–4, pero las capas
> 5 (On-Chain) y 6 (Integraciones Externas) son 100% aspiracionales aún.
>
> **Leyenda de estado:**
> - ✅ **IMPLEMENTADO** — Existe en el código y funciona en producción.
> - 🟡 **PARCIAL** — Parte de la lógica existe, pero no está completa o verificada end-to-end.
> - ⬜ **ASPIRACIONAL** — Diseñado en este documento pero NO implementado aún. Es Fase 2/3.

Este documento se centra en la **arquitectura, lógica de negocio, contratos inteligentes, integraciones y modelos de sistema**, sin entrar en detalles de interfaz de usuario ni frontend.

---

## 1. VISIÓN GENERAL DEL SISTEMA

**Sistema Ómicrom** es un ecosistema de capital intelectual y validación meritocrática que transforma la capacidad humana en valor económico real mediante un **Gemelo Digital** verificable.

### Pilares Técnicos Principales
- **Gemelo Digital** — Reputación dinámica calculada 80% por desempeño real (4 ejes) + 20% credenciales.
- **Bóveda de Conocimiento** — Marketplace con regalías encadenadas y anti-plagio.
- **Economía Interna** — Tokens (Ω) + dinero real (escrow).
- **Justicia Distribuida** — Tribunal de Pares + proceso de apelación.
- **Reputación On-Chain** — SBT + anchoring híbrido.
- **Descentralización Progresiva** — Integración con Chainlink.

---

## 2. MODELO DE DATOS Y ARQUITECTURA GENERAL

### Capas del Sistema
1. **Capa de Datos y Lógica de Negocio** (Supabase + Edge Functions) — ✅ IMPLEMENTADO
2. **Capa de Gamificación y Economía Interna** (Tokens, PE, Niveles, Streaks) — ✅ IMPLEMENTADO
3. **Capa de Bóveda y Regalías** (Publicación, consulta, linaje H-07) — 🟡 PARCIAL (Bóveda con pgvector ✅, regalías encadenadas ✅, depreciación H-07 ✅; pero sin validación end-to-end en producción)
4. **Capa de Justicia** (Disputas, Tribunal de Pares, Apelaciones, Penalizaciones) — 🟡 PARCIAL (esquema SQL + Edge Function `arbiter-ai` ✅; flujo end-to-end pendiente de verificación)
5. **Capa On-Chain** (SBT GemeloDigital + eventos + anchoring) — ⬜ ASPIRACIONAL (Fase 2.5 / Fase 3)
6. **Capa de Integraciones Externas** (Human Passport, Chainlink) — ⬜ ASPIRACIONAL (Fase 3+)

---

## 3. SISTEMA DE GAMIFICACIÓN Y TOKENS (LÓGICA) — ✅ IMPLEMENTADO

> **Estado:** Implementado en migraciones SQL (tokens, PE, niveles). Edge Functions de
> Coach/Tutor/Examen-IA otorgan PE. Depreciación de tokens inactivos en migración `0045`.
> Streaks y misiones existen en el esquema pero la mecánica de retención avanzada es básica.

### Elementos Core
- **PE (Puntos de Experiencia)**: Principal métrica de progreso.
- **Ω Tokens**: Moneda interna de utilidad y recompensa.
- **Niveles**: Estudiante → Técnico → Arquitecto → Pioneer.
- **Streaks y Misiones**: Mecanismos de retención y hábito.

### Reglas de Economía de Tokens
- Depreciación suave de Tokens no usados (5-10% mensual después de 90 días).
- Usuarios Premium obtienen bonos de Tokens.
- Tokens **nunca** se convierten directamente a dinero real.

---

## 4. BÓVEDA DE CONOCIMIENTO Y REGALÍAS ENCADENADAS — 🟡 PARCIAL

> **Estado:** Bóveda con búsqueda semántica (`pgvector`, migraciones `0024-0026`, `0028`),
> regalías encadenadas (`0044`), depreciación H-07 (`0045`), Edge Function `vault-oracle` y
> `embed` implementados. Falta: validación end-to-end del flujo completo de compra → distribución
> automática → registro en `content_lineage` con usuarios reales.

### Flujo Técnico
1. Publicación de contenido → Generación de embedding + detección de similitud.
2. Compra de contenido → Distribución automática (70% autor, 10% plataforma, resto regalías).
3. Detección de contenido derivado (similitud ≥ 85%) → Registro en `content_lineage`.
4. Cálculo de regalías encadenadas según profundidad (máx. 3 niveles).

**Fórmula de Regalías**:
```
Regalía = Ingreso × (20% × 0.75 ^ Profundidad)
```

---

## 5. SISTEMA DE JUSTICIA (DISPUTAS, APELACIONES Y PENALIZACIONES) — 🟡 PARCIAL

> **Estado:** Esquema SQL para disputas (`0021`), apelaciones (`0043`), penalizaciones/PMC
> (`0042`) implementados. Edge Function `arbiter-ai` desplegada. Ghost Approval (15 min)
> definido en esquema. Falta: verificación end-to-end del flujo completo (apertura →
> asignación de árbitros → votación → ejecución automática) en producción con usuarios reales.

### Flujo de Disputas
1. Ghost Approval (15 minutos).
2. Apertura automática de disputa.
3. Asignación aleatoria de 3 árbitros (N4+ con staking).
4. Votación (72h máximo).
5. Ejecución automática del fallo.

### Proceso de Apelación
- Ventana de 7 días.
- Panel de 3 árbitros senior (N5/N6).
- Decisión final (salvo fraude comprobado).

### Sistema de Penalizaciones
- Puntos de Mala Conducta (PMC).
- Impacto automático en reputación y Tokens.
- Mecanismo de recuperación con el tiempo.

---

## 6. REPUTACIÓN ON-CHAIN (SBT) — LÓGICA DETALLADA DEL SMART CONTRACT — ⬜ ASPIRACIONAL

> **Estado:** NADA de esto está implementado aún. Es la visión para Fase 2.5 (preparar hash
> `offchainStateHash`) y Fase 3 (desplegar el contrato SBT con tracción real). El cálculo
> de reputación off-chain SÍ existe (migración `0050` + `reputationService.ts`), pero no hay
> contrato inteligente desplegado ni integración con ninguna blockchain.
>
> **Prerequisitos para implementar:** tracción real de usuarios, auditoría de seguridad
> formal, decisión de cadena (Base/Polygon/otra), presupuesto para gas y mantenimiento.

### Contrato Principal: `GemeloDigitalSBT`

**Objetivo**:
Representar el Gemelo Digital como un **Soulbound Token no transferible** que almacena la reputación on-chain de forma verificable y portable.

**Estructura del struct `Gemelo`**:
```solidity
struct Gemelo {
    uint256 reputationScore;      // 0 - 10000 (2 decimales de precisión)
    uint256 ejeEjecucion;         // 0 - 2500
    uint256 ejeCalidad;           // 0 - 2500
    uint256 ejeTrascendencia;     // 0 - 2500
    uint256 ejeFundamento;        // 0 - 2500
    uint8 nivel;                  // 1 - 6
    uint256 lastUpdated;          // Timestamp
    bytes32 offchainStateHash;    // Hash del estado completo off-chain
}
```

### Lógica de Creación (Mint)
- Solo el owner o backend autorizado puede mintear.
- Se verifica que el usuario no tenga Gemelo previo.
- Se inicializa con valores base (reputación 40.00, cada eje en 10.00, nivel 1).
- 1 SBT por dirección (único e intransferible).

### Lógica de Actualización de Reputación
- Solo direcciones en `authorizedUpdaters` o el owner pueden llamar.
- Se actualiza todo el struct `Gemelo`.
- Se guarda el `offchainStateHash` para verificación pública.
- Se emiten eventos `ReputationUpdated` y `LevelUp` (si aplica).
- **Importante**: El cálculo completo de los 4 ejes se hace **off-chain**. El contrato solo almacena el resultado.

### Lógica de Soulbound (No Transferible)
- Override de `_beforeTokenTransfer` que bloquea **todas** las transferencias.
- `approve()` y `setApprovalForAll()` están permanentemente revertidos.
- La reputación **no se puede vender ni transferir**.

### Control de Acceso
| Función                  | Quién puede llamarla          |
|--------------------------|--------------------------------|
| `mintGemelo`             | Owner / Backend autorizado    |
| `updateReputation`       | `authorizedUpdaters` + Owner  |
| `setAuthorizedUpdater`   | Solo Owner                    |

### Eventos Principales
- `ReputationUpdated`
- `LevelUp`
- `UpdaterAuthorized`

### Integración con Chainlink (Recomendada)
- **Chainlink Automation**: Para anchoring periódico del `offchainStateHash`.
- **Chainlink Functions**: Para actualizaciones más descentralizadas y seguras (sin exponer private keys del backend).

---

**Fin de la sección de Smart Contract.**

**Lógica clave**:
- Cálculo completo de reputación **off-chain**.
- Actualización on-chain solo del resultado + hash.
- Soulbound real (no transferible).
- Control de acceso mediante `authorizedUpdaters`.

**Integración con Chainlink**:
- Chainlink Automation para anchoring periódico del hash.
- Posible uso de Chainlink Functions para actualizaciones más descentralizadas.

---

## 7. INTEGRACIÓN CON HUMAN PASSPORT — ⬜ ASPIRACIONAL

> **Estado:** No implementado. Es una mejora de Fase 3+ para verificación de humanidad
> cuando el producto tenga escala suficiente. No hay código ni configuración relacionada.

**Modelo Recomendado**:
- Verificación off-chain (API).
- Badge + Humanity Score en el Gemelo Digital.
- Aplicación selectiva (Bóveda, arbitraje, gobernanza).
- No obligatorio para onboarding básico.

---

## 8. MODELO ECONÓMICO — 🟡 PARCIAL

> **Estado:** Tokens (Ω) como gamificación ✅ implementados. Dinero real vía Stripe ✅
> implementado (Edge Functions `crear-checkout`, `stripe-webhook`, `verificar-pago`), pero
> pendiente de activación en producción (claves no configuradas aún). Comisión por contratos
> y suscripciones Premium NO implementados (decisión de negocio: todo gratis por ahora).

### Dos Carriles
- **Tokens (Ω)**: Gamificación y utilidad interna.
- **Dinero Real**: Contratos con escrow + pasarela.

### Fuentes de Ingreso
- Comisión por contratos (8-15%)
- Suscripciones Premium
- Comisión en Bóveda + Regalías
- Boosts y destacados

---

## 9. RESUMEN DE ARQUITECTURA TÉCNICA

> **Estado consolidado por capa (julio 2026):**

| Capa                    | Tecnología Principal          | Responsabilidad Principal | Estado |
|-------------------------|--------------------------------|----------------------------|--------|
| Datos y Lógica          | Supabase + Edge Functions     | Reglas de negocio         | ✅ Implementado |
| Gamificación            | Supabase + Edge Functions     | PE, Tokens, Niveles, Streaks | ✅ Implementado |
| Bóveda y Regalías       | Supabase + pgvector           | Publicación, consulta, linaje | 🟡 Parcial |
| Justicia                | Supabase + Edge Functions     | Disputas, apelaciones, penalizaciones | 🟡 Parcial |
| On-Chain                | Solidity (Base) + Chainlink   | SBT, eventos, anchoring   | ⬜ Aspiracional |
| Integraciones Externas  | APIs + Chainlink              | Human Passport, oráculos  | ⬜ Aspiracional |

---

**Documento técnico limpio y enfocado en backend/arquitectura.**

---

## 7. ESQUEMA DE BASE DE DATOS SUGERIDO (RESUMEN) — 🟡 PARCIAL (ver notas)

> **Estado:** El esquema real en `supabase/migrations/` (63 archivos) cubre la mayoría de
> estas tablas pero con nombres y estructuras ligeramente diferentes. La tabla `profiles`
> unifica lo que aquí se separa en `profiles` + `gemelos`. No existe tabla separada
> `user_gamification` — esos campos viven en `profiles`. `boveda_content` existe con pgvector.
> `content_lineage`, `contracts`, `disputes`, `penalties` existen. Los campos `onchain_*`
> NO existen aún (corresponden a la capa On-Chain aspiracional).
>
> **Nota:** Este esquema es una REFERENCIA de diseño. Para el esquema real, consultar
> directamente las migraciones en `supabase/migrations/`.

A continuación se presenta un esquema de base de datos recomendado para Supabase (PostgreSQL), diseñado para soportar todos los módulos del sistema de forma escalable y segura.

### 7.1 Tablas Principales

**`profiles`** (Extensión de `auth.users`)
- `id`, `username`, `full_name`, `avatar_url`, `bio`

**`gemelos`** (Gemelo Digital)
- `user_id`, `reputation_score`, `eje_ejecucion`, `eje_calidad`, `eje_trascendencia`, `eje_fundamento`
- `nivel`, `poder_gobernanza`
- `human_passport_verified`, `human_passport_score`
- `onchain_token_id`, `onchain_last_hash`, `onchain_last_updated`

**`user_gamification`**
- `user_id`, `total_pe`, `current_level`, `tokens_balance`, `current_streak`, `last_activity_date`

**`boveda_content`**
- `author_id`, `title`, `description`, `content_type`, `file_url`, `price_tokens`
- `embedding` (vector 384), `status`, `view_count`, `purchase_count`

**`content_lineage`** (Regalías Encadenadas)
- `parent_content_id`, `child_content_id`, `similarity_score`

**`contracts`**
- `client_id`, `provider_id`, `amount_tokens`, `status`, `ghost_approval_deadline`

**`disputes`**
- `contract_id`, `opened_by`, `status`, `arbitrator_1/2/3`, `resolution`

**`penalties`**
- `user_id`, `penalty_type`, `severity`, `pmc_points`, `reputation_impact`, `tokens_impact`

### 7.2 Índices Recomendados
- `idx_gemelos_reputation` (para ranking)
- `idx_boveda_content_embedding` (ivfflat para búsqueda semántica)
- `idx_disputes_status` (disputas activas)

### 7.3 Notas de Implementación
- Usar **pgvector** para embeddings.
- Aplicar **Row Level Security (RLS)** en Supabase.
- Las tablas de disputas, apelaciones y penalizaciones deben tener políticas de acceso estrictas.
- El campo `onchain_token_id` se actualiza al mintear el SBT.

---

**Fin del documento.**
