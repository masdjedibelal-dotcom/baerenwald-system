'use client'

import { useMemo, useState } from 'react'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import type { AuftragDetail, LeadTimelineRow } from '@/lib/types'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { formatDatumZeit, formatRelativeDate } from '@/lib/utils'

type LeadTimelineOptions = {
  fallbackCreatedAt?: string
  fallbackCreatedLabel?: string
  onEmailPreview?: (emailLogId: string) => void
}

export function buildLeadTimelineItems(
  events: LeadTimelineRow[],
  { fallbackCreatedAt, fallbackCreatedLabel, onEmailPreview }: LeadTimelineOptions = {}
): TimelineItem[] {
  const sorted = sortTimelineByCreatedAtAsc(events)
  if (sorted.length) {
    return sorted.map((ev) => ({
      id: ev.id,
      text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      time: formatRelativeDate(ev.created_at),
      state: 'done' as const,
      linkLabel: ev.email_log_id ? 'E-Mail ansehen' : undefined,
      onLinkClick:
        ev.email_log_id && onEmailPreview ? () => onEmailPreview(ev.email_log_id!) : undefined,
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

type EntityTimelineProps = {
  items: TimelineItem[]
  withEmailPreview?: boolean
}

/** Einheitliche Timeline-Darstellung mit optionalem E-Mail-Vorschau-Modal. */
export function EntityTimeline({ items, withEmailPreview = false }: EntityTimelineProps) {
  const [previewId, setPreviewId] = useState<string | null>(null)

  return (
    <>
      <Timeline items={items} />
      {withEmailPreview ? (
        <EmailLogPreviewModal
          emailLogId={previewId}
          open={Boolean(previewId)}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </>
  )
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
  const [previewId, setPreviewId] = useState<string | null>(null)

  const items = useMemo(
    () =>
      buildLeadTimelineItems(events, {
        fallbackCreatedAt,
        fallbackCreatedLabel,
        onEmailPreview: (id) => setPreviewId(id),
      }),
    [events, fallbackCreatedAt, fallbackCreatedLabel]
  )

  return (
    <>
      <EntityTimeline items={items} />
      <EmailLogPreviewModal
        emailLogId={previewId}
        open={Boolean(previewId)}
        onClose={() => setPreviewId(null)}
      />
    </>
  )
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
