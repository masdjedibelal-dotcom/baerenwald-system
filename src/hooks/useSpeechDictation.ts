'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: {
    resultIndex: number
    results: ArrayLike<{
      isFinal: boolean
      0: { transcript: string }
    }>
  }) => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Browser-Diktat (Web Speech API) — vor allem mobil Chrome/Safari.
 */
export function useSpeechDictation({
  lang = 'de-DE',
  onFinal,
  onInterim,
}: {
  lang?: string
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  const onInterimRef = useRef(onInterim)
  onFinalRef.current = onFinal
  onInterimRef.current = onInterim

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()))
  }, [])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (!rec) {
      setListening(false)
      return
    }
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError('Spracheingabe wird auf diesem Gerät nicht unterstützt.')
      return
    }
    setError(null)
    try {
      recRef.current?.abort()
    } catch {
      /* ignore */
    }
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => {
      let interim = ''
      let finalChunk = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (!r) continue
        const t = r[0]?.transcript?.trim() ?? ''
        if (!t) continue
        if (r.isFinal) finalChunk = finalChunk ? `${finalChunk} ${t}` : t
        else interim = interim ? `${interim} ${t}` : t
      }
      if (finalChunk) onFinalRef.current(finalChunk)
      onInterimRef.current?.(interim)
    }
    rec.onerror = (ev) => {
      const code = ev.error ?? ''
      if (code === 'aborted' || code === 'no-speech') return
      if (code === 'not-allowed') {
        setError('Mikrofon-Zugriff verweigert — bitte in den Einstellungen erlauben.')
      } else if (code) {
        setError('Spracheingabe fehlgeschlagen — bitte tippen.')
      }
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      // Interim nicht hier leeren — Composer übernimmt den Text beim Stopp/Review.
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Spracheingabe konnte nicht starten.')
      setListening(false)
    }
  }, [lang])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return { supported, listening, error, start, stop, toggle, setError }
}
