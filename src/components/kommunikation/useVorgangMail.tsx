'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { VorgangMailsCard } from '@/components/kommunikation/VorgangMailsCard'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import { ladeVorgangMailKontext, type VorgangMailIds } from '@/app/(dashboard)/kommunikation/vorgang-mail-actions'

/**
 * „E-Mail schreiben“ für jede Vorgangsseite: öffnet die Mail-Maske (leere Nachricht, Vorlagen wählbar).
 * Gibt es eine eingegangene Mail, antwortet die neue Mail darauf (Re:, gleicher Verlauf).
 * Gesendete Mails und Antworten des Kunden stehen in der Akte (Karte „E-Mails“).
 */
export function useVorgangMail(ids: VorgangMailIds, opts?: { onSent?: () => void }) {
  const compose = useKundenMailCompose({ onSent: opts?.onSent })

  const schreiben = (antwortAufLogId?: string) =>
    compose.openCompose(() =>
      ladeVorgangMailKontext(ids).then((r) =>
        r.ok && antwortAufLogId ? { ...r, ctx: { ...r.ctx, antwortAufLogId } } : r
      )
    )

  const menuItem: ActionsMenuItem = {
    label: 'E-Mail schreiben',
    icon: <MockIcon ctx="btn" n="mail" size={16} />,
    onClick: () => schreiben(),
  }

  const mailsCard = (
    <VorgangMailsCard
      ids={ids}
      reloadKey={compose.reloadKey}
      onSchreiben={() => schreiben()}
      onAntworten={(id) => schreiben(id)}
    />
  )

  return { menuItem, modal: compose.modal, mailsCard }
}
