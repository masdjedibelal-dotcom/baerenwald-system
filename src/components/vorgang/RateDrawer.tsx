'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockProp } from '@/components/mock-ui/MockProp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { formatDatum } from '@/lib/utils'
import type { ZahlplanRateStatus } from '@/lib/rechnungen/zahlungsplan'

export type RateDrawerMahnung = {
  stufe: number
  datum: string
}

export type RateDrawerReklamation = {
  datum: string
  grund?: string | null
}

export type RateDrawerBeleg = {
  id: string
  nummer: string
  status: string
  statusLabel: string
  belegTyp?: string | null
  brutto?: number | null
}

export type RateDrawerRate = {
  id: string
  label: string
  status: ZahlplanRateStatus
  betrag: number
  faellig?: string | null
  prozent?: number | null
  reNr?: string | null
  rechnungId?: string | null
  reklamation?: RateDrawerReklamation | null
  /** Alle Belege zu dieser Rate (Original + Korrekturen/Gutschriften) */
  belege?: RateDrawerBeleg[]
}

export type RateDrawerCta = {
  id: string
  label: string
  icon?: string
  primary?: boolean
  onClick: () => void
  disabled?: boolean
}

function sec(title: string, icon: string, body: ReactNode) {
  return (
    <div className="rate-drawer-sec">
      <div className="rate-drawer-sec-h">
        <MockIcon ctx="btn" n={icon} size={13} />
        {title}
      </div>
      {body}
    </div>
  )
}

/**
 * RateDrawer: Lese-Abschnitte; Aktionen (Öffnen / Bearbeiten) als Icons rechts oben.
 */
export function RateDrawer({
  open,
  rate,
  mahnungen = [],
  onClose,
  ctas = [],
}: {
  open: boolean
  rate: RateDrawerRate | null
  mahnungen?: RateDrawerMahnung[]
  onClose: () => void
  ctas?: RateDrawerCta[]
}) {
  const headerEnd =
    ctas.length > 0 ? (
      <div className="flex items-center gap-0.5">
        {ctas.map((c) => (
          <button
            key={c.id}
            type="button"
            className="editor-sheet__icon-btn"
            disabled={c.disabled}
            aria-label={c.label}
            title={c.label}
            onClick={c.onClick}
          >
            <MockIcon ctx="default" n={c.icon ?? 'eye'} size={20} />
          </button>
        ))}
      </div>
    ) : undefined

  if (!rate) {
    return (
      <EditorSheet open={open} onClose={onClose} title="Abschlag">
        <div className="rate-drawer-empty">Keine Rate ausgewählt.</div>
      </EditorSheet>
    )
  }

  const r = rate
  const belege = r.belege ?? []
  const aktivBeleg = belege.find((b) => b.id === r.rechnungId) ?? belege[0] ?? null
  const crumbNr = (aktivBeleg?.nummer || r.reNr || '').trim()
  const sheetCrumb = crumbNr ? `${crumbNr} >` : null
  const ueberfaellig =
    r.status === 'gestellt' &&
    Boolean(r.faellig) &&
    new Date(String(r.faellig).slice(0, 10)) < new Date(new Date().toDateString())

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={r.label || 'Abschlag'}
      crumb={sheetCrumb}
      headerEnd={headerEnd}
      size="lg"
    >
      {sec(
        'Abschlag',
        'calculator',
        <div className="props">
          <MockProp label="Bezeichnung">{r.label || '—'}</MockProp>
          {r.prozent != null ? (
            <MockProp label="Anteil">{r.prozent} % der Auftragssumme</MockProp>
          ) : null}
          <MockProp label="Betrag">
            <span className="rate-drawer-betrag">{formatEurBetrag(r.betrag)}</span>
          </MockProp>
          <MockProp label="Fällig">
            {r.faellig ? formatDatum(String(r.faellig).slice(0, 10)) : '—'}
          </MockProp>
        </div>
      )}

      {sec(
        'Rechnung',
        'file-invoice',
        r.status === 'geplant' && belege.length === 0 ? (
          <div className="rate-drawer-empty">Noch nicht gestellt.</div>
        ) : belege.length > 1 ? (
          <div className="rate-drawer-belege">
            <div className="rate-drawer-belege__count">{belege.length} Belege</div>
            <ul className="rate-drawer-belege__list">
              {belege.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/rechnungen/${b.id}`}
                    className="rate-drawer-belege__row rate-drawer-belege__row--link"
                  >
                    <div className="rate-drawer-belege__main">
                      <span className="rate-drawer-belege__nr">
                        {b.nummer || '—'}
                        {String(b.belegTyp ?? '') === 'gutschrift' ? ' · Gutschrift' : ''}
                      </span>
                      {b.brutto != null ? (
                        <span className="rate-drawer-belege__brutto">
                          {formatEurBetrag(b.brutto)}
                        </span>
                      ) : null}
                    </div>
                    <StatusBadge status={b.status} label={b.statusLabel} />
                  </Link>
                </li>
              ))}
            </ul>
            {r.status === 'bezahlt' ? (
              <div className="rate-drawer-note">
                Bezahlt — Positionsänderungen erzeugen Storno + neue Rechnung.
              </div>
            ) : r.status === 'gestellt' ? (
              <div className="rate-drawer-note">
                Versendet — nur Mail ohne Storno; Positionsänderungen mit Storno.
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="props">
              <MockProp label="Nummer">{aktivBeleg?.nummer || r.reNr || '—'}</MockProp>
              <MockProp label="Status">
                {r.status === 'bezahlt'
                  ? 'Bezahlt'
                  : r.status === 'gestellt'
                    ? 'Gestellt'
                    : aktivBeleg?.statusLabel || '—'}
              </MockProp>
              <MockProp label="Änderbar">
                {r.status === 'bezahlt' || r.status === 'gestellt'
                  ? 'über Bearbeiten'
                  : 'direkt bearbeitbar'}
              </MockProp>
            </div>
            <div className="rate-drawer-note">
              {r.status === 'bezahlt' || r.status === 'gestellt'
                ? 'Positionsänderungen erzeugen Storno + neue Rechnung; nur Mail ohne Storno.'
                : 'Änderbar bis Zahlungseingang.'}
            </div>
          </>
        )
      )}

      {sec(
        'Zahlung',
        'check',
        r.status === 'bezahlt' ? (
          <div className="props">
            <MockProp label="Eingang">
              <span className="rate-drawer-paid">✓ Vollständig bezahlt</span>
            </MockProp>
          </div>
        ) : (
          <div className="rate-drawer-empty">
            Offen
            {r.faellig ? ` · fällig ${formatDatum(String(r.faellig).slice(0, 10))}` : ''}.
          </div>
        )
      )}

      {r.reklamation
        ? sec(
            'Reklamation',
            'alert-triangle',
            <div className="props">
              <MockProp label="Gemeldet">
                {r.reklamation.datum
                  ? formatDatum(String(r.reklamation.datum).slice(0, 10))
                  : '—'}
              </MockProp>
              <MockProp label="Grund">{r.reklamation.grund || 'in Prüfung'}</MockProp>
              <MockProp label="Status">
                <StatusBadge status="reklamiert" label="Strittig — in Prüfung" tone="rot" />
              </MockProp>
            </div>
          )
        : null}

      {r.status !== 'geplant'
        ? sec(
            'Mahnungen',
            'alert-triangle',
            mahnungen.length > 0 ? (
              <div className="rate-drawer-mahnungen">
                {mahnungen.map((m) => (
                  <div key={m.stufe} className="rate-drawer-mahnung">
                    <StatusBadge
                      status="ueberfaellig"
                      label={`Stufe ${m.stufe}`}
                      tone="rot"
                    />
                    <span>
                      gesendet {formatDatum(String(m.datum).slice(0, 10))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rate-drawer-empty">
                Keine Mahnung gesendet.
                {ueberfaellig ? ' Die Rechnung ist überfällig.' : ''}
              </div>
            )
          )
        : null}
    </EditorSheet>
  )
}
