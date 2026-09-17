import { listAuftragBautagebuch } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import { loadAbnahmeprotokollSummary } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { listAuftragPositionEintraege } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  ABNAHME_ERGEBNIS_LABEL,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import { eintragTypLabel } from '@/lib/auftraege/position-lebenszyklus'
import { richTextToPlain } from '@/lib/rich-text'
import { normalizeUrlList } from '@/lib/utils'
import type { AuftragBautagebuchEintrag, AuftragDetail } from '@/lib/types'

export type AbschlussBautagebuchZeile = {
  datum: string
  sort_order: number
  titel: string
  beschreibung: string | null
  quelle: 'bautagebuch' | 'leistung'
}

export type AbschlussAbnahmeBlock = {
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  meta: AbnahmeProtokollMeta
  abnahmeDatum: string
  notizen: string | null
  ergebnisLabel: string
}

function ymdFromIso(iso: string | null | undefined): string {
  const s = (iso ?? '').trim()
  if (!s) return ''
  return s.slice(0, 10)
}

/** Gesamtabnahme bevorzugen, sonst jüngstes Protokoll mit Inhalt. */
export async function loadAbnahmeForAbschlussbericht(
  auftragId: string
): Promise<AbschlussAbnahmeBlock | null> {
  const latest = await loadAbnahmeprotokollSummary(auftragId)
  if (!latest) return null

  // Wenn jüngstes = Teilabnahme HW: versuche gesamt/freigegeben
  if (latest.ebene === 'handwerker') {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .select('id')
      .eq('auftrag_id', auftragId)
      .eq('ebene', 'gesamt')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.id) {
      const gesamt = await loadAbnahmeprotokollSummary(auftragId, String(data.id))
      if (gesamt) {
        return {
          punkte: gesamt.punkte,
          maengel: gesamt.maengel,
          meta: gesamt.meta,
          abnahmeDatum: gesamt.abnahme_datum,
          notizen: gesamt.notizen,
          ergebnisLabel:
            ABNAHME_ERGEBNIS_LABEL[gesamt.meta.abnahme_ergebnis] ??
            ABNAHME_ERGEBNIS_LABEL.abgenommen,
        }
      }
    }
  }

  return {
    punkte: latest.punkte,
    maengel: latest.maengel,
    meta: latest.meta,
    abnahmeDatum: latest.abnahme_datum,
    notizen: latest.notizen,
    ergebnisLabel:
      ABNAHME_ERGEBNIS_LABEL[latest.meta.abnahme_ergebnis] ??
      ABNAHME_ERGEBNIS_LABEL.abgenommen,
  }
}

/** Bautagebuch + Leistungs-/Tagebuch-Einträge chronologisch. */
export async function collectAbschlussBautagebuch(
  auftragId: string
): Promise<AbschlussBautagebuchZeile[]> {
  const [btb, posEintraege] = await Promise.all([
    listAuftragBautagebuch(auftragId),
    listAuftragPositionEintraege(auftragId),
  ])

  const zeilen: AbschlussBautagebuchZeile[] = []

  for (const e of btb) {
    zeilen.push({
      datum: ymdFromIso(e.datum) || ymdFromIso(e.created_at) || '',
      sort_order: e.sort_order ?? 0,
      titel: e.titel?.trim() || 'Eintrag',
      beschreibung: e.beschreibung?.trim() || null,
      quelle: 'bautagebuch',
    })
  }

  for (const e of posEintraege) {
    const text =
      richTextToPlain(e.beschreibung ?? '').trim() ||
      richTextToPlain(e.beschreibung_roh ?? '').trim()
    const titel = eintragTypLabel(e.typ) || 'Leistungsdokumentation'
    const von = String(e.erfasser_akteur ?? '').trim()
    zeilen.push({
      datum: ymdFromIso(e.ereignis_zeit) || ymdFromIso(e.created_at) || '',
      sort_order: 0,
      titel: von ? `${titel} · ${von}` : titel,
      beschreibung: text || null,
      quelle: 'leistung',
    })
  }

  zeilen.sort((a, b) => {
    const d = (a.datum || '').localeCompare(b.datum || '')
    if (d !== 0) return d
    return a.sort_order - b.sort_order
  })

  return zeilen
}

/** Fotos aus Bautagebuch, Formular, Leistungs-Einträgen und Abnahme-Übergabe. */
export async function collectAbschlussFotoUrls(
  detail: AuftragDetail,
  bautagebuch: AuftragBautagebuchEintrag[],
  abnahmeMeta?: AbnahmeProtokollMeta | null
): Promise<Array<{ url: string; caption: string }>> {
  const out: Array<{ url: string; caption: string }> = []
  const seen = new Set<string>()

  const push = (url: string | null | undefined, caption: string) => {
    const u = (url ?? '').trim()
    if (!u || seen.has(u)) return
    seen.add(u)
    out.push({ url: u, caption })
  }

  for (const e of bautagebuch) {
    const urls = normalizeUrlList(
      e.foto_display_urls?.length ? e.foto_display_urls : e.foto_urls
    )
    const label = e.titel?.trim() || 'Bautagebuch'
    for (const u of urls) push(u, label)
  }

  for (const e of detail.formular_eintraege ?? []) {
    const label =
      e.formular_templates &&
      typeof e.formular_templates === 'object' &&
      'name' in e.formular_templates
        ? String((e.formular_templates as { name?: string }).name ?? '').trim()
        : ''
    for (const u of normalizeUrlList(e.foto_urls)) {
      push(u, label || e.phase || 'Formular')
    }
  }

  try {
    const posEintraege = await listAuftragPositionEintraege(detail.id)
    for (const e of posEintraege) {
      const label = eintragTypLabel(e.typ) || 'Dokumentation'
      for (const f of e.eintrag_fotos ?? []) {
        push(f.display_url, label)
      }
    }
  } catch (err) {
    console.warn('[collectAbschlussFotoUrls] position eintraege', err)
  }

  if (abnahmeMeta?.uebergabe_foto_urls?.length) {
    const captions = abnahmeMeta.uebergabe_foto_captions ?? []
    abnahmeMeta.uebergabe_foto_urls.forEach((u, i) => {
      push(u, captions[i]?.trim() || `Abnahme ${i + 1}`)
    })
  }

  return out
}
