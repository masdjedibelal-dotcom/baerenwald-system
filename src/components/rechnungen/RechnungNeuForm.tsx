'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { searchKunden } from '@/app/(dashboard)/angebote/actions'
import {
  createRechnungEntwurf,
  updateRechnungEntwurf,
} from '@/app/(dashboard)/rechnungen/actions'
import { DokumentGesamtrabattPanel } from '@/components/dokumente/DokumentGesamtrabattPanel'
import { LexofficeDokumentEditor } from '@/components/dokumente/LexofficeDokumentEditor'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  angebotPositionenToDokumentZeilen,
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  summeArtikelNetto,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  berechneRechnung,
  formatHinweis35aRechnung,
  kundeKannReverseCharge13b,
  parseKleinunternehmerSetting,
  rechnungZeigtHinweis35a,
} from '@/lib/rechnung-berechnung'
import {
  DEFAULT_MWST_SATZ,
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_REVERSE_CHARGE_13B,
} from '@/lib/rechnung-config'
import { validateRechnungPflichtangaben } from '@/lib/rechnung-validierung'
import type { AngebotPosition, Gewerk, Kunde } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'

function addDaysIso(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function RechnungNeuForm({
  firm,
  angebot_id,
  auftrag_id,
  initialKundeId,
  initialKunde,
  kundenAdresseReadonly,
  positionen: initialPositionen,
  zahlungszielTage,
  backHref,
  auftragsReferenz,
  gewerke = [],
}: {
  firm: FirmenEinstellungen
  angebot_id: string | null
  auftrag_id: string | null
  initialKundeId: string | null
  initialKunde?: Pick<Kunde, 'id' | 'name' | 'typ' | 'ust_id' | 'adresse' | 'plz' | 'ort'> | null
  kundenAdresseReadonly: {
    name: string
    adresse?: string | null
    plz?: string | null
    ort?: string | null
    typ?: string | null
  } | null
  positionen: AngebotPosition[]
  zahlungszielTage: number
  backHref: string
  auftragsReferenz?: string | null
  gewerke?: Gewerk[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [zeilen, setZeilen] = useState<DokumentZeile[]>(() =>
    angebotPositionenToDokumentZeilen(normalizeAngebotPositionen(initialPositionen), gewerke)
  )
  const [kundeId, setKundeId] = useState<string | null>(initialKundeId)
  const [kundeSuch, setKundeSuch] = useState('')
  const [kundeHits, setKundeHits] = useState<Kunde[]>([])
  const [kundeAktiv, setKundeAktiv] = useState<Pick<
    Kunde,
    'id' | 'name' | 'typ' | 'ust_id' | 'adresse' | 'plz' | 'ort'
  > | null>(
    initialKunde ??
      (initialKundeId && kundenAdresseReadonly
        ? {
            id: initialKundeId,
            name: kundenAdresseReadonly.name,
            typ: kundenAdresseReadonly.typ ?? 'privat',
            ust_id: null,
            adresse: kundenAdresseReadonly.adresse ?? null,
            plz: kundenAdresseReadonly.plz ?? null,
            ort: kundenAdresseReadonly.ort ?? null,
          }
        : null)
  )

  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [rechnungsdatum, setRechnungsdatum] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [zahlungsziel, setZahlungsziel] = useState(String(zahlungszielTage))
  const [faellig, setFaellig] = useState(() =>
    addDaysIso(new Date().toISOString().slice(0, 10), zahlungszielTage)
  )
  const [reverseCharge13b, setReverseCharge13b] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [mailOpen, setMailOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwst = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)

  const positionenModel = useMemo(
    () => normalizeAngebotPositionen(dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke)),
    [zeilen, firm, gewerke]
  )

  const berechnung = useMemo(
    () =>
      berechneRechnung(positionenModel, {
        kleinunternehmer,
        reverseCharge13b: reverseCharge13b,
        defaultMwstSatz: defaultMwst,
      }),
    [positionenModel, kleinunternehmer, reverseCharge13b, defaultMwst]
  )

  const artikelNetto = useMemo(() => summeArtikelNetto(zeilen), [zeilen])
  const zeigtHinweis35a = rechnungZeigtHinweis35a(
    kundeAktiv?.typ,
    berechnung.lohn_netto,
    kleinunternehmer
  )
  const kann13b = kundeKannReverseCharge13b(kundeAktiv?.typ) && !kleinunternehmer

  function syncFaellig(rd: string, zt: string) {
    const tage = Math.max(0, parseInt(zt, 10) || 14)
    setFaellig(addDaysIso(rd, tage))
  }

  function persistEntwurf(): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
    if (!kundeId || !kundeAktiv) {
      return Promise.resolve({ ok: false, message: 'Bitte einen Kunden wählen.' })
    }
    const artikel = zeilen.filter((z) => z.typ === 'artikel')
    if (!artikel.length) {
      return Promise.resolve({ ok: false, message: 'Mindestens eine Artikel-Position ausfüllen.' })
    }
    if (artikel.some((z) => !z.bezeichnung.trim())) {
      return Promise.resolve({
        ok: false,
        message: 'Bitte bei allen Artikel-Positionen eine Bezeichnung eintragen.',
      })
    }

    const validMsg = validateRechnungPflichtangaben(firm, kundeAktiv as Kunde, {
      leistungszeitraum_von: von || null,
      leistungszeitraum_bis: bis || null,
      rechnungsdatum,
      positionenCount: artikel.length,
    })
    if (validMsg) return Promise.resolve({ ok: false, message: validMsg })

    const positionenPayload = dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke)
    const basePayload = {
      positionen: positionenPayload,
      leistungszeitraum_von: von || null,
      leistungszeitraum_bis: bis || null,
      faellig_am: faellig || null,
      rechnungsdatum,
      reverse_charge_13b: reverseCharge13b,
    }

    if (savedId) {
      return updateRechnungEntwurf(savedId, { ...basePayload, kunde_id: kundeId }).then((r) =>
        r.ok ? { ok: true, id: savedId } : r
      )
    }

    return createRechnungEntwurf({
      angebot_id,
      auftrag_id,
      kunde_id: kundeId,
      ...basePayload,
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

  const kundenCard = kundenAdresseReadonly && !kundeHits.length ? (
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
      {!kundenAdresseReadonly.adresse || !kundenAdresseReadonly.plz ? (
        <p className="mt-2 text-xs text-amber-800">
          Adresse unvollständig — bitte im Kundenstamm ergänzen vor PDF-Versand.
        </p>
      ) : null}
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
                  setKundeAktiv(k)
                  setKundeHits([])
                  setKundeSuch(k.name)
                  setReverseCharge13b(false)
                }}
              >
                <span className="font-medium">{k.name}</span>
                <span className="text-xs text-bw-light">
                  {k.typ ?? 'privat'}
                  {k.ust_id ? ` · ${k.ust_id}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {kundeAktiv && kundeId ? (
        <p className="mt-3 text-sm text-bw-text">
          Gewählt: <span className="font-medium">{kundeAktiv.name}</span>
          <span className="text-bw-text-muted"> ({kundeAktiv.typ ?? 'privat'})</span>
        </p>
      ) : null}
    </Card>
  )

  return (
    <div className="pb-36 md:pb-28">
      <PageHeader
        description={
          auftragsReferenz ? (
            <p className="text-sm text-bw-text-muted">
              Referenz Auftrag: <span className="font-semibold text-bw-text">{auftragsReferenz}</span>
            </p>
          ) : undefined
        }
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

      {kleinunternehmer ? (
        <p className="mb-4 rounded-lg border border-bw-border bg-bw-canvas px-3 py-2 text-sm text-bw-text-muted">
          {HINWEIS_KLEINUNTERNEHMER}
        </p>
      ) : null}

      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {kundenCard}

        {kann13b ? (
          <Card className="p-4">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={reverseCharge13b}
                onChange={(e) => setReverseCharge13b(e.target.checked)}
              />
              <span>
                <span className="font-medium">Reverse Charge § 13b UStG</span>
                <span className="mt-0.5 block text-xs text-bw-text-muted">
                  {HINWEIS_REVERSE_CHARGE_13B}
                </span>
              </span>
            </label>
          </Card>
        ) : null}

        <Card className="p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-bw-light">Positionen</p>
          <p className="mb-4 text-[12px] text-bw-text-muted">
            Festpreise pro Zeile — USt pro Position (0 / 7 / 19 %), sofern nicht § 13b oder
            Kleinunternehmer.
          </p>
          <LexofficeDokumentEditor
            zeilen={zeilen}
            onChange={setZeilen}
            showGesamtrabattPanel={false}
            gewerke={gewerke}
          />
        </Card>

        <Card className="space-y-2 p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Zusammenfassung</p>
          {artikelNetto !== berechnung.netto ? (
            <div className="flex justify-between text-bw-text-muted">
              <span>Zwischensumme Artikel</span>
              <span>{formatEurBetrag(artikelNetto)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-bw-light">Lohn gesamt</span>
            <span>{formatEurBetrag(berechnung.lohn_netto)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-bw-light">Material gesamt</span>
            <span>{formatEurBetrag(berechnung.material_netto)}</span>
          </div>
          <hr className="border-bw-border" />
          <div className="flex justify-between font-medium">
            <span>Netto</span>
            <span>{formatEurBetrag(berechnung.netto)}</span>
          </div>
          {kleinunternehmer || reverseCharge13b ? (
            <p className="text-xs text-bw-text-muted">
              {kleinunternehmer ? HINWEIS_KLEINUNTERNEHMER : HINWEIS_REVERSE_CHARGE_13B}
            </p>
          ) : (
            berechnung.mwst_aufschluesselung.map((z) => (
              <div key={z.satz} className="flex justify-between text-bw-text-muted">
                <span>USt {z.satz} % auf {formatEurBetrag(z.netto)}</span>
                <span>{formatEurBetrag(z.mwst)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between text-base font-semibold text-bw-accent">
            <span>Brutto</span>
            <span>{formatEurBetrag(berechnung.brutto)}</span>
          </div>

          <DokumentGesamtrabattPanel
            zeilen={zeilen}
            onChange={setZeilen}
            className="mt-3 border-0 bg-transparent px-0 py-0"
          />

          {zeigtHinweis35a ? (
            <div className="mt-3 rounded-lg bg-bw-canvas px-3 py-2 text-xs text-bw-text-muted">
              {formatHinweis35aRechnung(berechnung.lohn_netto)}
            </div>
          ) : null}
        </Card>

        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <p className="col-span-full text-xs font-medium uppercase tracking-wide text-bw-light">
            Details (Pflichtangaben § 14 UStG)
          </p>
          <Input
            type="date"
            label="Rechnungsdatum *"
            value={rechnungsdatum}
            onChange={(e) => {
              setRechnungsdatum(e.target.value)
              syncFaellig(e.target.value, zahlungsziel)
            }}
          />
          <Input
            type="number"
            label="Zahlungsziel (Tage)"
            value={zahlungsziel}
            onChange={(e) => {
              setZahlungsziel(e.target.value)
              syncFaellig(rechnungsdatum, e.target.value)
            }}
          />
          <Input type="date" label="Fällig am" value={faellig} onChange={(e) => setFaellig(e.target.value)} />
          <Input type="date" label="Leistung von *" value={von} onChange={(e) => setVon(e.target.value)} required />
          <Input type="date" label="Leistung bis *" value={bis} onChange={(e) => setBis(e.target.value)} required />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            loading={pending}
            onClick={() => {
              setErr(null)
              startTransition(async () => {
                const r = await persistEntwurf()
                if (!r.ok) {
                  setErr(r.message)
                  return
                }
                setSavedId(r.id)
                toast.success('Entwurf gespeichert')
                router.push(`/rechnungen/${r.id}`)
                router.refresh()
              })
            }}
          >
            Rechnung speichern
          </Button>
        </div>
      </div>

      <Modal open={mailOpen} onClose={() => setMailOpen(false)} title="Rechnung versenden">
        <p className="text-sm text-bw-text-muted">Versand aus der Rechnungsdetailseite nach dem Speichern.</p>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="ghost" onClick={() => setMailOpen(false)}>
            Schließen
          </Button>
        </div>
      </Modal>
    </div>
  )
}
