'use client'

import { useMemo, useState } from 'react'
import { Download, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/layout/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { FilterChips } from '@/components/ui/FilterChips'
import { ListCard } from '@/components/ui/ListCard'
import { SidePanel } from '@/components/ui/SidePanel'
import { useExport, type ExportField } from '@/hooks/useExport'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export type PartnerKategorie = {
  id: string
  name: string
  slug: string
  sort_order: number
}

export type PartnerRow = {
  id: string
  name: string
  partner_typ?: 'partner' | 'netzwerk'
  kategorie_id: string | null
  subkategorie: string | null
  ansprechpartner: string | null
  telefon: string | null
  email: string | null
  adresse: string | null
  website: string | null
  notizen: string | null
  aktiv: boolean
  created_at: string | null
  partner_kategorien: { name: string; slug: string; sort_order: number } | null
}

const PARTNER_EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kategorie', label: 'Kategorie' },
  { key: 'subkategorie', label: 'Subkategorie' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'adresse', label: 'Adresse' },
]

function partnerExportRow(p: PartnerRow): Record<string, unknown> {
  return {
    name: p.name,
    kategorie: p.partner_kategorien?.name ?? '',
    subkategorie: p.subkategorie ?? '',
    telefon: p.telefon ?? '',
    email: p.email ?? '',
    adresse: p.adresse ?? '',
  }
}

export function PartnerNetzwerkClient({
  partners: initial,
  kategorien,
}: {
  partners: PartnerRow[]
  kategorien: PartnerKategorie[]
}) {
  const { exportToCSV } = useExport()
  const [partners, setPartners] = useState(initial)
  const [tab, setTab] = useState<'partner' | 'netzwerk'>('partner')
  const [brancheFilter, setBrancheFilter] = useState('alle')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [q, setQ] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [selected, setSelected] = useState<PartnerRow | null>(null)
  const [bearbeitenOpen, setBearbeitenOpen] = useState(false)
  const [edit, setEdit] = useState<PartnerRow | null>(null)
  const [saving, setSaving] = useState(false)

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const imTab = useMemo(
    () => partners.filter((p) => (p.partner_typ ?? 'partner') === tab),
    [partners, tab]
  )

  const brancheCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of imTab) {
      if (!p.kategorie_id) continue
      m.set(p.kategorie_id, (m.get(p.kategorie_id) ?? 0) + 1)
    }
    return m
  }, [imTab])

  const kategorienMitNutzung = useMemo(() => {
    return [...kategorien].sort((a, b) => a.sort_order - b.sort_order)
  }, [kategorien])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return imTab.filter((p) => {
      if (brancheFilter !== 'alle' && p.kategorie_id !== brancheFilter) return false
      if (dateRange && !datumInZeitraum(p.created_at, dateRange)) return false
      if (!needle) return true
      const hay = [
        p.name,
        p.subkategorie ?? '',
        p.partner_kategorien?.name ?? '',
        p.telefon ?? '',
        p.email ?? '',
        p.adresse ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [imTab, brancheFilter, dateRange, q])

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (brancheFilter !== 'alle') {
      const label = kategorien.find((k) => k.id === brancheFilter)?.name ?? 'Branche'
      t.push({ id: 'br', label, onRemove: () => setBrancheFilter('alle') })
    }
    if (zeitraum !== 'alle') {
      t.push({
        id: 'z',
        label: zeitraumLabel(zeitraum),
        onRemove: () => {
          setZeitraum('alle')
          setCustomFrom('')
          setCustomTo('')
        },
      })
    }
    if (q.trim()) {
      t.push({ id: 'q', label: q.trim(), onRemove: () => setQ('') })
    }
    return t
  }, [brancheFilter, kategorien, zeitraum, q])

  const hasActiveFilters = !!(brancheFilter !== 'alle' || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setBrancheFilter('alle')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
    setQ('')
  }

  async function savePartner() {
    if (!edit) return
    setSaving(true)
    const supabase = createClient()
    const kat = kategorien.find((k) => k.id === edit.kategorie_id)
    const { error } = await supabase
      .from('partner')
      .update({
        name: edit.name,
        partner_typ: edit.partner_typ,
        kategorie_id: edit.kategorie_id,
        subkategorie: edit.subkategorie,
        ansprechpartner: edit.ansprechpartner,
        telefon: edit.telefon,
        email: edit.email,
        adresse: edit.adresse,
        website: edit.website,
        notizen: edit.notizen,
        updated_at: new Date().toISOString(),
      })
      .eq('id', edit.id)
    setSaving(false)
    if (error) return
    setPartners((prev) =>
      prev.map((p) =>
        p.id === edit.id
          ? {
              ...p,
              ...edit,
              partner_kategorien: kat
                ? { name: kat.name, slug: kat.slug, sort_order: kat.sort_order }
                : null,
            }
          : p
      )
    )
    setBearbeitenOpen(false)
    setEdit(null)
    setSelected((sel) =>
      sel?.id === edit.id
        ? {
            ...sel,
            ...edit,
            partner_kategorien: kat
              ? { name: kat.name, slug: kat.slug, sort_order: kat.sort_order }
              : null,
          }
        : sel
    )
  }

  function openBearbeiten(p: PartnerRow) {
    setEdit({ ...p, partner_typ: p.partner_typ ?? 'partner' })
    setBearbeitenOpen(true)
  }

  const chipOptions = useMemo(
    () => [
      { label: 'Alle', value: 'alle', count: imTab.length },
      ...kategorienMitNutzung.map((k) => ({
        label: k.name,
        value: k.id,
        count: brancheCounts.get(k.id) ?? 0,
      })),
    ],
    [imTab.length, kategorienMitNutzung, brancheCounts]
  )

  return (
    <div>
      <PageHeader
        title="Partner & Netzwerk"
        action={
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 text-sm font-medium text-bw-text shadow-sm transition-colors hover:bg-bw-hover"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export
          </button>
        }
      />

      <div className="mb-4 flex gap-2 border-b border-bw-border pb-3">
        <button
          type="button"
          onClick={() => {
            setTab('partner')
            setBrancheFilter('alle')
          }}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            tab === 'partner' ? 'bg-bw-primary text-white' : 'border border-bw-border bg-bw-card text-bw-text'
          )}
        >
          Partner
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('netzwerk')
            setBrancheFilter('alle')
          }}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            tab === 'netzwerk' ? 'bg-bw-primary text-white' : 'border border-bw-border bg-bw-card text-bw-text'
          )}
        >
          Netzwerk
        </button>
      </div>

      <div className="sticky top-14 z-10 border-b border-bw-border bg-bw-bg px-4 py-3">
        <FilterChips
          options={chipOptions}
          selected={[brancheFilter]}
          onChange={(vals) => setBrancheFilter(vals[0] || 'alle')}
        />
      </div>

      <ListFilterBar
        hideStatusFilter
        statusLabel="—"
        statusOptions={[{ value: '', label: '—' }]}
        statusValue=""
        onStatusChange={() => {}}
        zeitraumValue={zeitraum}
        onZeitraumChange={setZeitraum}
        showCustomDates={zeitraum === 'benutzerdefiniert'}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Name, Kategorie, Telefon, E-Mail, Adresse"
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        tags={filterTags}
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={imTab.length === 0 ? 'Noch keine Einträge' : 'Keine Treffer'}
          description={
            imTab.length === 0
              ? 'Erfassen Sie Lieferanten und Partner für Ihr Netzwerk.'
              : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <ul className="md:hidden">
            {filtered.map((p) => (
              <li key={p.id} className="border-b border-bw-border bg-bw-card first:border-t">
                <ListCard
                  title={p.name}
                  subtitle={p.partner_kategorien?.name || p.subkategorie || ''}
                  meta={p.telefon || ''}
                  onClick={() => setSelected(p)}
                />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-bw-border bg-bw-card shadow-card md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bw-border bg-bw-bg text-bw-text-muted">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Kategorie</th>
                  <th className="px-3 py-3 font-medium">Telefon</th>
                  <th className="px-3 py-3 font-medium">E-Mail</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-b border-bw-border last:border-0 hover:bg-bw-hover"
                    onClick={() => setSelected(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(p)
                      }
                    }}
                  >
                    <td className="px-3 py-3 font-medium text-bw-text">{p.name}</td>
                    <td className="px-3 py-3 text-bw-text-muted">{p.partner_kategorien?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      {p.telefon ? (
                        <a href={`tel:${p.telefon}`} className="text-bw-link hover:underline" onClick={(e) => e.stopPropagation()}>
                          {p.telefon}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {p.email ? (
                        <a href={`mailto:${p.email}`} className="text-bw-link hover:underline" onClick={(e) => e.stopPropagation()}>
                          {p.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="text-sm font-medium text-bw-link hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          openBearbeiten(p)
                        }}
                      >
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        width="md"
      >
        {selected ? (
          <div className="p-5 space-y-4">
            <div>
              <div className="text-base font-semibold text-bw-text">{selected.name}</div>
              {selected.partner_kategorien?.name ? (
                <div className="mt-0.5 text-xs text-bw-text-muted">
                  {selected.partner_kategorien.name}
                  {selected.subkategorie ? ` · ${selected.subkategorie}` : ''}
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              {selected.telefon ? (
                <a href={`tel:${selected.telefon}`} className="flex items-center gap-2 py-1 text-sm text-bw-link">
                  📞 {selected.telefon}
                </a>
              ) : null}
              {selected.email ? (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 truncate py-1 text-sm text-bw-link">
                  ✉️ {selected.email}
                </a>
              ) : null}
              {selected.website ? (
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 truncate py-1 text-sm text-bw-link"
                >
                  🌐 {selected.website}
                </a>
              ) : null}
              {selected.adresse ? (
                <div className="py-1 text-sm text-bw-text-muted">📍 {selected.adresse}</div>
              ) : null}
            </div>

            {selected.notizen ? (
              <div className="rounded-lg bg-bw-hover p-3 text-sm text-bw-text-muted">{selected.notizen}</div>
            ) : null}

            <div className="border-t border-bw-border pt-2">
              <button type="button" onClick={() => openBearbeiten(selected)} className="btn btn-secondary btn-sm w-full">
                ✏️ Bearbeiten
              </button>
            </div>
          </div>
        ) : null}
      </SidePanel>

      <Modal
        open={bearbeitenOpen && !!edit}
        onClose={() => {
          setBearbeitenOpen(false)
          setEdit(null)
        }}
        title="Partner bearbeiten"
      >
        {edit ? (
          <div className="space-y-4">
            <div className="form-grid-2 grid gap-3 sm:grid-cols-2">
              <Input label="Name *" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
              <Select
                label="Typ"
                name="partner_typ"
                value={edit.partner_typ}
                onChange={(e) =>
                  setEdit({ ...edit, partner_typ: e.target.value as 'partner' | 'netzwerk' })
                }
                options={[
                  { value: 'partner', label: 'Partner' },
                  { value: 'netzwerk', label: 'Netzwerk' },
                ]}
              />
              <Select
                label="Kategorie"
                name="kat"
                value={edit.kategorie_id ?? ''}
                onChange={(e) => setEdit({ ...edit, kategorie_id: e.target.value || null })}
                options={[
                  { value: '', label: '—' },
                  ...kategorien.map((k) => ({ value: k.id, label: k.name })),
                ]}
              />
              <Input
                label="Unterkategorie"
                value={edit.subkategorie ?? ''}
                onChange={(e) => setEdit({ ...edit, subkategorie: e.target.value })}
              />
              <Input label="Telefon" value={edit.telefon ?? ''} onChange={(e) => setEdit({ ...edit, telefon: e.target.value })} />
              <Input
                label="E-Mail"
                type="email"
                value={edit.email ?? ''}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </div>
            <Input label="Adresse" value={edit.adresse ?? ''} onChange={(e) => setEdit({ ...edit, adresse: e.target.value })} />
            <Input label="Webseite" value={edit.website ?? ''} onChange={(e) => setEdit({ ...edit, website: e.target.value })} />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-bw-mid">Notizen</span>
              <textarea
                className="input min-h-[80px]"
                placeholder="Notizen…"
                rows={3}
                value={edit.notizen ?? ''}
                onChange={(e) => setEdit({ ...edit, notizen: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setBearbeitenOpen(false)}>
                Abbrechen
              </Button>
              <Button type="button" variant="primary" loading={saving} onClick={() => void savePartner()}>
                Speichern
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={PARTNER_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : partners
          const data = source.map(partnerExportRow)
          const fields = PARTNER_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'partner')
        }}
      />
    </div>
  )
}
