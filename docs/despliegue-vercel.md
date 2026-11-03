# Despliegue en Vercel (repo SAC)

El frontend es una SPA de Vite. Vercel lo construye con `npm run build` y sirve `dist/`.
`vercel.json` ya trae las reglas de reescritura y las cabeceras.

## 1. Crear el proyecto en Vercel

1. Vercel → **Add New → Project** → importa `paillamilm-blip/SAC`.
2. Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
3. Variables de entorno (ver `.env.example`):

| Variable | Obligatoria | Nota |
|---|---|---|
| `VITE_SUPABASE_URL` | recomendada | Si falta, usa el proyecto Supabase por defecto del código |
| `VITE_SUPABASE_ANON_KEY` | recomendada | Clave pública (la seguridad real son las políticas RLS) |
| `VITE_BRECHA_ANALISIS` | no | Déjala **sin definir** para usar la IA real. `demostracion` fuerza la muestra fija |

No pongas claves privadas con prefijo `VITE_`: todo lo que empieza así queda visible en el navegador.

## 2. Permitir el dominio nuevo en Supabase (si no, la IA no responde)

Las funciones de Supabase solo aceptan peticiones desde dominios conocidos (`supabase/functions/_shared/cors.ts`).
Un proyecto de Vercel nuevo tiene otro dominio y el navegador bloquea el análisis con IA.

- **Supabase → Edge Functions → Secrets**: crea `ALLOWED_ORIGINS` con tu dominio, por ejemplo
  `https://sac-omi.vercel.app` (varios, separados por coma).
- **Una sola vez**, vuelve a desplegar las funciones para que lean ese secreto:
  `supabase link --project-ref cuwuyqpxaibbqjrvamjb`, luego `supabase functions deploy proxy-ai` y
  `supabase functions deploy proxy-tts` (o desde el panel).

Los despliegues de vista previa de proyectos cuyo nombre empieza por `sac` (como `sac-omi`) en el equipo `tuprofendustrial-s-projects` ya están permitidos por código. El dominio de producción `sac-omi.vercel.app` **no** lo está: necesita el secreto.

## Estado de este despliegue

- Proyecto de Vercel: `sac-omi` (equipo `tuprofendustrial-s-projects`), conectado a `paillamilm-blip/SAC`.
- Dominio de producción: `https://sac-omi.vercel.app` (el producto está en `/u`).
- Vercel ya despliega los commits de `main` (estado `Vercel: success` en `d83cfb6`).
- Pendiente en Supabase: secreto `ALLOWED_ORIGINS`, redespliegue de `proxy-ai` y `proxy-tts`, y *URL Configuration*.

## 3. Autenticación

**Supabase → Authentication → URL Configuration**: agrega el dominio nuevo en *Site URL* o en *Redirect URLs*.
Sin eso, los correos de confirmación y de recuperar contraseña llevan al dominio anterior.

## 4. Comprobar

1. Abre `https://<tu-dominio>/`: debe redirigir a `/u` (el producto).
2. Sube un PDF con texto: debe mostrar un análisis sin el banner de «modo demostración».
3. La app de siempre sigue en `/anterior`.
4. Si el análisis falla con un error de red, revisa el paso 2 (CORS).
