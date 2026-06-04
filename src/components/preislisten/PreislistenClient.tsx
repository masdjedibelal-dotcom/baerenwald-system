'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Pencil} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { preislisteEinzelpreis } from '@/lib/preisliste-preis'
import { cn } from '@/lib/utils'
import type { Gewerk, Preisliste } from '@/lib/types'
import { createPreisliste, softDeletePreisliste, updatePreisliste } from '@/app/(dashboard)/preislisten/actions'
import { sortPreislistenRows } from '@/lib/preislisten-sort'
import {
  EINHEIT_CUSTOM,
  EINHEIT_VORSCHLAEGE,
  einheitSelectOptions,
  resolveEinheitwahl,
  splitEinheitStored,
} from '@/lib/preislisten-einheiten'
import { PreislistenCsvImportModal } from '@/components/preislisten/PreislistenCsvImportModal'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import type { PreislistenImportResponse } from '@/lib/preislisten-import'

const NEUE_KAT = '__neu__'

function isPresetEinheit(e: string): boolean {
  return (EINHEIT_VORSCHLAEGE as readonly string[]).includes(e)
}

/** DB-Feld `kategorie` = Oberkategorie im UI */
function oberkategorieLabel(l: Preisliste): string {
  return (l.kategorie ?? '').trim() || 'Sonstiges'
}

function groupByOberkategorie(leistungen: Preisliste[]): Record<string, Preisliste[]> {
  return leistungen.reduce<Record<string, Preisliste[]>>((acc, l) => {
    const kat = oberkategorieLabel(l)
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(l)
    return acc
  }, {})
}

function LeistungsZeile({
  leistung,
  onEdit,
  onToggle,
  onDelete,
}: {
  leistung: Preisliste
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const preis = preislisteEinzelpreis(leistung)
  return (
    <div
      className={cn(
        '-mx-1 flex items-center justify-between rounded-md border-b border-bw-border px-2 py-2.5 transition-colors last:border-0 hover:bg-bw-hover'
      )}
    >
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-sm font-medium',
            leistung.aktiv ? 'text-bw-text' : 'text-bw-text-muted line-through'
          )}
        >
          {leistung.leistung}
        </div>
        <div className="mt-0.5 text-xs text-bw-text-muted">
          {leistung.einheit} · {preis.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
      </div>
      <div className="ml-2 flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit()}
          className="rounded-md p-1.5 text-bw-text-muted transition-colors hover:bg-bw-hover hover:text-bw-text"
          aria-label="Bearbeiten"
        ><Pencil className="h-4 w-4" aria-hidden /></button>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Toggle checked={leistung.aktiv} onChange={() => onToggle()} />
        </div>
        <button
          type="button"
          onClick={() => onDelete()}
          className="rounded-md p-1.5 text-bw-text-muted transition-colors hover:text-status-cancel-text"
          aria-label="Entfernen"
        >
          ×
        </button>
      </div>
    </div>
  )
}

type LeistungForm = {
  gewerk_id: string
  leistung: string
  einheit: string
  aktiv: boolean
}

function emptyForm(gewerkId: string): LeistungForm {
  return {
    gewerk_id: gewerkId,
    leistung: '',
    einheit: 'pauschal',
    aktiv: true,
  }
}

export function PreislistenClient({
  initialRows,
  gewerkeAlle,
}: {
  initialRows: Preisliste[]
  gewerkeAlle: Gewerk[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Preisliste[]>(() => sortPreislistenRows(initialRows))
  const gewAll = gewerkeAlle

  useEffect(() => {
    setRows(sortPreislistenRows(initialRows))
  }, [initialRows])

  const gewerkeTabs = useMemo(
    () => [...gewAll].filter((g) => g.aktiv).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [gewAll]
  )

  const [tabGewerkId, setTabGewerkId] = useState<string | null>(null)
  const activeGewerkId = tabGewerkId ?? gewerkeTabs[0]?.id ?? null

  const filtered = useMemo(() => {
    if (!activeGewerkId) return []
    return rows.filter((r) => r.gewerk_id === activeGewerkId)
  }, [rows, activeGewerkId])

  const groupedEntries = useMemo(() => {
    const grouped = groupByOberkategorie(filtered)
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'de'))
  }, [filtered])

  const gewerkLeistungCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of rows) {
      if (r.aktiv) c[r.gewerk_id] = (c[r.gewerk_id] ?? 0) + 1
    }
    return c
  }, [rows])

  const [editLeistung, setEditLeistung] = useState<Preisliste | null>(null)
  const [neuOpen, setNeuOpen] = useState(false)
  const modalOpen = neuOpen || !!editLeistung

  const [form, setForm] = useState<LeistungForm>(() => emptyForm(''))
  const [oberkatSelect, setOberkatSelect] = useState('')
  const [neueKategorie, setNeueKategorie] = useState('')
  const [preis, setPreis] = useState(0)

  const [csvOpen, setCsvOpen] = useState(false)
  const [importBanner, setImportBanner] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const kategorienFuerGewerk = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (r.gewerk_id === form.gewerk_id) {
        const c = (r.kategorie ?? '').trim()
        if (c) s.add(c)
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'))
  }, [rows, form.gewerk_id])

  const oberkategorieOptions = useMemo(
    () => [
      { value: '', label: 'Bitte wählen…' },
      ...kategorienFuerGewerk.map((k) => ({ value: k, label: k })),
      { value: NEUE_KAT, label: '+ Neue Kategorie…' },
    ],
    [kategorienFuerGewerk]
  )

  const einheitSelectValue = isPresetEinheit(form.einheit) ? form.einheit : EINHEIT_CUSTOM
  const showCustomEinheit = einheitSelectValue === EINHEIT_CUSTOM
  const showNeueKat = oberkatSelect === NEUE_KAT

  const aktuellesGewerk = gewAll.find((g) => g.id === form.gewerk_id)

  function closeModal() {
    setEditLeistung(null)
    setNeuOpen(false)
    setErr(null)
  }

  function openNeuModal() {
    const gid = activeGewerkId ?? gewerkeTabs[0]?.id ?? ''
    setEditLeistung(null)
    setNeuOpen(true)
    setForm(emptyForm(gid))
    setOberkatSelect('')
    setNeueKategorie('')
    setPreis(0)
    setErr(null)
  }

  function openEditLeistung(row: Preisliste) {
    const sp = splitEinheitStored(row.einheit)
    const cats = new Set<string>()
    for (const r of rows) {
      if (r.gewerk_id === row.gewerk_id) {
        const c = (r.kategorie ?? '').trim()
        if (c) cats.add(c)
      }
    }
    const kat = (row.kategorie ?? '').trim()
    if (kat && cats.has(kat)) {
      setOberkatSelect(kat)
      setNeueKategorie('')
    } else if (kat) {
      setOberkatSelect(NEUE_KAT)
      setNeueKategorie(kat)
    } else {
      setOberkatSelect('')
      setNeueKategorie('')
    }

    setForm({
      gewerk_id: row.gewerk_id,
      leistung: row.leistung,
      einheit: sp.wahl === EINHEIT_CUSTOM ? sp.freitext : sp.wahl,
      aktiv: row.aktiv,
    })
    setPreis(preislisteEinzelpreis(row))
    setEditLeistung(row)
    setNeuOpen(false)
    setErr(null)
  }

  function resolveOberkategorie(): string {
    if (oberkatSelect === NEUE_KAT) return neueKategorie.trim()
    return oberkatSelect.trim()
  }

  function handleSave() {
    if (!form.gewerk_id || !form.leistung.trim()) {
      setErr('Gewerk und Leistungsname sind Pflicht.')
      return
    }
    const kat = resolveOberkategorie()
    if (!oberkatSelect || (oberkatSelect === NEUE_KAT && !kat)) {
      setErr('Bitte eine Oberkategorie wählen oder neu eingeben.')
      return
    }
    const einheit = resolveEinheitwahl(
      showCustomEinheit ? EINHEIT_CUSTOM : form.einheit,
      showCustomEinheit ? form.einheit : ''
    )
    if (!einheit) {
      setErr('Bitte eine Einheit angeben.')
      return
    }
    const preisMin = preis
    if (Number.isNaN(preisMin) || preisMin < 0) {
      setErr('Preis als Zahl angeben.')
      return
    }

    const editId = editLeistung?.id ?? null

    startTransition(async () => {
      if (editId) {
        const res = await updatePreisliste(editId, {
          gewerk_id: form.gewerk_id,
          kategorie: kat,
          leistung: form.leistung.trim(),
          einheit,
          preis_min: preisMin,
          aktiv: form.aktiv,
        })
        if (!res.ok) {
          setErr(res.message)
          return
        }
        const g = gewAll.find((x) => x.id === form.gewerk_id)
        setRows((prev) =>
          sortPreislistenRows(
            prev.map((r) =>
              r.id === editId
                ? {
                    ...r,
                    gewerk_id: form.gewerk_id,
                    kategorie: kat,
                    leistung: form.leistung.trim(),
                    einheit,
                    preis_min: preisMin,
                    aktiv: form.aktiv,
                    gewerke: g ?? r.gewerke,
                  }
                : r
            )
          )
        )
      } else {
        const res = await createPreisliste({
          gewerk_id: form.gewerk_id,
          kategorie: kat,
          leistung: form.leistung.trim(),
          einheit,
          preis_min: preisMin,
          aktiv: form.aktiv,
        })
        if (!res.ok) {
          setErr(res.message)
          return
        }
        const g = gewAll.find((x) => x.id === form.gewerk_id)
        setRows((prev) =>
          sortPreislistenRows([
            ...prev,
            {
              id: res.id,
              gewerk_id: form.gewerk_id,
              kategorie: kat,
              leistung: form.leistung.trim(),
              einheit,
              preis_min: preisMin,
              aktiv: form.aktiv,
              gewerke: g,
            },
          ])
        )
      }
      closeModal()
      setOberkatSelect('')
      setNeueKategorie('')
      setPreis(0)
      setErr(null)
      router.refresh()
    })
  }

  function onSoftDelete(row: Preisliste) {
    if (!confirm('Leistung deaktivieren? Sie verschwindet aus der aktiven Liste.')) return
    startTransition(async () => {
      const res = await softDeletePreisliste(row.id)
      if (!res.ok) {
        setErr(res.message)
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      router.refresh()
    })
  }

  function quickToggleAktiv(row: Preisliste) {
    startTransition(async () => {
      const res = await updatePreisliste(row.id, { aktiv: !row.aktiv })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, aktiv: !row.aktiv } : r)))
      router.refresh()
    })
  }

  function onImportDone(r: PreislistenImportResponse) {
    const fehlerN = r.fehler.length
    setImportBanner(
      `${r.importiert} Leistungen importiert` +
        (r.uebersprungen ? `, ${r.uebersprungen} Duplikate übersprungen` : '') +
        (fehlerN ? `, ${fehlerN} Zeilen mit Fehler` : '')
    )
    router.refresh()
  }

  const gewerkSelectOptions = useMemo(() => {
    const list = gewAll
      .filter((x) => x.aktiv || x.id === form.gewerk_id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    return [{ value: '', label: 'Bitte wählen…' }, ...list.map((x) => ({ value: x.id, label: x.name }))]
  }, [gewAll, form.gewerk_id])

  return (
    <div>
      <PageHeader
        action={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setCsvOpen(true)}>
              <Upload className="mr-1 inline h-4 w-4" aria-hidden />
              CSV Import
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={openNeuModal}>
              + Neue Leistung
            </Button>
          </>
        }
      />

      {importBanner ? (
        <p className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-ink">
          {importBanner}
        </p>
      ) : null}

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-bw-text">Gewerke verwalten</div>
            <div className="mt-0.5 text-xs text-bw-text-muted">Gewerke anlegen, bearbeiten und deaktivieren</div>
          </div>
          <Link href="/einstellungen/preise" className="btn btn-secondary btn-sm shrink-0">
            Einstellungen
          </Link>
        </div>
      </Card>

      <h2 className="section-header mb-4">Leistungen</h2>

      {gewerkeTabs.length === 0 ? (
        <p className="text-sm text-bw-text-muted">
          Kein aktives Gewerk. Legen Sie Gewerke unter{' '}
          <Link href="/einstellungen/preise" className="font-medium text-bw-link underline-offset-2 hover:underline">
            Einstellungen · Preislisten
          </Link>{' '}
          an und markieren Sie sie als aktiv.
        </p>
      ) : (
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gewerkeTabs.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setTabGewerkId(g.id)}
              className={cn('chip shrink-0', activeGewerkId === g.id && 'chip-active')}
            >
              {g.name}
              {(gewerkLeistungCounts[g.id] ?? 0) > 0 ? (
                <span className="chip-count">{gewerkLeistungCounts[g.id]}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {!activeGewerkId ? null : groupedEntries.length === 0 ? (
        <p className="text-sm text-bw-text-muted">Keine aktiven Leistungen für dieses Gewerk.</p>
      ) : (
        <div className="space-y-3">
          {groupedEntries.map(([kat, items], idx) => (
            <Accordion key={kat} title={`${kat} (${items.length})`} defaultOpen={idx === 0}>
              <div className="px-1 pb-1 pt-0">
                {items.map((l) => (
                  <LeistungsZeile
                    key={l.id}
                    leistung={l}
                    onEdit={() => openEditLeistung(l)}
                    onToggle={() => quickToggleAktiv(l)}
                    onDelete={() => onSoftDelete(l)}
                  />
                ))}
              </div>
            </Accordion>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editLeistung ? 'Leistung bearbeiten' : 'Neue Leistung'}
        size="md"
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Abbrechen
            </button>
            <button type="button" onClick={handleSave} disabled={pending} className="btn btn-primary">
              Speichern
            </button>
          </div>
        }
      >
        {editLeistung ? (
          <div className="mb-4 border-b border-bw-border pb-3 text-xs text-bw-text-muted">
            {aktuellesGewerk?.name}
            {(editLeistung.kategorie ?? '').trim()
              ? ` · ${(editLeistung.kategorie ?? '').trim()}`
              : ''}
            {` · ${editLeistung.leistung}`}
          </div>
        ) : null}

        <div className="space-y-4">
          <Select
            label="Gewerk *"
            name="gewerk"
            value={form.gewerk_id}
            onChange={(e) => {
              const v = e.target.value
              setForm((f) => ({ ...f, gewerk_id: v }))
              setOberkatSelect('')
              setNeueKategorie('')
            }}
            options={gewerkSelectOptions}
          />

          <div>
            <Select
              label="Oberkategorie *"
              name="oberkategorie"
              value={oberkatSelect}
              onChange={(e) => {
                const v = e.target.value
                if (v === NEUE_KAT) {
                  setOberkatSelect(NEUE_KAT)
                  setNeueKategorie('')
                } else {
                  setOberkatSelect(v)
                  setNeueKategorie('')
                }
              }}
              options={oberkategorieOptions}
            />
            {showNeueKat ? (
              <Input
                className="mt-2"
                label="Neue Kategorie"
                placeholder="Kategorie Name"
                value={neueKategorie}
                onChange={(e) => setNeueKategorie(e.target.value)}
              />
            ) : null}
          </div>

          <Input
            label="Leistungsname *"
            value={form.leistung}
            onChange={(e) => setForm((f) => ({ ...f, leistung: e.target.value }))}
            required
          />

          <div>
            <label className="input-label" htmlFor="preis-netto">
              Preis (netto) *
            </label>
            <EuroNettoInput id="preis-netto" value={preis} onChange={setPreis} />
          </div>

          <div>
            <Select
              label="Einheit"
              name="einheit"
              value={einheitSelectValue}
              onChange={(e) => {
                const v = e.target.value
                if (v === EINHEIT_CUSTOM) {
                  setForm((f) => ({ ...f, einheit: '' }))
                } else {
                  setForm((f) => ({ ...f, einheit: v }))
                }
              }}
              options={einheitSelectOptions()}
            />
            {showCustomEinheit ? (
              <Input
                className="mt-2"
                placeholder="z. B. pro Baum"
                value={form.einheit}
                onChange={(e) => setForm((f) => ({ ...f, einheit: e.target.value }))}
              />
            ) : null}
          </div>

          <Toggle label="Aktiv" checked={form.aktiv} onChange={(v) => setForm((f) => ({ ...f, aktiv: v }))} />
        </div>
      </Modal>

      <PreislistenCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onDone={onImportDone} />
    </div>
  )
}
