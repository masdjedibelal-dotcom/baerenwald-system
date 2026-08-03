'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { Toggle } from '@/components/ui/Toggle'
import { Card } from '@/components/ui/Card'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { kundenObjektKurzlabel } from '@/lib/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
import {
  FACHDETAILS_CONFIG,
  GROESSEN_CONFIG,
  KUNDENTYP_OPTIONS,
  groessePropLabel,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import { defaultGroesseEinheit, GROESSEN_EINHEITEN, groesseEinheitLabel } from '@/lib/dokument-einheiten'
import { KANAL_LABELS, cn } from '@/lib/utils'
import type { Kunde, KundenObjekt, LeadKanal } from '@/lib/types'
import { istKundeGewerbeTyp, istKundeHausverwaltungTyp } from '@/lib/kunde-stammdaten'
import {
  DRINGLICHKEIT_OPTIONS,
  STAFF_ANLIEGEN,
  UMFANG_OPTIONS,
  ZEITRAUM_ERNEUERN_OPTIONS,
  ZUGAENGLICHKEIT_OPTIONS,
  ZUSTAND_OPTIONS,
  anliegenToSituation,
  createInitialStaffFunnelState,
  type StaffAnliegenId,
  type StaffErfassungsModus,
  type StaffFunnelState,
} from '@/lib/anfragen/staff-funnel-types'
import {
  bereicheForStaffSituation,
  staffFunnelDynamicBlocks,
  staffFunnelFachdetailKeys,
  staffFunnelGroesseBereiche,
} from '@/lib/anfragen/staff-funnel-steps'
import { estimateStaffFunnelPrice } from '@/lib/anfragen/staff-funnel-price'
import { staffFunnelToPayload } from '@/lib/anfragen/staff-funnel-payload'
import {
  StaffChoiceGrid,
  StaffPreisIndikation,
} from '@/components/anfragen/staff-funnel/StaffFunnelUi'

const STAFF_KANAL: LeadKanal[] = [
  'telefon',
  'email',
  'vor_ort',
  'whatsapp',
  'hv_direkt',
  'hv_manuell',
  'sonstiges',
]

function FunnelIcon({ name }: { name: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- lokale SVG-Icons
    <img src={`/icons/${name}.svg`} alt="" width={22} height={22} decoding="async" />
  )
}

function splitStrasseHausnummer(raw: string): { strasse: string; hausnummer: string } {
  const m = raw.match(/^(.*?)(?:\s+(\d+\S*))?$/)
  return {
    strasse: (m?.[1] ?? raw).trim(),
    hausnummer: (m?.[2] ?? '').trim(),
  }
}

/** Kundenadresse — immer sichtbar im Kunde-Block. */
function KundenAdresseFields({
  state,
  patch,
}: {
  state: StaffFunnelState
  patch: (p: Partial<StaffFunnelState>) => void
}) {
  return (
    <>
      <MockField label="Straße" full className="min-w-0">
        <input
          className="input"
          value={
            state.hausnummer.trim()
              ? `${state.strasse} ${state.hausnummer}`.trim()
              : state.strasse
          }
          onChange={(e) => patch(splitStrasseHausnummer(e.target.value))}
          placeholder="z.B. Lindenstr. 24"
          autoComplete="street-address"
        />
      </MockField>
      <div className="full grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <MockField label="PLZ" className="min-w-0">
          <input
            className="input"
            value={state.plz}
            onChange={(e) => patch({ plz: e.target.value.slice(0, 5) })}
            placeholder="80796"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
          />
        </MockField>
        <MockField label="Ort" className="min-w-0">
          <input
            className="input"
            value={state.ort}
            onChange={(e) => patch({ ort: e.target.value })}
            placeholder="München"
            autoComplete="address-level2"
          />
        </MockField>
      </div>
    </>
  )
}

/** Leistungs-/Objektadresse, wenn abweichend von der Kundenadresse. */
function MeldeadresseFields({
  state,
  patch,
}: {
  state: StaffFunnelState
  patch: (p: Partial<StaffFunnelState>) => void
}) {
  return (
    <>
      <MockField label="Straße (Objekt / Leistung)" full className="min-w-0">
        <input
          className="input"
          value={
            state.objektHausnummer.trim()
              ? `${state.objektStrasse} ${state.objektHausnummer}`.trim()
              : state.objektStrasse
          }
          onChange={(e) => {
            const s = splitStrasseHausnummer(e.target.value)
            patch({
              kundeObjektId: null,
              objektStrasse: s.strasse,
              objektHausnummer: s.hausnummer,
            })
          }}
          placeholder="z.B. Baustellenstr. 12"
        />
      </MockField>
      <div className="full grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <MockField label="PLZ (Objekt)" className="min-w-0">
          <input
            className="input"
            value={state.objektPlz}
            onChange={(e) =>
              patch({ kundeObjektId: null, objektPlz: e.target.value.slice(0, 5) })
            }
            placeholder="80796"
            inputMode="numeric"
            maxLength={5}
          />
        </MockField>
        <MockField label="Ort (Objekt)" className="min-w-0">
          <input
            className="input"
            value={state.objektOrt}
            onChange={(e) => patch({ kundeObjektId: null, objektOrt: e.target.value })}
            placeholder="München"
          />
        </MockField>
      </div>
    </>
  )
}

const MIETER_OBJEKT_CLEAR = {
  mieterVorname: '',
  mieterNachname: '',
  kundeObjektId: null as string | null,
  objektPlz: '',
  objektOrt: '',
  objektStrasse: '',
  objektHausnummer: '',
}

/** Optional: Mieter + Leistungsort (Objekt-Dropdown oder Freitext) bei HV. */
function HvMieterObjektFields({
  state,
  patch,
  objekte,
  objekteLaden,
}: {
  state: StaffFunnelState
  patch: (p: Partial<StaffFunnelState>) => void
  objekte: KundenObjekt[]
  objekteLaden: boolean
}) {
  function selectObjekt(id: string) {
    if (!id) {
      patch({
        kundeObjektId: null,
        objektStrasse: '',
        objektHausnummer: '',
        objektPlz: '',
        objektOrt: '',
      })
      return
    }
    const o = objekte.find((x) => x.id === id)
    if (!o) {
      patch({ kundeObjektId: id })
      return
    }
    patch({
      kundeObjektId: o.id,
      objektStrasse: o.strasse ?? '',
      objektHausnummer: o.hausnummer ?? '',
      objektPlz: o.plz ?? '',
      objektOrt: o.ort ?? '',
    })
  }

  return (
    <div className="full min-w-0 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
        Mieter (optional)
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <MockField label="Vorname Mieter" className="min-w-0">
          <input
            className="input"
            value={state.mieterVorname}
            onChange={(e) => patch({ mieterVorname: e.target.value })}
            placeholder="Max"
            autoComplete="off"
          />
        </MockField>
        <MockField label="Nachname Mieter" className="min-w-0">
          <input
            className="input"
            value={state.mieterNachname}
            onChange={(e) => patch({ mieterNachname: e.target.value })}
            placeholder="Mustermann"
            autoComplete="off"
          />
        </MockField>
      </div>

      {objekte.length > 0 || objekteLaden ? (
        <MockField label="Objekt" full className="min-w-0">
          <select
            className="input"
            value={state.kundeObjektId ?? ''}
            onChange={(e) => selectObjekt(e.target.value)}
            aria-label="Objekt wählen"
            disabled={objekteLaden}
          >
            <option value="">
              {objekteLaden ? 'Objekte werden geladen…' : '— Objekt wählen oder Adresse eingeben —'}
            </option>
            {objekte.map((o) => (
              <option key={o.id} value={o.id}>
                {kundenObjektKurzlabel(o)}
              </option>
            ))}
          </select>
        </MockField>
      ) : state.kundeId ? (
        <p className="m-0 text-xs text-bw-text-muted">
          Keine hinterlegten Objekte — Leistungsort unten eingeben.
        </p>
      ) : (
        <p className="m-0 text-xs text-bw-text-muted">
          Objekt-Dropdown nach Auswahl eines Bestandskunden; sonst Adresse eingeben.
        </p>
      )}

      <MeldeadresseFields state={state} patch={patch} />
    </div>
  )
}

/**
 * „Anfrage erfassen“ — Formular (Karten wie Website) oder Frei (Text).
 */
export function StaffFunnelWizard({
  open,
  onClose,
  defaultKundeId,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  defaultKundeId?: string | null
  onSuccess?: (id: string) => void
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(() => typeof document !== 'undefined')
  const [state, setState] = useState<StaffFunnelState>(() =>
    createInitialStaffFunnelState({ kundeId: defaultKundeId ?? null })
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bekannterKunde, setBekannterKunde] = useState<Kunde | null>(null)
  const [bestandskunde, setBestandskunde] = useState(Boolean(defaultKundeId))
  const [meldeAbweichend, setMeldeAbweichend] = useState(false)
  const [hvObjekte, setHvObjekte] = useState<KundenObjekt[]>([])
  const [hvObjekteLaden, setHvObjekteLaden] = useState(false)
  const [kundeAdresse, setKundeAdresse] = useState<{
    plz: string
    ort: string
    strasse: string
    hausnummer: string
  } | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setState(createInitialStaffFunnelState({ kundeId: defaultKundeId ?? null }))
    setBekannterKunde(null)
    setKundeAdresse(null)
    setError(null)
    setBestandskunde(Boolean(defaultKundeId))
    setMeldeAbweichend(false)
    setHvObjekte([])
  }, [open, defaultKundeId])

  const isHv =
    state.kundentyp === 'verwaltung' || istKundeHausverwaltungTyp(bekannterKunde?.typ)

  useEffect(() => {
    if (!open || !isHv || !state.kundeId) {
      setHvObjekte([])
      setHvObjekteLaden(false)
      return
    }
    let cancelled = false
    setHvObjekteLaden(true)
    void fetchKundenObjekte(state.kundeId).then((rows) => {
      if (cancelled) return
      setHvObjekte(rows)
      setHvObjekteLaden(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, isHv, state.kundeId])

  useEffect(() => {
    if (state.erfassungsModus !== 'formular') return
    const est = estimateStaffFunnelPrice(state)
    setState((s) => {
      if (
        s.preisModus === est.modus &&
        s.preisMin === est.min &&
        s.preisMax === est.max &&
        s.preisHinweis === est.hinweis
      ) {
        return s
      }
      return {
        ...s,
        preisModus: est.modus,
        preisMin: est.min,
        preisMax: est.max,
        preisHinweis: est.hinweis,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gezielte Funnel-Felder
  }, [
    state.erfassungsModus,
    state.anliegen,
    state.situation,
    state.bereiche,
    state.groessen,
    state.umfang,
    state.zugaenglichkeit,
    state.zustand,
    state.fachdetails,
    state.dringlichkeit,
    state.plz,
    state.badAusstattung,
  ])

  const patch = useCallback((p: Partial<StaffFunnelState>) => {
    setState((s) => ({ ...s, ...p }))
  }, [])

  function setModus(modus: StaffErfassungsModus) {
    patch({ erfassungsModus: modus })
  }

  function applyKunde(k: Kunde) {
    setBekannterKunde(k)
    const gewerbe = istKundeGewerbeTyp(k.typ) || istKundeHausverwaltungTyp(k.typ)
    const hv = istKundeHausverwaltungTyp(k.typ)
    const adresse = {
      plz: k.plz ?? '',
      ort: k.ort ?? '',
      strasse: k.strasse ?? '',
      hausnummer: k.hausnummer ?? '',
    }
    setKundeAdresse(adresse)
    patch({
      kundeId: k.id,
      firmaName: gewerbe ? (k.name ?? '') : '',
      vorname: k.vorname ?? '',
      nachname: k.nachname ?? (!gewerbe ? k.name ?? '' : ''),
      email: k.email ?? '',
      telefon: k.telefon ?? '',
      kundentyp: hv ? 'verwaltung' : k.typ === 'gewerbe' ? 'gewerbe' : state.kundentyp || 'eigentuemer',
      ...adresse,
      ...MIETER_OBJEKT_CLEAR,
    })
    setMeldeAbweichend(false)
  }

  function setBestandskundeOn(on: boolean) {
    setBestandskunde(on)
    if (on) return
    setBekannterKunde(null)
    setKundeAdresse(null)
    setHvObjekte([])
    patch({
      kundeId: null,
      firmaName: '',
      vorname: '',
      nachname: '',
      email: '',
      telefon: '',
      kundentyp: state.anliegen === 'gewerbe' ? 'gewerbe' : '',
      plz: '',
      ort: '',
      strasse: '',
      hausnummer: '',
      ...MIETER_OBJEKT_CLEAR,
    })
    setMeldeAbweichend(false)
  }

  function setMeldeAbweichendOn(on: boolean) {
    setMeldeAbweichend(on)
    if (!on) {
      patch({
        kundeObjektId: null,
        objektPlz: '',
        objektOrt: '',
        objektStrasse: '',
        objektHausnummer: '',
      })
    }
  }

  function selectAnliegen(id: StaffAnliegenId) {
    const sit = anliegenToSituation(id) as SituationValue
    patch({
      anliegen: id,
      situation: sit,
      bereiche: id === 'gewerbe' ? ['gewerbe'] : [],
      fachdetails: {},
      groessen: {},
      groessenEinheiten: {},
      kundentyp: id === 'gewerbe' ? 'gewerbe' : state.kundentyp === 'gewerbe' ? '' : state.kundentyp,
      preisModus: id === 'gewerbe' ? 'komplex' : 'rahmen',
    })
  }

  function setBereich(v: string) {
    setState((s) => ({
      ...s,
      bereiche: v ? [v] : [],
      fachdetails: {},
      groessen: {},
      groessenEinheiten: {},
      badAusstattung: '',
    }))
  }

  async function submit() {
    setError(null)
    let s = state
    if (
      s.erfassungsModus === 'formular' &&
      s.preisMin == null &&
      s.preisMax == null &&
      s.preisModus !== 'komplex'
    ) {
      const est = estimateStaffFunnelPrice(s)
      s = {
        ...s,
        preisModus: est.modus,
        preisMin: est.min,
        preisMax: est.max,
        preisHinweis: est.hinweis,
      }
      setState(s)
    }
    const payload = staffFunnelToPayload(s)
    if ('error' in payload) {
      setError(payload.error)
      return
    }
    setLoading(true)
    const r = await createAnfrage(payload)
    setLoading(false)
    if (!r.ok) {
      setError(r.message)
      toast.error(r.message)
      return
    }
    toast.success('Anfrage angelegt')
    if (onSuccess) onSuccess(r.id)
    else {
      onClose()
      router.push(`/anfragen/${r.id}`)
    }
  }

  const bereichOptions = useMemo(() => {
    if (!state.situation && !state.anliegen) return []
    const sit = (state.situation || anliegenToSituation(state.anliegen)) as SituationValue
    return bereicheForStaffSituation(sit).map((b) => ({
      value: b.value,
      label: b.label,
    }))
  }, [state.situation, state.anliegen])

  const isFormular = state.erfassungsModus === 'formular'
  const showBereiche = isFormular && state.anliegen !== 'gewerbe' && Boolean(state.anliegen)
  const dyn = useMemo(() => staffFunnelDynamicBlocks(state), [state])
  const fachKeys = useMemo(() => staffFunnelFachdetailKeys(state), [state])
  const groesseBereiche = useMemo(() => staffFunnelGroesseBereiche(state), [state])
  const showDetails = isFormular && Boolean(state.anliegen) && dyn.any
  const needsFirma =
    state.anliegen === 'gewerbe' ||
    state.kundentyp === 'verwaltung' ||
    state.kundentyp === 'gewerbe'

  if (!open || !mounted) return null

  return (
    <DocumentCanvas
      open={open}
      title="Anfrage erfassen"
      onClose={onClose}
      onSave={() => {
        if (loading) return
        void submit()
      }}
      saveBusy={loading}
      footerCta={
        <StaffPreisIndikation
          min={isFormular ? state.preisMin : null}
          max={isFormular ? state.preisMax : null}
          komplex={
            isFormular &&
            (state.preisModus === 'komplex' || state.anliegen === 'gewerbe')
          }
        />
      }
      className="staff-funnel staff-funnel--mock"
    >
      <div className="sf-mock">
        {error ? (
          <p className="sf-mock-error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="sf-sec">
          <div className="segment-toggle" role="group" aria-label="Erfassungsart">
            <button
              type="button"
              className={cn(
                'segment-toggle-btn',
                isFormular && 'segment-toggle-btn--active'
              )}
              onClick={() => setModus('formular')}
            >
              Formular
            </button>
            <button
              type="button"
              className={cn(
                'segment-toggle-btn',
                !isFormular && 'segment-toggle-btn--active'
              )}
              onClick={() => setModus('frei')}
            >
              Frei
            </button>
          </div>
        </section>

        {isFormular ? (
          <>
            <section className="sf-sec">
              <h3 className="sf-sec-l">Anliegen</h3>
              <div className="sf-anliegen">
                {STAFF_ANLIEGEN.map((a) => {
                  const selected = state.anliegen === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cn('funnel-tile', selected && 'selected')}
                      onClick={() => selectAnliegen(a.id)}
                    >
                      <span className="funnel-tile-icon-wrap" aria-hidden>
                        <FunnelIcon name={a.icon} />
                      </span>
                      <p className="funnel-tile-label">{a.label}</p>
                      <p className="funnel-tile-hint">{a.hint}</p>
                      {a.tag ? <span className="funnel-tile-tag">{a.tag}</span> : null}
                    </button>
                  )
                })}
              </div>
            </section>

            {showBereiche ? (
              <section className="sf-sec">
                <h3 className="sf-sec-l">Bereich</h3>
                <select
                  className="input"
                  value={state.bereiche[0] ?? ''}
                  onChange={(e) => setBereich(e.target.value)}
                  aria-label="Bereich"
                >
                  <option value="">Bitte wählen</option>
                  {bereichOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </section>
            ) : null}

            {showDetails ? (
              <section className="sf-sec">
                <h3 className="sf-sec-l">Details</h3>
                <MockFormSection>
                  {dyn.umfang ? (
                    <MockField label="Umfang / Rhythmus" full>
                      <StaffChoiceGrid
                        columns={2}
                        options={UMFANG_OPTIONS}
                        value={state.umfang}
                        onChange={(v) => patch({ umfang: v })}
                      />
                    </MockField>
                  ) : null}

                  {dyn.zugaenglichkeit ? (
                    <MockField label="Zugänglichkeit" full>
                      <StaffChoiceGrid
                        columns={2}
                        options={ZUGAENGLICHKEIT_OPTIONS}
                        value={state.zugaenglichkeit}
                        onChange={(v) => patch({ zugaenglichkeit: v })}
                      />
                    </MockField>
                  ) : null}

                  {dyn.zustand ? (
                    <MockField label="Zustand" full>
                      <StaffChoiceGrid
                        columns={2}
                        options={ZUSTAND_OPTIONS}
                        value={state.zustand}
                        onChange={(v) => patch({ zustand: v })}
                      />
                    </MockField>
                  ) : null}

                  {dyn.badAusstattung ? (
                    <MockField
                      label={FACHDETAILS_CONFIG.bad_ausstattung?.frage ?? 'Bad — Ausstattung'}
                      full
                    >
                      <StaffChoiceGrid
                        columns={2}
                        options={FACHDETAILS_CONFIG.bad_ausstattung.optionen}
                        value={state.badAusstattung}
                        onChange={(v) => patch({ badAusstattung: v })}
                      />
                    </MockField>
                  ) : null}

                  {dyn.fachdetails
                    ? fachKeys.map((key) => {
                        const config = FACHDETAILS_CONFIG[key]
                        if (!config) return null
                        return (
                          <MockField key={key} label={config.frage} full>
                            <StaffChoiceGrid
                              columns={2}
                              options={config.optionen}
                              value={state.fachdetails[key] ?? ''}
                              onChange={(v) =>
                                setState((s) => ({
                                  ...s,
                                  fachdetails: { ...s.fachdetails, [key]: v },
                                }))
                              }
                            />
                          </MockField>
                        )
                      })
                    : null}

                  {dyn.groesse
                    ? groesseBereiche.map((bereich) => {
                        const g = GROESSEN_CONFIG[bereich]
                        if (!g) return null
                        return (
                          <MockField
                            key={bereich}
                            label={groessePropLabel(bereich)}
                            full
                            hint={g.hinweis}
                          >
                            <div className="sf-groesse-row">
                              <input
                                type="number"
                                min={0}
                                className="input"
                                value={state.groessen[bereich] ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  setState((s) => {
                                    const next = { ...s.groessen }
                                    if (raw === '') delete next[bereich]
                                    else {
                                      const n = Number(raw)
                                      if (Number.isFinite(n) && n >= 0) next[bereich] = n
                                    }
                                    return { ...s, groessen: next }
                                  })
                                }}
                                placeholder="0"
                              />
                              <select
                                className="input sf-groesse-einheit"
                                value={
                                  state.groessenEinheiten[bereich] ??
                                  defaultGroesseEinheit(bereich)
                                }
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    groessenEinheiten: {
                                      ...s.groessenEinheiten,
                                      [bereich]: e.target.value,
                                    },
                                  }))
                                }
                                aria-label={`Einheit ${groessePropLabel(bereich)}`}
                              >
                                {GROESSEN_EINHEITEN.map((u) => (
                                  <option key={u} value={u}>
                                    {groesseEinheitLabel(u)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </MockField>
                        )
                      })
                    : null}

                  {dyn.dringlichkeit ? (
                    <MockField label="Dringlichkeit" full>
                      <StaffChoiceGrid
                        columns={2}
                        options={DRINGLICHKEIT_OPTIONS}
                        value={state.dringlichkeit}
                        onChange={(v) => patch({ dringlichkeit: v })}
                      />
                    </MockField>
                  ) : null}

                  {dyn.beratung ? (
                    <SheetEditableField
                      label="Beratung / Hinweis"
                      hint="Kurz was im Gespräch geklärt werden soll"
                      value={state.beratungText}
                      onSave={(beratungText) => patch({ beratungText })}
                      multiline
                      rows={3}
                      placeholder="z.B. Vor-Ort-Termin, Aufmaß…"
                    />
                  ) : null}
                </MockFormSection>
              </section>
            ) : null}

          </>
        ) : (
          <section className="sf-sec">
            <MockFormSection>
              <SheetEditableField
                label="Vorhaben"
                value={state.vorhaben}
                onSave={(vorhaben) => patch({ vorhaben })}
                placeholder="z.B. Badsanierung komplett"
              />
              <SheetEditableField
                label="Beschreibung"
                hint="Wortlaut des Kunden"
                value={state.freitext}
                onSave={(freitext) => patch({ freitext })}
                multiline
                rows={4}
                placeholder="Was genau ist zu tun…"
              />
            </MockFormSection>
          </section>
        )}

        <section className="sf-sec">
          <Card title="Kunde" collapsible defaultOpen>
            <MockFormSection>
            <div className="full">
              <Toggle
                label="Bestandskunde"
                checked={bestandskunde}
                onChange={setBestandskundeOn}
              />
            </div>

            {bestandskunde ? (
              <MockField label="Kunde suchen" full className="min-w-0">
                <KundeAuswahlFeld
                  label=""
                  kundeId={state.kundeId}
                  bekannterKunde={bekannterKunde}
                  onKundeIdChange={(id) => {
                    if (!id) {
                      setBekannterKunde(null)
                      setKundeAdresse(null)
                      setHvObjekte([])
                      patch({ kundeId: null, ...MIETER_OBJEKT_CLEAR })
                      setMeldeAbweichend(false)
                    } else {
                      patch({ kundeId: id })
                    }
                  }}
                  onKundeGewaehlt={applyKunde}
                />
              </MockField>
            ) : (
              <>
                <MockField label="Kundentyp" full>
                  <StaffChoiceGrid
                    columns={2}
                    options={KUNDENTYP_OPTIONS}
                    value={state.kundentyp}
                    onChange={(v) => {
                      const nextHv = v === 'verwaltung'
                      patch({
                        kundentyp: v,
                        ...(nextHv ? {} : MIETER_OBJEKT_CLEAR),
                      })
                      if (!nextHv) setMeldeAbweichend(false)
                    }}
                  />
                </MockField>
                {needsFirma ? (
                  <MockField label="Firma" full required>
                    <input
                      className="input"
                      value={state.firmaName}
                      onChange={(e) => patch({ firmaName: e.target.value })}
                      placeholder="Muster GmbH"
                      autoComplete="organization"
                    />
                  </MockField>
                ) : null}
                <div className="full grid gap-3 sm:grid-cols-2">
                  <MockField
                    label={needsFirma ? 'Vorname (Ansprechpartner)' : 'Vorname'}
                    required={!needsFirma}
                  >
                    <input
                      className="input"
                      value={state.vorname}
                      onChange={(e) => patch({ vorname: e.target.value })}
                      placeholder="Maria"
                      autoComplete="given-name"
                    />
                  </MockField>
                  <MockField
                    label={needsFirma ? 'Nachname (Ansprechpartner)' : 'Nachname'}
                    required={!needsFirma}
                  >
                    <input
                      className="input"
                      value={state.nachname}
                      onChange={(e) => patch({ nachname: e.target.value })}
                      placeholder="Koch"
                      autoComplete="family-name"
                    />
                  </MockField>
                </div>
                <MockField label="Telefon">
                  <input
                    className="input"
                    type="tel"
                    value={state.telefon}
                    onChange={(e) => patch({ telefon: e.target.value })}
                  />
                </MockField>
                <MockField label="E-Mail">
                  <input
                    className="input"
                    type="email"
                    value={state.email}
                    onChange={(e) => patch({ email: e.target.value })}
                  />
                </MockField>
              </>
            )}

            <KundenAdresseFields state={state} patch={patch} />
            {isHv ? (
              <HvMieterObjektFields
                state={state}
                patch={patch}
                objekte={hvObjekte}
                objekteLaden={hvObjekteLaden}
              />
            ) : (
              <>
                <div className="full">
                  <Toggle
                    label="Leistungsort abweichend"
                    checked={meldeAbweichend}
                    onChange={setMeldeAbweichendOn}
                  />
                </div>
                {meldeAbweichend ? <MeldeadresseFields state={state} patch={patch} /> : null}
              </>
            )}
            </MockFormSection>
          </Card>
        </section>

        <section className="sf-sec">
          <Card title="Anfragedaten" collapsible defaultOpen>
            <MockFormSection>
            <MockField label="Zeitraum" full>
              <select
                className="input"
                value={state.zeitraum}
                onChange={(e) => patch({ zeitraum: e.target.value })}
                aria-label="Zeitraum"
              >
                <option value="">Bitte wählen</option>
                {ZEITRAUM_ERNEUERN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </MockField>
            <MockField label="Herkunft" full>
              <select
                className="input"
                value={state.kanal}
                onChange={(e) => patch({ kanal: e.target.value as LeadKanal })}
                aria-label="Herkunft"
              >
                {STAFF_KANAL.map((k) => (
                  <option key={k} value={k}>
                    {KANAL_LABELS[k] ?? k}
                  </option>
                ))}
              </select>
            </MockField>
          </MockFormSection>
          </Card>
        </section>
      </div>
    </DocumentCanvas>
  )
}
