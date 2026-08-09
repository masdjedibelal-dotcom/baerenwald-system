/**
 * Beim Anlegen/Speichern eines Abschlagsplans: alle Raten als RE-Entwürfe anlegen.
 * Versand erfolgt einzeln („Nächsten Abschlag senden“).
 */

import {
  auftragSummenAusPositionen,
  berechneBereitsGestellt,
  berechneSchlussAbrechnung,
  berechneZahlungsplan,
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

type EnsureResult =
  | { ok: true; erstellt: number; aktualisiert: number }
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

  if (aufErr || !auf) {
    return { ok: false, message: aufErr?.message ?? 'Auftrag nicht gefunden.' }
  }

  const kundeId = auf.kunde_id ? String(auf.kunde_id) : ''
  const angebotId = auf.angebot_id ? String(auf.angebot_id) : null
  if (!kundeId) return { ok: false, message: 'Kein Kunde am Auftrag.' }

  const { data: auftragPosRows } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  const allePositionen = auftragPosRows?.length
    ? auftragPositionenToAngebotPositionen(auftragPosRows as AuftragPosition[])
    : []
  const gesamtNetto = auftragSummenAusPositionen(allePositionen).netto

  const { data: rechnungen } = await supabase
    .from('rechnungen')
    .select(
      'id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, netto, mwst_satz, mwst_betrag, rechnungsnummer, beleg_typ'
    )
    .eq('auftrag_id', auftragId)

  let bestehend: RechnungAbschlagLink[] = (rechnungen ?? []).map((r) => ({
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

  for (const zeile of kontext.zeilen) {
    const rechnungArt = rechnungArtFuerZeile(zeile) as 'abschlag' | 'schluss'
    const existing = bestehend.find((r) => r.zahlungsplan_abschlag_id === zeile.id)
    if (existing && existing.status !== 'entwurf') {
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
      faellig_am: zeile.faellig_am?.trim()?.slice(0, 10) || heute,
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
      const upd = await updateRechnungEntwurf(existing.id, {
        kunde_id: kundeId,
        ...payload,
      })
      if (!upd.ok) return upd
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

  return { ok: true, erstellt, aktualisiert }
}

/** Beim Löschen des Plans: Abschlag-/Schluss-Entwürfe stornieren. */
export async function storniereAbschlagEntwuerfeForAuftrag(
  auftragId: string
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rechnungen')
    .select('id, status, rechnung_art, zahlungsplan_abschlag_id')
    .eq('auftrag_id', auftragId)
    .eq('status', 'entwurf')

  if (error) return { ok: false, message: error.message }

  let count = 0
  for (const r of data ?? []) {
    const art = String(r.rechnung_art ?? '')
      .trim()
      .toLowerCase()
    const zeileId = (r.zahlungsplan_abschlag_id as string | null)?.trim()
    if ((art === 'abschlag' || art === 'schluss') && zeileId) {
      const res = await updateRechnungStatus(String(r.id), 'storniert')
      if (!res.ok) return res
      count += 1
    }
  }
  return { ok: true, count }
}
