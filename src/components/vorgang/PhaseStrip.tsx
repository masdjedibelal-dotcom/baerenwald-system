'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { hideRouteBusy, showRouteBusy } from '@/components/ui/action-busy'
import {
  buildPhaseRows,
  type PhaseKind,
  type VorgangPhasenExtras,
} from '@/components/vorgang/VorgangPhasenVerlauf'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import { hrefWithAkteFrom, type AkteFromRef } from '@/lib/vorgang/akte-from'
import type { LeadDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Phasenleiste Anfrage → Angebot → Auftrag → Rechnung als Pfeil-Schritte.
 * Erledigt = grün mit Haken, aktuell = kräftig, noch nicht erstellt = hell (nicht klickbar).
 * Klick öffnet die Details der Phase im Blatt (zum Nachlesen); „… öffnen“ springt dorthin.
 */
export function PhaseStrip({
  kontext,
  lead,
  extras,
  fromRef,
  className,
}: {
  kontext: ProjektKontext
  lead?: LeadDetail | null
  extras?: VorgangPhasenExtras
  /** Seite, auf der die Leiste steht (für „Zur Phase“ und den Rückweg) */
  fromRef?: AkteFromRef | null
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const [offen, setOffen] = useState<PhaseKind | null>(null)
  const [navBusy, setNavBusy] = useState(false)

  const aktivKind = kontext.activeKind
  const hier: PhaseKind | null =
    fromRef?.kind
      ? fromRef.kind
      : aktivKind === 'anfrage' || aktivKind === 'angebot' || aktivKind === 'auftrag' || aktivKind === 'rechnung'
        ? aktivKind
        : null
  const rows = useMemo(() => {
    const withFrom = (path: string, extra?: Record<string, string>) =>
      fromRef ? hrefWithAkteFrom(path, fromRef, extra) : path
    return buildPhaseRows(kontext, lead ?? null, withFrom, extras)
  }, [kontext, lead, extras, fromRef])

  useEffect(() => {
    if (navBusy) setNavBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei Seitenwechsel zurücksetzen
  }, [pathname])

  if (rows.every((r) => r.state === 'open')) return null
  const aktiv = rows.find((r) => r.kind === offen) ?? null

  function zurPhase() {
    const ziel = aktiv?.href?.trim()
    setOffen(null)
    if (!ziel || aktiv?.kind === hier) return
    setNavBusy(true)
    showRouteBusy('Phase wird geladen…')
    try {
      router.push(ziel)
    } catch {
      setNavBusy(false)
      hideRouteBusy()
    }
  }

  return (
    <>
      <nav aria-label="Phasen des Vorgangs" className={cn('phase-steps', className)}>
        {rows.map((row) => {
          const istHier = row.kind === hier
          const klickbar = row.state !== 'open'
          return (
            <MockBtn
              key={row.kind}
              type="button"
              className={cn(
                'phase-steps__step',
                `phase-steps__step--${row.state}`,
                istHier && 'phase-steps__step--hier'
              )}
              disabled={!klickbar || navBusy}
              aria-current={istHier ? 'page' : undefined}
              aria-label={klickbar ? `${row.label}: Details anzeigen` : `${row.label}: noch nicht erstellt`}
              onClick={() => setOffen(row.kind)}
            >
              {row.state === 'done' && !istHier ? (
                <MockIcon n="check" ctx="default" size={14} aria-hidden />
              ) : null}
              <span>{row.label}</span>
            </MockBtn>
          )
        })}
      </nav>

      <EditorSheet
        open={Boolean(aktiv)}
        onClose={() => setOffen(null)}
        title={aktiv?.sheetTitle ?? ''}
        crumb={aktiv?.sheetCrumb ?? aktiv?.kopf ?? null}
        size="lg"
        manageHistory={false}
        primary={
          aktiv && aktiv.href && aktiv.kind !== hier
            ? { label: `${aktiv.label} öffnen`, onClick: zurPhase, disabled: navBusy }
            : null
        }
      >
        {aktiv ? (
          aktiv.props.length ? (
            <div className="phase-sheet-props props">
              {aktiv.props.map((p) => (
                <div key={p.k} className="prop">
                  <span className="prop-l">{p.k}</span>
                  <span className="prop-v" style={{ whiteSpace: 'pre-wrap' }}>
                    {p.v}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-3)' }}>Keine weiteren Angaben.</p>
          )
        ) : null}
      </EditorSheet>
    </>
  )
}
