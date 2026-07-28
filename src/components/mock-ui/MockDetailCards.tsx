'use client'

import type { ReactNode } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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
}: {
  notes: MockNotiz[]
  composer?: ReactNode
}) {
  return (
    <MockCard title={`Notizen · ${notes.length}`} icon="messages">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: notes.length ? 14 : 0 }}>
        {notes.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '4px 0' }}>
            Noch keine Notizen — schreibe die erste unten.
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

export function MockNotizComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Notiz schreiben…  (Enter senden · Shift+Enter neue Zeile)',
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
        onChange={(e) => {
          onChange(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
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
        <MockIcon ctx="default" n="send" size={16} />
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
