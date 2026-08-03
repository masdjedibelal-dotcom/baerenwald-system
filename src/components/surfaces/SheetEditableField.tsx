'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
  /** Zeilen im Edit-Textarea (default 10) */
  rows?: number
  /** KI-Sparkles im Edit-Sheet */
  kiExtraHint?: string | null
  disabled?: boolean
  /** Beim Mount/True einmal Edit-Sheet öffnen (Deep-Link Fokus) */
  autoOpen?: boolean
  className?: string
  /** Zusätzlicher Hinweis unter dem Label in der Liste */
  hint?: string | null
  /** EditorSheet-Kontext */
  sheetContext?: EditorSheetContext
}

/**
 * Read-only-Zeile mit Stift → EditorSheet (Mobil Bottom Sheet / Desktop Split-over).
 * Bestätigen rechts, Schließen links — gleiches Surface wie andere Sheets.
 */
export function SheetEditableField({
  label,
  value,
  onSave,
  placeholder = 'Tippen zum Bearbeiten…',
  multiline = false,
  rows = 10,
  kiExtraHint,
  disabled,
  autoOpen,
  className,
  hint,
  sheetContext = 'canvas',
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  useEffect(() => {
    if (!open) return
    setDraft(value)
    setDirty(false)
  }, [open, value])

  function confirm() {
    onSave(draft)
    setDirty(false)
    setOpen(false)
  }

  const display = value.trim()
  const showKi = Boolean(kiExtraHint != null || multiline)

  return (
    <>
      <div className={cn('sheet-editable-field full', className)}>
        <div className="lt-field-lbl">{label}</div>
        {hint ? <p className="sheet-editable-field__hint">{hint}</p> : null}
        <div className="sheet-editable-field__row">
          <button
            type="button"
            className={cn(
              'sheet-editable-field__value',
              multiline && 'sheet-editable-field__value--multi',
              !display && 'is-empty'
            )}
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
          >
            {display || placeholder}
          </button>
          <button
            type="button"
            className="ki-assist-icon-btn sheet-editable-field__edit"
            title={`${label} bearbeiten`}
            aria-label={`${label} bearbeiten`}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            <MockIcon ctx="btn" n="pencil" size={16} />
          </button>
        </div>
      </div>

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        context={sheetContext}
        dirty={dirty}
        onConfirm={confirm}
        confirmDisabled={disabled}
      >
        <div className="form-grid form-grid--sheet">
          {showKi ? (
            <KiAssistFieldLabel
              label={label}
              value={draft}
              onApply={(text) => {
                setDraft(text)
                setDirty(true)
              }}
              extraHint={kiExtraHint}
              multiline={multiline}
              className="full"
            >
              {multiline ? (
                <textarea
                  className="input ta wizard-dok-beschreibung"
                  rows={rows}
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              ) : (
                <input
                  className="input"
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              )}
            </KiAssistFieldLabel>
          ) : (
            <div className="full">
              {multiline ? (
                <textarea
                  className="input ta wizard-dok-beschreibung"
                  rows={rows}
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              ) : (
                <input
                  className="input"
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              )}
            </div>
          )}
        </div>
      </EditorSheet>
    </>
  )
}
