import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import type {
  AktenNotiz,
  ObjektAkteDetailPayload,
  ObjektAkteReadOnlyPayload,
  ObjektKontakt,
} from '@/lib/objektakte/types'
import type { KundenObjekt } from '@/lib/types'

export async function loadKundenObjektForAkte(
  kundeId: string,
  objektId: string
): Promise<KundenObjekt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_objekte')
    .select('*')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  if (error) logDbError('lib/objektakte/load-objekt-akte:kunden_objekte', error)

  if (error || !data) return null
  return data as KundenObjekt
}

async function loadReadOnlyAkte(
  supabase: ReturnType<typeof createClient>,
  kundeId: string,
  objektId: string,
  leadId?: string | null
): Promise<ObjektAkteReadOnlyPayload> {
  const notizenQueries = [
    supabase
      .from('akten_notizen')
      .select('*')
      .eq('kunde_id', kundeId)
      .eq('bezug_typ', 'objekt')
      .eq('kunde_objekt_id', objektId)
      .order('created_at', { ascending: false }),
  ]

  if (leadId) {
    notizenQueries.push(
      supabase
        .from('akten_notizen')
        .select('*')
        .eq('kunde_id', kundeId)
        .eq('bezug_typ', 'vorgang')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
    )
  }

  const [objektNotizenRes, vorgangNotizenRes] = await Promise.all([
    notizenQueries[0],
    leadId ? notizenQueries[1] : Promise.resolve({ data: [], error: null }),
  ])

  const notizen = [
    ...((objektNotizenRes.data ?? []) as AktenNotiz[]),
    ...((vorgangNotizenRes?.data ?? []) as AktenNotiz[]),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (objektNotizenRes.error) {
    console.warn('loadReadOnlyAkte notizen:', objektNotizenRes.error.message)
  }

  return {
    notizen,
  }
}

export async function loadObjektAkteDetail(
  kundeId: string,
  objektId: string
): Promise<ObjektAkteDetailPayload | null> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return null

  const objekt = await loadKundenObjektForAkte(kid, oid)
  if (!objekt) return null

  const supabase = createClient()

  const [kontakteRes, readOnly] = await Promise.all([
    supabase
      .from('objekt_kontakte')
      .select('*')
      .eq('kunde_objekt_id', oid)
      .eq('aktiv', true)
      .order('sort_order', { ascending: true }),
    loadReadOnlyAkte(supabase, kid, oid),
  ])

  if (kontakteRes.error) {
    console.warn('loadObjektAkteDetail kontakte:', kontakteRes.error.message)
  }

  return {
    kontakte: (kontakteRes.data ?? []) as ObjektKontakt[],
    ...readOnly,
  }
}
