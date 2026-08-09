'use client'

import { useEffect, useState, useTransition } from 'react'
import { resolveMockIcon } from '@/lib/mock-icons'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  assignAuftragHandwerkerPosition,
  listHandwerkerAuswahlFuerGewerk,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import { cn } from '@/lib/utils'
import type { HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import type { AuftragPosition } from '@/lib/types'

const ToolIcon = resolveMockIcon('tool')

function hwInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase()
}

function HandwerkerPickRow({
  h,
  disabled,
  onAdd }: {
  h: HandwerkerGewerkListeEintrag
  disabled?: boolean
  onAdd: () => void
}) {
  return (
    <div className="hw-pick-row">
      <div className="hw-pick-row-main">
        <span className="hw-avatar" aria-hidden>
          {hwInitials(h.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="hw-pick-name">{h.name}</p>
          <p className="hw-pick-meta">
            {[h.firma, h.telefon].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <span
          className={cn(
            'hw-pick-badge',
            h.verfuegbar ? 'hw-pick-badge-free' : 'hw-pick-badge-busy'
          )}
        >
          {h.verfuegbar ? 'Verfügbar' : 'Im Einsatz'}
        </span>
      </div>
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onAdd}>
        Hinzufügen
      </Button>
    </div>
  )
}
function HandwerkerPickAccordion({
  title,
  emptyHint,
  rows,
  defaultOpen,
  pendingId,
  onAdd }: {
  title: string
  emptyHint?: string
  rows: HandwerkerGewerkListeEintrag[]
  defaultOpen?: boolean
  pendingId: string | null
  onAdd: (id: string) => void
}) {
  return (
    <Accordion title={title} defaultOpen={defaultOpen ?? false} className="hw-pick-accordion">
      {!rows.length ? (
        emptyHint ? <p className="hw-pick-empty">{emptyHint}</p> : null
      ) : (
        <ul className="hw-pick-list">
          {rows.map((h) => (
            <li key={h.id}>
              <HandwerkerPickRow
                h={h}
                disabled={!!pendingId}
                onAdd={() => onAdd(h.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Accordion>
  )
}

export type HandwerkerAuswahlTarget = {
  position: AuftragPosition
  gewerkId: string
  gewerkName: string
  gewerkSlug?: string | null
}
export function HandwerkerAuswahlModal({
  open,
  onClose,
  auftragId,
  target,
  onAssigned,
  onMailOpen }: {
  open: boolean
  onClose: () => void
  auftragId: string
  target: HandwerkerAuswahlTarget | null
  onAssigned: () => void
  /** Nach erfolgreicher Zuweisung: Partner-Mail-Vorschau öffnen */
  onMailOpen: (mail: HandwerkerZuweisungMailTarget) => void
}) {
  const isMobile = useIsMobile()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [listErr, setListErr] = useState<string | null>(null)
  const [empfohlen, setEmpfohlen] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [alle, setAlle] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [pendingHwId, setPendingHwId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !target) return
    setListErr(null)
    setLoading(true)
    setEmpfohlen([])
    setAlle([])
    void (async () => {
      const r = await listHandwerkerAuswahlFuerGewerk({
        gewerkId: target.gewerkId || null,
        gewerkSlug: target.gewerkSlug ?? null })
      if (!r.ok) {
        setListErr(r.message)
      } else {
        setEmpfohlen(r.empfohlen)
        setAlle(r.alle)
      }
      setLoading(false)
    })()
  }, [open, target])

  function hinzufuegen(handwerkerId: string) {
    if (!target) return
    const picked =
      empfohlen.find((h) => h.id === handwerkerId) ?? alle.find((h) => h.id === handwerkerId)
    setPendingHwId(handwerkerId)
    startTransition(async () => {
      const r = await assignAuftragHandwerkerPosition({
        auftragId: target.position.auftrag_id?.trim() || auftragId,
        positionId: target.position.id,
        handwerkerId,
        status: 'angefragt' })
      setPendingHwId(null)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Handwerker zugewiesen')
      onMailOpen({
        handwerkerId,
        handwerkerName: picked?.name ?? 'Partner',
        gewerkName: target.gewerkName,
        positionId: target.position.id })
      onAssigned()
      onClose()
    })
  }

  const leistungLabel = target?.position.leistung_name ?? 'Leistung'

  const footer = (
    <Button type="button" variant="secondary" onClick={onClose}>
      Schließen
    </Button>
  )

  const body = (
    <div className="hw-pick-modal auftrag-pos-compact">
      <p className="hw-pick-intro">
        <ToolIcon className="inline h-4 w-4 text-bw-primary" aria-hidden />{' '}
        <span className="font-medium text-bw-text">{leistungLabel}</span>
        {target?.gewerkName ? (
          <span className="text-bw-text-muted"> · Gewerk {target.gewerkName}</span>
        ) : null}
      </p>

      {listErr ? <p className="mb-2 text-sm text-danger">{listErr}</p> : null}
      {loading ? (
        <p className="text-sm text-bw-text-muted">Handwerker werden geladen…</p>
      ) : (
        <div className="max-h-[min(56vh,480px)] space-y-2 overflow-y-auto pr-0.5">
          <HandwerkerPickAccordion
            title={`Empfohlen${empfohlen.length ? ` · ${empfohlen.length}` : ''}`}
            defaultOpen
            emptyHint={
              target?.gewerkId || target?.gewerkSlug
                ? 'Keine Handwerker mit diesem Gewerk in den Stammdaten.'
                : 'Gewerk nicht in Stammdaten — alle Partner unten.'
            }
            rows={empfohlen}
            pendingId={pendingHwId}
            onAdd={hinzufuegen}
          />
          <HandwerkerPickAccordion
            title={`Alle Handwerker${alle.length ? ` · ${alle.length}` : ''}`}
            emptyHint="Keine weiteren Handwerker."
            rows={alle}
            pendingId={pendingHwId}
            onAdd={hinzufuegen}
          />
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <FormSheet open={open} onClose={onClose} breadcrumb="Auftrag" title="Handwerker wählen" footer={footer}>
        {body}
      </FormSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Handwerker wählen" size="md" footer={footer}>
      {body}
    </Modal>
  )
}
