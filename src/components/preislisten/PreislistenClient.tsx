'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MockBtn, MockChip } from '@/components/mock-ui/MockPrimitives'
import { PosTable, type PosTableGroup, type PosTableItem } from '@/components/posboard/PosTable'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Toggle } from '@/components/ui/Toggle'
import { toast } from '@/components/ui/app-toast'
import { preislisteEinzelpreis } from '@/lib/preisliste-preis'
import type { Gewerk, Preisliste } from '@/lib/types'
import {
  createPreisliste,
  softDeletePreisliste,
  updatePreisliste,
} from '@/app/(dashboard)/preislisten/actions'
import { sortPreislistenRows } from '@/lib/preislisten-sort'
import {
  EINHEIT_CUSTOM,
  EINHEIT_VORSCHLAEGE,
  einheitSelectOptions,
  resolveEinheitwahl,
  splitEinheitStored,
} from '@/lib/preislisten-einheiten'
import { PreislistenCsvImportModal } from '@/components/preislisten/PreislistenCsvImportModal'
import type { PreislistenImportResponse } from '@/lib/preislisten-import'

const NEUE_KAT = '__neu__'

function isPresetEinheit(e: string): boolean {
  return (EINHEIT_VORSCHLAEGE as readonly string[]).includes(e)
}

function formatPreisLabel(pl: Preisliste): string {
  const p = preislisteEinzelpreis(pl)
  return `${p.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`
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

/** Mock-Parität: Gewerk-Chips + PosTable in Einstellungen → Preislisten. */
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
  const activeGewerkName = gewerkeTabs.find((g) => g.id === activeGewerkId)?.name ?? 'Leistungen'

  const filtered = useMemo(() => {
    if (!activeGewerkId) return []
    return rows.filter((r) => r.gewerk_id === activeGewerkId)
  }, [rows, activeGewerkId])

  const posGroups: PosTableGroup[] = useMemo(() => {
    if (!activeGewerkId) return []
    const items: PosTableItem[] = filtered.map((r) => ({
      id: r.id,
      name: r.leistung,
      mengeLabel: r.einheit || '',
      preisLabel: formatPreisLabel(r),
    }))
    return [
      {
        id: `pl-${activeGewerkId}`,
        gewerk: activeGewerkName,
        titel: `${filtered.length} Leistung${filtered.length === 1 ? '' : 'en'}`,
        items,
      },
    ]
  }, [activeGewerkId, activeGewerkName, filtered])

  const [editLeistung, setEditLeistung] = useState<Preisliste | null>(null)
  const [neuOpen, setNeuOpen] = useState(false)
  const modalOpen = neuOpen || !!editLeistung

  const [form, setForm] = useState<LeistungForm>(() => emptyForm(''))
  const [oberkatSelect, setOberkatSelect] = useState('')
  const [neueKategorie, setNeueKategorie] = useState('')
  const [preis, setPreis] = useState(0)

  const [csvOpen, setCsvOpen] = useState(false)
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
        toast.success('Leistung gespeichert')
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
        toast.success('Leistung angelegt')
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
    if (!confirm(`„${row.leistung}“ löschen?`)) return
    startTransition(async () => {
      const res = await softDeletePreisliste(row.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      toast.success('Leistung gelöscht')
      router.refresh()
    })
  }

  function onCopy(row: Preisliste) {
    startTransition(async () => {
      const res = await createPreisliste({
        gewerk_id: row.gewerk_id,
        kategorie: (row.kategorie ?? '').trim(),
        leistung: `${row.leistung.trim()} (Kopie)`,
        einheit: row.einheit,
        preis_min: preislisteEinzelpreis(row),
        aktiv: true,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      const g = gewAll.find((x) => x.id === row.gewerk_id)
      setRows((prev) =>
        sortPreislistenRows([
          ...prev,
          {
            id: res.id,
            gewerk_id: row.gewerk_id,
            kategorie: (row.kategorie ?? '').trim(),
            leistung: `${row.leistung.trim()} (Kopie)`,
            einheit: row.einheit,
            preis_min: preislisteEinzelpreis(row),
            aktiv: true,
            gewerke: g,
          },
        ])
      )
      toast.success('Leistung kopiert')
      router.refresh()
    })
  }

  function onImportDone(r: PreislistenImportResponse) {
    const fehlerN = r.fehler.length
    toast.success(
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

  function rowById(id: string): Preisliste | undefined {
    return rows.find((r) => r.id === id)
  }

  return (
    <div>
      <div className="listbar" style={{ marginBottom: 12 }}>
        <div className="listbar-chips">
          {gewerkeTabs.map((g) => (
            <MockChip key={g.id} active={activeGewerkId === g.id} onClick={() => setTabGewerkId(g.id)}>
              {g.name}
            </MockChip>
          ))}
        </div>
        <div className="listbar-actions">
          <MockBtn sm kind="ghost" icon="upload" title="CSV Import" onClick={() => setCsvOpen(true)} />
          <MockBtn sm icon="plus" kind="primary" onClick={openNeuModal} disabled={!activeGewerkId}>
            Neue Leistung
          </MockBtn>
        </div>
      </div>

      {gewerkeTabs.length === 0 ? (
        <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)', margin: '8px 0' }}>
          Kein aktives Gewerk. Bitte zuerst Gewerke anlegen und aktivieren.
        </p>
      ) : (
        <PosTable
          groups={posGroups}
          onAddItem={() => openNeuModal()}
          itemActions={(_g, item) => {
            const row = rowById(item.id)
            if (!row) return []
            return [
              { icon: 'pencil', label: 'Bearbeiten', onClick: () => openEditLeistung(row) },
              { icon: 'copy', label: 'Kopieren', onClick: () => onCopy(row) },
              'sep',
              { icon: 'trash', label: 'Löschen', danger: true, onClick: () => onSoftDelete(row) },
            ]
          }}
        />
      )}

      <EditorSheet
        open={modalOpen}
        onClose={closeModal}
        title={editLeistung ? 'Leistung bearbeiten' : 'Neue Leistung'}
        context="detail"
        size="md"
        confirmBusy={pending}
        onConfirm={handleSave}
      >
        {editLeistung ? (
          <div className="mb-4 border-b border-bw-border pb-3 text-[length:var(--fs-meta)] text-bw-text-muted">
            {aktuellesGewerk?.name}
            {(editLeistung.kategorie ?? '').trim()
              ? ` · ${(editLeistung.kategorie ?? '').trim()}`
              : ''}
            {` · ${editLeistung.leistung}`}
          </div>
        ) : null}

        {err ? (
          <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[length:var(--fs-text)] text-danger">
            {err}
          </p>
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
      </EditorSheet>

      <PreislistenCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onDone={onImportDone} />
    </div>
  )
}
