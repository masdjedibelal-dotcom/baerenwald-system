'use client'

import { useEffect, useMemo, useState } from 'react'
import { befundVorlageLabelDe } from '@/lib/anfragen/befund-vorlage-label'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { CHECKLISTE } from '@/lib/crm-labels'
import { createClient } from '@/lib/supabase'
import { toneToMockBadgeKind } from '@/lib/status/status-tone'
import type { StatusTone } from '@/lib/status/status-tone'

type Punkt = {
  id: string
  titel: string
  status: string | null
  notiz: string
  foto_refs: string[]
}

type Befund = {
  id: string
  durchgefuehrt_von: string
  durchgefuehrt_am: string
  ergebnis: string | null
  vorlage_key: string | null
  punkte: Punkt[]
}

function statusLabel(s: string | null): string | null {
  const v = (s ?? '').toLowerCase()
  if (v === 'unauffaellig') return 'Unauffällig'
  if (v === 'auffaellig') return 'Auffällig'
  if (v === 'nicht_pruefbar') return 'Nicht prüfbar'
  return null
}

function ergebnisMeta(s: string | null): { label: string; tone: StatusTone } {
  if (s === 'selbst_erledigt') return { label: 'Selbst erledigt', tone: 'gruen' }
  if (s === 'fachfirma_angebot') return { label: 'Fachfirma — Angebot', tone: 'blau' }
  if (s === 'fachfirma_akut') return { label: 'Fachfirma — Akut', tone: 'rot' }
  if (s?.trim()) return { label: s.trim(), tone: 'grau' }
  return { label: 'Prüfung läuft', tone: 'grau' }
}

function punktIstAusgefuellt(p: Punkt): boolean {
  return Boolean(statusLabel(p.status) || p.notiz.trim() || p.foto_refs.length > 0)
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE')
}

/** Read-only HM-Checkliste am CRM-Anfrage-Detail. */
export function LeadBefundCrmCard({
  leadId,
  hvMeldungStatus,
}: {
  leadId: string
  hvMeldungStatus?: string | null
}) {
  const [befund, setBefund] = useState<Befund | null>(null)
  const [loaded, setLoaded] = useState(false)

  const hv = String(hvMeldungStatus ?? '').trim().toLowerCase()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: head } = await supabase
        .from('lead_befunde')
        .select('id, durchgefuehrt_von, durchgefuehrt_am, ergebnis, vorlage_key')
        .eq('lead_id', leadId)
        .maybeSingle()

      if (cancelled) return
      if (!head?.id) {
        setBefund(null)
        setLoaded(true)
        return
      }

      const { data: punkte } = await supabase
        .from('lead_befund_punkte')
        .select('id, titel, status, notiz, foto_refs, sort_order')
        .eq('befund_id', head.id)
        .order('sort_order', { ascending: true })

      if (cancelled) return
      setBefund({
        id: String(head.id),
        durchgefuehrt_von: String(head.durchgefuehrt_von ?? ''),
        durchgefuehrt_am: String(head.durchgefuehrt_am ?? ''),
        ergebnis: head.ergebnis != null ? String(head.ergebnis) : null,
        vorlage_key: head.vorlage_key != null ? String(head.vorlage_key) : null,
        punkte: (punkte ?? []).map((p) => ({
          id: String(p.id),
          titel: String(p.titel ?? ''),
          status: p.status != null ? String(p.status) : null,
          notiz: String(p.notiz ?? ''),
          foto_refs: Array.isArray(p.foto_refs)
            ? (p.foto_refs as unknown[]).filter((u): u is string => typeof u === 'string')
            : [],
        })),
      })
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [leadId])

  const ausgefuellt = useMemo(
    () => (befund?.punkte ?? []).filter(punktIstAusgefuellt),
    [befund]
  )

  const hatInhalt = Boolean(
    befund && ((befund.ergebnis ?? '').trim() || ausgefuellt.length > 0)
  )

  if (!loaded) return null

  if (hv === 'hm_pruefung' && !befund?.ergebnis) {
    return (
      <MockCard
        title={CHECKLISTE.tab}
        icon="clipboard-check"
        actions={
          <MockBadge kind="plain">{CHECKLISTE.laeuft}</MockBadge>
        }
      >
        <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          {CHECKLISTE.warteHvHint}
        </p>
      </MockCard>
    )
  }

  if (!befund || !hatInhalt) return null

  const ergebnis = ergebnisMeta(befund.ergebnis)
  const vorlageLabel = befundVorlageLabelDe(befund.vorlage_key)
  const metaParts = [
    befund.durchgefuehrt_von.trim() || null,
    befund.durchgefuehrt_am ? formatDatum(befund.durchgefuehrt_am) : null,
    vorlageLabel,
  ].filter(Boolean)

  return (
    <MockCard
      title={CHECKLISTE.ergebnis}
      icon="clipboard-check"
      actions={
        <MockBadge kind={toneToMockBadgeKind(ergebnis.tone)}>{ergebnis.label}</MockBadge>
      }
    >
      {metaParts.length > 0 ? (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-3)',
          }}
        >
          {metaParts.join(' · ')}
        </p>
      ) : null}

      {ausgefuellt.length === 0 ? (
        <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          Noch keine Prüfpunkte ausgefüllt.
        </p>
      ) : (
        <div className="detail-soft-block">
          <div className="props">
            {ausgefuellt.map((p) => {
              const st = statusLabel(p.status)
              const notiz = p.notiz.trim()
              const valueParts = [st, notiz].filter(Boolean)
              return (
                <div key={p.id} className="prop">
                  <div className="prop-k">{p.titel}</div>
                  <div className="prop-v">{valueParts.join(' · ') || '—'}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </MockCard>
  )
}
