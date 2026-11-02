// src/features/omicron/utils/perfilDeclaracion.ts
// ═══════════════════════════════════════════════════════════════════════
// LA DECLARACIÓN DEL ONBOARDING — del "¿a qué te dedicas?" sale un perfil, y
// este módulo es el único que lo arma.
//
// La vara: acá sólo entran PALABRAS QUE EL USUARIO DIJO. Antes este perfil se
// completaba con aritmética (ejes = 30 + años·5, años por defecto 3, una terna
// de habilidades inventada si no nombraba nada), y el resultado se guardaba en
// la base y se transmitía como si fuera su Gemelo. Un Gemelo hecho de humo.
//
// Los números reales —ejes, porcentaje por habilidad— los produce el análisis
// del CV (`analizar-cv` → `aplicar_analisis_cv`). El onboarding declara; el
// motor mide. Con los ejes en 0 el mapa y la credencial muestran el estado
// vacío, que es la verdad hasta que llega el CV.
//
// Módulo puro, sin React ni audio: por eso se puede probar sin armar el árbol
// del onboarding (el componente tira de ColorPicker → spatialAudio → matchMedia).
// ═══════════════════════════════════════════════════════════════════════

export interface GeneratedProfile {
  profession: string;
  years: number;
  skills: string[];
  axes: { exec: number; qual: number; trans: number; fund: number };
  seniorLabel: string;
  summary: string;
}

/** El orbe acaba de nacer con su declaración. No afirma ninguna pericia. */
export const MENSAJE_NACIMIENTO = 'Tu Gemelo Digital nació con lo que me contaste. Súbele el CV y lo completo con datos reales.';

const LARGO_PROFESION = 50;

// "Soy / trabajo como / me dedico a" es relleno: lo que importa es el oficio.
const PREFIJO_DECLARACION = /^(?:soy|trabajo como|me dedico a|estudio)\s+(?:un|una|el|la|los|las)\s+|^(?:soy|trabajo como|me dedico a|estudio)\s+/i;

// La antigüedad viaja en su propio campo (`years`); dentro del nombre sobra. Se
// corta "con 12 años de experiencia…" hasta el siguiente punto o coma, y si con
// eso el nombre desaparece ("Con 8 años en ventas") se deja la frase completa.
const COLA_DE_AIOS = /\s*\bcon\s+\d+\s*a[ñn]os?\b[^.;,]*/i;

// Los cuatro ejes se piden en la misma conversación, pero nadie los sabe sin un
// documento encima de la mesa.
const EJES_VACIOS = { exec: 0, qual: 0, trans: 0, fund: 0 };

// Habilidad = algo que el usuario NOMBRÓ. Cada par regex→etiqueta sólo puede
// encenderse con la palabra presente en la frase; de ahí que las familias de
// oficios estén escritas con sus términos concretos (nada de "ingenier" suelto,
// que reclamaba 'Ing. Industrial' para un ingeniero civil).
const HABILIDADES: [RegExp, string][] = [
  [/react|frontend|front.?end/, 'React'],
  [/node|backend|back.?end|express/, 'Node.js'],
  [/python|django|flask/, 'Python'],
  [/typescript/, 'TypeScript'],
  [/docker|kubernetes|devops/, 'DevOps'],
  [/aws|cloud|azure/, 'Cloud'],
  [/figma|ux|ui|dise[ñn]/, 'Diseño UX'],
  [/\bdata\b|analyt|machine.?learn|estad[íi]stic/, 'Data/IA'],
  [/industrial|lean|procesos|manufactur/, 'Ing. Industrial'],
  [/civil|construcc|estructura/, 'Ing. Civil'],
  [/electr[oó]n|automatizaci/, 'Electrónica'],
  [/gesti[oó]n|liderazgo|scrum|agile|gerente|director/, 'Gestión'],
  [/market|ventas|growth|comercial|publicidad/, 'Marketing'],
  [/finanz|contab|audit|tributar|impuesto/, 'Finanzas'],
  [/rrhh|recursos humanos|talento|selecci[oó]n|reclut/, 'RRHH'],
  [/emprendedor|startup|negocio/, 'Emprendimiento'],
  [/m[eé]dic|doctor(?:\s+[a-z])|salud|cl[ií]nic/, 'Medicina'],
  [/enfermer|param[eé]dic/, 'Enfermería'],
  [/psic[oó]log|terap/, 'Psicología'],
  [/nutrici|diet/, 'Nutrición'],
  [/docen|pedagog|ense[ñn]|educac/, 'Educación'],
  [/investig|acad[eé]mic|cient[ií]f/, 'Investigación'],
  [/abogad|derecho|legal|jur[ií]d|notari/, 'Derecho'],
  [/fotograf|video|audiovisual|cine/, 'Audiovisual'],
  [/period|comunic|prensa|redacc/, 'Comunicaciones'],
  [/arqu|urbanis/, 'Arquitectura'],
  [/chef|cocin|gastronom|culinari/, 'Gastronomía'],
  [/electricista|mec[aá]nic|soldad/, 'Técnico'],
  [/log[ií]stic|transporte|bodega|supply/, 'Logística'],
  [/administra|secretar|oficina/, 'Administración'],
  [/freelanc|independiente|consul/, 'Consultoría'],
  [/estudiant|universid|carrera/, 'Estudiante'],
];

const MAX_HABILIDADES = 6;

function habilidadesNombradas(texto: string): string[] {
  const t = texto.toLowerCase();
  const encontradas: string[] = [];
  for (const [regex, etiqueta] of HABILIDADES) {
    if (encontradas.length >= MAX_HABILIDADES) break;
    if (regex.test(t) && !encontradas.includes(etiqueta)) encontradas.push(etiqueta);
  }
  // Sin nada nombrado, la lista queda vacía. Rellenarla con 'Profesional',
  // 'Adaptabilidad' y 'Trabajo en equipo' era pintar un mapa con datos de otro.
  return encontradas;
}

/** Lo que él escribió, recortado en palabra completa y sin el relleno del inicio. */
function profesionDe(texto: string): string {
  const limpio = texto.trim().replace(/\s+/g, ' ').replace(/[.,;:!]+$/g, '');
  const sinPrefijo = limpio.replace(PREFIJO_DECLARACION, '').trim();
  const sinCola = sinPrefijo.replace(COLA_DE_AIOS, '').replace(/\s+/g, ' ').trim();
  // Si la frase ENTERA era la antigüedad ("Con 8 años en ventas"), el recorte no
  // puede dejar la raíz del mapa sin nombre: se devuelve lo dicho tal cual.
  const declarada = sinCola || sinPrefijo;
  if (declarada.length <= LARGO_PROFESION) return declarada;
  const corte = declarada.slice(0, LARGO_PROFESION);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return (ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte).trimEnd();
}

function aniosDe(texto: string): number {
  const m = texto.match(/(\d+)\s*a[ñn]os?\b/i);
  return m ? Math.min(60, parseInt(m[1], 10)) : 0;
}

/** La etiqueta de antigüedad sólo existe si los años fueron dichos. */
function seniorityDe(anios: number): string {
  if (anios >= 8) return 'Profesional Senior';
  if (anios >= 4) return 'Profesional Mid-Senior';
  if (anios >= 2) return 'Profesional Mid';
  if (anios >= 1) return 'Profesional';
  return '';
}

/** Devuelve la declaración, no un juicio sobre ella. */
function resumenDe(profession: string, anios: number): string {
  if (!profession) return '';
  const nombre = profession.charAt(0).toUpperCase() + profession.slice(1);
  return anios > 0 ? `${nombre}, ${anios} años de experiencia.` : `${nombre}.`;
}

/**
 * El perfil que sale de UNA frase dicho. Puro y determinista: la misma frase,
 * el mismo perfil (el anterior usaba el año de antigüedad como semilla de una
 * cuenta que parecía un dato).
 */
export function perfilDesdeDeclaracion(texto: string): GeneratedProfile {
  const profession = profesionDe(texto);
  const years = aniosDe(texto);
  return {
    profession,
    years,
    skills: habilidadesNombradas(texto),
    axes: { ...EJES_VACIOS },
    seniorLabel: seniorityDe(years),
    summary: resumenDe(profession, years),
  };
}
