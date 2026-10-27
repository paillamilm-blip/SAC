// features/gemelo/services/credencialCanvas.ts
// ═══════════════════════════════════════════════════════════════════════
// EL ÚNICO DIBUJANTE DE CREDENCIALES.
//
// Existían dos: `drawCredential` (CredencialModal) y `drawPassport`
// (PasaporteGemelo). La misma tarjeta, dibujada dos veces con alfas levemente
// distintos —filete 0.35 vs 0.45, etiquetas 0.8 vs 0.85, valores 0.4 vs 0.5— y
// una pila de 18 hexes crudos repetidos entre las dos. Este módulo es el
// dueño: nadie más toca `getContext('2d')` (lo vela contratoAsistente.test.ts).
//
// El lienzo pinta con la hoja concreta del tema (`@/theme` → canvasInk.ts), no
// con colores inventados acá. La geometría (600×860, tamaños, posiciones) es la
// de la tarjeta de siempre: lo que cambió es de dónde sale cada color.
// ═══════════════════════════════════════════════════════════════════════

import { CANVAS_SERIF, CARD, CARD_INK, CARD_NAVY, FONT } from '@/theme';

/** Datos mínimos de la tarjeta descargable. `accent` es el color del usuario. */
export type CredentialCardData = {
  name: string;
  seniorLabel: string;
  years: number;
  reputation: number;
  accent: string;
  axes: { label: string; value: number; color: string }[];
};

function paintCard(cv: HTMLCanvasElement, data: CredentialCardData): void {
  const x = cv.getContext('2d');
  if (!x) return;
  const W = cv.width;
  const H = cv.height;
  const accent = data.accent;

  // Fondo: gradiente navy Ómicrom.
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, CARD_NAVY.top);
  g.addColorStop(0.5, CARD_NAVY.mid);
  g.addColorStop(1, CARD_NAVY.bottom);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // Borde fino + línea de acento superior (color del usuario).
  x.strokeStyle = CARD_INK.frame;
  x.lineWidth = 2;
  x.strokeRect(16, 16, W - 32, H - 32);
  x.fillStyle = accent;
  x.fillRect(W / 2 - 60, 40, 120, 3);

  x.textAlign = 'center';

  // Glifo Ω + título + subtítulo.
  x.fillStyle = accent;
  x.font = `bold 92px ${CANVAS_SERIF}`;
  x.fillText('Ω', W / 2, 148);
  x.fillStyle = CARD_INK.title;
  x.font = `bold 34px ${FONT.display}`;
  x.fillText('Sistema Ómicrom', W / 2, 196);
  x.fillStyle = CARD_INK.meta;
  x.font = `15px ${FONT.mono}`;
  x.fillText('CREDENCIAL · GEMELO DIGITAL', W / 2, 224);

  // Nombre + seniority + años.
  const name = data.name.trim() || 'Tu Gemelo Digital';
  x.fillStyle = CARD_INK.title;
  x.font = `bold 30px ${FONT.display}`;
  x.fillText(name, W / 2, 292);
  const sub = data.years > 0 ? `${data.seniorLabel} · ${data.years} años` : data.seniorLabel;
  x.fillStyle = CARD_INK.stat;
  x.font = `16px ${FONT.display}`;
  x.fillText(sub, W / 2, 322);

  // Reputación: número grande (acento) con su /100 centrado como conjunto.
  x.fillStyle = CARD_INK.stat;
  x.font = `14px ${FONT.mono}`;
  x.fillText('REPUTACIÓN', W / 2, 372);
  const repStr = String(Math.round(data.reputation));
  x.font = `bold 78px ${FONT.display}`;
  const repW = x.measureText(repStr).width;
  x.font = `20px ${FONT.mono}`;
  const suffixW = x.measureText('/100').width;
  const startX = W / 2 - (repW + 8 + suffixW) / 2;
  x.textAlign = 'left';
  x.fillStyle = accent;
  x.font = `bold 78px ${FONT.display}`;
  x.fillText(repStr, startX, 440);
  x.fillStyle = CARD_INK.meta;
  x.font = `20px ${FONT.mono}`;
  x.fillText('/100', startX + repW + 8, 440);
  x.textAlign = 'center';

  // Modelo 20/80.
  x.fillStyle = CARD_INK.meta;
  x.font = `13px ${FONT.mono}`;
  x.fillText('20% credenciales · 80% desempeño demostrado', W / 2, 470);

  // Los 4 ejes, barras etiquetadas con /100.
  let yy = 522;
  x.textAlign = 'left';
  for (const { label, value, color } of data.axes) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    x.fillStyle = CARD_INK.label;
    x.font = `15px ${FONT.mono}`;
    x.fillText(label, 50, yy - 8);
    x.textAlign = 'right';
    x.fillStyle = CARD_INK.value;
    x.font = `13px ${FONT.mono}`;
    x.fillText(`${v}/100`, W - 50, yy - 8);
    x.textAlign = 'left';
    x.fillStyle = CARD_INK.track;
    x.fillRect(50, yy, W - 100, 11);
    x.fillStyle = color;
    x.fillRect(50, yy, ((W - 100) * v) / 100, 11);
    yy += 56;
  }

  // Pie.
  x.textAlign = 'center';
  x.fillStyle = CARD_INK.footer;
  x.font = `12px ${FONT.mono}`;
  x.fillText('Verificable en Ómicrom · Conocimiento verificable, no declarado', W / 2, H - 40);
}

/**
 * Dibuja la credencial y devuelve el data URL del PNG. El componente solo se
 * ocupa del clic: el lienzo, sus medidas y su tinta no se tocan afuera.
 */
export function credentialPng(data: CredentialCardData): string {
  const cv = document.createElement('canvas');
  cv.width = CARD.w;
  cv.height = CARD.h;
  paintCard(cv, data);
  return cv.toDataURL('image/png');
}
