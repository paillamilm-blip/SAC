// Datos de muestra del modo demostración. Portados SIN cambios de contenido desde
// brecha/lib/ai/fixture.ts: son frases de ejemplo, no un análisis del CV de nadie.
import type { ResultadoAnalisis } from '../domain/types';

export const MUESTRA: ResultadoAnalisis = {
  ocupacion: "Profesional con experiencia media (muestra)",
  nivel: "Semi-senior · 5 a 8 años",
  resumen:
    "Este es un análisis de muestra: no surge de tu CV. Sirve para recorrer la aplicación completa con el mismo orden, las mismas categorías y los mismos botones que tendrá el tuyo. Cuando el análisis con IA esté activo, aquí verás el tuyo.",
  fortalezas: [
    "Trayectoria continua en el mismo rubro, sin vacíos sin explicar.",
    "Menciona herramientas concretas en vez de adjetivos vagos.",
    "Incluye responsabilidades con alcance medible en al menos un cargo.",
  ],
  brechas: [
    {
      categoria: "dura",
      titulo: "Resultados cuantificados en la mayoría de los cargos",
      evidencia: "Ausente en el CV: solo 1 de 4 experiencias incluye un número.",
      porQueImporta:
        "Sin cifras, quien lee no puede distinguir si hiciste el trabajo o si lo lideraste. Es la diferencia más cara entre dos CVs con la misma experiencia.",
      severidad: "alta",
      aprender: {
        que: "Cómo convertir responsabilidades en resultados medibles (métricas de volumen, plazo, dinero, error).",
        como: "Ejercicio práctico: tomar cada cargo y escribir 2 logros con número. 45 minutos, sin cursos.",
        comoLoDemuestro: "Cada experiencia del CV con al menos un logro que incluya un número y un plazo.",
      },
    },
    {
      categoria: "dura",
      titulo: "Análisis de datos con planillas o SQL",
      evidencia: "Ausente en el CV: no aparece Excel avanzado, SQL ni herramientas de BI.",
      porQueImporta:
        "En casi todos los rubros la decisión se discute con datos. Quien no puede traer el número a la mesa delega esa parte de su trabajo.",
      severidad: "media",
      aprender: {
        que: "SQL básico (SELECT, JOIN, GROUP BY) y tablas dinámicas.",
        como: "Curso introductorio gratuito de SQL + un dataset propio del trabajo para practicar.",
        comoLoDemuestro: "Un reporte que hoy te piden y que puedas generar tú sin pedirle ayuda a nadie.",
      },
    },
    {
      categoria: "blanda",
      titulo: "Negociación y manejo de conflicto",
      evidencia: "Ausente en el CV: no hay ejemplos de acuerdos, partes contrarias ni clientes difíciles.",
      porQueImporta:
        "A partir de los 5 años de experiencia, el salto de sueldo casi nunca viene de la técnica: viene de resolver conflictos que otros no pudieron.",
      severidad: "alta",
      aprender: {
        que: "Negociación basada en intereses y comunicación de malas noticias.",
        como: "Lectura dirigida + aplicar en una conversación real de la semana y anotar qué pasó.",
        comoLoDemuestro: "Un caso contado en el CV: conflicto, qué hiciste, en qué terminó.",
      },
    },
    {
      categoria: "blanda",
      titulo: "Comunicación escrita breve",
      evidencia: "El propio CV: párrafos de más de 5 líneas en la descripción de cargos.",
      porQueImporta:
        "Si escribes largo, quien lee asume que piensas largo. La mayoría de las decisiones sobre tu CV se toman en menos de 20 segundos.",
      severidad: "media",
      aprender: {
        que: "Redacción ejecutiva: una idea por línea, verbo al inicio, sin adjetivos.",
        como: "Reescribir las 3 descripciones más largas del CV en la mitad de palabras.",
        comoLoDemuestro: "CV sin párrafos de más de 3 líneas.",
      },
    },
    {
      categoria: "conocimiento",
      titulo: "Marco normativo o técnico actualizado del rubro",
      evidencia: "Ausente en el CV: última capacitación mencionada es de hace más de 4 años.",
      porQueImporta:
        "El conocimiento del rubro vence. Un CV sin actualización reciente hace dudar de todo lo demás, aunque sea cierto.",
      severidad: "alta",
      aprender: {
        que: "Los cambios de los últimos 24 meses en la regulación o tecnología de tu rubro.",
        como: "Una fuente primaria del sector leída durante 2 semanas seguidas.",
        comoLoDemuestro: "Sección 'Actualización' en el CV con fecha reciente y nombre concreto.",
      },
    },
    {
      categoria: "conocimiento",
      titulo: "Gestión de proyectos",
      evidencia: "Ausente en el CV: describe tareas sueltas, no iniciativas con inicio y fin.",
      porQueImporta:
        "Sin vocabulario de proyecto (alcance, plazo, riesgo) es difícil que te asignen algo más grande que una tarea.",
      severidad: "media",
      aprender: {
        que: "Fundamentos de gestión de proyectos: alcance, cronograma, riesgos, interesados.",
        como: "Curso introductorio + reescribir una experiencia actual como proyecto.",
        comoLoDemuestro: "Una experiencia del CV contada como proyecto, con resultado y plazo.",
      },
    },
    {
      categoria: "credencial",
      titulo: "Certificación reconocida en el rubro",
      evidencia: "Ausente en el CV: título universitario sin certificaciones posteriores.",
      porQueImporta:
        "En procesos con filtro automático, una certificación reconocida es lo único que a veces separa tu CV del descarte.",
      severidad: "baja",
      aprender: {
        que: "Cuál certificación del rubro piden realmente las ofertas de tu nivel (no la más famosa: la más pedida).",
        como: "Revisar 15 ofertas del cargo que quieres y contar qué certificación se repite.",
        comoLoDemuestro: "Certificación obtenida y fechada en el CV.",
      },
    },
    {
      categoria: "credencial",
      titulo: "Idioma con nivel verificable",
      evidencia: "El CV declara inglés sin nivel ni examen que lo respalde.",
      porQueImporta:
        "'Inglés intermedio' sin respaldo no suma nada y puede costarte una entrevista técnica incómoda.",
      severidad: "baja",
      aprender: {
        que: "Preparar una acreditación de nivel con puntaje.",
        como: "Diagnóstico gratuito en línea para saber dónde estás antes de gastar en el examen.",
        comoLoDemuestro: "Nivel declarado con examen y año en el CV.",
      },
    },
  ],
};
