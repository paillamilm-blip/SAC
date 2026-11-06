// lib/cvExtract.ts
// Lectura ROBUSTA de CV (PDF y Word) — carga PDF.js y Mammoth desde CDN en
// runtime (sin dependencias en el build). Lee prácticamente cualquier
// documento. Si algo falla, cae a texto plano.

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

// Una sola carga en curso por librería: dos clics seguidos esperan la misma descarga en vez de pedirla dos veces.
const cargas = new Map<string, Promise<void>>();

/**
 * Carga una librería desde el CDN. Si falla (red, CDN caído, o tarda más de 8 s), SE OLVIDA el intento: se quita la
 * etiqueta <script> y la promesa guardada, para que el siguiente «Analizar» descargue de nuevo.
 *
 * Antes, una etiqueta fallida quedaba en la página y cada reintento la encontraba, creía que la librería ya había cargado
 * y fallaba en el acto: reintentar no servía de nada hasta recargar la página.
 */
function loadScript(src: string): Promise<void> {
  const enCurso = cargas.get(src);
  if (enCurso) return enCurso;

  const promesa = new Promise<void>((resolve, reject) => {
    document.querySelector(`script[data-cv="${src}"]`)?.remove(); // restos de un intento anterior
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-cv', src);
    const fallar = (motivo: string) => {
      clearTimeout(timeout);
      s.onload = null;
      s.onerror = null;
      s.remove();
      cargas.delete(src);
      reject(new Error(motivo));
    };
    // Si el CDN no responde en 8 s, se abandona este intento (y queda libre para el siguiente).
    const timeout = setTimeout(() => fallar(`CDN timeout loading ${src.split('/').pop()}`), 8000);
    s.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    s.onerror = () => fallar('CDN unavailable: ' + src.split('/').pop());
    document.head.appendChild(s);
  });
  cargas.set(src, promesa);
  return promesa;
}

interface PdfItem { str?: string }
interface PdfPage { getTextContent(): Promise<{ items: PdfItem[] }> }
interface PdfDoc { numPages: number; getPage(n: number): Promise<PdfPage> }
interface PdfLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(src: { data: ArrayBuffer }): { promise: Promise<PdfDoc> };
}
interface MammothLib { extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> }

function getPdfLib(): PdfLib | undefined {
  return (window as unknown as { pdfjsLib?: PdfLib }).pdfjsLib;
}

async function pdfText(buffer: ArrayBuffer): Promise<string> {
  if (!getPdfLib()) await loadScript(PDFJS);
  const lib = getPdfLib();
  if (!lib) throw new Error('pdfjs no disponible');
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await lib.getDocument({ data: buffer }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str ?? '').join(' ') + '\n';
  }
  return out.replace(/\s+/g, ' ').trim();
}

async function docxText(buffer: ArrayBuffer): Promise<string> {
  const w = window as unknown as { mammoth?: MammothLib };
  if (!w.mammoth) await loadScript(MAMMOTH);
  if (!w.mammoth) throw new Error('mammoth no disponible');
  const res = await w.mammoth.extractRawText({ arrayBuffer: buffer });
  return (res.value || '').replace(/\s+/g, ' ').trim();
}

const TIPO_PDF = 'application/pdf';
const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Mensaje cuando leer el archivo tarda demasiado: el lector no lo pudo procesar (dañado, raro o enorme). */
export const ERROR_LECTURA_LENTA =
  'Leer tu archivo está tardando demasiado. Prueba exportándolo de nuevo, o súbelo en el otro formato (PDF o Word).';

/** Tope para leer UN archivo, aparte de descargar el lector. Un CV normal se lee en menos de 1 s. */
const LIMITE_LECTURA_MS = 30_000;

/** Corta una lectura que nunca termina: «Analizando…» no puede quedarse girando para siempre. */
function conLimite<T>(promesa: Promise<T>): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error('omicron:lectura-lenta')), LIMITE_LECTURA_MS);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(t));
}

/** Mensaje cuando no se pudo CARGAR el lector (red o servidor del lector caído): no es culpa del archivo. */
export const ERROR_LECTOR_NO_DISPONIBLE =
  'No pudimos cargar el lector de documentos. Revisa tu conexión e inténtalo de nuevo.';

/** Extrae el texto de un CV (PDF / Word / TXT). Robusto y con fallback. */
export async function extractCVText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  // Extensión o tipo MIME: según el sistema, uno de los dos puede venir vacío.
  const esPdf = name.endsWith('.pdf') || file.type === TIPO_PDF;
  const esDocx = name.endsWith('.docx') || file.type === TIPO_DOCX;
  const buffer = await file.arrayBuffer();

  // Attempt specialized extraction (PDF.js for PDF, Mammoth for DOCX)
  try {
    if (esPdf) {
      const t = await conLimite(pdfText(buffer.slice(0)));
      if (t.length > 15) return t.slice(0, 15000);
    } else if (esDocx) {
      const t = await conLimite(docxText(buffer.slice(0)));
      if (t.length > 15) return t.slice(0, 15000);
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'omicron:lectura-lenta') throw new Error(ERROR_LECTURA_LENTA);
    // Si el lector ni siquiera se pudo CARGAR, decirlo: seguir al texto plano devolvía '' y la persona leía «no pude leer
    // texto en tu archivo», culpando a un CV que quizá está perfecto.
    if (/^CDN |no disponible/.test(msg)) throw new Error(ERROR_LECTOR_NO_DISPONIBLE);
    // Error al interpretar este archivo (dañado, protegido): se intenta el texto plano.
    console.warn('[cvExtract] Specialized extraction failed:', msg);
  }

  // Fallback 1: Try reading as plain text (works for .txt, .doc with text, and some PDFs)
  try {
    const t = (await file.text()).trim();
    // Filter out binary garbage: if >30% of chars are non-printable, it's binary
    const printable = t.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\uFFFF\n\r\t]/g, '');
    if (printable.length > 30 && printable.length / t.length > 0.7) {
      return printable.slice(0, 15000);
    }
  } catch {
    /* noop */
  }

  // Fallback 2: Return empty — caller will show "paste your experience" message
  return '';
}
