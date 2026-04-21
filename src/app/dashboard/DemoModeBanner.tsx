'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/app-toast'

export function DemoModeBanner() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function resetDemo() {
    if (!window.confirm('Alle Demo-Daten löschen und Standard-Testdaten neu einspielen?')) return
    setBusy(true)
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' })
      const j = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error(j.error ?? 'Zurücksetzen fehlgeschlagen')
        return
      }
      toast.success('Demo-Daten wurden zurückgesetzt.')
      router.refresh()
      window.setTimeout(() => {
        window.location.reload()
      }, 400)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="status"
      className="-mx-4 mb-3 flex flex-wrap items-center justify-center gap-2 px-4 py-2 text-center text-[13px] md:-mx-8"
      style={{
        background: '#FAEEDA',
        borderBottom: '1px solid #EF9F27',
        color: '#633806',
      }}
    >
      <span>
        Demo-Modus — alle Daten sind Testdaten
        <button
          type="button"
          disabled={busy}
          onClick={() => void resetDemo()}
          className="ml-2 inline-flex min-h-[36px] items-center rounded border px-2 py-1 text-[13px] font-medium underline decoration-2 underline-offset-2 disabled:opacity-50"
          style={{ borderColor: '#EF9F27', color: '#633806' }}
        >
          {busy ? 'Bitte warten…' : 'Demo zurücksetzen'}
        </button>
      </span>
    </div>
  )
}
