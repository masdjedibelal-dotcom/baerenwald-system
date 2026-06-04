'use client'

import { useEffect, useState } from 'react'
import { Send, Paperclip} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

export interface MailVorschauProps {
  open: boolean
  onClose: () => void
  an: string
  betreff: string
  html: string
  onSend: (data: { an: string; betreff: string; html?: string }) => Promise<void>
  loading?: boolean
  hatAnhang?: boolean
  anhangName?: string
}

export function MailVorschau({
  open,
  onClose,
  an,
  betreff,
  html,
  onSend,
  loading = false,
  hatAnhang = false,
  anhangName,
}: MailVorschauProps) {
  const [localAn, setLocalAn] = useState(an)
  const [localBetreff, setLocalBetreff] = useState(betreff)
  const [localHtml, setLocalHtml] = useState(html)
  const [tab, setTab] = useState<'vorschau' | 'quelltext'>('vorschau')

  useEffect(() => {
    if (open) {
      setLocalAn(an)
      setLocalBetreff(betreff)
      setLocalHtml(html)
      setTab('vorschau')
    }
  }, [open, an, betreff, html])

  async function handleSend() {
    await onSend({ an: localAn, betreff: localBetreff, html: localHtml })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="E-Mail Vorschau"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={loading} onClick={() => void handleSend()}>
            <Send className="mr-2 h-4 w-4" aria-hidden />
            {loading ? 'Wird gesendet…' : 'Jetzt senden'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="input-label" htmlFor="mail-v-an">
            An
          </label>
          <input
            id="mail-v-an"
            value={localAn}
            onChange={(e) => setLocalAn(e.target.value)}
            className="input"
            type="email"
          />
        </div>
        <div>
          <label className="input-label" htmlFor="mail-v-sub">
            Betreff
          </label>
          <input
            id="mail-v-sub"
            value={localBetreff}
            onChange={(e) => setLocalBetreff(e.target.value)}
            className="input"
          />
        </div>
        {hatAnhang ? (
          <div className="flex items-center gap-2 rounded-lg bg-bw-hover px-3 py-2 text-sm text-bw-text-muted">
            <Paperclip className="h-4 w-4" aria-hidden />
            <span>{anhangName ?? 'Dokument.pdf'}</span>
          </div>
        ) : null}
        <div className="flex gap-2 border-b border-bw-border pb-2">
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === 'vorschau' ? 'bg-bw-green-bg text-bw-primary' : 'text-bw-light hover:text-bw-text'
            )}
            onClick={() => setTab('vorschau')}
          >
            Vorschau
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === 'quelltext' ? 'bg-bw-green-bg text-bw-primary' : 'text-bw-light hover:text-bw-text'
            )}
            onClick={() => setTab('quelltext')}
          >
            Text bearbeiten
          </button>
        </div>
        {tab === 'vorschau' ? (
          <div className="h-64 overflow-hidden rounded-lg border border-bw-border">
            <iframe title="Mail Vorschau" srcDoc={localHtml} className="h-64 w-full border-0" />
          </div>
        ) : (
          <Textarea
            plain
            value={localHtml}
            onChange={(e) => setLocalHtml(e.target.value)}
            className="min-h-[240px] font-mono text-xs"
            rows={12}
          />
        )}
      </div>
    </Modal>
  )
}
