import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import {
  BRAND_ALT,
  BRAND_LOGO_GREEN,
  resolveBrandLogoUrl,
  resolvePublicAppUrl,
} from '@/lib/brand'

function crmProjectRoots(): string[] {
  const roots: string[] = []
  let dir = process.cwd()
  for (let i = 0; i < 12; i++) {
    roots.push(dir)
    const nested = join(dir, 'baerenwald-crm-dashboard')
    if (existsSync(join(nested, 'package.json'))) roots.push(nested)
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return Array.from(new Set(roots))
}

/** file:// mit korrekt encodierten Pfadsegmenten (Umlaute in „Bärenwald“). */
export function pathToFileUrl(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const encoded = parts
    .map((seg, i) => {
      if (i === 0 && seg === '') return ''
      if (/^[A-Za-z]:$/.test(seg)) return seg
      return encodeURIComponent(seg)
    })
    .join('/')
  return encoded.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`
}

function localLogoDataUrl(): string | null {
  for (const root of crmProjectRoots()) {
    const file = join(root, 'public', 'brand', 'logo-mark-green.png')
    if (existsSync(file)) {
      const b64 = readFileSync(file).toString('base64')
      return `data:image/png;base64,${b64}`
    }
  }
  return null
}

/** Logo für Angebots-PDF — data:-URL (kein file://, stabiler in Headless-Chrome). */
export function resolveAngebotPdfLogoSrc(logoUrlOverride?: string | null): string {
  const custom = logoUrlOverride?.trim()
  if (custom && /^https?:\/\//i.test(custom)) return custom

  const dataUrl = localLogoDataUrl()
  if (dataUrl) return dataUrl

  if (custom) {
    const fromApp = resolvePublicAppUrl(custom)
    if (/^https?:\/\//i.test(fromApp)) return fromApp
  }

  /** Öffentliche Website-URL — zuverlässiger in Headless-PDF als localhost. */
  const websiteLogo = resolveBrandLogoUrl('green', null)
  if (/^https?:\/\//i.test(websiteLogo)) return websiteLogo

  const fromApp = resolvePublicAppUrl(BRAND_LOGO_GREEN)
  if (/^https?:\/\//i.test(fromApp)) return fromApp

  return resolveBrandLogoUrl('green', custom)
}

export { BRAND_ALT }
