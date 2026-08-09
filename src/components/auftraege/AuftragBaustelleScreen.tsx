'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AppFlowScreen } from '@/components/layout/app'

export function AuftragBaustelleScreen({
  auftragId,
  title,
  subtitle = 'Baustelle',
  children,
  footer,
}: {
  auftragId: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <AppFlowScreen
      header={
        <div className="flex items-center gap-3">
          <Link
            href={`/auftraege/${auftragId}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-bw-border bg-bw-bg text-bw-text-muted hover:bg-bw-hover"
            aria-label="Zurück zum Auftrag"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-bw-text-muted">{subtitle}</p>
            <h1 className="truncate text-base font-semibold text-bw-text">{title}</h1>
          </div>
        </div>
      }
      footer={footer}
    >
      {children}
    </AppFlowScreen>
  )
}
