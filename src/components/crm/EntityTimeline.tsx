'use client'

import { useMemo } from 'react'
import { VerlaufPanel } from '@/components/crm/VerlaufPanel'
import {
  buildAuftragVerlaufItems,
  buildLeadVerlaufItems,
  type VerlaufBuiltItem,
} from '@/lib/crm/verlauf'
import type { AuftragDetail, LeadTimelineRow } from '@/lib/types'
import { formatDatumZeit } from '@/lib/utils'

type LeadTimelineOptions = {
  fallbackCreatedAt?: string
  fallbackCreatedLabel?: string
  /** Offene nächste Schritte (nicht klickbar) */
  openSteps?: VerlaufBuiltItem[]
}

export function buildLeadTimelineItems(
  events: LeadTimelineRow[],
  { fallbackCreatedAt, fallbackCreatedLabel }: LeadTimelineOptions = {}
) {
  return buildLeadVerlaufItems(events, { fallbackCreatedAt, fallbackCreatedLabel })
}

export function buildAuftragTimelineItems(
  detail: AuftragDetail,
  leadTimeline: LeadTimelineRow[] = []
) {
  const items = buildAuftragVerlaufItems(detail.auftrag_timeline ?? [], leadTimeline)
  if (items.length) return items
  return buildLeadVerlaufItems([], {
    fallbackCreatedAt: detail.created_at,
    fallbackCreatedLabel: `Auftrag erstellt am ${formatDatumZeit(detail.created_at)}`,
  })
}

/** @deprecated Nutze VerlaufPanel — bleibt für Imports. */
export function EntityTimeline({ items }: { items: VerlaufBuiltItem[] }) {
  return <VerlaufPanel items={items} />
}

export function LeadEntityTimeline({
  events,
  fallbackCreatedAt,
  fallbackCreatedLabel,
  openSteps = [],
}: {
  events: LeadTimelineRow[]
  fallbackCreatedAt?: string
  fallbackCreatedLabel?: string
  openSteps?: VerlaufBuiltItem[]
}) {
  const items = useMemo(() => {
    const base = buildLeadVerlaufItems(events, {
      fallbackCreatedAt,
      fallbackCreatedLabel,
    })
    return [...base, ...openSteps]
  }, [events, fallbackCreatedAt, fallbackCreatedLabel, openSteps])

  return <VerlaufPanel items={items} />
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

  return <VerlaufPanel items={items} />
}
