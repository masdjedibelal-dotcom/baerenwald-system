'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { SidePanel } from '@/components/ui/SidePanel'
import { Accordion } from '@/components/ui/Accordion'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { TypBadge } from '@/components/kunden/TypBadge'
import { createClient } from '@/lib/supabase'
import { addKundenNotiz } from '@/app/actions/kunden'
import { formatDatum, STATUS_LABELS, AUFTRAG_STATUS_LABELS } from '@/lib/utils'

function formatEur(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'

type PanelProjekt = {
  id: string
  kind: 'lead' | 'auftrag'
  titel: string
  sortDate: string
  statusLabel: string
  betrag: number | null
  href: string
}

function leadTitel(situation: string | null, bereiche: string[] | null) {
  const b = bereiche?.length ? bereiche.join(' + ') : ''
  if (situation?.trim()) return situation.trim()
  if (b) return `Anfrage ${b}`
  return 'Anfrage'
}

export function KundeSidePanel({
  open,
  onClose,
  kundeId,
  summary,
  onBearbeiten,
}: {
  open: boolean
  onClose: () => void
  kundeId: string | null
  summary: KundeListeZeile | null
  onBearbeiten: () => void
}) {
  const [notiz, setNotiz] = useState('')
  const [pending, startTransition] = useTransition()
  const [projekte, setProjekte] = useState<PanelProjekt[]>([])

  useEffect(() => {
    if (!open || !kundeId) {
      setProjekte([])
      return
    }
    const supabase = createClient()
    ;(async () => {
      const [leadsRes, aufRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, status, situation, bereiche, created_at')
          .eq('kunde_id', kundeId)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('auftraege')
          .select('id, titel, status, created_at')
          .eq('kunde_id', kundeId)
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      const merged: PanelProjekt[] = []
      for (const l of leadsRes.data ?? []) {
        const bereiche = Array.isArray(l.bereiche) ? (l.bereiche as string[]) : null
        merged.push({
          id: l.id as string,
          kind: 'lead',
          titel: leadTitel(l.situation as string | null, bereiche),
          sortDate: l.created_at as string,
          statusLabel: STATUS_LABELS[l.status as keyof typeof STATUS_LABELS] ?? String(l.status),
          betrag: null,
          href: `/anfragen/${l.id}`,
        })
      }
      for (const a of aufRes.data ?? []) {
        merged.push({
          id: a.id as string,
          kind: 'auftrag',
          titel: (a.titel as string | null)?.trim() || 'Auftrag',
          sortDate: a.created_at as string,
          statusLabel: AUFTRAG_STATUS_LABELS[a.status as keyof typeof AUFTRAG_STATUS_LABELS] ?? String(a.status),
          betrag: null,
          href: `/auftraege/${a.id}`,
        })
      }
      merged.sort((x, y) => new Date(y.sortDate).getTime() - new Date(x.sortDate).getTime())
      setProjekte(merged.slice(0, 3))
    })()
  }, [open, kundeId])

  const adresse = useMemo(() => {
    if (!summary) return '—'
    const parts = [summary.adresse, [summary.plz, summary.ort].filter(Boolean).join(' ')].filter(
      (p) => p && String(p).trim()
    )
    return parts.length ? parts.join(', ') : '—'
  }, [summary])

  const projekteGesamt = summary ? summary.anzahl_leads + summary.anzahl_auftraege : 0

  function speichernNotiz() {
    if (!kundeId || !notiz.trim()) return
    startTransition(async () => {
      const r = await addKundenNotiz(kundeId, notiz.trim())
      if (r.ok) setNotiz('')
    })
  }

  if (!summary || !kundeId) return null

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={summary.name}
      subtitle={summary.kundennummer ?? undefined}
      width="md"
      badge={<TypBadge typ={summary.typ} />}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href={`/kunden/${kundeId}`} className="btn btn-primary btn-sm">
            Vollständig öffnen →
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBearbeiten}>
            ✏️ Bearbeiten
          </button>
        </div>
      }
    >
      <div className="space-y-3 px-5 pb-6">
        <Accordion title="Kontakt" defaultOpen>
          <div className="space-y-1 pt-1">
            <PropertyRow label="Telefon" value={summary.telefon ?? '—'} editable={false} />
            <PropertyRow label="E-Mail" value={summary.email ?? '—'} editable={false} />
            <PropertyRow label="Adresse" value={adresse} editable={false} />
            <PropertyRow label="Typ" value={<TypBadge typ={summary.typ} />} editable={false} />
          </div>
        </Accordion>

        <Accordion title="Projekte">
          <ul className="space-y-3 pt-1">
            {projekte.length === 0 ? (
              <li className="text-sm text-bw-mid">Noch keine Projekte.</li>
            ) : (
              projekte.map((p) => (
                <li key={`${p.kind}-${p.id}`} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-bw-light">●</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-bw-text">
                        {p.kind === 'auftrag' ? 'Auftrag' : 'Anfrage'} {p.titel}
                      </div>
                      <div className="text-xs text-bw-mid">
                        {formatDatum(p.sortDate)}
                        {p.betrag != null ? ` · ${formatEur(p.betrag)}` : ''}
                      </div>
                      <Link href={p.href} className="text-xs font-medium text-bw-link">
                        {p.statusLabel} →
                      </Link>
                    </div>
                  </div>
                </li>
              ))
            )}
            <li>
              <Link href={`/kunden/${kundeId}`} className="text-sm font-medium text-bw-link">
                Alle ansehen →
              </Link>
            </li>
          </ul>
        </Accordion>

        <Accordion title="Statistik">
          <dl className="grid gap-2 pt-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-bw-mid">Projekte gesamt</dt>
              <dd className="font-medium text-bw-text">{projekteGesamt}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-bw-mid">Umsatz gesamt</dt>
              <dd className="font-medium text-bw-text">{formatEur(summary.gesamt_umsatz)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-bw-mid">Erster Kontakt</dt>
              <dd className="font-medium text-bw-text">{formatDatum(summary.created_at)}</dd>
            </div>
          </dl>
        </Accordion>

        <div className="rounded-lg border border-bw-border bg-bw-bg p-3">
          <p className="mb-2 text-xs font-medium text-bw-mid">Notiz schnell hinzufügen</p>
          <Textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            rows={3}
            placeholder="Notiz…"
            className="text-sm"
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" size="sm" onClick={speichernNotiz} loading={pending} disabled={!notiz.trim()}>
              + Notiz speichern
            </Button>
          </div>
        </div>
      </div>
    </SidePanel>
  )
}
