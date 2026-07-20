import type { SupabaseClient } from '@supabase/supabase-js'
import type { RechnungStatus } from '@/lib/types'

type RechnungZeitraumRow = {
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  status: RechnungStatus
  gesendet_at: string | null
  created_at: string
}

function hatLeistungszeitraum(r: RechnungZeitraumRow): boolean {
  return Boolean(r.leistungszeitraum_von?.trim() || r.leistungszeitraum_bis?.trim())
}

function prioritaet(r: RechnungZeitraumRow): number {
  if (r.status === 'bezahlt') return 0
  if (r.status === 'gesendet') return 1
  if (r.status === 'entwurf') return 2
  return 9
}

/**
 * Leistungszeitraum wie auf der Rechnung (nicht Auftrag Start/Ende).
 * Bevorzugt gesendete/bezahlte Rechnungen mit gesetztem Zeitraum.
 */
export async function loadLeistungszeitraumAusRechnung(
  supabase: SupabaseClient,
  auftragId: string
): Promise<{ von: string | null; bis: string | null }> {
  const { data, error } = await supabase
    .from('rechnungen')
    .select('leistungszeitraum_von, leistungszeitraum_bis, status, gesendet_at, created_at')
    .eq('auftrag_id', auftragId)
    .neq('status', 'storniert')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[loadLeistungszeitraumAusRechnung]', error.message)
    return { von: null, bis: null }
  }

  const rows = (data ?? []) as RechnungZeitraumRow[]
  const mitZeitraum = rows.filter(hatLeistungszeitraum)
  if (!mitZeitraum.length) return { von: null, bis: null }

  mitZeitraum.sort((a, b) => {
    const p = prioritaet(a) - prioritaet(b)
    if (p !== 0) return p
    const ga = a.gesendet_at ?? a.created_at
    const gb = b.gesendet_at ?? b.created_at
    return gb.localeCompare(ga)
  })

  const pick = mitZeitraum[0]!
  return {
    von: pick.leistungszeitraum_von?.trim().slice(0, 10) || null,
    bis: pick.leistungszeitraum_bis?.trim().slice(0, 10) || null,
  }
}
