# Operación — cómo desplegar y mantener Ómicrom hoy

Actualizado: 6 de noviembre de 2026. Proyecto de Supabase: `cuwuyqpxaibbqjrvamjb`. Sitio: https://sac-omi.vercel.app/u

> **Regla que no se rompe:** nunca uses `supabase db push` ni `supabase migration repair` en producción. Las
> migraciones `10006`, `10007` y `10008` **borran tablas** y nunca se aplicaron. `db push` las aplicaría. Las migraciones
> se pegan **a mano**, una por una, en el SQL Editor (sección 3).

---

## 1. La aplicación (frontend)

Vercel despliega solo cada vez que entra un cambio a `main`. No hay que hacer nada.

- Para ver un cambio antes de fusionarlo, cada pull request tiene su **vista previa** (el bot de Vercel deja el enlace en el PR).
- La app guarda archivos en el navegador (PWA). Si no ves un cambio, recarga con **Ctrl+Shift+R**.

## 2. Funciones del servidor (Edge Functions)

Se despliegan **a mano** desde tu computador, en la carpeta del repositorio:

```bash
supabase functions deploy <nombre>
```

Funciones en uso por la app:

| Función | Para qué | Comprobar que está la versión nueva |
|---|---|---|
| `proxy-ai` | IA: análisis del CV y asistente | `GET` a la función → `build: 6h-json-completo` |
| `proxy-tts` | Voz del asistente | — |
| `simulador-universal` | Exámenes (crear y calificar) | — |
| `credential` | Crear y verificar la credencial | — |
| `mi-cuenta` | Descargar mis datos y borrar mi cuenta | `GET` → `{"build":"mi-cuenta-1"}` |

Las otras 16 funciones de `supabase/functions/` son del producto anterior y **la app no las llama**.

### Secretos (Supabase → Edge Functions → Secrets)

| Secreto | Quién lo usa | Nota |
|---|---|---|
| `GEMINI_API_KEY` | `proxy-ai` | Clave de Google AI Studio |
| `OPENROUTER_KEY` | `proxy-ai`, `proxy-tts` | Respaldo de IA y voz |
| `CREDENTIAL_SIGNING_KEY` | `credential` | Firma de credenciales. Si falta, se usa la service role. **Si la cambias, las credenciales ya emitidas dejan de verificar** |
| `ALLOWED_ORIGINS` / `PUBLIC_SITE_URL` | CORS de todas | Deben incluir `https://sac-omi.vercel.app` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase solo.

## 3. Base de datos (migraciones)

### Cómo se aplica una migración

1. Abre el archivo en `supabase/migrations/` y copia **todo** su contenido.
2. Supabase → **SQL Editor** → pega → **Run**.
3. Revisa el final del resultado: las migraciones nuevas terminan con un mensaje `OK: …` o fallan con un error que dice qué pasó.
4. Corre la consulta de la sección `VERIFY` que trae el propio archivo.

Todas las migraciones desde `10011` son **idempotentes**: pegarlas dos veces no rompe nada.

### Estado en producción

| Migración | Estado | Nota |
|---|---|---|
| hasta `10002` | Aplicadas | |
| `10003`–`10005` | **Sin aplicar** | No hacen falta para la app actual |
| `10006`–`10008` | **Sin aplicar — NO aplicar** | Borran tablas del producto anterior. Requieren una decisión antes |
| `10010` | **Sin aplicar** | |
| `10011` | Aplicada | El examen solo lo registra el servidor |
| `10012` | Aplicada | Copia de los análisis en la cuenta (`brecha_db`) |
| `10013` | Aplicada y verificada | `profiles` sin lectura anónima |
| `10014` | Aplicada | Tablas sociales (no existen en producción: sin efecto) |
| `10015` | Aplicada y verificada | Lista blanca de columnas editables de `profiles` |
| `10016` | **Pendiente** | Borrar una cuenta no puede quedar bloqueado |

Al aplicar una migración nueva, actualiza esta tabla.

## 4. Pruebas automáticas (GitHub Actions)

| Flujo | Cuándo corre | Qué comprueba |
|---|---|---|
| `CI` | Cada PR y cada cambio en `main` | Tipos, lint, pruebas y build |
| `Recorrido visual de /u` | Cada PR que toca `src/` | El recorrido completo en un navegador real (móvil y escritorio), capturas, botones que se pueden tocar, política de seguridad y accesibilidad (axe) |
| `SQL de la cuenta (Postgres real)` | PRs que tocan las migraciones `10012`–`10015` o `supabase/tests/` | Aplica las migraciones en un Postgres 15 real y prueba la seguridad con personas simuladas |
| `Prueba en vivo de /u` | **A mano** | El recorrido contra producción, con la IA real |
| `Evaluación del análisis de CV` | **A mano** | Pasa 5 CV de profesiones distintas por la IA real y publica una tabla de calidad. Acepta `solo` (un CV) e `intentos` |

Para lanzar uno a mano: GitHub → **Actions** → elige el flujo → **Run workflow**.

## 5. Datos de prueba en producción

Hay tres cuentas de prueba con exámenes aprobados (una de ellas, `prueba.viva.20261104@example.com`). Se borran desde Supabase → Authentication → Users, o desde la propia app con «Mi perfil» → «Borrar mi cuenta», cuando `mi-cuenta` esté desplegada.

## 6. Si algo falla

| Síntoma | Dónde mirar |
|---|---|
| «Todos los modelos fallaron» o el análisis no responde | Supabase → Edge Functions → `proxy-ai` → Logs. Suele ser un modelo apagado o sin cupo |
| «No pudimos cargar tu perfil» | Conexión con Supabase; la app ofrece «Reintentar» |
| Un cambio no aparece en el sitio | Vercel → Deployments, y recargar con Ctrl+Shift+R |
| Algo funciona en la vista previa y no en producción | ¿Falta desplegar una función o aplicar una migración? (secciones 2 y 3) |
