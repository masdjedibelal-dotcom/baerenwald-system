'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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

function ergebnisMeta(s: string | null): { label: string; tone: 'yel' | 'grn' | 'red' | 'muted' } {
  if (s === 'selbst_erledigt') return { label: 'Selbst erledigt', tone: 'grn' }
  if (s === 'fachfirma_angebot') return { label: 'Fachfirma — Angebot', tone: 'yel' }
  if (s === 'fachfirma_akut') return { label: 'Fachfirma — Akut', tone: 'red' }
  if (s?.trim()) return { label: s.trim(), tone: 'muted' }
  return { label: 'Prüfung läuft', tone: 'muted' }
}

function punktIstAusgefuellt(p: Punkt): boolean {
  return Boolean(statusLabel(p.status) || p.notiz.trim() || p.foto_refs.length > 0)
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE')
}

/** Read-only HM-Vorbefund am CRM-Anfrage-Detail — Mock-Card, nur ausgefüllte Punkte. */
export function LeadBefundCrmCard({ leadId }: { leadId: string }) {
  const [befund, setBefund] = useState<Befund | null>(null)
  const [loaded, setLoaded] = useState(false)

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

  if (!loaded || !befund) return null

  const ergebnis = ergebnisMeta(befund.ergebnis)
  const metaParts = [
    befund.durchgefuehrt_von.trim() || null,
    befund.durchgefuehrt_am ? formatDatum(befund.durchgefuehrt_am) : null,
    befund.vorlage_key?.trim() || null,
  ].filter(Boolean)

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">Hausmeister-Vorbefund</div>
        <span className={cn('hvk-badge', `hvk-badge--${ergebnis.tone}`)}>{ergebnis.label}</span>
      </div>
      <div className="card-b">
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
            Keine ausgefüllten Prüfpunkte.
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
                    <div className="prop-l">{p.titel}</div>
                    <div className="prop-v">
                      {valueParts.length > 0 ? valueParts.join(' — ') : null}
                      {p.foto_refs.length > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            marginTop: valueParts.length ? 6 : 0,
                          }}
                        >
                          {p.foto_refs.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'block',
                                width: 48,
                                height: 48,
                                overflow: 'hidden',
                                borderRadius: 'var(--r-md)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
