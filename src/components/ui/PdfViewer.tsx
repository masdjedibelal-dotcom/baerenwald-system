'use client'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

interface PdfViewerProps {
  open: boolean
  onClose: () => void
  url: string
  title: string
}

export function PdfViewer({ open, onClose, url, title }: PdfViewerProps) {
  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      secondary={{ label: 'Schließen', onClick: onClose, kind: 'ghost' }}
      primary={{ label: 'Herunterladen', href: url, download: true }}
    >
      <div className="h-96 w-full md:h-[600px]">
        <iframe
          src={`${url}#toolbar=0`}
          className="h-full w-full rounded-card border border-bw-border"
          title={title}
        />
      </div>
    </EditorSheet>
  )
}
