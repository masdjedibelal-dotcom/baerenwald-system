import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { anweisungFotos } from '@/lib/einsatz/anweisung-fotos'
import { logDbError } from '@/lib/errors/log-db-error'
import { formatDatum } from '@/lib/format/geld-datum'
import { getMailBranding } from '@/lib/get-mail-branding'
import { buildEinsatzMitarbeiterMail } from '@/lib/mail/einsatz-partner-mail'
import { sendMail } from '@/lib/mail-service'
import { buildPartnerDashboardLink } from '@/lib/portal-utils'
import { imFenster, nachrichtSenden } from '@/lib/whatsapp/dienst'
import { whatsappKonfig } from '@/lib/whatsapp/konfig'
import { waNummer } from '@/lib/whatsapp/telefon'

/**
 * Mitarbeiter des Partners über „seinen“ Einsatz informieren — erst **nach der Annahme** durch den Inhaber
 * (oder Bärenwald dafür). Mail + WhatsApp mit Anweisung, Termin, Ort, Kontakt vor Ort und Fotos, **ohne EK**.
 */
export async function mitarbeiterUeberEinsatzInformieren(
  db: SupabaseClient,
  einsatzId: string
): Promise<{ ok: true; kanaele: string[] } | { ok: false; message: string }> {
  const { data: e, error } = await db
    .from('einsaetze')
    .select(
      'id, auftrag_id, handwerker_id, titel, anweisung, anweisung_fotos, termin_von, termin_bis, ort, kontakt_vor_ort, status, mitarbeiter_id, handwerker(name, firma), handwerker_mitarbeiter(name, email, telefon, aktiv)'
    )
    .eq('id', einsatzId)
    .maybeSingle()
  if (error) logDbError('lib/einsatz/mitarbeiter-info:laden', error)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (e.status !== 'angenommen') return { ok: true, kanaele: [] }
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)
  const m = one(e.handwerker_mitarbeiter as unknown as { name: string; email: string | null; telefon: string | null; aktiv: boolean } | null)
  if (!e.mitarbeiter_id || !m || m.aktiv === false) return { ok: true, kanaele: [] }
  const hw = one(e.handwerker as unknown as { name?: string | null; firma?: string | null } | null)
  const partnerName = hw?.firma?.trim() || hw?.name?.trim() || 'Ihr Betrieb'
  const fotos = anweisungFotos(e.anweisung_fotos)
  const portalLink = buildPartnerDashboardLink()
  const kanaele: string[] = []

  const email = m.email?.trim()
  if (email) {
    const tpl = buildEinsatzMitarbeiterMail(
      {
        mitarbeiterName: m.name,
        partnerName,
        titel: String(e.titel ?? ''),
        anweisung: (e.anweisung as string | null) ?? null,
        fotos,
        terminVon: (e.termin_von as string | null) ?? null,
        terminBis: (e.termin_bis as string | null) ?? null,
        ort: (e.ort as string | null) ?? null,
        kontaktVorOrt: (e.kontakt_vor_ort as string | null) ?? null,
        portalLink,
      },
      await getMailBranding()
    )
    const sent = await sendMail({
      typ: 'einsatz_mitarbeiter',
      an: email,
      anName: m.name,
      betreff: tpl.betreff,
      html: tpl.html,
      auftragId: String(e.auftrag_id),
      kontextTyp: 'auftrag',
    })
    if (sent.success) kanaele.push('mail')
  }

  const nummer = waNummer(m.telefon)
  if (nummer && whatsappKonfig().sichtbar) {
    const termin =
      e.termin_von && e.termin_bis && e.termin_von !== e.termin_bis
        ? `${formatDatum(String(e.termin_von))} bis ${formatDatum(String(e.termin_bis))}`
        : e.termin_von
          ? formatDatum(String(e.termin_von))
          : 'nach Absprache'
    const zeilen = [
      `Hallo ${m.name}, ${partnerName} hat Sie für den Einsatz „${e.titel}“ eingeteilt.`,
      `Termin: ${termin}`,
      e.ort ? `Ort: ${e.ort}` : null,
      e.kontakt_vor_ort ? `Kontakt vor Ort: ${e.kontakt_vor_ort}` : null,
      e.anweisung ? `Anweisung: ${String(e.anweisung).trim()}` : null,
      `Alle Details${fotos.length ? ' und Fotos' : ''}: ${portalLink}`,
    ].filter(Boolean) as string[]
    // Mitarbeiter-Nachrichten laufen im Chat des Partners
    const kontakt = { typ: 'handwerker' as const, id: String(e.handwerker_id), name: m.name, nummer }
    const offen = await imFenster(db, nummer)
    const r = await nachrichtSenden(db, {
      kontakt,
      text: offen ? zeilen.join('\n') : zeilen.join(' · '),
      auftragId: String(e.auftrag_id),
      einsatzId,
      userId: null,
    })
    if (r.ok) {
      kanaele.push('whatsapp')
      // Fotos nur im 24-Stunden-Fenster (sonst stehen sie im Portal)
      if (offen) {
        for (const [i, url] of fotos.entries()) {
          await nachrichtSenden(db, {
            kontakt,
            text: '',
            medium: { url, art: 'bild', name: `Foto ${i + 1}.jpg`, mime: 'image/jpeg' },
            auftragId: String(e.auftrag_id),
            einsatzId,
            userId: null,
          })
        }
      }
    }
  }
  return { ok: true, kanaele }
}
