'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { WizardShell } from '@/components/layout/WizardShell'
import { MockBtn } from '@/components/mock-ui'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { suggestMeldeSlugFromTitel } from '@/lib/org/slug'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'

const WIZARD_STEPS = [
  { id: 1, label: 'Stammdaten' },
  { id: 2, label: 'Einheiten & Meldung' },
]

export function KundenObjektModal({
  open,
  onClose,
  kundeId,
  editObjekt,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  kundeId: string
  editObjekt?: KundenObjekt | null
  onSaved: (objekt: KundenObjekt) => void
}) {
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [titel, setTitel] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [meldeSlug, setMeldeSlug] = useState('')
  const [meldeAktiv, setMeldeAktiv] = useState(true)
  const [einheitenHinweis, setEinheitenHinweis] = useState('')
  const [notizenIntern, setNotizenIntern] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    if (editObjekt) {
      setTitel(editObjekt.titel ?? '')
      setStrasse(editObjekt.strasse ?? '')
      setHausnummer(editObjekt.hausnummer ?? '')
      setPlz(editObjekt.plz ?? '')
      setOrt(editObjekt.ort ?? '')
      setMeldeSlug(editObjekt.melde_slug ?? '')
      setMeldeAktiv(editObjekt.melde_aktiv !== false)
      setEinheitenHinweis(editObjekt.einheiten_hinweis ?? '')
      setNotizenIntern(editObjekt.notizen_intern ?? '')
    } else {
      setTitel('')
      setStrasse('')
      setHausnummer('')
      setPlz('')
      setOrt('')
      setMeldeSlug('')
      setMeldeAktiv(true)
      setEinheitenHinweis('')
      setNotizenIntern('')
    }
    setErr(null)
  }, [open, editObjekt])

  function vorschlagSlug() {
    const basis = titel.trim() || [strasse, hausnummer, plz].filter(Boolean).join(' ')
    if (!basis) return
    setMeldeSlug(suggestMeldeSlugFromTitel(basis))
  }

  function speichern() {
    setErr(null)
    const payload = {
      titel,
      strasse,
      hausnummer,
      plz,
      ort,
      melde_slug: meldeSlug || null,
      melde_aktiv: meldeAktiv,
      einheiten_hinweis: einheitenHinweis || null,
      notizen_intern: notizenIntern || null,
    }
    startTransition(async () => {
      if (editObjekt) {
        const r = await updateKundenObjekt(editObjekt.id, kundeId, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        onSaved({
          ...editObjekt,
          titel: titel.trim(),
          strasse: strasse.trim() || null,
          hausnummer: hausnummer.trim() || null,
          plz: plz.trim() || null,
          ort: ort.trim() || null,
          melde_slug: meldeSlug.trim() || null,
          melde_aktiv: meldeAktiv,
          einheiten_hinweis: einheitenHinweis.trim() || null,
          notizen_intern: notizenIntern.trim() || null,
        })
        toast.success('Objekt gespeichert')
        onClose()
        return
      }
      const r = await createKundenObjekt(kundeId, payload)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      onSaved(r.objekt)
      toast.success(`Objekt „${titel.trim() || 'Neues Objekt'}“ angelegt`)
      onClose()
    })
  }

  const stammdatenStep = (
    <div className="space-y-3">
      <Input
        label="Titel / Bezeichnung"
        placeholder="z. B. WEG Musterstraße"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        required
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
        <Input label="Straße" value={strasse} onChange={(e) => setStrasse(e.target.value)} required />
        <Input label="Nr." value={hausnummer} onChange={(e) => setHausnummer(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Input label="PLZ" value={plz} onChange={(e) => setPlz(e.target.value)} required />
        <Input label="Ort" value={ort} onChange={(e) => setOrt(e.target.value)} required />
      </div>
    </div>
  )

  const einheitenStep = (
    <div className="space-y-3">
      <p className="text-sm text-bw-text-muted">
        Optional: Meldeformular und Einheiten-Hinweis für Hausverwaltungen.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label="Melde-Slug"
            placeholder="z. B. weg-musterstrasse"
            value={meldeSlug}
            onChange={(e) => setMeldeSlug(e.target.value)}
            hint="Teil-URL: /melden/{org}/{melde_slug}"
          />
        </div>
        <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={vorschlagSlug}>
          Vorschlag
        </Button>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-bw-text">
        <input
          type="checkbox"
          checked={meldeAktiv}
          onChange={(e) => setMeldeAktiv(e.target.checked)}
          className="rounded border-bw-border"
        />
        Meldeformular aktiv
      </label>
      <Input
        label="Einheiten-Hinweis"
        placeholder="z. B. Wohnung, Etage, Gewerbeeinheit"
        value={einheitenHinweis}
        onChange={(e) => setEinheitenHinweis(e.target.value)}
      />
      <Textarea
        label="Interne Notizen"
        rows={3}
        value={notizenIntern}
        onChange={(e) => setNotizenIntern(e.target.value)}
      />
    </div>
  )

  if (!open) return null

  if (!editObjekt) {
    return (
      <WizardShell
        title="Neues Objekt"
        subtitle="Kundenobjekt anlegen"
        steps={WIZARD_STEPS}
        currentStep={step}
        onClose={onClose}
        footer={
          <div className="flex w-full items-center gap-2">
            {step > 1 ? (
              <MockBtn sm kind="ghost" onClick={() => setStep((s) => s - 1)}>
                Zurück
              </MockBtn>
            ) : (
              <MockBtn sm kind="ghost" onClick={onClose}>
                Abbrechen
              </MockBtn>
            )}
            <div style={{ flex: 1 }} />
            {step < 2 ? (
              <MockBtn
                sm
                kind="primary"
                icon="arrow-right"
                onClick={() => {
                  if (!titel.trim() || !strasse.trim() || !plz.trim() || !ort.trim()) {
                    setErr('Bitte Titel und Adresse ausfüllen.')
                    return
                  }
                  setErr(null)
                  setStep(2)
                }}
              >
                Weiter
              </MockBtn>
            ) : (
              <MockBtn sm kind="primary" icon="check" onClick={speichern}>
                Objekt anlegen
              </MockBtn>
            )}
          </div>
        }
      >
        {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}
        {step === 1 ? stammdatenStep : einheitenStep}
      </WizardShell>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Objekt bearbeiten" size="md">
      <div className="space-y-3">
        {stammdatenStep}
        <div className="border-t border-bw-border pt-3">{einheitenStep}</div>
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
