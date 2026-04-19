'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, Trash2, Upload, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn, formatPreis } from '@/lib/utils'
import type { Gewerk, Preisliste } from '@/lib/types'
import {
  createGewerk,
  createPreisliste,
  setGewerkAktiv,
  softDeletePreisliste,
  updateGewerk,
  updatePreisliste,
} from '@/app/(dashboard)/preislisten/actions'
import { sortPreislistenRows } from '@/lib/preislisten-sort'
import { EINHEIT_SONSTIGES, EINHEIT_VORSCHLAEGE, resolveEinheitwahl } from '@/lib/preislisten-einheiten'
import { PreislistenCsvImportModal } from '@/components/preislisten/PreislistenCsvImportModal'
import type { PreislistenImportResponse } from '@/lib/preislisten-import'

const NEUE_KATEGORIE = '__neu__'

function kategorieLabel(r: Preisliste): string {
  return (r.kategorie ?? '').trim() || 'Ohne Kategorie'
}

function groupByKategorie(rows: Preisliste[]): [string, Preisliste[]][] {
  const m = new Map<string, Preisliste[]>()
  for (const r of rows) {
    const k = kategorieLabel(r)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(r)
  }
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b, 'de'))
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
  const [gewAll, setGewAll] = useState(gewerkeAlle)

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

  const grouped = useMemo(() => groupByKategorie(filtered), [filtered])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{
    kategorie: string
    leistung: string
    einheit: string
    preis_min: string
    preis_max: string
    aktiv: boolean
  } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [importBanner, setImportBanner] = useState<string | null>(null)

  const [modalGewerk, setModalGewerk] = useState('')
  const [modalKategorieModus, setModalKategorieModus] = useState<string>('')
  const [modalKategorieNeu, setModalKategorieNeu] = useState('')
  const [modalLeistung, setModalLeistung] = useState('')
  const [modalEinheitWahl, setModalEinheitWahl] = useState('pauschal')
  const [modalEinheitFrei, setModalEinheitFrei] = useState('')
  const [modalMin, setModalMin] = useState('')
  const [modalMax, setModalMax] = useState('')
  const [modalAktiv, setModalAktiv] = useState(true)

  const [newGewerkName, setNewGewerkName] = useState('')
  const [gewerkEditId, setGewerkEditId] = useState<string | null>(null)
  const [gewerkDraftName, setGewerkDraftName] = useState('')

  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const kategorienFuerModal = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (r.gewerk_id === modalGewerk) {
        const c = (r.kategorie ?? '').trim()
        if (c) s.add(c)
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'))
  }, [rows, modalGewerk])

  const kategorieSelectOptions = useMemo(
    () => [
      { value: '', label: '— Kategorie wählen —' },
      ...kategorienFuerModal.map((k) => ({ value: k, label: k })),
      { value: NEUE_KATEGORIE, label: 'Neue Kategorie …' },
    ],
    [kategorienFuerModal]
  )

  useEffect(() => {
    if (!editingId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingId])

  function beginEdit(row: Preisliste) {
    setEditingId(row.id)
    setDraft({
      kategorie: (row.kategorie ?? '').trim(),
      leistung: row.leistung,
      einheit: row.einheit,
      preis_min: String(row.preis_min),
      preis_max: String(row.preis_max),
      aktiv: row.aktiv,
    })
    setErr(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
    setErr(null)
  }

  function saveEdit() {
    if (!editingId || !draft) return
    const min = Number(draft.preis_min.replace(',', '.'))
    const max = Number(draft.preis_max.replace(',', '.'))
    if (!draft.leistung.trim() || !draft.einheit.trim() || Number.isNaN(min) || Number.isNaN(max)) {
      setErr('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    startTransition(async () => {
      const res = await updatePreisliste(editingId, {
        kategorie: draft.kategorie.trim(),
        leistung: draft.leistung.trim(),
        einheit: draft.einheit.trim(),
        preis_min: min,
        preis_max: max,
        aktiv: draft.aktiv,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      setRows((prev) =>
        sortPreislistenRows(
          prev.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  kategorie: draft.kategorie.trim(),
                  leistung: draft.leistung.trim(),
                  einheit: draft.einheit.trim(),
                  preis_min: min,
                  preis_max: max,
                  aktiv: draft.aktiv,
                }
              : r
          )
        )
      )
      cancelEdit()
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

  function openNeuModal() {
    setModalGewerk(activeGewerkId ?? gewerkeTabs[0]?.id ?? '')
    setModalKategorieModus('')
    setModalKategorieNeu('')
    setModalLeistung('')
    setModalEinheitWahl('pauschal')
    setModalEinheitFrei('')
    setModalMin('')
    setModalMax('')
    setModalAktiv(true)
    setErr(null)
    setModalOpen(true)
  }

  function resolveModalKategorie(): string {
    if (modalKategorieModus === NEUE_KATEGORIE) return modalKategorieNeu.trim()
    return modalKategorieModus.trim()
  }

  function saveNeu() {
    if (!modalGewerk || !modalLeistung.trim()) {
      setErr('Gewerk und Leistung sind Pflicht.')
      return
    }
    const kat = resolveModalKategorie()
    if (!modalKategorieModus || (modalKategorieModus === NEUE_KATEGORIE && !kat)) {
      setErr('Bitte eine Kategorie wählen oder neu eingeben.')
      return
    }
    const einheit = resolveEinheitwahl(modalEinheitWahl, modalEinheitFrei)
    if (!einheit) {
      setErr('Bitte eine Einheit angeben.')
      return
    }
    const min = Number(modalMin.replace(',', '.'))
    const max = Number(modalMax.replace(',', '.'))
    if (Number.isNaN(min) || Number.isNaN(max)) {
      setErr('Preis Min und Max als Zahl angeben.')
      return
    }
    startTransition(async () => {
      const res = await createPreisliste({
        gewerk_id: modalGewerk,
        kategorie: kat,
        leistung: modalLeistung,
        einheit,
        preis_min: min,
        preis_max: max,
        aktiv: modalAktiv,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      const g = gewAll.find((x) => x.id === modalGewerk)
      setRows((prev) =>
        sortPreislistenRows([
          ...prev,
          {
            id: res.id,
            gewerk_id: modalGewerk,
            kategorie: kat,
            leistung: modalLeistung.trim(),
            einheit,
            preis_min: min,
            preis_max: max,
            aktiv: modalAktiv,
            gewerke: g,
          },
        ])
      )
      setModalOpen(false)
      setModalLeistung('')
      setModalKategorieModus('')
      setModalKategorieNeu('')
      setModalMin('')
      setModalMax('')
      setModalAktiv(true)
      setErr(null)
      router.refresh()
    })
  }

  function addGewerk() {
    if (!newGewerkName.trim()) return
    startTransition(async () => {
      const res = await createGewerk(newGewerkName)
      if (!res.ok) {
        setErr(res.message)
        return
      }
      setGewAll((prev) => [
        ...prev,
        { id: res.id, name: res.name, slug: res.slug, aktiv: true },
      ])
      setNewGewerkName('')
      setErr(null)
      router.refresh()
    })
  }

  async function toggleGewerk(g: Gewerk) {
    const res = await setGewerkAktiv(g.id, !g.aktiv)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    setGewAll((prev) => prev.map((x) => (x.id === g.id ? { ...x, aktiv: !g.aktiv } : x)))
    router.refresh()
  }

  function startGewerkEdit(g: Gewerk) {
    setGewerkEditId(g.id)
    setGewerkDraftName(g.name)
  }

  function saveGewerkEdit() {
    if (!gewerkEditId) return
    const name = gewerkDraftName.trim()
    if (!name) return
    startTransition(async () => {
      const res = await updateGewerk(gewerkEditId, { name })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      setGewAll((prev) => prev.map((x) => (x.id === gewerkEditId ? { ...x, name } : x)))
      setRows((prev) =>
        prev.map((r) =>
          r.gewerk_id === gewerkEditId && r.gewerke
            ? { ...r, gewerke: { ...r.gewerke, name } }
            : r
        )
      )
      setGewerkEditId(null)
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

  function renderRowEditor(row: Preisliste, isMobile: boolean) {
    if (!draft || editingId !== row.id) return null
    const fieldClass =
      'w-full min-h-[40px] rounded border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary'
    const onKey = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isMobile) {
        e.preventDefault()
        saveEdit()
      }
    }
    return (
      <div className={cn('space-y-2', isMobile ? 'mt-3 border-t border-border pt-3' : '')} onClick={(e) => e.stopPropagation()}>
        <input
          className={fieldClass}
          placeholder="Kategorie"
          value={draft.kategorie}
          onChange={(e) => setDraft({ ...draft, kategorie: e.target.value })}
          onKeyDown={onKey}
        />
        <input
          className={fieldClass}
          placeholder="Leistung"
          value={draft.leistung}
          onChange={(e) => setDraft({ ...draft, leistung: e.target.value })}
          onKeyDown={onKey}
        />
        <input
          className={fieldClass}
          placeholder="Einheit"
          value={draft.einheit}
          onChange={(e) => setDraft({ ...draft, einheit: e.target.value })}
          onKeyDown={onKey}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className={fieldClass}
            value={draft.preis_min}
            onChange={(e) => setDraft({ ...draft, preis_min: e.target.value })}
            onKeyDown={onKey}
          />
          <input
            type="number"
            className={fieldClass}
            value={draft.preis_max}
            onChange={(e) => setDraft({ ...draft, preis_max: e.target.value })}
            onKeyDown={onKey}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.aktiv}
            onChange={(e) => setDraft({ ...draft, aktiv: e.target.checked })}
          />
          Aktiv
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="primary" onClick={saveEdit} disabled={pending}>
            <Check className="mr-1 inline h-4 w-4" aria-hidden />
            Speichern
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
            Abbrechen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Preislisten"
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

      <section className="mb-6" aria-label="Gewerke verwalten">
        <Accordion title="Gewerke verwalten" defaultOpen={false}>
          <div className="space-y-4 p-1">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                label="Neues Gewerk"
                value={newGewerkName}
                onChange={(e) => setNewGewerkName(e.target.value)}
                placeholder="Name"
              />
              <Button type="button" className="sm:self-end" onClick={addGewerk} disabled={pending}>
                Anlegen
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {gewAll
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                .map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    {gewerkEditId === g.id ? (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <input
                          className="min-h-[44px] min-w-[200px] flex-1 rounded-lg border border-border px-3 text-ink"
                          value={gewerkDraftName}
                          onChange={(e) => setGewerkDraftName(e.target.value)}
                        />
                        <Button type="button" size="sm" variant="primary" onClick={saveGewerkEdit} disabled={pending}>
                          Speichern
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setGewerkEditId(null)}>
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-ink">{g.name}</span>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-muted">
                            <span>Aktiv</span>
                            <input
                              type="checkbox"
                              checked={g.aktiv}
                              onChange={() => void toggleGewerk(g)}
                              aria-label={`${g.name} aktiv`}
                            />
                          </label>
                          <button
                            type="button"
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border hover:bg-canvas"
                            onClick={() => startGewerkEdit(g)}
                            aria-label="Gewerk bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        </Accordion>
      </section>

      <h2 className="section-header mb-4">Leistungen</h2>

      {gewerkeTabs.length === 0 ? (
        <p className="text-sm text-muted">Legen Sie zuerst ein aktives Gewerk an (unten).</p>
      ) : (
        <div className="mb-6 -mx-1 flex gap-0 overflow-x-auto border-b border-border px-1 pb-0 [scrollbar-width:thin]">
          {gewerkeTabs.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setTabGewerkId(g.id)}
              className={cn(
                'shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeGewerkId === g.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-ink'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {!activeGewerkId ? null : grouped.length === 0 ? (
        <p className="text-sm text-muted">Keine aktiven Leistungen für dieses Gewerk.</p>
      ) : (
        <>
          {/* Mobil: Karten nach Kategorie */}
          <div className="space-y-8 md:hidden">
            {grouped.map(([kat, list]) => (
              <section key={kat}>
                <h3 className="mb-3 border-b border-border pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {kat}
                </h3>
                <div className="space-y-3">
                  {list.map((row) => {
                    const editing = editingId === row.id
                    return (
                      <Card key={row.id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-ink">{row.leistung}</p>
                            <p className="text-xs text-muted">{row.einheit}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={cn(
                                'h-2.5 w-2.5 rounded-full',
                                row.aktiv ? 'bg-emerald-500' : 'bg-muted'
                              )}
                              title={row.aktiv ? 'Aktiv' : 'Inaktiv'}
                              aria-hidden
                            />
                            <button
                              type="button"
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-ink hover:bg-canvas"
                              onClick={() => (editing ? cancelEdit() : beginEdit(row))}
                              aria-label={editing ? 'Abbrechen' : 'Bearbeiten'}
                            >
                              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm font-medium text-ink">{formatPreis(row.preis_min, row.preis_max)}</p>
                        {renderRowEditor(row, true)}
                        {!editing ? (
                          <div className="mt-3 flex gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => onSoftDelete(row)}>
                              Deaktivieren
                            </Button>
                          </div>
                        ) : null}
                      </Card>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Desktop: Tabellen pro Kategorie */}
          <div className="hidden space-y-8 md:block">
            {grouped.map(([kat, list]) => (
              <section key={kat}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{kat}</h3>
                <Card className="overflow-x-auto p-0">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-canvas text-muted">
                        <th className="px-3 py-2 font-medium">Leistung</th>
                        <th className="px-3 py-2 font-medium">Einheit</th>
                        <th className="px-3 py-2 font-medium">Min €</th>
                        <th className="px-3 py-2 font-medium">Max €</th>
                        <th className="px-3 py-2 font-medium">Aktiv</th>
                        <th className="px-3 py-2 font-medium">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => {
                        const isEdit = editingId === row.id
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              'border-b border-border last:border-0',
                              !isEdit && 'cursor-pointer hover:bg-canvas/80'
                            )}
                            onClick={() => {
                              if (!isEdit) beginEdit(row)
                            }}
                          >
                            {isEdit && draft ? (
                              <>
                                <td className="px-3 py-2 align-top">
                                  <input
                                    className="w-full min-h-[40px] rounded border border-border px-2"
                                    value={draft.kategorie}
                                    onChange={(e) => setDraft({ ...draft, kategorie: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        saveEdit()
                                      }
                                      if (e.key === 'Escape') cancelEdit()
                                    }}
                                    placeholder="Kategorie"
                                  />
                                  <input
                                    className="mt-1 w-full min-h-[40px] rounded border border-border px-2"
                                    value={draft.leistung}
                                    onChange={(e) => setDraft({ ...draft, leistung: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        saveEdit()
                                      }
                                      if (e.key === 'Escape') cancelEdit()
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <input
                                    className="w-full min-h-[40px] rounded border border-border px-2"
                                    value={draft.einheit}
                                    onChange={(e) => setDraft({ ...draft, einheit: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        saveEdit()
                                      }
                                      if (e.key === 'Escape') cancelEdit()
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <input
                                    type="number"
                                    className="w-full min-h-[40px] rounded border border-border px-2"
                                    value={draft.preis_min}
                                    onChange={(e) => setDraft({ ...draft, preis_min: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        saveEdit()
                                      }
                                      if (e.key === 'Escape') cancelEdit()
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <input
                                    type="number"
                                    className="w-full min-h-[40px] rounded border border-border px-2"
                                    value={draft.preis_max}
                                    onChange={(e) => setDraft({ ...draft, preis_max: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        saveEdit()
                                      }
                                      if (e.key === 'Escape') cancelEdit()
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={draft.aktiv}
                                    onChange={(e) => setDraft({ ...draft, aktiv: e.target.checked })}
                                    aria-label="Aktiv"
                                  />
                                </td>
                                <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border bg-primary text-white hover:opacity-95"
                                      onClick={saveEdit}
                                      disabled={pending}
                                      aria-label="Speichern"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border hover:bg-canvas"
                                      onClick={cancelEdit}
                                      aria-label="Abbrechen"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 font-medium text-ink">{row.leistung}</td>
                                <td className="px-3 py-2">{row.einheit}</td>
                                <td className="px-3 py-2">{row.preis_min}</td>
                                <td className="px-3 py-2">{row.preis_max}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={cn(
                                      'inline-block h-2 w-2 rounded-full',
                                      row.aktiv ? 'bg-emerald-500' : 'bg-muted'
                                    )}
                                    title={row.aktiv ? 'Aktiv' : 'Inaktiv'}
                                  />
                                </td>
                                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border hover:bg-canvas"
                                      onClick={() => beginEdit(row)}
                                      aria-label="Bearbeiten"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border text-danger hover:bg-canvas disabled:opacity-40"
                                      onClick={() => onSoftDelete(row)}
                                      disabled={!row.aktiv}
                                      aria-label="Deaktivieren"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </Card>
              </section>
            ))}
          </div>
        </>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-card">
            <p className="mb-3 text-xs text-muted">
              {gewAll.find((g) => g.id === modalGewerk)?.name ?? 'Gewerk'}
              {modalKategorieModus && modalKategorieModus !== NEUE_KATEGORIE
                ? ` → ${modalKategorieModus}`
                : modalKategorieModus === NEUE_KATEGORIE && modalKategorieNeu.trim()
                  ? ` → ${modalKategorieNeu.trim()}`
                  : ''}
              {modalLeistung.trim() ? ` → ${modalLeistung.trim()}` : ''}
            </p>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Neue Leistung</h2>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => setModalOpen(false)}
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <Select
                label="Gewerk"
                name="gewerk"
                value={modalGewerk}
                onChange={(e) => {
                  setModalGewerk(e.target.value)
                  setModalKategorieModus('')
                  setModalKategorieNeu('')
                }}
                options={[
                  { value: '', label: 'Bitte wählen' },
                  ...gewAll.filter((x) => x.aktiv).map((x) => ({ value: x.id, label: x.name })),
                ]}
              />
              <Select
                label="Kategorie"
                name="kategorie"
                value={modalKategorieModus}
                onChange={(e) => setModalKategorieModus(e.target.value)}
                options={kategorieSelectOptions}
              />
              {modalKategorieModus === NEUE_KATEGORIE ? (
                <Input
                  label="Neue Kategorie"
                  value={modalKategorieNeu}
                  onChange={(e) => setModalKategorieNeu(e.target.value)}
                  placeholder="z. B. Komplettsanierung"
                />
              ) : null}
              <Input label="Leistung" value={modalLeistung} onChange={(e) => setModalLeistung(e.target.value)} required />
              <Select
                label="Einheit"
                name="einheitwahl"
                value={modalEinheitWahl}
                onChange={(e) => setModalEinheitWahl(e.target.value)}
                options={EINHEIT_VORSCHLAEGE}
              />
              {modalEinheitWahl === EINHEIT_SONSTIGES ? (
                <Input
                  label="Einheit (Freitext)"
                  value={modalEinheitFrei}
                  onChange={(e) => setModalEinheitFrei(e.target.value)}
                />
              ) : null}
              <Input
                type="number"
                label="Preis Min (€)"
                value={modalMin}
                onChange={(e) => setModalMin(e.target.value)}
                required
              />
              <Input
                type="number"
                label="Preis Max (€)"
                value={modalMax}
                onChange={(e) => setModalMax(e.target.value)}
                required
              />
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={modalAktiv} onChange={(e) => setModalAktiv(e.target.checked)} />
                Aktiv
              </label>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="primary" className="flex-1" onClick={saveNeu} disabled={pending}>
                  Speichern
                </Button>
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PreislistenCsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onDone={onImportDone}
      />
    </div>
  )
}
