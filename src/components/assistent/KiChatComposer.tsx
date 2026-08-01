'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useSpeechDictation } from '@/hooks/useSpeechDictation'
import { cn } from '@/lib/utils'

const MAX_ROWS = 4
const LINE_PX = 22
/** Max. Zeichen für Tippen und Sprachergebnis. */
const MAX_CHARS = 500
/** Max. Aufnahmedauer Sprachnotiz. */
const VOICE_MAX_SEC = 30

function clampText(s: string) {
  return s.length <= MAX_CHARS ? s : s.slice(0, MAX_CHARS)
}

function VoiceWaves({ active }: { active: boolean }) {
  return (
    <div className={cn('ki-voice-waves', active && 'is-active')} aria-hidden>
      {Array.from({ length: 11 }).map((_, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  )
}

/**
 * Chat-Composer im GPT-Muster: Mic · Textfeld (1–4 Zeilen) · Senden.
 * Sprache: Wellen beim Aufnehmen → Stopp → Text sichtbar → Senden.
 * Limits: 30 s Aufnahme, 500 Zeichen.
 */
export function KiChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Nachricht schreiben…',
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const [voicePhase, setVoicePhase] = useState<'idle' | 'listening' | 'review'>('idle')
  const [interim, setInterim] = useState('')
  const [voiceLeft, setVoiceLeft] = useState(VOICE_MAX_SEC)
  const localRef = useRef<HTMLTextAreaElement | null>(null)
  const taRef = inputRef ?? localRef
  const valueRef = useRef(value)
  const interimRef = useRef(interim)
  const hadListeningRef = useRef(false)
  const finishingRef = useRef(false)
  const finishVoiceRef = useRef<() => void>(() => {})
  valueRef.current = value
  interimRef.current = interim

  const setClamped = (next: string) => {
    onChange(clampText(next))
  }

  const speech = useSpeechDictation({
    onFinal: (chunk) => {
      setClamped([valueRef.current.trim(), chunk.trim()].filter(Boolean).join(' '))
    },
    onInterim: (t) => {
      const room = Math.max(0, MAX_CHARS - valueRef.current.trim().length - (valueRef.current.trim() ? 1 : 0))
      setInterim(clampText(t).slice(0, room || MAX_CHARS))
    },
  })

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el || voicePhase === 'listening') return
    el.style.height = 'auto'
    const max = LINE_PX * MAX_ROWS
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [value, voicePhase, taRef])

  function finishVoice() {
    if (finishingRef.current) return
    finishingRef.current = true
    speech.stop()
    const merged = clampText(
      [valueRef.current.trim(), interimRef.current.trim()].filter(Boolean).join(' ')
    )
    if (merged) setClamped(merged)
    setInterim('')
    interimRef.current = ''
    setVoicePhase(merged ? 'review' : 'idle')
    hadListeningRef.current = false
    setVoiceLeft(VOICE_MAX_SEC)
    window.setTimeout(() => {
      finishingRef.current = false
      requestAnimationFrame(() => taRef.current?.focus())
    }, 120)
  }
  finishVoiceRef.current = finishVoice

  useEffect(() => {
    if (voicePhase === 'listening' && speech.listening) {
      hadListeningRef.current = true
    }
    if (voicePhase === 'listening' && speech.error && !speech.listening && !hadListeningRef.current) {
      setVoicePhase('idle')
      setVoiceLeft(VOICE_MAX_SEC)
      return
    }
    if (
      voicePhase === 'listening' &&
      hadListeningRef.current &&
      !speech.listening &&
      !finishingRef.current
    ) {
      finishVoice()
    }
    if (voicePhase !== 'listening') {
      hadListeningRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening, speech.error, voicePhase])

  // 30-Sekunden-Limit Sprachnotiz
  useEffect(() => {
    if (voicePhase !== 'listening') return
    setVoiceLeft(VOICE_MAX_SEC)
    const started = Date.now()
    const tick = window.setInterval(() => {
      const left = Math.max(0, VOICE_MAX_SEC - Math.floor((Date.now() - started) / 1000))
      setVoiceLeft(left)
      if (left <= 0) {
        window.clearInterval(tick)
        finishVoiceRef.current()
      }
    }, 250)
    return () => window.clearInterval(tick)
  }, [voicePhase])

  // Live-Text während Aufnahme auf 500 Zeichen deckeln → Stopp
  useEffect(() => {
    if (voicePhase !== 'listening') return
    const live = [value.trim(), interim.trim()].filter(Boolean).join(' ')
    if (live.length >= MAX_CHARS) finishVoiceRef.current()
  }, [value, interim, voicePhase])

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const text = clampText(value.trim())
    if (disabled || !text) return
    if (text !== value) setClamped(text)
    speech.stop()
    setVoicePhase('idle')
    setInterim('')
    onSubmit()
  }

  function startVoice() {
    if (disabled || !speech.supported) return
    finishingRef.current = false
    hadListeningRef.current = false
    setInterim('')
    interimRef.current = ''
    setVoiceLeft(VOICE_MAX_SEC)
    setVoicePhase('listening')
    speech.start()
  }

  function stopVoice() {
    finishVoice()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const livePreview = clampText([value.trim(), interim.trim()].filter(Boolean).join(' '))
  const chars = value.length
  const nearLimit = chars >= MAX_CHARS - 50

  if (voicePhase === 'listening') {
    return (
      <div className="ki-chat-composer ki-chat-composer--voice">
        <div className="ki-chat-composer__voice-panel">
          <VoiceWaves active />
          <p className="ki-chat-composer__voice-timer" aria-live="polite">
            {voiceLeft}s
          </p>
          <p className="ki-chat-composer__voice-hint" aria-live="polite">
            {livePreview || 'Ich höre zu…'}
          </p>
          <p className="ki-chat-composer__voice-meta">
            Max. {VOICE_MAX_SEC}s · {livePreview.length}/{MAX_CHARS} Zeichen
          </p>
          <button
            type="button"
            className="btn primary sm ki-chat-composer__voice-stop"
            onClick={stopVoice}
            aria-label="Aufnahme stoppen"
          >
            <MockIcon ctx="btn" n="player-stop" size={14} />
            Stopp
          </button>
        </div>
        {speech.error ? (
          <p className="ki-chat-composer__error">{speech.error}</p>
        ) : null}
      </div>
    )
  }

  return (
    <form className="ki-chat-composer" onSubmit={handleSubmit}>
      <div className="ki-chat-composer__bar">
        <button
          type="button"
          className="ki-chat-composer__icon-btn"
          disabled={disabled || !speech.supported}
          title={
            speech.supported
              ? `Sprachnotiz aufnehmen (max. ${VOICE_MAX_SEC}s)`
              : 'Spracheingabe auf diesem Gerät nicht verfügbar'
          }
          aria-label="Sprachnotiz aufnehmen"
          onClick={startVoice}
        >
          <MockIcon ctx="default" n="microphone" size={18} />
        </button>

        <textarea
          ref={taRef as React.RefObject<HTMLTextAreaElement>}
          className="ki-chat-composer__input"
          rows={1}
          maxLength={MAX_CHARS}
          placeholder={
            voicePhase === 'review' ? 'Text prüfen und senden…' : placeholder
          }
          value={value}
          onChange={(e) => {
            setClamped(e.target.value)
            if (voicePhase === 'review' && !e.target.value.trim()) setVoicePhase('idle')
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          enterKeyHint="send"
        />

        <button
          type="submit"
          className="ki-chat-composer__send"
          disabled={disabled || !value.trim()}
          aria-label="Senden"
          title="Senden"
        >
          <MockIcon ctx="btn" n="send" size={16} />
        </button>
      </div>
      {nearLimit || voicePhase === 'review' ? (
        <p
          className={cn(
            'ki-chat-composer__count',
            chars >= MAX_CHARS && 'is-limit'
          )}
        >
          {chars}/{MAX_CHARS}
        </p>
      ) : null}
      {speech.error ? (
        <p className="ki-chat-composer__error">{speech.error}</p>
      ) : null}
    </form>
  )
}
