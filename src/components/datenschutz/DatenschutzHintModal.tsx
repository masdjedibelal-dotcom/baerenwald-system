'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

const STORAGE_KEY = 'baerenwald_datenschutz_hint_v1'

export function DatenschutzHintModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !window.localStorage.getItem(STORAGE_KEY)) {
        setOpen(true)
      }
    } catch {
      setOpen(true)
    }
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="Datenschutz-Erinnerung"
      size="md"
      footer={
        <Button type="button" variant="primary" onClick={dismiss}>
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
