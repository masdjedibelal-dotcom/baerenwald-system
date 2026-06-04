import { supabaseAdmin } from '@/lib/supabase-admin'

export function generateAngebotsnr(year: number, sequence: number): string {
  const y = year.toString().slice(-2)
  const seq = sequence.toString().padStart(4, '0')
  return `AG${y}${seq}`
}

/** Kurz-Kundennummer aus UUID (ohne Bindungsstriche, 8 Zeichen). */
export function formatKundennr(kundeId: string): string {
  return kundeId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** Nächste freie Sequenznummer aus vorhandenen angebotsnr für das Kalenderjahr. */
export async function nextAngebotsnummerJahr(year = new Date().getFullYear()): Promise<string> {
  const yy = String(year % 100).padStart(2, '0')
  const prefix = `AG${yy}`
  const { data, error } = await supabaseAdmin
    .from('angebote')
    .select('angebotsnr')
    .not('angebotsnr', 'is', null)
    .like('angebotsnr', `${prefix}%`)

  if (error) {
    console.warn('[angebot-utils] angebotsnr query:', error.message)
    return generateAngebotsnr(year, 1)
  }

  let maxSeq = 0
  for (const row of data ?? []) {
    const nr = String((row as { angebotsnr?: string }).angebotsnr ?? '')
    if (!nr.startsWith(prefix)) continue
    const rest = nr.slice(prefix.length).replace(/\D/g, '')
    const n = parseInt(rest, 10)
    if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n)
  }
  return generateAngebotsnr(year, maxSeq + 1)
}

export function formatEurBetrag(n: number): string {
  return `${n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}
