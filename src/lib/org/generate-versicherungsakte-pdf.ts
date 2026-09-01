import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type VersicherungsaktePdfInput = {
  orgName: string;
  objektTitel: string;
  objektAdresse?: string;
  versicherungsNr?: string | null;
  schadenNr?: string | null;
  schadendatum?: string | null;
  kostentraegerLabel?: string | null;
  hergang?: string | null;
  chronologie: Array<{ datum: string; text: string }>;
  befundZeilen: Array<{ datum: string; titel: string; text: string; fotoCount: number }>;
  abnahmeHinweis?: string | null;
  rechnungHinweis?: string | null;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

const ACCENT = rgb(0.1, 0.24, 0.17);
const TEXT = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.42, 0.45, 0.44);
const LINE = rgb(0.82, 0.84, 0.82);
const SOFT = rgb(0.95, 0.96, 0.95);

function fmtDatum(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  schadenNr: string;
  orgName: string;
  erstelltAm: string;
};

function drawFooter(ctx: DrawCtx) {
  ctx.page.drawLine({
    start: { x: MARGIN, y: 52 },
    end: { x: PAGE_W - MARGIN, y: 52 },
    thickness: 0.5,
    color: LINE,
  });
  const left = `${ctx.orgName} · Erstellt ${ctx.erstelltAm}`;
  ctx.page.drawText(left.slice(0, 70), {
    x: MARGIN,
    y: 38,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  const right = `Schaden-Nr. ${ctx.schadenNr}`;
  const rw = ctx.font.widthOfTextAtSize(right, 8);
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - rw,
    y: 38,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

function ensureSpace(ctx: DrawCtx, need: number) {
  if (ctx.y < need) {
    drawFooter(ctx);
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - 56;
  }
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
) {
  const size = opts?.size ?? 10;
  ensureSpace(ctx, size + 28);
  ctx.page.drawText(text.slice(0, 110), {
    x: MARGIN,
    y: ctx.y,
    size,
    font: opts?.bold ? ctx.fontBold : ctx.font,
    color: opts?.color ?? MUTED,
  });
  ctx.y -= size + 5;
}

function drawWrapped(
  ctx: DrawCtx,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
) {
  for (const ln of wrapText(text, 88)) {
    drawText(ctx, ln, {
      bold: opts?.bold,
      size: opts?.size ?? 10,
      color: opts?.color ?? TEXT,
    });
  }
}

function drawHr(ctx: DrawCtx, accent = false) {
  ensureSpace(ctx, 20);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 4 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 4 },
    thickness: accent ? 1.5 : 0.6,
    color: accent ? ACCENT : LINE,
  });
  ctx.y -= 14;
}

function drawSection(ctx: DrawCtx, n: number, title: string) {
  ensureSpace(ctx, 36);
  ctx.y -= 4;
  drawText(ctx, `${n}. ${title}`, { bold: true, size: 11, color: ACCENT });
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 8 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 8 },
    thickness: 1.2,
    color: ACCENT,
  });
  ctx.y -= 6;
}

function drawMetaBar(
  ctx: DrawCtx,
  cells: Array<{ label: string; value: string }>
) {
  const usable = cells.filter((c) => c.value.trim());
  if (!usable.length) return;
  const rowH = 36;
  ensureSpace(ctx, rowH + 16);
  const top = ctx.y + 4;
  const bottom = top - rowH;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: bottom,
    width: CONTENT_W,
    height: rowH,
    color: SOFT,
    borderColor: LINE,
    borderWidth: 0.6,
  });
  const colW = CONTENT_W / usable.length;
  usable.forEach((c, i) => {
    const x = MARGIN + i * colW + 10;
    if (i > 0) {
      ctx.page.drawLine({
        start: { x: MARGIN + i * colW, y: bottom + 6 },
        end: { x: MARGIN + i * colW, y: top - 6 },
        thickness: 0.5,
        color: LINE,
      });
    }
    ctx.page.drawText(c.label.toUpperCase().slice(0, 22), {
      x,
      y: top - 14,
      size: 7,
      font: ctx.font,
      color: MUTED,
    });
    ctx.page.drawText(c.value.slice(0, 28), {
      x,
      y: top - 28,
      size: 9.5,
      font: ctx.fontBold,
      color: TEXT,
    });
  });
  ctx.y = bottom - 14;
}

/**
 * Schadenakte Versicherung (CRM) — Briefkopf HV + Meta + nummerierte Abschnitte,
 * White-Label ohne Plattform-Branding.
 */
export async function generateVersicherungsaktePdf(
  input: VersicherungsaktePdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const schadenNr =
    input.schadenNr?.trim() ||
    input.versicherungsNr?.trim() ||
    "ohne Nr.";
  const erstelltAm = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const orgName = input.orgName?.trim() || "Hausverwaltung";

  const ctx: DrawCtx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    fontBold,
    y: PAGE_H - 56,
    schadenNr,
    orgName,
    erstelltAm,
  };

  drawText(ctx, orgName, { bold: true, size: 12, color: ACCENT });
  ctx.y -= 2;
  drawHr(ctx, true);

  drawText(ctx, "SCHADENAKTE", { bold: true, size: 8, color: MUTED });
  ctx.y += 2;
  drawText(ctx, "Schadenakte Versicherung", {
    bold: true,
    size: 16,
    color: ACCENT,
  });
  ctx.y -= 2;

  drawText(ctx, input.objektTitel, { bold: true, size: 11, color: TEXT });
  if (input.objektAdresse?.trim()) {
    drawText(ctx, input.objektAdresse.trim(), { size: 10, color: MUTED });
  }

  drawMetaBar(ctx, [
    { label: "Policen-Nr.", value: input.versicherungsNr?.trim() || "—" },
    { label: "Schaden-Nr.", value: schadenNr },
    { label: "Schadendatum", value: fmtDatum(input.schadendatum) },
  ]);

  if (input.kostentraegerLabel?.trim()) {
    drawText(ctx, `Kostenträger: ${input.kostentraegerLabel.trim()}`, {
      size: 10,
      color: MUTED,
    });
  }

  let n = 1;
  drawSection(ctx, n++, "Schadenhergang");
  drawWrapped(
    ctx,
    input.hergang?.trim() ||
      "Aus den Vorgangsdaten zusammengestellt — bitte vor Einreichung prüfen."
  );

  drawSection(ctx, n++, "Chronologie / Erstmaßnahmen");
  if (input.chronologie.length === 0) {
    drawText(ctx, "Keine Chronologie-Einträge hinterlegt.", {
      size: 10,
      color: MUTED,
    });
  } else {
    for (const c of input.chronologie) {
      drawWrapped(ctx, `${fmtDatum(c.datum)} — ${c.text}`);
    }
  }

  drawSection(ctx, n++, "Befund / Leckortung");
  if (input.befundZeilen.length === 0) {
    drawText(ctx, "Noch kein Partner-Befund hinterlegt.", {
      size: 10,
      color: MUTED,
    });
  } else {
    for (const b of input.befundZeilen) {
      drawText(ctx, `${fmtDatum(b.datum)} — ${b.titel}`, {
        bold: true,
        size: 10,
        color: ACCENT,
      });
      drawWrapped(ctx, b.text || "—");
      drawText(
        ctx,
        b.fotoCount > 0
          ? `Fotos: ${b.fotoCount} Anhang/Anhänge (siehe Vorgang)`
          : "Fotos: —",
        { size: 9, color: MUTED }
      );
      ctx.y -= 4;
    }
  }

  drawSection(ctx, n++, "Abnahme");
  drawWrapped(
    ctx,
    input.abnahmeHinweis?.trim() ||
      "Abnahme noch ausstehend bzw. nicht erforderlich."
  );

  drawSection(ctx, n++, "Rechnung");
  drawWrapped(
    ctx,
    input.rechnungHinweis?.trim() ||
      "Rechnung folgt bzw. ist als separates Dokument im Vorgang abgelegt."
  );

  drawFooter(ctx);
  return pdf.save();
}
