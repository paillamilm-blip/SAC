#!/usr/bin/env python3
"""Acota el CSS global de `brecha` bajo `.u-app` para que no afecte al resto de Ómicrom.

Uso: python3 scripts/acotar-css-brecha.py <globals.css de brecha> <salida.css>

- Selectores: se les antepone `.u-app` (:root/html/body pasan a ser `.u-app`).
- @keyframes: se renombran con prefijo `u-` y se actualizan las referencias en `animation`.
- @media / @supports: se procesan recursivamente.
"""
import re
import sys

ORIGEN, SALIDA = sys.argv[1], sys.argv[2]
css = open(ORIGEN, encoding="utf8").read()
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)  # comentarios

# 1) nombres de keyframes
nombres = set(re.findall(r"@keyframes\s+([\w-]+)", css))


def acotar_selector(sel: str) -> str:
    sel = sel.strip()
    if not sel:
        return sel
    if sel in (":root", "html", "body", "html, body"):
        return ".u-app"
    if sel.startswith(":root") or sel.startswith("html") or sel.startswith("body"):
        sel = re.sub(r"^(:root|html|body)", ".u-app", sel)
        return sel
    if sel == "*" or sel.startswith("*::") or sel.startswith("*:"):
        return ".u-app " + sel
    return ".u-app " + sel


def separar_selectores(texto: str):
    partes, nivel, actual = [], 0, ""
    for ch in texto:
        if ch in "([":
            nivel += 1
        elif ch in ")]":
            nivel -= 1
        if ch == "," and nivel == 0:
            partes.append(actual)
            actual = ""
        else:
            actual += ch
    partes.append(actual)
    return partes


def renombrar_animaciones(cuerpo: str) -> str:
    def cambio(m):
        valor = m.group(2)
        for n in nombres:
            valor = re.sub(rf"(?<![\w-]){re.escape(n)}(?![\w-])", f"u-{n}", valor)
        return m.group(1) + valor
    return re.sub(r"(animation(?:-name)?\s*:)([^;}]*)", cambio, cuerpo)


def procesar(texto: str) -> str:
    salida, i, n = [], 0, len(texto)
    while i < n:
        # saltar espacios
        while i < n and texto[i].isspace():
            i += 1
        if i >= n:
            break
        j = texto.find("{", i)
        if j == -1:
            break
        prelude = texto[i:j].strip()
        # encontrar el cierre balanceado
        nivel, k = 1, j + 1
        while k < n and nivel:
            if texto[k] == "{":
                nivel += 1
            elif texto[k] == "}":
                nivel -= 1
            k += 1
        cuerpo = texto[j + 1 : k - 1]
        if prelude.startswith("@keyframes"):
            nombre = prelude.split()[1]
            salida.append(f"@keyframes u-{nombre} {{{cuerpo}}}")
        elif prelude.startswith("@media") or prelude.startswith("@supports"):
            salida.append(f"{prelude} {{\n{procesar(cuerpo)}\n}}")
        elif prelude.startswith("@"):
            salida.append(f"{prelude} {{{cuerpo}}}")
        else:
            sels = ", ".join(acotar_selector(s) for s in separar_selectores(prelude))
            salida.append(f"{sels} {{{renombrar_animaciones(cuerpo)}}}")
        i = k
    return "\n".join(salida)


resultado = procesar(css)
cabecera = (
    "/* GENERADO por scripts/acotar-css-brecha.py a partir de brecha/app/globals.css.\n"
    "   No editar a mano: edita el origen o el script y vuelve a generar. */\n"
)
open(SALIDA, "w", encoding="utf8").write(cabecera + resultado + "\n")
print(f"reglas procesadas; keyframes renombrados: {len(nombres)}")
