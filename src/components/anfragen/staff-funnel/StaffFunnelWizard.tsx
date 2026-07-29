'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Pencil } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
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
import type { Kunde, LeadKanal } from '@/lib/types'
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
  type StaffFunnelState,
} from '@/lib/anfragen/staff-funnel-types'
import {
  bereicheForStaffSituation,
  staffFunnelDynamicBlocks,
  staffFunnelFachdetailKeys,
  staffFunnelGroesseBereiche,
} from '@/lib/anfragen/staff-funnel-steps'
import { estimateStaffFunnelPrice } from '@/lib/anfragen/staff-funnel-price'
import { staffFunnelKontaktName, staffFunnelToPayload } from '@/lib/anfragen/staff-funnel-payload'
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

function heuteDe(): string {
  return new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function FunnelIcon({ name }: { name: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- lokale SVG-Icons
    <img src={`/icons/${name}.svg`} alt="" width={22} height={22} decoding="async" />
  )
}

/**
 * Mock „Anfrage erfassen“ — ein scrollbarer DocumentCanvas-Screen.
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
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<StaffFunnelState>(() =>
    createInitialStaffFunnelState({ kundeId: defaultKundeId ?? null })
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bekannterKunde, setBekannterKunde] = useState<Kunde | null>(null)
  const [kundeOpen, setKundeOpen] = useState(false)
  const [kanalOpen, setKanalOpen] = useState(false)
  const [kundentypOpen, setKundentypOpen] = useState(false)
  const [weitereOpen, setWeitereOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setState(createInitialStaffFunnelState({ kundeId: defaultKundeId ?? null }))
    setBekannterKunde(null)
    setError(null)
    setKundeOpen(!defaultKundeId)
    setKanalOpen(false)
    setKundentypOpen(false)
    setWeitereOpen(false)
  }, [open, defaultKundeId])

  useEffect(() => {
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

  function applyKunde(k: Kunde) {
    setBekannterKunde(k)
    const gewerbe = istKundeGewerbeTyp(k.typ) || istKundeHausverwaltungTyp(k.typ)
    const hv = istKundeHausverwaltungTyp(k.typ)
    patch({
      kundeId: k.id,
      firmaName: gewerbe ? (k.name ?? '') : '',
      vorname: k.vorname ?? '',
      nachname: k.nachname ?? (!gewerbe ? k.name ?? '' : ''),
      email: k.email ?? '',
      telefon: k.telefon ?? '',
      plz: k.plz ?? '',
      ort: k.ort ?? '',
      strasse: k.strasse ?? '',
      hausnummer: k.hausnummer ?? '',
      kundentyp: hv ? 'verwaltung' : k.typ === 'gewerbe' ? 'gewerbe' : state.kundentyp || 'eigentuemer',
    })
    setKundeOpen(false)
  }

  function selectAnliegen(id: StaffAnliegenId) {
    const sit = anliegenToSituation(id) as SituationValue
    patch({
      anliegen: id,
      situation: sit,
      bereiche: id === 'gewerbe' ? ['gewerbe'] : [],
      fachdetails: {},
      groessen: {},
      kundentyp:
        id === 'hausverwaltung'
          ? 'verwaltung'
          : id === 'gewerbe'
            ? 'gewerbe'
            : state.kundentyp,
      kanal: id === 'hausverwaltung' ? 'hv_manuell' : state.kanal === 'hv_manuell' ? 'telefon' : state.kanal,
      preisModus: id === 'termin' || id === 'gewerbe' ? 'komplex' : 'rahmen',
    })
  }

  function toggleBereich(v: string) {
    setState((s) => {
      const has = s.bereiche.includes(v)
      const bereiche = has ? s.bereiche.filter((x) => x !== v) : [...s.bereiche, v]
      return { ...s, bereiche }
    })
  }

  async function submit() {
    setError(null)
    let s = state
    if (s.preisMin == null && s.preisMax == null && s.preisModus !== 'komplex') {
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
    const sit =
      state.situation ||
      anliegenToSituation(state.anliegen) ||
      ('erneuern' as SituationValue)
    if (state.anliegen === 'gewerbe') return []
    return bereicheForStaffSituation(sit === 'gewerbe' ? 'erneuern' : sit).map((b) => ({
      value: b.value,
      label: b.label,
    }))
  }, [state.situation, state.anliegen])

  const kundeLabel = useMemo(() => {
    const n = staffFunnelKontaktName(state)
    if (n) return n
    if (bekannterKunde?.name) return bekannterKunde.name
    return 'noch nicht erfasst'
  }, [state, bekannterKunde])

  const kundentypLabel =
    KUNDENTYP_OPTIONS.find((o) => o.value === state.kundentyp)?.label || '—'
  const kanalLabel = KANAL_LABELS[state.kanal] ?? state.kanal
  const subtitle = `${kanalLabel} · ${heuteDe()}`

  const showBereiche = state.anliegen !== 'gewerbe' && Boolean(state.anliegen)
  const showPreis = Boolean(state.anliegen)
  const dyn = useMemo(() => staffFunnelDynamicBlocks(state), [state])
  const fachKeys = useMemo(() => staffFunnelFachdetailKeys(state), [state])
  const groesseBereiche = useMemo(() => staffFunnelGroesseBereiche(state), [state])
  const showDetails = Boolean(state.anliegen) && dyn.any

  if (!open || !mounted) return null

  return (
    <DocumentCanvas
      open={open}
      title="Anfrage erfassen"
      subtitle={subtitle}
      onClose={onClose}
      onSave={() => void submit()}
      saveLabel="Anfrage anlegen"
      saveBusy={loading}
      onDiscard={onClose}
      className="staff-funnel staff-funnel--mock"
    >
      <div className="sf-mock">
        {error ? (
          <p className="sf-mock-error" role="alert">
            {error}
          </p>
        ) : null}

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

        <section className="sf-sec">
          <MockFormSection>
            <MockField label="Vorhaben" required full>
              <input
                className="input"
                value={state.vorhaben}
                onChange={(e) => patch({ vorhaben: e.target.value })}
                placeholder="z.B. Badsanierung komplett"
              />
            </MockField>
            <MockField label="Beschreibung" full hint="Wortlaut des Kunden">
              <textarea
                className="input ta"
                rows={3}
                value={state.freitext}
                onChange={(e) => patch({ freitext: e.target.value })}
                placeholder="Was genau ist zu tun…"
              />
            </MockField>
          </MockFormSection>
        </section>

        <section className="sf-sec">
          <h3 className="sf-sec-l">Ort</h3>
          <MockFormSection>
            <MockField label="Straße" full>
              <input
                className="input"
                value={
                  state.hausnummer.trim()
                    ? `${state.strasse} ${state.hausnummer}`.trim()
                    : state.strasse
                }
                onChange={(e) => {
                  const raw = e.target.value
                  const m = raw.match(/^(.*?)(?:\s+(\d+\S*))?$/)
                  patch({
                    strasse: (m?.[1] ?? raw).trim(),
                    hausnummer: (m?.[2] ?? '').trim(),
                  })
                }}
                placeholder="z.B. Lindenstr. 24"
              />
            </MockField>
            <MockField label="PLZ">
              <input
                className="input"
                value={state.plz}
                onChange={(e) => patch({ plz: e.target.value })}
                placeholder="80796"
              />
            </MockField>
            <MockField label="Ort / Region">
              <input
                className="input"
                value={state.ort}
                onChange={(e) => patch({ ort: e.target.value })}
                placeholder="München"
              />
            </MockField>
          </MockFormSection>
        </section>

        {showBereiche ? (
          <section className="sf-sec">
            <h3 className="sf-sec-l">Bereiche</h3>
            <div className="sf-pills" role="group" aria-label="Bereiche">
              {bereichOptions.map((b) => {
                const on = state.bereiche.includes(b.value)
                return (
                  <button
                    key={b.value}
                    type="button"
                    className={cn('sf-pill', on && 'on')}
                    onClick={() => toggleBereich(b.value)}
                  >
                    {b.label}
                  </button>
                )
              })}
            </div>
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
                      <MockField key={bereich} label={groessePropLabel(bereich)} full hint={g.hinweis}>
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
                              state.groessenEinheiten[bereich] ?? defaultGroesseEinheit(bereich)
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
                <MockField
                  label="Beratung / Hinweis"
                  full
                  hint="Kurz was im Gespräch geklärt werden soll — analog Website-Beratungspfad"
                >
                  <textarea
                    className="input ta"
                    rows={3}
                    value={state.beratungText}
                    onChange={(e) => patch({ beratungText: e.target.value })}
                    placeholder="z.B. Vor-Ort-Termin, Aufmaß, individuelle Planung…"
                  />
                </MockField>
              ) : null}
            </MockFormSection>
          </section>
        ) : null}

        <section className="sf-sec">
          <h3 className="sf-sec-l">Weitere Angaben</h3>
          <button
            type="button"
            className={cn('sf-acc-head', weitereOpen && 'open')}
            onClick={() => setWeitereOpen((o) => !o)}
          >
            <span>Budget & Zeitraum</span>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
          {weitereOpen ? (
            <div className="sf-acc-body">
              <MockFormSection>
                <MockField label="Budget (Orientierung)" full>
                  <input
                    className="input"
                    value={state.budgetHinweis}
                    onChange={(e) => patch({ budgetHinweis: e.target.value })}
                    placeholder="z.B. ca. 15.000 €"
                  />
                </MockField>
                <MockField label="Zeitraum" full>
                  <StaffChoiceGrid
                    columns={2}
                    options={ZEITRAUM_ERNEUERN_OPTIONS}
                    value={state.zeitraum}
                    onChange={(v) => patch({ zeitraum: v })}
                  />
                </MockField>
              </MockFormSection>
            </div>
          ) : null}
        </section>

        <section className="sf-sec">
          <h3 className="sf-sec-l">Anfragedaten</h3>
          <div className="sf-meta">
            <button
              type="button"
              className="sf-meta-row"
              onClick={() => setKundeOpen((o) => !o)}
            >
              <MockIcon ctx="default" n="user" size={16} />
              <span className="sf-meta-k">Kunde</span>
              <span className="sf-meta-v">{kundeLabel}</span>
              <Pencil className="h-3.5 w-3.5 sf-meta-edit" aria-hidden />
            </button>
            {kundeOpen ? (
              <div className="sf-meta-expand">
                <MockFormSection>
                  <MockField label="Bestehenden Kunden suchen" full hint="übernimmt die Kontaktdaten">
                    <KundeAuswahlFeld
                      kundeId={state.kundeId}
                      bekannterKunde={bekannterKunde}
                      onKundeIdChange={(id) => patch({ kundeId: id })}
                      onKundeGewaehlt={applyKunde}
                    />
                  </MockField>
                  {state.anliegen === 'hausverwaltung' || state.kundentyp === 'verwaltung' ? (
                    <MockField label="Firma" full>
                      <input
                        className="input"
                        value={state.firmaName}
                        onChange={(e) => patch({ firmaName: e.target.value })}
                      />
                    </MockField>
                  ) : null}
                  <MockField label="Name" required full>
                    <input
                      className="input"
                      value={
                        state.firmaName.trim()
                          ? state.firmaName
                          : [state.vorname, state.nachname].filter(Boolean).join(' ')
                      }
                      onChange={(e) => {
                        const v = e.target.value
                        if (state.firmaName.trim() || state.kundentyp === 'verwaltung' || state.kundentyp === 'gewerbe') {
                          patch({ firmaName: v })
                          return
                        }
                        const parts = v.trim().split(/\s+/)
                        if (parts.length <= 1) {
                          patch({ vorname: '', nachname: v })
                        } else {
                          patch({
                            vorname: parts[0] ?? '',
                            nachname: parts.slice(1).join(' '),
                          })
                        }
                      }}
                      placeholder="Maria Koch"
                    />
                  </MockField>
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
                </MockFormSection>
              </div>
            ) : null}

            <button
              type="button"
              className="sf-meta-row"
              onClick={() => setKundentypOpen((o) => !o)}
            >
              <MockIcon ctx="default" n="users" size={16} />
              <span className="sf-meta-k">Kundentyp</span>
              <span className="sf-meta-v">{kundentypLabel}</span>
              <Pencil className="h-3.5 w-3.5 sf-meta-edit" aria-hidden />
            </button>
            {kundentypOpen ? (
              <div className="sf-meta-expand">
                <StaffChoiceGrid
                  columns={2}
                  options={KUNDENTYP_OPTIONS}
                  value={state.kundentyp}
                  onChange={(v) => {
                    patch({ kundentyp: v })
                    setKundentypOpen(false)
                  }}
                />
              </div>
            ) : null}

            <button
              type="button"
              className="sf-meta-row"
              onClick={() => setKanalOpen((o) => !o)}
            >
              <MockIcon ctx="default" n="phone" size={16} />
              <span className="sf-meta-k">Herkunft</span>
              <span className="sf-meta-v">{kanalLabel}</span>
              <Pencil className="h-3.5 w-3.5 sf-meta-edit" aria-hidden />
            </button>
            {kanalOpen ? (
              <div className="sf-meta-expand">
                <StaffChoiceGrid
                  columns={2}
                  options={STAFF_KANAL.map((k) => ({
                    value: k,
                    label: KANAL_LABELS[k] ?? k,
                  }))}
                  value={state.kanal}
                  onChange={(v) => {
                    patch({ kanal: v as LeadKanal })
                    setKanalOpen(false)
                  }}
                />
              </div>
            ) : null}
          </div>
        </section>

        {showPreis ? (
          <section className="sf-sec">
            <StaffPreisIndikation
              min={state.preisMin}
              max={state.preisMax}
              komplex={state.preisModus === 'komplex' || state.anliegen === 'termin'}
              hinweis={
                state.preisHinweis ||
                (state.anliegen === 'termin'
                  ? 'Termin / Beratung — Preis entsteht im Gespräch.'
                  : 'Orientierung wie auf der Website')
              }
            />
          </section>
        ) : null}
      </div>
    </DocumentCanvas>
  )
}
