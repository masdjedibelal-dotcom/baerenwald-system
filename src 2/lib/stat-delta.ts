export type StatDelta = {
  /** z. B. „+18 % vs. Vormonat“ */
  label: string
  trend: 'up' | 'down' | 'neutral'
  /** Bei Warn-KPIs (z. B. überfällige Rechnungen): Rückgang = positiv (grün). */
  invertTrendColors?: boolean
  /** z. B. „+18 %“ — kompakte Inline-Anzeige (Mobile) */
  percentPart?: string
  /** z. B. „vs. Vorwoche“ */
  suffixPart?: string
}
