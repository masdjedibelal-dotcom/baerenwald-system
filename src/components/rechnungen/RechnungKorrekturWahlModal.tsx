'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'
import { korrigiereRechnung } from '@/app/(dashboard)/rechnungen/actions'
import {
  loadRechnungWizardBootstrap,
  loadRechnungWizardBootstrapStandalone,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import { cn } from '@/lib/utils'

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
        toast.error(korr.message)
        return
      }

      const targetId = korr.mode === 'storno_neu' ? korr.neuId : rechnungId
      const res = auftragId?.trim()
        ? await loadRechnungWizardBootstrap(targetId, auftragId.trim())
        : await loadRechnungWizardBootstrapStandalone(targetId)
      setMode(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      if (korr.mode === 'storno_neu') {
        toast.success('Korrektur-Entwurf angelegt — bitte prüfen und erst dann versenden')
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
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title="Rechnung korrigieren"
      subtitle="Was möchtest du tun?"
      size="md"
      footer={
        <div className="kunde-create-footer" style={{ gap: 8, flexWrap: 'wrap' }}>
          <MockBtn kind="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </MockBtn>
          <MockBtn
            kind="primary"
            disabled={!interactReady || pending || !mode}
            onClick={() => {
              if (mode === 'korrigieren') starteKorrigieren()
              else if (mode === 'neu') starteNeu()
            }}
          >
            {pending
              ? mode === 'korrigieren'
                ? 'Storno + Entwurf…'
                : 'Lädt…'
              : mode === 'korrigieren'
                ? 'Korrektur anlegen'
                : mode === 'neu'
                  ? 'Neue Rechnung anlegen'
                  : 'Bitte wählen'}
          </MockBtn>
        </div>
      }
    >
      <p
        className="text-[length:var(--fs-meta)]"
        style={{ color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.45 }}
      >
        <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>{nr}</strong> ist bereits
        versendet. Eine Korrektur ersetzt die bestehende Rechnung (Storno + neuer Entwurf) —{' '}
        <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>
          es geht noch keine Mail raus
        </strong>
        , bis du im Wizard bewusst „Versenden“ bestätigst.
      </p>

      <div
        className="doctype-row doctype-row--stack"
        style={!interactReady ? { pointerEvents: 'none', opacity: 0.72 } : undefined}
        aria-busy={!interactReady || undefined}
      >
        <button
          type="button"
          className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'korrigieren' && 'on'
          )}
          disabled={pending || !interactReady}
          onClick={() => setMode('korrigieren')}
        >
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
        </button>

        <button
          type="button"
          className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'neu' && 'on'
          )}
          disabled={pending || !interactReady}
          onClick={() => setMode('neu')}
        >
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
        </button>
      </div>
    </Modal>
  )
}
