import 'server-only'

import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'

import type { BrandLogoVariant } from '@/lib/brand'

import {
  MAIL_LOGO_CID_GREEN,
  MAIL_LOGO_CID_WHITE,
  mailLogoCid,
} from '@/lib/mail/mail-logo-inline'

export type MailInlineLogoAttachment = {
  filename: string
  content: Buffer
  contentId: string
  contentType: string
}

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

export function readLocalBrandLogoBuffer(variant: BrandLogoVariant): Buffer | null {
  const file = variant === 'white' ? 'logo-mark-white.png' : 'logo-mark-green.png'
  for (const root of crmProjectRoots()) {
    const abs = join(root, 'public', 'brand', file)
    if (existsSync(abs)) return readFileSync(abs)
  }
  return null
}

export function buildMailLogoInlineAttachment(
  variant: BrandLogoVariant
): MailInlineLogoAttachment | null {
  const content = readLocalBrandLogoBuffer(variant)
  if (!content) return null
  return {
    filename: variant === 'white' ? 'logo-mark-white.png' : 'logo-mark-green.png',
    content,
    contentId: mailLogoCid(variant),
    contentType: 'image/png',
  }
}

/** Hängt PNG-Logos an, wenn das HTML die passenden cid:-Referenzen enthält. */
export function inlineLogoAttachmentsForHtml(html: string): MailInlineLogoAttachment[] {
  const out: MailInlineLogoAttachment[] = []
  if (html.includes(MAIL_LOGO_CID_GREEN)) {
    const g = buildMailLogoInlineAttachment('green')
    if (g) out.push(g)
  }
  if (html.includes(MAIL_LOGO_CID_WHITE)) {
    const w = buildMailLogoInlineAttachment('white')
    if (w) out.push(w)
  }
  return out
}
