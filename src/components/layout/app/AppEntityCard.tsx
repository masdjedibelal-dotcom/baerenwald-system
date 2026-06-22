'use client'

import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Lose Listen-Karte (iOS grouped list style). */
export function AppEntityCard({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <li className="list-none">
      <button type="button" className={cn('app-entity-card', className)} {...props}>
        {children}
      </button>
    </li>
  )
}

export function AppEntityCardLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <li className="list-none">
      <Link href={href} className={cn('app-entity-card', className)}>
        {children}
      </Link>
    </li>
  )
}
