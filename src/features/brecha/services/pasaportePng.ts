// La imagen descargable del pasaporte (1080×1350, formato vertical para compartir). Se dibuja EN EL DISPOSITIVO:
// no sube nada. Una imagen sola no prueba nada —cualquiera puede editarla—, por eso lleva impreso el enlace
// firmado por el servidor: lo que verifica es el enlace, no la imagen.

import { COLOR_CAT } from '../domain/colores';
import type { CategoriaBrecha } from '../domain/types';

export interface SelloPng {
  titulo: string;
  categoria: CategoriaBrecha;
  puntaje: number;
  /** Fecha ya formateada para mostrar. */
  fecha: string;
}

export interface DatosPng {
  nombre: string;
  ocupacion: string;
  sellos: SelloPng[];
  /** Color elegido por la persona para su Gemelo (hex). */
  colorUsuario: string;
  /** Enlace verificable ya firmado por el servidor. */
  enlace: string;
  /** Fecha de emisión ya formateada. */
  emitido: string;
}

export const ANCHO = 1080;
export const ALTO = 1350;
export const MAX_SELLOS_EN_IMAGEN = 6;

const SISTEMA = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Parte un texto en líneas que quepan en `ancho`; si sobra, la última termina en «…». */
export function partir(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, texto: string, ancho: number, maxLineas: number): string[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (let i = 0; i < palabras.length; i++) {
    const prueba = actual ? `${actual} ${palabras[i]}` : palabras[i];
    if (ctx.measureText(prueba).width <= ancho || !actual) {
      actual = prueba;
      continue;
    }
    lineas.push(actual);
    actual = palabras[i];
    if (lineas.length === maxLineas - 1) {
      const resto = [actual, ...palabras.slice(i + 1)].join(' ');
      actual = resto;
      break;
    }
  }
  if (actual) lineas.push(actual);
  const salida = lineas.slice(0, maxLineas);
  const ultimo = salida.length - 1;
  if (ultimo >= 0) {
    let t = salida[ultimo];
    const recortado = t !== (lineas[ultimo] ?? t) || lineas.length > maxLineas || ctx.measureText(t).width > ancho;
    if (recortado) {
      while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1).trimEnd();
      salida[ultimo] = `${t}…`;
    }
  }
  return salida;
}

export function dibujarPasaporte(ctx: CanvasRenderingContext2D, d: DatosPng): void {
  const W = ANCHO;
  const H = ALTO;

  // Fondo y marco (mismos tokens que la app: bg, línea fina).
  ctx.fillStyle = '#000206';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(150,180,255,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.strokeStyle = d.colorUsuario;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(72, 120);
  ctx.lineTo(72 + 120, 120);
  ctx.stroke();

  // Encabezado.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#eaf0fb';
  ctx.font = `700 40px ${SISTEMA}`;
  ctx.fillText('Ómicrom', 72, 92);
  ctx.fillStyle = 'rgba(234,240,251,0.62)';
  ctx.font = `600 22px ${MONO}`;
  ctx.fillText('PASAPORTE PROFESIONAL', 72, 168);

  // Nombre: se achica hasta que quepa.
  let tam = 84;
  ctx.fillStyle = '#eaf0fb';
  do {
    ctx.font = `700 ${tam}px ${SISTEMA}`;
    tam -= 4;
  } while (ctx.measureText(d.nombre).width > W - 144 && tam > 36);
  ctx.fillText(d.nombre, 72, 268);
  ctx.fillStyle = d.colorUsuario;
  ctx.font = `500 34px ${SISTEMA}`;
  ctx.fillText(partir(ctx, d.ocupacion, W - 144, 1)[0] ?? '', 72, 322);

  ctx.fillStyle = 'rgba(234,240,251,0.8)';
  ctx.font = `400 28px ${SISTEMA}`;
  const total = d.sellos.length;
  ctx.fillText(`${total} ${total === 1 ? 'habilidad probada' : 'habilidades probadas'} con examen`, 72, 380);

  // Sellos: 3 columnas, hasta 6.
  const mostrados = d.sellos.slice(0, MAX_SELLOS_EN_IMAGEN);
  const colW = (W - 144) / 3;
  mostrados.forEach((s, i) => {
    const col = i % 3;
    const fila = Math.floor(i / 3);
    const cx = 72 + colW * col + colW / 2;
    const cy = 540 + fila * 330;
    const color = COLOR_CAT[s.categoria];
    ctx.lineWidth = 6;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eaf0fb';
    ctx.font = `700 64px ${SISTEMA}`;
    ctx.fillText(String(Math.round(s.puntaje)), cx, cy + 14);
    ctx.fillStyle = 'rgba(234,240,251,0.6)';
    ctx.font = `500 22px ${MONO}`;
    ctx.fillText('/100', cx, cy + 46);
    ctx.fillStyle = '#eaf0fb';
    ctx.font = `600 26px ${SISTEMA}`;
    partir(ctx, s.titulo, colW - 24, 2).forEach((linea, k) => ctx.fillText(linea, cx, cy + 150 + k * 32));
    ctx.fillStyle = 'rgba(234,240,251,0.55)';
    ctx.font = `400 22px ${SISTEMA}`;
    ctx.fillText(s.fecha, cx, cy + 150 + 2 * 32 + 6);
  });
  ctx.textAlign = 'left';
  if (d.sellos.length > MAX_SELLOS_EN_IMAGEN) {
    ctx.fillStyle = 'rgba(234,240,251,0.7)';
    ctx.font = `500 26px ${SISTEMA}`;
    ctx.fillText(`y ${d.sellos.length - MAX_SELLOS_EN_IMAGEN} más en el enlace`, 72, 1160);
  }

  // Pie: qué es cada sello y cómo comprobarlo.
  ctx.strokeStyle = 'rgba(150,180,255,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 1196);
  ctx.lineTo(W - 72, 1196);
  ctx.stroke();
  ctx.fillStyle = 'rgba(234,240,251,0.7)';
  ctx.font = `400 22px ${SISTEMA}`;
  ctx.fillText('Cada sello es un examen aprobado y calificado por el servidor de Ómicrom.', 72, 1236);
  ctx.fillStyle = 'rgba(234,240,251,0.9)';
  ctx.font = `500 22px ${MONO}`;
  partir(ctx, `Compruébalo: ${d.enlace}`, W - 144, 2).forEach((linea, k) => ctx.fillText(linea, 72, 1274 + k * 28));
  ctx.fillStyle = 'rgba(234,240,251,0.5)';
  ctx.font = `400 20px ${SISTEMA}`;
  ctx.textAlign = 'right';
  ctx.fillText(`Emitido el ${d.emitido}`, W - 72, 1316);
  ctx.textAlign = 'left';
}

/** Dibuja el pasaporte y lo descarga como PNG. Devuelve false si el navegador no pudo generarlo. */
export async function descargarPasaporte(d: DatosPng, nombreArchivo = 'pasaporte-omicrom.png'): Promise<boolean> {
  try {
    const lienzo = document.createElement('canvas');
    lienzo.width = ANCHO;
    lienzo.height = ALTO;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return false;
    dibujarPasaporte(ctx, d);
    const blob: Blob | null = await new Promise((ok) => lienzo.toBlob(ok, 'image/png'));
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}
