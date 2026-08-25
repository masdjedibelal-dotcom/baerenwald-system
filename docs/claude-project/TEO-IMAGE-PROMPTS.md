# TEO — Gap zu Buena + Bild-Prompts

Stand: nach `TEO Landingpage v2.html`

---

## Was v2 schon besser macht

- Statements statt Icon-Feature-Cards (`Sie melden. TEO regelt.` / `Nicht vermitteln. Übernehmen.`)
- How als große Zahlen 01–03, nicht Tutorial-Cards
- Floating-CTA-Idee am Hero
- Weniger „SaaS-Grid“-Gefühl

---

## Was zu Buena noch fehlt

| Buena | TEO v2 | Lücke |
|-------|--------|-------|
| Echtes Architektur-Foto (Gebäude-Cutout) | Nur Platzhalter-Text „Objektfoto…“ | **Kein echtes Bild** — größte Lücke |
| Floating-Card sitzt **über** dem Foto (Glas/weich) | CTA-Card ohne echtes Bild darunter | Bild + Overlay-Layer fehlen |
| Extreme Weißraum / zentrierter Hero | Noch dichter / mehr Sektionen | Weiter ausdünnen |
| Feines Leistungs-Grid mit Mini-Icons | 4 Text-Blöcke | Ok, aber Buena wirkt leichter |
| Statement + **Bild** in späteren Sections | Nur Typo | 1–2 weitere Visuals fehlen |
| Foto wirkt „geschnitten“ auf Weiß | — | Cutout-Stil nachbauen |
| Monochrom + 1 CTA-Farbe | Blau ok | Amber/Burgunder weiter minimal |

**Priorität 1:** Hero-Gebäudefoto. Ohne das bleibt die Seite „Text-Landing“, Buena wirkt durch das Foto premium.

**Priorität 2:** Ein zweites Visual für „Netzwerk / Handwerk kennen wir“ oder „Überblick/Transparenz“ (ruhig, editorial).

**Priorität 3:** Optionale Portrait-ähnliche, neutrale Testimonial-Atmosphäre (oder gar keine Fotos dort — nur Typo).

---

## Bild-Set für TEO (was erzeugen)

| Datei | Einsatz | Format |
|-------|---------|--------|
| `teo-hero-building.png` | Hero unter Floating-CTA | Quer, Gebäude-Cutout auf Weiß/hell |
| `teo-hero-building-mobile.jpg` | Mobile Snap Hero | Hochkant-Crop derselben Fassade |
| `teo-statement-craft.jpg` | Section „Nicht vermitteln / Netzwerk“ | Quer, ruhig |
| `teo-statement-overview.jpg` | Section Überblick/Dokumentation | Quer, abstrakt-ruhig oder Portal-Desk |
| `teo-cta-soft.jpg` | Optional hinter Final-CTA (sehr dezent) | Quer, dunkelblau getönt |

Farben im Look: kühles Tageslicht, kein Orange-Sunset-Klischee; Fassade darf warmen Stein haben; Markenblau kommt aus UI, nicht aus dem Foto.

---

## PROMPT PACK — für Midjourney / Flux / Ideogram / ChatGPT Images

Jeder Block = **ein Prompt**. Negatives am Ende mitgeben.

### Global Negative (immer anhängen)

```
no text, no logo, no watermark, no UI mockup, no smartphone screen, no people faces in focus, no cartoon, no 3D render, no purple lighting, no neon, no cyberpunk, no stock-photo grin, no cluttered street, no cars in foreground, no heavy HDR, no fish-eye
```

---

### BILD 1 — Hero Gebäude (Buena-Stil) · WICHTIGSTES BILD

**Prompt:**

```
Professional architectural product photo of the upper facade and roofline of a classic elegant European apartment building (Munich or Berlin Altbau), ornate stone balconies, tall windows, mansard roof, soft natural daylight, clear pale sky. The building is a clean isolated cut-out centered on a pure white background, sharp edges, premium real-estate look like Buena marketing photography. Minimal, calm, high-end, photorealistic, no street, no ground floor, no cars, no people.
```

**Variante DE (falls Tool besser auf DE reagiert):**

```
Professionelles Architekturfoto: obere Fassade und Dach eines eleganten europäischen Mehrfamilienhauses (Münchner/Berliner Altbau), steinerne Balkone, hohe Fenster, Mansarddach, weiches Tageslicht, heller Himmel. Gebäude als sauberer Freisteller mittig auf reinweißem Hintergrund, scharfe Kanten, premium Immobilien-Marketing wie Buena. Ruhig, hochwertig, fotorealistisch. Keine Straße, kein Erdgeschoss, keine Autos, keine Menschen.
```

**Specs:** 3:2 oder 16:9 · hohe Auflösung · Freisteller  
**Dateiname:** `teo-hero-building.png`

---

### BILD 2 — Hero Mobile Crop

**Prompt:**

```
Same style as a premium Altbau facade cut-out on white: vertical crop focusing on two stories of ornate balconies and windows of a classic European apartment building, soft daylight, pure white background, isolated building fragment, calm luxury real-estate photography, photorealistic.
```

**Specs:** 9:16 · `teo-hero-building-mobile.jpg`

---

### BILD 3 — Statement „Handwerk / Netzwerk“ (Buena: „Wir kennen sie“)

Nicht chaotische Baustelle — ruhige Kompetenz.

**Prompt:**

```
Calm editorial photograph: neatly arranged craft tools and materials on a clean workbench in soft daylight, shallow depth of field, muted blue-gray and warm wood tones, premium European service brand mood, minimal composition, lots of negative space on one side for typography overlay, photorealistic, no people, no logos.
```

**Oder Architektur-Detail:**

```
Close-up editorial photo of a well-maintained European building entrance detail (brass handle, clean stone, soft daylight), premium property care mood, shallow depth of field, muted colors with cool blue undertone, space for text overlay, photorealistic, no people, no logos.
```

**Dateiname:** `teo-statement-craft.jpg` · 3:2

---

### BILD 4 — Statement „Überblick / Transparenz“

**Prompt:**

```
Minimal editorial desk scene from above: clean notebook, one printed checklist, soft shadows, cool daylight, pale blue-gray palette, lots of white space, organized and calm, suggests documentation and oversight for property management, photorealistic, no screens with readable text, no logos, no people.
```

**Dateiname:** `teo-statement-overview.jpg` · 3:2

---

### BILD 5 — Optional CTA-Hintergrund (sehr dezent)

**Prompt:**

```
Abstract soft architectural background: out-of-focus European building facade bokeh, deep navy blue color grade (#0B1F3A mood), elegant minimal, no sharp details, suitable as dark website CTA background, photorealistic blur, no text, no people.
```

**Dateiname:** `teo-cta-soft.jpg` · 16:9

---

## Ein Prompt für Claude / Designer (Bilder + Einbau)

```
Erzeuge bzw. beschaffe 4–5 Bilder für die TEO-Landing (Buena-Look) und baue sie ein:

1) teo-hero-building — Altbau-Fassade Freisteller auf Weiß (wie Buena Hero). Unter die Floating-CTA legen.
2) teo-hero-building-mobile — Hochkant-Crop für Snap-Hero.
3) teo-statement-craft — ruhiges Handwerk/Eingang-Detail für Statement-Section.
4) teo-statement-overview — ruhige Doku/Desk-Szene.
5) optional teo-cta-soft — dunkles Bokeh hinter Final-CTA.

Stil: fotorealistisch, premium, viel Ruhe, kein Stock-Grinsen, kein UI-Mockup, kein Neon.
Farben der Seite bleiben TEO-Blau; Fotos eher neutral/kühl.

Kein Platzhalter-Text mehr im Hero — echtes <img>. Floating-CTA muss optisch auf dem Foto sitzen (overlap).
```

---

## Kurzer Paste für nur Bild-Generierung (ChatGPT Images / Midjourney)

```
Generate a set of 4 matching photos for a premium German B2B property-services brand website (TEO), visual style inspired by Buena:

1) Hero: upper facade of elegant European Altbau apartment building as clean cut-out on pure white background, soft daylight, no street, no people.
2) Same building, vertical 9:16 crop of balconies/windows on white.
3) Calm craft/tools or building entrance detail, editorial, space for text.
4) Minimal desk/checklist scene, cool daylight, organized, space for text.

Consistent color grade, photorealistic, minimal, high-end real estate. No text, no logos, no neon, no cartoons.
```
