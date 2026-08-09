'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { HandwerkerEinreichungPruefung } from '@/components/angebote/HandwerkerEinreichungPruefung'
import { HandwerkerEinreichungManuellModal } from '@/components/angebote/HandwerkerEinreichungManuellModal'
import { updateAuftragPositionHandwerkerStatus } from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  auftragHwStatusBadgeClass,
  auftragHwStatusLabel,
  type AuftragHandwerkerZuweisungStatus,
} from '@/lib/auftraege/auftrag-handwerker-status'
import { effektiverHandwerkerStatus } from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import { labelHandwerkerAblehnung } from '@/lib/angebote/ablehnung-labels'
import { hasHwEinreichung, hwStatusBadgeClass, hwStatusLabel } from '@/lib/partner/handwerker-einreichung'
import {
  hwKonditionenArtBadgeClass,
  hwKonditionenArtLabel,
  hwKonditionDelta,
  hwKonditionForAuftragPosition,
  parseHwKonditionen,
} from '@/lib/partner/hw-konditionen'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { cn, formatDatumZeit } from '@/lib/utils'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition } from '@/lib/types'

export function AuftragPositionHandwerkerBadge({
  pos,
  partnerRow,
  className,
}: {
  pos: Pick<AuftragPosition, 'handwerker_id' | 'handwerker_status'>
  partnerRow: AngebotHandwerkerRow | null
  className?: string
}) {
  if (!pos.handwerker_id) return null
  const st = effektiverHandwerkerStatus(pos, partnerRow)
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
        auftragHwStatusBadgeClass(st),
        className
      )}
    >
      HW: {auftragHwStatusLabel(st)}
    </span>
  )
}

function KonditionenWarteHinweis({
  zuweisungStatus,
  partnerAkzeptiert,
  eingereicht,
}: {
  zuweisungStatus: string
  partnerAkzeptiert: boolean
  eingereicht: boolean
}) {
  if (eingereicht) return null

  if (partnerAkzeptiert) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        <span className="font-semibold">Zuweisung angenommen — Konditionen fehlen noch.</span>{' '}
        Der Partner muss im Portal „Gegenangebot senden“ oder Preise bestätigen. Alternativ können
        Sie das Angebot manuell erfassen.
      </p>
    )
  }

  if (zuweisungStatus === 'angefragt' || zuweisungStatus === 'warten') {
    return (
      <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950">
        Warte auf Antwort des Partners (Annahme oder Gegenangebot im Partner-Portal).
      </p>
    )
  }

  return (
    <p className="rounded-md border border-bw-border bg-bw-bg px-3 py-2 text-xs text-bw-text-muted">
      Noch keine Konditionen vom Partner — nach Zuweisung und Annahme erscheint hier das
      Gegenangebot zur Prüfung.
    </p>
  )
}

function PositionKonditionVorschau({
  kondition,
  art,
}: {
  kondition: NonNullable<ReturnType<typeof hwKonditionForAuftragPosition>>
  art: 'bestaetigt' | 'gegenvorschlag'
}) {
  const delta = hwKonditionDelta(kondition.ek_netto, kondition.hw_netto)

  return (
    <div className="rounded-md border border-bw-border bg-surface p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
          Partner-Vorschlag diese Leistung
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            hwKonditionenArtBadgeClass(art)
          )}
        >
          {hwKonditionenArtLabel(art)}
        </span>
        {kondition.geaendert ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-950">
            Geändert
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-medium uppercase text-bw-text-muted">Vorschlag netto</p>
          <p className="tabular-nums font-medium text-bw-text">
            {kondition.ek_netto != null && kondition.ek_netto > 0
              ? betragAnzeige(kondition.ek_netto, null, null)
              : 'Preis folgt'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase text-bw-text-muted">Vergütung netto</p>
          <p className="tabular-nums font-semibold text-bw-text">
            {betragAnzeige(kondition.hw_netto, null, null)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase text-bw-text-muted">Differenz</p>
          <p
            className={cn(
              'tabular-nums font-medium',
              delta != null && delta > 0 && 'text-amber-800',
              delta != null && delta < 0 && 'text-emerald-800',
              delta == null && 'text-bw-text-muted'
            )}
          >
            {delta != null
              ? `${delta > 0 ? '+' : ''}${betragAnzeige(delta, null, null)}`
              : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function AuftragPositionHandwerkerPanel({
  pos,
  partnerRow,
  angebotId,
  angebotTitel,
  angebotPositionen = [],
  auftragId,
  onChanged,
  onAcceptWizard,
  layout = 'default',
  advancedOpen = false,
  onAdvancedToggle,
}: {
  pos: AuftragPosition
  partnerRow: AngebotHandwerkerRow | null
  angebotId: string | null
  angebotTitel: string
  angebotPositionen?: AngebotPosition[]
  auftragId: string
  onChanged: () => void
  onAcceptWizard?: (ctx: {
    auftragId: string
    handwerkerId: string
    gewerkId: string
    zuweisungId: string
  }) => void
  layout?: 'default' | 'embedded'
  advancedOpen?: boolean
  onAdvancedToggle?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [manuellOpen, setManuellOpen] = useState(false)
  const [crmStatusOpenLocal, setCrmStatusOpenLocal] = useState(false)
  const crmStatusOpen = layout === 'embedded' ? advancedOpen : crmStatusOpenLocal
  const toggleCrmStatus =
    layout === 'embedded' && onAdvancedToggle
      ? onAdvancedToggle
      : () => setCrmStatusOpenLocal((v) => !v)
  const embedded = layout === 'embedded'

  if (!pos.handwerker_id) return null

  const zuweisungStatus = effektiverHandwerkerStatus(pos, partnerRow)
  const partnerPortalStatus = (partnerRow?.status ?? '').toLowerCase()
  const partnerAkzeptiert = partnerPortalStatus === 'akzeptiert' || zuweisungStatus === 'akzeptiert'
  const eingereicht = partnerRow ? hasHwEinreichung(partnerRow) : false
  const hwStatusKonditionen = (partnerRow?.hw_status ?? '').toLowerCase()
  const konditionenWartenAufHw = hwStatusKonditionen === 'bestaetigt'
  const konditionen = partnerRow ? parseHwKonditionen(partnerRow.hw_konditionen) : null
  const konditionZeile = konditionen
    ? hwKonditionForAuftragPosition(
        konditionen,
        {
          id: pos.id,
          leistung_name: pos.leistung_name,
          gewerk_slug: pos.gewerk_slug,
          gewerk_name: pos.gewerk_name,
        },
        angebotPositionen,
        pos.gewerk_slug,
        pos.gewerk_name
      )
    : null
  const kannManuell =
    Boolean(angebotId && partnerRow?.id) &&
    !eingereicht &&
    partnerPortalStatus !== 'abgelehnt'

  function changeStatus(st: AuftragHandwerkerZuweisungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionHandwerkerStatus({
        auftragId,
        positionId: pos.id,
        status: st,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  const ablehnungBlock =
    partnerRow &&
    (partnerRow.status ?? '').toLowerCase() === 'abgelehnt' &&
    partnerRow.ablehnung_grund ? (
      <p className="rounded-md border border-danger/30 bg-danger/5 px-2 py-1.5 text-xs text-danger">
        Ablehnung: {labelHandwerkerAblehnung(partnerRow.ablehnung_grund)}
        {partnerRow.antwort_notiz?.trim() ? ` — ${partnerRow.antwort_notiz.trim()}` : ''}
      </p>
    ) : null

  const crmAdvancedBlock = (
    <div className={embedded ? 'pos-v2-advanced' : undefined}>
      {!embedded ? (
        <button
          type="button"
          className="mt-2 flex items-center gap-1 text-[11px] text-bw-text-muted hover:text-bw-text"
          onClick={toggleCrmStatus}
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', crmStatusOpen && 'rotate-180')}
            aria-hidden
          />
          CRM-Status manuell setzen
        </button>
      ) : (
        <button
          type="button"
          className="pos-v2-advanced-trigger"
          onClick={toggleCrmStatus}
          aria-expanded={crmStatusOpen}
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', crmStatusOpen && 'rotate-180')}
            aria-hidden
          />
          Erweitert — CRM-Status manuell
        </button>
      )}
      {crmStatusOpen ? (
        <div className={embedded ? 'pos-v2-advanced-body' : 'mt-2'}>
          <Select
            label="Zuweisungs-Status (intern)"
            name={`hw-status-${pos.id}`}
            value={zuweisungStatus as AuftragHandwerkerZuweisungStatus}
            disabled={pending}
            onChange={(e) => changeStatus(e.target.value as AuftragHandwerkerZuweisungStatus)}
            options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            className="text-sm"
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-3">
      {!embedded ? (
        <div className="rounded-lg border border-bw-border bg-bw-bg-soft/40 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-bw-text-muted">
            Zuweisung
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pos.handwerker?.name ? (
              <span className="text-sm font-medium text-bw-text">{pos.handwerker.name}</span>
            ) : null}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                auftragHwStatusBadgeClass(zuweisungStatus)
              )}
            >
              {auftragHwStatusLabel(zuweisungStatus)}
            </span>
            {partnerRow?.antwort_at ? (
              <span className="text-xs text-bw-text-muted">
                {formatDatumZeit(partnerRow.antwort_at)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-bw-text-muted">
            „Akzeptiert“ bedeutet: Partner hat die Anfrage angenommen — nicht automatisch, dass Preise
            vereinbart sind.
          </p>
          {ablehnungBlock}
          {crmAdvancedBlock}
        </div>
      ) : null}

      <div
        className={cn(
          embedded ? 'pos-v2-konditionen-card' : 'rounded-lg border border-bw-border bg-bw-bg-soft/40 p-3'
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {!embedded ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-bw-text-muted">
              Konditionen & Verhandlung
            </p>
          ) : (
            <p className="text-sm font-semibold text-bw-text">Gegenvorschlag & Aktionen</p>
          )}
          {eingereicht ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                hwStatusBadgeClass(partnerRow?.hw_status)
              )}
            >
              {hwStatusLabel(partnerRow?.hw_status)}
            </span>
          ) : null}
        </div>

        {!partnerRow ? (
          <p className="text-xs text-bw-text-muted">
            Keine Angebots-Zuweisung verknüpft — Handwerker wurde ggf. nur direkt auf dem Auftrag
            gesetzt.
          </p>
        ) : (
          <>
            <KonditionenWarteHinweis
              zuweisungStatus={zuweisungStatus}
              partnerAkzeptiert={partnerAkzeptiert}
              eingereicht={eingereicht}
            />

            {embedded && ablehnungBlock ? <div className="mb-2">{ablehnungBlock}</div> : null}

            {konditionZeile && konditionen && (!eingereicht || embedded) ? (
              <div className={cn('mt-3', embedded && eingereicht && 'opacity-90')}>
                <PositionKonditionVorschau kondition={konditionZeile} art={konditionen.art} />
              </div>
            ) : null}

            {partnerRow.hw_notiz?.trim() ? (
              <p className="mt-2 text-xs text-bw-text-muted whitespace-pre-wrap">
                <span className="font-medium text-bw-text">Partner-Notiz:</span>{' '}
                {partnerRow.hw_notiz.trim()}
              </p>
            ) : null}

            {konditionenWartenAufHw ? (
              <p className="mt-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
                <span className="font-semibold">CRM hat übernommen.</span> Der Partner muss die vereinbarten
                Konditionen im Portal noch bestätigen — danach Status „übernommen“ und optional Angebots-PDF.
              </p>
            ) : null}

            {kannManuell ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3 h-7 gap-1 text-xs"
                onClick={() => setManuellOpen(true)}
              >
                <FileUp className="h-3.5 w-3.5" aria-hidden />
                Angebot manuell erfassen
              </Button>
            ) : null}

            {angebotId && partnerRow.id && eingereicht ? (
              <HandwerkerEinreichungPruefung
                z={partnerRow}
                angebotId={angebotId}
                angebotTitel={angebotTitel}
                auftragId={auftragId}
                auftragPosition={pos}
                angebotPositionen={angebotPositionen}
                onRefresh={onChanged}
                onAcceptWizard={onAcceptWizard}
              />
            ) : null}

            {embedded ? crmAdvancedBlock : null}
          </>
        )}
      </div>

      {angebotId && partnerRow?.id ? (
        <HandwerkerEinreichungManuellModal
          open={manuellOpen}
          onClose={() => setManuellOpen(false)}
          angebotId={angebotId}
          zuweisungId={partnerRow.id}
          handwerkerName={pos.handwerker?.name ?? 'Partner'}
          gewerkName={partnerRow.gewerke?.name ?? pos.gewerk_name}
          onSaved={() => {
            setManuellOpen(false)
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
