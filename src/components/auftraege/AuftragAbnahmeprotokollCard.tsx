'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { toast } from '@/components/ui/app-toast'
import {
  ablehnenAbnahmeprotokoll,
  deleteAbnahmeprotokoll,
  freigebenAbnahmeprotokoll,
  getGesamtabnahmeGate,
  loadAbnahmeprotokolleListe,
  loadAbnahmeprotokollSummary,
  type AbnahmeprotokollListeEintrag,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  ABNAHME_FREIGABE_LABELS,
  type AbnahmeHwFreigabeZeile,
} from '@/lib/auftraege/abnahme-freigabe'
import { countOffeneMaengel } from '@/lib/auftraege/abnahme-maengel-helpers'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatDatum } from '@/lib/utils'

function freigabeBadge(status: AbnahmeprotokollListeEintrag['freigabe_status'], gesendet: boolean) {
  if (gesendet) {
    return (
      <MockBadge kind="aktiv">
        <MockIcon ctx="row" n="check" size={10} /> Gesendet
      </MockBadge>
    )
  }
  if (status === 'zur_freigabe') {
    return (
      <MockBadge kind="warn">
        <MockIcon ctx="row" n="clock" size={10} /> Zur Freigabe
      </MockBadge>
    )
  }
  if (status === 'freigegeben') {
    return (
      <MockBadge kind="aktiv">
        <MockIcon ctx="row" n="check" size={10} /> Freigegeben
      </MockBadge>
    )
  }
  if (status === 'abgelehnt') {
    return (
      <MockBadge kind="storniert">
        <MockIcon ctx="row" n="x" size={10} /> Abgelehnt
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="fertig">
      <MockIcon ctx="row" n="file-pencil" size={10} /> Entwurf
    </MockBadge>
  )
}

function hwStatusLabel(z: AbnahmeHwFreigabeZeile): string {
  if (!z.freigabeStatus) {
    return z.abnahmeSigniertAm ? 'Signiert — Protokoll fehlt' : 'Ausstehend'
  }
  return ABNAHME_FREIGABE_LABELS[z.freigabeStatus]
}

export function AuftragAbnahmeprotokollCard({
  auftragId,
  onChanged,
}: {
  auftragId: string
  onChanged?: () => void
}) {
  const router = useRouter()
  const [liste, setListe] = useState<AbnahmeprotokollListeEintrag[]>([])
  const [hwZeilen, setHwZeilen] = useState<AbnahmeHwFreigabeZeile[]>([])
  const [gesamtOk, setGesamtOk] = useState(true)
  const [gesamtMsg, setGesamtMsg] = useState<string | undefined>()
  const [offeneMaengel, setOffeneMaengel] = useState(0)
  const [pending, startTransition] = useTransition()

  const reload = useCallback(() => {
    void loadAbnahmeprotokolleListe(auftragId).then(setListe)
    void loadAbnahmeprotokollSummary(auftragId).then((s) => {
      setOffeneMaengel(s ? countOffeneMaengel(s.maengel) : 0)
    })
    void getGesamtabnahmeGate(auftragId).then((g) => {
      setHwZeilen(g.zeilen)
      setGesamtOk(g.ok)
      setGesamtMsg(g.message)
    })
  }, [auftragId])

  useEffect(() => {
    reload()
  }, [reload])

  function erstellen() {
    router.push(`/auftraege/${auftragId}/abnahme/erstellen`)
  }

  function bearbeiten(protokollId?: string) {
    const q = protokollId ? `?protokollId=${encodeURIComponent(protokollId)}` : ''
    router.push(`/auftraege/${auftragId}/abnahme/erstellen${q}`)
  }

  function loeschen(id: string) {
    if (!window.confirm('Abnahmeprotokoll wirklich löschen?')) return
    startTransition(async () => {
      const r = await deleteAbnahmeprotokoll(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Protokoll gelöscht')
        reload()
        onChanged?.()
        router.refresh()
      }
    })
  }

  function freigeben(id: string) {
    startTransition(async () => {
      const r = await freigebenAbnahmeprotokoll(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Freigegeben — Versand optional danach')
        reload()
        onChanged?.()
        router.refresh()
      }
    })
  }

  function ablehnen(id: string) {
    const notiz = window.prompt('Ablehnung — Notiz für Punch-List / Nacharbeit (optional):') ?? ''
    startTransition(async () => {
      const r = await ablehnenAbnahmeprotokoll({
        protokollId: id,
        auftragId,
        notiz: notiz.trim() || null,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Abgelehnt — Nacharbeit / Mängel')
        reload()
        onChanged?.()
        router.refresh()
      }
    })
  }

  function rowMenu(p: AbnahmeprotokollListeEintrag): EntityMenuItem[] {
    const items: EntityMenuItem[] = [
      {
        icon: 'file-pencil',
        label: 'Bearbeiten',
        onClick: () => bearbeiten(p.id),
      },
    ]
    if (p.freigabe_status === 'zur_freigabe' || p.freigabe_status === 'abgelehnt') {
      items.push(
        {
          icon: 'check',
          label: 'Freigeben',
          onClick: () => freigeben(p.id),
        },
        {
          icon: 'x',
          label: 'Ablehnen',
          danger: true,
          onClick: () => ablehnen(p.id),
        }
      )
    }
    if (p.pdf_url) {
      items.push(
        {
          icon: 'external-link',
          label: 'PDF öffnen',
          onClick: () => window.open(p.pdf_url!, '_blank', 'noopener,noreferrer'),
        },
        {
          icon: 'download',
          label: 'Download',
          onClick: () => {
            const a = document.createElement('a')
            a.href = p.pdf_url!
            a.download = ''
            a.click()
          },
        },
        'sep'
      )
    }
    items.push({
      icon: 'trash',
      label: 'Löschen',
      danger: true,
      onClick: () => loeschen(p.id),
    })
    return items
  }

  const zurFreigabe = liste.filter((p) => p.freigabe_status === 'zur_freigabe')

  return (
    <MockCard
      id="auftrag-abnahmeprotokoll"
      title={liste.length ? `Abnahme · ${liste.length}` : 'Abnahme'}
      icon="checklist"
      className="scroll-mt-24"
      actions={
        <>
          {offeneMaengel > 0 ? (
            <MockBtn
              sm
              kind="ghost"
              icon="tool"
              onClick={() => router.push(`/auftraege/${auftragId}/abnahme/maengel`)}
            >
              Mängel ({offeneMaengel})
            </MockBtn>
          ) : null}
          <MockBtn
            sm
            kind="primary"
            icon="plus"
            disabled={pending || (hwZeilen.length > 0 && !gesamtOk)}
            title={hwZeilen.length > 0 && !gesamtOk ? gesamtMsg : undefined}
            onClick={() => {
              if (hwZeilen.length > 0 && !gesamtOk) {
                toast.error(gesamtMsg || 'Zuerst alle Partner-Teilabnahmen freigeben.')
                return
              }
              erstellen()
            }}
          >
            {hwZeilen.length > 0 ? 'Gesamtabnahme erzeugen' : 'Protokoll erstellen'}
          </MockBtn>
        </>
      }
    >
      {hwZeilen.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 'var(--fs-meta)',
              fontWeight: 600,
              color: 'var(--text-3)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Partner-Teilabnahmen
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hwZeilen.map((z) => (
              <div
                key={z.handwerkerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  background:
                    z.freigabeStatus === 'zur_freigabe' ? 'var(--amber-50, #fff8eb)' : 'var(--card)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-text)', fontWeight: 500 }}>
                    {z.handwerkerName}
                  </div>
                  <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                    {hwStatusLabel(z)}
                    {z.abnahmeDatum ? ` · ${formatDatum(z.abnahmeDatum)}` : ''}
                    {z.maengelOffen > 0 ? ` · ${z.maengelOffen} Mängel` : ''}
                  </div>
                </div>
                {z.protokollId && z.freigabeStatus === 'zur_freigabe' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <MockBtn sm kind="ghost" onClick={() => ablehnen(z.protokollId!)} disabled={pending}>
                      Ablehnen
                    </MockBtn>
                    <MockBtn sm kind="primary" onClick={() => freigeben(z.protokollId!)} disabled={pending}>
                      Freigeben
                    </MockBtn>
                  </div>
                ) : z.protokollId ? (
                  <MockBtn sm kind="ghost" onClick={() => bearbeiten(z.protokollId!)}>
                    Öffnen
                  </MockBtn>
                ) : null}
              </div>
            ))}
          </div>
          {!gesamtOk && gesamtMsg ? (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 'var(--fs-meta)',
                color: 'var(--text-3)',
              }}
            >
              {gesamtMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      {zurFreigabe.length > 0 && hwZeilen.length === 0 ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '0.5px solid var(--amber-border, #f0d9a8)',
            background: 'var(--amber-50, #fff8eb)',
            fontSize: 'var(--fs-text)',
            color: 'var(--text-2)',
          }}
        >
          <strong>{zurFreigabe.length}</strong> Protokoll(e) zur Freigabe.
        </div>
      ) : null}

      {offeneMaengel > 0 ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '0.5px solid var(--amber-border, #f0d9a8)',
            background: 'var(--amber-50, #fff8eb)',
            fontSize: 'var(--fs-text)',
            color: 'var(--text-2)',
          }}
        >
          <strong>{offeneMaengel}</strong> offene Mängel — bitte unter „Mängel“ nacharbeiten.
        </div>
      ) : null}

      {liste.length === 0 && hwZeilen.length === 0 ? (
        <div className="abnahme-empty">
          <MockIcon ctx="empty" n="checklist" size={26} />
          <div className="abnahme-empty__title">Noch kein Abnahmeprotokoll</div>
          <div className="abnahme-empty__text">
            Partner reichen Teilabnahmen ein — CRM gibt frei. Danach Gesamtabnahme und Abschluss.
          </div>
          <MockBtn kind="primary" icon="plus" onClick={erstellen}>
            Protokoll erstellen
          </MockBtn>
        </div>
      ) : liste.length > 0 ? (
        <div className="abnahme-table-wrap">
          <div className="list-row head abnahme-row" aria-hidden>
            <div>Bezeichnung</div>
            <div>Abnahme</div>
            <div>Erstellt</div>
            <div>Status</div>
            <div />
          </div>
          {liste.map((p) => (
            <div key={p.id} className="list-row abnahme-row">
              <div className="abnahme-row__label">
                <MockIcon ctx="row" n="checklist" size={16} className="abnahme-row__ico" />
                <span>
                  {p.ebene === 'handwerker'
                    ? p.handwerker_name || 'Teilabnahme'
                    : `Gesamtabnahme ${formatDatum(p.abnahme_datum)}`}
                </span>
              </div>
              <div className="abnahme-row__datum">{formatDatum(p.abnahme_datum)}</div>
              <div className="abnahme-row__datum">
                {p.created_at ? formatDatum(p.created_at.slice(0, 10)) : '—'}
              </div>
              <div>{freigabeBadge(p.freigabe_status, Boolean(p.an_kunde_gesendet_at))}</div>
              <div className="abnahme-row__menu">
                <MockEntityRowMenu items={rowMenu(p)} title="Protokoll" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </MockCard>
  )
}
