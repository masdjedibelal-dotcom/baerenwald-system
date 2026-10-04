'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import {
parseBautagesberichtFotos,
parseStringList,
type AuftragBautagesbericht,
type BautagesberichtFoto
} from '@/lib/auftraege/bautagesbericht-types'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'

function mapBericht(row: Record<string, unknown>): AuftragBautagesbericht {
  const hwRaw = row.handwerker
  const hwOne = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  return {
    id: String(row.id),
    auftrag_id: String(row.auftrag_id),
    tag_nummer: Number(row.tag_nummer) || 1,
    datum: String(row.datum).slice(0, 10),
    arbeitszeit_von: row.arbeitszeit_von != null ? String(row.arbeitszeit_von) : null,
    arbeitszeit_bis: row.arbeitszeit_bis != null ? String(row.arbeitszeit_bis) : null,
    wetter: row.wetter != null ? String(row.wetter) : null,
    auftraggeber_name: row.auftraggeber_name != null ? String(row.auftraggeber_name) : null,
    auftraggeber_adresse: row.auftraggeber_adresse != null ? String(row.auftraggeber_adresse) : null,
    nachunternehmer_name: row.nachunternehmer_name != null ? String(row.nachunternehmer_name) : null,
    nachunternehmer_firma: row.nachunternehmer_firma != null ? String(row.nachunternehmer_firma) : null,
    leistungen: parseStringList(row.leistungen),
    behinderungen: row.behinderungen != null ? String(row.behinderungen) : null,
    qualitaetssicherung:
      row.qualitaetssicherung != null ? String(row.qualitaetssicherung) : null,
    risiken: parseStringList(row.risiken),
    zusammenfassung: row.zusammenfassung != null ? String(row.zusammenfassung) : null,
    personal_namen: parseStringList(row.personal_namen),
    fotos: parseBautagesberichtFotos(row.fotos),
    handwerker_id: row.handwerker_id != null ? String(row.handwerker_id) : null,
    handwerker:
      hwOne && typeof hwOne === 'object' && 'name' in hwOne
        ? {
            id: String((hwOne as { id?: string }).id ?? row.handwerker_id ?? ''),
            name: String((hwOne as { name?: string }).name ?? ''),
            firma: (hwOne as { firma?: string | null }).firma ?? null,
          }
        : null,
    pdf_url: row.pdf_url != null ? String(row.pdf_url) : null,
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

async function resolveFotosForCrm(fotos: BautagesberichtFoto[]): Promise<BautagesberichtFoto[]> {
  const out: BautagesberichtFoto[] = []
  for (const f of fotos) {
    if (/^https?:\/\//i.test(f.url)) {
      out.push(f)
      continue
    }
    const signed = await signedHandwerkerUploadUrl(f.url, 3600)
    if (signed) out.push({ ...f, url: signed })
  }
  return out
}

const BERICHT_SELECT = `
  *,
  handwerker(id, name, firma)
`

export async function listAuftragBautagesberichte(auftragId: string): Promise<AuftragBautagesbericht[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_bautagesberichte')
    .select(BERICHT_SELECT)
    .eq('auftrag_id', auftragId)
    .order('tag_nummer', { ascending: false })
  if (error) logDbError('app/auftraege/bautagesbericht-actions:auftrag_bautagesberichte', error)

  if (error) {
    console.warn('[listAuftragBautagesberichte]', error.message)
    return []
  }

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const mapped = mapBericht(row as Record<string, unknown>)
      const foto_display_urls = await resolveFotosForCrm(mapped.fotos)
      return { ...mapped, foto_display_urls }
    })
  )
  return rows
}
