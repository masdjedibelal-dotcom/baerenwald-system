import { BRAND_LOGO_WHITE } from '@/lib/brand'
import {
  renderZielbildFeed,
  ZIELBILD_H,
  ZIELBILD_W,
} from '@/lib/visualize/compose-zielbild-layout'
import type { VizBauErklaerung } from '@/lib/visualize/types'

export type ComposeVizZielbildInput = {
  vorherUrl: string
  nachherUrl: string
  erklaerung: VizBauErklaerung
  logoUrl?: string
}

async function fetchAsBlobUrl(src: string): Promise<{ url: string; revoke: () => void }> {
  const absolute = src.startsWith('http') ? src : `${window.location.origin}${src}`
  try {
    const proxy = `/api/visualize/image-proxy?url=${encodeURIComponent(absolute)}`
    const res = await fetch(proxy)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      return { url, revoke: () => URL.revokeObjectURL(url) }
    }
  } catch {
    /* fallback */
  }
  return { url: absolute, revoke: () => {} }
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
    img.src = src
  })
}

async function loadImage(src: string): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const { url, revoke } = await fetchAsBlobUrl(src)
  const img = await loadImageFromUrl(url)
  return { img, revoke }
}

export async function composeVizZielbildCanvas(
  input: ComposeVizZielbildInput
): Promise<HTMLCanvasElement> {
  const logoPath = input.logoUrl ?? BRAND_LOGO_WHITE

  const revokes: Array<() => void> = []
  try {
    const [logoR, vorherR, nachherR] = await Promise.all([
      loadImage(logoPath),
      loadImage(input.vorherUrl),
      loadImage(input.nachherUrl),
    ])
    revokes.push(logoR.revoke, vorherR.revoke, nachherR.revoke)

    const canvas = document.createElement('canvas')
    canvas.width = ZIELBILD_W
    canvas.height = ZIELBILD_H
    const ctx = canvas.getContext('2d')!
    renderZielbildFeed(ctx, input.erklaerung, logoR.img, vorherR.img, nachherR.img)
    return canvas
  } finally {
    revokes.forEach((r) => r())
  }
}

export async function composeVizZielbildBlob(input: ComposeVizZielbildInput): Promise<Blob> {
  const canvas = await composeVizZielbildCanvas(input)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG-Export fehlgeschlagen'))),
      'image/png',
      0.92
    )
  })
}

export async function composeVizZielbildDataUrl(input: ComposeVizZielbildInput): Promise<string> {
  const canvas = await composeVizZielbildCanvas(input)
  return canvas.toDataURL('image/png', 0.92)
}

export function downloadVizZielbildBlob(blob: Blob, filename = 'baerenwald-zielbild.png') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function fallbackErklaerung(): VizBauErklaerung {
  return {
    titel: 'Dein Raumprojekt',
    chat_kurz:
      'So könnte dein Raum aussehen — wir begleiten dich von der Idee bis zur Umsetzung mit allen nötigen Gewerken aus einer Hand.',
    zielbild_kicker: 'RAUMVISION · MÜNCHEN',
    zielbild_headline: 'Hell, klar, endlich deins',
    zielbild_teaser: 'Visualisiert mit Bärenwald GPT — umgesetzt als Generalunternehmer.',
    zusammenfassung:
      'Auf Basis deiner Visualisierung planen wir die nötigen Gewerke und koordinieren alles als Generalunternehmer in München.',
    gewerke: [
      { name: 'Fliesen', beschreibung: 'Wand & Boden' },
      { name: 'Sanitär', beschreibung: 'Armaturen & WC' },
      { name: 'Trockenbau', beschreibung: 'Vorbereitung' },
    ],
    ablauf: ['Anfrage', 'Beratung', 'Umsetzung'],
    naechste_schritte: ['Anfrage stellen', 'Beratung vor Ort', 'Umsetzung aus einer Hand'],
    hinweis_gu: 'Ein Ansprechpartner · alle Gewerke',
    cta_text: 'Projekt anfragen',
  }
}

export function erklaerungFromBrief(
  erklaerung: VizBauErklaerung | null | undefined
): VizBauErklaerung {
  if (erklaerung?.zielbild_headline) {
    return {
      ...erklaerung,
      chat_kurz:
        erklaerung.chat_kurz ||
        erklaerung.zusammenfassung.slice(0, 280) ||
        fallbackErklaerung().chat_kurz,
      zielbild_kicker: erklaerung.zielbild_kicker || fallbackErklaerung().zielbild_kicker,
      zielbild_teaser:
        erklaerung.zielbild_teaser ||
        erklaerung.zusammenfassung.split(/[.!?]/)[0]?.trim().slice(0, 90) ||
        fallbackErklaerung().zielbild_teaser,
      zusammenfassung: erklaerung.zusammenfassung || fallbackErklaerung().zusammenfassung,
      naechste_schritte:
        erklaerung.naechste_schritte.length > 0
          ? erklaerung.naechste_schritte.map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
          : erklaerung.ablauf.slice(0, 3),
      cta_text: erklaerung.cta_text || 'Projekt anfragen',
    }
  }
  return fallbackErklaerung()
}
