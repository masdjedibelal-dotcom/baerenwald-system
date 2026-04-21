import { createClient } from '@/lib/supabase-server'
import { AngebotNeuForm } from '@/components/angebote/AngebotNeuForm'
import type {
  AngebotHandwerkerZuweisungInput,
  AngebotPosition,
  Gewerk,
  Handwerker,
  Kunde,
  Lead,
  Preisliste,
} from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { angebotPositionenFromVorOrt, isVorOrtStruktur } from '@/lib/vorab-angebot-from-vorab'

export default async function AngebotNeuPage({
  searchParams,
}: {
  searchParams: { lead_id?: string; angebot_id?: string; kopie_von?: string; vorlage_id?: string }
}) {
  const supabase = createClient()
  const leadId = searchParams.lead_id
  const angebotId = searchParams.angebot_id
  const kopieVonId = searchParams.kopie_von
  const vorlageId = searchParams.vorlage_id

  const [{ data: gewerke }, { data: preisRaw }, { data: hwRaw }] = await Promise.all([
    supabase.from('gewerke').select('id, name, slug, aktiv').eq('aktiv', true).order('name'),
    supabase
      .from('preislisten')
      .select(
        'id, gewerk_id, leistung, einheit, preis_min, preis_max, aktiv, gewerke(id,name,slug)'
      )
      .eq('aktiv', true),
    supabase
      .from('handwerker')
      .select('id, name, email, telefon, gewerke, aktiv, firma')
      .eq('aktiv', true),
  ])

  let leadBundle: { lead: Lead; kunde: Kunde } | null = null
  let vorabVorOrt: {
    positionen: AngebotPosition[]
    hinweisBox: string
  } | null = null

  if (leadId) {
    const { data: leadRow } = await supabase
      .from('leads')
      .select('*, kunden(*)')
      .eq('id', leadId)
      .maybeSingle()
    const lr = leadRow as (Lead & { kunden?: Kunde | null }) | null
    if (lr?.kunden?.id) {
      leadBundle = { lead: lr, kunde: lr.kunden }
    }

    const { data: vf } = await supabase
      .from('vorab_formulare')
      .select('daten')
      .eq('lead_id', leadId)
      .maybeSingle()

    const daten = vf?.daten
    const gList = (gewerke ?? []) as Gewerk[]
    const pList = (preisRaw ?? []) as unknown as Preisliste[]
    if (daten && isVorOrtStruktur(daten)) {
      const gen = angebotPositionenFromVorOrt(daten, gList, pList)
      if (gen.positionen.length > 0) {
        vorabVorOrt = {
          positionen: gen.positionen,
          hinweisBox: gen.preisAngepasstHinweis
            ? 'Preis angepasst basierend auf Vor-Ort-Aufnahme'
            : '',
        }
      }
    }
  }

  let editAngebot: {
    id: string
    lead_id: string | null
    kunde_id: string
    notizen: string | null
    positionen: AngebotPosition[]
    handwerkerZuweisungen: AngebotHandwerkerZuweisungInput[]
  } | null = null

  let kopieVon:
    | {
        quelleId: string
        angebotLabel: string
        lead_id: string | null
        kunde_id: string
        notizen: string | null
        positionen: AngebotPosition[]
        handwerkerZuweisungen: AngebotHandwerkerZuweisungInput[]
      }
    | null = null
  let kopieKunde: Kunde | null = null

  if (kopieVonId) {
    const { data: angKopie } = await supabase
      .from('angebote')
      .select(
        `
        id,
        lead_id,
        kunde_id,
        notizen,
        positionen,
        angebot_handwerker(gewerk_id, handwerker_id, status, aufgabe_notiz)
      `
      )
      .eq('id', kopieVonId)
      .maybeSingle()

    const rowK = angKopie as {
      id: string
      lead_id: string | null
      kunde_id: string | null
      notizen: string | null
      positionen: unknown
      angebot_handwerker?: AngebotHandwerkerZuweisungInput[] | null
    } | null

    if (rowK?.kunde_id) {
      const { data: kRow } = await supabase
        .from('kunden')
        .select('id, name, email, telefon, typ, notizen, created_at, adresse, plz, ort')
        .eq('id', rowK.kunde_id)
        .maybeSingle()
      if (kRow) kopieKunde = kRow as Kunde

      const posK = normalizeAngebotPositionen(rowK.positionen)
      const hwK: AngebotHandwerkerZuweisungInput[] = (rowK.angebot_handwerker ?? []).map((z) => ({
        gewerk_id: z.gewerk_id,
        handwerker_id: z.handwerker_id,
        status: 'ausstehend',
        aufgabe_notiz: z.aufgabe_notiz ?? null,
      }))
      kopieVon = {
        quelleId: rowK.id,
        angebotLabel: rowK.id.slice(0, 8).toUpperCase(),
        lead_id: rowK.lead_id,
        kunde_id: rowK.kunde_id,
        notizen: rowK.notizen,
        positionen: posK,
        handwerkerZuweisungen: hwK,
      }
    }
  }

  let vorlageBootstrap: { name: string; positionen: AngebotPosition[] } | null = null
  if (vorlageId && !angebotId && !kopieVonId) {
    const { data: vRow } = await supabase
      .from('angebot_vorlagen')
      .select('name, positionen')
      .eq('id', vorlageId)
      .eq('aktiv', true)
      .maybeSingle()
    if (vRow?.name) {
      vorlageBootstrap = {
        name: vRow.name as string,
        positionen: normalizeAngebotPositionen((vRow as { positionen: unknown }).positionen),
      }
    }
  }

  if (angebotId) {
    const { data: ang } = await supabase
      .from('angebote')
      .select(
        `
        id,
        lead_id,
        kunde_id,
        status,
        notizen,
        positionen,
        angebot_handwerker(gewerk_id, handwerker_id, status, aufgabe_notiz)
      `
      )
      .eq('id', angebotId)
      .maybeSingle()

    const row = ang as {
      id: string
      lead_id: string | null
      kunde_id: string
      status: string
      notizen: string | null
      positionen: unknown
      angebot_handwerker?: AngebotHandwerkerZuweisungInput[] | null
    } | null

    if (row?.status === 'entwurf' && row.kunde_id) {
      const pos = normalizeAngebotPositionen(row.positionen)
      const handwerkerZuweisungen: AngebotHandwerkerZuweisungInput[] = (
        row.angebot_handwerker ?? []
      ).map((z) => ({
        gewerk_id: z.gewerk_id,
        handwerker_id: z.handwerker_id,
        status: (z.status as AngebotHandwerkerZuweisungInput['status']) ?? 'ausstehend',
        aufgabe_notiz: z.aufgabe_notiz ?? null,
      }))
      editAngebot = {
        id: row.id,
        lead_id: row.lead_id,
        kunde_id: row.kunde_id,
        notizen: row.notizen,
        positionen: pos,
        handwerkerZuweisungen,
      }
    }
  }

  return (
    <AngebotNeuForm
      gewerke={(gewerke ?? []) as Gewerk[]}
      preislisten={(preisRaw ?? []) as unknown as Preisliste[]}
      handwerker={(hwRaw ?? []) as Handwerker[]}
      leadBundle={leadBundle}
      editAngebot={kopieVon ? null : editAngebot}
      kopieVon={kopieVon}
      kopieKunde={kopieKunde}
      vorabVorOrt={vorabVorOrt}
      vorlageBootstrap={vorlageBootstrap}
    />
  )
}
