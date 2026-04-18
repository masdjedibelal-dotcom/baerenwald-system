'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Datenschutz-Erinnerung</h2>
        <p className="mt-3 text-sm text-ink">
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
        <div className="mt-5">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              try {
                window.localStorage.setItem(STORAGE_KEY, '1')
              } catch {
                /* ignore */
              }
              setOpen(false)
            }}
          >
            Verstanden
          </Button>
        </div>
      </div>
    </div>
  )
}
