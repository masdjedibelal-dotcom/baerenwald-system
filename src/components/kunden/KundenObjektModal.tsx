'use client'

import { useEffect, useState, useTransition } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { suggestMeldeSlugFromTitel } from '@/lib/org/slug'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'

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
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
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
    setDirty(false)
  }, [open, editObjekt])

  function mark<T>(setter: (v: T) => void, v: T) {
    setter(v)
    setDirty(true)
  }

  function vorschlagSlug() {
    const basis = titel.trim() || [strasse, hausnummer, plz].filter(Boolean).join(' ')
    if (!basis) return
    mark(setMeldeSlug, suggestMeldeSlugFromTitel(basis))
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
        toast.success('Gespeichert')
        setDirty(false)
        onClose()
        return
      }
      const r = await createKundenObjekt(kundeId, payload)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      onSaved(r.objekt)
      toast.success('Gespeichert')
      setDirty(false)
      onClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={editObjekt ? 'Objekt' : 'Objekt'}
      context="detail"
      dirty={dirty}
      confirmBusy={pending}
      onConfirm={speichern}
      size="md"
    >
      <div className="space-y-3">
        <Input
          label="Titel"
          placeholder="z. B. WEG Musterstraße"
          value={titel}
          onChange={(e) => mark(setTitel, e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <Input
            label="Straße"
            value={strasse}
            onChange={(e) => mark(setStrasse, e.target.value)}
            required
          />
          <Input
            label="Nr."
            value={hausnummer}
            onChange={(e) => mark(setHausnummer, e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <Input label="PLZ" value={plz} onChange={(e) => mark(setPlz, e.target.value)} required />
          <Input label="Ort" value={ort} onChange={(e) => mark(setOrt, e.target.value)} required />
        </div>

        <div className="border-t border-bw-border pt-3">
          <p className="mb-2 text-[12px] font-medium text-bw-text">Meldeformular</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Melde-Slug"
                placeholder="weg-musterstrasse"
                value={meldeSlug}
                onChange={(e) => mark(setMeldeSlug, e.target.value)}
              />
            </div>
            <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={vorschlagSlug}>
              Vorschlag
            </Button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[13px] text-bw-text">
            <input
              type="checkbox"
              checked={meldeAktiv}
              onChange={(e) => mark(setMeldeAktiv, e.target.checked)}
              className="rounded border-bw-border"
            />
            Aktiv
          </label>
          <Input
            label="Einheiten"
            placeholder="Wohnung, Etage…"
            value={einheitenHinweis}
            onChange={(e) => mark(setEinheitenHinweis, e.target.value)}
            className="mt-2"
          />
          <Textarea
            label="Notizen"
            rows={2}
            value={notizenIntern}
            onChange={(e) => mark(setNotizenIntern, e.target.value)}
            className="mt-2"
          />
        </div>

        {err ? <p className="text-sm text-danger">{err}</p> : null}
      </div>
    </EditorSheet>
  )
}
