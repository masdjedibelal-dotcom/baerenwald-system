'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Edit2 } from 'lucide-react'

export type PropertyRowProps = {
  label: string
  value: ReactNode
  field?: string
  type?: 'text' | 'email' | 'tel' | 'number' | 'select'
  options?: { value: string; label: string }[]
  onSave?: (field: string, value: string) => void | Promise<void>
  /** Legacy: öffnet externes Bearbeiten */
  onEdit?: () => void
  editable?: boolean
}

function displayString(value: ReactNode): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

export function PropertyRow({
  label,
  value,
  field = 'field',
  type = 'text',
  options,
  onSave,
  onEdit,
  editable = true,
}: PropertyRowProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(() => displayString(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setVal(displayString(value))
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function handleSave() {
    setEditing(false)
    if (onSave && val !== displayString(value)) {
      await onSave(field, val)
    }
  }

  if (editable && onSave && editing) {
    return (
      <div className="group -mx-3 rounded-md px-3 py-2">
        <div className="mb-1 text-xs text-bw-text-muted">{label}</div>
        {type === 'select' && options?.length ? (
          <select
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleSave}
            className="input text-sm"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            type={type === 'number' ? 'number' : type}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave()
              if (e.key === 'Escape') {
                setVal(displayString(value))
                setEditing(false)
              }
            }}
            className="input text-sm"
          />
        )}
        <div className="mt-1 text-xs text-bw-text-muted">Enter speichern · ESC abbrechen</div>
      </div>
    )
  }

  return (
    <div
      className="group property-row"
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      onClick={() => {
        if (!editable) return
        if (onSave) setEditing(true)
        else if (onEdit) onEdit()
      }}
      onKeyDown={(e) => {
        if (!editable) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (onSave) setEditing(true)
          else if (onEdit) onEdit()
        }
      }}
    >
      <span className="property-label">{label}</span>
      <span className="property-value">
        {value ?? (
          <span className="text-xs italic text-bw-light">Nicht angegeben</span>
        )}
      </span>
      {editable && (onSave || onEdit) ? (
        <Edit2 className="property-edit ml-2 h-3 w-3 shrink-0" aria-hidden />
      ) : null}
    </div>
  )
}
