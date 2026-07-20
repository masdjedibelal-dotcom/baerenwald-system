/** Semantische Varianten für Status-Display (ersetzt früheres StatusBadgeVariant). */
export type StatusDisplayVariant = 'neutral' | 'active' | 'success' | 'danger' | 'warning'

export type MockBadgeKind = 'neu' | 'aktiv' | 'warten' | 'fertig' | 'storniert' | 'plain'

export type HubSpotStatusType = 'new' | 'contacted' | 'offer' | 'order' | 'done' | 'cancel'

const VARIANT_TO_KIND: Record<StatusDisplayVariant, MockBadgeKind> = {
  neutral: 'plain',
  active: 'aktiv',
  success: 'fertig',
  danger: 'storniert',
  warning: 'warten',
}

const HUBSPOT_TO_KIND: Record<HubSpotStatusType, MockBadgeKind> = {
  new: 'neu',
  contacted: 'warten',
  offer: 'warten',
  order: 'aktiv',
  done: 'fertig',
  cancel: 'storniert',
}

export function variantToMockBadgeKind(variant: StatusDisplayVariant): MockBadgeKind {
  return VARIANT_TO_KIND[variant] ?? 'plain'
}

export function hubSpotStatusToMockBadgeKind(status: HubSpotStatusType | string): MockBadgeKind {
  return HUBSPOT_TO_KIND[status as HubSpotStatusType] ?? 'plain'
}
