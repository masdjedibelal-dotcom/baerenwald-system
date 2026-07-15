'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import { MockDetailCrumb } from '@/components/mock-ui/MockDetailCrumb'
import { VorgangResolverBanner } from '@/components/vorgang/VorgangResolverBanner'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import { PHASE_LABELS } from '@/lib/vorgang/vorgang-labels'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { getDetailRouteMeta } from '@/lib/detail-route-meta'

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  phase?: VorgangPhase | null
  head: DetailHeadProps
  breadcrumbTitle?: string
  /** Explizite Crumb-Metadaten (sonst aus phase/breadcrumbTitle abgeleitet) */
  crumbBackHref?: string
  crumbBackLabel?: string
  crumbSectionLabel?: string
  children: ReactNode
  className?: string
}

/** Einheitlicher Vorgangs-/Stammdaten-Detail-Wrapper (Mock: Crumb + detail-head). */
export function EntityDetailLayout({
  resolvedVorgang,
  phase,
  head,
  breadcrumbTitle,
  crumbBackHref,
  crumbBackLabel,
  crumbSectionLabel,
  children,
  className,
}: EntityDetailLayoutProps) {
  const pathname = usePathname() ?? '/'
  const routeMeta = getDetailRouteMeta(pathname)

  const entityTitle = breadcrumbTitle ?? (typeof head.title === 'string' ? head.title : '')
  const sectionLabel = crumbSectionLabel ?? (phase ? PHASE_LABELS[phase] : routeMeta.sectionLabel ?? '')

  const backHref = crumbBackHref ?? routeMeta.backHref ?? '/'
  const backLabel = crumbBackLabel ?? routeMeta.backLabel ?? 'Zurück'
  const crumbLabel = sectionLabel

  const showCrumb = Boolean(entityTitle && crumbLabel)

  return (
    <div className={className ?? 'pb-6'}>
      {showCrumb ? (
        <MockDetailCrumb
          backHref={backHref}
          backLabel={backLabel}
          sectionLabel={crumbLabel}
          entityTitle={entityTitle}
        />
      ) : null}
      {resolvedVorgang ? <VorgangResolverBanner resolved={resolvedVorgang} /> : null}
      <DetailHead {...head} />
      {children}
    </div>
  )
}
