'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, Copy, Download, ImageIcon, Shield, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  exportMelderAuskunft,
  loescheMelderDaten,
} from '@/app/(dashboard)/einstellungen/datenschutz/actions'
import { fotosAusMelderFunnel, istMelderKanal } from '@/lib/datenschutz/melder-leads'
import {
  disponiereHavarieNotmassnahme,
  leadIstHavarie,
  schlageKostentraegerVor,
} from '@/lib/org/hv-lead-actions'
import {
  ANLASS_LABELS,
  buildEinladungErgaenzenLink,
  buildMeldeLink,
  EINLADUNG_STATUS_LABELS,
  ERFASSUNG_VON_LABELS,
  HV_MELDUNG_STATUS_LABELS,
  KOSTENTRAEGER_LABELS,
  ORG_FREIGABE_LABELS,
} from '@/lib/org/org-portal-helpers'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import { formatDatumZeit } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import type { LeadDetail, OrgFreigabeLogRow } from '@/lib/types'

function orgFreigabeBadgeStatus(
  status: LeadDetail['org_freigabe_status']
): 'done' | 'offer' | 'cancel' | 'order' {
  if (status === 'freigegeben' || status === 'nicht_noetig') return 'done'
  if (status === 'ausstehend') return 'offer'
  if (status === 'abgelehnt') return 'cancel'
  return 'order'
}

export function LeadOrgKontextBlock({ lead }: { lead: LeadDetail }) {
  const router = useRouter()
  const [fotoIdx, setFotoIdx] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const auftraggeber = lead.auftraggeber
  const objekt = lead.kunden_objekte
  const fotos = fotosAusMelderFunnel(lead.funnel_daten)
  const istMelderLead = istMelderKanal(lead.kanal)
  const anlass = lead.anlass
  const zeigtMelder = anlass === 'meldung' || Boolean(lead.melder_name || lead.melder_email)
  const zeigtServicepaket = anlass === 'servicepaket'
  const fd = (lead.funnel_daten && typeof lead.funnel_daten === 'object'
    ? lead.funnel_daten
    : {}) as Record<string, unknown>

  async function kopieren(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} kopiert`)
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  async function melderAuskunftExport() {
    setBusy('auskunft')
    const r = await exportMelderAuskunft(lead.id)
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    const blob = new Blob([r.text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `melder-auskunft-${lead.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Auskunft exportiert')
  }

  async function melderDatenLoeschen(kategorie: 'melder_leads_offen' | 'melder_leads_abgeschlossen' | 'melder_fotos') {
    const labels = {
      melder_fotos: 'Melder-Fotos',
      melder_leads_offen: 'Melderdaten (vollständig)',
      melder_leads_abgeschlossen: 'Melderdaten (vollständig)',
    }
    if (!window.confirm(`${labels[kategorie]} wirklich löschen/anonymisieren?`)) return
    setBusy(kategorie)
    const r = await loescheMelderDaten(lead.id, kategorie, 'betroffenenanfrage')
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Verarbeitet')
    router.refresh()
  }

  const melderLoeschKategorie =
    lead.status === 'abgeschlossen' ? 'melder_leads_abgeschlossen' : 'melder_leads_offen'

  const hvStatus = (lead as { hv_meldung_status?: string }).hv_meldung_status ?? ''
  const istHavarie = leadIstHavarie(lead)
  const zeigtHavarieAktionen =
    istHavarie && hvStatus !== 'notmassnahme' && hvStatus !== 'abgeschlossen'

  const hatOrgKontext =
    auftraggeber ||
    zeigtMelder ||
    objekt ||
    fotos.length > 0 ||
    lead.org_freigabe_status === 'ausstehend' ||
    (lead.org_freigabe_log?.length ?? 0) > 0 ||
    zeigtHavarieAktionen

  if (!hatOrgKontext && !anlass) return null

  return (
    <div className="space-y-3">
      {anlass || lead.erfassung_von || lead.org_freigabe_status ? (
        <Card title="Auftraggeber-Kontext">
          <div className="flex flex-wrap gap-2">
            {anlass ? (
              <StatusBadge status="order" label={ANLASS_LABELS[anlass] ?? anlass} />
            ) : null}
            {lead.erfassung_von ? (
              <StatusBadge
                status="done"
                label={`Erfasst: ${ERFASSUNG_VON_LABELS[lead.erfassung_von] ?? lead.erfassung_von}`}
              />
            ) : null}
            {lead.org_freigabe_status && lead.org_freigabe_status !== 'nicht_noetig' ? (
              <StatusBadge
                status={orgFreigabeBadgeStatus(lead.org_freigabe_status)}
                label={ORG_FREIGABE_LABELS[lead.org_freigabe_status]}
              />
            ) : null}
            {(lead as { hv_meldung_status?: string }).hv_meldung_status ? (
              <StatusBadge
                status="offer"
                label={`HV-Status: ${HV_MELDUNG_STATUS_LABELS[(lead as { hv_meldung_status: string }).hv_meldung_status] ?? (lead as { hv_meldung_status: string }).hv_meldung_status}`}
              />
            ) : null}
            {(lead as { kostentraeger?: string }).kostentraeger ? (
              <StatusBadge
                status="done"
                label={`Kostenträger: ${KOSTENTRAEGER_LABELS[(lead as { kostentraeger: string }).kostentraeger] ?? (lead as { kostentraeger: string }).kostentraeger}`}
              />
            ) : null}
            {lead.einladung_status ? (
              <StatusBadge
                status={lead.einladung_status === 'offen' ? 'offer' : 'done'}
                label={EINLADUNG_STATUS_LABELS[lead.einladung_status] ?? lead.einladung_status}
              />
            ) : null}
          </div>
        </Card>
      ) : null}

      {auftraggeber ? (
        <Card
          title={
            <>
              <Building2 className="inline h-4 w-4 text-bw-primary" aria-hidden /> Auftraggeber
            </>
          }
        >
          <dl className="space-y-1.5 text-[13px]">
            <div>
              <dt className="text-bw-text-muted">Organisation</dt>
              <dd className="font-medium text-bw-text">
                {auftraggeber.org_anzeigename?.trim() || auftraggeber.name}
              </dd>
            </div>
            {auftraggeber.org_kennung ? (
              <div>
                <dt className="text-bw-text-muted">Org-Kennung</dt>
                <dd className="text-bw-text">{auftraggeber.org_kennung}</dd>
              </div>
            ) : null}
            <div>
              <Link href={`/kunden/${auftraggeber.id}`} className="text-bw-primary hover:underline">
                Kundenstamm öffnen →
              </Link>
            </div>
            {auftraggeber.org_kennung ? (
              <div className="pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[12px] text-bw-primary hover:underline"
                  onClick={() => void kopieren(buildMeldeLink(auftraggeber.org_kennung!), 'Melde-Link')}
                >
                  <Copy className="h-3 w-3" aria-hidden />
                  Melde-Link kopieren
                </button>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}

      {zeigtMelder ? (
        <Card
          title={
            <>
              <User className="inline h-4 w-4 text-bw-primary" aria-hidden /> Melder
            </>
          }
        >
          <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
            {lead.melder_name ? (
              <div>
                <dt className="text-bw-text-muted">Name</dt>
                <dd>{lead.melder_name}</dd>
              </div>
            ) : null}
            {lead.melder_einheit ? (
              <div>
                <dt className="text-bw-text-muted">Einheit</dt>
                <dd>{lead.melder_einheit}</dd>
              </div>
            ) : null}
            {lead.melder_telefon ? (
              <div>
                <dt className="text-bw-text-muted">Telefon</dt>
                <dd>{lead.melder_telefon}</dd>
              </div>
            ) : null}
            {lead.melder_email ? (
              <div>
                <dt className="text-bw-text-muted">E-Mail</dt>
                <dd>{lead.melder_email}</dd>
              </div>
            ) : null}
          </dl>
          {lead.einladung_token && lead.einladung_status === 'offen' ? (
            <div className="mt-3 border-t border-bw-border pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  void kopieren(buildEinladungErgaenzenLink(lead.einladung_token!), 'Einladungslink')
                }
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Einladungslink kopieren
              </Button>
            </div>
          ) : null}
          {istMelderLead ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-bw-border pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                loading={busy === 'auskunft'}
                onClick={() => void melderAuskunftExport()}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Melder-Auskunft
              </Button>
              {fotos.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={busy === 'melder_fotos'}
                  onClick={() => void melderDatenLoeschen('melder_fotos')}
                >
                  Fotos löschen
                </Button>
              ) : null}
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="gap-1.5"
                loading={busy === melderLoeschKategorie}
                onClick={() => void melderDatenLoeschen(melderLoeschKategorie)}
              >
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Melderdaten löschen
              </Button>
              <Link
                href="/einstellungen/integration?section=datenschutz"
                className="inline-flex items-center text-[12px] text-bw-primary hover:underline"
              >
                Datenschutz-Modul →
              </Link>
            </div>
          ) : null}
        </Card>
      ) : null}

      {objekt ? (
        <Card title="Objekt">
          <p className="text-[13px] font-medium text-bw-text">{objekt.titel}</p>
          <p className="mt-1 text-[12px] text-bw-text-muted">
            {[kundenObjektStrasseZeile(objekt), [objekt.plz, objekt.ort].filter(Boolean).join(' ')]
              .filter(Boolean)
              .join(', ') || '—'}
          </p>
          {objekt.einheiten_hinweis ? (
            <p className="mt-1 text-[12px] text-bw-text-muted">{objekt.einheiten_hinweis}</p>
          ) : null}
        </Card>
      ) : null}

      {zeigtServicepaket ? (
        <Card title="Servicepaket">
          <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
            {lead.service_modus ? (
              <div>
                <dt className="text-bw-text-muted">Modus</dt>
                <dd>{lead.service_modus === 'paket' ? 'Paket' : 'Einzeln'}</dd>
              </div>
            ) : null}
            {fd.hausservice_stufe ? (
              <div>
                <dt className="text-bw-text-muted">Stufe</dt>
                <dd>{String(fd.hausservice_stufe)}</dd>
              </div>
            ) : null}
            {fd.wohnflaeche != null ? (
              <div>
                <dt className="text-bw-text-muted">Wohnfläche</dt>
                <dd>{String(fd.wohnflaeche)} m²</dd>
              </div>
            ) : null}
            {fd.garten_qm != null ? (
              <div>
                <dt className="text-bw-text-muted">Garten</dt>
                <dd>{String(fd.garten_qm)} m²</dd>
              </div>
            ) : null}
            {lead.preis_min != null || lead.preis_max != null ? (
              <div className="sm:col-span-2">
                <dt className="text-bw-text-muted">Monatsband</dt>
                <dd>
                  {lead.preis_min != null ? `${lead.preis_min} €` : '—'}
                  {' – '}
                  {lead.preis_max != null ? `${lead.preis_max} €` : '—'}
                  {' / Monat'}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}

      {fotos.length > 0 ? (
        <Card
          title={
            <>
              <ImageIcon className="inline h-4 w-4 text-bw-primary" aria-hidden /> Fotos ({fotos.length})
            </>
          }
        >
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fotos.map((url, i) => (
              <button
                key={url}
                type="button"
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${
                  i === fotoIdx ? 'border-bw-primary ring-2 ring-bw-primary/30' : 'border-bw-border'
                }`}
                onClick={() => setFotoIdx(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {fotos[fotoIdx] ? (
            <a
              href={fotos[fotoIdx]}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block overflow-hidden rounded-lg border border-bw-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotos[fotoIdx]} alt="Meldungsfoto" className="max-h-72 w-full object-contain" />
            </a>
          ) : null}
        </Card>
      ) : null}

      {zeigtHavarieAktionen ? (
        <Card title="Havarie / Notmaßnahme">
          <p className="mb-3 text-[13px] text-bw-text-muted">
            Bei Havarie darf das CRM eine Notmaßnahme vor HV-Freigabe disponieren. Die HV wird
            informiert; Folgearbeiten über der Schwelle laufen über den Angebotsweg.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={busy === 'notmassnahme'}
              onClick={() => {
                setBusy('notmassnahme')
                void disponiereHavarieNotmassnahme(lead.id).then((r) => {
                  setBusy(null)
                  if (!r.ok) toast.error(r.message)
                  else {
                    toast.success('Notmaßnahme disponiert')
                    router.refresh()
                  }
                })
              }}
            >
              Notmaßnahme disponieren
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busy === 'kt-versicherung'}
              onClick={() => {
                setBusy('kt-versicherung')
                void schlageKostentraegerVor(lead.id, 'versicherung').then((r) => {
                  setBusy(null)
                  if (!r.ok) toast.error(r.message)
                  else {
                    toast.success('Kostenträger Versicherung vorgeschlagen')
                    router.refresh()
                  }
                })
              }}
            >
              KT: Versicherung vorschlagen
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busy === 'kt-se'}
              onClick={() => {
                setBusy('kt-se')
                void schlageKostentraegerVor(lead.id, 'sondereigentum').then((r) => {
                  setBusy(null)
                  if (!r.ok) toast.error(r.message)
                  else {
                    toast.success('Kostenträger SE vorgeschlagen')
                    router.refresh()
                  }
                })
              }}
            >
              KT: SE vorschlagen
            </Button>
          </div>
        </Card>
      ) : null}

      {(lead as { duplikat_hinweis?: boolean }).duplikat_hinweis ? (
        <Card title="Duplikat-Hinweis">
          <p className="text-[13px] text-amber-900">
            In den letzten 24 Stunden wurde für dieselbe Einheit bereits eine Meldung erfasst. Kein
            Block — bitte prüfen.
          </p>
        </Card>
      ) : null}

      {lead.org_freigabe_log && lead.org_freigabe_log.length > 0 ? (
        <Card title="Freigabe-Verlauf">
          <ul className="divide-y divide-bw-border text-[12px]">
            {lead.org_freigabe_log.map((e: OrgFreigabeLogRow) => (
              <li key={e.id} className="flex justify-between gap-3 py-2">
                <span className="capitalize text-bw-text">{e.aktion}</span>
                <span className="shrink-0 text-bw-text-muted">{formatDatumZeit(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
