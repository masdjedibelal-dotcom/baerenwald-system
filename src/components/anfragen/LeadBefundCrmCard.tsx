'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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

function statusLabel(s: string | null): string {
  const v = (s ?? '').toLowerCase()
  if (v === 'unauffaellig') return 'Unauffällig'
  if (v === 'auffaellig') return 'Auffällig'
  if (v === 'nicht_pruefbar') return 'Nicht prüfbar'
  return '—'
}

function ergebnisLabel(s: string | null): string {
  if (s === 'selbst_erledigt') return 'Selbst erledigt'
  if (s === 'fachfirma_angebot') return 'Fachfirma — Angebot'
  if (s === 'fachfirma_akut') return 'Fachfirma — Akut'
  return s?.trim() || 'Prüfung läuft'
}

/** Read-only HM-Vorbefund am CRM-Anfrage-Detail. */
export function LeadBefundCrmCard({ leadId }: { leadId: string }) {
  const [befund, setBefund] = useState<Befund | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: head } = await supabase
        .from('lead_befunde')
        .select(
          'id, durchgefuehrt_von, durchgefuehrt_am, ergebnis, vorlage_key'
        )
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
            ? (p.foto_refs as unknown[]).filter(
                (u): u is string => typeof u === 'string'
              )
            : [],
        })),
      })
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [leadId])

  if (!loaded || !befund) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Hausmeister-Vorbefund</h3>
        <span className="text-xs text-muted-foreground">
          {ergebnisLabel(befund.ergebnis)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {befund.durchgefuehrt_von || '—'}
        {befund.durchgefuehrt_am
          ? ` · ${new Date(befund.durchgefuehrt_am).toLocaleDateString('de-DE')}`
          : ''}
        {befund.vorlage_key ? ` · ${befund.vorlage_key}` : ''}
      </p>
      <ul className="space-y-2">
        {befund.punkte.map((p) => (
          <li key={p.id} className="text-sm border-t border-border/60 pt-2">
            <div className="font-medium">{p.titel}</div>
            <div className="text-xs text-muted-foreground">
              {statusLabel(p.status)}
              {p.notiz ? ` — ${p.notiz}` : ''}
            </div>
            {p.foto_refs.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.foto_refs.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-12 w-12 overflow-hidden rounded border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
