'use client'
import { useTransition } from '@/components/ui/action-busy'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { updateAuftragBetreuer } from '@/app/(dashboard)/auftraege/actions'
import { formatAuftragsNr, auftragWertAnzeige } from '@/lib/auftraege/auftrag-liste-helpers'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { AuftragDetail } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'

/**
 * Auftragsdaten — Nr · Projektleitung · Auftragswert
 * (Termine / Titel / Bauprojekt in der Auftrag-Karte darunter.)
 */
export function AuftragDetailTopCards({
  detail,
  team,
}: {
  detail: AuftragDetail
  team: CrmTeamMitglied[]
}) {
  const { refresh } = useCrmRefresh()
  const [pending, startTransition] = useTransition()
  const nr = formatAuftragsNr(detail)
  const wert = auftragWertAnzeige(detail)
  const betreuerId = detail.betreuer_id?.trim() ?? ''
  const betreuerName = team.find((m) => m.id === betreuerId)?.name?.trim()

  function onBetreuerChange(nextId: string) {
    startTransition(async () => {
      const res = await updateAuftragBetreuer(detail.id, nextId || null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Projektleitung gespeichert')
      refresh()
    })
  }

  return (
    <MockCard title="Auftragsdaten">
      <div className="props">
        <MockProp label="Auftrag">{nr}</MockProp>
        <MockProp label="Projektleitung">
          {team.length ? (
            <select
              className="sel"
              value={betreuerId}
              onChange={(e) => onBetreuerChange(e.target.value)}
              disabled={pending}
              aria-label="Projektleitung"
            >
              <option value="">— Keine Zuweisung —</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.telefon ? ` · ${m.telefon}` : ''}
                </option>
              ))}
            </select>
          ) : (
            betreuerName || '—'
          )}
        </MockProp>
        <MockProp label="Auftragswert">
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{wert}</span>
        </MockProp>
      </div>
    </MockCard>
  )
}
