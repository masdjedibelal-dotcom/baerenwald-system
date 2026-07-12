'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { labelHandwerkerAblehnung } from '@/lib/angebote/ablehnung-labels'
import {
  HandwerkerZuweisenModal,
  type HandwerkerZuweisenKontext,
  type HandwerkerZuweisenScope,
} from '@/components/auftraege/HandwerkerZuweisenModal'
import type { AngebotHandwerkerRow, AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'

type GewerkOpt = { id: string; name: string; slug: string }

function ablehnungGrund(
  z: AuftragHandwerkerRow,
  angebotHandwerker: AngebotHandwerkerRow[]
): string | null {
  const row = angebotHandwerker.find(
    (a) =>
      a.handwerker_id === z.handwerker_id &&
      (a.gewerk_id === z.gewerk_id || !z.gewerk_id) &&
      (a.status ?? '').toLowerCase() === 'abgelehnt'
  )
  return row?.ablehnung_grund ?? null
}

export function PartnerAbgelehntBanner({
  auftragId,
  zuweisung,
  positionen,
  gewerke = [],
  angebotHandwerker = [],
  kontext,
  projektName,
  onChanged,
}: {
  auftragId: string
  zuweisung: AuftragHandwerkerRow
  positionen: AuftragPosition[]
  gewerke?: GewerkOpt[]
  angebotHandwerker?: AngebotHandwerkerRow[]
  kontext: HandwerkerZuweisenKontext
  projektName?: string
  onChanged: () => void
}) {
  const [pending] = useTransition()
  const [modalScope, setModalScope] = useState<HandwerkerZuweisenScope | null>(null)

  const gewerkSlug = zuweisung.gewerke?.slug ?? null
  const gewerkName = zuweisung.gewerke?.name ?? 'Gewerk'
  const gewerkId =
    zuweisung.gewerk_id ||
    gewerke.find((g) => g.slug === gewerkSlug)?.id ||
    gewerke.find((g) => g.name === gewerkName)?.id ||
    ''
  const hwName = zuweisung.handwerker?.name ?? 'Partner'
  const grund = ablehnungGrund(zuweisung, angebotHandwerker)

  const betroffene = positionen.filter((p) => {
    if (p.handwerker_id !== zuweisung.handwerker_id) return false
    if (gewerkSlug) return p.gewerk_slug === gewerkSlug
    return p.gewerk_name === gewerkName
  })

  function openReplace() {
    if (!gewerkId) return
    setModalScope({
      type: 'gewerk',
      gewerkId,
      gewerkName,
      gewerkSlug,
      positionIds: betroffene.map((p) => p.id),
      leistungen: betroffene.map((p) => p.leistung_name),
      replaceZuweisungId: zuweisung.id,
    })
  }

  return (
    <>
      <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm">
        <p className="font-medium text-danger">
          {gewerkName}: {hwName} hat abgelehnt
          {grund ? ` — ${labelHandwerkerAblehnung(grund)}` : ''}
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-2"
          disabled={pending || !gewerkId}
          onClick={openReplace}
        >
          <UserPlus className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
          Anderen Partner zuweisen
        </Button>
      </div>

      <HandwerkerZuweisenModal
        open={!!modalScope}
        onClose={() => setModalScope(null)}
        auftragId={auftragId}
        kontext={kontext}
        scope={modalScope}
        projektName={projektName}
        onDone={onChanged}
        onMailOpen={() => {}}
      />
    </>
  )
}
