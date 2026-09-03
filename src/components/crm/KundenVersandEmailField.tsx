'use client'

import { MockField } from '@/components/mock-ui/MockForm'
import { isValidEmail } from '@/lib/email-recipients'
import type { KundeAnsprechpartner } from '@/lib/types'

export type VersandEmailOption = {
  value: string
  label: string
}

/** Unique Versand-Adressen aus Ansprechpartnern + Kundenstamm. */
export function buildKundenVersandEmailOptions(
  apRows: KundeAnsprechpartner[],
  kundeStammEmail?: string | null
): VersandEmailOption[] {
  const seen = new Set<string>()
  const out: VersandEmailOption[] = []

  function push(email: string, label: string) {
    const e = email.trim().toLowerCase()
    if (!e || !isValidEmail(email.trim()) || seen.has(e)) return
    seen.add(e)
    out.push({ value: email.trim(), label })
  }

  for (const ap of apRows) {
    const mail = ap.email?.trim() || ''
    if (!mail) continue
    const name = ap.name.trim() || 'Ohne Name'
    const rolle = ap.rolle?.trim()
    push(mail, rolle ? `${name} · ${rolle} · ${mail}` : `${name} · ${mail}`)
  }

  const stamm = kundeStammEmail?.trim() || ''
  if (stamm) push(stamm, `Kundenstamm · ${stamm}`)

  return out
}

/**
 * Versand-E-Mail getrennt vom Ansprechpartner (Anrede).
 * Leer = wie Ansprechpartner / Kontakt-Mail.
 */
export function KundenVersandEmailField({
  apRows,
  kontaktEmail,
  kundeStammEmail,
  versandEmail,
  onChange,
  disabled = false,
}: {
  apRows: KundeAnsprechpartner[]
  /** Persönliche/Kontakt-Mail des gewählten Ansprechpartners (Fallback). */
  kontaktEmail: string
  kundeStammEmail?: string | null
  /** Aktuelle Versand-Adresse (mailTo[0]). */
  versandEmail: string
  onChange: (next: string | null) => void
  disabled?: boolean
}) {
  const options = buildKundenVersandEmailOptions(apRows, kundeStammEmail)
  const kontakt = kontaktEmail.trim()
  const current = versandEmail.trim()
  const followsKontakt =
    !current || (Boolean(kontakt) && current.toLowerCase() === kontakt.toLowerCase())
  const selectValue = followsKontakt ? '' : current
  const known = new Set(options.map((o) => o.value.toLowerCase()))
  const orphan =
    selectValue && !known.has(selectValue.toLowerCase()) ? selectValue : null

  return (
    <MockField
      label="Versand-E-Mail"
      full
      hint="Leer = Mail des Ansprechpartners. Anrede bleibt unverändert."
    >
      <select
        className="sel sel--choice"
        value={selectValue}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.trim()
          onChange(v || null)
        }}
      >
        <option value="">
          {kontakt && isValidEmail(kontakt)
            ? `Wie Ansprechpartner (${kontakt})`
            : 'Wie Ansprechpartner'}
        </option>
        {orphan ? <option value={orphan}>{orphan}</option> : null}
        {options.map((o) => (
          <option key={o.value.toLowerCase()} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </MockField>
  )
}

/** true, wenn aktuelle Versand-Mail der Kontakt-Mail folgt (oder leer ist). */
export function versandFolgtKontakt(versandEmail: string, kontaktEmail: string): boolean {
  const v = versandEmail.trim()
  const k = kontaktEmail.trim()
  if (!v) return true
  if (!k) return false
  return v.toLowerCase() === k.toLowerCase()
}
