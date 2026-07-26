'use client'

import { useMemo, useState } from 'react'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import { MockVerlaufCard } from '@/components/mock-ui/MockDetailCards'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import { VerlaufEreignisModal } from '@/components/crm/VerlaufEreignisModal'
import type { VerlaufBuiltItem, VerlaufInspectTarget } from '@/lib/crm/verlauf'

export function VerlaufPanel({
  items,
  emptyHint = 'Noch keine relevanten Ereignisse.',
}: {
  items: VerlaufBuiltItem[]
  emptyHint?: string
}) {
  const [inspect, setInspect] = useState<VerlaufInspectTarget | null>(null)

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        text: item.text,
        time: item.time,
        state: item.state,
        inspectable: Boolean(item.inspect) && item.state !== 'open',
        onClick:
          item.inspect && item.state !== 'open'
            ? () => setInspect(item.inspect)
            : undefined,
      })),
    [items]
  )

  const emailOpen = inspect?.kind === 'email'
  const eventOpen = Boolean(inspect && inspect.kind !== 'email')

  return (
    <>
      <MockVerlaufCard empty={timelineItems.length === 0}>
        {timelineItems.length === 0 ? (
          <p className="text-sm text-bw-text-muted">{emptyHint}</p>
        ) : (
          <Timeline items={timelineItems} />
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
