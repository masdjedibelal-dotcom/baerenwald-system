'use client'

import type { ReactNode } from 'react'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import { VorgangResolverBanner } from '@/components/vorgang/VorgangResolverBanner'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import { PHASE_LABELS } from '@/lib/vorgang/vorgang-labels'
import type { VorgangPhase } from '@/lib/vorgang/types'

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  phase?: VorgangPhase | null
  head: DetailHeadProps
  breadcrumbTitle?: string
  children: ReactNode
  className?: string
}

/** Einheitlicher Vorgangs-Detail-Wrapper (Spec §3 Header + Banner). */
export function EntityDetailLayout({
  resolvedVorgang,
  phase,
  head,
  breadcrumbTitle,
  children,
  className,
}: EntityDetailLayoutProps) {
  const breadcrumb =
    phase && breadcrumbTitle ? (
      <span className="text-xs text-bw-text-muted">
        Zurück zu den Vorgängen · {PHASE_LABELS[phase]} › {breadcrumbTitle}
      </span>
    ) : null

  return (
    <div className={className ?? 'space-y-4 pb-6'}>
      {resolvedVorgang ? <VorgangResolverBanner resolved={resolvedVorgang} /> : null}
      <DetailHead {...head} breadcrumb={breadcrumb} />
      {children}
    </div>
  )
}
