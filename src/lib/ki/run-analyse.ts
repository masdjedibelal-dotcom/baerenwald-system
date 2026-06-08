import 'server-only'

import { runKiBereich } from '../../../scripts/ki-analyse/index.mjs'
import { KI_BEREICH_ORDER } from '@/lib/ki/constants'

export const KI_ANALYSE_SCRIPT_KEYS = KI_BEREICH_ORDER

export async function runKiAnalyseScript(
  bereich: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (bereich !== 'claude' && !KI_ANALYSE_SCRIPT_KEYS.includes(bereich as (typeof KI_ANALYSE_SCRIPT_KEYS)[number])) {
    return { ok: false, message: `Unbekannter Bereich: ${bereich}` }
  }

  try {
    await runKiBereich(bereich)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/Cannot find module|ki-analyse/i.test(message)) {
      return {
        ok: false,
        message:
          'KI-Analyse-Skripte fehlen im Deploy. Bitte Ordner scripts/ki-analyse/ committen, pushen und neu deployen.',
      }
    }
    return { ok: false, message }
  }
}
