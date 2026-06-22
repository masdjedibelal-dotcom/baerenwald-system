import type { KiEmpfehlungInsert, KiHubLoadPayload } from '@/lib/ki-hub/types'

/** Regelbasierte Empfehlungen — unabhängig von Claude, hohe Zuverlässigkeit. */
export function ruleBasedEmpfehlungen(data: KiHubLoadPayload): KiEmpfehlungInsert[] {
  const out: KiEmpfehlungInsert[] = []

  const kritisch = data.supabase.leads_offen.filter((l) => l.stunden_offen >= 48)
  const warnung = data.supabase.leads_offen.filter(
    (l) => l.stunden_offen >= 24 && l.stunden_offen < 48
  )

  if (kritisch.length > 0) {
    const names = kritisch
      .slice(0, 3)
      .map((l) => l.kontakt_name ?? 'Unbekannt')
      .join(', ')
    out.push({
      bereich: 'anfragen',
      prioritaet: 'kritisch',
      titel: `${kritisch.length} Anfrage${kritisch.length > 1 ? 'n' : ''} >48h ohne Bearbeitung`,
      beschreibung: `Älteste offene Anfragen: ${names}${kritisch.length > 3 ? ' …' : ''}. Optimale Antwortzeit ist überschritten.`,
      daten_basis: { lead_ids: kritisch.map((l) => l.id), stunden_offen: kritisch[0]?.stunden_offen },
      content: {
        typ: 'whatsapp',
        text: `Hallo {{name}}, vielen Dank für deine Anfrage bei Bärenwald. Wir melden uns heute noch persönlich bei dir — entschuldige die Wartezeit.`,
      },
      aktion_typ: 'send_mail',
      aktion_payload: {
        path: `/anfragen/${kritisch[0]?.id}`,
        lead_id: kritisch[0]?.id,
      },
    })
  } else if (warnung.length > 0) {
    out.push({
      bereich: 'anfragen',
      prioritaet: 'hoch',
      titel: `${warnung.length} Anfrage${warnung.length > 1 ? 'n' : ''} >24h offen`,
      beschreibung: 'Kurze Rückmeldung erhöht die Conversion deutlich.',
      daten_basis: { lead_ids: warnung.map((l) => l.id) },
      aktion_typ: 'open_crm',
      aktion_payload: { path: `/anfragen/${warnung[0]?.id}` },
    })
  }

  const gesendetOhneAntwort = data.supabase.angebote_offen.filter(
    (a) => a.status_einfach === 'gesendet' && a.gesendet_am
  )
  if (gesendetOhneAntwort.length >= 3) {
    out.push({
      bereich: 'angebote',
      prioritaet: 'mittel',
      titel: `${gesendetOhneAntwort.length} gesendete Angebote ohne Rückmeldung`,
      beschreibung: 'Nachfass-Mails oder Anrufe prüfen — besonders ältere Angebote.',
      aktion_typ: 'open_crm',
      aktion_payload: { path: '/angebote' },
    })
  }

  const netlify = data.technik.netlify
  if (netlify.status === 'ok' && netlify.data?.state === 'error') {
    out.push({
      bereich: 'technik',
      prioritaet: 'kritisch',
      titel: 'Netlify Deploy fehlgeschlagen',
      beschreibung: String(netlify.data.error_message ?? 'Letzter Build mit Fehler.'),
      aktion_typ: 'link',
      aktion_payload: { url: netlify.data.admin_url ?? 'https://app.netlify.com' },
    })
  }

  const events = data.supabase.system_events_24h.filter(
    (e) => !e.resolved && (e.severity === 'critical' || e.severity === 'high')
  )
  for (const ev of events.slice(0, 2)) {
    out.push({
      bereich: 'technik',
      prioritaet: ev.severity === 'critical' ? 'kritisch' : 'hoch',
      titel: `${ev.quelle}: ${ev.event_typ}`,
      beschreibung: JSON.stringify(ev.details ?? {}).slice(0, 200),
      daten_basis: { event_id: ev.id },
      aktion_typ: 'copy',
    })
  }

  if (data.supabase.cluster.length === 0) {
    out.push({
      bereich: 'strategie',
      prioritaet: 'info',
      titel: 'Cluster-Analysen noch nicht berechnet',
      beschreibung:
        'Unter „Alle Analysen“ auf „Zahlen aktualisieren“ klicken — dann kann der Hub tiefere Erkenntnisse liefern.',
      aktion_typ: 'open_crm',
      aktion_payload: { anchor: 'ki-depth' },
    })
  }

  return out
}
