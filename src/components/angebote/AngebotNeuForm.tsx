'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
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
import type {
  AngebotHandwerkerZuweisungInput,
  AngebotHandwerkerZuweisungStatus,
  AngebotPosition,
  Gewerk,
  Handwerker,
  Kunde,
  Lead,
  Preisliste,
} from '@/lib/types'
import {
  neuePositionsId,
  normalizeAngebotPosition,
  summenAusPositionen,
} from '@/lib/angebot-positionen'
import { cn, formatPreis } from '@/lib/utils'

type PosRow = {
  key: string
  gewerk_id: string
  preisliste_id: string
  leistung: string
  beschreibung: string
  einheit: string
  menge: number
  lohn_min: number
  lohn_max: number
  material_min: number
  material_max: number
  einkaufspreis_min: number | ''
  einkaufspreis_max: number | ''
  notiz_intern: string
  notiz_extern: string
  internOpen: boolean
}

type HwRow = {
  key: string
  gewerk_id: string
  handwerker_id: string
  status: AngebotHandwerkerZuweisungStatus
  aufgabe_notiz: string
}

function newRow(): PosRow {
  return {
    key: neuePositionsId(),
    gewerk_id: '',
    preisliste_id: '',
    leistung: '',
    beschreibung: '',
    einheit: 'Stk.',
    menge: 1,
    lohn_min: 0,
    lohn_max: 0,
    material_min: 0,
    material_max: 0,
    einkaufspreis_min: '',
    einkaufspreis_max: '',
    notiz_intern: '',
    notiz_extern: '',
    internOpen: false,
  }
}

function newHwRow(gewerk_id = ''): HwRow {
  return {
    key: neuePositionsId(),
    gewerk_id,
    handwerker_id: '',
    status: 'ausstehend',
    aufgabe_notiz: '',
  }
}

function positionToRow(p: AngebotPosition, preislisten: Preisliste[]): PosRow {
  const n = normalizeAngebotPosition(p) ?? (p as AngebotPosition)
  let pl = preislisten.find(
    (x) =>
      x.gewerk_id === n.gewerk_id && x.leistung === n.leistung && x.einheit === n.einheit
  )
  if (!pl) pl = preislisten.find((x) => x.gewerk_id === n.gewerk_id && x.leistung === n.leistung)
  return {
    key: n.id || neuePositionsId(),
    gewerk_id: n.gewerk_id,
    preisliste_id: pl?.id ?? '',
    leistung: n.leistung,
    beschreibung: n.beschreibung || n.leistung,
    einheit: n.einheit,
    menge: n.menge,
    lohn_min: n.lohn_min,
    lohn_max: n.lohn_max,
    material_min: n.material_min,
    material_max: n.material_max,
    einkaufspreis_min:
      n.einkaufspreis_min != null && Number.isFinite(n.einkaufspreis_min)
        ? n.einkaufspreis_min
        : '',
    einkaufspreis_max:
      n.einkaufspreis_max != null && Number.isFinite(n.einkaufspreis_max)
        ? n.einkaufspreis_max
        : '',
    notiz_intern: n.notiz_intern ?? '',
    notiz_extern: n.notiz_extern ?? '',
    internOpen: false,
  }
}

function positionsToRows(positionen: AngebotPosition[], preislisten: Preisliste[]): PosRow[] {
  if (!positionen.length) return [newRow()]
  return positionen.map((p) => positionToRow(p, preislisten))
}

function vorabPositionenToRows(
  positionen: AngebotPosition[],
  preislisten: Preisliste[]
): PosRow[] {
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
    handwerkerZuweisungen: AngebotHandwerkerZuweisungInput[]
  } | null
  /** Vorlage aus bestehendem Angebot — erzeugt immer ein neues Angebot (Entwurf) */
  kopieVon?: {
    quelleId: string
    angebotLabel: string
    lead_id: string | null
    kunde_id: string
    notizen: string | null
    positionen: AngebotPosition[]
    handwerkerZuweisungen: AngebotHandwerkerZuweisungInput[]
  } | null
  /** bei kopieVon: Kundendaten zur Anzeige (optional) */
  kopieKunde?: Kunde | null
  vorabVorOrt?: { positionen: AngebotPosition[]; hinweisBox: string } | null
  /** Aus URL ?vorlage_id= — Positionen vorbelegen (neues Angebot) */
  vorlageBootstrap?: { name: string; positionen: AngebotPosition[] } | null
  /** Einstellungen: Angebot-Vorlage ohne Kunde */
  modusVorlage?: {
    id: string | null
    initial: { name: string; beschreibung: string; positionen: AngebotPosition[]; mitPreisen: boolean }
  } | null
}

const HW_STATUS_OPTS: { value: AngebotHandwerkerZuweisungStatus; label: string }[] = [
  { value: 'ausstehend', label: 'Ausstehend' },
  { value: 'angefragt', label: 'Angefragt' },
  { value: 'akzeptiert', label: 'Akzeptiert' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
  { value: 'ersetzt', label: 'Ersetzt' },
]

export function AngebotNeuForm({
  gewerke,
  preislisten,
  handwerker,
  leadBundle,
  editAngebot,
  kopieVon,
  kopieKunde = null,
  vorabVorOrt,
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

  const [rows, setRows] = useState<PosRow[]>(() => {
    if (modusVorlage?.initial.positionen?.length)
      return positionsToRows(modusVorlage.initial.positionen, preislisten)
    if (editAngebot) return positionsToRows(editAngebot.positionen, preislisten)
    if (kopieVon) return positionsToRows(kopieVon.positionen, preislisten)
    if (vorabVorOrt?.positionen?.length)
      return vorabPositionenToRows(vorabVorOrt.positionen, preislisten)
    if (vorlageBootstrap?.positionen?.length)
      return positionsToRows(vorlageBootstrap.positionen, preislisten)
    return [newRow()]
  })

  const [hwRows, setHwRows] = useState<HwRow[]>(() => {
    const list = editAngebot?.handwerkerZuweisungen ?? kopieVon?.handwerkerZuweisungen ?? []
    if (!list.length) return [newHwRow()]
    return list.map((z) => ({
      key: neuePositionsId(),
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: (z.status as AngebotHandwerkerZuweisungStatus) ?? 'ausstehend',
      aufgabe_notiz: z.aufgabe_notiz ?? '',
    }))
  })

  const [notizen, setNotizen] = useState(() => {
    const base = editAngebot?.notizen ?? kopieVon?.notizen ?? ''
    if (vorabVorOrt?.hinweisBox) {
      return base ? `${base}\n\n${vorabVorOrt.hinweisBox}` : vorabVorOrt.hinweisBox
    }
    return base
  })
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
      return handwerker.filter(
        (h) => h.aktiv && slug && (h.gewerke ?? []).includes(slug)
      )
    },
    [gewerkSlug, handwerker]
  )

  const gewerkeInAngebot = useMemo(() => {
    const ids = new Set<string>()
    for (const r of rows) {
      if (r.gewerk_id) ids.add(r.gewerk_id)
    }
    return Array.from(ids)
  }, [rows])

  const positionenBuilt = useMemo((): AngebotPosition[] => {
    const out: AngebotPosition[] = []
    for (const r of rows) {
      if (!r.gewerk_id || !r.preisliste_id) continue
      const g = gewerke.find((x) => x.id === r.gewerk_id)
      const pl = preislisten.find((x) => x.id === r.preisliste_id)
      const lmin = Number(r.lohn_min) || 0
      const lmax = Number(r.lohn_max) || 0
      const mmin = Number(r.material_min) || 0
      const mmax = Number(r.material_max) || 0
      const emin = r.einkaufspreis_min === '' ? undefined : Number(r.einkaufspreis_min)
      const emax = r.einkaufspreis_max === '' ? undefined : Number(r.einkaufspreis_max)
      out.push({
        id: r.key,
        gewerk_id: r.gewerk_id,
        gewerk_name: g?.name ?? pl?.gewerke?.name ?? '',
        leistung: pl?.leistung ?? r.leistung,
        beschreibung: (r.beschreibung || pl?.leistung || '').trim() || (pl?.leistung ?? ''),
        lohn_min: lmin,
        lohn_max: lmax,
        material_min: mmin,
        material_max: mmax,
        gesamt_min: lmin + mmin,
        gesamt_max: lmax + mmax,
        menge: Number(r.menge) || 1,
        einheit: r.einheit || pl?.einheit || 'Stk.',
        einkaufspreis_min: emin != null && Number.isFinite(emin) ? emin : undefined,
        einkaufspreis_max: emax != null && Number.isFinite(emax) ? emax : undefined,
        notiz_intern: r.notiz_intern.trim() || undefined,
        notiz_extern: r.notiz_extern.trim() || undefined,
      })
    }
    return out
  }, [rows, gewerke, preislisten])

  const summen = useMemo(() => summenAusPositionen(positionenBuilt, 19), [positionenBuilt])

  const updateRow = (key: string, patch: Partial<PosRow>) => {
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
      lohn_min: 0,
      lohn_max: 0,
      material_min: 0,
      material_max: 0,
    })
  }

  const onPreislisteChange = (key: string, preisliste_id: string) => {
    const pl = preislisten.find((p) => p.id === preisliste_id)
    if (!pl) {
      updateRow(key, { preisliste_id: '', leistung: '' })
      return
    }
    updateRow(key, {
      preisliste_id,
      leistung: pl.leistung,
      beschreibung: pl.leistung,
      einheit: pl.einheit,
      lohn_min: pl.preis_min,
      lohn_max: pl.preis_max,
      material_min: 0,
      material_max: 0,
    })
  }

  const addRow = () => setRows((p) => [...p, newRow()])
  const removeRow = (key: string) =>
    setRows((p) => (p.length <= 1 ? p : p.filter((r) => r.key !== key)))

  const addHwRow = () => setHwRows((p) => [...p, newHwRow()])
  const removeHwRow = (key: string) =>
    setHwRows((p) => (p.length <= 1 ? p : p.filter((r) => r.key !== key)))

  const buildHandwerkerZuweisungen = (): AngebotHandwerkerZuweisungInput[] => {
    const out: AngebotHandwerkerZuweisungInput[] = []
    for (const h of hwRows) {
      if (!h.gewerk_id || !h.handwerker_id) continue
      out.push({
        gewerk_id: h.gewerk_id,
        handwerker_id: h.handwerker_id,
        status: h.status,
        aufgabe_notiz: h.aufgabe_notiz.trim() || null,
      })
    }
    return out
  }

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

    const handwerkerZuweisungen = buildHandwerkerZuweisungen()

    setSaving(true)
    const payload = {
      lead_id: editAngebot?.lead_id ?? kopieVon?.lead_id ?? leadBundle?.lead.id ?? null,
      kunde_id: kid,
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: notizen.trim() || null,
      handwerkerZuweisungen,
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

  const gewerkSelectOptions = [
    { value: '', label: 'Gewerk wählen' },
    ...gewerke
      .filter((g) => g.aktiv)
      .map((g) => ({ value: g.id, label: g.name })),
  ]

  return (
    <div>
      <PageHeader
        title={
          modusVorlage
            ? modusVorlage.id
              ? 'Vorlage bearbeiten'
              : 'Neue Vorlage'
            : isEdit
              ? 'Angebot bearbeiten'
              : 'Neues Angebot'
        }
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

      {vorabVorOrt?.hinweisBox ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {vorabVorOrt.hinweisBox}
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
        <h2 className="text-lg font-semibold text-ink">Positionen</h2>
        <div className="space-y-8">
          {rows.map((row) => {
            const plForGewerk = preislisten.filter(
              (p) => p.gewerk_id === row.gewerk_id && p.aktiv
            )
            const gesamtMin = (Number(row.lohn_min) || 0) + (Number(row.material_min) || 0)
            const gesamtMax = (Number(row.lohn_max) || 0) + (Number(row.material_max) || 0)
            const m = Number(row.menge) || 1
            const emax = row.einkaufspreis_max === '' ? null : Number(row.einkaufspreis_max)
            const emin = row.einkaufspreis_min === '' ? null : Number(row.einkaufspreis_min)
            const margeMin =
              emax != null && Number.isFinite(emax)
                ? gesamtMin * m - emax * m
                : null
            const margeMax =
              emin != null && Number.isFinite(emin)
                ? gesamtMax * m - emin * m
                : null

            return (
              <div
                key={row.key}
                className="space-y-3 border-b border-border pb-8 last:border-0 last:pb-0"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-base font-medium text-ink">Gewerk</span>
                    <select
                      value={row.gewerk_id}
                      onChange={(e) => onGewerkChange(row.key, e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:ring-2 focus:ring-primary"
                    >
                      {gewerkSelectOptions.map((o) => (
                        <option key={o.value || '_'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-base font-medium text-ink">Leistung (Preisliste)</span>
                    <select
                      value={row.preisliste_id}
                      onChange={(e) => onPreislisteChange(row.key, e.target.value)}
                      disabled={!row.gewerk_id}
                      className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">Leistung wählen</option>
                      {plForGewerk.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.leistung}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Textarea
                  label="Beschreibung (Kundentext)"
                  hint="Wird im Angebot / PDF angezeigt"
                  value={row.beschreibung}
                  onChange={(e) => updateRow(row.key, { beschreibung: e.target.value })}
                  rows={2}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Menge"
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={row.menge}
                    onChange={(e) =>
                      updateRow(row.key, { menge: Number(e.target.value) || 1 })
                    }
                  />
                  <Input
                    label="Einheit"
                    value={row.einheit}
                    onChange={(e) => updateRow(row.key, { einheit: e.target.value })}
                  />
                </div>
                <div
                  className={cn(
                    'space-y-3 rounded-lg',
                    hervorhebePreise && 'border border-amber-300 bg-amber-50 p-3'
                  )}
                >
                  {hervorhebePreise ? (
                    <p className="text-xs font-medium text-amber-950">
                      Bitte prüfen und anpassen (Preise aus Vorlage).
                    </p>
                  ) : null}
                  <p className="text-sm font-semibold text-ink">Lohn (€ / Einheit, netto)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Lohn Min"
                      type="number"
                      min={0}
                      step={50}
                      value={row.lohn_min}
                      onChange={(e) =>
                        updateRow(row.key, { lohn_min: Number(e.target.value) || 0 })
                      }
                    />
                    <Input
                      label="Lohn Max"
                      type="number"
                      min={0}
                      step={50}
                      value={row.lohn_max}
                      onChange={(e) =>
                        updateRow(row.key, { lohn_max: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <p className="text-sm font-semibold text-ink">Material (€ / Einheit, netto)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Material Min"
                      type="number"
                      min={0}
                      step={50}
                      value={row.material_min}
                      onChange={(e) =>
                        updateRow(row.key, { material_min: Number(e.target.value) || 0 })
                      }
                    />
                    <Input
                      label="Material Max"
                      type="number"
                      min={0}
                      step={50}
                      value={row.material_max}
                      onChange={(e) =>
                        updateRow(row.key, { material_max: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <p className="text-sm text-muted">
                  Gesamt Stückpreis: {gesamtMin.toLocaleString('de-DE')} –{' '}
                  {gesamtMax.toLocaleString('de-DE')} € · Zeile netto:{' '}
                  {(gesamtMin * m).toLocaleString('de-DE')} – {(gesamtMax * m).toLocaleString('de-DE')}{' '}
                  €
                </p>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-primary"
                  onClick={() => updateRow(row.key, { internOpen: !row.internOpen })}
                >
                  {row.internOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                  Intern (Einkauf / Marge)
                </button>
                {row.internOpen ? (
                  <div className="rounded-lg border border-dashed border-border bg-canvas/40 p-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Einkaufspreis Min (€ / Einheit)"
                        type="number"
                        min={0}
                        value={row.einkaufspreis_min === '' ? '' : String(row.einkaufspreis_min)}
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(row.key, {
                            einkaufspreis_min: v === '' ? '' : Number(v),
                          })
                        }}
                      />
                      <Input
                        label="Einkaufspreis Max (€ / Einheit)"
                        type="number"
                        min={0}
                        value={row.einkaufspreis_max === '' ? '' : String(row.einkaufspreis_max)}
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(row.key, {
                            einkaufspreis_max: v === '' ? '' : Number(v),
                          })
                        }}
                      />
                    </div>
                    {margeMin != null || margeMax != null ? (
                      <p className="text-xs text-muted">
                        Marge (Schätzung):{' '}
                        {margeMin != null ? `${margeMin.toLocaleString('de-DE')} €` : '—'} –{' '}
                        {margeMax != null ? `${margeMax.toLocaleString('de-DE')} €` : '—'} (netto Zeile)
                      </p>
                    ) : null}
                    <Textarea
                      label="Notiz intern"
                      value={row.notiz_intern}
                      onChange={(e) => updateRow(row.key, { notiz_intern: e.target.value })}
                      rows={2}
                    />
                  </div>
                ) : null}
                <Textarea
                  label="Notiz für Kunden"
                  value={row.notiz_extern}
                  onChange={(e) => updateRow(row.key, { notiz_extern: e.target.value })}
                  rows={2}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-danger hover:bg-danger/10"
                    aria-label="Position löschen"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <Button type="button" variant="secondary" onClick={addRow}>
          <Plus className="mr-2 inline h-4 w-4" aria-hidden />
          Position hinzufügen
        </Button>

        <div className="mt-6 space-y-1 rounded-lg bg-canvas p-4 text-sm">
          <p className="font-semibold text-ink">Gesamt-Übersicht (Angebot)</p>
          <p>
            Lohn gesamt: {formatPreis(summen.lohnZeileMin, summen.lohnZeileMax)}
          </p>
          <p>
            Material gesamt: {formatPreis(summen.materialZeileMin, summen.materialZeileMax)}
          </p>
          <p className="border-t border-border pt-2 mt-2">
            Netto gesamt: {formatPreis(summen.nettoMin, summen.nettoMax)}
          </p>
          <p>
            MwSt {summen.mwstSatz}%: {formatPreis(summen.mwstBetragMin, summen.mwstBetragMax)}
          </p>
          <p className="font-semibold text-ink">
            Brutto gesamt: {formatPreis(summen.bruttoMin, summen.bruttoMax)}
          </p>
          <div className="mt-3 border-t border-border pt-2 text-xs text-muted">
            <p className="font-medium text-ink text-sm mb-1">Intern</p>
            <p>
              Einkauf gesamt: {formatPreis(summen.einkaufZeileMin, summen.einkaufZeileMax)}
            </p>
            <p>
              Marge: {formatPreis(summen.margeMin, summen.margeMax)}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Handwerker zuweisen</h2>
        <p className="text-sm text-muted">
          Pro Zeile ein Handwerker — gleiches Gewerk mehrfach möglich. Notiz: wer was macht.
        </p>
        {gewerkeInAngebot.length === 0 ? (
          <p className="text-sm text-muted">Zuerst Gewerke in den Positionen wählen.</p>
        ) : null}
        <div className="space-y-4">
          {hwRows.map((h) => (
            <div key={h.key} className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">Gewerk</span>
                  <select
                    value={h.gewerk_id}
                    onChange={(e) =>
                      setHwRows((prev) =>
                        prev.map((x) =>
                          x.key === h.key ? { ...x, gewerk_id: e.target.value } : x
                        )
                      )
                    }
                    className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base"
                  >
                    <option value="">— Gewerk —</option>
                    {gewerkeInAngebot.map((gid) => {
                      const g = gewerke.find((x) => x.id === gid)
                      return (
                        <option key={gid} value={gid}>
                          {g?.name ?? gid}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">Handwerker</span>
                  <select
                    value={h.handwerker_id}
                    onChange={(e) =>
                      setHwRows((prev) =>
                        prev.map((x) =>
                          x.key === h.key ? { ...x, handwerker_id: e.target.value } : x
                        )
                      )
                    }
                    disabled={!h.gewerk_id}
                    className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base disabled:opacity-50"
                  >
                    <option value="">— Auswahl —</option>
                    {handwerkerOptions(h.gewerk_id).map((hw) => (
                      <option key={hw.id} value={hw.id}>
                        {hw.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-ink">Status</span>
                  <select
                    value={h.status}
                    onChange={(e) =>
                      setHwRows((prev) =>
                        prev.map((x) =>
                          x.key === h.key
                            ? {
                                ...x,
                                status: e.target
                                  .value as AngebotHandwerkerZuweisungStatus,
                              }
                            : x
                        )
                      )
                    }
                    className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base"
                  >
                    {HW_STATUS_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Input
                label="Notiz (z. B. wer übernimmt welchen Teil)"
                value={h.aufgabe_notiz}
                onChange={(e) =>
                  setHwRows((prev) =>
                    prev.map((x) =>
                      x.key === h.key ? { ...x, aufgabe_notiz: e.target.value } : x
                    )
                  )
                }
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() => removeHwRow(h.key)}
                >
                  Zeile entfernen
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addHwRow}>
          <Plus className="mr-1 inline h-4 w-4" aria-hidden />
          Handwerker-Zeile
        </Button>
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
