'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { findKundenDuplikate, saveKunde } from '@/app/actions/kunden'
import {
  initKundeStammEditFelder,
  istKundeFirmaPflichtTyp,
  istKundeHausverwaltungTyp,
  istKundeNurGewerbeTyp,
} from '@/lib/kunde-stammdaten'
import { normalizeKundeNamen } from '@/lib/kunde-namen'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

const TYP_OPTS = [
  { value: 'privat', label: 'Privat' },
  { value: 'gewerbe', label: 'Gewerbe' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const QUELLE_OPTS = [
  { value: '', label: '—' },
  { value: 'website', label: 'Website' },
  { value: 'empfehlung', label: 'Empfehlung' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'social', label: 'Social Media' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export function KundeModal({
  open,
  onClose,
  editKunde,
  leadFunnelDaten,
  stayOnPage = false,
  revalidateAnfrageId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editKunde?: Kunde | null
  /** Website-Funnel der verknüpften Anfrage (korrekte Vorname/Nachname-Felder). */
  leadFunnelDaten?: unknown
  /** Kein Redirect zur Kundenseite nach Speichern (z. B. Anfrage-Detail). */
  stayOnPage?: boolean
  revalidateAnfrageId?: string
  onSaved?: (kundeId?: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [typ, setTyp] = useState('privat')
  const [firmaName, setFirmaName] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [webseite, setWebseite] = useState('')
  const [ansprechpartner, setAnsprechpartner] = useState('')
  const [geburtstag, setGeburtstag] = useState('')
  const [quelle, setQuelle] = useState('')
  const [notizen, setNotizen] = useState('')
  const [ustId, setUstId] = useState('')
  const [dupes, setDupes] = useState<Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>[]>([])
  const [err, setErr] = useState<string | null>(null)

  const firmaPflicht = istKundeFirmaPflichtTyp(typ)
  const istGewerbe = istKundeNurGewerbeTyp(typ)
  const istHausverwaltung = istKundeHausverwaltungTyp(typ)

  useEffect(() => {
    if (!open) return
    if (editKunde) {
      const typVal = editKunde.typ ?? 'privat'
      const namen = normalizeKundeNamen({
        typ: typVal,
        name: editKunde.name,
        vorname: editKunde.vorname,
        nachname: editKunde.nachname,
        funnelDaten: leadFunnelDaten,
      })
      setTyp(typVal)
      setFirmaName(
        istKundeFirmaPflichtTyp(typVal) ? (editKunde.name ?? namen.name ?? '').trim() : ''
      )
      setVorname(namen.vorname ?? '')
      setNachname(namen.nachname ?? '')
      setTelefon(editKunde.telefon ?? '')
      setEmail(editKunde.email ?? '')
      const addr = initKundeStammEditFelder(editKunde)
      setStrasse(addr.strasse)
      setHausnummer(addr.hausnummer)
      setPlz(editKunde.plz ?? '')
      setOrt(editKunde.ort ?? '')
      setWebseite(editKunde.webseite ?? '')
      setAnsprechpartner(editKunde.ansprechpartner ?? '')
      setGeburtstag(editKunde.geburtstag?.slice(0, 10) ?? '')
      setQuelle(editKunde.quelle ?? '')
      setNotizen(editKunde.notizen ?? '')
      setUstId(editKunde.ust_id ?? '')
    } else {
      setTyp('privat')
      setFirmaName('')
      setVorname('')
      setNachname('')
      setTelefon('')
      setEmail('')
      setStrasse('')
      setHausnummer('')
      setPlz('')
      setOrt('')
      setWebseite('')
      setAnsprechpartner('')
      setGeburtstag('')
      setQuelle('')
      setNotizen('')
      setUstId('')
    }
    setDupes([])
    setErr(null)
  }, [open, editKunde, leadFunnelDaten])

  useEffect(() => {
    if (!open || editKunde) return
    const t = setTimeout(() => {
      startTransition(async () => {
        const d = await findKundenDuplikate(telefon || null, email || null)
        setDupes(d)
      })
    }, 400)
    return () => clearTimeout(t)
  }, [open, editKunde, telefon, email])

  function submit() {
    setErr(null)
    startTransition(async () => {
      const res = await saveKunde(
        {
          typ,
          name: firmaPflicht ? firmaName : null,
          vorname: vorname || null,
          nachname: nachname || null,
          strasse,
          hausnummer,
          plz,
          ort,
          telefon: telefon || null,
          email: email || null,
          webseite: webseite || null,
          ansprechpartner: ansprechpartner || null,
          geburtstag: geburtstag || null,
          quelle: quelle || null,
          notizen: notizen || null,
          ust_id: istGewerbe ? ustId || null : null,
        },
        editKunde?.id,
        revalidateAnfrageId ? { revalidateAnfrageIds: [revalidateAnfrageId] } : undefined
      )
      if (!res.ok) {
        setErr(res.message)
        return
      }
      onClose()
      if (stayOnPage) {
        onSaved?.(res.id)
        router.refresh()
      } else {
        onSaved?.(res.id)
        router.push(`/kunden/${res.id}`)
        router.refresh()
      }
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editKunde ? 'Stammdaten bearbeiten' : 'Neuer Kunde'}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}

        {!editKunde && dupes.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Bereits als Kunde vorhanden</p>
            <ul className="mt-1 list-inside list-disc">
              {dupes.map((d) => (
                <li key={d.id}>
                  {kundeDisplayName(d)} · {d.telefon ?? '—'} · {d.email ?? '—'}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Nur Hinweis auf bestehende Kunden-Datensätze. Handwerker/Partner mit gleichen Kontaktdaten sind
              erlaubt und bleiben getrennt — trotzdem speichern legt einen neuen Kunden an.
            </p>
          </div>
        ) : null}

        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <Select label="Typ *" value={typ} onChange={(e) => setTyp(e.target.value)} options={TYP_OPTS} />
          {firmaPflicht ? (
            <Input
              label={istHausverwaltung ? 'Firma *' : 'Firma / Name *'}
              value={firmaName}
              onChange={(e) => setFirmaName(e.target.value)}
              className="md:col-span-1"
              required
            />
          ) : null}
          {firmaPflicht ? (
            <>
              <Input
                label="Vorname (Ansprechpartner)"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
              />
              <Input
                label="Nachname (Ansprechpartner)"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
              />
            </>
          ) : null}
          {!firmaPflicht ? (
            <>
              <Input label="Vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} />
              <Input
                label="Nachname *"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                required
              />
            </>
          ) : null}
          <Input label="Straße *" value={strasse} onChange={(e) => setStrasse(e.target.value)} />
          <Input label="Hausnummer *" value={hausnummer} onChange={(e) => setHausnummer(e.target.value)} />
          <Input label="Postleitzahl *" value={plz} onChange={(e) => setPlz(e.target.value)} />
          <Input label="Ort *" value={ort} onChange={(e) => setOrt(e.target.value)} />
          <Input
            label="Telefon"
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
          />
          <Input
            label="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {istGewerbe ? (
            <>
              <Input
                label="USt-IdNr. (Kunde)"
                value={ustId}
                onChange={(e) => setUstId(e.target.value)}
                placeholder="DE…"
              />
              <Input
                label="Ansprechpartner"
                value={ansprechpartner}
                onChange={(e) => setAnsprechpartner(e.target.value)}
              />
            </>
          ) : null}
        </div>

        <Accordion title="Weitere Details" defaultOpen={false}>
          <div className="form-grid-2 mt-2 grid gap-3 md:grid-cols-2">
            <Input
              label="Webseite"
              type="url"
              value={webseite}
              onChange={(e) => setWebseite(e.target.value)}
            />
            {!firmaPflicht ? (
              <Input
                label="Geburtstag"
                type="date"
                value={geburtstag}
                onChange={(e) => setGeburtstag(e.target.value)}
              />
            ) : null}
            <Select
              label="Quelle"
              value={quelle}
              onChange={(e) => setQuelle(e.target.value)}
              options={QUELLE_OPTS}
            />
          </div>
          <Textarea
            className="mt-3"
            label="Notizen"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            rows={3}
          />
        </Accordion>
      </div>
    </Modal>
  )
}
