---
name: reglas-cursor-web
description: Reglas de buenas prácticas (formato Cursor .mdc) para el stack de la web de captación — React, Vite, TypeScript, Tailwind, shadcn/ui, Supabase, Vercel, Zod, Vitest, Playwright, Next.js, SEO y landing pages. Usar antes de escribir o revisar código de frontend para aplicar las convenciones de la tecnología correspondiente.
---
# Reglas Cursor para la web de captación

Colección curada de reglas `.mdc` de dos repos comunitarios (licencia CC0, dominio público).
Cada archivo es una guía de "cómo se hace bien" para una tecnología.

## Cómo usar esta skill

1. Identifica las tecnologías que toca la tarea (mira `package.json`, `vite.config.*`, `components.json`).
2. Lee **solo** las reglas que aplican (tabla de abajo). No cargues todas.
3. Aplica lo que diga la regla mientras escribes el código. Si una regla contradice las
   convenciones ya existentes del repo, **manda el repo** y anótalo en la respuesta.
4. Al terminar, revisa el diff contra la checklist de la regla usada.

## Reglas por tecnología — `mdc/` (sanjeed5, una por librería)

| Tecnología | Archivo |
|------------|---------|
| React | [mdc/react.mdc](./mdc/react.mdc) |
| Vite | [mdc/vite.mdc](./mdc/vite.mdc) |
| TypeScript | [mdc/typescript.mdc](./mdc/typescript.mdc) |
| Tailwind | [mdc/tailwind.mdc](./mdc/tailwind.mdc) |
| shadcn/ui | [mdc/shadcn.mdc](./mdc/shadcn.mdc) |
| Supabase | [mdc/supabase.mdc](./mdc/supabase.mdc) |
| Vercel | [mdc/vercel.mdc](./mdc/vercel.mdc) |
| Zod (validación de formularios) | [mdc/zod.mdc](./mdc/zod.mdc) |
| Zustand (estado) | [mdc/zustand.mdc](./mdc/zustand.mdc) |
| React Query (datos remotos) | [mdc/react-query.mdc](./mdc/react-query.mdc) |
| Vitest | [mdc/vitest.mdc](./mdc/vitest.mdc) |
| Playwright | [mdc/playwright.mdc](./mdc/playwright.mdc) |
| Next.js | [mdc/next-js.mdc](./mdc/next-js.mdc) |

## Reglas por stack combinado — `cursorrules/` (PatrickJS)

| Situación | Archivo |
|-----------|---------|
| Vite + TS + Tailwind (stack PWA actual) | [typescript-vite-tailwind](./cursorrules/typescript-vite-tailwind-cursorrules-prompt-file.mdc) |
| React + Vite + Node | [typescript-nodejs-react-vite](./cursorrules/typescript-nodejs-react-vite-cursorrules-prompt-fi.mdc) |
| React + TS + shadcn | [cursor-ai-react-typescript-shadcn-ui](./cursorrules/cursor-ai-react-typescript-shadcn-ui-cursorrules-p.mdc) |
| Integrar shadcn con Tailwind | [tailwind-shadcn-ui-integration](./cursorrules/tailwind-shadcn-ui-integration-cursorrules-prompt-.mdc) |
| React + Supabase | [typescript-react-nextui-supabase](./cursorrules/typescript-react-nextui-supabase-cursorrules-promp.mdc) |
| PWA + Supabase + shadcn | [nextjs-supabase-shadcn-pwa](./cursorrules/nextjs-supabase-shadcn-pwa-cursorrules-prompt-file.mdc) |
| Vercel + Supabase | [nextjs-vercel-supabase](./cursorrules/nextjs-vercel-supabase-cursorrules-prompt-file.mdc) |
| Deploy en Vercel | [vercel-deployment](./cursorrules/vercel-deployment.mdc) · [vercel-deployment (prompt)](./cursorrules/vercel-deployment-cursorrules-prompt-file.mdc) |
| Landing page: calidad de imágenes | [landing-page-image-quality](./cursorrules/landing-page-image-quality-cursorrules-prompt-file.mdc) |
| SEO | [nextjs-seo-dev](./cursorrules/nextjs-seo-dev-cursorrules-prompt-file.mdc) · [nextjs-14-tailwind-seo-setup](./cursorrules/cursorrules-cursor-ai-nextjs-14-tailwind-seo-setup.mdc) |
| Accesibilidad con Playwright | [playwright-accessibility-testing](./cursorrules/playwright-accessibility-testing-cursorrules-prompt-file.mdc) |
| Calidad de código JS/TS | [javascript-typescript-code-quality](./cursorrules/javascript-typescript-code-quality-cursorrules-pro.mdc) |
| Crear componentes React | [react-components-creation](./cursorrules/react-components-creation-cursorrules-prompt-file.mdc) |

> Las reglas de Next.js sirven como referencia de SEO/estructura aunque el proyecto sea Vite:
> toma los principios, no las APIs propias de Next.

## ¿Falta una tecnología?

Los repos originales tienen 240+ y 250+ reglas. Busca la que necesites y cópiala aquí:

- https://github.com/sanjeed5/awesome-cursor-rules-mdc/tree/main/rules-mdc
- https://github.com/PatrickJS/awesome-cursorrules/tree/main/rules

---
> 📦 **Si un archivo que cita esta skill no está en la carpeta**, búscalo en [ARCHIVOS-EXTRA.md](./ARCHIVOS-EXTRA.md): la documentación viene incluida ahí completa y los datos/código tienen su enlace directo para descargarlos.
