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
  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const hint = mailBetragMwstHinweis(opts ?? {})
  return `<p style="font-size:16px;font-weight:700;color:#2E7D52;margin:0;">${formatEur(betragEur)} € <span style="font-size:12px;font-weight:400;color:#6B7280;">${hint}</span></p>`
}
