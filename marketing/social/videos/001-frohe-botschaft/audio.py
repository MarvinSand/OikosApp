#!/usr/bin/env python3
"""Erzeugt einen ruhigen, ansteigenden Ambient-Klangteppich (rein per Code, lizenzfrei) → audio.wav.
Aufruf: python3 audio.py [Dauer_s]   (Standard 80.5)  – Wendepunkt (Auferstehung) bei 34.8 s."""
import sys, wave
import numpy as np
SR = 44100
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 80.5
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(3)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
# Am9 – Fmaj7 – C – G (je 8 s), weich überblendet
CH = [[45, 52, 57, 60, 64, 71], [41, 48, 57, 60, 64, 69], [48, 55, 60, 64, 67, 71], [43, 50, 59, 62, 67, 74]]
L = np.zeros(N); R = np.zeros(N)
SEG = 8.0
def pad(freq, env, pan, ph):
    sig = np.zeros(N)
    for d in (-.0025, 0, .0025):                      # leichte Verstimmung = Chorus
        for h, a in ((1, 1), (2, .38), (3, .16), (4, .07)):
            sig += a * np.sin(2 * np.pi * freq * (1 + d) * h * t + ph + h)
    sig *= env * (.85 + .15 * np.sin(2 * np.pi * .13 * t + ph))
    return sig * np.sqrt(1 - pan), sig * np.sqrt(pan)
nseg = int(np.ceil(DUR / SEG)) + 1
for si in range(nseg):
    ch = CH[si % 4]; t0 = si * SEG - 1.5; t1 = t0 + SEG + 3.0
    e = np.clip((t - t0) / 2.5, 0, 1) * np.clip((t1 - t) / 2.5, 0, 1); e = np.sin(e * np.pi / 2) ** 2
    for k, m in enumerate(ch):
        l, r = pad(f(m), e, .25 + .5 * ((k * 37 % 10) / 10), k * 1.3 + si)
        w = .5 if m < 50 else (.22 if m < 65 else .11)
        L += l * w; R += r * w
# sanfte Glöckchen (Pentatonik), nach dem Wendepunkt häufiger
SC = [81, 84, 86, 88, 91, 93]
times = list(np.arange(5, 34, 4.3)) + list(np.arange(35, 76, 2.1))
for i, tt in enumerate(times):
    m = SC[(i * 5 + 2) % len(SC)] - (12 if i % 3 == 0 else 0)
    x = t - tt; mask = x > 0
    env = np.zeros(N); env[mask] = np.exp(-x[mask] * 1.6) * (1 - np.exp(-x[mask] * 60))
    bell = (np.sin(2 * np.pi * f(m) * t) + .3 * np.sin(2 * np.pi * f(m) * 2.76 * t)) * env * (.05 if tt < 35 else .075)
    p = .3 + .4 * ((i * 7) % 10) / 10; L += bell * (1 - p); R += bell * p
# Spannungsbogen: leise → Wendepunkt bei 34.8 s → volle Wärme
swell = .55 + .45 * np.clip((t - 28) / 10, 0, 1) ** 1.2
L *= swell; R *= swell
# Hall: gefilterte, verzögerte Wiederholungen
def reverb(x, taps):
    y = x.copy()
    for d, g in taps:
        n = int(SR * d); y[n:] += g * x[:-n]
    return y
tapsL = [(.083, .45), (.137, .38), (.211, .3), (.331, .25), (.487, .18), (.713, .12)]
tapsR = [(.097, .45), (.151, .38), (.227, .3), (.349, .25), (.521, .18), (.761, .12)]
L = reverb(L, tapsL); R = reverb(R, tapsR)
# Fades + Normalisierung
fade = np.clip(t / 3, 0, 1) * np.clip((DUR - t) / 3.5, 0, 1)
L *= fade; R *= fade
pk = max(np.abs(L).max(), np.abs(R).max()); g = .42 / pk
st = np.stack([L * g, R * g], 1)
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('audio.wav', DUR, 's')
