import { BRAND_LOGO_WHITE } from '@/lib/brand'
import type { VizBauErklaerung } from '@/lib/visualize/types'

export type ZielbildFormat = 'story' | 'feed'

export type ComposeVizZielbildInput = {
  vorherUrl: string
  nachherUrl: string
  erklaerung: VizBauErklaerung
  logoUrl?: string
  format?: ZielbildFormat
}

const STORY_W = 1080
const STORY_H = 1920

const GREEN_DARK = '#0F2818'
const GREEN_MID = '#1A3D2B'
const GREEN_ACCENT = '#2E7D52'
const GREEN_GLOW = '#3D9966'
const CREAM = '#FAFAF8'
const WHITE = '#FFFFFF'
const TEXT_ON_GREEN = '#FFFFFF'
const TEXT_MUTED = '#B8D4C4'
const TEXT_BODY = '#1A2420'
const TEXT_SOFT = '#5C6F64'

const FONT_SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif"
const FONT_SERIF = "Georgia, 'Times New Roman', 'Palatino Linotype', serif"

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
  const bg = ctx.createLinearGradient(0, 0, w * 0.15, h)
  bg.addColorStop(0, GREEN_DARK)
  bg.addColorStop(0.45, GREEN_MID)
  bg.addColorStop(1, '#122820')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createRadialGradient(w * 0.9, h * 0.06, 0, w * 0.9, h * 0.06, w * 0.55)
  glow.addColorStop(0, 'rgba(61, 153, 102, 0.2)')
  glow.addColorStop(1, 'rgba(61, 153, 102, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
}

function zielbildTeaser(erk: VizBauErklaerung): string {
  const t = erk.zielbild_teaser?.trim()
  if (t) return t.slice(0, 100)
  const first = erk.zusammenfassung.split(/[.!?]/)[0]?.trim()
  return (first || 'Dein Wunschraum — umgesetzt aus einer Hand.').slice(0, 100)
}

function zielbildKicker(erk: VizBauErklaerung): string | null {
  const k = erk.zielbild_kicker?.trim()
  if (k) return k.toUpperCase().slice(0, 48)
  return null
}

function flowSteps(erk: VizBauErklaerung): string[] {
  const raw = erk.naechste_schritte
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
  if (raw.length >= 3) return raw
  return ['Anfrage', 'Beratung', 'Angebot annehmen', 'Umsetzung']
}

function drawGewerkPills(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  gewerke: VizBauErklaerung['gewerke']
): number {
  const names = gewerke.map((g) => g.name.trim()).filter(Boolean).slice(0, 4)
  if (!names.length) return y

  ctx.font = `500 14px ${FONT_SANS}`
  let cx = x
  const pillH = 30
  const gap = 8

  for (const name of names) {
    const label = name.length > 16 ? `${name.slice(0, 14)}…` : name
    const pw = ctx.measureText(label).width + 24
    if (cx + pw > x + maxW && cx > x) break

    roundRect(ctx, cx, y, pw, pillH, pillH / 2)
    ctx.fillStyle = 'rgba(26, 61, 43, 0.07)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(46, 125, 82, 0.28)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = GREEN_MID
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx + 12, y + pillH / 2)
    cx += pw + gap
  }

  ctx.textBaseline = 'top'
  return y + pillH
}

function drawFlowChart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  steps: string[]
): number {
  const n = steps.length
  const arrowW = 16
  const nodeGap = 5
  const totalGap = (n - 1) * (arrowW + nodeGap)
  const nodeW = Math.floor((maxW - totalGap) / n)
  const nodeH = 40

  ctx.font = `600 12px ${FONT_SANS}`
  let nx = x

  for (let i = 0; i < n; i++) {
    const label = steps[i].length > 22 ? `${steps[i].slice(0, 20)}…` : steps[i]
    const lines = wrapText(ctx, label, nodeW - 8, 16).lines.slice(0, 2)

    roundRect(ctx, nx, y, nodeW, nodeH, 8)
    ctx.fillStyle = i === 0 ? GREEN_MID : WHITE
    ctx.fill()
    ctx.strokeStyle = i === 0 ? GREEN_MID : 'rgba(46, 125, 82, 0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = i === 0 ? WHITE : TEXT_BODY
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const midY = y + nodeH / 2
    if (lines.length === 1) {
      ctx.fillText(lines[0], nx + nodeW / 2, midY)
    } else {
      ctx.fillText(lines[0], nx + nodeW / 2, midY - 8)
      ctx.fillText(lines[1], nx + nodeW / 2, midY + 8)
    }

    nx += nodeW
    if (i < n - 1) {
      const ax = nx + nodeGap
      ctx.strokeStyle = GREEN_ACCENT
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(ax, y + nodeH / 2)
      ctx.lineTo(ax + arrowW - 4, y + nodeH / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ax + arrowW - 4, y + nodeH / 2)
      ctx.lineTo(ax + arrowW - 9, y + nodeH / 2 - 3)
      ctx.lineTo(ax + arrowW - 9, y + nodeH / 2 + 3)
      ctx.closePath()
      ctx.fillStyle = GREEN_ACCENT
      ctx.fill()
      nx += arrowW + nodeGap
    }
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  return y + nodeH
}

function drawPillCta(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): number {
  ctx.font = `700 15px ${FONT_SANS}`
  const label = text.length > 24 ? `${text.slice(0, 22)}…` : text
  const w = ctx.measureText(`${label}  →`).width + 32
  const h = 42

  roundRect(ctx, x, y, w, h, h / 2)
  const grad = ctx.createLinearGradient(x, y, x + w, y)
  grad.addColorStop(0, GREEN_ACCENT)
  grad.addColorStop(1, GREEN_GLOW)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.fillStyle = WHITE
  ctx.textBaseline = 'middle'
  ctx.fillText(`${label}  →`, x + 16, y + h / 2)
  ctx.textBaseline = 'top'
  return w
}

function drawEditorialBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  erk: VizBauErklaerung
): number {
  let cy = y
  const kicker = zielbildKicker(erk)

  if (kicker) {
    ctx.fillStyle = GREEN_ACCENT
    ctx.font = `600 11px ${FONT_SANS}`
    ctx.fillText(kicker, x, cy)
    cy += 20
  }

  ctx.fillStyle = TEXT_BODY
  ctx.font = `700 44px ${FONT_SERIF}`
  for (const line of wrapText(ctx, erk.zielbild_headline, w, 50).lines.slice(0, 3)) {
    ctx.fillText(line, x, cy)
    cy += 50
  }
  cy += 8

  ctx.fillStyle = TEXT_SOFT
  ctx.font = `italic 400 19px ${FONT_SERIF}`
  for (const line of wrapText(ctx, zielbildTeaser(erk), w * 0.98, 26).lines.slice(0, 2)) {
    ctx.fillText(line, x, cy)
    cy += 26
  }
  cy += 22

  cy = drawGewerkPills(ctx, x, cy, w, erk.gewerke) + 18

  ctx.fillStyle = TEXT_SOFT
  ctx.font = `600 10px ${FONT_SANS}`
  ctx.fillText('DEIN WEG MIT BÄRENWALD', x, cy)
  cy += 18

  cy = drawFlowChart(ctx, x, cy, w, flowSteps(erk)) + 24

  const ctaText = erk.cta_text || 'Anfragen'
  ctx.font = `700 15px ${FONT_SANS}`
  const ctaLabel = ctaText.length > 24 ? `${ctaText.slice(0, 22)}…` : ctaText
  const ctaW = ctx.measureText(`${ctaLabel}  →`).width + 32

  ctx.font = `500 14px ${FONT_SANS}`
  ctx.fillStyle = TEXT_SOFT
  ctx.fillText('Digitaler GU · München', x, cy + 12)

  drawPillCta(ctx, x + w - ctaW, cy, ctaText)

  cy += 50

  if (erk.hinweis_gu) {
    ctx.font = `400 12px ${FONT_SANS}`
    ctx.fillStyle = TEXT_SOFT
    ctx.textAlign = 'right'
    ctx.fillText(erk.hinweis_gu.slice(0, 60), x + w, cy)
    ctx.textAlign = 'left'
    cy += 18
  }

  return cy
}

async function composeStoryZielbild(
  input: ComposeVizZielbildInput,
  logo: HTMLImageElement,
  vorher: HTMLImageElement,
  nachher: HTMLImageElement
): Promise<HTMLCanvasElement> {
  const erk = input.erklaerung
  const PAD = 32
  const innerW = STORY_W - PAD * 2

  const canvas = document.createElement('canvas')
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext('2d')!

  drawBrandBackground(ctx, STORY_W, STORY_H)

  let y = PAD + 8

  const logoSize = 40
  ctx.drawImage(logo, PAD, y, logoSize, logoSize)
  ctx.textBaseline = 'top'
  const brandX = PAD + logoSize + 10
  ctx.fillStyle = TEXT_ON_GREEN
  ctx.font = `600 24px ${FONT_SANS}`
  ctx.fillText('Bärenwald', brandX, y + 2)
  ctx.fillStyle = TEXT_MUTED
  ctx.font = `500 13px ${FONT_SANS}`
  ctx.fillText('KI-Visualisierung · München', brandX, y + 28)

  y += 56

  const imgCardH = 720
  const contentPad = 16
  const colGap = 10
  const colW = (innerW - contentPad * 2 - colGap) / 2
  const imgH = imgCardH - contentPad * 2 - 28

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 28
  ctx.shadowOffsetY = 10
  roundRect(ctx, PAD, y, innerW, imgCardH, 20)
  ctx.fillStyle = WHITE
  ctx.fill()
  ctx.restore()

  const imgY = y + contentPad
  const leftX = PAD + contentPad
  const rightX = leftX + colW + colGap

  for (const [img, x, label] of [
    [vorher, leftX, 'Vorher'] as const,
    [nachher, rightX, 'Nachher'] as const,
  ]) {
    roundRect(ctx, x, imgY, colW, imgH, 14)
    ctx.fillStyle = '#eef2ef'
    ctx.fill()
    ctx.save()
    roundRect(ctx, x, imgY, colW, imgH, 14)
    ctx.clip()
    drawCoverImage(ctx, img, x, imgY, colW, imgH)
    ctx.restore()

    ctx.fillStyle = TEXT_SOFT
    ctx.font = `600 11px ${FONT_SANS}`
    ctx.textAlign = 'center'
    ctx.fillText(label.toUpperCase(), x + colW / 2, imgY + imgH + 12)
  }
  ctx.textAlign = 'left'

  y += imgCardH + 20

  const editorialH = STORY_H - y - PAD
  roundRect(ctx, PAD, y, innerW, editorialH, 20)
  ctx.fillStyle = CREAM
  ctx.fill()

  const ex = PAD + 28
  const ew = innerW - 56
  drawEditorialBlock(ctx, ex, y + 32, ew, erk)

  return canvas
}

async function composeFeedZielbild(
  input: ComposeVizZielbildInput,
  logo: HTMLImageElement,
  vorher: HTMLImageElement,
  nachher: HTMLImageElement
): Promise<HTMLCanvasElement> {
  const erk = input.erklaerung
  const W = 1080
  const PAD = 40
  const innerW = W - PAD * 2
  const contentPad = 20
  const colGap = 14
  const imgH = 380
  const headerH = 58
  const cardInnerW = innerW - contentPad * 2
  const colW = (cardInnerW - colGap) / 2

  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')!
  measureCtx.font = `700 44px ${FONT_SERIF}`
  const headlineH = wrapText(measureCtx, erk.zielbild_headline, cardInnerW - 48, 50).height
  const editorialH = 28 + (zielbildKicker(erk) ? 20 : 0) + headlineH + 80 + 200
  const cardH = contentPad * 2 + imgH + 32
  const H = PAD + headerH + 16 + cardH + 16 + editorialH + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  drawBrandBackground(ctx, W, H)

  let y = PAD
  const logoSize = 44
  ctx.drawImage(logo, PAD, y, logoSize, logoSize)
  ctx.textBaseline = 'top'
  const brandX = PAD + logoSize + 12
  ctx.fillStyle = TEXT_ON_GREEN
  ctx.font = `700 28px ${FONT_SANS}`
  ctx.fillText('Bärenwald', brandX, y + 2)
  ctx.fillStyle = TEXT_MUTED
  ctx.font = `500 15px ${FONT_SANS}`
  ctx.fillText('KI-Visualisierung · München', brandX, y + 34)

  y += headerH + 16

  roundRect(ctx, PAD, y, innerW, cardH, 18)
  ctx.fillStyle = WHITE
  ctx.fill()

  const imgY = y + contentPad
  const leftX = PAD + contentPad
  const rightX = leftX + colW + colGap

  for (const [img, x, label] of [
    [vorher, leftX, 'Vorher'] as const,
    [nachher, rightX, 'Nachher'] as const,
  ]) {
    roundRect(ctx, x, imgY, colW, imgH, 12)
    ctx.fillStyle = '#eef2ef'
    ctx.fill()
    ctx.save()
    roundRect(ctx, x, imgY, colW, imgH, 12)
    ctx.clip()
    drawCoverImage(ctx, img, x, imgY, colW, imgH)
    ctx.restore()
    ctx.fillStyle = TEXT_SOFT
    ctx.font = `600 12px ${FONT_SANS}`
    ctx.textAlign = 'center'
    ctx.fillText(label.toUpperCase(), x + colW / 2, imgY + imgH + 14)
  }
  ctx.textAlign = 'left'

  y += cardH + 16
  roundRect(ctx, PAD, y, innerW, editorialH, 16)
  ctx.fillStyle = CREAM
  ctx.fill()

  drawEditorialBlock(ctx, PAD + 24, y + 28, innerW - 48, erk)

  return canvas
}

export async function composeVizZielbildCanvas(
  input: ComposeVizZielbildInput
): Promise<HTMLCanvasElement> {
  const logoPath = input.logoUrl ?? BRAND_LOGO_WHITE
  const format = input.format ?? 'story'

  const revokes: Array<() => void> = []
  try {
    const [logoR, vorherR, nachherR] = await Promise.all([
      loadImage(logoPath),
      loadImage(input.vorherUrl),
      loadImage(input.nachherUrl),
    ])
    revokes.push(logoR.revoke, vorherR.revoke, nachherR.revoke)

    if (format === 'feed') {
      return composeFeedZielbild(input, logoR.img, vorherR.img, nachherR.img)
    }
    return composeStoryZielbild(input, logoR.img, vorherR.img, nachherR.img)
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
    titel: 'Ihr Raumprojekt',
    chat_kurz:
      'So könnte der Raum aussehen — wir begleiten Sie von der Idee bis zur Umsetzung mit allen nötigen Gewerken aus einer Hand.',
    zielbild_kicker: 'RAUMVISION · MÜNCHEN',
    zielbild_headline: 'Hell, klar, endlich Ihres',
    zielbild_teaser: 'Visualisiert mit Bärenwald — umgesetzt als Generalunternehmer.',
    zusammenfassung:
      'Auf Basis Ihrer Visualisierung planen wir die nötigen Gewerke und koordinieren alles als Generalunternehmer in München.',
    gewerke: [
      { name: 'Fliesen', beschreibung: 'Wand & Boden' },
      { name: 'Sanitär', beschreibung: 'Armaturen & WC' },
      { name: 'Trockenbau', beschreibung: 'Vorbereitung' },
    ],
    ablauf: ['Anfrage', 'Beratung', 'Umsetzung'],
    naechste_schritte: ['Anfrage', 'Beratung', 'Angebot annehmen', 'Umsetzung'],
    hinweis_gu: 'Ein Ansprechpartner · alle Gewerke',
    cta_text: 'Anfragen',
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
      zielbild_kicker: erklaerung.zielbild_kicker || fallbackErklaerung().zielbild_kicker,
      zielbild_teaser:
        erklaerung.zielbild_teaser ||
        erklaerung.zusammenfassung.split(/[.!?]/)[0]?.trim().slice(0, 90) ||
        fallbackErklaerung().zielbild_teaser,
      naechste_schritte:
        erklaerung.naechste_schritte.length > 0
          ? erklaerung.naechste_schritte.map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
          : erklaerung.ablauf.slice(0, 4),
      cta_text: erklaerung.cta_text || 'Anfragen',
    }
  }
  return fallbackErklaerung()
}
