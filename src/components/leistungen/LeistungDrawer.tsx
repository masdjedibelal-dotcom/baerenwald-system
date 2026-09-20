'use client'

import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ReactNode } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DetailProp } from '@/components/ui/detail-prop'
import { LeistungHandwerkerUpdatesAccordion } from '@/components/leistungen/LeistungHandwerkerUpdatesAccordion'
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
 * Leistungs-Drawer: Position · Zuweisung · optional Nachtrag-Freigabe.
 * Freigabe: Footer Bestätigen / Ablehnen. Zuweisen: Primary-Button im Header.
 */
export function LeistungDrawer({
  open,
  onClose,
  row,
  actions = [],
  pruefungPending = false,
  onNachtragEntscheiden,
}: {
  open: boolean
  onClose: () => void
  row: LeistungRow | null
  actions?: LeistungDrawerAction[]
  pruefungPending?: boolean
  onNachtragEntscheiden?: (status: 'anerkannt' | 'abgelehnt') => void
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

      <Section title="Zuweisung" icon="link">
        <div className="props">
          <DetailProp label="Ausführung">{row.handwerkerName ?? '—'}</DetailProp>
          {row.anfrageStatusLabel ? (
            <DetailProp label="Anfrage">
              <StatusBadge
                status={
                  row.brauchtFreigabe
                    ? 'offen'
                    : row.anerkennungStatus === 'abgelehnt'
                      ? 'storniert'
                      : row.anerkennungStatus === 'anerkannt'
                        ? 'abgenommen'
                        : 'gesendet'
                }
                label={row.anfrageStatusLabel}
              />
            </DetailProp>
          ) : null}
          {row.zeitraumLabel ? (
            <DetailProp label="Zeitraum">{row.zeitraumLabel}</DetailProp>
          ) : null}
        </div>
      </Section>

      {!brauchtFreigabe && (row.istRegie || (row.handwerkerUpdates && row.handwerkerUpdates.length > 0)) ? (
        <Section title="Partner-Updates" icon="camera">
          {row.regieSollIstLabel ? (
            <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">
              {row.regieSollIstLabel}
              {row.istRegie
                ? ' — Grundlage für die Rechnung (nach Prüfung).'
                : null}
            </p>
          ) : row.istRegie ? (
            <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">
              Noch keine Zeiten aus dem Bautagebuch — Rechnung nutzt die Schätzung, bis Updates
              vorliegen.
            </p>
          ) : null}
          {(row.handwerkerUpdates ?? []).length === 0 ? (
            <MockEmpty title="Keine Einträge." />
          ) : (
            <LeistungHandwerkerUpdatesAccordion updates={row.handwerkerUpdates ?? []} />
          )}
        </Section>
      ) : null}
    </EditorSheet>
  )
}

