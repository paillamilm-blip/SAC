# Changelog — Ómicrom

Todos los cambios notables del proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Entre agosto y octubre de 2026 no se registraron cambios aquí; el historial de esos meses está en git.

---

## [2026-11-03 → 2026-11-06] — Producto único en `/u`

La app anterior (orbe, academia, mercado, red social, billetera) se retiró y todo el producto quedó en `/u`.
Números entre paréntesis: pull requests.

### Agregado
- Ciclo de cinco pasos: escanear el CV → mapa de brechas → revisar → examen → pasaporte (#13, #15, #30).
- Examen dentro de `/u`, calificado por el servidor; «dominada» solo con un examen aprobado (#11, #13).
- Credencial verificable con las habilidades aprobadas; vence a los 12 meses (#15).
- Pasaporte con sellos, descargable como imagen y con enlace firmado (#30).
- Mapa como red de nodos: peso de cada conexión según la evidencia, detalle al tocar, línea de calidad (#26, #27).
- Asistente conectado al mapa y a los exámenes («¿qué he demostrado?») (#16, #28).
- «Mi perfil»: CV leído, cuánto te falta, el mapa en números, color (#30).
- «Tus datos»: descargar todo lo que se guarda de ti y borrar la cuenta (#43).
- CV en Word (.docx), además de PDF (#42).
- Copia de los análisis en la cuenta (`brecha_db`), con seguridad por fila (#22).
- Medición de la calidad del análisis y banco de evaluación con 5 profesiones (#24).
- Política de seguridad de contenido (CSP) en modo solo-reporte (#17) y auditoría de accesibilidad con axe en cada PR (#18).

### Cambiado
- IA: Google Gemini 3.x primero y en escalera, OpenRouter de respaldo (#5, #6). Una respuesta JSON cortada ya no cuenta como éxito (#40).
- La red caída ya no se muestra como «sin acceso», y el login ya no dice «contraseña incorrecta» cuando falla otra cosa (#41).
- Dominio de producción: `sac-omi.vercel.app` (#4).

### Seguridad
- `10011`: el examen solo lo registra el servidor (#11).
- `10013`: `profiles` ya no se lee sin sesión (#35).
- `10014`: tablas sociales sin lectura anónima (#36).
- `10015`: lista blanca de columnas editables de `profiles` (#37).
- `10016`: borrar una cuenta no queda bloqueado por datos de otra persona (#43).

### Eliminado
- El código de la app anterior: 70 archivos (#10) y 34 más (#20).

### Corregido
- La página se recargaba sola en la primera visita (#19).
- La verificación pública de credenciales estaba bloqueada por CORS (#12).
- El asistente tapaba botones (#29).
- Un fallo de red al cargar el lector de CV dejaba el escáner atascado (#42).

---

## [2026-08-06] — Unificacion de documentacion + fixes conversacionales

### Agregado
- `PerfilSkillVisual.tsx` — Nueva vista de perfil orbital (top 3 skills como sistema solar).
- Sinergia entre nodos: 6 grupos detectados automaticamente (+8% bonus visual).
- CV integrado fluyendo en la tarjeta (barras de dominio + resumen IA).

### Cambiado
- `buildSkillNodes` usa `skills_detail[].pct` REAL del analisis IA (no mas 70% fijo).
- `handleQuery` en OmicronAssistant: askCoach/askTutor reciben contexto completo del Gemelo.
- Safety timeout de 15s para estado 'thinking' (nunca queda colgado).
- Saludo inicial espera a que profile este cargado (fix race condition).
- Documentacion unificada: de 12 archivos a 8 (sin redundancia).

### Eliminado
- `VISION_OMICROM.md` — fusionado en `DEFINICION_OMICROM.md`.
- `ROADMAP.md` — fusionado en `PLAN_PRODUCCION.md`.
- `PANEL_DE_CONTROL.md` — fusionado en `GUIA_ACTIVACION_PRODUCCION.md`.
- 158 ramas remotas obsoletas eliminadas (repo limpio: solo `main`).
- 3 PRs abiertos obsoletos cerrados (#147, #152, #153).

### PRs
- #154 — fix: flujo conversacional del orbe (contexto IA + estado robusto)
- #155 — feat: CV a nodos con sinergia real + vista perfil orbital

---

## [2026-08-05] — Onboarding + nodos desde CV

### Agregado
- PR #151 — Onboarding de bienvenida con opciones claras + voz natural.
- PR #150 — Nodos del orbe generados DESDE el CV (cada persona tiene orbe unico).

---

## [2026-08-04] — Fase conversacional completa (PRs #141-149)

### Agregado
- PR #149 — Convalidacion por voz (await + refreshProfile + notifica orbe).
- PR #148 — Tabs conectadas al Gemelo via GemeloGuidance.
- PR #146 — ProactiveEngine conectado al orbe (te empuja sin pedirlo).
- PR #145 — OrbShell procesa TODOS los intents del Oraculo.
- PR #144 — askCoach/askTutor con contexto completo del Gemelo.
- PR #143 — omicronCoach conectado al orbe (nextStep dinamico con datos reales).
- PR #142 — unreadCount al orbe (nodo mensajes pulsa ambar con notifs).
- PR #141 — GUARDIAN audit: 7 fixes (performance, a11y, UX, dead code).

---

## [2026-07-30] — Consolidacion de documentacion

### Agregado
- `ROADMAP.md` — Roadmap con 6 milestones (ahora fusionado en PLAN_PRODUCCION).
- `CHANGELOG.md` — Este archivo.

### Actualizado
- `PLAN_PRODUCCION.md`, `GUIA_ACTIVACION_PRODUCCION.md`, `README.md`.

---

## [2026-07-27] — Emergencia UX front-end (PRs #97, #98)

### Corregido
- Orbe unificado (PR #97): 5 sistemas distintos a 1 unico ParticleOrb.
- Nodos arrastrables (PR #97): libres, reposicionables, con persistencia.
- Bug: arrastrar = navegar (PR #98): se distingue drag vs tap.
- Pantallas planas mejoradas (PR #98): blur, gradiente, glow.

---

## [2026-07-26] — Remocion candados Premium (PR #96)

### Corregido
- PR #96 re-aplico la remocion de todos los candados Premium (PR #92 nunca llego a main).

---

## [2026-07-25] — Refactorizacion contexto (PR #95)

### Cambiado
- AppContext split en ProfileContext + NavigationContext. useApp() sigue como facade.

---

## [2026-07-24] — Tests unitarios (PR #94)

### Agregado
- 82 tests nuevos: reputationService, cvAnalyzer, jobMatcher, omicronCoach, oraculo.

---

## [2026-07-23] — Activacion funcionalidades (PRs #91, #92)

### Agregado
- Hubs ocultos activados (PR #91).
- IA gratis para siempre (PR #92): eliminados todos los candados Premium.

---

## [2026-07-22] — CI en verde (PR #90)

### Corregido
- Fix de lint para .cjs + GitHub Actions v5. Pipeline verde.

---

## Pre-julio 2026 — Fundamentos

### Implementado (acumulado)
- 63 migraciones SQL (perfiles, reputacion, skill tree, market, wallet, empleos, chat, boveda, gobernanza, stripe, security).
- 21 Edge Functions (coach, tutor, examen-ia, arbiter-ai, vault-oracle, market-match, carta-ia, chat-assist, stripe-webhook, crear-checkout, y mas).
- Frontend completo: React 18 + TypeScript + Vite 5.
- PWA instalable con deploy automatico en Vercel.
- Sistema de reputacion canonico (4 ejes + momentum).
- Red en tiempo real con Supabase Realtime.
- Documentos legales: TERMINOS_SERVICIO.md, POLITICA_PRIVACIDAD.md.
