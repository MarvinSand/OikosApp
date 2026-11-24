#!/usr/bin/env python3
"""Schneidet die nackten App-Screens (1000×2170) aus den App-Store-Screenshots aus.

Aufruf (aus dem Repo-Root):  python3 marketing/social/tools/crop_screens.py
Quelle: app-store-screenshots/NN-*.png (1320×2868, Handy-Rahmen bei x=148, Screen ab x=160)
Ziel:   marketing/social/assets/screens/NN-*.png

Der Rahmen wird pro Datei über die Rahmenfarbe (58,70,88) → (27,35,48) gefunden.
Ragt ein Screen unten aus dem Bild (z. B. 02-weltkarte), wird der fehlende Streifen
(Home-Indikator) aus 01-oikos-map ergänzt.
"""
import glob, os
from PIL import Image

SRC = 'app-store-screenshots'
DST = 'marketing/social/assets/screens'
W, H, X0 = 1000, 2170, 160

def close(p, q, t=12):
    return sum(abs(a - b) for a, b in zip(p, q)) < t

def screen_top(im):
    x = im.size[0] // 2 - 300
    for y in range(300, 1200):
        if close(im.getpixel((x, y)), (58, 70, 88)) and close(im.getpixel((x, y + 6)), (27, 35, 48)):
            return y + 14
    raise ValueError('Rahmen nicht gefunden')

os.makedirs(DST, exist_ok=True)
ref = Image.open(os.path.join(SRC, '01-oikos-map.png')).convert('RGB')
ref_top = screen_top(ref)
for f in sorted(glob.glob(os.path.join(SRC, '[0-9][0-9]-*.png'))):
    im = Image.open(f).convert('RGB')
    top = screen_top(im)
    part = im.crop((X0, top, X0 + W, min(top + H, im.size[1])))
    scr = Image.new('RGB', (W, H))
    scr.paste(part, (0, 0))
    miss = H - part.size[1]
    if miss > 0:
        scr.paste(ref.crop((X0, ref_top + H - miss, X0 + W, ref_top + H)), (0, part.size[1]))
    out = os.path.join(DST, os.path.basename(f))
    scr.save(out)
    print(out, f'(oben {top}, ergänzt {max(miss, 0)} px)')
