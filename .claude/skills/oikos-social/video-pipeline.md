# Stickman-Video-Pipeline (Details)

Basis kopieren: `cp -r marketing/social/videos/003-warum-leid-teil1 marketing/social/videos/00X-name`, dann `out/`, `voice/`, `audio.wav`, `timing.*`, `cover.*` löschen/ersetzen.

## 1. Stimme (Higgsfield, ~wenige Credits)
- `generate_audio_batch` (bzw. `generate_audio`), Modell **`elevenlabs_v4`**, Stimme **Arthur** `voice_id 30fc8796-ceb6-4a66-b3a7-4a145ef7f346`, `stability 0.4`. Eine Zeile = ein Job.
- **Max. 8 parallele Jobs** – Rest nachschieben; fehlgeschlagene Zeile einzeln neu.
- `estimate_audio_cost` braucht den Parameter `prompt`.
- Download der URLs (`d8j0ntlcm91z4.cloudfront.net`) nur in Umgebung „oikosapp“. Speichern als `voice/NN.mp3`, dann `ffmpeg -i NN.mp3 NN.wav`.
- Zweite Figur: gleiche Stimme mit anderer stability/Style oder eine zweite Stimme (`list_voices`). Text vorher laut prüfen: Zahlen ausschreiben, wenn die Aussprache wichtig ist.

## 2. Timing – `timing.py`
- `LINES` = gesprochene Sätze (exakt wie eingesprochen), `PAUSE = {n: Sekunden vor Zeile n}` für Dramaturgie (z. B. 1,6 s für einen Countdown), `TAIL` = Endkarte, `TEMPO = 1.08` (atempo → `voice/NN-fast.wav`).
- Wortzeiten werden per `silencedetect` je Satzteil geschätzt (Ausgabe „ok“ vs. „proportional“). Ergebnis `timing.json` + `timing.js` (`window.TIMING = {total, lines:[{n,start,end,words:[{w,t0,t1}]}]}`).
- Wortzahl-Faustregel: 190 Wörter ≈ 80 s inkl. Pausen. Längenangaben im Skript nach dem Messen korrigieren.

## 3. Szenen – `scene.html` + `scenes.js`
- `scene.html` = Canvas 1080×1920 + Helfer (bis Marker `/* ── Hintergrund ── */` aus 002 übernommen), lädt `timing.js`, `scenes.js`. Fonts: Inter 800/900, Caveat 700, Lora, Noto Color Emoji – `window.__ready` erst nach `document.fonts.load`.
- Zeit-Helfer: `S(n)`/`E(n)` Start/Ende Zeile n, `CUT(n) = S(n) - .25`, `wt(n,'wort')` = Startzeit eines Worts → Animationen exakt auf Wörter legen.
- Easing: `ease`, `eio`, `eob` (Overshoot), `lerp`, `clamp`, Zufall `h(n)`; `BOIL = floor(t*9)` + `J(i,amp)` → Linien „zittern“ handgezeichnet.
- **Stickman:** `figure(x, y, scale, pose, opts)` → liefert `{handA, handB, head}`. Pose: `lean, tilt, rot, face, f (Blickrichtung ±1), aA/aB (Arme [Schulter, Ellbogen] in rad), lA/lB (Beine)`. Gesichter: `smile, shock, sad, determined, dizzy, joy`. Opts: `{robe, halo, col, w}` (Jesus = robe+halo). Vorlagen: `POSE.walk(ph)`, `POSE.cheer(ph)`, `POSE.shrug()`, `SIT()`.
- **Requisiten:** `sunFig`, `cross(x,y,k,glow)`, `burst`, `confetti(t,t0)`, `stampFig(text)`, `bill`, `brickRect`, `stars`, in 003/004 zusätzlich `groundStrip, glowAt, heartFig, cloud, tree, bench, battery, rain, nightBg, flatBg, lightning, panel, robot, signpost, serpent, earthIcon, court, judge, judgeDesk, convict, podium, moneyBag`.
- **Text:** `bubble(text,x,y,t0,t1,t,tail)`, `darkBubble`, `verse(text,ref,t0,t1,t)`, `caption`, `outlined(text,x,y,font,fill,lw,a,rot,sc)` (dicke Ink-Kontur), `pill(text,x,y,k,bg,fg,size)`, `appIcon(x,y,size,k)`, `rr` (abgerundetes Rechteck).
- **App-Moment:** echte Screens via `img('../../assets/screens/…png')` in ein gezeichnetes Handy, oder `panel(...)`.
- **Untertitel (Karaoke):** Blöcke ≤ 3 Wörter, Umbruch an Satzzeichen und „–“, y = 430, 96 px Inter 900, aktives Wort gelb `#ffd83d` + leicht größer, Schlüsselwörter per Regex `RED_W` (rot `#ff5a5f`) / `GOLD_W` (gold `#ffc93c`). Wortabstand `space + size*.3`.
- **Overlay oben:** `topBar(t)` = Fortschrittsbalken (y 184) + Marker („DIE WENDE“) + Serien-Pille. Effekte: `wipes` (schräge Ink-Wischblende an `CUT`s), `shake` (Liste `[start, dauer, stärke]`), `flashes`.
- `window.setTime(t)`: Hintergrund/Szene per `if (t < CUT(n))`-Kette wählen, dann `wipes, subtitles, topBar, flashes`.
- Layout-Fallen von früher: Figuren nicht zu klein (Gerichtsszene skaliert ~1.0), Stempel/Text nie breiter als 940 px, Sprechblasen nicht über Köpfe, Herzen/Deko hinter Karten zeichnen, keine doppelten Overlays.

## 4. Kontrolle & Rendern – `render-video.cjs`
```bash
node marketing/social/render-video.cjs 00X-name --stills 1,5,12,30   # Standbilder → out/still-*.jpg (ansehen!)
python3 marketing/social/videos/00X-name/audio.py                    # → audio.wav
node marketing/social/render-video.cjs 00X-name --duration <total+0.2> # → out/video.mp4 + video-silent.mp4 (4 Worker, crf 18)
```
Danach kleiner machen + umbenennen: `ffmpeg -i video.mp4 -c:v libx264 -crf 23 -preset slow -c:a copy -movflags +faststart <name>.mp4` (bzw. `<name>-ohne-ton.mp4`). Pegel prüfen (`volumedetect`: mean ≈ -15 dB, max ≈ -1 dB). Einige Frames samplen.

## 5. Ton – `audio.py` (numpy, lizenzfrei)
Synth-Bausteine: `tone, chord(at, midi-notes), whoosh, thud, pop, ting, noise, lp` (Tiefpass; `k` als Array via `np.broadcast_to`). Groove/Akkorde je Abschnitt, SFX an `S(n)`/`wt(n,..)`. Stimme aus `voice/NN-fast.wav` an `start`, **Ducking** (Musik ~-7 dB unter Stimme), Reverb-Taps, Fade, Normalisierung → `audio.wav`. Zeiten immer aus `timing.json`.

## 6. Cover
`cover.js` (eigene `window.setTime`, ruft vorhandene Szene z. B. `sc1(4.2)` auf, dann Verlauf oben + große `outlined`-Headline + „TEIL n“-Sticker + App-Icon/„Oikos Connect“ y≈1720) und `cover.html` = `scene.html` + `<script src="cover.js">` nach `scenes.js`.
```bash
node marketing/social/render-video.cjs 00X-name --page cover.html --stills 0 && mv …/out/still-0.jpg …/out/cover.jpg
```
Text nur in y 240–1680 und ≤ 960 px breit; 3:4-Ausschnitt gegenprüfen.

## Git
`.gitignore` in `videos/` deckt `audio.wav`, `out/still-*.jpg`, `voice/*.mp3`, `voice/*-fast.wav`. Fertige MP4s und `cover.jpg` committen (`git add -f` für `out/cover.jpg`).
