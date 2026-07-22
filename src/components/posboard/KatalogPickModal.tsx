'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
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
 * Modal „Aus Katalog“: Suche, Gewerk-Chips, Varianten-Auswahl, Menge + Beschreibung.
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

  if (!open) return null

  return (
    <MockModal
      open
      onClose={onClose}
      icon="list-filter"
      title="Aus Katalog"
      sub={
        rows.length
          ? 'Titel suchen · Variante wählen · Beschreibung projektbezogen anpassen'
          : 'Katalog noch leer — bitte SQL + CSVs in Supabase importieren'
      }
      footer={
        <>
          <div style={{ flex: 1 }} />
          <MockBtn sm kind="ghost" onClick={onClose}>
            Abbrechen
          </MockBtn>
          <MockBtn sm kind="primary" icon="check" disabled={!picked || pending} onClick={confirm}>
            Übernehmen
          </MockBtn>
        </>
      }
    >
      <div className="space-y-3">
        <input
          className="sel w-full"
          placeholder="Suche über alle Titel…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`chip ${!gewerkFilter ? 'active' : ''}`}
            onClick={() => setGewerkFilter(null)}
          >
            Alle
          </button>
          {gewerke.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`chip ${gewerkFilter === g.id ? 'active' : ''}`}
              onClick={() => setGewerkFilter(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="max-h-[280px] overflow-y-auto rounded-md border border-bw-border">
          {pending && !rows.length ? (
            <p className="p-3 text-[12px] text-bw-text-muted">Lädt Katalog…</p>
          ) : null}
          {!pending && !filtered.length ? (
            <p className="p-3 text-[12px] text-bw-text-muted">Keine Treffer.</p>
          ) : null}
          {grouped.map(([gewerkName, items]) => (
            <div key={gewerkName}>
              <div className="sticky top-0 bg-bw-surface-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
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
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-bw-surface-2"
                        onClick={() => tryPickPosition(p)}
                      >
                        <span className="min-w-0 flex-1 font-medium">{p.titel}</span>
                        <MockBadge kind="fertig">{p.kategorie}</MockBadge>
                        <span className="shrink-0 text-[11px] text-bw-text-muted">
                          {p.varianten.length} Var.
                        </span>
                      </button>
                      {(expanded || (selectedHere && p.varianten.length > 1)) && (
                        <ul className="bg-bw-surface-2/50 px-3 pb-2">
                          {p.varianten.map((v) => (
                            <li key={v.id}>
                              <button
                                type="button"
                                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-[12px] ${
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
            <p className="text-[12px] font-medium text-emerald-950">
              {picked.position.titel}
              {picked.variante.variante?.trim()
                ? ` · ${picked.variante.variante}`
                : ''}{' '}
              · {formatEurBetrag(picked.variante.preis)} / {picked.variante.einheit}
            </p>
            <label className="block text-[11px] text-bw-text-muted">
              Menge
              <input
                className="sel mt-0.5 w-full"
                value={menge}
                onChange={(e) => setMenge(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="block text-[11px] text-bw-text-muted">
              Beschreibung (projektspezifisch — Titel bleibt Katalog)
              <textarea
                className="sel mt-0.5 w-full"
                rows={3}
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="Was genau wird in diesem Projekt gemacht?"
              />
            </label>
          </div>
        ) : null}
      </div>
    </MockModal>
  )
}
