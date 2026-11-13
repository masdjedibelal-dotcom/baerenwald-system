'use client'

import { useCallback, useEffect, useState } from 'react'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { useTransition } from '@/components/ui/action-busy'
import { Combobox } from '@/components/ui/Combobox'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import type { EntityMenuItem } from '@/lib/entity-menu'
import {
  entfernePerson,
  ladePersonEin,
  ladeVerwaltungZugang,
  speicherePerson,
  speichereVerwaltungSchalter,
  type PersonRolle,
  type VerwaltungPerson,
  type VerwaltungZugang,
} from '@/teo/hv/verwaltung-zugang-actions'

const ROLLEN_OPTIONEN: { value: PersonRolle; label: string }[] = [
  { value: 'verwaltung', label: 'Verwaltung' },
  { value: 'team', label: 'Team (Hausmeister, Reinigung …)' },
  { value: 'eigentuemer', label: 'Eigentümer' },
]
const ROLLEN_KURZ: Record<PersonRolle, string> = { verwaltung: 'Verwaltung', team: 'Team', eigentuemer: 'Eigentümer' }
const ZUGANG_LABEL: Record<VerwaltungPerson['zugang'], string> = {
  nur_mail: 'nur E-Mail',
  eingeladen: 'eingeladen',
  aktiv: 'angemeldet',
}
const COLS = 'minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 0.8fr) 44px'

/**
 * HV ohne Portal-Zwang: Schalter Arbeitsplatz / QR-Meldung (standardmäßig aus),
 * Auftragsadresse für Aufträge per E-Mail, Personen der Verwaltung (nur Mail oder mit Zugang).
 */
export function VerwaltungZugangCard({ kundeId }: { kundeId: string }) {
  const [daten, setDaten] = useState<VerwaltungZugang | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [sheetOffen, setSheetOffen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rolle, setRolle] = useState<PersonRolle>('verwaltung')
  const [darfFreigeben, setDarfFreigeben] = useState(true)
  const [entfernen, setEntfernen] = useState<VerwaltungPerson | null>(null)

  const laden = useCallback(async () => {
    const r = await ladeVerwaltungZugang(kundeId)
    if (r.ok) {
      setDaten(r.daten)
      setFehler(null)
    } else setFehler(r.message)
  }, [kundeId])

  useEffect(() => {
    void laden()
  }, [laden])

  function schalter(next: { arbeitsplatzAktiv: boolean; meldeQrAktiv: boolean }) {
    if (!daten) return
    const vorher = daten
    setDaten({ ...daten, ...next })
    startTransition(async () => {
      const r = await speichereVerwaltungSchalter(kundeId, next)
      if (!r.ok) {
        setDaten(vorher)
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
    })
  }

  function neu() {
    setEditId(null)
    setName('')
    setEmail('')
    setRolle('verwaltung')
    setDarfFreigeben(true)
    setSheetOffen(true)
  }

  function bearbeiten(p: VerwaltungPerson) {
    setEditId(p.id)
    setName(p.name)
    setEmail(p.email ?? '')
    setRolle(p.rolle)
    setDarfFreigeben(p.darfFreigeben)
    setSheetOffen(true)
  }

  function speichern() {
    startTransition(async () => {
      const r = await speicherePerson(kundeId, editId, { name, email, rolle, darfFreigeben })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setSheetOffen(false)
      toast.success('Person gespeichert')
      await laden()
    })
  }

  function einladen(p: VerwaltungPerson) {
    startTransition(async () => {
      const r = await ladePersonEin(kundeId, p.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(`Einladung an ${p.email} gesendet`)
      await laden()
    })
  }

  function entfernenBestaetigt() {
    const p = entfernen
    if (!p) return
    startTransition(async () => {
      const r = await entfernePerson(kundeId, p.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setEntfernen(null)
      toast.success('Person entfernt')
      await laden()
    })
  }

  async function kopieren(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Adresse kopiert')
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  function menu(p: VerwaltungPerson): EntityMenuItem[] {
    const items: EntityMenuItem[] = [{ icon: 'pencil', label: 'Bearbeiten', onClick: () => bearbeiten(p) }]
    if (daten?.arbeitsplatzAktiv && p.zugang !== 'aktiv' && p.email) {
      items.push({
        icon: 'send',
        label: p.zugang === 'eingeladen' ? 'Einladung erneut senden' : 'Zum Arbeitsplatz einladen',
        onClick: () => einladen(p),
      })
    }
    items.push('sep', { icon: 'trash', label: 'Entfernen', danger: true, onClick: () => setEntfernen(p) })
    return items
  }

  if (fehler) {
    return (
      <MockCard title="Zusammenarbeit & Personen" icon="users" className="mt-5">
        <p className="m-0 text-fs-meta" style={{ color: 'var(--text-3)' }}>
          {fehler}
        </p>
      </MockCard>
    )
  }
  if (!daten) return null

  return (
    <>
      <MockCard
        title="Zusammenarbeit & Personen"
        icon="users"
        className="mt-5"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={neu} disabled={pending}>
            Person
          </MockBtn>
        }
      >
        <p className="mb-4 text-fs-meta leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Die Verwaltung kann komplett per E-Mail mit uns arbeiten: Aufträge an die Auftragsadresse schicken, Angebote,
          Termine und Rechnungen per Mail bekommen, über der Freigabegrenze mit einem Klick in der Mail freigeben.
        </p>

        <div className="space-y-3">
          <MockField label="Auftragsadresse" full hint="Aufträge an diese Adresse werden automatisch eine Anfrage bei dieser Verwaltung.">
            {daten.auftragsAdresse ? (
              <div className="txt" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-soft)' }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {daten.auftragsAdresse}
                </span>
                <MockBtn sm kind="ghost" icon="copy" title="Adresse kopieren" onClick={() => void kopieren(daten.auftragsAdresse!)} />
              </div>
            ) : (
              <p className="m-0 text-fs-meta" style={{ color: 'var(--text-3)' }}>
                Mail-Eingang ist noch nicht eingerichtet (AUFTRAG_EINGANG_EMAIL fehlt). Bis dahin: Org-Kennung speichern.
              </p>
            )}
          </MockField>

          <label className="ap-check">
            <MockCheckbox
              checked={daten.arbeitsplatzAktiv}
              disabled={pending}
              onChange={(e) => schalter({ arbeitsplatzAktiv: e.target.checked, meldeQrAktiv: daten.meldeQrAktiv })}
            />
            <span>
              <strong>Arbeitsplatz (Login)</strong> — Personen können sich anmelden und alle Vorgänge online sehen.
            </span>
          </label>
          <label className="ap-check">
            <MockCheckbox
              checked={daten.meldeQrAktiv}
              disabled={pending}
              onChange={(e) => schalter({ arbeitsplatzAktiv: daten.arbeitsplatzAktiv, meldeQrAktiv: e.target.checked })}
            />
            <span>
              <strong>Mieter-Meldung per QR-Aushang</strong> — Mieter melden Schäden direkt (braucht Impressum- und Datenschutz-Link).
            </span>
          </label>
        </div>

        <div className="mt-5">
          {daten.personen.length === 0 ? (
            <MockEmpty
              icon="users"
              title="Noch keine Personen"
              hint="Wer Freigabe-Mails bekommen oder sich anmelden soll. Ohne Personen geht alles an die Haupt-E-Mail der Verwaltung."
            />
          ) : (
            <div className="ap-list">
              <div className="ap-list__head" style={{ gridTemplateColumns: COLS }}>
                <span>Name</span>
                <span>E-Mail</span>
                <span>Rolle</span>
                <span>Zugang</span>
                <span aria-hidden />
              </div>
              {daten.personen.map((p) => (
                <div key={p.id} className="ap-list__row" style={{ gridTemplateColumns: COLS }}>
                  <MockBtn className="ap-list__hit" type="button" onClick={() => bearbeiten(p)} style={{ display: 'contents' }}>
                    <span className="ap-list__name-cell">
                      {p.name}
                      {p.darfFreigeben ? <span className="ap-badge">Freigabe</span> : null}
                    </span>
                    <span className="ap-list__dim">{p.email || '—'}</span>
                    <span className="ap-list__dim">{ROLLEN_KURZ[p.rolle]}</span>
                    <span className="ap-list__dim">{ZUGANG_LABEL[p.zugang]}</span>
                  </MockBtn>
                  <div className="row-actions always" style={{ justifyContent: 'flex-end' }}>
                    <MockEntityRowMenu items={menu(p)} title={p.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </MockCard>

      <EditorSheet
        open={sheetOffen}
        onClose={() => setSheetOffen(false)}
        title={editId ? 'Person bearbeiten' : 'Neue Person'}
        size="md"
        compose
        composeLabel="Speichern"
        onConfirm={speichern}
        confirmDisabled={pending}
        confirmBusy={pending}
      >
        <div className="space-y-4">
          <MockField label="Name" required>
            <MockInput value={name} disabled={pending} onChange={(e) => setName(e.target.value)} />
          </MockField>
          <MockField label="E-Mail" required>
            <MockInput type="email" value={email} disabled={pending} onChange={(e) => setEmail(e.target.value)} />
          </MockField>
          <Combobox
            label="Rolle"
            disabled={pending}
            options={ROLLEN_OPTIONEN}
            value={rolle}
            onChange={(next) => setRolle((next as PersonRolle) || 'verwaltung')}
          />
          {rolle === 'verwaltung' ? (
            <label className="ap-check">
              <MockCheckbox checked={darfFreigeben} disabled={pending} onChange={(e) => setDarfFreigeben(e.target.checked)} />
              <span>Darf freigeben — bekommt die Freigabe-Mails mit den Knöpfen „Freigeben“ / „Ablehnen“</span>
            </label>
          ) : null}
          <p className="m-0 text-fs-meta" style={{ color: 'var(--text-3)' }}>
            {daten.arbeitsplatzAktiv
              ? 'Zugang zum Arbeitsplatz: nach dem Speichern über das Menü der Person „Zum Arbeitsplatz einladen“.'
              : 'Der Arbeitsplatz ist für diese Verwaltung aus — die Person bekommt nur E-Mails.'}
          </p>
        </div>
      </EditorSheet>

      <ConfirmPopup
        open={Boolean(entfernen)}
        onClose={() => {
          if (!pending) setEntfernen(null)
        }}
        title="Person entfernen?"
        danger
        busy={pending}
        confirmLabel={pending ? 'Wird entfernt…' : 'Entfernen'}
        onConfirm={entfernenBestaetigt}
      >
        <p className="m-0" style={{ color: 'var(--text-3)' }}>
          {entfernen?.name} bekommt keine Mails mehr und kann sich nicht mehr anmelden.
        </p>
      </ConfirmPopup>
    </>
  )
}
