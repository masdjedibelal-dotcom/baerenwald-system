'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { normalizeEditorHtml, serializeEditorHtml } from '@/lib/rich-text'

type ToolbarBtn = {
  icon: string
  label: string
  command: string
  value?: string
}

const TOOLBAR: ToolbarBtn[] = [
  { icon: 'text-caption', label: 'Fett', command: 'bold' },
  { icon: 'text-caption', label: 'Kursiv', command: 'italic' },
  { icon: 'text-caption', label: 'Unterstrichen', command: 'underline' },
  { icon: 'list', label: 'Aufzählung', command: 'insertUnorderedList' },
  { icon: 'list-numbers', label: 'Nummerierung', command: 'insertOrderedList' },
  { icon: 'text-caption', label: 'Formatierung entfernen', command: 'removeFormat' },
]

export type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minHeight?: number
  id?: string
  'aria-label'?: string
  onFocus?: () => void
  onBlur?: () => void
}

export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(function RichTextEditor(
  {
    value,
    onChange,
    placeholder,
    disabled,
    className,
    minHeight = 120,
    id,
    'aria-label': ariaLabel,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
  },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => editorRef.current as HTMLDivElement)
  const syncingRef = useRef(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const el = editorRef.current
    if (!el || syncingRef.current || focused) return
    const next = normalizeEditorHtml(value)
    if (!next && !el.innerHTML.replace(/<br\s*\/?>/gi, '').trim()) {
      el.innerHTML = '<br>'
      return
    }
    if (el.innerHTML !== next) {
      el.innerHTML = next || '<br>'
    }
  }, [value, focused])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    syncingRef.current = true
    onChange(serializeEditorHtml(el.innerHTML))
    queueMicrotask(() => {
      syncingRef.current = false
    })
  }, [onChange])

  function runCommand(command: string, val?: string) {
    if (disabled) return
    editorRef.current?.focus()
    document.execCommand(command, false, val)
    emitChange()
  }

  const showPlaceholder = !focused && !richTextHasContent(value)

  return (
    <div
      className={cn(
        'rich-text-editor overflow-hidden rounded-card border border-bw-border bg-white',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      <div className="rich-text-toolbar flex flex-wrap items-center gap-0.5 border-b border-bw-border bg-bw-bg px-1.5 py-1">
        {TOOLBAR.map(({ icon, label, command, value: cmdVal }) => (
          <button
            key={command}
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            className="rich-text-toolbar-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(command, cmdVal)}
          >
            <MockIcon n={icon} ctx="btn" size={16} />
          </button>
        ))}
      </div>
      <div className="relative">
        {showPlaceholder && placeholder ? (
          <div
            className="pointer-events-none absolute left-3 top-2 text-sm text-bw-text-muted"
            aria-hidden
          >
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-label={ariaLabel ?? placeholder}
          aria-multiline
          contentEditable={!disabled}
          suppressContentEditableWarning
          className="rich-text-body px-3 py-2 text-sm text-bw-text outline-none"
          style={{ minHeight }}
          onInput={emitChange}
          onBlur={() => {
            setFocused(false)
            emitChange()
            onBlurProp?.()
          }}
          onFocus={() => {
            setFocused(true)
            onFocusProp?.()
          }}
        />
      </div>
    </div>
  )
})

RichTextEditor.displayName = 'RichTextEditor'

function richTextHasContent(value: string): boolean {
  const t = value.replace(/<[^>]+>/g, '').trim()
  return t.length > 0
}
