'use client'

import { useState } from 'react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { ORG_FREIGABE_LABELS } from '@/lib/org/org-portal-helpers'
import { erneutOrgFreigabeAnfordernNachAblehnung } from '@/lib/org/hv-lead-actions'
import type { OrgFreigabeLogRow, OrgFreigabeStatus } from '@/lib/types'
import { formatDatumZeit } from '@/lib/utils'

export function AngebotOrgFreigabeBanner({
  leadId,
  angebotId,
  orgFreigabeStatus,
  orgFreigabeLog,
  gesamtFix,
  gesamtMax,
  onDone,
}: {
  leadId: string
  angebotId: string
  orgFreigabeStatus?: OrgFreigabeStatus | null
  orgFreigabeLog?: OrgFreigabeLogRow[] | null
  gesamtFix?: number | null
  gesamtMax?: number | null
  onDone?: () => void
}) {
  const status = orgFreigabeStatus ?? 'nicht_noetig'
  if (status === 'nicht_noetig' && !(orgFreigabeLog?.length ?? 0)) return null

  const [anpassung, setAnpassung] = useState('')
  const [busy, setBusy] = useState(false)

  const badgeStatus =
    status === 'freigegeben' || status === 'nicht_noetig'
      ? 'done'
      : status === 'ausstehend'
        ? 'offer'
        : status === 'abgelehnt'
          ? 'cancel'
          : 'order'

  async function onErneutAnfordern() {
    const notiz = anpassung.trim()
    if (!notiz) {
      toast.error('Bitte kurz beschreiben, was angepasst wurde.')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const r = await erneutOrgFreigabeAnfordernNachAblehnung({
        leadId,
        angebotId,
        anpassungNotiz: notiz,
        gesamtFix: gesamtFix ?? null,
        gesamtMax: gesamtMax ?? null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Freigabe erneut angefordert')
      setAnpassung('')
      onDone?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <MockCard title="Org-Freigabe" icon="shield-check">
      <div className="flex flex-wrap items-center gap-2">
        <MockBadge kind={hubSpotStatusToMockBadgeKind(badgeStatus)}>
          {ORG_FREIGABE_LABELS[status]}
        </MockBadge>
        {status === 'ausstehend' ? (
          <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
            Angebot liegt vor — Kunde/HV kann annehmen oder ablehnen.
          </span>
        ) : null}
        {status === 'abgelehnt' ? (
          <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
            Freigabe abgelehnt — nach Anpassung erneut anfordern.
          </span>
        ) : null}
      </div>

      {status === 'abgelehnt' ? (
        <div className="mt-3 space-y-3 border-t border-bw-border pt-3">
          <Textarea
            plain
            label="Was wurde angepasst?"
            required
            rows={3}
            value={anpassung}
            onChange={(e) => setAnpassung(e.target.value)}
            placeholder="Kurz für die Hausverwaltung …"
            disabled={busy}
          />
          <MockBtn
            kind="ghost"
            sm
            disabled={busy || !anpassung.trim()}
            onClick={() => void onErneutAnfordern()}
          >
            Freigabe erneut anfordern
          </MockBtn>
        </div>
      ) : null}

      {orgFreigabeLog && orgFreigabeLog.length > 0 ? (
        <ul className="mt-3 divide-y divide-bw-border border-t border-bw-border pt-2 text-[length:var(--fs-meta)]">
          {orgFreigabeLog.slice(0, 5).map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:justify-between sm:gap-3">
              <span className="text-bw-text">
                <span className="capitalize">{e.aktion}</span>
                {e.notiz?.trim() ? (
                  <span className="text-bw-text-muted"> — {e.notiz.trim()}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-bw-text-muted">{formatDatumZeit(e.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </MockCard>
  )
}
