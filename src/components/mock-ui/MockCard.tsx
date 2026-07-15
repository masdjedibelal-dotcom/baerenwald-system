'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export function MockCard({
  title,
  icon,
  actions,
  children,
}: {
  title: string
  icon?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title">
          {icon ? <MockIcon n={icon} size={16} /> : null}
          {title}
        </div>
        {actions}
      </div>
      <div className="card-b">{children}</div>
    </div>
  )
}

export function MockCardArrowAction({ onClick }: { onClick: () => void }) {
  return <MockBtn sm kind="ghost" icon="arrow-right" onClick={onClick} />
}
