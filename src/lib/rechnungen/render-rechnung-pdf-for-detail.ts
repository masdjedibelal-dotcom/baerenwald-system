import { buildRechnungHtmlInput } from '@/lib/rechnungen/rechnung-html-payload'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import {
  buildAngebotHtml,
  buildAngebotPdfFooterTemplate,
} from '@/lib/templates/angebot-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk } from '@/lib/types'
import type { RechnungDetailForPdf } from '@/lib/rechnungen/rechnung-html-payload'

/** PDF im gleichen HTML-Design wie Angebote — rechtlich als Rechnung. */
export async function renderRechnungPdfForDetail(
  detail: RechnungDetailForPdf,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = []
): Promise<Buffer> {
  if (!detail.kunden) throw new Error('Kunde fehlt')
  const payload = buildRechnungHtmlInput(detail, firm, gewerke)
  const html = buildAngebotHtml(payload)
  const footerTemplate = buildAngebotPdfFooterTemplate(payload)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
