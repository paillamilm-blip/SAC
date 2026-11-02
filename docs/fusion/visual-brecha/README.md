# Visual de `brecha` (App B)

Capturas de las pantallas de `paillamilm-blip/brecha` @ `4a3ebfc`, en modo simulado (sin IA ni clave), con datos de muestra de su propio proveedor `fixture`.

## Pantallas

| # | Pantalla | Escritorio (1280 px) | Móvil (390 px) |
|---|---|---|---|
| 01 | Inicio, sin historial | [ver](./escritorio/01-inicio-vacio.png) | [ver](./movil/01-inicio-vacio.png) |
| 02 | Inicio, con un análisis hecho | [ver](./escritorio/02-inicio-con-historial.png) | [ver](./movil/02-inicio-con-historial.png) |
| 03 | Analizando el CV (paso 3 de 4) | [ver](./escritorio/03-analizando.png) | [ver](./movil/03-analizando.png) |
| 04 | Análisis terminado | [ver](./escritorio/04-analisis-listo.png) | [ver](./movil/04-analisis-listo.png) |
| 05 | Reporte · pestaña **Mapa** (mapa de capacidades) | [ver](./escritorio/05-reporte-mapa.png) | [ver](./movil/05-reporte-mapa.png) |
| 06 | Reporte · pestaña **Brechas** (cola de revisión, una abierta) | [ver](./escritorio/06-reporte-brechas.png) | [ver](./movil/06-reporte-brechas.png) |
| 07 | Reporte · pestaña **Diagnóstico** | [ver](./escritorio/07-reporte-diagnostico.png) | [ver](./movil/07-reporte-diagnostico.png) |
| 08 | Segundo análisis del mismo CV · **Mapa** | [ver](./escritorio/08-comparacion-mapa.png) | [ver](./movil/08-comparacion-mapa.png) |
| 09 | Segundo análisis · **Brechas** (con brechas cerradas y nuevas) | [ver](./escritorio/09-comparacion-brechas.png) | [ver](./movil/09-comparacion-brechas.png) |
| 10 | Segundo análisis · **Diagnóstico** | [ver](./escritorio/10-comparacion-diagnostico.png) | [ver](./movil/10-comparacion-diagnostico.png) |

## Cómo se generaron

No se pudo ejecutar la app real: el registro npm del entorno está bloqueado, así que no se pueden instalar Next.js ni React. En su lugar:

1. El código real de `brecha` (componentes, páginas, `lib/store.ts`, proveedor `fixture`, `comparar.ts`) se transpiló sin cambios.
2. Un renderizador mínimo, escrito aparte y no incluido en el repositorio, reemplazó solo `react` y `next/*`: ejecuta los componentes y vuelca HTML.
3. Se aplicó el `app/globals.css` real y se capturó con Chromium. Las animaciones CSS se adelantaron a su estado final.

Los datos de la pantalla (un análisis con 8 brechas, 2 confirmadas, 1 rechazada, 1 dominada) se generaron con las funciones reales `guardarAnalisis`, `marcarBrecha` y `marcarDominada`.

## Límites (qué NO representan estas capturas)

- **Son estáticas.** No se puede hacer clic, arrastrar un PDF ni cambiar de pestaña. Cada pestaña es una captura aparte.
- **Móvil del mapa:** `MapaCapacidades` cambia de disposición con `matchMedia("(max-width: 560px)")` dentro de un efecto, que el renderizador no ejecuta. Para las capturas móviles del mapa (05 y 08) se fuerza ese estado a `true`, que es lo que haría el navegador a 390 px. Es una simulación del efecto, no su ejecución.
- **Animaciones:** se ve el estado final, no el movimiento (nacimiento de nodos, escáner del CV, destellos al confirmar).
- **No se comparó contra la app corriendo.** Si algo difiere de lo que ves en `npm run dev`, vale lo que muestre la app real.

## Observación sobre el diseño (por confirmar en la app real)

En la captura móvil del mapa (05 y 08), la etiqueta **"HABILIDAD BLANDA"** aparece cortada en el borde derecho ("HABILIDAD BLAN…"). Puede ser un defecto real de `MapaCapacidades` a 390 px o un efecto de la simulación; no se puede distinguir sin ejecutar la app. Merece una revisión visual con `npm run dev` antes de adoptar este componente.
