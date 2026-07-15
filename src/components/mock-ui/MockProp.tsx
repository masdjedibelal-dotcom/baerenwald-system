'use client'

import type { ReactNode } from 'react'

export function MockProp({ label, children, link }: { label: string; children: ReactNode; link?: boolean }) {
  return (
    <div className="prop">
      <span className="prop-l">{label}</span>
      <span className={link ? 'prop-v link' : 'prop-v'}>{children}</span>
    </div>
  )
}
