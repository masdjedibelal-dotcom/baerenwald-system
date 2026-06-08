'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  dismissDatenschutzHint,
  loadDatenschutzHintDismissed,
} from '@/app/(dashboard)/datenschutz-hint/actions'
import {
  datenschutzHintDismissedOnClient,
  markDatenschutzHintClient,
} from '@/lib/datenschutz/hint-storage'

export function DatenschutzHintModal({
  dismissedOnServer = false,
}: {
  dismissedOnServer?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      if (dismissedOnServer || datenschutzHintDismissedOnClient()) {
        markDatenschutzHintClient()
        if (!dismissedOnServer) {
          void dismissDatenschutzHint()
        }
        if (!cancelled) {
          setOpen(false)
          setChecked(true)
        }
        return
      }

      const serverDismissed = await loadDatenschutzHintDismissed()
      if (cancelled) return

      if (serverDismissed) {
        markDatenschutzHintClient()
        setOpen(false)
      } else {
        setOpen(true)
      }
      setChecked(true)
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [dismissedOnServer])

  async function dismiss() {
    markDatenschutzHintClient()
    setOpen(false)
    await dismissDatenschutzHint()
  }

  if (!checked || !open) return null

  return (
    <Modal
      open={open}
      onClose={() => void dismiss()}
      title="Datenschutz-Erinnerung"
      size="md"
      footer={
        <Button type="button" variant="primary" onClick={() => void dismiss()}>
          Verstanden
        </Button>
      }
    >
      <p className="text-sm text-ink">
        Dieses System speichert personenbezogene Daten (Kundendaten, Fotos aus Privatwohnungen).
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink">
        <li>Kundinnen sind über die Datenspeicherung informiert</li>
        <li>Löschfristen werden eingehalten</li>
        <li>Kunden-Anfragen (DSGVO) werden innerhalb von 30 Tagen beantwortet</li>
      </ul>
      <p className="mt-3 text-sm text-muted">
        Datenschutz-Einstellungen finden Sie unter <strong className="text-ink">Einstellungen → Datenschutz</strong>.
      </p>
    </Modal>
  )
}
