import type { VizBauErklaerung } from "@/lib/visualize/types";

export const ZIELBILD_W = 1080;
export const ZIELBILD_H = 1350;

export type ZielbildRasterImage = {
  width: number;
  height: number;
};

const CREAM = "#F7F4EF";
const CREAM_MID = "#EEF3EC";
const GREEN_DARK = "#0F2818";
const GREEN_MID = "#1A3D2B";
const GREEN_ACCENT = "#2E7D52";
const GREEN_GLOW = "#3D9966";
const TEXT_BODY = "#1A2420";
const TEXT_SOFT = "#4A5C54";
const WHITE = "#FFFFFF";

const FONT_SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_SERIF = "Georgia, 'Times New Roman', 'Palatino Linotype', serif";

export function wrapZielbildText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; height: number } {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return { lines, height: Math.max(lines.length, 1) * lineHeight };
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: ZielbildRasterImage,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img as unknown as CanvasImageSource, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawCreamGreenBackground(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 0, ZIELBILD_H);
  bg.addColorStop(0, CREAM);
  bg.addColorStop(0.55, CREAM_MID);
  bg.addColorStop(0.82, "#DDE8E0");
  bg.addColorStop(1, "#C8D9CE");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ZIELBILD_W, ZIELBILD_H);

  const glow = ctx.createRadialGradient(
    ZIELBILD_W * 0.15,
    ZIELBILD_H * 0.2,
    0,
    ZIELBILD_W * 0.15,
    ZIELBILD_H * 0.2,
    ZIELBILD_W * 0.7
  );
  glow.addColorStop(0, "rgba(46, 125, 82, 0.06)");
  glow.addColorStop(1, "rgba(46, 125, 82, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, ZIELBILD_W, ZIELBILD_H);
}

function drawGlassPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 14
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.fill();
  ctx.strokeStyle = "rgba(26, 61, 43, 0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPhotoFrame(
  ctx: CanvasRenderingContext2D,
  img: ZielbildRasterImage,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  badge: string
) {
  ctx.save();
  ctx.shadowColor = "rgba(15, 40, 24, 0.22)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#E4EAE6";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  drawCoverImage(ctx, img, x, y, w, h);
  ctx.restore();

  const badgePadX = 10;
  const badgeH = 22;
  ctx.font = `700 9px ${FONT_SANS}`;
  const badgeW = ctx.measureText(badge).width + badgePadX * 2;
  const bx = x + 12;
  const by = y + h - badgeH - 12;

  roundRect(ctx, bx, by, badgeW, badgeH, 4);
  ctx.fillStyle = "rgba(15, 40, 24, 0.72)";
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(badge, bx + badgePadX, by + badgeH / 2 + 0.5);
  ctx.textBaseline = "top";
}

function drawVerticalSteps(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  steps: string[]
): number {
  const items = steps.slice(0, 3);
  if (!items.length) return y;

  ctx.font = `600 9px ${FONT_SANS}`;
  ctx.fillStyle = GREEN_ACCENT;
  ctx.fillText("SO GEHT'S WEITER", x, y);
  let cy = y + 20;

  for (let i = 0; i < items.length; i++) {
    const label = items[i].length > 36 ? `${items[i].slice(0, 34)}…` : items[i];
    const circleR = 11;
    const cx = x + circleR;

    ctx.beginPath();
    ctx.arc(cx, cy + circleR, circleR, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? GREEN_MID : "rgba(26, 61, 43, 0.12)";
    ctx.fill();

    ctx.fillStyle = i === 0 ? WHITE : GREEN_MID;
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), cx, cy + circleR);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.font = `500 14px ${FONT_SANS}`;
    ctx.fillStyle = TEXT_BODY;
    const lines = wrapZielbildText(ctx, label, maxW - circleR * 2 - 16, 18).lines.slice(0, 2);
    let ly = cy + 2;
    for (const line of lines) {
      ctx.fillText(line, x + circleR * 2 + 12, ly);
      ly += 18;
    }

    cy += Math.max(36, lines.length * 18 + 8);
    if (i < items.length - 1) {
      ctx.strokeStyle = "rgba(46, 125, 82, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 4);
      ctx.stroke();
      cy += 8;
    }
  }

  return cy;
}

function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  logo: ZielbildRasterImage,
  erk: VizBauErklaerung
) {
  const footerH = 132;
  const fy = ZIELBILD_H - footerH;

  const grad = ctx.createLinearGradient(0, fy, 0, ZIELBILD_H);
  grad.addColorStop(0, GREEN_MID);
  grad.addColorStop(1, GREEN_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, fy, ZIELBILD_W, footerH);

  const logoSize = 36;
  ctx.drawImage(logo as unknown as CanvasImageSource, 48, fy + 28, logoSize, logoSize);

  ctx.textBaseline = "top";
  ctx.fillStyle = WHITE;
  ctx.font = `600 20px ${FONT_SANS}`;
  ctx.fillText("Bärenwald", 48 + logoSize + 12, fy + 26);
  const bwW = ctx.measureText("Bärenwald").width;
  ctx.fillStyle = "#C8E6D4";
  ctx.fillText("GPT", 48 + logoSize + 12 + bwW + 5, fy + 26);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `500 12px ${FONT_SANS}`;
  ctx.fillText("Generalunternehmer · München", 48 + logoSize + 12, fy + 52);

  const ctaText = erk.cta_text || "Projekt anfragen";
  ctx.font = `700 14px ${FONT_SANS}`;
  const ctaLabel = ctaText.length > 28 ? `${ctaText.slice(0, 26)}…` : ctaText;
  const ctaW = ctx.measureText(`${ctaLabel}  →`).width + 36;
  const ctaH = 40;
  const ctaX = ZIELBILD_W - 48 - ctaW;
  const ctaY = fy + 38;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, GREEN_ACCENT);
  ctaGrad.addColorStop(1, GREEN_GLOW);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(`${ctaLabel}  →`, ctaX + 18, ctaY + ctaH / 2);
  ctx.textBaseline = "top";

  if (erk.hinweis_gu) {
    ctx.font = `400 11px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.fillText(erk.hinweis_gu.slice(0, 56), ZIELBILD_W / 2, fy + footerH - 22);
    ctx.textAlign = "left";
  }
}

function zielbildKicker(erk: VizBauErklaerung): string | null {
  const k = erk.zielbild_kicker?.trim();
  return k ? k.toUpperCase().slice(0, 48) : null;
}

function vorhabenText(erk: VizBauErklaerung): string {
  const summary = erk.zusammenfassung.trim();
  if (summary) return summary.slice(0, 220);
  const teaser = erk.zielbild_teaser?.trim();
  if (teaser) return teaser;
  return "Wir planen die nötigen Gewerke und koordinieren alles als Generalunternehmer in München.";
}

function flowSteps(erk: VizBauErklaerung): string[] {
  const raw = erk.naechste_schritte
    .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (raw.length >= 2) return raw;
  return ["Anfrage stellen", "Beratung vor Ort", "Umsetzung aus einer Hand"];
}

function drawEditorialTextPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  erk: VizBauErklaerung
): number {
  const panelPad = 20;
  const innerW = w - panelPad * 2;

  const kicker = zielbildKicker(erk);
  const headline = erk.zielbild_headline.slice(0, 80);
  const body = vorhabenText(erk);

  ctx.font = `700 34px ${FONT_SERIF}`;
  const headlineLines = wrapZielbildText(ctx, headline, innerW, 40).lines.slice(0, 2);
  ctx.font = `400 15px ${FONT_SANS}`;
  const bodyLines = wrapZielbildText(ctx, body, innerW, 22).lines.slice(0, 4);

  const panelH =
    panelPad * 2 +
    (kicker ? 18 : 0) +
    headlineLines.length * 40 +
    12 +
    bodyLines.length * 22;

  drawGlassPanel(ctx, x, y, w, panelH);

  let cy = y + panelPad;
  const tx = x + panelPad;

  if (kicker) {
    ctx.fillStyle = GREEN_ACCENT;
    ctx.font = `600 10px ${FONT_SANS}`;
    ctx.fillText(kicker, tx, cy);
    cy += 18;
  }

  ctx.fillStyle = TEXT_BODY;
  ctx.font = `700 34px ${FONT_SERIF}`;
  for (const line of headlineLines) {
    ctx.fillText(line, tx, cy);
    cy += 40;
  }
  cy += 8;

  ctx.fillStyle = TEXT_SOFT;
  ctx.font = `400 15px ${FONT_SANS}`;
  for (const line of bodyLines) {
    ctx.fillText(line, tx, cy);
    cy += 22;
  }

  return y + panelH;
}

/** Einheitliches Feed-Zielbild auf beliebigem 2D-Canvas-Kontext zeichnen. */
export function renderZielbildFeed(
  ctx: CanvasRenderingContext2D,
  erk: VizBauErklaerung,
  logo: ZielbildRasterImage,
  vorher: ZielbildRasterImage,
  nachher: ZielbildRasterImage
) {
  drawCreamGreenBackground(ctx);

  const vorherX = 48;
  const vorherY = 52;
  const vorherW = 318;
  const vorherH = 238;

  const textX = 388;
  const textY = 52;
  const textW = ZIELBILD_W - textX - 48;

  const stepsX = textX;
  const stepsW = 280;

  drawPhotoFrame(ctx, vorher, vorherX, vorherY, vorherW, vorherH, 10, "VORHER");

  const textBottom = drawEditorialTextPanel(ctx, textX, textY, textW, erk);

  const stepsY = Math.max(textBottom + 16, vorherY + vorherH + 20);
  drawVerticalSteps(ctx, stepsX, stepsY, stepsW, flowSteps(erk));

  const nachherX = 108;
  const nachherY = 418;
  const nachherW = ZIELBILD_W - nachherX - 48;
  const nachherH = ZIELBILD_H - nachherY - 152;

  drawPhotoFrame(ctx, nachher, nachherX, nachherY, nachherW, nachherH, 14, "NACHHER");

  drawBrandFooter(ctx, logo, erk);
}
