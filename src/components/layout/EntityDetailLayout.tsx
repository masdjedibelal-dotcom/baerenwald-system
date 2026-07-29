'use client'

import { useEffect, type ReactNode } from 'react'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import {
  VorgangResolverBanner,
  vorgangResolverBannerVisible,
} from '@/components/vorgang/VorgangResolverBanner'
import { AkteRueckwegChip } from '@/components/vorgang/AkteRueckwegChip'
import { WiedervorlageChip } from '@/components/vorgang/WiedervorlageChip'
import { DetailQuickBar, type QuickBarAction } from '@/components/vorgang/DetailQuickBar'
import type { WiedervorlageEntity } from '@/app/(dashboard)/vorgaenge/wiedervorlage-actions'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMobileScrollChrome } from '@/hooks/useMobileScrollChrome'
import { cn } from '@/lib/utils'

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  /** @deprecated Display-Phase — Prop bleibt für Aufrufer */
  phase?: VorgangPhase | null
  /** @deprecated Phasen-Strip — nicht mehr im Header */
  projektKontext?: ProjektKontext | null
  head: DetailHeadProps
  /**
   * @deprecated Next-Step-Card ist entfernt (Mobil + Desktop) und wird nicht wieder gerendert.
   * Props bleiben nur, damit bestehende Aufrufer typechecken — Werte werden ignoriert.
   */
  nextStep?: unknown
  /** @deprecated ignoriert — Next-Step entfernt */
  nextStepMetrics?: unknown
  /** @deprecated ignoriert — Next-Step entfernt */
  onNextStepClick?: () => void
  wiedervorlageDatum?: string | null
  wiedervorlageNotiz?: string | null
  wiedervorlageEntity?: WiedervorlageEntity
  wiedervorlageEntityId?: string | null
  onWiedervorlageSaved?: () => void
  wiedervorlageOpen?: boolean
  onWiedervorlageOpenChange?: (open: boolean) => void
  quickBar?: QuickBarAction[]
  /** @deprecated Breadcrumb entfernt */
  breadcrumbTitle?: ReactNode
  crumbBackHref?: string
  crumbBackLabel?: string
  crumbSectionLabel?: string
  /** Kontext-Band (z. B. Notfall) */
  banner?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Vorgangs-Detail: kompakter Kopf · QuickBar (Mobil, nur oben) · Inhalt.
 * Beim Scrollen: nur Titel + Status sticky — Quickbar/Meta/Banner weg.
 */
export function EntityDetailLayout({
  resolvedVorgang,
  head,
  wiedervorlageDatum,
  wiedervorlageNotiz,
  wiedervorlageEntity,
  wiedervorlageEntityId,
  onWiedervorlageSaved,
  wiedervorlageOpen,
  onWiedervorlageOpenChange,
  quickBar,
  banner,
  children,
  className,
}: EntityDetailLayoutProps) {
  const isMobile = useIsMobile()
  const { scrolled } = useMobileScrollChrome(isMobile)

  useEffect(() => {
    if (!isMobile) return
    document.documentElement.classList.toggle('bw-detail-scrolled', scrolled)
    return () => document.documentElement.classList.remove('bw-detail-scrolled')
  }, [isMobile, scrolled])

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
        {!scrolled ? <AkteRueckwegChip /> : null}
        {showResolver && !scrolled ? (
          <VorgangResolverBanner resolved={resolvedVorgang!} />
        ) : null}
        <DetailHead
          title={head.title}
          badges={scrolled ? undefined : badges}
          titleBadges={
            scrolled ? (
              <>
                {head.titleBadges}
                {badges}
              </>
            ) : (
              head.titleBadges
            )
          }
          meta={scrolled ? undefined : head.meta}
          actions={head.actions}
          variant={head.variant}
          className={cn(head.className, scrolled && 'shrunk')}
        />
        {!scrolled && banner ? <div className="detail-entity-banner">{banner}</div> : null}
        {isMobile && !scrolled && quickBar?.length ? (
          <DetailQuickBar actions={quickBar} />
        ) : null}
      </div>
      <div className="detail-entity-body">{children}</div>
    </div>
  )
}
