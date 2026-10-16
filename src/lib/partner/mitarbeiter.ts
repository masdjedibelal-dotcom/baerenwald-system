/** Mitarbeiter eines Partners (Ansprechpartner mit optionalem Portal-Zugang). */
export type PartnerMitarbeiter = {
  id: string
  handwerker_id: string
  name: string
  email: string | null
  telefon: string | null
  rolle: string | null
  aktiv: boolean
  /** Hat einen eigenen Portal-Zugang */
  hat_zugang: boolean
  portal_eingeladen_at: string | null
}

export const PARTNER_MITARBEITER_SELECT =
  'id, handwerker_id, name, email, telefon, rolle, aktiv, auth_user_id, portal_eingeladen_at'

export function mapPartnerMitarbeiter(r: Record<string, unknown>): PartnerMitarbeiter {
  return {
    id: String(r.id),
    handwerker_id: String(r.handwerker_id),
    name: String(r.name ?? ''),
    email: (r.email as string | null) ?? null,
    telefon: (r.telefon as string | null) ?? null,
    rolle: (r.rolle as string | null) ?? null,
    aktiv: r.aktiv !== false,
    hat_zugang: Boolean(r.auth_user_id),
    portal_eingeladen_at: (r.portal_eingeladen_at as string | null) ?? null,
  }
}
