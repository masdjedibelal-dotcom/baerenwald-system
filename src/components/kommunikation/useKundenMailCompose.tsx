'use client'

import { useState, useTransition } from 'react'
import { Mail } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import { KundenMailComposeModal } from '@/components/kommunikation/KundenMailComposeModal'
import type { MailComposeContext } from '@/lib/kommunikation/types'

export function useKundenMailCompose(opts?: { onSent?: () => void }) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState<MailComposeContext | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const onSentRef = opts?.onSent

  function openCompose(
    loader: () => Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }>
  ) {
    startTransition(() => {
      void loader()
        .then((res) => {
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          setCtx(res.ctx)
          setOpen(true)
        })
        .catch(() => {
          toast.error('E-Mail-Dialog konnte nicht geladen werden.')
        })
    })
  }

  const modal = (
    <KundenMailComposeModal
      open={open}
      onClose={() => setOpen(false)}
      ctx={ctx}
      onSent={() => {
        setReloadKey((k) => k + 1)
        onSentRef?.()
      }}
    />
  )

  return { openCompose, modal, reloadKey, pending }
}
