#!/usr/bin/env python3
"""Ton für Video 003: Sprecher (voice/NN-fast.wav, Zeiten aus timing.json) + Musik + Soundeffekte → audio.wav
Musik/Effekte werden unter der Stimme automatisch abgesenkt. Alles per Code erzeugt (lizenzfrei)."""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
TM = json.load(open(os.path.join(HERE, 'timing.json')))
L = {d['n']: d for d in TM['lines']}
def S(n): return L[n]['start']
def E(n): return L[n]['end']
def wt(n, sub):
    for w in L[n]['words']:
        if sub.lower() in w['w'].lower(): return w['t0']
    return S(n)
SR = 44100; DUR = TM['total'] + .2; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
Lm = np.zeros(N); Rm = np.zeros(N)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(sig, at, gain=1.0, pan=.5):
    i = int(at * SR)
    if i >= N or i < 0: return
    s = sig[: N - i] * gain
    Lm[i:i + len(s)] += s * np.sqrt(1 - pan); Rm[i:i + len(s)] += s * np.sqrt(pan)
def tt(d): return np.arange(int(d * SR)) / SR
def tone(freq, d, dec=6, att=.004, harm=((1, 1), (2, .4), (3, .15))):
    x = tt(d); s = sum(a * np.sin(2 * np.pi * freq * hh * x) for hh, a in harm); return s * np.exp(-x * dec) * np.clip(x / att, 0, 1)
def lp(sig, k):
    out = np.zeros_like(sig); a = 0.0; ks = np.broadcast_to(k, sig.shape)
    for i in range(len(sig)): a += ks[i] * (sig[i] - a); out[i] = a
    return out
def noise(d, dec=8): x = tt(d); return rng.standard_normal(len(x)) * np.exp(-x * dec)
def whoosh(at, d=.4):
    x = tt(d); n = rng.standard_normal(len(x)); env = np.sin(np.pi * x / d) ** 2; add(lp(n, np.linspace(.04, .5, len(x))) * env * 1.6, at, .32)
def thud(at, g=1.0, f0=70):
    x = tt(.5); add(np.sin(2 * np.pi * (f0 + 90 * np.exp(-x * 25)) * x) * np.exp(-x * 9) * 1.2 + lp(noise(.5, 25), .2) * .8, at, g * .9)
def pop(at, fr=900, g=.45): add(tone(fr, .12, 30, .001, ((1, 1),)), at, g)
def ting(at, fr=1760, g=.35): add(tone(fr, 1.2, 3.5, .001, ((1, 1), (2.76, .35), (5.4, .12))), at, g, .6)
def chord(at, notes, d=4, g=.15, att=.4):
    x = tt(d); env = np.clip(x / att, 0, 1) * np.clip((d - x) / (d * .4), 0, 1)
    for k, m in enumerate(notes): add((np.sin(2 * np.pi * f(m) * x) + .3 * np.sin(4 * np.pi * f(m) * x) + .1 * np.sin(6 * np.pi * f(m) * x)) * env, at, g, .2 + .6 * (k % 3) / 2)
def pluck(at, m, g=.16): add(tone(f(m), .5, 7, .002, ((1, 1), (2, .5), (3, .25), (4, .1))), at, g)
def bass(at, m, g=.36): add(tone(f(m), .45, 5, .004, ((1, 1), (2, .3))), at, g)
def thunder(at, g=1.0):
    x = tt(2.6); add(lp(rng.standard_normal(len(x)), .03) * np.exp(-x * 1.5) * (1 - np.exp(-x * 30)) * 3.2, at, g); add(noise(.25, 14) * .9, at, g * .6)
def rain(a, b, g=.10):
    x = tt(b - a); env = np.clip(x / .6, 0, 1) * np.clip((b - a - x) / 1.2, 0, 1); add(lp(rng.standard_normal(len(x)), .5) * env, a, g, .3); add(lp(rng.standard_normal(len(x)), .45) * env, a, g, .7)
def groove(a, b, prog, bpm=104, g=1.0, hat=True):
    B = 60 / bpm; k = 0
    while a + k * B < b - .2:
        tm = a + k * B; root, ch = prog[(k // 4) % len(prog)]
        if k % 2 == 0: bass(tm, root, .34 * g)
        for j, m in enumerate(ch + [ch[1] + 12]): pluck(tm + j * B / 4, m, .14 * g)
        if hat and k % 2 == 1: add(noise(.06, 50), tm, .2 * g)
        k += 1

MAJ = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
MIN = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
# ── Musik nach Szenen ──
chord(0, [45, 52, 57, 60, 64], S(2) - .2, .10, 1.0)                       # 1 · Regen: leiser Moll-Pad
rain(0, S(2) - .2, .11); thunder(.32, 1.0); thunder(2.9, .55)
groove(S(2) - .25, S(5) - .35, MAJ, 104, 1.0)                              # 2–4 · Garten / Roboter: hell
chord(S(2) - .2, [48, 55, 60, 64, 67, 72], 4, .10, .3)
chord(S(5) - .3, [37, 44, 49], E(5) - S(5) + .6, .12, .8)                  # 5 · Lüge: dunkler Drone, Groove aus
x = tt(E(5) - S(5)); add(lp(rng.standard_normal(len(x)), .08) * .5 * np.sin(np.pi * x / (E(5) - S(5))), S(5), .5)   # Flüstern
groove(S(6) - .2, S(7) - .25, MIN, 96, .7, hat=False)                      # 6 · zerbrochen
chord(S(7) - .25, [45, 52, 57, 60], S(8) - S(7), .08, .6)                  # 7 · Spiegel: fast still
groove(S(8) - .3, S(9) - .3, MIN, 104, .8)                                 # 8 · Waage: Spannung steigt
x = tt(1.6); add(lp(rng.standard_normal(len(x)), .02 + .3 * (x / 1.6)) * (x / 1.6) ** 2 * 1.8, S(9) - 1.9, .35)  # Riser zur Wende
rain(S(9) - .3, S(9) + 2.6, .09); chord(S(9) - .3, [48, 55, 60, 64, 67], 5.5, .14, 1.2)   # 9 · Jesus kommt
chord(wt(9, 'trug') - .2, [45, 52, 57, 60, 64], 3.0, .14, .4)
chord(wt(9, 'auferstanden'), [48, 55, 60, 64, 67, 72, 76], 4.5, .2, .05)
groove(wt(9, 'auferstanden') + .2, S(12) - .25, MAJ, 112, 1.0)            # 10–11 · Freude + App
chord(S(12) - .25, [41, 48, 53, 56], E(12) - S(12) + 2.4, .14, .3)         # 12 · Teaser

# ── Soundeffekte ──
for c in (S(2) - .25, S(5) - .3, S(9) - .3, S(11) - .25): whoosh(c - .22, .44)
for c in (S(3) - .25, S(4) - .25, S(6) - .2, S(7) - .25, S(8) - .3, S(10) - .25, S(12) - .25): whoosh(c - .12, .28)
pop(wt(1, 'Liebe'), 660, .5); ting(wt(1, 'Liebe') + .05, 1318, .3)
for k in range(8): ting(S(2) + 1.2 + k * .3, f(72 + k * 2), .12)          # Akku lädt
ting(S(2) + 3.9, 2093, .3)
pop(wt(3, 'lieben'), 820, .45); [ting(wt(3, 'Himmel') + k * .08, f(m), .25) for k, m in enumerate((72, 76, 79, 84, 88))]
for k in range(4): add(tone(1760 if k % 2 else 1318, .08, 20, .001, ((1, 1),)), S(4) + .1 + k * .14, .25)   # Roboter-Piepen
thud(wt(4, 'braucht'), 1.0, 90); add(noise(.6, 6) * .7, wt(4, 'braucht'), .5)   # Roboter fällt auseinander
for k in range(5): add(tone(2400 + 300 * k, .15, 25, .001, ((1, 1), (2.7, .5))), wt(4, 'braucht') + .25 + k * .09, .15)
pop(wt(4, 'Also'), 520, .4); pop(wt(4, 'Also') + .3, 700, .3)
thud(wt(6, 'zerbrochen'), 1.3, 50); add(noise(.35, 12), wt(6, 'zerbrochen'), .7)   # Riss
thud(wt(6, 'Welt'), .7, 45)
for k in range(3): thud(wt(6, 'Daher') + k * .45, .8, 80)                   # Panels
ting(wt(7, 'Auch'), 660, .2)
for k in range(3): add(tone(180, .25, 8, .01, ((1, 1), (2, .4))), wt(8, 'Ja') + k * .18, .2)   # Waage knarzt
thud(wt(8, 'Vertrauen'), .8, 60); [ting(wt(8, 'immer') + k * .1, f(m), .25) for k, m in enumerate((76, 79, 84))]
x = tt(1.4); add(np.sin(2 * np.pi * 55 * x) * np.clip(x / 1.2, 0, 1) * .6, wt(9, 'trug') - .1, .45)   # Kreuz
thud(wt(9, 'auferstanden'), 1.0, 55); [ting(wt(9, 'auferstanden') + .1 + k * .09, f(m), .3) for k, m in enumerate((72, 76, 79, 84, 88, 91))]
[ting(S(10) + .2 + k * .25, f(m), .18) for k, m in enumerate((67, 72, 76, 79))]
for k in range(10): pop(wt(10, 'gute') + k * .07, 600 + 70 * (k % 5), .22)
ting(S(11) + .1, 1568, .35); ting(S(11) + .25, 2093, .35)
for k in range(6): pop(S(11) + 1.0 + k * .45, 880 + 60 * (k % 3), .22)
thud(S(12) - .25 + .7, 1.5, 45); add(noise(.3, 14) * .8, S(12) - .25 + .7, .5)   # Hammer
thud(E(12) + .1, .6, 70); ting(E(12) + .2, 1568, .3)

# ── Sprecher + Ducking ──
V = np.zeros(N)
for n, d in L.items():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'voice', f'{n:02d}-fast.wav'), '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64); i = int(d['start'] * SR); fi = int(.008 * SR)
    x[:fi] *= np.linspace(0, 1, fi); x[-fi:] *= np.linspace(1, 0, fi); V[i:i + len(x)] += x[: N - i]
env = np.convolve(np.abs(V) > .02, np.ones(int(.25 * SR)) / int(.25 * SR), mode='same'); env = np.convolve(env, np.ones(int(.12 * SR)) / int(.12 * SR), mode='same')
duck = 1 - .55 * np.clip(env * 1.5, 0, 1); Lm *= duck; Rm *= duck
def reverb(x, taps):
    y = x.copy()
    for d, g in taps: n = int(SR * d); y[n:] += g * x[:-n]
    return y
Lm = reverb(Lm, [(.07, .3), (.13, .22), (.23, .16), (.37, .1)]); Rm = reverb(Rm, [(.08, .3), (.15, .22), (.25, .16), (.41, .1)])
pk = max(abs(Lm).max(), abs(Rm).max()); Lm = Lm / pk * .5; Rm = Rm / pk * .5
Vr = V + .12 * np.concatenate([np.zeros(int(.09 * SR)), V[:-int(.09 * SR)]]); Vr = np.tanh(Vr * 1.6) * .85 / np.tanh(1.6)
Lo = Lm + Vr; Ro = Rm + Vr
fade = np.clip((DUR - t) / 1.0, 0, 1) * np.clip(t / .02, 0, 1); Lo *= fade; Ro *= fade
g = .9 / max(abs(Lo).max(), abs(Ro).max()); st = np.stack([Lo * g, Ro * g], 1)
with wave.open(os.path.join(HERE, 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('audio.wav', round(DUR, 2), 's')
