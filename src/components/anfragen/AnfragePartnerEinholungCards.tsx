'use client'
import { useState } from 'react'
import { useLocalTransition } from '@/components/ui/action-busy'

import { toast } from '@/components/ui/app-toast'
import { getHandwerkerEinreichungPdfUrl, loescheHandwerkerAnfrage } from '@/app/(dashboard)/angebote/actions'
import type { AnfragePartnerEinholungRow } from '@/app/(dashboard)/anfragen/anfrage-handwerker-anfragen-actions'
import { LvAnfrageDetailSheet } from '@/components/anfragen/LvAnfrageDetailSheet'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { darfPartnerLvAnfrageLoeschen } from '@/lib/angebote/partner-einholung'
import { hasHwEinreichung, hwStatusLabel } from '@/lib/partner/handwerker-einreichung'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusTone } from '@/lib/status/status-tone'
import { cn } from '@/lib/utils'

function statusLabel(z: AnfragePartnerEinholungRow): string {
  if (hasHwEinreichung(z)) {
    return hwStatusLabel(z.hw_status) || 'Eingereicht'
  }
  const st = (z.status ?? '').toLowerCase()
  if (st === 'angefragt') return 'Angefragt'
  if (st === 'abgelehnt') return 'Abgelehnt'
  return 'Ausstehend'
}

function statusForBadge(z: AnfragePartnerEinholungRow): {
  status: string
  label: string
  tone?: StatusTone
} {
  if (hasHwEinreichung(z)) {
    const hw = (z.hw_status ?? 'eingereicht').toLowerCase()
    const toneByHw: Record<string, StatusTone> = {
      eingereicht: 'blau',
      bestaetigt: 'blau',
      uebernommen: 'gruen',
      abgelehnt: 'rot',
      rueckfrage: 'blau',
      offen: 'grau',
    }
    return {
      status: hw,
      label: statusLabel(z),
      tone: toneByHw[hw] ?? 'grau',
    }
  }
  const st = (z.status ?? 'ausstehend').toLowerCase()
  if (st === 'ausstehend') return { status: 'offen', label: 'Ausstehend' }
  return { status: st, label: statusLabel(z) }
}

function EinholungRow({
  z,
  onOpen,
  onDeleted,
}: {
  z: AnfragePartnerEinholungRow
  onOpen: () => void
  onDeleted?: () => void
}) {
  const [pending, startTransition] = useLocalTransition()
  const kannLoeschen = darfPartnerLvAnfrageLoeschen(z)
  const name =
    (z.handwerker as { firma?: string | null } | null)?.firma?.trim() ||
    z.handwerker?.name?.trim() ||
    'Handwerker'
  const badge = statusForBadge(z)
  const eingereicht = hasHwEinreichung(z)

  function loeschen(e: React.MouseEvent) {
    e.stopPropagation()
    if (
      !window.confirm(
        `LV-Anfrage an ${name} löschen? Der Vorgang verschwindet auch im Partner-Portal.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const res = await loescheHandwerkerAnfrage({
        angebotId: z.angebot_id,
        zuweisungId: z.id,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('LV-Anfrage gelöscht')
      onDeleted?.()
    })
  }

  return (
    <li className="lv-anfrage-item">
      <button
        type="button"
        className={cn(
          'lv-anfrage-row-btn einst-list-item w-full text-left',
          eingereicht && 'lv-anfrage-row-btn--eingereicht'
        )}
        onClick={onOpen}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[length:var(--fs-text)] font-semibold text-[var(--text)]">{name}</div>
          <div className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            {z.gewerke?.name ?? '—'}
            {eingereicht ? ' · Antwort eingegangen' : ' · Warte auf Partner'}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <StatusBadge status={badge.status} label={badge.label} tone={badge.tone} />
          {kannLoeschen ? (
            <MockBtn sm className="danger-outline" disabled={pending} onClick={loeschen}>
              {pending ? '…' : 'Löschen'}
            </MockBtn>
          ) : null}
        </div>
      </button>
    </li>
  )
}

export function AnfragePartnerEinholungCards({
  rows,
  onAnfragen,
  showCta = false,
  onDeleted,
}: {
  rows: AnfragePartnerEinholungRow[]
  onAnfragen?: () => void
  /** Nur wenn der Empty-CTA nicht schon denselben Button zeigt. */
  showCta?: boolean
  onDeleted?: () => void
}) {
  const [sheetRow, setSheetRow] = useState<AnfragePartnerEinholungRow | null>(null)

  if (!rows.length && !showCta) return null

  const headerCta =
    showCta && onAnfragen ? (
      <MockBtn sm kind="secondary" onClick={onAnfragen}>
        LV anfragen
      </MockBtn>
    ) : null

  const title = rows.length ? `LV-Anfrage · ${rows.length}` : 'LV-Anfrage'

  if (!rows.length) {
    return (
      <MockCard title={title} icon="send" className="dshell-framed" actions={headerCta}>
        <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          Noch keine Partner angefragt — LV per Button oben anstoßen.
        </p>
      </MockCard>
    )
  }

  return (
    <>
      <MockCard title={title} icon="send" className="dshell-framed" actions={headerCta}>
        <ul className="einst-list lv-anfrage-list">
          {rows.map((z) => (
            <EinholungRow
              key={z.id}
              z={z}
              onOpen={() => setSheetRow(z)}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      </MockCard>

      <LvAnfrageDetailSheet
        row={sheetRow}
        open={Boolean(sheetRow)}
        onClose={() => setSheetRow(null)}
      />
    </>
  )
}
