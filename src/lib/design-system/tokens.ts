/** Design-Tokens — Spiegel von tailwind.config.ts für TS-Nutzung */

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const RADIUS = {
  card: 12,
  cardLg: 16,
  button: 6,
} as const

export const BUTTON_HEIGHT = {
  sm: 32,
  md: 40,
  lg: 48,
} as const

export const ICON_SIZE = {
  nav: 18,
  button: 20,
  mobile: 24,
} as const

export const STATUS_VARIANTS = [
  'new',
  'contacted',
  'offer',
  'order',
  'done',
  'cancel',
] as const
