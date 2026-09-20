import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatDatum, formatEuro } from "@/lib/format/geld-datum";

export type PartnerDocEmpfaenger = {
  firma: string;
  strasse: string;
  plzOrt: string;
  email?: string;
};

export type PartnerDocPosition = {
  titel: string;
  beschreibung?: string | null;
  menge?: number | null;
  einheit?: string | null;
  netto: number;
  mwstSatz: number;
};

export type PartnerDocAbsender = {
  firma: string;
  inhaber?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  adresse?: string | null;
  telefon?: string | null;
  email?: string | null;
  steuernummer?: string | null;
  ustid?: string | null;
  handelsregister?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank?: string | null;
  kleinunternehmer?: boolean;
};

export type PartnerAngebotPdfInput = {
  docArt: "angebot";
  absender: PartnerDocAbsender;
  empfaenger: PartnerDocEmpfaenger;
  dokumentNr: string;
  datum: string;
  betreff: string;
  objektOrt?: string | null;
  positionen: PartnerDocPosition[];
  logoBytes?: Uint8Array | null;
  gueltigTage?: number;
};

export type PartnerRechnungPdfInput = {
  docArt: "rechnung";
  absender: PartnerDocAbsender;
  empfaenger: PartnerDocEmpfaenger;
  dokumentNr: string;
  datum: string;
  betreff: string;
  objektOrt?: string | null;
  leistungsZeitraum?: string | null;
  auftragsRef?: string | null;
  positionen: PartnerDocPosition[];
  logoBytes?: Uint8Array | null;
  abnahmeHinweis?: string | null;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_RIGHT = PAGE_W - MARGIN;
const COL_AMOUNT_RIGHT = CONTENT_RIGHT;
const COL_LEISTUNG_MAX = 58;

function fmtEur(n: number): string {
  return formatEuro(n);
}

function fmtDatum(iso: string): string {
  const formatted = formatDatum(iso.includes("T") ? iso.slice(0, 10) : iso);
  return formatted === "—" ? iso : formatted;
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
  return lines.length ? lines : [""];
}

function absenderAdresse(a: PartnerDocAbsender): string {
  const strasseNr = [a.strasse?.trim(), a.hausnummer?.trim()]
    .filter(Boolean)
    .join(" ");
  const plzOrt = [a.plz?.trim(), a.ort?.trim()].filter(Boolean).join(" ");
  if (strasseNr && plzOrt) return `${strasseNr}, ${plzOrt}`;
  if (a.strasse?.trim() && a.ort?.trim()) {
    return `${a.strasse.trim()}, ${a.ort.trim()}`;
  }
  return a.adresse?.trim() || "";
}

async function embedLogo(
  pdf: PDFDocument,
  bytes?: Uint8Array | null
): Promise<{
  width: number;
  height: number;
  draw: (page: PDFPage, x: number, y: number) => void;
} | null> {
  if (!bytes?.length) return null;
  try {
    const img = await pdf.embedPng(bytes).catch(() => pdf.embedJpg(bytes));
    const max = 52;
    const scale = Math.min(max / img.width, max / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    return {
      width: w,
      height: h,
      draw: (page, x, y) => page.drawImage(img, { x, y, width: w, height: h }),
    };
  } catch {
    return null;
  }
}

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  margin: number;
};

function ensureSpace(ctx: DrawCtx, need: number) {
  if (ctx.y < need) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - 62;
  }
}

function drawLeft(
  ctx: DrawCtx,
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    color?: ReturnType<typeof rgb>;
    x?: number;
    advance?: boolean;
  }
) {
  const size = opts?.size ?? 10;
  if (opts?.advance !== false) ensureSpace(ctx, size + 8);
  ctx.page.drawText(text, {
    x: opts?.x ?? ctx.margin,
    y: ctx.y,
    size,
    font: opts?.bold ? ctx.fontBold : ctx.font,
    color: opts?.color ?? rgb(0.25, 0.3, 0.28),
  });
  if (opts?.advance !== false) ctx.y -= size + 5;
}

function drawRightAt(
  ctx: DrawCtx,
  text: string,
  rightX: number,
  y: number,
  opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
) {
  const size = opts?.size ?? 10;
  const font = opts?.bold ? ctx.fontBold : ctx.font;
  const w = font.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: rightX - w,
    y,
    size,
    font,
    color: opts?.color ?? rgb(0.25, 0.3, 0.28),
  });
}

function drawRightBlockLine(
  ctx: DrawCtx,
  lines: string[],
  rightX: number,
  startY: number,
  opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; gap?: number }
): number {
  const size = opts?.size ?? 9;
  const gap = opts?.gap ?? size + 4;
  let y = startY;
  for (const line of lines) {
    if (!line) continue;
    drawRightAt(ctx, line, rightX, y, {
      bold: opts?.bold,
      size,
      color: opts?.color,
    });
    y -= gap;
  }
  return y;
}

/** Gemeinsames Partner-Dokument (Angebot | Rechnung) — Briefkopf + rechtsbündige Beträge. */
export async function generatePartnerDokumentPdf(
  input: PartnerAngebotPdfInput | PartnerRechnungPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.1, 0.24, 0.17);
  const gray = rgb(0.35, 0.42, 0.39);
  const muted = rgb(0.45, 0.5, 0.48);
  const ctx: DrawCtx = { pdf, page, font, fontBold, y: PAGE_H - 62, margin: MARGIN };

  const isRechnung = input.docArt === "rechnung";
  const a = input.absender;
  const e = input.empfaenger;
  const logo = await embedLogo(pdf, input.logoBytes);

  // ── Kopf: Empfänger links | Logo + Absender + Meta rechts ──
  const headTop = ctx.y;
  let rightY = headTop;

  if (logo) {
    logo.draw(ctx.page, CONTENT_RIGHT - logo.width, rightY - logo.height + 4);
    rightY -= logo.height + 10;
  }

  const absLines: string[] = [a.firma || "Handwerksbetrieb"];
  const adr = absenderAdresse(a);
  if (adr) absLines.push(adr);
  if (a.inhaber?.trim()) absLines.push(`Inhaber: ${a.inhaber.trim()}`);
  if (a.telefon?.trim()) absLines.push(`Tel. ${a.telefon.trim()}`);
  if (a.email?.trim()) absLines.push(a.email.trim());
  rightY = drawRightBlockLine(ctx, absLines, CONTENT_RIGHT, rightY, {
    size: 8,
    color: gray,
    gap: 11,
  });
  rightY -= 8;

  const metaLines: string[] = [
    `${isRechnung ? "Rechnungsnr." : "Angebotsnr."}: ${input.dokumentNr}`,
    `Datum: ${fmtDatum(input.datum)}`,
  ];
  if (isRechnung && input.leistungsZeitraum) {
    metaLines.push(`Leistungszeitraum: ${input.leistungsZeitraum}`);
  }
  if (isRechnung && input.auftragsRef) {
    metaLines.push(`Referenz: ${input.auftragsRef}`);
  }
  if (!isRechnung && input.gueltigTage) {
    metaLines.push(`Gültig ${input.gueltigTage} Tage ab Datum`);
  }
  rightY = drawRightBlockLine(ctx, metaLines, CONTENT_RIGHT, rightY, {
    size: 9,
    color: gray,
    gap: 12,
  });

  // Links: Dokumenttitel + Empfänger
  let leftY = headTop;
  ctx.page.drawText(isRechnung ? "RECHNUNG" : "ANGEBOT", {
    x: MARGIN,
    y: leftY,
    size: 16,
    font: fontBold,
    color: green,
  });
  leftY -= 22;

  ctx.page.drawText("Empfänger", {
    x: MARGIN,
    y: leftY,
    size: 9,
    font: fontBold,
    color: green,
  });
  leftY -= 13;
  for (const line of [e.firma, e.strasse, e.plzOrt].filter(Boolean)) {
    ctx.page.drawText(line, {
      x: MARGIN,
      y: leftY,
      size: 10,
      font,
      color: gray,
    });
    leftY -= 13;
  }

  ctx.y = Math.min(leftY, rightY) - 14;

  // Betreff (volle Breite, links)
  drawLeft(ctx, `Betreff: ${input.betreff}`, { bold: true, size: 11 });
  if (input.objektOrt?.trim()) {
    drawLeft(ctx, `Objekt / Ort: ${input.objektOrt.trim()}`, { size: 10 });
  }
  ctx.y -= 8;

  // Tabellenkopf
  ensureSpace(ctx, 40);
  ctx.page.drawText("Pos.", {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: fontBold,
    color: green,
  });
  ctx.page.drawText("Leistung", {
    x: MARGIN + 28,
    y: ctx.y,
    size: 9,
    font: fontBold,
    color: green,
  });
  drawRightAt(ctx, "Netto", COL_AMOUNT_RIGHT, ctx.y, {
    bold: true,
    size: 9,
    color: green,
  });
  ctx.y -= 14;

  let nettoSum = 0;
  let mwstSum = 0;
  const ku = Boolean(a.kleinunternehmer);

  input.positionen.forEach((p, i) => {
    ensureSpace(ctx, 36);
    const netto = Number.isFinite(p.netto) ? p.netto : 0;
    const mwstSatz = ku ? 0 : p.mwstSatz || 19;
    nettoSum += netto;
    mwstSum += (netto * mwstSatz) / 100;

    const rowY = ctx.y;
    ctx.page.drawText(String(i + 1), {
      x: MARGIN,
      y: rowY,
      size: 9,
      font,
      color: gray,
    });

    const mengeHint =
      p.menge != null && p.einheit
        ? ` · ${p.menge} ${p.einheit}`
        : p.menge != null
          ? ` · ${p.menge}`
          : "";
    const titleLines = wrapText(
      `${p.titel || "Leistung"}${mengeHint}`,
      COL_LEISTUNG_MAX
    );
    titleLines.forEach((line, li) => {
      ctx.page.drawText(line, {
        x: MARGIN + 28,
        y: rowY - li * 11,
        size: 9,
        font,
        color: gray,
      });
    });
    drawRightAt(ctx, fmtEur(netto), COL_AMOUNT_RIGHT, rowY, {
      size: 9,
      color: gray,
    });
    ctx.y -= Math.max(16, titleLines.length * 11 + 4);

    if (p.beschreibung?.trim()) {
      for (const line of wrapText(p.beschreibung.trim(), 70)) {
        ensureSpace(ctx, 14);
        ctx.page.drawText(line, {
          x: MARGIN + 28,
          y: ctx.y,
          size: 8,
          font,
          color: muted,
        });
        ctx.y -= 11;
      }
    }
  });

  // Summenblock rechts
  ctx.y -= 10;
  ensureSpace(ctx, 90);
  const sumLabelX = 340;
  const drawSumRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
  ) => {
    const size = opts?.size ?? 10;
    ensureSpace(ctx, size + 8);
    ctx.page.drawText(label, {
      x: sumLabelX,
      y: ctx.y,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ?? gray,
    });
    drawRightAt(ctx, value, COL_AMOUNT_RIGHT, ctx.y, {
      bold: opts?.bold,
      size,
      color: opts?.color ?? gray,
    });
    ctx.y -= size + 6;
  };

  drawSumRow("Summe netto", fmtEur(nettoSum), { bold: true, size: 11 });
  if (ku) {
    drawSumRow("MwSt. (§19 UStG)", "0,00 €", { size: 10 });
    drawSumRow("Gesamt", fmtEur(nettoSum), {
      bold: true,
      size: 12,
      color: green,
    });
  } else {
    drawSumRow("MwSt.", fmtEur(mwstSum), { size: 10 });
    drawSumRow("Brutto", fmtEur(nettoSum + mwstSum), {
      bold: true,
      size: 12,
      color: green,
    });
  }

  if (isRechnung) {
    ctx.y -= 12;
    drawLeft(ctx, "Zahlungsinformationen", { bold: true, size: 10, color: green });
    if (a.iban?.trim()) drawLeft(ctx, `IBAN: ${a.iban.trim()}`, { size: 10 });
    if (a.bic?.trim()) drawLeft(ctx, `BIC: ${a.bic.trim()}`, { size: 9 });
    if (a.bank?.trim()) drawLeft(ctx, `Bank: ${a.bank.trim()}`, { size: 9 });
    drawLeft(ctx, `Verwendungszweck: ${input.dokumentNr}`, { size: 9 });
    if (input.abnahmeHinweis?.trim()) {
      ctx.y -= 4;
      drawLeft(ctx, input.abnahmeHinweis.trim(), { size: 8 });
    }
  }

  ctx.y -= 14;
  const fuss: string[] = [];
  if (a.steuernummer?.trim()) fuss.push(`Steuernr.: ${a.steuernummer.trim()}`);
  if (a.ustid?.trim()) fuss.push(`USt-IdNr.: ${a.ustid.trim()}`);
  if (a.handelsregister?.trim()) fuss.push(`HR: ${a.handelsregister.trim()}`);
  if (ku) {
    fuss.push(
      "Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung)."
    );
  }
  for (const line of fuss) {
    drawLeft(ctx, line, { size: 8, color: muted });
  }

  return pdf.save();
}

export function sumPartnerDocNetto(positionen: PartnerDocPosition[]): number {
  return positionen.reduce((s, p) => s + (Number.isFinite(p.netto) ? p.netto : 0), 0);
}

export function formatPartnerRechnungsNr(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

export function formatPartnerAngebotsNr(prefix: string, isoDate: string): string {
  const d = isoDate.slice(0, 10).replace(/-/g, "");
  const short = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "HW";
  return `A-${short}-${d}`;
}
