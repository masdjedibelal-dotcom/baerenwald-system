'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { useLocalTransition } from '@/components/ui/action-busy'
import { toast } from '@/components/ui/app-toast'
import {
  getAuftragPartnerAufgabe,
  listAuftragPartnerAufgaben,
  setAuftragPositionenPartnerAufgabe,
  updateAuftragPartnerAufgabe,
  type PartnerAufgabeRow,
} from '@/app/(dashboard)/auftraege/partner-aufgabe-actions'
import type { AuftragPosition } from '@/lib/types'
import { TOAST } from '@/lib/copy'
import { COPY_ERROR } from '@/lib/copy/errors'

/**
 * Nachträgliche Bearbeitung: Partner-Titel/-Beschreibung und Zuordnung von Positionen.
 * leistung_name bleibt unberührt.
 */
export function PartnerAufgabeBearbeitenSheet({
  open,
  onClose,
  auftragId,
  aufgabeId,
  handwerkerId,
  positionen,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  aufgabeId: string
  handwerkerId: string
  /** Alle Positionen des Auftrags (Filter nach Handwerker im Sheet). */
  positionen: AuftragPosition[]
  onSaved: () => void
}) {
  const [pending, startTransition] = useLocalTransition()
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [selectedPosIds, setSelectedPosIds] = useState<Set<string>>(() => new Set())
  const [aufgaben, setAufgaben] = useState<PartnerAufgabeRow[]>([])
  const [zielAufgabeId, setZielAufgabeId] = useState<string>('')

  const partnerPositionen = useMemo(
    () =>
      positionen.filter(
        (p) => p.handwerker_id === handwerkerId || p.partner_aufgabe_id === aufgabeId
      ),
    [positionen, handwerkerId, aufgabeId]
  )

  useEffect(() => {
    if (!open || !aufgabeId) return
    let cancelled = false
    void (async () => {
      const [aufgabeRes, listRes] = await Promise.all([
        getAuftragPartnerAufgabe({ auftragId, aufgabeId }),
        listAuftragPartnerAufgaben({ auftragId, handwerkerId }),
      ])
      if (cancelled) return
      if (!aufgabeRes.ok) {
        toast.systemError(aufgabeRes)
        return
      }
      setTitel(aufgabeRes.row.titel ?? '')
      setBeschreibung(aufgabeRes.row.beschreibung ?? '')
      setZielAufgabeId(aufgabeId)
      if (listRes.ok) setAufgaben(listRes.rows)
      setSelectedPosIds(
        new Set(
          positionen
            .filter((p) => p.partner_aufgabe_id === aufgabeId)
            .map((p) => p.id)
        )
      )
    })()
    return () => {
      cancelled = true
    }
  }, [open, auftragId, aufgabeId, handwerkerId, positionen])

  function togglePos(id: string) {
    setSelectedPosIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    startTransition(async () => {
      const textRes = await updateAuftragPartnerAufgabe({
        auftragId,
        aufgabeId,
        titel,
        beschreibung,
      })
      if (!textRes.ok) {
        toast.systemError(textRes)
        return
      }

      const currentlyLinked = positionen
        .filter((p) => p.partner_aufgabe_id === aufgabeId)
        .map((p) => p.id)
      const selected = Array.from(selectedPosIds)
      const toUnlink = currentlyLinked.filter((id) => !selected.includes(id))
      const toLink = selected.filter((id) => !currentlyLinked.includes(id))

      const ziel = zielAufgabeId.trim() || null

      if (toUnlink.length) {
        const r = await setAuftragPositionenPartnerAufgabe({
          auftragId,
          positionIds: toUnlink,
          partnerAufgabeId: null,
        })
        if (!r.ok) {
          toast.systemError(r)
          return
        }
      }

      if (toLink.length || (ziel && ziel !== aufgabeId && selected.length)) {
        const linkIds =
          ziel && ziel !== aufgabeId
            ? selected
            : toLink
        if (linkIds.length && ziel) {
          const r = await setAuftragPositionenPartnerAufgabe({
            auftragId,
            positionIds: linkIds,
            partnerAufgabeId: ziel,
          })
          if (!r.ok) {
            toast.systemError(r)
            return
          }
        } else if (linkIds.length && !ziel) {
          toast.error(COPY_ERROR.validation)
          return
        }
      }

      // Wenn Zielaufgabe gewechselt und alle ausgewählten dorthin: bereits oben.
      // Wenn Ziel = aktuelle und nur Text geändert: fertig.
      toast.success(TOAST.gespeichert)
      onSaved()
      onClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Partner-Aufgabe"
      size="md"
      secondary={{ label: 'Abbrechen' }}
      primary={{ label: 'Speichern', busy: pending, onClick: save }}
    >
      <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
        Überschrift für den Partner. Leer = LV-Texte der Positionen. Abrechnung bleibt je Position.
      </p>

      <label className="hw-anfrage-field mb-3 block">
        <span className="hw-anfrage-label">Titel für den Partner</span>
        <MockInput
          value={titel}
          placeholder="Leer = LV-Text"
          onChange={(e) => setTitel(e.target.value)}
          disabled={pending}
        />
      </label>

      <label className="hw-anfrage-field mb-3 block">
        <span className="hw-anfrage-label">Beschreibung für den Partner</span>
        <MockTextarea
          className="ta"
          rows={6}
          value={beschreibung}
          placeholder="Leer = LV-Text"
          onChange={(e) => setBeschreibung(e.target.value)}
          disabled={pending}
        />
      </label>

      {aufgaben.length > 1 ? (
        <label className="hw-anfrage-field mb-3 block">
          <span className="hw-anfrage-label">Ausgewählte Positionen zuordnen zu</span>
          <select
            className="sel w-full"
            value={zielAufgabeId}
            onChange={(e) => setZielAufgabeId(e.target.value)}
            disabled={pending}
          >
            {aufgaben.map((a) => (
              <option key={a.id} value={a.id}>
                {a.titel?.trim() || `Aufgabe ohne Titel (${a.id.slice(0, 8)}…)`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="hw-anfrage-section">
        <div className="hw-anfrage-section-head">
          <span>Positionen in dieser Aufgabe</span>
          <span>{selectedPosIds.size}</span>
        </div>
        <ul className="m-0 list-none space-y-2 p-0">
          {partnerPositionen.map((p) => {
            const checked = selectedPosIds.has(p.id)
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-2 text-[length:var(--fs-text)]">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={() => togglePos(p.id)}
                  />
                  <span>
                    {p.leistung_name?.trim() || 'Leistung'}
                    {!checked ? (
                      <span className="ml-1 text-bw-text-muted">(herauslösen)</span>
                    ) : null}
                  </span>
                </label>
              </li>
            )
          })}
          {!partnerPositionen.length ? (
            <li className="text-bw-text-muted">Keine Positionen bei diesem Partner.</li>
          ) : null}
        </ul>
      </div>
    </EditorSheet>
  )
}
