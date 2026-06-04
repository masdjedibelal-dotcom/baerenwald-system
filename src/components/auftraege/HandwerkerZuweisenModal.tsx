'use client'

import { useEffect, useState, useTransition } from 'react'
import { HardHat } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  assignAuftragHandwerkerGewerk,
  assignAuftragHandwerkerPosition,
  listHandwerkerFuerGewerk,
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
    }
  | {
      type: 'position'
      position: AuftragPosition
      gewerkId: string
      gewerkName: string
    }

export function HandwerkerZuweisenModal({
  open,
  onClose,
  auftragId,
  kontext,
  scope,
  onDone,
  onMailOpen,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  kontext: HandwerkerZuweisenKontext
  scope: HandwerkerZuweisenScope | null
  onDone: () => void
  /** Nach Zuweisung/Wechsel: Partner-Mail-Vorschau (CRM-Resend) */
  onMailOpen: (mail: HandwerkerZuweisungMailTarget) => void
}) {
  const isMobile = useIsMobile()
  const [pending, startTransition] = useTransition()
  const [loadingList, setLoadingList] = useState(false)
  const [hwList, setHwList] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [listErr, setListErr] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [status, setStatus] = useState<AuftragHandwerkerZuweisungStatus>('angefragt')

  const gewerkId = scope?.type === 'gewerk' ? scope.gewerkId : scope?.gewerkId ?? ''
  const gewerkName = scope?.type === 'gewerk' ? scope.gewerkName : scope?.gewerkName ?? ''

  const selectedHw = hwList.find((h) => h.id === selectedId)

  useEffect(() => {
    if (!open || !scope || !gewerkId) return
    setSelectedId('')
    setStatus('angefragt')
    setListErr(null)
    setLoadingList(true)
    void (async () => {
      const r = await listHandwerkerFuerGewerk(gewerkId)
      if (!r.ok) {
        setListErr(r.message)
        setHwList([])
      } else {
        setHwList(r.handwerker)
      }
      setLoadingList(false)
    })()
  }, [open, scope, gewerkId])

  function zuweisen() {
    if (!scope || !selectedId) {
      toast.error('Bitte Handwerker auswählen.')
      return
    }
    const hwName = selectedHw?.name ?? 'Partner'
    startTransition(async () => {
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

  const title =
    scope?.type === 'position'
      ? `Handwerker — ${scope.position.leistung_name}`
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
        Zuweisen
      </Button>
    </div>
  )

  const body = (
    <>
      <p className="mb-3 text-sm text-bw-text-muted">
        {scope?.type === 'position'
          ? 'Handwerker für diese Leistung auswählen. Danach öffnet sich die Partner-Mail-Vorschau.'
          : `Handwerker für das Gewerk „${gewerkName}“ auswählen. Danach öffnet sich die Partner-Mail-Vorschau.`}
      </p>
      {(kontext.startDatum || kontext.endDatum) && (
        <p className="mb-3 text-xs text-bw-text-muted">
          Zeitraum: {kontext.startDatum ? formatDatum(kontext.startDatum) : '—'}
          {' – '}
          {kontext.endDatum ? formatDatum(kontext.endDatum) : '—'}
          {' · '}
          {kontext.kundeName}
        </p>
      )}
      <Select
        label="Status nach Zuweisung"
        name="hw-status"
        value={status}
        onChange={(e) => setStatus(e.target.value as AuftragHandwerkerZuweisungStatus)}
        options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        className="mb-4"
      />
      {listErr ? <p className="mb-2 text-sm text-danger">{listErr}</p> : null}
      {loadingList ? (
        <p className="text-sm text-bw-text-muted">Handwerker werden geladen…</p>
      ) : hwList.length === 0 ? (
        <p className="text-sm text-bw-text-muted">Keine Handwerker für dieses Gewerk.</p>
      ) : (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {hwList.map((h) => (
            <li key={h.id}>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-bw-border p-3 hover:bg-bw-hover">
                <input
                  type="radio"
                  name="hw-pick"
                  className="mt-1"
                  checked={selectedId === h.id}
                  onChange={() => setSelectedId(h.id)}
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
            </li>
          ))}
        </ul>
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
