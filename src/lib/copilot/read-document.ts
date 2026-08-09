import 'server-only'

import { extractText, getDocumentProxy } from 'unpdf'
import { supabaseAdmin } from '@/lib/supabase-admin'

type DocTyp = 'angebot' | 'rechnung' | 'vertrag' | 'abnahme'

async function fetchPdfBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

async function pdfTextFromUrl(url: string | null | undefined): Promise<{
  text: string | null
  pages: number | null
  error?: string
}> {
  if (!url?.trim()) return { text: null, pages: null, error: 'Keine PDF-URL' }
  const bytes = await fetchPdfBytes(url)
  if (!bytes) return { text: null, pages: null, error: 'PDF konnte nicht geladen werden' }
  try {
    const pdf = await getDocumentProxy(bytes)
    const { text, totalPages } = await extractText(pdf, { mergePages: true })
    const cleaned = (text ?? '').replace(/\s+/g, ' ').trim()
    return {
      text: cleaned.slice(0, 12000) || null,
      pages: totalPages ?? null,
      error: cleaned ? undefined : 'Kein Text im PDF gefunden',
    }
  } catch (e) {
    return {
      text: null,
      pages: null,
      error: e instanceof Error ? e.message : 'PDF-Extraktion fehlgeschlagen',
    }
  }
}

function positionenKurz(positionen: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(positionen)) return []
  return positionen.slice(0, 40).map((p) => {
    const row = p as Record<string, unknown>
    return {
      id: row.id ?? null,
      name: row.name ?? row.leistung_name ?? row.titel ?? null,
      beschreibung: row.beschreibung ?? row.notiz_extern ?? null,
      menge: row.menge ?? null,
      einheit: row.einheit ?? null,
      preis: row.preis ?? row.preis_kunde ?? row.lohn_fix ?? null,
      gewerk: row.gewerk_name ?? row.gewerk_slug ?? null,
    }
  })
}

/**
 * Liest Dokument-Inhalt: zuerst strukturierte DB-Daten, optional PDF-Text.
 */
export async function readCrmDocument(input: {
  typ: string
  id: string
  include_pdf_text?: boolean
}) {
  const typ = input.typ.toLowerCase() as DocTyp
  const id = input.id.trim()
  const wantPdf = input.include_pdf_text !== false

  if (typ === 'angebot') {
    const { data, error } = await supabaseAdmin
      .from('angebote')
      .select(
        `
        id, angebotsnr, status, status_einfach, leistungsumfang,
        gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, pdf_url,
        positionen, einleitung, hinweise,
        lead_id, kunde_id,
        leads(kontakt_name, kontakt_email),
        kunden(name, email)
      `
      )
      .eq('id', id)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Angebot nicht gefunden' }
    const pdf = wantPdf ? await pdfTextFromUrl(data.pdf_url as string | null) : null
    return {
      typ: 'angebot',
      id: data.id,
      meta: {
        angebotsnr: data.angebotsnr,
        status: data.status_einfach ?? data.status,
        leistungsumfang: data.leistungsumfang,
        gesamt_fix: data.gesamt_fix,
        gueltig_bis: data.gueltig_bis,
        pdf_url: data.pdf_url,
      },
      texte: {
        einleitung: data.einleitung,
        hinweise: data.hinweise,
      },
      positionen: positionenKurz(data.positionen),
      pdf_text: pdf?.text ?? null,
      pdf_pages: pdf?.pages ?? null,
      pdf_error: pdf?.error,
      link: `/angebote/${data.id}`,
    }
  }

  if (typ === 'rechnung') {
    const { data, error } = await supabaseAdmin
      .from('rechnungen')
      .select(
        `
        id, rechnungsnummer, status, brutto, netto, faellig_am, rechnungsdatum,
        pdf_url, positionen, einleitung, hinweise, auftrag_id, kunde_id,
        kunden(name, email)
      `
      )
      .eq('id', id)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Rechnung nicht gefunden' }
    const pdf = wantPdf ? await pdfTextFromUrl(data.pdf_url as string | null) : null
    return {
      typ: 'rechnung',
      id: data.id,
      meta: {
        rechnungsnummer: data.rechnungsnummer,
        status: data.status,
        brutto: data.brutto,
        netto: data.netto,
        faellig_am: data.faellig_am,
        pdf_url: data.pdf_url,
      },
      texte: { einleitung: data.einleitung, hinweise: data.hinweise },
      positionen: positionenKurz(data.positionen),
      pdf_text: pdf?.text ?? null,
      pdf_pages: pdf?.pages ?? null,
      pdf_error: pdf?.error,
      link: `/rechnungen/${data.id}`,
    }
  }

  if (typ === 'vertrag') {
    const { data, error } = await supabaseAdmin
      .from('handwerker_vertraege')
      .select(
        `
        id, vertrags_nr, status, pdf_url, bauvorhaben, leistungsumfang, verguetung_text,
        auftrag_id, handwerker_id, gewerk_name,
        handwerker(name, firma),
        auftraege(titel)
      `
      )
      .eq('id', id)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Vertrag nicht gefunden' }
    const pdf = wantPdf ? await pdfTextFromUrl(data.pdf_url as string | null) : null
    return {
      typ: 'vertrag',
      id: data.id,
      meta: {
        vertrags_nr: data.vertrags_nr,
        status: data.status,
        gewerk_name: data.gewerk_name,
        pdf_url: data.pdf_url,
      },
      texte: {
        bauvorhaben: data.bauvorhaben,
        leistungsumfang: data.leistungsumfang,
        verguetung_text: data.verguetung_text,
      },
      positionen: [],
      pdf_text: pdf?.text ?? null,
      pdf_pages: pdf?.pages ?? null,
      pdf_error: pdf?.error,
      link: data.auftrag_id ? `/auftraege/${data.auftrag_id}` : null,
    }
  }

  if (typ === 'abnahme') {
    // id = auftrag_id
    const { data, error } = await supabaseAdmin
      .from('auftraege')
      .select(
        `
        id, titel, status, abnahme_protokoll_url, abnahme_datum, abnahme_notizen,
        kunden(name),
        auftrag_abnahmeprotokolle(id, pdf_url, meta, punkte, created_at)
      `
      )
      .eq('id', id)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Auftrag/Abnahme nicht gefunden' }
    const protos = Array.isArray(data.auftrag_abnahmeprotokolle)
      ? data.auftrag_abnahmeprotokolle
      : data.auftrag_abnahmeprotokolle
        ? [data.auftrag_abnahmeprotokolle]
        : []
    const latest = (protos as Array<Record<string, unknown>>).sort((a, b) =>
      String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    )[0]
    const pdfUrl =
      (latest?.pdf_url as string | null) ||
      (data.abnahme_protokoll_url as string | null) ||
      null
    const pdf = wantPdf ? await pdfTextFromUrl(pdfUrl) : null
    return {
      typ: 'abnahme',
      id: data.id,
      meta: {
        auftrag_titel: data.titel,
        status: data.status,
        abnahme_datum: data.abnahme_datum,
        pdf_url: pdfUrl,
      },
      texte: {
        abnahme_notizen: data.abnahme_notizen,
        meta: latest?.meta ?? null,
      },
      positionen: [],
      punkte: latest?.punkte ?? null,
      pdf_text: pdf?.text ?? null,
      pdf_pages: pdf?.pages ?? null,
      pdf_error: pdf?.error,
      link: `/auftraege/${data.id}`,
    }
  }

  return {
    error: `Unbekannter Dokument-Typ: ${input.typ}. Erlaubt: angebot, rechnung, vertrag, abnahme`,
  }
}
