'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'

export function LegacyDemoAnfragenBanner({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (count <= 0) return null

  async function purgeLegacy() {
    if (
      !window.confirm(
        `${count} Demo-/Test-Anfrage(n) unwiderruflich löschen? Echte Website-Anfragen bleiben erhalten.`
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope: 'legacy' }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        error?: string
        deletedLeads?: number
        deletedKunden?: number
      }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Löschen fehlgeschlagen')
        return
      }
      const n = json.deletedLeads ?? count
      toast.success(
        n > 0
          ? `${n} Demo-Anfrage(n) entfernt.`
          : 'Keine Demo-Anfragen mehr gefunden.'
      )
      router.refresh()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p>
        <span className="font-medium">{count} Demo-/Test-Anfrage{count === 1 ? '' : 'n'}</span> aus früheren
        Testdaten (z. B. example.com, Muster-Namen). Die App zeigt nur noch echte Supabase-Daten — diese Einträge
        liegen noch in der Datenbank.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void purgeLegacy()}
        className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
      >
        {busy ? 'Bitte warten…' : 'Demo-Anfragen löschen'}
      </button>
    </div>
  )
}
