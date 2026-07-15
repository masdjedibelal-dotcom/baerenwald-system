'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'

export function MockEmpty({
  icon = 'folder-open',
  title,
  hint,
}: {
  icon?: string
  title: string
  hint?: string
}) {
  return (
    <div className="empty" style={{ padding: '48px 24px' }}>
      <div style={{ marginBottom: 8, opacity: 0.45 }}>
        <MockIcon n={icon} size={32} />
      </div>
      <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
      {hint ? <div style={{ fontSize: 12.5 }}>{hint}</div> : null}
    </div>
  )
}
