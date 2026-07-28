'use server'

import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import { loadBerichtDatenquelle } from '@/lib/auftraege/load-bericht-datenquelle'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import {
  buildBautagebuchLebenszyklusHtml,
  buildBautagebuchLebenszyklusPdfFooterTemplate,
} from '@/lib/templates/bautagebuch-lebenszyklus-template'

function firmZeileAdresse(f: FirmenEinstellungen): string {
  return [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')].join(
    '\n'
  )
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  return [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? '']
    .filter(Boolean)
    .join(' · ')
}

/**
 * Bautagebuch-PDF aus derselben Quelle wie Regiebericht (Phase 12 / Spec §16).
 */
export async function renderBautagebuchFromLebenszyklus(
  auftragId: string
): Promise<{ ok: true; buffer: Buffer; filename: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const loaded = await loadBerichtDatenquelle(auftragId)
  if (!loaded.ok) return loaded

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const htmlInput = {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    firmenname: firm.firmenname,
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_steuer_footer: firmenSteuerFooterZeilen(firm).join('\n'),
    data: loaded.data,
  }

  const html = buildBautagebuchLebenszyklusHtml(htmlInput)
  const footerTemplate = buildBautagebuchLebenszyklusPdfFooterTemplate(htmlInput)
  const buffer = await renderHtmlToPdfBuffer(html, { footerTemplate })

  return {
    ok: true,
    buffer,
    filename: `bautagebuch-${auftragId.slice(0, 8)}.pdf`,
  }
}
