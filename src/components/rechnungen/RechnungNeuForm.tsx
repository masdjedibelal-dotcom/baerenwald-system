'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { searchKunden } from '@/app/(dashboard)/angebote/actions'
import {
  createRechnungEntwurf,
  updateRechnungEntwurf,
} from '@/app/(dashboard)/rechnungen/actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { neuePositionsId, normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import type { AngebotPosition, Kunde } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

type PosEdit = {
  key: string
  beschreibung: string
  menge: number
  typ: 'fix' | 'range'
  lohn: number
  mat: number
  lohnMin: number
  lohnMax: number
  matMin: number
  matMax: number
}

function positionToRow(p: AngebotPosition): PosEdit {
  return {
    key: p.id || neuePositionsId(),
    beschreibung: (p.beschreibung || p.leistung || '').trim() || 'Position',
    menge: Math.max(p.menge || 1, 0.0001),
    typ: p.preis_typ === 'range' ? 'range' : 'fix',
    lohn: p.lohn_netto,
    mat: p.material_netto,
    lohnMin: p.lohn_netto,
    lohnMax: p.lohn_netto,
    matMin: p.material_netto,
    matMax: p.material_netto,
  }
}

function rowToAngebotPosition(r: PosEdit): AngebotPosition {
  const beschreibung = r.beschreibung.trim() || 'Position'
  const leistung = beschreibung.slice(0, 120)
  if (r.typ === 'fix') {
    const lohn = r.lohn
    const mat = r.mat
    const stueck = Math.round((lohn + mat) * 100) / 100
    return {
      id: r.key,
      gewerk_id: '',
      gewerk_name: 'Allgemein',
      leistung,
      beschreibung,
      preis_typ: 'fix',
      lohn_netto: lohn,
      material_netto: mat,
      gesamt_min: stueck,
      gesamt_max: stueck,
      menge: r.menge,
      einheit: 'Stk.',
    }
  }
  const lohnN = Math.round(((r.lohnMin + r.lohnMax) / 2) * 100) / 100
  const matN = Math.round(((r.matMin + r.matMax) / 2) * 100) / 100
  const stueck = Math.round((lohnN + matN) * 100) / 100
  return {
    id: r.key,
    gewerk_id: '',
    gewerk_name: 'Allgemein',
    leistung,
    beschreibung,
    preis_typ: 'range',
    lohn_netto: lohnN,
    material_netto: matN,
    gesamt_min: stueck,
    gesamt_max: stueck,
    menge: r.menge,
    einheit: 'Stk.',
  }
}

function newRow(): PosEdit {
  const key = neuePositionsId()
  return {
    key,
    beschreibung: '',
    menge: 1,
    typ: 'fix',
    lohn: 0,
    mat: 0,
    lohnMin: 0,
    lohnMax: 0,
    matMin: 0,
    matMax: 0,
  }
}

function addDaysIso(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function RechnungNeuForm({
  angebot_id,
  auftrag_id,
  initialKundeId,
  kundenAdresseReadonly,
  positionen: initialPositionen,
  zahlungszielTage,
  backHref,
}: {
  angebot_id: string | null
  auftrag_id: string | null
  initialKundeId: string | null
  kundenAdresseReadonly: {
    name: string
    adresse?: string | null
    plz?: string | null
    ort?: string | null
  } | null
  positionen: AngebotPosition[]
  zahlungszielTage: number
  backHref: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<PosEdit[]>(() =>
    initialPositionen.length ? initialPositionen.map(positionToRow) : [newRow()]
  )
  const [kundeId, setKundeId] = useState<string | null>(initialKundeId)
  const [kundeSuch, setKundeSuch] = useState('')
  const [kundeHits, setKundeHits] = useState<Kunde[]>([])
  const [kundeFrei, setKundeFrei] = useState<Kunde | null>(null)

  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [rechnungsdatum, setRechnungsdatum] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [zahlungsziel, setZahlungsziel] = useState(String(zahlungszielTage))
  const [faellig, setFaellig] = useState(() =>
    addDaysIso(new Date().toISOString().slice(0, 10), zahlungszielTage)
  )
  const [notizIntern, setNotizIntern] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [mailOpen, setMailOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const mwst = DEFAULT_MWST_SATZ
  const positionenModel = useMemo(() => {
    const raw = rows.map(rowToAngebotPosition)
    return normalizeAngebotPositionen(raw)
  }, [rows])

  const summen = useMemo(() => summenAusPositionen(positionenModel, mwst), [positionenModel, mwst])

  const lohnGesamt = summen.lohnZeileMin
  const matGesamt = summen.materialZeileMin
  const abschlag35a = Math.round(lohnGesamt * 0.2 * 100) / 100

  function syncFaellig(rd: string, zt: string) {
    const tage = Math.max(0, parseInt(zt, 10) || 14)
    setFaellig(addDaysIso(rd, tage))
  }

  function persistEntwurf(): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
    if (!kundeId) return Promise.resolve({ ok: false, message: 'Bitte einen Kunden wählen.' })
    const pos = normalizeAngebotPositionen(rows.map(rowToAngebotPosition))
    if (!pos.length) return Promise.resolve({ ok: false, message: 'Mindestens eine Position ausfüllen.' })

    const payload = {
      positionen: rows.map(rowToAngebotPosition),
      leistungszeitraum_von: von || null,
      leistungszeitraum_bis: bis || null,
      faellig_am: faellig || null,
      rechnungsdatum,
      mwst_satz: mwst,
    }

    if (savedId) {
      return updateRechnungEntwurf(savedId, payload).then((r) =>
        r.ok ? { ok: true, id: savedId } : r
      )
    }

    return createRechnungEntwurf({
      angebot_id,
      auftrag_id,
      kunde_id: kundeId,
      positionen: rows.map(rowToAngebotPosition),
      leistungszeitraum_von: von || null,
      leistungszeitraum_bis: bis || null,
      faellig_am: faellig || null,
      rechnungsdatum,
      mwst_satz: mwst,
    }).then((r) => (r.ok ? { ok: true, id: r.id } : r))
  }

  function onKundeSuche(q: string) {
    setKundeSuch(q)
    if (q.trim().length < 2) {
      setKundeHits([])
      return
    }
    void searchKunden(q).then((res) => setKundeHits(res.kunden))
  }

  const kundenCard = kundenAdresseReadonly ? (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Kunde</p>
      <p className="mt-1 font-semibold text-bw-text">{kundenAdresseReadonly.name}</p>
      {kundenAdresseReadonly.adresse ? (
        <p className="text-sm text-bw-text-muted">{kundenAdresseReadonly.adresse}</p>
      ) : null}
      {(kundenAdresseReadonly.plz || kundenAdresseReadonly.ort) && (
        <p className="text-sm text-bw-text-muted">
          {kundenAdresseReadonly.plz} {kundenAdresseReadonly.ort}
        </p>
      )}
    </Card>
  ) : (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Kunde suchen</p>
      <Input
        label="Name"
        value={kundeSuch}
        onChange={(e) => onKundeSuche(e.target.value)}
        placeholder="Mind. 2 Zeichen"
      />
      {kundeHits.length > 0 ? (
        <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-bw-border">
          {kundeHits.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-bw-hover"
                onClick={() => {
                  setKundeId(k.id)
                  setKundeFrei(k)
                  setKundeHits([])
                  setKundeSuch(k.name)
                }}
              >
                <span className="font-medium">{k.name}</span>
                <span className="text-xs text-bw-light">{k.email ?? k.telefon ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {kundeFrei && kundeId ? (
        <p className="mt-3 text-sm text-bw-text">
          Gewählt: <span className="font-medium">{kundeFrei.name}</span>
        </p>
      ) : null}
    </Card>
  )

  return (
    <div className="pb-36 md:pb-28">
      <PageHeader
        title="Neue Rechnung"
        breadcrumbs={[
          { label: 'Rechnungen', href: '/rechnungen' },
          { label: 'Neu' },
        ]}
        action={
          <Link href={backHref} className="text-sm font-medium text-bw-link">
            Zurück
          </Link>
        }
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {kundenCard}

        <Card className="p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-bw-light">Positionen</p>
          <div className="space-y-4">
            {rows.map((row, idx) => (
              <div key={row.key} className="rounded-xl border border-bw-border bg-bw-canvas/40 p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-bw-light">Position {idx + 1}</span>
                  <div className="ml-auto flex gap-1 rounded-full border border-bw-border p-0.5 text-xs">
                    <button
                      type="button"
                      className={cn(
                        'rounded-full px-2 py-1',
                        row.typ === 'fix' ? 'bg-bw-accent text-white' : 'text-bw-light'
                      )}
                      onClick={() =>
                        setRows((p) =>
                          p.map((x) => (x.key === row.key ? { ...x, typ: 'fix' } : x))
                        )
                      }
                    >
                      Fixpreis
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'rounded-full px-2 py-1',
                        row.typ === 'range' ? 'bg-bw-accent text-white' : 'text-bw-light'
                      )}
                      onClick={() =>
                        setRows((p) =>
                          p.map((x) => (x.key === row.key ? { ...x, typ: 'range' } : x))
                        )
                      }
                    >
                      Min/Max
                    </button>
                  </div>
                </div>
                <Input
                  label="Beschreibung"
                  value={row.beschreibung}
                  onChange={(e) =>
                    setRows((p) =>
                      p.map((x) => (x.key === row.key ? { ...x, beschreibung: e.target.value } : x))
                    )
                  }
                />
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Input
                    type="number"
                    step="0.01"
                    label="Menge"
                    value={String(row.menge)}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x) =>
                          x.key === row.key
                            ? { ...x, menge: Math.max(parseFloat(e.target.value) || 0, 0.0001) }
                            : x
                        )
                      )
                    }
                  />
                </div>
                {row.typ === 'fix' ? (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <Input
                      type="number"
                      step="0.01"
                      label="Lohn netto (Stück)"
                      value={String(row.lohn)}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.key === row.key ? { ...x, lohn: parseFloat(e.target.value) || 0 } : x
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Material netto (Stück)"
                      value={String(row.mat)}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.key === row.key ? { ...x, mat: parseFloat(e.target.value) || 0 } : x
                          )
                        )
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <Input
                      type="number"
                      step="0.01"
                      label="Lohn min"
                      value={String(row.lohnMin)}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.key === row.key
                              ? { ...x, lohnMin: parseFloat(e.target.value) || 0 }
                              : x
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Lohn max"
                      value={String(row.lohnMax)}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.key === row.key
                              ? { ...x, lohnMax: parseFloat(e.target.value) || 0 }
                              : x
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Material min"
                      value={String(row.matMin)}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.key === row.key
                              ? { ...x, matMin: parseFloat(e.target.value) || 0 }
                              : x
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Material max"
                      value={String(row.matMax)}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.key === row.key
                              ? { ...x, matMax: parseFloat(e.target.value) || 0 }
                              : x
                          )
                        )
                      }
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-bw-light">
                  Zeile netto (Min.):{' '}
                  <span className="font-medium text-bw-text">
                    {(row.typ === 'fix'
                      ? (row.lohn + row.mat) * row.menge
                      : (row.lohnMin + row.matMin) * row.menge
                    ).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    €
                  </span>
                </p>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => setRows((p) => [...p, newRow()])}
          >
            + Position hinzufügen
          </Button>
        </Card>

        <Card className="space-y-2 p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Zusammenfassung</p>
          <div className="flex justify-between">
            <span className="text-bw-light">Lohn gesamt</span>
            <span>{lohnGesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-bw-light">Material gesamt</span>
            <span>{matGesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
          </div>
          <hr className="border-bw-border" />
          <div className="flex justify-between">
            <span>Netto</span>
            <span>{summen.nettoMin.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-between">
            <span>MwSt {mwst}%</span>
            <span>{summen.mwstBetragMin.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-bw-accent">
            <span>Brutto</span>
            <span>{summen.bruttoMin.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="mt-3 rounded-lg bg-bw-canvas px-3 py-2 text-xs text-bw-text-muted">
            § 35a EStG: Lohnkostenanteil {lohnGesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            steuerlich absetzbar (20 % = {abschlag35a.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €).
          </div>
        </Card>

        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <p className="col-span-full text-xs font-medium uppercase tracking-wide text-bw-light">
            Details
          </p>
          <Input
            label="Rechnungsnummer"
            value="wird beim Speichern vergeben"
            readOnly
            disabled
          />
          <Input
            type="date"
            label="Rechnungsdatum"
            value={rechnungsdatum}
            onChange={(e) => {
              const v = e.target.value
              setRechnungsdatum(v)
              syncFaellig(v, zahlungsziel)
            }}
          />
          <Input type="date" label="Leistung von" value={von} onChange={(e) => setVon(e.target.value)} />
          <Input type="date" label="Leistung bis" value={bis} onChange={(e) => setBis(e.target.value)} />
          <Input
            type="number"
            label="Zahlungsziel (Tage)"
            value={zahlungsziel}
            onChange={(e) => {
              const z = e.target.value
              setZahlungsziel(z)
              syncFaellig(rechnungsdatum, z)
            }}
          />
          <Input type="date" label="Fällig am" value={faellig} onChange={(e) => setFaellig(e.target.value)} />
        </Card>

        <Card className="p-4">
          <label className="text-xs font-medium uppercase tracking-wide text-bw-light">
            Notizen (intern)
          </label>
          <textarea
            className="mt-2 w-full rounded-lg border border-bw-border bg-bw-canvas px-3 py-2 text-sm text-bw-text"
            rows={3}
            value={notizIntern}
            onChange={(e) => setNotizIntern(e.target.value)}
            placeholder="Nur für das Team — Speicherung folgt, sobald die Spalte in der Datenbank vorliegt."
          />
        </Card>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-bw-border bg-bw-card/95 px-4 py-3 backdrop-blur md:sticky md:bottom-0"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() => {
              setErr(null)
              startTransition(async () => {
                const res = await persistEntwurf()
                if (!res.ok) {
                  setErr(res.message)
                  return
                }
                setSavedId(res.id)
                toast.message('Gespeichert', { description: 'Entwurf wurde gesichert.' })
                router.refresh()
              })
            }}
          >
            Entwurf speichern
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!savedId) {
                toast.message('Hinweis', { description: 'Bitte zuerst einen Entwurf speichern.' })
                return
              }
              window.open(`/api/rechnungen/${savedId}/pdf`, '_blank', 'noopener,noreferrer')
            }}
          >
            Vorschau (PDF)
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={pending}
            onClick={() => {
              setErr(null)
              startTransition(async () => {
                const res = await persistEntwurf()
                if (!res.ok) {
                  setErr(res.message)
                  return
                }
                setSavedId(res.id)
                setMailOpen(true)
              })
            }}
          >
            Speichern + Senden
          </Button>
        </div>
      </div>

      <Modal
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        title="Mail-Vorschau"
        footer={
          <Button type="button" variant="primary" onClick={() => setMailOpen(false)}>
            Schließen
          </Button>
        }
      >
        <p className="text-sm text-bw-text-muted">
          Die Rechnung ist als Entwurf gespeichert. Der Versand per E-Mail (PDF-Anhang über Resend) wird als
          Nächstes angebunden — hier die geplante Betreffzeile:
        </p>
        <p className="mt-3 rounded-lg border border-bw-border bg-bw-canvas p-3 font-mono text-sm">
          Rechnung {savedId ? `(ID ${savedId.slice(0, 8)}…)` : ''}
        </p>
      </Modal>
    </div>
  )
}
