'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { saveKunde } from '@/app/actions/kunden'
import { MockBtn, MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockField } from '@/components/mock-ui/MockForm'
import { toast } from '@/components/ui/app-toast'
import {
  istKundeFirmaPflichtTyp,
  istKundeHausverwaltungTyp,
  istKundeNurGewerbeTyp,
} from '@/lib/kunde-stammdaten'
import {
  createAngebotHref,
  createRechnungHref,
} from '@/lib/crm/create-entry'
import { openFabCreate } from '@/components/neu/FabCreateHost'

type Art = '' | 'vorgang' | 'kunde' | 'handwerker'
type VorgangTyp = '' | 'anfrage' | 'angebot' | 'rechnung'
type Preset = 'anfrage' | 'angebot' | 'rechnung' | 'kunde' | 'handwerker' | 'partner'
type GewerkOpt = { id: string; name: string; slug: string }

const PRESET_MAP: Record<Preset, [Art, VorgangTyp]> = {
  anfrage: ['vorgang', 'anfrage'],
  angebot: ['vorgang', 'angebot'],
  rechnung: ['vorgang', 'rechnung'],
  kunde: ['kunde', ''],
  /** Sidepanel „Partner“ = Handwerker-Entity */
  handwerker: ['handwerker', ''],
  partner: ['handwerker', ''],
}

const TITEL_MAP: Record<Preset, string> = {
  anfrage: 'Neue Anfrage',
  angebot: 'Neues Angebot',
  rechnung: 'Neue Rechnung',
  kunde: 'Neuer Kunde',
  handwerker: 'Neuer Partner',
  partner: 'Neuer Partner',
}

const ART_OPTIONS = [
  { v: 'vorgang' as const, ic: 'folders', label: 'Vorgang' },
  { v: 'kunde' as const, ic: 'users', label: 'Kunde' },
  { v: 'handwerker' as const, ic: 'tool', label: 'Partner' },
]

const VORGANG_OPTIONS = [
  { v: 'anfrage' as const, ic: 'inbox', label: 'Anfrage' },
  { v: 'angebot' as const, ic: 'file-invoice', label: 'Angebot' },
  { v: 'rechnung' as const, ic: 'receipt', label: 'Rechnung' },
]

const KUNDE_QUELLE_OPTS = [
  { value: '', label: 'wählen…' },
  { value: 'website', label: 'Website' },
  { value: 'empfehlung', label: 'Empfehlung' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'social', label: 'Social Media' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

function isPreset(v: string | null): v is Preset {
  return v != null && v in PRESET_MAP
}

function kundeTypFromUi(v: string): 'privat' | 'hausverwaltung' | 'gewerbe' {
  if (v === 'hausverwaltung' || v === 'Hausverwaltung') return 'hausverwaltung'
  if (v === 'gewerbe' || v === 'Gewerbe') return 'gewerbe'
  return 'privat'
}

export function NeuErstellenClient({
  gewerkeOptionen = [],
}: {
  gewerkeOptionen?: GewerkOpt[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetParam = searchParams.get('art')
  const preset = isPreset(presetParam) ? presetParam : null

  const [art, setArt] = useState<Art>(preset ? PRESET_MAP[preset][0] : '')
  const [vorgangTyp, setVorgangTyp] = useState<VorgangTyp>(preset ? PRESET_MAP[preset][1] : '')
  const [f, setF] = useState<Record<string, string>>({ type: 'privat' })
  const [gewerkSlugs, setGewerkSlugs] = useState<Set<string>>(() => new Set())
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (preset) {
      const [a, vt] = PRESET_MAP[preset]
      setArt(a)
      setVorgangTyp(vt)
    }
  }, [preset])

  const wizTitel = preset ? TITEL_MAP[preset] : 'Neu erstellen'

  const backHref = useMemo(() => {
    if (art === 'kunde') return '/kunden'
    if (art === 'handwerker') return '/handwerker'
    return '/vorgaenge'
  }, [art])

  const kundeTyp = kundeTypFromUi(f.type ?? 'privat')
  const firmaPflicht = istKundeFirmaPflichtTyp(kundeTyp)
  const istGewerbe = istKundeNurGewerbeTyp(kundeTyp)
  const istHausverwaltung = istKundeHausverwaltungTyp(kundeTyp)

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  function toggleGewerk(slug: string) {
    setGewerkSlugs((prev) => {
      const n = new Set(prev)
      if (n.has(slug)) n.delete(slug)
      else n.add(slug)
      return n
    })
  }

  function submitKunde() {
    const typ = kundeTypFromUi(f.type ?? 'privat')
    const firma = (f.name ?? '').trim()
    const vorname = (f.vorname ?? '').trim()
    const nachname = (f.nachname ?? '').trim()
    startTransition(async () => {
      const r = await saveKunde(
        {
          typ,
          name: istKundeFirmaPflichtTyp(typ) ? firma || null : firma || null,
          vorname: vorname || null,
          nachname: nachname || null,
          strasse: (f.strasse ?? '').trim() || null,
          hausnummer: (f.hausnummer ?? '').trim() || null,
          plz: (f.plz ?? '').trim() || null,
          ort: (f.ort ?? '').trim() || null,
          telefon: (f.tel ?? '').trim() || null,
          email: (f.mail ?? '').trim() || null,
          webseite: (f.webseite ?? '').trim() || null,
          ansprechpartner: (f.ansprechpartner ?? '').trim() || null,
          geburtstag: (f.geburtstag ?? '').trim() || null,
          quelle: (f.quelle ?? '').trim() || null,
          notizen: (f.notizen ?? '').trim() || null,
          ust_id: istKundeNurGewerbeTyp(typ) ? (f.ustId ?? '').trim() || null : null,
        },
        undefined
      )
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Kunde angelegt')
      router.push(`/kunden/${r.id}`)
    })
  }

  function submitHandwerker() {
    const firma = (f.name ?? '').trim()
    const vorname = (f.vorname ?? '').trim()
    const nachname = (f.nachname ?? '').trim()
    if (!firma && !vorname && !nachname) {
      toast.error('Bitte Firmenname oder Vor-/Nachname angeben.')
      return
    }
    const extraGewerk = (f.category ?? '').trim()
    const gewerke = Array.from(gewerkSlugs)
    if (extraGewerk && !gewerke.includes(extraGewerk)) gewerke.push(extraGewerk)

    startTransition(async () => {
      const r = await createHandwerker({
        firma: firma || null,
        vorname: vorname || null,
        nachname: nachname || null,
        email: (f.mail ?? '').trim() || null,
        telefon: (f.tel ?? '').trim() || null,
        whatsapp: (f.whatsapp ?? '').trim() || null,
        webseite: (f.webseite ?? '').trim() || null,
        adresse: (f.adresse ?? '').trim() || null,
        gewerke,
        subkategorie: null,
        ist_fachbetrieb: true,
        partner_kategorie_id: null,
        steuernummer: (f.steuernummer ?? '').trim() || null,
        ustid: (f.ustId ?? '').trim() || null,
        iban: (f.iban ?? '').trim() || null,
        aktiv: true,
        notizen: (f.notizen ?? '').trim() || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Partner angelegt')
      router.push(`/handwerker/${r.id}`)
    })
  }

  function finishList(href: string, toastMsg?: string) {
    if (toastMsg) toast.success(toastMsg)
    router.push(href)
  }

  return (
    <div className="neu-wiz">
      <div className="neu-wiz-top">
        <button type="button" className="qa-btn" title="Abbrechen" onClick={() => router.push(backHref)}>
          <MockIcon ctx="emphasis" n="x" size={18} />
        </button>
        <div className="neu-wiz-ttl">{wizTitel}</div>
      </div>
      <div className="neu-wiz-body">
        {!preset ? (
          <>
            <div className="form-section-h" style={{ marginTop: 4 }}>
              Was möchtest du erstellen?
            </div>
            <div className="neu-vorgang-grid" style={{ marginBottom: 22 }}>
              {ART_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  className={`neu-vorgang-tile${art === o.v ? ' sel' : ''}`}
                  onClick={() => {
                    if (o.v === 'kunde') {
                      openFabCreate('kunde')
                      return
                    }
                    if (o.v === 'handwerker') {
                      openFabCreate('handwerker')
                      return
                    }
                    setArt(o.v)
                    setVorgangTyp('')
                  }}
                >
                  <div className="ico">
                    <MockIcon ctx="emphasis" n={o.ic} size={22} />
                  </div>
                  <div className="t">{o.label}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {!preset && art === 'vorgang' ? (
          <>
            <div className="form-section-h">Vorgangstyp</div>
            <div className="chiprow" style={{ marginBottom: 22 }}>
              {VORGANG_OPTIONS.map((o) => (
                <MockChip
                  key={o.v}
                  active={false}
                  icon={o.ic}
                  onClick={() => {
                    if (o.v === 'anfrage') openFabCreate('anfrage')
                    else if (o.v === 'angebot') router.push(createAngebotHref())
                    else if (o.v === 'rechnung') router.push(createRechnungHref())
                  }}
                >
                  {o.label}
                </MockChip>
              ))}
            </div>
          </>
        ) : null}

        {art === 'kunde' ? (
          <div className="neu-fields">
            <div className="form-section-h">Kunden-Daten</div>
            <div className="form-grid">
              <MockField label="Typ" required>
                <select
                  className="sel"
                  value={f.type ?? 'privat'}
                  onChange={(e) => set('type', e.target.value)}
                >
                  <option value="privat">Privat</option>
                  <option value="hausverwaltung">HV</option>
                  <option value="gewerbe">Gewerbe</option>
                </select>
              </MockField>
              {firmaPflicht ? (
                <MockField label="Firma" required full>
                  <input
                    className="txt"
                    value={f.name ?? ''}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Firmenname"
                    autoFocus
                  />
                </MockField>
              ) : null}
              <MockField label={firmaPflicht ? 'Vorname (Ansprechpartner)' : 'Vorname'} required>
                <input
                  className="txt"
                  value={f.vorname ?? ''}
                  onChange={(e) => set('vorname', e.target.value)}
                  placeholder="Vorname"
                  autoFocus={!firmaPflicht}
                />
              </MockField>
              <MockField label={firmaPflicht ? 'Nachname (Ansprechpartner)' : 'Nachname'} required>
                <input
                  className="txt"
                  value={f.nachname ?? ''}
                  onChange={(e) => set('nachname', e.target.value)}
                  placeholder="Nachname"
                />
              </MockField>
              <MockField label="Telefon">
                <input
                  className="txt"
                  value={f.tel ?? ''}
                  onChange={(e) => set('tel', e.target.value)}
                  placeholder="089 …"
                />
              </MockField>
              <MockField label="E-Mail">
                <input
                  className="txt"
                  type="email"
                  value={f.mail ?? ''}
                  onChange={(e) => set('mail', e.target.value)}
                  placeholder="mail@…"
                />
              </MockField>
            </div>

            <div className="form-section-h" style={{ marginTop: 22 }}>
              Adresse
            </div>
            <div className="form-grid">
              <MockField label="Straße" required>
                <input
                  className="txt"
                  value={f.strasse ?? ''}
                  onChange={(e) => set('strasse', e.target.value)}
                  placeholder="Straße"
                />
              </MockField>
              <MockField label="Hausnummer" required>
                <input
                  className="txt"
                  value={f.hausnummer ?? ''}
                  onChange={(e) => set('hausnummer', e.target.value)}
                  placeholder="Nr."
                />
              </MockField>
              <MockField label="PLZ" required>
                <input
                  className="txt"
                  value={f.plz ?? ''}
                  onChange={(e) => set('plz', e.target.value)}
                  placeholder="80331"
                />
              </MockField>
              <MockField label="Ort" required>
                <input
                  className="txt"
                  value={f.ort ?? ''}
                  onChange={(e) => set('ort', e.target.value)}
                  placeholder="München"
                />
              </MockField>
              {istGewerbe ? (
                <>
                  <MockField label="USt-IdNr.">
                    <input
                      className="txt"
                      value={f.ustId ?? ''}
                      onChange={(e) => set('ustId', e.target.value)}
                      placeholder="DE…"
                    />
                  </MockField>
                  <MockField label="Ansprechpartner">
                    <input
                      className="txt"
                      value={f.ansprechpartner ?? ''}
                      onChange={(e) => set('ansprechpartner', e.target.value)}
                      placeholder="Name"
                    />
                  </MockField>
                </>
              ) : null}
            </div>

            <div className="form-section-h" style={{ marginTop: 22 }}>
              Weitere Angaben
            </div>
            <div className="form-grid">
              <MockField label="Webseite">
                <input
                  className="txt"
                  value={f.webseite ?? ''}
                  onChange={(e) => set('webseite', e.target.value)}
                  placeholder="https://…"
                />
              </MockField>
              {!firmaPflicht ? (
                <MockField label="Geburtstag">
                  <input
                    className="txt"
                    type="date"
                    value={f.geburtstag ?? ''}
                    onChange={(e) => set('geburtstag', e.target.value)}
                  />
                </MockField>
              ) : (
                <div />
              )}
              <MockField label="Quelle">
                <select
                  className="sel"
                  value={f.quelle ?? ''}
                  onChange={(e) => set('quelle', e.target.value)}
                >
                  {KUNDE_QUELLE_OPTS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </MockField>
              <MockField label="Notizen" full>
                <textarea
                  className="ta"
                  value={f.notizen ?? ''}
                  onChange={(e) => set('notizen', e.target.value)}
                  rows={3}
                  placeholder="Interne Notizen…"
                />
              </MockField>
            </div>

            <div className="neu-actions">
              <MockBtn kind="secondary" onClick={() => router.push('/kunden')}>
                Abbrechen
              </MockBtn>
              <MockBtn kind="primary" icon="check" disabled={pending} onClick={submitKunde}>
                Kunde anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}

        {art === 'handwerker' ? (
          <div className="neu-fields">
            <div className="form-section-h">Partner-Daten</div>
            <div className="form-grid">
              <MockField label="Firmenname" required full>
                <input
                  className="txt"
                  value={f.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Betrieb / Firma"
                  autoFocus
                />
              </MockField>
              <MockField label="Vorname (Geschäftsführer)">
                <input
                  className="txt"
                  value={f.vorname ?? ''}
                  onChange={(e) => set('vorname', e.target.value)}
                  placeholder="Vorname"
                />
              </MockField>
              <MockField label="Nachname (Geschäftsführer)">
                <input
                  className="txt"
                  value={f.nachname ?? ''}
                  onChange={(e) => set('nachname', e.target.value)}
                  placeholder="Nachname"
                />
              </MockField>
              <MockField label="Telefon">
                <input
                  className="txt"
                  value={f.tel ?? ''}
                  onChange={(e) => set('tel', e.target.value)}
                  placeholder="0170 …"
                />
              </MockField>
              <MockField label="E-Mail">
                <input
                  className="txt"
                  type="email"
                  value={f.mail ?? ''}
                  onChange={(e) => set('mail', e.target.value)}
                  placeholder="mail@…"
                />
              </MockField>
              <MockField label="Gewerk (Freitext)">
                <input
                  className="txt"
                  value={f.category ?? ''}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="z.B. Sanitär"
                />
              </MockField>
              <MockField label="WhatsApp">
                <input
                  className="txt"
                  value={f.whatsapp ?? ''}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  placeholder="0170 …"
                />
              </MockField>
            </div>

            {gewerkeOptionen.length > 0 ? (
              <>
                <div className="form-section-h" style={{ marginTop: 22 }}>
                  Gewerke
                </div>
                <div
                  className="form-grid"
                  style={{ gridTemplateColumns: '1fr 1fr', maxHeight: 180, overflowY: 'auto' }}
                >
                  {gewerkeOptionen.map((g) => (
                    <label
                      key={g.slug}
                      className="field"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={gewerkSlugs.has(g.slug)}
                        onChange={() => toggleGewerk(g.slug)}
                      />
                      <span style={{ fontSize: 'var(--fs-text)' }}>{g.name}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : null}

            <div className="form-section-h" style={{ marginTop: 22 }}>
              Adresse &amp; Web
            </div>
            <div className="form-grid">
              <MockField label="Adresse" full>
                <input
                  className="txt"
                  value={f.adresse ?? ''}
                  onChange={(e) => set('adresse', e.target.value)}
                  placeholder="Straße Nr., PLZ Ort"
                />
              </MockField>
              <MockField label="Webseite" full>
                <input
                  className="txt"
                  value={f.webseite ?? ''}
                  onChange={(e) => set('webseite', e.target.value)}
                  placeholder="https://…"
                />
              </MockField>
            </div>

            <div className="form-section-h" style={{ marginTop: 22 }}>
              Weitere Angaben
            </div>
            <div className="form-grid">
              <MockField label="Steuernummer">
                <input
                  className="txt"
                  value={f.steuernummer ?? ''}
                  onChange={(e) => set('steuernummer', e.target.value)}
                />
              </MockField>
              <MockField label="USt-IdNr.">
                <input
                  className="txt"
                  value={f.ustId ?? ''}
                  onChange={(e) => set('ustId', e.target.value)}
                  placeholder="DE…"
                />
              </MockField>
              <MockField label="IBAN" full>
                <input
                  className="txt"
                  value={f.iban ?? ''}
                  onChange={(e) => set('iban', e.target.value)}
                  placeholder="DE…"
                />
              </MockField>
              <MockField label="Notizen" full>
                <textarea
                  className="ta"
                  value={f.notizen ?? ''}
                  onChange={(e) => set('notizen', e.target.value)}
                  rows={3}
                  placeholder="Interne Notizen…"
                />
              </MockField>
            </div>

            <div className="neu-actions">
              <MockBtn kind="secondary" onClick={() => router.push('/handwerker')}>
                Abbrechen
              </MockBtn>
              <MockBtn kind="primary" icon="check" disabled={pending} onClick={submitHandwerker}>
                Partner anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
