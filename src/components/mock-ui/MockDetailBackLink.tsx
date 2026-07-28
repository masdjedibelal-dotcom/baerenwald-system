'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'

/** Nur Zurück-Link — ohne Brotkrumen-Pfad. */
export function MockDetailBackLink({
  href,
  label = 'Zurück zu den Suchergebnissen',
}: {
  href: string
  label?: string
}) {
  return (
    <nav aria-label="Zurück" style={{ marginBottom: 14 }}>
      <Link
        href={href}
        className="link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--green)',
          fontWeight: 500,
          fontSize: 'var(--fs-text)',
        }}
      >
        <MockIcon ctx="nav" n="arrow-left" size={15} />
        {label}
      </Link>
    </nav>
  )
}
