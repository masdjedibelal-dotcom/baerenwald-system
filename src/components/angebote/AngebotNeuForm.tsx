'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import {
  createAngebot,
  createKundeQuick,
  saveAngebotVorlage,
  searchKunden,
  updateAngebot,
  updateAngebotVorlage,
} from '@/app/(dashboard)/angebote/actions'
import type { AngebotPosition, Gewerk, Handwerker, Kunde, Lead, Preisliste } from '@/lib/types'
import { splitNettoStueck } from '@/lib/angebot-kosten-split'
import {
  neuePositionsId,
  normalizeAngebotPosition,
  summenAusPositionen,
} from '@/lib/angebot-positionen'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { preislisteEinzelpreis } from '@/lib/preisliste-preis'
import { filterHandwerkerFuerGewerkSlug } from '@/lib/handwerker/gewerk-match'
import {
  gewerkOptionsFromList,
  OfferPositionCard,
  type OfferPositionRow,
} from '@/components/angebote/OfferPositionCard'

function mittelPreisliste(pl: Preisliste): number {
  return preislisteEinzelpreis(pl)
}

function newRow(): OfferPositionRow {
  return {
    key: neuePositionsId(),
    gewerk_id: '',
    preisliste_id: '',
    leistung: '',
    beschreibung: '',
    einheit: 'Stk.',
    menge: 1,
    lohn_netto: 0,
    material_netto: 0,
    einkaufspreis: '',
    handwerker_id: '',
    notiz_intern: '',
    notiz_extern: '',
    guInternOpen: false,
  }
}

function positionToRow(p: AngebotPosition, preislisten: Preisliste[]): OfferPositionRow {
  const n = normalizeAngebotPosition(p) ?? (p as AngebotPosition)
  let pl = preislisten.find(
    (x) =>
      x.gewerk_id === n.gewerk_id && x.leistung === n.leistung && x.einheit === n.einheit
  )
  if (!pl) pl = preislisten.find((x) => x.gewerk_id === n.gewerk_id && x.leistung === n.leistung)
  const ek = n.einkaufspreis
  return {
    key: n.id || neuePositionsId(),
    gewerk_id: n.gewerk_id,
    preisliste_id: pl?.id ?? '',
    leistung: n.leistung,
    beschreibung: n.beschreibung || n.leistung,
    einheit: n.einheit,
    menge: n.menge,
    lohn_netto: n.lohn_netto,
    material_netto: n.material_netto,
    einkaufspreis: ek != null && Number.isFinite(ek) && ek > 0 ? ek : '',
    handwerker_id: n.handwerker_id ?? '',
    notiz_intern: n.notiz_intern ?? '',
    notiz_extern: n.notiz_extern ?? '',
    guInternOpen: false,
  }
}

function positionsToRows(positionen: AngebotPosition[], preislisten: Preisliste[]): OfferPositionRow[] {
  if (!positionen.length) return [newRow()]
  return positionen.map((p) => positionToRow(p, preislisten))
}

export type AngebotNeuFormProps = {
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  handwerker: Handwerker[]
  leadBundle?: { lead: Lead; kunde: Kunde } | null
  editAngebot?: {
    id: string
    lead_id: string | null
    kunde_id: string
    notizen: string | null
    positionen: AngebotPosition[]
  } | null
  /** Vorlage aus bestehendem Angebot — erzeugt immer ein neues Angebot (Entwurf) */
  kopieVon?: {
    quelleId: string
    angebotLabel: string
    lead_id: string | null
    kunde_id: string
    notizen: string | null
    positionen: AngebotPosition[]
  } | null
  /** bei kopieVon: Kundendaten zur Anzeige (optional) */
  kopieKunde?: Kunde | null
  /** Aus URL ?vorlage_id= — Positionen vorbelegen (neues Angebot) */
  vorlageBootstrap?: { name: string; positionen: AngebotPosition[] } | null
  /** Einstellungen: Angebot-Vorlage ohne Kunde */
  modusVorlage?: {
    id: string | null
    initial: { name: string; beschreibung: string; positionen: AngebotPosition[]; mitPreisen: boolean }
  } | null
}

export function AngebotNeuForm({
  gewerke,
  preislisten,
  handwerker,
  leadBundle,
  editAngebot,
  kopieVon,
  kopieKunde = null,
  vorlageBootstrap = null,
  modusVorlage = null,
}: AngebotNeuFormProps) {
  const router = useRouter()
  const isEdit = Boolean(editAngebot?.id)
  const istKopie = Boolean(kopieVon?.quelleId)
  const hervorhebePreise = istKopie

  const [vorlageName, setVorlageName] = useState(modusVorlage?.initial.name ?? '')
  const [vorlageBeschreibung, setVorlageBeschreibung] = useState(modusVorlage?.initial.beschreibung ?? '')
  const [vorlageMitPreisen, setVorlageMitPreisen] = useState(modusVorlage?.initial.mitPreisen ?? true)

  const [kundeId, setKundeId] = useState<string | null>(
    editAngebot?.kunde_id ?? kopieVon?.kunde_id ?? leadBundle?.kunde.id ?? null
  )
  const [readonlyKunde] = useState<Kunde | null>(leadBundle?.kunde ?? null)

  const [kundeSuche, setKundeSuche] = useState('')
  const [kundeTreffer, setKundeTreffer] = useState<Kunde[]>([])
  const [neuKundeOpen, setNeuKundeOpen] = useState(false)
  const [neuName, setNeuName] = useState('')
  const [neuEmail, setNeuEmail] = useState('')
  const [neuTelefon, setNeuTelefon] = useState('')

  const [rows, setRows] = useState<OfferPositionRow[]>(() => {
    if (modusVorlage?.initial.positionen?.length)
      return positionsToRows(modusVorlage.initial.positionen, preislisten)
    if (editAngebot) return positionsToRows(editAngebot.positionen, preislisten)
    if (kopieVon) return positionsToRows(kopieVon.positionen, preislisten)
    if (vorlageBootstrap?.positionen?.length)
      return positionsToRows(vorlageBootstrap.positionen, preislisten)
    return [newRow()]
  })

  const [notizen, setNotizen] = useState(() => editAngebot?.notizen ?? kopieVon?.notizen ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = kundeSuche.trim()
    if (readonlyKunde || q.length < 2) {
      setKundeTreffer([])
      return
    }
    const t = setTimeout(async () => {
      const r = await searchKunden(q)
      setKundeTreffer(r.kunden)
    }, 280)
    return () => clearTimeout(t)
  }, [kundeSuche, readonlyKunde])

  const gewerkSlug = useCallback(
    (gewerkId: string) => gewerke.find((g) => g.id === gewerkId)?.slug ?? '',
    [gewerke]
  )

  const handwerkerOptions = useCallback(
    (gewerkId: string) => {
      const slug = gewerkSlug(gewerkId)
      const aktiv = handwerker.filter((h) => h.aktiv)
      if (!slug) return aktiv
      return filterHandwerkerFuerGewerkSlug(aktiv, slug)
    },
    [gewerkSlug, handwerker]
  )

  const positionenBuilt = useMemo((): AngebotPosition[] => {
    const out: AngebotPosition[] = []
    for (const r of rows) {
      if (!r.gewerk_id || !r.preisliste_id) continue
      const g = gewerke.find((x) => x.id === r.gewerk_id)
      const pl = preislisten.find((x) => x.id === r.preisliste_id)
      const lohn = Number(r.lohn_netto) || 0
      const mat = Number(r.material_netto) || 0
      const stueck = Math.round((lohn + mat) * 100) / 100
      const ek = r.einkaufspreis === '' ? undefined : Number(r.einkaufspreis)
      const pos: AngebotPosition = {
        id: r.key,
        gewerk_id: r.gewerk_id,
        gewerk_name: g?.name ?? pl?.gewerke?.name ?? '',
        leistung: pl?.leistung ?? r.leistung,
        beschreibung: (r.beschreibung || pl?.leistung || '').trim() || (pl?.leistung ?? ''),
        lohn_netto: lohn,
        material_netto: mat,
        gesamt_min: stueck,
        gesamt_max: stueck,
        menge: Number(r.menge) || 1,
        einheit: r.einheit || pl?.einheit || 'Stk.',
        notiz_intern: r.notiz_intern.trim() || undefined,
        notiz_extern: r.notiz_extern.trim() || undefined,
        preis_typ: 'fix',
      }
      if (ek != null && Number.isFinite(ek) && ek > 0) pos.einkaufspreis = ek
      if (r.handwerker_id.trim()) pos.handwerker_id = r.handwerker_id.trim()
      out.push(pos)
    }
    return out
  }, [rows, gewerke, preislisten])

  const summen = useMemo(() => summenAusPositionen(positionenBuilt, 19), [positionenBuilt])

  const updateRow = (key: string, patch: Partial<OfferPositionRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
    )
  }

  const onGewerkChange = (key: string, gewerk_id: string) => {
    updateRow(key, {
      gewerk_id,
      preisliste_id: '',
      leistung: '',
      beschreibung: '',
      einheit: 'Stk.',
      lohn_netto: 0,
      material_netto: 0,
      handwerker_id: '',
    })
  }

  const onPreislisteChange = (key: string, preisliste_id: string) => {
    const pl = preislisten.find((p) => p.id === preisliste_id)
    if (!pl) {
      updateRow(key, { preisliste_id: '', leistung: '' })
      return
    }
    const fest = mittelPreisliste(pl)
    const split = splitNettoStueck(fest, {
      firm: defaultFirmenEinstellungen(),
      leistung: pl.leistung,
      preisliste: pl,
    })
    updateRow(key, {
      preisliste_id,
      leistung: pl.leistung,
      beschreibung: pl.leistung,
      einheit: pl.einheit,
      lohn_netto: split.lohn_netto,
      material_netto: split.material_netto,
    })
  }

  const addRow = () => setRows((p) => [...p, newRow()])
  const removeRow = (key: string) =>
    setRows((p) => (p.length <= 1 ? p : p.filter((r) => r.key !== key)))

  const submit = async () => {
    setError(null)

    if (modusVorlage) {
      if (!vorlageName.trim()) {
        setError('Bitte einen Namen für die Vorlage eingeben.')
        return
      }
      const positionen = positionenBuilt
      if (!positionen.length) {
        setError('Mindestens eine vollständige Position (Gewerk + Leistung) nötig.')
        return
      }
      setSaving(true)
      const res = modusVorlage.id
        ? await updateAngebotVorlage(
            modusVorlage.id,
            vorlageName.trim(),
            vorlageBeschreibung.trim() || null,
            positionen,
            vorlageMitPreisen
          )
        : await saveAngebotVorlage(
            vorlageName.trim(),
            vorlageBeschreibung.trim() || null,
            positionen,
            vorlageMitPreisen
          )
      setSaving(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      router.push('/einstellungen/vorlagen')
      router.refresh()
      return
    }

    let kid = kundeId

    if (!readonlyKunde && neuKundeOpen) {
      if (!neuName.trim()) {
        setError('Bitte Kundenname eingeben oder Kunde suchen.')
        return
      }
      setSaving(true)
      const created = await createKundeQuick({
        name: neuName,
        email: neuEmail.trim() || null,
        telefon: neuTelefon.trim() || null,
      })
      setSaving(false)
      if (!created.ok) {
        setError(created.message)
        return
      }
      kid = created.id
      setKundeId(created.id)
    }

    if (!kid) {
      setError('Bitte einen Kunden wählen oder anlegen.')
      return
    }

    const positionen = positionenBuilt
    if (!positionen.length) {
      setError('Mindestens eine vollständige Position (Gewerk + Leistung) nötig.')
      return
    }

    setSaving(true)
    const payload = {
      lead_id: editAngebot?.lead_id ?? kopieVon?.lead_id ?? leadBundle?.lead.id ?? null,
      kunde_id: kid,
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: notizen.trim() || null,
      preis_typ: 'fix' as const,
    }

    if (isEdit && editAngebot && !istKopie) {
      const res = await updateAngebot(editAngebot.id, payload)
      setSaving(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      router.push(`/angebote/${editAngebot.id}`)
      router.refresh()
      return
    }

    const res = await createAngebot(payload)
    setSaving(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    router.push(`/angebote/${res.id}`)
    router.refresh()
  }

  const gewerkSelectOptions = useMemo(() => gewerkOptionsFromList(gewerke), [gewerke])

  return (
    <div className="pb-28">
      <PageHeader
        action={
          <Link
            href={
              modusVorlage
                ? '/einstellungen/vorlagen'
                : leadBundle
                  ? `/anfragen/${leadBundle.lead.id}`
                  : isEdit && editAngebot
                    ? `/angebote/${editAngebot.id}`
                    : istKopie && kopieVon
                      ? `/angebote/${kopieVon.quelleId}`
                      : '/angebote'
            }
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
          >
            Zurück
          </Link>
        }
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {istKopie && kopieVon ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Kopie von Angebot <strong>{kopieVon.angebotLabel}</strong> — bitte Preise anpassen.
        </p>
      ) : null}

      {vorlageBootstrap && !editAngebot && !kopieVon && !modusVorlage ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Vorlage geladen: <strong>{vorlageBootstrap.name}</strong> — Preise prüfen.
        </p>
      ) : null}

      {modusVorlage ? (
        <section className="mb-8 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Vorlage</h2>
          <Input
            label="Name"
            required
            value={vorlageName}
            onChange={(e) => setVorlageName(e.target.value)}
          />
          <Textarea
            label="Beschreibung"
            value={vorlageBeschreibung}
            onChange={(e) => setVorlageBeschreibung(e.target.value)}
            rows={2}
          />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-ink">Preise speichern?</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="vorlage-preise"
                checked={vorlageMitPreisen}
                onChange={() => setVorlageMitPreisen(true)}
              />
              Mit Preisen
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="vorlage-preise"
                checked={!vorlageMitPreisen}
                onChange={() => setVorlageMitPreisen(false)}
              />
              Nur Struktur
            </label>
          </fieldset>
        </section>
      ) : (
      <section className="mb-8 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Kunde</h2>
        {readonlyKunde ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-ink">{readonlyKunde.name}</p>
            <p className="text-muted">{readonlyKunde.email ?? '—'}</p>
            <p className="text-muted">{readonlyKunde.telefon ?? '—'}</p>
            <p className="text-xs text-muted">Aus Lead, nicht änderbar.</p>
          </div>
        ) : istKopie && kopieKunde && kundeId === kopieKunde.id && !neuKundeOpen ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-canvas/50 p-3">
              <p className="font-medium text-ink">{kopieKunde.name}</p>
              <p className="text-muted">{kopieKunde.email ?? '—'}</p>
              <p className="text-muted">{kopieKunde.telefon ?? '—'}</p>
            </div>
            <p className="text-xs text-muted">
              Übernommen aus dem kopierten Angebot — Sie können unten einen anderen Kunden suchen.
            </p>
            <div className="relative">
              <Input
                label="Anderen Kunden suchen (optional)"
                value={kundeSuche}
                onChange={(e) => {
                  setKundeSuche(e.target.value)
                  if (e.target.value.trim().length >= 2) setKundeId(null)
                }}
                placeholder="Name tippen…"
              />
              {kundeTreffer.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
                  {kundeTreffer.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-canvas"
                        onClick={() => {
                          setKundeId(k.id)
                          setKundeSuche('')
                          setKundeTreffer([])
                        }}
                      >
                        {k.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="Kunde suchen"
                value={kundeSuche}
                onChange={(e) => setKundeSuche(e.target.value)}
                placeholder="Mind. 2 Zeichen Name"
                autoComplete="off"
              />
              {kundeTreffer.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
                  {kundeTreffer.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-canvas"
                        onClick={() => {
                          setKundeId(k.id)
                          setKundeSuche(k.name)
                          setKundeTreffer([])
                          setNeuKundeOpen(false)
                        }}
                      >
                        <span className="font-medium text-ink">{k.name}</span>
                        <span className="block text-xs text-muted">
                          {k.email ?? ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="text-sm font-medium text-primary underline"
              onClick={() => setNeuKundeOpen((o) => !o)}
            >
              {neuKundeOpen ? 'Suche nutzen' : 'Neuen Kunden anlegen'}
            </button>
            {neuKundeOpen ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Name" value={neuName} onChange={(e) => setNeuName(e.target.value)} />
                <Input
                  label="E-Mail"
                  type="email"
                  value={neuEmail}
                  onChange={(e) => setNeuEmail(e.target.value)}
                />
                <Input
                  label="Telefon"
                  value={neuTelefon}
                  onChange={(e) => setNeuTelefon(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
      )}

      <section className="mb-8 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Positionen</h2>
            <p className="text-sm text-muted">
              Festpreise pro Einheit; Handwerker pro Position zuordnen.
            </p>
          </div>
        </div>
        <div className="space-y-5">
          {rows.map((row, idx) => {
            const plForGewerk = preislisten.filter((p) => p.gewerk_id === row.gewerk_id && p.aktiv)
            const hwOpts = handwerkerOptions(row.gewerk_id)
            const selectedHw =
              hwOpts.find((h) => h.id === row.handwerker_id) ??
              handwerker.find((h) => h.id === row.handwerker_id) ??
              null
            return (
              <OfferPositionCard
                key={row.key}
                index={idx}
                row={row}
                gewerkSelectOptions={gewerkSelectOptions}
                preislistenForGewerk={plForGewerk}
                handwerkerForGewerk={hwOpts}
                selectedHandwerker={selectedHw}
                hervorhebePreise={hervorhebePreise}
                onGewerkChange={(v) => onGewerkChange(row.key, v)}
                onPreislisteChange={(v) => onPreislisteChange(row.key, v)}
                onPatch={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
              />
            )
          })}
        </div>
        <Button type="button" variant="secondary" onClick={addRow}>
          <Plus className="mr-2 inline h-4 w-4" aria-hidden />
          Position hinzufügen
        </Button>

        {modusVorlage ? (
          <div className="mt-4 rounded-lg border border-dashed border-bw-border bg-bw-bg/60 p-3 text-sm text-bw-text-muted">
            <span className="font-medium text-ink">Summe Vorlage (netto): </span>
            {betragAnzeige(null, summen.nettoMin, summen.nettoMax)}
          </div>
        ) : null}
      </section>

      {!modusVorlage ? (
        <section className="mb-8 rounded-lg border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-lg font-semibold text-ink">Notizen</h2>
          <Textarea
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            rows={4}
            placeholder="Interne Notizen…"
          />
        </section>
      ) : null}

      {!modusVorlage ? (
        <div className="sticky bottom-0 z-30 mt-4 border-t border-bw-border bg-bw-card/95 px-3 py-4 shadow-[0_-12px_32px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:rounded-t-xl sm:border sm:border-b-0 sm:px-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-bw-border bg-bw-hover/40 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Gesamt Lohn</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {betragAnzeige(null, summen.lohnZeileMin, summen.lohnZeileMax)}
              </p>
              <p className="text-xs text-bw-text-muted">netto</p>
            </div>
            <div className="rounded-lg border border-bw-border bg-bw-hover/40 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Gesamt Material</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {betragAnzeige(null, summen.materialZeileMin, summen.materialZeileMax)}
              </p>
              <p className="text-xs text-bw-text-muted">netto</p>
            </div>
            <div className="rounded-lg border border-bw-border bg-primary/8 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Netto Summe</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
                {betragAnzeige(null, summen.nettoMin, summen.nettoMax)}
              </p>
              <p className="text-xs text-bw-text-muted">zzgl. MwSt.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-bw-border pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm text-bw-text-muted">
              MwSt. {summen.mwstSatz}%:{' '}
              <span className="font-medium text-ink">
                {betragAnzeige(null, summen.mwstBetragMin, summen.mwstBetragMax)}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-bw-light">Brutto Endsumme</p>
              <p
                className="text-2xl font-bold tabular-nums tracking-tight"
                style={{ color: 'var(--fl-accent)' }}
              >
                {betragAnzeige(null, summen.bruttoMin, summen.bruttoMax)}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-bw-border pt-2 text-xs text-bw-text-muted">
            <span className="font-medium text-ink">Intern: </span>
            Einkauf {betragAnzeige(null, summen.einkaufZeileMin, summen.einkaufZeileMax)} · Marge{' '}
            {betragAnzeige(null, summen.margeMin, summen.margeMax)}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" loading={saving} onClick={() => void submit()}>
          {modusVorlage
            ? 'Speichern als Vorlage'
            : isEdit
              ? 'Speichern'
              : 'Angebot speichern'}
        </Button>
      </div>
    </div>
  )
}
