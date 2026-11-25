---
name: oikos-social
description: Social-Media-Content für Oikos Connect (Instagram/TikTok) – Karussells/Slideshows im Landingpage-Look und Erklärvideos im Stickman-Comic-Stil mit KI-Stimme (Arthur), Untertiteln, Cover und Captions. Nutzen bei Anfragen wie „neuer Post“, „Slideshow“, „Karussell“, „Video/Reel/TikTok“, „Stickman“, „Skript“, „Cover“, „Caption“, „Content-Ideen“ zu Glaube, Evangelium, Gebet oder der App.
---

# Oikos Social Studio

Alles liegt unter `marketing/social/` (Details zu Slides: `marketing/social/README.md`).
Ziel: organisches Wachstum der App **und** Evangelium verbreiten. Qualität vor Menge, jede Ausgabe muss „stoppen“ (Hook in 1–2 s).

## Arbeitsweise (vom Nutzer gewünscht)
- Antworten auf Deutsch, kurz und knapp.
- **Erst Ideen/Skript im Chat bzw. als Datei zeigen, dann produzieren** – vor allem bevor Credits (Higgsfield) ausgegeben werden.
- Code-Lösungen bevorzugen (0 Credits). Higgsfield nur für Fotos/Stimme, Kosten vorher schätzen (`estimate_*_cost`).
- Ergebnisse immer selbst prüfen (Standbilder/Kontaktbogen ansehen), dann per `SendUserFile` schicken, committen, pushen.
- Inhalt theologisch sauber: Bibelzitate **Luther 1912** (gemeinfrei) oder einfache Paraphrase mit „vgl.“. Keine Übertreibungen (z. B. Mt 13,23: 30/60/100-fach). Erfundene Geschichten kennzeichnen („frei erzählt – inspiriert von echten Berichten“).
- Botschaft: Gnade statt Werke; kein Druck/Schuld-Keule („nicht weil du persönlich schuld bist“ vermeiden); CTA-Wort für Entscheidungen: **„Angenommen“** (nicht „Ja“).
- App nur kurz einbauen (≈ 5–8 s bzw. 1 Slide), als Hilfe, nicht als Werbung.

## Format-Regeln
- Instagram Karussell 1080×1350 (4:5), Rand 76 px. Profil-Raster zeigt 3:4-Ausschnitt.
- TikTok/Reels 1080×1920. **Sicherheitszonen:** oben 150, unten 400, rechts 130 px – keine Texte dort. Reels-Raster zeigt y 240–1680 → Cover-Inhalt dort.
- Keine nachgebauten App-Store-/Play-Logos. Elberfelder-„Jehova“-Zeilen nicht in Screen-Ausschnitte.
- Echte App-Screens: `assets/screens/` (aus `app-store-screenshots/` via `tools/crop_screens.py`), App-Icon `brand/app-icon.png`.

## A) Slideshows / Karussells → siehe README
Kurzfassung: `posts/NNN-name/slides.html` (Bausteine aus `brand/brand.css`, Look „Morgendämmerung“: Nachtblau, Gold, Babyblau; Lora/Inter/Caveat; Filmkorn) → `node marketing/social/render.cjs NNN-name` → IG + TikTok-JPGs + Kontaktbogen. `caption.md` mit Caption, Hashtags, Alt-Texten. Referenz: `posts/001-launch` (11 Slides: 3 Vision-Slides → Challenge-CTA „3 Menschen · 7 Tage“ → App-Features → CTA).
Fotos: Higgsfield `gpt_image_2_6`, high, 2k, je 4:5 und 9:16 (Prompt-Bausteine in README). Downloads nur in Cloud-Umgebung **„oikosapp“** (sonst 403 → `switch_environment`).

## B) Stickman-Comic-Videos → Details in `video-pipeline.md`
Referenz-Projekte: `videos/003-warum-leid-teil1` (beste Vorlage), `004-warum-leid-teil2`, `002-die-luege`.
Ablauf kurz:
1. Skript nach `marketing/social/scripts/<name>.md` (Tabelle Bild | Sprechtext, Tricks, Cover, Caption-Entwurf). ~190 Wörter ≈ 80 s.
2. Ordner kopieren (003 als Basis), `timing.py` → `LINES` + `PAUSE` anpassen.
3. Stimme per Higgsfield erzeugen (Arthur), nach `voice/NN.mp3` → `NN.wav`.
4. `python3 timing.py` → `timing.json/js` (Startzeiten + Wortzeiten).
5. `scenes.js` schreiben (Szenen `scN(t)`, Umschalten in `window.setTime`), Standbilder prüfen.
6. `python3 audio.py` (Musik/SFX/Ducking) → Video rendern → crf-23-Kopie, `-ohne-ton`-Version.
7. Cover (`cover.js` + `cover.html`), Captions (`captions-*.md`), commit + push.

## Captions-Schema (pro Video/Post)
- **TikTok:** Hook-Satz + 1 Zeile Spannung + 8–10 Hashtags (#christentok #jesus #glaube #evangelium #bibel #fürdich + Thema). Angepinnter Kommentar mit niedriger Hürde (Frage, Anfangsbuchstabe, „Angenommen“).
- **Instagram:** Längere Caption (Kern der Botschaft, Vers, App via „Link in der Bio“, Speichern/Teilen-Aufruf), 3–5 Hashtags, erster Kommentar selbst anpinnen.
- Tipps: Serien als Playlist, Teil 2 ≥ 24 h später, erste Stunde alle Kommentare beantworten, Auto-Untertitel aus (sind eingebrannt), Trend-Sound höchstens ≤ 5 %.

## Bewährte Retention-Tricks
Provokante Frage als Hook + großes Text-Overlay · offene Schleife („Das Ende verändert alles“, „???“-Bildhälfte) · Fortschrittsbalken mit Marker („DIE WENDE“) · Zähler (Tage, Menschen) · Karaoke-Untertitel mit roten/goldenen Schlüsselwörtern · Mitmach-Moment (JA/NEIN-Countdown) · dramatische Ironie (Zuschauer weiß mehr) · Loop-Ende, das zum ersten Bild passt · Serien mit „Teil 2“-Teaser.

## Bisheriger Content (nicht doppeln)
Posts: 001 Launch-Karussell. Videos: 001 Frohe Botschaft, 002 Die größte Lüge, 003/004 „Warum lässt Gott Leid zu?“ Teil 1/2 (mit Cover + `videos/captions-warum-leid.md`). Skripte: `scripts/serie-warum-leid.md`, `scripts/gebet-im-hintergrund.md` (005 „Was du nicht siehst“, Split-Screen, Gebet/Gottes Timing – noch nicht produziert).
