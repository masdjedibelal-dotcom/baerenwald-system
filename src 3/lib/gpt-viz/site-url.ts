/** Öffentliche Website-URL — GPT Internal APIs laufen auf handwerks-plattform. */
export function gptVizSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export function gptVizInternalApiSecret(): string | null {
  const secret =
    process.env.GPT_VIZ_INTERNAL_API_SECRET?.trim() ||
    process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  return secret || null
}
