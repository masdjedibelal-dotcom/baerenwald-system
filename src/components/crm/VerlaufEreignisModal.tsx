'use client'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

import { useRouter } from 'next/navigation'
<<<<<<< Updated upstream
=======
import { Modal } from '@/components/ui/Modal'
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import type { VerlaufInspectTarget } from '@/lib/crm/verlauf'
import { formatDatumZeit } from '@/lib/utils'

const KIND_LABEL: Record<VerlaufInspectTarget['kind'], string> = {
  email: 'E-Mail',
  angebot: 'Angebot',
  rechnung: 'Rechnung',
  event: 'Ereignis',
}

export function VerlaufEreignisModal({
  target,
  open,
  onClose,
}: {
  target: VerlaufInspectTarget | null
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  if (!target || target.kind === 'email') return null

  const fotos = (target.fotoUrls ?? []).filter(Boolean)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={target.title}
      size="md"
<<<<<<< Updated upstream
      secondary={{ label: 'Schließen', onClick: onClose }}
      primary={
        target.href
          ? {
              label: target.hrefLabel ?? 'Öffnen',
              onClick: () => {
                onClose()
                router.push(target.href!)
              },
            }
          : null
=======
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <MockBtn type="button" kind="secondary" onClick={onClose}>
            Schließen
          </MockBtn>
          {target.href ? (
            <MockBtn
              type="button"
              kind="primary"
              onClick={() => {
                onClose()
                router.push(target.href!)
              }}
            >
              {target.hrefLabel ?? 'Öffnen'}
            </MockBtn>
          ) : null}
        </div>
>>>>>>> Stashed changes
      }
    >
      <dl className="grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
        <dt className="text-bw-text-muted">Art</dt>
        <dd>{KIND_LABEL[target.kind]}</dd>
        {target.createdAt ? (
          <>
            <dt className="text-bw-text-muted">Zeitpunkt</dt>
            <dd>{formatDatumZeit(target.createdAt)}</dd>
          </>
        ) : null}
        {target.typ ? (
          <>
            <dt className="text-bw-text-muted">Typ</dt>
            <dd className="font-mono text-xs">{target.typ}</dd>
          </>
        ) : null}
        {target.description ? (
          <>
            <dt className="text-bw-text-muted">Details</dt>
            <dd className="whitespace-pre-wrap">{target.description}</dd>
          </>
        ) : (
          <>
            <dt className="text-bw-text-muted">Details</dt>
            <dd><MockEmpty title="Keine weiteren Details hinterlegt." /></dd>
          </>
        )}
      </dl>
      {fotos.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {fotos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-20 w-20 rounded-card border border-bw-border object-cover"
              />
            </a>
          ))}
        </div>
      ) : null}
    </EditorSheet>
  )
}
