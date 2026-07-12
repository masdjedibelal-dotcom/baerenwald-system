'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { updateAuftragBetreuer } from '@/app/(dashboard)/auftraege/actions'
import { formatAuftragsNr, auftragWertAnzeige } from '@/lib/auftraege/auftrag-liste-helpers'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { AuftragDetail } from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { DetailProp } from '@/components/ui/detail-prop'
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
    <Card title="Auftragsdaten">
      <div className="props">
        <DetailProp label="Auftrag">{nr}</DetailProp>
        <DetailProp label="Kunde">
          {detail.kunden?.id ? (
            <Link href={`/kunden/${detail.kunden.id}`} className="font-medium text-bw-link">
              {detail.kunden.name}
            </Link>
          ) : (
            detail.kunden?.name ?? '—'
          )}
        </DetailProp>
        <DetailProp label="Region">{ort}</DetailProp>
        <DetailProp label="Beginn">
          {detail.start_datum ? formatDatum(detail.start_datum) : '—'}
        </DetailProp>
        <DetailProp label="Ende geplant">
          {detail.end_datum ? formatDatum(detail.end_datum) : '—'}
        </DetailProp>
        <DetailProp label="Projektleitung">
          <div className="space-y-1">
            <select
              className="input max-w-full"
              value={betreuerId}
              onChange={(e) => onBetreuerChange(e.target.value)}
              disabled={pending}
            >
              <option value="">— Keine Zuweisung —</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.telefon ? ` · ${m.telefon}` : ''}
                </option>
              ))}
            </select>
            <p className="prop-form-hint">
              Ansprechpartner im Kundenportal (Name, E-Mail, Telefon aus Team-Profil).
            </p>
          </div>
        </DetailProp>
        <DetailProp label="Auftragswert">
          <span className="font-semibold tabular-nums text-bw-text">{wert}</span>
        </DetailProp>
      </div>
    </Card>
  )
}
