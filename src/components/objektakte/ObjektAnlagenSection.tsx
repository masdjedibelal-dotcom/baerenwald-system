'use client'

import Link from 'next/link'
import { useTransition } from '@/components/ui/action-busy'
import { useEffect, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockModal } from '@/components/mock-ui/MockModal'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockFormSection } from '@/components/mock-ui/MockForm'
import {
  createObjektAnlage,
  deleteObjektAnlage,
  loadObjektAnlageVorgaenge,
  updateObjektAnlage,
} from '@/app/actions/objektakte-actions'
import {
  ObjektAnlageFormFields,
  anlageFormStateFromRow,
  anlageInputFromFormState,
  emptyAnlageFormState,
  type ObjektAnlageFormState,
} from '@/components/objektakte/ObjektAnlageFormFields'
import {
  OBJEKT_ANLAGE_STATUS_BADGE,
  OBJEKT_ANLAGE_STATUS_LABELS,
  OBJEKT_ANLAGE_WARTUNGSINTERVALL_LABELS,
  formatAnlageGarantieHint,
} from '@/lib/objektakte/labels'
import type { ObjektAnlage, ObjektAnlageVorgangRow, ObjektEinheit } from '@/lib/objektakte/types'
import { anlageToInput } from '@/lib/objektakte/types'
import type { Gewerk } from '@/lib/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { toast } from '@/components/ui/app-toast'
import { LIST } from '@/lib/crm-labels'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

const LIST_COLS = 'minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 1fr) 72px 88px 44px'

function fmtDatum(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(d)
}

function einheitLabel(a: ObjektAnlage): string | null {
  const e = a.objekt_einheiten
  if (!e?.bezeichnung?.trim()) return null
  return e.etage?.trim() ? `${e.bezeichnung} · ${e.etage}` : e.bezeichnung
}

export function ObjektAnlagenSection({
  kundeId,
  objektId,
  anlagen: initial,
  einheiten,
  gewerke,
  onChanged,
}: {
  kundeId: string
  objektId: string
  anlagen: ObjektAnlage[]
  einheiten: ObjektEinheit[]
  gewerke: Gewerk[]
  onChanged: () => void
}) {
  const isMobile = useIsMobile()
  const [liste, setListe] = useState(initial)
  const [formOpen, setFormOpen] = useState(false)
  const [edit, setEdit] = useState<ObjektAnlage | null>(null)
  const [detail, setDetail] = useState<ObjektAnlage | null>(null)
  const [detailVorgaenge, setDetailVorgaenge] = useState<ObjektAnlageVorgangRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ObjektAnlage | null>(null)
  const [pending, startTransition] = useTransition()

  const [formState, setFormState] = useState<ObjektAnlageFormState>(() =>
    emptyAnlageFormState(gewerke)
  )
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setListe(initial)
  }, [initial])

  useEffect(() => {
    if (!detail) {
      setDetailVorgaenge([])
      return
    }
    let cancelled = false
    setDetailLoading(true)
    void loadObjektAnlageVorgaenge(kundeId, objektId, detail.id).then((r) => {
      if (cancelled) return
      setDetailLoading(false)
      if (r.ok) setDetailVorgaenge(r.rows)
      else toast.error(r.message)
    })
    return () => {
      cancelled = true
    }
  }, [detail, kundeId, objektId])

  function openNeu() {
    setEdit(null)
    setFormState(emptyAnlageFormState(gewerke))
    setErr(null)
    setDirty(false)
    setFormOpen(true)
  }

  function openBearbeiten(a: ObjektAnlage) {
    setEdit(a)
    setFormState(anlageFormStateFromRow(a))
    setErr(null)
    setDirty(false)
    setFormOpen(true)
  }

  function speichern() {
    setErr(null)
    startTransition(async () => {
      const input = anlageInputFromFormState(formState)
      if (edit) {
        const r = await updateObjektAnlage(kundeId, objektId, edit.id, input)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) =>
          prev.map((a) =>
            a.id === edit.id
              ? { ...r.anlage, vorgang_count: a.vorgang_count ?? 0 }
              : a
          )
        )
        if (detail?.id === edit.id) setDetail({ ...r.anlage, vorgang_count: edit.vorgang_count })
        toast.success('Anlage gespeichert')
      } else {
        const r = await createObjektAnlage(kundeId, objektId, input)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) => [...prev, r.anlage])
        toast.success('Anlage angelegt')
      }
      setDirty(false)
      setFormOpen(false)
      onChanged()
    })
  }

  function runDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const r = await deleteObjektAnlage(kundeId, objektId, deleteTarget.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setListe((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      if (detail?.id === deleteTarget.id) setDetail(null)
      setDeleteTarget(null)
      toast.success('Anlage gelöscht')
      onChanged()
    })
  }

  function rowMenu(a: ObjektAnlage): EntityMenuItem[] {
    const items: EntityMenuItem[] = [
      { icon: 'pencil', label: 'Bearbeiten', onClick: () => openBearbeiten(a) },
    ]
    if (a.status !== 'stillgelegt') {
      items.push({
        label: 'Stilllegen',
        onClick: () => {
          startTransition(async () => {
            const r = await updateObjektAnlage(kundeId, objektId, a.id, {
              ...anlageToInput(a),
              status: 'stillgelegt',
            })
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            setListe((prev) =>
              prev.map((x) =>
                x.id === a.id ? { ...r.anlage, vorgang_count: x.vorgang_count } : x
              )
            )
            toast.success('Anlage stillgelegt')
            onChanged()
          })
        },
      })
    }
    if ((a.vorgang_count ?? 0) === 0) {
      items.push('sep', {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => setDeleteTarget(a),
      })
    }
    return items
  }

  function rowBody(a: ObjektAnlage) {
    const gewerkName = a.gewerke?.name ?? '—'
    const count = a.vorgang_count ?? 0
    const statusLabel = OBJEKT_ANLAGE_STATUS_LABELS[a.status]
    const badgeKind = OBJEKT_ANLAGE_STATUS_BADGE[a.status]

    return (
      <div
        key={a.id}
        className={cn(
          isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row',
          'cursor-pointer'
        )}
      >
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          style={isMobile ? undefined : { gridTemplateColumns: LIST_COLS }}
          onClick={() => setDetail(a)}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{a.bezeichnung}</span>
                <MockBadge kind={badgeKind}>{statusLabel}</MockBadge>
              </div>
              <div className="ap-mobile-card__meta">
                <span className="meta-tag">{gewerkName}</span>
              </div>
              <div className="ap-mobile-card__meta">
                {[a.standort?.trim(), count ? `${count} Vorgänge` : 'Keine Vorgänge']
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">{a.bezeichnung}</span>
              <span>
                <span className="meta-tag">{gewerkName}</span>
              </span>
              <span className="ap-list__dim">{a.standort?.trim() || '—'}</span>
              <span className="ap-list__dim">{count}</span>
              <span>
                <MockBadge kind={badgeKind}>{statusLabel}</MockBadge>
              </span>
            </>
          )}
        </button>
        {!isMobile ? (
          <div
            className="row-actions always"
            onClick={(e) => e.stopPropagation()}
            style={{ justifyContent: 'flex-end' }}
          >
            <MockEntityRowMenu items={rowMenu(a)} title="Anlage" />
          </div>
        ) : null}
      </div>
    )
  }

  const detailEinheit = detail ? einheitLabel(detail) : null

  return (
    <>
      <MockCard
        title={liste.length ? `Anlagen & Teile · ${liste.length}` : 'Anlagen & Teile'}
        icon="tool"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
            {LIST.hinzufuegen}
          </MockBtn>
        }
      >
        {liste.length === 0 ? (
          <MockEmpty icon="tool" title="Noch keine Anlagen" />
        ) : isMobile ? (
          <div className="ap-cards">{liste.map(rowBody)}</div>
        ) : (
          <div className="listcard">
            <div className="list-row head" style={{ gridTemplateColumns: LIST_COLS }} aria-hidden>
              <div>Bezeichnung</div>
              <div>Gewerk</div>
              <div>Standort</div>
              <div>Vorgänge</div>
              <div>Status</div>
              <div />
            </div>
            {liste.map((a) => (
              <div
                key={a.id}
                className="list-row"
                style={{ gridTemplateColumns: LIST_COLS, cursor: 'default' }}
              >
                <button
                  type="button"
                  className="lc-title text-left"
                  style={{ fontWeight: 600, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                  onClick={() => setDetail(a)}
                >
                  {a.bezeichnung}
                </button>
                <div>
                  <span className="meta-tag">{a.gewerke?.name ?? '—'}</span>
                </div>
                <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                  {a.standort?.trim() || '—'}
                </div>
                <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                  {a.vorgang_count ?? 0}
                </div>
                <div>
                  <MockBadge kind={OBJEKT_ANLAGE_STATUS_BADGE[a.status]}>
                    {OBJEKT_ANLAGE_STATUS_LABELS[a.status]}
                  </MockBadge>
                </div>
                <div
                  className="row-actions always"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: 'flex-end' }}
                >
                  <MockEntityRowMenu items={rowMenu(a)} title="Anlage" />
                </div>
              </div>
            ))}
          </div>
        )}
      </MockCard>

      <EditorSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={edit ? 'Anlage bearbeiten' : 'Anlage hinzufügen'}
        context="detail"
        dirty={dirty}
        onConfirm={speichern}
        confirmDisabled={pending || !formState.bezeichnung.trim() || !formState.gewerkId}
        confirmBusy={pending}
      >
        <ObjektAnlageFormFields
          kundeId={kundeId}
          gewerke={gewerke}
          einheiten={einheiten}
          state={formState}
          onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
          onDirty={() => setDirty(true)}
        />
        {err ? (
          <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-meta)', marginTop: 8 }}>{err}</p>
        ) : null}
      </EditorSheet>

      <EditorSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.bezeichnung ?? 'Anlage'}
        context="detail"
      >
        {detail ? (
          <div className="space-y-4">
            <div className="card">
              <div className="card-b space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="meta-tag">{detail.gewerke?.name ?? '—'}</span>
                  <MockBadge kind={OBJEKT_ANLAGE_STATUS_BADGE[detail.status]}>
                    {OBJEKT_ANLAGE_STATUS_LABELS[detail.status]}
                  </MockBadge>
                </div>
                {detail.standort?.trim() ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Standort: {detail.standort}
                  </p>
                ) : null}
                {detailEinheit ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Einheit: {detailEinheit}
                  </p>
                ) : null}
                {detail.einbau_datum ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Einbau: {fmtDatum(detail.einbau_datum)}
                  </p>
                ) : null}
                {detail.hersteller?.trim() || detail.modell?.trim() ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    {[detail.hersteller?.trim(), detail.modell?.trim()].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {detail.seriennummer?.trim() ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Serien-Nr.: {detail.seriennummer}
                  </p>
                ) : null}
                {formatAnlageGarantieHint(detail.garantie_bis) ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    {formatAnlageGarantieHint(detail.garantie_bis)}
                  </p>
                ) : null}
                {detail.gewaehrleistung_bis ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Gewährleistung bis: {fmtDatum(detail.gewaehrleistung_bis)}
                  </p>
                ) : null}
                {detail.anschaffungswert_eur != null && detail.anschaffungswert_eur > 0 ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Neuwert: {detail.anschaffungswert_eur.toLocaleString('de-DE')} €
                  </p>
                ) : null}
                {detail.wartungsintervall ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Wartung:{' '}
                    {OBJEKT_ANLAGE_WARTUNGSINTERVALL_LABELS[detail.wartungsintervall] ??
                      detail.wartungsintervall}
                    {detail.letzte_wartung_am
                      ? ` · zuletzt ${fmtDatum(detail.letzte_wartung_am)}`
                      : ''}
                  </p>
                ) : null}
                {detail.foto_url?.trim() ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-meta)' }}>
                    <a
                      href={detail.foto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bw-link hover:underline"
                    >
                      Foto ansehen
                    </a>
                  </p>
                ) : null}
                {(detail.dokument_urls ?? []).length ? (
                  <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-2)' }}>
                    Dokumente:{' '}
                    {(detail.dokument_urls ?? []).map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bw-link hover:underline"
                      >
                        {i > 0 ? ', ' : ''}
                        {i + 1}
                      </a>
                    ))}
                  </div>
                ) : null}
                {detail.notiz?.trim() ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>
                    {detail.notiz}
                  </p>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <MockBtn sm kind="ghost" icon="pencil" onClick={() => openBearbeiten(detail)}>
                    Bearbeiten
                  </MockBtn>
                </div>
              </div>
            </div>

            <MockFormSection title="Verknüpfte Vorgänge">
              {detailLoading ? (
                <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
                  Wird geladen …
                </p>
              ) : detailVorgaenge.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
                  Noch keine Vorgänge mit dieser Anlage verknüpft.
                </p>
              ) : (
                <div className="listcard">
                  <div
                    className="list-row head"
                    style={{ gridTemplateColumns: 'minmax(0, 1fr) 100px 88px' }}
                    aria-hidden
                  >
                    <div>Vorgang</div>
                    <div>Datum</div>
                    <div>Status</div>
                  </div>
                  {detailVorgaenge.map((v) => (
                    <div
                      key={v.id}
                      className="list-row"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) 100px 88px' }}
                    >
                      <Link
                        href={`/anfragen/${v.id}`}
                        className="lc-title text-bw-link hover:underline"
                        style={{ fontWeight: 600 }}
                      >
                        {v.titel}
                      </Link>
                      <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                        {fmtDatum(v.created_at)}
                      </div>
                      <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                        {v.status ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </MockFormSection>
          </div>
        ) : null}
      </EditorSheet>

      <MockModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!pending) setDeleteTarget(null)
        }}
        icon="trash"
        title="Anlage löschen?"
        sub="Nur möglich ohne verknüpfte Vorgänge."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={pending} onClick={() => setDeleteTarget(null)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn kind="danger" icon="trash" disabled={pending} onClick={() => void runDelete()}>
              {pending ? 'Wird gelöscht…' : 'Löschen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          „{deleteTarget?.bezeichnung ?? 'Anlage'}“ wird unwiderruflich gelöscht.
        </div>
      </MockModal>
    </>
  )
}
