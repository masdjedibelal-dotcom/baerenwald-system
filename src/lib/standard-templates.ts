import { supabaseAdmin } from '@/lib/supabase-admin'
import type { FormularFeld } from '@/lib/types'

export type StandardTemplateSeed = {
  name: string
  typ: 'handwerker' | 'betreuer'
  subtyp: string
  phase: 'vorab' | 'update' | 'abnahme'
  gewerk_id: null
  felder: FormularFeld[]
}

export const STANDARD_TEMPLATES: StandardTemplateSeed[] = [
  {
    name: 'Bautagebuch — Tageseintrag',
    typ: 'handwerker',
    subtyp: 'bautagebuch',
    phase: 'update',
    gewerk_id: null,
    felder: [
      { id: 'datum', label: 'Datum', typ: 'date', pflicht: true },
      { id: 'gewerk', label: 'Gewerk / Bereich', typ: 'text', pflicht: true },
      {
        id: 'mitarbeiter_anzahl',
        label: 'Anzahl Mitarbeiter vor Ort',
        typ: 'number',
        pflicht: true,
      },
      { id: 'arbeitsstunden', label: 'Arbeitsstunden heute', typ: 'number', pflicht: true },
      { id: 'ausgefuehrte_arbeiten', label: 'Ausgeführte Arbeiten', typ: 'textarea', pflicht: true },
      { id: 'material_geliefert', label: 'Material geliefert', typ: 'textarea', pflicht: false },
      { id: 'besonderheiten', label: 'Besonderheiten / Vorkommnisse', typ: 'textarea', pflicht: false },
      { id: 'naechste_schritte', label: 'Geplante Arbeiten morgen', typ: 'textarea', pflicht: false },
      { id: 'fotos', label: 'Fotos Tagesstand', typ: 'foto', pflicht: false },
    ],
  },
  {
    name: 'Regiebericht — Zusatzaufwand',
    typ: 'handwerker',
    subtyp: 'regiebericht',
    phase: 'update',
    gewerk_id: null,
    felder: [
      { id: 'datum', label: 'Datum der Arbeiten', typ: 'date', pflicht: true },
      {
        id: 'beschreibung',
        label: 'Beschreibung der Zusatzarbeiten',
        typ: 'textarea',
        pflicht: true,
        hinweis: 'Was wurde zusätzlich gemacht und warum?',
      },
      {
        id: 'grund',
        label: 'Grund für Zusatzaufwand',
        typ: 'select',
        pflicht: true,
        optionen: [
          'Unvorhergesehener Schaden',
          'Kundenänderung',
          'Planung wich ab',
          'Material fehlerhaft',
          'Sonstiges',
        ],
      },
      { id: 'stunden_gesamt', label: 'Arbeitsstunden gesamt', typ: 'number', pflicht: true },
      { id: 'stundensatz', label: 'Stundensatz (€)', typ: 'number', pflicht: true },
      { id: 'material_bezeichnung', label: 'Verwendetes Material', typ: 'textarea', pflicht: false },
      { id: 'material_kosten', label: 'Materialkosten (€)', typ: 'number', pflicht: false },
      { id: 'fotos', label: 'Fotos als Nachweis', typ: 'foto', pflicht: false },
    ],
  },
  {
    name: 'Behinderungsanzeige',
    typ: 'handwerker',
    subtyp: 'behinderung',
    phase: 'update',
    gewerk_id: null,
    felder: [
      { id: 'datum', label: 'Datum der Behinderung', typ: 'date', pflicht: true },
      { id: 'gewerk_betroffen', label: 'Betroffenes Gewerk', typ: 'text', pflicht: true },
      {
        id: 'grund',
        label: 'Grund der Behinderung',
        typ: 'select',
        pflicht: true,
        optionen: [
          'Vorgewerk nicht fertig',
          'Material nicht geliefert',
          'Kein Zugang zur Baustelle',
          'Witterung',
          'Planung unklar',
          'Anderes Gewerk im Weg',
          'Sonstiges',
        ],
      },
      {
        id: 'beschreibung',
        label: 'Genaue Beschreibung',
        typ: 'textarea',
        pflicht: true,
        hinweis: 'Was genau verhindert die Arbeit? Seit wann?',
      },
      { id: 'verantwortlich', label: 'Wer ist verantwortlich?', typ: 'text', pflicht: false },
      {
        id: 'geschaetzter_verzug',
        label: 'Geschätzter Verzug (Arbeitstage)',
        typ: 'number',
        pflicht: true,
      },
      {
        id: 'massnahmen',
        label: 'Geforderte Maßnahmen zur Behebung',
        typ: 'textarea',
        pflicht: true,
      },
      { id: 'fotos', label: 'Fotos als Nachweis', typ: 'foto', pflicht: false },
    ],
  },
  {
    name: 'Prüfprotokoll — Elektro (VDE)',
    typ: 'handwerker',
    subtyp: 'pruefprotokoll',
    phase: 'abnahme',
    gewerk_id: null,
    felder: [
      { id: 'datum_pruefung', label: 'Datum der Prüfung', typ: 'date', pflicht: true },
      { id: 'pruefer', label: 'Prüfer (Name + Qualifikation)', typ: 'text', pflicht: true },
      { id: 'anlage_beschreibung', label: 'Geprüfte Anlage', typ: 'textarea', pflicht: true },
      {
        id: 'isolationswiderstand',
        label: 'Isolationswiderstand gemessen (MΩ)',
        typ: 'number',
        pflicht: true,
      },
      { id: 'schutzleiter', label: 'Schutzleiterwiderstand i.O.', typ: 'checkbox', pflicht: true },
      { id: 'fi_schalter', label: 'FI-Schalter geprüft und i.O.', typ: 'checkbox', pflicht: true },
      { id: 'beschriftung', label: 'Sicherungskasten beschriftet', typ: 'checkbox', pflicht: true },
      {
        id: 'maengel',
        label: 'Festgestellte Mängel',
        typ: 'textarea',
        pflicht: false,
        hinweis: 'Leer lassen wenn keine Mängel',
      },
      {
        id: 'ergebnis',
        label: 'Prüfergebnis',
        typ: 'select',
        pflicht: true,
        optionen: [
          'Bestanden — keine Mängel',
          'Bedingt bestanden — Mängel beheben',
          'Nicht bestanden',
        ],
      },
      { id: 'pruefbericht_nr', label: 'Prüfbericht-Nummer', typ: 'text', pflicht: false },
    ],
  },
  {
    name: 'Prüfprotokoll — Sanitär (Druckprobe)',
    typ: 'handwerker',
    subtyp: 'pruefprotokoll',
    phase: 'abnahme',
    gewerk_id: null,
    felder: [
      { id: 'datum_pruefung', label: 'Datum der Prüfung', typ: 'date', pflicht: true },
      { id: 'pruefer', label: 'Prüfer (Name)', typ: 'text', pflicht: true },
      { id: 'pruefbereich', label: 'Geprüfter Bereich', typ: 'textarea', pflicht: true },
      {
        id: 'pruefmedium',
        label: 'Prüfmedium',
        typ: 'select',
        pflicht: true,
        optionen: ['Wasser', 'Luft', 'Stickstoff'],
      },
      { id: 'pruefdruck', label: 'Prüfdruck (bar)', typ: 'number', pflicht: true },
      { id: 'pruefzeit', label: 'Prüfzeit (Minuten)', typ: 'number', pflicht: true },
      { id: 'druckabfall', label: 'Druckabfall (bar)', typ: 'number', pflicht: true },
      { id: 'dicht', label: 'Anlage ist dicht', typ: 'checkbox', pflicht: true },
      { id: 'maengel', label: 'Festgestellte Mängel', typ: 'textarea', pflicht: false },
      {
        id: 'ergebnis',
        label: 'Prüfergebnis',
        typ: 'select',
        pflicht: true,
        optionen: ['Bestanden — dicht', 'Nicht bestanden — Leckage festgestellt'],
      },
      { id: 'foto_manometer', label: 'Foto Manometer-Stand', typ: 'foto', pflicht: true },
    ],
  },
  {
    name: 'Abnahme-Checkliste Allgemein',
    typ: 'handwerker',
    subtyp: 'standard',
    phase: 'abnahme',
    gewerk_id: null,
    felder: [
      {
        id: 'arbeiten_vollstaendig',
        label: 'Alle Arbeiten laut Auftrag vollständig abgeschlossen',
        typ: 'checkbox',
        pflicht: true,
      },
      {
        id: 'baustelle_sauber',
        label: 'Baustelle besenrein übergeben',
        typ: 'checkbox',
        pflicht: true,
      },
      {
        id: 'material_entfernt',
        label: 'Restmaterial und Verpackungen entfernt',
        typ: 'checkbox',
        pflicht: true,
      },
      {
        id: 'schäden_gebäude',
        label: 'Keine neuen Schäden am Gebäude verursacht',
        typ: 'checkbox',
        pflicht: true,
      },
      { id: 'maengel_vorhanden', label: 'Mängel vorhanden', typ: 'checkbox', pflicht: true },
      {
        id: 'maengel_beschreibung',
        label: 'Mängel Beschreibung',
        typ: 'textarea',
        pflicht: false,
        pflicht_wenn: { feld_id: 'maengel_vorhanden', wert: true },
        hinweis: 'Nur ausfüllen wenn Mängel vorhanden',
      },
      {
        id: 'besonderheiten',
        label: 'Besonderheiten / Hinweise für Kunden',
        typ: 'textarea',
        pflicht: false,
      },
      { id: 'fotos_endzustand', label: 'Fotos Endzustand', typ: 'foto', pflicht: true },
    ],
  },
]

export type EnsureStandardTemplatesResult = {
  ok: true
  inserted: number
  skipped: number
} | { ok: false; message: string }

/** Legt fehlende Standard-Templates an (idempotent nach `name`). */
export async function ensureStandardTemplates(): Promise<EnsureStandardTemplatesResult> {
  let inserted = 0
  let skipped = 0
  for (const tpl of STANDARD_TEMPLATES) {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('formular_templates')
      .select('id')
      .eq('name', tpl.name)
      .maybeSingle()
    if (selErr) return { ok: false, message: selErr.message }
    if (existing) {
      skipped += 1
      continue
    }
    const { error: insErr } = await supabaseAdmin.from('formular_templates').insert({
      name: tpl.name,
      typ: tpl.typ,
      subtyp: tpl.subtyp,
      phase: tpl.phase,
      gewerk_id: tpl.gewerk_id,
      felder: tpl.felder,
      aktiv: true,
    })
    if (insErr) return { ok: false, message: insErr.message }
    inserted += 1
  }
  return { ok: true, inserted, skipped }
}
