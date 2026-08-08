'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { toast } from '@/components/ui/app-toast'
import { saveEmailTemplate, type EmailTemplateRow } from '@/app/(dashboard)/einstellungen/email/actions'
import { applyEmailTemplateVars, type EmailPreviewVars } from '@/lib/email-template-preview-vars'
import {
  EinstellungenListBody,
  EinstellungenListItem,
  EinstellungenListMeta,
  EinstellungenMeta,
} from '@/components/einstellungen/EinstellungenUi'
import { cn } from '@/lib/utils'

const VARIABLES = [
  'kundenname',
  'betrag',
  'datum',
  'link',
  'rechnungsnummer',
  'handwerkername',
  'gewerk',
  'startdatum',
  'enddatum',
] as const

function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, insert: string) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const before = el.value.slice(0, start)
  const after = el.value.slice(end)
  el.value = `${before}${insert}${after}`
  const pos = start + insert.length
  el.setSelectionRange(pos, pos)
  el.focus()
}

type Props = { templates: EmailTemplateRow[]; previewVars: EmailPreviewVars }

export function EmailTemplatesClient({ templates, previewVars }: Props) {
  const [open, setOpen] = useState<EmailTemplateRow | null>(null)
  const [betreff, setBetreff] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [testEmail, setTestEmail] = useState('')
  const [testBusy, setTestBusy] = useState(false)
  const [pending, startTransition] = useTransition()
  const betreffRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function openModal(t: EmailTemplateRow) {
    setOpen(t)
    setBetreff(t.betreff)
    setBodyHtml(t.body_html)
    setTab('edit')
  }

  const previewHtml = useMemo(() => applyEmailTemplateVars(bodyHtml, previewVars), [bodyHtml, previewVars])
  const previewSubject = useMemo(() => applyEmailTemplateVars(betreff, previewVars), [betreff, previewVars])

  function chipBetreff(v: string) {
    const el = betreffRef.current
    if (el) {
      insertAtCursor(el, `{{${v}}}`)
      setBetreff(el.value)
    } else {
      setBetreff((s) => `${s}{{${v}}}`)
    }
  }

  function chipBody(v: string) {
    const el = bodyRef.current
    if (el) {
      insertAtCursor(el, `{{${v}}}`)
      setBodyHtml(el.value)
    } else {
      setBodyHtml((s) => `${s}{{${v}}}`)
    }
  }

  function save() {
    if (!open) return
    startTransition(async () => {
      const r = await saveEmailTemplate(open.id, { betreff, body_html: bodyHtml })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setOpen(null)
    })
  }

  async function sendTest() {
    if (!open) return
    const to = testEmail.trim()
    if (!to) {
      toast.error('Bitte Test-E-Mail eingeben')
      return
    }
    setTestBusy(true)
    try {
      const res = await fetch('/api/einstellungen/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: open.id, to }),
      })
      const j = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error(j.error ?? 'Versand fehlgeschlagen')
        return
      }
      toast.success('Test-Mail gesendet')
    } finally {
      setTestBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="System-E-Mails" className="einst-list-card">
        <EinstellungenListBody empty={templates.length === 0 ? 'Keine Templates konfiguriert.' : undefined}>
          {templates.map((t) => (
            <EinstellungenListItem key={t.id}>
              <div className="min-w-0 flex-1">
                <p className="einst-list-title">{t.name}</p>
                <EinstellungenListMeta>{t.beschreibung ?? '—'}</EinstellungenListMeta>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => openModal(t)}>
                <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                Bearbeiten
              </Button>
            </EinstellungenListItem>
          ))}
        </EinstellungenListBody>
      </Card>

      <EditorSheet
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.name ?? 'Template bearbeiten'}
        context="detail"
        size="lg"
        confirmBusy={pending}
        onConfirm={() => save()}
      >
        {open ? (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-bw-border pb-2">
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-[length:var(--fs-text)] font-medium',
                  tab === 'edit' ? 'bg-bw-green-bg text-bw-primary' : 'text-bw-text-muted hover:text-bw-text'
                )}
                onClick={() => setTab('edit')}
              >
                Bearbeiten
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-[length:var(--fs-text)] font-medium',
                  tab === 'preview' ? 'bg-bw-green-bg text-bw-primary' : 'text-bw-text-muted hover:text-bw-text'
                )}
                onClick={() => setTab('preview')}
              >
                Vorschau
              </button>
            </div>

            {tab === 'edit' ? (
              <>
                <div>
                  <KiAssistFieldLabel
                    label="Betreff"
                    value={betreff}
                    onApply={setBetreff}
                    extraHint="E-Mail-Vorlage Betreff (kann {{Variablen}} enthalten)."
                    multiline={false}
                  >
                    <Input
                      ref={betreffRef}
                      value={betreff}
                      onChange={(e) => setBetreff(e.target.value)}
                    />
                  </KiAssistFieldLabel>
                  <p className="mt-2 text-[length:var(--fs-meta)] text-bw-text-muted">Variablen:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {VARIABLES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="chip text-[length:var(--fs-meta)]"
                        onClick={() => chipBetreff(v)}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <KiAssistFieldLabel
                    label="Inhalt (HTML)"
                    value={bodyHtml}
                    onApply={setBodyHtml}
                    extraHint="E-Mail-Vorlage Inhalt. Variablen wie {{kundenname}} beibehalten."
                  >
                    <div className="mb-2 flex flex-wrap gap-1">
                      {VARIABLES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="chip text-[length:var(--fs-meta)]"
                          onClick={() => chipBody(v)}
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      ref={bodyRef}
                      rows={14}
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      className="font-mono text-[length:var(--fs-text)]"
                    />
                  </KiAssistFieldLabel>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <EinstellungenMeta>
                  <span className="font-medium text-bw-text">Betreff: </span>
                  {previewSubject}
                </EinstellungenMeta>
                <div
                  className="max-w-none rounded-lg border border-bw-border bg-bw-canvas p-4 text-[length:var(--fs-text)] leading-relaxed text-bw-text [&_a]:text-bw-link [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3 border-t border-bw-border pt-4">
              <Input
                label="Test-Mail an"
                type="email"
                className="min-w-[200px] flex-1"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button type="button" variant="secondary" loading={testBusy} onClick={() => void sendTest()}>
                Test senden
              </Button>
            </div>
          </div>
        ) : null}
      </EditorSheet>
    </div>
  )
}
