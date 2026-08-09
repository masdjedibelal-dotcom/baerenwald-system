'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DashedAddCard({
  label,
  onClick,
  secondary,
  className,
}: {
  label: string
  onClick: () => void
  secondary?: ReactNode
  className?: string
}) {
  return (
    <button type="button" className={cn('dashed-add-card', className)} onClick={onClick}>
      <span className="dashed-add-card__plus" aria-hidden>
        +
      </span>
      <span className="dashed-add-card__label">{label}</span>
      {secondary ? <span className="dashed-add-card__secondary">{secondary}</span> : null}
    </button>
  )
}

export function GroupedFieldCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('grouped-field-card', className)}>{children}</div>
}

export function GroupedFieldRow({
  label,
  children,
  onClick,
}: {
  label: string
  children?: ReactNode
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <button type="button" className="grouped-field-row" onClick={onClick}>
        <span className="grouped-field-row__label">{label}</span>
        <span className="grouped-field-row__value">{children}</span>
      </button>
    )
  }
  return (
    <div className="grouped-field-row">
      <span className="grouped-field-row__label">{label}</span>
      <span className="grouped-field-row__value">{children}</span>
    </div>
  )
}

export function AddRowList({
  items,
}: {
  items: { label: string; onClick: () => void }[]
}) {
  return (
    <div className="add-row-list">
      <p className="add-row-list__heading">hinzufügen</p>
      {items.map((it) => (
        <button key={it.label} type="button" className="add-row-list__row" onClick={it.onClick}>
          <span className="add-row-list__plus" aria-hidden>
            +
          </span>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function CollapseRow({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode
  children?: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <details className={cn('crow bw-collapse-row', className)} open={defaultOpen || undefined}>
      <summary className="crow-head bw-collapse-row__summary">{summary}</summary>
      {children ? <div className="crow-body bw-collapse-row__body">{children}</div> : null}
    </details>
  )
}

export function DocActionBar({
  actions,
  className,
}: {
  actions: { id: string; label: string; onClick: () => void; icon: ReactNode; danger?: boolean }[]
  className?: string
}) {
  return (
    <div className={cn('doc-action-bar', className)} role="toolbar" aria-label="Dokument">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className={cn('doc-action-bar__btn', a.danger && 'doc-action-bar__btn--danger')}
          onClick={a.onClick}
          aria-label={a.label}
          title={a.label}
        >
          {a.icon}
          <span className="doc-action-bar__lbl">{a.label}</span>
        </button>
      ))}
    </div>
  )
}
