'use client'

import { useEffect, useState, useTransition } from 'react'
import { HardHat } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  assignAuftragHandwerkerGewerk,
  assignAuftragHandwerkerPosition,
  listHandwerkerAuswahlFuerGewerk,
  replaceAuftragHandwerkerUndSenden,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  type AuftragHandwerkerZuweisungStatus,
} from '@/lib/auftraege/auftrag-handwerker-status'
import { cn, formatDatum } from '@/lib/utils'
import type { HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import type { AuftragPosition } from '@/lib/types'

export type HandwerkerZuweisenKontext = {
  kundeName: string
  adresse?: string | null
  plz?: string | null
  ort?: string | null
  startDatum?: string | null
  endDatum?: string | null
  notizen?: string | null
}

export type HandwerkerZuweisenScope =
  | {
      type: 'gewerk'
      gewerkId: string
      gewerkName: string
      gewerkSlug?: string | null
      positionIds?: string[]
      leistungen: string[]
      /** TC-11d: abgelehnte Zuweisung ersetzen statt normal zuweisen */
      replaceZuweisungId?: string
    }
  | {
      type: 'position'
      position: AuftragPosition
      gewerkId: string
      gewerkName: string
      gewerkSlug?: string | null
      replaceZuweisungId?: string
    }

function HandwerkerPickRow({
  h,
  selected,
  disabled,
  onSelect,
}: {
  h: HandwerkerGewerkListeEintrag
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-bw-border p-3 hover:bg-bw-hover">
      <input
        type="radio"
        name="hw-pick"
        className="mt-1"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-bw-text">
          {h.name}
          {h.firma ? <span className="text-bw-text-muted"> · {h.firma}</span> : null}
        </p>
        {h.telefon ? (
          <a href={`tel:${h.telefon.replace(/\s/g, '')}`} className="text-bw-link underline">
            {h.telefon}
          </a>
        ) : (
          <span className="text-bw-text-muted">Kein Telefon</span>
        )}
        <span
          className={cn(
            'mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium',
            h.verfuegbar ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'
          )}
        >
          {h.verfuegbar ? 'Verfügbar' : 'Im Einsatz'}
        </span>
      </div>
    </label>
  )
}

export function HandwerkerZuweisenModal({
  open,
  onClose,
  auftragId,
  kontext,
  scope,
  onDone,
  onMailOpen,
  projektName,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  kontext: HandwerkerZuweisenKontext
  scope: HandwerkerZuweisenScope | null
  onDone: () => void
  /** Nach Zuweisung/Wechsel: Partner-Mail-Vorschau (CRM-Resend) */
  onMailOpen: (mail: HandwerkerZuweisungMailTarget) => void
  projektName?: string
}) {
  const isMobile = useIsMobile()
  const [pending, startTransition] = useTransition()
  const [loadingList, setLoadingList] = useState(false)
  const [empfohlen, setEmpfohlen] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [alle, setAlle] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [listErr, setListErr] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [status, setStatus] = useState<AuftragHandwerkerZuweisungStatus>('angefragt')

  const gewerkId = scope?.gewerkId ?? ''
  const gewerkSlug = scope?.gewerkSlug ?? null
  const gewerkName = scope?.type === 'gewerk' ? scope.gewerkName : scope?.gewerkName ?? ''
  const scopePosCount = scope?.type === 'gewerk' ? scope.positionIds?.length ?? 0 : 0
  const scopeLeistungenCount = scope?.type === 'gewerk' ? scope.leistungen?.length ?? scopePosCount : 0

  const selectedHw =
    empfohlen.find((h) => h.id === selectedId) ?? alle.find((h) => h.id === selectedId)

  useEffect(() => {
    if (!open || !scope) return
    setSelectedId('')
    setStatus('angefragt')
    setListErr(null)
    setEmpfohlen([])
    setAlle([])
    setLoadingList(true)
    void (async () => {
      const r = await listHandwerkerAuswahlFuerGewerk({
        gewerkId: gewerkId || null,
        gewerkSlug,
      })
      if (!r.ok) {
        setListErr(r.message)
      } else {
        setEmpfohlen(r.empfohlen)
        setAlle(r.alle)
      }
      setLoadingList(false)
    })()
  }, [open, scope, gewerkId, gewerkSlug])

  function zuweisen() {
    if (!scope || !selectedId) {
      toast.error('Bitte Handwerker auswählen.')
      return
    }
    const hwName = selectedHw?.name ?? 'Partner'
    const replaceId = scope.replaceZuweisungId?.trim()
    startTransition(async () => {
      if (replaceId) {
        const r = await replaceAuftragHandwerkerUndSenden({
          auftragId,
          alteZuweisungId: replaceId,
          neuerHandwerkerId: selectedId,
          projektName,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success('Neuer Partner disponiert — Anfrage im Portal gesendet.')
        onDone()
        onClose()
        return
      }

      const r =
        scope.type === 'position'
          ? await assignAuftragHandwerkerPosition({
              auftragId: scope.position.auftrag_id?.trim() || auftragId,
              positionId: scope.position.id,
              handwerkerId: selectedId,
              status,
            })
          : await assignAuftragHandwerkerGewerk({
              auftragId,
              gewerkId: scope.gewerkId,
              handwerkerId: selectedId,
              positionIds: scope.positionIds,
              status,
            })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Handwerker zugewiesen')
      onMailOpen({
        handwerkerId: selectedId,
        handwerkerName: hwName,
        gewerkName,
        positionId: scope.type === 'position' ? scope.position.id : undefined,
        positionIds: scope.type === 'gewerk' ? scope.positionIds : undefined,
      })
      onDone()
      onClose()
    })
  }

  const isReplace = Boolean(scope?.replaceZuweisungId)

  const title = isReplace
    ? scope?.type === 'position'
      ? `Anderen Partner — ${scope.position.leistung_name}`
      : `Anderen Partner — ${gewerkName}`
    : scope?.type === 'position'
      ? `Handwerker — ${scope.position.leistung_name}`
      : scopeLeistungenCount > 1
        ? `Handwerker — ${scopeLeistungenCount} Leistungen (${gewerkName})`
        : `Handwerker — ${gewerkName}`

  const footer = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
      <Button
        type="button"
        variant="primary"
        loading={pending}
        disabled={!selectedId || loadingList}
        onClick={zuweisen}
      >
        {isReplace ? 'Partner disponieren & anfragen' : 'Zuweisen'}
      </Button>
    </div>
  )

  const leistungenPreview =
    scope?.type === 'gewerk' && scope.leistungen.length > 0 ? (
      <div className="mb-4 rounded-lg border border-bw-border bg-bw-bg-soft/50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
          {scope.leistungen.length === 1 ? 'Leistung in der Anfrage' : `${scope.leistungen.length} Leistungen in einer Anfrage`}
        </p>
        <ul className="space-y-1.5 text-sm text-bw-text">
          {scope.leistungen.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-bw-primary">{i + 1}.</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null

  const body = (
    <>
      <p className="mb-3 text-sm text-bw-text-muted">
        {isReplace
          ? 'Der vorherige Partner hat abgelehnt. Wählen Sie einen Ersatz — die Anfrage geht direkt ins Partner-Portal.'
          : scope?.type === 'position'
            ? 'Handwerker für diese Leistung auswählen. Danach öffnet sich die Partner-Mail-Vorschau.'
            : scopeLeistungenCount > 1
              ? `${scopeLeistungenCount} Leistungen in „${gewerkName}“ — ein Handwerker, eine Partner-Mail.`
              : `Handwerker für das Gewerk „${gewerkName}“ auswählen. Danach öffnet sich die Partner-Mail-Vorschau.`}
      </p>
      {isReplace ? null : (
        <Select
          label="Status nach Zuweisung"
          name="hw-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as AuftragHandwerkerZuweisungStatus)}
          options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="mb-4"
        />
      )}
      {leistungenPreview}
      {(kontext.startDatum || kontext.endDatum) && (
        <p className="mb-3 text-xs text-bw-text-muted">
          Zeitraum: {kontext.startDatum ? formatDatum(kontext.startDatum) : '—'}
          {' – '}
          {kontext.endDatum ? formatDatum(kontext.endDatum) : '—'}
          {' · '}
          {kontext.kundeName}
        </p>
      )}
      {listErr ? <p className="mb-2 text-sm text-danger">{listErr}</p> : null}
      {loadingList ? (
        <p className="text-sm text-bw-text-muted">Handwerker werden geladen…</p>
      ) : empfohlen.length === 0 && alle.length === 0 ? (
        <p className="text-sm text-bw-text-muted">Keine aktiven Handwerker gefunden.</p>
      ) : (
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          <Accordion
            title={`Empfohlen${empfohlen.length ? ` · ${empfohlen.length}` : ''}`}
            defaultOpen
            className="hw-pick-accordion"
          >
            {empfohlen.length === 0 ? (
              <p className="text-sm text-bw-text-muted">
                Keine Handwerker mit diesem Gewerk in den Stammdaten — alle Partner unten.
              </p>
            ) : (
              <ul className="space-y-2">
                {empfohlen.map((h) => (
                  <li key={h.id}>
                    <HandwerkerPickRow
                      h={h}
                      selected={selectedId === h.id}
                      disabled={pending}
                      onSelect={() => setSelectedId(h.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Accordion>
          <Accordion
            title={`Alle Handwerker${alle.length ? ` · ${alle.length}` : ''}`}
            defaultOpen={empfohlen.length === 0}
            className="hw-pick-accordion"
          >
            {alle.length === 0 ? (
              <p className="text-sm text-bw-text-muted">Keine weiteren Handwerker.</p>
            ) : (
              <ul className="space-y-2">
                {alle.map((h) => (
                  <li key={h.id}>
                    <HandwerkerPickRow
                      h={h}
                      selected={selectedId === h.id}
                      disabled={pending}
                      onSelect={() => setSelectedId(h.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Accordion>
        </div>
      )}
      {selectedHw ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-bw-text-muted">
          <HardHat className="h-3.5 w-3.5 text-bw-primary" aria-hidden />
          Ausgewählt: <span className="font-medium text-bw-text">{selectedHw.name}</span>
        </p>
      ) : null}
    </>
  )

  if (isMobile) {
    return (
      <FormSheet open={open} onClose={onClose} breadcrumb="Auftrag" title={title} footer={footer} width="lg">
        {body}
      </FormSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" footer={footer}>
      {body}
    </Modal>
  )
}
