'use client'
import { PdfSeiten } from '@/components/ui/PdfSeiten'
import { EditorSheet,type EditorSheetContext } from '@/components/surfaces/EditorSheet'

interface PdfViewerProps {
  open: boolean
  onClose: () => void
  url: string
  title: string
  /** Über DocumentCanvas: `canvas` (z-index), sonst `detail`. */
  context?: EditorSheetContext
}

export function PdfViewer({
  open,
  onClose,
  url,
  title,
  context = 'detail',
}: PdfViewerProps) {
  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      size="lg"
      secondary={{ label: 'Schließen', onClick: onClose, kind: 'ghost' }}
      primary={{ label: 'Herunterladen', href: url, download: true }}
    >
      {open && url ? <PdfSeiten url={url} className="pdf-vorschau" /> : null}
    </EditorSheet>
  )
}
