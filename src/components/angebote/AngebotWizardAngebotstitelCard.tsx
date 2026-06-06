'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(titel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(titel)
  }, [titel, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    const next = draft.trim()
    if (next) onTitelChange(next)
    else setDraft(titel)
    setEditing(false)
  }

  function cancel() {
    setDraft(titel)
    setEditing(false)
  }

  const anzeige = titel.trim() || '—'

  return (
    <Card
      title={
        <>
          <FileText className="h-3.5 w-3.5 shrink-0 text-bw-text-muted" aria-hidden />
          Angebotstitel
        </>
      }
    >
      {editing ? (
        <label className="block">
          <span className="sr-only">Angebotstitel bearbeiten</span>
          <input
            ref={inputRef}
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            onBlur={commit}
            disabled={disabled}
            placeholder="z. B. Angebot Badsanierung — Max Mustermann"
          />
        </label>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className={cn('min-w-0 flex-1 text-[14px] font-medium leading-snug text-bw-text', !titel.trim() && 'text-bw-text-muted')}>
            {anzeige}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm shrink-0 p-1.5 text-bw-text-muted hover:text-bw-text"
            onClick={() => setEditing(true)}
            disabled={disabled}
            aria-label="Angebotstitel bearbeiten"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      <p className="mt-2 text-[11px] text-bw-text-muted">
        Interner Titel für Versand und Übersicht — erscheint im Betreff der Kunden-Mail.
      </p>
    </Card>
  )
}
