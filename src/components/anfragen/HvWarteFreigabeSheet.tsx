'use client'

import Link from 'next/link'

import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { STAGING_WEBSITE_ORIGIN } from '@/lib/auth/staging-admin'
import { publicWebsiteBaseUrl } from '@/lib/portal-utils'

type Props = {
  open: boolean
  onClose: () => void
  leadId: string
  hvMeldungStatus?: string | null
  auftraggeberKundeId?: string | null
}

const HV_STATUS_LABEL: Record<string, string> = {
  neu: 'Neu — wartet auf HV-Entscheidung',
  hm_pruefung: 'Hausmeister prüft vor Ort',
  angebot_eingefordert: 'Angebot eingefordert — BW kann disponieren',
  kleinreparatur: 'Kleinreparatur (Mieter-Weg)',
  abgelehnt: 'Abgelehnt durch HV',
  notmassnahme: 'Notmaßnahme',
}

/**
 * Erklärt Staff den HV-Start-Gate: Primary „Warte auf HV / Hausmeister“ ist kein Dead-End.
 */
export function HvWarteFreigabeSheet({
  open,
  onClose,
  leadId,
  hvMeldungStatus,
  auftraggeberKundeId,
}: Props) {
  const statusKey = (hvMeldungStatus ?? 'neu').trim().toLowerCase()
  const statusLabel = HV_STATUS_LABEL[statusKey] ?? hvMeldungStatus ?? 'Neu'
  const portalBase = publicWebsiteBaseUrl()
  const portalVorgang = `${portalBase}/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`
  const kundeHref = auftraggeberKundeId?.trim()
    ? `/kunden/${auftraggeberKundeId.trim()}`
    : null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Warte auf HV / Hausmeister"
      context="detail"
      size="md"
    >
      <div className="space-y-4 text-sm leading-relaxed text-bw-text">
        <p className="m-0">
          Mieter-Meldungen starten mit <strong>hv_meldung_status = neu</strong>. Bärenwald darf erst
          disponieren, wenn die Hausverwaltung im <strong>Auftraggeber-Portal</strong> freigegeben hat
          oder die Hausmeister-Prüfung abgeschlossen ist.
        </p>

        <div className="rounded-lg border border-bw-border bg-bw-bg-soft px-3 py-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
            Aktueller Status
          </p>
          <p className="m-0 mt-1 font-medium">{statusLabel}</p>
        </div>

        <div>
          <p className="m-0 mb-2 font-semibold">Nächste Schritte (HV-Portal)</p>
          <ol className="m-0 list-decimal space-y-2 pl-5">
            <li>
              <strong>An Bärenwald übergeben</strong> (<code>angebot_einfordern</code>) — setzt Status
              auf <em>angebot_eingefordert</em>; danach erscheint im CRM „Angebot erstellen“.
            </li>
            <li>
              <strong>Hausmeister begutachten</strong> (<code>hm_begutachten</code>) — Status{' '}
              <em>hm_pruefung</em>; nach Befund durch HM oder Override durch HV → ebenfalls{' '}
              <em>angebot_eingefordert</em>.
            </li>
            <li>
              Optional: <strong>Kleinreparatur</strong> oder <strong>Ablehnen</strong> (nur aus{' '}
              <em>neu</em>).
            </li>
          </ol>
        </div>

        <p className="m-0 text-bw-text-muted">
          Akut / Havarie: im CRM „Als akut markieren“ und direkt beauftragen — umgeht dieses Gate.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <MockBtn
            kind="secondary"
            onClick={() => {
              window.open(portalVorgang, '_blank', 'noopener,noreferrer')
            }}
          >
            Vorgang im HV-Portal öffnen
          </MockBtn>
          {kundeHref ? (
            <Link href={kundeHref} className="btn secondary text-sm">
              HV-Stammdaten
            </Link>
          ) : null}
          <MockBtn kind="ghost" onClick={onClose}>
            Schließen
          </MockBtn>
        </div>

        {portalBase.includes('staging--') ? (
          <p className="m-0 text-xs text-bw-text-muted">
            Staging-Portal: {STAGING_WEBSITE_ORIGIN}
          </p>
        ) : null}
      </div>
    </EditorSheet>
  )
}
