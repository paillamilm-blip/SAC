> **Documento histórico (movido aquí el 6 de noviembre de 2026).** Describe el producto anterior a la unificación en `/u` (orbe, academia, mercado, contratos, tokens, red social o reputación de 4 ejes), que se retiró en noviembre de 2026. No describe la app actual: para eso, ver [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md) y [`docs/operacion.md`](../operacion.md).

# Plan de Produccion y Roadmap — Sistema Omicron

> Documento unico de planificacion. Incluye roadmap estrategico, estado operativo,
> tareas pendientes y KPIs. Ultima actualizacion: **6 de agosto de 2026**.

---

## Posicionamiento del producto

Omicron es una herramienta de aprendizaje continuo en tiempo real, para todo el mundo,
sin restriccion geografica, que conecta capacidad demostrada con oportunidades reales
del mercado de forma instantanea (Industria 5.0).

- No es un proyecto pensado para CORFO ni inversionistas locales.
- No tiene modelo free/premium. Todas las funciones son gratis para siempre, incluida la IA.
- Idioma actual: espanol. Alcance: global.
- Diferenciador central: reputacion imposible de falsificar (evidencia real, validada entre pares).

Ver `DEFINICION_OMICROM.md` para la vision completa.

---

## Donde estamos hoy (agosto 2026)

```
[####################] ~75% del producto core implementado
```

**Lo que YA funciona:**
- Plataforma desplegada en Vercel (PWA instalable)
- 9 hubs de navegacion activos (orbe neuronal 3D)
- 7 funciones de IA gratuitas (Coach, Tutor, Examinador, Carta, Redactor, Relator, Oraculo)
- Sistema de reputacion canonico (4 ejes + momentum) con calculo server-side
- Red en tiempo real (Presence + Broadcast + rankings en vivo)
- 63 migraciones SQL + 21 Edge Functions
- Orbe neuronal 3D con nodos dinamicos desde el CV del usuario
- Convalidacion de CV con IA (OpenRouter/Gemini) + auto-cadena de credenciales
- Vista PerfilSkillVisual (sistema orbital top 3 skills)
- Skills con nivel real (pct del analisis IA) + sinergia entre nodos
- Onboarding de bienvenida con opciones claras
- Flujo conversacional robusto (contexto IA + estado protegido)

**Lo que FALTA para produccion real:**
- Activar Stripe (pagos reales)
- Verificar Tribunal de Pares end-to-end
- Confirmar UX en celular real

---

## Milestones principales

| Milestone | Cuando | Que marca |
|-----------|--------|-----------|
| **M1 — Produccion estable** | Agosto 2026 | Stripe activo, UX movil cerrada, Tribunal verificado |
| **M2 — Primeros usuarios reales** | Septiembre 2026 | 50+ usuarios con Gemelo activo, primeros contratos |
| **M3 — Auto-postulacion** | Octubre 2026 | "El trabajo te busca" funciona end-to-end (Agentic AI) |
| **M4 — Credencial verificable** | Noviembre 2026 | Pasaporte Gemelo como W3C Verifiable Credential |
| **M5 — Escala** | Q1 2027 | Auditoria de seguridad, accesibilidad, lazy-load |
| **M6 — On-chain** | Q2 2027 | SBT desplegado en testnet/mainnet con traccion real |

---

## FASE 0 — Cimientos (COMPLETADA)

| # | Tarea | Estado |
|---|-------|--------|
| 0.1 | CI en verde (lint + actions v5) | Hecho — PR #90 |
| 0.2 | Tests unitarios de libs puras | Hecho — PR #94 (82 tests) |
| 0.3 | Splitear AppContext en Profile + Navigation | Hecho — PR #95 |
| 0.4 | Unificar design system | Hecho — PR #109 |

---

## FASE 1 — Activar lo construido (EN CURSO)

| # | Tarea | Estado |
|---|-------|--------|
| 1.1 | Activar hubs ocultos | Hecho — PR #91 |
| 1.2 | Activar Stripe en produccion | Pendiente (ver `GUIA_ACTIVACION_PRODUCCION.md`) |
| 1.3 | Reposicionar mensaje in-app | Hecho — PR #91 |
| 1.4 | Verificar Tribunal de Pares end-to-end | Pendiente |
| 1.5 | Eliminar candados Premium | Hecho — PR #96 |

---

## FASE DE EMERGENCIA — Front-end (COMPLETADA)

| # | Tarea | Estado |
|---|-------|--------|
| E.1 | Diagnostico visual | Hecho |
| E.2 | Unificar orbe (ParticleOrb unico) | Hecho — PR #97 |
| E.3 | Nodos arrastrables con persistencia | Hecho — PR #97 |
| E.4 | Fix: arrastrar no navega | Hecho — PR #98 |
| E.5 | Pantallas planas mejoradas | Hecho — PR #98 |
| E.6 | Confirmar UX celular real | Pendiente (feedback usuario) |
| E.7 | Relevar UX restante | Pendiente |
| E.8 | Eliminar gsap huerfana | Hecho — PR #110 |

---

## FASE CONVERSACIONAL — Orbe inteligente (COMPLETADA)

| # | Tarea | Estado |
|---|-------|--------|
| C.1 | Orbe neuronal 3D (Three.js) con nodos interactivos | Hecho — PRs #141-151 |
| C.2 | Oraculo procesa todos los intents | Hecho — PR #145 |
| C.3 | Notificaciones al orbe | Hecho — PR #142 |
| C.4 | Proactive Engine conectado | Hecho — PR #146 |
| C.5 | Coach/Tutor con contexto completo del Gemelo | Hecho — PR #154 |
| C.6 | Estado conversacional robusto (safety timeout) | Hecho — PR #154 |
| C.7 | Nodos generados desde el CV (orbe unico por persona) | Hecho — PR #150 |
| C.8 | Skills con nivel real (pct IA) + sinergia entre nodos | Hecho — PR #155 |
| C.9 | Vista PerfilSkillVisual (top 3 skills orbital) | Hecho — PR #155 |
| C.10 | Onboarding de bienvenida | Hecho — PR #151 |

---

## FASE 2 — Innovaciones de mercado (PENDIENTE)

> Timeline: Q3-Q4 2026. Prerequisito: Stripe activo + UX celular confirmada.

| # | Tarea | Innovacion | Prioridad |
|---|-------|------------|-----------|
| 2.1 | Auto-postulacion (Omicron postula por ti) | Agentic AI | Alta |
| 2.2 | Pasaporte Gemelo como W3C Verifiable Credential | Open Badges 3.0 | Media |
| 2.3 | Matching server-side en tiempo real | Real-time labor market | Alta |
| 2.4 | Evaluacion de codigo en vivo (examen de nivel) | AI-verified skills | Media |
| 2.5 | Preparar offchainStateHash | On-chain (preparacion) | Baja |

---

## FASE 3 — Escala y pulido (PENDIENTE)

> Timeline: Q1-Q2 2027. Solo cuando Fase 2 tenga traccion real.

| # | Tarea | Prioridad |
|---|-------|-----------|
| 3.1 | Lazy-load de engines pesados | Media |
| 3.2 | Accesibilidad completa (WCAG 2.1 AA) | Alta |
| 3.3 | Auditoria de seguridad formal | Alta |
| 3.4 | Desplegar GemeloDigitalSBT on-chain | Media |
| 3.5 | Multi-idioma | Baja |
| 3.6 | Revision legal global | Media |

---

## Mapa de dependencias

```
M1 (Produccion)
 |
 +-->  M2 (Usuarios reales)
 |      |
 |      +--> M3 (Auto-postulacion) --> M5 (Escala)
 |      |                                  |
 |      +--> M4 (Credencial W3C)           +--> M6 (On-chain)
 |
 +--> Stripe activo (prerequisito para M2)
```

---

## Metricas de exito por milestone

| Milestone | KPI | Target |
|-----------|-----|--------|
| M1 | Smoke test pasa sin errores | 100% flujos criticos OK |
| M2 | Usuarios con Gemelo activo | >= 50 |
| M2 | Primer contrato con escrow completado | >= 1 |
| M3 | Auto-postulaciones generadas | >= 10/semana |
| M4 | Credenciales W3C emitidas | >= 20 |
| M5 | Lighthouse Performance score | >= 90 |
| M5 | Vulnerabilidades criticas post-auditoria | 0 |
| M6 | SBTs minteados en mainnet | >= 100 |

---

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| UX movil no se resuelve | Bloquea M1 | Pedir capturas concretas, priorizar 3 flows criticos |
| Stripe no se activa | Bloquea M2 | Guia paso a paso ya existe |
| No llegan usuarios a la beta | Retrasa M2 | Onboarding guiado, seed con comunidad existente |
| Auditoria de seguridad encuentra vuln graves | Retrasa M5/M6 | Las 63 migraciones ya tienen RLS + triggers SECURITY DEFINER |
| Gas costs on-chain demasiado altos | Retrasa M6 | Elegir L2 (Base/Polygon) con fees < $0.01 |

---

## Pendientes inmediatos (bloqueantes)

| # | Pendiente | Bloqueado por |
|---|-----------|---------------|
| 1 | Confirmar UX en celular real (E.6) | Feedback del usuario |
| 2 | Activar Stripe en produccion (1.2) | Configuracion de claves |
| 3 | Verificar Tribunal de Pares end-to-end (1.4) | Test manual en produccion |

---

## Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| `DEFINICION_OMICROM.md` | Vision, pilares, modelo economico |
| `DEFINICION_OMICROM_v8_BACKEND.md` | Arquitectura tecnica backend |
| `DEFINICION_REPUTACION_OMICROM.md` | Formula canonica del Gemelo Digital |
| `GUIA_ACTIVACION_PRODUCCION.md` | Pasos para activar produccion + claves |
| `CHANGELOG.md` | Historial de cambios |

---

_Este plan se revisa mensualmente o cuando cambia una decision de negocio importante._
