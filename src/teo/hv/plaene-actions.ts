'use server'

import { revalidatePath } from 'next/cache'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import {
  punkteAus,
  type ChecklistenPunkt,
  type IntervallEinheit,
  type PlanArt,
  type PlanZustaendig,
} from '@/teo/hv/plan-logik'

/**
 * Pläne am Objekt aus dem CRM pflegen (TEO legt zentral an, die Verwaltung sieht sie im Arbeitsplatz).
 * Gleiche Tabelle und Regeln wie im Portal (`teo/arbeitsplatz/aktionen/plaene.ts`).
 */
export type CrmPlan = {
  id: string
  titel: string
  art: PlanArt
  einheit: IntervallEinheit
  anzahl: number
  naechste: string
  zustaendig: PlanZustaendig
  zustaendigId: string | null
  zustaendigName: string | null
  checkliste: ChecklistenPunkt[]
  mieter: boolean
  letzte: string | null
}

export type CrmPlanFelder = {
  titel: string
  art: PlanArt
  einheit: IntervallEinheit
  anzahl: number
  naechste: string
  zustaendig: PlanZustaendig
  zustaendigId?: string | null
  punkte: string[]
  mieter: boolean
}

type Fail = { ok: false; message: string }

const ARTEN: PlanArt[] = ['reinigung', 'kontrolle', 'wartung', 'pruefung', 'winterdienst', 'garten', 'sonstiges']
const EINHEITEN: IntervallEinheit[] = ['tag', 'woche', 'monat', 'jahr']

function checkliste(v: unknown): ChecklistenPunkt[] {
  return Array.isArray(v)
    ? v.filter((p) => p && typeof p === 'object').map((p, i) => ({ id: String((p as { id?: unknown }).id ?? `p${i + 1}`), text: String((p as { text?: unknown }).text ?? '') }))
    : []
}

export async function ladeObjektPlaene(
  kundeId: string,
  objektId: string
): Promise<{ ok: true; plaene: CrmPlan[]; team: Array<{ id: string; name: string }> } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const [planRes, teamRes] = await Promise.all([
    gate.db
      .from('teo_plaene')
      .select('id, titel, art, intervall_einheit, intervall_anzahl, naechste_faelligkeit, zustaendig, zustaendig_mitglied_id, checkliste, fuer_mieter_sichtbar')
      .eq('kunde_id', kundeId)
      .eq('kunde_objekt_id', objektId)
      .eq('aktiv', true)
      .order('naechste_faelligkeit'),
    gate.db.from('kunden_mitglieder').select('id, name, email').eq('kunde_id', kundeId).eq('rolle', 'team').eq('aktiv', true).order('name'),
  ])
  if (planRes.error) {
    logDbError('teo/hv/plaene:liste', planRes.error)
    return { ok: false, message: 'Pläne konnten nicht geladen werden.' }
  }
  if (teamRes.error) logDbError('teo/hv/plaene:team', teamRes.error)
  const team = (teamRes.data ?? []).map((m) => ({ id: String(m.id), name: (m.name as string | null)?.trim() || String(m.email ?? '') }))
  const roh = planRes.data ?? []
  const letzte = new Map<string, string>()
  if (roh.length) {
    const { data: erl, error: eErr } = await gate.db
      .from('teo_plan_erledigungen')
      .select('plan_id, erledigt_am')
      .in('plan_id', roh.map((p) => p.id))
      .order('erledigt_am', { ascending: false })
    if (eErr) logDbError('teo/hv/plaene:letzte', eErr)
    for (const e of erl ?? []) if (!letzte.has(String(e.plan_id))) letzte.set(String(e.plan_id), String(e.erledigt_am))
  }
  const name = new Map(team.map((t) => [t.id, t.name]))
  return {
    ok: true,
    team,
    plaene: roh.map((p) => ({
      id: String(p.id),
      titel: String(p.titel),
      art: p.art as PlanArt,
      einheit: p.intervall_einheit as IntervallEinheit,
      anzahl: Number(p.intervall_anzahl),
      naechste: String(p.naechste_faelligkeit),
      zustaendig: p.zustaendig as PlanZustaendig,
      zustaendigId: p.zustaendig_mitglied_id ? String(p.zustaendig_mitglied_id) : null,
      zustaendigName: p.zustaendig_mitglied_id ? name.get(String(p.zustaendig_mitglied_id)) ?? null : null,
      checkliste: checkliste(p.checkliste),
      mieter: Boolean(p.fuer_mieter_sichtbar),
      letzte: letzte.get(String(p.id)) ?? null,
    })),
  }
}

export async function speichereObjektPlan(
  kundeId: string,
  objektId: string,
  id: string | null,
  f: CrmPlanFelder
): Promise<{ ok: true; id: string } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const titel = f.titel.trim().slice(0, 120)
  if (!titel) return { ok: false, message: 'Bitte einen Namen eingeben.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.naechste)) return { ok: false, message: 'Bitte ein Datum für die nächste Fälligkeit wählen.' }
  const { data: obj, error: oErr } = await gate.db.from('kunden_objekte').select('id').eq('id', objektId).eq('kunde_id', kundeId).maybeSingle()
  if (oErr) logDbError('teo/hv/plaene:objekt', oErr)
  if (!obj) return { ok: false, message: 'Objekt nicht gefunden.' }
  let zustaendigId: string | null = null
  if (f.zustaendig === 'team' && f.zustaendigId) {
    const { data: m } = await gate.db.from('kunden_mitglieder').select('id').eq('id', f.zustaendigId).eq('kunde_id', kundeId).maybeSingle()
    zustaendigId = m ? String(m.id) : null
  }

  const werte = {
    titel,
    art: ARTEN.includes(f.art) ? f.art : 'sonstiges',
    kunde_objekt_id: objektId,
    intervall_einheit: EINHEITEN.includes(f.einheit) ? f.einheit : 'woche',
    intervall_anzahl: Math.min(120, Math.max(1, Math.round(Number(f.anzahl) || 1))),
    naechste_faelligkeit: f.naechste,
    zustaendig: f.zustaendig === 'teo' ? 'teo' : 'team',
    zustaendig_mitglied_id: zustaendigId,
    checkliste: punkteAus(f.punkte),
    fuer_mieter_sichtbar: Boolean(f.mieter),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = id
    ? await gate.db.from('teo_plaene').update(werte).eq('id', id).eq('kunde_id', kundeId).select('id').single()
    : await gate.db.from('teo_plaene').insert({ ...werte, kunde_id: kundeId }).select('id').single()
  if (error || !data) {
    logDbError('teo/hv/plaene:speichern', error)
    return { ok: false, message: 'Plan konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/kunden/${kundeId}/objekte/${objektId}`)
  return { ok: true, id: String(data.id) }
}

export async function entferneObjektPlan(kundeId: string, objektId: string, id: string): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { error } = await gate.db.from('teo_plaene').update({ aktiv: false }).eq('id', id).eq('kunde_id', kundeId).eq('kunde_objekt_id', objektId)
  if (error) {
    logDbError('teo/hv/plaene:entfernen', error)
    return { ok: false, message: 'Plan konnte nicht entfernt werden.' }
  }
  revalidatePath(`/kunden/${kundeId}/objekte/${objektId}`)
  return { ok: true }
}
