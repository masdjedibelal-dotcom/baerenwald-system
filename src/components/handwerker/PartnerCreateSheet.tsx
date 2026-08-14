'use client'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { toast } from '@/components/ui/app-toast'
import { composeHandwerkerAdresse } from '@/lib/handwerker-anschrift'

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
  const [err, setErr] = useState<string | null>(null)
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
    setErr(null)
    setDirty(false)
  }, [open])

  function mark(updater: () => void) {
    updater()
    setDirty(true)
  }

  function submit() {
    setErr(null)
    if (!firma.trim()) {
      setErr('Firmenname ist Pflicht.')
      return
    }
    if (!gewerkSlug.trim()) {
      setErr('Gewerk ist Pflicht.')
      return
    }
    if (!tel.trim()) {
      setErr('Telefon ist Pflicht.')
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
        setErr(r.message)
        toast.error(r.message)
        return
      }

      toast.success('Handwerker angelegt')
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
      title="Handwerker anlegen"
      crumb="Handwerker >"
      context="detail"
      dirty={dirty}
      size="lg"
      onConfirm={submit}
      confirmBusy={pending}
      confirmDisabled={pending || !firma.trim() || !gewerkSlug.trim() || !tel.trim()}
      className="hw-create-sheet"
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
            />
          </MockField>
          <MockField label="Gewerk" required full>
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
        </MockFormSection>

        <MockFormSection title="Ansprechpartner" icon="user" columns={2}>
          <MockField label="Vorname">
            <input
              className="input"
              value={vorname}
              onChange={(e) => mark(() => setVorname(e.target.value))}
              placeholder="Max"
              autoComplete="given-name"
            />
          </MockField>
          <MockField label="Nachname">
            <input
              className="input"
              value={nachname}
              onChange={(e) => mark(() => setNachname(e.target.value))}
              placeholder="Mustermann"
              autoComplete="family-name"
            />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Anschrift" icon="map-pin" columns={2}>
          <MockField label="Straße">
            <input
              className="input"
              value={strasse}
              onChange={(e) => mark(() => setStrasse(e.target.value))}
              placeholder="Musterstraße"
              autoComplete="address-line1"
            />
          </MockField>
          <MockField label="Hausnummer">
            <input
              className="input"
              value={hausnummer}
              onChange={(e) => mark(() => setHausnummer(e.target.value))}
              placeholder="12"
              autoComplete="address-line2"
            />
          </MockField>
          <div className="kunde-create__plz-ort full">
            <MockField label="PLZ">
              <input
                className="input"
                value={plz}
                onChange={(e) => mark(() => setPlz(e.target.value))}
                placeholder="80331"
                autoComplete="postal-code"
                inputMode="numeric"
              />
            </MockField>
            <MockField label="Ort">
              <input
                className="input"
                value={ort}
                onChange={(e) => mark(() => setOrt(e.target.value))}
                placeholder="München"
                autoComplete="address-level2"
              />
            </MockField>
          </div>
        </MockFormSection>

        <MockFormSection title="Kontakt" icon="phone" columns={2}>
          <MockField label="Telefon" required>
            <input
              className="input"
              type="tel"
              value={tel}
              onChange={(e) => mark(() => setTel(e.target.value))}
              placeholder="0170 123 456"
              autoComplete="tel"
            />
          </MockField>
          <MockField label="E-Mail">
            <input
              className="input"
              type="email"
              value={mail}
              onChange={(e) => mark(() => setMail(e.target.value))}
              placeholder="info@…"
              autoComplete="email"
            />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Notiz" icon="messages">
          <MockField label="Interne Notiz" full>
            <textarea
              className="input ta"
              rows={4}
              value={notizen}
              onChange={(e) => mark(() => setNotizen(e.target.value))}
              placeholder="z.B. besonders sauber, kommt pünktlich…"
            />
          </MockField>
        </MockFormSection>
      </div>
    </EditorSheet>
  )
}
