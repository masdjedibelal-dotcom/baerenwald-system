'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/**
 * Bereich mit Stift-Icon → Bearbeitungsmodus.
 * Im Edit-Modus: Felder hervorgehoben + Abbrechen / Speichern.
 */
export function InlineEditSection({
  title,
  icon,
  editing,
  onStartEdit,
  onCancel,
  onSave,
  saving,
  disabled,
  children,
  className,
  editLabel = 'Bearbeiten',
  /** Kein Stift im Header (z. B. Stammdaten ohne ⋯/Icon-Edit). */
  hideEditTrigger = false,
}: {
  title: string
  icon?: string
  editing: boolean
  onStartEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  disabled?: boolean
  children: ReactNode
  className?: string
  editLabel?: string
  hideEditTrigger?: boolean
}) {
  return (
    <div className={cn('card', editing && 'inline-edit-section--active', className)}>
      <div className="card-h">
        <div className="card-title title">
          {icon ? <MockIcon ctx="emphasis" n={icon} size={16} /> : null}
          {title}
        </div>
        {!disabled ? (
          editing ? (
            <div className="inline-edit-actions">
              <MockBtn sm kind="ghost" onClick={onCancel} disabled={saving}>
                Abbrechen
              </MockBtn>
              <MockBtn sm kind="primary" icon="check" onClick={onSave} disabled={saving}>
                {saving ? 'Speichern…' : 'Speichern'}
              </MockBtn>
            </div>
          ) : hideEditTrigger ? null : (
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              title={editLabel}
              onClick={onStartEdit}
            />
          )
        ) : null}
      </div>
      <div className={cn('card-b', editing && 'inline-edit-body')}>{children}</div>
    </div>
  )
}

/** Einzelnes Feld: View vs. Input im Bearbeitungsmodus. */
export function InlineEditField({
  label,
  editing,
  children,
  value,
  link,
}: {
  label: string
  editing: boolean
  /** Edit-Control */
  children?: ReactNode
  /** Anzeigewert (View-Modus) */
  value?: ReactNode
  /** View-Modus: grüner Link-Stil (Telefon / E-Mail) */
  link?: boolean
}) {
  return (
    <div className={cn('prop', editing && 'inline-edit-field')}>
      <div className="prop-l">{label}</div>
      <div className={cn('prop-v', !editing && link && 'link')}>{editing ? children : value ?? '—'}</div>
    </div>
  )
}
