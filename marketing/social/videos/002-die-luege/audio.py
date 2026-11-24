#!/usr/bin/env python3
"""Musikbett + Soundeffekte für Video 002 (rein per Code → audio.wav). Zeiten passen zu scene.html."""
import wave, subprocess, numpy as np
SR = 44100; DUR = 100.6
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)
f = lambda m: 440 * 2 ** ((m - 69) / 12)

def add(sig, at, gain=1.0, pan=.5):
    i = int(at * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * np.sqrt(1 - pan); R[i:i + len(s)] += s * np.sqrt(pan)
def tt(d): return np.arange(int(d * SR)) / SR
def tone(freq, d, dec=6, att=.004, harm=((1, 1), (2, .4), (3, .15))):
    x = tt(d); s = sum(a * np.sin(2 * np.pi * freq * h * x) for h, a in harm)
    return s * np.exp(-x * dec) * np.clip(x / att, 0, 1)
def noise(d, dec=8):
    x = tt(d); return rng.standard_normal(len(x)) * np.exp(-x * dec)
def lp(sig, k):  # einfacher Tiefpass
    out = np.zeros_like(sig); a = 0.0
    ks = np.broadcast_to(k, sig.shape)
    for i in range(len(sig)): a += ks[i] * (sig[i] - a); out[i] = a
    return out
def whoosh(at, d=.4, up=True):
    x = tt(d); n = rng.standard_normal(len(x)); env = np.sin(np.pi * x / d) ** 2
    f0 = np.linspace(.04, .5, len(x)) if up else np.linspace(.5, .04, len(x))
    out = np.zeros(len(x)); a = 0
    for i in range(len(x)): a += f0[i] * (n[i] - a); out[i] = a
    add(out * env * 1.6, at, .35)
def thud(at, g=1.0, f0=70):
    x = tt(.5); add(np.sin(2 * np.pi * (f0 + 90 * np.exp(-x * 25)) * x) * np.exp(-x * 9) * 1.2 + lp(noise(.5, 25), .2) * .8, at, g * .9)
def pop(at, fr=900, g=.5): add(tone(fr, .12, 30, .001, ((1, 1),)), at, g)
def boing(at):
    x = tt(.45); fr = 220 + 380 * np.exp(-x * 6) * np.sin(x * 50) * .3 + 260 * np.exp(-x * 4); add(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x * 5), at, .4)
def ting(at, fr=1760, g=.4): add(tone(fr, 1.2, 3.5, .001, ((1, 1), (2.76, .35), (5.4, .12))), at, g, .6)
def chord(at, notes, d=4, g=.16, att=.4):
    x = tt(d); env = np.clip(x / att, 0, 1) * np.clip((d - x) / (d * .4), 0, 1)
    for k, m in enumerate(notes):
        s = (np.sin(2 * np.pi * f(m) * x) + .3 * np.sin(2 * np.pi * f(m) * 2 * x) + .12 * np.sin(2 * np.pi * f(m) * 3 * x)) * env
        add(s, at, g, .2 + .6 * (k % 3) / 2)

# ── Musikbett: flotter Pluck-Groove (Moll → Dur ab dem Twist) ──
BPM = 112; B = 60 / BPM
def pluck(at, m, g=.22): add(tone(f(m), .5, 7, .002, ((1, 1), (2, .5), (3, .25), (4, .1))), at, g, .5)
def bass(at, m, g=.4): add(tone(f(m), .45, 5, .004, ((1, 1), (2, .3))), at, g, .5)
prog_min = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]   # Am F C G
prog_maj = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]   # C G Am F
beat = 0
while beat * B < DUR - .5:
    tm = beat * B; bar = beat // 4
    if tm < 23.4 or 25.0 <= tm < 26.4: pass
    major = tm >= 26.4
    if 23.4 <= tm < 25.0: beat += 1; continue
    if 25.0 <= tm < 26.4: beat += 1; continue
    if 30.2 <= tm < 35.0: beat += 1; continue        # Kreuz: nur Pads
    root, ch = (prog_maj if major else prog_min)[bar % 4]
    if beat % 2 == 0: bass(tm, root, .38 if tm > 5 else .5)
    for k, m in enumerate(ch + [ch[1] + 12]):
        if (beat * 4 + k) % 3 != 2 or major: pluck(tm + k * B / 4, m, .17 if major else .15)
    if beat % 4 == 2 and tm > 4.5 and not major and tm < 23: add(noise(.08, 40), tm, .3)  # Hi-Hat-Tick
    if major and beat % 2 == 1: add(noise(.06, 50), tm, .25)
    beat += 1
# Pads nach dem Twist / beim Kreuz / Finale
chord(26.4, [48, 55, 60, 64, 67], 4.0, .2); chord(30.2, [45, 52, 57, 60, 64], 5.2, .22, .8)
chord(35.0, [48, 55, 60, 64, 67, 72], 3.5, .3, .1); chord(37.0, [53, 60, 65, 69, 72], 10, .17, .6)

# ── Effekte ──
thud(.15, 1.2, 60); add(noise(.5, 10) * .6, .15, .4)                                 # STOPP!
for c, up in [(4.85, True), (14.85, True), (29.95, True), (36.8, True), (46.85, True)]: whoosh(c, .42, up)
for a in (6.5, 7.6, 8.7, 9.8): pop(a - .02, 700, .5); pop(a + .02, 1100, .3)          # Stufen
thud(10.0, .6, 50); add(lp(noise(.6, 3), .05), 10.0, .8)                               # Mauer wächst
boing(10.7); thud(11.1, .5, 90); boing(11.8); thud(12.3, .5, 90)
x = tt(.6); add(np.sin(2 * np.pi * np.cumsum(900 * np.exp(-x * 2.2)) / SR) * np.exp(-x * 2.5), 12.9, .25)  # Fallpfeifen
thud(13.5, 1.0, 55); thud(13.85, .4, 70); ting(14.1, 1320, .2)
thud(16.5, .9, 60); pop(16.9, 300, .3)                                                  # Rechnung fällt
ting(19.0, 1568, .5); add(tone(300, .4, 3, .01, ((1, 1),)) * np.sin(2 * np.pi * 6 * tt(.4)), 20.3, .3); add(tone(250, .6, 2.5, .01, ((1, 1),)) * np.sin(2 * np.pi * 5 * tt(.6)), 20.7, .3)  # wah-wah
# Riser + Twist-Stinger
x = tt(1.6); add(lp(rng.standard_normal(len(x)), .02 + .3 * (x / 1.6)) * (x / 1.6) ** 2 * 2.2, 23.4, .45)
add(np.sin(2 * np.pi * np.cumsum(120 + 500 * (x / 1.6) ** 2) / SR) * (x / 1.6) * .6, 23.4, .3)
thud(25.0, 1.4, 45)
for m in (36, 43, 49): add(tone(f(m), 1.6, 2.2, .003, ((1, 1), (2, .5), (3, .3), (5, .2))), 25.0, .25)
whoosh(28.1, .35, True); pop(28.6, 1200, .4)                                           # Rechnung greifen / „Ich zahle“
x = tt(1.6); add(np.sin(2 * np.pi * 55 * x) * np.clip(x / 1.5, 0, 1) * .6, 30.4, .5)    # Kreuz
thud(32.9, 1.6, 45); add(noise(.35, 14) * 1.0, 32.9, .6); ting(33.5, 880, .35); ting(33.55, 1318, .3)  # Stempel
x = tt(1.4); add(lp(rng.standard_normal(len(x)), .03 + .2 * (x / 1.4)) * np.clip(x / 1.2, 0, 1) * 1.4, 34.0, .35)
for k, m in enumerate((72, 76, 79, 84, 88, 91)): ting(35.0 + k * .09, f(m), .3)         # Sonnenaufgang-Arpeggio
for k in range(8): add(noise(.12, 18), 37.3 + k * .12, .25)                            # Treppe bröckelt
for k in range(12): pop(39.9 + k * .07, 600 + 80 * (k % 5), .3)                         # Konfetti
ting(40.0, 2093, .3); ting(47.5, 1568, .3)
for c in (57.6, 65.4, 73.8, 82.7, 93.0): whoosh(c, .42, True)
x = tt(1.4); add(np.sin(2 * np.pi * np.cumsum(520 * np.exp(-x * 1.1)) / SR) * np.exp(-x * 1.8) * .5, 62.6, .3)   # Baum welkt
for k, m in enumerate((72, 76, 79, 84)): ting(69.8 + k * .12, f(m), .3)                                     # Himmel auf Erden
for a in (68.5, 70.0, 70.9): pop(a, 700 + 100 * (a % 3), .3)
for k, a in enumerate((77.9, 80.0, 81.3)): pop(a, 420 - 40 * k, .4)                                         # leere Kreise
thud(82.95, 1.1, 55); ting(83.25, 1568, .4); ting(83.35, 2093, .4)                                          # Reveal
for a in (85.9, 88.15, 89.55, 91.0): pop(a, 800, .35); whoosh(a - .1, .25, True)                             # Funktionen
ting(93.4, 1568, .35); ting(93.55, 2093, .35); ting(93.7, 2637, .3)                                          # Endkarte
for k in range(10): pop(93.5 + k * .07, 600 + 70 * (k % 5), .25)
ting(47.5, 1568, .3)
chord(57.8, [45, 52, 57, 60, 64], 7.8, .13, .6); chord(65.6, [48, 55, 60, 64, 67, 72], 8.4, .17, .4)
chord(74.0, [45, 52, 57, 60, 64], 8.9, .12, .6); chord(82.9, [48, 55, 60, 64, 67, 72], 10.3, .17, .4); chord(93.2, [53, 60, 65, 69, 72], 8, .17, .4)

# ── Sprecher (Arthur, Eleven v4): Startzeiten + Tempo passend zu den Szenen ──
VOICE = {1: (0.15, 1.06), 2: (5.3, 1), 3: (10.9, 1), 4: (15.4, 1), 5: (18.0, 1), 6: (21.2, 1.1), 7: (25.6, 1), 8: (28.5, 1), 9: (30.7, 1),
         10: (33.8, 1), 11: (35.3, 1), 12: (37.5, 1), 13: (40.8, 1), 14: (42.8, 1.12), 15: (47.4, 1), 16: (49.95, 1), 17: (52.3, 1),
         18: (54.5, 1), 23: (58.0, 1.05), 24: (62.5, 1), 25: (65.9, 1.06), 26: (74.2, 1), 19: (76.6, 1.05), 20: (83.0, 1),
         27: (86.0, 1.05), 22: (93.3, 1.05)}
V = np.zeros(N)
for n, (at, tempo) in VOICE.items():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'voice/{n:02d}.wav', '-filter:a', f'atempo={tempo}', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64); i = int(at * SR)
    fi = int(.01 * SR); x[:fi] *= np.linspace(0, 1, fi); x[-fi:] *= np.linspace(1, 0, fi)
    V[i:i + len(x)] += x[: N - i]
# Ducking: Musik/Effekte werden beim Sprechen um ~7 dB leiser
env = np.convolve(np.abs(V) > .02, np.ones(int(.25 * SR)) / int(.25 * SR), mode='same'); env = np.convolve(env, np.ones(int(.12 * SR)) / int(.12 * SR), mode='same')
duck = 1 - .55 * np.clip(env * 1.5, 0, 1)
L *= duck; R *= duck

# ── Hall, Fades, Normalisierung ──
def reverb(x, taps):
    y = x.copy()
    for d, g in taps: n = int(SR * d); y[n:] += g * x[:-n]
    return y
L = reverb(L, [(.07, .3), (.13, .22), (.23, .16), (.37, .1)]); R = reverb(R, [(.08, .3), (.15, .22), (.25, .16), (.41, .1)])
pkm = max(abs(L).max(), abs(R).max()); L = L / pkm * .5; R = R / pkm * .5
Vr = V + .12 * np.concatenate([np.zeros(int(.09 * SR)), V[:-int(.09 * SR)]])
Vr = np.tanh(Vr * 1.6) * .85 / np.tanh(1.6) * 1.0
L += Vr; R += Vr
fade = np.clip((DUR - t) / 1.2, 0, 1) * np.clip(t / .05, 0, 1); L *= fade; R *= fade
pk = max(abs(L).max(), abs(R).max()); g = .9 / pk; st = np.stack([L * g, R * g], 1)
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('audio.wav', DUR)
