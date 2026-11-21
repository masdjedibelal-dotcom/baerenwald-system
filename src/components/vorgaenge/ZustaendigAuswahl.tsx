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
  const [speichert, setSpeichert] = useState(false)

  useEffect(() => {
    let aktiv = true
    getVorgangZustaendig(leadId).then((res) => {
      if (!aktiv) return
      if (!res.ok) {
        setTeam([])
        return
      }
      setTeam(res.team)
      setWert(res.zustaendigId ?? '')
    })
    return () => {
      aktiv = false
    }
  }, [leadId])

  // Während des Ladens Platz freihalten, damit die Seite nicht springt
  if (team === null) {
    return (
      <label className="dh-zustaendig" aria-busy="true">
        <span className="dh-zustaendig__label">Zuständig</span>
        <MockSelect className="vg-zust__select is-leer" disabled value="">
          <option value="">Nicht zugeordnet</option>
        </MockSelect>
      </label>
    )
  }
  if (!team.length) return null

  return (
    <label className="dh-zustaendig">
      <span className="dh-zustaendig__label">Zuständig</span>
      <MockSelect
        className={cn('vg-zust__select', !wert && 'is-leer')}
        value={wert}
        disabled={speichert}
        onChange={(e) => {
          const neu = e.target.value
          const vorher = wert
          setWert(neu)
          setSpeichert(true)
          setVorgangZustaendig(leadId, neu || null).then((res) => {
            setSpeichert(false)
            if (!res.ok) {
              setWert(vorher)
              toast.systemError(res)
            } else {
              toast.success(neu ? `Zuständig: ${team.find((m) => m.id === neu)?.name ?? ''}` : 'Zuordnung entfernt')
            }
          })
        }}
      >
        <option value="">Nicht zugeordnet</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </MockSelect>
      {speichert ? <span className="dh-zustaendig__label" aria-live="polite">Wird gespeichert…</span> : null}
    </label>
  )
}
