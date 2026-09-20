'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useTransition } from '@/components/ui/action-busy'
import { C } from '@/lib/tokens/colors'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { TOAST } from '@/lib/copy'

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
      if (!g) return
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
    openDeleteConfirm('Abnahmeprotokoll löschen?', async () => {
      const r = await deleteAbnahmeprotokoll(id, auftragId)
      if (!r?.ok) {
        toast.systemError(r, 'ui', 'Löschen fehlgeschlagen')
        throw new Error(r?.message ?? 'Löschen fehlgeschlagen')
      }
      toast.success(TOAST.protokoll_geloescht)
      reload()
      if (onChanged) onChanged()
      else afterServerActionRefresh()
    })
  }

  function freigeben(id: string) {
    startTransition(async () => {
      const r = await freigebenAbnahmeprotokoll(id, auftragId)
      if (!r?.ok) toast.systemError(r, 'ui', 'Freigabe fehlgeschlagen')
      else {
        toast.success(TOAST.freigegeben_versand_optional_danach)
        reload()
        if (onChanged) onChanged()
        else afterServerActionRefresh()
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
      if (!r?.ok) toast.systemError(r, 'ui', 'Ablehnen fehlgeschlagen')
      else {
        toast.success(TOAST.abgelehnt_nacharbeit_maengel)
        reload()
        if (onChanged) onChanged()
        else afterServerActionRefresh()
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
              kind="secondary"
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
            disabled={pending}
            onClick={() => {
              // Offener Entwurf? Immer fortsetzen — Partner-Gate blockiert den Wiedereinstieg nicht.
              const entwurf = liste.find(
                (p) => p.freigabe_status === 'entwurf' || p.freigabe_status === 'abgelehnt'
              )
              if (entwurf) {
                bearbeiten(entwurf.id)
                return
              }
              // Ohne Listen-Treffer trotzdem /erstellen — Page lädt offenen DB-Entwurf nach.
              erstellen()
            }}
          >
            {liste.some(
              (p) => p.freigabe_status === 'entwurf' || p.freigabe_status === 'abgelehnt'
            )
              ? 'Entwurf fortsetzen'
              : hwZeilen.length > 0
                ? 'Gesamtabnahme erzeugen'
                : 'Protokoll erstellen'}
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
                  padding: '0.625rem 0.75rem',
                  border: '0.03125rem solid var(--border)',
                  borderRadius: 8,
                  background:
                    z.freigabeStatus === 'zur_freigabe' ? `var(--amber-50, ${C.accentBg})` : 'var(--card)',
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
                margin: '0.625rem 0 0',
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
            padding: '0.625rem 0.75rem',
            borderRadius: 10,
            border: `0.03125rem solid var(--amber-border, ${C.accentBg2})`,
            background: `var(--amber-50, ${C.accentBg})`,
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
            padding: '0.625rem 0.75rem',
            borderRadius: 10,
            border: `0.03125rem solid var(--amber-border, ${C.accentBg2})`,
            background: `var(--amber-50, ${C.accentBg})`,
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
