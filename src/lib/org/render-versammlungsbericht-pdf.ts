import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import {
  buildVersammlungsberichtViewModel,
  buildVersammlungsberichtFilename,
} from '@/lib/objektakte/build-versammlungsbericht-view-model'
import { loadVersammlungsberichtPayload } from '@/lib/objektakte/load-versammlungsbericht-data'
import {
  buildVersammlungsberichtHtml,
  buildVersammlungsberichtPdfFooterTemplate,
} from '@/lib/templates/versammlungsbericht-template'
import { createClient } from '@/lib/supabase-server'

export type RenderVersammlungsberichtResult =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; message: string }

const PDF_MARGIN = {
  top: '14mm',
  right: '16mm',
  bottom: '28mm',
  left: '16mm',
}

export async function renderVersammlungsberichtPdf(input: {
  kundeId: string
  objektId: string
  von: string
  bis: string
  einzelpreise: boolean
}): Promise<RenderVersammlungsberichtResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const payload = await loadVersammlungsberichtPayload(input)
  if (!payload) return { ok: false, message: 'Objekt nicht gefunden.' }

  const vm = buildVersammlungsberichtViewModel(payload)
  const html = buildVersammlungsberichtHtml(payload)
  const buffer = await renderHtmlToPdfBuffer(html, {
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: buildVersammlungsberichtPdfFooterTemplate(vm),
    margin: PDF_MARGIN,
  })

  const filename = buildVersammlungsberichtFilename(payload)

  return { ok: true, buffer, filename }
}
