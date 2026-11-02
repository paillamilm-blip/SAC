// lib/cvExtract.ts
// Lectura ROBUSTA de CV (PDF y Word) — carga PDF.js y Mammoth desde CDN en
// runtime (sin dependencias en el build). Lee prácticamente cualquier
// documento. Si algo falla, cae a texto plano.

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-cv="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-cv', src);
    // Timeout: if CDN doesn't respond in 8s, fail gracefully
    const timeout = setTimeout(() => {
      s.onload = null;
      s.onerror = null;
      reject(new Error(`CDN timeout loading ${src.split('/').pop()}`));
    }, 8000);
    s.onload = () => { clearTimeout(timeout); resolve(); };
    s.onerror = () => { clearTimeout(timeout); reject(new Error('CDN unavailable: ' + src.split('/').pop())); };
    document.head.appendChild(s);
  });
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

/** Extrae el texto de un CV (PDF / Word / TXT). Robusto y con fallback.
 *
 *  Devuelve TAMBIÉN el total que había en el documento. Sin ese número, un CV de
 *  40 000 caracteres volvía como «leído (15000 caracteres)» y el usuario creía
 *  que Ómicrom había visto todo: el recorte existía, no se decía. El huésped
 *  compara `totales` con `texto.length` y lo nombra en pantalla.
 */
export interface LecturaCV {
  texto: string;
  totales: number;
}

// Una sola pareja de números para toda la app: la lectura, el hook y el CTA
// prometen y exigen lo mismo.
export const TOPE_CV = 15000;
export const PISO_CV = 40;

export async function extractCVText(file: File): Promise<LecturaCV> {
  const name = file.name.toLowerCase();

  // Attempt specialized extraction (PDF.js for PDF, Mammoth for DOCX).
  // El buffer se lee DENTRO de este intento y solo para estos dos formatos: un
  // .txt no necesita pasar por ArrayBuffer, y si la lectura binaria falla queda
  // vivo el fallback de texto — que es la promesa del módulo.
  try {
    if (name.endsWith('.pdf') || name.endsWith('.docx')) {
      const buffer = await file.arrayBuffer();
      const t = name.endsWith('.pdf') ? await pdfText(buffer) : await docxText(buffer);
      if (t.length > 15) return { texto: t.slice(0, TOPE_CV), totales: t.length };
    }
  } catch (err) {
    // CDN failed or library error — log and fall through to text fallback
    console.warn('[cvExtract] Specialized extraction failed (CDN may be down):', (err as Error).message);
  }

  // Fallback 1: Try reading as plain text (works for .txt, .doc with text, and some PDFs)
  try {
    const t = (await file.text()).trim();
    // Un archivo se descarta por BASURA (pocos caracteres imprimibles), no por
    // corto: el umbral absoluto de 30 hacía devolver 0 para un .txt de 9, y la
    // pantalla le decía al usuario que su archivo no tenía nada. La longitud la
    // juzga PISO_CV en el hook, que es donde se explica el porqué.
    const printable = [...t].filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      if (c === 9 || c === 10 || c === 13) return true;
      return (c >= 0x20 && c <= 0x7e) || c >= 0xa0;
    }).join('');
    if (printable.length > 0 && printable.length / t.length > 0.7) {
      return { texto: printable.slice(0, TOPE_CV), totales: printable.length };
    }
  } catch {
    /* noop */
  }

  // Fallback 2: Sin texto — el huésped decide el mensaje y el total es 0.
  return { texto: '', totales: 0 };
}
