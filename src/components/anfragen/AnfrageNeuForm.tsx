'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { createAnfrage, updateAnfrageAusNeuForm } from '@/app/(dashboard)/anfragen/actions'
import type { LeadDetail, LeadKanal } from '@/lib/types'
import {
  SITUATIONEN,
  FACHDETAILS_CONFIG,
  GROESSEN_CONFIG,
  KUNDENTYP_OPTIONS,
  bereicheFuerSituation,
  fachdetailKeysForBereich,
  groessePropLabel,
  hatGroesseFeld,
  normalizeSituation,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import { BEREICH_LABELS, KANAL_LABELS, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { parseLeadFunnelDaten } from '@/lib/lead-funnel-daten'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import type { Kunde } from '@/lib/types'
import {
  GROESSEN_EINHEITEN,
  defaultGroesseEinheit,
  groesseEinheitLabel,
} from '@/lib/dokument-einheiten'
import { coerceBereicheArray } from '@/lib/lead-gewerbe-storage'
import { bereicheSuggerierenBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import { namenAusFunnelDaten, splitDeutscherVollname } from '@/lib/kunde-namen'
import { istKundeHausverwaltungTyp } from '@/lib/kunde-stammdaten'

const KANAL_VALUES = Object.keys(KANAL_LABELS) as LeadKanal[]

export const ANFRAGE_NEU_FORM_ID = 'anfrage-neu-form'
export const ANFRAGE_BEARBEITEN_FORM_ID = 'anfrage-bearbeiten-form'

const SITUATION_LABELS: Record<SituationValue, string> = {
  erneuern: 'Umbau & Modernisierung',
  kaputt: 'Reparatur & Notfall',
  notfall: 'Notfall',
  neubauen: 'Neu bauen / Ausbau',
  betreuung: 'Betreuung',
  gewerbe: 'Gewerbe / Gastro',
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="form-field">
      <label className="form-field-label">{label}</label>
      {children}
      {hint ? <p className="form-field-hint">{hint}</p> : null}
    </div>
  )
}

function ersteFachdetailZeile(v: unknown): string {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim()
  return ''
}

function applyKundeStammToForm(
  data: Pick<
    Kunde,
    'name' | 'vorname' | 'nachname' | 'email' | 'telefon' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'adresse' | 'typ'
  >,
  setters: {
    setFirmaName: (v: string) => void
    setVorname: (v: string) => void
    setNachname: (v: string) => void
    setEmail: (v: string) => void
    setTelefon: (v: string) => void
    setStrasse: (v: string) => void
    setHausnummer: (v: string) => void
    setPlz: (v: string) => void
    setOrt: (v: string) => void
    setSituation: (v: SituationValue | '') => void
    setBereiche: (v: string[]) => void
    setKundentyp: (v: string) => void
  }
) {
  if (data.typ === 'gewerbe') {
    setters.setFirmaName(String(data.name ?? ''))
    setters.setVorname('')
    setters.setNachname('')
  } else if (data.typ === 'hausverwaltung') {
    setters.setFirmaName(String(data.name ?? ''))
    setters.setVorname(String(data.vorname ?? ''))
    setters.setNachname(String(data.nachname ?? ''))
  } else {
    setters.setFirmaName('')
    setters.setVorname(String(data.vorname ?? ''))
    setters.setNachname(String(data.nachname ?? ''))
    if (!data.vorname && !data.nachname && data.name) {
      const split = splitDeutscherVollname(String(data.name))
      setters.setVorname(split.vorname ?? '')
      setters.setNachname(split.nachname ?? '')
    }
  }
  if (data.email) setters.setEmail(String(data.email))
  if (data.telefon) setters.setTelefon(String(data.telefon))
  if (data.strasse) setters.setStrasse(String(data.strasse))
  else if (data.adresse) setters.setStrasse(String(data.adresse))
  if (data.hausnummer) setters.setHausnummer(String(data.hausnummer))
  if (data.plz) setters.setPlz(String(data.plz))
  if (data.ort) setters.setOrt(String(data.ort))
  if (data.typ === 'gewerbe') {
    setters.setSituation('gewerbe')
    setters.setBereiche(['gewerbe'])
    setters.setKundentyp('gewerbe')
  } else if (data.typ === 'hausverwaltung') {
    setters.setKundentyp('hausverwaltung')
  }
}

export function AnfrageNeuForm({
  defaultKundeId,
  bearbeitenLead,
  formId,
  onSuccess,
  onCancel,
  onMetaChange,
  variant = 'modal',
}: {
  defaultKundeId?: string | null
  /** Wenn gesetzt: Bearbeiten-Modus (gleicher Screen wie neue Anfrage), Vorbefüllung aus diesem Lead */
  bearbeitenLead?: LeadDetail | null
  formId?: string
  onSuccess?: (id: string) => void
  onCancel?: () => void
  onMetaChange?: (meta: { loading: boolean; isValid: boolean }) => void
  variant?: 'modal' | 'page' | 'sheet'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verknuepfterKundeId, setVerknuepfterKundeId] = useState<string | null>(
    defaultKundeId?.trim() || null
  )
  const [verknuepfterKunde, setVerknuepfterKunde] = useState<Kunde | null>(null)

  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [firmaName, setFirmaName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')

  const [situation, setSituation] = useState<SituationValue | ''>('')
  const [bereiche, setBereiche] = useState<string[]>([])
  const [fachdetails, setFachdetails] = useState<Record<string, string>>({})
  const [groessen, setGroessen] = useState<Record<string, number>>({})
  const [groessenEinheiten, setGroessenEinheiten] = useState<Record<string, string>>({})
  const [kundentyp, setKundentyp] = useState('')
  const [zeitraum, setZeitraum] = useState('')
  const [zustand, setZustand] = useState('')
  const [dringlichkeit, setDringlichkeit] = useState('')
  const [zugaenglichkeit, setZugaenglichkeit] = useState('')
  const [badAusstattung, setBadAusstattung] = useState('')
  const [freitext, setFreitext] = useState('')
  const [interneNotiz, setInterneNotiz] = useState('')
  const [kanal, setKanal] = useState('telefon')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [istBauprojekt, setIstBauprojekt] = useState(false)
  const [bauprojektManuell, setBauprojektManuell] = useState(false)
  const [bestaetigungsmailSenden, setBestaetigungsmailSenden] = useState(false)

  const resolvedFormId = formId ?? ANFRAGE_NEU_FORM_ID
  const isBearbeiten = Boolean(bearbeitenLead?.id)
  const istGewerbeSituation = situation === 'gewerbe'
  const istGewerbe = istGewerbeSituation || kundentyp === 'gewerbe'
  const istHausverwaltung = istKundeHausverwaltungTyp(kundentyp)
  const firmaPflicht = istGewerbe || istHausverwaltung

  function kontaktNameFuerPayload(): string {
    if (firmaPflicht) return firmaName.trim()
    return [vorname.trim(), nachname.trim()].filter(Boolean).join(' ')
  }

  function kundeFormSetters() {
    return {
      setFirmaName,
      setVorname,
      setNachname,
      setEmail,
      setTelefon,
      setStrasse,
      setHausnummer,
      setPlz,
      setOrt,
      setSituation,
      setBereiche,
      setKundentyp,
    }
  }

  useEffect(() => {
    if (bearbeitenLead?.id) return
    const kid = defaultKundeId?.trim()
    if (!kid) {
      setVerknuepfterKundeId(null)
      setVerknuepfterKunde(null)
      return
    }
    setVerknuepfterKundeId(kid)
    const supabase = createClient()
    void supabase
      .from('kunden')
      .select('id, name, vorname, nachname, email, telefon, strasse, hausnummer, plz, ort, adresse, typ')
      .eq('id', kid)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const k = data as Kunde
        setVerknuepfterKunde(k)
        applyKundeStammToForm(k, kundeFormSetters())
      })
  }, [bearbeitenLead?.id, defaultKundeId])

  useEffect(() => {
    const L = bearbeitenLead
    if (!L?.id) return
    const fd = parseLeadFunnelDaten(L.funnel_daten) as Record<string, unknown>

    setError(null)
    setVerknuepfterKundeId(L.kunde_id ?? null)
    const fdNamen = namenAusFunnelDaten(fd)
    const k = L.kunden
    const sitEarly =
      typeof fd.situation === 'string' ? normalizeSituation(fd.situation) : ''
    const istGew =
      sitEarly === 'gewerbe' ||
      coerceBereicheArray(fd.bereiche).includes('gewerbe') ||
      coerceBereicheArray(L.bereiche).includes('gewerbe')
    const ktLead = (typeof fd.kundentyp === 'string' && fd.kundentyp ? fd.kundentyp : L.kundentyp ?? '').trim()
    const istHvLead = istKundeHausverwaltungTyp(ktLead)

    if (istGew) {
      setFirmaName((L.kontakt_name ?? k?.name ?? '').trim())
      setVorname('')
      setNachname('')
    } else if (istHvLead || k?.typ === 'hausverwaltung') {
      setFirmaName((k?.name ?? L.kontakt_name ?? '').trim())
      setVorname(fdNamen.vorname ?? k?.vorname ?? '')
      setNachname(fdNamen.nachname ?? k?.nachname ?? '')
    } else {
      setFirmaName('')
      const split = splitDeutscherVollname((L.kontakt_name ?? '').trim())
      setVorname(fdNamen.vorname ?? k?.vorname ?? split.vorname ?? '')
      setNachname(fdNamen.nachname ?? k?.nachname ?? split.nachname ?? '')
    }
    setEmail((L.kontakt_email ?? L.kunden?.email ?? '').trim())
    setTelefon((L.kontakt_telefon ?? L.kunden?.telefon ?? '').trim())
    setStrasse((k?.strasse?.trim() || k?.adresse?.trim() || '').trim())
    setHausnummer((k?.hausnummer ?? '').trim())
    setPlz((L.plz ?? k?.plz ?? '').trim())
    setOrt((k?.ort ?? '').trim())
    if (!k?.strasse && !k?.adresse) {
      const fdStr = typeof fd.strasse === 'string' ? fd.strasse.trim() : ''
      if (fdStr) setStrasse(fdStr)
      const fdNr = typeof fd.hausnummer === 'string' ? fd.hausnummer.trim() : ''
      if (fdNr) setHausnummer(fdNr)
      const fdOrt = typeof fd.ort === 'string' ? fd.ort.trim() : ''
      if (fdOrt) setOrt(fdOrt)
    }

    const sitFromFunnel = typeof fd.situation === 'string' ? fd.situation : ''
    let sitNorm = normalizeSituation(sitFromFunnel || L.situation || '') as SituationValue | ''
    let bereicheArr = coerceBereicheArray(fd.bereiche)
    if (bereicheArr.length === 0) bereicheArr = coerceBereicheArray(L.bereiche)
    if (!sitNorm && bereicheArr.includes('gewerbe')) sitNorm = 'gewerbe'

    setSituation(sitNorm === '' ? '' : sitNorm)

    if (sitNorm === 'gewerbe') {
      setBereiche(['gewerbe'])
    } else {
      setBereiche(bereicheArr.filter((b) => b !== 'gewerbe'))
    }

    const rawDetails =
      fd.fachdetails && typeof fd.fachdetails === 'object' && fd.fachdetails !== null && !Array.isArray(fd.fachdetails)
        ? (fd.fachdetails as Record<string, unknown>)
        : {}

    const fachMap: Record<string, string> = {}
    for (const [k, v] of Object.entries(rawDetails)) {
      const s = ersteFachdetailZeile(v)
      if (s) fachMap[k] = s
    }

    let badAus = ''
    if (typeof fd.badAusstattung === 'string' && fd.badAusstattung.trim()) badAus = fd.badAusstattung.trim()
    else if (fachMap.bad_ausstattung) {
      badAus = fachMap.bad_ausstattung
      delete fachMap.bad_ausstattung
    }
    setBadAusstattung(badAus)
    setFachdetails(fachMap)

    const gRaw =
      fd.groessen && typeof fd.groessen === 'object' && fd.groessen !== null && !Array.isArray(fd.groessen)
        ? (fd.groessen as Record<string, unknown>)
        : {}
    const gro: Record<string, number> = {}
    for (const [k, v] of Object.entries(gRaw)) {
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n) && n >= 0) gro[k] = n
    }
    setGroessen(gro)

    const eRaw =
      fd.groessen_einheiten &&
      typeof fd.groessen_einheiten === 'object' &&
      fd.groessen_einheiten !== null &&
      !Array.isArray(fd.groessen_einheiten)
        ? (fd.groessen_einheiten as Record<string, unknown>)
        : {}
    const einheiten: Record<string, string> = {}
    for (const [k, v] of Object.entries(eRaw)) {
      if (typeof v === 'string' && v.trim()) einheiten[k] = v.trim()
    }
    setGroessenEinheiten(einheiten)

    const kt = typeof fd.kundentyp === 'string' && fd.kundentyp ? fd.kundentyp : (L.kundentyp ?? '').trim()
    setKundentyp(kt)

    const zeit =
      typeof fd.zeitraum === 'string' && fd.zeitraum.trim() ? fd.zeitraum : (L.zeitraum ?? '').trim()
    setZeitraum(zeit)
    setZustand(typeof fd.zustand === 'string' ? fd.zustand : '')
    setDringlichkeit(typeof fd.dringlichkeit === 'string' ? fd.dringlichkeit : '')
    setZugaenglichkeit(typeof fd.zugaenglichkeit === 'string' ? fd.zugaenglichkeit : '')

    setFreitext(L.kontakt_nachricht ?? '')
    setInterneNotiz(L.notizen ?? '')
    setKanal(L.kanal ?? 'telefon')

    if (L.preis_min != null && Number.isFinite(Number(L.preis_min))) setBudgetMin(String(L.preis_min))
    else if (L.budget_ca != null && Number.isFinite(Number(L.budget_ca))) setBudgetMin(String(L.budget_ca))
    else setBudgetMin('')

    if (L.preis_max != null && Number.isFinite(Number(L.preis_max))) setBudgetMax(String(L.preis_max))
    else if (
      L.preis_min == null &&
      L.budget_ca != null &&
      Number.isFinite(Number(L.budget_ca))
    ) {
      setBudgetMax(String(L.budget_ca))
    } else setBudgetMax('')
    setIstBauprojekt(L.ist_bauprojekt === true)
    setBauprojektManuell(L.ist_bauprojekt === true)
    // Absichtlich nicht `bearbeitenLead` gesamt: vermeidet Zurücksetzen bei jedem Parent-Render bei offenem Sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Nur bei anderer Lead-Revision neu aufbauen
  }, [bearbeitenLead?.id, bearbeitenLead?.updated_at])

  const isValid = useMemo(() => {
    const kontaktOk = firmaPflicht ? firmaName.trim() : vorname.trim() || nachname.trim()
    if (!kontaktOk) return false
    if (!email.trim() && !telefon.trim()) return false
    if (!situation) return false
    return true
  }, [firmaPflicht, firmaName, vorname, nachname, email, telefon, situation])

  useEffect(() => {
    onMetaChange?.({ loading, isValid })
  }, [loading, isValid, onMetaChange])

  useEffect(() => {
    if (bauprojektManuell) return
    if (bereicheSuggerierenBauprojekt(bereiche)) setIstBauprojekt(true)
  }, [bereiche, bauprojektManuell])

  function handleSituationChange(val: SituationValue) {
    setSituation(val)
    setBereiche(val === 'gewerbe' ? ['gewerbe'] : [])
    setFachdetails({})
    setGroessen({})
    setGroessenEinheiten({})
    setZustand('')
    setDringlichkeit('')
    setZugaenglichkeit('')
    setBadAusstattung('')
    if (val === 'gewerbe') setKundentyp('gewerbe')
  }

  function clearFachdetailsForBereich(bereich: string) {
    if (!situation) return
    setFachdetails((prev) => {
      const next = { ...prev }
      for (const key of fachdetailKeysForBereich(bereich, situation)) {
        delete next[key]
      }
      return next
    })
  }

  function toggleBereich(bValue: string, checked: boolean) {
    if (checked) {
      setBereiche((prev) => (prev.includes(bValue) ? prev : [...prev, bValue]))
      return
    }
    setBereiche((prev) => prev.filter((x) => x !== bValue))
    clearFachdetailsForBereich(bValue)
    setGroessen((prev) => {
      const next = { ...prev }
      delete next[bValue]
      return next
    })
    if (bValue === 'bad') setBadAusstattung('')
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else router.back()
  }

  async function handleSave() {
    setError(null)
    const kontaktName = kontaktNameFuerPayload()
    if (!kontaktName) {
      setError(
        firmaPflicht
          ? istHausverwaltung
            ? 'Firma ist ein Pflichtfeld.'
            : 'Firma / Name ist ein Pflichtfeld.'
          : 'Bitte Vorname oder Nachname angeben.'
      )
      return
    }
    if (!email.trim() && !telefon.trim()) {
      setError('Bitte mindestens E-Mail oder Telefon angeben.')
      return
    }
    if (!situation) {
      setError('Bitte eine Situation wählen.')
      return
    }

    const preisMin = budgetMin.trim() ? Number(budgetMin) : null
    const preisMax = budgetMax.trim() ? Number(budgetMax) : null
    if (preisMin != null && (!Number.isFinite(preisMin) || preisMin < 0)) {
      setError('„Von“ muss eine gültige Zahl sein.')
      return
    }
    if (preisMax != null && (!Number.isFinite(preisMax) || preisMax < 0)) {
      setError('„Bis“ muss eine gültige Zahl sein.')
      return
    }
    if (preisMin != null && preisMax != null && preisMax < preisMin) {
      setError('„Bis“ darf nicht kleiner als „Von“ sein.')
      return
    }

    const situationNorm = normalizeSituation(situation) || situation
    const kanalTyped = (KANAL_VALUES.includes(kanal as LeadKanal) ? kanal : 'telefon') as LeadKanal

    const funnel_daten: Record<string, unknown> = {
      situation,
      bereiche,
      kundentyp: kundentyp || null,
      vorname: vorname.trim() || null,
      nachname: nachname.trim() || null,
      strasse: strasse.trim() || null,
      hausnummer: hausnummer.trim() || null,
      plz: plz.trim() || null,
      ort: ort.trim() || null,
      zeitraum: zeitraum || null,
      zustand: zustand || null,
      dringlichkeit: dringlichkeit || null,
      zugaenglichkeit: zugaenglichkeit || null,
      badAusstattung: badAusstattung || null,
      fachdetails: Object.fromEntries(
        Object.entries(fachdetails)
          .filter(([, v]) => v)
          .map(([k, v]) => [k, [v]])
      ),
      groessen,
      groessen_einheiten: groessenEinheiten,
      quelle: 'crm_manuell',
    }

    const payloadBase = {
      kunde_id: verknuepfterKundeId,
      name: kontaktName,
      vorname: vorname.trim() || null,
      nachname: nachname.trim() || null,
      email: email.trim(),
      telefon: telefon.trim(),
      plz: plz.trim(),
      strasse: strasse.trim() || null,
      hausnummer: hausnummer.trim() || null,
      ort: ort.trim() || null,
      kanal: kanalTyped,
      situation: situationNorm,
      bereiche,
      bereiche_sonstiges: null,
      preis_min: preisMin,
      preis_max: preisMax,
      zeitraum: zeitraum || null,
      kundentyp: kundentyp || null,
      kontakt_nachricht: freitext.trim() || null,
      funnel_daten,
      notizen: interneNotiz.trim(),
      ist_bauprojekt: istBauprojekt,
    }

    setLoading(true)

    let errMsg: string | null = null
    let outId = ''
    if (isBearbeiten && bearbeitenLead) {
      const u = await updateAnfrageAusNeuForm(bearbeitenLead.id, payloadBase)
      if (!u.ok) errMsg = u.message
      else outId = bearbeitenLead.id
    } else {
      const c = await createAnfrage(payloadBase)
      if (!c.ok) errMsg = c.message
      else outId = c.id
    }
    setLoading(false)

    if (errMsg != null) {
      setError(errMsg)
      return
    }

    router.refresh()
    if (onSuccess) {
      onSuccess(outId)
      return
    }
    if (!isBearbeiten) router.push(`/anfragen/${outId}`)
  }

  const verfuegbareBereiche = situation ? bereicheFuerSituation(situation) : []
  const showDetails = bereiche.length > 0
  const isModal = variant === 'modal'
  const isSheet = variant === 'sheet'
  const showFooter = !isSheet

  function onFormSubmit(e: FormEvent) {
    e.preventDefault()
    void handleSave()
  }

  const formBody = (
    <div className="space-y-4">
      <Card title="Kunde & Kontakt">
        <div className="space-y-4">
          {!isBearbeiten ? (
            <KundeAuswahlFeld
              kundeId={verknuepfterKundeId}
              bekannterKunde={verknuepfterKunde}
              onKundeIdChange={(id) => {
                setVerknuepfterKundeId(id)
                if (!id) setVerknuepfterKunde(null)
              }}
              onKundeGewaehlt={(k) => {
                setVerknuepfterKunde(k)
                applyKundeStammToForm(k, kundeFormSetters())
              }}
            />
          ) : null}
          {firmaPflicht ? (
            <Field label={istHausverwaltung ? 'Firma *' : 'Firma / Name *'}>
              <input
                className="input"
                name="firma"
                value={firmaName}
                onChange={(e) => setFirmaName(e.target.value)}
                required
                autoComplete="organization"
              />
            </Field>
          ) : null}
          {firmaPflicht ? (
            <div className="form-grid-2 grid gap-3 md:grid-cols-2">
              <Field label="Vorname (Ansprechpartner)">
                <input
                  className="input"
                  name="vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Nachname (Ansprechpartner)">
                <input
                  className="input"
                  name="nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  autoComplete="family-name"
                />
              </Field>
            </div>
          ) : null}
          {!firmaPflicht ? (
            <div className="form-grid-2 grid gap-3 md:grid-cols-2">
              <Field label="Vorname">
                <input
                  className="input"
                  name="vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Nachname">
                <input
                  className="input"
                  name="nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  autoComplete="family-name"
                />
              </Field>
            </div>
          ) : null}
          <Field label="E-Mail" hint="Mindestens E-Mail oder Telefon">
            <input
              className="input"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Telefon">
            <input
              className="input"
              name="telefon"
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              autoComplete="tel"
            />
          </Field>
          <div className="form-grid-2 grid gap-3 md:grid-cols-2">
            <Field label="Straße">
              <input
                className="input"
                name="strasse"
                value={strasse}
                onChange={(e) => setStrasse(e.target.value)}
                autoComplete="street-address"
              />
            </Field>
            <Field label="Hausnummer">
              <input
                className="input"
                name="hausnummer"
                value={hausnummer}
                onChange={(e) => setHausnummer(e.target.value)}
              />
            </Field>
          </div>
          <div className="form-grid-2 grid gap-3 md:grid-cols-2">
            <Field label="PLZ">
              <input
                className="input"
                name="plz"
                value={plz}
                onChange={(e) => setPlz(e.target.value.slice(0, 5))}
                inputMode="numeric"
                maxLength={5}
              />
            </Field>
            <Field label="Ort">
              <input
                className="input"
                name="ort"
                value={ort}
                onChange={(e) => setOrt(e.target.value)}
                autoComplete="address-level2"
              />
            </Field>
          </div>
          <Field label="Kundentyp">
            <select
              className="input"
              name="kundentyp"
              value={kundentyp}
              onChange={(e) => setKundentyp(e.target.value)}
            >
              <option value="">Bitte wählen</option>
              {KUNDENTYP_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kanal">
            <select
              className="input"
              name="kanal"
              value={kanal}
              onChange={(e) => setKanal(e.target.value)}
            >
              {Object.entries(KANAL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Vorhaben">
        <div className="space-y-5">
          <div>
            <p className="form-field-label mb-2">Was planst du?</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {SITUATIONEN.map((s) => (
                <label
                  key={s.value}
                  className={cn(
                    'radio-card',
                    situation === s.value && 'radio-card-active'
                  )}
                >
                  <input
                    type="radio"
                    name="situation"
                    value={s.value}
                    checked={situation === s.value}
                    onChange={() => handleSituationChange(s.value)}
                  />
                  <span className="radio-card-label">
                    {SITUATION_LABELS[s.value]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {situation ? (
            <div>
              <p className="form-field-label mb-2">Bereiche</p>
              <div className="flex flex-col">
                {verfuegbareBereiche.map((b) => (
                  <label key={b.value} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={bereiche.includes(b.value)}
                      onChange={(e) => toggleBereich(b.value, e.target.checked)}
                    />
                    <span>{b.label ?? BEREICH_LABELS[b.value] ?? b.value}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className="checkbox-row mt-4 rounded-lg border border-bw-border bg-bw-surface px-3 py-3">
            <input
              type="checkbox"
              checked={istBauprojekt}
              onChange={(e) => {
                setBauprojektManuell(true)
                setIstBauprojekt(e.target.checked)
              }}
            />
            <span>
              <span className="font-medium text-bw-text">Bauprojekt / Bauauftrag</span>
              <span className="mt-0.5 block text-xs text-bw-text-muted">
                Aktiviert Bautagesberichte, Leistungs-Compliance und Baustellen-Unterlagen.
              </span>
            </span>
          </label>
        </div>
      </Card>

      {showDetails ? (
        <Card title="Details">
          <div className="space-y-4">
            {bereiche.flatMap((bereich) => {
              const keys = fachdetailKeysForBereich(bereich, situation)
              return keys.map((key) => {
                const config = FACHDETAILS_CONFIG[key]
                if (!config) return null
                return (
                  <Field key={key} label={config.frage}>
                    <select
                      className="input"
                      name={`fachdetail-${key}`}
                      value={fachdetails[key] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setFachdetails((prev) => {
                          const next = { ...prev }
                          if (!v) delete next[key]
                          else next[key] = v
                          return next
                        })
                      }}
                    >
                      <option value="">Bitte wählen</option>
                      {config.optionen.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )
              })
            })}

            {bereiche.includes('bad') ? (
              <Field label="Ausstattung Bad">
                <select
                  className="input"
                  name="badAusstattung"
                  value={badAusstattung}
                  onChange={(e) => setBadAusstattung(e.target.value)}
                >
                  <option value="">Bitte wählen</option>
                  <option value="standard">Standard</option>
                  <option value="komfort">Komfort</option>
                  <option value="gehoben">Gehoben</option>
                </select>
              </Field>
            ) : null}

            {situation === 'erneuern' ? (
              <Field label="Aktueller Zustand">
                <select
                  className="input"
                  name="zustand"
                  value={zustand}
                  onChange={(e) => setZustand(e.target.value)}
                >
                  <option value="">Bitte wählen</option>
                  <option value="gut">Gepflegt</option>
                  <option value="maessig">Normale Abnutzung</option>
                  <option value="schlecht">Sanierungsbedürftig</option>
                </select>
              </Field>
            ) : null}

            {situation === 'kaputt' || situation === 'notfall' ? (
              <>
                <Field label="Dringlichkeit">
                  <select
                    className="input"
                    name="dringlichkeit"
                    value={dringlichkeit}
                    onChange={(e) => setDringlichkeit(e.target.value)}
                  >
                    <option value="">Bitte wählen</option>
                    <option value="sofort">Sofort (Notfall)</option>
                    <option value="heute">Heute noch</option>
                    <option value="diese_woche">Diese Woche</option>
                    <option value="naechste_woche">Nächste Woche</option>
                    <option value="flexibel">Flexibel</option>
                  </select>
                </Field>
                <Field label="Zugänglichkeit">
                  <select
                    className="input"
                    name="zugaenglichkeit"
                    value={zugaenglichkeit}
                    onChange={(e) => setZugaenglichkeit(e.target.value)}
                  >
                    <option value="">Bitte wählen</option>
                    <option value="sichtbar_zugaenglich">Sichtbar & zugänglich</option>
                    <option value="schwer_zugaenglich">Schwer zugänglich</option>
                    <option value="nicht_sichtbar">Nicht sichtbar</option>
                  </select>
                </Field>
              </>
            ) : null}

            {bereiche
              .filter((b) => hatGroesseFeld(b))
              .map((bereich) => {
                const g = GROESSEN_CONFIG[bereich]
                if (!g) return null
                return (
                  <Field key={bereich} label={groessePropLabel(bereich)}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        className="input min-w-0 flex-1"
                        name={`groesse-${bereich}`}
                        value={groessen[bereich] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          setGroessen((prev) => {
                            const next = { ...prev }
                            if (raw === '') {
                              delete next[bereich]
                              return next
                            }
                            const n = Number(raw)
                            if (Number.isFinite(n) && n >= 0) next[bereich] = n
                            return next
                          })
                        }}
                        placeholder="0"
                      />
                      <select
                        className="input shrink-0"
                        value={groessenEinheiten[bereich] ?? defaultGroesseEinheit(bereich)}
                        onChange={(e) => {
                          const val = e.target.value
                          setGroessenEinheiten((prev) => ({ ...prev, [bereich]: val }))
                        }}
                        aria-label={`Einheit ${groessePropLabel(bereich)}`}
                      >
                        {GROESSEN_EINHEITEN.map((u) => (
                          <option key={u} value={u}>
                            {groesseEinheitLabel(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {g.hinweis ? <p className="form-field-hint">{g.hinweis}</p> : null}
                  </Field>
                )
              })}
          </div>
        </Card>
      ) : null}

      <Card title="Zeitraum & Preis">
        <div className="space-y-4">
          <Field label="Wann soll es losgehen?">
            <select
              className="input"
              name="zeitraum"
              value={zeitraum}
              onChange={(e) => setZeitraum(e.target.value)}
            >
              <option value="">Bitte wählen</option>
              <option value="sofort">Sofort</option>
              <option value="diese_woche">Diese Woche</option>
              <option value="ein_monat">Innerhalb 1 Monat</option>
              <option value="zwei_monate">1–2 Monate</option>
              <option value="drei_monate">1–3 Monate</option>
              <option value="sechs_monate">3–6 Monate</option>
              <option value="offen">Noch offen</option>
            </select>
          </Field>

          <Field label="Preisrahmen (optional)">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-[11px] text-bw-text-muted">Von (€)</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  name="budgetMin"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <span className="mb-1 block text-[11px] text-bw-text-muted">Bis (€)</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  name="budgetMax"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Notizen">
        <div className="space-y-4">
          <Field label="Anmerkungen vom Kunden">
            <Textarea
              name="freitext"
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              placeholder="Was hat der Kunde noch erwähnt?"
              rows={3}
            />
          </Field>
          <Field label="Interne Notiz">
            <Textarea
              name="interneNotiz"
              value={interneNotiz}
              onChange={(e) => setInterneNotiz(e.target.value)}
              placeholder="Interne Bemerkungen zum Gespräch…"
              rows={3}
            />
          </Field>
        </div>
      </Card>

      {!isBearbeiten ? (
        <div className="rounded-lg border border-bw-border bg-bw-surface px-3 py-3">
          {email.trim() ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={bestaetigungsmailSenden}
                onChange={(e) => setBestaetigungsmailSenden(e.target.checked)}
              />
              <span>
                <span className="font-medium text-bw-text">Bestätigungs-Mail an Kunden senden</span>
                <span className="mt-0.5 block text-xs text-bw-text-muted">
                  An {email.trim()} — standardmäßig aus bei manuell erfassten Anfragen.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-bw-text-muted">
              Keine E-Mail beim Kontakt — Bestätigungs-Mail kann nicht gesendet werden.
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )

  return (
    <form
      id={resolvedFormId}
      onSubmit={onFormSubmit}
      className={cn('flex flex-col', isModal && 'max-h-[min(85vh,720px)]')}
    >
      <div
        className={cn(
          'min-h-0 flex-1',
          isModal ? 'overflow-y-auto pb-2' : isSheet ? '' : 'pb-4'
        )}
      >
        {formBody}
      </div>

      {showFooter ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-end gap-2 border-t border-bw-border bg-bw-card pt-4',
            isModal ? 'sticky bottom-0 z-10 -mx-6 mt-2 px-6 pb-4' : 'mt-2'
          )}
          style={
            isModal ? { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' } : undefined
          }
        >
          <button type="button" onClick={handleCancel} className="btn btn-secondary btn-sm">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading || !isValid}
            className="btn btn-primary btn-sm inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
            ) : null}
            {isBearbeiten ? 'Speichern' : 'Anfrage speichern'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
