'use client'

import { useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { DokumentPdfMusterEintrag } from '@/lib/templates/dokument-pdf-muster'

const COLS = '28px minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1.4fr) 70px'

function Sec({
  title,
  icon,
  hint,
  children,
}: {
  title: string
  icon?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="formulare-sec">
      <div className="formulare-sec__head">
        {icon ? <MockIcon ctx="nav" n={icon} size={16} style={{ color: 'var(--text-3)' }} /> : null}
        <span className="formulare-sec__title formulare-sec__title--plain">{title}</span>
        <div style={{ flex: 1 }} />
        {hint ? <span className="formulare-sec__hint">{hint}</span> : null}
      </div>
      <div>{children}</div>
    </section>
  )
}

/** Kunden-PDFs (Angebot, Rechnung, …) mit Mustermann-Vorschau. */
export function DokumentPdfVorlagenSection({
  vorlagen,
}: {
  vorlagen: DokumentPdfMusterEintrag[]
}) {
  const [preview, setPreview] = useState<DokumentPdfMusterEintrag | null>(null)
  const isMobile = useIsMobile()

  return (
    <>
      <Sec
        title={`Dokumentvorlagen · ${vorlagen.length}`}
        icon="file-invoice"
        hint="Muster: Max Mustermann"
      >
        <p className="formulare-sec__lead">
          Alle PDFs, die an Kunden versendet werden — Vorschau mit Beispieldaten (nicht speicherbar,
          Layout kommt aus dem System).
        </p>
        <div className="listcard listcard--cols" style={{ ['--list-cols' as string]: COLS }}>
          <div className="list-row head" aria-hidden>
            <div />
            <div>Dokument</div>
            <div>Art</div>
            <div>Inhalt</div>
            <div />
          </div>
          {vorlagen.map((v) => {
            const canPreview = Boolean(v.html?.trim())
            const openPreview = () => canPreview && setPreview(v)
            return (
              <div
                key={v.id}
                className="list-row"
                style={{
                  cursor: canPreview ? 'pointer' : 'default',
                  alignItems: 'center',
                  opacity: canPreview ? 1 : 0.65,
                }}
                onClick={openPreview}
                onKeyDown={(e) => {
                  if (!canPreview) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setPreview(v)
                  }
                }}
                role="button"
                tabIndex={canPreview ? 0 : -1}
              >
                {isMobile ? (
                  <>
                    <div className="lc-title">{v.title}</div>
                    <div className="lc-pills">
                      <span className="pill-tag">{v.art}</span>
                    </div>
                    <div className="lc-sub">{v.description}</div>
                    <div
                      className="row-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="eye"
                        title={canPreview ? 'Vorschau' : 'Keine Vorschau'}
                        disabled={!canPreview}
                        onClick={() => canPreview && setPreview(v)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <MockIcon ctx="row" n={v.icon} size={18} style={{ color: 'var(--text-3)' }} />
                    <div
                      style={{
                        fontSize: 'var(--fs-text)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {v.title}
                    </div>
                    <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>{v.art}</div>
                    <div
                      style={{
                        fontSize: 'var(--fs-meta)',
                        color: 'var(--text-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {v.description}
                    </div>
                    <div
                      style={{ display: 'flex', justifyContent: 'flex-end' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="eye"
                        title={canPreview ? 'Vorschau' : 'Keine Vorschau'}
                        disabled={!canPreview}
                        onClick={() => canPreview && setPreview(v)}
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Sec>

      {preview ? (
        <MockModal
          open
          onClose={() => setPreview(null)}
          icon={preview.icon}
          title={preview.title}
          sub="Muster-PDF mit Max Mustermann"
          className="wide"
          footer={
            <>
              <div style={{ flex: 1 }} />
              <MockBtn sm kind="primary" icon="check" onClick={() => setPreview(null)}>
                Schließen
              </MockBtn>
            </>
          }
        >
          <div
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fff',
              height: 'min(70vh, 720px)',
            }}
          >
            <iframe
              title={`Vorschau ${preview.title}`}
              srcDoc={preview.html}
              style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
            />
          </div>
        </MockModal>
      ) : null}
    </>
  )
}
