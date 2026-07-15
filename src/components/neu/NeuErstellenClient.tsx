'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { createHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { createPartner } from '@/app/(dashboard)/partner/actions'
import { saveKunde } from '@/app/actions/kunden'
import { MockBtn, MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import type { LeadKanal } from '@/lib/types'

type Art = '' | 'vorgang' | 'kunde' | 'handwerker' | 'partner'
type VorgangTyp = '' | 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'
type Preset = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung' | 'kunde' | 'handwerker' | 'partner'

const PRESET_MAP: Record<Preset, [Art, VorgangTyp]> = {
  anfrage: ['vorgang', 'anfrage'],
  angebot: ['vorgang', 'angebot'],
  auftrag: ['vorgang', 'auftrag'],
  rechnung: ['vorgang', 'rechnung'],
  kunde: ['kunde', ''],
  handwerker: ['handwerker', ''],
  partner: ['partner', ''],
}

const TITEL_MAP: Record<Preset, string> = {
  anfrage: 'Neue Anfrage',
  angebot: 'Neues Angebot',
  auftrag: 'Neuer Auftrag',
  rechnung: 'Neue Rechnung',
  kunde: 'Neuer Kunde',
  handwerker: 'Neuer Handwerker',
  partner: 'Neuer Partner',
}

const ART_OPTIONS = [
  { v: 'vorgang' as const, ic: 'folders', label: 'Vorgang', d: 'Anfrage, Angebot, Auftrag, Rechnung' },
  { v: 'kunde' as const, ic: 'users', label: 'Kunde', d: 'Neuen Kunden anlegen' },
  { v: 'handwerker' as const, ic: 'tool', label: 'Handwerker', d: 'Partnerbetrieb anlegen' },
  { v: 'partner' as const, ic: 'building', label: 'Partner', d: 'Netzwerk-Partner anlegen' },
]

const VORGANG_OPTIONS = [
  { v: 'anfrage' as const, ic: 'inbox', label: 'Anfrage' },
  { v: 'angebot' as const, ic: 'file-invoice', label: 'Angebot' },
  { v: 'auftrag' as const, ic: 'briefcase', label: 'Auftrag' },
  { v: 'rechnung' as const, ic: 'receipt', label: 'Rechnung' },
]

function isPreset(v: string | null): v is Preset {
  return v != null && v in PRESET_MAP
}

function kanalFromUi(v: string): LeadKanal {
  const m: Record<string, LeadKanal> = {
    Website: 'website',
    Telefon: 'telefon',
    WhatsApp: 'whatsapp',
    'E-Mail': 'email',
    Empfehlung: 'sonstiges',
  }
  return m[v] ?? 'sonstiges'
}

function kundeTypFromUi(v: string): 'privat' | 'hausverwaltung' | 'gewerbe' {
  if (v === 'Hausverwaltung') return 'hausverwaltung'
  if (v === 'Gewerbe') return 'gewerbe'
  return 'privat'
}

export function NeuErstellenClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetParam = searchParams.get('art')
  const preset = isPreset(presetParam) ? presetParam : null

  const [art, setArt] = useState<Art>(preset ? PRESET_MAP[preset][0] : '')
  const [vorgangTyp, setVorgangTyp] = useState<VorgangTyp>(preset ? PRESET_MAP[preset][1] : '')
  const [f, setF] = useState<Record<string, string>>({})
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
    if (art === 'partner') return '/partner'
    return '/vorgaenge'
  }, [art])

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  function submitAnfrage() {
    const name = (f.name ?? '').trim()
    const tel = (f.tel ?? '').trim()
    if (!name && !tel) {
      toast.error('Bitte Name oder Telefon angeben.')
      return
    }
    startTransition(async () => {
      const r = await createAnfrage({
        name: name || 'Unbekannt',
        email: '',
        telefon: tel,
        plz: '',
        kanal: kanalFromUi(f.kanal ?? ''),
        situation: (f.project ?? '').trim(),
        bereiche: (f.project ?? '').trim() ? [(f.project ?? '').trim()] : [],
        notizen: (f.area ?? '').trim() ? `Region: ${f.area}` : '',
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Anfrage angelegt')
      router.push(`/anfragen/${r.id}`)
    })
  }

  function submitKunde() {
    const name = (f.name ?? '').trim()
    if (!name) {
      toast.error('Bitte Name angeben.')
      return
    }
    startTransition(async () => {
      const r = await saveKunde(
        {
          typ: kundeTypFromUi(f.type ?? ''),
          name,
          telefon: (f.tel ?? '').trim() || null,
          email: (f.mail ?? '').trim() || null,
          stammPflicht: false,
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
    const name = (f.name ?? '').trim()
    if (!name) {
      toast.error('Bitte Name angeben.')
      return
    }
    startTransition(async () => {
      const r = await createHandwerker({
        firma: name,
        vorname: null,
        nachname: null,
        email: (f.mail ?? '').trim() || null,
        telefon: (f.tel ?? '').trim() || null,
        whatsapp: null,
        webseite: null,
        adresse: null,
        gewerke: (f.category ?? '').trim() ? [(f.category ?? '').trim()] : [],
        subkategorie: null,
        ist_fachbetrieb: false,
        partner_kategorie_id: null,
        steuernummer: null,
        ustid: null,
        iban: null,
        aktiv: true,
        notizen: null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Handwerker angelegt')
      router.push(`/handwerker/${r.id}`)
    })
  }

  function submitPartner() {
    const name = (f.name ?? '').trim()
    if (!name) {
      toast.error('Bitte Name angeben.')
      return
    }
    startTransition(async () => {
      const r = await createPartner({
        name,
        kategorie: (f.category ?? '').trim() || null,
        ansprechpartner: (f.contact ?? '').trim() || null,
        telefon: (f.tel ?? '').trim() || null,
        email: (f.mail ?? '').trim() || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Partner angelegt')
      router.push(`/partner/${r.id}`)
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
          <MockIcon n="x" size={18} />
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
                    setArt(o.v)
                    setVorgangTyp('')
                  }}
                >
                  <div className="ico">
                    <MockIcon n={o.ic} size={22} />
                  </div>
                  <div className="t">{o.label}</div>
                  <div className="d">{o.d}</div>
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
                  active={vorgangTyp === o.v}
                  icon={o.ic}
                  onClick={() => setVorgangTyp(o.v)}
                >
                  {o.label}
                </MockChip>
              ))}
            </div>
          </>
        ) : null}

        {art === 'vorgang' && vorgangTyp === 'anfrage' ? (
          <div className="neu-fields">
            <div className="form-section-h">Anfrage-Daten</div>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">
                  Name <span className="req">*</span>
                </span>
                <input
                  className="field-inp"
                  value={f.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Kundenname"
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Telefon</span>
                <input
                  className="field-inp"
                  value={f.tel ?? ''}
                  onChange={(e) => set('tel', e.target.value)}
                  placeholder="089 …"
                />
              </label>
              <label className="field full">
                <span className="field-label">Projekt / Leistung</span>
                <input
                  className="field-inp"
                  value={f.project ?? ''}
                  onChange={(e) => set('project', e.target.value)}
                  placeholder="z.B. Badsanierung"
                />
              </label>
              <label className="field">
                <span className="field-label">Region</span>
                <input
                  className="field-inp"
                  value={f.area ?? ''}
                  onChange={(e) => set('area', e.target.value)}
                  placeholder="Stadtteil"
                />
              </label>
              <label className="field">
                <span className="field-label">Kanal</span>
                <select
                  className="field-inp"
                  value={f.kanal ?? ''}
                  onChange={(e) => set('kanal', e.target.value)}
                >
                  <option value="">wählen…</option>
                  {['Website', 'Telefon', 'WhatsApp', 'E-Mail', 'Empfehlung'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="neu-actions">
              <MockBtn kind="ghost" onClick={() => router.push('/vorgaenge')}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn kind="primary" icon="check" disabled={pending} onClick={submitAnfrage}>
                Anfrage anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}

        {art === 'vorgang' && vorgangTyp === 'auftrag' ? (
          <div className="neu-fields">
            <div className="form-section-h">Auftrags-Daten</div>
            <div className="form-grid">
              <label className="field full">
                <span className="field-label">
                  Titel <span className="req">*</span>
                </span>
                <input
                  className="field-inp"
                  value={f.title ?? ''}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="z.B. Badsanierung Koch"
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Auftragswert (€)</span>
                <input
                  className="field-inp"
                  type="number"
                  value={f.value ?? ''}
                  onChange={(e) => set('value', e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="field">
                <span className="field-label">Region</span>
                <input
                  className="field-inp"
                  value={f.area ?? ''}
                  onChange={(e) => set('area', e.target.value)}
                  placeholder="Stadtteil"
                />
              </label>
            </div>
            <div className="neu-actions">
              <MockBtn kind="ghost" onClick={() => router.push('/vorgaenge')}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn
                kind="primary"
                icon="check"
                disabled={pending}
                onClick={() => {
                  toast.message('Auftrag', {
                    description: 'Aufträge entstehen aus angenommenen Angeboten — bitte zuerst Angebot anlegen.',
                  })
                  router.push('/vorgaenge?phase=auftrag')
                }}
              >
                Auftrag anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}

        {art === 'vorgang' && (vorgangTyp === 'angebot' || vorgangTyp === 'rechnung') ? (
          <div className="neu-fields">
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-2)' }}>
              {vorgangTyp === 'angebot'
                ? 'Angebote werden im mehrstufigen Angebots-Wizard erstellt.'
                : 'Rechnungen werden aus einem Auftrag erstellt.'}
            </div>
            <div className="neu-actions">
              <MockBtn kind="ghost" onClick={() => router.push('/vorgaenge')}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              {vorgangTyp === 'angebot' ? (
                <MockBtn kind="primary" icon="arrow-right" onClick={() => finishList('/anfragen')}>
                  Angebots-Wizard öffnen
                </MockBtn>
              ) : (
                <MockBtn kind="primary" icon="arrow-right" onClick={() => finishList('/rechnungen/neu')}>
                  Rechnungs-Wizard öffnen
                </MockBtn>
              )}
            </div>
          </div>
        ) : null}

        {art === 'kunde' ? (
          <div className="neu-fields">
            <div className="form-section-h">Kunden-Daten</div>
            <div className="form-grid">
              <label className="field full">
                <span className="field-label">
                  Name <span className="req">*</span>
                </span>
                <input
                  className="field-inp"
                  value={f.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Name / Firma"
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Typ</span>
                <select
                  className="field-inp"
                  value={f.type ?? ''}
                  onChange={(e) => set('type', e.target.value)}
                >
                  <option value="">wählen…</option>
                  {['Privat', 'Hausverwaltung', 'Gewerbe'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Telefon</span>
                <input
                  className="field-inp"
                  value={f.tel ?? ''}
                  onChange={(e) => set('tel', e.target.value)}
                  placeholder="089 …"
                />
              </label>
              <label className="field full">
                <span className="field-label">E-Mail</span>
                <input
                  className="field-inp"
                  value={f.mail ?? ''}
                  onChange={(e) => set('mail', e.target.value)}
                  placeholder="mail@…"
                />
              </label>
            </div>
            <div className="neu-actions">
              <MockBtn kind="ghost" onClick={() => router.push('/kunden')}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn kind="primary" icon="check" disabled={pending} onClick={submitKunde}>
                Kunde anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}

        {art === 'handwerker' ? (
          <div className="neu-fields">
            <div className="form-section-h">Handwerker-Daten</div>
            <div className="form-grid">
              <label className="field full">
                <span className="field-label">
                  Name <span className="req">*</span>
                </span>
                <input
                  className="field-inp"
                  value={f.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Betrieb / Name"
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Gewerk</span>
                <input
                  className="field-inp"
                  value={f.category ?? ''}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="z.B. Sanitär"
                />
              </label>
              <label className="field">
                <span className="field-label">Telefon</span>
                <input
                  className="field-inp"
                  value={f.tel ?? ''}
                  onChange={(e) => set('tel', e.target.value)}
                  placeholder="0170 …"
                />
              </label>
              <label className="field full">
                <span className="field-label">E-Mail</span>
                <input
                  className="field-inp"
                  value={f.mail ?? ''}
                  onChange={(e) => set('mail', e.target.value)}
                  placeholder="mail@…"
                />
              </label>
            </div>
            <div className="neu-actions">
              <MockBtn kind="ghost" onClick={() => router.push('/handwerker')}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn kind="primary" icon="check" disabled={pending} onClick={submitHandwerker}>
                Handwerker anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}

        {art === 'partner' ? (
          <div className="neu-fields">
            <div className="form-section-h">Partner-Daten</div>
            <div className="form-grid">
              <label className="field full">
                <span className="field-label">
                  Name <span className="req">*</span>
                </span>
                <input
                  className="field-inp"
                  value={f.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Firma / Name"
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Kategorie</span>
                <select
                  className="field-inp"
                  value={f.category ?? ''}
                  onChange={(e) => set('category', e.target.value)}
                >
                  <option value="">wählen…</option>
                  {['Versicherung', 'Finanzierung', 'Makler', 'Planung', 'Logistik'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Ansprechpartner</span>
                <input
                  className="field-inp"
                  value={f.contact ?? ''}
                  onChange={(e) => set('contact', e.target.value)}
                  placeholder="Name"
                />
              </label>
              <label className="field">
                <span className="field-label">Telefon</span>
                <input
                  className="field-inp"
                  value={f.tel ?? ''}
                  onChange={(e) => set('tel', e.target.value)}
                  placeholder="089 …"
                />
              </label>
              <label className="field full">
                <span className="field-label">E-Mail</span>
                <input
                  className="field-inp"
                  value={f.mail ?? ''}
                  onChange={(e) => set('mail', e.target.value)}
                  placeholder="mail@…"
                />
              </label>
            </div>
            <div className="neu-actions">
              <MockBtn kind="ghost" onClick={() => router.push('/partner')}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn kind="primary" icon="check" disabled={pending} onClick={submitPartner}>
                Partner anlegen
              </MockBtn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
