'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { korrigiereRechnung } from '@/app/(dashboard)/rechnungen/actions'
import {
  loadRechnungWizardBootstrap,
  loadRechnungWizardBootstrapStandalone,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import { cn } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

/**
 * Mobil: Bottom-Sheet öffnet genau unter dem Sticky-CTA.
 * Ohne Guard trifft der gleiche Touch die erste Option → versehentliche Korrektur.
 */
const INTERACT_DELAY_MS = 450

export function RechnungKorrekturWahlModal({
  open,
  onClose,
  rechnungId,
  auftragId,
  rechnungsnummer,
  onKorrigieren,
  onNeueRechnung,
}: {
  open: boolean
  onClose: () => void
  rechnungId: string
  auftragId?: string | null
  rechnungsnummer?: string | null
  onKorrigieren: (bootstrap: RechnungWizardBootstrap) => void
  onNeueRechnung: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<'korrigieren' | 'neu' | null>(null)
  const [interactReady, setInteractReady] = useState(false)
  const nr = rechnungsnummer?.trim() || 'diese Rechnung'

  useEffect(() => {
    if (!open) {
      setMode(null)
      setInteractReady(false)
      return
    }
    setInteractReady(false)
    const t = window.setTimeout(() => setInteractReady(true), INTERACT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [open])

  function starteKorrigieren() {
    if (!interactReady || pending) return
    setMode('korrigieren')
    startTransition(async () => {
      // Gesendet/Bezahlt: Storno-Gutschrift + Ersatz-Entwurf, dann Wizard auf dem Entwurf
      const korr = await korrigiereRechnung(rechnungId)
      if (!korr.ok) {
        setMode(null)
        toast.systemError(korr)
        return
      }

      const targetId = korr.mode === 'storno_neu' ? korr.neuId : rechnungId
      const res = auftragId?.trim()
        ? await loadRechnungWizardBootstrap(targetId, auftragId.trim())
        : await loadRechnungWizardBootstrapStandalone(targetId)
      setMode(null)
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      if (korr.mode === 'storno_neu') {
        res.bootstrap.korrekturSession = {
          originalId: rechnungId,
          gutschriftId: korr.stornoId,
          neuId: korr.neuId,
          originalStatus: korr.originalStatus,
        }
        toast.success(TOAST.korrektur_entwurf_angelegt_bitte_pruefen_und_ers)
      }
      onClose()
      onKorrigieren(res.bootstrap)
    })
  }

  function starteNeu() {
    if (!interactReady || pending) return
    setMode('neu')
    onClose()
    onNeueRechnung()
    setMode(null)
  }

  return (
    <EditorSheet
      open={open}
      onClose={() => !pending && onClose()}
      title="Rechnung korrigieren"
      subtitle="Was möchtest du tun?"
      size="md"
      secondary={{ label: 'Abbrechen', onClick: onClose, disabled: pending, kind: 'ghost' }}
      primary={{
        label: pending
          ? mode === 'korrigieren'
            ? 'Storno + Entwurf…'
            : 'Lädt…'
          : mode === 'korrigieren'
            ? 'Korrektur anlegen'
            : mode === 'neu'
              ? 'Neue Rechnung anlegen'
              : 'Bitte wählen',
        disabled: !interactReady || pending || !mode,
        busy: pending,
        onClick: () => {
          if (mode === 'korrigieren') starteKorrigieren()
          else if (mode === 'neu') starteNeu()
        },
      }}
    >
      <p
        className="text-[length:var(--fs-meta)]"
        style={{ color: 'var(--text-3)', margin: '0 0 0.8750remrem', lineHeight: 1.45 }}
      >
        <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>{nr}</strong> ist bereits
        versendet. Eine Korrektur legt Storno-Gutschrift und neuen Entwurf an — das Original bleibt
        bis zum Versand gültig. Es geht noch keine Mail raus, bis du im Wizard bewusst „Versenden“
        bestätigst.
      </p>

      <div
        className="doctype-row doctype-row--stack"
        style={!interactReady ? { pointerEvents: 'none', opacity: 0.72 } : undefined}
        aria-busy={!interactReady || undefined}
      >
        <MockBtn className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'korrigieren' && 'on'
          )} type="button" disabled={pending || !interactReady} onClick={() => setMode('korrigieren')}>
          <span className="dot" />
          <span className="doctype-radio-opt__copy">
            <span className="lbl" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              Diese Rechnung korrigieren
            </span>
            <span className="hint">
              Nur wenn Betrag oder Positionen falsch sind: Storno-Gutschrift + neue Rechnung als
              Entwurf. Versand erst nach Bestätigung im Wizard.
            </span>
          </span>
        </MockBtn>

        <MockBtn className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'neu' && 'on'
          )} type="button" disabled={pending || !interactReady} onClick={() => setMode('neu')}>
          <span className="dot" />
          <span className="doctype-radio-opt__copy">
            <span className="lbl" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              Neue Rechnung anlegen
              <MockBadge kind="aktiv">Zusatzleistung</MockBadge>
            </span>
            <span className="hint">
              Separater Beleg — z. B. Regie oder weiterer Posten. Die bestehende Rechnung bleibt
              unverändert.
            </span>
          </span>
        </MockBtn>
      </div>
    </EditorSheet>
  )
}
