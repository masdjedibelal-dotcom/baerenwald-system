'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockBtn, MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { preislisteEinzelpreis } from '@/lib/preisliste-preis'
import type { Gewerk, Preisliste } from '@/lib/types'
import { createPreisliste, updatePreisliste } from '@/app/(dashboard)/preislisten/actions'
import { sortPreislistenRows } from '@/lib/preislisten-sort'
import {
  EINHEIT_CUSTOM,
  EINHEIT_VORSCHLAEGE,
  resolveEinheitwahl,
  splitEinheitStored,
} from '@/lib/preislisten-einheiten'
import { PreislistenCsvImportModal } from '@/components/preislisten/PreislistenCsvImportModal'
import type { PreislistenImportResponse } from '@/lib/preislisten-import'

const COLS = 'minmax(0, 1.6fr) 120px 140px 28px'

function isPresetEinheit(e: string): boolean {
  return (EINHEIT_VORSCHLAEGE as readonly string[]).includes(e)
}

function formatPreisLabel(pl: Preisliste): string {
  const p = preislisteEinzelpreis(pl)
  return `${p.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`
}

/** „800–1.400“ oder „800“ → erste Zahl als Netto-Preis */
function parsePreisText(raw: string): number | null {
  const cleaned = raw.replace(/€/gi, '').trim()
  if (!cleaned) return null
  const first = cleaned.split(/[–—\-]/)[0]?.trim() ?? ''
  const n = Number(first.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

type LeistungForm = {
  gewerk_id: string
  leistung: string
  einheit: string
  preisText: string
  beschreibung: string
}

function emptyForm(gewerkId: string): LeistungForm {
  return {
    gewerk_id: gewerkId,
    leistung: '',
    einheit: 'pauschal',
    preisText: '',
    beschreibung: '',
  }
}

/** Mock: Preisliste randlos + Leistung-anlegen-Drawer. */
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
    return rows.filter((r) => r.gewerk_id === activeGewerkId && r.aktiv !== false)
  }, [rows, activeGewerkId])

  const [editLeistung, setEditLeistung] = useState<Preisliste | null>(null)
  const [neuOpen, setNeuOpen] = useState(false)
  const modalOpen = neuOpen || !!editLeistung
  const [form, setForm] = useState<LeistungForm>(() => emptyForm(''))
  const [csvOpen, setCsvOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const einheitSelectValue = isPresetEinheit(form.einheit) ? form.einheit : EINHEIT_CUSTOM
  const showCustomEinheit = einheitSelectValue === EINHEIT_CUSTOM
  const crumbGewerk =
    gewAll.find((g) => g.id === form.gewerk_id)?.name ?? activeGewerkName

  function markForm(patch: Partial<LeistungForm>) {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  function closeModal() {
    setEditLeistung(null)
    setNeuOpen(false)
    setErr(null)
    setDirty(false)
  }

  function openNeuModal() {
    const gid = activeGewerkId ?? gewerkeTabs[0]?.id ?? ''
    setEditLeistung(null)
    setNeuOpen(true)
    setForm(emptyForm(gid))
    setErr(null)
    setDirty(false)
  }

  function openEditLeistung(row: Preisliste) {
    const sp = splitEinheitStored(row.einheit)
    setForm({
      gewerk_id: row.gewerk_id,
      leistung: row.leistung,
      einheit: sp.wahl === EINHEIT_CUSTOM ? sp.freitext : sp.wahl,
      preisText: String(preislisteEinzelpreis(row)),
      beschreibung: '',
    })
    setEditLeistung(row)
    setNeuOpen(false)
    setErr(null)
    setDirty(false)
  }

  function handleSave() {
    if (!form.gewerk_id || !form.leistung.trim()) {
      setErr('Bezeichnung und Gewerk sind Pflicht.')
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
    const preisMin = parsePreisText(form.preisText)
    if (preisMin == null) {
      setErr('Preis angeben (z.B. 800 oder 800–1.400).')
      return
    }

    const editId = editLeistung?.id ?? null
    const kat = editLeistung?.kategorie?.trim() || ''

    startTransition(async () => {
      if (editId) {
        const res = await updatePreisliste(editId, {
          gewerk_id: form.gewerk_id,
          kategorie: kat,
          leistung: form.leistung.trim(),
          einheit,
          preis_min: preisMin,
          aktiv: true,
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
                    leistung: form.leistung.trim(),
                    einheit,
                    preis_min: preisMin,
                    aktiv: true,
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
          kategorie: '',
          leistung: form.leistung.trim(),
          einheit,
          preis_min: preisMin,
          aktiv: true,
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
              kategorie: '',
              leistung: form.leistung.trim(),
              einheit,
              preis_min: preisMin,
              aktiv: true,
              gewerke: g,
            },
          ])
        )
        toast.success('Leistung angelegt')
      }
      closeModal()
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

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <MockIcon ctx="nav" n="clipboard-list" size={16} style={{ color: 'var(--text-3)' }} />
        <span
          style={{
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          Preisliste
        </span>
        <div style={{ flex: 1 }} />
        <MockBtn sm kind="ghost" icon="upload" title="CSV Import" onClick={() => setCsvOpen(true)} />
        <button
          type="button"
          className="btn ghost sm"
          disabled={!activeGewerkId}
          onClick={openNeuModal}
        >
          + Leistung
        </button>
      </div>

      <div className="chiprow" style={{ marginBottom: 16 }}>
        {gewerkeTabs.map((g) => (
          <MockChip key={g.id} active={activeGewerkId === g.id} onClick={() => setTabGewerkId(g.id)}>
            {g.name}
          </MockChip>
        ))}
      </div>

      {gewerkeTabs.length === 0 ? (
        <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)', margin: '8px 0' }}>
          Kein aktives Gewerk. Bitte zuerst Gewerke anlegen und aktivieren.
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)', margin: '8px 0' }}>
          Noch keine Leistungen in {activeGewerkName}.{' '}
          <button type="button" className="btn ghost sm" onClick={openNeuModal}>
            Leistung anlegen
          </button>
        </p>
      ) : (
        <>
          <div className="listcard">
            <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
              <div>Leistung</div>
              <div>Einheit</div>
              <div>Preis</div>
              <div />
            </div>
            {filtered.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                className="list-row"
                style={{ gridTemplateColumns: COLS, alignItems: 'center' }}
                onClick={() => openEditLeistung(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openEditLeistung(r)
                  }
                }}
              >
                <div className="lc-title" style={{ fontWeight: 500 }}>
                  {r.leistung}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-text)' }}>
                  {r.einheit || '—'}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-text)' }}>
                  {formatPreisLabel(r)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-4)' }}>
                  <MockIcon ctx="default" n="chevron-right" size={16} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 'var(--fs-meta)', color: 'var(--text-4)' }}>
            {filtered.length} Leistung{filtered.length === 1 ? '' : 'en'} · {activeGewerkName}
          </p>
        </>
      )}

      <EditorSheet
        open={modalOpen}
        onClose={closeModal}
        title={editLeistung ? 'Leistung bearbeiten' : 'Leistung anlegen'}
        crumb={`${crumbGewerk} >`}
        context="detail"
        dirty={dirty}
        size="md"
        onConfirm={handleSave}
        confirmDisabled={pending || !form.leistung.trim() || !form.gewerk_id}
        confirmBusy={pending}
      >
        <div className="kunde-create">
          {err ? <p className="kunde-create__err">{err}</p> : null}
          <MockFormSection>
            <MockField label="Bezeichnung" required full>
              <input
                className="input"
                value={form.leistung}
                onChange={(e) => markForm({ leistung: e.target.value })}
                placeholder="Dusche bodengleich einbauen"
              />
            </MockField>
            <MockField label="Gewerk">
              <select
                className="input"
                value={form.gewerk_id}
                onChange={(e) => markForm({ gewerk_id: e.target.value })}
              >
                <option value="">Bitte wählen…</option>
                {gewAll
                  .filter((x) => x.aktiv || x.id === form.gewerk_id)
                  .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </MockField>
            <MockField label="Einheit">
              <select
                className="input"
                value={einheitSelectValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === EINHEIT_CUSTOM) markForm({ einheit: '' })
                  else markForm({ einheit: v })
                }}
              >
                {EINHEIT_VORSCHLAEGE.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value={EINHEIT_CUSTOM}>Andere…</option>
              </select>
            </MockField>
            {showCustomEinheit ? (
              <MockField label="Einheit (frei)" full>
                <input
                  className="input"
                  value={form.einheit}
                  onChange={(e) => markForm({ einheit: e.target.value })}
                  placeholder="z. B. pro Baum"
                />
              </MockField>
            ) : null}
            <MockField label="Preis" full>
              <input
                className="input"
                value={form.preisText}
                onChange={(e) => markForm({ preisText: e.target.value })}
                placeholder="800–1.400 €"
              />
              <div className="field-hint">Festpreis oder Spanne, z.B. 800–1.400 €</div>
            </MockField>
            <MockField label="Beschreibung" full>
              <textarea
                className="input"
                rows={3}
                value={form.beschreibung}
                onChange={(e) => markForm({ beschreibung: e.target.value })}
                placeholder="Was ist enthalten…"
                style={{ resize: 'vertical', minHeight: 72 }}
              />
              <div className="field-hint">erscheint im Angebot unter der Position</div>
            </MockField>
          </MockFormSection>
        </div>
      </EditorSheet>

      <PreislistenCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onDone={onImportDone} />
    </div>
  )
}
