'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useEffect, useState } from 'react'
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
    <EditorSheet
      open={open}
      onClose={onClose}
      title="E-Mail Vorschau"
      size="lg"
      secondary={{ label: 'Abbrechen', onClick: onClose }}
      primary={{
        label: loading ? 'Wird gesendet…' : 'Jetzt senden',
        onClick: () => void handleSend(),
        busy: loading,
      }}
    >
      <div className="space-y-4">
        <div>
          <label className="input-label" htmlFor="mail-v-an">
            An
          </label>
          <MockInput id="mail-v-an" value={localAn} onChange={(e) => setLocalAn(e.target.value)} type="email" />
        </div>
        <div>
          <label className="input-label" htmlFor="mail-v-sub">
            Betreff
          </label>
          <MockInput id="mail-v-sub" value={localBetreff} onChange={(e) => setLocalBetreff(e.target.value)} />
        </div>
        {hatAnhang ? (
          <div className="flex items-center gap-2 rounded-card bg-bw-hover px-3 py-2 text-sm text-bw-text-muted">
            <MockIcon n="file" ctx="default" className="h-4 w-4" aria-hidden />
            <span>{anhangName ?? 'Dokument.pdf'}</span>
          </div>
        ) : null}
        <div className="flex gap-2 border-b border-bw-border pb-2">
          <MockBtn className={cn(
              'rounded-button px-3 py-1.5 text-sm font-medium',
              tab === 'vorschau' ? 'bg-bw-green-bg text-bw-primary' : 'text-bw-light hover:text-bw-text'
            )} type="button" onClick={() => setTab('vorschau')}>
            Vorschau
          </MockBtn>
          <MockBtn className={cn(
              'rounded-button px-3 py-1.5 text-sm font-medium',
              tab === 'quelltext' ? 'bg-bw-green-bg text-bw-primary' : 'text-bw-light hover:text-bw-text'
            )} type="button" onClick={() => setTab('quelltext')}>
            Text bearbeiten
          </MockBtn>
        </div>
        {tab === 'vorschau' ? (
          <div className="h-64 overflow-hidden rounded-card border border-bw-border">
            <iframe title="Mail Vorschau" srcDoc={localHtml} className="h-64 w-full border-0" />
          </div>
        ) : (
          <MockTextarea value={localHtml} onChange={(e) => setLocalHtml(e.target.value)} rows={12} className="resize-y py-2 min-h-[120px] min-h-[240px] font-mono text-xs" />
        )}
      </div>
    </EditorSheet>
  )
}
