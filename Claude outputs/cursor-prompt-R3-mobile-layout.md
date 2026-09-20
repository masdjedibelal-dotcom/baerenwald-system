# Cursor-Prompt R3 — Mobile-Layoutfehler aus dem Gerätetest

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, eigener Commit, nach R2.

---

## Auftrag R3: Fünf konkrete Layoutfehler auf dem Telefon beheben

**Alle fünf Punkte sind am Gerät fotografiert und im Code lokalisiert.** Ursache, Datei und Zeile
stehen jeweils dabei. Es ist nichts zu entscheiden und nichts zu suchen. Baue keine neuen
Komponenten; alles unten ist eine Korrektur an bestehenden Klassen und bestehendem JSX.

Gemessen wird am Ende an echten Geräten-Breiten: **390px** (iPhone 14/15) und **360px**
(kleines Android). Beide müssen sauber sein, ohne horizontales Scrollen der Seite.

---

### 1. Objekt-Karten im Kunden-Detail: Text läuft aus der Box

**Datei:** `src/components/kunden/KundenObjekteCard.tsx`, Mobile-Zweig Zeile ~235-242.
**CSS:** `src/styles/mock-design-system.css:21039-21061`.

Sichtbar war: „WEG Gabelsbergerstraße Gabelsberger…" und „WEG Teststraße Teststraße 20, 80539 M…"
laufen über den Kartenrand hinaus.

Ursache: `.ap-mobile-card--row .ap-mobile-card__name` und `.ap-mobile-card__meta` setzen
`white-space: normal` zusammen mit `overflow: hidden; text-overflow: ellipsis`, haben aber **kein**
`overflow-wrap`. Ein einzelnes langes Wort wie „Gabelsbergerstraße" bricht damit nicht um und wird
auch nicht gekürzt — es läuft heraus. `text-overflow: ellipsis` wirkt nur bei `white-space: nowrap`,
ist hier also wirkungslos.

Zu tun:

1. Beiden Regeln `overflow-wrap: anywhere;` geben (nicht `break-all`, das zerhackt kurze Wörter).
   `text-overflow: ellipsis` in diesen beiden Regeln entfernen — es ist dort Attrappe.
2. `.ap-mobile-card__name` auf **zwei** Zeilen begrenzen, `.ap-mobile-card__meta` auf **eine**,
   jeweils per `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: N;
   overflow: hidden;`. So bleibt die Karte höhengleich, ohne dass Text verschwindet.
3. `.ap-mobile-card--row` selbst bekommt `min-width: 0`. Der Flex-Container hat es heute nicht, nur
   sein Kind `.ap-mobile-card__hit.btn`.
4. Desktop-Zweig, Zeile ~244-249: `.ap-list__name-cell`
   (`mock-design-system.css:20911-20919`) hat **kein** `min-width: 0` — deshalb sprengt diese Zelle
   ihre Rasterspalte. `min-width: 0; overflow: hidden;` ergänzen und dieselbe Zeilenbegrenzung wie
   in Punkt 2 anwenden.
5. Dieselbe Prüfung für alle weiteren Verwendungen von `.ap-mobile-card__name` /
   `.ap-mobile-card__meta` im Repo durchziehen (`grep -rn "ap-mobile-card__" src/`). Die Korrektur
   sitzt in der gemeinsamen CSS-Regel, also wirkt sie überall — belege im Bericht, in welchen
   Listen du sie nachgeprüft hast.

---

### 2. Untere Aktionsleiste: „Rechnu…" und „Angebot erste…"

**Datei:** `src/components/layout/DetailActionsBar.tsx`.
**CSS:** `src/styles/mock-design-system.css:10923-10974`.

Ursache, drei Teile zusammen:
- `.detail-mobile-action-bar__secondary` hat `max-width: 34%` (Zeile ~10934). Bei 390px sind das
  ~118px minus 24px Innenabstand → rund 94px für „Rechnung erstellen". Darum „Rechnu…".
- Die primäre Aktion wird in `DetailActionsBar.tsx:241` immer mit `compact={false}` gerendert, also
  immer mit vollem Text, und teilt sich den Rest mit dem 44–72px breiten Überlauf-Knopf.
- `DetailActionsBar.tsx:230`: `compact` wird für die übrigen Plätze nur dann wahr, wenn ein
  `shortLabel` gesetzt ist. Gesetzt ist es im ganzen Repo genau zweimal
  (`RechnungDetailClient.tsx:518` und `:527`).

Zu tun:

6. Jede Verwendung von `DetailActionsBar` bekommt für **jede** Aktion ein `shortLabel`. Betroffene
   Dateien: `kunden/KundeDetailClient.tsx:653-674`, `auftraege/AuftragDetailClient.tsx:1176`,
   `objektakte/ObjektAkteDetailClient.tsx:352`, `angebote/AngebotDetailPageClient.tsx:778`,
   `handwerker/HandwerkerDetailClient.tsx:581`, `rechnungen/RechnungDetailClient.tsx:893`,
   `anfragen/AnfrageDetailClient.tsx:1019`.
   Die Kurzform ist **ein** Wort und steht in `src/lib/copy/buttons.ts` neben der Langform, nicht
   im Komponenten-Code: z. B. `rechnungErstellen: 'Rechnung erstellen'` /
   `rechnungErstellenKurz: 'Rechnung'`, `angebotErstellen` / `angebotErstellenKurz: 'Angebot'`.
   Keine Verben abkürzen, keine Auslassungspunkte im Text, keine Fantasiewörter.
7. `DetailActionsBar` entscheidet selbst, wann gekürzt wird, statt es dem Aufrufer zu überlassen:
   bei Layout `pair` oder `triple` **oder** wenn ein Menü-Knopf daneben steht, gilt `compact` für
   alle Plätze — auch für den primären. Bei `solo` bleibt der volle Text.
8. `max-width: 34%` bzw. `30%` bei `triple` ersatzlos entfernen. Die Breite verteilt das Flexbox-
   Modell: sekundär und Gefahr `flex: 1 1 auto`, primär `flex: 1.6 1 auto`, Überlaufknopf fest
   `flex: 0 0 44px`. Alle mit `min-width: 0`.
9. `truncate` am Label (`DetailActionsBar.tsx:79`) bleibt als letzte Absicherung. Die
   Hook-Klasse `.detail-mobile-action-bar__label` hat heute **keine** CSS-Regel — entweder eine
   anlegen (Zeilenhöhe, Schriftgrad aus dem Token) oder die Klasse entfernen. Keine toten Klassen
   stehen lassen.
10. Abnahme dieses Punktes: bei 360px zeigen alle sieben Detail-Screens vollständige Wörter ohne
    Auslassungspunkte in der Leiste.

---

### 3. Dashboard-Kacheln: Zahlen und Beschriftungen angeschnitten

**Datei:** `src/components/dashboard/DashboardClient.tsx:536-550`.
**CSS:** `src/styles/mock-design-system.css:4181-4194`, Mobile-Block `:4208-4227`.

Ursache: `.kpi-val` hat `line-height: 1`. Auf dem Telefon ist `--fs-head` rund **25px**
(`src/app/globals.css:234-241`: `calc(22px * 1.14)`). Eine Zeilenhöhe von exakt 1 schneidet
Unterlängen und den Überstand von Ziffern ab. `.kpi-label` steht bei ~14,8px und bricht bei
„Offene Rechnungen" in zwei Zeilen; die Kachel hat aber nur `min-height: 78px` bei 34px Icon.

Zu tun:

11. `.kpi-val`: `line-height: 1.15` statt `1`. Zusätzlich `font-variant-numeric: tabular-nums`,
    damit die Zahlen in den vier Kacheln auf gleicher Breite stehen.
12. Im Mobile-Block: `.kpi-tile` bekommt `align-items: flex-start` statt `center` und
    `min-height: 88px`. Der Text sitzt damit oben und hat Platz für zwei Zeilen Beschriftung.
13. `.kpi-label` auf zwei Zeilen begrenzen (`-webkit-line-clamp: 2`) und `overflow-wrap: anywhere`.
14. Das `minWidth: 0` als Inline-Style in `DashboardClient.tsx:544` entfernen — die Regel
    `.kpi-tile > div:last-child { min-width: 0; flex: 1 }` (`:4177-4179`) macht das schon. Inline-
    Styles, die CSS doppeln, sind genau die Stellen, an denen später niemand mehr weiß, was gilt.
15. Prüfen, ob bei 360px in zwei Spalten „Offene Rechnungen" vollständig lesbar ist. Wenn nicht,
    nicht die Schrift verkleinern, sondern im Mobile-Block auf **eine** Spalte gehen
    (`grid-template-columns: 1fr`) und die Kachel flacher machen. Entscheide das anhand der
    Messung, nicht nach Gefühl, und schreib die Messung in den Bericht.

---

### 4. Zeitraum-Chips: Reihe rechts abgeschnitten, ohne Hinweis aufs Scrollen

**Datei:** `src/components/dashboard/DashboardClient.tsx:46-118`, gerendert `:529`.
**CSS:** `src/styles/mock-design-system.css:9622-9630` (allgemein) und `:4288-4315`
(Dashboard-Sonderfall).

Ursache: die allgemeine Mobile-Regel macht `.chiprow` scrollbar und lässt sie mit
`margin: 0 -14px; padding: 0 14px 2px` bis an den Bildschirmrand laufen — das ist die übliche
Geste, die zeigt „hier geht es weiter". Der Dashboard-Sonderfall
`.dashboard-page .dash-zeitraum-chips .chiprow` (Spezifität 0,3,0 schlägt 0,1,0) setzt genau das
wieder zurück: `margin-left: 0; margin-right: 0; padding-left: 0; padding-right: 2px`. Zusammen mit
`max-width: calc(100% - 48px)` (Platz für den KI-Knopf daneben) endet die Reihe hart an einer Kante,
mitten in einem Chip, und die Bildlaufleiste ist ausgeblendet. Es sieht kaputt aus, nicht
scrollbar.

Zu tun:

16. Im Dashboard-Sonderfall die Randblende wiederherstellen: negative Außenabstände in Höhe des
    Seiten-Innenabstands und derselbe Betrag als Innenabstand, plus `scroll-padding-inline`, damit
    ein angeklickter Chip nicht unter der Kante klebt.
17. Rechts eine Verlauf-Maske setzen, solange nicht ans Ende gescrollt ist
    (`mask-image` mit `linear-gradient`, per `scroll-snap`/Scroll-Position nicht nötig — eine
    statische Maske reicht und ist billiger). Damit ist sichtbar, dass es weitergeht.
18. `scroll-snap-type: x proximity` auf die Reihe, `scroll-snap-align: start` auf den Chip. Die
    Reihe rastet dann auf ganzen Chips ein statt mitten im Wort.
19. Der aktive Chip wird beim Laden in den sichtbaren Bereich gescrollt
    (`scrollIntoView({ inline: 'center', block: 'nearest' })`, ohne `smooth` beim ersten Aufbau).
    Heute steht „Gesamt" bei aktivem „Gesamt" außerhalb.
20. `max-width: calc(100% - 48px)` durch ein Flex-Verhältnis ersetzen, damit die Zahl 48 nicht an
    die Größe des Nachbarknopfs gebunden ist, die niemand nachzieht, wenn sie sich ändert.

---

### 5. KI-Assistent: Einleitungstext aus dem Bild gescrollt

**Datei:** `src/components/assistent/AssistentPanel.tsx`.
**CSS:** `src/styles/mock-design-system.css:10431-10467` (Mobile), `:10083-10121`.

Ursache, zwei Dinge:
- Der Einleitungsblock `.assistent-panel__start` (`:10095-10104`) hat `flex: 1` und
  `justify-content: center` **innerhalb** des scrollbaren Bereichs `.assistent-panel__body`, dazu
  `padding-bottom: 48px`. Ein zentrierter Inhalt in einem scrollenden Behälter sitzt nie verlässlich
  mittig — sobald die Tastatur den sichtbaren Bereich verkleinert, rutscht er aus dem Bild.
- `AssistentPanel.tsx:389-391` scrollt bei `chatStarted` auf `bottomRef`. `chatStarted` ist
  (`:289-290`) auch dann wahr, wenn ein `autoSession` gesetzt ist — etwa beim Öffnen aus einer
  Dashboard-Kachel (`DashboardClient.tsx:499-516`). Dann wird sofort nach unten gescrollt, obwohl
  oben noch der Einleitungstext steht.

Zu tun:

21. `.assistent-panel__start` nicht mehr im Scrollbereich zentrieren: `flex: 0 0 auto`,
    `justify-content` weg, `padding: 20px 16px 24px`, Ausrichtung nach links (der Text ist eine
    Ansprache, keine Plakatschrift). Der Scrollbereich beginnt damit oben, wo der Nutzer liest.
22. `.assistent-panel__start-headline`: `clamp(1.25rem, 4vw, 1.55rem)` durch den vorhandenen
    Typo-Token `var(--fs-head)` ersetzen. Ein eigener `clamp` an einer einzelnen Stelle ist genau
    die Uneinheitlichkeit, die wir abbauen.
23. Auto-Scroll nur bei **echtem** Gesprächsbeginn: die Bedingung in `:389-391` von `chatStarted`
    auf „es existiert mindestens eine Nachricht" umstellen. `autoSession` allein löst kein
    Scrollen mehr aus.
24. `useVisualViewportFrame` (`src/hooks/useVisualViewportFrame.ts:31-42`) schreibt
    `top/left/right/bottom/width/height/maxHeight/minHeight` als Inline-Styles direkt auf das
    Element und überschreibt damit das komplette CSS des Panels. Das bleibt, weil es für die
    Tastatur in der PWA gebraucht wird — aber es setzt nur noch `height` und `top`, nicht acht
    Eigenschaften, und es kommentiert im Code, warum. Alles andere kommt aus CSS.
25. Prüfen mit offener Tastatur: Kopfzeile sichtbar, Eingabefeld sichtbar, Einleitungstext oben,
    kein Sprung beim Öffnen.

---

### Abnahme insgesamt

- `npx tsc --noEmit` und `npm run build` grün.
- Sichtprüfung bei **390px und 360px** in: Kunden-Detail (Reiter Objekte), einem Angebots-Detail,
  einem Rechnungs-Detail, Dashboard, KI-Assistent. Screenshots in `docs/mobile-audit/` ablegen,
  Benennung wie die vorhandenen.
- Kein horizontales Scrollen der Seite auf keinem der geprüften Screens.
- Keine Auslassungspunkte mehr in der unteren Aktionsleiste.
- Keine neue Komponente, kein neuer Token, keine neue Farbe.

### Bericht

In den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`: je Punkt 1–5 was geändert wurde, die
gemessenen Werte bei 360px für Punkt 3 (Entscheidung ein- oder zweispaltig) und die Liste der
Dateien, in denen `shortLabel` ergänzt wurde.
