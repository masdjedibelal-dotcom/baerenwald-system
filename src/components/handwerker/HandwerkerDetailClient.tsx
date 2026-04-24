'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RecordLayout } from '@/components/layout/RecordLayout'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ComplianceBadge } from '@/components/handwerker/ComplianceBadge'
import { HandwerkerComplianceTab } from '@/components/handwerker/HandwerkerComplianceTab'
import type { HandwerkerDetailPayload } from '@/app/(dashboard)/handwerker/actions'
import {
  updateHandwerker,
  updateHandwerkerNotizen,
  type HandwerkerFormInput,
} from '@/app/(dashboard)/handwerker/actions'
import type { Handwerker } from '@/lib/types'
import { cn } from '@/lib/utils'

function gewerkTagsFromSlugs(
  gewerke: unknown,
  slugToName: Map<string, string>
): string[] {
  if (gewerke == null) return []
  if (Array.isArray(gewerke)) {
    return gewerke
      .map((x) => {
        if (typeof x === 'string') return slugToName.get(x.toLowerCase()) ?? x
        return ''
      })
      .filter(Boolean)
  }
  if (typeof gewerke === 'string') {
    try {
      const p = JSON.parse(gewerke) as unknown
      return gewerkTagsFromSlugs(p, slugToName)
    } catch {
      return gewerke.trim() ? [gewerke] : []
    }
  }
  return []
}

function isAuftragAbgeschlossen(auftragStatus: string): boolean {
  return auftragStatus === 'abgeschlossen' || auftragStatus === 'storniert'
}

export function HandwerkerDetailClient({
  payload,
  gewerkeSlugs,
}: {
  payload: HandwerkerDetailPayload
  gewerkeSlugs: { slug: string; name: string }[]
}) {
  const router = useRouter()
  const hw = payload.handwerker as Handwerker
  const slugToName = useMemo(
    () => new Map(gewerkeSlugs.map((g) => [g.slug.toLowerCase(), g.name])),
    [gewerkeSlugs]
  )
  const gewerkNamen = useMemo(() => gewerkTagsFromSlugs(hw.gewerke, slugToName), [hw.gewerke, slugToName])

  const [tab, setTab] = useState<'auftraege' | 'notizen' | 'compliance'>('auftraege')
  const [notizen, setNotizen] = useState(hw.notizen ?? '')
  const notizenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const [formName, setFormName] = useState(hw.name)
  const [formFirma, setFormFirma] = useState(hw.firma ?? '')
  const [formTelefon, setFormTelefon] = useState(hw.telefon ?? '')
  const [formEmail, setFormEmail] = useState(hw.email ?? '')
  const [formAdresse, setFormAdresse] = useState(hw.adresse ?? '')

  useEffect(() => {
    setNotizen(hw.notizen ?? '')
  }, [hw.id, hw.notizen])

  useEffect(() => {
    if (modalOpen) {
      setFormName(hw.name)
      setFormFirma(hw.firma ?? '')
      setFormTelefon(hw.telefon ?? '')
      setFormEmail(hw.email ?? '')
      setFormAdresse(hw.adresse ?? '')
      setErr(null)
    }
  }, [modalOpen, hw])

  useEffect(() => {
    if (notizenTimer.current) clearTimeout(notizenTimer.current)
    notizenTimer.current = setTimeout(() => {
      const t = notizen.trim()
      if (t === (hw.notizen ?? '').trim()) return
      void (async () => {
        const r = await updateHandwerkerNotizen(hw.id, t || null)
        if (!r.ok) setErr(r.message)
        else router.refresh()
      })()
    }, 800)
    return () => {
      if (notizenTimer.current) clearTimeout(notizenTimer.current)
    }
  }, [notizen, hw.id, hw.notizen, router])

  const { aktiv: aktivAuftraege, fertig: fertigeAuftraege } = useMemo(() => {
    type AuftragZeile = HandwerkerDetailPayload['auftraege'][number]
    const aktiv: AuftragZeile[] = []
    const fertig: AuftragZeile[] = []
    for (const a of payload.auftraege) {
      if (isAuftragAbgeschlossen(a.auftrag_status)) fertig.push(a)
      else aktiv.push(a)
    }
    return { aktiv, fertig }
  }, [payload.auftraege])

  const saveKontaktModal = useCallback(() => {
    if (!formName.trim() || !formTelefon.trim()) {
      setErr('Name und Telefon sind Pflichtfelder.')
      return
    }
    const input: HandwerkerFormInput = {
      name: formName.trim(),
      firma: formFirma.trim() || null,
      email: formEmail.trim() || null,
      telefon: formTelefon.trim(),
      whatsapp: hw.whatsapp?.trim() || null,
      webseite: hw.webseite?.trim() || null,
      adresse: formAdresse.trim() || null,
      gewerke: hw.gewerke ?? [],
      subkategorie: hw.subkategorie,
      ist_fachbetrieb: hw.ist_fachbetrieb,
      partner_kategorie_id: hw.partner_kategorie_id,
      steuernummer: hw.steuernummer?.trim() || null,
      ustid: hw.ustid?.trim() || null,
      iban: hw.iban?.replace(/\s+/g, '') || null,
      aktiv: hw.aktiv,
      notizen: hw.notizen?.trim() || null,
    }
    startTransition(async () => {
      const r = await updateHandwerker(hw.id, input)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setModalOpen(false)
      setErr(null)
      router.refresh()
    })
  }, [
    formName,
    formFirma,
    formEmail,
    formTelefon,
    formAdresse,
    hw,
    router,
  ])

  const sidebar = (
    <div className="space-y-3">
      <Accordion title="KONTAKT" defaultOpen>
        <div className="space-y-1 pt-1">
          <PropertyRow label="Name" value={hw.name} editable={false} />
          <PropertyRow label="Firma" value={hw.firma || '—'} editable={false} />
          <PropertyRow
            label="Telefon"
            value={
              hw.telefon ? (
                <a href={`tel:${String(hw.telefon).replace(/\s/g, '')}`} className="text-bw-link hover:underline">
                  {hw.telefon}
                </a>
              ) : (
                '—'
              )
            }
            editable={false}
          />
          <PropertyRow
            label="E-Mail"
            value={
              hw.email ? (
                <a href={`mailto:${hw.email}`} className="text-bw-link hover:underline">
                  {hw.email}
                </a>
              ) : (
                '—'
              )
            }
            editable={false}
          />
          <PropertyRow label="Adresse" value={hw.adresse || '—'} editable={false} />
          <Button type="button" variant="secondary" size="sm" className="mt-2 w-full" onClick={() => setModalOpen(true)}>
            ✏️ Bearbeiten
          </Button>
        </div>
      </Accordion>

      <Accordion title="GEWERKE" defaultOpen={false}>
        <div className="flex flex-wrap gap-2 pt-1">
          {gewerkNamen.length === 0 ? (
            <p className="text-sm text-bw-text-muted">Keine Gewerke hinterlegt.</p>
          ) : (
            gewerkNamen.map((n) => (
              <span key={n} className="rounded-full bg-bw-hover px-2.5 py-1 text-xs font-medium text-bw-text">
                {n}
              </span>
            ))
          )}
        </div>
      </Accordion>

      <Accordion title="COMPLIANCE" defaultOpen={false}>
        <div className="space-y-3 pt-1">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-bw-text-muted">Status</p>
            <ComplianceBadge status={hw.compliance_status} />
          </div>
          <p className="text-sm text-bw-text-muted">
            Nachweise nach Kategorie, Upload und signierte Links: Tab „Compliance“.
          </p>
        </div>
      </Accordion>

      <Accordion title="BANK & STEUER" defaultOpen={false}>
        <div className="space-y-1 pt-1">
          <PropertyRow label="IBAN" value={hw.iban || '—'} editable={false} />
          <PropertyRow label="USt-ID" value={hw.ustid || '—'} editable={false} />
        </div>
      </Accordion>
    </div>
  )

  const main = (
    <div className="flex min-h-[50vh] flex-col border-b border-bw-border md:border-b-0">
      <div className="flex shrink-0 border-b border-bw-border px-4 pt-3 md:px-6">
        <button
          type="button"
          onClick={() => setTab('auftraege')}
          className={cn(
            'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            tab === 'auftraege' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )}
        >
          Aufträge
        </button>
        <button
          type="button"
          onClick={() => setTab('notizen')}
          className={cn(
            'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            tab === 'notizen' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )}
        >
          Notizen
        </button>
        <button
          type="button"
          onClick={() => setTab('compliance')}
          className={cn(
            'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            tab === 'compliance' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )}
        >
          Compliance
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {tab === 'compliance' ? (
          <HandwerkerComplianceTab
            handwerkerId={hw.id}
            istFachbetrieb={hw.ist_fachbetrieb}
            typen={payload.typen}
            dokumente={payload.dokumente}
          />
        ) : tab === 'auftraege' ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">Aktive Aufträge</h3>
              {aktivAuftraege.length === 0 ? (
                <p className="text-sm text-bw-text-muted">Keine laufenden Aufträge.</p>
              ) : (
                <ul className="space-y-3">
                  {aktivAuftraege.map((a) => (
                    <li key={a.id}>
                      <Card className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-bw-text">{a.kunde_name ?? '—'}</p>
                            <p className="mt-0.5 text-sm text-bw-text-muted">{a.titel ?? 'Ohne Titel'}</p>
                            <div className="mt-2">
                              <AuftragStatusBadge status={a.auftrag_status} />
                            </div>
                          </div>
                          <Link href={`/auftraege/${a.id}`} className="btn btn-secondary btn-sm shrink-0">
                            → Zum Auftrag
                          </Link>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Accordion title={`Abgeschlossene Aufträge (${fertigeAuftraege.length})`} defaultOpen={false}>
              {fertigeAuftraege.length === 0 ? (
                <p className="pt-1 text-sm text-bw-text-muted">Keine abgeschlossenen Aufträge.</p>
              ) : (
                <ul className="space-y-3 pt-1">
                  {fertigeAuftraege.map((a) => (
                    <li key={a.id}>
                      <Card className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-bw-text">{a.kunde_name ?? '—'}</p>
                            <p className="mt-0.5 text-sm text-bw-text-muted">{a.titel ?? 'Ohne Titel'}</p>
                            <div className="mt-2">
                              <AuftragStatusBadge status={a.auftrag_status} />
                            </div>
                          </div>
                          <Link href={`/auftraege/${a.id}`} className="btn btn-secondary btn-sm shrink-0">
                            → Zum Auftrag
                          </Link>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </Accordion>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="input-label" htmlFor="hw-notizen">
              Notizen
            </label>
            <Textarea
              id="hw-notizen"
              rows={12}
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              placeholder="Notizen zum Handwerker…"
              className="min-h-[200px]"
            />
            <p className="text-xs text-bw-text-muted">Wird automatisch gespeichert.</p>
            {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <RecordLayout sidebar={sidebar}>{main}</RecordLayout>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Handwerker bearbeiten" size="md">
        <div className="space-y-4">
          {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}
          <Input label="Name *" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <Input label="Firma" value={formFirma} onChange={(e) => setFormFirma(e.target.value)} />
          <Input label="Telefon *" type="tel" value={formTelefon} onChange={(e) => setFormTelefon(e.target.value)} required />
          <Input label="E-Mail" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          <Input label="Adresse" value={formAdresse} onChange={(e) => setFormAdresse(e.target.value)} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" className="flex-1" onClick={saveKontaktModal} disabled={pending}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
