import { logDbError } from '@/lib/errors/log-db-error'
import { normalizeFaelligAmYmd } from '@/lib/dates/werktag'
import {
  auftragSummenAusPositionen,
  berechneBereitsGestellt,
  berechneSchlussAbrechnung,
  berechneZahlungsplan,
  hatAktivenAbschlagsplan,
  parseZahlungsplan,
  positionenFuerAbschlagRechnung,
  rechnungArtFuerZeile,
  rechnungBerechnungFuerAbschlagZeile,
  zahlplanAbgerechnetAusLinks,
  type RechnungAbschlagLink,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { berechneRechnungMitFirmeneinstellungen } from '@/lib/rechnungen/rechnung-speichern'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import type { AuftragPosition } from '@/lib/types'
import { createClient } from '@/lib/supabase-server'
import {
  createRechnungEntwurf,
  updateRechnungEntwurf,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import { persistPdfForRechnung } from '@/lib/rechnungen/persist-pdf'

type EnsureResult =
  | {
      ok: true
      erstellt: number
      aktualisiert: number
      storniertOrphan: number
      gestellteUnveraendert: number
    }
  | { ok: false; message: string }

/** Verwaiste Voll-Entwürfe (ohne Plan-Zeile) stornieren — verhindert Doppel-Vorgang „Gesamt + Abschlag“. */
export async function storniereVerwaisteVollEntwuerfe(
  auftragId: string
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rechnungen')
    .select('id, status, rechnung_art, zahlungsplan_abschlag_id')
    .eq('auftrag_id', auftragId)
    .eq('status', 'entwurf')
  if (error) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:rechnungen', error)

  if (error) return { ok: false, message: error.message }

  let count = 0
  for (const r of data ?? []) {
    const art = String(r.rechnung_art ?? 'voll')
      .trim()
      .toLowerCase()
    const zeileId = (r.zahlungsplan_abschlag_id as string | null)?.trim()
    if (art === 'voll' && !zeileId) {
      const res = await updateRechnungStatus(String(r.id), 'storniert')
      if (!res.ok) return res
      count += 1
    }
  }
  return { ok: true, count }
}

function findAktiverBelegFuerZeile(
  bestehend: RechnungAbschlagLink[],
  zeileId: string
): RechnungAbschlagLink | null {
  const matches = bestehend.filter((r) => r.zahlungsplan_abschlag_id === zeileId)
  const entwurf = matches.find((r) => String(r.status ?? '').toLowerCase() === 'entwurf')
  if (entwurf) return entwurf
  const aktiv = matches.find((r) => String(r.status ?? '').toLowerCase() !== 'storniert')
  return aktiv ?? null
}

/** Alle Planzeilen als Entwürfe anlegen/aktualisieren (gestellte Raten unangetastet). */
export async function ensureAbschlagEntwuerfeForAuftrag(
  auftragId: string,
  plan: Zahlungsplan
): Promise<EnsureResult> {
  if (!plan.zeilen.length) {
    return { ok: false, message: 'Kein Abschlagsplan.' }
  }

  const supabase = createClient()
  const { data: auf, error: aufErr } = await supabase
    .from('auftraege')
    .select('id, kunde_id, angebot_id, titel, start_datum, end_datum')
    .eq('id', auftragId)
    .maybeSingle()
  if (aufErr) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:auftraege', aufErr)

  if (aufErr || !auf) {
    return { ok: false, message: aufErr?.message ?? 'Auftrag nicht gefunden.' }
  }

  const kundeId = auf.kunde_id ? String(auf.kunde_id) : ''
  const angebotId = auf.angebot_id ? String(auf.angebot_id) : null
  if (!kundeId) return { ok: false, message: 'Kein Kunde am Auftrag.' }

  const { data: auftragPosRows, error: error2 } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })
  if (error2) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:auftrag_positionen', error2)

  const allePositionen = auftragPosRows?.length
    ? auftragPositionenToAngebotPositionen(auftragPosRows as AuftragPosition[])
    : []
  const gesamtNetto = auftragSummenAusPositionen(allePositionen).netto

  const { data: rechnungen, error: error3 } = await supabase
    .from('rechnungen')
    .select(
      'id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, netto, mwst_satz, mwst_betrag, rechnungsnummer, beleg_typ, richtung'
    )
    .eq('auftrag_id', auftragId)
  if (error3) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:rechnungen', error3)

  let bestehend: RechnungAbschlagLink[] = (rechnungen ?? [])
    .filter((r) => String((r as { richtung?: string | null }).richtung ?? '') !== 'eingehend')
    .map((r) => ({
      id: r.id as string,
      status: r.status as string | null,
      zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
      rechnung_art: r.rechnung_art as string | null,
      abschlag_index: r.abschlag_index as number | null,
      brutto: r.brutto as number | null,
      netto: r.netto as number | null,
      mwst_satz: r.mwst_satz as number | null,
      mwst_betrag: r.mwst_betrag as number | null,
      rechnungsnummer: r.rechnungsnummer as string | null,
      beleg_typ: r.beleg_typ as string | null,
    }))

  const kontext = berechneZahlungsplan(
    plan,
    gesamtNetto,
    19,
    zahlplanAbgerechnetAusLinks(bestehend)
  )

  const { berechnung: berechnungVoll } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen: allePositionen,
    reverse_charge_13b: false,
  })

  const heute = new Date().toISOString().slice(0, 10)
  const leistungVon = (auf.start_datum as string | null) ?? heute
  const leistungBis = (auf.end_datum as string | null) ?? heute
  const projektTitel = String(auf.titel ?? '').trim()

  let erstellt = 0
  let aktualisiert = 0
  let gestellteUnveraendert = 0
  const planZeileIds = new Set(kontext.zeilen.map((z) => z.id))

  for (const zeile of kontext.zeilen) {
    const rechnungArt = rechnungArtFuerZeile(zeile) as 'abschlag' | 'schluss'
    const existing = findAktiverBelegFuerZeile(bestehend, zeile.id)
    if (existing && String(existing.status ?? '').toLowerCase() !== 'entwurf') {
      gestellteUnveraendert += 1
      continue
    }

    const bereits = berechneBereitsGestellt(
      bestehend.filter((r) => r.zahlungsplan_abschlag_id !== zeile.id)
    )
    const zeilenPos = positionenFuerAbschlagRechnung({
      zeile,
      allePositionen,
      plan,
      gesamtNetto,
      auftragsReferenz: '',
      projektTitel,
      bereitsGestelltBrutto: bereits.brutto,
      vorherigeAbschlaege: bestehend,
      ausserRechnungId: existing?.id ?? null,
    })

    const liste_berechnung =
      rechnungArt === 'schluss'
        ? (() => {
            const schluss = berechneSchlussAbrechnung(zeilenPos, bestehend, {
              reverseCharge13b: false,
              ausserRechnungId: existing?.id ?? null,
              ausserZeileId: zeile.id,
            })
            return {
              ...berechnungVoll,
              netto: schluss.rest_netto,
              mwst_betrag: schluss.rest_mwst,
              brutto: schluss.rest_brutto,
              mwst_satz: schluss.mwst_prozent,
              mwst_aufschluesselung:
                schluss.rest_mwst > 0
                  ? [
                      {
                        satz: schluss.mwst_prozent,
                        netto: schluss.rest_netto,
                        mwst: schluss.rest_mwst,
                      },
                    ]
                  : [{ satz: 0, netto: schluss.rest_netto, mwst: 0 }],
            }
          })()
        : rechnungBerechnungFuerAbschlagZeile(berechnungVoll, zeile, rechnungArt, zeilenPos, {
            reverseCharge13b: false,
          })

    const payload = {
      positionen: zeilenPos,
      leistungszeitraum_von: leistungVon,
      leistungszeitraum_bis: leistungBis,
      faellig_am: normalizeFaelligAmYmd(zeile.faellig_am?.trim()?.slice(0, 10) || heute) ?? heute,
      rechnungsdatum: heute,
      reverse_charge_13b: false,
      hinweis_35a: null as boolean | null,
      einleitung: null as string | null,
      hinweise: null as string | null,
      mail_einleitung: null as string | null,
      mail_betreff: null as string | null,
      zahlungsbedingungen: null as string | null,
      rechnung_art: rechnungArt,
      abschlag_index: zeile.index,
      zahlungsplan_abschlag_id: zeile.id,
      liste_berechnung,
    }

    if (existing?.id) {
      // Beträge/Positionen neu rechnen, aber eingegebene Texte und Daten des Entwurfs behalten
      const { data: alt, error: altErr } = await supabase
        .from('rechnungen')
        .select(
          'einleitung, hinweise, mail_einleitung, mail_betreff, zahlungsbedingungen, hinweis_35a, rechnungsdatum, leistungszeitraum_von, leistungszeitraum_bis'
        )
        .eq('id', existing.id)
        .maybeSingle()
      if (altErr) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:rechnungen', altErr)
      const upd = await updateRechnungEntwurf(existing.id, {
        kunde_id: kundeId,
        ...payload,
        einleitung: alt?.einleitung ?? null,
        hinweise: alt?.hinweise ?? null,
        mail_einleitung: alt?.mail_einleitung ?? null,
        mail_betreff: alt?.mail_betreff ?? null,
        zahlungsbedingungen: alt?.zahlungsbedingungen ?? null,
        hinweis_35a: alt?.hinweis_35a ?? null,
        rechnungsdatum: alt?.rechnungsdatum ?? payload.rechnungsdatum,
        leistungszeitraum_von: alt?.leistungszeitraum_von ?? payload.leistungszeitraum_von,
        leistungszeitraum_bis: alt?.leistungszeitraum_bis ?? payload.leistungszeitraum_bis,
      })
      if (!upd.ok) return upd
      await persistPdfForRechnung(existing.id).catch((err) => {
        logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:persistPdf', err)
        return null
      })
      aktualisiert += 1
    } else {
      const created = await createRechnungEntwurf({
        angebot_id: angebotId,
        auftrag_id: auftragId,
        kunde_id: kundeId,
        ...payload,
      })
      if (!created.ok) return created
      bestehend = [
        ...bestehend,
        {
          id: created.id,
          status: 'entwurf',
          zahlungsplan_abschlag_id: zeile.id,
          rechnung_art: rechnungArt,
          abschlag_index: zeile.index,
          brutto: liste_berechnung.brutto,
        },
      ]
      erstellt += 1
    }
  }

  // Entwürfe zu entfernten Planzeilen stornieren
  let storniertOrphan = 0
  for (const r of bestehend) {
    if (String(r.status ?? '').toLowerCase() !== 'entwurf') continue
    const art = String(r.rechnung_art ?? '').toLowerCase()
    if (art !== 'abschlag' && art !== 'schluss') continue
    const zeileId = r.zahlungsplan_abschlag_id?.trim()
    if (!zeileId || planZeileIds.has(zeileId)) continue
    const res = await updateRechnungStatus(r.id, 'storniert')
    if (!res.ok) return res
    storniertOrphan += 1
  }

  return {
    ok: true,
    erstellt,
    aktualisiert,
    storniertOrphan,
    gestellteUnveraendert,
  }
}

/**
 * Nach jeder Leistungsänderung am Auftrag (bearbeiten, weiteres Angebot, Regie):
 * offene Abschlags-/Schluss-Entwürfe neu rechnen — die Schlussrechnung ist immer der aktuelle Rest.
 * Gestellte Rechnungen bleiben unverändert.
 */
export async function aktualisierePlanEntwuerfeNachLeistungsaenderung(
  auftragId: string
): Promise<void> {
  const supabase = createClient()
  // Nur nachziehen, wenn es schon offene Plan-Entwürfe gibt (kein neues Anlegen beim ersten Sync)
  const { data: entwuerfe, error: entErr } = await supabase
    .from('rechnungen')
    .select('id')
    .eq('auftrag_id', auftragId)
    .eq('status', 'entwurf')
    .not('zahlungsplan_abschlag_id', 'is', null)
    .limit(1)
  if (entErr) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:rechnungen', entErr)
  if (!entwuerfe?.length) return
  const { data: auf, error } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:auftraege', error)
  const angebotId = auf?.angebot_id ? String(auf.angebot_id) : ''
  if (!angebotId) return
  const { data: ang, error: angErr } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angebotId)
    .maybeSingle()
  if (angErr) logDbError('lib/rechnungen/ensure-abschlag-entwuerfe:angebote', angErr)
  const plan = parseZahlungsplan(ang?.zahlungsplan)
  if (!plan || !hatAktivenAbschlagsplan(plan)) return
  const r = await ensureAbschlagEntwuerfeForAuftrag(auftragId, plan)
  if (!r.ok) console.warn('[aktualisierePlanEntwuerfe]', r.message)
}
