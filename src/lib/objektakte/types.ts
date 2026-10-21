export type ObjektKontaktRolle = 'hausmeister' | 'ansprechpartner' | 'beirat' | 'dienstleister' | 'notfall' | 'sonstiges'

export type ObjektKontakt = {
  id: string
  kunde_id: string
  kunde_objekt_id: string
  rolle: ObjektKontaktRolle
  name: string
  telefon: string | null
  email: string | null
  notiz: string | null
  sort_order: number
  aktiv: boolean
  created_at: string
  updated_at: string
}

export type AktenNotiz = {
  id: string
  kunde_id: string
  bezug_typ: 'objekt' | 'vorgang'
  kunde_objekt_id: string | null
  lead_id: string | null
  text: string
  wiedervorlage_am: string | null
  erledigt_am: string | null
  created_at: string
}

export type ObjektAkteReadOnlyPayload = {
  notizen: AktenNotiz[]
}

import type { VorgangPhase } from '@/lib/vorgang/types'

/** Chronologie-Zeile für Objekt-Historie-Tab / Bericht. */
export type ObjektHistorieRow = {
  leadId: string
  datum: string
  titel: string
  einheitLabel: string | null
  gewerkLabel: string | null
  phase: VorgangPhase | 'bestand'
  unterstatus: string
  unterstatusLabel: string
  kostenLabel: string
  kostenEuro: number | null
  detailHref: string
  ist_wiederkehrend?: boolean
}

export type ObjektHistoriePayload = {
  rows: ObjektHistorieRow[]
  leadIds: string[]
}

export type ObjektAkteDetailPayload = ObjektAkteReadOnlyPayload & {
  kontakte: ObjektKontakt[]
}

export type ObjektKontaktInput = {
  rolle: ObjektKontaktRolle
  name: string
  telefon?: string | null
  email?: string | null
  notiz?: string | null
}
