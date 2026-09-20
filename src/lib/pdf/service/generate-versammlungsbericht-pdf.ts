import { readFileSync } from "fs";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatDatum, formatEuro } from "@/lib/format/geld-datum";

/** Payload vom Portal (kein DB-Load im PDF-Service). */
export type VersammlungsberichtPdfVorgang = {
  datum: string;
  titel: string;
  einheitLabel: string | null;
  anlageLabel: string | null;
  gewerkLabel: string | null;
  statusLabel: string;
  kostenLabel: string;
  kostenEuro: number | null;
};

export type VersammlungsberichtPdfPayload = {
  orgName: string;
  objektTitel: string;
  objektAdresse: string;
  zeitraumVon: string;
  zeitraumBis: string;
  erstelltAm: string;
  einzelpreise: boolean;
  vorgaengeImZeitraum: VersammlungsberichtPdfVorgang[];
  vorgaengeOffen: VersammlungsberichtPdfVorgang[];
  anlagenHighlights: Array<{
    bezeichnung: string;
    vorgangCount: number;
    kostenSumme: number;
  }>;
  gesamtKosten: number;
  ohneKostenAngabe: number;
  nachGewerk: Array<{ gewerk: string; count: number; summe: number }>;
  leererZeitraum: boolean;
  keineAnlagen: boolean;
};

/**
 * Versammlungsbericht / Objektbericht — Design an Angebots-PDF angelehnt:
 * Accent var(--p2-primary-dk), Bärenwald-Logo (Service-Dokument für die HV),
 * Deckblatt → Kennzahlen → Gewerk → Maßnahmen → Anlagen → Offen.
 */

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

const ACCENT = rgb(0.102, 0.239, 0.169); // var(--p2-primary-dk)
const TEXT = rgb(0.067, 0.067, 0.067);
const MUTED = rgb(0.42, 0.45, 0.44);
const LINE = rgb(0.82, 0.84, 0.82);
const SOFT = rgb(0.953, 0.969, 0.957); // #F3F7F4
const ZEBRA = rgb(0.97, 0.97, 0.96);

function fmtDatum(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const formatted = formatDatum(iso.length <= 10 ? iso : iso.slice(0, 10));
  return formatted === "—" ? iso.slice(0, 10) : formatted;
}

function fmtEuro(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return formatEuro(Math.round(n), { decimals: 0 });
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

function cell(v: string | null | undefined): string {
  return v?.trim() || "—";
}

function loadBwLogoBytes(): Uint8Array | null {
  for (const name of [
    "brand/logo-mark-green-on-white.png",
    "brand/logo-mark-green.png",
    "brand/mail-logo-green.png",
  ]) {
    try {
      const p = join(process.cwd(), "public", name);
      return new Uint8Array(readFileSync(p));
    } catch {
      /* next */
    }
  }
  return null;
}

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  pageIndex: number;
  objektTitel: string;
  zeitraumLabel: string;
};

function drawRunningFooter(ctx: DrawCtx) {
  ctx.page.drawLine({
    start: { x: MARGIN, y: 48 },
    end: { x: PAGE_W - MARGIN, y: 48 },
    thickness: 0.5,
    color: LINE,
  });
  const left = `${ctx.objektTitel} · Objektbericht`.slice(0, 55);
  ctx.page.drawText(left, {
    x: MARGIN,
    y: 34,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  const right = ctx.zeitraumLabel;
  const rw = ctx.font.widthOfTextAtSize(right, 8);
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - rw,
    y: 34,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

function newPage(ctx: DrawCtx) {
  if (ctx.pageIndex > 0) drawRunningFooter(ctx);
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pageIndex += 1;
  ctx.y = PAGE_H - 56;
  if (ctx.pageIndex > 1) {
    // running head
    ctx.page.drawText(ctx.objektTitel.slice(0, 40), {
      x: MARGIN,
      y: PAGE_H - 36,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
    const right = ctx.zeitraumLabel;
    const rw = ctx.font.widthOfTextAtSize(right, 8);
    ctx.page.drawText(right, {
      x: PAGE_W - MARGIN - rw,
      y: PAGE_H - 36,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
    ctx.page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 42 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - 42 },
      thickness: 0.5,
      color: LINE,
    });
    ctx.y = PAGE_H - 58;
  }
}

function ensureSpace(ctx: DrawCtx, need: number) {
  if (ctx.y < need) newPage(ctx);
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    color?: ReturnType<typeof rgb>;
    x?: number;
    max?: number;
  }
) {
  const size = opts?.size ?? 10;
  ensureSpace(ctx, size + 28);
  ctx.page.drawText(text.slice(0, opts?.max ?? 110), {
    x: opts?.x ?? MARGIN,
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
  opts?: { size?: number; color?: ReturnType<typeof rgb>; max?: number }
) {
  for (const ln of wrapText(text, opts?.max ?? 88)) {
    drawText(ctx, ln, {
      size: opts?.size ?? 10,
      color: opts?.color ?? TEXT,
    });
  }
}

function drawSection(ctx: DrawCtx, n: number, title: string) {
  ensureSpace(ctx, 44);
  ctx.y -= 6;
  drawText(ctx, `${n}. ${title}`, {
    bold: true,
    size: 12,
    color: ACCENT,
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 8 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 8 },
    thickness: 1.5,
    color: ACCENT,
  });
  ctx.y -= 8;
}

function drawKpiRow(
  ctx: DrawCtx,
  cells: Array<{ label: string; value: string }>
) {
  const rowH = 48;
  ensureSpace(ctx, rowH + 20);
  const top = ctx.y + 4;
  const bottom = top - rowH;
  const gap = 6;
  const colW = (CONTENT_W - gap * (cells.length - 1)) / cells.length;

  cells.forEach((c, i) => {
    const x = MARGIN + i * (colW + gap);
    ctx.page.drawRectangle({
      x,
      y: bottom,
      width: colW,
      height: rowH,
      color: SOFT,
      borderColor: LINE,
      borderWidth: 0.6,
    });
    const vw = ctx.fontBold.widthOfTextAtSize(c.value.slice(0, 16), 13);
    ctx.page.drawText(c.value.slice(0, 16), {
      x: x + (colW - vw) / 2,
      y: bottom + 22,
      size: 13,
      font: ctx.fontBold,
      color: ACCENT,
    });
    const lw = ctx.font.widthOfTextAtSize(c.label.slice(0, 22), 7);
    ctx.page.drawText(c.label.slice(0, 22), {
      x: x + (colW - lw) / 2,
      y: bottom + 8,
      size: 7,
      font: ctx.font,
      color: MUTED,
    });
  });
  ctx.y = bottom - 14;
}

function drawTableHeader(ctx: DrawCtx, cols: Array<{ label: string; x: number }>) {
  ensureSpace(ctx, 28);
  for (const c of cols) {
    ctx.page.drawText(c.label, {
      x: c.x,
      y: ctx.y,
      size: 8,
      font: ctx.fontBold,
      color: MUTED,
    });
  }
  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.75,
    color: LINE,
  });
  ctx.y -= 12;
}

async function embedLogo(
  pdf: PDFDocument
): Promise<{
  width: number;
  height: number;
  draw: (page: PDFPage, x: number, y: number) => void;
} | null> {
  const bytes = loadBwLogoBytes();
  if (!bytes?.length) return null;
  try {
    const img = await pdf.embedPng(bytes);
    const maxW = 120;
    const maxH = 36;
    const scale = Math.min(maxW / img.width, maxH / img.height);
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

/** Versammlungsbericht — Angebots-Look, Bärenwald-Logo, klare Kapitel. */
export async function generateVersammlungsberichtPdf(
  p: VersammlungsberichtPdfPayload
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);

  const zeitraumLabel = `${fmtDatum(p.zeitraumVon)} – ${fmtDatum(p.zeitraumBis)}`;
  const erstelltAm = fmtDatum(p.erstelltAm);
  const abgeschlossen = p.vorgaengeImZeitraum.length - p.vorgaengeOffen.length;

  const ctx: DrawCtx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    fontBold,
    y: PAGE_H - 56,
    pageIndex: 1,
    objektTitel: p.objektTitel,
    zeitraumLabel,
  };

  // ── Deckblatt ─────────────────────────────────────────────
  if (logo) {
    logo.draw(ctx.page, MARGIN, ctx.y - logo.height + 8);
    ctx.y -= logo.height + 18;
  } else {
    drawText(ctx, "Bärenwald", { bold: true, size: 14, color: ACCENT });
    ctx.y -= 8;
  }

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 2,
    color: ACCENT,
  });
  ctx.y -= 28;

  drawText(ctx, "OBJEKTBERICHT", { bold: true, size: 9, color: MUTED });
  ctx.y += 2;
  drawText(ctx, "Instandhaltung & Reparaturen", {
    bold: true,
    size: 11,
    color: ACCENT,
  });
  ctx.y -= 6;

  for (const ln of wrapText(p.objektAdresse || p.objektTitel, 42)) {
    drawText(ctx, ln, { bold: true, size: 18, color: TEXT, max: 48 });
  }
  ctx.y -= 8;

  drawText(ctx, `Berichtszeitraum: ${zeitraumLabel}`, {
    size: 11,
    color: TEXT,
  });
  ctx.y -= 10;

  ctx.page.drawLine({
    start: { x: MARGIN + CONTENT_W * 0.2, y: ctx.y },
    end: { x: MARGIN + CONTENT_W * 0.8, y: ctx.y },
    thickness: 0.5,
    color: LINE,
  });
  ctx.y -= 16;

  drawText(ctx, "Erstellt für die Eigentümerversammlung", {
    size: 10,
    color: MUTED,
  });
  drawText(ctx, p.orgName, { bold: true, size: 11, color: TEXT });
  drawText(ctx, `Erstellt am: ${erstelltAm}`, { size: 10, color: MUTED });
  ctx.y -= 20;

  drawText(ctx, "Inhalt", { bold: true, size: 9, color: MUTED });
  const toc = [
    "1. Zusammenfassung",
    "2. Kosten nach Gewerk",
    "3. Maßnahmen im Berichtszeitraum",
    "4. Anlagen mit auffälliger Historie",
    "5. Offene und laufende Maßnahmen",
  ];
  for (const t of toc) {
    drawText(ctx, t, { size: 10, color: TEXT });
  }

  ctx.y = 72;
  drawText(ctx, "Ein Service von Bärenwald", {
    size: 8,
    color: MUTED,
  });

  // ── 1. Zusammenfassung ────────────────────────────────────
  newPage(ctx);
  drawSection(ctx, 1, "Zusammenfassung");

  drawKpiRow(ctx, [
    { label: "Maßnahmen", value: String(p.vorgaengeImZeitraum.length) },
    { label: "Gesamtkosten", value: fmtEuro(p.gesamtKosten) },
    { label: "Abgeschlossen", value: String(Math.max(0, abgeschlossen)) },
    { label: "Offen / laufend", value: String(p.vorgaengeOffen.length) },
  ]);

  if (p.ohneKostenAngabe > 0) {
    drawText(
      ctx,
      `davon ${p.ohneKostenAngabe} Maßnahme${p.ohneKostenAngabe === 1 ? "" : "n"} ohne Kostenangabe`,
      { size: 9, color: MUTED }
    );
  }

  if (p.leererZeitraum) {
    ensureSpace(ctx, 40);
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 28,
      width: CONTENT_W,
      height: 36,
      color: SOFT,
      borderColor: LINE,
      borderWidth: 0.5,
    });
    ctx.y -= 10;
    drawText(ctx, "Keine Maßnahmen im gewählten Zeitraum.", {
      size: 10,
      color: MUTED,
    });
    ctx.y -= 10;
  }

  const hinweise: string[] = [];
  for (const h of p.anlagenHighlights.slice(0, 3)) {
    hinweise.push(
      `Anlage „${h.bezeichnung}“: ${h.vorgangCount}× im Zeitraum (${fmtEuro(h.kostenSumme)}).`
    );
  }
  if (p.nachGewerk[0]?.summe) {
    const top = p.nachGewerk[0];
    hinweise.push(
      `Schwerpunkt Gewerk: ${top.gewerk} · ${fmtEuro(top.summe)} (${top.count} Maßnahme${top.count === 1 ? "" : "n"}).`
    );
  }
  if (hinweise.length) {
    ctx.y -= 4;
    drawText(ctx, "Auffälligkeiten", { bold: true, size: 10, color: ACCENT });
    for (const h of hinweise) drawWrapped(ctx, `• ${h}`, { size: 9, color: MUTED, max: 92 });
  }

  // ── 2. Kosten nach Gewerk ─────────────────────────────────
  drawSection(ctx, 2, "Kosten nach Gewerk");
  if (!p.nachGewerk.length) {
    drawText(ctx, "Im Zeitraum liegen keine Kosten nach Gewerk vor.", {
      size: 10,
      color: MUTED,
    });
  } else {
    const max = Math.max(...p.nachGewerk.map((g) => g.summe), 1);
    for (const g of p.nachGewerk) {
      ensureSpace(ctx, 28);
      drawText(ctx, g.gewerk, { bold: true, size: 9, color: TEXT });
      const barMax = CONTENT_W - 90;
      const barW = Math.max(8, Math.round((g.summe / max) * barMax));
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - 2,
        width: barMax,
        height: 8,
        color: SOFT,
        borderColor: LINE,
        borderWidth: 0.4,
      });
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - 2,
        width: barW,
        height: 8,
        color: ACCENT,
      });
      const val = `${g.count}× · ${fmtEuro(g.summe)}`;
      const vw = ctx.font.widthOfTextAtSize(val, 8);
      ctx.page.drawText(val, {
        x: PAGE_W - MARGIN - vw,
        y: ctx.y,
        size: 8,
        font: ctx.font,
        color: MUTED,
      });
      ctx.y -= 18;
    }
    ctx.y -= 2;
    drawText(ctx, `Summe: ${fmtEuro(p.gesamtKosten)}`, {
      bold: true,
      size: 10,
      color: TEXT,
    });
  }

  // ── 3. Maßnahmen ──────────────────────────────────────────
  drawSection(ctx, 3, "Maßnahmen im Berichtszeitraum");
  const rows = [...p.vorgaengeImZeitraum].sort((a, b) =>
    a.datum.localeCompare(b.datum)
  );

  if (!rows.length) {
    drawText(ctx, "Im gewählten Zeitraum wurden keine Maßnahmen durchgeführt.", {
      size: 10,
      color: MUTED,
    });
  } else {
    drawTableHeader(ctx, [
      { label: "DATUM", x: MARGIN },
      { label: "MAßNAHME", x: MARGIN + 58 },
      { label: "STATUS", x: MARGIN + 320 },
      ...(p.einzelpreise ? [{ label: "KOSTEN", x: MARGIN + 400 }] : []),
    ]);

    rows.forEach((r, i) => {
      ensureSpace(ctx, 36);
      if (i % 2 === 1) {
        ctx.page.drawRectangle({
          x: MARGIN,
          y: ctx.y - 4,
          width: CONTENT_W,
          height: 28,
          color: ZEBRA,
        });
      }
      const rowY = ctx.y;
      ctx.page.drawText(fmtDatum(r.datum), {
        x: MARGIN,
        y: rowY,
        size: 8,
        font,
        color: MUTED,
      });
      const titel = cell(r.titel);
      const sub = [cell(r.einheitLabel), cell(r.anlageLabel), cell(r.gewerkLabel)]
        .filter((x) => x !== "—")
        .join(" · ");
      ctx.page.drawText(titel.slice(0, 42), {
        x: MARGIN + 58,
        y: rowY,
        size: 9,
        font: fontBold,
        color: TEXT,
      });
      if (sub) {
        ctx.page.drawText(sub.slice(0, 55), {
          x: MARGIN + 58,
          y: rowY - 11,
          size: 7.5,
          font,
          color: MUTED,
        });
      }
      ctx.page.drawText(r.statusLabel.slice(0, 14), {
        x: MARGIN + 320,
        y: rowY,
        size: 8,
        font,
        color: MUTED,
      });
      if (p.einzelpreise) {
        const k =
          r.kostenEuro != null ? fmtEuro(r.kostenEuro) : r.kostenLabel || "offen";
        const kw = font.widthOfTextAtSize(k, 8);
        ctx.page.drawText(k, {
          x: PAGE_W - MARGIN - kw,
          y: rowY,
          size: 8,
          font,
          color: MUTED,
        });
      }
      ctx.y -= 30;
    });

    ctx.y -= 4;
    drawText(
      ctx,
      `Summe ${rows.length} Maßnahme${rows.length === 1 ? "" : "n"}: ${fmtEuro(p.gesamtKosten)}`,
      { bold: true, size: 9, color: TEXT }
    );
    if (p.einzelpreise) {
      drawText(
        ctx,
        "* Kosten laut Schlussrechnung; wo noch keine Rechnung vorliegt, Auftragswert.",
        { size: 7.5, color: MUTED }
      );
    }
  }

  // ── 4. Anlagen ────────────────────────────────────────────
  drawSection(ctx, 4, "Anlagen mit auffälliger Historie");
  if (p.keineAnlagen) {
    drawText(ctx, "Für dieses Objekt sind noch keine Anlagen erfasst.", {
      size: 10,
      color: MUTED,
    });
  } else if (!p.anlagenHighlights.length) {
    drawText(ctx, "Keine Anlage mit mehr als einer Maßnahme im Zeitraum.", {
      size: 10,
      color: MUTED,
    });
  } else {
    for (const a of p.anlagenHighlights) {
      ensureSpace(ctx, 36);
      drawText(ctx, a.bezeichnung, { bold: true, size: 10, color: ACCENT });
      drawText(
        ctx,
        `${a.vorgangCount} Vorgänge · ${fmtEuro(a.kostenSumme)}`,
        { size: 9, color: MUTED }
      );
      ctx.y -= 4;
    }
  }

  // ── 5. Offen ──────────────────────────────────────────────
  drawSection(ctx, 5, "Offene und laufende Maßnahmen");
  if (!p.vorgaengeOffen.length) {
    drawText(ctx, "Derzeit keine offenen Maßnahmen.", {
      size: 10,
      color: MUTED,
    });
  } else {
    for (const r of p.vorgaengeOffen) {
      ensureSpace(ctx, 32);
      drawText(ctx, `${fmtDatum(r.datum)} — ${cell(r.titel)}`, {
        bold: true,
        size: 9,
        color: TEXT,
      });
      drawText(
        ctx,
        [cell(r.einheitLabel), cell(r.anlageLabel), cell(r.gewerkLabel), r.statusLabel]
          .filter((x) => x !== "—")
          .join(" · "),
        { size: 8, color: MUTED }
      );
      ctx.y -= 2;
    }
  }

  // Abbinder
  ctx.y -= 12;
  ensureSpace(ctx, 70);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: LINE,
  });
  ctx.y -= 14;
  drawWrapped(
    ctx,
    "Dieser Bericht wurde automatisch aus der Objektdokumentation erstellt. Maßnahmen sind mit Fotos, Protokollen und Rechnungen hinterlegt und können bei der Verwaltung eingesehen werden.",
    { size: 8, color: MUTED, max: 95 }
  );
  ctx.y -= 4;
  drawText(ctx, p.orgName, { bold: true, size: 9, color: TEXT });
  drawText(ctx, "Ein Service von Bärenwald", { size: 8, color: MUTED });

  drawRunningFooter(ctx);
  return pdf.save();
}
