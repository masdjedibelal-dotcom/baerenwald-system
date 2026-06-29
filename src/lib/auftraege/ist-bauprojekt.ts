/** Mindestfelder für Bauprojekt-Erkennung (reicht für schlanke DB-Selects). */
export type GewerkBauprojektHinweis = {
  slug: string
  ist_bauleistung?: boolean | null
}

/** Bereiche, bei denen typischerweise ein Bauprojekt vorliegt. */
const BAU_BEREICHE = new Set([
  'fassade',
  'dach',
  'rohbau',
  'wdvs',
  'mauerwerk',
  'estrich',
  'trockenbau',
  'fenster',
])

export function bereicheSuggerierenBauprojekt(bereiche: string[] | null | undefined): boolean {
  if (!bereiche?.length) return false
  return bereiche.some((b) => BAU_BEREICHE.has(b.trim().toLowerCase()))
}

export function gewerkSlugsSuggerierenBauprojekt(
  slugs: string[] | null | undefined,
  alleGewerke: GewerkBauprojektHinweis[]
): boolean {
  if (!slugs?.length) return false
  return slugs.some((s) => {
    const g = alleGewerke.find((x) => x.slug === s)
    return g?.ist_bauleistung === true
  })
}

/** Ob Bauprojekt-Modus (Bautagesbericht, Leistungs-Compliance) aktiv ist. */
export function auftragIstBauprojekt(opts: {
  ist_bauprojekt?: boolean | null
  gewerkSlugs?: string[] | null
  alleGewerke?: GewerkBauprojektHinweis[]
}): boolean {
  if (opts.ist_bauprojekt === true) return true
  if (opts.ist_bauprojekt === false) return false
  return gewerkSlugsSuggerierenBauprojekt(opts.gewerkSlugs, opts.alleGewerke ?? [])
}
