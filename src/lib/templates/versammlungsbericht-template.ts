/**
 * Objektbericht / Versammlungsbericht — HTML für PDF.
 * Design 1:1 an Angebot/Abnahme: Accent #1A3D2B, Soft-Tint, Bärenwald-Logo, nummerierte Sektionen.
 */

import {
  buildVersammlungsberichtViewModel,
  esc,
  LINE,
  TEXT,
  TEXT_MUTED,
  VERSAMMLUNG_ACCENT,
  VERSAMMLUNG_TINT,
  ZEBRA,
  type VersammlungsberichtViewModel,
} from '@/lib/objektakte/build-versammlungsbericht-view-model'
import type { VersammlungsberichtPayload } from '@/lib/objektakte/load-versammlungsbericht-data'

const ACCENT = VERSAMMLUNG_ACCENT
const TINT = VERSAMMLUNG_TINT

function leerBox(text: string): string {
  return `<div class="leer-box">${esc(text)}</div>`
}

function statusDot(done: boolean): string {
  const cls = done ? 'dot dot--done' : 'dot dot--open'
  return `<span class="${cls}" aria-hidden="true"></span>`
}

function sectionHead(n: number, title: string, vm: VersammlungsberichtViewModel): string {
  return `<div class="running-head"><span>${esc(vm.objektTitel)}</span><span>${esc(vm.zeitraumLabel)}</span></div>
    <h2 class="section-title"><span class="section-num">${n}.</span> ${esc(title)}</h2>`
}

function buildCover(vm: VersammlungsberichtViewModel): string {
  const toc = [
    '1. Zusammenfassung',
    '2. Kosten nach Gewerk',
    '3. Maßnahmen im Berichtszeitraum',
    '4. Anlagen & Teile',
    '5. Offene und laufende Maßnahmen',
  ]
  return `<section class="cover page-break-after">
    <div class="logo-band">${vm.orgLogoHtml}</div>
    <div class="cover-body">
      <p class="cover-kicker">Objektbericht</p>
      <p class="cover-sub">Instandhaltung &amp; Reparaturen</p>
      <h1 class="cover-objekt">${esc(vm.objektAdresse || vm.objektTitel)}</h1>
      <p class="cover-range">Berichtszeitraum: ${esc(vm.zeitraumLabel)}</p>
      <hr class="cover-rule" />
      <p class="cover-meta">Erstellt für die Eigentümerversammlung</p>
      <p class="cover-meta cover-meta--strong">${esc(vm.orgName)}</p>
      <p class="cover-meta">Erstellt am: ${esc(vm.erstelltAmLabel)}</p>
      <p class="cover-meta">Erstellt mit Bärenwald</p>
    </div>
    <div class="cover-toc">
      <p class="cover-toc-title">Inhalt</p>
      <ol class="cover-toc-list">${toc.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    </div>
  </section>`
}

function buildZusammenfassung(vm: VersammlungsberichtViewModel): string {
  const k = vm.kennzahlen
  const ohneHinweis =
    k.ohneKostenAngabe > 0
      ? `<p class="kpi-sub">davon ${k.ohneKostenAngabe} Maßnahme${k.ohneKostenAngabe === 1 ? '' : 'n'} ohne Kostenangabe</p>`
      : ''

  const katRows = vm.kategorieZeilen
    .map(
      (z) =>
        `<tr><td>${esc(z.art)}</td><td class="num">${z.anzahl}</td><td class="num">${esc(z.kostenLabel)}</td><td class="num">${esc(z.anteilLabel)}</td></tr>`
    )
    .join('')

  const hinweiseBlock =
    vm.hinweise.length > 0
      ? `<div class="hint-box"><p class="hint-title">Auffälligkeiten</p><ul>${vm.hinweise.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>`
      : ''

  return `<section class="content-section page-break-before">
    ${sectionHead(1, 'Zusammenfassung', vm)}
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-val">${k.massnahmenGesamt}</div><div class="kpi-lbl">Maßnahmen gesamt</div></div>
      <div class="kpi-card"><div class="kpi-val tabular">${esc(k.gesamtKostenLabel)}</div><div class="kpi-lbl">Gesamtkosten</div>${ohneHinweis}</div>
      <div class="kpi-card"><div class="kpi-val">${k.abgeschlossen}</div><div class="kpi-lbl">Abgeschlossen</div></div>
      <div class="kpi-card"><div class="kpi-val">${k.offenLaufend}</div><div class="kpi-lbl">Offen / laufend</div></div>
    </div>
    <table class="data-table data-table--compact">
      <thead><tr><th>Art</th><th class="num">Anzahl</th><th class="num">Kosten</th><th class="num">Anteil</th></tr></thead>
      <tbody>${katRows}</tbody>
    </table>
    ${hinweiseBlock}
  </section>`
}

function buildGewerk(vm: VersammlungsberichtViewModel): string {
  const body = vm.gewerkLeer
    ? leerBox('Im gewählten Zeitraum liegen keine Kosten nach Gewerk vor.')
    : `${vm.gewerkBalken
        .map(
          (g) =>
            `<div class="bar-row">
              <div class="bar-label">${esc(g.gewerk)}</div>
              <div class="bar-track"><div class="bar-fill${g.isMax ? ' bar-fill--primary' : ''}" style="width:${g.barWidthPct}%;"></div></div>
              <div class="bar-val tabular">${esc(g.betragLabel)}</div>
            </div>`
        )
        .join('')}
       <div class="bar-sum tabular">Summe: ${esc(vm.gewerkSummeLabel)}</div>`

  return `<section class="content-section page-break-before">
    ${sectionHead(2, 'Kosten nach Gewerk', vm)}
    ${body}
  </section>`
}

function buildMassnahmen(vm: VersammlungsberichtViewModel): string {
  const kostenCol = vm.zeigeEinzelpreise ? `<th class="num">Kosten</th>` : ''
  const body = vm.massnahmenLeer
    ? leerBox('Im gewählten Zeitraum wurden keine Maßnahmen durchgeführt.')
    : `<table class="data-table massnahmen-table">
        <thead><tr>
          <th>Datum</th><th>Einheit</th><th>Anlage/Teil</th><th>Maßnahme</th><th>Gewerk</th><th>Status</th>${kostenCol}
        </tr></thead>
        <tbody>${vm.massnahmenZeilen
          .map((r, i) => {
            const kostenCell = vm.zeigeEinzelpreise
              ? `<td class="num tabular${r.kostenOffen ? ' kosten-offen' : ''}">${esc(r.kostenLabel)}</td>`
              : ''
            const gw = r.gewaehrleistungHinweis
              ? `<div class="sub-hint">${esc(r.gewaehrleistungHinweis)}</div>`
              : ''
            return `<tr class="${i % 2 === 1 ? 'zebra' : ''}">
              <td><div>${esc(r.datumLabel)}</div>${gw}</td>
              <td>${esc(r.einheit)}</td>
              <td>${esc(r.anlage)}</td>
              <td>${esc(r.titel)}</td>
              <td>${esc(r.gewerk)}</td>
              <td>${statusDot(r.statusDone)} ${esc(r.statusLabel)}</td>
              ${kostenCell}
            </tr>`
          })
          .join('')}</tbody>
        <tfoot><tr>
          <td colspan="${vm.zeigeEinzelpreise ? 7 : 6}" class="foot-note foot-sum">
            Summe ${vm.massnahmenZeilen.length} Maßnahme${vm.massnahmenZeilen.length === 1 ? '' : 'n'}: ${esc(vm.massnahmenSummeLabel)}${vm.zeigeEinzelpreise ? '<span class="foot-star"> *</span> Kosten laut Schlussrechnung; wo noch keine Rechnung vorliegt, Auftragswert.' : ''}
          </td>
        </tr></tfoot>
      </table>`

  return `<section class="content-section page-break-before">
    ${sectionHead(3, 'Maßnahmen im Berichtszeitraum', vm)}
    ${body}
  </section>`
}

function buildAnlagen(vm: VersammlungsberichtViewModel): string {
  let body = ''
  if (!vm.hatAnlagen) {
    body = leerBox('Für dieses Objekt sind noch keine Anlagen erfasst.')
  } else {
    const highlights =
      vm.anlagenHighlights.length > 0
        ? `<h3 class="sub-title">Anlagen mit auffälliger Historie</h3>
           ${vm.anlagenHighlights
             .map(
               (h) =>
                 `<div class="anlage-block avoid-break">
                   <p class="anlage-block-title">${esc(h.titel)} <span class="muted">(${esc(h.meta)})</span></p>
                   <p class="anlage-block-summary">${esc(h.summary)}</p>
                   <table class="data-table data-table--nested">
                     <tbody>${h.zeilen
                       .map(
                         (z) =>
                           `<tr><td class="col-date">${esc(z.datum)}</td><td>${esc(z.titel)}</td><td class="num tabular">${esc(z.kosten)}</td></tr>`
                       )
                       .join('')}</tbody>
                   </table>
                   ${h.fusszeile ? `<p class="anlage-block-foot${h.kostenUeberNeuwert ? ' anlage-block-foot--warn' : ''}">${esc(h.fusszeile)}</p>` : ''}
                 </div>`
             )
             .join('')}`
        : `<h3 class="sub-title">Anlagen mit auffälliger Historie</h3>${leerBox('Keine Anlage mit mehr als einer Maßnahme im Zeitraum.')}`

    const bestandRows = vm.anlagenBestand
      .map(
        (a, i) =>
          `<tr class="${i % 2 === 1 ? 'zebra' : ''}">
            <td>${esc(a.bezeichnung)}</td><td>${esc(a.gewerk)}</td><td>${esc(a.standortEinheit)}</td>
            <td>${esc(a.einbau)}</td><td>${esc(a.garantie)}</td><td class="num">${a.massnahmenImZeitraum}</td>
          </tr>`
      )
      .join('')

    body = `${highlights}
      <h3 class="sub-title">Anlagenbestand</h3>
      <table class="data-table">
        <thead><tr><th>Bezeichnung</th><th>Gewerk</th><th>Standort/Einheit</th><th>Einbau</th><th>Garantie bis</th><th class="num">Maßnahmen</th></tr></thead>
        <tbody>${bestandRows || `<tr><td colspan="6">${leerBox('Keine aktiven Anlagen.')}</td></tr>`}</tbody>
      </table>`
  }

  return `<section class="content-section page-break-before">
    ${sectionHead(4, 'Anlagen & Teile', vm)}
    ${body}
  </section>`
}

function buildOffen(vm: VersammlungsberichtViewModel): string {
  const kostenCol = vm.zeigeEinzelpreise ? `<th class="num">Kosten</th>` : ''
  const body = vm.offeneLeer
    ? leerBox('Derzeit keine offenen Maßnahmen.')
    : `<table class="data-table">
        <thead><tr>
          <th>Datum</th><th>Einheit</th><th>Anlage/Teil</th><th>Maßnahme</th><th>Gewerk</th><th>Status</th><th>Stand</th>${kostenCol}
        </tr></thead>
        <tbody>${vm.offeneZeilen
          .map(
            (r, i) =>
              `<tr class="${i % 2 === 1 ? 'zebra' : ''}">
                <td>${esc(r.datumLabel)}</td>
                <td>${esc(r.einheit)}</td>
                <td>${esc(r.anlage)}</td>
                <td>${esc(r.titel)}</td>
                <td>${esc(r.gewerk)}</td>
                <td>${statusDot(r.statusDone)} ${esc(r.statusLabel)}</td>
                <td>${esc(r.standLabel)}</td>
                ${vm.zeigeEinzelpreise ? `<td class="num tabular">${esc(r.kostenLabel ?? '—')}</td>` : ''}
              </tr>`
          )
          .join('')}</tbody>
      </table>`

  return `<section class="content-section page-break-before">
    ${sectionHead(5, 'Offene und laufende Maßnahmen', vm)}
    ${body}
    <div class="abbinder avoid-break">
      <hr class="abbinder-rule" />
      <p>Dieser Bericht wurde automatisch aus der Objektdokumentation erstellt.<br/>
      Alle Maßnahmen sind mit Fotos, Protokollen und Rechnungen hinterlegt und können bei der Verwaltung eingesehen werden.</p>
      <p class="abbinder-org">${esc(vm.orgName)}${vm.orgKontakt ? ` · ${esc(vm.orgKontakt)}` : ''}</p>
      <p class="abbinder-brand">Erstellt mit Bärenwald</p>
    </div>
  </section>`
}

export function buildVersammlungsberichtHtml(payload: VersammlungsberichtPayload): string {
  const vm = buildVersammlungsberichtViewModel(payload)

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>Objektbericht · ${esc(vm.objektTitel)}</title>
<style>
  :root {
    --primary: ${ACCENT};
    --tint: ${TINT};
    --text: ${TEXT};
    --muted: ${TEXT_MUTED};
    --line: ${LINE};
    --zebra: ${ZEBRA};
  }
  @page {
    size: A4 portrait;
    margin: 16mm 16mm 28mm 16mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: var(--text);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tabular { font-variant-numeric: tabular-nums; }
  .muted { color: var(--muted); font-weight: 400; }
  .page-break-after { page-break-after: always; }
  .page-break-before { page-break-before: always; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }

  /* Logo-Band wie Angebot */
  .logo-band {
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--primary);
  }
  .cover-logo {
    height: 56px;
    width: auto;
    max-width: 240px;
    object-fit: contain;
    display: block;
  }
  .cover-logo-fallback {
    font-size: 16pt;
    font-weight: 700;
    color: var(--primary);
  }

  .cover { min-height: 240mm; position: relative; padding-top: 2mm; }
  .cover-body { text-align: center; padding: 24mm 8mm 0; }
  .cover-kicker {
    margin: 0 0 6px;
    font-size: 9pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
  }
  .cover-sub {
    margin: 0 0 18px;
    color: var(--primary);
    font-size: 12pt;
    font-weight: 700;
  }
  .cover-objekt {
    margin: 0 0 16px;
    font-size: 20pt;
    line-height: 1.25;
    font-weight: 700;
    color: var(--text);
  }
  .cover-range { margin: 0 0 18px; font-size: 11pt; color: var(--text); }
  .cover-rule {
    border: none;
    border-top: 2px solid var(--primary);
    margin: 0 auto 18px;
    width: 40%;
  }
  .cover-meta { margin: 0 0 4px; font-size: 10pt; color: var(--muted); }
  .cover-meta--strong { color: var(--text); font-weight: 600; }
  .cover-toc { position: absolute; bottom: 6mm; left: 0; right: 0; padding: 0 2mm; }
  .cover-toc-title {
    margin: 0 0 6px;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
  }
  .cover-toc-list {
    margin: 0;
    padding-left: 18px;
    font-size: 9.5pt;
    color: var(--text);
    columns: 1;
  }
  .cover-toc-list li { margin-bottom: 3px; }

  .running-head {
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: var(--muted);
    border-bottom: 0.5pt solid var(--line);
    padding-bottom: 4px;
    margin-bottom: 12px;
  }
  .section-title {
    margin: 0 0 14px;
    font-size: 12pt;
    font-weight: 700;
    color: var(--primary);
    border-bottom: 2px solid var(--primary);
    padding-bottom: 6px;
  }
  .section-num { margin-right: 4px; }
  .sub-title {
    margin: 18px 0 8px;
    font-size: 11pt;
    font-weight: 700;
    color: var(--primary);
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .kpi-card {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 12px 8px;
    text-align: center;
    background: var(--tint);
  }
  .kpi-val {
    font-size: 14pt;
    font-weight: 700;
    line-height: 1.2;
    color: var(--primary);
  }
  .kpi-lbl {
    font-size: 7.5pt;
    color: var(--muted);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .kpi-sub {
    margin: 4px 0 0;
    font-size: 7pt;
    color: var(--muted);
    line-height: 1.3;
  }

  .data-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .data-table thead { display: table-header-group; }
  .data-table th {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    border-bottom: 1.5px solid var(--primary);
    padding: 6px 5px;
    text-align: left;
    font-weight: 700;
  }
  .data-table td {
    border-bottom: 0.5pt solid var(--line);
    padding: 6px 5px;
    vertical-align: top;
  }
  .data-table tr.zebra td { background: var(--zebra); }
  .data-table .num { text-align: right; }
  .data-table--compact td, .data-table--compact th { padding: 5px 4px; }
  .data-table--nested td { font-size: 9pt; padding: 4px 5px; }
  .data-table .col-date { width: 14mm; white-space: nowrap; }
  .massnahmen-table tr { break-inside: avoid; page-break-inside: avoid; }
  .foot-note { font-size: 8pt; color: var(--muted); padding-top: 8px; }
  .foot-sum { font-weight: 700; color: var(--text); }
  .foot-star { color: var(--muted); }

  .leer-box {
    margin: 8px 0;
    padding: 12px 14px;
    background: var(--tint);
    border: 1px solid var(--line);
    border-radius: 4px;
    color: var(--muted);
    font-size: 9.5pt;
  }

  .hint-box {
    margin-top: 14px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--tint);
  }
  .hint-title {
    margin: 0 0 6px;
    font-weight: 700;
    font-size: 10pt;
    color: var(--primary);
  }
  .hint-box ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 9.5pt; }

  .bar-row {
    display: grid;
    grid-template-columns: 32mm 1fr 28mm;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    font-size: 9.5pt;
  }
  .bar-label { font-weight: 600; color: var(--text); }
  .bar-track {
    height: 7mm;
    border: 0.5pt solid var(--line);
    background: #fff;
    border-radius: 2px;
    overflow: hidden;
  }
  .bar-fill { height: 100%; background: #c5d0c8; min-width: 2mm; }
  .bar-fill--primary { background: var(--primary); }
  .bar-val { text-align: right; font-size: 9pt; color: var(--muted); }
  .bar-sum {
    margin-top: 10px;
    text-align: right;
    font-weight: 700;
    font-size: 10pt;
    color: var(--primary);
    border-top: 1.5px solid var(--primary);
    padding-top: 6px;
  }

  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
    border: 0.5pt solid #888;
  }
  .dot--done { background: ${ACCENT}; border-color: ${ACCENT}; }
  .dot--open { background: #fff; }
  .kosten-offen { font-style: italic; color: var(--muted); }
  .sub-hint { font-size: 8pt; color: var(--muted); margin-top: 2px; }

  .anlage-block {
    margin-bottom: 14px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: #fff;
  }
  .anlage-block-title { margin: 0 0 4px; font-weight: 700; color: var(--primary); }
  .anlage-block-summary { margin: 0 0 6px; font-size: 9pt; color: var(--muted); }
  .anlage-block-foot { margin: 6px 0 0; font-size: 8.5pt; color: var(--muted); }
  .anlage-block-foot--warn { font-weight: 700; color: var(--text); }

  .abbinder { margin-top: 22px; font-size: 8.5pt; color: var(--muted); line-height: 1.5; }
  .abbinder-rule {
    border: none;
    border-top: 2px solid var(--primary);
    margin: 0 0 10px;
  }
  .abbinder-org { margin: 8px 0 0; font-weight: 600; color: var(--text); }
  .abbinder-brand { margin: 4px 0 0; color: var(--primary); font-weight: 600; }
</style>
</head>
<body>
  ${buildCover(vm)}
  ${buildZusammenfassung(vm)}
  ${buildGewerk(vm)}
  ${buildMassnahmen(vm)}
  ${buildAnlagen(vm)}
  ${buildOffen(vm)}
</body>
</html>`
}

/** Puppeteer footer — Angebots-Stil: links Bärenwald, Mitte Seite, rechts HV + Datum */
export function buildVersammlungsberichtPdfFooterTemplate(
  vm: VersammlungsberichtViewModel
): string {
  const org = esc(vm.orgName)
  const erstellt = esc(vm.erstelltAmLabel)
  return `<div style="width:100%;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;color:${TEXT_MUTED};padding:4px 16mm 2px;border-top:0.5pt solid #E5E7EB;background:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;width:100%;">
      <div style="flex:1;text-align:left;line-height:1.45;">
        <span style="font-weight:700;color:${ACCENT};">Bärenwald</span><br/>
        Objektbericht · ${erstellt}
      </div>
      <div style="flex:0 0 auto;text-align:center;line-height:1.45;white-space:nowrap;padding:0 8px;">
        Seite <span class="pageNumber"></span> von <span class="totalPages"></span>
      </div>
      <div style="flex:1;text-align:right;line-height:1.45;">
        ${org}<br/>
        ${esc(vm.objektTitel)}
      </div>
    </div>
  </div>`
}

export function buildVersammlungsberichtPdfHeaderTemplate(
  vm: VersammlungsberichtViewModel
): string {
  const left = esc(vm.objektTitel)
  const right = esc(vm.zeitraumLabel)
  return `<div style="width:100%;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:${TEXT_MUTED};padding:2mm 16mm 0;border-bottom:0.5pt solid ${LINE};">
    <div style="display:flex;justify-content:space-between;width:100%;">
      <span>${left}</span><span>${right}</span>
    </div>
  </div>`
}
