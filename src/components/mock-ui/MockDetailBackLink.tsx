'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/** Nur Zurück-Link — ohne Brotkrumen-Pfad. */
export function MockDetailBackLink({
  href,
  label = 'Zurück zu den Suchergebnissen',
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <nav aria-label="Zurück" className={cn('mock-detail-back', className)}>
      <Link href={href} className="mock-detail-back__link link">
        <MockIcon ctx="nav" n="arrow-left" size={15} />
        {label}
      </Link>
    </nav>
  )
}
