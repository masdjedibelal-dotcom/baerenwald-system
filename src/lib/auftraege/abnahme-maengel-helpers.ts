import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'

export type AbnahmeMangelStatus = 'offen' | 'in_bearbeitung' | 'behoben' | 'abgenommen'

export type AbnahmeMangelVerlaufEintrag = {
  at: string
  typ: string
  notiz?: string | null
}

export function mangelStatusLabel(status: AbnahmeMangelStatus | string | undefined): string {
  switch (status) {
    case 'in_bearbeitung':
      return 'In Bearbeitung'
    case 'behoben':
      return 'Behoben'
    case 'abgenommen':
      return 'Abgenommen'
    default:
      return 'Offen'
  }
}

export function isMangelOffen(m: Pick<AbnahmeMangel, 'status'>): boolean {
  const s = m.status ?? 'offen'
  return s === 'offen' || s === 'in_bearbeitung'
}

export function countOffeneMaengel(maengel: AbnahmeMangel[]): number {
  return maengel.filter(isMangelOffen).length
}

export function appendMangelVerlauf(
  m: AbnahmeMangel,
  typ: string,
  notiz?: string | null,
  at = new Date().toISOString()
): AbnahmeMangel {
  const verlauf = [...(m.verlauf ?? []), { at, typ, notiz: notiz?.trim() || null }]
  return { ...m, verlauf }
}

export function normalizeMaengel(maengel: AbnahmeMangel[]): AbnahmeMangel[] {
  const now = new Date().toISOString()
  return maengel.map((m) => ({
    ...m,
    status: (m.status ?? 'offen') as AbnahmeMangelStatus,
    erfasst_at: m.erfasst_at ?? now,
    foto_urls: m.foto_urls ?? [],
    foto_nachher_urls: m.foto_nachher_urls ?? [],
    verlauf: m.verlauf ?? [],
  }))
}

export function maengelAusPunkten(
  punkte: AbnahmePunkt[],
  erfasstAt = new Date().toISOString()
): AbnahmeMangel[] {
  return punkte
    .filter((p) => p.status === 'mangel')
    .map((p) => {
      const titel =
        bereinigeTitel(p.leistung_name) ||
        (p.beschreibung?.trim() && p.notiz?.trim() ? p.beschreibung.trim() : null)
      const detail =
        p.notiz?.trim() ||
        (p.notizen ?? []).map((n) => String(n ?? '').trim()).find(Boolean) ||
        (titel ? '' : p.beschreibung?.trim()) ||
        ''
      return {
        punkt_id: p.id,
        titel: titel || null,
        beschreibung: detail || titel || p.beschreibung || 'Mangel',
        foto_urls: [...(p.foto_urls ?? [])],
        frist: p.mangel_frist?.trim()?.slice(0, 10) || null,
        status: 'offen' as const,
        erfasst_at: erfasstAt,
        foto_nachher_urls: [],
        verlauf: [{ at: erfasstAt, typ: 'erfasst', notiz: 'Bei Abnahme als Mangel markiert' }],
      }
    })
}

function bereinigeTitel(name: string | null | undefined): string {
  const t = (name ?? '').trim()
  if (!t || /^zusätzlicher punkt$/i.test(t)) return ''
  return t
}

/** Beim Speichern: neue Mängel aus Punkten, bestehende Status/Timestamps behalten. */
export function mergeMaengelFromPunkte(
  punkte: AbnahmePunkt[],
  existing: AbnahmeMangel[]
): AbnahmeMangel[] {
  const fresh = maengelAusPunkten(punkte)
  if (!existing.length) return fresh
  const byId = new Map(existing.map((m) => [m.punkt_id, normalizeMaengel([m])[0]!]))
  return fresh.map((f) => {
    const old = byId.get(f.punkt_id)
    if (!old) return f
    return {
      ...f,
      beschreibung: f.beschreibung?.trim() ? f.beschreibung : old.beschreibung,
      frist: f.frist ?? old.frist,
      foto_urls: old.foto_urls?.length ? old.foto_urls : f.foto_urls,
      status: old.status ?? f.status,
      erfasst_at: old.erfasst_at ?? f.erfasst_at,
      behoben_at: old.behoben_at ?? null,
      abgenommen_at: old.abgenommen_at ?? null,
      behoben_von: old.behoben_von ?? null,
      handwerker_id: old.handwerker_id ?? null,
      foto_nachher_urls: old.foto_nachher_urls ?? [],
      verlauf: old.verlauf?.length ? old.verlauf : f.verlauf,
    }
  })
}

export function punchListStatusFromMangel(status: AbnahmeMangelStatus | string | undefined): string {
  if (status === 'behoben') return 'behoben'
  if (status === 'abgenommen') return 'akzeptiert'
  if (status === 'in_bearbeitung') return 'in_bearbeitung'
  return 'offen'
}

export function applyPunktStatusFromMaengel(
  punkte: AbnahmePunkt[],
  maengel: AbnahmeMangel[]
): AbnahmePunkt[] {
  const byId = new Map(maengel.map((m) => [m.punkt_id, m]))
  return punkte.map((p) => {
    const m = byId.get(p.id)
    if (!m) return p
    const frist = m.frist?.trim()?.slice(0, 10) || p.mangel_frist || null
    const mangelNotiz =
      m.beschreibung?.trim() && m.beschreibung.trim() !== p.beschreibung.trim()
        ? m.beschreibung
        : p.notiz
    if (m.status === 'abgenommen') {
      return { ...p, status: 'ok' as const, mangel_frist: null }
    }
    if (m.status === 'behoben' && p.status === 'mangel') {
      return { ...p, status: 'mangel' as const, mangel_frist: frist, notiz: mangelNotiz ?? p.notiz }
    }
    if (isMangelOffen(m)) {
      return { ...p, status: 'mangel' as const, mangel_frist: frist, notiz: mangelNotiz ?? p.notiz }
    }
    return p
  })
}
