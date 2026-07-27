'use client'

import { useCallback, useState } from 'react'
import { MockCard, MockEmpty } from '@/components/mock-ui'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import type { VorgangFoto } from '@/lib/vorgang/vorgang-fotos'
import { cn } from '@/lib/utils'

const QUELLE_LABEL: Record<VorgangFoto['quelle'], string> = {
  meldung: 'Meldung',
  angebot: 'Angebot',
}

function fotoDateiname(url: string, index: number): string {
  try {
    const path = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://local').pathname
    const base = path.split('/').pop()?.split('?')[0]?.trim()
    if (base && /\.[a-z0-9]{2,5}$/i.test(base)) return base
  } catch {
    /* ignore */
  }
  return `vorgangsfoto-${index + 1}.jpg`
}

async function downloadFoto(url: string, filename: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
}

export function VorgangFotosTab({
  fotos,
  emptyHint = 'Fotos aus Meldung oder Angebot erscheinen hier, sobald vorhanden.',
}: {
  fotos: VorgangFoto[]
  emptyHint?: string
}) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const current = fotos[active] ?? fotos[0] ?? null

  const openLightbox = useCallback((index: number) => {
    setActive(index)
    setLightboxOpen(true)
  }, [])

  const onDownload = useCallback(async () => {
    if (!current || downloading) return
    setDownloading(true)
    try {
      await downloadFoto(current.url, fotoDateiname(current.url, active))
    } finally {
      setDownloading(false)
    }
  }, [active, current, downloading])

  if (!fotos.length) {
    return (
      <MockCard title="Fotos" icon="photo">
        <MockEmpty icon="photo" title="Keine Fotos" hint={emptyHint} />
      </MockCard>
    )
  }

  return (
    <>
      <MockCard title={`Fotos · ${fotos.length}`} icon="photo">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {fotos.map((f, i) => (
            <button
              key={`${f.quelle}-${f.url}`}
              type="button"
              className={cn(
                'h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border transition-shadow',
                i === active
                  ? 'border-[var(--green)] ring-2 ring-[color-mix(in_srgb,var(--green)_28%,transparent)]'
                  : 'border-[var(--border)]'
              )}
              onClick={() => setActive(i)}
              onDoubleClick={() => openLightbox(i)}
              aria-label={`Foto ${i + 1}`}
              aria-pressed={i === active}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        {current ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => openLightbox(active)}
              className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] text-left"
              aria-label="Foto vergrößern"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt={current.beschreibung || 'Vorgangsfoto'}
                className="mx-auto max-h-[min(420px,55vh)] w-full object-contain"
              />
            </button>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-3)]">
              <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 font-medium">
                {QUELLE_LABEL[current.quelle]}
              </span>
              {current.beschreibung ? <span>{current.beschreibung}</span> : null}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="font-medium text-[var(--green)] hover:underline"
                  onClick={() => openLightbox(active)}
                >
                  Vergrößern
                </button>
                <button
                  type="button"
                  className="font-medium text-[var(--green)] hover:underline disabled:opacity-50"
                  disabled={downloading}
                  onClick={() => void onDownload()}
                >
                  {downloading ? 'Lädt…' : 'Herunterladen'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </MockCard>

      <MockModal
        open={lightboxOpen && !!current}
        onClose={() => setLightboxOpen(false)}
        icon="photo"
        title={current?.beschreibung?.trim() || `Foto ${active + 1}`}
        sub={current ? `${QUELLE_LABEL[current.quelle]} · ${active + 1} / ${fotos.length}` : undefined}
        footer={
          <>
            <MockBtn
              sm
              kind="ghost"
              icon="download"
              disabled={downloading}
              onClick={() => void onDownload()}
            >
              {downloading ? 'Lädt…' : 'Herunterladen'}
            </MockBtn>
            <div style={{ flex: 1 }} />
            {fotos.length > 1 ? (
              <>
                <MockBtn
                  sm
                  kind="ghost"
                  disabled={active <= 0}
                  onClick={() => setActive((i) => Math.max(0, i - 1))}
                >
                  Zurück
                </MockBtn>
                <MockBtn
                  sm
                  kind="ghost"
                  disabled={active >= fotos.length - 1}
                  onClick={() => setActive((i) => Math.min(fotos.length - 1, i + 1))}
                >
                  Weiter
                </MockBtn>
              </>
            ) : null}
            <MockBtn sm kind="primary" icon="x" onClick={() => setLightboxOpen(false)}>
              Schließen
            </MockBtn>
          </>
        }
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.beschreibung || 'Vorgangsfoto'}
            style={{
              width: '100%',
              maxHeight: 'min(75vh, 720px)',
              objectFit: 'contain',
              borderRadius: 8,
              display: 'block',
              margin: '0 auto',
              background: 'var(--bg-soft)',
            }}
          />
        ) : null}
      </MockModal>
    </>
  )
}
