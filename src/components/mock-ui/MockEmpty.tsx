'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'

/**
 * Kanonischer Empty-State für Listen & Detail-Tabs.
 * Legacy `EmptyState` (ui/layout) wrappt diese Komponente.
 */
export function MockEmpty({
  icon = 'folder-open',
  title,
  hint,
  action,
}: {
  /** Mock-Icon-Name oder eigenes Icon-Node (z. B. Lucide). */
  icon?: string | ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty" style={{ padding: '48px 24px' }}>
      <div style={{ marginBottom: 8, opacity: 0.45 }}>
        {typeof icon === 'string' ? <MockIcon ctx="empty" n={icon} size={32} /> : icon}
      </div>
      <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
      {hint ? <div style={{ fontSize: 'var(--fs-meta)' }}>{hint}</div> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  )
}
