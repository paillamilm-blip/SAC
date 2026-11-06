> **Documento histórico (movido aquí el 6 de noviembre de 2026).** Describe el producto anterior a la unificación en `/u` (orbe, academia, mercado, contratos, tokens, red social o reputación de 4 ejes), que se retiró en noviembre de 2026. No describe la app actual: para eso, ver [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md) y [`docs/operacion.md`](../operacion.md).

# Guia de Activacion en Produccion — Sistema Omicron

> Guia clic por clic. No necesitas saber programar. Sigue el orden tal cual.
> Cada seccion termina con una casilla de verificacion para que sepas que quedo bien.
>
> Ultima actualizacion: **6 de agosto de 2026**.

---

## Mapa general

| Paso | Que activas | Obligatorio? | Donde |
|------|-------------|--------------|-------|
| 1 | Verificar codigo actualizado | Si | GitHub |
| 2 | Pagos con Stripe | Si (para vender tokens) | Stripe + Supabase + Vercel |
| 3 | Monitoreo de errores (Sentry) | Recomendado | Sentry + Vercel |
| 4 | Analitica de uso (Plausible) | Opcional | Vercel |
| 5 | Correos (SMTP) | Si (registro/recuperar clave) | Supabase |
| 6 | Pooler de conexiones | Recomendado | Supabase |
| 7 | Proteccion de contrasenas filtradas | Recomendado | Supabase |
| 8 | Verificacion final | Si | Tu app |

---

## Referencia rapida de variables

> NUNCA escribas una clave real en este archivo ni en el codigo.
> Las claves van UNICAMENTE en Vercel y Supabase.

**En Vercel (frontend) — Settings > Environment Variables:**

| Variable (nombre EXACTO) | Que pegas | Obligatoria? |
|--------------------------|-----------|--------------|
| `VITE_STRIPE_ENABLED` | `true` | Si |
| `VITE_OPENROUTER_KEY` | clave de OpenRouter (para IA del CV) | Si |
| `VITE_SENTRY_DSN` | tu DSN de Sentry | Recomendada |
| `VITE_ANALYTICS_DOMAIN` | tu dominio | Opcional |

**En Supabase > Edge Functions > Secrets (backend):**

| Secreto (nombre EXACTO) | Que pegas | Obligatorio? |
|-------------------------|-----------|--------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` o `sk_live_...` | Si |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Si |
| `PUBLIC_SITE_URL` | URL de tu app | Si |
| `GEMINI_API_KEY` | clave de Google Gemini | Reemplazada por OPENROUTER_KEY |
| `OPENROUTER_KEY` | clave de OpenRouter (gratis) | Si (para todas las funciones IA) |

**URL del webhook de Stripe (pegar en Stripe > Webhooks > Add endpoint):**
```
https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/stripe-webhook
```
Evento a escuchar: `checkout.session.completed`

---

## PASO 1 — Verificar codigo actualizado

Todos los PRs de infraestructura estan mergeados en `main`.
Confirma que Vercel muestra el deploy activo con el ultimo commit.

---

## PASO 2 — Pagos con Stripe

### 2.1 Crear tu cuenta de Stripe

1. Registrate en https://dashboard.stripe.com/register
2. Confirma tu correo.
3. Deja activado el "Modo de prueba" / "Test mode".

### 2.2 Copiar tu clave secreta

1. Ve a https://dashboard.stripe.com/test/apikeys
2. Revela la "Clave secreta" / "Secret key" (`sk_test_...`).
3. NUNCA pegues esta clave en codigo ni en el chat.

### 2.3 Crear el webhook

1. Ve a https://dashboard.stripe.com/test/webhooks
2. "Agregar endpoint" con la URL:
   ```
   https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/stripe-webhook
   ```
3. Selecciona solo el evento: `checkout.session.completed`
4. Guarda y copia el "Secreto de firma" (`whsec_...`).

### 2.4 Guardar secretos en Supabase

En https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/settings/functions
agrega uno por uno:

- `STRIPE_SECRET_KEY` = tu clave `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` = tu secreto `whsec_...`
- `PUBLIC_SITE_URL` = `https://sistema-omicrom.vercel.app`

### 2.5 Encender en Vercel

En Vercel > Settings > Environment Variables agrega:
- `VITE_STRIPE_ENABLED` = `true`

Luego: Deployments > Redeploy.

### 2.6 Probar pago (modo prueba)

1. Abre la Billetera en tu app.
2. "Recargar tokens" > elige paquete > "Ir a pagar".
3. Tarjeta de prueba: `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
4. Deberias ver "Pago recibido" y tokens sumados.

### 2.7 Pasar a dinero real

1. Apaga "Modo de prueba" en Stripe.
2. Obtiene nuevas claves `sk_live_...` y `whsec_...` (de real).
3. Actualiza en Supabase con los valores live.
4. Completa la activacion de cuenta en Stripe (datos del negocio/RUT).

> Error tipico: mezclar clave test con webhook live. Ambos deben ser del MISMO modo.

---

## PASO 3 — Monitoreo con Sentry (recomendado)

1. Crea cuenta en https://sentry.io/signup/ (plan gratis).
2. Crea proyecto tipo "React".
3. Copia el DSN.
4. En Vercel agrega: `VITE_SENTRY_DSN` = el DSN.
5. Redeploy.

---

## PASO 4 — Analitica con Plausible (opcional)

1. Crea cuenta en https://plausible.io y agrega tu sitio.
2. En Vercel: `VITE_ANALYTICS_DOMAIN` = tu dominio.
3. Redeploy.

---

## PASO 5 — Correos (SMTP) con Resend

### 5.1 Crear cuenta en Resend

1. Registrate en https://resend.com (plan gratis).
2. API Keys > Create API Key > copia (`re_...`).
3. En Domains, agrega y verifica tu dominio.

### 5.2 Configurar en Supabase

En Authentication > Emails > SMTP Settings > "Enable Custom SMTP":

| Campo | Valor |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | tu API key `re_...` |
| Sender email | `no-reply@tudominio.cl` |
| Sender name | `Omicron` |

---

## PASO 6 — Pooler de conexiones (recomendado)

En Supabase > Settings > Database confirma que "Connection pooling" esta activado (Transaction mode).

---

## PASO 7 — Proteccion contrasenas filtradas

En Supabase > Authentication > Policies activa "Leaked password protection".

---

## PASO 8 — Verificacion final

- [ ] Me puedo registrar y llega el correo de confirmacion.
- [ ] Puedo iniciar sesion y recuperar contrasena.
- [ ] Subo un CV y la app refleja mis datos reales.
- [ ] En la Billetera veo "Recargar tokens" y una compra de prueba suma tokens.
- [ ] Si provoco un error, aparece en Sentry (si lo active).

---

## Errores comunes

| Sintoma | Causa probable | Solucion |
|---------|----------------|----------|
| No aparece "Recargar tokens" | Falta `VITE_STRIPE_ENABLED=true` o no redeploy | Revisa Vercel y redesplega |
| "La compra aun no esta habilitada" | Falta `STRIPE_SECRET_KEY` en Supabase | Agregala en Edge Functions > Secrets |
| Pague pero no llegaron tokens | Webhook mal o secreto no coincide | Revisa URL del webhook y que `STRIPE_WEBHOOK_SECRET` sea del mismo modo |
| Los correos no llegan | SMTP mal configurado | Revisa Paso 5, verifica dominio en Resend |
| "Firma invalida" en webhook | Secreto incorrecto | Copia de nuevo `whsec_...` desde Stripe |

---

## Reglas de oro

1. Los nombres van EXACTOS, en MAYUSCULAS, sin espacios.
2. Stripe: clave y webhook del MISMO modo (ambos test o ambos live).
3. En Vercel, siempre Redeploy despues de tocar una variable.
4. NUNCA pegues una clave en este archivo, en el chat, ni en el codigo.
