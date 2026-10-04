import { normalizeFaelligAmYmd } from '@/lib/dates/werktag'
import { tageSeitFaelligkeitRechnung } from '@/lib/rechnungen/mahnverlauf'

/** Mahn-Timestamps zurücksetzen, wenn neue Fälligkeit noch nicht überfällig ist. */
export function mahnungFelderBeiFaelligkeitAenderung(
  neueFaelligAm: string | null,
  alteFaelligAm: string | null | undefined
): Partial<{
  erinnerung_7_sent_at: null
  erinnerung_21_sent_at: null
  intern_warnung_30_at: null
}> {
  const neu = normalizeFaelligAmYmd(neueFaelligAm)
  const alt = normalizeFaelligAmYmd(alteFaelligAm)
  if (!neu || neu === alt) return {}
  if (tageSeitFaelligkeitRechnung(neu) <= 0) {
    return {
      erinnerung_7_sent_at: null,
      erinnerung_21_sent_at: null,
      intern_warnung_30_at: null,
    }
  }
  return {}
}
