'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { toast } from '@/components/ui/app-toast'
import {
  deleteAbnahmeprotokoll,
  loadAbnahmeprotokolleListe,
  loadAbnahmeprotokollSummary,
  type AbnahmeprotokollListeEintrag,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { countOffeneMaengel } from '@/lib/auftraege/abnahme-maengel-helpers'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatDatum } from '@/lib/utils'

function statusBadge(p: AbnahmeprotokollListeEintrag) {
  if (p.an_kunde_gesendet_at) {
    return (
      <MockBadge kind="aktiv">
        <MockIcon ctx="row" n="check" size={10} /> Gesendet
      </MockBadge>
    )
  }
  if (p.pdf_url) {
    return (
      <MockBadge kind="aktiv">
        <MockIcon ctx="row" n="file-text" size={10} /> PDF
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="fertig">
      <MockIcon ctx="row" n="file-pencil" size={10} /> Entwurf
    </MockBadge>
  )
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
  const [offeneMaengel, setOffeneMaengel] = useState(0)
  const [pending, startTransition] = useTransition()

  const reload = useCallback(() => {
    void loadAbnahmeprotokolleListe(auftragId).then(setListe)
    void loadAbnahmeprotokollSummary(auftragId).then((s) => {
      setOffeneMaengel(s ? countOffeneMaengel(s.maengel) : 0)
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

  function rowMenu(p: AbnahmeprotokollListeEintrag): EntityMenuItem[] {
    const items: EntityMenuItem[] = [
      {
        icon: 'file-pencil',
        label: 'Bearbeiten',
        onClick: () => bearbeiten(p.id),
      },
    ]
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

  return (
    <MockCard
      id="auftrag-abnahmeprotokoll"
      title={liste.length ? `Abnahmeprotokoll · ${liste.length}` : 'Abnahmeprotokoll'}
      icon="checklist"
      className="scroll-mt-24"
      actions={
        <>
          {liste.length > 0 ? (
            <MockBtn
              sm
              kind="ghost"
              icon="clipboard-list"
              onClick={() =>
                router.push(
                  `/auftraege/${auftragId}/abnahme/erstellen${
                    liste[0] ? `?protokollId=${encodeURIComponent(liste[0].id)}` : ''
                  }`
                )
              }
            >
              Vor Ort
            </MockBtn>
          ) : null}
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
            icon={liste.length ? 'file-pencil' : 'plus'}
            onClick={() => (liste[0] ? bearbeiten(liste[0].id) : erstellen())}
            disabled={pending}
          >
            {liste.length ? 'Bearbeiten' : 'Protokoll erstellen'}
          </MockBtn>
        </>
      }
    >
      {offeneMaengel > 0 ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '0.5px solid var(--amber-border, #f0d9a8)',
            background: 'var(--amber-50, #fff8eb)',
            fontSize: 13,
            color: 'var(--text-2)',
          }}
        >
          <strong>{offeneMaengel}</strong> offene Mängel — bitte unter „Mängel“ nacharbeiten und
          dokumentieren.
        </div>
      ) : null}

      {liste.length === 0 ? (
        <div className="abnahme-empty">
          <MockIcon ctx="empty" n="checklist" size={26} />
          <div className="abnahme-empty__title">Noch kein Abnahmeprotokoll</div>
          <div className="abnahme-empty__text">
            Checkliste aus Gewerken und Leistungen — Protokoll erstellen und PDF speichern.
          </div>
          <MockBtn kind="primary" icon="plus" onClick={erstellen}>
            Protokoll erstellen
          </MockBtn>
        </div>
      ) : (
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
                <span>Abnahme {formatDatum(p.abnahme_datum)}</span>
              </div>
              <div className="abnahme-row__datum">{formatDatum(p.abnahme_datum)}</div>
              <div className="abnahme-row__datum">
                {p.created_at ? formatDatum(p.created_at.slice(0, 10)) : '—'}
              </div>
              <div>{statusBadge(p)}</div>
              <div className="abnahme-row__menu">
                <MockEntityRowMenu items={rowMenu(p)} title="Protokoll" />
              </div>
            </div>
          ))}
        </div>
      )}
    </MockCard>
  )
}
