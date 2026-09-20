'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockInput } from '@/components/mock-ui/MockForm'
import { useRef, useState, type KeyboardEvent } from 'react'
import { mergeEmailList } from '@/lib/email-recipients'
import { cn } from '@/lib/utils'

export function EmailPillsField({
  label,
  hint,
  emails,
  onChange,
  placeholder = 'E-Mail eingeben…',
  disabled,
  required,
}: {
  label: string
  hint?: string
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commitInput() {
    if (!input.trim()) return
    onChange(mergeEmailList(emails, input))
    setInput('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commitInput()
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      onChange(emails.slice(0, -1))
    }
  }

  function removeAt(index: number) {
    onChange(emails.filter((_, i) => i !== index))
  }

  return (
    <div className="email-pills-field w-full">
      <span className="input-label">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <div
        role="group"
        aria-label={label}
        className={cn(
          'email-pills-box flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-card border border-bw-border bg-white px-2 py-1.5',
          'focus-within:border-bw-primary focus-within:ring-2 focus-within:ring-bw-primary/20',
          disabled && 'pointer-events-none opacity-60'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((em, i) => (
          <span
            key={`${em}-${i}`}
            className="email-pill inline-flex max-w-full items-center gap-1 rounded-pill border border-bw-border bg-bw-bg-soft pl-2.5 pr-1 py-0.5 text-fs-text text-bw-text"
          >
            <span className="truncate max-w-[min(100%,14rem)]" title={em}>
              {em}
            </span>
            <MockBtn className="email-pill-remove flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-bw-text-muted hover:bg-bw-hover hover:text-bw-text" type="button" aria-label={`${em} löschen`} disabled={disabled} onClick={(e) => {
                e.stopPropagation()
                removeAt(i)
              }}>
              <MockIcon n="x" ctx="default" className="h-3 w-3" aria-hidden />
            </MockBtn>
          </span>
        ))}
        <MockInput ref={inputRef} type="email" autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent py-1 text-fs-text text-bw-text outline-none placeholder:text-fs-meta placeholder:font-normal placeholder:text-bw-text-muted" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} onBlur={commitInput} placeholder={emails.length === 0 ? placeholder : ''} disabled={disabled} />
      </div>
      {hint ? <p className="mt-1 text-fs-caption leading-snug text-bw-text-muted">{hint}</p> : null}
    </div>
  )
}
