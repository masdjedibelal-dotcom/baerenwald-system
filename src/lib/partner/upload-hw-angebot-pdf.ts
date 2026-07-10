import { randomUUID } from 'crypto'
import { PARTNER_UPLOAD_BUCKET } from '@/lib/partner/handwerker-einreichung'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_PDF_BYTES = 15 * 1024 * 1024

export function parseHwPreisEuro(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const n = Number(raw.replace(',', '.').trim())
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export async function uploadHwAngebotPdfFromCrm(opts: {
  handwerkerId: string
  zuweisungId: string
  file: File
}): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const mime = opts.file.type || 'application/pdf'
  if (mime !== 'application/pdf' && !opts.file.name.toLowerCase().endsWith('.pdf')) {
    return { ok: false, message: 'Bitte eine PDF-Datei hochladen.' }
  }
  if (opts.file.size <= 0) {
    return { ok: false, message: 'Die Datei ist leer.' }
  }
  if (opts.file.size > MAX_PDF_BYTES) {
    return { ok: false, message: 'PDF ist zu groß (max. 15 MB).' }
  }

  const prefix = `${opts.handwerkerId.trim()}/angebote/${opts.zuweisungId.trim()}/angebot`
  const path = `${prefix}-${randomUUID()}.pdf`
  const buf = Buffer.from(await opts.file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: 'application/pdf', upsert: false })

  if (error) return { ok: false, message: error.message }
  return { ok: true, path }
}
