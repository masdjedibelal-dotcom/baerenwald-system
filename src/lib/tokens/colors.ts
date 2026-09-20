/**
 * Kanonische Hex-Farben für Mail/PDF/Canvas (E-Mail-Clients kennen kein var(--…)).
 * Einzige erlaubte Hex-Quelle außerhalb globals.css / mock-design-system.css (P5-19).
 * Werte spiegeln :root in src/app/globals.css.
 */
export const C = {
  /* Brand / Mock */
  green: '#2e7d52',
  greenDark: '#1a3d2b',
  green50: '#e7f1e9',
  greenSoft: '#eaf3de',
  greenSoftBorder: '#c5ddb0',
  greenSoftBorder2: '#a8c5a0',
  greenTint: '#f3f7f4',
  greenTint2: '#e8f5ee',
  greenTint3: '#e8f0e4',
  greenTint4: '#eef3ec',
  greenMint: '#c8e6d4',
  greenPale: '#dde8e0',
  greenPale2: '#c8d9ce',
  greenPale3: '#e4eae6',
  greenMuted: '#6b8f71',
  greenMuted2: '#6b7f74',
  greenDeep: '#166534',
  greenDeep2: '#2f5d3a',
  greenDeep3: '#1a6b4a',
  greenDeep4: '#0f2818',
  greenDeep5: '#116600',
  greenAccent: '#3d9966',
  text: '#16201b',
  text2: '#404a45',
  text3: '#6a746f',
  textInk: '#1a2420',
  textInk2: '#1c211e',
  textMuted: '#5a615d',
  textMuted2: '#4a5c54',
  border: '#e5e3df',
  borderSoft: '#c5d0c8',
  bgSoft: '#f6f6f4',
  bgWarm: '#f7f6f3',
  bgWarm2: '#f7f4ef',
  card: '#ffffff',
  white: '#ffffff',
  accent: '#c4922a',
  accentGold: '#c9a227',
  accentGold2: '#d9a800',
  accentGold3: '#c4a35a',
  accentBg: '#fff8eb',
  accentBg2: '#f0d9a8',
  accentBg3: '#fef3e3',
  accentBg4: '#fff8e1',
  blue: '#2563eb',
  blue2: '#3b82f6',
  blue3: '#185fa5',
  blueTx: '#1f4fa8',
  blueBg: '#e4ecf7',
  blueBg2: '#f0f7ff',
  blueBg3: '#dbeafe',
  teal: '#0091ae',
  teal2: '#0d9488',
  purple: '#9333ea',
  purple2: '#8b5cf6',
  amber: '#f59e0b',
  amber2: '#f9a825',
  amber3: '#d97706',
  amber4: '#b45309',
  amberBg: '#fef3c7',
  amberBg2: '#fef9c3',
  amberBg3: '#ffedd5',
  orange: '#c45c26',
  red: '#a1242a',
  redTx: '#991b1b',
  redTx2: '#b91c1c',
  redTx3: '#c0392b',
  redTx4: '#dc2626',
  redBg: '#fee2e2',
  successBg: '#dcfce7',
  grayTx: '#4b5563',
  /* Mail/PDF neutrals (Tailwind-ähnlich, an Brand angeglichen) */
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray100b: '#f4f4f5',
  gray100c: '#f5f5f5',
  gray200: '#e5e7eb',
  gray200b: '#eeeeee',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111111',
  gray900b: '#111827',
  grayNeutral: '#6b6b6b',
  grayNeutral2: '#888888',
  grayNeutral3: '#666666',
  grayNeutral4: '#555555',
  grayNeutral5: '#333333',
  grayNeutral6: '#444444',
  grayNeutral7: '#363b41',
  ink: '#1e1e1e',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  greenWash: '#e2e8e2',
} as const

export type TokenColor = (typeof C)[keyof typeof C]

/** Normalisiert #rgb / #rrggbb / #rrggbbaa → lowercase 6- oder 8-stelliger Hex. */
export function normalizeHex(raw: string): string {
  let h = raw.replace(/^#/, '').toLowerCase()
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return `#${h}`
}

/** Lookup Hex → Token-Key (für Codemods / Guards). */
export const HEX_TO_KEY: Record<string, keyof typeof C> = (() => {
  const map: Record<string, keyof typeof C> = {}
  for (const [k, v] of Object.entries(C) as [keyof typeof C, string][]) {
    map[normalizeHex(v)] = k
  }
  return map
})()
