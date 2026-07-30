'use client'

import type { ReactNode } from 'react'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import {
  VorgangResolverBanner,
  vorgangResolverBannerVisible,
} from '@/components/vorgang/VorgangResolverBanner'
import { AkteRueckwegChip } from '@/components/vorgang/AkteRueckwegChip'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { DetailQuickBar, type QuickBarAction } from '@/components/vorgang/DetailQuickBar'
import type { WiedervorlageEntity } from '@/app/(dashboard)/vorgaenge/wiedervorlage-actions'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { useIsMobile } from '@/hooks/useIsMobile'
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
  /** @deprecated WV-Pill entfernt — Props bleiben für Aufrufer-Kompatibilität */
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
 * Vorgangs-Detail: Hero (nicht sticky) · QuickBar scrollt mit · Tabs sticky · Cards darunter.
 */
export function EntityDetailLayout({
  resolvedVorgang,
  head,
  quickBar,
  crumbBackHref,
  crumbBackLabel = 'Zurück zu den Suchergebnissen',
  banner,
  children,
  className,
}: EntityDetailLayoutProps) {
  const isMobile = useIsMobile()

  const showResolver =
    resolvedVorgang != null && vorgangResolverBannerVisible(resolvedVorgang)

  return (
    <div className={cn('detail-entity-page', 'detail-entity-page--chrome', className ?? 'pb-6')}>
      <div className="detail-entity-hero">
        <div className="detail-entity-toprow">
          {crumbBackHref ? (
            <MockDetailBackLink href={crumbBackHref} label={crumbBackLabel} />
          ) : (
            <span className="detail-entity-toprow__spacer" aria-hidden />
          )}
          <div className="detail-entity-toprow__actions">
            <span id="detail-entity-top-overflow" className="detail-entity-top-overflow" />
          </div>
        </div>
        <AkteRueckwegChip />
        {showResolver ? <VorgangResolverBanner resolved={resolvedVorgang!} /> : null}
        <DetailHead
          title={head.title}
          badges={head.badges}
          titleBadges={head.titleBadges}
          titleTrailing={isMobile ? undefined : head.titleTrailing}
          meta={undefined}
          sub={undefined}
          actions={head.actions}
          variant={head.variant}
          className={head.className}
        />
        {banner ? <div className="detail-entity-banner">{banner}</div> : null}
        {isMobile && quickBar?.length ? <DetailQuickBar actions={quickBar} /> : null}
      </div>
      <div className="detail-entity-body">{children}</div>
    </div>
  )
}
