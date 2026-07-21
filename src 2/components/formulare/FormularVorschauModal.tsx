'use client'

import { useMemo, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormularFelderRenderer } from '@/components/formulare/FormularFelderRenderer'
import type { FormularFeld } from '@/lib/types'
import { cn } from '@/lib/utils'

function leereDaten(felder: FormularFeld[]): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const f of felder) {
    if (f.typ === 'checkbox') o[f.id] = false
    else o[f.id] = ''
  }
  return o
}

export function FormularVorschauModal({
  open,
  onClose,
  name,
  felder,
}: {
  open: boolean
  onClose: () => void
  name: string
  felder: FormularFeld[]
}) {
  const [view, setView] = useState<'phone' | 'desktop'>('phone')
  const daten = useMemo(() => leereDaten(felder), [felder])

  return (
    <Modal open={open} onClose={onClose} title={`Vorschau: ${name}`} size="lg">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('phone')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm',
            view === 'phone' ? 'bg-bw-accent text-white' : 'border border-bw-border bg-bw-canvas text-bw-text'
          )}
        >
          <Smartphone className="h-4 w-4" aria-hidden />
          Handy
        </button>
        <button
          type="button"
          onClick={() => setView('desktop')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm',
            view === 'desktop' ? 'bg-bw-accent text-white' : 'border border-bw-border bg-bw-canvas text-bw-text'
          )}
        >
          <Monitor className="h-4 w-4" aria-hidden />
          Desktop
        </button>
      </div>

      <p className="mb-3 text-sm text-bw-light">
        Diese Vorschau ist nicht interaktiv. Es wird nichts gespeichert.
      </p>

      {view === 'phone' ? (
        <div className="flex justify-center py-2">
          <div className="w-[min(100%,320px)] rounded-[2rem] border-[10px] border-zinc-900 bg-zinc-900 p-1 shadow-xl">
            <div className="max-h-[min(70vh,560px)] overflow-y-auto rounded-[1.35rem] bg-white p-4">
              <FormularFelderRenderer felder={felder} daten={daten} vorschauModus />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-bw-border bg-bw-canvas/50 p-4">
          <FormularFelderRenderer felder={felder} daten={daten} vorschauModus />
        </div>
      )}
    </Modal>
  )
}
