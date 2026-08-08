'use client'

import type { ReactNode } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { ACTIVITY_TAB_LABEL } from '@/lib/crm-labels'

export function MockVerlaufCard({ children, empty }: { children: ReactNode; empty?: boolean }) {
  return (
    <MockCard title={ACTIVITY_TAB_LABEL} icon="history">
      {empty ? (
        <MockEmpty
          icon="history"
          title={`Keine ${ACTIVITY_TAB_LABEL}`}
          hint="Ereignisse und Schritte erscheinen hier."
        />
      ) : (
        children
      )}
    </MockCard>
  )
}

export function MockDokumenteCard({
  children,
  empty,
  count,
}: {
  children: ReactNode
  empty?: boolean
  count?: number
}) {
  const title = count != null ? `Dokumente · ${count}` : 'Dokumente'
  return (
    <MockCard title={title} icon="files">
      {empty ? (
        <MockEmpty icon="files" title="Keine Dokumente" hint="Dateien und Fotos erscheinen hier" />
      ) : (
        children
      )}
    </MockCard>
  )
}

export type MockNotiz = { autor?: string; time?: string; text: string; kind?: string }

export function MockNotizenCard({
  notes,
  composer,
  emptyHint,
}: {
  notes: MockNotiz[]
  composer?: ReactNode
  emptyHint?: string
}) {
  return (
    <MockCard title={`Notizen · ${notes.length}`} icon="messages">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: notes.length ? 14 : 0 }}>
        {notes.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '4px 0' }}>
            {emptyHint ?? 'Noch keine Notizen — schreibe die erste unten.'}
          </div>
        ) : (
          notes.map((n, i) => (
            <div
              key={i}
              className="note"
              style={n.kind ? { background: `var(--${n.kind}-bg)` } : undefined}
            >
              <div className="meta">
                {n.autor ?? ''}
                {n.time ? ` · ${n.time}` : ''}
              </div>
              {n.text}
            </div>
          ))
        )}
      </div>
      {composer}
    </MockCard>
  )
}

const NOTE_COMPOSER_MAX_LINES = 5

function resizeNotizTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  const styles = window.getComputedStyle(el)
  const lineHeight = Number.parseFloat(styles.lineHeight) || 22
  const paddingY =
    (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0)
  const maxHeight = lineHeight * NOTE_COMPOSER_MAX_LINES + paddingY
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
}

export function MockNotizComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Notiz schreiben',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
}) {
  const canSend = Boolean(value.trim()) && !disabled
  return (
    <div className="note-composer">
      <textarea
        rows={1}
        value={value}
        disabled={disabled}
        ref={(el) => {
          if (el) resizeNotizTextarea(el)
        }}
        onChange={(e) => {
          onChange(e.target.value)
          resizeNotizTextarea(e.target)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (canSend) onSubmit()
          }
        }}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="note-send"
        disabled={!canSend}
        onClick={onSubmit}
        title="Notiz speichern"
      >
        <ActionIcon n="send" size={16} />
      </button>
    </div>
  )
}

export function MockZahlplanCard({ children }: { children: ReactNode }) {
  return (
    <MockCard title="Zahlplan" icon="calculator">
      {children}
    </MockCard>
  )
}

export function MockMahnungCard({ children }: { children: ReactNode }) {
  return (
    <MockCard title="Mahnung" icon="mail-forward">
      {children}
    </MockCard>
  )
}

export function MockBautagebuchCard({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <MockCard title="Bautagebuch" icon="clipboard-list" actions={actions}>
      {children}
    </MockCard>
  )
}
