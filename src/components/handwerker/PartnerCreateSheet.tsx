'use client'
import { MockField, MockFormSection, MockInput, MockSelect, MockTextarea } from '@/components/mock-ui/MockForm'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { createHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { composeHandwerkerAdresse } from '@/lib/handwerker-anschrift'
import { TOAST } from '@/lib/copy'
import { parseForm, useFieldErrors } from '@/lib/validation/form-schema'

/* FORM_VALIDATION: partner-create */
const partnerCreateSchema = z.object({
  firma: z.string().trim().min(1, 'Firmenname ist Pflicht.'),
  gewerkSlug: z.string().trim().min(1, 'Gewerk ist Pflicht.'),
  tel: z.string().trim().min(1, 'Telefon ist Pflicht.'),
})

type GewerkOpt = { id: string; name: string; slug: string }

/** Handwerker anlegen — EditorSheet, Host z. B. `/neu?art=handwerker`. */
export function PartnerCreateSheet({
  open,
  onClose,
  gewerkeOptionen = [],
  stayOnPage = false,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  gewerkeOptionen?: GewerkOpt[]
  stayOnPage?: boolean
  onSaved?: (id: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useLocalTransition()
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
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
  const [notizen, setNotizen] = useState('')
  const [dirty, setDirty] = useState(false)
  const wasOpenRef = useRef(false)

  /* Nur bei false→true leeren — nicht bei Remount/Re-Render solange offen. */
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return
    setFirma('')
    setGewerkSlug('')
    setVorname('')
    setNachname('')
    setStrasse('')
    setHausnummer('')
    setPlz('')
    setOrt('')
    setTel('')
    setMail('')
    setNotizen('')
    clearFieldErrors()
    setDirty(false)
  }, [open, clearFieldErrors])

  function mark(updater: () => void) {
    updater()
    setDirty(true)
  }

  function submit() {
    const parsed = parseForm(partnerCreateSchema, { firma, gewerkSlug, tel })
    if (!parsed.ok) {
      applyFieldErrors(parsed.fieldErrors)
      return
    }

    const adresse = composeHandwerkerAdresse({
      strasse: strasse.trim(),
      hausnummer: hausnummer.trim(),
      plz: plz.trim(),
      ort: ort.trim(),
    })

    startTransition(async () => {
      const r = await createHandwerker({
        firma: firma.trim() || null,
        vorname: vorname.trim() || null,
        nachname: nachname.trim() || null,
        email: mail.trim() || null,
        telefon: tel.trim() || null,
        whatsapp: null,
        webseite: null,
        adresse,
        strasse: strasse.trim() || null,
        hausnummer: hausnummer.trim() || null,
        plz: plz.trim() || null,
        ort: ort.trim() || null,
        gewerke: [gewerkSlug],
        subkategorie: null,
        ist_fachbetrieb: true,
        partner_kategorie_id: null,
        steuernummer: null,
        ustid: null,
        iban: null,
        aktiv: true,
        notizen: notizen.trim() || null,
      })
      if (!r.ok) {
        applyFieldErrors({ _form: r.message })
        toast.systemError(r)
        return
      }

      toast.success(TOAST.partner_angelegt)
      setDirty(false)
      onSaved?.(r.id)
      if (!stayOnPage) {
        router.push(`/handwerker/${r.id}`)
        return
      }
      onClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Partner anlegen"
      crumb="Partner >"
      context="detail"
      dirty={dirty}
      size="lg"
      onConfirm={submit}
      confirmBusy={pending}
      confirmDisabled={pending}
      className="hw-create-sheet"
    >
      <div className="hw-create">
        {fieldErrors._form ? (
          <p className="field-error" role="alert">
            {fieldErrors._form}
          </p>
        ) : null}

        <MockFormSection title="Betrieb" icon="tool">
          <MockField label="Firmenname" required full name="firma" error={fieldErrors.firma}>
            <MockInput
              value={firma}
              onChange={(e) => {
                clearField('firma')
                mark(() => setFirma(e.target.value))
              }}
              placeholder="Max Sanitär GmbH"
              autoComplete="organization"
            />
          </MockField>
          <MockField label="Gewerk" required full name="gewerkSlug" error={fieldErrors.gewerkSlug}>
            <MockSelect
              value={gewerkSlug}
              onChange={(e) => {
                clearField('gewerkSlug')
                mark(() => setGewerkSlug(e.target.value))
              }}
              aria-label="Gewerk"
            >
              <option value="">Gewerk wählen…</option>
              {gewerkeOptionen.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </MockSelect>
          </MockField>
        </MockFormSection>

        <MockFormSection title="Ansprechpartner" icon="user" columns={2}>
          <MockField label="Vorname">
            <MockInput value={vorname} onChange={(e) => mark(() => setVorname(e.target.value))} placeholder="Max" autoComplete="given-name" />
          </MockField>
          <MockField label="Nachname">
            <MockInput value={nachname} onChange={(e) => mark(() => setNachname(e.target.value))} placeholder="Mustermann" autoComplete="family-name" />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Anschrift" icon="map-pin" columns={2}>
          <MockField label="Straße">
            <MockInput value={strasse} onChange={(e) => mark(() => setStrasse(e.target.value))} placeholder="Musterstraße" autoComplete="address-line1" />
          </MockField>
          <MockField label="Hausnummer">
            <MockInput value={hausnummer} onChange={(e) => mark(() => setHausnummer(e.target.value))} placeholder="12" autoComplete="address-line2" />
          </MockField>
          <div className="kunde-create__plz-ort full">
            <MockField label="PLZ">
              <MockInput value={plz} onChange={(e) => mark(() => setPlz(e.target.value))} placeholder="80331" autoComplete="postal-code" inputMode="numeric" />
            </MockField>
            <MockField label="Ort">
              <MockInput value={ort} onChange={(e) => mark(() => setOrt(e.target.value))} placeholder="München" autoComplete="address-level2" />
            </MockField>
          </div>
        </MockFormSection>

        <MockFormSection title="Kontakt" icon="phone" columns={2}>
          <MockField label="Telefon" required name="tel" error={fieldErrors.tel}>
            <MockInput
              type="tel"
              value={tel}
              onChange={(e) => {
                clearField('tel')
                mark(() => setTel(e.target.value))
              }}
              placeholder="0170 123 456"
              autoComplete="tel"
            />
          </MockField>
          <MockField label="E-Mail">
            <MockInput type="email" value={mail} onChange={(e) => mark(() => setMail(e.target.value))} placeholder="info@…" autoComplete="email" />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Notiz" icon="messages">
          <MockField label="Interne Notiz" full>
            <MockTextarea className="ta" rows={4} value={notizen} onChange={(e) => mark(() => setNotizen(e.target.value))} placeholder="z.B. besonders sauber, kommt pünktlich…" />
          </MockField>
        </MockFormSection>
      </div>
    </EditorSheet>
  )
}
