'use server'

import { createAngebot, updateAngebot, setAngebotStatus } from '@/app/(dashboard)/angebote/actions'
import type { CreateAngebotInput } from '@/app/(dashboard)/angebote/actions'
import type { AngebotPosition, PreisTyp } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'

export {
  createAngebot,
  updateAngebot,
  setAngebotStatus,
  listAngebotVorlagen,
  saveAngebotVorlage,
  type CreateAngebotInput,
} from '@/app/(dashboard)/angebote/actions'

export {
  createAuftragFromAngebot,
  deleteAngebot,
  type CreateAuftragFromAngebotOptions,
} from '@/app/(dashboard)/angebote/actions'

/** Alias für Aufrufer nach Prompt-Spezifikation */
export const updateAngebotStatus = setAngebotStatus

function angebotPreisTypAusPositionen(positionen: AngebotPosition[]): PreisTyp {
  void positionen
  return 'fix'
}

export async function saveAngebot(
  data: {
    lead_id?: string | null
    kunde_id: string
    positionen: AngebotPosition[]
    notizen?: string | null
    preis_typ?: PreisTyp | null
    vorlage_id?: string | null
  },
  angebotId?: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const positionen = normalizeAngebotPositionen(data.positionen)
  const summen = summenAusPositionen(positionen, 19)
  const preis_typ = data.preis_typ ?? angebotPreisTypAusPositionen(positionen)

  const payload: CreateAngebotInput = {
    lead_id: data.lead_id ?? null,
    kunde_id: data.kunde_id,
    positionen,
    gesamt_min: summen.nettoMin,
    gesamt_max: summen.nettoMax,
    notizen: data.notizen ?? null,
    preis_typ,
    vorlage_id: data.vorlage_id ?? null,
  }

  if (angebotId) {
    const res = await updateAngebot(angebotId, {
      ...payload,
      lead_id: data.lead_id ?? null,
    })
    if (!res.ok) return res
    return { ok: true, id: angebotId }
  }

  const res = await createAngebot(payload)
  if (!res.ok) return res
  return { ok: true, id: res.id }
}
