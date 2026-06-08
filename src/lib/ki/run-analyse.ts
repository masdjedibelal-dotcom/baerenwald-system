import 'server-only'

import { spawn } from 'child_process'
import { join } from 'path'

const CRM_ROOT = process.cwd()

const SCRIPT_MAP: Record<string, string> = {
  preise_margen: 'scripts/ki-analyse/preise-margen.mjs',
  handwerker: 'scripts/ki-analyse/handwerker.mjs',
  gewerke: 'scripts/ki-analyse/gewerke.mjs',
  produkte: 'scripts/ki-analyse/produkte.mjs',
  claude: 'scripts/ki-analyse/claude-auswertung.mjs',
}

export async function runKiAnalyseScript(bereich: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const rel = SCRIPT_MAP[bereich]
  if (!rel) {
    return { ok: false, message: `Unbekannter Bereich: ${bereich}` }
  }

  const scriptPath = join(CRM_ROOT, rel)

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: CRM_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true })
      else resolve({ ok: false, message: stderr.trim() || `Script beendet mit Code ${code}` })
    })

    child.on('error', (err) => {
      resolve({ ok: false, message: err.message })
    })
  })
}
