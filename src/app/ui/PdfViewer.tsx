'use client'

import { Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface PdfViewerProps {
  open: boolean
  onClose: () => void
  url: string
  title: string
}

export function PdfViewer({ open, onClose, url, title }: PdfViewerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex w-full justify-between gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Schließen
          </button>
          <a href={url} download className="btn btn-primary inline-flex items-center gap-2">
            <Download className="h-4 w-4" aria-hidden />
            Herunterladen
          </a>
        </div>
      }
    >
      <div className="h-96 w-full md:h-[600px]">
        <iframe
          src={`${url}#toolbar=0`}
          className="h-full w-full rounded-lg border border-bw-border"
          title={title}
        />
      </div>
    </Modal>
  )
}
