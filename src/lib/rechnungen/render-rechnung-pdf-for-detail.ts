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
  opts?: { supabase?: SupabaseClient; bezugNr?: string | null }
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
  let bezugNr = opts?.bezugNr?.trim() || null
  const bezugId = String(
    (detail as { bezug_rechnung_id?: string | null }).bezug_rechnung_id ?? ''
  ).trim()
  if (!bezugNr && bezugId && opts?.supabase) {
    const { data: bezug } = await opts.supabase
      .from('rechnungen')
      .select('rechnungsnummer')
      .eq('id', bezugId)
      .maybeSingle()
    bezugNr = (bezug as { rechnungsnummer?: string | null } | null)?.rechnungsnummer?.trim() || null
  }
  const payload = buildRechnungHtmlInput(detail, firm, gewerke, {
    vorherigeAbschlaege: vorherige,
    bezugNr,
  })
  const html = buildAngebotHtml(payload)
  const footerTemplate = buildAngebotPdfFooterTemplate(payload)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
