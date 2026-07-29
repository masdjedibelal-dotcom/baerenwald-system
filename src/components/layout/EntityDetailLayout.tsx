'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import { MockDetailCrumb } from '@/components/mock-ui/MockDetailCrumb'
import { NextStepBar, type NextStepMetric } from '@/components/crm/NaechsterSchrittBanner'
import {
  VorgangResolverBanner,
  vorgangResolverBannerVisible,
} from '@/components/vorgang/VorgangResolverBanner'
import { AkteRueckwegChip } from '@/components/vorgang/AkteRueckwegChip'
import { WiedervorlageChip } from '@/components/vorgang/WiedervorlageChip'
import { DetailQuickBar, type QuickBarAction } from '@/components/vorgang/DetailQuickBar'
import type { WiedervorlageEntity } from '@/app/(dashboard)/vorgaenge/wiedervorlage-actions'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { NaechsterSchrittHint } from '@/lib/crm/naechster-schritt'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { getDetailRouteMeta } from '@/lib/detail-route-meta'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  /** @deprecated Display-Phase — Prop bleibt für Aufrufer */
  phase?: VorgangPhase | null
  /** Phasen-Strip AN→AG→AU→RE — im Mock nicht im Header; Verlauf übernimmt das */
  projektKontext?: ProjektKontext | null
  head: DetailHeadProps
  /** Status→Aktion-Hinweis unter dem Kopf */
  nextStep?: NaechsterSchrittHint | null
  nextStepMetrics?: NextStepMetric[]
  onNextStepClick?: () => void
  wiedervorlageDatum?: string | null
  wiedervorlageNotiz?: string | null
  /** Phase 10: Chip editierbar machen */
  wiedervorlageEntity?: WiedervorlageEntity
  wiedervorlageEntityId?: string | null
  onWiedervorlageSaved?: () => void
  wiedervorlageOpen?: boolean
  onWiedervorlageOpenChange?: (open: boolean) => void
  quickBar?: QuickBarAction[]
  breadcrumbTitle?: ReactNode
  crumbBackHref?: string
  crumbBackLabel?: string
  crumbSectionLabel?: string
  /** Kontext-Band zwischen Kopf und NextStep (z. B. Notfall) */
  banner?: ReactNode
  children: ReactNode
  className?: string
}

/** Vorgangs-Detail: Zurück · Kopf · NextStep · QuickBar · Inhalt (ohne Header-Phasenkette). */
export function EntityDetailLayout({
  resolvedVorgang,
  head,
  nextStep,
  nextStepMetrics,
  onNextStepClick,
  wiedervorlageDatum,
  wiedervorlageNotiz,
  wiedervorlageEntity,
  wiedervorlageEntityId,
  onWiedervorlageSaved,
  wiedervorlageOpen,
  onWiedervorlageOpenChange,
  quickBar,
  breadcrumbTitle,
  crumbBackHref,
  crumbBackLabel,
  crumbSectionLabel,
  banner,
  children,
  className,
}: EntityDetailLayoutProps) {
  const pathname = usePathname() ?? '/'
  const routeMeta = getDetailRouteMeta(pathname)
  const isMobile = useIsMobile()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isMobile) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isMobile])

  const backHref = crumbBackHref ?? routeMeta.backHref ?? '/vorgaenge'
  const backLabel = crumbBackLabel ?? 'Zurück zu den Vorgängen'
  const sectionLabel = crumbSectionLabel ?? routeMeta.sectionLabel ?? 'Vorgänge'
  const crumbEntity = breadcrumbTitle ?? head.title
  const showResolver =
    resolvedVorgang != null && vorgangResolverBannerVisible(resolvedVorgang)

  const badges = (
    <>
      <WiedervorlageChip
        datum={wiedervorlageDatum}
        notiz={wiedervorlageNotiz}
        entity={wiedervorlageEntity}
        entityId={wiedervorlageEntityId}
        onSaved={onWiedervorlageSaved}
        open={wiedervorlageOpen}
        onOpenChange={onWiedervorlageOpenChange}
      />
      {head.badges}
    </>
  )

  return (
    <div
      className={cn(
        'detail-entity-page',
        'detail-entity-page--chrome',
        scrolled && 'detail-entity-page--scrolled',
        className ?? 'pb-6'
      )}
    >
      <div className={cn('detail-entity-sticky', scrolled && 'detail-entity-sticky--compact')}>
        <MockDetailCrumb
          backHref={backHref}
          backLabel={backLabel}
          sectionLabel={sectionLabel}
          entityTitle={crumbEntity}
        />
        <AkteRueckwegChip />
        {showResolver ? <VorgangResolverBanner resolved={resolvedVorgang!} /> : null}
        <DetailHead
          {...head}
          badges={badges}
          className={cn(head.className, scrolled && 'shrunk')}
        />
        {banner ? <div className="detail-entity-banner">{banner}</div> : null}
        {!showResolver ? (
          <NextStepBar
            step={nextStep ?? null}
            metrics={nextStepMetrics}
            onStepClick={onNextStepClick}
          />
        ) : null}
        {isMobile && quickBar?.length ? <DetailQuickBar actions={quickBar} /> : null}
      </div>
      <div className="detail-entity-body">{children}</div>
    </div>
  )
}
