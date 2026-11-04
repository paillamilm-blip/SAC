# Pasaporte con sellos — Plan

**Meta:** una sola pantalla (`/u/pasaporte`) que reúne las tres ideas rescatadas de la app anterior
(pasaporte descargable, perfil y «mis pruebas») con datos que existen de verdad.

## Análisis (superpowers)

| Pregunta | Respuesta |
|---|---|
| Qué se pide realmente | Una sola pieza, con versión propia, que junte: descargar el pasaporte, ver mi perfil y ver mis pruebas |
| Qué ya existe | Pruebas de examen (`brecha.prueba`), credencial v2 firmada por el servidor (`emitirCredencial`), `PerfilPanel`, paso 5 del ciclo («Compartir tu pasaporte») |
| Qué NO se hace | Editar nombre/bio/foto (exige la migración `0083_perfil_lista_blanca`, aún sin fusionar, y actualizar la política de privacidad). Carta con IA (afirmaría cosas sin citar una prueba). Reputación/PE/ejes (modelo retirado) |
| Regla dura | `PRODUCT.md`: nada se afirma más allá del dato. Sin «Verificada» por umbral: se usa «Probado», como el resto de la app |
| Qué podría romperse | Tipo `Accion` (nuevo caso), `Ruta` (nueva ruta), tests de `destinoPaso` y `UApp` |

## Alternativas consideradas

1. **Restaurar `CredencialModal` tal cual** — descartada: 831 líneas de reputación/ejes y un «Dominio alto» por umbral de 70 %.
2. **Tres pantallas separadas** — descartada: la persona pidió una sola, y el ciclo ya tiene un único paso 5.
3. **Pasaporte con sellos (elegida)** — cada examen aprobado es un sello; los sellos por ganar son tus propias brechas reconocidas sin prueba. El pasaporte es a la vez credencial, lista de pruebas y lista de tareas.

## Diseño (obra-maestra-brutal)

- **Lectura:** documento personal verificable para profesionales no técnicos, desde el teléfono; lenguaje de documento de viaje oscuro con sellos; tokens de Ómicrom (modo oscuro, color del usuario, sin webfonts). Sin marca externa de referencia.
- **Modo:** Operate (no es superficie de conversión → sin taste v2 ni «imagen primero»). Dials 5 / 3 / 4.
- **Innovación:** un sello es el nodo del mapa ya ganado — mismo color por categoría; un sello vacío es un nodo que aún falta, y se puede tocar para ir a demostrarlo.
- **Imagen descargable:** 1080×1350, hecha en el dispositivo; lleva el enlace firmado impreso (la imagen sola no prueba nada: lo que prueba es el enlace).

## Tareas

1. `services/pasaporte.ts` — `armarPasaporte(db)` puro + tests (sellos únicos por habilidad, por ganar, por reconocer).
2. `domain/colores.ts` — colores por categoría compartidos entre mapa, pasaporte e imagen.
3. `services/pasaportePng.ts` — dibujo en canvas + descarga; test con contexto falso.
4. `ui/PasaportePage.tsx` + ruta `/u/pasaporte` + caso `abrir_pasaporte` en `Accion`.
5. Conexiones: paso 5 del ciclo, botón en «Mi perfil», recorrido visual y axe.

## Verificación

CI (tipos, lint, tests, build), recorrido visual (botones no tapados, sin desborde), axe en la pantalla nueva.
No verificable aquí: la imagen PNG real (el sandbox no ejecuta navegador) — queda para la prueba manual.
