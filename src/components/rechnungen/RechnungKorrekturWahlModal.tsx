'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'
import {
  loadRechnungWizardBootstrap,
  loadRechnungWizardBootstrapStandalone,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import { cn } from '@/lib/utils'

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
  const nr = rechnungsnummer?.trim() || 'diese Rechnung'

  function waehleKorrigieren() {
    setMode('korrigieren')
    startTransition(async () => {
      const res = auftragId?.trim()
        ? await loadRechnungWizardBootstrap(rechnungId, auftragId.trim())
        : await loadRechnungWizardBootstrapStandalone(rechnungId)
      setMode(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      onClose()
      onKorrigieren(res.bootstrap)
    })
  }

  function waehleNeu() {
    setMode('neu')
    onClose()
    onNeueRechnung()
    setMode(null)
  }

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title="Rechnung bearbeiten"
      subtitle="Was möchtest du tun?"
      size="md"
      footer={
        <MockBtn kind="ghost" onClick={onClose} disabled={pending}>
          Abbrechen
        </MockBtn>
      }
    >
      <p
        className="text-[length:var(--fs-meta)]"
        style={{ color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.45 }}
      >
        <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>{nr}</strong> ist bereits
        versendet. Bitte wählen — eine Korrektur ersetzt die bestehende Rechnung, eine neue
        Rechnung ist ein zusätzlicher Beleg.
      </p>

      <div className="doctype-row doctype-row--stack">
        <button
          type="button"
          className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'korrigieren' && 'on'
          )}
          disabled={pending}
          onClick={waehleKorrigieren}
        >
          <span className="dot" />
          <span className="doctype-radio-opt__copy">
            <span className="lbl" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              Diese Rechnung korrigieren
            </span>
            <span className="hint">
              {pending && mode === 'korrigieren'
                ? 'Lädt…'
                : 'Nur wenn Betrag oder Positionen falsch sind: Storno-Gutschrift zur alten RE + neue Rechnung. Beide PDFs gehen in einer Mail raus.'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'neu' && 'on'
          )}
          disabled={pending}
          onClick={waehleNeu}
        >
          <span className="dot" />
          <span className="doctype-radio-opt__copy">
            <span className="lbl" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              Neue Rechnung anlegen
              <MockBadge kind="aktiv">Zusatzleistung</MockBadge>
            </span>
            <span className="hint">
              {pending && mode === 'neu'
                ? 'Lädt…'
                : 'Separater Beleg — z. B. Regie, WhatsApp-Absprache oder weiterer Posten. Die bestehende Rechnung bleibt unverändert.'}
            </span>
          </span>
        </button>
      </div>
    </Modal>
  )
}
