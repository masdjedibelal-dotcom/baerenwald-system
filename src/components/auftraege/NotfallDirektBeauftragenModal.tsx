'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect, MockTextarea } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
<<<<<<< Updated upstream
=======
import { Modal } from '@/components/ui/Modal'
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
import { toast } from '@/components/ui/app-toast'
import { notfallDirektBeauftragen } from '@/app/(dashboard)/auftraege/notfall-direkt-actions'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

/**
 * Phase 9 / Spec §10: Notfall-Direktauftrag — nur Aufwand, ohne Cap-UI, ohne Festpreis-Zweig.
 * Felder: Handwerker · Stundensatz + Materialaufschlag · Leistungsumfang · Beauftragen.
 */
export function NotfallDirektBeauftragenModal({
  open,
  onClose,
  auftragId,
  leadId,
  gewerkName,
  variant = 'auftrag',
  onDone,
}: {
  open: boolean
  onClose: () => void
  auftragId?: string | null
  leadId?: string | null
  gewerkName?: string | null
  /** anfrage = „Notfall melden“ (legt Auftrag an); auftrag = bestehende Direkt-Beauftragung */
  variant?: 'auftrag' | 'anfrage'
  onDone?: (auftragId: string) => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useLocalTransition()
  const [handwerker, setHandwerker] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [hwId, setHwId] = useState('')
  const [stundensatz, setStundensatz] = useState('')
  const [materialaufschlag, setMaterialaufschlag] = useState('')
  const [leistungsumfang, setLeistungsumfang] = useState('')

  const fromAnfrage = variant === 'anfrage'
  const title = 'Direkt beauftragen'
  useEffect(() => {
    if (!open) return
    setStundensatz('')
    setMaterialaufschlag('')
    setLeistungsumfang('')
    void listHandwerkerAuswahlFuerGewerk({}).then((r) => {
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      const list = [...r.empfohlen, ...r.alle]
      setHandwerker(list)
      if (list[0]?.id) setHwId((prev) => prev || list[0]!.id)
    })
  }, [open])

  if (!open) return null

  function submit() {
    if (!hwId) {
      applyFieldErrors({ _form: TOAST.bitte_partner_waehlen })
      return
    }
    const satzNum = stundensatz.trim() ? Number(stundensatz.replace(',', '.')) : NaN
    if (!Number.isFinite(satzNum) || satzNum <= 0) {
      applyFieldErrors({ _form: TOAST.bitte_stundensatz_angeben })
      return
    }
    const matRaw = materialaufschlag.trim()
    const matNum = matRaw ? Number(matRaw.replace(',', '.')) : 0
    if (matRaw && (!Number.isFinite(matNum) || matNum < 0)) {
      toast.error(TOAST.materialaufschlag_ungueltig)
      return
    }
    const bullets = leistungsumfang
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)

    startTransition(async () => {
      const r = await notfallDirektBeauftragen({
        auftragId,
        leadId,
        handwerkerId: hwId,
        verguetung: 'aufwand',
        betragNetto: satzNum,
        materialaufschlagPct: matNum > 0 ? matNum : null,
        leistungsumfang: bullets,
        gewerkName: gewerkName ?? 'Allgemein',
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(fromAnfrage ? 'Direktauftrag angelegt' : 'Direkt beauftragt — nach Aufwand')
      onClose()
      onDone?.(r.auftragId)
    })
  }

  return (
    <EditorSheet open={open} onClose={onClose} title={title} size="md">
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              <div className="space-y-4 p-1">
        <label className="block text-[length:var(--fs-meta)] font-medium text-bw-text">
          Partner zuordnen
          <MockSelect className="mt-1 w-full rounded-field border border-bw-border bg-white px-3 py-2 text-[length:var(--fs-text)]" value={hwId} onChange={(e) => setHwId(e.target.value)}>
            <option value="">— wählen —</option>
            {handwerker.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.firma ? ` · ${h.firma}` : ''}
              </option>
            ))}
          </MockSelect>
        </label>

        <div className="rounded-field border border-bw-border bg-bw-surface-2/40 px-3 py-2.5">
          <p className="mb-2 text-[length:var(--fs-meta)] font-semibold text-bw-text">Vergütung nach Aufwand</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MockField label="Stundensatz netto (€)"><MockInput inputMode="decimal" value={stundensatz} onChange={(e) => setStundensatz(e.target.value)} placeholder="z. B. 85" autoFocus /></MockField>
            <MockField label="Materialaufschlag (%)"><MockInput inputMode="decimal" value={materialaufschlag} onChange={(e) => setMaterialaufschlag(e.target.value)} placeholder="optional, z. B. 15" /></MockField>
          </div>
        </div>

        <MockField label="Leistungsumfang (Stichpunkte)"><MockTextarea rows={4} value={leistungsumfang} onChange={(e) => setLeistungsumfang(e.target.value)} placeholder={'Eine Zeile pro Punkt\nz. B. Leckage abdichten\nz. B. Trocknung vorbereiten'} className="resize-y py-2 min-h-[120px]" /></MockField>

        <div className="flex justify-between gap-2 pt-2">
          <MockBtn kind="primary" type="button" onClick={submit} loading={pending}>
            Beauftragen
          </MockBtn>
          <MockBtn type="button" kind="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </MockBtn>
        </div>
      </div>
    </EditorSheet>
  )
}
