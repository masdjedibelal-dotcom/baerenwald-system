import { resolveVorgang } from '@/lib/vorgang/resolve-vorgang'
import type { ResolveVorgangInput, ResolvedVorgang } from '@/lib/vorgang/types'

export type CrmLeadResolveSlice = {
  id: string
  status: string
  situation?: string | null
  funnel_daten?: unknown
  kanal?: string | null
  org_freigabe_status?: string | null
  hv_meldung_status?: string | null
  kontakt_name?: string | null
  plz?: string | null
  bereiche?: string[] | null
  created_at: string
  updated_at?: string | null
}

export type CrmAngebotResolveSlice = {
  id: string
  status?: string | null
  status_einfach?: string | null
  gesendet_am?: string | null
  gesendet_kunde_at?: string | null
  created_at: string
  updated_at?: string | null
}

export type CrmAuftragResolveSlice = {
  id: string
  status: string
  titel?: string | null
  created_at: string
  updated_at?: string | null
  handwerkerAktionOffen?: boolean
}

export type CrmRechnungResolveSlice = {
  id: string
  status: string
  faellig?: string | null
  created_at: string
  updated_at?: string | null
}

export function resolveVorgangFromCrmEntities(args: {
  lead: CrmLeadResolveSlice
  angebote?: CrmAngebotResolveSlice[]
  auftraege?: CrmAuftragResolveSlice[]
  rechnungen?: CrmRechnungResolveSlice[]
}): ResolvedVorgang {
  const input: ResolveVorgangInput = {
    lead: {
      id: args.lead.id,
      status: args.lead.status,
      situation: args.lead.situation,
      funnel_daten: args.lead.funnel_daten,
      kanal: args.lead.kanal as ResolveVorgangInput['lead']['kanal'],
      org_freigabe_status: args.lead.org_freigabe_status,
      hv_meldung_status: args.lead.hv_meldung_status,
      kontakt_name: args.lead.kontakt_name,
      plz: args.lead.plz,
      bereiche: args.lead.bereiche,
      created_at: args.lead.created_at,
      updated_at: args.lead.updated_at,
    },
    angebote: (args.angebote ?? []).map((a) => ({
      id: a.id,
      status: a.status ?? undefined,
      status_einfach: a.status_einfach,
      gesendet_am: a.gesendet_am,
      gesendet_kunde_at: a.gesendet_kunde_at,
      created_at: a.created_at,
      updated_at: a.updated_at,
    })),
    auftraege: (args.auftraege ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      titel: a.titel,
      created_at: a.created_at,
      updated_at: a.updated_at,
      handwerkerAktionOffen: a.handwerkerAktionOffen,
    })),
    rechnungen: (args.rechnungen ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      faellig: r.faellig,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
  }
  return resolveVorgang(input)
}
