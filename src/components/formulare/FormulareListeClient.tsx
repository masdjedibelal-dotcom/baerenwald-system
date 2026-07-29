'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { DokumentPdfVorlagenSection } from '@/components/formulare/DokumentPdfVorlagenSection'
import { FormularCreateSheet } from '@/components/formulare/FormularCreateSheet'
import type { FormularListeZeile } from '@/app/(dashboard)/formulare/actions'
import type { DokumentPdfMusterEintrag } from '@/lib/templates/dokument-pdf-muster'

const COLS = 'minmax(0, 1.6fr) 120px 90px 28px'

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
        <span
          style={{
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      <div>{children}</div>
    </div>
  )
}

function typLabel(f: FormularListeZeile): string {
  const phase = (f.phase ?? '').toLowerCase()
  const sub = (f.subtyp ?? '').toLowerCase()
  if (phase === 'abnahme' || sub === 'abnahme') return 'Abnahme'
  if (phase === 'update' || sub === 'bautagebuch' || sub === 'bautagebuch_kurz') return 'Update'
  if (phase === 'vorab' || sub === 'checkliste') return 'Vorab'
  if (sub === 'regiebericht' || sub === 'behinderung' || sub === 'pruefprotokoll') return 'Service'
  return 'Service'
}

/** Mock-Parität: Formulare-Liste + Anlegen-Drawer. */
export function FormulareListeClient({
  templates,
  dokumentVorlagen = [],
}: {
  templates: FormularListeZeile[]
  dokumentVorlagen?: DokumentPdfMusterEintrag[]
}) {
  const router = useRouter()
  const [rows] = useState(templates)
  const [createOpen, setCreateOpen] = useState(false)

  const aktiv = useMemo(() => rows.filter((r) => r.aktiv !== false), [rows])

  return (
    <>
      {dokumentVorlagen.length > 0 ? (
        <DokumentPdfVorlagenSection vorlagen={dokumentVorlagen} />
      ) : null}
      <Sec
        title="Formulare"
        icon="forms"
        actions={
          <button type="button" className="btn ghost sm" onClick={() => setCreateOpen(true)}>
            + Formular
          </button>
        }
      >
        {aktiv.length === 0 ? (
          <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)', margin: '8px 0' }}>
            Noch keine Formular-Vorlagen.{' '}
            <button type="button" className="btn ghost sm" onClick={() => setCreateOpen(true)}>
              Formular anlegen
            </button>
          </p>
        ) : (
          <>
            <div className="listcard">
              <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
                <div>Name</div>
                <div>Typ</div>
                <div>Genutzt</div>
                <div />
              </div>
              {aktiv.map((f) => {
                const fields = f.felder?.length ?? 0
                return (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    className="list-row"
                    style={{
                      gridTemplateColumns: COLS,
                      cursor: 'pointer',
                      alignItems: 'center',
                    }}
                    onClick={() => router.push(`/formulare/${f.id}/bearbeiten`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/formulare/${f.id}/bearbeiten`)
                      }
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--fs-text)',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.name}
                      </div>
                      <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)' }}>
                        {fields} Feld{fields === 1 ? '' : 'er'}
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)' }}>
                      {typLabel(f)}
                    </div>
                    <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)' }}>
                      {f.genutzt}×
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-4)' }}>
                      <MockIcon ctx="default" n="chevron-right" size={16} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p style={{ marginTop: 12, fontSize: 'var(--fs-meta)', color: 'var(--text-4)' }}>
              {aktiv.length} Formular{aktiv.length === 1 ? '' : 'e'}
            </p>
          </>
        )}
      </Sec>

      <FormularCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
