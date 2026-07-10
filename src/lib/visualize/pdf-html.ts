import type { KiVizPdfPage } from '@/lib/visualize/pdf-data'

const ACCENT = '#2E7D52'
const TEXT_MUTED = '#888888'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function vizPageHtml(page: KiVizPdfPage): string {
  const multi =
    page.weitere_varianten.length > 0
      ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm;">
    ${page.weitere_varianten
      .map(
        (url) =>
          `<img src="${esc(url)}" alt="" style="width:100%;border-radius:4pt;border:0.5pt solid #E5E7EB;" />`
      )
      .join('')}
  </div>`
      : ''

  return `<div class="avoid-fuss-overlap" style="page-break-before:always;padding:20mm 0 0;">
  <div style="margin-bottom:8mm;">
    <span style="font-size:10pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.1em;">Visualisierung</span>
    <h2 style="font-size:13pt;font-weight:700;color:#1A3D2B;margin:6px 0 0;">So könnte es aussehen</h2>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-bottom:6mm;">
    <div>
      <span style="display:block;font-size:9pt;color:${TEXT_MUTED};margin-bottom:2mm;">Aktueller Zustand</span>
      <img src="${esc(page.ist_bild_url)}" alt="" style="width:100%;border-radius:4pt;border:0.5pt solid #E5E7EB;" />
    </div>
    <div>
      <span style="display:block;font-size:9pt;color:${ACCENT};margin-bottom:2mm;">Mögliche Gestaltung</span>
      <img src="${esc(page.ergebnis_url)}" alt="" style="width:100%;border-radius:4pt;border:0.5pt solid #E5E7EB;" />
    </div>
  </div>
  ${multi}
  <p style="font-size:8.5pt;color:${TEXT_MUTED};font-style:italic;padding:6pt 10pt;border-left:3pt solid ${ACCENT};background:#F9FAFB;margin:0;">
    Diese Visualisierung dient der Veranschaulichung und wurde durch KI generiert. Finale Ausführung,
    Materialien und Details werden nach Aufmaß und Absprache festgelegt.
  </p>
</div>`
}

export function kiVisualisierungPdfHtml(pages: KiVizPdfPage[]): string {
  if (!pages.length) return ''
  return pages.map(vizPageHtml).join('')
}
