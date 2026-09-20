'use client'

import { MockBtn } from '@/components/mock-ui'
import { openActionConfirm } from '@/components/ui/ConfirmPopup'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { TOAST } from '@/lib/copy'
export function DemoModeBanner() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  function wipeTransactionalData() {
    openActionConfirm({
      title: 'Transaktionsdaten leeren?',
      body: 'Alle CRM-Transaktionsdaten (Anfragen, Kunden, Aufträge, Rechnungen, Termine …) werden unwiderruflich gelöscht. Es werden keine Demo-Testdaten neu angelegt.',
      confirmLabel: 'Alles löschen',
      cancelLabel: 'Abbrechen',
      danger: true,
      busyLabel: null,
      onConfirm: async () => {
        setBusy(true)
        try {
          const res = await fetch('/api/demo/reset', { method: 'POST' })
          const json = (await res.json()) as { ok?: boolean; error?: string }
          if (!res.ok || !json.ok) {
            toast.error(json.error ?? 'Löschen fehlgeschlagen')
            return
          }
          toast.success(TOAST.transaktionsdaten_wurden_geloescht)
          router.refresh()
        } catch {
          toast.error(TOAST.netzwerkfehler)
        } finally {
          setBusy(false)
        }
      },
    })
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-status-contact-bg bg-status-contact-bg px-4 py-2 text-[length:var(--fs-text)] text-status-contact-text"
    >
      <span>Demo-/Test-Account — Transaktionsdaten stammen aus Supabase (keine eingebauten Mock-Datensätze).</span>
      <MockBtn
        className="shrink-0 min-h-11 min-w-11 rounded-button border border-status-contact-bg bg-white px-3 text-[length:var(--fs-meta)] font-medium text-status-contact-text hover:bg-status-contact-bg disabled:opacity-50"
        type="button"
        disabled={busy}
        onClick={() => wipeTransactionalData()}
      >
        {busy ? 'Bitte warten…' : 'Transaktionsdaten leeren'}
      </MockBtn>
    </div>
  )
}
