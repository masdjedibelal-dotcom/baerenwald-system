import 'server-only'

import { PassThrough } from 'stream'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildRechnungPdfBuffer } from '@/lib/rechnungen/persist-pdf'
import { RECHNUNGEN_PDF_ZIP_MAX } from '@/lib/rechnungen/export-constants'

export { RECHNUNGEN_PDF_ZIP_MAX } from '@/lib/rechnungen/export-constants'

type RechnungExportRow = {
  id: string
  rechnungsnummer: string
  pdf_url: string | null
}

function safePdfName(rechnungsnummer: string): string {
  const safe = rechnungsnummer.replace(/[^\w.\-]+/g, '_').trim() || 'Rechnung'
  return safe.endsWith('.pdf') ? safe : `${safe}.pdf`
}

async function loadRechnungPdfBuffer(
  supabase: SupabaseClient,
  row: RechnungExportRow
): Promise<{ ok: true; buffer: Buffer } | { ok: false; message: string }> {
  const url = row.pdf_url?.trim()
  if (url) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        return { ok: true, buffer: Buffer.from(await res.arrayBuffer()) }
      }
    } catch {
      // Fallback: PDF neu erzeugen
    }
  }

  const built = await buildRechnungPdfBuffer(supabase, row.id)
  if (!built.ok) return built
  return { ok: true, buffer: built.buffer }
}

type ArchiverFactory = (
  format: 'zip',
  options?: { zlib?: { level?: number } }
) => {
  pipe: (dest: NodeJS.WritableStream) => void
  append: (source: Buffer, data: { name: string }) => void
  finalize: () => Promise<void>
  on: (event: 'error', cb: (err: Error) => void) => void
}

async function zipBuffers(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  const archiver = (await import('archiver')) as unknown as ArchiverFactory
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } })
    const stream = new PassThrough()
    const chunks: Buffer[] = []

    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
    archive.on('error', reject)

    archive.pipe(stream)
    for (const file of files) {
      archive.append(file.buffer, { name: file.name })
    }
    void archive.finalize()
  })
}

function parseIsoDate(value: string): string | null {
  const v = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return v
}

export async function buildRechnungenPdfZip(
  supabase: SupabaseClient,
  input: { von: string; bis: string }
): Promise<
  | { ok: true; buffer: Buffer; count: number; filename: string }
  | { ok: false; message: string; status?: number }
> {
  const von = parseIsoDate(input.von)
  const bis = parseIsoDate(input.bis)
  if (!von || !bis) {
    return { ok: false, message: 'Bitte gültiges Von- und Bis-Datum (JJJJ-MM-TT) angeben.', status: 400 }
  }
  if (von > bis) {
    return { ok: false, message: 'Das Von-Datum darf nicht nach dem Bis-Datum liegen.', status: 400 }
  }

  const { data, error } = await supabase
    .from('rechnungen')
    .select('id, rechnungsnummer, pdf_url, rechnungsdatum, status')
    .in('status', ['gesendet', 'bezahlt'])
    .gte('rechnungsdatum', von)
    .lte('rechnungsdatum', bis)
    .order('rechnungsdatum', { ascending: true })
    .order('rechnungsnummer', { ascending: true })
    .limit(RECHNUNGEN_PDF_ZIP_MAX + 1)

  if (error) return { ok: false, message: error.message, status: 500 }

  const rows = (data ?? []) as RechnungExportRow[]
  if (!rows.length) {
    return {
      ok: false,
      message: 'Keine versendeten Rechnungen im gewählten Zeitraum.',
      status: 404,
    }
  }
  if (rows.length > RECHNUNGEN_PDF_ZIP_MAX) {
    return {
      ok: false,
      message: `Mehr als ${RECHNUNGEN_PDF_ZIP_MAX} Rechnungen im Zeitraum — bitte enger filtern.`,
      status: 400,
    }
  }

  const usedNames = new Map<string, number>()
  const files: { name: string; buffer: Buffer }[] = []
  const errors: string[] = []

  for (const row of rows) {
    const pdf = await loadRechnungPdfBuffer(supabase, row)
    if (!pdf.ok) {
      errors.push(`${row.rechnungsnummer}: ${pdf.message}`)
      continue
    }

    let name = safePdfName(row.rechnungsnummer)
    const count = usedNames.get(name) ?? 0
    if (count > 0) {
      name = name.replace(/\.pdf$/i, `_${count + 1}.pdf`)
    }
    usedNames.set(safePdfName(row.rechnungsnummer), count + 1)
    files.push({ name, buffer: pdf.buffer })
  }

  if (!files.length) {
    return {
      ok: false,
      message: errors[0] ?? 'PDFs konnten nicht erzeugt werden.',
      status: 500,
    }
  }

  const buffer = await zipBuffers(files)
  return {
    ok: true,
    buffer,
    count: files.length,
    filename: `Rechnungen_${von}_bis_${bis}.zip`,
  }
}
