'use client'

import { useMemo } from 'react'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import type { AuftragDetail, LeadTimelineRow } from '@/lib/types'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { formatDatumZeit, formatRelativeDate } from '@/lib/utils'

type LeadTimelineOptions = {
  fallbackCreatedAt?: string
  fallbackCreatedLabel?: string
}

export function buildLeadTimelineItems(
  events: LeadTimelineRow[],
  { fallbackCreatedAt, fallbackCreatedLabel }: LeadTimelineOptions = {}
): TimelineItem[] {
  const sorted = sortTimelineByCreatedAtAsc(events)
  if (sorted.length) {
    return sorted.map((ev) => ({
      id: ev.id,
      text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      time: formatRelativeDate(ev.created_at),
      state: 'done' as const,
    }))
  }
  if (fallbackCreatedAt && fallbackCreatedLabel) {
    return [
      {
        id: 'created',
        text: fallbackCreatedLabel,
        time: formatRelativeDate(fallbackCreatedAt),
        state: 'done' as const,
      },
    ]
  }
  return []
}

export function buildAuftragTimelineItems(
  detail: AuftragDetail,
  leadTimeline: LeadTimelineRow[] = []
): TimelineItem[] {
  const auftragTimeline = sortTimelineByCreatedAtAsc(detail.auftrag_timeline ?? [])
  const leadEvents = (leadTimeline ?? []).map((ev) => ({
    id: `lead-${ev.id}`,
    text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
    time: formatRelativeDate(ev.created_at),
    state: 'done' as const,
    ts: new Date(ev.created_at).getTime(),
  }))
  const auftragEvents = auftragTimeline.map((ev) => ({
    id: ev.id,
    text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
    time: formatRelativeDate(ev.created_at),
    state: 'done' as const,
    ts: new Date(ev.created_at).getTime(),
  }))
  const merged = [...leadEvents, ...auftragEvents].sort((a, b) => a.ts - b.ts)
  if (merged.length) {
    return merged.map(({ id, text, time, state }) => ({ id, text, time, state }))
  }
  return [
    {
      id: 'created',
      text: `Auftrag erstellt am ${formatDatumZeit(detail.created_at)}`,
      time: formatRelativeDate(detail.created_at),
      state: 'done' as const,
    },
  ]
}

/** Einheitliche Timeline-Darstellung (nur informativ, nicht klickbar). */
export function EntityTimeline({ items }: { items: TimelineItem[] }) {
  return <Timeline items={items} />
}

export function LeadEntityTimeline({
  events,
  fallbackCreatedAt,
  fallbackCreatedLabel,
}: {
  events: LeadTimelineRow[]
  fallbackCreatedAt?: string
  fallbackCreatedLabel?: string
}) {
  const items = useMemo(
    () =>
      buildLeadTimelineItems(events, {
        fallbackCreatedAt,
        fallbackCreatedLabel,
      }),
    [events, fallbackCreatedAt, fallbackCreatedLabel]
  )

  return <EntityTimeline items={items} />
}

export function AuftragEntityTimeline({
  detail,
  leadTimeline = [],
}: {
  detail: AuftragDetail
  leadTimeline?: LeadTimelineRow[]
}) {
  const items = useMemo(
    () => buildAuftragTimelineItems(detail, leadTimeline),
    [detail, leadTimeline]
  )

  return <EntityTimeline items={items} />
}
