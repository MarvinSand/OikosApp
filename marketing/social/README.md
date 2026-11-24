# Oikos Connect · Social-Media-Studio

Wiederverwendbares System für Instagram-Karussells und TikTok-Slideshows im Look der Landingpage
(„Morgendämmerung“: Nachtblau, Gold, Babyblau für App-Elemente · Lora, Inter, Caveat · Filmkorn).
Jeder Post ist **eine HTML-Datei**, aus der ein Skript die fertigen Bilder in beiden Formaten rendert.

```
marketing/social/
├── brand/            brand.css (Designsystem), deck.js (Format-/Bild-/Icon-Logik), icons.js (Lucide), Fonts, App-Icon
├── assets/
│   ├── photos/       Kinobilder aus Higgsfield, je Motiv als *-45.jpg (4:5) und *-916.jpg (9:16)
│   ├── screens/      echte App-Screens 1000×2170 (aus app-store-screenshots/ geschnitten)
│   └── raw/          Original-PNGs von Higgsfield (nicht im Git)
├── posts/NNN-name/   slides.html · caption.md · export/{instagram,tiktok}/NN.jpg · export/overview-*.jpg
├── tools/            crop_screens.py
└── render.cjs        Renderer (Playwright)
```

## Rendern

```bash
node marketing/social/render.cjs 001-launch
```

Ergebnis: `posts/001-launch/export/instagram/01.jpg …` (1080×1350) und `…/tiktok/01.jpg …` (1080×1920) plus je ein
Kontaktbogen `overview-*.jpg`. Nur ein Format: `… 001-launch ig` bzw. `tt`.
Vorschau im Browser: `slides.html?f=ig` oder `?f=tt` über einen lokalen Server öffnen (Fonts laden nicht über `file://`).

## Neuen Post anlegen

1. `posts/001-launch` nach `posts/00X-thema` kopieren, `export/` löschen.
2. In `slides.html` Slides als `<section class="slide …">` anlegen – Reihenfolge = Slide-Reihenfolge, Zähler „03 / 10“ entsteht automatisch.
3. Bausteine (alle in `brand/brand.css`):
   - `.brandbar` (Logo + `.counter`), `.eyebrow` (mit `<span class="num">01</span>`), `.h1`/`.h2` (Hervorhebung mit `<em>` → Gold-Kursiv), `.lead` (`<b>` = weiß)
   - `.phone > .screen > img` = iPhone-Mockup mit echtem Screen (`--pw` = Breite)
   - `.glass`, `.float` (schwebende Info-Karte mit `.av`/`.ic`), `.pill` (`.sky`, `.gold`), `.glow.gold|.sky`, `.grain`
   - `<i data-icon="name">` = Lucide-Icon (Liste in `brand/icons.js`, neue aus `lucide-static` ergänzen)
   - Fotos: `<img data-src="../../assets/photos/motiv-{r}.jpg">` → `{r}` wird automatisch 45 bzw. 916
4. Format-Unterschiede per `[data-f="tt"] .sX …` überschreiben.
5. Rendern, Kontaktbogen ansehen, jede Slide in Originalgröße prüfen, `caption.md` schreiben.

### Sicherheitszonen
- **Instagram 4:5:** 76 px Rand; das Profil-Raster zeigt einen 3:4-Ausschnitt (links/rechts je ~34 px weg).
- **TikTok 9:16:** oben 150 px (Tabs), unten 400 px (Caption/Sound), rechts 130 px (Like-Spalte) – dort nur Bild, keine Texte.
  `--safe-top`/`--safe-bottom` in `brand.css` sind darauf eingestellt.

## Bilder mit Higgsfield

- Modell `gpt_image_2_6`, `quality: high`, `resolution: 2k`, `aspect_ratio` 4:5 **und** 9:16 (gleicher Prompt, Text „vertical“ für 9:16).
- Prompt-Bausteine, die den Look treffen: *cinematic photograph, editorial film still · shot on ARRI Alexa, 35/50mm · color grade: deep navy-teal shadows and warm amber-gold highlights · subtle film grain · the upper 40 percent is open sky / dark space, clean room for a headline · no text, no logos, no watermark*.
- Personen eher von hinten/seitlich oder mit geschlossenen Augen; Handy-Bildschirme nicht zeigen lassen (KI-UI ist unleserlich) – echte Screens kommen als Mockup.
- Download der Ergebnis-URLs braucht die Cloud-Umgebung **„oikosapp“** (Hosts `d8j0ntlcm91z4.cloudfront.net` usw. freigegeben).
- PNG → `assets/raw/`, dann als JPG (Qualität 90) nach `assets/photos/` (`PIL … save(quality=90, optimize=True, progressive=True)`).

## Regeln

- Keine nachgebauten App-Store-/Google-Play-Logos – Text-Buttons mit Download-Icon verwenden.
- Bibeltext in Screens ist Elberfelder 1871 („Jehova“) – solche Zeilen nicht in Ausschnitte nehmen (siehe `assets/screens/crops/`).
- Aussagen in Karten müssen zum Screen passen (z. B. Ben ist im Screen „Noch nicht“ gläubig → Story-Line endet offen).
- Neue App-Screens: erst `app-store-screenshots/` aktualisieren, dann `python3 marketing/social/tools/crop_screens.py`.
- Emojis rendern über Noto Color Emoji (`<span class="emoji">`); 🎶 ist dort grau → besser 🙌 ✨ 🙏.

## Ideen für die nächsten Posts

| Nr. | Thema | Format-Idee |
|-----|-------|-------------|
| 002 | „5 Menschen, für die du heute beten kannst“ | Liste mit Oikos-Map-Ringen, Save-Magnet |
| 003 | Gebetsmodus erklärt in 4 Schritten | Tutorial-Karussell mit Screens |
| 004 | Zeugnis: „Zwei Jahre gebetet – dann kam die Nachricht“ | Story-Karussell, emotional (Feed-Screen) |
| 005 | Hauskreis gründen in 2 Minuten | How-to mit Communities-Screens |
| 006 | Bibelvers-Serie (Jak 5,16 · 2 Tim 2,2 · Mt 18,20) | Ein-Slide-Zitatkarten, wöchentlich |
| 007 | „Was ist eigentlich Oikos?“ – Mythos vs. Wahrheit | Edu-Karussell, Hook als Frage |
| 008 | Weltkarte: Wer glaubt in deiner Stadt? | Karte + Städte, lokale Hashtags |
| 009 | Datenschutz & Werte | Vertrauen aufbauen, FAQ-Stil |
