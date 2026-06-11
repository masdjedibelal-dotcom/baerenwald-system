'use client'

import { Camera, Check, Circle, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  gruppiereAbnahmePunkte,
  neuerAbnahmePunktFreitext,
  neuerBulletUnterLeistung,
  type AbnahmeGewerkBlock,
  type AbnahmePunkt,
  type AbnahmePunktStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { cn } from '@/lib/utils'

function StatusToggle({
  value,
  onChange,
  compact,
}: {
  value: AbnahmePunktStatus
  onChange: (s: AbnahmePunktStatus) => void
  compact?: boolean
}) {
  const opts: { s: AbnahmePunktStatus; icon: typeof Check; title: string; cls: string }[] = [
    { s: 'ok', icon: Check, title: 'OK', cls: 'abnahme-st-ok' },
    { s: 'mangel', icon: AlertTriangle, title: 'Mangel', cls: 'abnahme-st-mangel' },
    { s: 'offen', icon: Circle, title: 'Offen', cls: 'abnahme-st-offen' },
  ]
  return (
    <div className={cn('abnahme-status-toggle', compact && 'flex-row gap-1')}>
      {opts.map(({ s, icon: Icon, title, cls }) => (
        <button
          key={s}
          type="button"
          title={title}
          className={cn(
            'abnahme-status-btn',
            compact && 'h-9 w-9',
            cls,
            value === s && 'active'
          )}
          onClick={() => onChange(s)}
        >
          <Icon className={cn('h-3.5 w-3.5', compact && 'h-4 w-4')} aria-hidden />
        </button>
      ))}
    </div>
  )
}

export function AbnahmeprotokollChecklist({
  punkte,
  onChange,
  mode,
  onFotoClick,
  uploading,
}: {
  punkte: AbnahmePunkt[]
  onChange: (next: AbnahmePunkt[]) => void
  mode: 'edit' | 'vorort'
  onFotoClick?: (punktId: string) => void
  uploading?: boolean
}) {
  const blocks: AbnahmeGewerkBlock[] = gruppiereAbnahmePunkte(punkte)

  function patchPunkt(id: string, patch: Partial<AbnahmePunkt>) {
    onChange(punkte.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removePunkt(id: string) {
    onChange(punkte.filter((p) => p.id !== id))
  }

  function addBullet(block: AbnahmeGewerkBlock, leistung: { leistung_id: string; leistung_name: string }) {
    onChange([...punkte, neuerBulletUnterLeistung(block.gewerk, leistung.leistung_id, leistung.leistung_name)])
  }

  const isVorort = mode === 'vorort'

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <div key={block.gewerk} className="overflow-hidden rounded-lg border border-bw-border bg-bw-card">
          <div className="border-b border-bw-border bg-bw-hover/80 px-3 py-2">
            <p className="text-[13px] font-semibold text-bw-primary">{block.gewerk}</p>
          </div>
          <div className="divide-y divide-bw-border">
            {block.leistungen.map((leistung) => (
              <div key={`${block.gewerk}-${leistung.leistung_id}`} className="px-3 py-3">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-bw-text-muted">
                  {leistung.leistung_name}
                </p>
                <ul className="space-y-2">
                  {leistung.punkte.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        'abnahme-punkt-card',
                        isVorort && 'flex flex-wrap items-start gap-3 p-3',
                        p.status === 'mangel' && isVorort && 'border-red-200 bg-red-50/50'
                      )}
                    >
                      <div className={cn('flex gap-2', isVorort && 'w-full', !isVorort && 'w-full items-start')}>
                        {isVorort ? (
                          <StatusToggle
                            value={p.status}
                            onChange={(s) => patchPunkt(p.id, { status: s })}
                            compact={isVorort}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          {isVorort ? (
                            <p className="text-[14px] font-medium leading-snug text-bw-text">
                              {p.beschreibung?.trim() || '—'}
                            </p>
                          ) : (
                            <Input
                              placeholder="Checkpunkt beschreiben…"
                              value={p.beschreibung}
                              onChange={(e) => patchPunkt(p.id, { beschreibung: e.target.value })}
                            />
                          )}
                          {!isVorort ? (
                            <Input
                              placeholder="Notiz (optional)"
                              value={p.notiz ?? ''}
                              onChange={(e) => patchPunkt(p.id, { notiz: e.target.value })}
                              className="mt-2"
                            />
                          ) : p.notiz?.trim() ? (
                            <p className="mt-1 text-[12px] text-bw-text-muted">{p.notiz}</p>
                          ) : null}
                        </div>
                        {!isVorort ? (
                          <button
                            type="button"
                            className="shrink-0 rounded-md p-1.5 text-bw-text-muted hover:bg-bw-hover hover:text-red-600"
                            title="Punkt entfernen"
                            onClick={() => removePunkt(p.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                      {(p.foto_urls ?? []).length > 0 ? (
                        <div className="bt-foto-grid mt-2 w-full">
                          {(p.foto_urls ?? []).map((url) => (
                            <div key={url} className="bt-foto-thumb">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {onFotoClick ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          disabled={uploading}
                          onClick={() => onFotoClick(p.id)}
                        >
                          <Camera className="mr-1 h-3 w-3" aria-hidden />
                          Foto
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {!isVorort ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => addBullet(block, leistung)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Checkpunkt
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isVorort ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...punkte, neuerAbnahmePunktFreitext()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Gewerk / Punkt hinzufügen
        </Button>
      ) : null}
    </div>
  )
}
