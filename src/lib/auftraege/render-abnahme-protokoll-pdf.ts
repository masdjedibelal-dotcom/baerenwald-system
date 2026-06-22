import { buildAbnahmeProtokollHtmlInput } from '@/lib/auftraege/abnahme-protokoll-html-payload'
import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import {
  buildAbnahmeProtokollHtml,
  buildAbnahmeProtokollPdfFooterTemplate,
} from '@/lib/templates/abnahme-protokoll-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AuftragDetail } from '@/lib/types'

export async function renderAbnahmeProtokollPdfBuffer(
  detail: AuftragDetail,
  firm: FirmenEinstellungen,
  input: {
    abnahmeDatum: string
    punkte: AbnahmePunkt[]
    maengel: AbnahmeMangel[]
    notizen: string | null
  }
): Promise<Buffer> {
  const htmlInput = buildAbnahmeProtokollHtmlInput(detail, firm, input)
  const html = buildAbnahmeProtokollHtml(htmlInput)
  const footerTemplate = buildAbnahmeProtokollPdfFooterTemplate(htmlInput)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
