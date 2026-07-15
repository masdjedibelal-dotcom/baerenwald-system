'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { updateAuftragBetreuer } from '@/app/(dashboard)/auftraege/actions'
import { formatAuftragsNr, auftragWertAnzeige } from '@/lib/auftraege/auftrag-liste-helpers'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { AuftragDetail } from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'

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
  const ort = detail.kunden?.ort?.trim() || detail.kunden?.plz?.trim() || '—'
  const wert = auftragWertAnzeige(detail)
  const betreuerId = detail.betreuer_id?.trim() ?? ''

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
    <MockCard title="Auftragsdaten" icon="clipboard-list">
      <div className="props">
        <MockProp label="Auftrag">{nr}</MockProp>
        <MockProp label="Kunde" link={Boolean(detail.kunden?.id)}>
          {detail.kunden?.id ? (
            <Link href={`/kunden/${detail.kunden.id}`}>{detail.kunden.name}</Link>
          ) : (
            detail.kunden?.name ?? '—'
          )}
        </MockProp>
        <MockProp label="Region">{ort}</MockProp>
        <MockProp label="Beginn">
          {detail.start_datum ? formatDatum(detail.start_datum) : '—'}
        </MockProp>
        <MockProp label="Ende geplant">
          {detail.end_datum ? formatDatum(detail.end_datum) : '—'}
        </MockProp>
        <MockProp label="Projektleitung">
          <select
            className="input max-w-full"
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
        </MockProp>
        <MockProp label="Auftragswert">
          <span style={{ fontWeight: 600, color: 'var(--green)' }}>{wert}</span>
        </MockProp>
      </div>
    </MockCard>
  )
}
