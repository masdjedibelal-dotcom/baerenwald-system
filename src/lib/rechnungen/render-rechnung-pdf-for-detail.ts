import {
  buildRechnungHtmlInput,
  loadVorherigeAbschlaegeFuerSchluss,
} from '@/lib/rechnungen/rechnung-html-payload'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import {
  buildAngebotHtml,
  buildAngebotPdfFooterTemplate,
} from '@/lib/templates/angebot-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk } from '@/lib/types'
import type { RechnungDetailForPdf } from '@/lib/rechnungen/rechnung-html-payload'
import type { SupabaseClient } from '@supabase/supabase-js'

/** PDF im gleichen HTML-Design wie Angebote — rechtlich als Rechnung. */
export async function renderRechnungPdfForDetail(
  detail: RechnungDetailForPdf,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  opts?: { supabase?: SupabaseClient }
): Promise<Buffer> {
  if (!detail.kunden) throw new Error('Kunde fehlt')
  let vorherige = null
  const art = String((detail as { rechnung_art?: string }).rechnung_art ?? '')
  if (art === 'schluss' && detail.auftrag_id && opts?.supabase) {
    vorherige = await loadVorherigeAbschlaegeFuerSchluss(
      opts.supabase,
      detail.auftrag_id,
      detail.id
    )
  }
  const payload = buildRechnungHtmlInput(detail, firm, gewerke, {
    vorherigeAbschlaege: vorherige,
  })
  const html = buildAngebotHtml(payload)
  const footerTemplate = buildAngebotPdfFooterTemplate(payload)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
