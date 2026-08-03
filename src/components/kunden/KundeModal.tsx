'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { findKundenDuplikate, mergeKunden, saveKunde } from '@/app/actions/kunden'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import {
  initKundeStammEditFelder,
  istKundeFirmaPflichtTyp,
  splitStrasseHausnummer,
} from '@/lib/kunde-stammdaten'
import { normalizeKundeNamen } from '@/lib/kunde-namen'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

const TYP_OPTS = [
  { value: 'privat', label: 'Privat' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'gewerbe', label: 'Gewerbe' },
] as const

export function KundeModal({
  open,
  onClose,
  editKunde,
  leadFunnelDaten,
  stayOnPage = false,
  revalidateAnfrageId,
  onSaved,
  context = 'detail',
  manageHistory = true,
}: {
  open: boolean
  onClose: () => void
  editKunde?: Kunde | null
  /** Website-Funnel der verknüpften Anfrage (korrekte Vorname/Nachname-Felder). */
  leadFunnelDaten?: unknown
  /** Kein Redirect zur Kundenseite nach Speichern (z. B. Anfrage-Detail). */
  stayOnPage?: boolean
  revalidateAnfrageId?: string
  /** Optional: gespeicherte Stammdaten für lokale UI-Updates ohne Reload. */
  onSaved?: (kundeId?: string, saved?: Partial<Kunde>) => void
  /** canvas = über Wizard/DocumentCanvas (z. B. Angebot → Kunde bearbeiten). */
  context?: EditorSheetContext
  /**
   * Browser-History für Back-to-Close.
   * Aus bei FAB/Gate → Wizard-Navigation nach Anlegen (sonst frisst history.back() die Ziel-URL).
   */
  manageHistory?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [typ, setTyp] = useState('privat')
  const [firmaName, setFirmaName] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [strasseNr, setStrasseNr] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [notizen, setNotizen] = useState('')
  const [dupes, setDupes] = useState<Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'> | null>(
    null
  )
  const [dirty, setDirty] = useState(false)

  const firmaPflicht = istKundeFirmaPflichtTyp(typ)
  const isCreate = !editKunde

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
        istKundeFirmaPflichtTyp(typVal)
          ? (editKunde.name ?? namen.name ?? '').trim()
          : ''
      )
      setVorname((namen.vorname ?? editKunde.vorname ?? '').trim())
      setNachname((namen.nachname ?? editKunde.nachname ?? '').trim())
      setTelefon(editKunde.telefon ?? '')
      setEmail(editKunde.email ?? '')
      const addr = initKundeStammEditFelder(editKunde)
      setStrasseNr([addr.strasse, addr.hausnummer].filter(Boolean).join(' ').trim())
      setPlz(editKunde.plz ?? '')
      setOrt(editKunde.ort ?? '')
      setNotizen(editKunde.notizen ?? '')
    } else {
      setTyp('privat')
      setFirmaName('')
      setVorname('')
      setNachname('')
      setTelefon('')
      setEmail('')
      setStrasseNr('')
      setPlz('')
      setOrt('')
      setNotizen('')
    }
    setDupes([])
    setErr(null)
    setDirty(false)
    setMergeConfirmOpen(false)
    setMergeTarget(null)
  }, [open, editKunde, leadFunnelDaten])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      startTransition(async () => {
        const d = await findKundenDuplikate(telefon || null, email || null, editKunde?.id)
        setDupes(d)
      })
    }, 400)
    return () => clearTimeout(t)
  }, [open, editKunde, telefon, email])

  function mark(fn: () => void) {
    fn()
    setDirty(true)
  }

  function runMerge(survivorId: string, mergeId: string) {
    setErr(null)
    startTransition(async () => {
      const res = await mergeKunden(survivorId, mergeId)
      if (!res.ok) {
        setErr(res.message)
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      setMergeConfirmOpen(false)
      onClose()
      onSaved?.(survivorId)
      router.push(`/kunden/${survivorId}`)
      router.refresh()
    })
  }

  const singleDupe = dupes.length === 1 ? dupes[0]! : null

  function submit() {
    setErr(null)
    if (firmaPflicht) {
      if (!firmaName.trim()) {
        setErr('Firma ist Pflicht.')
        return
      }
      if (!vorname.trim() && !nachname.trim()) {
        setErr('Ansprechpartner: Vorname oder Nachname ist Pflicht.')
        return
      }
    } else if (!vorname.trim() && !nachname.trim()) {
      setErr('Vorname oder Nachname ist Pflicht.')
      return
    }
    if (!telefon.trim()) {
      setErr('Telefon ist Pflicht.')
      return
    }
    const splitAddr = splitStrasseHausnummer(strasseNr)
    if (!splitAddr.strasse.trim()) {
      setErr('Straße + Nr. ist Pflicht.')
      return
    }
    if (!splitAddr.hausnummer?.trim()) {
      setErr('Bitte Straße und Hausnummer angeben (z. B. Leopoldstr. 42).')
      return
    }
    if (!plz.trim() || !ort.trim()) {
      setErr('PLZ und Stadt sind Pflicht.')
      return
    }

    startTransition(async () => {
      const res = await saveKunde(
        {
          typ,
          name: firmaPflicht ? firmaName.trim() : null,
          vorname: vorname.trim() || null,
          nachname: nachname.trim() || null,
          strasse: splitAddr.strasse,
          hausnummer: splitAddr.hausnummer,
          plz,
          ort,
          telefon: telefon || null,
          email: email || null,
          notizen: notizen || null,
        },
        editKunde?.id,
        revalidateAnfrageId ? { revalidateAnfrageIds: [revalidateAnfrageId] } : undefined
      )
      if (!res.ok) {
        setErr(res.message)
        toast.error(res.message)
        return
      }
      toast.success(isCreate ? 'Kunde angelegt' : 'Gespeichert')
      setDirty(false)
      const saved: Partial<Kunde> = {
        id: res.id,
        typ,
        vorname: vorname.trim() || null,
        nachname: nachname.trim() || null,
        telefon: telefon || null,
        email: email || null,
        plz,
        ort,
        strasse: splitAddr.strasse || null,
        hausnummer: splitAddr.hausnummer || null,
        notizen: notizen || null,
        ...(firmaPflicht ? { name: firmaName.trim() || undefined } : {}),
      }
      // Zuerst Parent (kann zu Wizard navigieren), dann schließen —
      // sonst history.back() vom Sheet frisst die Navigation.
      if (stayOnPage) {
        onSaved?.(res.id, saved)
        onClose()
      } else {
        onSaved?.(res.id, saved)
        onClose()
        router.push(`/kunden/${res.id}`)
        router.refresh()
      }
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isCreate ? 'Neuen Kunden anlegen' : 'Kunde bearbeiten'}
      crumb={isCreate ? 'Kunden >' : null}
      context={context}
      manageHistory={manageHistory}
      dirty={dirty}
      size="lg"
      onConfirm={submit}
      confirmBusy={pending}
      confirmDisabled={pending}
      className="kunde-create-sheet"
    >
      <div className="kunde-create">
        {err ? <p className="kunde-create__err">{err}</p> : null}

        {!editKunde && dupes.length > 0 ? (
          <div className="kunde-create__dupe" role="status">
            <p className="kunde-create__dupe-title">Bereits als Kunde vorhanden</p>
            <ul>
              {dupes.map((d) => (
                <li key={d.id}>
                  {kundeDisplayName(d)} · {d.telefon ?? '—'} · {d.email ?? '—'}
                </li>
              ))}
            </ul>
            {singleDupe ? (
              <MockBtn
                sm
                kind="ghost"
                onClick={() => {
                  onClose()
                  router.push(`/kunden/${singleDupe.id}`)
                }}
              >
                Bestehenden öffnen
              </MockBtn>
            ) : null}
          </div>
        ) : null}

        {editKunde && singleDupe ? (
          <div className="kunde-create__dupe" role="status">
            <p className="kunde-create__dupe-title">Mögliches Duplikat</p>
            <p>
              {kundeDisplayName(singleDupe)} · {singleDupe.telefon ?? '—'} · {singleDupe.email ?? '—'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <MockBtn sm kind="ghost" onClick={() => router.push(`/kunden/${singleDupe.id}`)}>
                Bestehenden öffnen
              </MockBtn>
              <MockBtn
                sm
                kind="ghost"
                onClick={() => {
                  setMergeTarget(singleDupe)
                  setMergeConfirmOpen(true)
                }}
              >
                Zusammenführen
              </MockBtn>
            </div>
          </div>
        ) : null}

        <MockFormSection title="Kundentyp" icon="user">
          <div className="field full">
            <div className="seg" role="group" aria-label="Kundentyp">
              {TYP_OPTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={typ === o.value ? 'on' : undefined}
                  onClick={() => mark(() => setTyp(o.value))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {firmaPflicht ? (
            <MockField label="Firma" required full>
              <input
                className="input"
                value={firmaName}
                onChange={(e) => mark(() => setFirmaName(e.target.value))}
                placeholder="Muster GmbH"
                autoComplete="organization"
              />
            </MockField>
          ) : null}
          <div className="full kunde-create__name-row">
            <MockField
              label={firmaPflicht ? 'Vorname (Ansprechpartner)' : 'Vorname'}
              required
            >
              <input
                className="input"
                value={vorname}
                onChange={(e) => mark(() => setVorname(e.target.value))}
                placeholder="Maria"
                autoComplete="given-name"
              />
            </MockField>
            <MockField
              label={firmaPflicht ? 'Nachname (Ansprechpartner)' : 'Nachname'}
              required
            >
              <input
                className="input"
                value={nachname}
                onChange={(e) => mark(() => setNachname(e.target.value))}
                placeholder="Koch"
                autoComplete="family-name"
              />
            </MockField>
          </div>
        </MockFormSection>

        <MockFormSection title="Kontakt" icon="link" columns={2}>
          <MockField label="Telefon" required>
            <input
              className="input"
              type="tel"
              value={telefon}
              onChange={(e) => mark(() => setTelefon(e.target.value))}
              placeholder="089 123 456"
              autoComplete="tel"
            />
          </MockField>
          <MockField label="E-Mail">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => mark(() => setEmail(e.target.value))}
              placeholder="kontakt@…"
              autoComplete="email"
            />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Adresse" icon="map-pin">
          <MockField label="Straße + Nr." full>
            <input
              className="input"
              value={strasseNr}
              onChange={(e) => mark(() => setStrasseNr(e.target.value))}
              placeholder="Leopoldstr. 42"
              autoComplete="street-address"
            />
          </MockField>
          <div className="kunde-create__plz-ort">
            <MockField label="PLZ">
              <input
                className="input"
                value={plz}
                onChange={(e) => mark(() => setPlz(e.target.value))}
                placeholder="80796"
                autoComplete="postal-code"
                inputMode="numeric"
              />
            </MockField>
            <MockField label="Stadt">
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

        <MockFormSection>
          <MockField label="Anmerkungen zum Kunden" full>
            <textarea
              className="input ta"
              rows={4}
              value={notizen}
              onChange={(e) => mark(() => setNotizen(e.target.value))}
              placeholder="Wünsche, Besonderheiten, Empfohlen von…"
            />
          </MockField>
        </MockFormSection>
      </div>

      <Modal
        open={mergeConfirmOpen && Boolean(editKunde && mergeTarget)}
        onClose={() => setMergeConfirmOpen(false)}
        title="Kunden zusammenführen"
        size="sm"
        footer={
          <div className="kunde-create-footer">
            <Button type="button" variant="secondary" onClick={() => setMergeConfirmOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              loading={pending}
              onClick={() => {
                if (!editKunde || !mergeTarget) return
                runMerge(mergeTarget.id, editKunde.id)
              }}
            >
              Zusammenführen
            </Button>
          </div>
        }
      >
        {editKunde && mergeTarget ? (
          <p className="text-[length:var(--fs-text)] text-bw-text">
            Kunde <strong>{kundeDisplayName(editKunde)}</strong> in{' '}
            <strong>{kundeDisplayName(mergeTarget)}</strong> überführen? Der aktuelle Datensatz wird
            entfernt, Vorgänge und Dokumente werden umgehängt.
          </p>
        ) : null}
      </Modal>
    </EditorSheet>
  )
}
