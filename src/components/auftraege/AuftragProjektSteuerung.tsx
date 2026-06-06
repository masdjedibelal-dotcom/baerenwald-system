'use client'

import { useState, useTransition } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { toast } from '@/components/ui/app-toast'
import { updateAuftragProjektSteuerung } from '@/app/(dashboard)/auftraege/kunden-update-actions'
import { PROJEKT_PHASEN, aktuellePhaseIndex } from '@/lib/auftraege/projekt-phasen'
import type { AuftragDetail, AuftragStatus, LeadStatus } from '@/lib/types'
import { AUFTRAG_STATUS_LABELS, cn } from '@/lib/utils'

const STATUS_OPTS: AuftragStatus[] = ['offen', 'in_arbeit', 'abnahme', 'abgeschlossen', 'storniert']

export function AuftragProjektSteuerung({
  detail,
  leadStatus,
  onChanged,
}: {
  detail: AuftragDetail
  leadStatus?: LeadStatus | null
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(detail.status)
  const [fortschritt, setFortschritt] = useState(detail.fortschritt ?? 0)
  const [naechster, setNaechster] = useState(detail.naechster_schritt ?? '')

  const phaseIdx = aktuellePhaseIndex(leadStatus ?? null, status)

  function speichern() {
    startTransition(async () => {
      const r = await updateAuftragProjektSteuerung({
        auftragId: detail.id,
        status,
        fortschritt,
        naechster_schritt: naechster,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Projekt-Status gespeichert')
        onChanged()
      }
    })
  }

  return (
    <section className="mb-6 rounded-lg border border-bw-border bg-bw-card p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-bw-text">
        <Settings2 className="h-4 w-4 text-bw-primary" aria-hidden />
        Projekt-Status steuern
      </h3>
      <p className="mb-4 text-xs text-bw-text-muted">
        Was Kundin auf der Status-Seite und in Update-Mails sieht — Phase, Fortschritt und nächster Schritt.
      </p>

      <div className="mb-4 overflow-x-auto rounded-lg bg-bw-hover/50 p-3">
        <div className="flex min-w-[420px] justify-between gap-1">
          {PROJEKT_PHASEN.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center text-center">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold',
                  i < phaseIdx && 'border-bw-primary bg-bw-primary text-white',
                  i === phaseIdx && 'border-bw-primary bg-white text-bw-dark',
                  i > phaseIdx && 'border-bw-border text-bw-text-muted'
                )}
              >
                {i < phaseIdx ? '✓' : i + 1}
              </span>
              <span className={cn('mt-1 text-[10px]', i === phaseIdx ? 'font-semibold' : 'text-bw-text-muted')}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Auftrags-Status"
          name="proj-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as AuftragStatus)}
          options={STATUS_OPTS.map((s) => ({ value: s, label: AUFTRAG_STATUS_LABELS[s] ?? s }))}
        />
        <div>
          <label className="input-label">Fortschritt ({fortschritt}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={fortschritt}
            onChange={(e) => setFortschritt(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <div className="mt-2">
            <ProgressBar value={fortschritt} />
          </div>
        </div>
      </div>

      <Textarea
        label="Nächster Schritt (sichtbar für Kundin)"
        value={naechster}
        onChange={(e) => setNaechster(e.target.value)}
        rows={2}
        className="mt-3"
        placeholder="z. B. Fliesenleger kommt am Dienstag vormittag"
      />

      <Button type="button" variant="primary" className="mt-4" loading={pending} onClick={speichern}>
        Speichern
      </Button>
    </section>
  )
}
