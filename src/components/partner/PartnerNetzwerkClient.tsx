'use client'

import { useMemo, useState } from 'react'
import { Download, Pencil, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { createClient } from '@/lib/supabase'

export type PartnerKategorie = {
  id: string
  name: string
  slug: string
  sort_order: number
}

export type PartnerRow = {
  id: string
  name: string
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
  const [kategorieFilter, setKategorieFilter] = useState('alle')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [q, setQ] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [edit, setEdit] = useState<PartnerRow | null>(null)
  const [saving, setSaving] = useState(false)

  const kategorieOptions = useMemo(
    () => [
      { value: 'alle', label: 'Alle' },
      ...kategorien.map((k) => ({ value: k.id, label: k.name })),
    ],
    [kategorien]
  )

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return partners.filter((p) => {
      if (kategorieFilter !== 'alle' && p.kategorie_id !== kategorieFilter) return false
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
  }, [partners, kategorieFilter, dateRange, q])

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (kategorieFilter !== 'alle') {
      const label = kategorien.find((k) => k.id === kategorieFilter)?.name ?? 'Kategorie'
      t.push({ id: 'kat', label, onRemove: () => setKategorieFilter('alle') })
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
  }, [kategorieFilter, kategorien, zeitraum, q])

  const hasActiveFilters = !!(kategorieFilter !== 'alle' || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setKategorieFilter('alle')
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
    setEdit(null)
  }

  return (
    <div>
      <PageHeader
        title="Partner & Netzwerk"
        action={
          <div className="flex max-w-full flex-col items-end gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 text-sm font-medium text-bw-text shadow-sm transition-colors hover:bg-bw-hover"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export
            </button>
            <span className="text-xs text-bw-text-muted md:text-sm">
              Neu über Supabase oder späteres Formular
            </span>
          </div>
        }
      />

      <ListFilterBar
        statusLabel="Kategorie"
        statusOptions={kategorieOptions}
        statusValue={kategorieFilter}
        onStatusChange={setKategorieFilter}
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
          title={partners.length === 0 ? 'Noch keine Partner' : 'Keine Treffer'}
          description={
            partners.length === 0
              ? 'Erfassen Sie Lieferanten und Partner für Ihr Netzwerk.'
              : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <li key={p.id} className="card p-4">
                <p className="font-semibold text-bw-text">{p.name}</p>
                {p.subkategorie ? <p className="text-sm text-bw-text-muted">{p.subkategorie}</p> : null}
                {p.partner_kategorien ? (
                  <p className="text-xs text-bw-text-muted">{p.partner_kategorien.name}</p>
                ) : null}
                {p.telefon ? (
                  <a href={`tel:${p.telefon}`} className="mt-2 block text-sm text-bw-link">
                    {p.telefon}
                  </a>
                ) : null}
                {p.email ? (
                  <a href={`mailto:${p.email}`} className="block text-sm text-bw-link">
                    {p.email}
                  </a>
                ) : null}
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setEdit(p)}>
                  <Pencil className="mr-1 inline h-4 w-4" aria-hidden />
                  Bearbeiten
                </Button>
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
                  <tr key={p.id} className="border-b border-bw-border last:border-0">
                    <td className="px-3 py-3 font-medium text-bw-text">{p.name}</td>
                    <td className="px-3 py-3 text-bw-text-muted">{p.partner_kategorien?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      {p.telefon ? (
                        <a href={`tel:${p.telefon}`} className="text-bw-link hover:underline">
                          {p.telefon}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {p.email ? (
                        <a href={`mailto:${p.email}`} className="text-bw-link hover:underline">
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
                        onClick={() => setEdit(p)}
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

      {edit ? (
        <Modal open title="Partner bearbeiten" onClose={() => setEdit(null)} size="lg">
          <div className="space-y-3">
            <Input label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
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
              label="Subkategorie"
              value={edit.subkategorie ?? ''}
              onChange={(e) => setEdit({ ...edit, subkategorie: e.target.value })}
            />
            <Input
              label="Ansprechpartner"
              value={edit.ansprechpartner ?? ''}
              onChange={(e) => setEdit({ ...edit, ansprechpartner: e.target.value })}
            />
            <Input label="Telefon" value={edit.telefon ?? ''} onChange={(e) => setEdit({ ...edit, telefon: e.target.value })} />
            <Input
              label="E-Mail"
              type="email"
              value={edit.email ?? ''}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
            <Input label="Adresse" value={edit.adresse ?? ''} onChange={(e) => setEdit({ ...edit, adresse: e.target.value })} />
            <Input label="Webseite" value={edit.website ?? ''} onChange={(e) => setEdit({ ...edit, website: e.target.value })} />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-bw-mid">Notizen</span>
              <textarea
                className="input min-h-[80px]"
                value={edit.notizen ?? ''}
                onChange={(e) => setEdit({ ...edit, notizen: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setEdit(null)}>
                Abbrechen
              </Button>
              <Button type="button" variant="primary" loading={saving} onClick={() => void savePartner()}>
                Speichern
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

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
