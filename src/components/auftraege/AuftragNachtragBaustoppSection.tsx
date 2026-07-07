'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import { Textarea } from '@/components/ui/Textarea'
import {
  type BaustoppTyp,
  beendeBaustopp,
  createBaustopp,
  createNachtragManuell,
  markNachtragGesendet,
  sendNachtragEmailAnKunde,
  sendNachtragErinnerungAnKunde,
  updateNachtragHandwercherBestaetigt,
} from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { genehmigeOrgNachtrag } from '@/lib/org/nachtrag-org-freigabe-actions'
import {
  AlertTriangle,
  Check,
  Clock,
  CloudRain,
  Mail,
  Send,
  Smartphone,
  X,
} from 'lucide-react'
import { IconText } from '@/components/ui/IconText'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { neuePositionsId } from '@/lib/angebot-positionen'
import type { AuftragDetail, AngebotPosition } from '@/lib/types'
import { formatDatum, formatDatumZeit, formatPreis } from '@/lib/utils'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

function nachtragPublicUrl(token: string) {
  const b = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  if (b) return `${b}/nachtrag/${token}`
  if (typeof window !== 'undefined') return `${window.location.origin}/nachtrag/${token}`
  return `/nachtrag/${token}`
}

function baustoppTypLabel(typ: string) {
  if (typ === 'witterung') return 'Witterung'
  if (typ === 'material') return 'Material nicht geliefert'
  if (typ === 'zugang') return 'Kein Zugang zur Baustelle'
  return 'Sonstiges'
}

function addDays(iso: string | null | undefined, days: number) {
  const s = iso?.trim()
  const d0 = s ? new Date(s.includes('T') ? s : `${s}T12:00:00`) : new Date()
  const d = new Date(d0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function seitText(iso: string | null) {
  if (!iso) return ''
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 1) return 'weniger als 1 Stunde'
  if (h < 48) return `${Math.floor(h)} Stunden`
  return `${Math.floor(h / 24)} Tagen`
}

export function AuftragNachtragBaustoppSection({
  detail,
  onChanged,
}: {
  detail: AuftragDetail
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [nachtragOpen, setNachtragOpen] = useState(false)
  const [grund, setGrund] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [posText, setPosText] = useState('')
  const [posMin, setPosMin] = useState('')
  const [posMax, setPosMax] = useState('')
  const [hwBest, setHwBest] = useState(false)

  const [baustoppOpen, setBaustoppOpen] = useState(false)
  const [bsTyp, setBsTyp] = useState<BaustoppTyp>('witterung')
  const [bsGrund, setBsGrund] = useState('')
  const [bsBeginn, setBsBeginn] = useState(() => new Date().toISOString().slice(0, 10))
  const [bsVerzug, setBsVerzug] = useState(3)
  const [bsKundeInfo, setBsKundeInfo] = useState(true)

  const nachtraege = useMemo(
    () =>
      [...(detail.nachtraege ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [detail.nachtraege]
  )

  const baustopps = detail.baustopps ?? []
  const aktiv = baustopps.filter((b) => !b.ende_datum)
  const summeVerzug = baustopps.reduce((s, b) => s + (b.verzoegerung_tage ?? 0), 0)

  const hwWarn = nachtraege.find(
    (n) => n.status === 'akzeptiert' && n.kunde_bestaetigt_at && !n.handwercher_bestaetigt
  )
  const ersteHw = detail.auftrag_handwerker?.[0]

  const basisEnd = detail.end_datum ?? new Date().toISOString().slice(0, 10)
  const neuesEndPreview = addDays(basisEnd, bsVerzug)

  function buildPosition(): AngebotPosition {
    const gw = detail.auftrag_handwerker?.[0]
    const min = Math.max(0, Number(String(posMin).replace(',', '.')) || 0)
    const max = Math.max(min, Number(String(posMax).replace(',', '.')) || min)
    const fest = Math.round(((min + max) / 2) * 100) / 100
    return {
      id: neuePositionsId(),
      gewerk_id: gw?.gewerk_id ?? '',
      gewerk_name: gw?.gewerke?.name ?? 'Nachtrag',
      leistung: 'Nachtrag',
      beschreibung: posText.trim() || grund.trim() || 'Zusatzleistung',
      lohn_netto: fest,
      material_netto: 0,
      gesamt_min: fest,
      gesamt_max: fest,
      menge: 1,
      einheit: 'Stk.',
      preis_typ: 'fix',
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('In Zwischenablage kopiert')
    } catch {
      toast.error('Kopieren nicht möglich')
    }
  }

  return (
    <div className="space-y-6 border-b border-border pb-8">
      {hwWarn ? (
        <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            <IconText icon={AlertTriangle}>Kunden-Bestätigung liegt vor</IconText>
          </p>
          <p className="mt-1">
            Handwerker {ersteHw?.handwerker?.name ?? '(nicht zugeordnet)'} hat die Mehrkosten noch nicht bestätigt.
          </p>
          {ersteHw?.handwerker?.telefon ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                className="inline-flex min-h-[40px] items-center rounded-lg bg-primary px-3 text-sm font-medium text-white"
                href={`https://wa.me/${ersteHw.handwerker.telefon.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Handwerker kontaktieren (WhatsApp)
              </a>
              <a
                className="inline-flex min-h-[40px] items-center rounded-lg border border-border px-3 text-sm font-medium text-primary"
                href={`tel:${ersteHw.handwerker.telefon}`}
              >
                Anrufen
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Nachträge</h2>
          <Button type="button" variant="primary" onClick={() => setNachtragOpen(true)}>
            Nachtrag anlegen
          </Button>
        </div>

        {nachtraege.length === 0 ? (
          <p className="text-sm text-muted">Keine Nachträge.</p>
        ) : (
          <ul className="space-y-3">
            {nachtraege.map((n) => {
              const pos = normalizeAngebotPositionen(n.positionen ?? [])
              const link = n.token ? nachtragPublicUrl(n.token) : ''
              const summe = formatPreis(undefined, n.gesamt_min, n.gesamt_max)

              return (
                <Card key={n.id} className="space-y-3 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{n.grund}</p>
                      {n.beschreibung ? <p className="text-muted">{n.beschreibung}</p> : null}
                      <p className="mt-1 text-xs text-muted">Summe: {summe}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(n.handwercher_bestaetigt)}
                        disabled={pending}
                        onChange={(e) => {
                          startTransition(async () => {
                            const r = await updateNachtragHandwercherBestaetigt(n.id, detail.id, e.target.checked)
                            if (!r.ok) toast.error(r.message)
                            else onChanged()
                          })
                        }}
                      />
                      HW hat bestätigt
                    </label>
                  </div>

                  {pos.length > 0 ? (
                    <ul className="divide-y divide-border rounded border border-border text-xs">
                      {pos.map((p) => (
                        <li key={p.id} className="flex justify-between gap-2 px-2 py-1">
                          <span className="min-w-0 truncate">{p.beschreibung}</span>
                          <span className="shrink-0 whitespace-nowrap text-muted">
                            {p.menge} {p.einheit} ·{' '}
                            {formatPreis(undefined, p.gesamt_min * p.menge, p.gesamt_max * p.menge)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {n.status === 'abgelehnt' ? (
                    <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                      <p className="font-medium">
                        <IconText icon={X}>Abgelehnt</IconText>
                      </p>
                      <p>{n.abgelehnt_grund ?? '—'}</p>
                    </div>
                  ) : n.status === 'akzeptiert' || n.kunde_bestaetigt_at ? (
                    <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                      <p className="font-medium">
                        <IconText icon={Check}>Akzeptiert</IconText>
                      </p>
                      <p>
                        Bestätigt am{' '}
                        {n.kunde_bestaetigt_at
                          ? formatDatumZeit(n.kunde_bestaetigt_at)
                          : n.akzeptiert_at
                            ? formatDatumZeit(n.akzeptiert_at)
                            : '—'}
                      </p>
                      {n.kunde_ip ? <p className="mt-1">IP: {n.kunde_ip} (gespeichert)</p> : null}
                      {detail.lead_id && n.status !== 'genehmigt' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          loading={pending}
                          onClick={() => {
                            startTransition(async () => {
                              const r = await genehmigeOrgNachtrag(n.id, detail.id)
                              if (!r.ok) toast.error(r.message)
                              else {
                                toast.success('Nachtrag genehmigt — Org-Freigabe geprüft')
                                onChanged()
                              }
                            })
                          }}
                        >
                          CRM: Nachtrag genehmigen
                        </Button>
                      ) : null}
                    </div>
                  ) : n.status === 'gesendet' ? (
                    <div className="space-y-2 rounded border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                      <p className="font-medium">
                        <IconText icon={Send}>Gesendet</IconText>
                      </p>
                      <p>Wartet auf Kunden-Bestätigung · seit {seitText(n.gesendet_at)}</p>
                      {link ? (
                        <div className="mt-2 space-y-2 rounded border border-border bg-surface p-2 text-ink">
                          <p className="font-semibold">Kunden-Link</p>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" onClick={() => void copyText(link)}>
                              Link kopieren
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              loading={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  const r = await sendNachtragEmailAnKunde(n.id, detail.id)
                                  if (!r.ok) toast.error(r.message)
                                  else {
                                    toast.success('E-Mail versendet')
                                    onChanged()
                                  }
                                })
                              }}
                            >
                              <IconText icon={Mail}>Per Mail senden</IconText>
                            </Button>
                            <a
                              className="inline-flex min-h-[40px] items-center rounded-lg border border-border px-3 text-sm font-medium text-primary"
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `Guten Tag, hier ist Ihr Link zur Bestätigung des Nachtrags (${summe}): ${link}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IconText icon={Smartphone}>WhatsApp</IconText>
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="mt-1"
                            loading={pending}
                            onClick={() => {
                              startTransition(async () => {
                                const r = await sendNachtragErinnerungAnKunde(n.id, detail.id)
                                if (!r.ok) toast.error(r.message)
                                else {
                                  toast.success('Erinnerung gesendet')
                                  onChanged()
                                }
                              })
                            }}
                          >
                            Erinnern
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded bg-canvas px-2 py-2 text-xs text-muted">
                      <p className="font-medium text-ink">
                        <IconText icon={Clock}>Entwurf</IconText>
                      </p>
                      <p>Noch nicht gesendet.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-2"
                        loading={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const r = await markNachtragGesendet(n.id, detail.id)
                            if (!r.ok) toast.error(r.message)
                            else {
                              toast.success('Als gesendet markiert')
                              onChanged()
                            }
                          })
                        }}
                      >
                        Senden
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </ul>
        )}
      </section>

      {detail.status === 'in_arbeit' ? (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Baustopps</h2>
            <Button type="button" variant="secondary" onClick={() => setBaustoppOpen(true)}>
              <IconText icon={CloudRain}>Baustopp melden</IconText>
            </Button>
          </div>
          {aktiv.length > 0 ? (
            <div className="mb-3 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-950">
              <p className="font-semibold">
                <IconText icon={CloudRain}>Baustopp aktiv seit {formatDatum(aktiv[0]!.beginn_datum)}</IconText>
              </p>
              <p className="text-xs">{aktiv[0]!.grund}</p>
              {aktiv.map((b) => (
                <Button
                  key={b.id}
                  type="button"
                  variant="secondary"
                  className="mt-2"
                  loading={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await beendeBaustopp(b.id, detail.id)
                      if (!r.ok) toast.error(r.message)
                      else {
                        toast.success('Baustopp beendet')
                        onChanged()
                      }
                    })
                  }}
                >
                  Baustopp beenden
                </Button>
              ))}
            </div>
          ) : null}
          {baustopps.length === 0 ? (
            <p className="text-sm text-muted">Keine Baustopps erfasst.</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {baustopps.map((b) => (
                  <li key={b.id} className="rounded border border-border p-2">
                    <p className="font-medium">
                      {baustoppTypLabel(b.typ)} · {formatDatum(b.beginn_datum)}
                      {b.ende_datum ? ` – ${formatDatum(b.ende_datum)}` : ' (offen)'}
                    </p>
                    <p className="text-muted">{b.grund}</p>
                    <p className="text-xs text-muted">
                      Verzögerung: {b.verzoegerung_tage ?? '—'} Tage
                      {b.neues_enddatum ? ` · neues Ende: ${formatDatum(b.neues_enddatum)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-medium text-ink">
                Bisher {summeVerzug} Tage Verzögerung durch Baustopps
              </p>
            </>
          )}
        </section>
      ) : null}

      <Modal open={nachtragOpen} onClose={() => setNachtragOpen(false)} title="Nachtrag erstellen" size="md">
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="font-medium">Grund</span>
                <input
                  value={grund}
                  onChange={(e) => setGrund(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <Textarea
                label="Beschreibung"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                rows={3}
              />
              <Textarea
                label="Position (Beschreibung)"
                value={posText}
                onChange={(e) => setPosText(e.target.value)}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="font-medium">Preis min (€)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={posMin}
                    onChange={(e) => setPosMin(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="font-medium">Preis max (€)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={posMax}
                    onChange={(e) => setPosMax(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={hwBest} onChange={(e) => setHwBest(e.target.checked)} />
                <span>
                  Handwerker hat die Mehrkosten bestätigt?{' '}
                  <span className="text-muted">(manuell setzen)</span>
                </span>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setNachtragOpen(false)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                loading={pending}
                onClick={() => {
                  if (!grund.trim()) {
                    toast.error('Grund ausfüllen')
                    return
                  }
                  startTransition(async () => {
                    const r = await createNachtragManuell({
                      auftragId: detail.id,
                      grund: grund.trim(),
                      beschreibung: beschreibung.trim(),
                      positionen: [buildPosition()],
                      handwercher_bestaetigt: hwBest,
                    })
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Nachtrag gespeichert')
                      setNachtragOpen(false)
                      setGrund('')
                      setBeschreibung('')
                      setPosText('')
                      setPosMin('')
                      setPosMax('')
                      setHwBest(false)
                      onChanged()
                    }
                  })
                }}
              >
                Speichern
              </Button>
            </div>
      </Modal>

      <Modal
        open={baustoppOpen && detail.status === 'in_arbeit'}
        onClose={() => setBaustoppOpen(false)}
        title="Baustopp melden"
        size="md"
      >
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="font-medium">Typ</span>
                <select
                  value={bsTyp}
                  onChange={(e) => setBsTyp(e.target.value as BaustoppTyp)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                >
                  <option value="witterung">Witterung</option>
                  <option value="material">Material nicht geliefert</option>
                  <option value="zugang">Kein Zugang zur Baustelle</option>
                  <option value="sonstiges">Sonstiges</option>
                </select>
              </label>
              <Textarea
                label="Grund"
                value={bsGrund}
                onChange={(e) => setBsGrund(e.target.value)}
                rows={3}
                placeholder="Was genau verhindert die Arbeiten?"
              />
              <label className="block">
                <span className="font-medium">Beginn</span>
                <input
                  type="date"
                  value={bsBeginn}
                  onChange={(e) => setBsBeginn(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="font-medium">Verzögerung (Tage)</span>
                <input
                  type="number"
                  min={0}
                  value={bsVerzug}
                  onChange={(e) => setBsVerzug(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <p className="text-xs text-muted">
                Aktuelles Enddatum Auftrag: <strong>{detail.end_datum ? formatDatum(detail.end_datum) : '—'}</strong>
              </p>
              <p className="text-xs text-muted">
                Neues Enddatum (Vorschau): <strong>{formatDatum(neuesEndPreview)}</strong>
              </p>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={bsKundeInfo} onChange={(e) => setBsKundeInfo(e.target.checked)} />
                Kundin informieren (E-Mail)
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setBaustoppOpen(false)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                loading={pending}
                onClick={() => {
                  if (!bsGrund.trim()) {
                    toast.error('Grund ausfüllen')
                    return
                  }
                  startTransition(async () => {
                    const r = await createBaustopp({
                      auftragId: detail.id,
                      typ: bsTyp,
                      grund: bsGrund.trim(),
                      beginn_datum: bsBeginn,
                      ende_datum: null,
                      neues_enddatum: neuesEndPreview,
                      kunde_informiert: bsKundeInfo,
                    })
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Baustopp gespeichert')
                      setBaustoppOpen(false)
                      setBsGrund('')
                      setBsVerzug(3)
                      onChanged()
                    }
                  })
                }}
              >
                Speichern
              </Button>
            </div>
      </Modal>
    </div>
  )
}
