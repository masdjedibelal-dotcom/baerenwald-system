'use client'

import type { ReactNode } from 'react'
import type { PartnerRow } from '@/components/partner/PartnerNetzwerkClient'

function partnerTypLabel(p: PartnerRow): string {
  return (p.partner_typ ?? 'partner') === 'netzwerk' ? 'Netzwerk' : 'Partner'
}

function websiteHref(raw: string): string {
  const t = raw.trim()
  if (!t) return '#'
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function PanelField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-bw-text-muted">{label}</dt>
      <dd className="mt-1 text-bw-text">{children}</dd>
    </div>
  )
}

export function PartnerPanelContent({
  partner,
  onBearbeiten,
}: {
  partner: PartnerRow
  onBearbeiten: () => void
}) {
  const kategorie = partner.partner_kategorien?.name?.trim() || null
  const typ = partnerTypLabel(partner)

  return (
    <div className="flex flex-col gap-5 p-5 text-sm">
      <div>
        <h3 className="text-lg font-semibold leading-snug text-bw-text">{partner.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-bw-border bg-bw-hover px-2.5 py-0.5 text-xs font-medium text-bw-text">
            {typ}
          </span>
          {kategorie ? (
            <span className="inline-flex rounded-full border border-bw-border bg-bw-hover px-2.5 py-0.5 text-xs font-medium text-bw-text">
              {kategorie}
            </span>
          ) : (
            <span className="text-xs text-bw-text-muted">Keine Kategorie</span>
          )}
        </div>
      </div>

      <dl className="space-y-4">
        <PanelField label="Subkategorie">
          {partner.subkategorie?.trim() ? (
            <span className="whitespace-pre-wrap break-words">{partner.subkategorie}</span>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
        <PanelField label="Ansprechpartner">
          {partner.ansprechpartner?.trim() ? (
            <span className="whitespace-pre-wrap break-words">{partner.ansprechpartner}</span>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
        <PanelField label="Telefon">
          {partner.telefon?.trim() ? (
            <a href={`tel:${partner.telefon}`} className="text-bw-link hover:underline">
              {partner.telefon}
            </a>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
        <PanelField label="E-Mail">
          {partner.email?.trim() ? (
            <a href={`mailto:${partner.email}`} className="break-all text-bw-link hover:underline">
              {partner.email}
            </a>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
        <PanelField label="Webseite">
          {partner.website?.trim() ? (
            <a
              href={websiteHref(partner.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-bw-link hover:underline"
            >
              {partner.website.trim()}
            </a>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
        <PanelField label="Adresse">
          {partner.adresse?.trim() ? (
            <address className="not-italic whitespace-pre-wrap break-words text-bw-text">{partner.adresse}</address>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
        <PanelField label="Notizen">
          {partner.notizen?.trim() ? (
            <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-bw-text">
              {partner.notizen}
            </div>
          ) : (
            <span className="text-bw-text-muted">—</span>
          )}
        </PanelField>
      </dl>

      <div className="border-t border-bw-border pt-4">
        <button type="button" onClick={onBearbeiten} className="btn btn-secondary btn-sm w-full">
          Bearbeiten…
        </button>
      </div>
    </div>
  )
}
