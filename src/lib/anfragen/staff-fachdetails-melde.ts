/**
 * CRM Staff-/Manuell-Reparatur-Fachdetails → Portal-Melde `fachdetailAnswers`.
 * Gleiche Option-IDs wie Portal (`melde_problem`, `melde_ort`, …).
 */

const KAPUTT_PROBLEM_KEYS = [
  'sanitaer_kaputt',
  'heizung_kaputt',
  'elektro_kaputt',
  'fenster_kaputt',
  'dach_kaputt',
  'schimmel_kaputt',
] as const

function firstValue(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0]?.trim() || ''
  return typeof raw === 'string' ? raw.trim() : ''
}

/** Spiegel der CRM-Kaputt-Antworten als Portal-Melde-Keys. */
export function meldeAnswersFromStaffFachdetails(
  fachdetails: Record<string, string | string[]>
): Record<string, string> {
  const answers: Record<string, string> = {}
  for (const key of KAPUTT_PROBLEM_KEYS) {
    const v = firstValue(fachdetails[key])
    if (v) {
      answers.melde_problem = v
      break
    }
  }
  const ort =
    firstValue(fachdetails.sanitaer_ort) || firstValue(fachdetails.schimmel_ort)
  if (ort) answers.melde_ort = ort
  return answers
}
