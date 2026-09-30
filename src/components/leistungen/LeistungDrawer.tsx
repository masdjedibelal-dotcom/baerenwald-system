'use client'

import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ReactNode } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DetailProp } from '@/components/ui/detail-prop'
import type { LeistungDrawerAction, LeistungRow } from '@/components/leistungen/types'

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: ReactNode
}) {
  return (
    <section className="ldr-sec">
      <div className="ldr-sec-h">
        <MockIcon ctx="empty" n={icon} size={14} />
        {title}
      </div>
      {children}
    </section>
  )
}

/**
 * Leistungs-Drawer: Position · optional Nachtrag-Freigabe.
 * Partner und ihre Updates stehen am Einsatz (Karte „Einsätze“), nicht an der Position.
 */
export function LeistungDrawer({
  open,
  onClose,
  row,
  actions = [],
  pruefungPending = false,
  onNachtragEntscheiden,
  onRegieBearbeiten,
}: {
  open: boolean
  onClose: () => void
  row: LeistungRow | null
  actions?: LeistungDrawerAction[]
  pruefungPending?: boolean
  onNachtragEntscheiden?: (status: 'anerkannt' | 'abgelehnt') => void
  /** Regie in Prüfung: dritte Aktion neben Annehmen/Ablehnen */
  onRegieBearbeiten?: () => void
  /** @deprecated */
  secondaryHint?: string | null
}) {
  const brauchtFreigabe = Boolean(row?.brauchtFreigabe && onNachtragEntscheiden)

  const headerEnd =
    !brauchtFreigabe && actions.length > 0 ? (
      <div className="flex items-center gap-2">
        {actions.map((a) => {
          const isZuweisen = a.id === 'zuweisen'
          const isAbwaehlen = a.id === 'abwaehlen'
          const label = isZuweisen ? 'Zuweisen' : a.label
          if (isZuweisen || isAbwaehlen) {
            return (
              <MockBtn kind="secondary" sm className={isAbwaehlen ? '' : ''} key={a.id} type="button" disabled={a.disabled} aria-label={label} onClick={() => {
                  onClose()
                  a.onClick()
                }}>
                {label}
              </MockBtn>
            )
          }
          return (
            <MockBtn className="editor-sheet__icon-btn" key={a.id} type="button" disabled={a.disabled} aria-label={a.label} title={a.label} onClick={() => {
                onClose()
                a.onClick()
              }}>
              <MockIcon ctx="default" n={a.icon ?? 'user'} size={20} />
            </MockBtn>
          )
        })}
      </div>
    ) : undefined

  if (!row) {
    return (
      <EditorSheet open={open} onClose={onClose} title="Leistung" size="lg">
        <MockEmpty title="Keine Leistung ausgewählt." />
      </EditorSheet>
    )
  }

  const footerPrimary = brauchtFreigabe
    ? {
        label: pruefungPending ? '…' : 'Annehmen',
        onClick: () => onNachtragEntscheiden?.('anerkannt'),
        disabled: pruefungPending,
        busy: pruefungPending,
      }
    : null
  const footerSecondary = brauchtFreigabe
    ? onRegieBearbeiten
      ? {
          label: 'Bearbeiten',
          onClick: () => {
            onClose()
            onRegieBearbeiten()
          },
          disabled: pruefungPending,
          kind: 'secondary' as const,
        }
      : {
          label: 'Ablehnen',
          onClick: () => onNachtragEntscheiden?.('abgelehnt'),
          disabled: pruefungPending,
        }
    : null
  const footerDanger = brauchtFreigabe && onRegieBearbeiten
    ? {
        label: 'Ablehnen',
        onClick: () => onNachtragEntscheiden?.('abgelehnt'),
        disabled: pruefungPending,
      }
    : null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={row.bezeichnung}
      crumb={row.gewerkName ? `${row.gewerkName} >` : null}
      size="lg"
      headerEnd={headerEnd}
      primary={footerPrimary}
      secondary={footerSecondary}
      danger={footerDanger}
    >
      {brauchtFreigabe ? (
        <Section title="Nachtrag zur Freigabe" icon="clipboard-list">
          <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">
            Der Partner hat weitere Arbeit eingereicht — bitte prüfen und freigeben oder
            ablehnen. Das Ergebnis erscheint im Hausmeister-Portal.
          </p>
          <div className="props">
            <DetailProp label="Status">
              <StatusBadge status="offen" label="Offen" />
            </DetailProp>
            {row.handwerkerName ? (
              <DetailProp label="Partner">{row.handwerkerName}</DetailProp>
            ) : null}
            <DetailProp label="Begründung">
              <span className="whitespace-pre-wrap">
                {row.nachtragBegruendung?.trim() || row.beschreibung?.trim() || '—'}
              </span>
            </DetailProp>
            <DetailProp label="Preis">
              <span className="ldr-gesamt">{row.nachtragPreisLabel ?? row.preisLabel}</span>
            </DetailProp>
            <DetailProp label="Zeit">
              {row.nachtragZeitLabel ?? row.mengeLabel}
            </DetailProp>
          </div>
        </Section>
      ) : null}

      <Section title="Position" icon="file-text">
        <div className="props">
          {row.gewerkName ? <DetailProp label="Gewerk">{row.gewerkName}</DetailProp> : null}
          {row.istRegie ? <DetailProp label="Vergütung">nach Aufwand</DetailProp> : null}
          <DetailProp label={row.istRegie ? 'Schätzung' : 'Menge'}>{row.mengeLabel}</DetailProp>
          <DetailProp label={row.istRegie ? 'Partner-Preis' : 'Einzelpreis'}>
            {row.nachtragPreisLabel ?? row.einzelpreisLabel ?? row.preisLabel}
          </DetailProp>
          <DetailProp label="Gesamt">
            <span className="ldr-gesamt">{row.preisLabel}</span>
          </DetailProp>
        </div>
      </Section>

    </EditorSheet>
  )
}

