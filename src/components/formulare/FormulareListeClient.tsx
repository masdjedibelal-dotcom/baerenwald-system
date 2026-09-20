'use client'

import { MockBtn, MockChip, MockEmpty, MockPager, MockSortHead } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { DokumentPdfVorlagenSection } from '@/components/formulare/DokumentPdfVorlagenSection'
import { FormularCreateSheet } from '@/components/formulare/FormularCreateSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useListPage } from '@/hooks/useListPage'
import type { FormularListeZeile } from '@/app/(dashboard)/formulare/actions'
import type { DokumentPdfMusterEintrag } from '@/lib/templates/dokument-pdf-muster'

const COLS = 'minmax(0, 1.6fr) 120px 90px 28px'

type SortCol = 'name' | 'typ' | 'genutzt'
type TypFilter = 'alle' | 'Abnahme' | 'Update' | 'Vorab' | 'Service'

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
    <section className="formulare-sec">
      <div className="formulare-sec__head">
        {icon ? <MockIcon ctx="nav" n={icon} size={16} style={{ color: 'var(--text-3)' }} /> : null}
        <span className="formulare-sec__title">{title}</span>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      <div>{children}</div>
    </section>
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
  const isMobile = useIsMobile()
  const [rows] = useState(templates)
  const [createOpen, setCreateOpen] = useState(false)
  const [typFilter, setTypFilter] = useState<TypFilter>('alle')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const aktiv = useMemo(() => rows.filter((r) => r.aktiv !== false), [rows])

  const typCounts = useMemo(() => {
    const c: Record<TypFilter, number> = { alle: aktiv.length, Abnahme: 0, Update: 0, Vorab: 0, Service: 0 }
    for (const f of aktiv) {
      const t = typLabel(f) as Exclude<TypFilter, 'alle'>
      c[t] = (c[t] ?? 0) + 1
    }
    return c
  }, [aktiv])

  const filtered = useMemo(() => {
    const base = typFilter === 'alle' ? aktiv : aktiv.filter((f) => typLabel(f) === typFilter)
    const sorted = [...base]
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'de')
      else if (sortCol === 'typ') cmp = typLabel(a).localeCompare(typLabel(b), 'de')
      else cmp = (a.genutzt ?? 0) - (b.genutzt ?? 0)
      return cmp * sortDir
    })
    return sorted
  }, [aktiv, typFilter, sortCol, sortDir])

  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    40,
    `${typFilter}|${sortCol}|${sortDir}`
  )

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortCol(col)
      setSortDir(1)
    }
  }

  const typChips: TypFilter[] = ['alle', 'Abnahme', 'Update', 'Vorab', 'Service']

  return (
    <>
      {dokumentVorlagen.length > 0 ? (
        <DokumentPdfVorlagenSection vorlagen={dokumentVorlagen} />
      ) : null}
      <Sec
        title="Formulare"
        icon="forms"
        actions={
          <MockBtn kind="ghost" sm type="button" onClick={() => setCreateOpen(true)}>
            + Formular
          </MockBtn>
        }
      >
        <div className="chiprow mb-3 flex flex-wrap gap-2">
          {typChips.map((t) => (
            <MockChip
              key={t}
              active={typFilter === t}
              count={typCounts[t]}
              onClick={() => setTypFilter(t)}
            >
              {t === 'alle' ? 'Alle' : t}
            </MockChip>
          ))}
        </div>

        {aktiv.length === 0 ? (
          <MockEmpty
            icon="forms"
            title="Noch keine Formular-Vorlagen"
            hint="Lege ein Formular an, um Checklisten und Abnahmen zu standardisieren."
            action={
              <MockBtn kind="primary" sm type="button" onClick={() => setCreateOpen(true)}>
                Formular anlegen
              </MockBtn>
            }
          />
        ) : filtered.length === 0 ? (
          <MockEmpty
            icon="filter"
            title="Keine Treffer"
            hint="Anderen Typ-Filter wählen."
          />
        ) : (
          <>
            <div
              className="listcard listcard--cols"
              style={{ ['--list-cols' as string]: COLS }}
            >
              <div className="list-row head" aria-hidden={!isMobile ? undefined : true}>
                <MockSortHead col="name" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
                  Name
                </MockSortHead>
                <MockSortHead col="typ" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
                  Typ
                </MockSortHead>
                <MockSortHead col="genutzt" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
                  Genutzt
                </MockSortHead>
                <div />
              </div>
              {pageItems.map((f) => {
                const fields = f.felder?.length ?? 0
                const typ = typLabel(f)
                const open = () => router.push(`/formulare/${f.id}/bearbeiten`)
                return (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    className="list-row"
                    style={{ cursor: 'pointer', alignItems: 'center' }}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        open()
                      }
                    }}
                  >
                    {isMobile ? (
                      <>
                        <div className="lc-title">{f.name}</div>
                        <div className="lc-pills">
                          <span className="pill-tag">{typ}</span>
                        </div>
                        <div className="lc-sub">
                          {fields} Feld{fields === 1 ? '' : 'er'} · {f.genutzt}× genutzt
                        </div>
                        <div className="row-actions" style={{ color: 'var(--text-4)' }}>
                          <MockIcon ctx="default" n="chevron-right" size={16} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 'var(--fs-text)',
                              fontWeight: 600,
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
                        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)' }}>{typ}</div>
                        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)' }}>
                          {f.genutzt}×
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-4)' }}>
                          <MockIcon ctx="default" n="chevron-right" size={16} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {totalPages > 1 ? (
              <MockPager
                pageIndex={pageIndex}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                unit="Formulare"
                onPageChange={(p) => setPageIndex(p - 1)}
              />
            ) : (
              <p className="formulare-sec__count">
                {filtered.length} Formular{filtered.length === 1 ? '' : 'e'}
              </p>
            )}
          </>
        )}
      </Sec>

      <FormularCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
