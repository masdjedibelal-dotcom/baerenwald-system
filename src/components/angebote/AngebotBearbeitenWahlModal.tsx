'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'
import {
  loadAngebotWizardBootstrap,
  loadAngebotWizardBootstrapKopie,
} from '@/app/(dashboard)/angebote/wizard-actions'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { cn } from '@/lib/utils'

export function AngebotBearbeitenWahlModal({
  open,
  onClose,
  angebotId,
  leadId,
  onBearbeiten,
}: {
  open: boolean
  onClose: () => void
  angebotId: string
  leadId: string
  onBearbeiten: (bootstrap: AngebotWizardBootstrap) => void
}) {
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<'bearbeiten' | 'kopie' | null>(null)

  function waehle(choice: 'bearbeiten' | 'kopie') {
    setMode(choice)
    startTransition(async () => {
      const res =
        choice === 'bearbeiten'
          ? await loadAngebotWizardBootstrap(angebotId, leadId)
          : await loadAngebotWizardBootstrapKopie(angebotId, leadId)
      setMode(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      onClose()
      onBearbeiten(res.bootstrap)
    })
  }

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title="Angebot bearbeiten"
      subtitle="Wie möchtest du fortfahren?"
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
        Dieses Angebot wurde bereits versendet oder liegt nicht mehr als reiner Entwurf vor.
      </p>

      <div className="doctype-row doctype-row--stack">
        <button
          type="button"
          className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'bearbeiten' && 'on'
          )}
          disabled={pending}
          onClick={() => waehle('bearbeiten')}
        >
          <span className="dot" />
          <span className="doctype-radio-opt__copy">
            <span className="lbl" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              Bestehendes Angebot bearbeiten
              <MockBadge kind="aktiv">Empfohlen</MockBadge>
            </span>
            <span className="hint">
              {pending && mode === 'bearbeiten'
                ? 'Lädt…'
                : 'Änderungen in diesem Angebot — korrigierte Fassung beim erneuten Versand.'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className={cn(
            'doctype-radio-opt doctype-radio-opt--block',
            mode === 'kopie' && 'on'
          )}
          disabled={pending}
          onClick={() => waehle('kopie')}
        >
          <span className="dot" />
          <span className="doctype-radio-opt__copy">
            <span className="lbl">Als neues Angebot erstellen</span>
            <span className="hint">
              {pending && mode === 'kopie'
                ? 'Lädt…'
                : 'Inhalt als weiterer Entwurf zur gleichen Anfrage.'}
            </span>
          </span>
        </button>
      </div>
    </Modal>
  )
}
