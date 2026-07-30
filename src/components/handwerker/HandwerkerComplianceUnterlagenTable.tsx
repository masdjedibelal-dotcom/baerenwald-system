'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
import {
  complianceDokumentStatus,
  standardDokumente,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PartnerDokumentEditorSheet } from '@/components/handwerker/PartnerDokumentEditorSheet'
import { signPartnerDokumentUrl } from '@/app/(dashboard)/handwerker/actions'
import { toast } from '@/components/ui/app-toast'

function statusMeta(status: ComplianceDokumentStatus): {
  label: string
  tone: 'ok' | 'warn' | 'bad'
} {
  if (status === 'ok') return { label: 'Gültig', tone: 'ok' }
  if (status === 'warnung') return { label: 'Bald fällig', tone: 'warn' }
  if (status === 'abgelaufen') return { label: 'Abgelaufen', tone: 'bad' }
  return { label: 'Fehlt', tone: 'bad' }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-')
  if (y && m && d) return `${d}.${m}.${y}`
  return s
}

export function HandwerkerComplianceUnterlagenTable({
  handwerkerId,
  dokumente,
  typen,
}: {
  handwerkerId: string
  dokumente: PartnerDokument[]
  typen: ComplianceDokumentTyp[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<PartnerDokument | null>(null)

  const hochgeladen = useMemo(() => standardDokumente(dokumente), [dokumente])

  function openAdd() {
    setEditDoc(null)
    setSheetOpen(true)
  }

  function openEdit(doc: PartnerDokument) {
    setEditDoc(doc)
    setSheetOpen(true)
  }

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
  }

  const editTyp =
    editDoc != null
      ? typen.find((t) => t.slug === editDoc.typ) ?? {
          id: `fallback-${editDoc.typ}`,
          slug: editDoc.typ,
          bezeichnung: editDoc.bezeichnung || editDoc.typ,
          beschreibung: null,
          pflicht_fuer_fachbetriebe: false,
          erneuerung_monate: null,
          sort_order: 9999,
          mehrfach_erlaubt: editDoc.typ === 'individuell',
        }
      : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--fs-text)',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Unterlagen
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--fs-meta)',
              color: 'var(--text-3)',
            }}
          >
            Hochgeladene Nachweise und Dokumente dieses Handwerkers.
          </p>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={openAdd}>
          <MockIcon ctx="btn" n="plus" size={14} />
          Hinzufügen
        </Button>
      </div>

      {hochgeladen.length === 0 ? (
        <div
          className="rounded-xl px-4 py-10 text-center"
          style={{
            border: '1px dashed var(--border)',
            background: 'var(--bg-2, var(--surface-2, transparent))',
          }}
        >
          <MockIcon ctx="nav" n="file" size={28} style={{ color: 'var(--text-3)', opacity: 0.55 }} />
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 'var(--fs-text)',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Noch nichts hochgeladen
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
            Lade die erste Unterlage hoch — optional mit Vorlage aus dem Katalog.
          </p>
          <div style={{ marginTop: 16 }}>
            <Button type="button" variant="primary" onClick={openAdd}>
              <MockIcon ctx="btn" n="plus" size={14} />
              Jetzt hochladen
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {hochgeladen.map((doc) => {
            const typMeta = typen.find((t) => t.slug === doc.typ)
            const st = complianceDokumentStatus(
              typMeta ?? {
                id: doc.typ,
                slug: doc.typ,
                bezeichnung: doc.bezeichnung || doc.typ,
                beschreibung: null,
                pflicht_fuer_fachbetriebe: false,
                erneuerung_monate: null,
                sort_order: 0,
              },
              doc
            )
            const meta = statusMeta(st)
            return (
              <li
                key={doc.id}
                className="rounded-xl p-4"
                style={{
                  border: '0.5px solid var(--border)',
                  background: 'var(--surface, var(--bg))',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate"
                      style={{
                        margin: 0,
                        fontSize: 'var(--fs-text)',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {doc.bezeichnung || typMeta?.bezeichnung || doc.typ}
                    </p>
                    {typMeta?.bezeichnung &&
                    doc.bezeichnung &&
                    doc.bezeichnung !== typMeta.bezeichnung ? (
                      <p
                        className="truncate"
                        style={{
                          margin: '2px 0 0',
                          fontSize: 'var(--fs-meta)',
                          color: 'var(--text-3)',
                        }}
                      >
                        {typMeta.bezeichnung}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'hw-compliance-status',
                      meta.tone === 'ok' && 'is-ok',
                      meta.tone === 'warn' && 'is-warn',
                      meta.tone === 'bad' && 'is-bad'
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
                <div
                  className="mt-3 flex flex-wrap gap-x-3 gap-y-1"
                  style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}
                >
                  <span>Hochgeladen {formatDate(doc.hochgeladen_am)}</span>
                  {doc.gueltig_bis ? <span>Gültig bis {formatDate(doc.gueltig_bis)}</span> : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {doc.datei_url ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void openDatei(doc.datei_url)}
                    >
                      <MockIcon ctx="btn" n="eye" size={14} />
                      Ansehen
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(doc)}>
                    Bearbeiten
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <PartnerDokumentEditorSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditDoc(null)
        }}
        handwerkerId={handwerkerId}
        typ={editTyp}
        typen={typen}
        allowTypPick={!editDoc}
        existing={editDoc}
        onSaved={() => {
          setSheetOpen(false)
          setEditDoc(null)
          router.refresh()
        }}
      />
    </div>
  )
}
