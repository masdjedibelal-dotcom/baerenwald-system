'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export type ComboboxOption = {
  value: string
  label: string
  /** Kontext-Subline (Ort, Gewerk, Telefon …) */
  sub?: string
}

export type ComboboxProps = {
  label?: string
  hint?: string
  error?: string
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
  required?: boolean
  className?: string
  /** Ab dieser Anzahl Optionen empfohlen — Aufrufer entscheidet; Select auto-switched bei >15 */
  emptyLabel?: string
}

/**
 * Spec §14: Combobox statt Select bei vielen Optionen — Tipp-Filter + Subline.
 */
export function Combobox({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  placeholder = 'Auswählen…',
  disabled,
  id,
  name,
  required,
  className,
  emptyLabel = 'Keine Treffer',
}: ComboboxProps) {
  const autoId = useId()
  const inputId = id ?? name ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        (o.sub ?? '').toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle)
    )
  }, [options, q])

  useEffect(() => {
    if (!open) return
    setQ('')
    setHi(0)
    const t = window.setTimeout(() => searchRef.current?.focus(), 20)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  function onListKey(e: ReactKeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = filtered[hi]
      if (hit) pick(hit.value)
    }
  }

  return (
    <div className={cn('cbx', className)} ref={rootRef}>
      {label ? (
        <label className="input-label" htmlFor={inputId}>
          {label}
          {required ? (
            <span className="ml-0.5 text-bw-accent" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        id={inputId}
        className={cn('cbx-trigger', open && 'open')}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={cn(selected ? 'cbx-val' : 'cbx-ph')}>
          {selected?.label ?? placeholder}
        </span>
        <MockIcon ctx="default" n="chevron-down" size={16} />
      </button>
      {open ? (
        <div className="cbx-pop" role="listbox" onKeyDown={onListKey}>
          <div className="cbx-search">
            <MockIcon ctx="default" n="search" size={16} />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setHi(0)
              }}
              placeholder="Tippen zum Filtern…"
              aria-label="Optionen filtern"
            />
            {q ? (
              <button
                type="button"
                className="cbx-clear"
                aria-label="Filter leeren"
                onClick={() => setQ('')}
              >
                <MockIcon ctx="default" n="x" size={14} />
              </button>
            ) : null}
          </div>
          <div className="cbx-list">
            {filtered.length === 0 ? (
              <div className="cbx-empty">{emptyLabel}</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o.value || `empty-${i}`}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={cn('cbx-item', i === hi && 'hi', o.value === value && 'sel')}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(o.value)}
                >
                  <span className="cbx-item-main">
                    <span className="cbx-item-l">{o.label}</span>
                    {o.sub ? <span className="cbx-item-s">{o.sub}</span> : null}
                  </span>
                  {o.value === value ? <MockIcon ctx="default" n="check" size={14} /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
      {hint && !error ? <p className="mt-1 text-xs text-bw-light">{hint}</p> : null}
      {error ? <p className="input-error-msg">{error}</p> : null}
    </div>
  )
}

/** Schwelle Spec §14: >15 Optionen → Combobox */
export const COMBOBOX_OPTION_THRESHOLD = 15
