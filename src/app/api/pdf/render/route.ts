import { NextResponse } from 'next/server'

import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import { generateBautagebuchVersicherungPdf } from '@/lib/pdf/service/generate-bautagebuch-versicherung-pdf'
import { generateEigentuemerBerichtPdf } from '@/lib/pdf/service/generate-eigentuemer-bericht-pdf'
import { generatePartnerDokumentPdf } from '@/lib/pdf/service/generate-partner-dokument-pdf'
import {
  generateVersammlungsberichtPdf,
  type VersammlungsberichtPdfPayload,
} from '@/lib/pdf/service/generate-versammlungsbericht-pdf'
import {
  generateVersicherungsTeilPdf,
  type VersicherungsTeilPdfInput,
} from '@/lib/pdf/service/generate-versicherungsakte-portal'
import { buildAushangHtml } from '@/lib/templates/aushang-template'

export const runtime = 'nodejs'

function authorize(req: Request): boolean {
  const secret = process.env.PDF_SERVICE_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

type Body = {
  template?: string
  data?: Record<string, unknown>
}

/** JSON `*Base64` strings → Uint8Array as `*Bytes`. */
function decodeBase64Fields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data }
  for (const [key, value] of Object.entries(data)) {
    if (!key.endsWith('Base64') || typeof value !== 'string') continue
    const bytesKey = `${key.slice(0, -'Base64'.length)}Bytes`
    try {
      out[bytesKey] = Uint8Array.from(Buffer.from(value, 'base64'))
    } catch {
      /* leave as-is; generator may ignore */
    }
    delete out[key]
  }
  return out
}

function toDataUrl(pngBase64OrDataUrl: string | null | undefined): string | null {
  const s = pngBase64OrDataUrl?.trim()
  if (!s) return null
  if (s.startsWith('data:')) return s
  return `data:image/png;base64,${s}`
}

async function renderAushang(data: Record<string, unknown>): Promise<Uint8Array> {
  let qrDataUrl =
    toDataUrl(typeof data.qrDataUrl === 'string' ? data.qrDataUrl : null) ||
    toDataUrl(typeof data.qrPngBase64 === 'string' ? data.qrPngBase64 : null)

  if (!qrDataUrl && data.qrPngBytes instanceof Uint8Array) {
    qrDataUrl = `data:image/png;base64,${Buffer.from(data.qrPngBytes).toString('base64')}`
  }

  let logoUrl: string | null = null
  if (typeof data.logoUrl === 'string' && data.logoUrl.trim()) {
    logoUrl = data.logoUrl.trim()
  } else if (typeof data.logoImageBase64 === 'string' && data.logoImageBase64.trim()) {
    logoUrl = toDataUrl(data.logoImageBase64)
  } else if (data.logoImageBytes instanceof Uint8Array) {
    logoUrl = `data:image/png;base64,${Buffer.from(data.logoImageBytes).toString('base64')}`
  }

  const html = buildAushangHtml({
    orgName: String(data.orgName ?? 'Hausverwaltung'),
    orgSub: data.orgSub != null ? String(data.orgSub) : null,
    primaryColor: data.primaryColor != null ? String(data.primaryColor) : null,
    objektTitel: data.objektTitel != null ? String(data.objektTitel) : null,
    objektAdresse: data.objektAdresse != null ? String(data.objektAdresse) : null,
    meldeUrl: String(data.meldeUrl ?? ''),
    qrDataUrl,
    logoUrl,
    hvTelefon: data.hvTelefon != null ? String(data.hvTelefon) : null,
    hvEmail: data.hvEmail != null ? String(data.hvEmail) : null,
  })

  const buffer = await renderHtmlToPdfBuffer(html, {
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
  })
  return new Uint8Array(buffer)
}

function pdfResponse(bytes: Uint8Array): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/**
 * Portal → CRM PDF-Service (O5).
 * POST /api/pdf/render — Bearer PDF_SERVICE_SECRET
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const template = String(body.template ?? '').trim()
  if (!template) {
    return NextResponse.json({ error: 'template erforderlich' }, { status: 400 })
  }
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return NextResponse.json({ error: 'data erforderlich' }, { status: 400 })
  }

  const data = decodeBase64Fields(body.data as Record<string, unknown>)

  try {
    switch (template) {
      case 'aushang': {
        if (!String(data.meldeUrl ?? '').trim()) {
          return NextResponse.json({ error: 'meldeUrl fehlt' }, { status: 400 })
        }
        return pdfResponse(await renderAushang(data))
      }
      case 'versammlung': {
        return pdfResponse(
          await generateVersammlungsberichtPdf(data as unknown as VersammlungsberichtPdfPayload)
        )
      }
      case 'eigentuemer-bericht': {
        return pdfResponse(
          await generateEigentuemerBerichtPdf({
            orgName: String(data.orgName ?? 'Verwaltung'),
            objektTitel: String(data.objektTitel ?? 'Objekt'),
            objektAdresse:
              data.objektAdresse != null ? String(data.objektAdresse) : undefined,
            jahr: Number(data.jahr),
            bruttoGesamt: Number(data.bruttoGesamt ?? 0),
            nachTraeger: (data.nachTraeger as Record<string, number>) ?? {},
            anzahlVorgaenge: Number(data.anzahlVorgaenge ?? 0),
            anzahlRechnungen: Number(data.anzahlRechnungen ?? 0),
            pruefpflichtenFaellig: Number(data.pruefpflichtenFaellig ?? 0),
          })
        )
      }
      case 'versicherung-teil': {
        return pdfResponse(
          await generateVersicherungsTeilPdf(data as unknown as VersicherungsTeilPdfInput)
        )
      }
      case 'bautagebuch-versicherung': {
        return pdfResponse(
          await generateBautagebuchVersicherungPdf({
            orgName: String(data.orgName ?? 'Verwaltung'),
            objektTitel: String(data.objektTitel ?? 'Vorgang'),
            objektAdresse:
              data.objektAdresse != null ? String(data.objektAdresse) : null,
            versicherungsNr:
              data.versicherungsNr != null ? String(data.versicherungsNr) : null,
            schadenNr: data.schadenNr != null ? String(data.schadenNr) : null,
            eintraege: Array.isArray(data.eintraege)
              ? (data.eintraege as Array<{
                  datum: string
                  titel: string
                  text: string
                  fotoCount: number
                  typ?: string | null
                }>)
              : [],
          })
        )
      }
      case 'partner-dokument': {
        return pdfResponse(
          await generatePartnerDokumentPdf(data as Parameters<typeof generatePartnerDokumentPdf>[0])
        )
      }
      default:
        return NextResponse.json({ error: `Unbekanntes template: ${template}` }, { status: 400 })
    }
  } catch (e) {
    console.error('[pdf/render]', template, e)
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'PDF-Erzeugung fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
