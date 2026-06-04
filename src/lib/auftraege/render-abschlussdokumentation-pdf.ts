import { buildAbschlussdokuHtmlInput } from '@/lib/auftraege/abschlussdokumentation-html-payload'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import type { AbschlussdokuPdfInput } from '@/lib/pdf/abschlussdokumentation-pdf'
import {
  buildAbschlussdokumentationHtml,
  buildAbschlussdokumentationPdfFooterTemplate,
} from '@/lib/templates/abschlussdokumentation-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AuftragDetail } from '@/lib/types'

/** Abschlussdokumentation als PDF im Angebots-/Rechnungs-Layout (HTML → Puppeteer). */
export async function renderAbschlussdokumentationPdfBuffer(
  pdf: AbschlussdokuPdfInput,
  firm: FirmenEinstellungen,
  detail?: AuftragDetail,
  leistungszeitraum?: { von: string | null; bis: string | null }
): Promise<Buffer> {
  const htmlInput = buildAbschlussdokuHtmlInput(pdf, firm, detail, leistungszeitraum)
  const html = buildAbschlussdokumentationHtml(htmlInput)
  const footerTemplate = buildAbschlussdokumentationPdfFooterTemplate(htmlInput)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
