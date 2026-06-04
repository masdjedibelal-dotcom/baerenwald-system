'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'

export function DemoModeBanner() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function wipeTransactionalData() {
    if (
      !window.confirm(
        'Alle CRM-Transaktionsdaten (Anfragen, Kunden, Aufträge, Rechnungen, Termine …) unwiderruflich löschen? Es werden keine Demo-Testdaten neu angelegt.'
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Löschen fehlgeschlagen')
        return
      }
      toast.success('Transaktionsdaten wurden gelöscht.')
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
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950"
    >
      <span>Demo-/Test-Account — Transaktionsdaten stammen aus Supabase (keine eingebauten Mock-Datensätze).</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void wipeTransactionalData()}
        className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
      >
        {busy ? 'Bitte warten…' : 'Transaktionsdaten leeren'}
      </button>
    </div>
  )
}
