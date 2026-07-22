'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { WizardShell } from '@/components/layout/WizardShell'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { toast } from '@/components/ui/app-toast'
import {
  FACHDETAILS_CONFIG,
  GROESSEN_CONFIG,
  KUNDENTYP_OPTIONS,
  fachdetailKeysForBereich,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import { defaultGroesseEinheit } from '@/lib/dokument-einheiten'
import { KANAL_LABELS, cn } from '@/lib/utils'
import type { Kunde, LeadKanal } from '@/lib/types'
import { istKundeGewerbeTyp, istKundeHausverwaltungTyp } from '@/lib/kunde-stammdaten'
import {
  DRINGLICHKEIT_OPTIONS,
  STAFF_SITUATIONEN,
  UMFANG_OPTIONS,
  ZEITRAUM_ERNEUERN_OPTIONS,
  ZUGAENGLICHKEIT_OPTIONS,
  ZUSTAND_OPTIONS,
  createInitialStaffFunnelState,
  type StaffFunnelState,
  type StaffFunnelStepId,
} from '@/lib/anfragen/staff-funnel-types'
import {
  bereicheForStaffSituation,
  resolveStaffFunnelSteps,
  staffFunnelStepsForShell,
} from '@/lib/anfragen/staff-funnel-steps'
import { estimateStaffFunnelPrice } from '@/lib/anfragen/staff-funnel-price'
import { staffFunnelToPayload } from '@/lib/anfragen/staff-funnel-payload'
import {
  StaffChoiceGrid,
  StaffSkipHint,
  StaffStepTitle,
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
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bekannterKunde, setBekannterKunde] = useState<Kunde | null>(null)

  const steps = useMemo(() => resolveStaffFunnelSteps(state), [state])
  const shellSteps = useMemo(() => staffFunnelStepsForShell(state), [state])
  const currentId: StaffFunnelStepId = steps[Math.min(stepIndex, steps.length - 1)] ?? 'crm_kontext'

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setState(createInitialStaffFunnelState({ kundeId: defaultKundeId ?? null }))
    setBekannterKunde(null)
    setStepIndex(0)
    setError(null)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, defaultKundeId])

  // Step-Index anpassen wenn Sequenz kürzer wird
  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(Math.max(0, steps.length - 1))
  }, [steps.length, stepIndex])

  const patch = useCallback((p: Partial<StaffFunnelState>) => {
    setState((s) => ({ ...s, ...p }))
  }, [])

  function applyKunde(k: Kunde) {
    setBekannterKunde(k)
    const gewerbe = istKundeGewerbeTyp(k.typ) || istKundeHausverwaltungTyp(k.typ)
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
      kundentyp: istKundeHausverwaltungTyp(k.typ)
        ? 'verwaltung'
        : k.typ === 'gewerbe'
          ? 'gewerbe'
          : '',
    })
  }

  function goNext() {
    setError(null)
    if (currentId === 'crm_kontext') {
      const name = [state.firmaName, state.vorname, state.nachname].some((x) => x.trim())
      if (!name) {
        setError('Bitte Kunde wählen oder Name/Firma eintragen.')
        return
      }
      if (!state.email.trim() && !state.telefon.trim()) {
        setError('Bitte E-Mail oder Telefon angeben.')
        return
      }
    }
    if (currentId === 'situation' && !state.situation) {
      setError('Bitte Situation wählen.')
      return
    }
    if (currentId === 'bereiche' && state.situation !== 'gewerbe' && !state.bereiche.length) {
      setError('Bitte mindestens einen Bereich wählen.')
      return
    }
    if (currentId === 'preis' || currentId === 'beratung') {
      // auto-estimate when entering prüfen
    }
    // Beim Betreten von preis: Schätzung setzen wenn leer
    const nextIdx = Math.min(stepIndex + 1, steps.length - 1)
    const nextId = steps[nextIdx]
    if (nextId === 'preis') {
      const est = estimateStaffFunnelPrice(state)
      patch({
        preisModus: est.modus === 'komplex' ? 'komplex' : state.preisMin != null ? 'manual' : 'rahmen',
        preisMin: state.preisMin ?? est.min,
        preisMax: state.preisMax ?? est.max,
        preisHinweis: est.hinweis,
      })
    }
    setStepIndex(nextIdx)
  }

  function goBack() {
    setError(null)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function skip() {
    setError(null)
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  async function submit() {
    setError(null)
    // Preis frisch schätzen falls noch leer
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

  function toggleBereich(v: string) {
    setState((s) => {
      const has = s.bereiche.includes(v)
      const bereiche = has ? s.bereiche.filter((x) => x !== v) : [...s.bereiche, v]
      return { ...s, bereiche }
    })
  }

  const bereichOptions = bereicheForStaffSituation(state.situation).map((b) => ({
    value: b.value,
    label: b.label,
  }))

  const fachKeys = useMemo(() => {
    if (!state.situation) return [] as string[]
    const keys = new Set<string>()
    for (const b of state.bereiche) {
      for (const k of fachdetailKeysForBereich(b, state.situation as SituationValue)) {
        // Bei erneuern+bad gibt es einen eigenen Step `bad_ausstattung`
        if (state.situation === 'erneuern' && k === 'bad_ausstattung') continue
        keys.add(k)
      }
    }
    return Array.from(keys)
  }, [state.bereiche, state.situation])

  const canContinue = useMemo(() => {
    if (currentId === 'situation') return Boolean(state.situation)
    if (currentId === 'bereiche') return state.bereiche.length > 0
    return true
  }, [currentId, state.situation, state.bereiche.length])

  if (!open || !mounted) return null

  const content = (() => {
    switch (currentId) {
      case 'crm_kontext':
        return (
          <>
            <StaffStepTitle
              title="Kontext"
              sub="Kunde, Kanal und interne Notiz — vor dem Funnel."
            />
            <MockFormSection>
              <MockField label="Bestehender Kunde" full>
                <KundeAuswahlFeld
                  kundeId={state.kundeId}
                  bekannterKunde={bekannterKunde}
                  onKundeIdChange={(id) => patch({ kundeId: id })}
                  onKundeGewaehlt={applyKunde}
                />
              </MockField>
              <MockField label="Kanal" required>
                <select
                  className="input"
                  value={state.kanal}
                  onChange={(e) => patch({ kanal: e.target.value as LeadKanal })}
                >
                  {STAFF_KANAL.map((k) => (
                    <option key={k} value={k}>
                      {KANAL_LABELS[k] ?? k}
                    </option>
                  ))}
                </select>
              </MockField>
              <MockField label="Firma" hint="Bei HV / Gewerbe">
                <input
                  className="input"
                  value={state.firmaName}
                  onChange={(e) => patch({ firmaName: e.target.value })}
                />
              </MockField>
              <MockField label="Vorname">
                <input
                  className="input"
                  value={state.vorname}
                  onChange={(e) => patch({ vorname: e.target.value })}
                />
              </MockField>
              <MockField label="Nachname">
                <input
                  className="input"
                  value={state.nachname}
                  onChange={(e) => patch({ nachname: e.target.value })}
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
              <MockField label="Telefon">
                <input
                  className="input"
                  type="tel"
                  value={state.telefon}
                  onChange={(e) => patch({ telefon: e.target.value })}
                />
              </MockField>
              <MockField label="Interne Notiz" full>
                <textarea
                  className="input ta"
                  rows={3}
                  value={state.interneNotiz}
                  onChange={(e) => patch({ interneNotiz: e.target.value })}
                  placeholder="Was am Telefon gesagt wurde…"
                />
              </MockField>
            </MockFormSection>
          </>
        )

      case 'situation':
        return (
          <>
            <StaffStepTitle title="Situation" sub="Was ist der Anlass der Anfrage?" />
            <StaffChoiceGrid
              columns={2}
              options={STAFF_SITUATIONEN.map((s) => ({
                value: s.value,
                label: s.label,
                hint: s.hint,
              }))}
              value={state.situation}
              onChange={(v) =>
                patch({
                  situation: v as SituationValue,
                  bereiche: [],
                  fachdetails: {},
                  groessen: {},
                })
              }
            />
          </>
        )

      case 'bereiche':
        return (
          <>
            <StaffStepTitle title="Bereiche" sub="Mehrfachauswahl möglich." />
            <StaffChoiceGrid
              multi
              columns={2}
              options={bereichOptions}
              values={state.bereiche}
              onToggle={toggleBereich}
            />
          </>
        )

      case 'umfang':
        return (
          <>
            <StaffStepTitle title="Umfang / Rhythmus" sub="Wie oft soll betreut werden?" />
            <StaffChoiceGrid
              options={UMFANG_OPTIONS}
              value={state.umfang}
              onChange={(v) => patch({ umfang: v })}
            />
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'zugaenglichkeit':
        return (
          <>
            <StaffStepTitle title="Zugänglichkeit" />
            <StaffChoiceGrid
              options={ZUGAENGLICHKEIT_OPTIONS}
              value={state.zugaenglichkeit}
              onChange={(v) => patch({ zugaenglichkeit: v })}
            />
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'zustand':
        return (
          <>
            <StaffStepTitle title="Zustand" />
            <StaffChoiceGrid
              options={ZUSTAND_OPTIONS}
              value={state.zustand}
              onChange={(v) => patch({ zustand: v })}
            />
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'bad_ausstattung':
        return (
          <>
            <StaffStepTitle title="Bad-Ausstattung" sub="Standard der Ausführung" />
            <StaffChoiceGrid
              options={
                FACHDETAILS_CONFIG.bad_ausstattung?.optionen.map((o) => ({
                  value: o.value,
                  label: o.label,
                })) ?? []
              }
              value={state.badAusstattung}
              onChange={(v) => patch({ badAusstattung: v })}
            />
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'groesse':
        return (
          <>
            <StaffStepTitle title="Größe" sub="Soweit am Telefon bekannt." />
            <MockFormSection>
              {state.bereiche
                .filter((b) => GROESSEN_CONFIG[b])
                .map((b) => {
                  const cfg = GROESSEN_CONFIG[b]
                  return (
                    <MockField key={b} label={`${cfg.label} (${cfg.einheit})`}>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step={1}
                        value={state.groessen[b] ?? ''}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          patch({
                            groessen: {
                              ...state.groessen,
                              [b]: Number.isFinite(n) ? n : 0,
                            },
                            groessenEinheiten: {
                              ...state.groessenEinheiten,
                              [b]: state.groessenEinheiten[b] || defaultGroesseEinheit(b),
                            },
                          })
                        }}
                      />
                    </MockField>
                  )
                })}
            </MockFormSection>
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'fachdetails':
        return (
          <>
            <StaffStepTitle
              title="Fachdetails"
              sub="Kompakt — einzelne Fragen können offen bleiben."
            />
            {fachKeys.length === 0 ? (
              <p className="text-[13px] text-[var(--text-3)]">
                Keine Fachfragen für diese Auswahl — weiter oder überspringen.
              </p>
            ) : (
              <div className="space-y-5">
                {fachKeys.map((key) => {
                  const cfg = FACHDETAILS_CONFIG[key]
                  if (!cfg) return null
                  return (
                    <div key={key}>
                      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                        {cfg.frage}
                      </div>
                      <StaffChoiceGrid
                        columns={2}
                        options={cfg.optionen.map((o) => ({ value: o.value, label: o.label }))}
                        value={state.fachdetails[key] ?? ''}
                        onChange={(v) =>
                          patch({ fachdetails: { ...state.fachdetails, [key]: v } })
                        }
                      />
                    </div>
                  )
                })}
              </div>
            )}
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'dringlichkeit':
        return (
          <>
            <StaffStepTitle title="Dringlichkeit" sub="Wann soll es losgehen?" />
            <StaffChoiceGrid
              options={DRINGLICHKEIT_OPTIONS}
              value={state.dringlichkeit}
              onChange={(v) => patch({ dringlichkeit: v })}
            />
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'kundentyp':
        return (
          <>
            <StaffStepTitle title="Kundentyp" />
            <StaffChoiceGrid
              options={KUNDENTYP_OPTIONS}
              value={state.kundentyp}
              onChange={(v) => patch({ kundentyp: v })}
            />
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'ort_zeitraum':
        return (
          <>
            <StaffStepTitle title="Ort & Zeitraum" />
            <MockFormSection>
              <MockField label="PLZ">
                <input
                  className="input"
                  value={state.plz}
                  onChange={(e) => patch({ plz: e.target.value })}
                />
              </MockField>
              <MockField label="Ort">
                <input
                  className="input"
                  value={state.ort}
                  onChange={(e) => patch({ ort: e.target.value })}
                />
              </MockField>
              <MockField label="Straße">
                <input
                  className="input"
                  value={state.strasse}
                  onChange={(e) => patch({ strasse: e.target.value })}
                />
              </MockField>
              <MockField label="Nr.">
                <input
                  className="input"
                  value={state.hausnummer}
                  onChange={(e) => patch({ hausnummer: e.target.value })}
                />
              </MockField>
            </MockFormSection>
            <div className="mt-5">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Geplanter Start
              </div>
              <StaffChoiceGrid
                options={ZEITRAUM_ERNEUERN_OPTIONS}
                value={state.zeitraum}
                onChange={(v) => patch({ zeitraum: v })}
              />
            </div>
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'ort':
        return (
          <>
            <StaffStepTitle title="Ort" sub="Projektadresse soweit bekannt." />
            <MockFormSection>
              <MockField label="PLZ">
                <input
                  className="input"
                  value={state.plz}
                  onChange={(e) => patch({ plz: e.target.value })}
                />
              </MockField>
              <MockField label="Ort">
                <input
                  className="input"
                  value={state.ort}
                  onChange={(e) => patch({ ort: e.target.value })}
                />
              </MockField>
              <MockField label="Straße" full>
                <input
                  className="input"
                  value={state.strasse}
                  onChange={(e) => patch({ strasse: e.target.value })}
                />
              </MockField>
            </MockFormSection>
            <StaffSkipHint onSkip={skip} />
          </>
        )

      case 'preis': {
        const est = estimateStaffFunnelPrice(state)
        return (
          <>
            <StaffStepTitle
              title="Preisrahmen"
              sub={state.preisHinweis || est.hinweis}
            />
            <div className="mb-4 flex flex-wrap gap-2">
              <MockBtn
                sm
                kind={state.preisModus !== 'komplex' ? 'primary' : 'ghost'}
                onClick={() => {
                  const e = estimateStaffFunnelPrice(state)
                  patch({
                    preisModus: 'rahmen',
                    preisMin: e.min,
                    preisMax: e.max,
                    preisHinweis: e.hinweis,
                  })
                }}
              >
                Schätzung übernehmen
              </MockBtn>
              <MockBtn
                sm
                kind={state.preisModus === 'komplex' ? 'primary' : 'ghost'}
                onClick={() =>
                  patch({
                    preisModus: 'komplex',
                    preisMin: null,
                    preisMax: null,
                    preisHinweis: 'Beratung / komplex — kein Sofortpreis.',
                  })
                }
              >
                Zu komplex / Beratung
              </MockBtn>
            </div>
            {state.preisModus !== 'komplex' ? (
              <MockFormSection>
                <MockField label="Von (€)">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={state.preisMin ?? ''}
                    onChange={(e) =>
                      patch({
                        preisModus: 'manual',
                        preisMin: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </MockField>
                <MockField label="Bis (€)">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={state.preisMax ?? ''}
                    onChange={(e) =>
                      patch({
                        preisModus: 'manual',
                        preisMax: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </MockField>
              </MockFormSection>
            ) : (
              <p className="text-[13px] text-[var(--text-3)]">
                Kein Preisrahmen — Anfrage wird als Beratung erfasst.
              </p>
            )}
            <StaffSkipHint onSkip={skip} />
          </>
        )
      }

      case 'beratung':
        return (
          <>
            <StaffStepTitle
              title="Beratung"
              sub="Kurzbeschreibung fürs Team — kein Sofortpreis."
            />
            <MockFormSection>
              <MockField label="Bedarf / Gesprächsnotiz" full>
                <textarea
                  className="input ta"
                  rows={5}
                  value={state.beratungText}
                  onChange={(e) => patch({ beratungText: e.target.value })}
                  placeholder="Was braucht der Kunde?"
                />
              </MockField>
            </MockFormSection>
          </>
        )

      case 'crm_pruefen': {
        const sit = STAFF_SITUATIONEN.find((s) => s.value === state.situation)
        return (
          <>
            <StaffStepTitle title="Prüfen & anlegen" sub="Kurzcheck vor dem Speichern." />
            <div className="card">
              <div className="card-b space-y-2 text-[13px]">
                <Row k="Kunde" v={staffFunnelKontaktName(state) || '—'} />
                <Row k="Kanal" v={KANAL_LABELS[state.kanal] ?? state.kanal} />
                <Row k="Situation" v={sit?.label ?? '—'} />
                <Row
                  k="Bereiche"
                  v={
                    state.bereiche.length
                      ? state.bereiche.join(', ')
                      : state.situation === 'gewerbe'
                        ? 'Gewerbe'
                        : '—'
                  }
                />
                <Row
                  k="Preis"
                  v={
                    state.preisModus === 'komplex'
                      ? 'Beratung / komplex'
                      : state.preisMin != null || state.preisMax != null
                        ? `${state.preisMin ?? '—'} – ${state.preisMax ?? '—'} €`
                        : '—'
                  }
                />
                {state.plz || state.ort ? (
                  <Row k="Ort" v={[state.plz, state.ort].filter(Boolean).join(' ')} />
                ) : null}
              </div>
            </div>
            <MockFormSection className="mt-4">
              <MockField label="Freitext an Kundenakte" full>
                <textarea
                  className="input ta"
                  rows={3}
                  value={state.freitext}
                  onChange={(e) => patch({ freitext: e.target.value })}
                />
              </MockField>
              <label className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                <input
                  type="checkbox"
                  checked={state.istBauprojekt}
                  onChange={(e) => patch({ istBauprojekt: e.target.checked })}
                />
                Bauprojekt (Bautagebuch / Compliance)
              </label>
            </MockFormSection>
          </>
        )
      }

      default:
        return null
    }
  })()

  const isLast = currentId === 'crm_pruefen'
  const desktopActions = (
    <div className="wizard-nav-actions">
      {stepIndex > 0 ? (
        <MockBtn kind="ghost" icon="chevron-left" onClick={goBack}>
          Zurück
        </MockBtn>
      ) : null}
      {!isLast ? (
        <MockBtn kind="primary" icon="chevron-right" disabled={!canContinue} onClick={goNext}>
          Weiter
        </MockBtn>
      ) : (
        <MockBtn kind="primary" disabled={loading} onClick={() => void submit()}>
          <Save className="mr-1.5 h-4 w-4" aria-hidden />
          {loading ? 'Speichern…' : 'Anfrage anlegen'}
        </MockBtn>
      )}
    </div>
  )

  const mobileActions = !isLast ? (
    <MockBtn sm kind="primary" disabled={!canContinue} onClick={goNext}>
      Weiter
    </MockBtn>
  ) : (
    <>
      <MockBtn sm kind="ghost" icon="chevron-left" onClick={goBack} title="Zurück" />
      <MockBtn sm kind="primary" disabled={loading} onClick={() => void submit()}>
        Anlegen
      </MockBtn>
    </>
  )

  const wizard = (
    <WizardShell
      title="Anfrage erstellen"
      subtitle="Staff-Funnel · wie Website-Rechner, fürs CRM"
      steps={shellSteps}
      currentStep={stepIndex + 1}
      onClose={onClose}
      desktopActions={desktopActions}
      mobileActions={mobileActions}
    >
      <div className={cn('mx-auto w-full max-w-2xl px-1 py-2')}>
        {error ? (
          <p className="mb-3 rounded-lg bg-[var(--red-bg)] px-3 py-2 text-[13px] text-[var(--red-tx)]">
            {error}
          </p>
        ) : null}
        {content}
      </div>
    </WizardShell>
  )

  return createPortal(wizard, document.body)
}

function staffFunnelKontaktName(state: StaffFunnelState): string {
  const firma = state.firmaName.trim()
  if (firma) return firma
  return [state.vorname.trim(), state.nachname.trim()].filter(Boolean).join(' ')
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 border-b border-[var(--border)] py-2 last:border-0">
      <span className="w-28 shrink-0 text-[var(--text-3)]">{k}</span>
      <span className="min-w-0 font-medium text-[var(--text)]">{v}</span>
    </div>
  )
}
