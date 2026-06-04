'use client'

import { useEffect } from 'react'

const RELOAD_KEY = 'bw-chunk-reload'

/** Nach .next-Reset lädt der Browser oft noch alte Chunk-URLs — einmaliger Reload behebt ChunkLoadError. */
export function ChunkLoadRecovery() {
  useEffect(() => {
    function shouldRecover(reason: unknown): boolean {
      const msg =
        reason instanceof Error
          ? `${reason.name} ${reason.message}`
          : String(reason ?? '')
      return msg.includes('ChunkLoadError') || msg.includes('Loading chunk')
    }

    function recover(reason: unknown) {
      if (!shouldRecover(reason)) return
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
    }

    const onRejection = (e: PromiseRejectionEvent) => recover(e.reason)
    const onError = (e: ErrorEvent) => recover(e.error ?? e.message)

    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return null
}
