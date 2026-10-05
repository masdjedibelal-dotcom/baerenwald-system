'use client'

import { MockBtn } from '@/components/mock-ui'

import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { MockTabs } from '@/components/mock-ui/MockTabs'
import type { ReactNode,TouchEvent } from 'react'
import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import { usePathname,useSearchParams } from 'next/navigation'
import { DetailMobileTopSlotProvider } from '@/components/layout/detail-mobile-top-slot'
import {
VorgangResolverBanner,
vorgangResolverBannerVisible,
} from '@/components/vorgang/VorgangResolverBanner'
import { AkteRueckwegChip } from '@/components/vorgang/AkteRueckwegChip'
import { DetailQuickBar,type QuickBarAction } from '@/components/vorgang/DetailQuickBar'
import { PhaseStrip } from '@/components/vorgang/PhaseStrip'
import type { VorgangPhasenExtras } from '@/components/vorgang/VorgangPhasenVerlauf'
import type { AkteFromRef } from '@/lib/vorgang/akte-from'
import type { LeadDetail } from '@/lib/types'
import type { WiedervorlageEntity } from '@/app/(dashboard)/vorgaenge/wiedervorlage-actions'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { parseAkteFromParam } from '@/lib/vorgang/akte-from'
import {
defaultListHrefForDetail,
parseReturn,
} from '@/lib/list-return-url'
import type { MockIconName } from '@/lib/mock-icons'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

/* ─── DetailHead (inline) ─────────────────────────────────────────────── */

export type DetailHeadProps = {
  /** @deprecated Zurück nur über TopBar (mobil) / Master-Detail — wird nicht mehr gerendert */
  backHref?: string
  backLabel?: string
  title: ReactNode
  sub?: ReactNode
  /** Meta-Zeile (.dh-meta) — Badges gehören hierhin (inline), nicht darunter */
  meta?: ReactNode
  badges?: ReactNode
  /** Badges direkt neben dem Titel (Mock: Freigabe) */
  titleBadges?: ReactNode
  /** Icon-Aktionen rechts im Titel (z. B. Portal-Login) — immer sichtbar, nicht im ⋯ */
  titleTrailing?: ReactNode
  actions?: ReactNode
  /** P21: Betrag im Kopf (z. B. „23.800 €“) */
  amount?: ReactNode
  /** P21: ein Satz „Was als Nächstes zu tun ist“ — Knopf dazu ist die Haupt-Aktion */
  nextStep?: string | null
  /** Stärkerer Projekt-Kopf mit Trennlinie */
  variant?: 'default' | 'project'
  className?: string
}

/** Kompakter Detail-Kopf: Titel + Badges/Meta (Mock `.vgid` / `.detail-head`). */
export function DetailHead({
  title,
  sub,
  meta,
  badges,
  titleBadges,
  titleTrailing,
  actions,
  amount,
  variant = 'project',
  className,
}: DetailHeadProps) {
  const hasMetaRow = Boolean(badges || meta || amount)

  return (
    <header className={cn('detail-head', variant === 'project' && 'detail-head--project', className)}>
      <div className="detail-head-main vgid min-w-0 flex-1">
        <div className="dh-titlerow">
          <div className="dh-title vgid-name">{title}</div>
          {titleBadges ? <div className="dh-title-badges">{titleBadges}</div> : null}
          {titleTrailing ? (
            <div className="dh-title-trailing ml-auto flex shrink-0 items-center gap-1">
              {titleTrailing}
            </div>
          ) : null}
        </div>
        {hasMetaRow ? (
          <div className="dh-meta vgid-meta">
            {badges}
            {amount ? <span className="dh-amount">{amount}</span> : null}
            {(badges || amount) && meta ? <span className="sep" aria-hidden>
              ·
            </span> : null}
            {meta}
          </div>
        ) : null}
        {sub ? <div className="detail-head-sub">{sub}</div> : null}
      </div>

      {actions ? <div className="detail-head-actions min-w-0">{actions}</div> : null}
    </header>
  )
}

/* ─── DetailShell (ex mock-ui/DetailShell) ─────────────────────────────── */

export type DetailShellGroup = {
  id: string
  label: string
  icon: MockIconName | string
  count?: number
  render: () => ReactNode
}

export type DetailShellProps = {
  groups: DetailShellGroup[]
  value: string
  onChange: (id: string) => void
  className?: string
}

const SWIPE_MIN_DX = 56
const SWIPE_RATIO = 1.35

function touchBlockedByNestedScroll(target: EventTarget | null, boundary: HTMLElement | null): boolean {
  let node = target as HTMLElement | null
  while (node && node !== boundary) {
    if (node.classList?.contains('swiperow')) return true
    const ox = getComputedStyle(node).overflowX
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 8) {
      return true
    }
    node = node.parentElement
  }
  return false
}

/**
 * Spec §4: Desktop Nav links · Mobil horizontale Tabs (sticky) + Swipe zwischen Tabs.
 * Unbekannter `value` → erster Tab (kein leerer Bereich).
 */
export function DetailShell({ groups, value, onChange, className }: DetailShellProps) {
  const isMobile = useIsMobile()
  const active = groups.find((g) => g.id === value) ?? groups[0]
  const bodyRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLElement>(null)
  const swipeRef = useRef<{ x: number; y: number; blocked: boolean } | null>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = 0
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [value])

  useEffect(() => {
    if (!isMobile || !tabsRef.current || !active) return
    const btn = tabsRef.current.querySelector<HTMLElement>(`[data-tab-id="${active.id}"]`)
    btn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [active, isMobile])

  const goRelative = useCallback(
    (dir: -1 | 1) => {
      if (!groups.length || !active) return
      const idx = groups.findIndex((g) => g.id === active.id)
      if (idx < 0) return
      const next = groups[idx + dir]
      if (next) onChange(next.id)
    },
    [active, groups, onChange]
  )

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isMobile) return
      const t = e.touches[0]
      if (!t) return
      const blocked = touchBlockedByNestedScroll(e.target, bodyRef.current)
      swipeRef.current = { x: t.clientX, y: t.clientY, blocked }
    },
    [isMobile]
  )

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!isMobile) return
      const start = swipeRef.current
      swipeRef.current = null
      if (!start || start.blocked) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dx) < SWIPE_MIN_DX) return
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
      // Swipe links → nächster Tab · rechts → vorheriger
      goRelative(dx < 0 ? 1 : -1)
    },
    [goRelative, isMobile]
  )

  if (!groups.length) {
    return (
      <div className={cn('dshell', className)}>
        <div className="dshell-body p-4 text-[length:var(--fs-text)] text-bw-text-muted">Kein Bereich verfügbar.</div>
      </div>
    )
  }

  return (
    <div className={cn('dshell', isMobile && 'dshell--tabs-mobile', className)}>
      <MockTabs
        ref={tabsRef}
        items={groups.map((gr) => ({
          id: gr.id,
          label: gr.label,
          icon: gr.icon,
          count: !isMobile && gr.count != null ? gr.count : undefined,
        }))}
        value={active?.id ?? value}
        onChange={onChange}
        aria-label="Bereiche"
        className={isMobile ? 'dshell-tabs-mobile' : 'dshell-nav'}
        tabClassName={isMobile ? 'dshell-tab-mobile' : 'dshell-navitem'}
        activeClassName="active"
        iconCtx="nav"
        showIcons={!isMobile}
      />
      <div
        className="dshell-body"
        ref={bodyRef}
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        onTouchCancel={isMobile ? () => { swipeRef.current = null } : undefined}
      >
        <div className="dshell-group active">
          <div className="dshell-cards">{active ? active.render() : null}</div>
        </div>
      </div>
    </div>
  )
}

/* ─── EntityDetailLayout ──────────────────────────────────────────────── */

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  /** @deprecated Display-Phase — Prop bleibt für Aufrufer */
  phase?: VorgangPhase | null
  /** Phasenleiste oben (Pfeil-Schritte); Klick öffnet die Details der Phase im Blatt */
  projektKontext?: ProjektKontext | null
  /** Für die Details im Phasen-Blatt (Anfrage-Angaben, Auftrag/Rechnung-Zusatz) */
  phaseLead?: LeadDetail | null
  phaseExtras?: VorgangPhasenExtras
  phaseFrom?: AkteFromRef | null
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
  projektKontext,
  phaseLead,
  phaseExtras,
  phaseFrom,
  head,
  quickBar,
  crumbBackHref,
  crumbBackLabel = 'Zurück',
  banner,
  children,
  className,
}: EntityDetailLayoutProps) {
  const isMobile = useIsMobile()
  const [topOverflowHost, setTopOverflowHost] = useState<HTMLElement | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fromRef = useMemo(
    () => parseAkteFromParam(searchParams.get('from')),
    [searchParams]
  )
  const resolvedBackHref = useMemo(() => {
    const fallback = crumbBackHref ?? defaultListHrefForDetail(pathname)
    return parseReturn(searchParams, fallback)
  }, [searchParams, crumbBackHref, pathname])

  const vorOrt = projektKontext?.ort || projektKontext?.partner?.length ? (
            <div className="dh-vorort">
              {projektKontext.ort ? (
                <a
                  className="dh-vorort__adresse"
                  href={`https://maps.apple.com/?q=${encodeURIComponent(projektKontext.ort)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="In Karten öffnen"
                >
                  <MockIcon ctx="default" n="map-pin" size={14} />
                  <span>{projektKontext.ort}</span>
                </a>
              ) : null}
              {(projektKontext.partner ?? []).map((p) => (
                <span key={p} className="dh-vorort__partner" title="Partner">
                  <MockIcon ctx="default" n="tool" size={13} />
                  {p}
                </span>
              ))}
            </div>
          ) : null

  const waAktion = quickBar?.find((a) => a.id === 'whatsapp') ?? null
  const showResolver =
    resolvedVorgang != null && vorgangResolverBannerVisible(resolvedVorgang)

  return (
    <DetailMobileTopSlotProvider host={topOverflowHost}>
      <div className={cn('detail-entity-page', 'detail-entity-page--chrome', className ?? 'pb-6')}>
        <div className="detail-entity-hero">
          <div className="detail-entity-toprow">
            {fromRef ? (
              <AkteRueckwegChip />
            ) : resolvedBackHref ? (
              <MockDetailBackLink href={resolvedBackHref} label={crumbBackLabel} />
            ) : (
              <span className="detail-entity-toprow__spacer" aria-hidden />
            )}
            {/* Desktop hat keine Schnellaktionsleiste — Sprung ins Postfach „Nachrichten“ hier oben */}
            {!isMobile && waAktion ? (
              <MockBtn sm kind="secondary" icon="brand-whatsapp" className="detail-entity-toprow__wa" onClick={waAktion.onClick}>
                WhatsApp
              </MockBtn>
            ) : null}
            <div className="detail-entity-toprow__actions">
              <span
                ref={setTopOverflowHost}
                id="detail-entity-top-overflow"
                className="detail-entity-top-overflow"
              />
            </div>
          </div>
          {showResolver ? <VorgangResolverBanner resolved={resolvedVorgang!} /> : null}
          {/* P22: ein Vorgang — Phasenleiste Anfrage → Angebot → Auftrag → Rechnung */}
          {projektKontext ? <PhaseStrip kontext={projektKontext} lead={phaseLead} extras={phaseExtras} fromRef={phaseFrom} className="detail-phase-bar" /> : null}
          <DetailHead
            title={head.title}
            badges={head.badges}
            titleBadges={head.titleBadges}
            titleTrailing={isMobile ? undefined : head.titleTrailing}
            meta={undefined}
            sub={vorOrt}
            actions={head.actions}
            amount={head.amount}
            variant={head.variant}
            className={head.className}
          />
          {banner ? <div className="detail-entity-banner">{banner}</div> : null}
          {isMobile && quickBar?.length ? <DetailQuickBar actions={quickBar} /> : null}
        </div>
        <div className="detail-entity-body">{children}</div>
      </div>
    </DetailMobileTopSlotProvider>
  )
}
