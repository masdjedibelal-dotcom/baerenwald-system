'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { FormularVorschauModal } from '@/components/formulare/FormularVorschauModal'
import { DokumentPdfVorlagenSection } from '@/components/formulare/DokumentPdfVorlagenSection'
import { toast } from '@/components/ui/app-toast'
import {
  deleteFormularTemplate,
  duplicateFormularTemplate,
  type FormularListeZeile,
} from '@/app/(dashboard)/formulare/actions'
import type { DokumentPdfMusterEintrag } from '@/lib/templates/dokument-pdf-muster'
import type { FormularFeld } from '@/lib/types'

const COLS = '28px 1.6fr 1fr 100px 90px'

function Sec({
  title,
  icon,
  actions,
  children,
}: {
  title: string
  icon?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        {icon ? <MockIcon ctx="nav" n={icon} size={16} style={{ color: 'var(--text-3)' }} /> : null}
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      <div>{children}</div>
    </div>
  )
}

/** Mock-Typ: Abnahme · Update · Vorab · Service */
function typLabel(f: FormularListeZeile): string {
  const phase = (f.phase ?? '').toLowerCase()
  const sub = (f.subtyp ?? '').toLowerCase()
  if (phase === 'abnahme' || sub === 'abnahme') return 'Abnahme'
  if (phase === 'update' || sub === 'bautagebuch' || sub === 'bautagebuch_kurz') return 'Update'
  if (phase === 'vorab' || sub === 'checkliste') return 'Vorab'
  if (sub === 'regiebericht' || sub === 'behinderung' || sub === 'pruefprotokoll') return 'Service'
  return 'Service'
}

function hatVorschau(felder: FormularFeld[] | null | undefined): boolean {
  return (felder?.length ?? 0) > 0
}

/** Mock-Parität: Formulare-Liste unter Einstellungen. */
export function FormulareListeClient({
  templates,
  dokumentVorlagen = [],
}: {
  templates: FormularListeZeile[]
  dokumentVorlagen?: DokumentPdfMusterEintrag[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState(templates)
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<FormularListeZeile | null>(null)

  const aktiv = useMemo(() => rows.filter((r) => r.aktiv !== false), [rows])

  function onDuplizieren(f: FormularListeZeile) {
    startTransition(async () => {
      const r = await duplicateFormularTemplate(f.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Formular dupliziert')
      router.push(`/formulare/${r.id}/bearbeiten`)
      router.refresh()
    })
  }

  function onLoeschen(f: FormularListeZeile) {
    if (!confirm(`„${f.name}“ löschen?`)) return
    startTransition(async () => {
      const r = await deleteFormularTemplate(f.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setRows((prev) => prev.filter((x) => x.id !== f.id))
      toast.success('Formular gelöscht')
      router.refresh()
    })
  }

  return (
    <>
      {dokumentVorlagen.length > 0 ? (
        <DokumentPdfVorlagenSection vorlagen={dokumentVorlagen} />
      ) : null}
      <Sec
        title={`Baustellen-Formulare · ${aktiv.length}`}
        icon="forms"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={() => router.push('/formulare/neu')}>
            Formular
          </MockBtn>
        }
      >
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 12px', lineHeight: 1.45 }}>
          Interaktive Vorlagen für Handwerker (Bautagebuch, Regie, Prüfung, Abnahme-Checkliste).
          Augen-Icon = Vorschau der Felder.
        </p>
        {aktiv.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '8px 0' }}>
            Noch keine Formular-Vorlagen.{' '}
            <Link href="/formulare/neu" style={{ color: 'var(--green)' }}>
              Erstes Formular anlegen
            </Link>
          </p>
        ) : (
          <div style={{ margin: 0 }}>
            <div className="list-row head" style={{ gridTemplateColumns: COLS }}>
              <div />
              <div>Name</div>
              <div>Typ</div>
              <div>Genutzt</div>
              <div />
            </div>
            {aktiv.map((f) => {
              const fields = f.felder?.length ?? 0
              const canPreview = hatVorschau(f.felder)
              return (
                <div
                  key={f.id}
                  className="list-row"
                  style={{
                    gridTemplateColumns: COLS,
                    cursor: 'default',
                    alignItems: 'center',
                  }}
                >
                  <MockIcon ctx="row" n="file-text" size={18} style={{ color: 'var(--text-3)' }} />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    {f.name}
                    <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>
                      {' '}
                      · {fields} Feld{fields === 1 ? '' : 'er'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{typLabel(f)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {f.genutzt}× genutzt
                  </div>
                  <div style={{ display: 'flex', gap: 0, justifyContent: 'flex-end' }}>
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="eye"
                      title={canPreview ? 'Vorschau' : 'Keine Vorschau (keine Felder)'}
                      disabled={!canPreview || pending}
                      onClick={() => canPreview && setPreview(f)}
                    />
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="pencil"
                      title="Editor"
                      disabled={pending}
                      onClick={() => router.push(`/formulare/${f.id}/bearbeiten`)}
                    />
                    <MockEntityRowMenu
                      items={[
                        ...(canPreview
                          ? [
                              {
                                icon: 'eye',
                                label: 'Vorschau',
                                onClick: () => setPreview(f),
                              } as const,
                            ]
                          : []),
                        {
                          icon: 'pencil',
                          label: 'Bearbeiten',
                          onClick: () => router.push(`/formulare/${f.id}/bearbeiten`),
                        },
                        {
                          icon: 'copy',
                          label: 'Kopieren',
                          onClick: () => onDuplizieren(f),
                        },
                        'sep',
                        {
                          icon: 'trash',
                          label: 'Löschen',
                          danger: true,
                          onClick: () => onLoeschen(f),
                        },
                      ]}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Sec>

      {preview ? (
        <FormularVorschauModal
          open
          onClose={() => setPreview(null)}
          name={preview.name}
          felder={preview.felder ?? []}
        />
      ) : null}
    </>
  )
}
