import type { AuftragBautagesbericht } from '@/lib/auftraege/bautagesbericht-types'
import type {
  AuftragBaustelleTeam,
  AuftragBaustellenDokument,
  AuftragRegiearbeit,
  AuftragWochenbericht,
} from '@/lib/auftraege/baustelle-types'

export type LeadStatus =
  | 'neu'
  | 'kontaktiert'
  | 'termin'
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
  | 'hv_melder_link'
  | 'hv_einladung'
  | 'hv_direkt'
  | 'hv_katalog'
  | 'hv_manuell'
  | 'org_portal'
  | 'org_funnel'
  | 'org_service'

export type PortalModus = 'privat' | 'organisation'
export type FreigabeModus = 'direkt' | 'freigabe'
export type LeadAnlass = 'meldung' | 'projekt' | 'servicepaket' | 'sonstiges'
export type LeadErfassungVon = 'melder' | 'organisation' | 'crm'
export type EinladungStatus = 'offen' | 'ergaenzt' | 'entfallen'
export type OrgFreigabeStatus = 'nicht_noetig' | 'ausstehend' | 'freigegeben' | 'abgelehnt'
export type ServiceModus = 'paket' | 'einzeln'
export type OrgFreigabeAktion = 'angefordert' | 'freigegeben' | 'abgelehnt'

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

/** privat | gewerbe | hausverwaltung | sonstiges */
export type Kunde = {
  id: string
  name: string
  vorname?: string | null
  nachname?: string | null
  email: string | null
  telefon: string | null
  /** Legacy: wird beim Speichern aus Straße + Hausnummer gesetzt */
  adresse: string | null
  strasse?: string | null
  hausnummer?: string | null
  plz: string | null
  ort: string | null
  typ: string
  notizen: string | null
  created_at: string
  updated_at?: string | null
  ansprechpartner?: string | null
  webseite?: string | null
  geburtstag?: string | null
  kundennummer?: string | null
  quelle?: string | null
  gesamt_umsatz?: number | null
  letzte_aktivitaet?: string | null
  /** USt-IdNr. des Kunden (Gewerbe / Reverse Charge) */
  ust_id?: string | null
  /** Supabase Auth User des Kundenportals (MeinBärenwald) */
  auth_user_id?: string | null
  /** privat = Standard-Portal; organisation = Auftraggeber-Portal */
  portal_modus?: PortalModus | null
  /** URL-Slug → /melden/{org_kennung} */
  org_kennung?: string | null
  org_anzeigename?: string | null
  org_logo_url?: string | null
  freigabe_modus?: FreigabeModus | null
  freigabe_schwelle_eur?: number | null
  notfall_direkt?: boolean | null
}

/** WEG / Gebäude unter Gewerbe- oder Hausverwaltungs-Kunden */
export type KundenObjekt = {
  id: string
  kunde_id: string
  titel: string
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
  created_at: string
  updated_at: string
  melde_slug?: string | null
  melde_aktiv?: boolean | null
  einheiten_hinweis?: string | null
  notizen_intern?: string | null
  created_by?: 'crm' | 'portal' | null
}

export type KundenNotizRow = {
  id: string
  kunde_id: string
  inhalt: string
  erstellt_von: string | null
  created_at: string
  user_profiles?: { name: string } | null
}

export type KundenDokumentRow = {
  id: string
  kunde_id: string
  name: string
  typ: string
  datei_url: string | null
  groesse_bytes: number | null
  created_at: string
}

/** Kunde eingebettet in Lead-Listenabfrage */
export type LeadKundeEmbed = Pick<
  Kunde,
  'id' | 'name' | 'email' | 'telefon'
>

/** Angebots-Zeile in Lead-Listenabfrage (embed) */
export type LeadListAngebot = {
  id: string
  status: string
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at?: string | null
  pdf_url?: string | null
}

export type LeadNotizRow = {
  id: string
  lead_id: string
  inhalt: string
  datei_url: string | null
  /** Mehrere Bild-URLs (Termin-Notizen, max. 15). */
  datei_urls?: string[] | null
  /** Spiegel einer Termin-Notiz im Tab Anfrage-Notizen. */
  quelle_notiz_id?: string | null
  kalender_termin_id?: string | null
  titel?: string | null
  erstellt_von: string | null
  created_at: string
  user_profiles?: { name: string } | null
}

export type LeadDokumentRow = {
  id: string
  lead_id: string
  name: string
  datei_url: string
  groesse_bytes: number | null
  erstellt_von: string | null
  created_at: string
}

export type Lead = {
  id: string
  kunde_id: string | null
  /** Ausgewähltes Verwaltungsobjekt (Gewerbe/Hausverwaltung) */
  kunde_objekt_id?: string | null
  kanal: LeadKanal
  status: LeadStatus
  situation: string | null
  bereiche: string[] | null
  /** @deprecated Web/API – Anzeige Budget über budget_ca */
  preis_min: number | null
  /** @deprecated */
  preis_max: number | null
  budget_ca?: number | null
  bereiche_sonstiges?: string | null
  zeitraum_von?: string | null
  zeitraum_bis?: string | null
  vor_ort_notizen?: string | null
  plz: string | null
  zeitraum: string | null
  kundentyp: string | null
  funnel_daten: unknown
  kontakt_name: string | null
  kontakt_email: string | null
  kontakt_telefon: string | null
  kontakt_nachricht: string | null
  notizen: string | null
  auftraggeber_kunde_id?: string | null
  anlass?: LeadAnlass | null
  erfassung_von?: LeadErfassungVon | null
  melder_name?: string | null
  melder_einheit?: string | null
  melder_telefon?: string | null
  melder_email?: string | null
  einladung_token?: string | null
  einladung_status?: EinladungStatus | null
  org_freigabe_status?: OrgFreigabeStatus | null
  service_modus?: ServiceModus | null
  /** HV-Plattform: Meldungs-Workflow-Status */
  hv_meldung_status?: string | null
  kostentraeger?: string | null
  kostentraeger_vorgeschlagen?: boolean | null
  versicherungs_nr?: string | null
  vorgang_phase?: string | null
  melde_tracking_token?: string | null
  duplikat_hinweis?: boolean | null
  /** Bauprojekt — erweiterte Unterlagen & Bautagesberichte */
  ist_bauprojekt?: boolean
  ki_session_id?: string | null
  ki_zusammenfassung?: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  kunden?: Kunde | LeadKundeEmbed | null
  angebote?: LeadListAngebot[] | null
}

export type LeadWithAngebote = Lead & {
  angebote?: LeadListAngebot[] | null
}

export type LeadTimelineRow = {
  id: string
  lead_id: string
  angebot_id?: string | null
  email_log_id?: string | null
  typ: string
  titel: string
  beschreibung: string | null
  created_at: string
  erstellt_von?: string | null
}

export type OrgFreigabeLogRow = {
  id: string
  lead_id: string | null
  angebot_id: string | null
  auftraggeber_kunde_id: string
  aktion: OrgFreigabeAktion
  betrag_eur: number | null
  notiz: string | null
  erstellt_von: string | null
  created_at: string
}

export type LeadAuftraggeberEmbed = Pick<
  Kunde,
  'id' | 'name' | 'email' | 'org_anzeigename' | 'org_kennung'
>

/** Lead inkl. Status-Historie (Detailansicht) */
export type LeadDetail = Lead & {
  kunden?: Kunde | null
  auftraggeber?: LeadAuftraggeberEmbed | null
  kunden_objekte?: KundenObjekt | null
  org_freigabe_log?: OrgFreigabeLogRow[] | null
  leads_status_history?: LeadStatusHistory[] | null
  vorab_formulare?: VorabFormular[] | null
  lead_timeline?: LeadTimelineRow[] | null
  /** Besichtigungstermine etc. (gleiche Form wie KalenderTermin) */
  kalender_termine?: Array<{
    id: string
    lead_id: string | null
    auftrag_id: string | null
    titel: string
    beschreibung: string | null
    typ: string
    datum: string
    uhrzeit_von: string | null
    uhrzeit_bis: string | null
    adresse: string | null
    erledigt: boolean
    created_at: string
  }> | null
  lead_notizen?: LeadNotizRow[] | null
  lead_dokumente?: LeadDokumentRow[] | null
}

export type AngebotStatus =
  | 'entwurf'
  | 'gesendet_handwerker'
  | 'handwerker_akzeptiert'
  | 'gesendet_kunde'
  | 'kunde_akzeptiert'
  | 'abgelehnt'

/** Gesamtpreis auf Angebots-/Positions-Ebene */
export type PreisTyp = 'range' | 'fix'

/** Angebots- / Rechnungsposition (Festpreis netto / Einheit; Gesamt Stück = Lohn + Material) */
export type AngebotPosition = {
  id: string
  gewerk_id: string
  gewerk_name: string
  /** Alias für Editor / JSON-Export */
  gewerk_slug?: string
  /** Abschnitt im Projektangebot (mehrere Blöcke pro Gewerk möglich) */
  gewerk_block_key?: string
  /** interne Zuordnung Preisliste */
  leistung: string
  leistung_id?: string
  leistung_name?: string
  /** Kundentext / Gesamtwerk, nicht nur Handwerksleistung */
  beschreibung: string
  /** Festpreis Lohn netto / Einheit */
  lohn_netto: number
  /** Festpreis Material netto / Einheit */
  material_netto: number
  /** Einzelpreis netto (Wizard); verhindert Rundungsfehler beim erneuten Laden */
  vk_netto?: number
  /** Stück netto = Lohn + Material (bei Festpreis i. d. R. gleich min/max) */
  gesamt_min: number
  gesamt_max: number
  menge: number
  einheit: string
  /** intern: EK / Einheit (für Marge) */
  einkaufspreis?: number
  notiz_intern?: string
  /** sichtbar im Angebot / PDF */
  notiz_extern?: string
  /** Zugeordneter Handwerker für dieses Gewerk (persistiert auch in angebot_handwerker) */
  handwerker_id?: string
  handwerker_name?: string
  /** Alt-JSON / Lesen aus DB */
  preis_typ?: PreisTyp
  /** MwSt.-Satz dieser Zeile (z. B. 0, 7, 19) */
  mwst_satz?: number
  /** Arbeits-/Material-Zuordnung (Wizard); sonst aus Lohn/Material abgeleitet */
  kostenverteilung?: 'allgemein' | 'lohn' | 'material'
  /** Anfahrt vs. Leistung (Wizard) */
  kostenart?: 'leistung' | 'anfahrt'
  /** PDF: Ausführung über Fachbetrieb (aus Gewerk.ausfuehrung) */
  ist_fachbetrieb?: boolean
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
  /** Ausführungsort (Verwaltungsobjekt) */
  kunde_objekt_id?: string | null
  status: AngebotStatus
  positionen: AngebotPosition[]
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  pdf_url: string | null
  notizen: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  preis_typ?: PreisTyp | null
  vorlage_id?: string | null
  gesendet_handwerker_at?: string | null
  /** gesetzt wenn Angebot per Mail an Kundin gegangen */
  gesendet_kunde_at?: string | null
  /** Fortlaufende Nr. z.B. AG250042 */
  angebotsnr?: string | null
  leistungsumfang?: string | null
  einleitung?: string | null
  zahlungsbedingungen?: string | null
  hinweise?: string | null
  gueltig_bis?: string | null
  /** einfach | projekt — Layout & Zusatzfelder */
  dokument_typ?: 'einfach' | 'projekt' | null
  projektbeschreibung?: string | null
  /** Öffentliche Bild-URLs (JSON-Array in DB) */
  fotos_urls?: string[] | unknown | null
  /** Verknüpfte KI-Visualisierungs-Sessions */
  visualisierung_ids?: string[] | null
  /** Optionale zweite Variante inkl. Positionen */
  varianten?: unknown | null
  /** Ausführliche Hinweise (v. a. Projekt-PDF) */
  wichtige_hinweise?: string | null
  /** Kunden-Mail: du | sie */
  anrede?: 'du' | 'sie' | string | null
  /** Vereinfachter CRM-Status */
  status_einfach?:
    | 'entwurf'
    | 'gesendet'
    | 'angenommen'
    | 'abgelehnt'
    | 'abgelaufen'
    | 'ersetzt'
    | string
    | null
  /** Erster / letzter Versand an Kunde */
  gesendet_am?: string | null
  /** Automatische Nachfass-Mail */
  nachgefasst_am?: string | null
  /** Zuletzt Gültigkeit verlängert (Erinnerungs-Mail +7 Tage) */
  verlaengert_am?: string | null
  /** Kunden-Ablehnung (Statistik) */
  ablehnung_grund?: string | null
  ablehnung_konkurrenz_preis?: number | null
  ablehnung_notiz?: string | null
  kunden?: Kunde | null
  leads?: Lead | null
  kunden_objekte?: KundenObjekt | null
}

export type AngebotVorlage = {
  id: string
  name: string
  beschreibung: string | null
  positionen: AngebotPosition[]
  gesamt_min: number | null
  gesamt_max: number | null
  gesamt_fix: number | null
  aktiv: boolean
  created_at: string
  updated_at?: string | null
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
  hw_preis_netto?: number | null
  hw_preis_brutto?: number | null
  hw_angebot_pdf_url?: string | null
  hw_angebot_anhang_urls?: string[] | null
  hw_rechnung_pdf_url?: string | null
  hw_rechnung_eingereicht_at?: string | null
  hw_eingereicht_at?: string | null
  hw_status?: string | null
  hw_notiz?: string | null
  hw_crm_notiz?: string | null
  hw_crm_antwort_at?: string | null
  hw_konditionen?: unknown
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

/** Kompakte Zeile für Angebotsliste & Side-Panel */
export type AngebotListeEintrag = Omit<Angebot, 'kunden' | 'leads'> & {
  kunden?: Pick<Kunde, 'id' | 'name' | 'email' | 'plz' | 'ort'> | null
  leads?: Pick<Lead, 'id' | 'situation' | 'bereiche' | 'kontakt_name' | 'plz'> | null
  angebot_handwerker?: Array<
    Pick<AngebotHandwerkerRow, 'id' | 'status' | 'handwerker_id' | 'gewerk_id'> & {
      handwerker?: { name: string } | null
    }
  > | null
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
  abschlussdokumentation_url?: string | null
  abschlussdokumentation_gesendet_at?: string | null
  notizen: string | null
  erstellt_von: string | null
  created_at: string
  updated_at: string
  /** Geheimer Schlüssel für öffentliche Kunden-Status-Seite /projekt/[token] */
  kunden_token?: string | null
  /** CRM-Betreuer:in (auth.users) */
  betreuer_id?: string | null
  /** 0–100 */
  fortschritt?: number | null
  /** Kurztext auf der Kunden-Status-Seite */
  naechster_schritt?: string | null
  /** Öffentliche Kunden-Seite: Aufrufzähler */
  kunden_seite_aufrufe?: number | null
  kunden_seite_letzter_aufruf?: string | null
  /** Bauprojekt — Bautagesbericht statt kurzem Bautagebuch */
  ist_bauprojekt?: boolean
  /** HV-Plattform: Kostenträger (Rechnung/Versicherungsakte) */
  kostentraeger?: string | null
  versicherungs_nr?: string | null
  versicherungsakte_pdf_url?: string | null
  kunden?: Kunde
}

export type AuftragMilestoneRow = {
  id: string
  auftrag_id: string
  titel: string
  beschreibung: string | null
  datum: string | null
  erledigt: boolean
  erledigt_at: string | null
  fuer_kunden_sichtbar: boolean
  sort_order: number
  ist_system: boolean
  created_at: string
}

export type AuftragHandwerkerRow = {
  id: string
  auftrag_id: string
  handwerker_id: string
  gewerk_id: string
  status?: string | null
  vereinbarter_preis?: number | null
  absprachen?: string | null
  notizen?: string | null
  projektvertrag_bestaetigt_am?: string | null
  projektvertrag_quelle?: 'crm_wizard' | 'portal_bestaetigung' | null
  /** Vom CRM gewählte Pflicht-Unterlagen; null = Legacy-Automatik im Portal */
  compliance_pflicht_slugs?: string[] | null
  handwerker?: {
    id?: string
    name: string
    email?: string | null
    telefon?: string | null
    firma?: string | null
  } | null
  gewerke?: { id?: string; name: string; slug?: string } | null
}

/** Persistierte Auftragsposition (Tabelle `auftrag_positionen`) */
export type AuftragBautagebuchEintrag = {
  id: string
  auftrag_id: string
  timeline_id?: string | null
  titel: string
  beschreibung?: string | null
  datum: string
  gewerk_id?: string | null
  gewerk_phase_key?: string | null
  handwerker_id?: string | null
  handwerker?: { id: string; name: string; firma?: string | null } | null
  foto_urls?: string[] | null
  fuer_kunde_freigegeben?: boolean
  freigegeben_at?: string | null
  an_kunde_gesendet_at?: string | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
  /** Signierte Anzeige-URLs (nur CRM-UI, nicht persistieren). */
  foto_display_urls?: string[] | null
}

export type AuftragPositionNotiz = {
  id: string
  position_id: string
  datum: string
  text: string
  sort_order: number | null
  created_at?: string | null
}

/** Persistierte Auftragsposition (Tabelle `auftrag_positionen`) */
export type AuftragPosition = {
  id: string
  auftrag_id: string
  gewerk_slug: string | null
  gewerk_name: string
  gewerk_block_key?: string | null
  projekt_phase?: string | null
  oberkategorie: string | null
  unterkategorie: string | null
  leistung_name: string
  beschreibung: string | null
  einheit: string | null
  menge: number | null
  preis_fix: number | null
  preis_partner?: number | null
  lohn_fix: number | null
  material_fix: number | null
  start_datum?: string | null
  end_datum?: string | null
  handwerker_id: string | null
  handwerker_status?: string | null
  handwerker_angefragt_at?: string | null
  /** neu | geaendert | entfernt — CRM setzt, Portal cleart nach Annahme */
  aenderung_typ?: 'neu' | 'geaendert' | 'entfernt' | string | null
  /** Alter preis_partner vor Preisänderung (Netto-Zeile) */
  preis_alt?: number | null
  /** offen | in_arbeit | erledigt — preisgewichteter Fortschritt */
  leistung_status?: string | null
  absprachen?: string | null
  notizen_intern?: string | null
  sort_order: number | null
  created_at?: string | null
  handwerker?: { id?: string; name: string; email?: string | null; telefon?: string | null } | null
  auftrag_position_notizen?: AuftragPositionNotiz[] | null
}

export type AngebotEmbedListe = Pick<
  Angebot,
  'id' | 'gesamt_fix' | 'gesamt_min' | 'gesamt_max' | 'positionen'
>

export type AuftragListeEintrag = Auftrag & {
  kunden?: Pick<Kunde, 'id' | 'name' | 'email' | 'telefon' | 'adresse' | 'plz' | 'ort' | 'vorname' | 'nachname' | 'typ'> | null
  leads?: Pick<Lead, 'id' | 'situation' | 'bereiche' | 'plz'> | null
  angebote?: AngebotEmbedListe | null
  auftrag_handwerker?: AuftragHandwerkerRow[] | null
  auftrag_positionen?: Pick<AuftragPosition, 'id' | 'gewerk_name'>[] | null
  auftrag_milestones?: Pick<
    AuftragMilestoneRow,
    'id' | 'titel' | 'erledigt' | 'fuer_kunden_sichtbar'
  >[] | null
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
  abnahme_punkt_id?: string | null
  protokoll_id?: string | null
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
  auftrag_positionen?: AuftragPosition[] | null
  formular_eintraege?: FormularEintrag[] | null
  kalender_termine?: KalenderTermin[] | null
  auftrag_timeline?: AuftragTimelineEvent[] | null
  punch_list?: PunchListRow[] | null
  nachtraege?: NachtragRow[] | null
  vor_baubeginn_protokolle?: VorBaubeginnProtokollRow[] | null
  baustopps?: BaustoppRow[] | null
  einbehalte?: Einbehalt[] | null
  eingangsrechnungen?: Eingangsrechnung[] | null
  auftrag_milestones?: AuftragMilestoneRow[] | null
  hw_formular_tabs?: HwFormularTabRow[] | null
  auftrag_bautagebuch?: AuftragBautagebuchEintrag[] | null
  auftrag_bautagesberichte?: AuftragBautagesbericht[] | null
  auftrag_baustelle_team?: AuftragBaustelleTeam | null
  auftrag_regiearbeiten?: AuftragRegiearbeit[] | null
  auftrag_wochenberichte?: AuftragWochenbericht[] | null
  auftrag_baustellen_dokumente?: AuftragBaustellenDokument[] | null
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
  /** Optional: Gruppen-Titel in der Handwerker-Compliance-Liste */
  kategorie?: string | null
  aktiv?: boolean
  scope?: 'standard' | 'stamm' | 'bauprojekt' | 'gewerk' | null
  gewerk_slugs?: string[] | null
  pflicht_bauprojekt?: boolean
  vertrag_referenz?: string | null
  mehrfach_erlaubt?: boolean
  /** allgemein | meister | leistung */
  compliance_ebene?: ComplianceEbene | null
  /** Nur wenn Partner Bau-Gewerke hat */
  nur_bei_bauleistung?: boolean
}

export type PartnerDokument = {
  id: string
  handwerker_id: string
  auftrag_id?: string | null
  typ: string
  bezeichnung: string
  gueltig_bis: string | null
  datei_url: string | null
  notizen: string | null
  hochgeladen_am: string
  status?: string | null
  freigegeben_am?: string | null
  ablehnung_grund?: string | null
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
  vorname: string | null
  nachname: string | null
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
  bewertung_gesamt?: number | null
  bewertung_qualitaet?: number | null
  bewertung_termintreue?: number | null
  bewertung_sauberkeit?: number | null
  bewertung_kommunikation?: number | null
  bewertung_preis_leistung?: number | null
  bewertung_anzahl?: number | null
  partner_kategorien?: PartnerKategorie | null
  partner_dokumente?: PartnerDokument[] | null
  auth_user_id?: string | null
}

export type GewerkAusfuehrung = 'eigen' | 'fachbetrieb' | 'beides'

export type ComplianceEbene = 'allgemein' | 'meister' | 'leistung'

export type Gewerk = {
  id: string
  name: string
  slug: string
  aktiv: boolean
  ausfuehrung?: GewerkAusfuehrung | string
  fachbetrieb_hinweis?: string | null
  /** false = Facility/Reinigung — kein Bau-Stamm-Paket */
  ist_bauleistung?: boolean
}

export type Preisliste = {
  id: string
  gewerk_id: string
  /** Gruppierung im UI; leer = „Ohne Kategorie“ */
  kategorie?: string
  leistung: string
  einheit: string
  /** Netto-Einzelpreis (ehemals preis_min; preis_max entfernt) */
  preis_min: number
  aktiv: boolean
  gewerke?: Gewerk
}

export type KalenderTermin = {
  id: string
  lead_id: string | null
  auftrag_id: string | null
  titel: string
  beschreibung: string | null
  typ: 'besichtigung' | 'beginn' | 'abnahme' | 'sonstiges' | 'intern'
  datum: string
  uhrzeit_von: string | null
  uhrzeit_bis: string | null
  adresse: string | null
  zugewiesen_an?: string | null
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
  | 'abnahme'
  | 'checkliste'
  | 'sonstiges'
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
  created_at?: string
  updated_at?: string | null
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

export type HwFormularEinreichungStatus = 'offen' | 'ausgefuellt' | 'abgeschlossen'

export type HwFormularEinreichungRow = {
  id: string
  tab_id: string
  auftrag_id: string
  handwerker_id: string | null
  token: string
  felder_werte: Record<string, unknown>
  foto_urls: string[]
  status: HwFormularEinreichungStatus | string
  gesendet_at: string | null
  eingereicht_at: string | null
  created_at: string
}

export type HwFormularTabRow = {
  id: string
  auftrag_id: string
  handwerker_id: string | null
  name: string
  beschreibung: string | null
  felder: FormularFeld[]
  sort_order: number
  aktiv: boolean
  created_at: string
  hw_formular_einreichungen?: HwFormularEinreichungRow[] | null
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

export type RechnungBelegTyp = 'rechnung' | 'gutschrift'

export type MwstAufschluesselungJson = {
  satz: number
  netto: number
  mwst: number
}

export type Rechnung = {
  id: string
  angebot_id: string | null
  auftrag_id: string | null
  kunde_id: string
  rechnungsnummer: string
  beleg_typ?: RechnungBelegTyp
  bezug_rechnung_id?: string | null
  reverse_charge_13b?: boolean
  hinweis_35a?: boolean | null
  mwst_aufschluesselung?: MwstAufschluesselungJson[] | null
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
  einleitung?: string | null
  hinweise?: string | null
  zahlungsbedingungen?: string | null
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
  kunden?: Kunde | Pick<Kunde, 'id' | 'name' | 'email' | 'telefon' | 'adresse' | 'plz' | 'ort' | 'typ' | 'ust_id'> | null
  angebote?: Pick<Angebot, 'id' | 'gesamt_fix' | 'gesamt_min' | 'gesamt_max'> | null
  auftraege?: Pick<Auftrag, 'id' | 'titel'> | null
}

/** Nur Felder der Listen-Abfrage `/rechnungen` (kunden je nach Join ein Objekt oder Array) */
export type RechnungListeZeile = Pick<
  Rechnung,
  | 'id'
  | 'rechnungsnummer'
  | 'status'
  | 'brutto'
  | 'rechnungsdatum'
  | 'faellig_am'
  | 'bezahlt_at'
  | 'erinnerung_7_sent_at'
  | 'erinnerung_21_sent_at'
  | 'positionen'
  | 'lohn_netto'
  | 'material_netto'
  | 'netto'
  | 'mwst_satz'
> & {
  kunden?: { name: string; vorname?: string | null; nachname?: string | null; typ?: string | null } | { name: string; vorname?: string | null; nachname?: string | null; typ?: string | null }[] | null
  auftraege?: { titel: string } | { titel: string }[] | null
}
