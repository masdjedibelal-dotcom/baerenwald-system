import {
  buildVersammlungsberichtViewModel,
  esc,
  LINE,
  TEXT,
  TEXT_MUTED,
  ZEBRA,
  type VersammlungsberichtViewModel,
} from '@/lib/objektakte/build-versammlungsbericht-view-model'
import type { VersammlungsberichtPayload } from '@/lib/objektakte/load-versammlungsbericht-data'

function leerBox(text: string): string {
  return `<div class="leer-box">${esc(text)}</div>`
}

function statusDot(done: boolean): string {
  const cls = done ? 'dot dot--done' : 'dot dot--open'
  return `<span class="${cls}" aria-hidden="true"></span>`
}

function sectionHead(title: string, vm: VersammlungsberichtViewModel): string {
  return `<div class="running-head"><span>${esc(vm.objektTitel)}</span><span>${esc(vm.zeitraumLabel)}</span></div>
    <h2 class="section-title">${esc(title)}</h2>`
}

function buildCover(vm: VersammlungsberichtViewModel): string {
  const toc = [
    'Zusammenfassung',
    'Kosten nach Gewerk',
    'Maßnahmen im Berichtszeitraum',
    'Anlagen & Teile',
    'Offene und laufende Maßnahmen',
  ]
  return `<section class="cover page-break-after">
    <div class="cover-top">${vm.orgLogoHtml}</div>
    <div class="cover-body">
      <p class="cover-kicker">Objektbericht</p>
      <p class="cover-sub">Instandhaltung &amp; Reparaturen</p>
      <h1 class="cover-objekt">${esc(vm.objektAdresse || vm.objektTitel)}</h1>
      <p class="cover-range">Berichtszeitraum: ${esc(vm.zeitraumLabel)}</p>
      <hr class="cover-rule" />
      <p class="cover-meta">Erstellt für die Eigentümerversammlung</p>
      <p class="cover-meta cover-meta--strong">${esc(vm.orgName)}</p>
      <p class="cover-meta">Erstellt am: ${esc(vm.erstelltAmLabel)}</p>
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
    ${sectionHead('Zusammenfassung', vm)}
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
    ${sectionHead('Kosten nach Gewerk', vm)}
    ${body}
  </section>`
}

function buildMassnahmen(vm: VersammlungsberichtViewModel): string {
  const kostenCol = vm.zeigeEinzelpreise
    ? `<th class="num">Kosten</th>`
    : ''
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
    ${sectionHead('Maßnahmen im Berichtszeitraum', vm)}
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
    ${sectionHead('Anlagen & Teile', vm)}
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
    ${sectionHead('Offene und laufende Maßnahmen', vm)}
    ${body}
    <div class="abbinder avoid-break">
      <hr class="abbinder-rule" />
      <p>Dieser Bericht wurde automatisch aus der Objektdokumentation erstellt.<br/>
      Alle Maßnahmen sind mit Fotos, Protokollen und Rechnungen hinterlegt und können bei der Verwaltung eingesehen werden.</p>
      <p class="abbinder-org">${esc(vm.orgName)}${vm.orgKontakt ? ` · ${esc(vm.orgKontakt)}` : ''}</p>
    </div>
  </section>`
}

export function buildVersammlungsberichtHtml(payload: VersammlungsberichtPayload): string {
  const vm = buildVersammlungsberichtViewModel(payload)
  const p = vm.primary

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>Objektbericht · ${esc(vm.objektTitel)}</title>
<style>
  :root {
    --primary: ${p};
    --text: ${TEXT};
    --muted: ${TEXT_MUTED};
    --line: ${LINE};
    --zebra: ${ZEBRA};
  }
  @page {
    size: A4 portrait;
    margin: 18mm 20mm 22mm 20mm;
  }
  @page :first {
    margin-top: 18mm;
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

  .cover { min-height: 250mm; position: relative; padding-top: 4mm; }
  .cover-top { min-height: 18mm; margin-bottom: 28mm; }
  .cover-logo { max-width: 40mm; max-height: 16mm; object-fit: contain; }
  .cover-logo-fallback { font-size: 14pt; font-weight: 700; color: var(--text); }
  .cover-body { text-align: center; padding: 0 8mm; }
  .cover-kicker {
    margin: 0 0 6px;
    font-size: 9pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--primary);
    font-weight: 700;
  }
  .cover-sub { margin: 0 0 20px; color: var(--muted); font-size: 11pt; }
  .cover-objekt { margin: 0 0 16px; font-size: 22pt; line-height: 1.25; font-weight: 700; }
  .cover-range { margin: 0 0 20px; font-size: 12pt; color: var(--text); }
  .cover-rule { border: none; border-top: 0.5pt solid var(--line); margin: 0 auto 18px; width: 55%; }
  .cover-meta { margin: 0 0 4px; font-size: 10pt; color: var(--muted); }
  .cover-meta--strong { color: var(--text); font-weight: 600; }
  .cover-toc { position: absolute; bottom: 8mm; left: 0; right: 0; padding: 0 4mm; }
  .cover-toc-title { margin: 0 0 6px; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  .cover-toc-list { margin: 0; padding-left: 18px; font-size: 9pt; color: var(--muted); columns: 2; }

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
    font-size: 15pt;
    font-weight: 700;
    color: var(--text);
    border-bottom: 2pt solid var(--primary);
    padding-bottom: 4px;
  }
  .sub-title { margin: 18px 0 8px; font-size: 11pt; font-weight: 700; }

  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi-card { border: 0.5pt solid var(--line); padding: 10px 8px; text-align: center; }
  .kpi-val { font-size: 14pt; font-weight: 700; line-height: 1.2; }
  .kpi-lbl { font-size: 8pt; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-sub { margin: 4px 0 0; font-size: 7pt; color: var(--muted); line-height: 1.3; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .data-table thead { display: table-header-group; }
  .data-table th {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    border-bottom: 0.75pt solid var(--line);
    padding: 6px 5px;
    text-align: left;
    font-weight: 600;
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
  .foot-sum { font-weight: 700; }
  .foot-star { color: var(--muted); }

  .leer-box {
    margin: 8px 0;
    padding: 12px 14px;
    background: var(--zebra);
    border: 0.5pt solid var(--line);
    color: var(--muted);
    font-size: 9.5pt;
  }

  .hint-box {
    margin-top: 14px;
    padding: 10px 12px;
    border: 0.5pt solid var(--line);
    background: #fff;
  }
  .hint-title { margin: 0 0 6px; font-weight: 700; font-size: 10pt; }
  .hint-box ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 9.5pt; }

  .bar-row { display: grid; grid-template-columns: 32mm 1fr 28mm; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 9.5pt; }
  .bar-track { height: 7mm; border: 0.5pt solid var(--line); background: #fff; position: relative; }
  .bar-fill { height: 100%; background: #bbb; border-right: 0.5pt solid #888; min-width: 2mm; }
  .bar-fill--primary { background: var(--primary); opacity: 0.85; }
  .bar-val { text-align: right; font-size: 9pt; }
  .bar-sum { margin-top: 10px; text-align: right; font-weight: 700; font-size: 10pt; border-top: 0.75pt solid var(--line); padding-top: 6px; }

  .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; vertical-align: middle; border: 0.5pt solid #888; }
  .dot--done { background: #2d6a4f; border-color: #2d6a4f; }
  .dot--open { background: #fff; }
  .kosten-offen { font-style: italic; color: var(--muted); }
  .sub-hint { font-size: 8pt; color: var(--muted); margin-top: 2px; }

  .anlage-block { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 0.5pt solid var(--line); }
  .anlage-block-title { margin: 0 0 4px; font-weight: 700; }
  .anlage-block-summary { margin: 0 0 6px; font-size: 9pt; color: var(--muted); }
  .anlage-block-foot { margin: 6px 0 0; font-size: 8.5pt; color: var(--muted); }
  .anlage-block-foot--warn { font-weight: 700; color: var(--text); }

  .abbinder { margin-top: 20px; font-size: 8.5pt; color: var(--muted); line-height: 1.5; }
  .abbinder-rule { border: none; border-top: 0.5pt solid var(--line); margin: 0 0 10px; }
  .abbinder-org { margin: 8px 0 0; font-weight: 600; color: var(--text); }
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

/** Puppeteer footerTemplate — 3-spaltig laut Spec. */
export function buildVersammlungsberichtPdfFooterTemplate(vm: VersammlungsberichtViewModel): string {
  const org = esc(vm.orgName)
  const erstellt = esc(vm.erstelltAmLabel)
  return `<div style="width:100%;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:${TEXT_MUTED};padding:0 20mm 2mm;border-top:0.5pt solid ${LINE};">
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;gap:8px;">
      <span style="flex:1;text-align:left;">Erstellt am ${erstellt}</span>
      <span style="flex:1;text-align:center;">${org}</span>
      <span style="flex:1;text-align:right;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
    </div>
  </div>`
}

export function buildVersammlungsberichtPdfHeaderTemplate(vm: VersammlungsberichtViewModel): string {
  const left = esc(vm.objektTitel)
  const right = esc(vm.zeitraumLabel)
  return `<div style="width:100%;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:${TEXT_MUTED};padding:2mm 20mm 0;border-bottom:0.5pt solid ${LINE};">
    <div style="display:flex;justify-content:space-between;width:100%;">
      <span>${left}</span><span>${right}</span>
    </div>
  </div>`
}
