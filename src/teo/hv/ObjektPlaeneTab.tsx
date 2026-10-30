'use client'

import { useCallback, useEffect, useState } from 'react'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockField, MockInput, MockSelect, MockTextarea } from '@/components/mock-ui/MockForm'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useTransition } from '@/components/ui/action-busy'
import { toast } from '@/components/ui/app-toast'
import { DateInput } from '@/components/ui/DateInput'
import { formatDatum } from '@/lib/format/geld-datum'
import {
  entferneObjektPlan,
  ladeObjektPlaene,
  speichereObjektPlan,
  type CrmPlan,
} from '@/teo/hv/plaene-actions'
import {
  heute,
  intervallText,
  PLAN_ART_LABEL,
  PLAN_STAND,
  PLAN_VORLAGEN,
  planStand,
  type IntervallEinheit,
  type PlanArt,
  type PlanZustaendig,
} from '@/teo/hv/plan-logik'

type Entwurf = {
  titel: string
  art: PlanArt
  einheit: IntervallEinheit
  anzahl: number
  naechste: string
  zustaendig: PlanZustaendig
  zustaendigId: string
  punkte: string
  mieter: boolean
}

const LEER: Entwurf = {
  titel: '',
  art: 'kontrolle',
  einheit: 'woche',
  anzahl: 1,
  naechste: heute(),
  zustaendig: 'team',
  zustaendigId: '',
  punkte: '',
  mieter: false,
}

const EINHEIT_LABEL: Record<IntervallEinheit, string> = { tag: 'Tag(e)', woche: 'Woche(n)', monat: 'Monat(e)', jahr: 'Jahr(e)' }

/**
 * Servus TEO: Pläne (Checklisten, Wartungen, Prüfungen) am Objekt zentral aus dem CRM pflegen.
 * Die Verwaltung sieht und ändert dieselben Pläne im Arbeitsplatz.
 */
export function ObjektPlaeneTab({ kundeId, objektId }: { kundeId: string; objektId: string }) {
  const [plaene, setPlaene] = useState<CrmPlan[] | null>(null)
  const [team, setTeam] = useState<Array<{ id: string; name: string }>>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [offen, setOffen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [e, setE] = useState<Entwurf>(LEER)
  const [dirty, setDirty] = useState(false)
  const [sheetFehler, setSheetFehler] = useState<string | null>(null)
  const [pending, starten] = useTransition()

  const laden = useCallback(async () => {
    const r = await ladeObjektPlaene(kundeId, objektId)
    if (!r.ok) {
      setFehler(r.message)
      setPlaene([])
      return
    }
    setFehler(null)
    setPlaene(r.plaene)
    setTeam(r.team)
  }, [kundeId, objektId])

  useEffect(() => {
    void laden()
  }, [laden])

  function set<K extends keyof Entwurf>(k: K, v: Entwurf[K]) {
    setDirty(true)
    setE((alt) => ({ ...alt, [k]: v }))
  }

  function neu() {
    setEditId(null)
    setE({ ...LEER, naechste: heute() })
    setDirty(false)
    setSheetFehler(null)
    setOffen(true)
  }

  function bearbeiten(p: CrmPlan) {
    setEditId(p.id)
    setE({
      titel: p.titel,
      art: p.art,
      einheit: p.einheit,
      anzahl: p.anzahl,
      naechste: p.naechste,
      zustaendig: p.zustaendig,
      zustaendigId: p.zustaendigId ?? '',
      punkte: p.checkliste.map((c) => c.text).join('\n'),
      mieter: p.mieter,
    })
    setDirty(false)
    setSheetFehler(null)
    setOffen(true)
  }

  function vorlage(id: string) {
    const v = PLAN_VORLAGEN.find((x) => x.id === id)
    if (!v) return
    setDirty(true)
    setE((alt) => ({
      ...alt,
      titel: v.titel,
      art: v.art,
      einheit: v.einheit,
      anzahl: v.anzahl,
      zustaendig: v.zustaendig,
      zustaendigId: v.zustaendig === 'teo' ? '' : alt.zustaendigId,
      mieter: v.mieter,
      punkte: v.punkte.join('\n'),
    }))
  }

  function speichern() {
    setSheetFehler(null)
    starten(async () => {
      const r = await speichereObjektPlan(kundeId, objektId, editId, {
        titel: e.titel,
        art: e.art,
        einheit: e.einheit,
        anzahl: e.anzahl,
        naechste: e.naechste,
        zustaendig: e.zustaendig,
        zustaendigId: e.zustaendig === 'team' ? e.zustaendigId || null : null,
        punkte: e.punkte.split('\n'),
        mieter: e.mieter,
      })
      if (!r.ok) {
        setSheetFehler(r.message)
        return
      }
      toast.success('Plan gespeichert')
      setDirty(false)
      setOffen(false)
      await laden()
    })
  }

  function entfernen() {
    if (!editId) return
    starten(async () => {
      const r = await entferneObjektPlan(kundeId, objektId, editId)
      if (!r.ok) {
        setSheetFehler(r.message)
        return
      }
      toast.success('Plan entfernt')
      setDirty(false)
      setOffen(false)
      await laden()
    })
  }

  if (plaene === null) return <CrmInlineLoading label="Pläne werden geladen …" />

  return (
    <>
      <MockCard
        title={plaene.length ? `Pläne · ${plaene.length}` : 'Pläne'}
        icon="clipboard-check"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={neu}>
            Plan anlegen
          </MockBtn>
        }
      >
        {fehler ? <p className="text-[length:var(--fs-text)] text-danger">{fehler}</p> : null}
        {plaene.length === 0 ? (
          <MockEmpty icon="clipboard-check" title="Noch keine Pläne" />
        ) : (
          <div className="ap-cards">
            {plaene.map((p) => {
              const stand = PLAN_STAND[planStand(p.naechste)]
              const wer = p.zustaendig === 'teo' ? 'TEO beauftragt' : p.zustaendigName ? `Team: ${p.zustaendigName}` : 'Team'
              return (
                <div key={p.id} className="ap-mobile-card ap-mobile-card--row">
                  <MockBtn className="ap-mobile-card__hit" type="button" onClick={() => bearbeiten(p)}>
                    <div className="ap-mobile-card__top">
                      <span className="ap-mobile-card__name">{p.titel}</span>
                      <MockBadge kind={stand.badge}>{stand.label}</MockBadge>
                    </div>
                    <div className="ap-mobile-card__meta">
                      {PLAN_ART_LABEL[p.art]} · {intervallText(p.einheit, p.anzahl)} · {wer}
                      {p.mieter ? ' · für Mieter sichtbar' : ''}
                    </div>
                    <div className="ap-mobile-card__meta">
                      Nächstes Mal {formatDatum(p.naechste)}
                      {p.letzte ? ` · zuletzt ${formatDatum(p.letzte)}` : ''}
                      {p.checkliste.length ? ` · ${p.checkliste.length} Punkte` : ''}
                    </div>
                  </MockBtn>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

      <EditorSheet
        open={offen}
        onClose={() => setOffen(false)}
        title={editId ? 'Plan bearbeiten' : 'Plan anlegen'}
        context="detail"
        dirty={dirty}
        confirmBusy={pending}
        onConfirm={speichern}
        danger={editId ? { label: 'Entfernen', onClick: entfernen, disabled: pending } : null}
      >
        <div className="space-y-3">
          {!editId ? (
            <MockField label="Vorlage">
              <MockSelect value="" onChange={(ev) => vorlage(ev.target.value)}>
                <option value="">Ohne Vorlage</option>
                {PLAN_VORLAGEN.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.titel}
                  </option>
                ))}
              </MockSelect>
            </MockField>
          ) : null}
          <MockField label="Name" required>
            <MockInput value={e.titel} onChange={(ev) => set('titel', ev.target.value)} />
          </MockField>
          <MockField label="Art">
            <MockSelect value={e.art} onChange={(ev) => set('art', ev.target.value as PlanArt)}>
              {(Object.keys(PLAN_ART_LABEL) as PlanArt[]).map((a) => (
                <option key={a} value={a}>
                  {PLAN_ART_LABEL[a]}
                </option>
              ))}
            </MockSelect>
          </MockField>
          <MockField label="Alle">
            <div className="flex gap-2">
              <MockInput
                type="number"
                min={1}
                max={120}
                value={e.anzahl}
                onChange={(ev) => set('anzahl', Number(ev.target.value) || 1)}
                style={{ maxWidth: 90 }}
              />
              <MockSelect value={e.einheit} onChange={(ev) => set('einheit', ev.target.value as IntervallEinheit)}>
                {(Object.keys(EINHEIT_LABEL) as IntervallEinheit[]).map((u) => (
                  <option key={u} value={u}>
                    {EINHEIT_LABEL[u]}
                  </option>
                ))}
              </MockSelect>
            </div>
          </MockField>
          <MockField label="Nächstes Mal" required>
            <DateInput value={e.naechste} onChange={(ev) => set('naechste', ev.target.value)} />
          </MockField>
          <MockField label="Wer erledigt es?">
            <MockSelect value={e.zustaendig} onChange={(ev) => set('zustaendig', ev.target.value as PlanZustaendig)}>
              <option value="team">Team der Verwaltung (Hausmeister, Putzdienst …)</option>
              <option value="teo">TEO beauftragt einen Fachbetrieb</option>
            </MockSelect>
          </MockField>
          {e.zustaendig === 'team' && team.length ? (
            <MockField label="Person">
              <MockSelect value={e.zustaendigId} onChange={(ev) => set('zustaendigId', ev.target.value)}>
                <option value="">Ganzes Team</option>
                {team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </MockSelect>
            </MockField>
          ) : null}
          <MockField label="Checkliste (ein Punkt pro Zeile)">
            <MockTextarea rows={6} value={e.punkte} onChange={(ev) => set('punkte', ev.target.value)} />
          </MockField>
          <label className="wa-check">
            <MockCheckbox checked={e.mieter} onChange={(ev) => set('mieter', ev.target.checked)} />
            <span>Für Mieter sichtbar (Aushang, z. B. Putzplan)</span>
          </label>
          {sheetFehler ? <p className="text-[length:var(--fs-text)] text-danger">{sheetFehler}</p> : null}
        </div>
      </EditorSheet>
    </>
  )
}
