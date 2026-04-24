import type { Lead } from '@/lib/types'
import {
  VOR_ORT_SCHEMA,
  bereicheFuerSituation,
  normalizeSituation,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import { isVorOrtStruktur, type VorOrtFormDaten } from '@/lib/vorab-angebot-from-vorab'

function emptyVorOrtForm(
  situation: SituationValue | '',
  bereiche: string[],
  kundentyp: string
): VorOrtFormDaten {
  return {
    _schema: VOR_ORT_SCHEMA,
    projekt: {
      situation,
      bereiche,
      kundentyp,
      angaben_korrekt: 'ja',
      korrektur_notiz: '',
    },
    fachdetails: {},
    groessen: {},
    zustand: {
      gesamtzustand: '',
      unvorhergesehenes: false,
      unvorhergesehenes_txt: '',
      zusatzarbeiten: false,
      zusatzarbeiten_txt: '',
      schimmel: false,
      schimmel_wo: '',
      schimmel_ausmass: '',
    },
    logistik: {
      adresse_bestaetigt: false,
      etage: '',
      aufzug: false,
      parkplatz: false,
      halteverbot: false,
      schluesseluebergabe: false,
      zugangsdetails: '',
      ruhezeiten: '',
    },
    kalkulation: {
      kalk_min: '',
      kalk_max: '',
      begruendung: '',
      zeit_arbeitstage: '',
      komplexitaet: 'standard',
    },
    wuensche: {
      startdatum: '',
      flexibilitaet: '',
      material: '',
      besondere: '',
      budget_feedback: '',
    },
    fotos: {
      istzustand: [],
      problem: [],
      gesamt: [],
      masse: [],
    },
    abgeschlossen_am: null,
  }
}

function mapKundentypFromLead(raw: string | null | undefined): string {
  if (raw === 'gewerbe') return 'gewerbe'
  return 'eigentuemer'
}

export function buildInitialVorOrtFormDaten(
  lead: Pick<Lead, 'situation' | 'bereiche' | 'kundentyp' | 'funnel_daten'>,
  savedRaw: Record<string, unknown> | undefined
): VorOrtFormDaten {
  if (savedRaw && isVorOrtStruktur(savedRaw)) {
    return JSON.parse(JSON.stringify(savedRaw)) as VorOrtFormDaten
  }

  const situation = normalizeSituation(lead.situation) || ('erneuern' as SituationValue)
  const erlaubt = new Set(bereicheFuerSituation(situation).map((b) => b.value))
  let leadBereiche = [...(lead.bereiche ?? [])]
  if (lead.situation === 'gewerbe' && !leadBereiche.includes('gewerbe')) {
    leadBereiche.push('gewerbe')
  }
  if (leadBereiche.includes('gewerbe')) erlaubt.add('gewerbe')
  const bereiche = leadBereiche.filter((b) => erlaubt.has(b))

  const funnel = lead.funnel_daten && typeof lead.funnel_daten === 'object' ? lead.funnel_daten : null
  const fObj = funnel as Record<string, unknown> | null
  let sit = situation
  let ber = bereiche
  let kt = mapKundentypFromLead(lead.kundentyp)
  if (fObj) {
    if (typeof fObj.situation === 'string') {
      const n = normalizeSituation(fObj.situation)
      if (n) sit = n
    }
    if (Array.isArray(fObj.bereiche)) {
      const er2 = new Set(bereicheFuerSituation(sit).map((b) => b.value))
      if (leadBereiche.includes('gewerbe')) er2.add('gewerbe')
      ber = (fObj.bereiche as string[]).filter((b) => er2.has(b))
    }
    if (typeof fObj.kundentyp === 'string') kt = fObj.kundentyp
  }

  return emptyVorOrtForm(sit, ber.length ? ber : bereiche, kt)
}
