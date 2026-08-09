import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  selbstbehaltEur?: number | null;
};

const green = rgb(0.1, 0.24, 0.17);
const gray = rgb(0.35, 0.42, 0.39);
const margin = 48;

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

/** Schadenakte Versicherung — Familie Eigentümerbericht/Abnahme (Helvetica-grün). */
export async function generateVersicherungsaktePdf(
  input: VersicherungsaktePdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;
  const schadenNr =
    input.schadenNr?.trim() ||
    input.versicherungsNr?.trim() ||
    "ohne Nr.";

  const ensureSpace = (need: number) => {
    if (y < need) {
      page.drawText(`Schaden-Nr. ${schadenNr}`, {
        x: margin,
        y: 36,
        size: 8,
        font,
        color: gray,
      });
      page = pdf.addPage([595, 842]);
      y = 780;
    }
  };

  const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 11;
    ensureSpace(60);
    page.drawText(text.slice(0, 110), {
      x: margin,
      y,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.bold ? green : gray,
    });
    y -= size + 6;
  };

  const drawParagraph = (label: string, body: string) => {
    ensureSpace(80);
    page.drawText(label, { x: margin, y, size: 12, font: fontBold, color: green });
    y -= 18;
    for (const line of wrapText(body || "—", 88)) {
      ensureSpace(60);
      page.drawText(line, { x: margin, y, size: 10, font, color: gray });
      y -= 14;
    }
    y -= 8;
  };

  page.drawText("Schadenakte Versicherung", {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: green,
  });
  y -= 28;

  drawLine(input.orgName, { bold: true, size: 12 });
  drawLine(input.objektTitel, { bold: true, size: 11 });
  if (input.objektAdresse) drawLine(input.objektAdresse, { size: 10 });
  y -= 4;

  drawLine(`Policen- / Versicherungs-Nr.: ${input.versicherungsNr?.trim() || "—"}`);
  drawLine(`Schaden-Nr.: ${schadenNr}`);
  drawLine(`Schadendatum: ${fmtDatum(input.schadendatum)}`);
  if (input.kostentraegerLabel) {
    drawLine(`Kostenträger: ${input.kostentraegerLabel}`);
  }
  if (input.selbstbehaltEur != null && Number.isFinite(input.selbstbehaltEur)) {
    drawLine(
      `Selbstbehalt: ${new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(input.selbstbehaltEur)}`
    );
  }
  y -= 6;

  page.drawText("Inhaltsverzeichnis", {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: green,
  });
  y -= 18;
  const toc = [
    "1. Deckblatt",
    "2. Schadenhergang",
    "3. Chronologie / Erstmaßnahmen",
    "4. Befund / Leckortung",
    "5. Abnahme",
    "6. Rechnung",
  ];
  for (const t of toc) drawLine(t, { size: 10 });
  y -= 8;

  drawParagraph(
    "2. Schadenhergang",
    input.hergang?.trim() ||
      "Aus den Vorgangsdaten zusammengestellt — bitte vor Einreichung prüfen."
  );

  ensureSpace(80);
  page.drawText("3. Chronologie / Erstmaßnahmen", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: green,
  });
  y -= 18;
  if (input.chronologie.length === 0) {
    drawLine("Keine Chronologie-Einträge hinterlegt.", { size: 10 });
  } else {
    for (const c of input.chronologie) {
      drawLine(`${fmtDatum(c.datum)} — ${c.text}`, { size: 10 });
    }
  }
  y -= 8;

  ensureSpace(80);
  page.drawText("4. Befund / Leckortung", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: green,
  });
  y -= 18;
  if (input.befundZeilen.length === 0) {
    drawLine("Noch kein Partner-Befund hinterlegt.", { size: 10 });
  } else {
    for (const b of input.befundZeilen) {
      drawLine(`${fmtDatum(b.datum)} — ${b.titel}`, { bold: true, size: 10 });
      for (const line of wrapText(b.text || "—", 88)) {
        drawLine(line, { size: 10 });
      }
      drawLine(
        b.fotoCount > 0
          ? `Fotos: ${b.fotoCount} Anhang/Anhänge (siehe Vorgang)`
          : "Fotos: —",
        { size: 9 }
      );
      y -= 4;
    }
  }
  y -= 8;

  drawParagraph(
    "5. Abnahme",
    input.abnahmeHinweis?.trim() || "Abnahme noch ausstehend bzw. nicht erforderlich."
  );
  drawParagraph(
    "6. Rechnung",
    input.rechnungHinweis?.trim() ||
      "Rechnung folgt bzw. ist als separates Dokument im Vorgang abgelegt."
  );

  page.drawText("Erstellt über Bärenwald Hausverwaltungs-Plattform", {
    x: margin,
    y: 52,
    size: 9,
    font,
    color: gray,
  });
  page.drawText(`Schaden-Nr. ${schadenNr}`, {
    x: margin,
    y: 36,
    size: 8,
    font,
    color: gray,
  });

  return pdf.save();
}
