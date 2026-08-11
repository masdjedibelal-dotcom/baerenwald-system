'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalTransition } from '@/components/ui/action-busy'
import {
  updateHandwerker,
  type HandwerkerFormInput,
} from '@/app/(dashboard)/handwerker/actions'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { toast } from '@/components/ui/app-toast'
import {
  composeHandwerkerAdresse,
  resolveHandwerkerAnschrift,
} from '@/lib/handwerker-anschrift'
import {
  normalizeHandwerkerNamen,
  validateHandwerkerStammPflicht,
} from '@/lib/handwerker-stammdaten'
import type { Handwerker } from '@/lib/types'

type GewerkOpt = { id: string; name: string; slug: string }

function gewerkSlugsFromField(gewerke: unknown): string[] {
  if (gewerke == null) return []
  if (Array.isArray(gewerke)) {
    return gewerke
      .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
      .filter(Boolean)
  }
  if (typeof gewerke === 'string') {
    try {
      return gewerkSlugsFromField(JSON.parse(gewerke) as unknown)
    } catch {
      return gewerke.trim() ? [gewerke.trim().toLowerCase()] : []
    }
  }
  return []
}

/** Handwerker bearbeiten — EditorSheet (mobil Bottom, Desktop Slide-over). */
export function PartnerEditSheet({
  open,
  onClose,
  handwerker,
  gewerkeOptionen = [],
  focus = 'stamm',
  onSaved,
}: {
  open: boolean
  onClose: () => void
  handwerker: Handwerker
  gewerkeOptionen?: GewerkOpt[]
  /** Scroll-Anker beim Öffnen */
  focus?: 'stamm' | 'bank'
  onSaved?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useLocalTransition()
  const [firma, setFirma] = useState('')
  const [gewerkSlug, setGewerkSlug] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [tel, setTel] = useState('')
  const [mail, setMail] = useState('')
  const [iban, setIban] = useState('')
  const [ustid, setUstid] = useState('')
  const [steuernummer, setSteuernummer] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const wasOpenRef = useRef(false)
  const syncedHwIdRef = useRef<string | null>(null)

  /*
   * Hydrate nur beim Öffnen oder Partner-Wechsel.
   * Nicht bei jeder neuen handwerker-Referenz (router.refresh) — sonst fliegen
   * ungespeicherte Eingaben weg und man muss „zwischen“ speichern.
   */
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!open) {
      syncedHwIdRef.current = null
      return
    }
    const idChanged = syncedHwIdRef.current !== handwerker.id
    if (!justOpened && !idChanged) return
    syncedHwIdRef.current = handwerker.id

    const k = normalizeHandwerkerNamen(handwerker)
    const a = resolveHandwerkerAnschrift(handwerker)
    const slugs = gewerkSlugsFromField(handwerker.gewerke)
    setFirma(k.firma)
    setVorname(k.vorname)
    setNachname(k.nachname)
    setStrasse(a.strasse)
    setHausnummer(a.hausnummer)
    setPlz(a.plz)
    setOrt(a.ort)
    setTel(handwerker.telefon ?? '')
    setMail(handwerker.email ?? '')
    setIban(handwerker.iban ?? '')
    setUstid(handwerker.ustid ?? '')
    setSteuernummer(handwerker.steuernummer ?? '')
    setGewerkSlug(slugs[0] ?? '')
    setErr(null)
    setDirty(false)
  }, [open, handwerker])

  useEffect(() => {
    if (!open || focus !== 'bank') return
    const t = window.setTimeout(() => {
      document.getElementById('hw-edit-bank')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [open, focus])

  function mark(updater: () => void) {
    updater()
    setDirty(true)
  }

  function submit() {
    setErr(null)
    const pflicht = validateHandwerkerStammPflicht({
      firma,
      vorname,
      nachname,
    })
    if (pflicht) {
      setErr(pflicht)
      toast.error(pflicht)
      return
    }
    if (!tel.trim()) {
      setErr('Telefon ist Pflicht.')
      toast.error('Telefon ist Pflicht.')
      return
    }

    const adresse = composeHandwerkerAdresse({
      strasse: strasse.trim(),
      hausnummer: hausnummer.trim(),
      plz: plz.trim(),
      ort: ort.trim(),
    })

    const existingSlugs = gewerkSlugsFromField(handwerker.gewerke)
    const gewerke = gewerkSlug.trim()
      ? [gewerkSlug.trim(), ...existingSlugs.filter((s) => s !== gewerkSlug.trim())]
      : existingSlugs

    const input: HandwerkerFormInput = {
      firma: firma.trim() || null,
      vorname: vorname.trim() || null,
      nachname: nachname.trim() || null,
      email: mail.trim() || null,
      telefon: tel.trim() || null,
      whatsapp: handwerker.whatsapp ?? null,
      webseite: handwerker.webseite ?? null,
      adresse,
      strasse: strasse.trim() || null,
      hausnummer: hausnummer.trim() || null,
      plz: plz.trim() || null,
      ort: ort.trim() || null,
      gewerke,
      subkategorie: handwerker.subkategorie ?? null,
      ist_fachbetrieb: handwerker.ist_fachbetrieb ?? true,
      partner_kategorie_id: handwerker.partner_kategorie_id ?? null,
      steuernummer: steuernummer.trim() || null,
      ustid: ustid.trim() || null,
      iban: iban.trim() || null,
      aktiv: handwerker.aktiv ?? true,
      notizen: handwerker.notizen ?? null,
    }

    startTransition(async () => {
      const r = await updateHandwerker(handwerker.id, input)
      if (!r.ok) {
        setErr(r.message)
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setDirty(false)
      onSaved?.()
      onClose()
      router.refresh()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Handwerker bearbeiten"
      crumb="Handwerker >"
      context="detail"
      dirty={dirty}
      size="lg"
      onConfirm={submit}
      confirmBusy={pending}
      confirmDisabled={pending}
      className="hw-edit-sheet"
    >
      <div className="hw-create">
        {err ? <p className="hw-create__err">{err}</p> : null}

        <MockFormSection title="Betrieb" icon="tool">
          <MockField label="Firmenname" required full>
            <input
              className="input"
              value={firma}
              onChange={(e) => mark(() => setFirma(e.target.value))}
              placeholder="Max Sanitär GmbH"
              autoComplete="organization"
              autoFocus={focus === 'stamm'}
            />
          </MockField>
          {gewerkeOptionen.length > 0 ? (
            <MockField label="Gewerk" full>
              <select
                className="input"
                value={gewerkSlug}
                onChange={(e) => mark(() => setGewerkSlug(e.target.value))}
                aria-label="Gewerk"
              >
                <option value="">Gewerk wählen…</option>
                {gewerkeOptionen.map((g) => (
                  <option key={g.id} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </MockField>
          ) : null}
        </MockFormSection>

        <MockFormSection title="Ansprechpartner" icon="user" columns={2}>
          <MockField label="Vorname">
            <input
              className="input"
              value={vorname}
              onChange={(e) => mark(() => setVorname(e.target.value))}
              autoComplete="given-name"
            />
          </MockField>
          <MockField label="Nachname">
            <input
              className="input"
              value={nachname}
              onChange={(e) => mark(() => setNachname(e.target.value))}
              autoComplete="family-name"
            />
          </MockField>
          <MockField label="Telefon" required>
            <input
              className="input"
              type="tel"
              value={tel}
              onChange={(e) => mark(() => setTel(e.target.value))}
              autoComplete="tel"
            />
          </MockField>
          <MockField label="E-Mail">
            <input
              className="input"
              type="email"
              value={mail}
              onChange={(e) => mark(() => setMail(e.target.value))}
              autoComplete="email"
            />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Adresse" icon="map-pin" columns={2}>
          <MockField label="Straße" full>
            <input
              className="input"
              value={strasse}
              onChange={(e) => mark(() => setStrasse(e.target.value))}
              autoComplete="street-address"
            />
          </MockField>
          <MockField label="Hausnummer">
            <input
              className="input"
              value={hausnummer}
              onChange={(e) => mark(() => setHausnummer(e.target.value))}
            />
          </MockField>
          <MockField label="PLZ">
            <input
              className="input"
              value={plz}
              onChange={(e) => mark(() => setPlz(e.target.value))}
              autoComplete="postal-code"
            />
          </MockField>
          <MockField label="Ort">
            <input
              className="input"
              value={ort}
              onChange={(e) => mark(() => setOrt(e.target.value))}
              autoComplete="address-level2"
            />
          </MockField>
        </MockFormSection>

        <div id="hw-edit-bank">
          <MockFormSection title="Bank & Steuer" icon="building">
            <MockField label="IBAN" full>
              <input
                className="input"
                value={iban}
                onChange={(e) => mark(() => setIban(e.target.value))}
                autoFocus={focus === 'bank'}
              />
            </MockField>
            <MockField label="USt-ID" full>
              <input
                className="input"
                value={ustid}
                onChange={(e) => mark(() => setUstid(e.target.value))}
              />
            </MockField>
            <MockField label="Steuernummer" full>
              <input
                className="input"
                value={steuernummer}
                onChange={(e) => mark(() => setSteuernummer(e.target.value))}
              />
            </MockField>
          </MockFormSection>
        </div>
      </div>
    </EditorSheet>
  )
}
