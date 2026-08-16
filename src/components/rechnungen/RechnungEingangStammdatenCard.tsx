'use client'

import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import type { Handwerker } from '@/lib/types'

function PropRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || value === '—') {
    return (
      <div className="prop">
        <div className="prop-l">{label}</div>
        <div className="prop-v">—</div>
      </div>
    )
  }
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{value}</div>
    </div>
  )
}

function formatIban(iban: string | null | undefined): string {
  const clean = (iban ?? '').replace(/\s+/g, '').toUpperCase()
  if (!clean) return '—'
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

/** Stammdaten der Eingangsrechnung = Partner (Handwerker), nicht Kunde/HV. */
export function RechnungEingangStammdatenCard({
  handwerker,
}: {
  handwerker: Handwerker | null
}) {
  if (!handwerker) {
    return (
      <MockCard title="Partner" icon="user" className="dshell-framed">
        <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '4px 0' }}>
          Kein Handwerker verknüpft.
        </div>
      </MockCard>
    )
  }

  const name =
    handwerker.firma?.trim() ||
    [handwerker.vorname, handwerker.nachname].filter(Boolean).join(' ').trim() ||
    handwerker.name?.trim() ||
    'Partner'
  const strasse =
    [handwerker.strasse, handwerker.hausnummer].filter(Boolean).join(' ').trim() ||
    handwerker.adresse?.trim() ||
    ''
  const ortZeile = [handwerker.plz, handwerker.ort].filter(Boolean).join(' ').trim()

  return (
    <MockCard
      title="Partner"
      icon="user"
      className="dshell-framed"
      actions={
        <Link href={`/handwerker/${handwerker.id}`} className="btn ghost sm">
          Zur Partnerakte
        </Link>
      }
    >
      <div className="props">
        <PropRow label="Name / Firma" value={name} />
        <PropRow
          label="Telefon"
          value={
            handwerker.telefon?.trim() ? (
              <a href={`tel:${handwerker.telefon.replace(/\s/g, '')}`} className="hover:text-bw-link">
                {handwerker.telefon.trim()}
              </a>
            ) : null
          }
        />
        <PropRow
          label="E-Mail"
          value={
            handwerker.email?.trim() ? (
              <a href={`mailto:${handwerker.email.trim()}`} className="hover:text-bw-link">
                {handwerker.email.trim()}
              </a>
            ) : null
          }
        />
        <PropRow label="Adresse" value={strasse || null} />
        <PropRow label="Ort" value={ortZeile || null} />
        <PropRow label="IBAN" value={formatIban(handwerker.iban)} />
        <PropRow label="Steuernr." value={handwerker.steuernummer?.trim() || null} />
        <PropRow label="USt-IdNr." value={handwerker.ustid?.trim() || null} />
      </div>
    </MockCard>
  )
}
