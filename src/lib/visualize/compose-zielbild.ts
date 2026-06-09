import { BRAND_LOGO_WHITE } from '@/lib/brand'
import type { VizBauErklaerung } from '@/lib/visualize/types'

export type ComposeVizZielbildInput = {
  vorherUrl: string
  nachherUrl: string
  erklaerung: VizBauErklaerung
  logoUrl?: string
}

const W = 1200
const PAD = 44
const GREEN_DARK = '#0F2818'
const GREEN_MID = '#1A3D2B'
const GREEN_ACCENT = '#2E7D52'
const GREEN_GLOW = '#3D9966'
const GREEN_LIGHT = '#E8F5EC'
const WHITE = '#FFFFFF'
const TEXT_ON_GREEN = '#FFFFFF'
const TEXT_MUTED = '#B8D4C4'
const TEXT_BODY = '#1E2A24'
const TEXT_SOFT = '#4A5E54'

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; height: number } {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return { lines, height: Math.max(lines.length, 1) * lineHeight }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.width / img.height
  const r = w / h
  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height
  if (ir > r) {
    sw = img.height * r
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / r
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawBrandBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h * 0.85)
  bg.addColorStop(0, GREEN_DARK)
  bg.addColorStop(0.35, GREEN_MID)
  bg.addColorStop(0.7, GREEN_ACCENT)
  bg.addColorStop(1, GREEN_DARK)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const glow1 = ctx.createRadialGradient(w * 0.15, h * 0.12, 0, w * 0.15, h * 0.12, w * 0.45)
  glow1.addColorStop(0, 'rgba(61, 153, 102, 0.35)')
  glow1.addColorStop(1, 'rgba(61, 153, 102, 0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, w, h)

  const glow2 = ctx.createRadialGradient(w * 0.88, h * 0.55, 0, w * 0.88, h * 0.55, w * 0.38)
  glow2.addColorStop(0, 'rgba(46, 125, 82, 0.28)')
  glow2.addColorStop(1, 'rgba(46, 125, 82, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, w, h)
}

function measureBlockHeight(
  ctx: CanvasRenderingContext2D,
  erklaerung: VizBauErklaerung,
  innerW: number
): number {
  const colW = (innerW - 28) / 2
  const lineH = 28
  const smallLineH = 24

  ctx.font = '700 20px system-ui, -apple-system, Segoe UI, sans-serif'
  const headlineH = wrapText(ctx, erklaerung.zielbild_headline, innerW, 28).height + 8

  ctx.font = '22px system-ui, -apple-system, Segoe UI, sans-serif'
  const summaryH = wrapText(ctx, erklaerung.zusammenfassung, innerW, lineH).height

  ctx.font = '600 16px system-ui, -apple-system, Segoe UI, sans-serif'
  const gewerkLines = erklaerung.gewerke.slice(0, 5).reduce((acc, g) => {
    const t = `${g.name}: ${g.beschreibung}`
    return acc + wrapText(ctx, t, colW - 16, smallLineH).height + 6
  }, 36)

  const schritteH =
    36 +
    erklaerung.naechste_schritte.slice(0, 3).reduce((acc, s) => {
      return acc + wrapText(ctx, s, colW - 16, smallLineH).height + 8
    }, 0)

  const colsH = Math.max(gewerkLines, schritteH)
  const guH = erklaerung.hinweis_gu
    ? wrapText(ctx, erklaerung.hinweis_gu, innerW - 32, lineH).height + 24
    : 0

  return headlineH + summaryH + 28 + colsH + guH + 72 + 44
}

export function fallbackErklaerung(): VizBauErklaerung {
  return {
    titel: 'Ihr Raumprojekt',
    chat_kurz:
      'So könnte der Raum aussehen — wir begleiten Sie von der Idee bis zur Umsetzung mit allen nötigen Gewerken aus einer Hand.',
    zielbild_headline: 'Ihr Weg zum Wunschraum',
    zusammenfassung:
      'Auf Basis Ihrer Visualisierung planen wir die nötigen Gewerke und koordinieren alles als Generalunternehmer in München.',
    gewerke: [
      { name: 'Planung & Koordination', beschreibung: 'GU-Steuerung aller Gewerke' },
      { name: 'Ausbau', beschreibung: 'Umsetzung nach Ihrem Wunschbild' },
    ],
    ablauf: ['Beratung', 'Angebot', 'Umsetzung'],
    naechste_schritte: [
      '1. Kostenlose Erstberatung',
      '2. Unverbindliches Angebot',
      '3. Umsetzung aus einer Hand',
    ],
    hinweis_gu: 'Bärenwald koordiniert alle Gewerke — ein Ansprechpartner, ein Projekt.',
    cta_text: 'Projekt kostenlos anfragen',
  }
}

export function erklaerungFromBrief(
  erklaerung: VizBauErklaerung | null | undefined
): VizBauErklaerung {
  if (erklaerung?.zielbild_headline && erklaerung.gewerke.length > 0) {
    return {
      ...erklaerung,
      chat_kurz:
        erklaerung.chat_kurz ||
        erklaerung.zusammenfassung.slice(0, 280) ||
        fallbackErklaerung().chat_kurz,
      naechste_schritte:
        erklaerung.naechste_schritte.length > 0
          ? erklaerung.naechste_schritte
          : erklaerung.ablauf.slice(0, 3),
      cta_text: erklaerung.cta_text || 'Projekt kostenlos anfragen',
    }
  }
  return fallbackErklaerung()
}

export async function composeVizZielbildCanvas(
  input: ComposeVizZielbildInput
): Promise<HTMLCanvasElement> {
  const logoPath = input.logoUrl ?? BRAND_LOGO_WHITE
  const erk = input.erklaerung

  const revokes: Array<() => void> = []
  try {
    const [logoR, vorherR, nachherR] = await Promise.all([
      loadImage(logoPath),
      loadImage(input.vorherUrl),
      loadImage(input.nachherUrl),
    ])
    revokes.push(logoR.revoke, vorherR.revoke, nachherR.revoke)
    const logo = logoR.img
    const vorher = vorherR.img
    const nachher = nachherR.img

    const innerW = W - PAD * 2
    const contentPad = 22
    const colGap = 18
    const imgH = 340
    const headerH = 72

    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')!
    const cardInnerW = innerW - contentPad * 2
    const colW = (cardInnerW - colGap) / 2
    const analysisH = measureBlockHeight(measureCtx, erk, innerW - 8)
    const cardH = contentPad * 2 + imgH + 28
    const H = PAD + headerH + 24 + cardH + 20 + analysisH + PAD

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    drawBrandBackground(ctx, W, H)

    let y = PAD

    const logoSize = 52
    ctx.drawImage(logo, PAD, y, logoSize, logoSize)
    ctx.textBaseline = 'top'
    const brandX = PAD + logoSize + 16
    ctx.fillStyle = TEXT_ON_GREEN
    ctx.font = '700 36px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.fillText('Bärenwald', brandX, y + 2)
    ctx.fillStyle = TEXT_MUTED
    ctx.font = '500 18px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.fillText('KI-Visualisierung · München', brandX, y + 44)

    y += headerH + 24

    const cardX = PAD
    const cardW = innerW
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.22)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 10
    roundRect(ctx, cardX, y, cardW, cardH, 20)
    ctx.fillStyle = WHITE
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    roundRect(ctx, cardX, y, cardW, cardH, 20)
    ctx.stroke()

    const imgY = y + contentPad
    const leftX = cardX + contentPad
    const rightX = leftX + colW + colGap

    for (const [img, x, label, accent] of [
      [vorher, leftX, 'Vorher', GREEN_ACCENT] as const,
      [nachher, rightX, 'Nachher', GREEN_MID] as const,
    ]) {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.12)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 4
      roundRect(ctx, x, imgY, colW, imgH, 14)
      ctx.fillStyle = '#f0f4f1'
      ctx.fill()
      ctx.restore()

      ctx.save()
      roundRect(ctx, x, imgY, colW, imgH, 14)
      ctx.clip()
      drawCoverImage(ctx, img, x, imgY, colW, imgH)
      ctx.restore()

      ctx.fillStyle = accent
      ctx.font = '700 14px system-ui, -apple-system, Segoe UI, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label.toUpperCase(), x + colW / 2, imgY + imgH + 12)
    }
    ctx.textAlign = 'left'

    y += cardH + 20

    roundRect(ctx, PAD, y, innerW, analysisH, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.97)'
    ctx.fill()

    let ay = y + 24
    const ax = PAD + 24
    const contentW = innerW - 48

    ctx.fillStyle = GREEN_MID
    ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif'
    for (const line of wrapText(ctx, erk.zielbild_headline, contentW, 30).lines) {
      ctx.fillText(line, ax, ay)
      ay += 30
    }
    ay += 8

    ctx.fillStyle = TEXT_BODY
    ctx.font = '22px system-ui, -apple-system, Segoe UI, sans-serif'
    for (const line of wrapText(ctx, erk.zusammenfassung, contentW, 28).lines) {
      ctx.fillText(line, ax, ay)
      ay += 28
    }
    ay += 20

    const leftColX = ax
    const rightColX = ax + (contentW + 28) / 2

    ctx.fillStyle = GREEN_MID
    ctx.font = '700 17px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.fillText('Dafür brauchen wir', leftColX, ay)
    ctx.fillText('Nächste Schritte', rightColX, ay)
    ay += 28

    let gy = ay
    ctx.fillStyle = TEXT_SOFT
    ctx.font = '16px system-ui, -apple-system, Segoe UI, sans-serif'
    for (const g of erk.gewerke.slice(0, 5)) {
      const bullet = `• ${g.name}: ${g.beschreibung}`
      for (const line of wrapText(ctx, bullet, (contentW - 28) / 2 - 8, 24).lines) {
        ctx.fillText(line, leftColX, gy)
        gy += 24
      }
      gy += 4
    }

    let sy = ay
    for (const step of erk.naechste_schritte.slice(0, 3)) {
      for (const line of wrapText(ctx, step, (contentW - 28) / 2 - 8, 24).lines) {
        ctx.fillText(line, rightColX, sy)
        sy += 24
      }
      sy += 6
    }

    ay = Math.max(gy, sy) + 12

    if (erk.hinweis_gu) {
      roundRect(ctx, ax, ay, contentW, 44, 10)
      ctx.fillStyle = GREEN_LIGHT
      ctx.fill()
      ctx.fillStyle = GREEN_MID
      ctx.font = '600 16px system-ui, -apple-system, Segoe UI, sans-serif'
      let hy = ay + 12
      for (const line of wrapText(ctx, erk.hinweis_gu, contentW - 24, 22).lines) {
        ctx.fillText(line, ax + 12, hy)
        hy += 22
      }
      ay += 52
    }

    const ctaH = 48
    roundRect(ctx, ax, ay, contentW, ctaH, 24)
    const ctaGrad = ctx.createLinearGradient(ax, ay, ax + contentW, ay)
    ctaGrad.addColorStop(0, GREEN_ACCENT)
    ctaGrad.addColorStop(1, GREEN_GLOW)
    ctx.fillStyle = ctaGrad
    ctx.fill()

    ctx.fillStyle = WHITE
    ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${erk.cta_text}  →  baerenwaldmuenchen.de`, ax + contentW / 2, ay + 15)
    ctx.textAlign = 'left'

    ay += ctaH + 14
    ctx.fillStyle = TEXT_MUTED
    ctx.font = '600 15px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.fillText('Digitaler GU · München · Alles aus einer Hand', ax, ay)

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
