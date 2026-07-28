'use server'

import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import {
  filterBerichtAufPosition,
} from '@/lib/auftraege/bericht-datenquelle'
import { loadBerichtDatenquelle } from '@/lib/auftraege/load-bericht-datenquelle'
import { istRegiePosition } from '@/lib/auftraege/regie-display'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import {
  buildRegieberichtLebenszyklusHtml,
  buildRegieberichtLebenszyklusPdfFooterTemplate,
  resolveRegieSollIst,
} from '@/lib/templates/regiebericht-lebenszyklus-template'
import { kundeZeigt35a } from '@/lib/rechnung-berechnung'

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
 * Regiebericht-PDF aus gemeinsamer Quelle (position_eintraege + Schichten).
 * Phase 12 / Spec §16.
 */
export async function renderRegieberichtFromLebenszyklus(
  auftragId: string,
  positionId?: string | null
): Promise<{ ok: true; buffer: Buffer; filename: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const loaded = await loadBerichtDatenquelle(auftragId)
  if (!loaded.ok) return loaded

  let data = loaded.data
  const regiePos = data.positionen.filter(istRegiePosition)
  const focusId =
    positionId?.trim() ||
    regiePos[0]?.id ||
    data.positionen.find((p) => (Number(p.geschaetzt_std) || 0) > 0 || p.stundensatz)?.id ||
    data.positionen[0]?.id ||
    null

  if (focusId) {
    data = filterBerichtAufPosition(loaded.data, focusId)
  }

  if (!data.positionen.length && !data.eintraege.length) {
    return { ok: false, message: 'Keine Regie-/Positionsdaten gefunden.' }
  }

  const pos = data.positionen[0]
  const stundensatz = Number(pos?.stundensatz) || 0
  const stunden = data.summeMinuten / 60
  const lohnNetto = Math.round(stunden * stundensatz * 100) / 100
  const materialNetto = data.summeMaterialNetto
  const netto = lohnNetto + materialNetto
  const mwst = Math.round(netto * 0.19 * 100) / 100
  const brutto = Math.round((netto + mwst) * 100) / 100

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const handwerkerName =
    [pos?.handwerker_name, pos?.handwerker_firma].filter(Boolean).join(' · ') || 'Partner'
  const hinweis35a = kundeZeigt35a(loaded.kunde?.typ) && lohnNetto > 0

  const htmlInput = {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    firmenname: firm.firmenname,
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_steuer_footer: firmenSteuerFooterZeilen(firm).join('\n'),
    data,
    focusPositionId: focusId,
    stundensatz,
    lohnNetto,
    materialNetto,
    mwst,
    brutto,
    handwerkerName,
    gewerkName: pos?.gewerk_name ?? null,
    sollIst: resolveRegieSollIst(data, focusId),
    hinweis35a,
  }

  const html = buildRegieberichtLebenszyklusHtml(htmlInput)
  const footerTemplate = buildRegieberichtLebenszyklusPdfFooterTemplate(htmlInput)
  const buffer = await renderHtmlToPdfBuffer(html, { footerTemplate })

  return {
    ok: true,
    buffer,
    filename: `regiebericht-${(focusId || auftragId).slice(0, 8)}.pdf`,
  }
}
