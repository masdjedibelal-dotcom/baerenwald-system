/**
 * Harte Regel: Prod-Supabase ist READ-ONLY.
 * Jedes Schreib-Skript muss Ziel-URL / project-ref explizit prüfen
 * und abbrechen, wenn sie der Prod-Ref entspricht.
 *
 * Kein Fallback auf „die verbundene DB“ / .env.local ohne Prüfung.
 */

export const PROD_PROJECT_REF = 'wnotlydvhsmfkhexgeol'

/** Dashboard-UUID des Staging-Projekts. */
export const STAGING_PROJECT_ID_CANON = '2503565e-8a02-4af4-bed6-e240a544235d'

/** 20-Zeichen-API-Ref (steht in Host/URL). */
export const STAGING_PROJECT_REF_CANON = 'soqownnkxmtfgvsbrgsl'

function blobFrom(target) {
  if (target == null) return ''
  if (typeof target === 'string') return target
  if (typeof target === 'object') {
    return Object.values(target)
      .filter((v) => typeof v === 'string')
      .join('\n')
  }
  return String(target)
}

/**
 * Bricht den Prozess ab, wenn irgendwo die Prod-Ref vorkommt.
 * @param {string | Record<string, string | undefined | null>} target
 * @param {string} [label]
 */
export function assertNotProdWrite(target, label = 'Ziel') {
  const blob = blobFrom(target)
  if (blob.includes(PROD_PROJECT_REF)) {
    console.error(
      `ABORT: ${label} zeigt auf Prod (${PROD_PROJECT_REF}). Schreibzugriff ist verboten.`
    )
    process.exit(1)
  }
}

/**
 * Staging-Schreibziel: URL/Ref müssen soqownnkxmtfgvsbrgsl enthalten, nie Prod.
 * @param {{
 *   projectId?: string | null
 *   dbUrl?: string | null
 *   supabaseUrl?: string | null
 *   projectRef?: string | null
 * }} opts
 */
export function assertStagingWriteTarget(opts) {
  const projectRef = (opts.projectRef ?? '').trim()
  const projectId = (opts.projectId ?? '').trim()
  const urls = `${opts.dbUrl ?? ''}\n${opts.supabaseUrl ?? ''}`
  const blob = blobFrom({
    projectId,
    dbUrl: opts.dbUrl,
    supabaseUrl: opts.supabaseUrl,
    projectRef,
  })

  if (!blob.trim()) {
    console.error(
      'ABORT: Staging-Ziel fehlt (STAGING_PROJECT_REF / STAGING_DB_URL / STAGING_SUPABASE_URL). Kein Fallback auf eine verbundene DB.'
    )
    process.exit(1)
  }

  assertNotProdWrite(blob, 'Staging-Ziel')

  if (projectRef && projectRef !== STAGING_PROJECT_REF_CANON) {
    console.error(
      `ABORT: STAGING_PROJECT_REF muss ${STAGING_PROJECT_REF_CANON} sein, ist: ${projectRef}`
    )
    process.exit(1)
  }

  if (projectId && projectId !== STAGING_PROJECT_ID_CANON) {
    console.error(
      `ABORT: STAGING_PROJECT_ID muss ${STAGING_PROJECT_ID_CANON} sein, ist: ${projectId}`
    )
    process.exit(1)
  }

  if (!blob.includes(STAGING_PROJECT_REF_CANON)) {
    console.error(
      `ABORT: Staging-Ziel muss die Project-Ref ${STAGING_PROJECT_REF_CANON} enthalten (URL oder STAGING_PROJECT_REF).`
    )
    process.exit(1)
  }

  if (urls.trim() && !urls.includes(STAGING_PROJECT_REF_CANON)) {
    console.error(
      `ABORT: STAGING_DB_URL / STAGING_SUPABASE_URL müssen ${STAGING_PROJECT_REF_CANON} enthalten.`
    )
    process.exit(1)
  }
}
