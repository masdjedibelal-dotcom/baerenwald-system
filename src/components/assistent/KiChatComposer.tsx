'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSpeechDictation } from '@/hooks/useSpeechDictation'
import { cn } from '@/lib/utils'

type Mode = 'text' | 'voice'

/**
 * KI-Chat-Eingabe: Desktop nur Tippen; mobil Tippen **oder** Spracheingabe.
 */
export function KiChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  multiline = false,
  rows = 3,
  submitLabel,
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  multiline?: boolean
  rows?: number
  /** Optionaler Extra-Inhalt unter dem Modus-Segment */
  submitLabel?: ReactNode
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
}) {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<Mode>('text')
  const [interim, setInterim] = useState('')
  const valueRef = useRef(value)
  valueRef.current = value

  const speech = useSpeechDictation({
    onFinal: (chunk) => {
      onChange([valueRef.current.trim(), chunk.trim()].filter(Boolean).join(' '))
    },
    onInterim: setInterim,
  })

  useEffect(() => {
    if (!isMobile && mode === 'voice') {
      speech.stop()
      setMode('text')
      setInterim('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, mode])

  useEffect(() => {
    if (mode !== 'voice') {
      speech.stop()
      setInterim('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (disabled || !value.trim()) return
    speech.stop()
    onSubmit()
  }

  const preview = [value.trim(), interim.trim()].filter(Boolean).join(' ')

  return (
    <div className="ki-chat-composer space-y-2">
      {isMobile ? (
        <div className="seg" role="group" aria-label="Eingabeart">
          <button
            type="button"
            className={cn(mode === 'text' && 'on')}
            disabled={disabled}
            onClick={() => setMode('text')}
          >
            Tippen
          </button>
          <button
            type="button"
            className={cn(mode === 'voice' && 'on')}
            disabled={disabled || !speech.supported}
            title={
              speech.supported
                ? 'Spracheingabe'
                : 'Spracheingabe auf diesem Gerät nicht verfügbar'
            }
            onClick={() => setMode('voice')}
          >
            Sprechen
          </button>
        </div>
      ) : null}

      {isMobile && mode === 'voice' ? (
        <div className="space-y-2">
          <button
            type="button"
            className={cn(
              'ki-chat-composer__mic',
              speech.listening && 'is-listening'
            )}
            disabled={disabled || !speech.supported}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Aufnahme stoppen' : 'Aufnahme starten'}
            onClick={() => speech.toggle()}
          >
            <MockIcon ctx="btn" n="microphone" size={22} />
            <span>
              {speech.listening
                ? 'Zuhören… tippen zum Stoppen'
                : speech.supported
                  ? 'Tippen zum Sprechen'
                  : 'Nicht verfügbar'}
            </span>
          </button>
          <div
            className={cn(
              'ki-chat-composer__preview',
              !preview && 'is-empty'
            )}
            aria-live="polite"
          >
            {preview || 'Gesprochenes erscheint hier…'}
          </div>
          <button
            type="button"
            className="btn primary sm w-full"
            disabled={disabled || !value.trim()}
            onClick={() => {
              speech.stop()
              onSubmit()
            }}
          >
            {submitLabel ?? (
              <>
                <MockIcon ctx="btn" n="send" size={14} /> Senden
              </>
            )}
          </button>
          {speech.error ? (
            <p className="text-[length:var(--fs-meta)] text-danger">{speech.error}</p>
          ) : null}
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={handleSubmit}>
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              className="sel min-w-0 flex-1"
              rows={rows}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              className="sel min-w-0 flex-1"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
            />
          )}
          {isMobile ? (
            <button
              type="button"
              className={cn(
                'btn ghost sm ki-chat-composer__mic-inline',
                speech.listening && 'is-listening'
              )}
              disabled={disabled || !speech.supported}
              title="Kurz Spracheingabe"
              aria-label="Spracheingabe"
              onClick={() => {
                setMode('voice')
                if (!speech.listening) speech.start()
              }}
            >
              <MockIcon ctx="btn" n="microphone" size={16} />
            </button>
          ) : null}
          <button type="submit" className="btn primary sm" disabled={disabled || !value.trim()}>
            {submitLabel ?? <MockIcon ctx="btn" n="send" size={14} />}
          </button>
        </form>
      )}
    </div>
  )
}
