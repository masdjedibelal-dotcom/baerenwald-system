'use client'

import { useEffect, useState } from 'react'

import {
  whatsAppAlsDokumente,
  whatsAppAlsTagebuchMarkieren,
  whatsAppAuswahlKontext,
  whatsAppEinsatzErledigt,
  whatsAppFotosFuerTagebuch,
  whatsAppUpdateErstellen,
  type WaAuswahlKontext,
  type WaLaufend,
} from '@/app/(dashboard)/whatsapp/actions'
import { CrmPositionEintragModal } from '@/components/auftraege/CrmPositionEintragModal'
import { MockBtn, MockSegment } from '@/components/mock-ui'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockField, MockTextarea } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { safeAction } from '@/lib/actions/safe-action'
import { DOKUMENT_ARTEN, DOKUMENT_ART_LABEL, type DokumentArt } from '@/lib/types'
import { cn } from '@/lib/utils'

type Aktion = 'tagebuch' | 'update' | 'dokument' | 'erledigt'
type Schritt = 'einsatz' | 'aktion' | Exclude<Aktion, 'tagebuch'>

const AKTIONEN: { id: Aktion; titel: string; text: string; icon: string }[] = [
  { id: 'tagebuch', titel: 'Tagebuch-Eintrag', text: 'Text und Fotos ins Bautagebuch (sieht der Kunde)', icon: 'book' },
  { id: 'update', titel: 'Update erstellen', text: 'Als Update des Partners im Einsatz', icon: 'plus' },
  { id: 'dokument', titel: 'Als Dokument speichern', text: 'Dateien in die Dokumente des Vorgangs', icon: 'file-text' },
  { id: 'erledigt', titel: 'Einsatz erledigt', text: 'Partner hat fertig gemeldet', icon: 'check' },
]

/**
 * Ausgewählte WhatsApp-Nachrichten eines Partners übernehmen:
 * 1. Einsatz wählen → 2. Aktion → 3. vorausgefülltes Formular (Tagebuch-Blatt, Update, Dokument, Erledigt).
 */
export function WhatsAppAuswahlAktion({
  open,
  ids,
  laufend,
  onClose,
  onDone,
}: {
  open: boolean
  ids: string[]
  laufend: WaLaufend[]
  onClose: () => void
  onDone: () => void
}) {
  const [schritt, setSchritt] = useState<Schritt>('einsatz')
  const [einsatzId, setEinsatzId] = useState<string | null>(null)
  const [kontext, setKontext] = useState<WaAuswahlKontext | null>(null)
  const [text, setText] = useState('')
  const [medienAuswahl, setMedienAuswahl] = useState<Set<string>>(new Set())
  const [art, setArt] = useState<DokumentArt>('sonstiges')
  const [busy, setBusy] = useState(false)
  const [tagebuch, setTagebuch] = useState<{ auftragId: string; titel: string; beschreibung: string; fotoPaths: string[] } | null>(null)

  useEffect(() => {
    if (!open) return
    setSchritt(laufend.length === 1 ? 'aktion' : 'einsatz')
    setEinsatzId(laufend.length === 1 ? laufend[0]!.id : null)
    setKontext(null)
    setArt('sonstiges')
    safeAction(whatsAppAuswahlKontext(ids))
      .then((r) => {
        if (!r.ok) return
        setKontext(r)
        setText(r.text)
        setMedienAuswahl(new Set(r.medien.map((m) => m.id)))
      })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids beim Öffnen
  }, [open])

  const einsatz = laufend.find((l) => l.id === einsatzId) ?? null
  const laeuft = einsatz?.status === 'angenommen'

  async function aktionWaehlen(a: Aktion) {
    if (!einsatz) return
    if (a !== 'tagebuch') {
      setSchritt(a)
      return
    }
    // Tagebuch: Fotos ins Tagebuch-Fach kopieren, dann das Tagebuch-Blatt vorausgefüllt öffnen
    setBusy(true)
    const r = await safeAction(whatsAppFotosFuerTagebuch(ids, einsatz.auftrag_id))
    setBusy(false)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    // Erste kurze Zeile wird Titel, der Rest Beschreibung
    const zeilen = (kontext?.text ?? '').split('\n')
    const idx = zeilen.findIndex((z) => z.trim())
    const erste = idx >= 0 ? zeilen[idx]!.trim() : ''
    const alsTitel = erste.length > 0 && erste.length <= 60
    setTagebuch({
      auftragId: einsatz.auftrag_id,
      titel: alsTitel ? erste : '',
      beschreibung: alsTitel ? zeilen.slice(idx + 1).join('\n').trim() : (kontext?.text ?? ''),
      fotoPaths: r.fotoUrls,
    })
    onClose()
  }

  async function speichern() {
    if (!einsatz) return
    setBusy(true)
    const medienIds = Array.from(medienAuswahl)
    const res =
      schritt === 'update'
        ? await safeAction(whatsAppUpdateErstellen({ ids, einsatzId: einsatz.id, text, medienIds }))
        : schritt === 'erledigt'
          ? await safeAction(whatsAppEinsatzErledigt({ ids, einsatzId: einsatz.id, text, medienIds }))
          : await safeAction(
              whatsAppAlsDokumente({
                ids: ids.filter((id) => medienAuswahl.has(id)),
                auftragId: einsatz.auftrag_id,
                einsatzId: einsatz.id,
                art,
              })
            )
    setBusy(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(
      schritt === 'update'
        ? 'Update im Einsatz gespeichert'
        : schritt === 'erledigt'
          ? 'Einsatz als erledigt gemeldet'
          : 'In den Dokumenten gespeichert'
    )
    onClose()
    onDone()
  }

  const medien = kontext?.medien ?? []
  const titel =
    schritt === 'einsatz'
      ? 'Zu welchem Einsatz?'
      : schritt === 'aktion'
        ? 'Was soll passieren?'
        : AKTIONEN.find((a) => a.id === schritt)?.titel ?? ''

  return (
    <>
      <EditorSheet
        open={open}
        onClose={onClose}
        title={titel}
        crumb={`${ids.length} Nachricht${ids.length === 1 ? '' : 'en'} ausgewählt${einsatz && schritt !== 'einsatz' ? ` · ${einsatz.auftrag_titel}` : ''}`}
        secondary={
          schritt === 'einsatz'
            ? null
            : {
                label: 'Zurück',
                kind: 'ghost',
                disabled: busy,
                onClick: () => setSchritt(schritt === 'aktion' ? 'einsatz' : 'aktion'),
              }
        }
        primary={
          schritt === 'einsatz'
            ? { label: 'Weiter', disabled: !einsatz, onClick: () => setSchritt('aktion') }
            : schritt === 'aktion'
              ? null
              : {
                  label: schritt === 'erledigt' ? 'Als erledigt melden' : 'Speichern',
                  icon: 'check',
                  busy,
                  disabled:
                    busy ||
                    (schritt === 'dokument' && !medienAuswahl.size) ||
                    (schritt === 'update' && !text.trim() && !medienAuswahl.size),
                  onClick: () => void speichern(),
                }
        }
      >
        {schritt === 'einsatz' ? (
          laufend.length ? (
            <div className="einsatz-partner-liste" role="radiogroup" aria-label="Einsatz">
              {laufend.map((l) => {
                const on = einsatzId === l.id
                return (
                  <MockBtn
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`einsatz-partner${on ? ' is-on' : ''}`}
                    onClick={() => setEinsatzId(l.id)}
                  >
                    <span className="einsatz-partner__dot" aria-hidden />
                    <span className="einsatz-partner__name">
                      {l.auftrag_titel}
                      {l.titel && l.titel !== l.auftrag_titel ? ` · ${l.titel}` : ''}
                    </span>
                    <span className="einsatz-partner__hint">{l.status === 'gesendet' ? 'noch nicht angenommen' : 'läuft'}</span>
                  </MockBtn>
                )
              })}
            </div>
          ) : (
            <p className="einsatz-partner-leer">Dieser Partner hat keinen laufenden Einsatz.</p>
          )
        ) : null}

        {schritt === 'aktion' ? (
          <div className="wa-aktionen">
            {AKTIONEN.map((a) => {
              const gesperrt = (a.id === 'update' || a.id === 'erledigt') && !laeuft
              return (
                <MockBtn
                  key={a.id}
                  type="button"
                  className={cn('wa-aktion', gesperrt && 'is-gesperrt')}
                  disabled={busy || gesperrt}
                  title={gesperrt ? 'Erst möglich, wenn der Partner den Einsatz angenommen hat' : undefined}
                  onClick={() => void aktionWaehlen(a.id)}
                >
                  <span className="wa-aktion__icon">
                    <MockIcon ctx="default" n={a.icon} size={20} />
                  </span>
                  <span className="wa-aktion__text">
                    <span className="wa-aktion__titel">{a.titel}</span>
                    <span className="wa-aktion__sub">{gesperrt ? 'Einsatz noch nicht angenommen' : a.text}</span>
                  </span>
                </MockBtn>
              )
            })}
          </div>
        ) : null}

        {schritt === 'update' || schritt === 'erledigt' ? (
          <MockField label={schritt === 'erledigt' ? 'Was wurde gemacht?' : 'Text'}>
            <MockTextarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </MockField>
        ) : null}

        {schritt === 'dokument' ? (
          <MockField label="Art">
            <MockSegment
              value={art}
              onChange={setArt}
              options={DOKUMENT_ARTEN.map((a) => ({ value: a, label: DOKUMENT_ART_LABEL[a] }))}
              aria-label="Art des Dokuments"
            />
          </MockField>
        ) : null}

        {schritt === 'update' || schritt === 'erledigt' || schritt === 'dokument' ? (
          <MockField label={medien.length ? `Dateien (${medienAuswahl.size} von ${medien.length})` : 'Dateien'}>
            {medien.length ? (
              <div className="wa-medienwahl">
                {medien.map((m) => {
                  const an = medienAuswahl.has(m.id)
                  return (
                    <label key={m.id} className={cn('wa-medienwahl__eintrag', an && 'is-an')}>
                      <MockCheckbox
                        checked={an}
                        onChange={() =>
                          setMedienAuswahl((prev) => {
                            const next = new Set(prev)
                            if (next.has(m.id)) next.delete(m.id)
                            else next.add(m.id)
                            return next
                          })
                        }
                      />
                      {m.mime?.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element -- befristete Storage-Links
                        <img src={m.url} alt={m.name} />
                      ) : (
                        <MockIcon ctx="default" n="file-text" size={20} />
                      )}
                      <span className="wa-medienwahl__name">{m.name}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="einsatz-partner-leer">In der Auswahl sind keine Dateien.</p>
            )}
          </MockField>
        ) : null}
      </EditorSheet>

      {tagebuch ? (
        <CrmPositionEintragModal
          open
          auftragId={tagebuch.auftragId}
          vorbelegung={tagebuch}
          onClose={() => setTagebuch(null)}
          onSaved={() => {
            safeAction(whatsAppAlsTagebuchMarkieren(ids, tagebuch.auftragId))
              .then(() => onDone())
              .catch(() => onDone())
          }}
        />
      ) : null}
    </>
  )
}
