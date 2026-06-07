'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { cn } from '@/lib/utils'

export function AngebotWizardAngebotstitelCard({
  titel,
  onTitelChange,
  disabled,
}: {
  titel: string
  onTitelChange: (value: string) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(titel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(titel)
  }, [titel])

  function commit() {
    const next = draft.trim()
    if (next) onTitelChange(next)
    else setDraft(titel)
  }

  const anzeige = titel.trim() || '—'

  const editForm = (
    <label className="block">
      <span className="input-label">Angebotstitel</span>
      <input
        ref={inputRef}
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        disabled={disabled}
        placeholder="z. B. Angebot Badsanierung — Max Mustermann"
      />
      <p className="mt-2 text-[11px] text-bw-text-muted">
        Interner Titel für Versand und Übersicht — erscheint im Betreff der Kunden-Mail.
      </p>
    </label>
  )

  const overview = (
    <MobileOverviewField
      label="Angebotstitel"
      value={
        <span className={cn('font-medium', !titel.trim() && 'text-bw-text-muted')}>{anzeige}</span>
      }
    />
  )

  return (
    <Card
      title={
        <>
          <FileText className="h-3.5 w-3.5 shrink-0 text-bw-text-muted" aria-hidden />
          Angebotstitel
        </>
      }
    >
      <MobileEditableBlock sheetTitle="Angebotstitel" overview={overview} disabled={disabled}>
        {editForm}
      </MobileEditableBlock>
      <p className="mt-2 hidden text-[11px] text-bw-text-muted md:block">
        Interner Titel für Versand und Übersicht — erscheint im Betreff der Kunden-Mail.
      </p>
    </Card>
  )
}
