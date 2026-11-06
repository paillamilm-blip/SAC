// ¿El texto que devolvió un modelo es JSON COMPLETO? Función pura (sin APIs de Deno) para poder probarla con Vitest.
//
// Existe porque `proxy-ai` daba por buena cualquier respuesta no vacía: un modelo que corta su salida a la mitad
// («{"ocupacion":"…","fortalezas":["…» sin una llave de cierre) contaba como éxito, no se probaba el modelo siguiente y
// el reintento del cliente caía en el mismo modelo. Medido el 2026-11-05 con `gemini-3.6-flash`: 936 caracteres, 0 llaves
// de cierre, 3 intentos seguidos iguales.
//
// Acepta: JSON puro, JSON entre cercas ```json … ```, o JSON con texto antes/después. No acepta nada cortado.
export function jsonCompleto(texto: string): boolean {
  const t = (texto ?? '').trim();
  if (!t) return false;

  const intentar = (s: string): boolean => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  };

  if (intentar(t)) return true;

  const sinCercas = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  if (sinCercas !== t && intentar(sinCercas)) return true;

  const ini = sinCercas.search(/[{[]/);
  const fin = Math.max(sinCercas.lastIndexOf('}'), sinCercas.lastIndexOf(']'));
  if (ini < 0 || fin <= ini) return false;
  return intentar(sinCercas.slice(ini, fin + 1));
}
