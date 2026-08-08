'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { PickerSheet } from '@/components/surfaces/PickerSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { listKatalogPositionen } from '@/app/(dashboard)/katalog/actions'
import {
  katalogPreisLabel,
  katalogVarianteLabel,
  type KatalogPosition,
  type KatalogVariante,
} from '@/lib/katalog/katalog-types'
import { formatEurBetrag } from '@/lib/dokument-zeilen'

export type KatalogPickResult = {
  position: KatalogPosition
  variante: KatalogVariante
  menge: number
  beschreibung: string
}

/**
 * „Aus Katalog“: PickerSheet · Suche · Gewerk-Chips · Variante · Menge.
 */
export function KatalogPickModal({
  open,
  onClose,
  onPick,
  preferredGewerkName,
}: {
  open: boolean
  onClose: () => void
  onPick: (result: KatalogPickResult) => void
  preferredGewerkName?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<KatalogPosition[]>([])
  const [q, setQ] = useState('')
  const [gewerkFilter, setGewerkFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [picked, setPicked] = useState<{
    position: KatalogPosition
    variante: KatalogVariante
  } | null>(null)
  const [menge, setMenge] = useState('1')
  const [beschreibung, setBeschreibung] = useState('')

  useEffect(() => {
    if (!open) return
    setQ('')
    setExpandedId(null)
    setPicked(null)
    setMenge('1')
    setBeschreibung('')
    startTransition(async () => {
      const list = await listKatalogPositionen({ nurAktiv: true })
      setRows(list)
      if (preferredGewerkName?.trim()) {
        const hit = list.find(
          (p) =>
            (p.gewerk_name || '').toLowerCase() === preferredGewerkName.trim().toLowerCase()
        )
        if (hit) setGewerkFilter(hit.gewerk_id)
      }
    })
  }, [open, preferredGewerkName])

  const gewerke = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of rows) {
      if (!m.has(p.gewerk_id)) m.set(p.gewerk_id, p.gewerk_name || 'Gewerk')
    }
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((p) => {
      if (gewerkFilter && p.gewerk_id !== gewerkFilter) return false
      if (!needle) return true
      const hay = `${p.titel} ${p.kategorie} ${p.gewerk_name ?? ''} ${p.varianten
        .map((v) => v.variante)
        .join(' ')}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, q, gewerkFilter])

  const grouped = useMemo(() => {
    const m = new Map<string, KatalogPosition[]>()
    for (const p of filtered) {
      const key = p.gewerk_name || 'Sonstige'
      const arr = m.get(key) ?? []
      arr.push(p)
      m.set(key, arr)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [filtered])

  function selectVariante(position: KatalogPosition, variante: KatalogVariante) {
    setPicked({ position, variante })
    setBeschreibung(
      (variante.beschreibung || position.beschreibung_standard || '').trim()
    )
  }

  function tryPickPosition(position: KatalogPosition) {
    const aktive = position.varianten.filter((v) => v.aktiv)
    if (aktive.length === 1) {
      selectVariante(position, aktive[0]!)
      return
    }
    setExpandedId((cur) => (cur === position.id ? null : position.id))
  }

  function confirm() {
    if (!picked) return
    const m = Number(String(menge).replace(',', '.'))
    onPick({
      position: picked.position,
      variante: picked.variante,
      menge: Number.isFinite(m) && m > 0 ? m : 1,
      beschreibung: beschreibung.trim(),
    })
    onClose()
  }

  return (
    <PickerSheet
      open={open}
      onClose={onClose}
      title="Position hinzufügen"
      context="canvas"
      search={
        <input
          className="sel w-full"
          placeholder="Leistung suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      }
      searchPlacement="top"
      sourceChips={[
        {
          id: 'alle',
          label: 'Alle',
          active: !gewerkFilter,
          onClick: () => setGewerkFilter(null),
        },
        ...gewerke.map((g) => ({
          id: g.id,
          label: g.name,
          active: gewerkFilter === g.id,
          onClick: () => setGewerkFilter(g.id),
        })),
      ]}
      empty={
        pending && !rows.length ? (
          <p className="picker-sheet__empty">Lädt…</p>
        ) : !pending && !filtered.length ? (
          <p className="picker-sheet__empty">Keine Treffer.</p>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <div className="max-h-[280px] overflow-y-auto rounded-md border border-bw-border">
          {grouped.map(([gewerkName, items]) => (
            <div key={gewerkName}>
              <div className="sticky top-0 bg-bw-surface-2 px-3 py-1.5 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
                {gewerkName}
              </div>
              <ul>
                {items.map((p) => {
                  const expanded = expandedId === p.id
                  const selectedHere = picked?.position.id === p.id
                  return (
                    <li key={p.id} className="border-t border-bw-border/60">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--fs-text)] hover:bg-bw-surface-2"
                        onClick={() => tryPickPosition(p)}
                      >
                        <span className="min-w-0 flex-1 font-medium">{p.titel}</span>
                        <MockBadge kind="fertig">{p.kategorie}</MockBadge>
                        <span className="shrink-0 text-[length:var(--fs-meta)] text-bw-text-muted">
                          {p.varianten.length} Var.
                        </span>
                      </button>
                      {(expanded || (selectedHere && p.varianten.length > 1)) && (
                        <ul className="bg-bw-surface-2/50 px-3 pb-2">
                          {p.varianten.map((v) => (
                            <li key={v.id}>
                              <button
                                type="button"
                                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-[length:var(--fs-meta)] ${
                                  picked?.variante.id === v.id
                                    ? 'bg-emerald-50 text-emerald-950'
                                    : 'hover:bg-white'
                                }`}
                                onClick={() => selectVariante(p, v)}
                              >
                                <span>{katalogVarianteLabel(v)}</span>
                                <span className="tabular-nums text-bw-text-muted">
                                  {katalogPreisLabel(v)} / {v.einheit}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {picked ? (
          <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
            <p className="text-[length:var(--fs-meta)] font-medium text-emerald-950">
              {picked.position.titel}
              {picked.variante.variante?.trim()
                ? ` · ${picked.variante.variante}`
                : ''}{' '}
              · {formatEurBetrag(picked.variante.preis)} / {picked.variante.einheit}
            </p>
            <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
              Menge
              <input
                className="sel mt-0.5 w-full"
                value={menge}
                onChange={(e) => setMenge(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <SheetEditableField
              label="Beschreibung"
              value={beschreibung}
              onSave={setBeschreibung}
              multiline
              rows={3}
              placeholder="Projektspezifisch"
              sheetContext="detail"
            />
            <MockBtn
              sm
              kind="primary"
              icon="check"
              disabled={!picked || pending}
              onClick={confirm}
            >
              Übernehmen
            </MockBtn>
          </div>
        ) : null}
      </div>
    </PickerSheet>
  )
}
