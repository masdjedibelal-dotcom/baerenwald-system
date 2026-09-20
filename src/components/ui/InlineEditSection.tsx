'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Bereich mit Stift-Icon → Bearbeitungsmodus.
 * Im Edit-Modus: Felder hervorgehoben + Abbrechen / Speichern.
 * Rahmen über MockCard.
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
  const actions = !disabled ? (
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
      <MockBtn sm kind="ghost" icon="pencil" title={editLabel} onClick={onStartEdit} />
    )
  ) : null

  return (
    <MockCard
      title={title}
      icon={icon}
      actions={actions}
      className={cn(editing && 'inline-edit-section--active', className)}
      bodyClassName={editing ? 'inline-edit-body' : undefined}
    >
      {children}
    </MockCard>
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
