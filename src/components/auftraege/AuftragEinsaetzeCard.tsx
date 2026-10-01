'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  createEinsatz,
  einsatzUpdatesGesehen,
  listEinsaetze,
  loadEinsatzFormular,
  regieEntscheiden,
  zurueckziehenEinsatz,
  type EinsatzMitteilung,
  type EinsatzPartnerOption,
  type EinsatzStatus,
  type EinsatzZeile,
} from '@/app/(dashboard)/auftraege/einsatz-actions'
import { MockBadge, MockBtn, MockCard, MockSegment } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect, MockTextarea } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { DateInput } from '@/components/ui/DateInput'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatum, formatEuro } from '@/lib/format/geld-datum'
import { toast } from '@/components/ui/app-toast'

const STATUS: Record<EinsatzStatus, { label: string; kind: string }> = {
  gesendet: { label: 'Gesendet', kind: 'warten' },
  angenommen: { label: 'Läuft', kind: 'aktiv' },
  abgelehnt: { label: 'Abgelehnt', kind: 'storniert' },
  fertig: { label: 'Fertig', kind: 'fertig' },
}

const MELDUNG_LABEL: Record<EinsatzMitteilung['typ'], string> = {
  update: 'Update',
  regie: 'Regie',
  behinderung: 'Update',
}

const REGIE_STAND: Record<EinsatzMitteilung['status'], string> = {
  offen: '',
  uebernommen: ' (angenommen)',
  erledigt: ' (abgelehnt)',
}

function datum(iso: string | null): string {
  return iso ? formatDatum(iso) : ''
}

type VerlaufEintrag = {
  key: string
  at: string
  art: string
  text: string
  dateien: { name: string; url: string }[]
  neu: boolean
  m?: EinsatzMitteilung
}

/** Alles, was zu einem Einsatz passiert ist, neueste Meldung oben. */
function verlauf(e: EinsatzZeile): VerlaufEintrag[] {
  const liste: VerlaufEintrag[] = [
    { key: 'gesendet', at: e.gesendet_at, art: 'An Partner gesendet', text: '', dateien: [], neu: false },
  ]
  if (e.status === 'abgelehnt') {
    liste.push({ key: 'abgelehnt', at: e.gesendet_at, art: 'Abgelehnt', text: e.ablehnung_grund ?? '', dateien: [], neu: false })
  }
  for (const m of e.mitteilungen) {
    const art =
      m.typ === 'regie'
        ? `Regie${m.stunden ? `, ${String(m.stunden).replace('.', ',')} Std` : ''}${REGIE_STAND[m.status]}`
        : MELDUNG_LABEL[m.typ]
    liste.push({ key: m.id, at: m.created_at, art, text: m.text, dateien: m.dateien, neu: m.status === 'offen', m })
  }
  if (e.fertig_at) {
    liste.push({ key: 'fertig', at: e.fertig_at, art: 'Erledigt gemeldet', text: e.fertig_text ?? '', dateien: e.fertig_dateien, neu: false })
  }
  if (e.rechnung_eingereicht_at) {
    liste.push({
      key: 'rechnung',
      at: e.rechnung_eingereicht_at,
      art: `Rechnung${e.rechnung_betrag != null ? ` ${formatEuro(e.rechnung_betrag)}` : ''}`,
      text: '',
      dateien: e.rechnung_pdf_url ? [{ name: 'PDF öffnen', url: e.rechnung_pdf_url }] : [],
      neu: false,
    })
  }
  return liste.sort((a, b) => String(b.at).localeCompare(String(a.at)))
}

type Form = {
  handwerkerId: string
  titel: string
  anweisung: string
  terminVon: string
  terminBis: string
  ort: string
  kontaktVorOrt: string
  ekBetrag: number
  ekArt: 'netto' | 'brutto'
}

/**
 * Einsätze am Auftrag: je Partner-Auftrag eine Zeile mit Stand und „neu“-Zähler.
 * Antippen öffnet den Einsatz mit Verlauf (Updates, Zusatzarbeit, Behinderung, Erledigt, Rechnung).
 */
export function AuftragEinsaetzeCard({ auftragId }: { auftragId: string }) {
  const [einsaetze, setEinsaetze] = useState<EinsatzZeile[] | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [partner, setPartner] = useState<EinsatzPartnerOption[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  // Updates, die in dieser Sitzung geöffnet wurden: zählen in der Zeile nicht mehr als neu.
  const [gesehen, setGesehen] = useState<Set<string>>(new Set())
  const detail = einsaetze?.find((e) => e.id === detailId) ?? null
  const setDetail = (e: EinsatzZeile | null) => setDetailId(e?.id ?? null)

  async function detailOeffnen(e: EinsatzZeile) {
    setDetail(e)
    if (!e.mitteilungen.some((m) => m.typ === 'update' && m.status === 'offen')) return
    const res = await safeAction(einsatzUpdatesGesehen(e.id))
    if (!res.ok) return
    // Im offenen Blatt bleibt „neu“ sichtbar, die Zeile zählt ab jetzt nicht mehr mit.
    setGesehen((g) => new Set([...g, e.id]))
  }

  const laden = useCallback(async () => {
    const res = await safeAction(listEinsaetze(auftragId))
    setEinsaetze(res.ok ? res.einsaetze : [])
  }, [auftragId])

  useEffect(() => {
    void laden()
  }, [laden])

  async function oeffnen() {
    setOpen(true)
    setForm(null)
    const res = await safeAction(loadEinsatzFormular(auftragId))
    if (!res.ok) {
      toast.error(res.message)
      setOpen(false)
      return
    }
    setPartner(res.partner)
    setForm({
      handwerkerId: '',
      titel: res.vorbelegung.titel,
      anweisung: '',
      terminVon: res.vorbelegung.termin_von ?? '',
      terminBis: res.vorbelegung.termin_bis ?? '',
      ort: res.vorbelegung.ort,
      kontaktVorOrt: res.vorbelegung.kontakt_vor_ort,
      ekBetrag: 0,
      ekArt: 'netto',
    })
  }

  async function senden() {
    if (!form) return
    setSaving(true)
    const res = await safeAction(
      createEinsatz({
        auftragId,
        handwerkerId: form.handwerkerId,
        titel: form.titel,
        anweisung: form.anweisung,
        terminVon: form.terminVon || null,
        terminBis: form.terminBis || null,
        ort: form.ort,
        kontaktVorOrt: form.kontaktVorOrt,
        ekBetrag: form.ekBetrag || null,
        ekArt: form.ekArt,
      })
    )
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    if (!res.mailGesendet) {
      toast.error('Einsatz angelegt, aber die Mail an den Partner ging nicht raus. Bitte Partner-E-Mail prüfen.')
    }
    setOpen(false)
    await laden()
  }

  async function zurueckziehen(id: string) {
    const res = await safeAction(zurueckziehenEinsatz(id))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setDetail(null)
    await laden()
  }

  async function regie(id: string, entscheidung: 'angenommen' | 'abgelehnt') {
    const res = await safeAction(regieEntscheiden(id, entscheidung))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    if (entscheidung === 'angenommen') {
      toast.success('Regie angenommen. Neue Positionen über „Auftrag bearbeiten“ eintragen und neu senden.')
    }
    await laden()
  }

  const setF = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const ok = Boolean(form?.handwerkerId && form.titel.trim())

  return (
    <>
      <MockCard
        title="Einsätze"
        icon="tool"
        actions={
          <MockBtn sm kind="secondary" icon="plus" onClick={() => { oeffnen() }}>
            Einsatz
          </MockBtn>
        }
      >
        {einsaetze == null ? null : einsaetze.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-text)' }}>Noch kein Einsatz.</p>
        ) : (
          <div className="einsatz-liste">
            {einsaetze.map((e) => {
              const st = STATUS[e.status] ?? STATUS.gesendet
              const neu = e.mitteilungen.filter(
                (m) => m.status === 'offen' && !(m.typ !== 'regie' && gesehen.has(e.id))
              ).length
              const letzte = e.mitteilungen[e.mitteilungen.length - 1]
              const meta = letzte
                ? `${MELDUNG_LABEL[letzte.typ]} vom ${datum(letzte.created_at)}`
                : [
                    [datum(e.termin_von), datum(e.termin_bis)].filter(Boolean).join(' bis '),
                    e.ek_betrag != null ? `EK ${formatEuro(e.ek_betrag)} ${e.ek_art}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')
              return (
                <MockBtn key={e.id} type="button" className="einsatz-zeile" onClick={() => { detailOeffnen(e) }}>
                  <span className="einsatz-zeile__text">
                    <span className="einsatz-zeile__titel">{e.partner_name}</span>
                    <span className="einsatz-zeile__sub">{e.titel}</span>
                    {meta ? <span className="einsatz-zeile__meta">{meta}</span> : null}
                  </span>
                  <span className="einsatz-zeile__rechts">
                    {neu > 0 ? <MockBadge kind="neu">{neu} neu</MockBadge> : null}
                    <MockBadge kind={st.kind}>{st.label}</MockBadge>
                  </span>
                </MockBtn>
              )
            })}
          </div>
        )}
      </MockCard>

      <EditorSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.partner_name ?? 'Einsatz'}
        crumb={detail?.titel}
        secondary={
          detail && (detail.status === 'gesendet' || detail.status === 'abgelehnt')
            ? { label: 'Zurückziehen', kind: 'ghost', onClick: () => { zurueckziehen(detail.id) } }
            : null
        }
      >
        {detail ? (
          <div className="einsatz-blatt">
            <div className="einsatz-karte">
              <div className="einsatz-kopf">
                <MockBadge kind={(STATUS[detail.status] ?? STATUS.gesendet).kind}>
                  {(STATUS[detail.status] ?? STATUS.gesendet).label}
                </MockBadge>
                <span className="einsatz-kopf__meta">
                  {[
                    [datum(detail.termin_von), datum(detail.termin_bis)].filter(Boolean).join(' bis '),
                    detail.ort ?? '',
                    detail.ek_betrag != null ? `EK ${formatEuro(detail.ek_betrag)} ${detail.ek_art}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {detail.anweisung ? <p className="einsatz-anweisung">{detail.anweisung}</p> : null}
            </div>
            <div className="einsatz-gruppe">
              <div className="einsatz-gruppe__kopf">
                <span className="einsatz-gruppe__titel">Verlauf</span>
              </div>
              <ol className="einsatz-verlauf">
                {verlauf(detail).map((v) => (
                  <li key={v.key} className={`einsatz-eintrag${v.neu ? ' einsatz-eintrag--neu' : ''}`}>
                    <div className="einsatz-eintrag__kopf">
                      <span className="einsatz-eintrag__art">{v.art}</span>
                      <span className="einsatz-eintrag__datum">{datum(v.at)}</span>
                    </div>
                    {v.text ? <div className="einsatz-eintrag__text">{v.text}</div> : null}
                    {v.dateien.length ? (
                      <div className="einsatz-eintrag__dateien">
                        {v.dateien.map((d) => (
                          <a key={d.url} href={d.url} target="_blank" rel="noreferrer">
                            {d.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {v.m && v.m.typ === 'regie' && v.m.status === 'offen' ? (
                      <div className="einsatz-eintrag__aktionen">
                        <MockBtn sm kind="primary" onClick={() => { regie((v.m as EinsatzMitteilung).id, 'angenommen') }}>
                          Annehmen
                        </MockBtn>
                        <MockBtn sm kind="secondary" onClick={() => { regie((v.m as EinsatzMitteilung).id, 'abgelehnt') }}>
                          Ablehnen
                        </MockBtn>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </EditorSheet>

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Einsatz anlegen"
        crumb="Der Partner sieht nur diese Anweisung und den EK, keine Positionen und keine Verkaufspreise."
        secondary={{ label: 'Abbrechen', disabled: saving, kind: 'ghost' }}
        primary={{
          label: 'Senden',
          icon: 'send',
          disabled: !ok || saving,
          busy: saving,
          onClick: () => { senden() },
        }}
      >
        {form ? (
          <>
            <MockField label="Partner" required>
              <MockSelect value={form.handwerkerId} onChange={(ev) => setF({ handwerkerId: ev.target.value })}>
                <option value="">Partner wählen</option>
                {partner.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.email ? '' : ' (keine E-Mail)'}
                  </option>
                ))}
              </MockSelect>
            </MockField>
            <MockField label="Titel" required>
              <MockInput value={form.titel} onChange={(ev) => setF({ titel: ev.target.value })} />
            </MockField>
            <MockField label="Anweisung" hint="Was ist zu tun? Der Partner sieht diesen Text.">
              <MockTextarea
                rows={5}
                value={form.anweisung}
                onChange={(ev) => setF({ anweisung: ev.target.value })}
              />
            </MockField>
            <MockField label="Termin von">
              <DateInput value={form.terminVon} onChange={(ev) => setF({ terminVon: ev.target.value })} />
            </MockField>
            <MockField label="Termin bis">
              <DateInput value={form.terminBis} onChange={(ev) => setF({ terminBis: ev.target.value })} />
            </MockField>
            <MockField label="Ort">
              <MockInput value={form.ort} onChange={(ev) => setF({ ort: ev.target.value })} />
            </MockField>
            <MockField label="Kontakt vor Ort">
              <MockInput value={form.kontaktVorOrt} onChange={(ev) => setF({ kontaktVorOrt: ev.target.value })} />
            </MockField>
            <MockField label="EK" hint="So, wie der Partner abrechnet: netto bei §13b, sonst brutto.">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ClearableNumberInput
                  className="txt"
                  min={0}
                  value={form.ekBetrag}
                  onValueChange={(v) => setF({ ekBetrag: Number(v) || 0 })}
                  style={{ textAlign: 'right' }}
                />
                <MockSegment
                  value={form.ekArt}
                  onChange={(next) => setF({ ekArt: next })}
                  options={[
                    { value: 'netto', label: 'netto' },
                    { value: 'brutto', label: 'brutto' },
                  ]}
                  aria-label="EK netto oder brutto"
                />
              </div>
            </MockField>
          </>
        ) : (
          <p style={{ color: 'var(--text-3)' }}>Wird geladen …</p>
        )}
      </EditorSheet>

    </>
  )
}
