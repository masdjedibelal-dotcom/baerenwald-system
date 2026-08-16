/** Shared types — safe for client + server (kein server-only). */

export type OrgHausmeister = {
  id: string
  org_kunde_id: string
  name: string
  email: string | null
  portal_zugang: boolean
  portal_kunde_id: string | null
}

export type HausmeisterAmObjekt = OrgHausmeister & {
  kunde_objekt_id: string
  /** true = nur aus objekt_kontakte, kein org_hausmeister */
  isLegacy?: boolean
}
