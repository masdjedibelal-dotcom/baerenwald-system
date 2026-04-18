export type LeadStatus =
  | 'neu'
  | 'kontaktiert'
  | 'angebot'
  | 'auftrag'
  | 'abgeschlossen'
  | 'abgebrochen'

export type LeadKanal =
  | 'website'
  | 'telefon'
  | 'whatsapp'
  | 'email'
  | 'vor_ort'
  | 'sonstiges'

export type LeadStatusHistory = {
  id: string
  lead_id: string
  status_alt: LeadStatus | null
  status_neu: LeadStatus
  notiz: string | null
  created_at: string
  user_id?: string | null
  user_profiles?: { name: string } | null
}

export type Kunde = {
  id: string
  name: string
  email: string | null
  telefon: string | null
  adresse: string | null
  plz: string | null
  ort: string | null
  typ: string
  notizen: string | null
  created_at: string
}

/** Kunde eingebettet in Lead-Listenabfrage */
export type LeadKundeEmbed = Pick<
  Kunde,
  'id' | 'name' | 'email' | 'telefon'
>

export type Lead = {
  id: string
  kunde_id: string | null
  kanal: LeadKanal
  status: LeadStatus
  situation: string | null
  bereiche: string[] | null
  preis_min: number | null
  preis_max: number | null
  plz: string | null
  zeitraum: string | null
  kundentyp: string | null
  funnel_daten: unknown
  kontakt_name: string | null
  kontakt_email: string | null
  kontakt_telefon: string | null
  kontakt_nachricht: string | null
  notizen: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  kunden?: Kunde | LeadKundeEmbed | null
}

/** Lead inkl. Status-Historie (Detailansicht) */
export type LeadDetail = Lead & {
  kunden?: Kunde | null
  leads_status_history?: LeadStatusHistory[] | null
  vorab_formulare?: VorabFormular[] | null
}

export type AngebotStatus =
  | 'entwurf'
  | 'gesendet_handwerker'
  | 'handwerker_akzeptiert'
  | 'gesendet_kunde'
  | 'kunde_akzeptiert'
  | 'abgelehnt'

/** Angebots- / Rechnungsposition (Stückpreise Lohn/Material; Gesamt = Summe Stück) */
export type AngebotPosition = {
  id: string
  gewerk_id: string
  gewerk_name: string
  /** interne Zuordnung Preisliste */
  leistung: string
  /** Kundentext / Gesamtwerk, nicht nur Handwerksleistung */
  beschreibung: string
  lohn_min: number
  lohn_max: number
  material_min: number
  material_max: number
  /** auto: Lohn + Material (Stück) */
  gesamt_min: number
  gesamt_max: number
  menge: number
  einheit: string
  /** intern, nicht im Kunden-PDF */
  einkaufspreis_min?: number
  einkaufspreis_max?: number
  notiz_intern?: string
  /** sichtbar im Angebot / PDF */
  notiz_extern?: string
}

export type RechnungPosition = AngebotPosition

export type AngebotHandwerkerZuweisungStatus =
  | 'ausstehend'
  | 'angefragt'
  | 'akzeptiert'
  | 'abgelehnt'
  | 'ersetzt'
  | 'zugewiesen'

export type AngebotHandwerkerZuweisungInput = {
  gewerk_id: string
  handwerker_id: string
  status?: AngebotHandwerkerZuweisungStatus
  aufgabe_notiz?: string | null
}

export type Angebot = {
  id: string
  lead_id: string | null
  kunde_id: string | null
  status: AngebotStatus
  positionen: AngebotPosition[]
  gesamt_min: number | null
  gesamt_max: number | null
  pdf_url: string | null
  notizen: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  /** gesetzt wenn Angebot per Mail an Kundin gegangen */
  gesendet_kunde_at?: string | null
  /** Kunden-Ablehnung (Statistik) */
  ablehnung_grund?: string | null
  ablehnung_konkurrenz_preis?: number | null
  ablehnung_notiz?: string | null
  kunden?: Kunde | null
  leads?: Lead | null
}

export type AngebotHandwerkerRow = {
  id: string
  angebot_id: string
  handwerker_id: string
  gewerk_id: string
  token?: string | null
  gesendet_at?: string | null
  antwort_at?: string | null
  antwort_notiz?: string | null
  ablehnung_grund?: string | null
  status?: AngebotHandwerkerZuweisungStatus | string | null
  aufgabe_notiz?: string | null
  handwerker?: {
    id: string
    name: string
    email: string | null
    telefon: string | null
  } | null
  gewerke?: {
    id: string
    name: string
    slug: string
  } | null
}

export type AngebotDetail = Angebot & {
  angebot_handwerker?: AngebotHandwerkerRow[] | null
}

export type AuftragStatus =
  | 'offen'
  | 'in_arbeit'
  | 'abnahme'
  | 'abgeschlossen'
  | 'storniert'

export type Auftrag = {
  id: string
  angebot_id: string | null
  lead_id: string | null
  kunde_id: string | null
  status: AuftragStatus
  titel: string | null
  start_datum: string | null
  end_datum: string | null
  abnahme_datum: string | null
  abnahme_protokoll_url: string | null
  notizen: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  /** Geheimer Schlüssel für öffentliche Kunden-Status-Seite /projekt/[token] */
  kunden_token?: string | null
  kunden?: Kunde
}

export type AuftragHandwerkerRow = {
  id: string
  auftrag_id: string
  handwerker_id: string
  gewerk_id: string
  status?: string | null
  handwerker?: {
    id?: string
    name: string
    email?: string | null
    telefon?: string | null
    firma?: string | null
  } | null
  gewerke?: { id?: string; name: string; slug?: string } | null
}

export type AngebotEmbedListe = Pick<
  Angebot,
  'id' | 'gesamt_min' | 'gesamt_max' | 'positionen'
>

export type AuftragListeEintrag = Auftrag & {
  kunden?: Pick<Kunde, 'id' | 'name' | 'email' | 'telefon'> | null
  angebote?: AngebotEmbedListe | null
  auftrag_handwerker?: AuftragHandwerkerRow[] | null
}

export type FormularEintrag = {
  id: string
  token: string
  template_id: string
  auftrag_id: string | null
  handwerker_id: string | null
  gewerk_id: string | null
  phase: 'vorab' | 'update' | 'abnahme' | null
  ist_entwurf: boolean
  submitted_at: string | null
  gespeichert_at: string | null
  daten: Record<string, unknown>
  foto_urls: string[] | null
  bemerkungen: string | null
  unterschrift_kunde?: string | null
  unterschrift_at?: string | null
  gesamtstunden?: number | null
  material_kosten?: number | null
  behinderung_intern_mail_at?: string | null
  created_at: string
  updated_at?: string
  formular_templates?: FormularTemplate | null
  handwerker?: { name: string } | null
  gewerke?: { name: string } | null
}

export type AuftragTimelineEvent = {
  id: string
  auftrag_id: string
  typ: string
  titel: string
  beschreibung: string | null
  foto_urls: string[] | null
  erstellt_von: string | null
  handwerker_id: string | null
  sichtbar_fuer_kunde: boolean
  fuer_kunde_freigegeben?: boolean
  freigegeben_at?: string | null
  created_at: string
}

export type PunchListRow = {
  id: string
  auftrag_id: string
  gewerk_id: string | null
  beschreibung: string
  status: 'offen' | 'in_bearbeitung' | 'behoben' | 'akzeptiert' | string
  prioritaet: string | null
  foto_urls: string[] | null
  foto_nachher_urls: string[] | null
  behoben_at: string | null
  behoben_von: string | null
  created_at: string
  gewerke?: { id: string; name: string; slug?: string } | null
}

export type NachtragRow = {
  id: string
  auftrag_id: string
  token: string
  grund: string
  beschreibung?: string | null
  positionen: unknown
  gesamt_min: number | null
  gesamt_max: number | null
  status: string
  gesendet_at: string | null
  akzeptiert_at: string | null
  abgelehnt_at: string | null
  kunde_bestaetigt_at?: string | null
  kunde_ip?: string | null
  handwercher_bestaetigt?: boolean
  handwercher_bestaetigt_at?: string | null
  abgelehnt_grund?: string | null
  created_at: string
}

export type VorBaubeginnProtokollRow = {
  id: string
  auftrag_id: string
  adresse: string | null
  datum: string
  bereiche_dokumentiert: string[] | null
  vorhandene_schaeden: string | null
  besonderheiten: string | null
  foto_urls: string[] | null
  kunde_informiert: boolean
  abgeschlossen: boolean
  created_at: string
}

export type BaustoppRow = {
  id: string
  auftrag_id: string
  typ: string
  grund: string
  beginn_datum: string
  ende_datum: string | null
  verzoegerung_tage: number | null
  altes_enddatum: string | null
  neues_enddatum: string | null
  kunde_informiert: boolean
  created_at: string
}

export type EinbehaltStatus = 'einbehalten' | 'buergschaft' | 'freigegeben'

export type Buergschaft = {
  id: string
  einbehalt_id: string
  handwerker_id: string
  urkunden_nummer: string
  bank: string | null
  betrag: number
  gueltig_bis: string
  dokument_url: string | null
  ablauf_reminder_60_sent_at?: string | null
  created_at?: string
}

export type Einbehalt = {
  id: string
  auftrag_id: string
  handwerker_id: string
  rechnung_brutto: number
  einbehalt_prozent: number
  einbehalt_betrag: number
  bezahlt_betrag: number
  status: EinbehaltStatus
  freigabe_datum: string
  freigegeben_at: string | null
  notizen: string | null
  freigabe_reminder_30_sent_at?: string | null
  freigabe_reminder_7_sent_at?: string | null
  created_at?: string
  handwerker?: Pick<Handwerker, 'id' | 'name' | 'firma'> | null
  buergschaften?: Buergschaft[] | null
}

export type EingangsrechnungKategorie =
  | 'material'
  | 'lohn'
  | 'geraete'
  | 'entsorgung'
  | 'sonstiges'

export type Eingangsrechnung = {
  id: string
  auftrag_id: string
  lieferant: string
  beschreibung: string | null
  kategorie: EingangsrechnungKategorie
  betrag_netto: number
  mwst_satz: number
  betrag_brutto: number
  rechnungsdatum: string | null
  faellig_am: string | null
  bezahlt: boolean
  bezahlt_am: string | null
  beleg_url: string | null
  notizen: string | null
  erstellt_von?: string | null
  created_at?: string
}

export type AuftragDetail = Auftrag & {
  kunden?: Kunde | null
  angebote?: (Angebot & { positionen?: unknown }) | null
  auftrag_handwerker?: AuftragHandwerkerRow[] | null
  formular_eintraege?: FormularEintrag[] | null
  kalender_termine?: KalenderTermin[] | null
  auftrag_timeline?: AuftragTimelineEvent[] | null
  punch_list?: PunchListRow[] | null
  nachtraege?: NachtragRow[] | null
  vor_baubeginn_protokolle?: VorBaubeginnProtokollRow[] | null
  baustopps?: BaustoppRow[] | null
  einbehalte?: Einbehalt[] | null
  eingangsrechnungen?: Eingangsrechnung[] | null
}

export type ComplianceStatus =
  | 'vollständig'
  | 'warnung'
  | 'unvollständig'
  | 'abgelaufen'

export type ComplianceDokumentTyp = {
  id: string
  slug: string
  bezeichnung: string
  beschreibung: string | null
  pflicht_fuer_fachbetriebe: boolean
  erneuerung_monate: number | null
  sort_order: number
}

export type PartnerDokument = {
  id: string
  handwerker_id: string
  typ: string
  bezeichnung: string
  gueltig_bis: string | null
  datei_url: string | null
  notizen: string | null
  hochgeladen_am: string
  compliance_dokument_typen?: ComplianceDokumentTyp | null
}

export type PartnerKategorie = {
  id: string
  name: string
  slug: string
  sort_order: number
}

export type Partner = {
  id: string
  name: string
  kategorie_id: string | null
  subkategorie: string | null
  ansprechpartner: string | null
  telefon: string | null
  email: string | null
  adresse: string | null
  website: string | null
  notizen: string | null
  aktiv: boolean
  partner_kategorien?: PartnerKategorie | null
}

export type Handwerker = {
  id: string
  name: string
  firma: string | null
  email: string | null
  telefon: string | null
  whatsapp: string | null
  webseite: string | null
  gewerke: string[]
  subkategorie: string | null
  ist_fachbetrieb: boolean
  compliance_status: ComplianceStatus | null
  steuernummer: string | null
  ustid: string | null
  iban: string | null
  partner_kategorie_id: string | null
  adresse: string | null
  aktiv: boolean
  notizen: string | null
  created_at: string
  partner_kategorien?: PartnerKategorie | null
  partner_dokumente?: PartnerDokument[] | null
}

export type Gewerk = {
  id: string
  name: string
  slug: string
  aktiv: boolean
}

export type Preisliste = {
  id: string
  gewerk_id: string
  /** Gruppierung im UI; leer = „Ohne Kategorie“ */
  kategorie?: string
  leistung: string
  einheit: string
  preis_min: number
  preis_max: number
  aktiv: boolean
  gewerke?: Gewerk
}

export type KalenderTermin = {
  id: string
  lead_id: string | null
  auftrag_id: string | null
  titel: string
  beschreibung: string | null
  typ: 'besichtigung' | 'beginn' | 'abnahme' | 'sonstiges'
  datum: string
  uhrzeit_von: string | null
  uhrzeit_bis: string | null
  adresse: string | null
  erledigt: boolean
  created_at: string
  leads?: { kontakt_name: string | null } | null
  auftraege?: {
    titel: string | null
    kunden?: { name: string } | null
  } | null
}

export type FormularSubtyp =
  | 'bautagebuch'
  | 'bautagebuch_kurz'
  | 'regiebericht'
  | 'behinderung'
  | 'pruefprotokoll'
  | 'standard'
  | string

export type FormularTemplate = {
  id: string
  gewerk_id: string | null
  name: string
  typ: 'handwerker' | 'betreuer'
  subtyp?: FormularSubtyp | null
  phase: 'vorab' | 'update' | 'abnahme' | null
  felder: FormularFeld[]
  aktiv: boolean
  gewerke?: Gewerk | null
}

export type FormularFeld = {
  id: string
  label: string
  typ:
    | 'text'
    | 'number'
    | 'date'
    | 'checkbox'
    | 'select'
    | 'foto'
    | 'textarea'
  pflicht: boolean
  optionen?: string[]
  hinweis?: string
  /** Wenn gesetzt: Feld ist nur pflichtig, wenn `feld_id` den Wert `wert` hat (z. B. Checkbox true). */
  pflicht_wenn?: { feld_id: string; wert?: unknown }
}

export type VorabFormular = {
  id: string
  lead_id: string
  template_id: string
  daten: Record<string, unknown>
  created_at: string
  updated_at?: string
  formular_templates?: (Pick<FormularTemplate, 'id' | 'name' | 'phase' | 'typ'> & {
    felder?: unknown
  }) | null
}

export type RechnungStatus = 'entwurf' | 'gesendet' | 'bezahlt' | 'storniert'

export type Rechnung = {
  id: string
  angebot_id: string | null
  auftrag_id: string | null
  kunde_id: string
  rechnungsnummer: string
  status: RechnungStatus
  positionen: RechnungPosition[]
  lohn_netto: number | null
  material_netto: number | null
  netto: number | null
  mwst_satz: number | null
  mwst_betrag: number | null
  brutto: number | null
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  pdf_url: string | null
  rechnungsdatum: string
  gesendet_at: string | null
  bezahlt_at: string | null
  erinnerung_7_sent_at?: string | null
  erinnerung_21_sent_at?: string | null
  intern_warnung_30_at?: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  kunden?: Kunde | Pick<Kunde, 'id' | 'name' | 'email' | 'telefon' | 'adresse' | 'plz' | 'ort' | 'typ'> | null
  angebote?: Pick<Angebot, 'id' | 'gesamt_min' | 'gesamt_max'> | null
  auftraege?: Pick<Auftrag, 'id' | 'titel'> | null
}

/** Nur Felder der Listen-Abfrage `/rechnungen` (kunden je nach Join ein Objekt oder Array) */
export type RechnungListeZeile = Pick<
  Rechnung,
  'id' | 'rechnungsnummer' | 'status' | 'brutto' | 'rechnungsdatum' | 'faellig_am' | 'bezahlt_at'
> & {
  kunden?: { name: string } | { name: string }[] | null
}
