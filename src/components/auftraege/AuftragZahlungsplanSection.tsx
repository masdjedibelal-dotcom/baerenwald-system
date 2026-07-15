'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import {
  abschlagBereitsAbgerechnet,
  berechneZahlungsplan,
  emptyZahlungsplan,
  neueZahlungsplanZeile,
  parseZahlungsplan,
  zahlungsplanVorlage3x,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { toast } from '@/components/ui/app-toast'
import { formatDatum } from '@/lib/utils'

type RatenStatus = 'geplant' | 'gestellt' | 'bezahlt'

type RatenZeile = {
  id: string
  label: string
  prozent: number | null
  betrag: number
  faellig: string | null
  status: RatenStatus
}

function plusDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function rechnungFuerZeile(zeileId: string, rechnungen: RechnungAuswahlZeile[]) {
  return rechnungen.find(
    (r) =>
      r.zahlungsplan_abschlag_id === zeileId &&
      r.status !== 'storniert' &&
      (r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss')
  )
}

function statusBadge(st: RatenStatus) {
  if (st === 'bezahlt') {
    return (
      <MockBadge kind="aktiv">
        <MockIcon n="check" size={10} /> Bezahlt
      </MockBadge>
    )
  }
  if (st === 'gestellt') {
    return (
      <MockBadge kind="warten">
        <MockIcon n="mail-forward" size={10} /> Gestellt
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="fertig">
      <MockIcon n="file-pencil" size={10} /> Geplant
    </MockBadge>
  )
}

function AbschlagsplanEditor({
  gesamt,
  initial,
  onClose,
  onSave,
}: {
  gesamt: number
  initial: RatenZeile[] | null
  onClose: () => void
  onSave: (plan: Zahlungsplan) => void
}) {
  const mk = (label: string, prozent: number, tage: number): RatenZeile => ({
    id: crypto.randomUUID(),
    label,
    prozent,
    faellig: plusDaysIso(tage),
    betrag: Math.round((gesamt * prozent) / 100),
    status: 'geplant',
  })

  const presets: Record<string, Array<[string, number, number]>> = {
    '30 / 40 / 30': [
      ['1. Abschlag', 30, 14],
      ['2. Abschlag', 40, 45],
      ['Schlussrechnung', 30, 75],
    ],
    '50 / 50': [
      ['Anzahlung', 50, 14],
      ['Schlussrechnung', 50, 60],
    ],
    'Anzahlung 30% + Rest': [
      ['Anzahlung', 30, 7],
      ['Schlussrechnung', 70, 60],
    ],
  }

  const [raten, setRaten] = useState<RatenZeile[]>(() => {
    if (initial?.length) return initial
    return presets['30 / 40 / 30']!.map(([l, p, t]) => mk(l, p, t))
  })

  const applyPreset = (name: string) => {
    setRaten(presets[name]!.map(([l, p, t]) => mk(l, p, t)))
  }

  const upd = (id: string, patch: Partial<RatenZeile>) =>
    setRaten((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const rm = (id: string) => setRaten((rows) => rows.filter((r) => r.id !== id))

  const add = () =>
    setRaten((rows) => [
      ...rows,
      mk(`${rows.length + 1}. Abschlag`, 0, 30),
    ])

  const summe = raten.reduce((s, r) => s + (Number(r.prozent) || 0), 0)
  const betrag = (r: RatenZeile) => Math.round((gesamt * (Number(r.prozent) || 0)) / 100)
  const ok = summe === 100 && raten.length > 0

  const save = () => {
    if (!ok) return
    onSave({
      modus: 'abschlagsplan',
      zeilen: raten.map((r) =>
        neueZahlungsplanZeile({
          id: r.id,
          titel: r.label,
          typ: 'prozent',
          wert: Number(r.prozent) || 0,
        })
      ),
    })
  }

  return (
    <MockModal
      open
      onClose={onClose}
      icon="calculator"
      title="Abschlagsplan"
      footer={
        <>
          <MockBtn kind="ghost" onClick={onClose}>
            Abbrechen
          </MockBtn>
          <MockBtn kind="primary" icon="check" disabled={!ok} onClick={save}>
            Plan speichern
          </MockBtn>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 2 }}>Vorlage:</span>
        {Object.keys(presets).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => applyPreset(name)}
            style={{
              padding: '5px 11px',
              borderRadius: 8,
              border: '0.5px solid var(--border)',
              background: 'var(--card)',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          Gesamt <b style={{ color: 'var(--green)' }}>{formatEurBetrag(gesamt)}</b>
        </span>
      </div>
      <div
        style={{
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--card)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 84px 120px 150px 34px',
            gap: 10,
            padding: '9px 14px',
            background: 'var(--bg-soft)',
            borderBottom: '0.5px solid var(--border)',
            fontSize: 11.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-2)',
          }}
        >
          <div>Bezeichnung</div>
          <div style={{ textAlign: 'right' }}>Anteil</div>
          <div style={{ textAlign: 'right' }}>Betrag</div>
          <div>Fällig</div>
          <div />
        </div>
        {raten.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 84px 120px 150px 34px',
              gap: 10,
              padding: '8px 14px',
              borderBottom: '0.5px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <input
              className="txt"
              value={r.label}
              onChange={(e) => upd(r.id, { label: e.target.value })}
              style={{ height: 32 }}
            />
            <div className="txt-prefix" style={{ maxWidth: 84 }}>
              <input
                className="txt"
                type="number"
                value={r.prozent ?? ''}
                onChange={(e) => upd(r.id, { prozent: Number(e.target.value) || 0 })}
                style={{ textAlign: 'right' }}
              />
              <span className="prefix" style={{ right: 8, left: 'auto' }}>
                %
              </span>
            </div>
            <div
              style={{
                textAlign: 'right',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 13,
              }}
            >
              {formatEurBetrag(betrag(r))}
            </div>
            <input
              className="txt"
              type="date"
              value={r.faellig?.slice(0, 10) ?? ''}
              onChange={(e) => upd(r.id, { faellig: e.target.value })}
              style={{ height: 32, fontSize: 12 }}
            />
            <MockBtn sm kind="ghost" icon="trash" onClick={() => rm(r.id)} title="Entfernen" />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 10 }}>
          <button type="button" className="pt-add" style={{ border: 'none', padding: 0, width: 'auto' }} onClick={add}>
            <MockIcon n="plus" size={13} /> Abschlag hinzufügen
          </button>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: summe === 100 ? 'var(--green)' : 'var(--danger, #c0392b)',
            }}
          >
            Summe {summe}%{summe !== 100 ? ' · muss 100% sein' : ''}
          </span>
        </div>
      </div>
    </MockModal>
  )
}

export function AuftragZahlungsplanSection({
  auftragId,
  zahlungsplanRaw,
  gesamtNetto,
  rechnungen,
  onCreateInvoice,
}: {
  auftragId: string
  zahlungsplanRaw: unknown
  gesamtNetto: number
  rechnungen: RechnungAuswahlZeile[]
  onCreateInvoice?: () => void
}) {
  const initial = useMemo(
    () => parseZahlungsplan(zahlungsplanRaw) ?? emptyZahlungsplan(),
    [zahlungsplanRaw]
  )
  const [plan, setPlan] = useState<Zahlungsplan>(initial)
  const [editor, setEditor] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setPlan(initial)
  }, [initial])

  const kontext = useMemo(() => berechneZahlungsplan(plan, gesamtNetto), [plan, gesamtNetto])

  const raten: RatenZeile[] = useMemo(() => {
    return kontext.zeilen.map((z, idx) => {
      const linked = rechnungFuerZeile(z.id, rechnungen)
      let status: RatenStatus = 'geplant'
      if (linked) {
        status = linked.status === 'bezahlt' ? 'bezahlt' : 'gestellt'
      } else if (abschlagBereitsAbgerechnet(z.id, rechnungen)) {
        status = 'gestellt'
      }
      const prozent = z.typ === 'prozent' ? z.wert : Math.round((z.netto / (gesamtNetto || 1)) * 100)
      return {
        id: z.id,
        label: z.istSchluss ? 'Schlussrechnung' : z.titel || `${z.index}. Abschlag`,
        prozent: z.typ === 'prozent' ? z.wert : prozent,
        betrag: z.netto,
        faellig: linked?.faellig_am ?? plusDaysIso(14 + idx * 30),
        status,
      }
    })
  }, [kontext.zeilen, rechnungen, gesamtNetto])

  const total = gesamtNetto || raten.reduce((s, r) => s + r.betrag, 0)
  const bezahlt = raten.filter((r) => r.status === 'bezahlt').reduce((s, r) => s + r.betrag, 0)
  const gestellt = raten.filter((r) => r.status === 'gestellt').reduce((s, r) => s + r.betrag, 0)
  const pct = total > 0 ? Math.round((bezahlt / total) * 100) : 0

  function speichern(next: Zahlungsplan) {
    startTransition(async () => {
      const res = await saveAuftragZahlungsplan(auftragId, next)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setPlan(next)
      toast.success('Zahlungsplan gespeichert')
      setEditor(false)
    })
  }

  function openEditorWithPreset(vorlage: () => Zahlungsplan) {
    if (!plan.zeilen.length) {
      setPlan(vorlage())
    }
    setEditor(true)
  }

  const rowActions = (r: RatenZeile): EntityMenuItem[] => {
    const items: EntityMenuItem[] = []
    if (r.status === 'geplant') {
      items.push({
        label: 'Rechnung erstellen',
        icon: 'file-invoice',
        onClick: () => onCreateInvoice?.(),
      })
    }
    if (r.status === 'gestellt') {
      items.push({
        label: 'Rechnung öffnen',
        icon: 'file-invoice',
        onClick: () => onCreateInvoice?.(),
      })
    }
    return items
  }

  if (gesamtNetto <= 0) {
    return (
      <MockCard title="Zahlplan" icon="calculator">
        <MockEmpty
          icon="calculator"
          title="Noch kein Betrag"
          hint="Zuerst Auftragspositionen mit Betrag anlegen, dann Abschlagsplan definieren."
        />
      </MockCard>
    )
  }

  if (!raten.length) {
    return (
      <>
        <MockCard title="Zahlplan" icon="calculator">
          <div style={{ padding: '26px 16px', textAlign: 'center', color: 'var(--text-3)' }}>
            <MockIcon n="calculator" size={26} style={{ color: 'var(--text-4)' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginTop: 10 }}>
              Noch kein Abschlagsplan
            </div>
            <div
              style={{
                fontSize: 12.5,
                marginTop: 4,
                marginBottom: 16,
                maxWidth: 380,
                marginInline: 'auto',
                lineHeight: 1.45,
              }}
            >
              Teile die Auftragssumme von <b>{formatEurBetrag(total)}</b> in Abschläge auf — z. B. 30 % bei
              Beginn, 40 % nach Rohbau, 30 % zur Schlussrechnung.
            </div>
            <MockBtn kind="primary" icon="plus" disabled={pending} onClick={() => openEditorWithPreset(zahlungsplanVorlage3x)}>
              Abschlagsplan erstellen
            </MockBtn>
          </div>
        </MockCard>
        {editor ? (
          <AbschlagsplanEditor
            gesamt={total}
            initial={null}
            onClose={() => setEditor(false)}
            onSave={speichern}
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      <MockCard
        title="Zahlplan"
        icon="calculator"
        actions={
          <>
            <MockBtn sm kind="ghost" icon="pencil" onClick={() => setEditor(true)}>
              Plan bearbeiten
            </MockBtn>
            <MockBtn
              sm
              kind="primary"
              icon="file-invoice"
              onClick={() => {
                const next = raten.find((r) => r.status === 'geplant')
                if (next) onCreateInvoice?.()
                else onCreateInvoice?.()
              }}
            >
              Nächste Rechnung
            </MockBtn>
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--text-3)' }}>
            Bezahlt {formatEurBetrag(bezahlt)}
            {gestellt ? ` · offen gestellt ${formatEurBetrag(gestellt)}` : ''}
          </span>
          <b>
            {formatEurBetrag(bezahlt)} / {formatEurBetrag(total)}
          </b>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 6,
            background: 'var(--bg-soft)',
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--green)',
              borderRadius: 6,
              transition: 'width .3s',
            }}
          />
        </div>
        <div style={{ margin: '0 -16px -14px' }}>
          <div className="list-row head" style={{ gridTemplateColumns: '1fr 110px 120px 120px 34px' }}>
            <div>Bezeichnung</div>
            <div style={{ textAlign: 'right' }}>Betrag</div>
            <div>Fällig</div>
            <div>Status</div>
            <div />
          </div>
          {raten.map((r) => (
            <div
              key={r.id}
              className="list-row"
              style={{
                gridTemplateColumns: '1fr 110px 120px 120px 34px',
                cursor: 'default',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {r.label}
                {r.prozent != null ? (
                  <span style={{ color: 'var(--text-4)', fontWeight: 400 }}> · {r.prozent}%</span>
                ) : null}
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 13,
                }}
              >
                {formatEurBetrag(r.betrag)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {r.faellig ? formatDatum(r.faellig) : '—'}
              </div>
              <div>{statusBadge(r.status)}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {rowActions(r).length ? (
                  <MockEntityRowMenu items={rowActions(r)} title="Rate" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </MockCard>
      {editor ? (
        <AbschlagsplanEditor
          gesamt={total}
          initial={raten}
          onClose={() => setEditor(false)}
          onSave={speichern}
        />
      ) : null}
    </>
  )
}
