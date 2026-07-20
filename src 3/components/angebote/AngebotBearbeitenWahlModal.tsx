'use client'

import { useState, useTransition } from 'react'
import { Copy, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import {
  loadAngebotWizardBootstrap,
  loadAngebotWizardBootstrapKopie,
} from '@/app/(dashboard)/angebote/wizard-actions'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'

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
    <Modal open={open} onClose={() => !pending && onClose()} title="Angebot bearbeiten" size="md">
      <p className="text-sm leading-relaxed text-bw-text-muted">
        Dieses Angebot wurde bereits versendet oder liegt nicht mehr als reiner Entwurf vor. Wie
        möchten Sie fortfahren?
      </p>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-xl border-2 border-bw-primary/40 bg-bw-green-bg/30 p-4 text-left transition hover:border-bw-primary/60 hover:bg-bw-green-bg/50 disabled:opacity-60"
          disabled={pending}
          onClick={() => waehle('bearbeiten')}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bw-green-bg text-bw-primary">
            <Pencil className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="block text-sm font-semibold text-bw-text">Bestehendes Angebot bearbeiten</span>
              <span className="rounded-full bg-bw-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Empfohlen
              </span>
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-bw-text-muted">
              Änderungen werden in diesem Angebot gespeichert. Beim erneuten Versand wird eine
              korrigierte Fassung verschickt — kein neuer Listeneintrag.
            </span>
          </span>
          {pending && mode === 'bearbeiten' ? (
            <span className="ml-auto text-xs text-bw-text-muted">Lädt…</span>
          ) : null}
        </button>

        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-xl border border-bw-border bg-[var(--app-card)] p-4 text-left transition hover:border-bw-primary/40 hover:bg-bw-hover disabled:opacity-60"
          disabled={pending}
          onClick={() => waehle('kopie')}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bw-accent-bg text-bw-accent">
            <Copy className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold text-bw-text">Als neues Angebot erstellen</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-bw-text-muted">
              Inhalt wird übernommen und als neuer Entwurf angelegt — das bisherige Angebot wird als
              „Ersetzt“ markiert.
            </span>
          </span>
          {pending && mode === 'kopie' ? (
            <span className="ml-auto text-xs text-bw-text-muted">Lädt…</span>
          ) : null}
        </button>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </Modal>
  )
}
