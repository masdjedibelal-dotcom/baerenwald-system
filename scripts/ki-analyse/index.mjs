/**
 * Zentrale API für KI-Analysen (CLI + Next.js /api/ki/refresh auf Netlify).
 */
import { createAdminClient, num, median, plzRegion, daysBetween } from './lib.mjs'
import { computeAndSaveFunnelOverview } from './funnel-core.mjs'
import { computeAndSaveNachfrage } from './nachfrage-core.mjs'
import { computeAndSaveAngebotAbgleich } from './angebot-abgleich-core.mjs'
import { computeAndSavePreiseMargen } from './preise-margen-core.mjs'
import { computeAndSaveHandwerkerRanking } from './handwerker-core.mjs'
import { computeAndSaveGewerkeAblauf } from './gewerke-core.mjs'
import { computeAndSaveAusfuehrung } from './ausfuehrung-core.mjs'
import { computeAndSaveDauerBautagebuch } from './dauer-core.mjs'
import { computeAndSaveBewertungen } from './bewertungen-core.mjs'
import { computeAndSaveProduktePakete } from './produkte-core.mjs'
import { computeAndSaveKommunikation } from './kommunikation-core.mjs'
import { runClaudeAuswertung } from './claude-auswertung.mjs'

const helpers = { num, median, plzRegion, daysBetween }

/** @param {string} bereich @param {import('@supabase/supabase-js').SupabaseClient} [supabase] */
export async function runKiBereich(bereich, supabase = createAdminClient()) {
  switch (bereich) {
    case 'funnel':
      return computeAndSaveFunnelOverview(supabase)
    case 'nachfrage':
      return computeAndSaveNachfrage(supabase, helpers)
    case 'kommunikation':
      return computeAndSaveKommunikation(supabase)
    case 'angebot_abgleich':
      return computeAndSaveAngebotAbgleich(supabase, { num })
    case 'preise_margen':
      return computeAndSavePreiseMargen(supabase, helpers)
    case 'produkte':
      return computeAndSaveProduktePakete(supabase, helpers)
    case 'gewerke':
      return computeAndSaveGewerkeAblauf(supabase, { ...helpers, daysBetween })
    case 'ausfuehrung':
      return computeAndSaveAusfuehrung(supabase, { num, plzRegion })
    case 'handwerker':
      return computeAndSaveHandwerkerRanking(supabase, { num, plzRegion })
    case 'dauer':
      return computeAndSaveDauerBautagebuch(supabase)
    case 'bewertungen':
      return computeAndSaveBewertungen(supabase)
    case 'claude':
      return runClaudeAuswertung({ supabase })
    default:
      throw new Error(`Unbekannter Bereich: ${bereich}`)
  }
}

export { runClaudeAuswertung }
