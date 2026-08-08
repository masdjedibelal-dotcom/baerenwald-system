'use client'

import { useMemo, useState } from 'react'
import { MockChip } from '@/components/mock-ui'
import { MockVerlaufCard } from '@/components/mock-ui/MockDetailCards'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import { VerlaufEreignisModal } from '@/components/crm/VerlaufEreignisModal'
import {
  VERLAUF_CARD_FILTERS,
  verlaufCardKategorie,
  verlaufCardView,
  type VerlaufBuiltItem,
  type VerlaufCardKategorie,
  type VerlaufInspectTarget,
} from '@/lib/crm/verlauf'
import { cn } from '@/lib/utils'

const KAT_ICON: Record<VerlaufCardKategorie, string> = {
  email: 'mail',
  angebot: 'file-invoice',
  rechnung: 'receipt',
  termin: 'calendar-event',
  status: 'activity',
  offen: 'circle',
  sonstiges: 'history',
}

export function VerlaufPanel({
  items,
  emptyHint = 'Noch keine relevanten Ereignisse.',
}: {
  items: VerlaufBuiltItem[]
  emptyHint?: string
}) {
  const [inspect, setInspect] = useState<VerlaufInspectTarget | null>(null)
  const [filter, setFilter] = useState<VerlaufCardKategorie | 'alle'>('alle')

  const counts = useMemo(() => {
    const c: Record<string, number> = { alle: items.length }
    for (const item of items) {
      const k = verlaufCardKategorie(item)
      c[k] = (c[k] ?? 0) + 1
    }
    return c
  }, [items])

  const filtered = useMemo(() => {
    if (filter === 'alle') return items
    return items.filter((i) => verlaufCardKategorie(i) === filter)
  }, [items, filter])

  /** Neueste zuerst für Card-Feed */
  const ordered = useMemo(
    () => [...filtered].sort((a, b) => b.ts - a.ts),
    [filtered]
  )

  const visibleFilters = useMemo(
    () =>
      VERLAUF_CARD_FILTERS.filter((f) => {
        if (f.id === 'alle') return true
        return (counts[f.id] ?? 0) > 0
      }),
    [counts]
  )

  const emailOpen = Boolean(inspect?.emailLogId)
  const eventOpen = Boolean(inspect && !inspect.emailLogId && inspect.kind !== 'email')

  return (
    <>
      <MockVerlaufCard empty={items.length === 0}>
        {items.length === 0 ? (
          <p className="text-sm text-bw-text-muted">{emptyHint}</p>
        ) : (
          <div className="akt-feed">
            <div className="akt-feed__chips" role="group" aria-label="Aktivität filtern">
              {visibleFilters.map((f) => (
                <MockChip
                  key={f.id}
                  active={filter === f.id}
                  count={counts[f.id] ?? 0}
                  icon={f.icon}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </MockChip>
              ))}
            </div>

            {ordered.length === 0 ? (
              <p className="text-sm text-bw-text-muted">Keine Einträge in diesem Filter.</p>
            ) : (
              <div className="akt-feed__list">
                {ordered.map((item) => {
                  const view = verlaufCardView(item)
                  return (
                    <article
                      key={item.id}
                      className={cn(
                        'akt-card',
                        `akt-card--${view.kategorie}`,
                        view.clickable && 'akt-card--clickable'
                      )}
                      role={view.clickable ? 'button' : undefined}
                      tabIndex={view.clickable ? 0 : undefined}
                      onClick={
                        view.clickable
                          ? () => setInspect(item.inspect)
                          : undefined
                      }
                      onKeyDown={
                        view.clickable
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setInspect(item.inspect)
                              }
                            }
                          : undefined
                      }
                    >
                      <div className="akt-card__rail" aria-hidden>
                        <span className="akt-card__dot">
                          <ActionIcon n={KAT_ICON[view.kategorie]} size={14} />
                        </span>
                        <time className="akt-card__date" dateTime={item.inspect?.createdAt ?? undefined}>
                          {view.dateLabel}
                        </time>
                      </div>
                      <div className="akt-card__body">
                        <div className="akt-card__top">
                          <span className="akt-card__badge">{view.badge}</span>
                          {view.clickable ? (
                            <span className="akt-card__hint">Ansehen</span>
                          ) : null}
                        </div>
                        <h3 className="akt-card__title">{view.title}</h3>
                        {view.subtitle ? (
                          <p className="akt-card__sub">{view.subtitle}</p>
                        ) : null}
                        {view.meta.length > 0 ? (
                          <div className="akt-card__meta">
                            {view.meta.map((m) => (
                              <span key={m} className="akt-card__chip">
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </MockVerlaufCard>
      <EmailLogPreviewModal
        emailLogId={emailOpen ? inspect?.emailLogId ?? null : null}
        open={emailOpen}
        onClose={() => setInspect(null)}
      />
      <VerlaufEreignisModal
        target={eventOpen ? inspect : null}
        open={eventOpen}
        onClose={() => setInspect(null)}
      />
    </>
  )
}
