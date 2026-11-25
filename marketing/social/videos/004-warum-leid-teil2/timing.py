#!/usr/bin/env python3
"""Erzeugt timing.js aus den Sprachaufnahmen (voice/NN.wav):
   - Startzeit jeder Zeile im Video (mit gezielten Pausen)
   - geschätzte Wortzeiten (Pausenerkennung pro Satzteil + Länge der Wörter) für Karaoke-Untertitel
Aufruf: python3 timing.py"""
import json, re, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
LINES = [
    "Ein Mörder sagt vor Gericht: „Aber ich habe hunderttausend Euro gespendet!“ Würdest du ihn freisprechen?",
    "Nein. Das wäre ungerecht. Genauso bei Gott: Gute Taten löschen Schuld nicht aus. Die Bibel sagt: Sünde führt zum Tod – zur Trennung von Gott.",
    "Aber jetzt passiert etwas, das kein Gericht der Welt kennt.",
    "Der Richter steht von seinem Platz auf, stellt sich neben den Angeklagten – und sagt: „Ich trage die Strafe für dich.“",
    "Das hat Gott getan. In Jesus wurde er Mensch. Ohne Schuld. Deshalb konnte nur er unsere Strafe tragen.",
    "Und er hat nicht von oben zugeschaut. Jesus kannte Hunger, Verrat und Schmerz. Am Grab seines Freundes hat er geweint.",
    "Am Kreuz trug er alles. Am dritten Tag stand er auf. Leid hat nicht das letzte Wort – eines Tages wischt Gott alle Tränen ab.",
    "Wo ist Gott im Leid? Mittendrin. Und er stellt dir Menschen an die Seite.",
    "Mit Oikos Connect findest du Christen in deiner Nähe – Hauskreise, Gemeinden, Menschen, die mit dir beten.",
    "Dieser Freispruch ist ein Geschenk. Wenn du ihn annehmen willst, sag es Gott – jetzt, mit deinen eigenen Worten. Und schreib „Angenommen“ in die Kommentare, damit wir uns mit dir freuen.",
]
# Pause VOR der jeweiligen Zeile (Sekunden) – Dramaturgie
PAUSE = {1: .35, 2: 1.6, 3: .6, 4: .5, 5: .5, 6: .45, 7: .45, 8: .5, 9: .45, 10: .45}
TAIL = 2.4  # Endkarte nach dem letzten Satz
TEMPO = 1.08  # Stimme leicht beschleunigt (wirkt dynamischer, kürzer)

def dur(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)

def speech_segments(f, d):
    out = subprocess.run(['ffmpeg', '-i', f, '-af', 'silencedetect=noise=-33dB:d=0.11', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    segs, cur = [], 0.0
    for s, e in zip(st, en):
        if s > cur + .05: segs.append([cur, s])
        cur = e
    if cur < d - .05: segs.append([cur, d])
    return segs

def phrases(text):
    words = text.split()
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r'[,.:;?!–]$|[“‘]$', w) or w in ('–',):
            groups.append(cur); cur = []
    if cur: groups.append(cur)
    return [g for g in groups if g]

def weight(w):
    return max(1.0, len(re.sub(r'[^\wäöüÄÖÜß]', '', w)) + 1.5)

def word_times(text, segs, d):
    ph = phrases(text)
    out = []
    if len(segs) == len(ph):
        pairs = list(zip(ph, segs))
    else:  # Fallback: ganze Zeile proportional
        pairs = [(sum(ph, []), [0, d])]
    for words, (a, b) in pairs:
        ws = [weight(w) for w in words]; tot = sum(ws); t = a
        for w, wt in zip(words, ws):
            dt = (b - a) * wt / tot
            out.append({'w': w, 't0': round(t, 3), 't1': round(t + dt, 3)}); t += dt
    return out, len(segs) == len(ph)

t = 0.0; data = []
for i, text in enumerate(LINES, 1):
    src = os.path.join(HERE, 'voice', f'{i:02d}.wav'); f = os.path.join(HERE, 'voice', f'{i:02d}-fast.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter:a', f'atempo={TEMPO}', f], check=True); d = dur(f)
    t += PAUSE[i]
    segs = speech_segments(f, d)
    words, ok = word_times(text, segs, d)
    data.append({'n': i, 'start': round(t, 3), 'end': round(t + d, 3), 'dur': round(d, 3), 'text': text,
                 'words': [{'w': w['w'], 't0': round(t + w['t0'], 3), 't1': round(t + w['t1'], 3)} for w in words]})
    print(f'{i:2d}  {t:6.2f} → {t + d:6.2f}  ({d:4.2f}s)  Satzteile {"ok" if ok else "proportional"}')
    t += d
total = round(t + TAIL, 2)
json.dump({'total': total, 'lines': data}, open(os.path.join(HERE, 'timing.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(HERE, 'timing.js'), 'w').write('window.TIMING = ' + json.dumps({'total': total, 'lines': data}, ensure_ascii=False) + ';\n')
print('Gesamtlänge', total, 's')
