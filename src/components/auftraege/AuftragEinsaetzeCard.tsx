'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  createEinsatz,
  listEinsaetze,
  loadEinsatzFormular,
  mitteilungErledigt,
  regieUebernehmen,
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
import { formatEuro } from '@/lib/format/geld-datum'
import { toast } from '@/components/ui/app-toast'

const STATUS: Record<EinsatzStatus, { label: string; kind: string }> = {
  gesendet: { label: 'Gesendet', kind: 'warten' },
  angenommen: { label: 'Angenommen', kind: 'aktiv' },
  abgelehnt: { label: 'Abgelehnt', kind: 'storniert' },
  fertig: { label: 'Fertig', kind: 'fertig' },
}

function datum(iso: string | null): string {
  const d = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return ''
  const [y, m, t] = d.split('-')
  return `${t}.${m}.${y}`
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
 * Einsätze am Auftrag (Umbau P11): wer führt aus, was, wann, wo, zu welchem EK — und in welchem Stand.
 */
export function AuftragEinsaetzeCard({ auftragId }: { auftragId: string }) {
  const [einsaetze, setEinsaetze] = useState<EinsatzZeile[] | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [partner, setPartner] = useState<EinsatzPartnerOption[]>([])
  const [form, setForm] = useState<Form | null>(null)
  // P13: Regie übernehmen (Standard-Aufschlag 20 %, änderbar)
  const [regie, setRegie] = useState<{
    m: EinsatzMitteilung
    titel: string
    stunden: number
    partnersatz: number
    aufschlag: number
  } | null>(null)

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
    await laden()
  }

  async function regieSpeichern() {
    if (!regie) return
    setSaving(true)
    const res = await safeAction(
      regieUebernehmen({
        mitteilungId: regie.m.id,
        titel: regie.titel,
        stunden: regie.stunden,
        partnersatz: regie.partnersatz,
        aufschlagProzent: regie.aufschlag,
      })
    )
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Regie übernommen. Auftrag jetzt über „Auftrag bearbeiten“ erneut an den Kunden senden.')
    setRegie(null)
    await laden()
  }

  async function erledigt(id: string) {
    const res = await safeAction(mitteilungErledigt(id))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    await laden()
  }

  const setF = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const kundensatz = regie ? Math.round(regie.partnersatz * (1 + regie.aufschlag / 100) * 100) / 100 : 0
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
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-text)' }}>
            Noch kein Partner eingesetzt. Über „Einsatz“ bekommt ein Partner die Anweisung mit EK.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {einsaetze.map((e) => {
              const st = STATUS[e.status] ?? STATUS.gesendet
              const wann = [datum(e.termin_von), datum(e.termin_bis)].filter(Boolean).join(' bis ')
              return (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{e.partner_name}</div>
                    <div style={{ color: 'var(--text-2)' }}>{e.titel}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
                      {[wann, e.ek_betrag != null ? `EK ${formatEuro(e.ek_betrag)} ${e.ek_art}` : '']
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    {e.status === 'abgelehnt' && e.ablehnung_grund ? (
                      <div style={{ color: 'var(--red-tx)', fontSize: 'var(--fs-meta)' }}>
                        Grund: {e.ablehnung_grund}
                      </div>
                    ) : null}
                    {e.status === 'fertig' && e.fertig_text ? (
                      <div style={{ fontSize: 'var(--fs-meta)', whiteSpace: 'pre-wrap' }}>{e.fertig_text}</div>
                    ) : null}
                    {e.fertig_dateien.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 'var(--fs-meta)' }}>
                        {e.fertig_dateien.map((d) => (
                          <a key={d.url} href={d.url} target="_blank" rel="noreferrer">
                            {d.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {e.mitteilungen
                      .filter((m) => m.status === 'offen')
                      .map((m) => (
                        <div key={m.id} style={{ marginTop: 6, fontSize: 'var(--fs-meta)' }}>
                          <b>{m.typ === 'regie' ? `Regie ${m.stunden ?? ''} Std` : 'Behinderung'}:</b> {m.text}
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            {m.typ === 'regie' ? (
                              <MockBtn
                                sm
                                kind="primary"
                                onClick={() => {
                                  setRegie({
                                    m,
                                    titel: `Regie: ${m.text.slice(0, 60)}`,
                                    stunden: m.stunden ?? 1,
                                    partnersatz: 0,
                                    aufschlag: 20,
                                  })
                                }}
                              >
                                Als Regie übernehmen
                              </MockBtn>
                            ) : null}
                            <MockBtn sm kind="ghost" onClick={() => { erledigt(m.id) }}>
                              {m.typ === 'regie' ? 'Verwerfen' : 'Erledigt'}
                            </MockBtn>
                          </div>
                        </div>
                      ))}
                    {e.rechnung_eingereicht_at ? (
                      <div style={{ fontSize: 'var(--fs-meta)' }}>
                        Partner-Rechnung
                        {e.rechnung_betrag != null ? ` ${formatEuro(e.rechnung_betrag)}` : ''}
                        {e.rechnung_pdf_url ? (
                          <>
                            {' '}
                            <a href={e.rechnung_pdf_url} target="_blank" rel="noreferrer">
                              PDF öffnen
                            </a>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <MockBadge kind={st.kind}>{st.label}</MockBadge>
                    {e.status === 'gesendet' || e.status === 'abgelehnt' ? (
                      <MockBtn sm kind="ghost" onClick={() => { zurueckziehen(e.id) }}>
                        Zurückziehen
                      </MockBtn>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

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

      <EditorSheet
        open={Boolean(regie)}
        onClose={() => setRegie(null)}
        title="Regie übernehmen"
        crumb={regie ? regie.m.text : undefined}
        secondary={{ label: 'Abbrechen', disabled: saving, kind: 'ghost' }}
        primary={{
          label: 'In den Auftrag übernehmen',
          icon: 'check',
          disabled: !regie || saving || !(regie.stunden > 0) || !(regie.partnersatz > 0),
          busy: saving,
          onClick: () => { regieSpeichern() },
        }}
      >
        {regie ? (
          <>
            <MockField label="Bezeichnung">
              <MockInput value={regie.titel} onChange={(ev) => setRegie({ ...regie, titel: ev.target.value })} />
            </MockField>
            <MockField label="Stunden">
              <ClearableNumberInput
                className="txt"
                min={0}
                value={regie.stunden}
                onValueChange={(v) => setRegie({ ...regie, stunden: Number(v) || 0 })}
                style={{ textAlign: 'right' }}
              />
            </MockField>
            <MockField label="Partnersatz € je Stunde (EK)">
              <ClearableNumberInput
                className="txt"
                min={0}
                value={regie.partnersatz}
                onValueChange={(v) => setRegie({ ...regie, partnersatz: Number(v) || 0 })}
                style={{ textAlign: 'right' }}
              />
            </MockField>
            <MockField label="Aufschlag %">
              <ClearableNumberInput
                className="txt"
                min={0}
                value={regie.aufschlag}
                onValueChange={(v) => setRegie({ ...regie, aufschlag: Number(v) || 0 })}
                style={{ textAlign: 'right' }}
              />
            </MockField>
            <p style={{ margin: 0, fontSize: 'var(--fs-text)' }}>
              Kundensatz {formatEuro(kundensatz)} je Stunde, Position{' '}
              <b>{formatEuro(Math.round(regie.stunden * kundensatz * 100) / 100)} netto</b>. Der Kunde muss nicht
              zustimmen; danach den Auftrag erneut senden.
            </p>
          </>
        ) : null}
      </EditorSheet>
    </>
  )
}
