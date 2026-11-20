'use client'

import { useEffect, useState } from 'react'
import { MockSelect } from '@/components/mock-ui'
import { toast } from '@/components/ui/app-toast'
import { getVorgangZustaendig, setVorgangZustaendig } from '@/app/actions/vorgang-zustaendig'
import { cn } from '@/lib/utils'

/** Servus TEO: Zuständig im Detailkopf eines Vorgangs — hier (und nur hier) wird die Zuordnung geändert. */
export function ZustaendigAuswahl({ leadId }: { leadId: string }) {
  const [team, setTeam] = useState<{ id: string; name: string }[] | null>(null)
  const [wert, setWert] = useState<string>('')

  useEffect(() => {
    let aktiv = true
    getVorgangZustaendig(leadId).then((res) => {
      if (!aktiv || !res.ok) return
      setTeam(res.team)
      setWert(res.zustaendigId ?? '')
    })
    return () => {
      aktiv = false
    }
  }, [leadId])

  if (!team?.length) return null

  return (
    <label className="dh-zustaendig">
      <span className="dh-zustaendig__label">Zuständig</span>
      <MockSelect
        className={cn('vg-zust__select', !wert && 'is-leer')}
        value={wert}
        onChange={(e) => {
          const neu = e.target.value
          const vorher = wert
          setWert(neu)
          setVorgangZustaendig(leadId, neu || null).then((res) => {
            if (!res.ok) {
              setWert(vorher)
              toast.systemError(res)
            } else {
              toast.success(neu ? `Zuständig: ${team.find((m) => m.id === neu)?.name ?? ''}` : 'Zuordnung entfernt')
            }
          })
        }}
      >
        <option value="">Offen</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </MockSelect>
    </label>
  )
}
