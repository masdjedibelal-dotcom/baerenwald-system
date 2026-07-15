'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export function MockDetailCrumb({
  backHref,
  backLabel,
  sectionLabel,
  entityTitle,
}: {
  backHref: string
  backLabel: string
  sectionLabel: string
  entityTitle: ReactNode
}) {
  return (
    <nav
      className="detail-crumb"
      aria-label="Brotkrumen"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
        marginBottom: 14,
        fontSize: 13,
      }}
    >
      <Link
        href={backHref}
        className="link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--green)',
          fontWeight: 500,
        }}
      >
        <MockIcon n="arrow-left" size={15} />
        {backLabel}
      </Link>
      <span style={{ color: 'var(--text-3)', minWidth: 0 }}>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        <Link href={backHref} className="link" style={{ cursor: 'pointer' }}>
          {sectionLabel}
        </Link>{' '}
        <span style={{ color: 'var(--text-4)' }}>›</span>{' '}
        <b style={{ color: 'var(--text)' }}>{entityTitle}</b>
      </span>
    </nav>
  )
}
