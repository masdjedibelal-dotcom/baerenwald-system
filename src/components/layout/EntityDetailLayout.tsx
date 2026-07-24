'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { VorgangPhasenDiagramm } from '@/components/crm/VorgangPhasenDiagramm'
import { NaechsterSchrittBanner } from '@/components/crm/NaechsterSchrittBanner'
import { VorgangResolverBanner } from '@/components/vorgang/VorgangResolverBanner'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { NaechsterSchrittHint } from '@/lib/crm/naechster-schritt'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { getDetailRouteMeta } from '@/lib/detail-route-meta'
import { cn } from '@/lib/utils'

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  phase?: VorgangPhase | null
  projektKontext?: ProjektKontext | null
  head: DetailHeadProps
  /** Status→Aktion-Hinweis unter dem Kopf */
  nextStep?: NaechsterSchrittHint | null
  /** @deprecated nur noch für Fallback-Titel; Crumb-Pfad entfernt */
  breadcrumbTitle?: string
  crumbBackHref?: string
  crumbBackLabel?: string
  /** @deprecated ignoriert — kein Section-Crumb mehr */
  crumbSectionLabel?: string
  children: ReactNode
  className?: string
}

/** Vorgangs-Detail: Zurück-Link · Kopf (Titel/Status/Kunde) · Phasen-Diagramm · Inhalt. */
export function EntityDetailLayout({
  resolvedVorgang,
  phase,
  projektKontext,
  head,
  nextStep,
  crumbBackHref,
  crumbBackLabel,
  children,
  className,
}: EntityDetailLayoutProps) {
  const pathname = usePathname() ?? '/'
  const routeMeta = getDetailRouteMeta(pathname)

  const backHref = crumbBackHref ?? routeMeta.backHref ?? '/vorgaenge'
  const backLabel = crumbBackLabel ?? 'Zurück zu den Suchergebnissen'

  return (
    <div className={cn('detail-entity-page', className ?? 'pb-6')}>
      <MockDetailBackLink href={backHref} label={backLabel} />
      {resolvedVorgang ? <VorgangResolverBanner resolved={resolvedVorgang} /> : null}
      <DetailHead {...head} />
      <NaechsterSchrittBanner step={nextStep ?? null} />
      {phase ? (
        <VorgangPhasenDiagramm
          className="hidden md:block"
          activePhase={phase}
          projektKontext={projektKontext}
        />
      ) : null}
      {children}
    </div>
  )
}
