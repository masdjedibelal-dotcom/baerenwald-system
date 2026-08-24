# TEO — Design-Richtung (Buena × Wunderkost), Anti-KI-Template

Ergänzung zum `TEO-CLAUDE-BRIEFING.md`.  
**Ziel:** Claude baut keine Standard-„Prozess + Icon-Cards“-Seite mehr, sondern eine Landing in der Ästhetik von **Buena** (Premium-HV/B2B) und **Wunderkost** (starke Panels / Bento).

Referenzen (vor dem Bau ansehen):
- https://www.buena.com/weg
- https://buena.com/hausverwaltung/munich
- https://www.wunderkost.de/

---

## 1. Was an der aktuellen TEO-HTML schief läuft

Die gebaute Seite folgt dem Briefing **inhaltlich** (Story stimmt), aber **visuell** dem KI-Default:

| KI-Standard (aktuell) | Gewünschte Richtung |
|----------------------|---------------------|
| Viele gleiche Cards mit Icon-Kreis + Titel + Text | Wenige, große Flächen / Statements |
| „How it works“ als 3 Prozess-Steps | Ein starker Ablauf als **Typografie** oder eine Zeile — nicht als Tutorial-UI |
| Section = Eyebrow + H2 + Card-Grid | Section = **eine** große Aussage + optional ein Bild/Panel |
| Snap-Screens = gestapelte Mini-Cards | Snap-Screen = **ein** volles Panel (wie eine App-Folie) |
| Wirkt wie SaaS-Feature-Liste | Wirkt wie ruhige Dienstleistungsmarke (Buena) mit klaren Farbflächen (Wunderkost) |

**Kurz:** Story behalten, **Layout-Muster wegwerfen**.

---

## 2. Was Buena macht (davon viel übernehmen)

**Charakter:** premium, ruhig, viel Weißraum, typografie-geführt, wenig UI-Chrome.

### Muster
1. **Hero zentriert:** kleine Marke/Icon → große Headline (schwarz/dunkel) → zweite Zeile in Grau („Wie sie sein sollte.“) → kurzer Lead → **echtes Foto** (Architektur/Immobilie).
2. **Floating CTA:** eine einzige weiche Card *über* dem Bild (Adresse / Gespräch) — nicht fünf Buttons.
3. **Statement-Blöcke** statt Feature-Grids:  
   `Ansprechpartner. Statt Warteschleife.`  
   `Wir suchen nicht nach Handwerkern. Wir kennen sie.`  
   → Zwei Sätze, Kontrast, viel Luft. Daneben oder darunter **ein** Bild oder ein ruhiger Absatz — **keine** 3er-Card-Reihe.
4. **Leistungen** eher als **dichte, ruhige Liste / feines Grid** mit winzigen Icons — nicht als bunte Produkt-Cards.
5. **CTA-Buttons:** Pill, hoher Kontrast (bei Buena schwarz; bei TEO **Blau**).
6. **Farben sparsam:** Seite fast monochrom + eine Akzentfarbe.

### Für TEO übersetzt
- Hintergrund überwiegend **weiß / `#F5F7FA`**, nicht dunkle Snap-Wände voller Cards.
- Headlines wie Buena-Statements, z.B.:  
  - `Ein Ansprechpartner. Statt Pingpong.`  
  - `Nicht vermitteln. Übernehmen.`  
  - `Sie melden. TEO regelt.`
- Hero: groß **TEO** + Claim + **ein starkes Bild** (Gebäude / Technik am Haus / ruhige Architektur) + eine Floating-CTA-Card „Gespräch vereinbaren“.

---

## 3. Was Wunderkost macht (davon Struktur/Panels übernehmen)

**Charakter:** große abgerundete Farb-Panels, Bento-Grid, Bild + Text in einer Fläche, Marke sofort erkennbar.

### Muster
1. **Page = weißer Rahmen**, Inhalt in **großen Rounded Rects** (Radius ~24–40px).
2. Hero = **ein großes Farbpanel** (bei denen Gelb; bei TEO **Blau-100 oder Blau-Fläche**), links Typo+CTA, rechts starkes Visual/Cutout.
3. Darunter **asymmetrisches Bento**: große und kleine Panels, nicht 3 identische Cards.
4. Farbe trägt Identität — aber klar und freundlich, nicht „Dashboard“.

### Für TEO übersetzt
- Mobile Snap: jeder Screen = **ein** großes Rounded-Panel (Wunderkost-Card als Fullscreen), nicht 3 Mini-Cards darin.
- Desktop: Bento aus 2–5 Panels pro Kapitel, **ungleiche Größen**.
- Amber/Burgunder nur in kleinen Badges/Buttons — Hauptfläche Blau oder Weiß.

---

## 4. Hybrid-Rezept für TEO (verbindlich)

**Buena = Ton, Typo, Weißraum, Statements, Foto, Floating CTA.**  
**Wunderkost = Panel-/Bento-Baukästen und Mobile-Fullscreen-Panels.**

```
Desktop:
  Weißraum + zentrierte/linke Statements (Buena)
  + große Rounded Panels / Bento (Wunderkost)
  + 1 Architektur-/Objektfoto im Hero
  + Floating CTA-Card

Mobile Snap:
  Jeder Screen = 1 Panel (volle Fläche, großer Radius, Padding)
  Max. 1 Headline + 1 Kurztext + optional 1 Visual oder 1 CTA
  KEINE 3er-Card-Grid auf einem Screen
```

---

## 5. Section-Redesign (gleiche Story, neues Layout)

| # | Inhalt bleibt | Neues Layout (statt KI-Cards) |
|---|---------------|--------------------------------|
| 1 Hero | Claim + CTA | Buena-Hero: Typo + Foto + floating CTA-Card. TEO Wordmark groß. |
| 2 Problem | 3 Schmerzen | **Ein** Statement + **eine** Zeile aus 3 kurzen Labels *ohne* Card-Rahmen — oder horizontaler Text-Streifen. Alternativ: 3 Zeilen Typo, keine Icons. |
| 3 How | 3 Steps | Große Typo-Sequenz: `01 Melden` / `02 Kümmern` / `03 Überblick` als **große Zahlen + eine Zeile**, nicht Step-Cards. Oder ein einziges Panel „Melden. Kümmern. Erledigt.“ |
| 4 Leistungen | 4 Themen | Buena-artig: ruhiges 2×2 feines Grid *oder* Wunderkost-Bento mit **unterschiedlichen** Panel-Größen. Keine Icon-Kreise. |
| 5 Warum | 3 Pillars | Drei **Statement-Headlines** untereinander (Buena), viel Luft — keine Pillar-Cards. |
| 6 Für wen | HV | Ein Panel + kurze Bullet-Liste, oder Text + ein Bild. |
| 7 Stimmen | Quotes | Große Zitat-Typo, Name klein — wie Editorial, nicht Testimonial-Cards-Karussell. |
| 8 CTA | Gespräch | Volles Blau-Panel (Wunderkost-Energie) oder Buena-Abschluss mit Input-Card. |
| 9 FAQ | Fragen | Schlichte Accordion-Liste, viel Weiß, keine Cards. |

---

## 6. Typografie — nur Titel + Beschreibung (Anti-KI-Text)

**Regel:** Pro Block maximal **zwei Text-Ebenen** — sonst nichts.

```
Titel      (groß, trägt die Section)
Beschreibung (eine kurze Zeile oder Absatz, deutlich kleiner — aber nicht „micro“)
```

### Typisch KI — strikt verboten

| Muster | Warum es KI wirkt |
|--------|-------------------|
| **Eyebrow** über dem Titel (`Technik. Entlastung. Organisation.`) | SaaS-Template-Signatur |
| Eyebrow + **Strich / Linie / Divider** davor oder danach | Noch schlimmer — „Design-Element statt Inhalt“ |
| Uppercase + `letter-spacing: 0.15em` + 11px | Micro-Label-Look |
| Monospace-Labels (`Objektfoto — …`, `01`, `Step`) | Developer-Portfolio / KI-Placeholder |
| 4–5 Textgrößen pro Section (Eyebrow, H2, Lead, Sub, Caption) | Übererklärt |
| Badges, Tags, Chips unter jeder Headline | Feature-Page-Default |
| „Learn more →“ / Textlinks als dritte Textschicht | Unnötig |
| Winzige Footer-Texte in jeder Section | Aufgeräumt nur im echten Footer |

**Eyebrow-Inhalt** gehört in den **Titel** (z.B. statt Eyebrow + H1 nur: *„Sie melden. TEO regelt.“*) oder in die **Beschreibung** — nie als eigene Zeile darüber.

### Größen & Luft (Richtwerte)

**Desktop** — luftig, groß, Buena-nah:

| Rolle | Größe (clamp) | Gewicht |
|-------|---------------|---------|
| Hero-Titel | `clamp(48px, 6vw, 88px)` | 600–700 |
| Section-Titel | `clamp(36px, 4.5vw, 64px)` | 600 |
| Beschreibung | `clamp(18px, 2vw, 24px)` | 400, `--teo-muted` |
| **Minimum** | nichts unter **16px** auf der ganzen Seite (außer Footer Legal) | — |

- Section-Padding: `clamp(80px, 12vh, 160px)` vertikal
- Max. Textbreite Beschreibung: `28–36ch` (kurz halten)
- Zeilenabstand Titel: `1.05–1.15` · Beschreibung: `1.45–1.55`

**Mobile** — auch viel Platz, nicht vollstopfen:

| Rolle | Größe |
|-------|-------|
| Titel | `clamp(32px, 8vw, 44px)` |
| Beschreibung | `clamp(17px, 4.2vw, 20px)` |
| Screen-Padding | `min 24px` Seite, `min 48px` oben/unten im Snap-Panel |
| Pro Snap-Screen | **1 Titel + 1 Beschreibung** (+ optional CTA oder Bild — kein Extra-Text) |

### Section-Beispiel (richtig)

```
Melden. Kümmern. Erledigt.
TEO übernimmt die Koordination — Sie melden einmal, wir regeln den Rest.
```

### Section-Beispiel (falsch — KI)

```
SO FUNKTIONIERT'S          ← Eyebrow weg
Melden. Kümmern. Erledigt.
Kein Abstimmen. Kein Nachfragen.  ← extra Micro-Zeile weg
TEO übernimmt …           ← Lead
01 · Sie melden           ← Step-Label zu klein
```

Steps/Listen: **Titel pro Punkt** (groß) + **eine Beschreibungszeile** — keine `01`-Micro-Labels, keine dritte Ebene.

---

## 7. Harte Verbote für Claude (Layout + UI)

**Verboten:**
- Icon in farbigem Kreis + Titel + Absatz × 3 oder × 4 (das klassische Feature-Grid)
- „How it works“ als verbundene Prozess-Timeline mit Karten
- Jede Section mit gleichem Card-Muster
- Dunkler Full-Bleed Hintergrund mit gestapelten weißen Cards als Default
- Stock-Illustrationen, 3D-Icons, Gradient-Blobs, Glow
- Inter/Roboto als einzige Persönlichkeit; generische SaaS-Shadows
- **Alles aus Abschnitt 6** (Eyebrows, Striche, Micro-Text, 11px-Labels)

**Erlaubt / gewollt:**
- Viel Weißraum
- Große Titel; Beschreibung in Grau (Buena-Zweitzeile *im* Titel erlaubt: fett + grau in einer Headline)
- Ein starkes Foto
- Große abgerundete Panels (Wunderkost)
- Asymmetrische Layouts
- Pill-Buttons in TEO-Blau
- Amber nur als Progress-Dot

---

## 8. Farben in dieser Ästhetik

- Seite: weiß / `--teo-bg`
- Text: `--teo-text` / `--teo-muted` (Hierarchie wie Buena schwarz/grau)
- Primary CTA: `--teo-blue-500` Pill
- Hero- oder Akzent-Panel: `--teo-blue-100` oder volles `--teo-blue-500` mit weißem Text
- Burgunder: selten (z.B. ein Statement-Wort oder Secondary-Link)
- Amber: Progress-Dot / „Erledigt“-Punkt

---

## 9. Paste-Prompt (Design-Rewrite)

```
Redesign die TEO-Landing komplett visuell.

Referenzen (Ästhetik kopieren, nicht Inhalte):
- Buena WEG: https://www.buena.com/weg — Weißraum, Typo-Hero, Foto, Floating CTA, Statement-Headlines („X. Statt Y.“), ruhige Listen statt Feature-Cards
- Wunderkost: https://www.wunderkost.de/ — große rounded Farb-Panels, Bento, asymmetrisch

Behalte TEO-Inhalte/Story aus dem Briefing.
Farben: Blau primary, Burgunder sparsam, Amber mikro.

TYPO-REGEL (kritisch):
- Pro Block NUR Titel + Beschreibung — keine Eyebrows, keine Striche/Linien, keine Badges, keine 11px-Labels, keine „01/02/03“-Micro-Texte, nichts unter 16px.
- Desktop: große Titel (48–88px Hero, 36–64px Sections), viel Padding (80–160px), kurze Beschreibung (18–24px, max ~36 Zeichen breit).
- Mobile Snap: pro Screen 1 großer Titel + 1 Beschreibung + viel Padding — nicht vollstopfen.

Mobile: Snap-Screens = je EIN großes Panel (kein 3-Card-Grid pro Screen).
Desktop: normales Scrollen, Buena-Weißraum + Wunderkost-Panels.

STRENG VERBOTEN: Icon-Kreis-Feature-Cards, Prozess-Step-Cards, SaaS-Template-Look, Eyebrow+Strich.
Hero MUSS ein Architektur-/Immobilien-Foto + Floating-CTA enthalten (Platzhalter-Bild ok).
```

---

## 10. Merksatz

> **Buena gibt den Ernst und die Luft. Wunderkost gibt die Panels. TEO behält Blau und die HV-Story — aber nicht das KI-Card-Raster.**
