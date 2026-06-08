import { BRAND_LOGO_GREEN } from '@/lib/brand'

export type ComposeVizZielbildInput = {
  vorherUrl: string
  nachherUrl: string
  beschreibung: string
  logoUrl?: string
  brandSuffix?: string
  subtitle?: string
  footerText?: string
}

const W = 1200
const PAD = 48
const GREEN = '#1A3D2B'
const GREEN_ACCENT = '#2E7D52'
const MUTED = '#5C6B62'
const BORDER = '#E8EDE9'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`))
    img.src = src
  })
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

export async function composeVizZielbildCanvas(input: ComposeVizZielbildInput): Promise<HTMLCanvasElement> {
  const logoUrl = input.logoUrl ?? BRAND_LOGO_GREEN
  const brandSuffix = input.brandSuffix ?? ''
  const subtitle = input.subtitle ?? 'KI-Visualisierung'
  const footerText = input.footerText ?? 'baerenwaldmuenchen.de'
  const beschreibung =
    input.beschreibung.trim() ||
    'So könnte der Raum nach der geplanten Renovierung aussehen.'

  const [logo, vorher, nachher] = await Promise.all([
    loadImage(logoUrl),
    loadImage(input.vorherUrl),
    loadImage(input.nachherUrl),
  ])

  const innerW = W - PAD * 2
  const colGap = 24
  const colW = (innerW - colGap) / 2
  const imgH = 340
  const headerH = 72
  const labelH = 28
  const footerH = 36

  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')!
  measureCtx.font = '22px system-ui, -apple-system, Segoe UI, sans-serif'
  const { lines: descLines, height: descBlockH } = wrapText(measureCtx, beschreibung, innerW, 30)

  const H = PAD + headerH + 32 + imgH + labelH + 32 + descBlockH + footerH + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  let y = PAD

  const logoSize = 52
  ctx.drawImage(logo, PAD, y, logoSize, logoSize)
  ctx.textBaseline = 'top'
  ctx.fillStyle = GREEN
  ctx.font = '700 34px system-ui, -apple-system, Segoe UI, sans-serif'
  const brandX = PAD + logoSize + 16
  ctx.fillText('Bärenwald', brandX, y + 4)
  if (brandSuffix) {
    const bwWidth = ctx.measureText('Bärenwald').width
    ctx.fillStyle = GREEN_ACCENT
    ctx.fillText(brandSuffix, brandX + bwWidth, y + 4)
  }
  ctx.fillStyle = MUTED
  ctx.font = '500 18px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(subtitle, brandX, y + 42)

  y += headerH + 32

  const leftX = PAD
  const rightX = PAD + colW + colGap

  for (const [img, x, label] of [
    [vorher, leftX, 'Vorher'] as const,
    [nachher, rightX, 'Nachher'] as const,
  ]) {
    ctx.save()
    roundRect(ctx, x, y, colW, imgH, 14)
    ctx.clip()
    drawCoverImage(ctx, img, x, y, colW, imgH)
    ctx.restore()
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 2
    roundRect(ctx, x, y, colW, imgH, 14)
    ctx.stroke()

    ctx.fillStyle = MUTED
    ctx.font = '600 16px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + colW / 2, y + imgH + 10)
  }
  ctx.textAlign = 'left'

  y += imgH + labelH + 32

  ctx.fillStyle = GREEN
  ctx.font = '700 20px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('Visualisierungswunsch', PAD, y)
  y += 32

  ctx.fillStyle = '#2A332E'
  ctx.font = '22px system-ui, -apple-system, Segoe UI, sans-serif'
  for (const line of descLines) {
    ctx.fillText(line, PAD, y)
    y += 30
  }

  y += 8
  ctx.fillStyle = GREEN_ACCENT
  ctx.font = '500 17px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(footerText, PAD, y)

  return canvas
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
