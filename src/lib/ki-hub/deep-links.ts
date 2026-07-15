export type KiHubAktionPayload = {
  path?: string
  url?: string
  anchor?: string
  lead_id?: string
  plattform?: string
}

export function parseAktionPayload(raw: Record<string, unknown> | null): KiHubAktionPayload {
  if (!raw) return {}
  return {
    path: typeof raw.path === 'string' ? raw.path : undefined,
    url: typeof raw.url === 'string' ? raw.url : undefined,
    anchor: typeof raw.anchor === 'string' ? raw.anchor : undefined,
    lead_id: typeof raw.lead_id === 'string' ? raw.lead_id : undefined,
    plattform: typeof raw.plattform === 'string' ? raw.plattform : undefined,
  }
}

export function crmHref(payload: KiHubAktionPayload): string | null {
  if (!payload.path) return null
  if (payload.anchor) return `${payload.path}#${payload.anchor}`
  return payload.path
}

export const KI_DEPTH_ANCHOR = 'ki-depth'
