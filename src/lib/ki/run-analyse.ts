import 'server-only'

import { existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { KI_BEREICH_ORDER } from '@/lib/ki/constants'

export const KI_ANALYSE_SCRIPT_KEYS = KI_BEREICH_ORDER

type KiAnalyseModule = {
  runKiBereich: (bereich: string) => Promise<unknown>
}

let cachedModule: KiAnalyseModule | null = null

async function loadKiAnalyseModule(): Promise<KiAnalyseModule> {
  if (cachedModule) return cachedModule

  const indexPath = join(process.cwd(), 'scripts/ki-analyse/index.mjs')
  if (!existsSync(indexPath)) {
    throw new Error(
      `KI-Analyse-Modul nicht gefunden (${indexPath}). Auf Netlify: scripts/ki-analyse muss im Deploy enthalten sein.`
    )
  }

  cachedModule = (await import(pathToFileURL(indexPath).href)) as KiAnalyseModule
  return cachedModule
}

export async function runKiAnalyseScript(
  bereich: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (bereich !== 'claude' && !KI_ANALYSE_SCRIPT_KEYS.includes(bereich as (typeof KI_ANALYSE_SCRIPT_KEYS)[number])) {
    return { ok: false, message: `Unbekannter Bereich: ${bereich}` }
  }

  try {
    const mod = await loadKiAnalyseModule()
    await mod.runKiBereich(bereich)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, message }
  }
}
