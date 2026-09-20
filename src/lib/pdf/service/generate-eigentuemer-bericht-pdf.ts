import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatEuro } from "@/lib/format/geld-datum";

export type EigentuemerBerichtInput = {
  orgName: string;
  objektTitel: string;
  objektAdresse?: string;
  jahr: number;
  bruttoGesamt: number;
  nachTraeger: Record<string, number>;
  anzahlVorgaenge: number;
  anzahlRechnungen: number;
  pruefpflichtenFaellig: number;
};

function fmtEur(n: number): string {
  return formatEuro(n);
}

/** S12 Eigentümer-Jahresbericht (PDF). Enthält keine Mieternamen — nur Aggregat je Objekt. */
export async function generateEigentuemerBerichtPdf(
  input: EigentuemerBerichtInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.1, 0.24, 0.17);
  const gray = rgb(0.35, 0.42, 0.39);

  let y = 780;

  page.drawText(`Jahresbericht ${input.jahr}`, {
    x: 48,
    y,
    size: 22,
    font: fontBold,
    color: green,
  });
  y -= 28;

  page.drawText(input.orgName, { x: 48, y, size: 12, font: fontBold, color: green });
  y -= 18;
  page.drawText(input.objektTitel, { x: 48, y, size: 11, font, color: gray });
  y -= 14;
  if (input.objektAdresse) {
    page.drawText(input.objektAdresse, { x: 48, y, size: 10, font, color: gray });
    y -= 24;
  } else {
    y -= 10;
  }

  const lines = [
    `Gesamtkosten ${input.jahr}: ${fmtEur(input.bruttoGesamt)}`,
    `Rechnungen: ${input.anzahlRechnungen}`,
    `Vorgänge (offen + abgeschlossen): ${input.anzahlVorgaenge}`,
    `Prüfpflichten fällig: ${input.pruefpflichtenFaellig}`,
  ];

  for (const line of lines) {
    page.drawText(line, { x: 48, y, size: 12, font, color: green });
    y -= 20;
  }

  y -= 8;
  page.drawText("Kosten nach Kostenträger", {
    x: 48,
    y,
    size: 13,
    font: fontBold,
    color: green,
  });
  y -= 20;

  const traeger = Object.entries(input.nachTraeger);
  if (traeger.length === 0) {
    page.drawText("Keine Rechnungen im Berichtsjahr.", {
      x: 48,
      y,
      size: 11,
      font,
      color: gray,
    });
  } else {
    for (const [key, val] of traeger) {
      page.drawText(`${key}: ${fmtEur(val)}`, { x: 56, y, size: 11, font, color: gray });
      y -= 16;
    }
  }

  y = 80;
  page.drawText("Ein Service von Bärenwald", {
    x: 48,
    y,
    size: 8,
    font,
    color: gray,
  });

  return pdf.save();
}
