#!/usr/bin/env python3
"""Erzeugt timing.js aus den Sprachaufnahmen (voice/NN.wav):
   - Startzeit jeder Zeile im Video (mit gezielten Pausen)
   - geschätzte Wortzeiten (Pausenerkennung pro Satzteil + Länge der Wörter) für Karaoke-Untertitel
Aufruf: python3 timing.py"""
import json, re, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
LINES = [
    "Wenn es Gott gibt – warum gibt es dann so viel Leid? Die Antwort hat mit Liebe zu tun.",
    "Am Anfang gab es kein Leid. Gott schuf uns für eine Beziehung mit ihm – ganz erfüllt von seiner Liebe.",
    "Wer erfüllt ist, kann andere lieben. Das war der Plan: Himmel auf Erden.",
    "Aber Gott wollte keine Roboter. Liebe braucht Freiheit. Also gab er uns einen freien Willen.",
    "Und wir haben eine Lüge geglaubt: „Gott hält dir etwas vor. Hol es dir selbst.“",
    "Seitdem ist die Verbindung zu Gott zerbrochen – und mit ihr die Welt. Daher kommt so viel Leid.",
    "Und ehrlich: Diese Lüge glauben wir alle. Jeden Tag. Auch ich.",
    "„Aber Gott wusste das doch!“ Ja. Er ist das Risiko eingegangen, dass seine perfekte Welt für eine Zeit zerbricht – um etwas viel Wertvolleres zu gewinnen: unser Vertrauen. Für immer.",
    "Und er hat uns nicht allein gelassen. In Jesus kam Gott selbst in unser Leid. Er trug unsere Schuld am Kreuz – und ist auferstanden.",
    "Wer ihm vertraut, ist wieder mit Gott verbunden. Das ist die gute Nachricht.",
    "Und Leid musst du nicht allein tragen: In Oikos Connect beten Christen für dein Anliegen.",
    "Warum gute Taten nicht reichen – und wo Gott ist, wenn es weh tut: Teil 2.",
]
# Pause VOR der jeweiligen Zeile (Sekunden) – Dramaturgie
PAUSE = {1: .35, 2: .55, 3: .3, 4: .4, 5: .75, 6: .35, 7: .45, 8: .8, 9: .55, 10: .35, 11: .45, 12: .4}
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
