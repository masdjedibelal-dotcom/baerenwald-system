# O3 — Yes/No-Dialoge: EditorSheet → ConfirmPopup

Reine Bestätigungsdialoge (Löschen / Mergen / Ändern) auf `ConfirmPopup` umgestellt. Filter- und Formular-Sheets bleiben `EditorSheet`.

| Datei | Dialog | vorher | nachher |
| --- | --- | --- | --- |
| `KundenListeClient.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `KundenListeClient.tsx` | Zusammenführen (2 Kunden) | EditorSheet | ConfirmPopup |
| `KundeDetailClient.tsx` | Zusammenführen | EditorSheet | ConfirmPopup |
| `VorgaengeListeClient.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `ObjektKontakteSection.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `ObjektKontakteSection.tsx` | Einzel-Löschen | EditorSheet | ConfirmPopup |
| `KundenAnsprechpartnerCard.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `KundenAnsprechpartnerCard.tsx` | Einzel-Löschen | EditorSheet | ConfirmPopup |
| `ObjektBewohnerSection.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `ObjektBewohnerSection.tsx` | Einzel-Löschen | EditorSheet | ConfirmPopup |
| `ObjektEinheitenSection.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `ObjektEinheitenSection.tsx` | Einzel-Löschen | EditorSheet | ConfirmPopup |
| `ObjektEinheitenSection.tsx` | Kunde verknüpfen | EditorSheet | ConfirmPopup |
| `ObjektAnlagenSection.tsx` | Löschen | EditorSheet | ConfirmPopup |
| `ObjektHausmeisterCard.tsx` | Löschen | EditorSheet | ConfirmPopup |
| `KundenObjekteCard.tsx` | Bulk-Löschen | EditorSheet | ConfirmPopup |
| `KundenObjekteCard.tsx` | Einzel-Löschen | EditorSheet | ConfirmPopup |
| `KundenObjektModal.tsx` | Melde-Slug ändern | EditorSheet | ConfirmPopup |
| `KundenOrganisationTab.tsx` | Org-Kennung ändern | EditorSheet | ConfirmPopup |
| `DatenschutzPageClient.tsx` | Löschung bestätigen | EditorSheet | ConfirmPopup |
| `RechnungDetailClient.tsx` | Gutschrift anlegen | EditorSheet | ConfirmPopup |

Nicht umgestellt (Formulare / Filter): u. a. Filter-Sheets in Listen, Kontakt-/Bewohner-/Einheiten-Editoren, Portal-Mail in `KundeDetailClient`, Datenschutz-Frist/Aufschub/Anfrage, „Als Privatkunde anlegen“ in `ObjektEinheitenSection`.
