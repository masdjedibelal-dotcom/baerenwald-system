'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockBtn, MockBadge, MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import { Toggle } from '@/components/ui/Toggle'
import { toast } from '@/components/ui/app-toast'
import {
  listKatalogPositionen,
  setKatalogPositionAktiv,
  setKatalogVarianteAktiv,
  updateKatalogVariantePreis,
} from '@/app/(dashboard)/katalog/actions'
import {
  katalogPreisLabel,
  katalogVarianteLabel,
  type KatalogPosition,
} from '@/lib/katalog/katalog-types'
import type { Gewerk } from '@/lib/types'

/** Zweistufige Katalog-Ansicht: Position → Varianten (Preis/Aktiv inline). */
export function KatalogPreislistenClient({
  gewerkeAlle,
  initialRows = [],
}: {
  gewerkeAlle: Gewerk[]
  initialRows?: KatalogPosition[]
}) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<KatalogPosition[]>(initialRows)
  const [tabGewerkId, setTabGewerkId] = useState<string | null>(null)
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  async function reload() {
    const list = await listKatalogPositionen({ nurAktiv: false })
    setRows(list)
  }

  const gewerkeTabs = useMemo(() => {
    const ids = new Set(rows.map((r) => r.gewerk_id))
    return gewerkeAlle
      .filter((g) => g.aktiv && ids.has(g.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [gewerkeAlle, rows])

  const activeGewerkId = tabGewerkId ?? gewerkeTabs[0]?.id ?? null
  const visible = useMemo(
    () =>
      rows
        .filter((r) => !activeGewerkId || r.gewerk_id === activeGewerkId)
        .sort((a, b) => a.sortierung - b.sortierung || a.titel.localeCompare(b.titel, 'de')),
    [rows, activeGewerkId]
  )

  if (rows.length === 0) {
    return (
      <MockCard title="Preiskatalog">
        <MockEmpty
          title="Katalog noch leer"
          hint="SQL-Migration + CSVs in Supabase importieren (erst Positionen, dann Varianten)."
        />
      </MockCard>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {gewerkeTabs.map((g) => (
          <MockChip
            key={g.id}
            active={g.id === activeGewerkId}
            onClick={() => setTabGewerkId(g.id)}
          >
            {g.name}
          </MockChip>
        ))}
        <div className="ml-auto">
          <MockBtn
            sm
            kind="ghost"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await reload()
              })
            }}
          >
            Aktualisieren
          </MockBtn>
        </div>
      </div>

      <div className="divide-y divide-bw-border rounded-md border border-bw-border bg-white">
        {visible.map((p) => {
          const open = openIds[p.id] ?? false
          return (
            <div key={p.id}>
              <div className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px]">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-80"
                  onClick={() => setOpenIds((s) => ({ ...s, [p.id]: !open }))}
                >
                  <span className="min-w-0 flex-1 font-medium">{p.titel}</span>
                  <MockBadge kind="fertig">{p.kategorie}</MockBadge>
                  <span className="text-[11px] text-bw-text-muted">
                    {p.varianten.length} Variante{p.varianten.length === 1 ? '' : 'n'}
                  </span>
                </button>
                <Toggle
                  checked={p.aktiv}
                  onChange={(v) => {
                    startTransition(async () => {
                      const r = await setKatalogPositionAktiv(p.id, v)
                      if (!r.ok) toast.error(r.message)
                      else await reload()
                    })
                  }}
                  label="Aktiv"
                />
              </div>
              {open ? (
                <ul className="space-y-2 bg-bw-surface-2/40 px-3 pb-3 pt-1">
                  {p.varianten.map((v) => (
                    <li
                      key={v.id}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-bw-border bg-white px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">{katalogVarianteLabel(v)}</p>
                        <p className="text-[11px] text-bw-text-muted">
                          {v.einheit} · {katalogPreisLabel(v)}
                        </p>
                      </div>
                      <div className="w-[120px]">
                        <EuroNettoInput
                          value={v.preis}
                          onChange={(n) => {
                            startTransition(async () => {
                              const r = await updateKatalogVariantePreis(v.id, n)
                              if (!r.ok) toast.error(r.message)
                              else await reload()
                            })
                          }}
                        />
                      </div>
                      <Toggle
                        checked={v.aktiv}
                        onChange={(on) => {
                          startTransition(async () => {
                            const r = await setKatalogVarianteAktiv(v.id, on)
                            if (!r.ok) toast.error(r.message)
                            else await reload()
                          })
                        }}
                        label="Aktiv"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
