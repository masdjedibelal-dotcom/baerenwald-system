# TEO Landing — Prompt für Claude Designer

Kopiere ab **„PROMPT START“** bis **„PROMPT ENDE“** 1:1 in Claude Designer.

---

## PROMPT START

Bau eine responsive Marketing-Landingpage für die Marke **TEO**.

### Was TEO ist
TEO ist ein **digitalisierter technischer Dienstleister für Hausverwaltungen** — keine reine Software, keine Handwerker-Vermittlung.
Die HV meldet ein Thema → TEO organisiert, koordiniert, lässt ausführen, dokumentiert und schließt ab.
Gefühl: „Ich gebe es ab und weiß, dass sich jemand kümmert.“

**TEO** = Technik · Entlastung · Organisation  
Claims: „Einfach melden. TEO regelt.“ · „TEO kümmert sich.“ · „Melden. Kümmern. Erledigt.“

Ton: Sie-Form, ruhig, verlässlich, B2B. Kurz. Kein Startup-Slang (kein Crew/Desk/Hub).

---

### Technik & Layout

**Mobile (≤767px) — TikTok-Style**
- Jede Section = `100dvh`, `scroll-snap-type: y mandatory`
- Schlicht, card-first, ein Gedanke pro Screen
- Unten: Progress-Dots + optional sticky CTA
- Weiches Snap, wenig Text, große Headlines

**Desktop (≥768px) — normale Landing**
- **Kein** Snap, normaler Document-Flow
- Gleiche Story/Inhalte, mehr Luft, Grids, 2-Spalten wo sinnvoll

Self-contained HTML + CSS (+ wenig JS). `prefers-reduced-motion` beachten.

---

### Farben (CSS-Variablen)

```css
--teo-blue-900: #0B1F3A;
--teo-blue-500: #1E5FA8;   /* Primary */
--teo-blue-100: #E8F1FA;
--teo-burgundy-500: #8B2E3C; /* Secondary, sparsam */
--teo-burgundy-100: #F7ECEE;
--teo-amber-500: #E8A317;  /* Mikro-Akzent: Dots, Checks */
--teo-amber-100: #FFF6E0;
--teo-bg: #F5F7FA;
--teo-surface: #FFFFFF;
--teo-border: #E2E8F0;
--teo-text: #0F172A;
--teo-muted: #64748B;
```

Blau dominant. Burgunder sparsam. Amber nur Dots/Badges — nie große Flächen.  
Kein Lila, kein Neon, kein Dark-Mode-Default.

Typo: Display mit Charakter (z.B. Fraunces/Literata) + UI Sans (DM Sans/Manrope). Nicht Inter/Roboto/Arial.

Logo: Wordmark **TEO** groß im Hero (3 Buchstaben, monogramm-fähig).

---

### STORY-STRUKTUR (Reihenfolge verbindlich)

Baue genau diese narrative Arc. Copy unten ist **Arbeitsstand / Entwurf** — darf leicht geglättet werden, Struktur und Botschaft bleiben.

---

#### Screen / Section 1 — HERO (Versprechen)
**Job:** Marke setzen + Abgabe-Versprechen in 3 Sekunden.

- Eyebrow: `Technik. Entlastung. Organisation.`
- H1: `Einfach melden. TEO regelt.`
- Lead: `TEO übernimmt die technische Koordination für Ihre Hausverwaltung — von der Meldung bis zur dokumentierten Erledigung.`
- Primary CTA: `Gespräch vereinbaren`
- Secondary CTA: `So funktioniert’s` → #how
- Optional Badge: `Ein Ansprechpartner. Alles geregelt.`

Mobile: TEO groß, Headline, 1 Satz, 1–2 Buttons. Keine Stats.

---

#### Screen / Section 2 — PROBLEM (Warum das überhaupt)
**Job:** Schmerz der HV sichtbar machen — ohne Drama.

Headline: `Technik kostet Sie Zeit — nicht nur Geld.`  
Sub: `Was in der Verwaltung hängen bleibt:`

3 Cards:
1. **Hinterherlaufen** — Handwerker, Termine, Rückrufe. Sie koordinieren, statt zu verwalten.
2. **Kein Überblick** — Wer macht was? Was ist offen? Was ist dokumentiert?
3. **Kein fester Draht** — Jedes Thema eine neue Baustelle. Kein Partner, der es durchzieht.

---

#### Screen / Section 3 — HOW (Der Ablauf) · id=`#how`
**Job:** Zeigen, wie einfach Abgabe ist.

Eyebrow: `So funktioniert’s`  
Headline: `Melden. Kümmern. Erledigt.`  
Sub: `Kein Abstimmen. Kein Nachfragen. Kein Stress.`

3 Steps (Cards oder nummerierte Reihe):
1. **Sie melden einmal.**  
   Anliegen rein — digital oder kurz per Gespräch. Mehr Koordination brauchen Sie nicht.
2. **TEO kümmert sich.**  
   Organisation, Ausführung, Nachfassen. Sie bleiben informiert, müssen aber nicht treiben.
3. **Sie behalten den Überblick.**  
   Status, Dokumentation, Abschluss. Sauber erledigt — nachvollziehbar für Ihre Akte.

CTA Textlink: `Leistungen ansehen` → #leistungen

---

#### Screen / Section 4 — LEISTUNGEN · id=`#leistungen`
**Job:** Was TEO konkret übernimmt (nicht jedes Gewerk auflisten).

Eyebrow: `Was TEO übernimmt`  
Headline: `Technische Themen — aus einer Hand.`  
Sub: `Sie melden das Thema. TEO macht den Rest.`

4 Cards:
1. **Störungen & Instandhaltung** — Defekte, Reparaturen, typische Objekt-Themen.
2. **Koordination & Umsetzung** — Gewerke, Termine, Nachfassen bis es sitzt.
3. **Dokumentation & Abschluss** — Protokolle, Nachweise, klarer Status für Ihre Verwaltung.
4. **Wiederkehrende Betreuung** — Laufende technische Entlastung, nicht nur Einzelfälle.

Kein endloses Gewerke-Karussell auf Mobile — Cards reichen.

---

#### Screen / Section 5 — WARUM TEO · id=`#warum`
**Job:** Differenzierung — warum Abgabe zu TEO, nicht „noch ein Handwerker“.

Eyebrow: `Warum TEO`  
Headline: `Nicht vermitteln. Übernehmen.`

3 Pillar-Cards:
1. **Ein Ansprechpartner** — Eine Nummer. Eine Verantwortung. Kein Pingpong.
2. **Es wird geregelt** — Nicht nur angenommen — organisiert, ausgeführt, abgeschlossen.
3. **Alles im Blick** — Sie geben ab und behalten trotzdem Transparenz.

Desktop: optional dunkler Block (`--teo-blue-900`) mit hellen Cards.

---

#### Screen / Section 6 — FÜR WEN
**Job:** Zielgruppe klar machen (Hausverwaltungen).

Headline: `Gebaut für Hausverwaltungen.`  
Lead: `Für Teams, die Technik abgeben wollen — und trotzdem den Überblick behalten müssen.`

Benefit-Bullets (Card oder Liste):
- Weniger Koordinationsaufwand im Alltag
- Klarer Status statt Nachfragen-Chaos
- Dokumentation, die in Ihre Prozesse passt
- Ein Partner statt vieler Einzelketten

Kleine Zeile: `Privatkunden und Einzelaufträge sind nicht der Fokus dieser Seite.` (nur wenn es hilft — sonst weglassen)

---

#### Screen / Section 7 — SOCIAL PROOF
**Job:** Vertrauen (Platzhalter ok).

Eyebrow: `Stimmen`  
Headline: `Was Verwaltungen entlastet.`

2–3 Quote-Cards (Platzhalter):
1. „Endlich jemand, der das Thema durchzieht — ohne dass wir dreimal nachfassen.“ — *Hausverwaltung, München*
2. „Wir melden. TEO regelt. Der Status ist klar.“ — *Objektbetreuung*
3. „Weniger Telefonitis, mehr erledigte Vorgänge.“ — *Verwaltungsleitung*

Mobile: 1 Quote pro Screen **oder** gestapelte Cards auf einem Screen — schlicht halten.

---

#### Screen / Section 8 — FINAL CTA
**Job:** Conversion.

Vollflächen Blau (`--teo-blue-500` oder `--teo-blue-900`).  
Headline: `Bereit, dass sich jemand kümmert?`  
Sub: `Schildern Sie uns kurz Ihr Setup — wir zeigen Ihnen, wie TEO entlastet.`  
Primary (hell auf Blau): `Gespräch vereinbaren`  
Ghost: `TEO anrufen`

---

#### Screen / Section 9 — FAQ · id=`#faq`
**Job:** Einwände entkräften.

Headline: `Kurz erklärt.`

1. **Ist TEO eine Software?**  
   Nein. TEO ist ein Dienstleister — digital organisiert. Die Technik im Hintergrund hilft uns, für Sie einfach und nachvollziehbar zu arbeiten.

2. **Für wen ist TEO?**  
   Für Hausverwaltungen, die technische Themen abgeben und trotzdem den Überblick behalten wollen.

3. **Was kann ich melden?**  
   Typische technische Objekt-Themen: Störungen, Instandhaltung, koordinierungsbedürftige Aufträge. Im Gespräch klären wir Umfang und Einstieg.

4. **Behalte ich den Überblick?**  
   Ja. Abgabe heißt nicht Blindflug — Status und Dokumentation bleiben für Sie nachvollziehbar.

5. **Wie starte ich?**  
   Kurz Gespräch vereinbaren oder Anliegen skizzieren. Wir schlagen den saubersten Einstieg vor.

6. **Wo seid ihr unterwegs?**  
   Fokus Region München / Umgebung *(Platzhalter — final anpassen).*

---

#### Footer · id=`#kontakt`
- Wordmark TEO  
- Tagline: `Technik. Entlastung. Organisation.`  
- Links: So funktioniert’s · Leistungen · FAQ · Impressum · Datenschutz  
- Kontaktzeile: E-Mail / Telefon (Platzhalter)  
- © TEO

---

### Nav (Desktop + Mobile-Menü)
Logo TEO · So funktioniert’s · Leistungen · Warum · FAQ · CTA `Gespräch vereinbaren`

---

### Do / Don’t
**Do:** TEO groß; Cards; Mobile Snap; Desktop normal; Blau dominant.  
**Don’t:** Bärenwald-Grün; Snap auf Desktop; Stats im Hero; Dashboard-Look; lila Gradients; englische Startup-Wörter.

### Deliverable
Eine HTML-Datei, mobile-first, Desktop ohne Snap, Anker-IDs, fertige Story oben umsetzen.

## PROMPT ENDE

---

## Story auf einen Blick (für euch intern)

```
1 Hero      → Versprechen: melden / TEO regelt
2 Problem   → Schmerz: Zeit, Chaos, kein Draht
3 How       → Mechanik: melden → kümmern → Überblick
4 Offer     → Was: Störung, Koordination, Doku, Betreuung
5 Why       → Warum TEO: Ansprechpartner / geregelt / Überblick
6 Audience  → Für HV
7 Proof     → Stimmen
8 CTA       → Gespräch
9 FAQ       → Einwände
  Footer    → Kontakt / Legal
```

Narrativer Kern in einem Satz:

> **Hausverwaltung gibt technische Koordination ab → TEO kümmert sich → Ergebnis ist erledigt und nachvollziehbar.**
