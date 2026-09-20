/** Generated from Staging via Supabase MCP (P7-4). Do not edit by hand — regenerate against staging. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abnahmeprotokoll: {
        Row: {
          abgenommen_am: string | null
          auftrag_id: string
          created_at: string | null
          datum: string | null
          id: string
          kunde_unterschrift: boolean | null
          maengel: Json | null
          notizen: string | null
          punkte: Json | null
        }
        Insert: {
          abgenommen_am?: string | null
          auftrag_id: string
          created_at?: string | null
          datum?: string | null
          id?: string
          kunde_unterschrift?: boolean | null
          maengel?: Json | null
          notizen?: string | null
          punkte?: Json | null
        }
        Update: {
          abgenommen_am?: string | null
          auftrag_id?: string
          created_at?: string | null
          datum?: string | null
          id?: string
          kunde_unterschrift?: boolean | null
          maengel?: Json | null
          notizen?: string | null
          punkte?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "abnahmeprotokoll_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      akten_notizen: {
        Row: {
          bezug_typ: string
          created_at: string
          erledigt_am: string | null
          erstellt_von: string | null
          id: string
          kunde_id: string
          kunde_objekt_id: string | null
          lead_id: string | null
          text: string
          updated_at: string
          wiedervorlage_am: string | null
        }
        Insert: {
          bezug_typ: string
          created_at?: string
          erledigt_am?: string | null
          erstellt_von?: string | null
          id?: string
          kunde_id: string
          kunde_objekt_id?: string | null
          lead_id?: string | null
          text: string
          updated_at?: string
          wiedervorlage_am?: string | null
        }
        Update: {
          bezug_typ?: string
          created_at?: string
          erledigt_am?: string | null
          erstellt_von?: string | null
          id?: string
          kunde_id?: string
          kunde_objekt_id?: string | null
          lead_id?: string | null
          text?: string
          updated_at?: string
          wiedervorlage_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akten_notizen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akten_notizen_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akten_notizen_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      angebot_handwerker: {
        Row: {
          ablehnung_grund: string | null
          accepted_at: string | null
          angebot_id: string
          antwort_at: string | null
          antwort_notiz: string | null
          aufgabe_notiz: string | null
          bestaetigt_at: string | null
          created_at: string
          gesendet_at: string | null
          gewerk_id: string | null
          handwerker_id: string
          hw_angebot_anhang_urls: Json
          hw_angebot_pdf_url: string | null
          hw_crm_antwort_at: string | null
          hw_crm_notiz: string | null
          hw_eingereicht_at: string | null
          hw_konditionen: Json | null
          hw_notiz: string | null
          hw_preis_brutto: number | null
          hw_preis_netto: number | null
          hw_rechnung_betrag_brutto: number | null
          hw_rechnung_bezahlt_at: string | null
          hw_rechnung_eingereicht_at: string | null
          hw_rechnung_pdf_url: string | null
          hw_rechnung_reverse_charge_13b: boolean
          hw_rechnung_status: string | null
          hw_status: string | null
          id: string
          notizen: string | null
          ohne_lv: boolean
          status: string
          token: string
        }
        Insert: {
          ablehnung_grund?: string | null
          accepted_at?: string | null
          angebot_id: string
          antwort_at?: string | null
          antwort_notiz?: string | null
          aufgabe_notiz?: string | null
          bestaetigt_at?: string | null
          created_at?: string
          gesendet_at?: string | null
          gewerk_id?: string | null
          handwerker_id: string
          hw_angebot_anhang_urls?: Json
          hw_angebot_pdf_url?: string | null
          hw_crm_antwort_at?: string | null
          hw_crm_notiz?: string | null
          hw_eingereicht_at?: string | null
          hw_konditionen?: Json | null
          hw_notiz?: string | null
          hw_preis_brutto?: number | null
          hw_preis_netto?: number | null
          hw_rechnung_betrag_brutto?: number | null
          hw_rechnung_bezahlt_at?: string | null
          hw_rechnung_eingereicht_at?: string | null
          hw_rechnung_pdf_url?: string | null
          hw_rechnung_reverse_charge_13b?: boolean
          hw_rechnung_status?: string | null
          hw_status?: string | null
          id?: string
          notizen?: string | null
          ohne_lv?: boolean
          status?: string
          token?: string
        }
        Update: {
          ablehnung_grund?: string | null
          accepted_at?: string | null
          angebot_id?: string
          antwort_at?: string | null
          antwort_notiz?: string | null
          aufgabe_notiz?: string | null
          bestaetigt_at?: string | null
          created_at?: string
          gesendet_at?: string | null
          gewerk_id?: string | null
          handwerker_id?: string
          hw_angebot_anhang_urls?: Json
          hw_angebot_pdf_url?: string | null
          hw_crm_antwort_at?: string | null
          hw_crm_notiz?: string | null
          hw_eingereicht_at?: string | null
          hw_konditionen?: Json | null
          hw_notiz?: string | null
          hw_preis_brutto?: number | null
          hw_preis_netto?: number | null
          hw_rechnung_betrag_brutto?: number | null
          hw_rechnung_bezahlt_at?: string | null
          hw_rechnung_eingereicht_at?: string | null
          hw_rechnung_pdf_url?: string | null
          hw_rechnung_reverse_charge_13b?: boolean
          hw_rechnung_status?: string | null
          hw_status?: string | null
          id?: string
          notizen?: string | null
          ohne_lv?: boolean
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "angebot_handwerker_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebot_handwerker_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebot_handwerker_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebot_handwerker_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      angebot_ki_beispiele: {
        Row: {
          akzeptiert: boolean
          created_at: string
          ergebnis: Json
          gewerk_slug: string | null
          id: string
          kontext: Json
          prompt: string
          scope: string
          user_id: string | null
        }
        Insert: {
          akzeptiert?: boolean
          created_at?: string
          ergebnis?: Json
          gewerk_slug?: string | null
          id?: string
          kontext?: Json
          prompt: string
          scope: string
          user_id?: string | null
        }
        Update: {
          akzeptiert?: boolean
          created_at?: string
          ergebnis?: Json
          gewerk_slug?: string | null
          id?: string
          kontext?: Json
          prompt?: string
          scope?: string
          user_id?: string | null
        }
        Relationships: []
      }
      angebot_vorlagen: {
        Row: {
          aktiv: boolean | null
          beschreibung: string | null
          created_at: string | null
          erstellt_von: string | null
          gesamt_fix: number | null
          gesamt_max: number | null
          gesamt_min: number | null
          id: string
          name: string
          positionen: Json
          updated_at: string | null
        }
        Insert: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          gesamt_fix?: number | null
          gesamt_max?: number | null
          gesamt_min?: number | null
          id?: string
          name: string
          positionen?: Json
          updated_at?: string | null
        }
        Update: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          gesamt_fix?: number | null
          gesamt_max?: number | null
          gesamt_min?: number | null
          id?: string
          name?: string
          positionen?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      angebote: {
        Row: {
          ablehnung_grund: string | null
          ablehnung_konkurrenz_preis: number | null
          ablehnung_notiz: string | null
          akzeptiert_at: string | null
          angebotsnr: string | null
          ansprechpartner_id: string | null
          created_at: string
          dokument_typ: string | null
          einleitung: string | null
          ersetzt_durch: string | null
          erstellt_von: string | null
          fotos_urls: Json | null
          gesamt_fix: number | null
          gesamt_max: number | null
          gesamt_min: number | null
          gesendet_am: string | null
          gesendet_handwerker_at: string | null
          gesendet_kunde_at: string | null
          gueltig_bis: string | null
          herkunft: string | null
          hinweise: string | null
          id: string
          ist_partner_einholung: boolean
          ist_wiederkehrend: boolean
          korrektur_art: string | null
          korrektur_von: string | null
          kunde_id: string | null
          kunde_objekt_id: string | null
          lead_id: string | null
          leistungsumfang: string | null
          lohn_netto: number | null
          material_netto: number | null
          nachgefasst_am: string | null
          notizen: string | null
          objekt_anlage_id: string | null
          org_freigabe_berechnet_at: string | null
          org_freigabe_erforderlich: boolean
          pdf_generiert_at: string | null
          pdf_url: string | null
          positionen: Json
          positionen_portal: Json | null
          preis_typ: string | null
          projektbeschreibung: string | null
          status: Database["public"]["Enums"]["angebot_status"]
          status_einfach: string | null
          updated_at: string
          varianten: Json | null
          verlaengert_am: string | null
          visualisierung_ids: string[] | null
          vorlage_id: string | null
          wichtige_hinweise: string | null
          wiederkehr_turnus: string | null
          wiedervorlage_datum: string | null
          wiedervorlage_notiz: string | null
          zahlungsbedingungen: string | null
          zahlungsplan: Json | null
        }
        Insert: {
          ablehnung_grund?: string | null
          ablehnung_konkurrenz_preis?: number | null
          ablehnung_notiz?: string | null
          akzeptiert_at?: string | null
          angebotsnr?: string | null
          ansprechpartner_id?: string | null
          created_at?: string
          dokument_typ?: string | null
          einleitung?: string | null
          ersetzt_durch?: string | null
          erstellt_von?: string | null
          fotos_urls?: Json | null
          gesamt_fix?: number | null
          gesamt_max?: number | null
          gesamt_min?: number | null
          gesendet_am?: string | null
          gesendet_handwerker_at?: string | null
          gesendet_kunde_at?: string | null
          gueltig_bis?: string | null
          herkunft?: string | null
          hinweise?: string | null
          id?: string
          ist_partner_einholung?: boolean
          ist_wiederkehrend?: boolean
          korrektur_art?: string | null
          korrektur_von?: string | null
          kunde_id?: string | null
          kunde_objekt_id?: string | null
          lead_id?: string | null
          leistungsumfang?: string | null
          lohn_netto?: number | null
          material_netto?: number | null
          nachgefasst_am?: string | null
          notizen?: string | null
          objekt_anlage_id?: string | null
          org_freigabe_berechnet_at?: string | null
          org_freigabe_erforderlich?: boolean
          pdf_generiert_at?: string | null
          pdf_url?: string | null
          positionen?: Json
          positionen_portal?: Json | null
          preis_typ?: string | null
          projektbeschreibung?: string | null
          status?: Database["public"]["Enums"]["angebot_status"]
          status_einfach?: string | null
          updated_at?: string
          varianten?: Json | null
          verlaengert_am?: string | null
          visualisierung_ids?: string[] | null
          vorlage_id?: string | null
          wichtige_hinweise?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zahlungsbedingungen?: string | null
          zahlungsplan?: Json | null
        }
        Update: {
          ablehnung_grund?: string | null
          ablehnung_konkurrenz_preis?: number | null
          ablehnung_notiz?: string | null
          akzeptiert_at?: string | null
          angebotsnr?: string | null
          ansprechpartner_id?: string | null
          created_at?: string
          dokument_typ?: string | null
          einleitung?: string | null
          ersetzt_durch?: string | null
          erstellt_von?: string | null
          fotos_urls?: Json | null
          gesamt_fix?: number | null
          gesamt_max?: number | null
          gesamt_min?: number | null
          gesendet_am?: string | null
          gesendet_handwerker_at?: string | null
          gesendet_kunde_at?: string | null
          gueltig_bis?: string | null
          herkunft?: string | null
          hinweise?: string | null
          id?: string
          ist_partner_einholung?: boolean
          ist_wiederkehrend?: boolean
          korrektur_art?: string | null
          korrektur_von?: string | null
          kunde_id?: string | null
          kunde_objekt_id?: string | null
          lead_id?: string | null
          leistungsumfang?: string | null
          lohn_netto?: number | null
          material_netto?: number | null
          nachgefasst_am?: string | null
          notizen?: string | null
          objekt_anlage_id?: string | null
          org_freigabe_berechnet_at?: string | null
          org_freigabe_erforderlich?: boolean
          pdf_generiert_at?: string | null
          pdf_url?: string | null
          positionen?: Json
          positionen_portal?: Json | null
          preis_typ?: string | null
          projektbeschreibung?: string | null
          status?: Database["public"]["Enums"]["angebot_status"]
          status_einfach?: string | null
          updated_at?: string
          varianten?: Json | null
          verlaengert_am?: string | null
          visualisierung_ids?: string[] | null
          vorlage_id?: string | null
          wichtige_hinweise?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zahlungsbedingungen?: string | null
          zahlungsplan?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "angebote_ansprechpartner_id_fkey"
            columns: ["ansprechpartner_id"]
            isOneToOne: false
            referencedRelation: "kunden_ansprechpartner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_ersetzt_durch_fkey"
            columns: ["ersetzt_durch"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_korrektur_von_fkey"
            columns: ["korrektur_von"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_objekt_anlage_id_fkey"
            columns: ["objekt_anlage_id"]
            isOneToOne: false
            referencedRelation: "objekt_anlagen"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_id: string | null
          actor_rolle: string | null
          aktion: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          kunde_id: string | null
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          actor_rolle?: string | null
          aktion: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kunde_id?: string | null
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          actor_rolle?: string | null
          aktion?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kunde_id?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      auftraege: {
        Row: {
          abnahme_datum: string | null
          abnahme_protokoll_gesendet_at: string | null
          abnahme_protokoll_url: string | null
          abschlussdokumentation_gesendet_at: string | null
          abschlussdokumentation_url: string | null
          angebot_id: string | null
          bau_mannschaft: Json
          bau_nachunternehmer_firma: string | null
          bau_nachunternehmer_name: string | null
          bauleiter_email: string | null
          bauleiter_name: string | null
          bauleiter_telefon: string | null
          bautagebuch_hidden_position_ids: string[]
          betreuer_id: string | null
          created_at: string
          end_datum: string | null
          erstellt_von: string | null
          fortschritt: number | null
          handwerker_bestaetigt_at: string | null
          hw_abschluss_signiert_am: string | null
          id: string
          ist_bauprojekt: boolean
          ist_notfall: boolean
          ist_wiederkehrend: boolean
          kostentraeger: string | null
          kunde_id: string | null
          kunden_seite_aufrufe: number | null
          kunden_seite_letzter_aufruf: string | null
          kunden_token: string | null
          lead_id: string | null
          letzte_aktivitaet: string | null
          naechster_schritt: string | null
          notfall_verguetung: string | null
          notizen: string | null
          start_datum: string | null
          status: Database["public"]["Enums"]["auftrag_status"]
          titel: string | null
          updated_at: string
          versicherungs_nr: string | null
          versicherungsakte_pdf_url: string | null
          wiederkehr_turnus: string | null
          wiedervorlage_datum: string | null
          wiedervorlage_notiz: string | null
          zahlungsplan: Json | null
        }
        Insert: {
          abnahme_datum?: string | null
          abnahme_protokoll_gesendet_at?: string | null
          abnahme_protokoll_url?: string | null
          abschlussdokumentation_gesendet_at?: string | null
          abschlussdokumentation_url?: string | null
          angebot_id?: string | null
          bau_mannschaft?: Json
          bau_nachunternehmer_firma?: string | null
          bau_nachunternehmer_name?: string | null
          bauleiter_email?: string | null
          bauleiter_name?: string | null
          bauleiter_telefon?: string | null
          bautagebuch_hidden_position_ids?: string[]
          betreuer_id?: string | null
          created_at?: string
          end_datum?: string | null
          erstellt_von?: string | null
          fortschritt?: number | null
          handwerker_bestaetigt_at?: string | null
          hw_abschluss_signiert_am?: string | null
          id?: string
          ist_bauprojekt?: boolean
          ist_notfall?: boolean
          ist_wiederkehrend?: boolean
          kostentraeger?: string | null
          kunde_id?: string | null
          kunden_seite_aufrufe?: number | null
          kunden_seite_letzter_aufruf?: string | null
          kunden_token?: string | null
          lead_id?: string | null
          letzte_aktivitaet?: string | null
          naechster_schritt?: string | null
          notfall_verguetung?: string | null
          notizen?: string | null
          start_datum?: string | null
          status?: Database["public"]["Enums"]["auftrag_status"]
          titel?: string | null
          updated_at?: string
          versicherungs_nr?: string | null
          versicherungsakte_pdf_url?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zahlungsplan?: Json | null
        }
        Update: {
          abnahme_datum?: string | null
          abnahme_protokoll_gesendet_at?: string | null
          abnahme_protokoll_url?: string | null
          abschlussdokumentation_gesendet_at?: string | null
          abschlussdokumentation_url?: string | null
          angebot_id?: string | null
          bau_mannschaft?: Json
          bau_nachunternehmer_firma?: string | null
          bau_nachunternehmer_name?: string | null
          bauleiter_email?: string | null
          bauleiter_name?: string | null
          bauleiter_telefon?: string | null
          bautagebuch_hidden_position_ids?: string[]
          betreuer_id?: string | null
          created_at?: string
          end_datum?: string | null
          erstellt_von?: string | null
          fortschritt?: number | null
          handwerker_bestaetigt_at?: string | null
          hw_abschluss_signiert_am?: string | null
          id?: string
          ist_bauprojekt?: boolean
          ist_notfall?: boolean
          ist_wiederkehrend?: boolean
          kostentraeger?: string | null
          kunde_id?: string | null
          kunden_seite_aufrufe?: number | null
          kunden_seite_letzter_aufruf?: string | null
          kunden_token?: string | null
          lead_id?: string | null
          letzte_aktivitaet?: string | null
          naechster_schritt?: string | null
          notfall_verguetung?: string | null
          notizen?: string | null
          start_datum?: string | null
          status?: Database["public"]["Enums"]["auftrag_status"]
          titel?: string | null
          updated_at?: string
          versicherungs_nr?: string | null
          versicherungsakte_pdf_url?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zahlungsplan?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auftraege_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftraege_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftraege_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_abnahmeprotokolle: {
        Row: {
          abgelehnt_at: string | null
          abgelehnt_von: string | null
          ablehnung_notiz: string | null
          abnahme_datum: string
          an_kunde_gesendet_at: string | null
          auftrag_id: string
          created_at: string
          ebene: string
          freigabe_status: string
          freigegeben_at: string | null
          freigegeben_von: string | null
          handwerker_id: string | null
          id: string
          maengel: Json
          meta: Json
          notizen: string | null
          pdf_url: string | null
          protokoll_typ: string
          punkte: Json
          updated_at: string
        }
        Insert: {
          abgelehnt_at?: string | null
          abgelehnt_von?: string | null
          ablehnung_notiz?: string | null
          abnahme_datum: string
          an_kunde_gesendet_at?: string | null
          auftrag_id: string
          created_at?: string
          ebene?: string
          freigabe_status?: string
          freigegeben_at?: string | null
          freigegeben_von?: string | null
          handwerker_id?: string | null
          id?: string
          maengel?: Json
          meta?: Json
          notizen?: string | null
          pdf_url?: string | null
          protokoll_typ?: string
          punkte?: Json
          updated_at?: string
        }
        Update: {
          abgelehnt_at?: string | null
          abgelehnt_von?: string | null
          ablehnung_notiz?: string | null
          abnahme_datum?: string
          an_kunde_gesendet_at?: string | null
          auftrag_id?: string
          created_at?: string
          ebene?: string
          freigabe_status?: string
          freigegeben_at?: string | null
          freigegeben_von?: string | null
          handwerker_id?: string | null
          id?: string
          maengel?: Json
          meta?: Json
          notizen?: string | null
          pdf_url?: string | null
          protokoll_typ?: string
          punkte?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_abnahmeprotokolle_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_abnahmeprotokolle_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_abnahmeprotokolle_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_baustellen_dokumente: {
        Row: {
          auftrag_id: string
          created_at: string
          datei_url: string
          id: string
          jahr: number | null
          kalenderwoche: number | null
          quelle: string
          referenz_id: string | null
          titel: string
          typ: string
          wochen_nummer: number | null
        }
        Insert: {
          auftrag_id: string
          created_at?: string
          datei_url: string
          id?: string
          jahr?: number | null
          kalenderwoche?: number | null
          quelle?: string
          referenz_id?: string | null
          titel: string
          typ: string
          wochen_nummer?: number | null
        }
        Update: {
          auftrag_id?: string
          created_at?: string
          datei_url?: string
          id?: string
          jahr?: number | null
          kalenderwoche?: number | null
          quelle?: string
          referenz_id?: string | null
          titel?: string
          typ?: string
          wochen_nummer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_baustellen_dokumente_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_bautagebuch_eintraege: {
        Row: {
          an_kunde_gesendet_at: string | null
          auftrag_id: string
          beschreibung: string | null
          created_at: string
          datum: string
          eintrag_typ: string
          foto_urls: Json
          freigegeben_at: string | null
          fuer_kunde_freigegeben: boolean
          gewerk_id: string | null
          gewerk_phase_key: string | null
          handwerker_id: string | null
          id: string
          sort_order: number
          timeline_id: string | null
          titel: string
          updated_at: string
        }
        Insert: {
          an_kunde_gesendet_at?: string | null
          auftrag_id: string
          beschreibung?: string | null
          created_at?: string
          datum?: string
          eintrag_typ?: string
          foto_urls?: Json
          freigegeben_at?: string | null
          fuer_kunde_freigegeben?: boolean
          gewerk_id?: string | null
          gewerk_phase_key?: string | null
          handwerker_id?: string | null
          id?: string
          sort_order?: number
          timeline_id?: string | null
          titel: string
          updated_at?: string
        }
        Update: {
          an_kunde_gesendet_at?: string | null
          auftrag_id?: string
          beschreibung?: string | null
          created_at?: string
          datum?: string
          eintrag_typ?: string
          foto_urls?: Json
          freigegeben_at?: string | null
          fuer_kunde_freigegeben?: boolean
          gewerk_id?: string | null
          gewerk_phase_key?: string | null
          handwerker_id?: string | null
          id?: string
          sort_order?: number
          timeline_id?: string | null
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_bautagebuch_eintraege_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_bautagebuch_eintraege_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_bautagebuch_eintraege_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_bautagebuch_eintraege_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_bautagebuch_eintraege_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "auftrag_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_bautagesberichte: {
        Row: {
          arbeitszeit_bis: string | null
          arbeitszeit_von: string | null
          auftrag_id: string
          auftraggeber_adresse: string | null
          auftraggeber_name: string | null
          behinderungen: string | null
          created_at: string
          datum: string
          fotos: Json
          handwerker_id: string | null
          id: string
          leistungen: Json
          nachunternehmer_firma: string | null
          nachunternehmer_name: string | null
          pdf_url: string | null
          personal_namen: Json
          qualitaetssicherung: string | null
          risiken: Json
          sort_order: number
          tag_nummer: number
          updated_at: string
          wetter: string | null
          zusammenfassung: string | null
        }
        Insert: {
          arbeitszeit_bis?: string | null
          arbeitszeit_von?: string | null
          auftrag_id: string
          auftraggeber_adresse?: string | null
          auftraggeber_name?: string | null
          behinderungen?: string | null
          created_at?: string
          datum?: string
          fotos?: Json
          handwerker_id?: string | null
          id?: string
          leistungen?: Json
          nachunternehmer_firma?: string | null
          nachunternehmer_name?: string | null
          pdf_url?: string | null
          personal_namen?: Json
          qualitaetssicherung?: string | null
          risiken?: Json
          sort_order?: number
          tag_nummer?: number
          updated_at?: string
          wetter?: string | null
          zusammenfassung?: string | null
        }
        Update: {
          arbeitszeit_bis?: string | null
          arbeitszeit_von?: string | null
          auftrag_id?: string
          auftraggeber_adresse?: string | null
          auftraggeber_name?: string | null
          behinderungen?: string | null
          created_at?: string
          datum?: string
          fotos?: Json
          handwerker_id?: string | null
          id?: string
          leistungen?: Json
          nachunternehmer_firma?: string | null
          nachunternehmer_name?: string | null
          pdf_url?: string | null
          personal_namen?: Json
          qualitaetssicherung?: string | null
          risiken?: Json
          sort_order?: number
          tag_nummer?: number
          updated_at?: string
          wetter?: string | null
          zusammenfassung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_bautagesberichte_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_bautagesberichte_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_bautagesberichte_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_fachdoku_slots: {
        Row: {
          auftrag_id: string
          created_at: string
          datei_name: string | null
          datei_url: string | null
          erledigt_am: string | null
          id: string
          label: string
          slot_code: string
          status: string
          updated_at: string
          uploaded_by_handwerker_id: string | null
          uploaded_by_role: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          auftrag_id: string
          created_at?: string
          datei_name?: string | null
          datei_url?: string | null
          erledigt_am?: string | null
          id?: string
          label: string
          slot_code: string
          status?: string
          updated_at?: string
          uploaded_by_handwerker_id?: string | null
          uploaded_by_role?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          auftrag_id?: string
          created_at?: string
          datei_name?: string | null
          datei_url?: string | null
          erledigt_am?: string | null
          id?: string
          label?: string
          slot_code?: string
          status?: string
          updated_at?: string
          uploaded_by_handwerker_id?: string | null
          uploaded_by_role?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_fachdoku_slots_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_fachdoku_slots_uploaded_by_handwerker_id_fkey"
            columns: ["uploaded_by_handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_fachdoku_slots_uploaded_by_handwerker_id_fkey"
            columns: ["uploaded_by_handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_handwerker: {
        Row: {
          abnahme_protokoll_id: string | null
          abnahme_signiert_am: string | null
          absprachen: string | null
          auftrag_id: string
          created_at: string
          erledigt_gemeldet_am: string | null
          gewerk_id: string | null
          handwerker_id: string
          id: string
          notizen: string | null
          projektvertrag_bestaetigt_am: string | null
          status: string
          vereinbarter_preis: number | null
        }
        Insert: {
          abnahme_protokoll_id?: string | null
          abnahme_signiert_am?: string | null
          absprachen?: string | null
          auftrag_id: string
          created_at?: string
          erledigt_gemeldet_am?: string | null
          gewerk_id?: string | null
          handwerker_id: string
          id?: string
          notizen?: string | null
          projektvertrag_bestaetigt_am?: string | null
          status?: string
          vereinbarter_preis?: number | null
        }
        Update: {
          abnahme_protokoll_id?: string | null
          abnahme_signiert_am?: string | null
          absprachen?: string | null
          auftrag_id?: string
          created_at?: string
          erledigt_gemeldet_am?: string | null
          gewerk_id?: string | null
          handwerker_id?: string
          id?: string
          notizen?: string | null
          projektvertrag_bestaetigt_am?: string | null
          status?: string
          vereinbarter_preis?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_handwerker_abnahme_protokoll_id_fkey"
            columns: ["abnahme_protokoll_id"]
            isOneToOne: false
            referencedRelation: "auftrag_abnahmeprotokolle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_handwerker_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_handwerker_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_handwerker_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_handwerker_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_milestones: {
        Row: {
          auftrag_id: string
          beschreibung: string | null
          created_at: string | null
          datum: string | null
          erledigt: boolean | null
          erledigt_at: string | null
          fuer_kunden_sichtbar: boolean | null
          id: string
          ist_system: boolean | null
          sort_order: number | null
          titel: string
        }
        Insert: {
          auftrag_id: string
          beschreibung?: string | null
          created_at?: string | null
          datum?: string | null
          erledigt?: boolean | null
          erledigt_at?: string | null
          fuer_kunden_sichtbar?: boolean | null
          id?: string
          ist_system?: boolean | null
          sort_order?: number | null
          titel: string
        }
        Update: {
          auftrag_id?: string
          beschreibung?: string | null
          created_at?: string | null
          datum?: string | null
          erledigt?: boolean | null
          erledigt_at?: string | null
          fuer_kunden_sichtbar?: boolean | null
          id?: string
          ist_system?: boolean | null
          sort_order?: number | null
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_milestones_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_position_notizen: {
        Row: {
          created_at: string | null
          datum: string
          id: string
          position_id: string
          sort_order: number | null
          text: string
        }
        Insert: {
          created_at?: string | null
          datum?: string
          id?: string
          position_id: string
          sort_order?: number | null
          text: string
        }
        Update: {
          created_at?: string | null
          datum?: string
          id?: string
          position_id?: string
          sort_order?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_position_notizen_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "auftrag_positionen"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_positionen: {
        Row: {
          absprachen: string | null
          aenderung_typ: string | null
          anerkennung_status: string | null
          auftrag_id: string
          beschreibung: string | null
          created_at: string | null
          einheit: string | null
          einkauf_preis: number | null
          end_datum: string | null
          erledigt_am: string | null
          fuer_kunde_sichtbar: boolean | null
          geschaetzt_std: number | null
          gestartet_am: string | null
          gewerk_block_key: string | null
          gewerk_name: string
          gewerk_slug: string | null
          handwerker_angefragt_at: string | null
          handwerker_id: string | null
          handwerker_status: string | null
          id: string
          leistung_name: string
          leistung_status: string | null
          lohn_fix: number | null
          material_fix: number | null
          menge: number | null
          notizen_intern: string | null
          oberkategorie: string | null
          preis_alt: number | null
          preis_fix: number | null
          preis_partner: number | null
          projekt_phase: string | null
          sort_order: number | null
          start_datum: string | null
          stundensatz: number | null
          typ: string | null
          unterkategorie: string | null
          verguetung: string | null
        }
        Insert: {
          absprachen?: string | null
          aenderung_typ?: string | null
          anerkennung_status?: string | null
          auftrag_id: string
          beschreibung?: string | null
          created_at?: string | null
          einheit?: string | null
          einkauf_preis?: number | null
          end_datum?: string | null
          erledigt_am?: string | null
          fuer_kunde_sichtbar?: boolean | null
          geschaetzt_std?: number | null
          gestartet_am?: string | null
          gewerk_block_key?: string | null
          gewerk_name: string
          gewerk_slug?: string | null
          handwerker_angefragt_at?: string | null
          handwerker_id?: string | null
          handwerker_status?: string | null
          id?: string
          leistung_name: string
          leistung_status?: string | null
          lohn_fix?: number | null
          material_fix?: number | null
          menge?: number | null
          notizen_intern?: string | null
          oberkategorie?: string | null
          preis_alt?: number | null
          preis_fix?: number | null
          preis_partner?: number | null
          projekt_phase?: string | null
          sort_order?: number | null
          start_datum?: string | null
          stundensatz?: number | null
          typ?: string | null
          unterkategorie?: string | null
          verguetung?: string | null
        }
        Update: {
          absprachen?: string | null
          aenderung_typ?: string | null
          anerkennung_status?: string | null
          auftrag_id?: string
          beschreibung?: string | null
          created_at?: string | null
          einheit?: string | null
          einkauf_preis?: number | null
          end_datum?: string | null
          erledigt_am?: string | null
          fuer_kunde_sichtbar?: boolean | null
          geschaetzt_std?: number | null
          gestartet_am?: string | null
          gewerk_block_key?: string | null
          gewerk_name?: string
          gewerk_slug?: string | null
          handwerker_angefragt_at?: string | null
          handwerker_id?: string | null
          handwerker_status?: string | null
          id?: string
          leistung_name?: string
          leistung_status?: string | null
          lohn_fix?: number | null
          material_fix?: number | null
          menge?: number | null
          notizen_intern?: string | null
          oberkategorie?: string | null
          preis_alt?: number | null
          preis_fix?: number | null
          preis_partner?: number | null
          projekt_phase?: string | null
          sort_order?: number | null
          start_datum?: string | null
          stundensatz?: number | null
          typ?: string | null
          unterkategorie?: string | null
          verguetung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_positionen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_positionen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_positionen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_regiearbeiten: {
        Row: {
          auftrag_id: string
          beschreibung: string | null
          bezeichnung: string
          created_at: string
          datum: string
          id: string
          material: string | null
          personen_anzahl: number
          sort_order: number
          stunden: number
          updated_at: string
        }
        Insert: {
          auftrag_id: string
          beschreibung?: string | null
          bezeichnung: string
          created_at?: string
          datum?: string
          id?: string
          material?: string | null
          personen_anzahl?: number
          sort_order?: number
          stunden?: number
          updated_at?: string
        }
        Update: {
          auftrag_id?: string
          beschreibung?: string | null
          bezeichnung?: string
          created_at?: string
          datum?: string
          id?: string
          material?: string | null
          personen_anzahl?: number
          sort_order?: number
          stunden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_regiearbeiten_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_rueckfragen: {
        Row: {
          antwort_am: string | null
          antwort_text: string | null
          auftrag_id: string
          created_at: string
          foto_urls: Json
          handwerker_id: string
          id: string
          status: string
          text: string
        }
        Insert: {
          antwort_am?: string | null
          antwort_text?: string | null
          auftrag_id: string
          created_at?: string
          foto_urls?: Json
          handwerker_id: string
          id?: string
          status?: string
          text: string
        }
        Update: {
          antwort_am?: string | null
          antwort_text?: string | null
          auftrag_id?: string
          created_at?: string
          foto_urls?: Json
          handwerker_id?: string
          id?: string
          status?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_rueckfragen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_rueckfragen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_rueckfragen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_terminslots: {
        Row: {
          abgesagt_am: string | null
          absage_grund: string | null
          auftrag_id: string
          bestaetigt_am: string | null
          created_at: string
          id: string
          lead_id: string | null
          slot_beginn: string
          slot_ende: string | null
          status: string
        }
        Insert: {
          abgesagt_am?: string | null
          absage_grund?: string | null
          auftrag_id: string
          bestaetigt_am?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          slot_beginn: string
          slot_ende?: string | null
          status?: string
        }
        Update: {
          abgesagt_am?: string | null
          absage_grund?: string | null
          auftrag_id?: string
          bestaetigt_am?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          slot_beginn?: string
          slot_ende?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_terminslots_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_terminslots_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_timeline: {
        Row: {
          auftrag_id: string
          beschreibung: string | null
          created_at: string
          email_log_id: string | null
          erstellt_von: string | null
          foto_urls: string[] | null
          freigegeben_at: string | null
          fuer_kunde_freigegeben: boolean
          handwerker_id: string | null
          id: string
          sichtbar_fuer_kunde: boolean
          titel: string
          typ: string
        }
        Insert: {
          auftrag_id: string
          beschreibung?: string | null
          created_at?: string
          email_log_id?: string | null
          erstellt_von?: string | null
          foto_urls?: string[] | null
          freigegeben_at?: string | null
          fuer_kunde_freigegeben?: boolean
          handwerker_id?: string | null
          id?: string
          sichtbar_fuer_kunde?: boolean
          titel: string
          typ: string
        }
        Update: {
          auftrag_id?: string
          beschreibung?: string | null
          created_at?: string
          email_log_id?: string | null
          erstellt_von?: string | null
          foto_urls?: string[] | null
          freigegeben_at?: string | null
          fuer_kunde_freigegeben?: boolean
          handwerker_id?: string | null
          id?: string
          sichtbar_fuer_kunde?: boolean
          titel?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_timeline_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_timeline_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_timeline_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_timeline_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_wochenberichte: {
        Row: {
          auftrag_id: string
          ausblick: string | null
          bis_datum: string
          created_at: string
          fazit: string | null
          id: string
          jahr: number
          kalenderwoche: number
          pdf_url: string | null
          updated_at: string
          von_datum: string
          wochen_nummer: number
        }
        Insert: {
          auftrag_id: string
          ausblick?: string | null
          bis_datum: string
          created_at?: string
          fazit?: string | null
          id?: string
          jahr: number
          kalenderwoche: number
          pdf_url?: string | null
          updated_at?: string
          von_datum: string
          wochen_nummer?: number
        }
        Update: {
          auftrag_id?: string
          ausblick?: string | null
          bis_datum?: string
          created_at?: string
          fazit?: string | null
          id?: string
          jahr?: number
          kalenderwoche?: number
          pdf_url?: string | null
          updated_at?: string
          von_datum?: string
          wochen_nummer?: number
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_wochenberichte_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_zahlungsplaene: {
        Row: {
          auftrag_id: string
          created_at: string
          gesamt_netto: number | null
          id: string
          titel: string | null
          updated_at: string
        }
        Insert: {
          auftrag_id: string
          created_at?: string
          gesamt_netto?: number | null
          id?: string
          titel?: string | null
          updated_at?: string
        }
        Update: {
          auftrag_id?: string
          created_at?: string
          gesamt_netto?: number | null
          id?: string
          titel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_zahlungsplaene_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      auftrag_zahlungsplan_positionen: {
        Row: {
          betrag_netto: number | null
          bezeichnung: string
          created_at: string
          faellig_am: string | null
          id: string
          prozent: number | null
          rechnung_id: string | null
          sort_order: number
          zahlungsplan_id: string
        }
        Insert: {
          betrag_netto?: number | null
          bezeichnung: string
          created_at?: string
          faellig_am?: string | null
          id?: string
          prozent?: number | null
          rechnung_id?: string | null
          sort_order?: number
          zahlungsplan_id: string
        }
        Update: {
          betrag_netto?: number | null
          bezeichnung?: string
          created_at?: string
          faellig_am?: string | null
          id?: string
          prozent?: number | null
          rechnung_id?: string | null
          sort_order?: number
          zahlungsplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_zahlungsplan_positionen_rechnung_id_fkey"
            columns: ["rechnung_id"]
            isOneToOne: false
            referencedRelation: "rechnungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auftrag_zahlungsplan_positionen_zahlungsplan_id_fkey"
            columns: ["zahlungsplan_id"]
            isOneToOne: false
            referencedRelation: "auftrag_zahlungsplaene"
            referencedColumns: ["id"]
          },
        ]
      }
      baustopps: {
        Row: {
          altes_enddatum: string | null
          auftrag_id: string
          beginn_datum: string
          created_at: string | null
          ende_datum: string | null
          erstellt_von: string | null
          grund: string
          id: string
          kunde_informiert: boolean | null
          neues_enddatum: string | null
          typ: string
          verzoegerung_tage: number | null
        }
        Insert: {
          altes_enddatum?: string | null
          auftrag_id: string
          beginn_datum: string
          created_at?: string | null
          ende_datum?: string | null
          erstellt_von?: string | null
          grund: string
          id?: string
          kunde_informiert?: boolean | null
          neues_enddatum?: string | null
          typ?: string
          verzoegerung_tage?: number | null
        }
        Update: {
          altes_enddatum?: string | null
          auftrag_id?: string
          beginn_datum?: string
          created_at?: string | null
          ende_datum?: string | null
          erstellt_von?: string | null
          grund?: string
          id?: string
          kunde_informiert?: boolean | null
          neues_enddatum?: string | null
          typ?: string
          verzoegerung_tage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "baustopps_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      bautagebuch: {
        Row: {
          auftrag_id: string
          created_at: string | null
          datum: string
          erstellt_von: string | null
          fotos_urls: string[] | null
          fuer_kunde_sichtbar: boolean | null
          gesendet_am: string | null
          id: string
          notizen: string | null
          titel: string
        }
        Insert: {
          auftrag_id: string
          created_at?: string | null
          datum?: string
          erstellt_von?: string | null
          fotos_urls?: string[] | null
          fuer_kunde_sichtbar?: boolean | null
          gesendet_am?: string | null
          id?: string
          notizen?: string | null
          titel: string
        }
        Update: {
          auftrag_id?: string
          created_at?: string | null
          datum?: string
          erstellt_von?: string | null
          fotos_urls?: string[] | null
          fuer_kunde_sichtbar?: boolean | null
          gesendet_am?: string | null
          id?: string
          notizen?: string | null
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "bautagebuch_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      buergschaften: {
        Row: {
          bank: string | null
          betrag: number
          created_at: string | null
          dokument_url: string | null
          einbehalt_id: string
          gueltig_bis: string
          handwerker_id: string
          id: string
          urkunden_nummer: string
        }
        Insert: {
          bank?: string | null
          betrag: number
          created_at?: string | null
          dokument_url?: string | null
          einbehalt_id: string
          gueltig_bis: string
          handwerker_id: string
          id?: string
          urkunden_nummer: string
        }
        Update: {
          bank?: string | null
          betrag?: number
          created_at?: string | null
          dokument_url?: string | null
          einbehalt_id?: string
          gueltig_bis?: string
          handwerker_id?: string
          id?: string
          urkunden_nummer?: string
        }
        Relationships: [
          {
            foreignKeyName: "buergschaften_einbehalt_id_fkey"
            columns: ["einbehalt_id"]
            isOneToOne: false
            referencedRelation: "einbehalte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buergschaften_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buergschaften_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_dokument_typen: {
        Row: {
          aktiv: boolean
          beschreibung: string | null
          bezeichnung: string
          compliance_ebene: string
          erneuerung_monate: number | null
          gewerk_slugs: string[] | null
          id: string
          kategorie: string | null
          mehrfach_erlaubt: boolean
          nur_bei_bauleistung: boolean
          pflicht_bauprojekt: boolean
          pflicht_fuer_fachbetriebe: boolean | null
          scope: string
          slug: string
          sort_order: number | null
          vertrag_referenz: string | null
        }
        Insert: {
          aktiv?: boolean
          beschreibung?: string | null
          bezeichnung: string
          compliance_ebene?: string
          erneuerung_monate?: number | null
          gewerk_slugs?: string[] | null
          id?: string
          kategorie?: string | null
          mehrfach_erlaubt?: boolean
          nur_bei_bauleistung?: boolean
          pflicht_bauprojekt?: boolean
          pflicht_fuer_fachbetriebe?: boolean | null
          scope?: string
          slug: string
          sort_order?: number | null
          vertrag_referenz?: string | null
        }
        Update: {
          aktiv?: boolean
          beschreibung?: string | null
          bezeichnung?: string
          compliance_ebene?: string
          erneuerung_monate?: number | null
          gewerk_slugs?: string[] | null
          id?: string
          kategorie?: string | null
          mehrfach_erlaubt?: boolean
          nur_bei_bauleistung?: boolean
          pflicht_bauprojekt?: boolean
          pflicht_fuer_fachbetriebe?: boolean | null
          scope?: string
          slug?: string
          sort_order?: number | null
          vertrag_referenz?: string | null
        }
        Relationships: []
      }
      copilot_alerts: {
        Row: {
          alert_type: string
          entity_id: string
          entity_type: string
          id: string
          sent_at: string
        }
        Insert: {
          alert_type: string
          entity_id: string
          entity_type: string
          id?: string
          sent_at?: string
        }
        Update: {
          alert_type?: string
          entity_id?: string
          entity_type?: string
          id?: string
          sent_at?: string
        }
        Relationships: []
      }
      copilot_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      crm_impersonation_tokens: {
        Row: {
          admin_email: string
          admin_id: string
          created_at: string
          expires_at: string
          jti: string
          role_label: string
          target_email: string
          target_id: string
          target_type: string
          used_at: string | null
        }
        Insert: {
          admin_email: string
          admin_id: string
          created_at?: string
          expires_at: string
          jti: string
          role_label: string
          target_email: string
          target_id: string
          target_type: string
          used_at?: string | null
        }
        Update: {
          admin_email?: string
          admin_id?: string
          created_at?: string
          expires_at?: string
          jti?: string
          role_label?: string
          target_email?: string
          target_id?: string
          target_type?: string
          used_at?: string | null
        }
        Relationships: []
      }
      crm_notification_reads: {
        Row: {
          read_at: string
          source_key: string
          user_id: string
        }
        Insert: {
          read_at?: string
          source_key: string
          user_id: string
        }
        Update: {
          read_at?: string
          source_key?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_push_prefs: {
        Row: {
          angebot_entscheidungen: boolean
          anstehende_abnahmen: boolean
          auftrag_partner: boolean
          handwerker_updates: boolean
          neue_anfragen: boolean
          push_enabled: boolean
          system_updates: boolean
          ueberfaellige_rechnungen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          angebot_entscheidungen?: boolean
          anstehende_abnahmen?: boolean
          auftrag_partner?: boolean
          handwerker_updates?: boolean
          neue_anfragen?: boolean
          push_enabled?: boolean
          system_updates?: boolean
          ueberfaellige_rechnungen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          angebot_entscheidungen?: boolean
          anstehende_abnahmen?: boolean
          auftrag_partner?: boolean
          handwerker_updates?: boolean
          neue_anfragen?: boolean
          push_enabled?: boolean
          system_updates?: boolean
          ueberfaellige_rechnungen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      custom_field_definitions: {
        Row: {
          aktiv: boolean
          created_at: string
          feld_typ: string
          id: string
          label: string
          objekt_typ: string
          optionen: Json | null
          pflicht: boolean
          sort_order: number
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          feld_typ: string
          id?: string
          label: string
          objekt_typ: string
          optionen?: Json | null
          pflicht?: boolean
          sort_order?: number
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          feld_typ?: string
          id?: string
          label?: string
          objekt_typ?: string
          optionen?: Json | null
          pflicht?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          definition_id: string
          id: string
          objekt_id: string
          updated_at: string
          wert: string | null
        }
        Insert: {
          created_at?: string
          definition_id: string
          id?: string
          objekt_id: string
          updated_at?: string
          wert?: string | null
        }
        Update: {
          created_at?: string
          definition_id?: string
          id?: string
          objekt_id?: string
          updated_at?: string
          wert?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      datenschutz_anfragen: {
        Row: {
          beschreibung: string | null
          created_at: string | null
          email: string
          erledigt_at: string | null
          id: string
          kontext: string | null
          name: string
          notizen: string | null
          status: string
          typ: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string | null
          email: string
          erledigt_at?: string | null
          id?: string
          kontext?: string | null
          name: string
          notizen?: string | null
          status?: string
          typ?: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string | null
          email?: string
          erledigt_at?: string | null
          id?: string
          kontext?: string | null
          name?: string
          notizen?: string | null
          status?: string
          typ?: string
        }
        Relationships: []
      }
      datenschutz_fristen: {
        Row: {
          aktiv: boolean | null
          beschreibung: string | null
          bezeichnung: string
          frist_monate: number
          gesetzliche_grundlage: string | null
          id: string
          kategorie: string
        }
        Insert: {
          aktiv?: boolean | null
          beschreibung?: string | null
          bezeichnung: string
          frist_monate: number
          gesetzliche_grundlage?: string | null
          id?: string
          kategorie: string
        }
        Update: {
          aktiv?: boolean | null
          beschreibung?: string | null
          bezeichnung?: string
          frist_monate?: number
          gesetzliche_grundlage?: string | null
          id?: string
          kategorie?: string
        }
        Relationships: []
      }
      datenschutz_loeschlog: {
        Row: {
          created_at: string | null
          geloescht_von: string | null
          grund: string
          id: string
          referenz_id: string | null
          referenz_typ: string | null
          typ: string
        }
        Insert: {
          created_at?: string | null
          geloescht_von?: string | null
          grund: string
          id?: string
          referenz_id?: string | null
          referenz_typ?: string | null
          typ: string
        }
        Update: {
          created_at?: string | null
          geloescht_von?: string | null
          grund?: string
          id?: string
          referenz_id?: string | null
          referenz_typ?: string | null
          typ?: string
        }
        Relationships: []
      }
      datenschutz_vvt: {
        Row: {
          aktiv: boolean
          betroffene_kategorien: string | null
          datenarten: string | null
          drittland: string | null
          empfaenger: string | null
          id: string
          loeschfrist_hinweis: string | null
          rechtsgrundlage: string | null
          sort_order: number
          titel: string
          toms: string | null
          zweck: string
        }
        Insert: {
          aktiv?: boolean
          betroffene_kategorien?: string | null
          datenarten?: string | null
          drittland?: string | null
          empfaenger?: string | null
          id?: string
          loeschfrist_hinweis?: string | null
          rechtsgrundlage?: string | null
          sort_order?: number
          titel: string
          toms?: string | null
          zweck: string
        }
        Update: {
          aktiv?: boolean
          betroffene_kategorien?: string | null
          datenarten?: string | null
          drittland?: string | null
          empfaenger?: string | null
          id?: string
          loeschfrist_hinweis?: string | null
          rechtsgrundlage?: string | null
          sort_order?: number
          titel?: string
          toms?: string | null
          zweck?: string
        }
        Relationships: []
      }
      eigentuemer_objekte: {
        Row: {
          created_at: string
          id: string
          kunde_id: string
          kunde_objekt_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kunde_id: string
          kunde_objekt_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kunde_id?: string
          kunde_objekt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eigentuemer_objekte_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eigentuemer_objekte_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      einbehalte: {
        Row: {
          auftrag_id: string
          bezahlt_betrag: number
          created_at: string | null
          einbehalt_betrag: number
          einbehalt_prozent: number
          freigabe_datum: string
          freigegeben_at: string | null
          handwerker_id: string
          id: string
          notizen: string | null
          rechnung_brutto: number
          status: string
        }
        Insert: {
          auftrag_id: string
          bezahlt_betrag: number
          created_at?: string | null
          einbehalt_betrag: number
          einbehalt_prozent?: number
          freigabe_datum: string
          freigegeben_at?: string | null
          handwerker_id: string
          id?: string
          notizen?: string | null
          rechnung_brutto: number
          status?: string
        }
        Update: {
          auftrag_id?: string
          bezahlt_betrag?: number
          created_at?: string | null
          einbehalt_betrag?: number
          einbehalt_prozent?: number
          freigabe_datum?: string
          freigegeben_at?: string | null
          handwerker_id?: string
          id?: string
          notizen?: string | null
          rechnung_brutto?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "einbehalte_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einbehalte_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einbehalte_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      eingangsrechnungen: {
        Row: {
          auftrag_id: string
          beleg_url: string | null
          beschreibung: string | null
          betrag_brutto: number
          betrag_netto: number
          bezahlt: boolean | null
          bezahlt_am: string | null
          created_at: string | null
          erstellt_von: string | null
          faellig_am: string | null
          id: string
          kategorie: string
          lieferant: string
          mwst_satz: number | null
          notizen: string | null
          rechnungsdatum: string | null
        }
        Insert: {
          auftrag_id: string
          beleg_url?: string | null
          beschreibung?: string | null
          betrag_brutto: number
          betrag_netto: number
          bezahlt?: boolean | null
          bezahlt_am?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          faellig_am?: string | null
          id?: string
          kategorie?: string
          lieferant: string
          mwst_satz?: number | null
          notizen?: string | null
          rechnungsdatum?: string | null
        }
        Update: {
          auftrag_id?: string
          beleg_url?: string | null
          beschreibung?: string | null
          betrag_brutto?: number
          betrag_netto?: number
          bezahlt?: boolean | null
          bezahlt_am?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          faellig_am?: string | null
          id?: string
          kategorie?: string
          lieferant?: string
          mwst_satz?: number | null
          notizen?: string | null
          rechnungsdatum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eingangsrechnungen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      einheit_bewohner: {
        Row: {
          aktiv: boolean
          anonymisiert_am: string | null
          created_at: string
          email: string | null
          id: string
          kunde_id: string
          mietbeginn: string | null
          miete_hinweis: string | null
          mietende: string | null
          name: string
          notiz: string | null
          objekt_einheit_id: string
          portal_kunde_id: string | null
          rolle: string
          selbstbewohnt: boolean
          sondereigentum_verwaltung: boolean
          telefon: string | null
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          anonymisiert_am?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kunde_id: string
          mietbeginn?: string | null
          miete_hinweis?: string | null
          mietende?: string | null
          name: string
          notiz?: string | null
          objekt_einheit_id: string
          portal_kunde_id?: string | null
          rolle?: string
          selbstbewohnt?: boolean
          sondereigentum_verwaltung?: boolean
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          anonymisiert_am?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kunde_id?: string
          mietbeginn?: string | null
          miete_hinweis?: string | null
          mietende?: string | null
          name?: string
          notiz?: string | null
          objekt_einheit_id?: string
          portal_kunde_id?: string | null
          rolle?: string
          selbstbewohnt?: boolean
          sondereigentum_verwaltung?: boolean
          telefon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "einheit_bewohner_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einheit_bewohner_objekt_einheit_id_fkey"
            columns: ["objekt_einheit_id"]
            isOneToOne: false
            referencedRelation: "objekt_einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einheit_bewohner_portal_kunde_id_fkey"
            columns: ["portal_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      einstellungen: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      eintrag_fotos: {
        Row: {
          aufnahmeart: string
          created_at: string
          eintrag_id: string
          exif_aufnahme: string | null
          exif_gps_lat: number | null
          exif_gps_lng: number | null
          id: string
          nachreich_grund: string | null
          server_eingang: string
          storage_path: string
        }
        Insert: {
          aufnahmeart?: string
          created_at?: string
          eintrag_id: string
          exif_aufnahme?: string | null
          exif_gps_lat?: number | null
          exif_gps_lng?: number | null
          id?: string
          nachreich_grund?: string | null
          server_eingang?: string
          storage_path: string
        }
        Update: {
          aufnahmeart?: string
          created_at?: string
          eintrag_id?: string
          exif_aufnahme?: string | null
          exif_gps_lat?: number | null
          exif_gps_lng?: number | null
          id?: string
          nachreich_grund?: string | null
          server_eingang?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "eintrag_fotos_eintrag_id_fkey"
            columns: ["eintrag_id"]
            isOneToOne: false
            referencedRelation: "position_eintraege"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          an_email: string | null
          an_name: string | null
          angebot_id: string | null
          anhang_dateiname: string | null
          auftrag_id: string | null
          betreff: string | null
          created_at: string | null
          empfaenger: string
          fehler_nachricht: string | null
          fehler_text: string | null
          gesendet_von: string | null
          id: string
          inhalt_html: string | null
          kunde_id: string | null
          lead_id: string | null
          rechnung_id: string | null
          resend_id: string | null
          sent_at: string
          status: string
          subject: string
          typ: string
        }
        Insert: {
          an_email?: string | null
          an_name?: string | null
          angebot_id?: string | null
          anhang_dateiname?: string | null
          auftrag_id?: string | null
          betreff?: string | null
          created_at?: string | null
          empfaenger: string
          fehler_nachricht?: string | null
          fehler_text?: string | null
          gesendet_von?: string | null
          id?: string
          inhalt_html?: string | null
          kunde_id?: string | null
          lead_id?: string | null
          rechnung_id?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          typ: string
        }
        Update: {
          an_email?: string | null
          an_name?: string | null
          angebot_id?: string | null
          anhang_dateiname?: string | null
          auftrag_id?: string | null
          betreff?: string | null
          created_at?: string | null
          empfaenger?: string
          fehler_nachricht?: string | null
          fehler_text?: string | null
          gesendet_von?: string | null
          id?: string
          inhalt_html?: string | null
          kunde_id?: string | null
          lead_id?: string | null
          rechnung_id?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          angebot_id: string | null
          created_at: string | null
          id: string
          meta: Json | null
          subject: string | null
          to_email: string | null
          typ: string
          zuweisung_id: string | null
        }
        Insert: {
          angebot_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          subject?: string | null
          to_email?: string | null
          typ: string
          zuweisung_id?: string | null
        }
        Update: {
          angebot_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          subject?: string | null
          to_email?: string | null
          typ?: string
          zuweisung_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_zuweisung_id_fkey"
            columns: ["zuweisung_id"]
            isOneToOne: false
            referencedRelation: "angebot_handwerker"
            referencedColumns: ["id"]
          },
        ]
      }
      formular_eintraege: {
        Row: {
          auftrag_id: string | null
          created_at: string
          daten: Json
          foto_urls: string[] | null
          gesamtstunden: number | null
          gespeichert_at: string | null
          handwerker_id: string | null
          id: string
          ist_entwurf: boolean
          material_kosten: number | null
          phase: Database["public"]["Enums"]["formular_phase"]
          submitted_at: string | null
          template_id: string
          token: string | null
          unterschrift_at: string | null
          unterschrift_kunde: string | null
          updated_at: string
        }
        Insert: {
          auftrag_id?: string | null
          created_at?: string
          daten?: Json
          foto_urls?: string[] | null
          gesamtstunden?: number | null
          gespeichert_at?: string | null
          handwerker_id?: string | null
          id?: string
          ist_entwurf?: boolean
          material_kosten?: number | null
          phase?: Database["public"]["Enums"]["formular_phase"]
          submitted_at?: string | null
          template_id: string
          token?: string | null
          unterschrift_at?: string | null
          unterschrift_kunde?: string | null
          updated_at?: string
        }
        Update: {
          auftrag_id?: string | null
          created_at?: string
          daten?: Json
          foto_urls?: string[] | null
          gesamtstunden?: number | null
          gespeichert_at?: string | null
          handwerker_id?: string | null
          id?: string
          ist_entwurf?: boolean
          material_kosten?: number | null
          phase?: Database["public"]["Enums"]["formular_phase"]
          submitted_at?: string | null
          template_id?: string
          token?: string | null
          unterschrift_at?: string | null
          unterschrift_kunde?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formular_eintraege_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formular_eintraege_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formular_eintraege_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formular_eintraege_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "formular_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      formular_templates: {
        Row: {
          aktiv: boolean
          created_at: string
          felder: Json
          gewerk_id: string | null
          id: string
          name: string
          phase: Database["public"]["Enums"]["formular_phase"] | null
          subtyp: string | null
          typ: Database["public"]["Enums"]["formular_typ"]
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          felder?: Json
          gewerk_id?: string | null
          id?: string
          name: string
          phase?: Database["public"]["Enums"]["formular_phase"] | null
          subtyp?: string | null
          typ?: Database["public"]["Enums"]["formular_typ"]
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          felder?: Json
          gewerk_id?: string | null
          id?: string
          name?: string
          phase?: Database["public"]["Enums"]["formular_phase"] | null
          subtyp?: string | null
          typ?: Database["public"]["Enums"]["formular_typ"]
        }
        Relationships: [
          {
            foreignKeyName: "formular_templates_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
        ]
      }
      fremd_vorgaenge: {
        Row: {
          betrag: number | null
          created_at: string
          datum: string
          dokument_url: string | null
          id: string
          kategorie: string
          kunde_id: string
          kunde_objekt_id: string
          notiz: string | null
          quelle: string
          titel: string
          updated_at: string
        }
        Insert: {
          betrag?: number | null
          created_at?: string
          datum?: string
          dokument_url?: string | null
          id?: string
          kategorie?: string
          kunde_id: string
          kunde_objekt_id: string
          notiz?: string | null
          quelle?: string
          titel: string
          updated_at?: string
        }
        Update: {
          betrag?: number | null
          created_at?: string
          datum?: string
          dokument_url?: string | null
          id?: string
          kategorie?: string
          kunde_id?: string
          kunde_objekt_id?: string
          notiz?: string | null
          quelle?: string
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fremd_vorgaenge_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fremd_vorgaenge_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_portal_otp: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gewaehrleistungen: {
        Row: {
          abnahme_am: string
          auftrag_id: string
          created_at: string
          frist_bis: string
          id: string
          mangel_lead_id: string | null
          partner_id: string | null
          regress_notiz: string | null
          status: string
          wiedervorlage_am: string | null
        }
        Insert: {
          abnahme_am: string
          auftrag_id: string
          created_at?: string
          frist_bis: string
          id?: string
          mangel_lead_id?: string | null
          partner_id?: string | null
          regress_notiz?: string | null
          status?: string
          wiedervorlage_am?: string | null
        }
        Update: {
          abnahme_am?: string
          auftrag_id?: string
          created_at?: string
          frist_bis?: string
          id?: string
          mangel_lead_id?: string | null
          partner_id?: string | null
          regress_notiz?: string | null
          status?: string
          wiedervorlage_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gewaehrleistungen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gewaehrleistungen_mangel_lead_id_fkey"
            columns: ["mangel_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gewaehrleistungen_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gewaehrleistungen_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      gewerke: {
        Row: {
          aktiv: boolean
          ausfuehrung: string | null
          created_at: string
          fachbetrieb_hinweis: string | null
          id: string
          ist_bauleistung: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          aktiv?: boolean
          ausfuehrung?: string | null
          created_at?: string
          fachbetrieb_hinweis?: string | null
          id?: string
          ist_bauleistung?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          aktiv?: boolean
          ausfuehrung?: string | null
          created_at?: string
          fachbetrieb_hinweis?: string | null
          id?: string
          ist_bauleistung?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      gpt_raum_sessions: {
        Row: {
          analyze_count: number
          created_at: string
          ergebnis_bild_url: string | null
          ergebnis_historie: Json
          expires_at: string
          funnel_quelle: string
          gpt_erklaerung: Json | null
          id: string
          inspiration_analyse: Json | null
          ist_bilder_urls: string[]
          ki_chat_verlauf: Json
          kunde_id: string | null
          lead_submitted_at: string | null
          raum_analyse: Json | null
          render_count: number
          render_prompt: string | null
          visitor_token: string | null
          viz_brief: Json | null
          wunsch_text: string | null
          ziel_bild_url: string | null
        }
        Insert: {
          analyze_count?: number
          created_at?: string
          ergebnis_bild_url?: string | null
          ergebnis_historie?: Json
          expires_at?: string
          funnel_quelle?: string
          gpt_erklaerung?: Json | null
          id?: string
          inspiration_analyse?: Json | null
          ist_bilder_urls?: string[]
          ki_chat_verlauf?: Json
          kunde_id?: string | null
          lead_submitted_at?: string | null
          raum_analyse?: Json | null
          render_count?: number
          render_prompt?: string | null
          visitor_token?: string | null
          viz_brief?: Json | null
          wunsch_text?: string | null
          ziel_bild_url?: string | null
        }
        Update: {
          analyze_count?: number
          created_at?: string
          ergebnis_bild_url?: string | null
          ergebnis_historie?: Json
          expires_at?: string
          funnel_quelle?: string
          gpt_erklaerung?: Json | null
          id?: string
          inspiration_analyse?: Json | null
          ist_bilder_urls?: string[]
          ki_chat_verlauf?: Json
          kunde_id?: string | null
          lead_submitted_at?: string | null
          raum_analyse?: Json | null
          render_count?: number
          render_prompt?: string | null
          visitor_token?: string | null
          viz_brief?: Json | null
          wunsch_text?: string | null
          ziel_bild_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gpt_raum_sessions_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      handwerker: {
        Row: {
          adresse: string | null
          aktiv: boolean
          auth_user_id: string | null
          bank: string | null
          bewertung_anzahl: number
          bewertung_gesamt: number | null
          bewertung_kommunikation: number | null
          bewertung_preis_leistung: number | null
          bewertung_qualitaet: number | null
          bewertung_sauberkeit: number | null
          bewertung_termintreue: number | null
          bic: string | null
          compliance_status: string | null
          created_at: string
          email: string | null
          firma: string | null
          gewerke: string[] | null
          handelsregister: string | null
          hausnummer: string | null
          herkunft: string | null
          iban: string | null
          id: string
          ist_fachbetrieb: boolean | null
          ist_portal_gesperrt: boolean
          kleinunternehmer: boolean
          logo_url: string | null
          nachname: string | null
          name: string
          notizen: string | null
          ort: string | null
          partner_kategorie_id: string | null
          plz: string | null
          portal_gesperrt_am: string | null
          rechnungsnr_seq: number
          steuernummer: string | null
          strasse: string | null
          subkategorie: string | null
          telefon: string | null
          updated_at: string
          ustid: string | null
          vorname: string | null
          webseite: string | null
          whatsapp: string | null
        }
        Insert: {
          adresse?: string | null
          aktiv?: boolean
          auth_user_id?: string | null
          bank?: string | null
          bewertung_anzahl?: number
          bewertung_gesamt?: number | null
          bewertung_kommunikation?: number | null
          bewertung_preis_leistung?: number | null
          bewertung_qualitaet?: number | null
          bewertung_sauberkeit?: number | null
          bewertung_termintreue?: number | null
          bic?: string | null
          compliance_status?: string | null
          created_at?: string
          email?: string | null
          firma?: string | null
          gewerke?: string[] | null
          handelsregister?: string | null
          hausnummer?: string | null
          herkunft?: string | null
          iban?: string | null
          id?: string
          ist_fachbetrieb?: boolean | null
          ist_portal_gesperrt?: boolean
          kleinunternehmer?: boolean
          logo_url?: string | null
          nachname?: string | null
          name: string
          notizen?: string | null
          ort?: string | null
          partner_kategorie_id?: string | null
          plz?: string | null
          portal_gesperrt_am?: string | null
          rechnungsnr_seq?: number
          steuernummer?: string | null
          strasse?: string | null
          subkategorie?: string | null
          telefon?: string | null
          updated_at?: string
          ustid?: string | null
          vorname?: string | null
          webseite?: string | null
          whatsapp?: string | null
        }
        Update: {
          adresse?: string | null
          aktiv?: boolean
          auth_user_id?: string | null
          bank?: string | null
          bewertung_anzahl?: number
          bewertung_gesamt?: number | null
          bewertung_kommunikation?: number | null
          bewertung_preis_leistung?: number | null
          bewertung_qualitaet?: number | null
          bewertung_sauberkeit?: number | null
          bewertung_termintreue?: number | null
          bic?: string | null
          compliance_status?: string | null
          created_at?: string
          email?: string | null
          firma?: string | null
          gewerke?: string[] | null
          handelsregister?: string | null
          hausnummer?: string | null
          herkunft?: string | null
          iban?: string | null
          id?: string
          ist_fachbetrieb?: boolean | null
          ist_portal_gesperrt?: boolean
          kleinunternehmer?: boolean
          logo_url?: string | null
          nachname?: string | null
          name?: string
          notizen?: string | null
          ort?: string | null
          partner_kategorie_id?: string | null
          plz?: string | null
          portal_gesperrt_am?: string | null
          rechnungsnr_seq?: number
          steuernummer?: string | null
          strasse?: string | null
          subkategorie?: string | null
          telefon?: string | null
          updated_at?: string
          ustid?: string | null
          vorname?: string | null
          webseite?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handwerker_partner_kategorie_id_fkey"
            columns: ["partner_kategorie_id"]
            isOneToOne: false
            referencedRelation: "partner_kategorien"
            referencedColumns: ["id"]
          },
        ]
      }
      handwerker_bewertungen: {
        Row: {
          auftrag_id: string
          created_at: string
          erstellt_von: string | null
          gewerk_id: string | null
          handwerker_id: string
          id: string
          kommunikation: number
          notiz: string | null
          preis_leistung: number
          qualitaet: number
          sauberkeit: number
          termintreue: number
          updated_at: string
        }
        Insert: {
          auftrag_id: string
          created_at?: string
          erstellt_von?: string | null
          gewerk_id?: string | null
          handwerker_id: string
          id?: string
          kommunikation: number
          notiz?: string | null
          preis_leistung: number
          qualitaet: number
          sauberkeit: number
          termintreue: number
          updated_at?: string
        }
        Update: {
          auftrag_id?: string
          created_at?: string
          erstellt_von?: string | null
          gewerk_id?: string | null
          handwerker_id?: string
          id?: string
          kommunikation?: number
          notiz?: string | null
          preis_leistung?: number
          qualitaet?: number
          sauberkeit?: number
          termintreue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handwerker_bewertungen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_bewertungen_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_bewertungen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_bewertungen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      handwerker_vertraege: {
        Row: {
          aufmass_rhythmus_tage: number
          auftrag_id: string | null
          bauvorhaben: string | null
          bezug_vertrag_vom: string | null
          bezug_vertrags_nr: string | null
          created_at: string
          dokument_art: string
          dokument_titel: string | null
          einbehalt_prozent: number
          gewerk_id: string | null
          gewerk_name: string | null
          handwerker_id: string
          id: string
          leistungsumfang: string | null
          nachtrag_positionen: Json | null
          notizen: string | null
          parent_vertrag_id: string | null
          pdf_url: string | null
          portal_akzeptiert_am: string | null
          portal_akzeptiert_auth_user_id: string | null
          regiesatz_netto: number | null
          signiert_am: string | null
          status: string
          typ: string
          updated_at: string
          verguetung_text: string | null
          vertrag_vom: string | null
          vertrags_nr: string
          zahlungsziel_tage: number
        }
        Insert: {
          aufmass_rhythmus_tage?: number
          auftrag_id?: string | null
          bauvorhaben?: string | null
          bezug_vertrag_vom?: string | null
          bezug_vertrags_nr?: string | null
          created_at?: string
          dokument_art?: string
          dokument_titel?: string | null
          einbehalt_prozent?: number
          gewerk_id?: string | null
          gewerk_name?: string | null
          handwerker_id: string
          id?: string
          leistungsumfang?: string | null
          nachtrag_positionen?: Json | null
          notizen?: string | null
          parent_vertrag_id?: string | null
          pdf_url?: string | null
          portal_akzeptiert_am?: string | null
          portal_akzeptiert_auth_user_id?: string | null
          regiesatz_netto?: number | null
          signiert_am?: string | null
          status?: string
          typ: string
          updated_at?: string
          verguetung_text?: string | null
          vertrag_vom?: string | null
          vertrags_nr: string
          zahlungsziel_tage?: number
        }
        Update: {
          aufmass_rhythmus_tage?: number
          auftrag_id?: string | null
          bauvorhaben?: string | null
          bezug_vertrag_vom?: string | null
          bezug_vertrags_nr?: string | null
          created_at?: string
          dokument_art?: string
          dokument_titel?: string | null
          einbehalt_prozent?: number
          gewerk_id?: string | null
          gewerk_name?: string | null
          handwerker_id?: string
          id?: string
          leistungsumfang?: string | null
          nachtrag_positionen?: Json | null
          notizen?: string | null
          parent_vertrag_id?: string | null
          pdf_url?: string | null
          portal_akzeptiert_am?: string | null
          portal_akzeptiert_auth_user_id?: string | null
          regiesatz_netto?: number | null
          signiert_am?: string | null
          status?: string
          typ?: string
          updated_at?: string
          verguetung_text?: string | null
          vertrag_vom?: string | null
          vertrags_nr?: string
          zahlungsziel_tage?: number
        }
        Relationships: [
          {
            foreignKeyName: "handwerker_vertraege_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_vertraege_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_vertraege_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_vertraege_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwerker_vertraege_parent_vertrag_id_fkey"
            columns: ["parent_vertrag_id"]
            isOneToOne: false
            referencedRelation: "handwerker_vertraege"
            referencedColumns: ["id"]
          },
        ]
      }
      hausmeister_objekte: {
        Row: {
          created_at: string
          id: string
          kunde_objekt_id: string
          org_hausmeister_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kunde_objekt_id: string
          org_hausmeister_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kunde_objekt_id?: string
          org_hausmeister_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hausmeister_objekte_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: true
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hausmeister_objekte_org_hausmeister_id_fkey"
            columns: ["org_hausmeister_id"]
            isOneToOne: false
            referencedRelation: "org_hausmeister"
            referencedColumns: ["id"]
          },
        ]
      }
      hv_calendar_feeds: {
        Row: {
          aktiv: boolean
          auth_user_id: string
          created_at: string
          id: string
          kunde_id: string
          label: string | null
          token_hash: string
        }
        Insert: {
          aktiv?: boolean
          auth_user_id: string
          created_at?: string
          id?: string
          kunde_id: string
          label?: string | null
          token_hash: string
        }
        Update: {
          aktiv?: boolean
          auth_user_id?: string
          created_at?: string
          id?: string
          kunde_id?: string
          label?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "hv_calendar_feeds_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      hv_notification_prefs: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          kategorie: string
          kunde_id: string
          modus: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          kategorie: string
          kunde_id: string
          modus?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          kategorie?: string
          kunde_id?: string
          modus?: string
        }
        Relationships: [
          {
            foreignKeyName: "hv_notification_prefs_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      hv_notifications: {
        Row: {
          auth_user_id: string | null
          body: string | null
          created_at: string
          gelesen_am: string | null
          id: string
          kunde_id: string
          link: string | null
          titel: string
          typ: string
        }
        Insert: {
          auth_user_id?: string | null
          body?: string | null
          created_at?: string
          gelesen_am?: string | null
          id?: string
          kunde_id: string
          link?: string | null
          titel: string
          typ: string
        }
        Update: {
          auth_user_id?: string | null
          body?: string | null
          created_at?: string
          gelesen_am?: string | null
          id?: string
          kunde_id?: string
          link?: string | null
          titel?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "hv_notifications_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      hv_portal_abnahmen: {
        Row: {
          anmerkung: string | null
          art: string
          auftrag_id: string
          created_at: string
          id: string
          kunde_id: string | null
          lead_id: string | null
          signatur_png: string | null
          signiert_am: string
          signiert_name: string
        }
        Insert: {
          anmerkung?: string | null
          art: string
          auftrag_id: string
          created_at?: string
          id?: string
          kunde_id?: string | null
          lead_id?: string | null
          signatur_png?: string | null
          signiert_am?: string
          signiert_name: string
        }
        Update: {
          anmerkung?: string | null
          art?: string
          auftrag_id?: string
          created_at?: string
          id?: string
          kunde_id?: string | null
          lead_id?: string | null
          signatur_png?: string | null
          signiert_am?: string
          signiert_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hv_portal_abnahmen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hv_portal_abnahmen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hv_portal_abnahmen_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      hw_formular_einreichungen: {
        Row: {
          auftrag_id: string
          created_at: string | null
          eingereicht_at: string | null
          felder_werte: Json | null
          foto_urls: string[] | null
          gesendet_at: string | null
          handwerker_id: string | null
          id: string
          status: string | null
          tab_id: string
          token: string | null
        }
        Insert: {
          auftrag_id: string
          created_at?: string | null
          eingereicht_at?: string | null
          felder_werte?: Json | null
          foto_urls?: string[] | null
          gesendet_at?: string | null
          handwerker_id?: string | null
          id?: string
          status?: string | null
          tab_id: string
          token?: string | null
        }
        Update: {
          auftrag_id?: string
          created_at?: string | null
          eingereicht_at?: string | null
          felder_werte?: Json | null
          foto_urls?: string[] | null
          gesendet_at?: string | null
          handwerker_id?: string | null
          id?: string
          status?: string | null
          tab_id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hw_formular_einreichungen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hw_formular_einreichungen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hw_formular_einreichungen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hw_formular_einreichungen_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "hw_formular_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      hw_formular_tabs: {
        Row: {
          aktiv: boolean | null
          auftrag_id: string
          beschreibung: string | null
          created_at: string | null
          felder: Json
          handwerker_id: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          aktiv?: boolean | null
          auftrag_id: string
          beschreibung?: string | null
          created_at?: string | null
          felder?: Json
          handwerker_id?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          aktiv?: boolean | null
          auftrag_id?: string
          beschreibung?: string | null
          created_at?: string | null
          felder?: Json
          handwerker_id?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hw_formular_tabs_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hw_formular_tabs_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hw_formular_tabs_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      kalender_termine: {
        Row: {
          adresse: string | null
          auftrag_id: string | null
          beschreibung: string | null
          created_at: string
          datum: string
          erledigt: boolean
          erstellt_von: string | null
          id: string
          lead_id: string | null
          titel: string
          typ: Database["public"]["Enums"]["termin_typ"]
          uhrzeit_bis: string | null
          uhrzeit_von: string | null
          verweis_id: string | null
          verweis_typ: string | null
          wiedervorlage_notiz: string | null
          zugewiesen_an: string | null
        }
        Insert: {
          adresse?: string | null
          auftrag_id?: string | null
          beschreibung?: string | null
          created_at?: string
          datum: string
          erledigt?: boolean
          erstellt_von?: string | null
          id?: string
          lead_id?: string | null
          titel: string
          typ?: Database["public"]["Enums"]["termin_typ"]
          uhrzeit_bis?: string | null
          uhrzeit_von?: string | null
          verweis_id?: string | null
          verweis_typ?: string | null
          wiedervorlage_notiz?: string | null
          zugewiesen_an?: string | null
        }
        Update: {
          adresse?: string | null
          auftrag_id?: string | null
          beschreibung?: string | null
          created_at?: string
          datum?: string
          erledigt?: boolean
          erstellt_von?: string | null
          id?: string
          lead_id?: string | null
          titel?: string
          typ?: Database["public"]["Enums"]["termin_typ"]
          uhrzeit_bis?: string | null
          uhrzeit_von?: string | null
          verweis_id?: string | null
          verweis_typ?: string | null
          wiedervorlage_notiz?: string | null
          zugewiesen_an?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kalender_termine_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kalender_termine_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      katalog_lernsignale: {
        Row: {
          angebot_id: string | null
          beschreibung: string
          created_at: string
          einheit: string
          gewerk_id: string | null
          id: string
          lead_id: string | null
          menge: number
          preis_netto: number
          quelle: string
          titel: string
        }
        Insert: {
          angebot_id?: string | null
          beschreibung?: string
          created_at?: string
          einheit?: string
          gewerk_id?: string | null
          id?: string
          lead_id?: string | null
          menge?: number
          preis_netto?: number
          quelle?: string
          titel: string
        }
        Update: {
          angebot_id?: string | null
          beschreibung?: string
          created_at?: string
          einheit?: string
          gewerk_id?: string | null
          id?: string
          lead_id?: string | null
          menge?: number
          preis_netto?: number
          quelle?: string
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "katalog_lernsignale_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "katalog_lernsignale_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
        ]
      }
      katalog_positionen: {
        Row: {
          aktiv: boolean
          beschreibung_standard: string
          created_at: string
          gewerk_id: string
          id: string
          kategorie: string
          sortierung: number
          titel: string
        }
        Insert: {
          aktiv?: boolean
          beschreibung_standard?: string
          created_at?: string
          gewerk_id: string
          id?: string
          kategorie?: string
          sortierung?: number
          titel: string
        }
        Update: {
          aktiv?: boolean
          beschreibung_standard?: string
          created_at?: string
          gewerk_id?: string
          id?: string
          kategorie?: string
          sortierung?: number
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "katalog_positionen_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
        ]
      }
      katalog_preise: {
        Row: {
          aktiv: boolean
          created_at: string
          groessenklasse: string | null
          id: string
          lohnanteil_prozent: number | null
          m2_satz: number | null
          preis_fix: number | null
          preis_max: number | null
          preis_min: number | null
          produkt_slug: string
          sort_order: number
          stundensatz: number | null
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          groessenklasse?: string | null
          id?: string
          lohnanteil_prozent?: number | null
          m2_satz?: number | null
          preis_fix?: number | null
          preis_max?: number | null
          preis_min?: number | null
          produkt_slug: string
          sort_order?: number
          stundensatz?: number | null
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          groessenklasse?: string | null
          id?: string
          lohnanteil_prozent?: number | null
          m2_satz?: number | null
          preis_fix?: number | null
          preis_max?: number | null
          preis_min?: number | null
          produkt_slug?: string
          sort_order?: number
          stundensatz?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "katalog_preise_produkt_slug_fkey"
            columns: ["produkt_slug"]
            isOneToOne: false
            referencedRelation: "katalog_produkte"
            referencedColumns: ["slug"]
          },
        ]
      }
      katalog_produkte: {
        Row: {
          aktiv: boolean
          beschreibung: string | null
          bezeichnung: string
          created_at: string
          familie: string
          has_fixpreis: boolean
          lohnanteil_prozent: number
          preis_typ: string
          scope_json: Json
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          beschreibung?: string | null
          bezeichnung: string
          created_at?: string
          familie: string
          has_fixpreis?: boolean
          lohnanteil_prozent?: number
          preis_typ?: string
          scope_json?: Json
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          beschreibung?: string | null
          bezeichnung?: string
          created_at?: string
          familie?: string
          has_fixpreis?: boolean
          lohnanteil_prozent?: number
          preis_typ?: string
          scope_json?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      katalog_varianten: {
        Row: {
          aktiv: boolean
          beschreibung: string
          created_at: string
          einheit: string
          id: string
          position_id: string
          preis: number
          preis_typ: string
          sortierung: number
          variante: string
        }
        Insert: {
          aktiv?: boolean
          beschreibung?: string
          created_at?: string
          einheit: string
          id?: string
          position_id: string
          preis: number
          preis_typ?: string
          sortierung?: number
          variante?: string
        }
        Update: {
          aktiv?: boolean
          beschreibung?: string
          created_at?: string
          einheit?: string
          id?: string
          position_id?: string
          preis?: number
          preis_typ?: string
          sortierung?: number
          variante?: string
        }
        Relationships: [
          {
            foreignKeyName: "katalog_varianten_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "katalog_positionen"
            referencedColumns: ["id"]
          },
        ]
      }
      ki_anfragen_log: {
        Row: {
          anfrage_text: string
          claude_antwort: string | null
          created_at: string | null
          extrahiertes_json: Json | null
          id: string
          lead_erstellt: boolean | null
          lead_id: string | null
          session_id: string | null
          typ: string | null
        }
        Insert: {
          anfrage_text: string
          claude_antwort?: string | null
          created_at?: string | null
          extrahiertes_json?: Json | null
          id?: string
          lead_erstellt?: boolean | null
          lead_id?: string | null
          session_id?: string | null
          typ?: string | null
        }
        Update: {
          anfrage_text?: string
          claude_antwort?: string | null
          created_at?: string | null
          extrahiertes_json?: Json | null
          id?: string
          lead_erstellt?: boolean | null
          lead_id?: string | null
          session_id?: string | null
          typ?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ki_anfragen_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ki_cluster_analysen: {
        Row: {
          analyse_key: string
          bereich: string
          created_at: string
          ergebnis: Json
          generiert_am: string
          gueltig_bis: string | null
          id: string
          narrative: string | null
          sample_size: number
          titel: string
          updated_at: string
        }
        Insert: {
          analyse_key: string
          bereich: string
          created_at?: string
          ergebnis?: Json
          generiert_am?: string
          gueltig_bis?: string | null
          id?: string
          narrative?: string | null
          sample_size?: number
          titel: string
          updated_at?: string
        }
        Update: {
          analyse_key?: string
          bereich?: string
          created_at?: string
          ergebnis?: Json
          generiert_am?: string
          gueltig_bis?: string | null
          id?: string
          narrative?: string | null
          sample_size?: number
          titel?: string
          updated_at?: string
        }
        Relationships: []
      }
      ki_content: {
        Row: {
          bild_prompt: string | null
          bild_url: string | null
          created_at: string
          empfehlung_id: string | null
          id: string
          publiziert_at: string | null
          status: string
          text_content: string | null
          typ: string
        }
        Insert: {
          bild_prompt?: string | null
          bild_url?: string | null
          created_at?: string
          empfehlung_id?: string | null
          id?: string
          publiziert_at?: string | null
          status?: string
          text_content?: string | null
          typ: string
        }
        Update: {
          bild_prompt?: string | null
          bild_url?: string | null
          created_at?: string
          empfehlung_id?: string | null
          id?: string
          publiziert_at?: string | null
          status?: string
          text_content?: string | null
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "ki_content_empfehlung_id_fkey"
            columns: ["empfehlung_id"]
            isOneToOne: false
            referencedRelation: "ki_empfehlungen"
            referencedColumns: ["id"]
          },
        ]
      }
      ki_empfehlungen: {
        Row: {
          aktion_payload: Json | null
          aktion_typ: string | null
          analyse_lauf: string
          bereich: string
          beschreibung: string | null
          content: Json | null
          created_at: string
          daten_basis: Json | null
          gesehen: boolean
          id: string
          prioritaet: string
          titel: string
          umgesetzt: boolean
          umgesetzt_at: string | null
        }
        Insert: {
          aktion_payload?: Json | null
          aktion_typ?: string | null
          analyse_lauf?: string
          bereich: string
          beschreibung?: string | null
          content?: Json | null
          created_at?: string
          daten_basis?: Json | null
          gesehen?: boolean
          id?: string
          prioritaet?: string
          titel: string
          umgesetzt?: boolean
          umgesetzt_at?: string | null
        }
        Update: {
          aktion_payload?: Json | null
          aktion_typ?: string | null
          analyse_lauf?: string
          bereich?: string
          beschreibung?: string | null
          content?: Json | null
          created_at?: string
          daten_basis?: Json | null
          gesehen?: boolean
          id?: string
          prioritaet?: string
          titel?: string
          umgesetzt?: boolean
          umgesetzt_at?: string | null
        }
        Relationships: []
      }
      ki_historische_positionen: {
        Row: {
          berechnung: string | null
          crm_modul: string | null
          dokument_nr: string
          einheit: string | null
          einzelpreis_netto: number | null
          gesamt_netto: number | null
          gewerk: string | null
          id: string
          import_batch: string | null
          importiert_am: string
          kostenart: string | null
          leistung: string
          menge: number | null
        }
        Insert: {
          berechnung?: string | null
          crm_modul?: string | null
          dokument_nr: string
          einheit?: string | null
          einzelpreis_netto?: number | null
          gesamt_netto?: number | null
          gewerk?: string | null
          id?: string
          import_batch?: string | null
          importiert_am?: string
          kostenart?: string | null
          leistung: string
          menge?: number | null
        }
        Update: {
          berechnung?: string | null
          crm_modul?: string | null
          dokument_nr?: string
          einheit?: string | null
          einzelpreis_netto?: number | null
          gesamt_netto?: number | null
          gewerk?: string | null
          id?: string
          import_batch?: string | null
          importiert_am?: string
          kostenart?: string | null
          leistung?: string
          menge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ki_historische_positionen_dokument_nr_fkey"
            columns: ["dokument_nr"]
            isOneToOne: false
            referencedRelation: "ki_historische_vorgaenge"
            referencedColumns: ["dokument_nr"]
          },
        ]
      }
      ki_historische_vorgaenge: {
        Row: {
          berechnung: string | null
          brutto: number | null
          dokument_nr: string
          dokumenttyp: string
          gewerk: string
          hinweis: string | null
          id: string
          import_batch: string | null
          importiert_am: string
          kunde_name: string | null
          kundennr: string | null
          mwst: number | null
          netto: number | null
          objekt_adresse: string | null
          status: string
          taetigkeit: string | null
        }
        Insert: {
          berechnung?: string | null
          brutto?: number | null
          dokument_nr: string
          dokumenttyp: string
          gewerk: string
          hinweis?: string | null
          id?: string
          import_batch?: string | null
          importiert_am?: string
          kunde_name?: string | null
          kundennr?: string | null
          mwst?: number | null
          netto?: number | null
          objekt_adresse?: string | null
          status: string
          taetigkeit?: string | null
        }
        Update: {
          berechnung?: string | null
          brutto?: number | null
          dokument_nr?: string
          dokumenttyp?: string
          gewerk?: string
          hinweis?: string | null
          id?: string
          import_batch?: string | null
          importiert_am?: string
          kunde_name?: string | null
          kundennr?: string | null
          mwst?: number | null
          netto?: number | null
          objekt_adresse?: string | null
          status?: string
          taetigkeit?: string | null
        }
        Relationships: []
      }
      ki_produkt_katalog: {
        Row: {
          beispiele: string | null
          hauptmodul: string
          id: string
          import_batch: string | null
          importiert_am: string
          preislogik: string | null
          sort_order: number
          typische_einheit: string | null
          untermodul: string | null
        }
        Insert: {
          beispiele?: string | null
          hauptmodul: string
          id?: string
          import_batch?: string | null
          importiert_am?: string
          preislogik?: string | null
          sort_order?: number
          typische_einheit?: string | null
          untermodul?: string | null
        }
        Update: {
          beispiele?: string | null
          hauptmodul?: string
          id?: string
          import_batch?: string | null
          importiert_am?: string
          preislogik?: string | null
          sort_order?: number
          typische_einheit?: string | null
          untermodul?: string | null
        }
        Relationships: []
      }
      ki_visualisierungen: {
        Row: {
          analyse_prompt: string | null
          angebot_id: string | null
          ausgewaehlte_urls: string[] | null
          created_at: string | null
          ergebnis_urls: string[] | null
          id: string
          ins_angebot: boolean | null
          ist_bilder_urls: string[] | null
          prompt_history: Json | null
          status: string | null
          updated_at: string
          ziel_bild_url: string | null
        }
        Insert: {
          analyse_prompt?: string | null
          angebot_id?: string | null
          ausgewaehlte_urls?: string[] | null
          created_at?: string | null
          ergebnis_urls?: string[] | null
          id?: string
          ins_angebot?: boolean | null
          ist_bilder_urls?: string[] | null
          prompt_history?: Json | null
          status?: string | null
          updated_at?: string
          ziel_bild_url?: string | null
        }
        Update: {
          analyse_prompt?: string | null
          angebot_id?: string | null
          ausgewaehlte_urls?: string[] | null
          created_at?: string | null
          ergebnis_urls?: string[] | null
          id?: string
          ins_angebot?: boolean | null
          ist_bilder_urls?: string[] | null
          prompt_history?: Json | null
          status?: string | null
          updated_at?: string
          ziel_bild_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ki_visualisierungen_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden: {
        Row: {
          adresse: string | null
          akut_fall_ids: Json
          ansprechpartner: string | null
          auth_user_id: string | null
          av_akzeptiert_am: string | null
          av_akzeptiert_von: string | null
          av_text_snapshot: string | null
          av_version: string | null
          created_at: string
          datenschutz_url: string | null
          eigentuemer_freigabe_schwelle_eur: number | null
          email: string | null
          freigabe_modus: string
          freigabe_schwelle_eur: number | null
          geburtstag: string | null
          gesamt_umsatz: number | null
          hausnummer: string | null
          hm_auto_zuweisen: boolean
          id: string
          impressum_url: string | null
          ist_portal_gesperrt: boolean
          ist_spam: boolean
          kleinreparatur_aktiv: boolean
          kleinreparaturen_ohne_angebot: boolean
          kundennummer: string | null
          letzte_aktivitaet: string | null
          mieter_kontakt_email: string | null
          mieter_kontakt_hinweis: string | null
          mieter_kontakt_telefon: string | null
          nachname: string | null
          name: string
          notfall_direkt: boolean
          notizen: string | null
          org_anzeigename: string | null
          org_hausnummer: string | null
          org_hero_url: string | null
          org_kennung: string | null
          org_logo_kuerzel: string | null
          org_logo_url: string | null
          org_ort: string | null
          org_plz: string | null
          org_primary_color: string | null
          org_primary_color_dk: string | null
          org_primary_color_soft: string | null
          org_strasse: string | null
          org_sub: string | null
          org_telefon: string | null
          ort: string | null
          plz: string | null
          portal_gesperrt_am: string | null
          portal_modus: string
          quelle: string | null
          spam_markiert_am: string | null
          strasse: string | null
          telefon: string | null
          typ: string
          updated_at: string
          ust_id: string | null
          vorname: string | null
          webseite: string | null
          wl_ansprache_am: string | null
        }
        Insert: {
          adresse?: string | null
          akut_fall_ids?: Json
          ansprechpartner?: string | null
          auth_user_id?: string | null
          av_akzeptiert_am?: string | null
          av_akzeptiert_von?: string | null
          av_text_snapshot?: string | null
          av_version?: string | null
          created_at?: string
          datenschutz_url?: string | null
          eigentuemer_freigabe_schwelle_eur?: number | null
          email?: string | null
          freigabe_modus?: string
          freigabe_schwelle_eur?: number | null
          geburtstag?: string | null
          gesamt_umsatz?: number | null
          hausnummer?: string | null
          hm_auto_zuweisen?: boolean
          id?: string
          impressum_url?: string | null
          ist_portal_gesperrt?: boolean
          ist_spam?: boolean
          kleinreparatur_aktiv?: boolean
          kleinreparaturen_ohne_angebot?: boolean
          kundennummer?: string | null
          letzte_aktivitaet?: string | null
          mieter_kontakt_email?: string | null
          mieter_kontakt_hinweis?: string | null
          mieter_kontakt_telefon?: string | null
          nachname?: string | null
          name: string
          notfall_direkt?: boolean
          notizen?: string | null
          org_anzeigename?: string | null
          org_hausnummer?: string | null
          org_hero_url?: string | null
          org_kennung?: string | null
          org_logo_kuerzel?: string | null
          org_logo_url?: string | null
          org_ort?: string | null
          org_plz?: string | null
          org_primary_color?: string | null
          org_primary_color_dk?: string | null
          org_primary_color_soft?: string | null
          org_strasse?: string | null
          org_sub?: string | null
          org_telefon?: string | null
          ort?: string | null
          plz?: string | null
          portal_gesperrt_am?: string | null
          portal_modus?: string
          quelle?: string | null
          spam_markiert_am?: string | null
          strasse?: string | null
          telefon?: string | null
          typ?: string
          updated_at?: string
          ust_id?: string | null
          vorname?: string | null
          webseite?: string | null
          wl_ansprache_am?: string | null
        }
        Update: {
          adresse?: string | null
          akut_fall_ids?: Json
          ansprechpartner?: string | null
          auth_user_id?: string | null
          av_akzeptiert_am?: string | null
          av_akzeptiert_von?: string | null
          av_text_snapshot?: string | null
          av_version?: string | null
          created_at?: string
          datenschutz_url?: string | null
          eigentuemer_freigabe_schwelle_eur?: number | null
          email?: string | null
          freigabe_modus?: string
          freigabe_schwelle_eur?: number | null
          geburtstag?: string | null
          gesamt_umsatz?: number | null
          hausnummer?: string | null
          hm_auto_zuweisen?: boolean
          id?: string
          impressum_url?: string | null
          ist_portal_gesperrt?: boolean
          ist_spam?: boolean
          kleinreparatur_aktiv?: boolean
          kleinreparaturen_ohne_angebot?: boolean
          kundennummer?: string | null
          letzte_aktivitaet?: string | null
          mieter_kontakt_email?: string | null
          mieter_kontakt_hinweis?: string | null
          mieter_kontakt_telefon?: string | null
          nachname?: string | null
          name?: string
          notfall_direkt?: boolean
          notizen?: string | null
          org_anzeigename?: string | null
          org_hausnummer?: string | null
          org_hero_url?: string | null
          org_kennung?: string | null
          org_logo_kuerzel?: string | null
          org_logo_url?: string | null
          org_ort?: string | null
          org_plz?: string | null
          org_primary_color?: string | null
          org_primary_color_dk?: string | null
          org_primary_color_soft?: string | null
          org_strasse?: string | null
          org_sub?: string | null
          org_telefon?: string | null
          ort?: string | null
          plz?: string | null
          portal_gesperrt_am?: string | null
          portal_modus?: string
          quelle?: string | null
          spam_markiert_am?: string | null
          strasse?: string | null
          telefon?: string | null
          typ?: string
          updated_at?: string
          ust_id?: string | null
          vorname?: string | null
          webseite?: string | null
          wl_ansprache_am?: string | null
        }
        Relationships: []
      }
      kunden_ansprechpartner: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ist_primaer: boolean
          kunde_id: string
          name: string
          rolle: string | null
          sort_order: number
          telefon: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ist_primaer?: boolean
          kunde_id: string
          name: string
          rolle?: string | null
          sort_order?: number
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ist_primaer?: boolean
          kunde_id?: string
          name?: string
          rolle?: string | null
          sort_order?: number
          telefon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunden_ansprechpartner_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden_dokumente: {
        Row: {
          created_at: string | null
          datei_url: string | null
          erstellt_von: string | null
          groesse_bytes: number | null
          id: string
          kunde_id: string
          name: string
          typ: string
        }
        Insert: {
          created_at?: string | null
          datei_url?: string | null
          erstellt_von?: string | null
          groesse_bytes?: number | null
          id?: string
          kunde_id: string
          name: string
          typ: string
        }
        Update: {
          created_at?: string | null
          datei_url?: string | null
          erstellt_von?: string | null
          groesse_bytes?: number | null
          id?: string
          kunde_id?: string
          name?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunden_dokumente_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden_mitglieder: {
        Row: {
          aktiv: boolean
          auth_user_id: string
          created_at: string
          eingeladen_am: string
          id: string
          kunde_id: string
          rolle: string
        }
        Insert: {
          aktiv?: boolean
          auth_user_id: string
          created_at?: string
          eingeladen_am?: string
          id?: string
          kunde_id: string
          rolle?: string
        }
        Update: {
          aktiv?: boolean
          auth_user_id?: string
          created_at?: string
          eingeladen_am?: string
          id?: string
          kunde_id?: string
          rolle?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunden_mitglieder_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden_notizen: {
        Row: {
          created_at: string | null
          erstellt_von: string | null
          id: string
          inhalt: string
          kunde_id: string
        }
        Insert: {
          created_at?: string | null
          erstellt_von?: string | null
          id?: string
          inhalt: string
          kunde_id: string
        }
        Update: {
          created_at?: string | null
          erstellt_von?: string | null
          id?: string
          inhalt?: string
          kunde_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunden_notizen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden_objekte: {
        Row: {
          automatische_schadenakte: boolean
          cover_url: string | null
          created_at: string
          created_by: string
          einheiten_hinweis: string | null
          freigabe_schwelle_eur: number | null
          hausnummer: string | null
          id: string
          kostenstelle_nr: string | null
          kunde_id: string
          melde_aktiv: boolean
          melde_slug: string | null
          notfall_direkt: boolean | null
          notizen_intern: string | null
          ort: string | null
          plz: string | null
          selbstbehalt_eur: number | null
          strasse: string | null
          titel: string
          typ: string | null
          updated_at: string
          versicherer: string | null
          versicherungs_nr: string | null
        }
        Insert: {
          automatische_schadenakte?: boolean
          cover_url?: string | null
          created_at?: string
          created_by?: string
          einheiten_hinweis?: string | null
          freigabe_schwelle_eur?: number | null
          hausnummer?: string | null
          id?: string
          kostenstelle_nr?: string | null
          kunde_id: string
          melde_aktiv?: boolean
          melde_slug?: string | null
          notfall_direkt?: boolean | null
          notizen_intern?: string | null
          ort?: string | null
          plz?: string | null
          selbstbehalt_eur?: number | null
          strasse?: string | null
          titel: string
          typ?: string | null
          updated_at?: string
          versicherer?: string | null
          versicherungs_nr?: string | null
        }
        Update: {
          automatische_schadenakte?: boolean
          cover_url?: string | null
          created_at?: string
          created_by?: string
          einheiten_hinweis?: string | null
          freigabe_schwelle_eur?: number | null
          hausnummer?: string | null
          id?: string
          kostenstelle_nr?: string | null
          kunde_id?: string
          melde_aktiv?: boolean
          melde_slug?: string | null
          notfall_direkt?: boolean | null
          notizen_intern?: string | null
          ort?: string | null
          plz?: string | null
          selbstbehalt_eur?: number | null
          strasse?: string | null
          titel?: string
          typ?: string | null
          updated_at?: string
          versicherer?: string | null
          versicherungs_nr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kunden_objekte_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_befund_punkte: {
        Row: {
          befund_id: string
          created_at: string
          foto_refs: Json
          id: string
          notiz: string
          quelle: string
          sort_order: number
          status: string | null
          titel: string
          updated_at: string
          vorlage_key: string | null
        }
        Insert: {
          befund_id: string
          created_at?: string
          foto_refs?: Json
          id?: string
          notiz?: string
          quelle: string
          sort_order?: number
          status?: string | null
          titel: string
          updated_at?: string
          vorlage_key?: string | null
        }
        Update: {
          befund_id?: string
          created_at?: string
          foto_refs?: Json
          id?: string
          notiz?: string
          quelle?: string
          sort_order?: number
          status?: string | null
          titel?: string
          updated_at?: string
          vorlage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_befund_punkte_befund_id_fkey"
            columns: ["befund_id"]
            isOneToOne: false
            referencedRelation: "lead_befunde"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_befunde: {
        Row: {
          abgeschlossen_at: string | null
          created_at: string
          created_by_kunde_id: string | null
          durchgefuehrt_am: string
          durchgefuehrt_von: string
          ergebnis: string | null
          id: string
          lead_id: string
          melde_kategorie: string | null
          objekt_kontakt_id: string | null
          updated_at: string
          vorlage_key: string | null
        }
        Insert: {
          abgeschlossen_at?: string | null
          created_at?: string
          created_by_kunde_id?: string | null
          durchgefuehrt_am?: string
          durchgefuehrt_von?: string
          ergebnis?: string | null
          id?: string
          lead_id: string
          melde_kategorie?: string | null
          objekt_kontakt_id?: string | null
          updated_at?: string
          vorlage_key?: string | null
        }
        Update: {
          abgeschlossen_at?: string | null
          created_at?: string
          created_by_kunde_id?: string | null
          durchgefuehrt_am?: string
          durchgefuehrt_von?: string
          ergebnis?: string | null
          id?: string
          lead_id?: string
          melde_kategorie?: string | null
          objekt_kontakt_id?: string | null
          updated_at?: string
          vorlage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_befunde_created_by_kunde_id_fkey"
            columns: ["created_by_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_befunde_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_befunde_objekt_kontakt_id_fkey"
            columns: ["objekt_kontakt_id"]
            isOneToOne: false
            referencedRelation: "objekt_kontakte"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notizen: {
        Row: {
          created_at: string | null
          datei_url: string | null
          datei_urls: string[] | null
          erstellt_von: string | null
          id: string
          inhalt: string
          kalender_termin_id: string | null
          lead_id: string
          quelle_notiz_id: string | null
          titel: string | null
        }
        Insert: {
          created_at?: string | null
          datei_url?: string | null
          datei_urls?: string[] | null
          erstellt_von?: string | null
          id?: string
          inhalt: string
          kalender_termin_id?: string | null
          lead_id: string
          quelle_notiz_id?: string | null
          titel?: string | null
        }
        Update: {
          created_at?: string | null
          datei_url?: string | null
          datei_urls?: string[] | null
          erstellt_von?: string | null
          id?: string
          inhalt?: string
          kalender_termin_id?: string | null
          lead_id?: string
          quelle_notiz_id?: string | null
          titel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notizen_kalender_termin_id_fkey"
            columns: ["kalender_termin_id"]
            isOneToOne: false
            referencedRelation: "kalender_termine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notizen_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notizen_quelle_notiz_id_fkey"
            columns: ["quelle_notiz_id"]
            isOneToOne: false
            referencedRelation: "lead_notizen"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_timeline: {
        Row: {
          angebot_id: string | null
          beschreibung: string | null
          created_at: string
          email_log_id: string | null
          erstellt_von: string | null
          id: string
          lead_id: string
          titel: string
          typ: string
        }
        Insert: {
          angebot_id?: string | null
          beschreibung?: string | null
          created_at?: string
          email_log_id?: string | null
          erstellt_von?: string | null
          id?: string
          lead_id: string
          titel: string
          typ: string
        }
        Update: {
          angebot_id?: string | null
          beschreibung?: string | null
          created_at?: string
          email_log_id?: string | null
          erstellt_von?: string | null
          id?: string
          lead_id?: string
          titel?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_timeline_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_timeline_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_timeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          anlass: string | null
          ansprechpartner_id: string | null
          auftraggeber_kunde_id: string | null
          bereiche: string[] | null
          bereiche_sonstiges: string | null
          beschluss_protokoll_url: string | null
          beschluss_versammlung_am: string | null
          budget_ca: number | null
          created_at: string
          duplikat_band_dismissed: boolean
          duplikat_hinweis: boolean
          eigentuemer_freigabe_status: string | null
          einladung_status: string | null
          einladung_token: string | null
          erfassung_von: string | null
          erstellt_von: string | null
          freigabe_bypass_grund: string | null
          funnel_daten: Json | null
          geloescht_am: string | null
          hausnummer: string | null
          hv_meldung_status: string | null
          id: string
          ist_bauprojekt: boolean
          ist_wiederkehrend: boolean
          kanal: Database["public"]["Enums"]["lead_kanal"]
          ki_session_id: string | null
          ki_zusammenfassung: string | null
          kontakt_email: string | null
          kontakt_nachricht: string | null
          kontakt_name: string | null
          kontakt_telefon: string | null
          kostentraeger: string | null
          kostentraeger_vorgeschlagen: boolean
          kunde_id: string | null
          kunde_objekt_id: string | null
          kundentyp: string | null
          leistung_slug: string | null
          melde_tracking_token: string | null
          melder_einheit: string | null
          melder_email: string | null
          melder_name: string | null
          melder_telefon: string | null
          mieter_vor_ort_at: string | null
          notizen: string | null
          objekt_anlage_id: string | null
          org_freigabe_status: string
          plz: string | null
          preis_max: number | null
          preis_min: number | null
          preis_unsicher: boolean
          produkt_slug: string | null
          schaden_nr: string | null
          schaden_nr_geaendert_am: string | null
          service_modus: string | null
          situation: string | null
          status: Database["public"]["Enums"]["lead_status"]
          storniert_am: string | null
          storniert_grund: string | null
          storniert_von: string | null
          strasse: string | null
          updated_at: string
          versicherungs_nr: string | null
          versicherungs_nr_geaendert_am: string | null
          versicherungsakte_erstellt_am: string | null
          versicherungsakte_pdf_url: string | null
          vor_ort_notizen: string | null
          vorgang_phase: string | null
          wiederkehr_turnus: string | null
          wiedervorlage_datum: string | null
          wiedervorlage_notiz: string | null
          zeitraum: string | null
          zeitraum_bis: string | null
          zeitraum_von: string | null
          zusammengefuehrt_in: string | null
        }
        Insert: {
          anlass?: string | null
          ansprechpartner_id?: string | null
          auftraggeber_kunde_id?: string | null
          bereiche?: string[] | null
          bereiche_sonstiges?: string | null
          beschluss_protokoll_url?: string | null
          beschluss_versammlung_am?: string | null
          budget_ca?: number | null
          created_at?: string
          duplikat_band_dismissed?: boolean
          duplikat_hinweis?: boolean
          eigentuemer_freigabe_status?: string | null
          einladung_status?: string | null
          einladung_token?: string | null
          erfassung_von?: string | null
          erstellt_von?: string | null
          freigabe_bypass_grund?: string | null
          funnel_daten?: Json | null
          geloescht_am?: string | null
          hausnummer?: string | null
          hv_meldung_status?: string | null
          id?: string
          ist_bauprojekt?: boolean
          ist_wiederkehrend?: boolean
          kanal?: Database["public"]["Enums"]["lead_kanal"]
          ki_session_id?: string | null
          ki_zusammenfassung?: string | null
          kontakt_email?: string | null
          kontakt_nachricht?: string | null
          kontakt_name?: string | null
          kontakt_telefon?: string | null
          kostentraeger?: string | null
          kostentraeger_vorgeschlagen?: boolean
          kunde_id?: string | null
          kunde_objekt_id?: string | null
          kundentyp?: string | null
          leistung_slug?: string | null
          melde_tracking_token?: string | null
          melder_einheit?: string | null
          melder_email?: string | null
          melder_name?: string | null
          melder_telefon?: string | null
          mieter_vor_ort_at?: string | null
          notizen?: string | null
          objekt_anlage_id?: string | null
          org_freigabe_status?: string
          plz?: string | null
          preis_max?: number | null
          preis_min?: number | null
          preis_unsicher?: boolean
          produkt_slug?: string | null
          schaden_nr?: string | null
          schaden_nr_geaendert_am?: string | null
          service_modus?: string | null
          situation?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          storniert_am?: string | null
          storniert_grund?: string | null
          storniert_von?: string | null
          strasse?: string | null
          updated_at?: string
          versicherungs_nr?: string | null
          versicherungs_nr_geaendert_am?: string | null
          versicherungsakte_erstellt_am?: string | null
          versicherungsakte_pdf_url?: string | null
          vor_ort_notizen?: string | null
          vorgang_phase?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zeitraum?: string | null
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
          zusammengefuehrt_in?: string | null
        }
        Update: {
          anlass?: string | null
          ansprechpartner_id?: string | null
          auftraggeber_kunde_id?: string | null
          bereiche?: string[] | null
          bereiche_sonstiges?: string | null
          beschluss_protokoll_url?: string | null
          beschluss_versammlung_am?: string | null
          budget_ca?: number | null
          created_at?: string
          duplikat_band_dismissed?: boolean
          duplikat_hinweis?: boolean
          eigentuemer_freigabe_status?: string | null
          einladung_status?: string | null
          einladung_token?: string | null
          erfassung_von?: string | null
          erstellt_von?: string | null
          freigabe_bypass_grund?: string | null
          funnel_daten?: Json | null
          geloescht_am?: string | null
          hausnummer?: string | null
          hv_meldung_status?: string | null
          id?: string
          ist_bauprojekt?: boolean
          ist_wiederkehrend?: boolean
          kanal?: Database["public"]["Enums"]["lead_kanal"]
          ki_session_id?: string | null
          ki_zusammenfassung?: string | null
          kontakt_email?: string | null
          kontakt_nachricht?: string | null
          kontakt_name?: string | null
          kontakt_telefon?: string | null
          kostentraeger?: string | null
          kostentraeger_vorgeschlagen?: boolean
          kunde_id?: string | null
          kunde_objekt_id?: string | null
          kundentyp?: string | null
          leistung_slug?: string | null
          melde_tracking_token?: string | null
          melder_einheit?: string | null
          melder_email?: string | null
          melder_name?: string | null
          melder_telefon?: string | null
          mieter_vor_ort_at?: string | null
          notizen?: string | null
          objekt_anlage_id?: string | null
          org_freigabe_status?: string
          plz?: string | null
          preis_max?: number | null
          preis_min?: number | null
          preis_unsicher?: boolean
          produkt_slug?: string | null
          schaden_nr?: string | null
          schaden_nr_geaendert_am?: string | null
          service_modus?: string | null
          situation?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          storniert_am?: string | null
          storniert_grund?: string | null
          storniert_von?: string | null
          strasse?: string | null
          updated_at?: string
          versicherungs_nr?: string | null
          versicherungs_nr_geaendert_am?: string | null
          versicherungsakte_erstellt_am?: string | null
          versicherungsakte_pdf_url?: string | null
          vor_ort_notizen?: string | null
          vorgang_phase?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zeitraum?: string | null
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
          zusammengefuehrt_in?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_ansprechpartner_id_fkey"
            columns: ["ansprechpartner_id"]
            isOneToOne: false
            referencedRelation: "kunden_ansprechpartner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_auftraggeber_kunde_id_fkey"
            columns: ["auftraggeber_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_objekt_anlage_id_fkey"
            columns: ["objekt_anlage_id"]
            isOneToOne: false
            referencedRelation: "objekt_anlagen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_zusammengefuehrt_in_fkey"
            columns: ["zusammengefuehrt_in"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_status_history: {
        Row: {
          created_at: string
          erstellt_von: string | null
          id: string
          lead_id: string
          notiz: string | null
          status_alt: Database["public"]["Enums"]["lead_status"] | null
          status_neu: Database["public"]["Enums"]["lead_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          erstellt_von?: string | null
          id?: string
          lead_id: string
          notiz?: string | null
          status_alt?: Database["public"]["Enums"]["lead_status"] | null
          status_neu: Database["public"]["Enums"]["lead_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          erstellt_von?: string | null
          id?: string
          lead_id?: string
          notiz?: string | null
          status_alt?: Database["public"]["Enums"]["lead_status"] | null
          status_neu?: Database["public"]["Enums"]["lead_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_metrics: {
        Row: {
          created_at: string
          id: string
          metrik: string
          quelle: string
          wert: Json
          zeitraum_end: string | null
          zeitraum_start: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metrik: string
          quelle: string
          wert?: Json
          zeitraum_end?: string | null
          zeitraum_start?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metrik?: string
          quelle?: string
          wert?: Json
          zeitraum_end?: string | null
          zeitraum_start?: string | null
        }
        Relationships: []
      }
      mieter_feedback: {
        Row: {
          auftrag_id: string | null
          created_at: string
          freitext: string | null
          id: string
          lead_id: string
          sterne: number
        }
        Insert: {
          auftrag_id?: string | null
          created_at?: string
          freitext?: string | null
          id?: string
          lead_id: string
          sterne: number
        }
        Update: {
          auftrag_id?: string | null
          created_at?: string
          freitext?: string | null
          id?: string
          lead_id?: string
          sterne?: number
        }
        Relationships: [
          {
            foreignKeyName: "mieter_feedback_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mieter_feedback_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      nachtraege: {
        Row: {
          akzeptiert_at: string | null
          auftrag_id: string
          created_at: string | null
          gesamt_max: number | null
          gesamt_min: number | null
          gesendet_at: string | null
          grund: string
          handwerker_bestaetigt: boolean | null
          handwerker_bestaetigt_at: string | null
          id: string
          kunde_bestaetigt_at: string | null
          kunde_ip: string | null
          positionen: Json
          status: string
          token: string | null
        }
        Insert: {
          akzeptiert_at?: string | null
          auftrag_id: string
          created_at?: string | null
          gesamt_max?: number | null
          gesamt_min?: number | null
          gesendet_at?: string | null
          grund: string
          handwerker_bestaetigt?: boolean | null
          handwerker_bestaetigt_at?: string | null
          id?: string
          kunde_bestaetigt_at?: string | null
          kunde_ip?: string | null
          positionen?: Json
          status?: string
          token?: string | null
        }
        Update: {
          akzeptiert_at?: string | null
          auftrag_id?: string
          created_at?: string | null
          gesamt_max?: number | null
          gesamt_min?: number | null
          gesendet_at?: string | null
          grund?: string
          handwerker_bestaetigt?: boolean | null
          handwerker_bestaetigt_at?: string | null
          id?: string
          kunde_bestaetigt_at?: string | null
          kunde_ip?: string | null
          positionen?: Json
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nachtraege_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          gelesen: boolean
          handwerker_id: string
          id: string
          leistung_name: string | null
          link: string | null
          projekt_name: string
          typ: string
        }
        Insert: {
          created_at?: string
          gelesen?: boolean
          handwerker_id: string
          id?: string
          leistung_name?: string | null
          link?: string | null
          projekt_name?: string
          typ: string
        }
        Update: {
          created_at?: string
          gelesen?: boolean
          handwerker_id?: string
          id?: string
          leistung_name?: string | null
          link?: string | null
          projekt_name?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_abos: {
        Row: {
          created_at: string
          end_am: string | null
          id: string
          kuendigung_eingereicht_am: string | null
          kuendigungsfrist_wochen: number
          kunde_id: string
          kunde_objekt_id: string
          lohnanteil_prozent: number
          monatspreis_netto: number
          produkt_slug: string
          service_modus: string
          start_am: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_am?: string | null
          id?: string
          kuendigung_eingereicht_am?: string | null
          kuendigungsfrist_wochen?: number
          kunde_id: string
          kunde_objekt_id: string
          lohnanteil_prozent?: number
          monatspreis_netto: number
          produkt_slug: string
          service_modus?: string
          start_am: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_am?: string | null
          id?: string
          kuendigung_eingereicht_am?: string | null
          kuendigungsfrist_wochen?: number
          kunde_id?: string
          kunde_objekt_id?: string
          lohnanteil_prozent?: number
          monatspreis_netto?: number
          produkt_slug?: string
          service_modus?: string
          start_am?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekt_abos_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_abos_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_anlagen: {
        Row: {
          anschaffungswert_eur: number | null
          bezeichnung: string
          created_at: string
          dokument_urls: string[]
          einbau_datum: string | null
          foto_url: string | null
          garantie_bis: string | null
          gewaehrleistung_bis: string | null
          gewerk_id: string
          hersteller: string | null
          id: string
          kunde_id: string
          kunde_objekt_id: string
          letzte_wartung_am: string | null
          modell: string | null
          notiz: string | null
          objekt_einheit_id: string | null
          seriennummer: string | null
          sort_order: number
          standort: string | null
          status: string
          updated_at: string
          wartungsintervall: string | null
        }
        Insert: {
          anschaffungswert_eur?: number | null
          bezeichnung: string
          created_at?: string
          dokument_urls?: string[]
          einbau_datum?: string | null
          foto_url?: string | null
          garantie_bis?: string | null
          gewaehrleistung_bis?: string | null
          gewerk_id: string
          hersteller?: string | null
          id?: string
          kunde_id: string
          kunde_objekt_id: string
          letzte_wartung_am?: string | null
          modell?: string | null
          notiz?: string | null
          objekt_einheit_id?: string | null
          seriennummer?: string | null
          sort_order?: number
          standort?: string | null
          status?: string
          updated_at?: string
          wartungsintervall?: string | null
        }
        Update: {
          anschaffungswert_eur?: number | null
          bezeichnung?: string
          created_at?: string
          dokument_urls?: string[]
          einbau_datum?: string | null
          foto_url?: string | null
          garantie_bis?: string | null
          gewaehrleistung_bis?: string | null
          gewerk_id?: string
          hersteller?: string | null
          id?: string
          kunde_id?: string
          kunde_objekt_id?: string
          letzte_wartung_am?: string | null
          modell?: string | null
          notiz?: string | null
          objekt_einheit_id?: string | null
          seriennummer?: string | null
          sort_order?: number
          standort?: string | null
          status?: string
          updated_at?: string
          wartungsintervall?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objekt_anlagen_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_anlagen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_anlagen_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_anlagen_objekt_einheit_id_fkey"
            columns: ["objekt_einheit_id"]
            isOneToOne: false
            referencedRelation: "objekt_einheiten"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_dokumente: {
        Row: {
          ablauf_datum: string | null
          created_at: string
          erinnerung_tage: number[]
          id: string
          kategorie: string
          kunde_id: string
          kunde_objekt_id: string
          status: string
          storage_path: string | null
          storage_url: string | null
          titel: string
          updated_at: string
        }
        Insert: {
          ablauf_datum?: string | null
          created_at?: string
          erinnerung_tage?: number[]
          id?: string
          kategorie: string
          kunde_id: string
          kunde_objekt_id: string
          status?: string
          storage_path?: string | null
          storage_url?: string | null
          titel: string
          updated_at?: string
        }
        Update: {
          ablauf_datum?: string | null
          created_at?: string
          erinnerung_tage?: number[]
          id?: string
          kategorie?: string
          kunde_id?: string
          kunde_objekt_id?: string
          status?: string
          storage_path?: string | null
          storage_url?: string | null
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekt_dokumente_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_dokumente_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_einheiten: {
        Row: {
          aktiv: boolean
          bezeichnung: string
          created_at: string
          etage: string | null
          id: string
          kunde_objekt_id: string
          sort_order: number
          updated_at: string
          wohnflaeche_m2: number | null
        }
        Insert: {
          aktiv?: boolean
          bezeichnung: string
          created_at?: string
          etage?: string | null
          id?: string
          kunde_objekt_id: string
          sort_order?: number
          updated_at?: string
          wohnflaeche_m2?: number | null
        }
        Update: {
          aktiv?: boolean
          bezeichnung?: string
          created_at?: string
          etage?: string | null
          id?: string
          kunde_objekt_id?: string
          sort_order?: number
          updated_at?: string
          wohnflaeche_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "objekt_einheiten_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_kontakte: {
        Row: {
          aktiv: boolean
          created_at: string
          email: string | null
          id: string
          kunde_id: string
          kunde_objekt_id: string
          name: string
          notiz: string | null
          rolle: string
          sort_order: number
          telefon: string | null
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          email?: string | null
          id?: string
          kunde_id: string
          kunde_objekt_id: string
          name: string
          notiz?: string | null
          rolle: string
          sort_order?: number
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          email?: string | null
          id?: string
          kunde_id?: string
          kunde_objekt_id?: string
          name?: string
          notiz?: string | null
          rolle?: string
          sort_order?: number
          telefon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekt_kontakte_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_kontakte_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_pruefpflichten: {
        Row: {
          created_at: string
          geaendert_am: string | null
          geaendert_von_name: string | null
          geaendert_von_quelle: string | null
          gewerk_id: string | null
          id: string
          intervall_monate: number | null
          kunde_objekt_id: string
          letzte_pruefung: string | null
          nachweis_dokument_id: string | null
          naechste_faellig: string | null
          notiz: string | null
          quelle: string
          status: string
          typ: string
          typ_schluessel: string | null
        }
        Insert: {
          created_at?: string
          geaendert_am?: string | null
          geaendert_von_name?: string | null
          geaendert_von_quelle?: string | null
          gewerk_id?: string | null
          id?: string
          intervall_monate?: number | null
          kunde_objekt_id: string
          letzte_pruefung?: string | null
          nachweis_dokument_id?: string | null
          naechste_faellig?: string | null
          notiz?: string | null
          quelle?: string
          status?: string
          typ: string
          typ_schluessel?: string | null
        }
        Update: {
          created_at?: string
          geaendert_am?: string | null
          geaendert_von_name?: string | null
          geaendert_von_quelle?: string | null
          gewerk_id?: string | null
          id?: string
          intervall_monate?: number | null
          kunde_objekt_id?: string
          letzte_pruefung?: string | null
          nachweis_dokument_id?: string | null
          naechste_faellig?: string | null
          notiz?: string | null
          quelle?: string
          status?: string
          typ?: string
          typ_schluessel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objekt_pruefpflichten_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_pruefpflichten_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      org_freigabe_log: {
        Row: {
          aktion: string
          angebot_id: string | null
          auftraggeber_kunde_id: string
          betrag_eur: number | null
          created_at: string
          erstellt_von: string | null
          id: string
          lead_id: string | null
          notiz: string | null
        }
        Insert: {
          aktion: string
          angebot_id?: string | null
          auftraggeber_kunde_id: string
          betrag_eur?: number | null
          created_at?: string
          erstellt_von?: string | null
          id?: string
          lead_id?: string | null
          notiz?: string | null
        }
        Update: {
          aktion?: string
          angebot_id?: string | null
          auftraggeber_kunde_id?: string
          betrag_eur?: number | null
          created_at?: string
          erstellt_von?: string | null
          id?: string
          lead_id?: string | null
          notiz?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_freigabe_log_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_freigabe_log_auftraggeber_kunde_id_fkey"
            columns: ["auftraggeber_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_freigabe_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      org_hausmeister: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          org_kunde_id: string
          portal_kunde_id: string | null
          portal_zugang: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          org_kunde_id: string
          portal_kunde_id?: string | null
          portal_zugang?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          org_kunde_id?: string
          portal_kunde_id?: string | null
          portal_zugang?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_hausmeister_org_kunde_id_fkey"
            columns: ["org_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_hausmeister_portal_kunde_id_fkey"
            columns: ["portal_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      partner: {
        Row: {
          adresse: string | null
          aktiv: boolean | null
          ansprechpartner: string | null
          created_at: string | null
          email: string | null
          id: string
          kategorie_id: string | null
          name: string
          notizen: string | null
          partner_typ: string | null
          subkategorie: string | null
          telefon: string | null
          website: string | null
        }
        Insert: {
          adresse?: string | null
          aktiv?: boolean | null
          ansprechpartner?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kategorie_id?: string | null
          name: string
          notizen?: string | null
          partner_typ?: string | null
          subkategorie?: string | null
          telefon?: string | null
          website?: string | null
        }
        Update: {
          adresse?: string | null
          aktiv?: boolean | null
          ansprechpartner?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kategorie_id?: string | null
          name?: string
          notizen?: string | null
          partner_typ?: string | null
          subkategorie?: string | null
          telefon?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_kategorie_id_fkey"
            columns: ["kategorie_id"]
            isOneToOne: false
            referencedRelation: "partner_kategorien"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_bautagebuch_anfragen: {
        Row: {
          angefordert_von: string | null
          auftrag_id: string
          created_at: string
          erledigt_at: string | null
          handwerker_id: string
          id: string
          notiz: string | null
          position_ids: string[]
        }
        Insert: {
          angefordert_von?: string | null
          auftrag_id: string
          created_at?: string
          erledigt_at?: string | null
          handwerker_id: string
          id?: string
          notiz?: string | null
          position_ids?: string[]
        }
        Update: {
          angefordert_von?: string | null
          auftrag_id?: string
          created_at?: string
          erledigt_at?: string | null
          handwerker_id?: string
          id?: string
          notiz?: string | null
          position_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "partner_bautagebuch_anfragen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_bautagebuch_anfragen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_bautagebuch_anfragen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_dokumente: {
        Row: {
          ablehnung_grund: string | null
          auftrag_id: string | null
          bezeichnung: string
          created_at: string | null
          datei_url: string | null
          erstellt_von: string | null
          freigegeben_am: string | null
          geloescht_am: string | null
          geloescht_von: string | null
          gueltig_bis: string | null
          handwerker_id: string
          hochgeladen_am: string | null
          id: string
          notizen: string | null
          status: string
          typ: string
        }
        Insert: {
          ablehnung_grund?: string | null
          auftrag_id?: string | null
          bezeichnung: string
          created_at?: string | null
          datei_url?: string | null
          erstellt_von?: string | null
          freigegeben_am?: string | null
          geloescht_am?: string | null
          geloescht_von?: string | null
          gueltig_bis?: string | null
          handwerker_id: string
          hochgeladen_am?: string | null
          id?: string
          notizen?: string | null
          status?: string
          typ: string
        }
        Update: {
          ablehnung_grund?: string | null
          auftrag_id?: string | null
          bezeichnung?: string
          created_at?: string | null
          datei_url?: string | null
          erstellt_von?: string | null
          freigegeben_am?: string | null
          geloescht_am?: string | null
          geloescht_von?: string | null
          gueltig_bis?: string | null
          handwerker_id?: string
          hochgeladen_am?: string | null
          id?: string
          notizen?: string | null
          status?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_dokumente_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_dokumente_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_dokumente_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_handwerker_migration: {
        Row: {
          handwerker_id: string
          migrated_at: string
          partner_id: string
        }
        Insert: {
          handwerker_id: string
          migrated_at?: string
          partner_id: string
        }
        Update: {
          handwerker_id?: string
          migrated_at?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_handwerker_migration_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_handwerker_migration_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_handwerker_migration_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partner"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_kategorien: {
        Row: {
          beschreibung: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          beschreibung?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          beschreibung?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      partner_positions_anfragen: {
        Row: {
          auftrag_id: string
          begruendung: string | null
          created_at: string
          crm_notiz: string | null
          decided_at: string | null
          decided_by: string | null
          handwerker_id: string
          id: string
          nachtrag_id: string | null
          position_id: string | null
          schaetzung_eur: number | null
          schaetzung_minuten: number | null
          status: string
          titel: string
          updated_at: string
        }
        Insert: {
          auftrag_id: string
          begruendung?: string | null
          created_at?: string
          crm_notiz?: string | null
          decided_at?: string | null
          decided_by?: string | null
          handwerker_id: string
          id?: string
          nachtrag_id?: string | null
          position_id?: string | null
          schaetzung_eur?: number | null
          schaetzung_minuten?: number | null
          status?: string
          titel: string
          updated_at?: string
        }
        Update: {
          auftrag_id?: string
          begruendung?: string | null
          created_at?: string
          crm_notiz?: string | null
          decided_at?: string | null
          decided_by?: string | null
          handwerker_id?: string
          id?: string
          nachtrag_id?: string | null
          position_id?: string | null
          schaetzung_eur?: number | null
          schaetzung_minuten?: number | null
          status?: string
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_positions_anfragen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_positions_anfragen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_positions_anfragen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_positions_anfragen_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "auftrag_positionen"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_todos: {
        Row: {
          created_at: string
          erledigt: boolean
          handwerker_id: string
          id: string
          sort_order: number
          titel: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          erledigt?: boolean
          handwerker_id: string
          id?: string
          sort_order?: number
          titel: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          erledigt?: boolean
          handwerker_id?: string
          id?: string
          sort_order?: number
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_todos_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_todos_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_einladungen: {
        Row: {
          bewohner_id: string | null
          created_at: string
          created_by: string | null
          eingeloest_am: string | null
          einheit_id: string | null
          einheit_ref: string | null
          expires_at: string | null
          id: string
          kunde_id: string
          lead_id: string | null
          objekt_id: string | null
          org_hausmeister_id: string | null
          portal_kunde_id: string | null
          status: string
          token: string
        }
        Insert: {
          bewohner_id?: string | null
          created_at?: string
          created_by?: string | null
          eingeloest_am?: string | null
          einheit_id?: string | null
          einheit_ref?: string | null
          expires_at?: string | null
          id?: string
          kunde_id: string
          lead_id?: string | null
          objekt_id?: string | null
          org_hausmeister_id?: string | null
          portal_kunde_id?: string | null
          status?: string
          token: string
        }
        Update: {
          bewohner_id?: string | null
          created_at?: string
          created_by?: string | null
          eingeloest_am?: string | null
          einheit_id?: string | null
          einheit_ref?: string | null
          expires_at?: string | null
          id?: string
          kunde_id?: string
          lead_id?: string | null
          objekt_id?: string | null
          org_hausmeister_id?: string | null
          portal_kunde_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_einladungen_bewohner_id_fkey"
            columns: ["bewohner_id"]
            isOneToOne: false
            referencedRelation: "einheit_bewohner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_einladungen_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "objekt_einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_einladungen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_einladungen_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_einladungen_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_einladungen_org_hausmeister_id_fkey"
            columns: ["org_hausmeister_id"]
            isOneToOne: false
            referencedRelation: "org_hausmeister"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_einladungen_portal_kunde_id_fkey"
            columns: ["portal_kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notifications: {
        Row: {
          body: string
          created_at: string
          empfaenger_user_id: string
          gelesen: boolean
          gelesen_am: string | null
          icon_bg: string | null
          icon_fg: string | null
          icon_glyph: string | null
          id: string
          link: string | null
          titel: string
          typ: string
          vorgang_ref: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          empfaenger_user_id: string
          gelesen?: boolean
          gelesen_am?: string | null
          icon_bg?: string | null
          icon_fg?: string | null
          icon_glyph?: string | null
          id?: string
          link?: string | null
          titel: string
          typ: string
          vorgang_ref?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          empfaenger_user_id?: string
          gelesen?: boolean
          gelesen_am?: string | null
          icon_bg?: string | null
          icon_fg?: string | null
          icon_glyph?: string | null
          id?: string
          link?: string | null
          titel?: string
          typ?: string
          vorgang_ref?: string | null
        }
        Relationships: []
      }
      position_eintraege: {
        Row: {
          auftrag_id: string | null
          beschreibung: string | null
          beschreibung_roh: string | null
          created_at: string
          ereignis_zeit: string | null
          erfasser_akteur: string | null
          erfasst_von: string
          id: string
          position_id: string | null
          quelle: string | null
          rueckdatiert_grund: string | null
          typ: string
          zeit_minuten: number | null
        }
        Insert: {
          auftrag_id?: string | null
          beschreibung?: string | null
          beschreibung_roh?: string | null
          created_at?: string
          ereignis_zeit?: string | null
          erfasser_akteur?: string | null
          erfasst_von?: string
          id?: string
          position_id?: string | null
          quelle?: string | null
          rueckdatiert_grund?: string | null
          typ: string
          zeit_minuten?: number | null
        }
        Update: {
          auftrag_id?: string | null
          beschreibung?: string | null
          beschreibung_roh?: string | null
          created_at?: string
          ereignis_zeit?: string | null
          erfasser_akteur?: string | null
          erfasst_von?: string
          id?: string
          position_id?: string | null
          quelle?: string | null
          rueckdatiert_grund?: string | null
          typ?: string
          zeit_minuten?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "position_eintraege_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_eintraege_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "auftrag_positionen"
            referencedColumns: ["id"]
          },
        ]
      }
      position_eintrag_leistungen: {
        Row: {
          eintrag_id: string
          position_id: string
        }
        Insert: {
          eintrag_id: string
          position_id: string
        }
        Update: {
          eintrag_id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_eintrag_leistungen_eintrag_id_fkey"
            columns: ["eintrag_id"]
            isOneToOne: false
            referencedRelation: "position_eintraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_eintrag_leistungen_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "auftrag_positionen"
            referencedColumns: ["id"]
          },
        ]
      }
      position_material: {
        Row: {
          beleg_foto_id: string | null
          bezeichnung: string
          created_at: string
          einzelpreis: number
          id: string
          menge: number
          position_id: string
        }
        Insert: {
          beleg_foto_id?: string | null
          bezeichnung: string
          created_at?: string
          einzelpreis?: number
          id?: string
          menge?: number
          position_id: string
        }
        Update: {
          beleg_foto_id?: string | null
          bezeichnung?: string
          created_at?: string
          einzelpreis?: number
          id?: string
          menge?: number
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_material_beleg_foto_id_fkey"
            columns: ["beleg_foto_id"]
            isOneToOne: false
            referencedRelation: "eintrag_fotos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_material_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "auftrag_positionen"
            referencedColumns: ["id"]
          },
        ]
      }
      preislisten: {
        Row: {
          aktiv: boolean
          created_at: string
          einheit: string
          gewerk_id: string
          id: string
          kategorie: string | null
          leistung: string
          preis_fix: number | null
          preis_min: number
          preis_typ: string | null
          unterkategorie: string | null
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          einheit: string
          gewerk_id: string
          id?: string
          kategorie?: string | null
          leistung: string
          preis_fix?: number | null
          preis_min: number
          preis_typ?: string | null
          unterkategorie?: string | null
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          einheit?: string
          gewerk_id?: string
          id?: string
          kategorie?: string | null
          leistung?: string
          preis_fix?: number | null
          preis_min?: number
          preis_typ?: string | null
          unterkategorie?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preislisten_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list: {
        Row: {
          abnahme_punkt_id: string | null
          auftrag_id: string
          behoben_at: string | null
          behoben_von: string | null
          beschreibung: string
          created_at: string
          foto_nachher_urls: string[]
          foto_urls: string[]
          gewerk_id: string | null
          id: string
          prioritaet: string
          protokoll_id: string | null
          status: string
        }
        Insert: {
          abnahme_punkt_id?: string | null
          auftrag_id: string
          behoben_at?: string | null
          behoben_von?: string | null
          beschreibung: string
          created_at?: string
          foto_nachher_urls?: string[]
          foto_urls?: string[]
          gewerk_id?: string | null
          id?: string
          prioritaet?: string
          protokoll_id?: string | null
          status?: string
        }
        Update: {
          abnahme_punkt_id?: string | null
          auftrag_id?: string
          behoben_at?: string | null
          behoben_von?: string | null
          beschreibung?: string
          created_at?: string
          foto_nachher_urls?: string[]
          foto_urls?: string[]
          gewerk_id?: string | null
          id?: string
          prioritaet?: string
          protokoll_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_behoben_von_fkey"
            columns: ["behoben_von"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_behoben_von_fkey"
            columns: ["behoben_von"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_gewerk_id_fkey"
            columns: ["gewerk_id"]
            isOneToOne: false
            referencedRelation: "gewerke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_protokoll_id_fkey"
            columns: ["protokoll_id"]
            isOneToOne: false
            referencedRelation: "auftrag_abnahmeprotokolle"
            referencedColumns: ["id"]
          },
        ]
      }
      push_prefs: {
        Row: {
          auth_user_id: string
          push_enabled: boolean
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          push_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          push_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          auth_user_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          portal: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          auth_user_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          portal?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          auth_user_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          portal?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      rechnungen: {
        Row: {
          abschlag_index: number | null
          angebot_handwerker_id: string | null
          angebot_id: string | null
          ansprechpartner_id: string | null
          auftrag_id: string | null
          beleg_typ: string
          bezahlt_at: string | null
          bezug_rechnung_id: string | null
          brutto: number | null
          created_at: string | null
          einleitung: string | null
          erinnerung_21_sent_at: string | null
          erinnerung_7_sent_at: string | null
          ersetzt_durch: string | null
          erstellt_von: string | null
          faellig_am: string | null
          gesendet_at: string | null
          handwerker_id: string | null
          hinweis_35a: boolean | null
          hinweise: string | null
          id: string
          intern_warnung_30_at: string | null
          ist_wiederkehrend: boolean
          korrektur_art: string | null
          korrektur_von: string | null
          kostentraeger: string | null
          kunde_id: string
          kunde_objekt_id: string | null
          leistungszeitraum_bis: string | null
          leistungszeitraum_von: string | null
          lohn_netto: number | null
          lohnanteil_eur: number | null
          lohnanteil_prozent: number | null
          mail_betreff: string | null
          mail_einleitung: string | null
          material_netto: number | null
          mwst_aufschluesselung: Json
          mwst_betrag: number | null
          mwst_satz: number | null
          netto: number | null
          notizen: string | null
          objekt_anlage_id: string | null
          pdf_url: string | null
          positionen: Json
          rechnung_art: string
          rechnungsdatum: string
          rechnungsnummer: string | null
          reklamation_am: string | null
          reklamation_grund: string | null
          reverse_charge_13b: boolean
          richtung: string
          status: string
          updated_at: string | null
          wiederkehr_turnus: string | null
          wiedervorlage_datum: string | null
          wiedervorlage_notiz: string | null
          zahlungsbedingungen: string | null
          zahlungsplan_abschlag_id: string | null
          zahlungsziel_tage: number | null
        }
        Insert: {
          abschlag_index?: number | null
          angebot_handwerker_id?: string | null
          angebot_id?: string | null
          ansprechpartner_id?: string | null
          auftrag_id?: string | null
          beleg_typ?: string
          bezahlt_at?: string | null
          bezug_rechnung_id?: string | null
          brutto?: number | null
          created_at?: string | null
          einleitung?: string | null
          erinnerung_21_sent_at?: string | null
          erinnerung_7_sent_at?: string | null
          ersetzt_durch?: string | null
          erstellt_von?: string | null
          faellig_am?: string | null
          gesendet_at?: string | null
          handwerker_id?: string | null
          hinweis_35a?: boolean | null
          hinweise?: string | null
          id?: string
          intern_warnung_30_at?: string | null
          ist_wiederkehrend?: boolean
          korrektur_art?: string | null
          korrektur_von?: string | null
          kostentraeger?: string | null
          kunde_id: string
          kunde_objekt_id?: string | null
          leistungszeitraum_bis?: string | null
          leistungszeitraum_von?: string | null
          lohn_netto?: number | null
          lohnanteil_eur?: number | null
          lohnanteil_prozent?: number | null
          mail_betreff?: string | null
          mail_einleitung?: string | null
          material_netto?: number | null
          mwst_aufschluesselung?: Json
          mwst_betrag?: number | null
          mwst_satz?: number | null
          netto?: number | null
          notizen?: string | null
          objekt_anlage_id?: string | null
          pdf_url?: string | null
          positionen?: Json
          rechnung_art?: string
          rechnungsdatum?: string
          rechnungsnummer?: string | null
          reklamation_am?: string | null
          reklamation_grund?: string | null
          reverse_charge_13b?: boolean
          richtung?: string
          status?: string
          updated_at?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zahlungsbedingungen?: string | null
          zahlungsplan_abschlag_id?: string | null
          zahlungsziel_tage?: number | null
        }
        Update: {
          abschlag_index?: number | null
          angebot_handwerker_id?: string | null
          angebot_id?: string | null
          ansprechpartner_id?: string | null
          auftrag_id?: string | null
          beleg_typ?: string
          bezahlt_at?: string | null
          bezug_rechnung_id?: string | null
          brutto?: number | null
          created_at?: string | null
          einleitung?: string | null
          erinnerung_21_sent_at?: string | null
          erinnerung_7_sent_at?: string | null
          ersetzt_durch?: string | null
          erstellt_von?: string | null
          faellig_am?: string | null
          gesendet_at?: string | null
          handwerker_id?: string | null
          hinweis_35a?: boolean | null
          hinweise?: string | null
          id?: string
          intern_warnung_30_at?: string | null
          ist_wiederkehrend?: boolean
          korrektur_art?: string | null
          korrektur_von?: string | null
          kostentraeger?: string | null
          kunde_id?: string
          kunde_objekt_id?: string | null
          leistungszeitraum_bis?: string | null
          leistungszeitraum_von?: string | null
          lohn_netto?: number | null
          lohnanteil_eur?: number | null
          lohnanteil_prozent?: number | null
          mail_betreff?: string | null
          mail_einleitung?: string | null
          material_netto?: number | null
          mwst_aufschluesselung?: Json
          mwst_betrag?: number | null
          mwst_satz?: number | null
          netto?: number | null
          notizen?: string | null
          objekt_anlage_id?: string | null
          pdf_url?: string | null
          positionen?: Json
          rechnung_art?: string
          rechnungsdatum?: string
          rechnungsnummer?: string | null
          reklamation_am?: string | null
          reklamation_grund?: string | null
          reverse_charge_13b?: boolean
          richtung?: string
          status?: string
          updated_at?: string | null
          wiederkehr_turnus?: string | null
          wiedervorlage_datum?: string | null
          wiedervorlage_notiz?: string | null
          zahlungsbedingungen?: string | null
          zahlungsplan_abschlag_id?: string | null
          zahlungsziel_tage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rechnungen_angebot_handwerker_id_fkey"
            columns: ["angebot_handwerker_id"]
            isOneToOne: false
            referencedRelation: "angebot_handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_angebot_id_fkey"
            columns: ["angebot_id"]
            isOneToOne: false
            referencedRelation: "angebote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_ansprechpartner_id_fkey"
            columns: ["ansprechpartner_id"]
            isOneToOne: false
            referencedRelation: "kunden_ansprechpartner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_bezug_rechnung_id_fkey"
            columns: ["bezug_rechnung_id"]
            isOneToOne: false
            referencedRelation: "rechnungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_ersetzt_durch_fkey"
            columns: ["ersetzt_durch"]
            isOneToOne: false
            referencedRelation: "rechnungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_korrektur_von_fkey"
            columns: ["korrektur_von"]
            isOneToOne: false
            referencedRelation: "rechnungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_objekt_anlage_id_fkey"
            columns: ["objekt_anlage_id"]
            isOneToOne: false
            referencedRelation: "objekt_anlagen"
            referencedColumns: ["id"]
          },
        ]
      }
      sammelrechnung_positionen: {
        Row: {
          beschreibung: string
          id: string
          kunde_objekt_id: string | null
          leistungszeitraum_bis: string | null
          leistungszeitraum_von: string | null
          lohnanteil_eur: number
          lohnanteil_prozent: number
          netto: number
          objekt_abo_id: string | null
          sammelrechnung_id: string
          sort_order: number
          ust_satz: number
        }
        Insert: {
          beschreibung: string
          id?: string
          kunde_objekt_id?: string | null
          leistungszeitraum_bis?: string | null
          leistungszeitraum_von?: string | null
          lohnanteil_eur?: number
          lohnanteil_prozent?: number
          netto: number
          objekt_abo_id?: string | null
          sammelrechnung_id: string
          sort_order?: number
          ust_satz?: number
        }
        Update: {
          beschreibung?: string
          id?: string
          kunde_objekt_id?: string | null
          leistungszeitraum_bis?: string | null
          leistungszeitraum_von?: string | null
          lohnanteil_eur?: number
          lohnanteil_prozent?: number
          netto?: number
          objekt_abo_id?: string | null
          sammelrechnung_id?: string
          sort_order?: number
          ust_satz?: number
        }
        Relationships: [
          {
            foreignKeyName: "sammelrechnung_positionen_kunde_objekt_id_fkey"
            columns: ["kunde_objekt_id"]
            isOneToOne: false
            referencedRelation: "kunden_objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sammelrechnung_positionen_objekt_abo_id_fkey"
            columns: ["objekt_abo_id"]
            isOneToOne: false
            referencedRelation: "objekt_abos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sammelrechnung_positionen_sammelrechnung_id_fkey"
            columns: ["sammelrechnung_id"]
            isOneToOne: false
            referencedRelation: "sammelrechnungen"
            referencedColumns: ["id"]
          },
        ]
      }
      sammelrechnungen: {
        Row: {
          created_at: string
          gesamt_netto: number | null
          id: string
          kunde_id: string
          pdf_url: string | null
          periode: string
          status: string
        }
        Insert: {
          created_at?: string
          gesamt_netto?: number | null
          id?: string
          kunde_id: string
          pdf_url?: string | null
          periode: string
          status?: string
        }
        Update: {
          created_at?: string
          gesamt_netto?: number | null
          id?: string
          kunde_id?: string
          pdf_url?: string | null
          periode?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sammelrechnungen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          created_at: string
          details: Json | null
          event_typ: string
          id: string
          quelle: string
          resolved: boolean
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_typ: string
          id?: string
          quelle: string
          resolved?: boolean
          severity?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_typ?: string
          id?: string
          quelle?: string
          resolved?: boolean
          severity?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          auftrag_id: string | null
          beschreibung: string | null
          created_at: string
          created_by: string | null
          erledigt: boolean
          erledigt_at: string | null
          faellig_am: string | null
          handwerker_id: string | null
          id: string
          kunde_id: string | null
          lead_id: string | null
          prioritaet: string
          titel: string
          updated_at: string
          zugewiesen_an: string | null
        }
        Insert: {
          auftrag_id?: string | null
          beschreibung?: string | null
          created_at?: string
          created_by?: string | null
          erledigt?: boolean
          erledigt_at?: string | null
          faellig_am?: string | null
          handwerker_id?: string | null
          id?: string
          kunde_id?: string | null
          lead_id?: string | null
          prioritaet?: string
          titel: string
          updated_at?: string
          zugewiesen_an?: string | null
        }
        Update: {
          auftrag_id?: string | null
          beschreibung?: string | null
          created_at?: string
          created_by?: string | null
          erledigt?: boolean
          erledigt_at?: string | null
          faellig_am?: string | null
          handwerker_id?: string | null
          id?: string
          kunde_id?: string | null
          lead_id?: string | null
          prioritaet?: string
          titel?: string
          updated_at?: string
          zugewiesen_an?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_handwerker_id_fkey"
            columns: ["handwerker_id"]
            isOneToOne: false
            referencedRelation: "handwerker_compliance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          aktiv: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          telefon: string | null
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telefon?: string | null
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telefon?: string | null
        }
        Relationships: []
      }
      vor_baubeginn_protokolle: {
        Row: {
          abgeschlossen: boolean | null
          adresse: string | null
          auftrag_id: string
          bereiche_dokumentiert: string[] | null
          besonderheiten: string | null
          created_at: string | null
          datum: string
          erstellt_von: string | null
          foto_urls: string[] | null
          id: string
          kunde_informiert: boolean | null
          vorhandene_schaeden: string | null
        }
        Insert: {
          abgeschlossen?: boolean | null
          adresse?: string | null
          auftrag_id: string
          bereiche_dokumentiert?: string[] | null
          besonderheiten?: string | null
          created_at?: string | null
          datum?: string
          erstellt_von?: string | null
          foto_urls?: string[] | null
          id?: string
          kunde_informiert?: boolean | null
          vorhandene_schaeden?: string | null
        }
        Update: {
          abgeschlossen?: boolean | null
          adresse?: string | null
          auftrag_id?: string
          bereiche_dokumentiert?: string[] | null
          besonderheiten?: string | null
          created_at?: string | null
          datum?: string
          erstellt_von?: string | null
          foto_urls?: string[] | null
          id?: string
          kunde_informiert?: boolean | null
          vorhandene_schaeden?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vor_baubeginn_protokolle_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      vorab_formulare: {
        Row: {
          adresse: string | null
          ausgefuellt_von: string | null
          created_at: string
          daten: Json
          foto_urls: string[] | null
          id: string
          lead_id: string
          notizen: string | null
          vor_ort_datum: string | null
          zugang: string | null
        }
        Insert: {
          adresse?: string | null
          ausgefuellt_von?: string | null
          created_at?: string
          daten?: Json
          foto_urls?: string[] | null
          id?: string
          lead_id: string
          notizen?: string | null
          vor_ort_datum?: string | null
          zugang?: string | null
        }
        Update: {
          adresse?: string | null
          ausgefuellt_von?: string | null
          created_at?: string
          daten?: Json
          foto_urls?: string[] | null
          id?: string
          lead_id?: string
          notizen?: string | null
          vor_ort_datum?: string | null
          zugang?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vorab_formulare_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      vorgang_kommentare: {
        Row: {
          actor_name: string | null
          actor_rolle: string
          created_at: string
          id: string
          kunde_id: string | null
          lead_id: string
          text: string
        }
        Insert: {
          actor_name?: string | null
          actor_rolle: string
          created_at?: string
          id?: string
          kunde_id?: string | null
          lead_id: string
          text: string
        }
        Update: {
          actor_name?: string | null
          actor_rolle?: string
          created_at?: string
          id?: string
          kunde_id?: string | null
          lead_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "vorgang_kommentare_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vorgang_kommentare_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      handwerker_compliance_status: {
        Row: {
          bald_ablaufend: number | null
          compliance_status_berechnet: string | null
          docs_vorhanden: number | null
          firma: string | null
          id: string | null
          name: string | null
          pflicht_gesamt: number | null
        }
        Insert: {
          bald_ablaufend?: never
          compliance_status_berechnet?: never
          docs_vorhanden?: never
          firma?: string | null
          id?: string | null
          name?: string | null
          pflicht_gesamt?: never
        }
        Update: {
          bald_ablaufend?: never
          compliance_status_berechnet?: never
          docs_vorhanden?: never
          firma?: string | null
          id?: string | null
          name?: string | null
          pflicht_gesamt?: never
        }
        Relationships: []
      }
      v_auftrag_tagesspannen: {
        Row: {
          auftrag_id: string | null
          foto_count: number | null
          spanne_bis: string | null
          spanne_von: string | null
          tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auftrag_positionen_auftrag_id_fkey"
            columns: ["auftrag_id"]
            isOneToOne: false
            referencedRelation: "auftraege"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hv_kalender_events: {
        Row: {
          event_beginn: string | null
          event_ende: string | null
          event_typ: string | null
          kunde_id: string | null
          kunde_objekt_id: string | null
          quelle_id: string | null
          titel: string | null
        }
        Relationships: []
      }
      v_objekt_kosten: {
        Row: {
          anzahl_rechnungen: number | null
          brutto_gesamt: number | null
          jahr: string | null
          kostentraeger: string | null
          kunde_id: string | null
          kunde_objekt_id: string | null
          lohnanteil_gesamt: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rechnungen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      compute_handwercher_compliance: {
        Args: { p_handwerker_id: string }
        Returns: string
      }
      crm_vorgaenge_lead_page: {
        Args: {
          p_kunde_id?: string
          p_limit?: number
          p_objekt_id?: string
          p_offset?: number
          p_lead_ids?: string[]
        }
        Returns: {
          id: string
          total_count: number
          updated_at: string
        }[]
      }
      generate_beleg_nummer: { Args: { p_typ?: string }; Returns: string }
      generate_kundennummer: { Args: never; Returns: string }
      generate_rechnungsnummer: { Args: never; Returns: string }
      get_kunde_id_by_portal_token: { Args: { token: string }; Returns: string }
      handwerker_hat_bauleistung: {
        Args: { p_gewerke: string[] }
        Returns: boolean
      }
      handwerker_hat_meister_gewerk: {
        Args: { p_gewerke: string[] }
        Returns: boolean
      }
      is_crm_staff: { Args: never; Returns: boolean }
      is_portal_handwerker: { Args: never; Returns: boolean }
      portal_auth_email_registered: {
        Args: { p_email: string }
        Returns: boolean
      }
      portal_handwerker_angebot_ids: { Args: never; Returns: string[] }
      portal_handwerker_auftrag_ids: { Args: never; Returns: string[] }
      portal_handwerker_id: { Args: never; Returns: string }
      portal_handwerker_kunde_ids: { Args: never; Returns: string[] }
      portal_handwerker_lead_ids: { Args: never; Returns: string[] }
      portal_is_organisation: { Args: never; Returns: boolean }
      portal_kunde_auftrag_ids: { Args: never; Returns: string[] }
      portal_kunde_id: { Args: never; Returns: string }
      portal_kunde_lead_ids: { Args: never; Returns: string[] }
      portal_kunde_portal_modus: { Args: never; Returns: string }
      portal_org_can_write: { Args: never; Returns: boolean }
      portal_org_mitglied_rolle: { Args: never; Returns: string }
      portal_organisation_objekt_ids: { Args: never; Returns: string[] }
      recalc_handwerker_bewertungen: {
        Args: { p_handwerker_id: string }
        Returns: undefined
      }
    }
    Enums: {
      angebot_status:
        | "entwurf"
        | "gesendet_handwerker"
        | "handwerker_akzeptiert"
        | "gesendet_kunde"
        | "kunde_akzeptiert"
        | "abgelehnt"
        | "versendet"
      auftrag_status:
        | "offen"
        | "in_arbeit"
        | "abnahme"
        | "abgeschlossen"
        | "storniert"
        | "wartend"
      formular_phase: "vorab" | "update" | "abnahme"
      formular_typ: "handwerker" | "betreuer"
      lead_kanal:
        | "website"
        | "telefon"
        | "whatsapp"
        | "email"
        | "vor_ort"
        | "sonstiges"
        | "hv_melder_link"
        | "hv_direkt"
        | "hv_einladung"
        | "hv_katalog"
        | "hv_manuell"
        | "servicepaket"
      lead_status:
        | "neu"
        | "kontaktiert"
        | "termin"
        | "angebot"
        | "auftrag"
        | "abgeschlossen"
        | "abgebrochen"
        | "in_bearbeitung"
      termin_typ: "besichtigung" | "beginn" | "abnahme" | "sonstiges"
      user_role: "admin" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      angebot_status: [
        "entwurf",
        "gesendet_handwerker",
        "handwerker_akzeptiert",
        "gesendet_kunde",
        "kunde_akzeptiert",
        "abgelehnt",
        "versendet",
      ],
      auftrag_status: [
        "offen",
        "in_arbeit",
        "abnahme",
        "abgeschlossen",
        "storniert",
        "wartend",
      ],
      formular_phase: ["vorab", "update", "abnahme"],
      formular_typ: ["handwerker", "betreuer"],
      lead_kanal: [
        "website",
        "telefon",
        "whatsapp",
        "email",
        "vor_ort",
        "sonstiges",
        "hv_melder_link",
        "hv_direkt",
        "hv_einladung",
        "hv_katalog",
        "hv_manuell",
        "servicepaket",
      ],
      lead_status: [
        "neu",
        "kontaktiert",
        "termin",
        "angebot",
        "auftrag",
        "abgeschlossen",
        "abgebrochen",
        "in_bearbeitung",
      ],
      termin_typ: ["besichtigung", "beginn", "abnahme", "sonstiges"],
      user_role: ["admin", "manager"],
    },
  },
} as const
