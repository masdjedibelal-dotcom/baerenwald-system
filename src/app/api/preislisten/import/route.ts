import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase-server'
import { toSlug } from '@/lib/utils'
import type { PreislistenImportMapping, PreislistenImportResponse } from '@/lib/preislisten-import'

function parsePreis(s: string): number | null {
  const t = String(s ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function buildGewerkSlugIndex(rows: { id: string; slug: string; name: string }[]) {
  const bySlug = new Map<string, string>()
  for (const g of rows) {
    bySlug.set(g.slug.trim().toLowerCase(), g.id)
    bySlug.set(toSlug(g.slug), g.id)
    bySlug.set(toSlug(g.name), g.id)
  }
  return bySlug
}

function resolveGewerkId(raw: string, bySlug: Map<string, string>): string | null {
  const t = raw.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  if (bySlug.has(lower)) return bySlug.get(lower) ?? null
  const slugged = toSlug(t)
  return bySlug.get(slugged) ?? null
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData erwartet' }, { status: 400 })
  }

  const file = form.get('file')
  const mappingRaw = form.get('mapping')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Datei „file“ fehlt' }, { status: 400 })
  }
  if (typeof mappingRaw !== 'string') {
    return NextResponse.json({ error: '„mapping“ (JSON-String) fehlt' }, { status: 400 })
  }

  let mapping: PreislistenImportMapping
  try {
    mapping = JSON.parse(mappingRaw) as PreislistenImportMapping
  } catch {
    return NextResponse.json({ error: 'mapping ist kein gültiges JSON' }, { status: 400 })
  }

  const requiredKeys: (keyof PreislistenImportMapping)[] = [
    'gewerk',
    'kategorie',
    'leistung',
    'einheit',
    'preis',
  ]
  for (const k of requiredKeys) {
    if (!mapping[k]?.trim()) {
      return NextResponse.json({ error: `Mapping für „${k}“ fehlt` }, { status: 400 })
    }
  }

  const text = await file.text()
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: parsed.errors[0]?.message ?? 'CSV konnte nicht gelesen werden' },
      { status: 400 }
    )
  }

  const dataRows = (parsed.data ?? []).filter((row) =>
    Object.values(row).some((v) => String(v ?? '').trim() !== '')
  )

  const { data: gewRows, error: gewErr } = await supabase.from('gewerke').select('id, slug, name')
  if (gewErr || !gewRows?.length) {
    return NextResponse.json({ error: gewErr?.message ?? 'Gewerke nicht ladbar' }, { status: 500 })
  }

  const bySlug = buildGewerkSlugIndex(gewRows as { id: string; slug: string; name: string }[])

  const { data: existingRows, error: exErr } = await supabase
    .from('preislisten')
    .select('gewerk_id, leistung')
  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 })
  }

  const seen = new Set<string>()
  for (const e of existingRows ?? []) {
    seen.add(`${e.gewerk_id}|${String(e.leistung).trim().toLowerCase()}`)
  }

  const fehler: PreislistenImportResponse['fehler'] = []
  let importiert = 0
  let uebersprungen = 0

  const headerLineOffset = 2

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const zeile = i + headerLineOffset

    const gewerkRaw = String(row[mapping.gewerk] ?? '').trim()
    const gewerk_id = resolveGewerkId(gewerkRaw, bySlug)
    if (!gewerk_id) {
      fehler.push({
        zeile,
        grund: `Gewerk nicht gefunden (Slug/Name: „${gewerkRaw || '—'}“)`,
      })
      continue
    }

    const leistung = String(row[mapping.leistung] ?? '').trim()
    if (!leistung) {
      fehler.push({ zeile, grund: 'Leistung leer' })
      continue
    }

    const dupKey = `${gewerk_id}|${leistung.toLowerCase()}`
    if (seen.has(dupKey)) {
      uebersprungen += 1
      continue
    }

    const kategorie = String(row[mapping.kategorie] ?? '').trim()
    const einheit = String(row[mapping.einheit] ?? '').trim()
    const preisCol = mapping.preis?.trim() || mapping.preis_min?.trim() || ''
    const preisRaw = parsePreis(String(row[preisCol] ?? ''))

    if (!einheit) {
      fehler.push({ zeile, grund: 'Einheit leer' })
      continue
    }
    if (preisRaw === null) {
      fehler.push({ zeile, grund: 'Preis ungültig' })
      continue
    }

    const { error: insErr } = await supabase.from('preislisten').insert({
      gewerk_id,
      kategorie,
      leistung,
      einheit,
      preis_min: preisRaw,
      aktiv: true,
    })

    if (insErr) {
      fehler.push({ zeile, grund: insErr.message })
      continue
    }

    seen.add(dupKey)
    importiert += 1
  }

  if (importiert > 0) {
    revalidatePath('/preislisten')
  }

  const body: PreislistenImportResponse = { importiert, uebersprungen, fehler }
  return NextResponse.json(body)
}
