import { formatEuro } from '@/lib/format/geld-datum'
import { C } from '@/lib/tokens/colors'

/** Kurz-Hinweis unter dem Betrag in Kunden-Mails (Rechnung / Angebot). */
export function mailBetragMwstHinweis(opts: {
  reverseCharge?: boolean
  kleinunternehmer?: boolean
}): string {
  if (opts.reverseCharge) return 'netto · §13b UStG'
  if (opts.kleinunternehmer) return 'ohne MwSt. (§19 UStG)'
  return 'inkl. MwSt.'
}

export function mailBetragPriceHtml(
  betragEur: number,
  opts?: { reverseCharge?: boolean; kleinunternehmer?: boolean }
): string {
  const hint = mailBetragMwstHinweis(opts ?? {})
  return `<p style="font-size:16px;font-weight:700;color:${C.green};margin:0;">${formatEuro(betragEur)} <span style="font-size:12px;font-weight:400;color:${C.gray500};">${hint}</span></p>`
}
