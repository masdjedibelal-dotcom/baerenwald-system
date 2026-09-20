'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { KundenMailComposeModal } from '@/components/kommunikation/KundenMailComposeModal'
import type { MailComposeContext } from '@/lib/kommunikation/types'
import { TOAST } from '@/lib/copy'

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
            toast.systemError(res)
            return
          }
          setCtx(res.ctx)
          setOpen(true)
        })
        .catch(() => {
          toast.error(TOAST.e_mail_dialog_konnte_nicht_geladen_werden)
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
